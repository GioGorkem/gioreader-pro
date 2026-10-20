const fs = require('fs');
const path = require('path');

const oldRuntimeDir = 'C:\\Users\\Görkem\\AppData\\Local\\GioReader';
const newRuntimeDir = 'C:\\Users\\Görkem\\AppData\\Local\\GioReaderPro';
const srcProjectDir = 'C:\\Users\\Görkem\\.gemini\\antigravity\\scratch\\GioReaderPro';

function copyFileSyncSafe(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(src, dest, skipNames = new Set()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipNames.has(ent.name)) continue;
    const sp = path.join(src, ent.name);
    const dp = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursive(sp, dp, skipNames);
    } else if (ent.isFile()) {
      fs.copyFileSync(sp, dp);
    }
  }
}

console.log('1) Copying Electron runtime binaries to C:\\Users\\Görkem\\AppData\\Local\\GioReaderPro ...');
fs.mkdirSync(newRuntimeDir, { recursive: true });

for (const ent of fs.readdirSync(oldRuntimeDir, { withFileTypes: true })) {
  const sp = path.join(oldRuntimeDir, ent.name);
  if (ent.name === 'resources') {
    // Copy resources except 'app'
    copyDirRecursive(sp, path.join(newRuntimeDir, 'resources'), new Set(['app']));
  } else if (ent.name.toLowerCase() === 'gioreader.exe') {
    const destExe = path.join(newRuntimeDir, 'GioReaderPro.exe');
    if (!fs.existsSync(destExe)) {
      fs.copyFileSync(sp, destExe);
    }
  } else if (ent.isDirectory()) {
    copyDirRecursive(sp, path.join(newRuntimeDir, ent.name));
  } else if (ent.isFile()) {
    fs.copyFileSync(sp, path.join(newRuntimeDir, ent.name));
  }
}

console.log('2) Deploying GioReader Pro app bundle into resources/app ...');
const destAppDir = path.join(newRuntimeDir, 'resources', 'app');
fs.mkdirSync(destAppDir, { recursive: true });

for (const f of ['package.json', 'main.js', 'preload.js', 'fsapi.js', 'gioreader-pro.ico', 'gioreader.ico']) {
  copyFileSyncSafe(path.join(srcProjectDir, f), path.join(destAppDir, f));
}

copyDirRecursive(path.join(srcProjectDir, 'www'), path.join(destAppDir, 'www'));
console.log('3) GioReaderPro.exe deployed successfully at:', path.join(newRuntimeDir, 'GioReaderPro.exe'));
