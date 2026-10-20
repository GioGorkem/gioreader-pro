'use strict';
/* Seçili kök klasör altında güvenli metin ve ikili (PDF/görsel) dosya işlemleri */
const fs = require('fs');
const path = require('path');
const P = fs.promises;

function make(getRoot) {
  function abs(parts) {
    const root = path.resolve(getRoot());
    const segs = (Array.isArray(parts) ? parts : []).map(String);
    for (const s of segs) {
      if (!s || s === '.' || s === '..' || /[\\/\0]/.test(s)) throw new Error('Geçersiz yol: ' + s);
    }
    const p = path.resolve(root, ...segs);
    if (p !== root && !p.startsWith(root + path.sep)) throw new Error('Geçersiz yol sınırı');
    return p;
  }

  return {
    abs,
    async list(parts) {
      const out = [];
      const dir = abs(parts);
      let entries = [];
      try {
        entries = await P.readdir(dir, { withFileTypes: true });
      } catch (e) {
        return out;
      }
      for (const e of entries) {
        if (e.isDirectory()) out.push({ name: e.name, kind: 'directory' });
        else if (e.isFile()) {
          let size = 0, mtime = 0;
          try {
            const st = await P.stat(path.join(dir, e.name));
            size = st.size;
            mtime = Math.round(st.mtimeMs);
          } catch (_) {}
          out.push({ name: e.name, kind: 'file', size, mtime });
        }
      }
      return out;
    },
    async dirExists(parts, create) {
      const d = abs(parts);
      try {
        return (await P.stat(d)).isDirectory();
      } catch (e) {
        if (!create) return false;
        await P.mkdir(d, { recursive: true });
        return true;
      }
    },
    async fileExists(parts, create) {
      const f = abs(parts);
      try {
        return (await P.stat(f)).isFile();
      } catch (e) {
        if (!create) return false;
        await P.mkdir(path.dirname(f), { recursive: true });
        await P.writeFile(f, '');
        return true;
      }
    },
    async stat(parts) {
      try {
        const f = abs(parts);
        const st = await P.stat(f);
        return { exists: true, isFile: st.isFile(), isDirectory: st.isDirectory(), size: st.size, mtime: Math.round(st.mtimeMs) };
      } catch (e) {
        return { exists: false };
      }
    },
    async read(parts) {
      try {
        const f = abs(parts);
        const [txt, st] = await Promise.all([P.readFile(f, 'utf8'), P.stat(f)]);
        return { ok: true, text: txt.replace(/^\uFEFF/, ''), mtime: Math.round(st.mtimeMs), size: st.size };
      } catch (e) {
        return { ok: false, text: null };
      }
    },
    async readBin(parts) {
      const f = abs(parts);
      const [buf, st] = await Promise.all([P.readFile(f), P.stat(f)]);
      const u8 = new Uint8Array(buf.byteLength);
      u8.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
      return { ok: true, data: u8, mtime: Math.round(st.mtimeMs), size: st.size };
    },
    async write(parts, text) {
      const f = abs(parts);
      await P.mkdir(path.dirname(f), { recursive: true });
      const tmp = f + '.tmp-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      await P.writeFile(tmp, String(text), 'utf8');
      try {
        await P.rename(tmp, f);
      } catch (e) {
        await P.copyFile(tmp, f);
        await P.rm(tmp, { force: true });
      }
      return true;
    },
    async writeBin(parts, data) {
      const f = abs(parts);
      await P.mkdir(path.dirname(f), { recursive: true });
      const tmp = f + '.tmp-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      await P.writeFile(tmp, buf);
      try {
        await P.rename(tmp, f);
      } catch (e) {
        await P.copyFile(tmp, f);
        await P.rm(tmp, { force: true });
      }
      return { ok: true, size: buf.length };
    },
    async copyExternalTo(srcAbsPath, destParts) {
      const dst = abs(destParts);
      await P.mkdir(path.dirname(dst), { recursive: true });
      await P.copyFile(srcAbsPath, dst);
      const st = await P.stat(dst);
      return { ok: true, size: st.size, mtime: Math.round(st.mtimeMs) };
    },
    async copyInternal(srcParts, destParts) {
      const src = abs(srcParts);
      const dst = abs(destParts);
      if (src === dst) return { ok: true };
      await P.mkdir(path.dirname(dst), { recursive: true });
      await P.copyFile(src, dst);
      return { ok: true };
    },
    async remove(parts) {
      await P.rm(abs(parts), { recursive: true, force: true });
      return true;
    },
  };
}

module.exports = { make };
