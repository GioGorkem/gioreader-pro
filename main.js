'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const fsapi = require('./fsapi');

const HEAD = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>';
const BUILD_RE = /name="gio-pro-build" content="(\d{8,14})"/;
const buildCache = new Map();

function buildOf(file) {
  try {
    const st = fs.statSync(file);
    const c = buildCache.get(file);
    if (c && c.m === st.mtimeMs) return c.b;
    const txt = fs.readFileSync(file, 'utf8');
    const mm = BUILD_RE.exec(txt);
    const b = mm ? Number(mm[1]) : 0;
    buildCache.set(file, { m: st.mtimeMs, b });
    return b;
  } catch (e) {
    return 0;
  }
}

const bundledDir = () => path.join(__dirname, 'www');
const overrideDir = () => path.join(app.getPath('userData'), 'www-override');

function activeDir() {
  const o = path.join(overrideDir(), 'index.html');
  return fs.existsSync(o) && buildOf(o) > buildOf(path.join(bundledDir(), 'index.html')) ? overrideDir() : bundledDir();
}

function currentBuild() {
  return buildOf(path.join(activeDir(), 'index.html'));
}

function installUpdateFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const mm = BUILD_RE.exec(txt);
  if (!mm || !/GioReader Pro/.test(txt.slice(0, 400000)) || txt.length < 200000) {
    return { ok: false, msg: 'Bu dosya bir GioReader Pro sürümü gibi görünmüyor.' };
  }
  const build = Number(mm[1]);
  if (build <= currentBuild()) return { ok: false, same: true, msg: 'Zaten güncel (' + mm[1] + ').' };
  const html = /^\s*<!doctype/i.test(txt) ? txt : HEAD + txt + '</body></html>';
  fs.mkdirSync(overrideDir(), { recursive: true });
  const dst = path.join(overrideDir(), 'index.html');
  fs.writeFileSync(dst + '.tmp', html, 'utf8');
  fs.renameSync(dst + '.tmp', dst);
  buildCache.delete(dst);
  return { ok: true, build, msg: 'Güncellendi (' + mm[1] + ').' };
}

function findDownloaded() {
  let best = null;
  try {
    const dl = app.getPath('downloads');
    for (const n of fs.readdirSync(dl)) {
      if (!/^gioreader[-_ ]?pro.*\.html?$/i.test(n)) continue;
      const f = path.join(dl, n);
      let st;
      try { st = fs.statSync(f); } catch (e) { continue; }
      if (!st.isFile() || st.size < 200000) continue;
      const b = buildOf(f);
      if (b && (!best || b > best.build)) best = { file: f, build: b };
    }
  } catch (e) {}
  return best;
}

async function reloadFresh() {
  if (!win) return;
  try {
    await Promise.race([
      win.webContents.executeJavaScript('window.__gioFlush ? window.__gioFlush() : 1'),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) {}
  win.webContents.reloadIgnoringCache();
}

app.setAppUserModelId('com.gioreaderpro.app');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'gio',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: false },
  },
]);

const ICON = fs.existsSync(path.join(__dirname, 'gioreader-pro.ico'))
  ? path.join(__dirname, 'gioreader-pro.ico')
  : path.join(__dirname, 'gioreader.ico');

let win = null;
let cfg = {};
let cfgFile = '';
let api = null;
let rootDir = '';
const allowedExternalFiles = new Set();

function loadCfg() {
  try {
    cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')) || {};
  } catch (e) {
    cfg = {};
  }
}

function saveCfg() {
  try {
    fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
    fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2));
  } catch (e) {}
}

function isDir(p) {
  try {
    return p && fs.statSync(p).isDirectory();
  } catch (e) {
    return false;
  }
}

function findExistingLibrary() {
  // 1) Eski GioReader yapılandırmasındaki klasörü kontrol et
  try {
    const oldCfgPath = path.join(app.getPath('appData'), 'GioReader', 'gioreader-config.json');
    if (fs.existsSync(oldCfgPath)) {
      const oldCfg = JSON.parse(fs.readFileSync(oldCfgPath, 'utf8'));
      if (oldCfg && oldCfg.folder && isDir(oldCfg.folder)) return oldCfg.folder;
    }
  } catch (e) {}

  // 2) Masaüstü ve OneDrive Masaüstü dizinlerini kontrol et
  const candidates = [];
  try { candidates.push(app.getPath('desktop')); } catch (e) {}
  try {
    const home = app.getPath('home');
    candidates.push(path.join(home, 'OneDrive', 'Masaüstü'));
    candidates.push(path.join(home, 'OneDrive', 'Desktop'));
    candidates.push(path.join(home, 'Desktop'));
  } catch (e) {}

  for (const desk of candidates) {
    if (!desk) continue;
    for (const n of ['GioReader', 'GioReader Pro', 'ayrık', 'Ayrık', 'ayrik']) {
      const p = path.join(desk, n);
      if (isDir(p)) return p;
    }
  }
  return null;
}

function chooseFolderDialog(parent, def) {
  const r = dialog.showOpenDialogSync(parent || undefined, {
    title: 'GioReader Pro kitaplık klasörünü seç',
    defaultPath: def || app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Bu klasörü kullan',
  });
  return r && r[0] ? r[0] : null;
}

function ensureFolder() {
  let f = process.env.GIO_FOLDER || cfg.folder;
  if (!f || !isDir(f)) {
    const existing = findExistingLibrary();
    if (existing) {
      f = existing;
    } else {
      f = path.join(app.getPath('documents'), 'GioReader Pro');
    }
  }
  try {
    fs.mkdirSync(f, { recursive: true });
  } catch (e) {}
  if (!process.env.GIO_FOLDER) {
    cfg.folder = f;
    saveCfg();
  }
  rootDir = f;
}

function createShortcuts() {
  if (process.platform !== 'win32') return { ok: false, msg: 'Yalnızca Windows' };
  const opts = {
    target: process.execPath,
    cwd: path.dirname(process.execPath),
    icon: ICON,
    iconIndex: 0,
    description: 'GioReader Pro — Akademik Okuma Stüdyosu',
    appUserModelId: 'com.gioreaderpro.app',
  };
  const made = [];
  try {
    const lnk = path.join(app.getPath('desktop'), 'GioReader Pro.lnk');
    if (shell.writeShortcutLink(lnk, 'create', opts)) made.push('Masaüstü');
  } catch (e) {}
  try {
    const sm = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    fs.mkdirSync(sm, { recursive: true });
    if (shell.writeShortcutLink(path.join(sm, 'GioReader Pro.lnk'), 'create', opts)) made.push('Başlat menüsü');
  } catch (e) {}
  return { ok: made.length > 0, msg: made.join(' + ') };
}

function wire() {
  api = fsapi.make(() => rootDir);
  for (const k of ['list', 'stat', 'dirExists', 'fileExists', 'read', 'readBin', 'write', 'writeBin', 'copyInternal', 'remove']) {
    ipcMain.handle('gio:' + k, async (_e, ...args) => api[k](...args));
  }
  ipcMain.handle('gio:copyExternalTo', async (_e, srcAbsPath, destParts) => {
    if (!srcAbsPath || typeof srcAbsPath !== 'string') throw new Error('Geçersiz kaynak dosya');
    const resolved = path.resolve(srcAbsPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error('Kaynak dosya bulunamadı');
    return api.copyExternalTo(resolved, destParts);
  });
  ipcMain.handle('gio:readExternalBin', async (_e, srcAbsPath) => {
    if (!srcAbsPath || typeof srcAbsPath !== 'string') throw new Error('Geçersiz dosya yolu');
    const cleanPath = srcAbsPath.startsWith('file://') ? decodeURIComponent(srcAbsPath.replace(/^file:\/\/\/?/, '')) : srcAbsPath;
    const resolved = path.resolve(cleanPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error('Dosya bulunamadı: ' + resolved);
    allowedExternalFiles.add(resolved);
    const buf = await fs.promises.readFile(resolved);
    const st = await fs.promises.stat(resolved);
    const u8 = new Uint8Array(buf.byteLength);
    u8.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
    return {
      ok: true,
      name: path.basename(resolved),
      path: resolved,
      externalPath: resolved,
      size: st.size,
      mtime: Math.round(st.mtimeMs),
      data: u8,
    };
  });
  ipcMain.handle('gio:pickFiles', async (_e, opts) => {
    opts = opts || {};
    const filters = opts.pdfOnly
      ? [{ name: 'PDF Belgeleri (*.pdf)', extensions: ['pdf', 'PDF'] }, { name: 'Tüm Dosyalar (*.*)', extensions: ['*'] }]
      : [
          { name: 'Desteklenen Ders Dosyaları (.md, .pdf, .tex, .txt)', extensions: ['md', 'markdown', 'pdf', 'PDF', 'tex', 'latex', 'txt'] },
          { name: 'PDF Belgeleri (.pdf)', extensions: ['pdf', 'PDF'] },
          { name: 'Markdown & LaTeX (.md, .tex, .txt)', extensions: ['md', 'markdown', 'tex', 'latex', 'txt'] },
        ];
    const r = await dialog.showOpenDialog(win || undefined, {
      title: opts.title || 'Ders Dosyası Seç (Markdown, LaTeX veya PDF)',
      defaultPath: opts.defaultPath || app.getPath('desktop'),
      filters,
      properties: opts.multi === false ? ['openFile'] : ['openFile', 'multiSelections'],
    });
    if (r.canceled || !r.filePaths || !r.filePaths.length) return [];
    const out = [];
    for (const fp of r.filePaths) {
      try {
        const resolved = path.resolve(fp);
        const st = await fs.promises.stat(resolved);
        if (!st.isFile()) continue;
        allowedExternalFiles.add(resolved);
        const ext = path.extname(resolved).toLowerCase();
        let isPdfFile = ext === '.pdf';
        if (!isPdfFile && st.size >= 8) {
          const fd = await fs.promises.open(resolved, 'r');
          try {
            const headBuf = Buffer.alloc(Math.min(1024, st.size));
            await fd.read(headBuf, 0, headBuf.length, 0);
            if (headBuf.indexOf(Buffer.from('%PDF-')) >= 0) isPdfFile = true;
          } finally {
            await fd.close();
          }
        }
        if (isPdfFile) {
          let u8 = null;
          if (st.size <= 120 * 1024 * 1024) {
            const buf = await fs.promises.readFile(resolved);
            u8 = new Uint8Array(buf.byteLength);
            u8.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
          }
          out.push({
            name: path.basename(resolved),
            path: resolved,
            externalPath: resolved,
            kind: 'pdf',
            size: st.size,
            mtime: Math.round(st.mtimeMs),
            u8,
          });
        } else {
          const text = (await fs.promises.readFile(resolved, 'utf8')).replace(/^\uFEFF/, '');
          out.push({ name: path.basename(resolved), path: resolved, externalPath: resolved, kind: 'text', text, size: st.size, mtime: Math.round(st.mtimeMs) });
        }
      } catch (e) {}
    }
    return out;
  });
  ipcMain.handle('gio:info', async () => ({
    folder: rootDir,
    name: path.basename(rootDir) || rootDir,
    platform: process.platform,
    version: app.getVersion(),
    build: currentBuild(),
    updated: activeDir() === overrideDir(),
    downloads: app.getPath('downloads'),
    desktop: app.getPath('desktop'),
  }));
  ipcMain.handle('gio:chooseFolder', async () => {
    const p = chooseFolderDialog(win, rootDir);
    if (!p) return null;
    try {
      fs.mkdirSync(p, { recursive: true });
    } catch (e) {
      return null;
    }
    rootDir = p;
    cfg.folder = p;
    saveCfg();
    return { folder: p, name: path.basename(p) || p };
  });
  ipcMain.handle('gio:openFolder', async (_e, subParts) => {
    try {
      const target = Array.isArray(subParts) && subParts.length ? api.abs(subParts) : rootDir;
      await shell.openPath(target);
      return true;
    } catch (e) {
      await shell.openPath(rootDir);
      return true;
    }
  });
  ipcMain.handle('gio:setZoom', async (_e, factor) => {
    if (!win) return 1;
    const f = Math.max(0.5, Math.min(3.0, Number(factor) || 1));
    win.webContents.setZoomFactor(f);
    return f;
  });
  ipcMain.handle('gio:getZoom', async () => {
    if (!win) return 1;
    return win.webContents.getZoomFactor();
  });
  ipcMain.handle('gio:updatePick', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Yeni GioReader Pro dosyasını seç',
      defaultPath: app.getPath('downloads'),
      filters: [{ name: 'GioReader Pro', extensions: ['html', 'htm'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, msg: '' };
    const res = installUpdateFile(r.filePaths[0]);
    if (res.ok) setTimeout(reloadFresh, 300);
    return res;
  });
  ipcMain.handle('gio:updateCheck', async () => {
    const f = findDownloaded();
    if (!f) return { ok: false, msg: 'İndirilenler klasöründe gioreader-pro.html bulunamadı.' };
    if (f.build <= currentBuild()) return { ok: false, same: true, msg: 'Zaten güncel (' + currentBuild() + ').' };
    const res = installUpdateFile(f.file);
    if (res.ok) setTimeout(reloadFresh, 300);
    return res;
  });
  ipcMain.handle('gio:updateReset', async () => {
    try {
      fs.rmSync(overrideDir(), { recursive: true, force: true });
    } catch (e) {}
    setTimeout(reloadFresh, 300);
    return { ok: true };
  });
  ipcMain.handle('gio:shortcut', async () => createShortcuts());
  ipcMain.handle('gio:printPdf', async (_e, name) => {
    if (!win) return false;
    const base = String(name || 'GioReader Pro').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'GioReader Pro';
    const r = await dialog.showSaveDialog(win, {
      title: 'PDF olarak kaydet',
      defaultPath: path.join(app.getPath('documents'), base + '.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (r.canceled || !r.filePath) return false;
    const data = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    fs.writeFileSync(r.filePath, data);
    shell.showItemInFolder(r.filePath);
    return true;
  });
}

function createWindow() {
  const b = cfg.bounds || {};
  win = new BrowserWindow({
    width: b.width || 1360,
    height: b.height || 880,
    x: b.x,
    y: b.y,
    minWidth: 420,
    minHeight: 540,
    backgroundColor: '#0B0F17',
    title: 'GioReader Pro',
    icon: ICON,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  if (cfg.maximized !== false) win.maximize();

  win.webContents.on('did-finish-load', async () => {
    try {
      // Chromium dahili visualViewport zoom'unu kilitle ki tüm 2-parmak touchpad pinch hareketleri
      // doğrudan 120 FPS odak-kilitli (anchor-locked) özel zoom motorumuz tarafından işlensin
      win.webContents.setVisualZoomLevelLimits(1, 1);
      win.webContents.setZoomFactor(1);
    } catch (e) {}

    if (process.env.GIO_SELF_TEST === '1') {
      try {
        const res = await win.webContents.executeJavaScript(`
          (async function() {
            try {
              if (window.__gioBootPromise) await window.__gioBootPromise;
              const api = window.__gioApi;
              const healedCount = await api.healLibraryMetadata();
              const m = api.loadMeta();
              const idx = api.loadPidx();
              const p16 = idx['ptueanzfgqt'];
              const pLab = idx['pu6mjo1r749'];
              const pProb30 = idx['pypqop407f1'];

              api.navTo('reader', { pid: 'ptueanzfgqt' });
              await new Promise(r => setTimeout(r, 500));
              const artTitle = document.querySelector('#article h1') ? document.querySelector('#article h1').textContent : '';

              // 1) Touchpad 2-parmak odak-kilitli (focal-point) yakınlaştırma testi (15 ardışık pinch adımı)
              window.scrollTo(0, 520);
              const vEl = document.getElementById('view');
              const fx = 480, fy = 320;
              const r0 = vEl.getBoundingClientRect();
              const localX0 = (fx - r0.left) / 1.0;
              const localY0 = (fy - r0.top) / 1.0;
              let curZ = 1.0;
              for (let step = 1; step <= 15; step++) {
                curZ = curZ * 1.055;
                api.setReaderZoom(curZ, { clientX: fx, clientY: fy, fromGesture: true });
              }
              const zoomAfterPinch = api.getZoomPct();
              const r1 = vEl.getBoundingClientRect();
              const zActual = curZ;
              const screenXAfter = r1.left + localX0 * zActual;
              const screenYAfter = r1.top + localY0 * zActual;
              const focalDriftX = Math.abs(screenXAfter - fx);
              const focalDriftY = Math.abs(screenYAfter - fy);
              api.resetReaderZoom();

              const diffEqUnit = api.findUnit('ui0qz4vfska').unit;
              const ua = api.computeUnitReadingAnalytics(diffEqUnit);

              // 2) Ayarlar Kontrol Merkezi sekme & dikey kaydırma (scroll) testi
              api.openSettings('pdf');
              const settingsTabsCount = document.querySelectorAll('.pset-modal .pset-tab').length;
              const settingsSwitchesCount = document.querySelectorAll('.pset-modal .pset-switch').length;
              const settingsPane = document.querySelector('.pset-modal .pset-pane');
              const firstGroup = document.querySelector('.pset-modal .pset-group');
              const groupFlexShrink = firstGroup ? getComputedStyle(firstGroup).flexShrink : '1';
              const settingsModal = document.querySelector('.sheet.pset-modal');
              if (settingsModal) settingsModal.style.height = '420px';
              let settingsScrollWorked = false;
              if (settingsPane) {
                settingsPane.scrollTop = 140;
                settingsScrollWorked = settingsPane.scrollTop > 80 && settingsPane.scrollHeight > settingsPane.clientHeight;
              }
              api.closeOverlay();

              const eeUnit = api.findUnit('u15mac0x3p4').unit;
              const pdfPath = ${JSON.stringify('C:\\Users\\Görkem\\OneDrive\\Masaüstü\\EE281\\Unite1_Devre_Degiskenleri_CH1.pdf')};
              const pdfSess = await api.inspectPdfForImport({
                name: 'Unite1_Devre_Degiskenleri_CH1.pdf',
                path: pdfPath
              }, eeUnit.id);

              const page1 = await pdfSess.pdfDoc.getPage(1);
              const vp1 = page1.getViewport({ scale: 1.0 });
              const dpr = 3.0;
              const testCv = document.createElement('canvas');
              testCv.width = Math.floor(vp1.width * dpr);
              testCv.height = Math.floor(vp1.height * dpr);
              await page1.render({ canvasContext: testCv.getContext('2d'), viewport: vp1, transform: [dpr, 0, 0, dpr, 0, 0] }).promise;
              const aspectDiff = Math.abs((vp1.width / vp1.height) - (testCv.width / testCv.height));

              const hasMultiPdf = typeof api.openMultiPdfImporter === 'function';

              // 3) PDF Metin Katmanı ve CSS Seçim Standartları Testi
              const cssRules = Array.from(document.styleSheets).flatMap(s => {
                try { return Array.from(s.cssRules || []); } catch(e) { return []; }
              });
              const hasTlText = cssRules.some(r => r.selectorText && r.selectorText.includes('.pdf-text-layer') && r.cssText.includes('user-select: text'));
              const hasCanvasIso = cssRules.some(r => r.selectorText && r.selectorText.includes('.pdf-canvas-wrap') && r.cssText.includes('pointer-events: none'));
              const hasTlSelection = cssRules.some(r => r.selectorText && r.selectorText.includes('.pdf-text-layer ::selection') && r.cssText.includes('rgba(37, 99, 235'));
              const hasCursorDefault = cssRules.some(r => r.selectorText && r.selectorText.includes('.pdf-text-layer') && r.cssText.includes('cursor: default'));
              const hasCanvasSelTransparent = cssRules.some(r => r.selectorText && r.selectorText.includes('.pdf-canvas-wrap') && r.cssText.includes('background: transparent'));

              // 4) MATH 219 Soru Föyleri & Ünite Ağacı Testi
              const diffEqId = diffEqUnit ? diffEqUnit.id : 'ui0qz4vfska';
              const postTreePs = api.subPartsOfUnit(diffEqId);
              const postMainPs = api.mainPartsOfUnit(diffEqId);

              // 5) Course Görünümü Ağaç Testi ("Derse bakarken soruları ağaç yapısıyla görmem lazım")
              api.navTo('course', { cid: diffEqUnit.cid });
              await new Promise(r => setTimeout(r, 400));
              const hasUcardTree = !!document.querySelector('.ucard-tree');
              const ucardTreeItemsCount = document.querySelectorAll('.ucard-tree-item').length;

              // 6) Unit Görünümü Ağaç Testi
              api.navTo('unit', { uid: diffEqId });
              await new Promise(r => setTimeout(r, 400));
              const hasUnitTreeSection = !!document.querySelector('.unit-tree-section');

              api.navTo('home');
              await api.flushSyncPush();

              return {
                ok: focalDriftX < 1.5 && focalDriftY < 1.5 && groupFlexShrink === '0' && settingsScrollWorked && hasMultiPdf && hasTlText && hasCanvasIso && hasTlSelection && hasCursorDefault && hasCanvasSelTransparent && hasUcardTree && postTreePs.length === 4,
                hasMultiPdfImporter: hasMultiPdf,
                textSelectionStandards: {
                  tlUserSelectText: hasTlText,
                  canvasPointerEventsNone: hasCanvasIso,
                  textLayerSelectionColor: hasTlSelection,
                  cursorDefaultAlways: hasCursorDefault,
                  canvasSelectionTransparent: hasCanvasSelTransparent
                },
                courseViewTree: {
                  courseTreeRendered: hasUcardTree,
                  questionItemsInCourseView: ucardTreeItemsCount
                },
                unitTreeTest: {
                  diffEqId,
                  treePartsCount: postTreePs.length,
                  mainPartsCount: postMainPs.length,
                  unitMaxN: diffEqUnit ? diffEqUnit.n : null,
                  treeSectionRenderedInUnitView: hasUnitTreeSection
                },
                healedCount,
                coursesCount: m.courses.length,
                partsCount: Object.keys(idx).length,
                healedSamples: {
                  p16: p16 ? p16.title : null,
                  pLab: pLab ? pLab.title : null,
                  pProb30: pProb30 ? pProb30.title : null
                },
                artTitle,
                zoomAfterPinch,
                focalZoomTest: {
                  targetClientX: fx,
                  targetClientY: fy,
                  actualScreenX: +screenXAfter.toFixed(2),
                  actualScreenY: +screenYAfter.toFixed(2),
                  driftXPx: +focalDriftX.toFixed(3),
                  driftYPx: +focalDriftY.toFixed(3)
                },
                settingsControlCenter: {
                  tabs: settingsTabsCount,
                  switches: settingsSwitchesCount,
                  groupFlexShrink,
                  scrollable: settingsScrollWorked
                },
                unitAnalytics: {
                  unitName: ua.unitName,
                  doneParts: ua.doneParts,
                  totalSecSpent: ua.totalSecSpent,
                  avgSecPerDone: ua.avgSecPerDone,
                  remainingEstSec: ua.remainingEstSec
                },
                pdfTest: {
                  numPages: pdfSess.numPages,
                  detectedTitle: pdfSess.singleTitle,
                  hiDpiSize: testCv.width + 'x' + testCv.height,
                  aspectDistortion: aspectDiff
                }
              };
            } catch (innerErr) {
              return { ok: false, innerError: String(innerErr && (innerErr.stack || innerErr.message) || JSON.stringify(innerErr)) };
            }
          })();
        `);
        if (process.env.GIO_SELF_TEST_OUT) {
          fs.writeFileSync(process.env.GIO_SELF_TEST_OUT, JSON.stringify(res, null, 2), 'utf8');
        }
      } catch (err) {
        if (process.env.GIO_SELF_TEST_OUT) {
          fs.writeFileSync(process.env.GIO_SELF_TEST_OUT, JSON.stringify({ ok: false, error: String(err && err.stack || err) }, null, 2), 'utf8');
        }
      }
      app.exit(0);
    }
  });

  win.once('ready-to-show', () => {
    if (process.env.GIO_SELF_TEST !== '1') win.show();
  });

  win.loadURL('gio://app/index.html');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('gio://')) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const wc = win.webContents;
    const ctrl = input.control || input.meta;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (ctrl && (input.key === '+' || input.key === '=')) {
      wc.executeJavaScript('window.__gioZoomStep && window.__gioZoomStep(0.1)').catch(() => {});
      e.preventDefault();
    } else if (ctrl && (input.key === '-' || input.key === '_')) {
      wc.executeJavaScript('window.__gioZoomStep && window.__gioZoomStep(-0.1)').catch(() => {});
      e.preventDefault();
    } else if (ctrl && input.key === '0') {
      wc.executeJavaScript('window.__gioZoomReset && window.__gioZoomReset()').catch(() => {});
      wc.setZoomFactor(1);
      e.preventDefault();
    } else if (ctrl && input.shift && (input.key === 'I' || input.key === 'i')) {
      wc.toggleDevTools();
      e.preventDefault();
    } else if (input.key === 'F5' || (ctrl && (input.key === 'r' || input.key === 'R'))) {
      wc.reload();
      e.preventDefault();
    }
  });

  win.webContents.on('context-menu', (_e, p) => {
    if (!p.isEditable && !p.selectionText) return;
    const tpl = [];
    if (p.isEditable) tpl.push({ role: 'cut', label: 'Kes' });
    tpl.push({ role: 'copy', label: 'Kopyala' });
    if (p.isEditable) tpl.push({ role: 'paste', label: 'Yapıştır' });
    tpl.push({ type: 'separator' }, { role: 'selectAll', label: 'Tümünü seç' });
    Menu.buildFromTemplate(tpl).popup({ window: win });
  });

  let closing = false;
  win.on('close', async (e) => {
    if (closing) return;
    e.preventDefault();
    closing = true;
    try {
      cfg.maximized = win.isMaximized();
      if (!win.isMaximized() && !win.isFullScreen()) cfg.bounds = win.getBounds();
      saveCfg();
    } catch (err) {}
    try {
      await Promise.race([
        win.webContents.executeJavaScript('window.__gioFlush ? window.__gioFlush() : 1'),
        new Promise((r) => setTimeout(r, 4500)),
      ]);
    } catch (err) {}
    win.destroy();
  });
  win.on('closed', () => {
    win = null;
  });
  if (process.env.GIO_TEST_CLOSE_FILE) {
    const iv = setInterval(() => {
      if (fs.existsSync(process.env.GIO_TEST_CLOSE_FILE)) {
        clearInterval(iv);
        if (win) win.close();
      }
    }, 150);
  }
}

const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    cfgFile = path.join(app.getPath('userData'), 'gioreader-pro-config.json');
    loadCfg();
    const first = !cfg.folder;
    ensureFolder();
    if (first && !cfg.shortcut) {
      cfg.shortcut = true;
      saveCfg();
      createShortcuts();
    }

    protocol.handle('gio', (req) => {
      const u = new URL(req.url);
      if (u.hostname === 'lib') {
        // Kütüphane içindeki dosyaları (PDF, görsel vb.) doğrudan akışla sun
        const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
        const segs = rel.split('/').filter(Boolean);
        try {
          const f = api.abs(segs);
          if (!fs.existsSync(f)) return new Response('Not found', { status: 404 });
          return net.fetch(pathToFileURL(f).toString());
        } catch (e) {
          return new Response('Forbidden', { status: 403 });
        }
      }
      if (u.hostname === 'ext') {
        const fp = u.searchParams.get('path');
        if (!fp) return new Response('Bad request', { status: 400 });
        const resolved = path.resolve(fp);
        const isPdf = path.extname(resolved).toLowerCase() === '.pdf';
        if ((!allowedExternalFiles.has(resolved) && !isPdf) || !fs.existsSync(resolved)) {
          return new Response('Forbidden', { status: 403 });
        }
        return net.fetch(pathToFileURL(resolved).toString());
      }
      let p = decodeURIComponent(u.pathname);
      if (p === '/' || p === '') p = '/index.html';
      let appDir = activeDir();
      let f = path.normalize(path.join(appDir, p));
      if (!f.startsWith(appDir + path.sep) || !fs.existsSync(f)) {
        const bf = path.normalize(path.join(bundledDir(), p));
        if (bf.startsWith(bundledDir() + path.sep) && fs.existsSync(bf)) {
          f = bf;
        } else {
          return new Response('Not found', { status: 404 });
        }
      }
      return net.fetch(pathToFileURL(f).toString());
    });
    wire();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('window-all-closed', () => app.quit());
}
