/* ============================================================================
   GioReader Pro — 2-Finger Touchpad Zoom Engine & Auto Reading Analytics
   ============================================================================ */

var ZOOM_MIN=0.50;
var ZOOM_MAX=3.00;
var ZOOM_STEP=0.10;

var zoomState={
  current:1.0,
  gestureStartZoom:1.0,
  isPinching:false,
  settleTimer:null,
  hudTimer:null,
  rafId:null,
  pendingZoom:null,
  lastClientX:0,
  lastClientY:0
};

function clampZoom(z){
  var v=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,Number(z)||1.0));
  return Math.round(v*1000)/1000;
}

function getZoomPct(){
  return Math.round((zoomState.current||1)*100);
}

function initZoomEngine(){
  var p=loadPrefs();
  zoomState.current=clampZoom(p.zoom||1.0);
  document.documentElement.style.setProperty('--reader-zoom',String(zoomState.current));

  // Hassas 2-Parmak Touchpad Pinch-to-Zoom Dinleyicisi (passive: false ile tam kontrol)
  window.addEventListener('wheel',handleTouchpadZoomWheel,{passive:false});

  // Safari / WebKit Gesture Events yedeklemesi
  window.addEventListener('gesturestart',function(e){
    if(!isZoomableView()) return;
    e.preventDefault();
    zoomState.gestureStartZoom=zoomState.current;
    zoomState.isPinching=true;
  },{passive:false});

  window.addEventListener('gesturechange',function(e){
    if(!isZoomableView()) return;
    e.preventDefault();
    var target=clampZoom(zoomState.gestureStartZoom*(e.scale||1));
    setReaderZoom(target,{focalX:e.clientX||window.innerWidth/2,focalY:e.clientY||window.innerHeight/2,fromGesture:true});
  },{passive:false});

  window.addEventListener('gestureend',function(){
    if(zoomState.isPinching) finishPinchGesture();
  },{passive:false});
}

function isZoomableView(){
  return typeof state!=='undefined'&&(state.view==='reader'||state.view==='test');
}

function handleTouchpadZoomWheel(e){
  // Windows Precision Touchpad 2-parmak kıstırma/açma hareketi e.ctrlKey === true ile wheel üretir
  if(!(e.ctrlKey||e.metaKey)) return;
  if(!isZoomableView()){
    // Kütüphane ekranında da yanlışlıkla Chromium tüm arayüzünü bozmasın, kendi zoom sistemimizi kullansın
    e.preventDefault();
    return;
  }
  e.preventDefault();
  markReadingActivity();

  // deltaMode: 0 = pixel (touchpad), 1 = line (fare tekerleği)
  var dy=e.deltaY;
  if(e.deltaMode===1) dy*=18;
  else if(e.deltaMode===2) dy*=120;

  // Touchpad küçük küsuratlı deltaY gönderir; üstel ölçekleme ile 60fps tereyağı akıcılığı:
  var sensitivity=Math.abs(dy)<15?0.0095:0.0045;
  var factor=Math.exp(-dy*sensitivity);
  var nextZ=clampZoom(zoomState.current*factor);

  zoomState.lastClientX=e.clientX;
  zoomState.lastClientY=e.clientY;
  zoomState.isPinching=true;
  document.body.classList.add('is-pinching');

  setReaderZoom(nextZ,{
    focalX:e.clientX,
    focalY:e.clientY,
    fromGesture:true
  });

  if(zoomState.settleTimer) clearTimeout(zoomState.settleTimer);
  zoomState.settleTimer=setTimeout(function(){
    finishPinchGesture();
  },170);
}

function setReaderZoom(newZoom,opts){
  opts=opts||{};
  var prevZoom=zoomState.current||1.0;
  var z=clampZoom(newZoom);
  if(Math.abs(z-prevZoom)<0.001&&!opts.force) {
    showZoomHud();
    return;
  }

  var ratio=z/prevZoom;
  zoomState.current=z;

  var p=loadPrefs();
  p.zoom=z;
  if(state&&state.view==='reader'&&typeof currentReaderPart==='function'){
    var cp=currentReaderPart();
    if(cp&&cp.kind==='pdf'&&opts.fromGesture){
      p.pdfZoomMode='custom';
    }
  }
  savePrefs();

  document.documentElement.style.setProperty('--reader-zoom',String(z));

  // Focal-Point (Odak Noktası) Koruyucu Kaydırma Hesabı
  var focalY=typeof opts.focalY==='number'?opts.focalY:(window.innerHeight*0.35);
  var focalX=typeof opts.focalX==='number'?opts.focalX:(window.innerWidth*0.5);

  if(typeof pdfViewerState!=='undefined'&&pdfViewerState.active){
    applyPdfLiveZoom(z,ratio,focalX,focalY,!!opts.fromGesture);
  }else{
    applyMarkdownLiveZoom(z,ratio,focalX,focalY);
  }

  updateZoomToolbarBadge();
  showZoomHud();
}

function applyMarkdownLiveZoom(z,ratio,focalX,focalY){
  var wrap=document.getElementById('articleWrap');
  var art=document.getElementById('article');
  if(!art) return;

  // Odak noktasının belge içindeki mevcut dikey konumu:
  var rect=art.getBoundingClientRect();
  var offsetInArtY=focalY-rect.top;
  var offsetInArtX=focalX-rect.left;

  // Markdown/LaTeX zoom: hem font hem denklem/tablo/diyagramların bozulmadan ölçeklenmesi için
  // CSS zoom / transform ölçeklemesi + dinamik sütun genişliği dengesi uygula
  art.style.zoom=String(z);

  // Yeni konum farkı kadar pencereyi kaydır (böylece parmakların baktığı satır ekranda sabit kalır!)
  var newOffsetY=offsetInArtY*ratio;
  var deltaScrollY=newOffsetY-offsetInArtY;
  if(Math.abs(deltaScrollY)>0.5){
    window.scrollBy(0,deltaScrollY);
  }
  if(wrap&&z>1.05){
    var newOffsetX=offsetInArtX*ratio;
    var deltaScrollX=newOffsetX-offsetInArtX;
    if(Math.abs(deltaScrollX)>0.5&&wrap.scrollWidth>wrap.clientWidth){
      wrap.scrollLeft+=deltaScrollX;
    }
  }
}

function finishPinchGesture(){
  zoomState.isPinching=false;
  document.body.classList.remove('is-pinching');
  if(zoomState.settleTimer){
    clearTimeout(zoomState.settleTimer);
    zoomState.settleTimer=null;
  }
  // PDF okuyucu aktifse, hareket bittiği anda sayfaları yeni zoom değerinde Ultra-HD (HiDPI) çözünürlükte netleştir!
  if(typeof pdfViewerState!=='undefined'&&pdfViewerState.active&&typeof commitPdfHiDpiZoom==='function'){
    commitPdfHiDpiZoom(zoomState.current);
  }
}

function stepReaderZoom(delta){
  var cur=Math.round(zoomState.current*20)/20;
  var target=clampZoom(cur+delta);
  setReaderZoom(target,{force:true});
  if(typeof pdfViewerState!=='undefined'&&pdfViewerState.active&&typeof commitPdfHiDpiZoom==='function'){
    commitPdfHiDpiZoom(target);
  }
}

function resetReaderZoom(){
  var p=loadPrefs();
  if(typeof pdfViewerState!=='undefined'&&pdfViewerState.active){
    p.pdfZoomMode='fit-width';
    savePrefs();
  }
  setReaderZoom(1.0,{force:true});
  if(typeof pdfViewerState!=='undefined'&&pdfViewerState.active&&typeof commitPdfHiDpiZoom==='function'){
    commitPdfHiDpiZoom(1.0);
  }
}

function updateZoomToolbarBadge(){
  var badge=document.getElementById('zoomPctBtn');
  if(badge) badge.textContent='%'+getZoomPct();
  var pdfZoomLbl=document.getElementById('pdfZoomPctLabel');
  if(pdfZoomLbl) pdfZoomLbl.textContent='%'+getZoomPct();
}

function showZoomHud(){
  var hud=document.getElementById('zoomHud');
  if(!hud) return;
  var pct=getZoomPct();
  hud.innerHTML='<span class="zh-ico">🔍</span><span class="zh-val">%'+pct+'</span>'+
    (pct!==100?'<button class="zh-reset" data-act="zoom-reset" title="Yakınlaştırmayı Sıfırla (Ctrl+0)">Sıfırla</button>':'');
  hud.classList.add('show');
  if(zoomState.hudTimer) clearTimeout(zoomState.hudTimer);
  zoomState.hudTimer=setTimeout(function(){
    hud.classList.remove('show');
  },1600);
}

/* ============================================================================
   Sıfır-Temas Otomatik Okuma & İlerleme İstatistikleri Motoru
   (Kullanıcı müdahalesi gerektirmeyen, tamamen otomatik analitik sistemi)
   ============================================================================ */

var ACTIVITY_WINDOW_MS=55000; // Son 55 saniye içinde kaydırma/fare/zoom/klavye etkileşimi varsa aktif okuma sayılır
var autoTracker={
  lastActivityAt:Date.now(),
  activePid:null,
  sessionStartAt:0,
  sessionSec:0,
  unsavedTicks:0,
  intervalId:null
};

function todayKey(d){
  d=d||new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function markReadingActivity(){
  autoTracker.lastActivityAt=Date.now();
}

function initAutoReadingTracker(){
  var evs=['scroll','wheel','mousemove','pointerdown','keydown','touchstart','touchmove'];
  evs.forEach(function(ev){
    window.addEventListener(ev,markReadingActivity,{passive:true});
  });

  if(autoTracker.intervalId) clearInterval(autoTracker.intervalId);
  autoTracker.intervalId=setInterval(tickAutoReadingTracker,1000);
}

function startPartReadingSession(pid){
  if(!pid) return;
  markReadingActivity();
  if(autoTracker.activePid!==pid){
    autoTracker.activePid=pid;
    autoTracker.sessionStartAt=Date.now();
    autoTracker.sessionSec=0;
    var st=getState(pid);
    st.at=Date.now();
    st.sessions=(st.sessions||0)+1;
    st.u=Date.now();
    saveRstate();
  }
}

function tickAutoReadingTracker(){
  if(typeof state==='undefined') return;
  if(document.visibilityState==='hidden') return;
  if(state.view!=='reader'&&state.view!=='test') return;

  var now=Date.now();
  if(now-autoTracker.lastActivityAt>ACTIVITY_WINDOW_MS) return;

  // Test ekranındaysak aktif test oturumunun süresini güncelle
  if(state.view==='test'&&state.uid){
    var fu=findUnit(state.uid);
    if(fu&&fu.unit&&fu.unit.run){
      var r=fu.unit.run;
      r.sec=(r.sec||0)+1;
      var curQ=typeof currentTestQuestionKey==='function'?currentTestQuestionKey():null;
      if(curQ){
        if(!r.qt) r.qt={};
        r.qt[curQ]=(r.qt[curQ]||0)+1;
      }
      autoTracker.unsavedTicks++;
      if(autoTracker.unsavedTicks>=5){
        autoTracker.unsavedTicks=0;
        addDailyStudySeconds(5,null,state.uid);
        touchUnit(fu.unit,fu.course);
        saveMeta(true);
      }
      var tEl=document.getElementById('testElapsedBadge');
      if(tEl) tEl.textContent=fmtDurShort(r.sec||0);
    }
    return;
  }

  // Okuyucu ekranındaysak aktif Part süresini otomatik kaydet
  if(state.view==='reader'&&state.pid){
    var pid=state.pid;
    if(autoTracker.activePid!==pid){
      autoTracker.activePid=pid;
      autoTracker.sessionSec=0;
    }
    autoTracker.sessionSec++;
    var st=getState(pid);
    st.sec=(st.sec||0)+1;
    st.at=now;
    st.u=now;

    autoTracker.unsavedTicks++;
    if(autoTracker.unsavedTicks>=5){
      autoTracker.unsavedTicks=0;
      saveRstate();
      addDailyStudySeconds(5,pid,state.uid);
    }

    // Üst bardaki canlı okuma rozetini sessizce güncelle
    updateLiveReadingPill(pid);
  }
}

function addDailyStudySeconds(sec,pid,uid2){
  var m=loadMeta();
  var k=todayKey();
  if(!m.log[k]) m.log[k]={sec:0,parts:{}};
  m.log[k].sec=(m.log[k].sec||0)+sec;
  if(pid){
    if(!m.log[k].parts) m.log[k].parts={};
    m.log[k].parts[pid]=(m.log[k].parts[pid]||0)+sec;
  }
  saveMeta(true);
}

function updateLiveReadingPill(pid){
  var el=document.getElementById('liveReadingPillText');
  if(!el) return;
  var st=getState(pid);
  var p=loadPidx()[pid];
  var partTime=fmtDurShort(st.sec||0);
  if(p&&p.uid){
    var uObj=findUnit(p.uid);
    if(uObj&&uObj.unit){
      var us=unitStats(uObj.unit);
      el.textContent='Bu part: '+partTime+' · Ünite: %'+us.pct;
      return;
    }
  }
  el.textContent='Okuma: '+partTime;
}

/* ---------- Süre Biçimlendirme Yardımcıları ---------- */
function fmtDurShort(sec){
  sec=Math.max(0,Math.round(sec||0));
  if(sec<60) return sec+' sn';
  var m=Math.floor(sec/60),s=sec%60;
  if(m<60) return s>0&&m<10?(m+' dk '+s+' sn'):(m+' dk');
  var h=Math.floor(m/60),rm=m%60;
  return h+' sa'+(rm>0?' '+rm+' dk':'');
}

function fmtDurDetailed(sec){
  sec=Math.max(0,Math.round(sec||0));
  if(sec===0) return '—';
  if(sec<60) return sec+' sn';
  var m=Math.floor(sec/60),s=sec%60;
  if(m<60) return m+' dk'+(s>0?' '+s+' sn':'');
  var h=Math.floor(m/60),rm=m%60;
  return h+' sa '+(rm>0?rm+' dk':'');
}

/* ---------- Detaylı Ünite & Part Okuma Analitiği Hesaplayıcı ---------- */
function computeUnitReadingAnalytics(u){
  var ps=unitParts(u.id);
  var totalSlots=Math.max(u.n||0,ps.length);
  var doneCount=0,inProgressCount=0,unreadCount=0;
  var totalSecSpent=0,doneSecSpent=0,doneEstSec=0,totalEstSec=0;
  var maxPartSec=1;
  var totalWords=0,totalEqs=0,totalPages=0,totalHighlights=0;

  var rows=ps.map(function(p){
    var st=getState(p.id);
    var sec=st.sec||0;
    var estSec=Math.max(60,(p.minutes||8)*60);
    var isDone=!!st.done;
    var pos=Math.max(0,Math.min(1,st.pos||0));
    var progressPct=isDone?100:Math.min(99,Math.round(pos*100));
    if(sec>15&&progressPct<5&&!isDone) progressPct=5;

    var status='unread';
    if(isDone){
      status='done';
      doneCount++;
      doneSecSpent+=sec;
      doneEstSec+=estSec;
    }else if(sec>=15||pos>0.03){
      status='reading';
      inProgressCount++;
    }else{
      unreadCount++;
    }

    totalSecSpent+=sec;
    totalEstSec+=estSec;
    if(sec>maxPartSec) maxPartSec=sec;

    totalWords+=(p.wordCount||0);
    totalEqs+=(p.eqCount||0);
    if(p.kind==='pdf') totalPages+=(p.pageCount||1);
    var hlCount=Array.isArray(st.hl)?st.hl.length:0;
    totalHighlights+=hlCount;

    return {
      id:p.id,
      no:p.no,
      title:p.title||('Part '+p.no),
      fullTitle:p.ft||p.title||('Part '+p.no),
      kind:p.kind||'md',
      pageRange:(p.kind==='pdf'&&p.pdfStart&&p.pdfEnd)?('s. '+p.pdfStart+'–'+p.pdfEnd):null,
      pageCount:p.pageCount||0,
      sec:sec,
      estSec:estSec,
      estMin:p.minutes||Math.round(estSec/60),
      progressPct:progressPct,
      status:status,
      doneAt:st.done||null,
      lastReadAt:st.at||null,
      sessions:st.sessions||(sec>0?1:0),
      hlCount:hlCount,
      wordCount:p.wordCount||0,
      eqCount:p.eqCount||0
    };
  });

  // Kullanıcının gerçek okuma temposu katsayısı (gerçek süre / tahmini süre)
  var paceFactor=1.0;
  if(doneCount>=1&&doneSecSpent>=60&&doneEstSec>0){
    paceFactor=Math.max(0.45,Math.min(2.2,doneSecSpent/doneEstSec));
  }

  // Kalan tahmini süre (okunmamış veya yarım kalan partların ağırlıklı tahmini)
  var remainingEstSec=0;
  rows.forEach(function(r){
    if(r.status==='done') return;
    var leftRatio=1-(r.progressPct/100);
    remainingEstSec+=Math.round(r.estSec*leftRatio*paceFactor);
  });

  // Her partın ünite içindeki süre çubuğu oranı
  rows.forEach(function(r){
    r.barPct=r.sec>0?Math.max(6,Math.round((r.sec/maxPartSec)*100)):0;
  });

  var avgSecPerDone=doneCount>0?Math.round(doneSecSpent/doneCount):(ps.length?Math.round(totalSecSpent/Math.max(1,doneCount+inProgressCount)):0);
  var overallPct=totalSlots>0?Math.round(((doneCount+(inProgressCount*0.35))/totalSlots)*100):0;
  var strictDonePct=totalSlots>0?Math.round((doneCount/totalSlots)*100):0;

  return {
    unitId:u.id,
    unitName:u.name,
    totalSlots:totalSlots,
    loadedParts:ps.length,
    doneParts:doneCount,
    inProgressParts:inProgressCount,
    unreadParts:unreadCount+Math.max(0,totalSlots-ps.length),
    strictDonePct:strictDonePct,
    overallPct:Math.min(100,overallPct),
    totalSecSpent:totalSecSpent,
    avgSecPerDone:avgSecPerDone,
    totalEstSec:totalEstSec,
    remainingEstSec:remainingEstSec,
    paceFactor:paceFactor,
    totalWords:totalWords,
    totalEqs:totalEqs,
    totalPages:totalPages,
    totalHighlights:totalHighlights,
    rows:rows
  };
}

function computeGlobalStudyStats(){
  var m=loadMeta(),idx=loadPidx(),rs=loadRstate();
  var log=m.log||{};
  var todaySec=(log[todayKey()]&&log[todayKey()].sec)||0;

  // Son 7 gün ve son 14 gün toplamı
  var weekSec=0,daysActive7=0;
  var dailySeries=[];
  var now=new Date();
  for(var i=6;i>=0;i--){
    var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);
    var k=todayKey(d);
    var s=(log[k]&&log[k].sec)||0;
    weekSec+=s;
    if(s>=60) daysActive7++;
    var dayNames=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
    dailySeries.push({key:k,label:dayNames[d.getDay()],sec:s});
  }

  var totalSecAll=0,totalDoneParts=0,totalPartsCount=Object.keys(idx).length;
  Object.keys(rs).forEach(function(pid){
    if(!idx[pid]) return;
    totalSecAll+=(rs[pid].sec||0);
    if(rs[pid].done) totalDoneParts++;
  });

  return {
    todaySec:todaySec,
    weekSec:weekSec,
    daysActive7:daysActive7,
    totalSecAll:totalSecAll,
    totalDoneParts:totalDoneParts,
    totalPartsCount:totalPartsCount,
    dailySeries:dailySeries
  };
}
