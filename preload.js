'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const call = (name) => (...args) => ipcRenderer.invoke('gio:' + name, ...args);

contextBridge.exposeInMainWorld('gioNative', {
  isDesktop: true,
  isPro: true,
  info: call('info'),
  getFolder: () =>
    ipcRenderer.invoke('gio:info').then((r) => (r && r.folder ? { path: r.folder, name: r.name } : null)),
  chooseFolder: call('chooseFolder'),
  pickFolder: () =>
    ipcRenderer.invoke('gio:chooseFolder').then((r) => (r && r.folder ? { path: r.folder, name: r.name } : null)),
  clearFolder: () => Promise.resolve(true),
  openFolder: call('openFolder'),
  shortcut: call('shortcut'),
  printPdf: call('printPdf'),
  pickFiles: call('pickFiles'),
  readExternalBin: call('readExternalBin'),
  copyExternalTo: call('copyExternalTo'),
  copyInternal: call('copyInternal'),
  setZoom: call('setZoom'),
  getZoom: call('getZoom'),
  updatePick: call('updatePick'),
  updateCheck: call('updateCheck'),
  updateReset: call('updateReset'),
  list: call('list'),
  stat: call('stat'),
  dirExists: call('dirExists'),
  fileExists: call('fileExists'),
  read: call('read'),
  readText: (segs) =>
    ipcRenderer.invoke('gio:read', segs).then((r) => ({ text: r && r.text != null ? r.text : null })),
  readBin: call('readBin'),
  write: call('write'),
  writeText: (segs, text) =>
    ipcRenderer.invoke('gio:write', segs, text).then((r) => (r && r.ok === false ? { error: 'Yazma hatası' } : { ok: true })),
  writeBin: call('writeBin'),
  remove: (segs) => ipcRenderer.invoke('gio:remove', segs),
  getPathForFile: (file) => {
    try {
      return webUtils && typeof webUtils.getPathForFile === 'function' ? webUtils.getPathForFile(file) : (file && file.path) || '';
    } catch (e) {
      return (file && file.path) || '';
    }
  },
});
