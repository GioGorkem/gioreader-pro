/* ============================================================================
   GioReader Pro — Storage, IndexedDB, .gioreader-pro Sync & Legacy Migration
   ============================================================================ */

var LSK='grp1:';
function lsGet(k,d){try{var v=localStorage.getItem(LSK+k);return v==null?d:JSON.parse(v);}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(LSK+k,JSON.stringify(v));return true;}catch(e){return false;}}
function lsDel(k){try{localStorage.removeItem(LSK+k);}catch(e){}}

var PREFS_DEF={
  theme:'paper',
  font:'serif',
  size:18,
  lh:1.78,
  col:740,
  justify:true,
  eqNum:true,
  tocOpen:true,
  sidebarOpen:true,
  focus:false,
  wpm:170,
  zoom:1.0,
  pdfZoomMode:'fit-width',
  pdfSpread:'single',
  pdfFilter:'auto',
  pdfAutoCrop:false,
  autoCompleteAt95:true,
  showUnitAnalytics:true
};

var META_DEF={v:4,u:0,courses:[],log:{},dc:{},healedV2:false};
var TOMB_RETENTION=90*86400000;

var meta=null,prefs=null,pidx=null,rstate=null,tomb=null;
function uid(p){return (p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

function loadMeta(){
  if(meta) return meta;
  meta=lsGet('meta',null);
  if(!meta||typeof meta!=='object') meta=JSON.parse(JSON.stringify(META_DEF));
  if(!Array.isArray(meta.courses)) meta.courses=[];
  if(!meta.log||typeof meta.log!=='object') meta.log={};
  if(!meta.dc||typeof meta.dc!=='object') meta.dc={};
  meta.courses.forEach(function(c){
    if(!Array.isArray(c.units)) c.units=[];
    if(!c.du||typeof c.du!=='object') c.du={};
    c.units.forEach(function(u){
      if(!u.hints||typeof u.hints!=='object') u.hints={};
      if(typeof u.n!=='number'||u.n<1) u.n=16;
    });
  });
  return meta;
}
function saveMeta(skipTouch){
  if(!skipTouch) meta.u=Date.now();
  lsSet('meta',meta);
  scheduleSyncPush('meta');
}
function loadTomb(){if(!tomb) tomb=lsGet('tomb',{})||{};return tomb;}
function saveTomb(){lsSet('tomb',tomb);scheduleSyncPush('meta');}
function loadPrefs(){
  if(!prefs) prefs=Object.assign({},PREFS_DEF,lsGet('prefs',{})||{});
  return prefs;
}
function savePrefs(){lsSet('prefs',prefs);}
function loadPidx(){if(!pidx) pidx=lsGet('pidx',{})||{};return pidx;}
function savePidx(){lsSet('pidx',pidx);scheduleSyncPush('parts');}
function loadRstate(){if(!rstate) rstate=lsGet('rstate',{})||{};return rstate;}
function saveRstate(){lsSet('rstate',rstate);scheduleSyncPush('state');}

function touchCourse(c){var t=Date.now();c.u=t;meta.u=t;}
function touchUnit(u,c){var t=Date.now();u.u=t;if(c) c.u=t;meta.u=t;}

function getState(pid){
  var s=loadRstate();
  if(!s[pid]) s[pid]={pos:0,sec:0,hl:[],u:0,sessions:0};
  if(!Array.isArray(s[pid].hl)) s[pid].hl=[];
  if(typeof s[pid].u!=='number') s[pid].u=0;
  if(typeof s[pid].sec!=='number') s[pid].sec=0;
  if(typeof s[pid].pos!=='number') s[pid].pos=0;
  if(typeof s[pid].sessions!=='number') s[pid].sessions=0;
  return s[pid];
}
function touchState(pid){
  var st=getState(pid);
  st.u=Date.now();
  saveRstate();
  return st;
}

/* ---------- IndexedDB Metin & PDF Önbellek Katmanı ---------- */
var dbP=null,memBodies={},memBins={};
function openDB(){
  if(dbP) return dbP;
  dbP=new Promise(function(res){
    if(!window.indexedDB){res(null);return;}
    try{
      var r=indexedDB.open('gioreader-pro',2);
      r.onupgradeneeded=function(){
        var d=r.result;
        if(!d.objectStoreNames.contains('bodies')) d.createObjectStore('bodies');
        if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if(!d.objectStoreNames.contains('bins')) d.createObjectStore('bins');
      };
      r.onsuccess=function(){res(r.result);};
      r.onerror=function(){res(null);};
    }catch(e){res(null);}
  });
  return dbP;
}

function getBody(pid,skipSync){
  if(Object.prototype.hasOwnProperty.call(memBodies,pid)) return Promise.resolve(memBodies[pid]);
  return openDB().then(function(d){
    if(!d){
      var v=lsGet('b:'+pid,null);
      if(v!=null){memBodies[pid]=v;return v;}
      return skipSync?null:readPartFileFromDisk(pid);
    }
    return new Promise(function(res){
      try{
        var tx=d.transaction('bodies','readonly');
        var rq=tx.objectStore('bodies').get(pid);
        rq.onsuccess=function(){
          var v=rq.result==null?lsGet('b:'+pid,null):rq.result;
          if(v!=null){memBodies[pid]=v;res(v);}
          else if(!skipSync){readPartFileFromDisk(pid).then(res);}
          else res(null);
        };
        rq.onerror=function(){res(lsGet('b:'+pid,null));};
      }catch(e){res(lsGet('b:'+pid,null));}
    });
  });
}

function putBody(pid,text,skipSync){
  memBodies[pid]=text;
  return openDB().then(function(d){
    if(!d){lsSet('b:'+pid,text);if(!skipSync) syncWritePartFile(pid,text);return;}
    return new Promise(function(res){
      try{
        var tx=d.transaction('bodies','readwrite');
        tx.objectStore('bodies').put(text,pid);
        tx.oncomplete=function(){if(!skipSync) syncWritePartFile(pid,text);res();};
        tx.onerror=function(){lsSet('b:'+pid,text);if(!skipSync) syncWritePartFile(pid,text);res();};
      }catch(e){lsSet('b:'+pid,text);if(!skipSync) syncWritePartFile(pid,text);res();}
    });
  });
}

function delBody(pid,skipSync){
  var p=loadPidx()[pid];
  delete memBodies[pid];
  lsDel('b:'+pid);
  if(!skipSync&&p) syncDeletePartFile(p);
  return openDB().then(function(d){
    if(!d) return;
    return new Promise(function(res){
      try{var tx=d.transaction('bodies','readwrite');tx.objectStore('bodies').delete(pid);tx.oncomplete=function(){res();};tx.onerror=function(){res();};}catch(e){res();}
    });
  });
}

function idbKvGet(k){
  return openDB().then(function(d){
    if(!d) return null;
    return new Promise(function(res){
      try{var r=d.transaction('kv','readonly').objectStore('kv').get(k);r.onsuccess=function(){res(r.result||null);};r.onerror=function(){res(null);};}catch(e){res(null);}
    });
  });
}
function idbKvSet(k,v){
  return openDB().then(function(d){
    if(!d) return false;
    return new Promise(function(res){
      try{var tx=d.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=function(){res(true);};tx.onerror=function(){res(false);};}catch(e){res(false);}
    });
  });
}
function idbKvDel(k){
  return openDB().then(function(d){
    if(!d) return;
    return new Promise(function(res){
      try{var tx=d.transaction('kv','readwrite');tx.objectStore('kv').delete(k);tx.oncomplete=function(){res();};tx.onerror=function(){res();};}catch(e){res();}
    });
  });
}

/* ---------- Native / Klasör Senkronizasyon Köprüsü (.gioreader-pro) ---------- */
var NATIVE=typeof window!=='undefined'&&window.gioNative&&window.gioNative.isDesktop?window.gioNative:null;
var SYNC_DIR='.gioreader-pro';
var LEGACY_SYNC_DIR='.ayrik';

var sync={
  supported:!!(NATIVE||(typeof window!=='undefined'&&'showDirectoryPicker' in window)),
  native:!!NATIVE,
  handle:null,
  name:lsGet('syncName',null),
  path:null,
  perm:'none',
  busy:false,
  last:lsGet('syncLast',0),
  err:null,
  timer:null,
  dirty:{meta:false,parts:false,state:false},
  migratedFromLegacy:false
};

function sanitizeSeg(s,fallback){
  var t=String(s||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').replace(/^[.\s]+|[.\s]+$/g,'').slice(0,72);
  if(!t||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(t)) t=fallback||'adsiz';
  return t;
}

function partFileName(p){
  var n=String(p.no||0).padStart(2,'0');
  var rawTitle=p.title||'adsiz';
  if(/^Part\s+\d+$/i.test(rawTitle)) rawTitle='adsiz';
  var t=sanitizeSeg(rawTitle,'adsiz');
  var ext=p.kind==='pdf'?'.pdf':'.md';
  return n+' - '+t+ext;
}

function getDirChain(root,segs,create){
  var p=Promise.resolve(root);
  segs.forEach(function(s){
    p=p.then(function(d){return d?d.getDirectoryHandle(s,{create:!!create}):null;});
  });
  return p;
}

function writeTextFile(root,segs,name,text){
  if(NATIVE){
    if(!sync.handle) return Promise.resolve();
    return NATIVE.writeText(segs.concat([name]),String(text||'')).then(function(r){
      if(r&&r.error) throw new Error(r.error);
    });
  }
  return getDirChain(root,segs,true).then(function(d){
    return d.getFileHandle(name,{create:true});
  }).then(function(fh){
    return fh.createWritable();
  }).then(function(w){
    return w.write(text).then(function(){return w.close();});
  });
}

function readTextFile(root,segs,name){
  if(NATIVE){
    if(!sync.handle) return Promise.resolve(null);
    return NATIVE.readText(segs.concat([name])).then(function(r){return r&&r.text!=null?r.text:null;}).catch(function(){return null;});
  }
  return getDirChain(root,segs,false).then(function(d){
    return d?d.getFileHandle(name,{create:false}):null;
  }).then(function(fh){return fh?fh.getFile():null;}).then(function(f){return f?f.text():null;}).catch(function(){return null;});
}

function readJsonFile(root,segs,name){
  return readTextFile(root,segs,name).then(function(t){
    if(!t) return null;
    try{return JSON.parse(t);}catch(e){return null;}
  });
}

function removeEntry(root,segs,name,recursive){
  if(NATIVE){
    if(!sync.handle) return Promise.resolve();
    return NATIVE.remove(segs.concat([name]),!!recursive).catch(function(){});
  }
  return getDirChain(root,segs,false).then(function(d){
    if(!d) return;
    return d.removeEntry(name,{recursive:!!recursive}).catch(function(){});
  }).catch(function(){});
}

function computePartPath(p){
  var m=loadMeta();
  var c=m.courses.find(function(x){return x.id===p.cid;});
  var u=c&&c.units.find(function(x){return x.id===p.uid;});
  if(!c||!u) return null;
  var cf=c.folder||sanitizeSeg(c.name,'Ders');
  var uf=u.folder||sanitizeSeg(u.name,'Unite');
  c.folder=cf;u.folder=uf;
  return [cf,uf,partFileName(p)];
}

function readPartFileFromDisk(pid){
  if(!sync.handle||sync.perm!=='granted') return Promise.resolve(null);
  var p=loadPidx()[pid];
  if(!p||p.kind==='pdf') return Promise.resolve(null);
  var pathSegs=Array.isArray(p.fn)&&p.fn.length===3?p.fn:computePartPath(p);
  if(!pathSegs) return Promise.resolve(null);
  return readTextFile(sync.handle,[pathSegs[0],pathSegs[1]],pathSegs[2]).then(function(txt){
    if(txt!=null) memBodies[pid]=txt;
    return txt;
  });
}

/* ---------- PDF Kaynak Okuma / Streaming Köprüsü ---------- */
function getPdfSourceForPart(p){
  if(!p||p.kind!=='pdf') return Promise.resolve(null);
  var pathSegs=Array.isArray(p.pdfFn)&&p.pdfFn.length===3?p.pdfFn:(Array.isArray(p.fn)&&p.fn.length===3?p.fn:computePartPath(p));
  var binKey=p.pdfBinKey||(pathSegs?'pdf:'+pathSegs.join('/'):'pdf:'+p.id);
  if(memBins[binKey]){
    return Promise.resolve({data:memBins[binKey].slice(0),startPage:p.pdfStart||1,endPage:p.pdfEnd||null});
  }
  if(NATIVE&&sync.handle&&pathSegs){
    return NATIVE.readBin(pathSegs).then(function(r){
      if(!r||!r.data) return null;
      var u8=r.data instanceof Uint8Array?r.data:new Uint8Array(r.data);
      memBins[binKey]=u8;
      return {
        data:u8.slice(0),
        pathSegs:pathSegs,
        startPage:p.pdfStart||1,
        endPage:p.pdfEnd||null
      };
    }).catch(function(){return null;});
  }
  if(NATIVE&&p.externalPath){
    return NATIVE.readExternalBin(p.externalPath).then(function(r){
      if(!r||!r.data) return null;
      var u8=r.data instanceof Uint8Array?r.data:new Uint8Array(r.data);
      memBins[binKey]=u8;
      return {
        data:u8.slice(0),
        startPage:p.pdfStart||1,
        endPage:p.pdfEnd||null
      };
    }).catch(function(){return null;});
  }
  if(sync.handle&&!NATIVE&&pathSegs){
    return getDirChain(sync.handle,[pathSegs[0],pathSegs[1]],false).then(function(d){
      return d?d.getFileHandle(pathSegs[2],{create:false}):null;
    }).then(function(fh){return fh?fh.getFile():null;}).then(function(f){return f?f.arrayBuffer():null;}).then(function(ab){
      if(!ab) return null;
      var u8=new Uint8Array(ab);
      memBins[binKey]=u8;
      return {data:u8.slice(0),startPage:p.pdfStart||1,endPage:p.pdfEnd||null};
    });
  }
  return openDB().then(function(d){
    if(!d) return null;
    return new Promise(function(res){
      try{
        var rq=d.transaction('bins','readonly').objectStore('bins').get(binKey);
        rq.onsuccess=function(){
          if(rq.result){
            var u8=new Uint8Array(rq.result);
            memBins[binKey]=u8;
            res({data:u8.slice(0),startPage:p.pdfStart||1,endPage:p.pdfEnd||null});
          }else res(null);
        };
        rq.onerror=function(){res(null);};
      }catch(e){res(null);}
    });
  });
}

function storePdfFileInLibrary(course,unit,destFileName,sourceObj){
  // sourceObj: { externalPath?: string, data?: Uint8Array|ArrayBuffer }
  var cf=course.folder||sanitizeSeg(course.name,'Ders');
  var uf=unit.folder||sanitizeSeg(unit.name,'Unite');
  course.folder=cf;unit.folder=uf;
  var safeName=sanitizeSeg(destFileName.replace(/\.pdf$/i,''),'Ders_PDF')+'.pdf';
  var relSegs=[cf,uf,safeName];
  var binKey='pdf:'+cf+'/'+uf+'/'+safeName;

  if(NATIVE&&sync.handle){
    if(sourceObj.externalPath){
      return NATIVE.copyExternalTo(sourceObj.externalPath,relSegs).then(function(r){
        if(r&&r.error) throw new Error(r.error);
        return {pdfFn:relSegs,pdfBinKey:binKey};
      });
    }
    if(sourceObj.data){
      var u8=sourceObj.data instanceof Uint8Array?sourceObj.data:new Uint8Array(sourceObj.data);
      return NATIVE.writeBin(relSegs,u8).then(function(r){
        if(r&&r.error) throw new Error(r.error);
        return {pdfFn:relSegs,pdfBinKey:binKey};
      });
    }
  }
  // Tarayıcı FileSystemAccess veya IDB yedeklemesi
  var u8Data=sourceObj.data?(sourceObj.data instanceof Uint8Array?sourceObj.data:new Uint8Array(sourceObj.data)):null;
  if(u8Data) memBins[binKey]=u8Data;
  return openDB().then(function(d){
    if(!d||!u8Data) return {pdfFn:relSegs,pdfBinKey:binKey};
    return new Promise(function(res){
      try{
        var tx=d.transaction('bins','readwrite');
        tx.objectStore('bins').put(u8Data.buffer.slice(u8Data.byteOffset,u8Data.byteOffset+u8Data.byteLength),binKey);
        tx.oncomplete=function(){res({pdfFn:relSegs,pdfBinKey:binKey});};
        tx.onerror=function(){res({pdfFn:relSegs,pdfBinKey:binKey});};
      }catch(e){res({pdfFn:relSegs,pdfBinKey:binKey});}
    });
  });
}

function syncWritePartFile(pid,text){
  if(!sync.handle||sync.perm!=='granted') return Promise.resolve();
  var p=loadPidx()[pid];
  if(!p||p.kind==='pdf') return Promise.resolve();
  var pathSegs=computePartPath(p);
  if(!pathSegs) return Promise.resolve();
  var prev=Array.isArray(p.fn)?p.fn:null;
  var p0=Promise.resolve();
  // Eğer eski dosya adı değiştiyse ve bu bir .ayrik mirası değilse (veya kullanıcı başlığı elle değiştirdiyse)
  if(prev&&prev.length===3&&(prev[0]!==pathSegs[0]||prev[1]!==pathSegs[1]||prev[2]!==pathSegs[2])&&!p.keepLegacyFn){
    p0=removeEntry(sync.handle,[prev[0],prev[1]],prev[2],false);
  }
  var targetSegs=(p.keepLegacyFn&&prev&&prev.length===3)?prev:pathSegs;
  p.fn=targetSegs;
  lsSet('pidx',pidx);
  return p0.then(function(){
    return writeTextFile(sync.handle,[targetSegs[0],targetSegs[1]],targetSegs[2],text);
  }).then(function(){
    return writeJsonSnapshot('parts');
  }).catch(function(e){sync.err=String(e&&e.message||e);});
}

function syncDeletePartFile(p){
  if(!sync.handle||sync.perm!=='granted'||!p) return Promise.resolve();
  if(p.kind==='pdf'){
    // Eğer aynı PDF dosyasını kullanan başka part varsa fiziksel PDF'i silme!
    var targetPdf=p.pdfFn||p.fn;
    if(!Array.isArray(targetPdf)||targetPdf.length!==3) return Promise.resolve();
    var allParts=Object.values(loadPidx());
    var sharedCount=allParts.filter(function(other){
      if(!other||other.id===p.id||other.kind!=='pdf') return false;
      var oFn=other.pdfFn||other.fn;
      return Array.isArray(oFn)&&oFn[0]===targetPdf[0]&&oFn[1]===targetPdf[1]&&oFn[2]===targetPdf[2];
    }).length;
    if(sharedCount>0) return Promise.resolve();
    return removeEntry(sync.handle,[targetPdf[0],targetPdf[1]],targetPdf[2],false);
  }
  if(!Array.isArray(p.fn)||p.fn.length!==3) return Promise.resolve();
  return removeEntry(sync.handle,[p.fn[0],p.fn[1]],p.fn[2],false);
}

function writeJsonSnapshot(which){
  if(!sync.handle||sync.perm!=='granted') return Promise.resolve();
  var now=Date.now();
  if(which==='meta'){
    pruneTombs();
    var data= JSON.stringify({app:'gioreader-pro',v:4,exported:now,meta:loadMeta(),tomb:loadTomb()},null,2);
    return writeTextFile(sync.handle,[SYNC_DIR],'meta.json',data);
  }
  if(which==='parts'){
    return writeTextFile(sync.handle,[SYNC_DIR],'parts.json',JSON.stringify(loadPidx(),null,2));
  }
  if(which==='state'){
    return writeTextFile(sync.handle,[SYNC_DIR],'state.json',JSON.stringify(loadRstate(),null,2));
  }
  return Promise.resolve();
}

function scheduleSyncPush(which){
  if(!sync.handle||sync.perm!=='granted') return;
  sync.dirty[which]=true;
  if(sync.timer) clearTimeout(sync.timer);
  sync.timer=setTimeout(function(){flushSyncPush();},450);
}

function flushSyncPush(){
  if(!sync.handle||sync.perm!=='granted') return Promise.resolve();
  var d=sync.dirty;
  sync.dirty={meta:false,parts:false,state:false};
  sync.timer=null;
  var jobs=[];
  if(d.meta) jobs.push(writeJsonSnapshot('meta'));
  if(d.parts) jobs.push(writeJsonSnapshot('parts'));
  if(d.state) jobs.push(writeJsonSnapshot('state'));
  return Promise.all(jobs).then(function(){
    sync.last=Date.now();lsSet('syncLast',sync.last);sync.err=null;
    if(typeof updateSyncBadge==='function') updateSyncBadge();
  }).catch(function(e){
    sync.err=String(e&&e.message||e);
    if(typeof updateSyncBadge==='function') updateSyncBadge();
  });
}

function pruneTombs(){
  var t=loadTomb(),cut=Date.now()-TOMB_RETENTION;
  Object.keys(t).forEach(function(k){if(t[k]<cut) delete t[k];});
  var m=loadMeta();
  if(m.dc) Object.keys(m.dc).forEach(function(k){if(m.dc[k]<cut) delete m.dc[k];});
  m.courses.forEach(function(c){
    if(c.du) Object.keys(c.du).forEach(function(k){if(c.du[k]<cut) delete c.du[k];});
  });
}

function mergeCourseList(localM,remoteM){
  var dc=Object.assign({},localM.dc||{},remoteM.dc||{});
  var byId={};
  (localM.courses||[]).forEach(function(c){if(!dc[c.id]||c.u>dc[c.id]) byId[c.id]=c;});
  (remoteM.courses||[]).forEach(function(rc){
    if(dc[rc.id]&&(!rc.u||rc.u<=dc[rc.id])) return;
    var lc=byId[rc.id];
    if(!lc){byId[rc.id]=rc;return;}
    var newer=(rc.u||0)>(lc.u||0)?rc:lc;
    var older=newer===rc?lc:rc;
    var merged=Object.assign({},older,newer);
    var du=Object.assign({},lc.du||{},rc.du||{});
    var uMap={};
    (lc.units||[]).forEach(function(u){if(!du[u.id]||(u.u||0)>du[u.id]) uMap[u.id]=u;});
    (rc.units||[]).forEach(function(ru){
      if(du[ru.id]&&(!ru.u||ru.u<=du[ru.id])) return;
      var lu=uMap[ru.id];
      if(!lu){uMap[ru.id]=ru;return;}
      var nu=(ru.u||0)>(lu.u||0)?ru:lu;
      var ou=nu===ru?lu:ru;
      var mu=Object.assign({},ou,nu);
      mu.hints=Object.assign({},ou.hints||{},nu.hints||{});
      if(ou.runs||nu.runs){
        var rMap={};
        (ou.runs||[]).concat(nu.runs||[]).forEach(function(x){if(x&&x.at) rMap[x.at]=x;});
        mu.runs=Object.values(rMap).sort(function(a,b){return a.at-b.at;}).slice(-25);
      }
      uMap[ru.id]=mu;
    });
    merged.units=Object.values(uMap).sort(function(a,b){return (a.ord||a.created||0)-(b.ord||b.created||0);});
    merged.du=du;
    byId[rc.id]=merged;
  });
  var log={};
  var lLog=localM.log||{},rLog=remoteM.log||{};
  Object.keys(Object.assign({},lLog,rLog)).forEach(function(d){
    var a=(lLog[d]&&lLog[d].sec)||0,b=(rLog[d]&&rLog[d].sec)||0;
    log[d]={sec:Math.max(a,b)};
  });
  return {
    v:4,
    u:Math.max(localM.u||0,remoteM.u||0,Date.now()),
    courses:Object.values(byId).sort(function(a,b){return (a.created||0)-(b.created||0);}),
    log:log,
    dc:dc,
    healedV2:!!(localM.healedV2||remoteM.healedV2)
  };
}

function cleanHintString(h){
  if(!h) return '';
  var s=String(h).replace(/\s*\|\s*(?:Geçmek|Devam\s+etmek|Bir\s+sonraki)\s+için.*$/i,'')
    .replace(/\s*\|\s*Tüm\s+müfredat.*$/i,'')
    .replace(/["”']\s*bölümü(?:\s+ile\s+bu\s+devasa.*)?$/i,'')
    .replace(/^,\s*bu\s+formel\s+yapıyı\s+kullanarak\s+/i,'')
    .replace(/\]+\s*$/,'')
    .trim();
  return titleClean(s);
}

/* ---------- Otomatik Başlık & İpucu İyileştirme (Heal Library Metadata v2) ---------- */
function healLibraryMetadata(){
  var m=loadMeta(),idx=loadPidx();
  var healedCount=0;

  // 1) Ünite ipuçlarını (hints) sohbet kalıntılarından temizle
  m.courses.forEach(function(c){
    (c.units||[]).forEach(function(u){
      if(u.hints&&typeof u.hints==='object'){
        Object.keys(u.hints).forEach(function(k){
          var cleaned=cleanHintString(u.hints[k]);
          if(cleaned&&cleaned!==u.hints[k]){
            u.hints[k]=cleaned;
          }
        });
      }
    });
  });

  // 2) Mevcut Markdown partların başlıklarını, kelime/denklem istatistiklerini ve ipuçlarını analyzePart v2 ile iyileştir
  var pids=Object.keys(idx);
  var chain=Promise.resolve();
  pids.forEach(function(pid){
    var p=idx[pid];
    if(!p||p.kind==='pdf') return;
    chain=chain.then(function(){
      return getBody(pid,false).then(function(txt){
        if(!txt) return;
        var fnLast=Array.isArray(p.fn)&&p.fn.length?p.fn[p.fn.length-1]:'';
        var a=analyzePart(txt,fnLast);
        // Eski dosyaların diskteki yolunu koru (.ayrik ile hiçbir çakışma olmasın)
        if(Array.isArray(p.fn)&&p.fn.length===3) p.keepLegacyFn=true;

        if(a.title){
          if(p.title!==a.title||p.ft!==a.fullTitle){
            p.title=a.title;
            if(a.fullTitle&&a.fullTitle!==a.title) p.ft=a.fullTitle;
            else delete p.ft;
            healedCount++;
          }
        }
        if(a.next&&a.next.title){
          p.nx={no:a.next.no,title:cleanHintString(a.next.title)};
        }else if(p.nx&&p.nx.title){
          p.nx.title=cleanHintString(p.nx.title);
        }
        p.minutes=a.minutes||p.minutes||1;
        p.wordCount=a.wordCount||0;
        p.eqCount=a.eqCount||0;
        p.codeBlockCount=a.codeBlockCount||0;
      });
    });
  });

  return chain.then(function(){
    m.healedV2=true;
    lsSet('meta',m);
    lsSet('pidx',idx);
    return healedCount;
  });
}

function syncPull(){
  if(!sync.handle||sync.perm!=='granted') return Promise.resolve(false);
  sync.busy=true;sync.err=null;if(typeof updateSyncBadge==='function') updateSyncBadge();

  // Önce .gioreader-pro klasörünü kontrol et; yoksa .ayrik klasöründen otomatik ve tahribatsız içe aktar!
  return Promise.all([
    readJsonFile(sync.handle,[SYNC_DIR],'meta.json'),
    readJsonFile(sync.handle,[SYNC_DIR],'parts.json'),
    readJsonFile(sync.handle,[SYNC_DIR],'state.json')
  ]).then(function(proArr){
    var hasPro=!!(proArr[0]&&proArr[0].meta&&Array.isArray(proArr[0].meta.courses)&&proArr[0].meta.courses.length>0);
    if(hasPro) return {arr:proArr,fromLegacy:false};
    return Promise.all([
      readJsonFile(sync.handle,[LEGACY_SYNC_DIR],'meta.json'),
      readJsonFile(sync.handle,[LEGACY_SYNC_DIR],'parts.json'),
      readJsonFile(sync.handle,[LEGACY_SYNC_DIR],'state.json')
    ]).then(function(legArr){
      return {arr:legArr,fromLegacy:!!(legArr[0]&&legArr[0].meta)};
    });
  }).then(function(bundle){
    var arr=bundle.arr;
    var rMetaWrap=arr[0],rParts=arr[1],rState=arr[2];
    if(bundle.fromLegacy) sync.migratedFromLegacy=true;

    var lMeta=loadMeta(),lParts=loadPidx(),lState=loadRstate(),lTomb=loadTomb();
    var rTomb=(rMetaWrap&&rMetaWrap.tomb)||{};
    Object.keys(rTomb).forEach(function(k){lTomb[k]=Math.max(lTomb[k]||0,rTomb[k]||0);});
    tomb=lTomb;pruneTombs();lsSet('tomb',tomb);

    if(rMetaWrap&&rMetaWrap.meta){
      meta=mergeCourseList(lMeta,rMetaWrap.meta);
      lsSet('meta',meta);
    }
    if(rParts&&typeof rParts==='object'){
      Object.keys(rParts).forEach(function(pid){
        if(tomb['p:'+pid]&&(!rParts[pid].u||rParts[pid].u<=tomb['p:'+pid])) return;
        var lp=lParts[pid],rp=rParts[pid];
        if(bundle.fromLegacy&&rp) rp.keepLegacyFn=true;
        if(!lp||(rp.u||rp.added||0)>=(lp.u||lp.added||0)) lParts[pid]=rp;
      });
      Object.keys(lParts).forEach(function(pid){
        if(tomb['p:'+pid]&&(lParts[pid].u||lParts[pid].added||0)<=tomb['p:'+pid]) delete lParts[pid];
      });
      pidx=lParts;lsSet('pidx',pidx);
    }
    if(rState&&typeof rState==='object'){
      Object.keys(rState).forEach(function(pid){
        if(tomb['s:'+pid]&&(!rState[pid].u||rState[pid].u<=tomb['s:'+pid])) return;
        var ls=lState[pid],rs=rState[pid];
        if(!ls){lState[pid]=rs;return;}
        var merged={
          pos:(rs.u||0)>=(ls.u||0)?(rs.pos||0):(ls.pos||0),
          sec:Math.max(ls.sec||0,rs.sec||0),
          u:Math.max(ls.u||0,rs.u||0),
          at:Math.max(ls.at||0,rs.at||0)||undefined,
          done:Math.max(ls.done||0,rs.done||0)||undefined,
          sessions:Math.max(ls.sessions||0,rs.sessions||0)||((rs.sec||ls.sec)?1:0),
          hl:[]
        };
        var hMap={};
        (ls.hl||[]).concat(rs.hl||[]).forEach(function(h){if(h&&h.id) hMap[h.id]=h;});
        merged.hl=Object.values(hMap);
        lState[pid]=merged;
      });
      rstate=lState;lsSet('rstate',rstate);
    }

    // Part gövdelerini belleğe/IDB'ye çek
    var allPids=Object.keys(loadPidx());
    var jobs=allPids.map(function(pid){
      var p=pidx[pid];
      if(!p||p.kind==='pdf') return Promise.resolve();
      return getBody(pid,true).then(function(localTxt){
        if(localTxt!=null) return;
        var pathSegs=Array.isArray(p.fn)&&p.fn.length===3?p.fn:computePartPath(p);
        if(!pathSegs) return;
        return readTextFile(sync.handle,[pathSegs[0],pathSegs[1]],pathSegs[2]).then(function(txt){
          if(txt!=null) return putBody(pid,txt,true);
        });
      });
    });

    return Promise.all(jobs).then(function(){
      if(!loadMeta().healedV2){
        return healLibraryMetadata();
      }
      return 0;
    });
  }).then(function(){
    return pushAllToFolder();
  }).then(function(){
    sync.busy=false;sync.last=Date.now();lsSet('syncLast',sync.last);
    if(typeof updateSyncBadge==='function') updateSyncBadge();
    return true;
  }).catch(function(e){
    sync.busy=false;sync.err=String(e&&e.message||e);
    if(typeof updateSyncBadge==='function') updateSyncBadge();
    return false;
  });
}

function pushAllToFolder(){
  if(!sync.handle||sync.perm!=='granted') return Promise.resolve();
  var idx=loadPidx();
  var pids=Object.keys(idx);
  var chain=Promise.resolve();
  pids.forEach(function(pid){
    var p=idx[pid];
    if(!p||p.kind==='pdf') return;
    chain=chain.then(function(){
      var pathSegs=(p.keepLegacyFn&&Array.isArray(p.fn)&&p.fn.length===3)?p.fn:computePartPath(p);
      if(!pathSegs) return;
      p.fn=pathSegs;
      if(p.keepLegacyFn) return; // Mevcut dosyayı yeniden yazmaya gerek yok
      return getBody(pid,true).then(function(txt){
        if(txt==null) return;
        return writeTextFile(sync.handle,[pathSegs[0],pathSegs[1]],pathSegs[2],txt);
      });
    });
  });
  return chain.then(function(){
    lsSet('pidx',idx);
    return Promise.all([writeJsonSnapshot('meta'),writeJsonSnapshot('parts'),writeJsonSnapshot('state')]);
  });
}

function initSync(){
  if(NATIVE){
    return NATIVE.getFolder().then(function(info){
      if(!info||!info.path) return false;
      sync.handle={native:true,name:info.name,path:info.path};
      sync.name=info.name;sync.path=info.path;sync.perm='granted';
      lsSet('syncName',info.name);
      if(typeof updateSyncBadge==='function') updateSyncBadge();
      return syncPull();
    }).catch(function(){return false;});
  }
  if(!sync.supported) return Promise.resolve(false);
  return idbKvGet('dirHandle').then(function(h){
    if(!h) return false;
    sync.handle=h;sync.name=h.name||sync.name;
    if(!h.queryPermission) return false;
    return h.queryPermission({mode:'readwrite'}).then(function(p){
      sync.perm=p;
      if(typeof updateSyncBadge==='function') updateSyncBadge();
      if(p==='granted') return syncPull();
      return false;
    });
  }).catch(function(){return false;});
}

function pickSyncFolder(){
  if(NATIVE){
    return NATIVE.pickFolder().then(function(info){
      if(!info||!info.path) return false;
      sync.handle={native:true,name:info.name,path:info.path};
      sync.name=info.name;sync.path=info.path;sync.perm='granted';sync.err=null;
      lsSet('syncName',info.name);
      if(typeof updateSyncBadge==='function') updateSyncBadge();
      return syncPull().then(function(){
        if(typeof toast==='function') toast('Kütüphane klasörü bağlandı: '+info.path);
        if(typeof render==='function') render();
        return true;
      });
    });
  }
  if(!sync.supported){if(typeof toast==='function') toast('Tarayıcın doğrudan klasör erişimini desteklemiyor.');return Promise.resolve(false);}
  return window.showDirectoryPicker({mode:'readwrite'}).then(function(h){
    sync.handle=h;sync.name=h.name;sync.perm='granted';sync.err=null;
    lsSet('syncName',h.name);
    return idbKvSet('dirHandle',h).then(function(){return syncPull();}).then(function(){
      if(typeof toast==='function') toast('Klasör bağlandı: '+h.name);
      if(typeof render==='function') render();
      return true;
    });
  }).catch(function(e){
    if(e&&e.name!=='AbortError'&&typeof toast==='function') toast('Klasör seçilemedi.');
    return false;
  });
}

function reconnectSyncFolder(){
  if(NATIVE) return pickSyncFolder();
  if(!sync.handle) return pickSyncFolder();
  return sync.handle.requestPermission({mode:'readwrite'}).then(function(p){
    sync.perm=p;if(typeof updateSyncBadge==='function') updateSyncBadge();
    if(p==='granted') return syncPull().then(function(){if(typeof toast==='function') toast('Klasör senkronize edildi');if(typeof render==='function') render();return true;});
    if(typeof toast==='function') toast('İzin verilmedi');return false;
  }).catch(function(){return pickSyncFolder();});
}

function disconnectSyncFolder(){
  sync.handle=null;sync.name=null;sync.path=null;sync.perm='none';sync.err=null;
  lsDel('syncName');lsDel('syncLast');
  var p=NATIVE?NATIVE.clearFolder():idbKvDel('dirHandle');
  return Promise.resolve(p).then(function(){
    if(typeof updateSyncBadge==='function') updateSyncBadge();
    if(typeof toast==='function') toast('Klasör bağlantısı kaldırıldı (dosyalar silinmedi)');
  });
}

/* ---------- Ders / Ünite / Part Sorgu Yardımcıları ---------- */
function findCourse(cid){return loadMeta().courses.find(function(c){return c.id===cid;});}
function findUnit(uid2){
  var cs=loadMeta().courses;
  for(var i=0;i<cs.length;i++){
    var u=cs[i].units.find(function(x){return x.id===uid2;});
    if(u) return {course:cs[i],unit:u};
  }
  return null;
}
function unitParts(uid2){
  var idx=loadPidx(),arr=[];
  for(var k in idx) if(idx[k]&&idx[k].uid===uid2) arr.push(idx[k]);
  arr.sort(function(a,b){return (a.no||9999)-(b.no||9999)||(a.added||0)-(b.added||0);});
  return arr;
}
function unitPartByNo(uid2,no){
  var ps=unitParts(uid2);
  for(var i=0;i<ps.length;i++) if(ps[i].no===no) return ps[i];
  return null;
}
function courseStats(c){
  var total=0,loaded=0,done=0,minutes=0,secSpent=0;
  c.units.forEach(function(u){
    var ps=unitParts(u.id);
    total+=Math.max(u.n||0,ps.length);
    loaded+=ps.length;
    ps.forEach(function(p){
      minutes+=p.minutes||0;
      var st=getState(p.id);
      secSpent+=st.sec||0;
      if(st.done) done++;
    });
  });
  return {units:c.units.length,total:total,loaded:loaded,done:done,minutes:minutes,secSpent:secSpent};
}
function unitStats(u){
  var ps=unitParts(u.id),done=0,minutes=0,secSpent=0;
  ps.forEach(function(p){
    minutes+=p.minutes||0;
    var st=getState(p.id);
    secSpent+=st.sec||0;
    if(st.done) done++;
  });
  var total=Math.max(u.n||0,ps.length);
  return {total:total,loaded:ps.length,done:done,minutes:minutes,secSpent:secSpent,pct:total?Math.round((done/total)*100):0};
}
function nextUnreadInUnit(u){
  var ps=unitParts(u.id);
  for(var i=0;i<ps.length;i++) if(!getState(ps[i].id).done) return ps[i];
  return ps[0]||null;
}
function recentPart(){
  var rs=loadRstate(),idx=loadPidx(),best=null,bt=0;
  for(var k in rs) if(rs[k]&&rs[k].at>bt&&idx[k]){bt=rs[k].at;best=idx[k];}
  return best;
}
