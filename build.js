const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');
const wwwDir = path.join(root, 'www');

const jsFiles = [
  'core-latex-and-parser.js',
  'storage-and-sync.js',
  'zoom-and-analytics.js',
  'pdf-engine.js',
  'ui-views.js'
];

console.log('1) Checking JS syntax of all modules...');
let combinedJs = '';
for (const f of jsFiles) {
  const p = path.join(srcDir, f);
  const code = fs.readFileSync(p, 'utf8');
  try {
    new Function(code);
    console.log(`   [OK] ${f} (${code.length.toLocaleString()} bytes)`);
  } catch (err) {
    console.error(`   [SYNTAX ERROR] in ${f}:`, err);
    process.exit(1);
  }
  combinedJs += `\n/* === MODULE: ${f} === */\n` + code + '\n';
}

const css = fs.readFileSync(path.join(srcDir, 'app-style.css'), 'utf8');
const vendorLibs = fs.readFileSync(path.join(srcDir, 'vendor-libs.html'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="tr" data-theme="paper" data-font="serif" data-justify="1" data-eqnum="1" data-focus="0">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
<title>GioReader Pro — Akademik Ders, LaTeX ve Ultra-HD PDF Okuyucu</title>
<style>
${css}
</style>
</head>
<body>
  <div id="readProgressBar"></div>
  <header class="topbar" id="topbar"></header>
  <div class="workspace-shell">
    <aside class="pro-sidebar" id="proSidebar"></aside>
    <main class="main-stage" id="mainStage"></main>
  </div>

  <!-- Metin ve PDF Seçim Vurgulama Balonu -->
  <div id="selPop">
    <button class="hl-dot y" data-hl-col="y" title="Sarı Vurgu"></button>
    <button class="hl-dot g" data-hl-col="g" title="Yeşil Vurgu"></button>
    <button class="hl-dot b" data-hl-col="b" title="Mavi Vurgu"></button>
    <button class="hl-dot p" data-hl-col="p" title="Pembe Vurgu"></button>
  </div>

  <!-- 2-Parmak Touchpad Zoom Göstergesi -->
  <div id="zoomHud"></div>

  <!-- Modallar ve Bildirim -->
  <div id="modalHost"></div>
  <div id="toast"></div>

  <!-- Çevrimdışı Matematik (MathJax v3), Markdown (Marked) ve Kod (Highlight.js) Kütüphaneleri -->
  ${vendorLibs}

  <!-- Çevrimdışı Ultra-HD Mozilla PDF.js Motoru -->
  <script src="pdf.worker.min.js"></script>
  <script src="pdf.min.js"></script>

  <!-- GioReader Pro Çekirdek Uygulama Motoru -->
  <script>
(function(){
"use strict";
${combinedJs}
})();
  </script>
</body>
</html>
`;

fs.mkdirSync(wwwDir, { recursive: true });
const outPath = path.join(wwwDir, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`2) Built www/index.html (${html.length.toLocaleString()} bytes) successfully!`);
