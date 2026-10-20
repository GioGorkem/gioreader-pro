/* ============================================================================
   GioReader Pro — Views, Sidebar, Reader, Modals, Settings & Controller
   ============================================================================ */

var state={
  view:'library', // 'library' | 'course' | 'unit' | 'reader' | 'test'
  cid:null,
  uid:null,
  pid:null,
  settingsTab:'appearance',
  unitTableExpanded:false
};

var COURSE_HUES=[220,345,175,38,268,142,12,305,198,85];

function currentReaderPart(){
  if(!state.pid) return null;
  return loadPidx()[state.pid]||null;
}

function applyPrefsToDOM(){
  var p=loadPrefs();
  var root=document.documentElement;
  root.setAttribute('data-theme',p.theme||'paper');
  root.setAttribute('data-font',p.font||'serif');
  root.setAttribute('data-justify',p.justify?'1':'0');
  root.setAttribute('data-eqnum',p.eqNum?'1':'0');
  root.setAttribute('data-focus',p.focus?'1':'0');
  root.style.setProperty('--reader-size',(p.size||18)+'px');
  root.style.setProperty('--reader-lh',String(p.lh||1.78));
  root.style.setProperty('--reader-col',(p.col||740)+'px');
  root.style.setProperty('--reader-zoom',String(p.zoom||1.0));
}

var toastTimer=null;
function toast(msg){
  var el=document.getElementById('toast');
  if(!el) return;
  el.textContent=msg;
  el.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('show');},2600);
}

function navTo(view,params,skipPush){
  params=params||{};
  if(state.view==='reader'&&view!=='reader'){
    destroyActivePdfViewer();
  }
  state.view=view;
  if(params.cid!==undefined) state.cid=params.cid;
  if(params.uid!==undefined) state.uid=params.uid;
  if(params.pid!==undefined) state.pid=params.pid;

  if(view==='reader'&&state.pid){
    var p=loadPidx()[state.pid];
    if(p){
      state.cid=p.cid;
      state.uid=p.uid;
      startPartReadingSession(p.id);
    }
  }
  if(!skipPush&&window.history&&window.history.pushState){
    try{window.history.pushState({view:state.view,cid:state.cid,uid:state.uid,pid:state.pid},'');}catch(e){}
  }
  render();
  if(view!=='reader'){
    window.scrollTo(0,0);
    var bar=document.getElementById('readProgressBar');
    if(bar) bar.style.width='0%';
  }
}

/* ---------- Üst Bar ve Sol Kenar Çubuğu ---------- */
function renderTopbar(){
  var tb=document.getElementById('topbar');
  if(!tb) return;
  var p=loadPrefs();
  var crumbs=[];
  if(state.view!=='library'){
    crumbs.push('<span class="crumb-sep">/</span><button class="crumb-link" data-act="nav-lib">Kütüphane</button>');
  }
  if(state.cid){
    var c=findCourse(state.cid);
    if(c){
      if(state.view==='course'){
        crumbs.push('<span class="crumb-sep">/</span><span class="crumb-cur">'+escHtml(c.name)+'</span>');
      }else{
        crumbs.push('<span class="crumb-sep">/</span><button class="crumb-link" data-act="nav-course" data-cid="'+escAttr(c.id)+'">'+escHtml(c.name)+'</button>');
      }
    }
  }
  if(state.uid&&(state.view==='unit'||state.view==='reader'||state.view==='test')){
    var fu=findUnit(state.uid);
    if(fu&&fu.unit){
      if(state.view==='unit'||state.view==='test'){
        crumbs.push('<span class="crumb-sep">/</span><span class="crumb-cur">'+escHtml(fu.unit.name)+'</span>');
      }else{
        crumbs.push('<span class="crumb-sep">/</span><button class="crumb-link" data-act="nav-unit" data-uid="'+escAttr(fu.unit.id)+'">'+escHtml(fu.unit.name)+'</button>');
      }
    }
  }
  if(state.view==='reader'&&state.pid){
    var rp=loadPidx()[state.pid];
    if(rp){
      crumbs.push('<span class="crumb-sep">/</span><span class="crumb-cur">Part '+rp.no+(rp.title?' · '+escHtml(rp.title):'')+'</span>');
    }
  }

  // Canlı otomatik okuma istatistiği rozeti
  var gs=computeGlobalStudyStats();
  var pillText='Bugün: '+fmtDurShort(gs.todaySec)+' · 7 Gün: '+fmtDurShort(gs.weekSec);
  if(state.view==='reader'&&state.pid){
    var st=getState(state.pid);
    var uObj=state.uid?findUnit(state.uid):null;
    var uPct=uObj&&uObj.unit?unitStats(uObj.unit).pct:0;
    pillText='Bu part: '+fmtDurShort(st.sec||0)+' · Ünite: %'+uPct;
  }

  var syncLabel=sync.perm==='granted'?(sync.name||'Bağlı'):'Klasör Bağla';
  var syncDotColor=sync.err?'#ef4444':(sync.perm==='granted'?'#22c55e':'#f59e0b');

  tb.innerHTML=
    '<div class="tb-left">'+
      '<button class="icon-btn '+(p.sidebarOpen?'active':'')+'" data-act="toggle-sidebar" title="Kenar Çubuğunu Aç/Kapat (\\)">☰</button>'+
      '<button class="brand-btn" data-act="nav-lib"><span>GioReader</span><span class="brand-pro-tag">PRO</span></button>'+
      '<div class="crumbs">'+crumbs.join('')+'</div>'+
    '</div>'+
    '<div class="tb-right">'+
      '<button class="live-reading-pill" data-act="open-stats-modal" title="Otomatik Okuma İstatistikleri (Tıkla)">'+
        '<span class="live-dot"></span>'+
        '<span id="liveReadingPillText">'+escHtml(pillText)+'</span>'+
      '</button>'+
      (state.view==='reader'||state.view==='test'?
        '<div class="zoom-ctrl-group" title="2-Parmak Touchpad ile yakınlaştırabilir veya buradan ayarlayabilirsin">'+
          '<button class="zoom-ctrl-btn" data-act="zoom-out" title="Uzaklaştır (Ctrl -)">−</button>'+
          '<button class="zoom-ctrl-btn zoom-pct-btn" id="zoomPctBtn" data-act="zoom-reset" title="Sıfırla (%100)">%'+getZoomPct()+'</button>'+
          '<button class="zoom-ctrl-btn" data-act="zoom-in" title="Yakınlaştır (Ctrl +)">+</button>'+
        '</div>'
      :'')+
      '<button class="btn sm ghost" data-act="open-search" title="Tüm Derslerde ve PDF\'lerde Ara (Ctrl+K)">🔍 Ara</button>'+
      '<button class="btn sm ghost" id="syncBadgeBtn" data-act="open-sync-settings" title="Kütüphane Klasörü: '+escAttr(sync.path||sync.name||'')+'">'+
        '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+syncDotColor+'"></span> '+
        escHtml(syncLabel)+
      '</button>'+
      (state.view==='reader'?
        '<button class="icon-btn" data-act="toggle-focus" title="Odak Modu (F)">⛶</button>'
      :'')+
      '<button class="icon-btn" data-act="open-settings" title="Gelişmiş Ayarlar (Ctrl+,)">⚙</button>'+
    '</div>';
}

function updateSyncBadge(){
  var btn=document.getElementById('syncBadgeBtn');
  if(!btn) return;
  var syncLabel=sync.busy?'Senkronize…':(sync.perm==='granted'?(sync.name||'Bağlı'):'Klasör Bağla');
  var syncDotColor=sync.err?'#ef4444':(sync.perm==='granted'?'#22c55e':'#f59e0b');
  btn.innerHTML='<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+syncDotColor+'"></span> '+escHtml(syncLabel);
}

function renderSidebar(){
  var sb=document.getElementById('proSidebar');
  if(!sb) return;
  var p=loadPrefs();
  sb.classList.toggle('collapsed',!p.sidebarOpen);
  if(!p.sidebarOpen) return;

  var m=loadMeta();
  var html=[
    '<div class="sb-header">',
      '<span class="sb-title">Ders & Ünite Ağacı</span>',
      '<button class="btn sm ghost" data-act="new-course" title="Yeni Ders Ekle">+ Ders</button>',
    '</div>',
    '<div class="sb-tree">'
  ];

  if(!m.courses.length){
    html.push('<div class="muted" style="padding:14px;font-size:12px">Henüz ders bulunmuyor. Yeni ders ekleyebilir veya klasör bağlayabilirsin.</div>');
  }

  m.courses.forEach(function(c){
    var hue=c.hue||220;
    var isCourseExpanded=(state.cid===c.id)||m.courses.length<=6;
    html.push(
      '<div class="sb-course">',
        '<button class="sb-course-btn" data-act="nav-course" data-cid="'+escAttr(c.id)+'">',
          '<span class="sb-course-dot" style="background:hsl('+hue+',72%,52%)"></span>',
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(c.name)+'</span>',
        '</button>'
    );
    if(isCourseExpanded&&c.units&&c.units.length){
      html.push('<div class="sb-unit-list">');
      c.units.forEach(function(u){
        var us=unitStats(u);
        var isUnitActive=(state.uid===u.id);
        html.push(
          '<button class="sb-unit-btn'+(isUnitActive?' active':'')+'" data-act="nav-unit" data-uid="'+escAttr(u.id)+'">',
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(u.kind==='test'?'🧪 ':'')+escHtml(u.name)+'</span>',
            '<span class="sb-unit-pct">%'+us.pct+'</span>',
          '</button>'
        );
        if(isUnitActive&&u.kind!=='test'){
          var ps=unitParts(u.id);
          if(ps.length){
            html.push('<div class="sb-part-list">');
            ps.forEach(function(pt){
              var st=getState(pt.id);
              var isPartActive=(state.view==='reader'&&state.pid===pt.id);
              html.push(
                '<button class="sb-part-btn'+(isPartActive?' active':'')+'" data-act="open-part" data-pid="'+escAttr(pt.id)+'">',
                  '<span class="sb-part-no">'+(pt.kind==='pdf'?'📄 ':'')+pt.no+'.</span>',
                  '<span class="sb-part-title">'+escHtml(pt.title||('Part '+pt.no))+'</span>',
                  (st.done?'<span class="sb-part-check">✓</span>':''),
                '</button>'
              );
            });
            html.push('</div>');
          }
        }
      });
      html.push('</div>');
    }
    html.push('</div>');
  });

  html.push('</div>');
  sb.innerHTML=html.join('');
}

/* ---------- Ana Ekran Yönlendiricisi ---------- */
function render(){
  applyPrefsToDOM();
  renderTopbar();
  renderSidebar();
  var stage=document.getElementById('mainStage');
  if(!stage) return;

  if(state.view==='library') renderLibraryView(stage);
  else if(state.view==='course') renderCourseView(stage);
  else if(state.view==='unit') renderUnitView(stage);
  else if(state.view==='reader') renderReaderView(stage);
  else if(state.view==='test') renderTestView(stage);
  else renderLibraryView(stage);
}

/* ---------- 1) Kütüphane Görünümü ---------- */
function renderLibraryView(stage){
  var m=loadMeta();
  var gs=computeGlobalStudyStats();
  var rec=recentPart();
  var recUnit=rec?findUnit(rec.uid):null;

  var html=['<div class="container-wide">'];

  html.push(
    '<div class="hero-banner">',
      '<div>',
        '<h1 class="hero-title">Akademik Çalışma Kütüphanesi</h1>',
        '<p class="hero-sub">Markdown, LaTeX ve Ultra-HD PDF ders materyallerin otomatik okuma analitiğiyle tek merkezde.</p>',
      '</div>',
      '<div class="flex-gap">',
        '<button class="btn pdf-btn" data-act="quick-import-pdf">📄 Hızlı PDF Ders / Bölüm Ekle</button>',
        '<button class="btn primary" data-act="new-course">+ Yeni Ders Oluştur</button>',
      '</div>',
    '</div>'
  );

  // Otomatik Okuma Analitiği Özeti
  html.push(
    '<div class="analytics-strip">',
      '<div class="stat-card">',
        '<div class="stat-label">Bugün Aktif Okuma</div>',
        '<div class="stat-value">'+fmtDurDetailed(gs.todaySec)+'</div>',
        '<div class="stat-meta">Otomatik takip ediliyor</div>',
      '</div>',
      '<div class="stat-card">',
        '<div class="stat-label">Son 7 Gün Toplamı</div>',
        '<div class="stat-value">'+fmtDurDetailed(gs.weekSec)+'</div>',
        '<div class="stat-meta">Son 7 günde '+gs.daysActive7+' aktif gün</div>',
      '</div>',
      '<div class="stat-card">',
        '<div class="stat-label">Tamamlanan Partlar</div>',
        '<div class="stat-value">'+gs.totalDoneParts+' <span class="muted" style="font-size:14px">/ '+gs.totalPartsCount+'</span></div>',
        '<div class="stat-meta">Toplam '+fmtDurShort(gs.totalSecAll)+' okuma kaydı</div>',
      '</div>',
      (rec&&recUnit?
        '<div class="stat-card" style="border-color:var(--accent);cursor:pointer" data-act="open-part" data-pid="'+escAttr(rec.id)+'">'+
          '<div class="stat-label" style="color:var(--accent)">Son Kalınan Yerden Devam Et →</div>'+
          '<div class="stat-value" style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Part '+rec.no+': '+escHtml(rec.title||'')+'</div>'+
          '<div class="stat-meta">'+escHtml(recUnit.course.name)+' · '+escHtml(recUnit.unit.name)+'</div>'+
        '</div>'
      :
        '<div class="stat-card">'+
          '<div class="stat-label">Kütüphane Klasörü</div>'+
          '<div class="stat-value" style="font-size:15px">'+escHtml(sync.name||'Yerel Önbellek')+'</div>'+
          '<div class="stat-meta">2-Parmak Touchpad Zoom Aktif</div>'+
        '</div>'
      ),
    '</div>'
  );

  // Ders Kartları
  html.push('<div class="courses-grid">');
  m.courses.forEach(function(c){
    var cs=courseStats(c);
    var pct=cs.total?Math.round((cs.done/cs.total)*100):0;
    var hue=c.hue||220;
    var color='hsl('+hue+',72%,50%)';
    html.push(
      '<div class="course-card" data-act="nav-course" data-cid="'+escAttr(c.id)+'">',
        '<div class="course-card-bar" style="background:'+color+'"></div>',
        '<div class="row-between">',
          '<span class="badge" style="background:hsla('+hue+',75%,50%,0.12);color:'+color+'">'+cs.units+' Ünite</span>',
          '<span class="muted" style="font-size:12px;font-weight:600">%'+pct+' tamamlandı</span>',
        '</div>',
        '<h2 class="course-card-title">'+escHtml(c.name)+'</h2>',
        '<div class="course-progress-track">',
          '<div class="course-progress-fill" style="width:'+pct+'%;background:'+color+'"></div>',
        '</div>',
        '<div class="row-between muted" style="font-size:12px;margin-top:auto">',
          '<span>'+cs.done+' / '+cs.loaded+' yüklü part okundu</span>',
          '<span>⏱ '+fmtDurShort(cs.secSpent)+' okundu</span>',
        '</div>',
      '</div>'
    );
  });
  html.push('</div></div>');
  stage.innerHTML=html.join('');
}

/* ---------- 2) Ders Görünümü ---------- */
function renderCourseView(stage){
  var c=findCourse(state.cid);
  if(!c){navTo('library');return;}
  var cs=courseStats(c);
  var hue=c.hue||220;
  var color='hsl('+hue+',72%,50%)';

  var html=['<div class="container-wide">'];
  html.push(
    '<div class="hero-banner" style="border-top:4px solid '+color+'">',
      '<div>',
        '<div class="flex-gap" style="margin-bottom:6px">',
          '<button class="btn sm ghost" data-act="nav-lib">← Kütüphane</button>',
          '<span class="badge">'+cs.units+' Ünite</span>',
          '<span class="badge ok">'+cs.done+' / '+cs.loaded+' Part Okundu</span>',
          (cs.secSpent>0?'<span class="badge warm">⏱ Toplam '+fmtDurDetailed(cs.secSpent)+' çalışıldı</span>':''),
        '</div>',
        '<h1 class="hero-title">'+escHtml(c.name)+'</h1>',
      '</div>',
      '<div class="flex-gap">',
        '<button class="btn pdf-btn" data-act="course-import-pdf" data-cid="'+escAttr(c.id)+'">📄 PDF Ünite / Bölüm Ekle</button>',
        '<button class="btn" data-act="new-test-unit" data-cid="'+escAttr(c.id)+'">🧪 + Test Ünitesi</button>',
        '<button class="btn primary" data-act="new-unit" data-cid="'+escAttr(c.id)+'">+ Yeni Ünite</button>',
        '<button class="icon-btn" data-act="edit-course" data-cid="'+escAttr(c.id)+'" title="Dersi Düzenle">✎</button>',
      '</div>',
    '</div>'
  );

  if(!c.units.length){
    html.push('<div class="stat-card" style="text-align:center;padding:40px">Bu derste henüz ünite yok. "+ Yeni Ünite" veya "📄 PDF Ünite / Bölüm Ekle" butonunu kullanabilirsin.</div>');
  }else{
    html.push('<div class="units-list">');
    c.units.forEach(function(u){
      var us=unitStats(u);
      var isTest=u.kind==='test';
      var nextP=!isTest?nextUnreadInUnit(u):null;
      html.push(
        '<div class="unit-row-card" data-act="nav-unit" data-uid="'+escAttr(u.id)+'">',
          '<div style="flex:1;min-width:0">',
            '<div class="flex-gap" style="margin-bottom:4px">',
              '<span style="font-weight:800;font-size:15.5px">'+escHtml(u.name)+'</span>',
              (isTest?'<span class="badge warm">🧪 Çoktan Seçmeli Test</span>':'<span class="badge">'+us.loaded+' / '+us.total+' Part</span>'),
              (us.secSpent>0?'<span class="badge ok">⏱ '+fmtDurShort(us.secSpent)+' okundu</span>':''),
            '</div>',
            '<div class="muted" style="font-size:12.5px">',
              (isTest
                ?'Soru bankası ve interaktif test modu'
                :(nextP?'Sıradaki: Part '+nextP.no+' — '+escHtml(nextP.title||''):'Henüz part yüklenmedi')
              ),
            '</div>',
          '</div>',
          '<div class="flex-gap">',
            (!isTest&&nextP?
              '<button class="btn sm primary" data-act="open-part" data-pid="'+escAttr(nextP.id)+'">Devam Et (P'+nextP.no+') →</button>'
            :''),
            (isTest?
              '<button class="btn sm primary" data-act="start-test" data-uid="'+escAttr(u.id)+'">Teste Başla →</button>'
            :''),
            '<div style="min-width:54px;text-align:right;font-weight:800;color:var(--accent)">%'+us.pct+'</div>',
          '</div>',
        '</div>'
      );
    });
    html.push('</div>');
  }

  html.push('</div>');
  stage.innerHTML=html.join('');
}

/* ---------- 3) Ünite Görünümü (+ Otomatik Okuma İstatistikleri Paneli) ---------- */
function renderUnitView(stage){
  var fu=findUnit(state.uid);
  if(!fu){navTo('library');return;}
  var c=fu.course,u=fu.unit;
  var pr=loadPrefs();
  var ua=computeUnitReadingAnalytics(u);
  var isTest=u.kind==='test';

  var html=['<div class="container-wide">'];

  html.push(
    '<div class="hero-banner">',
      '<div>',
        '<div class="flex-gap" style="margin-bottom:6px">',
          '<button class="btn sm ghost" data-act="nav-course" data-cid="'+escAttr(c.id)+'">← '+escHtml(c.name)+'</button>',
          '<span class="badge">'+ua.loadedParts+' / '+ua.totalSlots+' Part Yüklü</span>',
          '<span class="badge ok">%'+ua.strictDonePct+' Tamamlandı</span>',
          (ua.totalPages>0?'<span class="badge pdf">📄 '+ua.totalPages+' PDF Sayfası</span>':''),
        '</div>',
        '<h1 class="hero-title">'+escHtml(u.name)+'</h1>',
      '</div>',
      '<div class="flex-gap">',
        (isTest?
          '<button class="btn primary" data-act="start-test" data-uid="'+escAttr(u.id)+'">🧪 Testi Başlat / Devam Et</button>'
        :''),
        '<button class="btn pdf-btn" data-act="open-pdf-importer" data-uid="'+escAttr(u.id)+'">📄 + PDF Ekle / Partlara Böl</button>',
        '<button class="btn primary" data-act="open-add-part" data-uid="'+escAttr(u.id)+'">+ MD / LaTeX Part Ekle</button>',
        '<button class="btn" data-act="bulk-upload-files" data-uid="'+escAttr(u.id)+'" title="Birden fazla .md, .tex veya .pdf dosyasını tek seferde ekle">📂 Toplu Dosya</button>',
        '<button class="icon-btn" data-act="edit-unit" data-uid="'+escAttr(u.id)+'" title="Ünite Ayarları">✎</button>',
      '</div>',
    '</div>'
  );

  // OTOMATİK ÜNİTE OKUMA İSTATİSTİKLERİ PANELİ
  if(pr.showUnitAnalytics&&ua.loadedParts>0){
    var paceLabel=ua.paceFactor<0.9?'Hızlı Tempo':(ua.paceFactor>1.15?'Derin İnceleme':'Dengeli Tempo');
    html.push(
      '<div class="unit-analytics-panel">',
        '<div class="uap-head">',
          '<div class="uap-title">',
            '<span>📊 Ünite Otomatik Okuma & İlerleme Analitiği</span>',
            '<span class="badge ok">Otomatik Takip Aktif</span>',
          '</div>',
          '<div class="flex-gap">',
            '<button class="btn sm ghost" data-act="heal-unit-titles" data-uid="'+escAttr(u.id)+'" title="Tüm part başlıklarını akıllı ayrıştırıcı v2 ile yeniden tara">✨ Başlıkları İyileştir</button>',
            '<button class="btn sm" data-act="toggle-unit-table">'+(state.unitTableExpanded?'Tabloyu Daralt ▲':'Part Bazlı Süre Tablosu ▼')+'</button>',
          '</div>',
        '</div>',
        '<div class="analytics-strip" style="margin-bottom:'+(state.unitTableExpanded?'16px':'0')+'">',
          '<div class="stat-card">',
            '<div class="stat-label">Bu Ünitede Harcanan Süre</div>',
            '<div class="stat-value">'+fmtDurDetailed(ua.totalSecSpent)+'</div>',
            '<div class="stat-meta">'+ua.doneParts+' tamamlandı · '+ua.inProgressParts+' okunuyor</div>',
          '</div>',
          '<div class="stat-card">',
            '<div class="stat-label">Part Başına Ortalama</div>',
            '<div class="stat-value">'+fmtDurDetailed(ua.avgSecPerDone)+'</div>',
            '<div class="stat-meta">Tamamlanan partların gerçek ortalaması</div>',
          '</div>',
          '<div class="stat-card">',
            '<div class="stat-label">Tahmini Kalan Süre</div>',
            '<div class="stat-value">'+fmtDurDetailed(ua.remainingEstSec)+'</div>',
            '<div class="stat-meta">Okuma temponuza göre ('+paceLabel+')</div>',
          '</div>',
          '<div class="stat-card">',
            '<div class="stat-label">İçerik Yoğunluğu</div>',
            '<div class="stat-value">'+(ua.totalWords>0?(ua.totalWords.toLocaleString('tr-TR')+' kelime'):(ua.totalPages+' sayfa'))+'</div>',
            '<div class="stat-meta">'+(ua.totalEqs>0?(ua.totalEqs+' blok denklem · '):'')+ua.totalHighlights+' vurgu</div>',
          '</div>',
        '</div>'
    );

    if(state.unitTableExpanded){
      html.push(
        '<div style="overflow-x:auto">',
          '<table class="uap-table">',
            '<thead><tr>',
              '<th>Part</th>',
              '<th>Başlık</th>',
              '<th>Tür</th>',
              '<th>Durum / İlerleme</th>',
              '<th>Okuma Süresi (Gerçek vs Tahmini)</th>',
              '<th>Oturum / Vurgu</th>',
            '</tr></thead><tbody>'
      );
      ua.rows.forEach(function(r){
        var stBadge=r.status==='done'
          ?'<span class="badge ok">✓ Tamamlandı (%100)</span>'
          :(r.status==='reading'?'<span class="badge md">Okunuyor (%'+r.progressPct+')</span>':'<span class="badge">Okunmadı</span>');
        html.push(
          '<tr data-act="open-part" data-pid="'+escAttr(r.id)+'">',
            '<td style="font-weight:800">Part '+r.no+'</td>',
            '<td style="font-weight:600">'+escHtml(r.title)+'</td>',
            '<td>'+(r.kind==='pdf'?'<span class="badge pdf">PDF '+(r.pageRange||'')+'</span>':'<span class="badge md">MD/TeX</span>')+'</td>',
            '<td>'+stBadge+'</td>',
            '<td>',
              '<div class="uap-time-bar-wrap"><div class="uap-time-bar-fill" style="width:'+r.barPct+'%"></div></div>',
              '<strong>'+fmtDurDetailed(r.sec)+'</strong> <span class="muted">/ ~'+r.estMin+' dk</span>',
            '</td>',
            '<td class="muted">'+r.sessions+' oturum · '+r.hlCount+' vurgu</td>',
          '</tr>'
        );
      });
      html.push('</tbody></table></div>');
    }
    html.push('</div>');
  }

  // PART KARTLARI IZGARASI (Yüklü partlar + Beklenen boş part yuvaları)
  var byNo={};
  unitParts(u.id).forEach(function(p){byNo[p.no]=p;});
  var maxSlot=Math.max(u.n||0,Object.keys(byNo).reduce(function(m,k){return Math.max(m,+k||0);},0));

  html.push('<div class="parts-grid">');
  for(var no=1;no<=maxSlot;no++){
    var p=byNo[no];
    if(p){
      var st=getState(p.id);
      var isDone=!!st.done;
      var isReading=!isDone&&((st.sec||0)>=15||(st.pos||0)>0.03);
      var cardCls='part-card'+(isDone?' is-done':(isReading?' is-reading':''));
      var isPdf=p.kind==='pdf';
      var posPct=isDone?100:Math.round((st.pos||0)*100);

      html.push(
        '<div class="'+cardCls+'" data-act="open-part" data-pid="'+escAttr(p.id)+'" title="'+escAttr(p.ft||p.title||'')+'">',
          '<div class="part-card-head">',
            '<div class="flex-gap">',
              '<span class="part-no-pill">Part '+p.no+'</span>',
              (isPdf
                ?'<span class="badge pdf">PDF'+(p.pdfStart&&p.pdfEnd?' · s.'+p.pdfStart+'–'+p.pdfEnd:'')+'</span>'
                :'<span class="badge md">MD</span>'),
              (isDone?'<span class="badge ok">✓ Okundu</span>':(isReading?'<span class="badge warm">%'+posPct+'</span>':'')),
            '</div>',
            '<div class="flex-gap">',
              '<button class="icon-btn sm" data-act="edit-part-meta" data-pid="'+escAttr(p.id)+'" title="Başlığı / Part Numarasını Düzenle">✎</button>',
              '<button class="icon-btn sm" data-act="delete-part" data-pid="'+escAttr(p.id)+'" title="Partı Sil">🗑</button>',
            '</div>',
          '</div>',
          '<div class="part-card-title">'+escHtml(p.title||('Part '+p.no))+'</div>',
          '<div class="part-card-foot">',
            '<span>'+(st.sec>=10?('⏱ '+fmtDurShort(st.sec)+' okundu'):('~'+(p.minutes||8)+' dk okuma'))+'</span>',
            '<span>'+(isPdf?(p.pageCount||1)+' sayfa':((p.eqCount?p.eqCount+' denklem':'Ders notu')))+'</span>',
          '</div>',
        '</div>'
      );
    }else{
      var hint=u.hints&&u.hints[no]?cleanHintString(u.hints[no]):'';
      html.push(
        '<div class="part-card is-empty-slot" data-act="open-add-part" data-uid="'+escAttr(u.id)+'" data-part-no="'+no+'">',
          '<div class="part-card-head">',
            '<span class="part-no-pill">Part '+no+'</span>',
            '<span class="badge">Bekleniyor</span>',
          '</div>',
          '<div class="part-card-title" style="font-weight:600;color:var(--fg-2)">'+(hint?escHtml(hint):'Part '+no+' içeriği eklemek için tıkla')+'</div>',
          '<div class="part-card-foot">',
            '<span>+ MD / LaTeX veya PDF Ekle</span>',
          '</div>',
        '</div>'
      );
    }
  }
  html.push('</div></div>');
  stage.innerHTML=html.join('');
}

/* ---------- 4) Okuyucu Görünümü (Hem Markdown/LaTeX Hem Ultra-HD PDF) ---------- */
function renderReaderView(stage){
  var p=currentReaderPart();
  if(!p){navTo('library');return;}
  var fu=findUnit(p.uid);
  if(!fu){navTo('library');return;}
  var c=fu.course,u=fu.unit;
  var st=getState(p.id);
  var allPs=unitParts(u.id);
  var curIdx=allPs.findIndex(function(x){return x.id===p.id;});
  var prevP=curIdx>0?allPs[curIdx-1]:null;
  var nextP=curIdx>=0&&curIdx+1<allPs.length?allPs[curIdx+1]:null;

  // A) ULTRA-HD NATIVE PDF OKUYUCU MODU
  if(p.kind==='pdf'){
    var html=[
      '<div class="pdf-reader-shell">',
        '<div class="pdf-toolbar">',
          '<div class="pdf-tb-group">',
            '<button class="btn sm" id="pdfDrawerToggleBtn" data-act="pdf-toggle-drawer">📑 Sayfalar & İçindekiler</button>',
            '<button class="icon-btn sm" data-act="pdf-prev-page" title="Önceki Sayfa">◀</button>',
            '<span style="font-size:12.5px;font-weight:600">Sayfa</span>',
            '<input type="number" id="pdfPageInput" class="pdf-page-input" min="1" max="'+(p.pageCount||999)+'" value="1" />',
            '<span class="muted" style="font-size:12.5px">/ '+(p.pageCount||1)+'</span>',
            '<button class="icon-btn sm" data-act="pdf-next-page" title="Sonraki Sayfa">▶</button>',
          '</div>',
          '<div class="pdf-tb-group">',
            '<button class="btn sm" data-act="pdf-fit-width" title="Genişliğe Sığdır">↔ Genişlik</button>',
            '<button class="btn sm" data-act="pdf-fit-page" title="Tam Sayfa Sığdır">↕ Tam Sayfa</button>',
            '<button class="btn sm" id="pdfSpreadToggleBtn" data-act="pdf-toggle-spread" title="2 Sayfa Yan Yana Kitap Görünümü">📖 Çift Sayfa</button>',
            '<button class="btn sm" id="pdfCropToggleBtn" data-act="pdf-toggle-crop" title="Akıllı Beyaz Kenar Boşluğu Kırpma (Auto-Crop)">✂ Kenar Kırp</button>',
          '</div>',
          '<div class="pdf-tb-group">',
            '<select id="pdfFilterSelect" class="sel" style="width:auto;padding:4px 8px;font-size:12px" title="PDF Renk ve Görsel Modu">',
              '<option value="auto">Renk: Tema Uyumu</option>',
              '<option value="original">Renk: %100 Orijinal Görsel</option>',
              '<option value="dark">Renk: Akıllı Gece Kağıdı</option>',
              '<option value="sepia">Renk: Sıcak Sepya</option>',
            '</select>',
            '<div style="position:relative;display:inline-flex;align-items:center">',
              '<input type="search" id="pdfSearchInput" class="inp" placeholder="PDF içinde ara…" style="width:155px;padding:4px 8px;font-size:12px" />',
              '<span id="pdfSearchCount" class="muted" style="font-size:11px;margin-left:5px"></span>',
            '</div>',
            '<button class="btn sm '+(st.done?'ok':'primary')+'" data-act="toggle-part-done" data-pid="'+escAttr(p.id)+'">'+(st.done?'✓ Tamamlandı':'Tamamlandı İşaretle')+'</button>',
          '</div>',
        '</div>',
        '<div class="pdf-workspace">',
          '<aside class="pdf-drawer" id="pdfDrawer" style="display:none">',
            '<div class="pdf-drawer-tabs">',
              '<button class="pdf-drawer-tab active" data-act="pdf-drawer-tab" data-tab="thumbs">Sayfalar</button>',
              '<button class="pdf-drawer-tab" data-act="pdf-drawer-tab" data-tab="outline">İçindekiler</button>',
              '<button class="pdf-drawer-tab" data-act="pdf-drawer-tab" data-tab="highlights">Vurgular</button>',
            '</div>',
            '<div id="pdfDrawerBody"></div>',
          '</aside>',
          '<div id="pdfStage"></div>',
        '</div>',
        renderReaderFooterNav(p,u,prevP,nextP),
      '</div>'
    ];
    stage.innerHTML=html.join('');
    mountPdfReaderView(p,u,c);
    bindPdfToolbarInputs();
    return;
  }

  // B) MARKDOWN & LATEX AKADEMİK OKUYUCU MODU
  stage.innerHTML='<div class="reader-layout"><div id="articleWrap"><article id="article"><div class="muted">İçerik yükleniyor…</div></article></div><aside class="toc-aside" id="tocAside"></aside></div>';

  getBody(p.id,false).then(function(raw){
    if(state.view!=='reader'||state.pid!==p.id) return;
    if(!raw){
      document.getElementById('article').innerHTML='<div class="empty-note">Bu partın metin dosyası bulunamadı.</div>';
      return;
    }
    var doc=buildDoc(raw);
    var art=document.getElementById('article');
    if(!art) return;

    var headerHtml=
      '<header style="margin-bottom:28px;padding-bottom:18px;border-bottom:1px solid var(--line)">'+
        '<div class="row-between" style="margin-bottom:10px;font-family:var(--font-sans)">'+
          '<div class="flex-gap">'+
            '<span class="badge md">Part '+p.no+'</span>'+
            '<span class="badge">~'+(doc.minutes||p.minutes||8)+' dk okuma</span>'+
            (doc.eqCount?'<span class="badge">'+doc.eqCount+' denklem</span>':'')+
            (st.sec>=10?'<span class="badge ok">⏱ '+fmtDurDetailed(st.sec)+' okundu</span>':'')+
          '</div>'+
          '<div class="flex-gap">'+
            '<button class="btn sm" data-act="edit-part-meta" data-pid="'+escAttr(p.id)+'">✎ Başlığı Düzenle</button>'+
            '<button class="btn sm '+(st.done?'ok':'primary')+'" data-act="toggle-part-done" data-pid="'+escAttr(p.id)+'">'+(st.done?'✓ Tamamlandı':'Tamamlandı İşaretle')+'</button>'+
          '</div>'+
        '</div>'+
        '<h1 style="border:none;padding:0;margin:0">'+(escHtml(p.ft||p.title||doc.title||('Part '+p.no)))+'</h1>'+
      '</header>';

    art.innerHTML=headerHtml+'<div id="articleBody">'+doc.html+'</div>'+renderReaderFooterNav(p,u,prevP,nextP);

    // Mevcut zoom seviyesini uygula
    if(zoomState.current&&zoomState.current!==1.0){
      art.style.zoom=String(zoomState.current);
    }

    // Kod bloklarını renklendir ve Kopyala butonu ekle
    enhanceCodeBlocks(art);

    // Kayıtlı metin vurgularını (highlights) uygula
    applyMarkdownHighlights(art,p.id);

    // Sağ İçindekiler (TOC) ağacını oluştur
    buildMarkdownToc(art);

    // MathJax v3 ile LaTeX formüllerini diz
    if(window.MathJax&&window.MathJax.typesetPromise){
      window.MathJax.typesetClear&&window.MathJax.typesetClear([art]);
      window.MathJax.typesetPromise([art]).catch(function(){});
    }

    // Kayıtlı kaydırma konumuna (st.pos) geri dön
    if(st.pos&&st.pos>0.02&&st.pos<0.96){
      setTimeout(function(){
        var maxScroll=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
        window.scrollTo(0,Math.round(st.pos*maxScroll));
      },60);
    }else{
      window.scrollTo(0,0);
    }
  });
}

function renderReaderFooterNav(p,u,prevP,nextP){
  var st=getState(p.id);
  return '<footer style="margin-top:44px;padding-top:24px;border-top:1px solid var(--line);font-family:var(--font-sans)">'+
    '<div class="row-between">'+
      (prevP
        ?'<button class="btn" data-act="open-part" data-pid="'+escAttr(prevP.id)+'">← Part '+prevP.no+': '+escHtml(shortTitle(prevP.title||'',34))+'</button>'
        :'<button class="btn ghost" data-act="nav-unit" data-uid="'+escAttr(u.id)+'">← Üniteye Dön</button>')+
      '<div class="flex-gap">'+
        (!st.done&&nextP
          ?'<button class="btn primary" data-act="complete-and-next" data-pid="'+escAttr(p.id)+'" data-next-pid="'+escAttr(nextP.id)+'">✓ Tamamla ve Part '+nextP.no+'\'e Geç →</button>'
          :(nextP
            ?'<button class="btn primary" data-act="open-part" data-pid="'+escAttr(nextP.id)+'">Part '+nextP.no+': '+escHtml(shortTitle(nextP.title||'',34))+' →</button>'
            :'<button class="btn primary" data-act="complete-and-unit" data-pid="'+escAttr(p.id)+'" data-uid="'+escAttr(u.id)+'">✓ Partı Tamamla ve Üniteye Dön</button>'
          ))+
      '</div>'+
    '</div>'+
  '</footer>';
}

function enhanceCodeBlocks(art){
  var pres=art.querySelectorAll('pre code');
  for(var i=0;i<pres.length;i++){
    if(window.hljs&&window.hljs.highlightElement){
      try{window.hljs.highlightElement(pres[i]);}catch(e){}
    }
    var pre=pres[i].parentElement;
    if(pre&&!pre.querySelector('.code-copy-btn')){
      pre.style.position='relative';
      var btn=document.createElement('button');
      btn.className='btn sm code-copy-btn';
      btn.style.cssText='position:absolute;top:8px;right:8px;padding:3px 8px;font-size:11px;opacity:0.8';
      btn.textContent='Kopyala';
      btn.setAttribute('data-act','copy-code');
      pre.appendChild(btn);
    }
  }
}

function buildMarkdownToc(art){
  var aside=document.getElementById('tocAside');
  if(!aside) return;
  var p=loadPrefs();
  if(!p.tocOpen){aside.style.display='none';return;}
  var hs=art.querySelectorAll('#articleBody h1, #articleBody h2, #articleBody h3');
  if(hs.length<2){aside.style.display='none';return;}
  aside.style.display='block';
  var out=['<div style="font-weight:800;font-size:11.5px;text-transform:uppercase;color:var(--fg-3);margin-bottom:8px">Bu Bölümde</div>'];
  for(var i=0;i<hs.length;i++){
    var h=hs[i];
    var id='sec-h-'+i;
    h.id=id;
    var lvl=h.tagName==='H3'?' l3':'';
    out.push('<a class="toc-item'+lvl+'" data-act="toc-jump" data-target="'+id+'">'+escHtml(h.textContent||'')+'</a>');
  }
  aside.innerHTML=out.join('');
}

function applyMarkdownHighlights(art,pid){
  var st=getState(pid);
  var hls=(st.hl||[]).filter(function(h){return h.kind!=='pdf'&&h.q;});
  if(!hls.length) return;
  var body=art.querySelector('#articleBody');
  if(!body) return;

  hls.forEach(function(h){
    highlightQuoteInElement(body,h.q,h.id,h.c||'y');
  });
}

function highlightQuoteInElement(root,quote,hlId,color){
  if(!quote||quote.length<2) return;
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  var node;
  var qTrim=quote.trim();
  while((node=walker.nextNode())){
    var parent=node.parentElement;
    if(!parent||parent.closest('pre,code,.eq,.tex-macros,mark')) continue;
    var idx=node.nodeValue.indexOf(qTrim);
    if(idx>=0){
      var range=document.createRange();
      range.setStart(node,idx);
      range.setEnd(node,idx+qTrim.length);
      var mark=document.createElement('mark');
      mark.className='hl-'+color;
      mark.setAttribute('data-hl-id',hlId);
      mark.title='Vurguyu silmek için tıkla';
      try{range.surroundContents(mark);}catch(e){}
      break;
    }
  }
}

/* ---------- PDF Araç Çubuğu Input Bağlantıları ---------- */
function bindPdfToolbarInputs(){
  var pageInp=document.getElementById('pdfPageInput');
  if(pageInp){
    pageInp.addEventListener('change',function(){
      var v=parseInt(pageInp.value,10);
      if(v>=1) scrollToPdfPartPage(v,true);
    });
  }
  var filterSel=document.getElementById('pdfFilterSelect');
  if(filterSel){
    filterSel.value=pdfViewerState.filter||'auto';
    filterSel.addEventListener('change',function(){
      pdfViewerState.filter=filterSel.value;
      var pr=loadPrefs();
      pr.pdfFilter=filterSel.value;
      savePrefs();
      updatePdfToolbarUI();
    });
  }
  var searchInp=document.getElementById('pdfSearchInput');
  if(searchInp){
    var sTimer=null;
    searchInp.addEventListener('input',function(){
      if(sTimer) clearTimeout(sTimer);
      sTimer=setTimeout(function(){
        runPdfInDocumentSearch(searchInp.value);
      },240);
    });
    searchInp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        e.preventDefault();
        jumpToPdfSearchHit(pdfViewerState.searchIdx+(e.shiftKey?-1:1));
      }
    });
  }
}

/* ---------- 5) Çoktan Seçmeli Test Görünümü ---------- */
var testBankCache={uid:null,questions:[],byKey:{}};

function loadUnitQuestionBank(u){
  var ps=unitParts(u.id);
  var jobs=ps.map(function(p){
    if(p.kind==='pdf') return Promise.resolve([]);
    return getBody(p.id,false).then(function(txt){
      if(!txt) return [];
      var qs=parseQuestions(txt);
      return qs.map(function(q){
        return Object.assign({},q,{partNo:p.no,key:p.no+':'+q.n});
      });
    });
  });
  return Promise.all(jobs).then(function(arrs){
    var all=[];
    var byKey={};
    arrs.forEach(function(list){
      list.forEach(function(q){
        all.push(q);
        byKey[q.key]=q;
      });
    });
    testBankCache={uid:u.id,questions:all,byKey:byKey};
    return testBankCache;
  });
}

function currentTestQuestionKey(){
  if(state.view!=='test'||!state.uid) return null;
  var fu=findUnit(state.uid);
  if(!fu||!fu.unit||!fu.unit.run) return null;
  var r=fu.unit.run;
  return r.order&&r.order[r.idx||0]?r.order[r.idx||0]:null;
}

function renderTestView(stage){
  var fu=findUnit(state.uid);
  if(!fu){navTo('library');return;}
  var c=fu.course,u=fu.unit;
  stage.innerHTML='<div class="container-wide"><div class="stat-card">Sorular hazırlanıyor…</div></div>';

  loadUnitQuestionBank(u).then(function(bank){
    if(state.view!=='test'||state.uid!==u.id) return;
    if(!bank.questions.length){
      stage.innerHTML='<div class="container-wide"><div class="stat-card" style="padding:32px;text-align:center">'+
        '<h3>Bu test ünitesinde henüz soru bulunamadı</h3>'+
        '<p class="muted">Üniteye Soru 1:, A), B)... formatında Markdown partları ekleyebilirsin.</p>'+
        '<button class="btn primary" data-act="nav-unit" data-uid="'+escAttr(u.id)+'">← Üniteye Dön</button>'+
      '</div></div>';
      return;
    }

    if(!u.run||!Array.isArray(u.run.order)||!u.run.order.length){
      u.run={
        id:uid('r'),
        at:Date.now(),
        mode:'instant',
        order:bank.questions.map(function(q){return q.key;}),
        idx:0,
        ans:{},
        flag:{},
        elim:{},
        sec:0,
        qt:{}
      };
      touchUnit(u,c);saveMeta();
    }

    var r=u.run;
    var idx=Math.max(0,Math.min(r.order.length-1,r.idx||0));
    r.idx=idx;
    var qKey=r.order[idx];
    var q=bank.byKey[qKey]||bank.questions[0];
    var userAns=r.ans&&r.ans[qKey];
    var showExp=(r.mode==='instant'&&userAns)||r.finished;

    var navPills=r.order.map(function(k,i){
      var a=r.ans&&r.ans[k];
      var qObj=bank.byKey[k];
      var bg='var(--bg-soft)',col='var(--fg-2)';
      if(a){
        if(r.mode==='instant'||r.finished){
          var ok=qObj&&qObj.ans===a;
          bg=ok?'var(--ok-soft)':'var(--pdf-badge-soft)';
          col=ok?'var(--ok)':'var(--pdf-badge)';
        }else{
          bg='var(--accent-soft)';col='var(--accent)';
        }
      }
      var border=i===idx?'2px solid var(--accent)':'1px solid var(--line)';
      return '<button class="btn sm" data-act="test-jump" data-idx="'+i+'" style="min-width:34px;padding:4px 6px;background:'+bg+';color:'+col+';border:'+border+'">'+(i+1)+'</button>';
    }).join('');

    var optsHtml=(q.opts||[]).map(function(o){
      var isPicked=userAns===o.k;
      var isCorrect=q.ans===o.k;
      var bCol='var(--line-2)',bgCol='var(--bg-elev)';
      if(showExp){
        if(isCorrect){bCol='var(--ok)';bgCol='var(--ok-soft)';}
        else if(isPicked){bCol='var(--pdf-badge)';bgCol='var(--pdf-badge-soft)';}
      }else if(isPicked){
        bCol='var(--accent)';bgCol='var(--accent-soft)';
      }
      return '<div class="unit-row-card" data-act="test-pick-opt" data-opt="'+escAttr(o.k)+'" style="border-color:'+bCol+';background:'+bgCol+';justify-content:flex-start;align-items:flex-start">'+
        '<span class="badge" style="font-size:13px;min-width:28px;justify-content:center">'+escHtml(o.k)+'</span>'+
        '<div style="flex:1;font-size:15px;line-height:1.6">'+mdSnippet(o.t,true)+'</div>'+
      '</div>';
    }).join('');

    stage.innerHTML=
      '<div class="container-wide" style="max-width:920px">'+
        '<div class="hero-banner" style="padding:14px 20px">'+
          '<div class="flex-gap">'+
            '<button class="btn sm ghost" data-act="nav-unit" data-uid="'+escAttr(u.id)+'">← '+escHtml(u.name)+'</button>',
            '<span class="badge warm">Soru '+(idx+1)+' / '+r.order.length+' (Part '+q.partNo+' · Soru '+q.n+')</span>',
            '<span class="badge" id="testElapsedBadge">⏱ '+fmtDurShort(r.sec||0)+'</span>',
          '</div>',
          '<div class="flex-gap">'+
            '<button class="btn sm" data-act="test-reset">Sıfırla</button>',
          '</div>'+
        '</div>'+
        '<div class="stat-card" style="margin-bottom:16px;display:flex;flex-wrap:wrap;gap:6px">'+navPills+'</div>'+
        '<article id="testArticle" class="stat-card" style="padding:28px 32px">'+
          '<div style="font-size:17px;line-height:1.75;margin-bottom:22px;font-family:var(--reader-font)">'+mdSnippet(q.stem,false)+'</div>'+
          '<div class="units-list">'+optsHtml+'</div>'+
          (showExp&&q.exp?
            '<div style="margin-top:24px;padding:18px 22px;border-radius:12px;background:var(--bg-soft);border-left:4px solid var(--accent)">'+
              '<div style="font-weight:800;margin-bottom:8px;color:var(--accent)">Formel Çözüm ve Analiz (Doğru Cevap: '+(q.ans||'?')+')</div>'+
              '<div style="line-height:1.7;font-size:14.5px">'+mdSnippet(q.exp,false)+'</div>'+
            '</div>'
          :'')+
          '<div class="row-between" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">'+
            '<button class="btn" data-act="test-prev" '+(idx===0?'disabled':'')+'>← Önceki Soru</button>'+
            '<button class="btn primary" data-act="test-next" '+(idx+1>=r.order.length?'disabled':'')+'>Sonraki Soru →</button>'+
          '</div>'+
        '</article>'+
      '</div>';

    var ta=document.getElementById('testArticle');
    if(ta&&window.MathJax&&window.MathJax.typesetPromise){
      window.MathJax.typesetPromise([ta]).catch(function(){});
    }
  });
}

/* ============================================================================
   Modallar: Part Ekle / Başlık Adayı Çipleri / Akıllı PDF Bölücü / Ayarlar
   ============================================================================ */

function openModal(html,large){
  var host=document.getElementById('modalHost');
  if(!host) return;
  host.innerHTML='<div class="modal-backdrop" data-act="close-modal-backdrop"><div class="modal-card'+(large?' lg':'')+'">'+html+'</div></div>';
}
function closeModal(){
  var host=document.getElementById('modalHost');
  if(host) host.innerHTML='';
}

/* ---------- 1) MD / LaTeX Part Ekleme Modalı (Akıllı Başlık Aday Çipleriyle) ---------- */
var draftPartAnalysis=null;

function openAddPartModal(uid2,prefillNo){
  var fu=findUnit(uid2);
  if(!fu) return;
  var u=fu.unit;
  var existing=unitParts(u.id);
  var used=new Set(existing.map(function(p){return p.no;}));
  var defNo=prefillNo||1;
  if(!prefillNo){while(used.has(defNo)) defNo++;}

  openModal(
    '<div class="modal-head">'+
      '<h3 class="modal-title">+ Yeni Part Ekle ('+escHtml(u.name)+')</h3>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="row-between" style="margin-bottom:14px">'+
        '<div class="flex-gap">'+
          '<button class="btn sm" data-act="pick-md-file-for-modal" data-uid="'+escAttr(u.id)+'">📂 .md / .tex Dosyası Seç</button>'+
          '<button class="btn sm pdf-btn" data-act="switch-to-pdf-importer" data-uid="'+escAttr(u.id)+'">📄 PDF Ekle / Partlara Böl →</button>'+
        '</div>'+
        '<span class="muted" style="font-size:12px">Yapıştırdığın metinden Part No ve Başlık otomatik yakalanır</span>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:110px 1fr;gap:12px">'+
        '<div class="field">'+
          '<label class="field-label">Part No</label>'+
          '<input type="number" id="addPartNoInp" class="inp" min="1" max="500" value="'+defNo+'" />'+
        '</div>'+
        '<div class="field">'+
          '<label class="field-label">Part Başlığı <span id="addPartDetectBadge" class="badge ok" style="display:none;margin-left:6px">Otomatik Yakalandı</span></label>'+
          '<input type="text" id="addPartTitleInp" class="inp" placeholder="Örn: Doğrultu Alanları ve Denge Çözümleri" />'+
          '<div id="addPartTitleCands" class="title-cands-wrap"></div>'+
        '</div>'+
      '</div>'+
      '<div class="field">'+
        '<label class="field-label">Markdown veya LaTeX İçeriği</label>'+
        '<textarea id="addPartBodyInp" class="txtarea" style="min-height:240px" placeholder="Gemini/Claude ders anlatımını veya LaTeX metnini buraya yapıştır..."></textarea>'+
      '</div>'+
    '</div>'+
    '<div class="modal-foot">'+
      '<button class="btn" data-act="close-modal">İptal</button>'+
      '<button class="btn primary" data-act="save-new-md-part" data-uid="'+escAttr(u.id)+'">Partı Kaydet ve Aç</button>'+
    '</div>',
    true
  );

  var bodyInp=document.getElementById('addPartBodyInp');
  var titleInp=document.getElementById('addPartTitleInp');
  var noInp=document.getElementById('addPartNoInp');
  var candsBox=document.getElementById('addPartTitleCands');
  var badge=document.getElementById('addPartDetectBadge');
  var userEditedTitle=false;

  if(titleInp){
    titleInp.addEventListener('input',function(){userEditedTitle=true;});
  }
  if(bodyInp){
    bodyInp.addEventListener('input',function(){
      var txt=bodyInp.value;
      if(!txt.trim()) return;
      var a=analyzePart(txt);
      draftPartAnalysis=a;
      if(a.no&&!prefillNo) noInp.value=String(a.no);
      if(a.title&&(!userEditedTitle||!titleInp.value.trim())){
        titleInp.value=a.title;
        if(badge) badge.style.display='inline-flex';
      }
      renderTitleCandidateChips(candsBox,a.titleCandidates||[],function(picked){
        titleInp.value=picked;
        userEditedTitle=true;
      });
    });
  }
}

function renderTitleCandidateChips(container,cands,onPick){
  if(!container) return;
  if(!cands||!cands.length){container.innerHTML='';return;}
  var srcLabels={part:'Part Satırı',heading:'Ana Başlık',heading2:'Alt Başlık',intro:'Giriş Konusu',bold:'Vurgulu Başlık',questions:'Soru Aralığı',filename:'Dosya Adı','pdf-heading':'PDF Başlığı','pdf-meta':'PDF Meta'};
  container.innerHTML=cands.map(function(c,i){
    return '<button type="button" class="title-cand-chip'+(i===0?' active':'')+'" data-cand-val="'+escAttr(c.short)+'" title="'+escAttr(c.full||c.short)+'">'+
      '<span class="title-cand-src">'+escHtml(srcLabels[c.src]||c.src)+'</span>'+
      '<span>'+escHtml(c.short)+'</span>'+
    '</button>';
  }).join('');
  var btns=container.querySelectorAll('.title-cand-chip');
  for(var i=0;i<btns.length;i++){
    btns[i].addEventListener('click',function(e){
      var btn=e.currentTarget;
      for(var j=0;j<btns.length;j++) btns[j].classList.remove('active');
      btn.classList.add('active');
      onPick(btn.getAttribute('data-cand-val'));
    });
  }
}

/* ---------- 2) Part Başlığı & Numarası Düzenleme Modalı ---------- */
function openEditPartMetaModal(pid){
  var p=loadPidx()[pid];
  if(!p) return;

  openModal(
    '<div class="modal-head">'+
      '<h3 class="modal-title">Part Başlığını ve Numarasını Düzenle</h3>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div style="display:grid;grid-template-columns:110px 1fr;gap:12px">'+
        '<div class="field">'+
          '<label class="field-label">Part No</label>'+
          '<input type="number" id="editPartNoInp" class="inp" value="'+(p.no||1)+'" />'+
        '</div>'+
        '<div class="field">'+
          '<label class="field-label">Kısa Başlık (Kartlarda ve Listede Görünen)</label>'+
          '<input type="text" id="editPartTitleInp" class="inp" value="'+escAttr(p.title||'')+'" />'+
        '</div>'+
      '</div>'+
      '<div class="field">'+
        '<label class="field-label">Tam Akademik Başlık (İsteğe Bağlı)</label>'+
        '<input type="text" id="editPartFullTitleInp" class="inp" value="'+escAttr(p.ft||p.title||'')+'" />'+
      '</div>'+
      '<div class="field">'+
        '<label class="field-label">Metinden Tespit Edilen Başlık Adayları (Tıklayarak Seçebilirsin)</label>'+
        '<div id="editPartCandsBox" class="title-cands-wrap"><span class="muted">Adaylar taranıyor…</span></div>'+
      '</div>'+
    '</div>'+
    '<div class="modal-foot">'+
      '<button class="btn" data-act="close-modal">İptal</button>'+
      '<button class="btn primary" data-act="save-edit-part-meta" data-pid="'+escAttr(p.id)+'">Kaydet</button>'+
    '</div>',
    false
  );

  if(p.kind!=='pdf'){
    getBody(p.id,false).then(function(txt){
      var box=document.getElementById('editPartCandsBox');
      if(!box||!txt) return;
      var fnLast=Array.isArray(p.fn)&&p.fn.length?p.fn[p.fn.length-1]:'';
      var a=analyzePart(txt,fnLast);
      renderTitleCandidateChips(box,a.titleCandidates||[],function(picked){
        var ti=document.getElementById('editPartTitleInp');
        if(ti) ti.value=picked;
      });
    });
  }else{
    var box=document.getElementById('editPartCandsBox');
    if(box) box.innerHTML='<span class="muted">PDF Part ('+(p.pageCount||1)+' sayfa)</span>';
  }
}

/* ---------- 3) Akıllı PDF İçe Aktarıcı & Part Bölücü Modalı ---------- */
function triggerPdfFileSelectionForUnit(uid2){
  if(NATIVE){
    NATIVE.pickFiles({
      title:'PDF Ders Materyali Seç',
      multi:true,
      filters:[{name:'PDF Dosyaları',extensions:['pdf']}]
    }).then(function(files){
      if(!files||!files.length) return;
      if(files.length===1){
        openPdfImporterModalForFile({name:files[0].name,externalPath:files[0].path},uid2);
      }else{
        bulkImportMultiplePdfFiles(files,uid2);
      }
    });
    return;
  }
  var inp=document.createElement('input');
  inp.type='file';
  inp.accept='.pdf,application/pdf';
  inp.multiple=true;
  inp.onchange=function(){
    var fs=Array.prototype.slice.call(inp.files||[]);
    if(!fs.length) return;
    if(fs.length===1){
      var f=fs[0];
      var extPath=NATIVE&&NATIVE.getPathForFile?NATIVE.getPathForFile(f):null;
      f.arrayBuffer().then(function(ab){
        openPdfImporterModalForFile({name:f.name,externalPath:extPath,data:new Uint8Array(ab)},uid2);
      });
    }else{
      bulkImportMultipleBrowserFiles(fs,uid2);
    }
  };
  inp.click();
}

function openPdfImporterModalForFile(fileObj,uid2){
  openModal(
    '<div class="modal-head">'+
      '<h3 class="modal-title">📄 Ultra-HD PDF Analiz Ediliyor…</h3>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body" style="text-align:center;padding:40px">'+
      '<div class="muted">PDF sayfaları, başlıklar ve yer imleri (bookmarks) taranıyor…</div>'+
    '</div>',
    true
  );

  inspectPdfForImport(fileObj,uid2).then(function(sess){
    renderPdfImporterModalContent(sess);
  }).catch(function(err){
    closeModal();
    toast('PDF okunamadı: '+String(err&&err.message||err));
  });
}

function renderPdfImporterModalContent(sess){
  var hasOutline=sess.outlineChapters&&sess.outlineChapters.length>=2;
  var outlineHtml='';
  if(hasOutline){
    outlineHtml=sess.outlineChapters.map(function(ch,i){
      return '<label style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-bottom:1px solid var(--line);font-size:13px">'+
        '<input type="checkbox" class="pdf-outline-chk" data-idx="'+i+'" checked />'+
        '<span class="badge pdf">s. '+ch.startPage+'–'+ch.endPage+'</span>'+
        '<input type="text" class="inp pdf-outline-title" data-idx="'+i+'" value="'+escAttr(ch.title)+'" style="padding:4px 8px;font-size:12.5px" />'+
      '</label>';
    }).join('');
  }

  openModal(
    '<div class="modal-head">'+
      '<div>'+
        '<h3 class="modal-title">📄 Pro PDF İçe Aktarıcı & Part Bölücü</h3>'+
        '<div class="muted" style="font-size:12px">'+escHtml(sess.fileName)+' · Toplam <strong>'+sess.numPages+' sayfa</strong></div>'+
      '</div>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div style="display:grid;grid-template-columns:190px 1fr;gap:18px;align-items:start">'+
        '<div style="text-align:center;background:var(--bg-soft);padding:10px;border-radius:12px;border:1px solid var(--line)">'+
          '<canvas id="pdfImportPreviewCanvas" width="165" height="220" style="width:100%;height:auto;border-radius:6px;background:#fff"></canvas>'+
          '<div class="muted" style="font-size:11px;margin-top:6px">Önizleme (Sayfa 1)</div>'+
        '</div>'+
        '<div>'+
          '<div class="field">'+
            '<label class="field-label">İçe Aktarma Modu Seç</label>'+
            '<div class="flex-gap">'+
              '<button type="button" class="btn sm '+(sess.mode==='single'?'primary':'')+'" data-act="pdf-imp-mode" data-mode="single">1) Tek Part Olarak Ekle</button>'+
              (hasOutline?'<button type="button" class="btn sm '+(sess.mode==='outline'?'primary':'')+'" data-act="pdf-imp-mode" data-mode="outline">2) İçindekilere Göre Böl ('+sess.outlineChapters.length+' Bölüm)</button>':'')+
              '<button type="button" class="btn sm '+(sess.mode==='chunks'?'primary':'')+'" data-act="pdf-imp-mode" data-mode="chunks">3) Sayfa Aralığına Göre Partlara Böl</button>'+
            '</div>'+
          '</div>'+

          (sess.mode==='single'?
            '<div id="pdfImpSinglePane">'+
              '<div style="display:grid;grid-template-columns:95px 1fr 110px 110px;gap:10px">'+
                '<div class="field">'+
                  '<label class="field-label">Part No</label>'+
                  '<input type="number" id="pdfImpSingleNo" class="inp" value="'+sess.singleNo+'" min="1" />'+
                '</div>'+
                '<div class="field">'+
                  '<label class="field-label">Part Başlığı</label>'+
                  '<input type="text" id="pdfImpSingleTitle" class="inp" value="'+escAttr(sess.singleTitle)+'" />'+
                '</div>'+
                '<div class="field">'+
                  '<label class="field-label">Başlangıç S.</label>'+
                  '<input type="number" id="pdfImpStartPage" class="inp" value="'+sess.singleStart+'" min="1" max="'+sess.numPages+'" />'+
                '</div>'+
                '<div class="field">'+
                  '<label class="field-label">Bitiş S.</label>'+
                  '<input type="number" id="pdfImpEndPage" class="inp" value="'+sess.singleEnd+'" min="1" max="'+sess.numPages+'" />'+
                '</div>'+
              '</div>'+
              '<div class="field">'+
                '<label class="field-label">Tespit Edilen Başlık Adayları</label>'+
                '<div id="pdfImpSingleCands" class="title-cands-wrap"></div>'+
              '</div>'+
              '<div class="field">'+
                '<label class="field-label">Okuyucu Formatı</label>'+
                '<select id="pdfImpFormatSel" class="sel">'+
                  '<option value="pdf">Ultra-HD Orijinal PDF Okuyucu (Önerilen — %100 Görsel, Şema ve Formül Sadakati)</option>'+
                  '<option value="md">Markdown Metni Olarak Çıkar (Düzenlenebilir Metin)</option>'+
                '</select>'+
              '</div>'+
            '</div>'
          :'')+

          (sess.mode==='outline'?
            '<div id="pdfImpOutlinePane">'+
              '<div class="field-label">PDF İçindekiler Tablosundan Tespit Edilen Bölümler (Her biri ayrı Part olur):</div>'+
              '<div style="max-height:240px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;background:var(--bg)">'+outlineHtml+'</div>'+
            '</div>'
          :'')+

          (sess.mode==='chunks'?
            '<div id="pdfImpChunksPane">'+
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
                '<div class="field">'+
                  '<label class="field-label">Her Part Kaç Sayfa Olsun?</label>'+
                  '<input type="number" id="pdfImpChunkSize" class="inp" value="'+(sess.chunkSize||10)+'" min="1" max="'+sess.numPages+'" />'+
                '</div>'+
                '<div class="field">'+
                  '<label class="field-label">Başlangıç Part Numarası</label>'+
                  '<input type="number" id="pdfImpChunkStartNo" class="inp" value="'+sess.singleNo+'" min="1" />'+
                '</div>'+
              '</div>'+
              '<div class="muted" style="font-size:12.5px">Toplam '+sess.numPages+' sayfalık bu PDF, seçtiğin sayfa sayısına göre otomatik olarak ardışık partlara bölünecek ve her partın başlığı ilgili sayfanın ilk başlığından otomatik alınacaktır.</div>'+
            '</div>'
          :'')+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div class="modal-foot">'+
      '<button class="btn" data-act="close-modal">İptal</button>'+
      '<button class="btn primary" data-act="confirm-pdf-import">✓ PDF\'i Üniteye Ekle</button>'+
    '</div>',
    true
  );

  // İlk sayfanın önizlemesini çiz
  if(sess.pdfDoc){
    sess.pdfDoc.getPage(1).then(function(page){
      var cv=document.getElementById('pdfImportPreviewCanvas');
      if(!cv) return;
      var vp=page.getViewport({scale:0.32});
      cv.width=Math.round(vp.width);
      cv.height=Math.round(vp.height);
      var ctx=cv.getContext('2d');
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,cv.width,cv.height);
      page.render({canvasContext:ctx,viewport:vp});
    }).catch(function(){});
  }

  var candsBox=document.getElementById('pdfImpSingleCands');
  if(candsBox){
    renderTitleCandidateChips(candsBox,sess.singleCandidates||[],function(picked){
      var ti=document.getElementById('pdfImpSingleTitle');
      if(ti) ti.value=picked;
      sess.singleTitle=picked;
    });
  }
}

/* ---------- 4) Otomatik Okuma İstatistikleri Detay Modalı ---------- */
function openStatsModal(){
  var gs=computeGlobalStudyStats();
  var maxDaySec=Math.max(60,gs.dailySeries.reduce(function(m,x){return Math.max(m,x.sec);},0));

  var barsHtml=gs.dailySeries.map(function(d){
    var hPct=Math.round((d.sec/maxDaySec)*100);
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">'+
      '<div style="font-size:11px;font-weight:700;color:var(--fg-2)">'+(d.sec>=60?Math.round(d.sec/60)+' dk':'—')+'</div>'+
      '<div style="width:100%;max-width:38px;height:110px;background:var(--bg-soft);border-radius:8px;display:flex;align-items:flex-end;padding:3px">'+
        '<div style="width:100%;height:'+Math.max(4,hPct)+'%;background:var(--accent);border-radius:6px"></div>'+
      '</div>'+
      '<div style="font-size:11.5px;font-weight:700;color:var(--fg-3)">'+escHtml(d.label)+'</div>'+
    '</div>';
  }).join('');

  var m=loadMeta();
  var courseRows=m.courses.map(function(c){
    var cs=courseStats(c);
    var pct=cs.total?Math.round((cs.done/cs.total)*100):0;
    return '<tr>'+
      '<td style="font-weight:700">'+escHtml(c.name)+'</td>'+
      '<td>'+cs.units+' ünite</td>'+
      '<td>'+cs.done+' / '+cs.loaded+' part (%'+pct+')</td>'+
      '<td style="font-weight:700">'+fmtDurDetailed(cs.secSpent)+'</td>'+
    '</tr>';
  }).join('');

  openModal(
    '<div class="modal-head">'+
      '<h3 class="modal-title">📊 Otomatik Okuma & İlerleme İstatistikleri</h3>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="analytics-strip" style="margin-bottom:18px">'+
        '<div class="stat-card"><div class="stat-label">Bugün</div><div class="stat-value">'+fmtDurDetailed(gs.todaySec)+'</div></div>'+
        '<div class="stat-card"><div class="stat-label">Son 7 Gün</div><div class="stat-value">'+fmtDurDetailed(gs.weekSec)+'</div></div>'+
        '<div class="stat-card"><div class="stat-label">Toplam Kayıtlı</div><div class="stat-value">'+fmtDurDetailed(gs.totalSecAll)+'</div></div>'+
      '</div>'+
      '<div class="field">'+
        '<label class="field-label">Son 7 Günlük Aktif Okuma Dağılımı</label>'+
        '<div style="display:flex;align-items:flex-end;gap:10px;padding:16px;background:var(--bg);border:1px solid var(--line);border-radius:12px">'+barsHtml+'</div>'+
      '</div>'+
      '<div class="field" style="margin-top:18px">'+
        '<label class="field-label">Ders Bazlı İlerleme ve Harcanan Süre</label>'+
        '<table class="uap-table"><thead><tr><th>Ders</th><th>Ünite</th><th>Tamamlanan</th><th>Okuma Süresi</th></tr></thead><tbody>'+courseRows+'</tbody></table>'+
      '</div>'+
    '</div>'+
    '<div class="modal-foot">'+
      '<button class="btn primary" data-act="close-modal">Kapat</button>'+
    '</div>',
    true
  );
}

/* ---------- 5) Gelişmiş Sekmeli Ayarlar Menüsü ---------- */
function openSettingsModal(initialTab){
  if(initialTab) state.settingsTab=initialTab;
  var tab=state.settingsTab||'appearance';
  var p=loadPrefs();

  var tabBody='';
  if(tab==='appearance'){
    var themes=[
      {id:'paper',name:'Akademik Kağıt',bg:'#f8f6f1',fg:'#171614'},
      {id:'sepia',name:'Sıcak Sepya',bg:'#f3ecdc',fg:'#241d13'},
      {id:'dark',name:'Gece Stüdyosu',bg:'#111318',fg:'#e7e9ee'},
      {id:'midnight',name:'OLED Midnight',bg:'#050608',fg:'#edf0f5'},
      {id:'nord',name:'Nord Slate',bg:'#1d222d',fg:'#eceff4'}
    ];
    tabBody=
      '<div class="field">'+
        '<label class="field-label">Renk Teması (5 Profesyonel Mod)</label>'+
        '<div class="theme-swatches">'+
          themes.map(function(t){
            return '<button type="button" class="theme-swatch-btn'+(p.theme===t.id?' active':'')+'" data-act="set-pref" data-key="theme" data-val="'+t.id+'" style="background:'+t.bg+';color:'+t.fg+'">'+escHtml(t.name)+'</button>';
          }).join('')+
        '</div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px">'+
        '<div class="field">'+
          '<label class="field-label">Okuyucu Yazı Tipi</label>'+
          '<select class="sel" data-pref-change="font">'+
            '<option value="serif" '+(p.font==='serif'?'selected':'')+'>Akademik Serif (Newsreader / Charter)</option>'+
            '<option value="sans" '+(p.font==='sans'?'selected':'')+'>Modern Sans (Inter / Segoe UI)</option>'+
            '<option value="editorial" '+(p.font==='editorial'?'selected':'')+'>Klasik Kitap (Palatino)</option>'+
            '<option value="dyslexic" '+(p.font==='dyslexic'?'selected':'')+'>Yüksek Okunaklılık (Verdana)</option>'+
          '</select>'+
        '</div>'+
        '<div class="field">'+
          '<label class="field-label">Yazı Boyutu ('+p.size+' px)</label>'+
          '<input type="range" min="14" max="26" step="1" value="'+p.size+'" class="inp" data-pref-range="size" />'+
        '</div>'+
        '<div class="field">'+
          '<label class="field-label">Satır Aralığı ('+p.lh+')</label>'+
          '<input type="range" min="1.4" max="2.1" step="0.05" value="'+p.lh+'" class="inp" data-pref-range="lh" />'+
        '</div>'+
        '<div class="field">'+
          '<label class="field-label">Okuma Sütunu Genişliği ('+p.col+' px)</label>'+
          '<input type="range" min="560" max="1120" step="20" value="'+p.col+'" class="inp" data-pref-range="col" />'+
        '</div>'+
      '</div>'+
      '<div class="flex-gap" style="margin-top:10px">'+
        '<label class="flex-gap"><input type="checkbox" data-pref-chk="justify" '+(p.justify?'checked':'')+' /> Paragrafları İki Yana Yasla</label>'+
        '<label class="flex-gap"><input type="checkbox" data-pref-chk="eqNum" '+(p.eqNum?'checked':'')+' /> Denklem Numaralarını Göster</label>'+
        '<label class="flex-gap"><input type="checkbox" data-pref-chk="tocOpen" '+(p.tocOpen?'checked':'')+' /> Sağ İçindekiler Panelini Göster</label>'+
      '</div>';
  }else if(tab==='pdfzoom'){
    tabBody=
      '<div class="stat-card" style="margin-bottom:16px">'+
        '<div style="font-weight:700;margin-bottom:4px">✨ 2-Parmak Laptop Touchpad Yakınlaştırma Aktif</div>'+
        '<div class="muted" style="font-size:12.5px">Okuyucuda touchpad üzerinde 2 parmağını açıp kapatarak %50 ile %300 arasında 60fps akıcılıkta yakınlaştırma yapabilirsin. PDF sayfaları hareket bittiği anda otomatik olarak Ultra-HD çözünürlükte netleştirilir.</div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
        '<div class="field">'+
          '<label class="field-label">Varsayılan PDF Sığdırma Modu</label>'+
          '<select class="sel" data-pref-change="pdfZoomMode">'+
            '<option value="fit-width" '+(p.pdfZoomMode==='fit-width'?'selected':'')+'>Genişliğe Sığdır (Fit Width)</option>'+
            '<option value="fit-page" '+(p.pdfZoomMode==='fit-page'?'selected':'')+'>Tam Sayfaya Sığdır (Fit Page)</option>'+
            '<option value="custom" '+(p.pdfZoomMode==='custom'?'selected':'')+'>Serbest Ölçek</option>'+
          '</select>'+
        '</div>'+
        '<div class="field">'+
          '<label class="field-label">Varsayılan PDF Renk Filtresi</label>'+
          '<select class="sel" data-pref-change="pdfFilter">'+
            '<option value="auto" '+(p.pdfFilter==='auto'?'selected':'')+'>Otomatik (Temaya Uyumlu)</option>'+
            '<option value="original" '+(p.pdfFilter==='original'?'selected':'')+'>%100 Orijinal Renkler (Görsel/Şema Odaklı)</option>'+
            '<option value="dark" '+(p.pdfFilter==='dark'?'selected':'')+'>Akıllı Gece Kağıdı</option>'+
            '<option value="sepia" '+(p.pdfFilter==='sepia'?'selected':'')+'>Sıcak Sepya</option>'+
          '</select>'+
        '</div>'+
      '</div>'+
      '<div class="flex-gap" style="margin-top:10px">'+
        '<label class="flex-gap"><input type="checkbox" data-pref-chk="pdfAutoCrop" '+(p.pdfAutoCrop?'checked':'')+' /> PDF Beyaz Kenar Boşluklarını Otomatik Kırp (Auto-Crop)</label>'+
      '</div>';
  }else if(tab==='analytics'){
    tabBody=
      '<div class="field">'+
        '<label class="field-label">Okuma Hızı Referansı ('+p.wpm+' kelime/dk — Tahmini süre hesabı için)</label>'+
        '<input type="range" min="110" max="260" step="10" value="'+p.wpm+'" class="inp" data-pref-range="wpm" />'+
      '</div>'+
      '<div class="flex-gap" style="margin-bottom:18px">'+
        '<label class="flex-gap"><input type="checkbox" data-pref-chk="showUnitAnalytics" '+(p.showUnitAnalytics?'checked':'')+' /> Ünite Ekranında Otomatik Okuma İstatistikleri Panelini Göster</label>'+
        '<label class="flex-gap"><input type="checkbox" data-pref-chk="autoCompleteAt95" '+(p.autoCompleteAt95?'checked':'')+' /> Part Sonuna (%96+) Gelindiğinde Otomatik Tamamlandı İşaretle</label>'+
      '</div>'+
      '<div class="stat-card">'+
        '<div style="font-weight:700;margin-bottom:6px">Akıllı Başlık ve İpucu İyileştirme (Heal Library v2)</div>'+
        '<div class="muted" style="font-size:12.5px;margin-bottom:10px">Kütüphanedeki tüm mevcut Markdown partlarını tarayarak kesilmiş başlıkları, büyük harf başlıkları ve "Geçmek için devam et" kalıntılarını temizler.</div>'+
        '<button class="btn primary sm" data-act="run-full-heal">✨ Tüm Kütüphane Başlıklarını Şimdi İyileştir</button>'+
      '</div>';
  }else if(tab==='sync'){
    tabBody=
      '<div class="stat-card" style="margin-bottom:16px">'+
        '<div style="font-weight:800;margin-bottom:4px">Kütüphane Klasörü (.gioreader-pro)</div>'+
        '<div class="muted" style="font-size:12.5px;margin-bottom:12px">Durum: <strong>'+(sync.perm==='granted'?'Bağlı ('+escHtml(sync.path||sync.name||'')+')':'Bağlı Değil')+'</strong><br/>Not: GioReader Pro verilerini <code>.gioreader-pro</code> klasöründe saklar; eski <code>.ayrik</code> klasörüne zarar vermez.</div>'+
        '<div class="flex-gap">'+
          '<button class="btn primary sm" data-act="pick-sync-folder">📂 Klasör Seç / Değiştir</button>'+
          (sync.perm==='granted'?'<button class="btn sm" data-act="force-sync-now">🔄 Şimdi Senkronize Et</button>':'')+
        '</div>'+
      '</div>'+
      '<div class="stat-card">'+
        '<div style="font-weight:800;margin-bottom:8px">Tam Yedekleme (JSON)</div>'+
        '<div class="flex-gap">'+
          '<button class="btn sm" data-act="export-backup-json">⬇ Yedeği İndir (.json)</button>'+
        '</div>'+
      '</div>';
  }

  openModal(
    '<div class="modal-head">'+
      '<h3 class="modal-title">⚙ GioReader Pro Ayarları</h3>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="settings-tabs">'+
      '<button class="settings-tab-btn'+(tab==='appearance'?' active':'')+'" data-act="settings-tab" data-tab="appearance">Görünüm & Tema</button>'+
      '<button class="settings-tab-btn'+(tab==='pdfzoom'?' active':'')+'" data-act="settings-tab" data-tab="pdfzoom">Touchpad Zoom & PDF</button>'+
      '<button class="settings-tab-btn'+(tab==='analytics'?' active':'')+'" data-act="settings-tab" data-tab="analytics">Otomatik Analitik & Başlıklar</button>'+
      '<button class="settings-tab-btn'+(tab==='sync'?' active':'')+'" data-act="settings-tab" data-tab="sync">Klasör & Yedekleme</button>'+
    '</div>'+
    '<div class="modal-body">'+tabBody+'</div>'+
    '<div class="modal-foot">'+
      '<button class="btn primary" data-act="close-modal">Tamam</button>'+
    '</div>',
    false
  );

  // Ayar input dinleyicileri
  var host=document.getElementById('modalHost');
  if(!host) return;
  host.querySelectorAll('[data-pref-change]').forEach(function(el){
    el.addEventListener('change',function(){
      var k=el.getAttribute('data-pref-change');
      loadPrefs()[k]=el.value;
      savePrefs();applyPrefsToDOM();render();
    });
  });
  host.querySelectorAll('[data-pref-range]').forEach(function(el){
    el.addEventListener('input',function(){
      var k=el.getAttribute('data-pref-range');
      loadPrefs()[k]=Number(el.value);
      savePrefs();applyPrefsToDOM();
      openSettingsModal(state.settingsTab);
    });
  });
  host.querySelectorAll('[data-pref-chk]').forEach(function(el){
    el.addEventListener('change',function(){
      var k=el.getAttribute('data-pref-chk');
      loadPrefs()[k]=!!el.checked;
      savePrefs();applyPrefsToDOM();render();
    });
  });
}

/* ---------- 6) Hızlı Arama Modalı (Ctrl+K) ---------- */
function openSearchModal(){
  openModal(
    '<div class="modal-head">'+
      '<input type="search" id="globalSearchInp" class="inp" placeholder="Tüm derslerde, part başlıklarında ve içeriklerde ara…" style="border:none;font-size:15px;font-weight:600" autofocus />'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body" id="globalSearchResults" style="max-height:420px;overflow-y:auto">'+
      '<div class="muted">Aramak için yazmaya başla…</div>'+
    '</div>',
    false
  );
  var inp=document.getElementById('globalSearchInp');
  if(inp){
    setTimeout(function(){inp.focus();},30);
    inp.addEventListener('input',function(){
      var q=inp.value.trim().toLocaleLowerCase('tr');
      var resBox=document.getElementById('globalSearchResults');
      if(!resBox) return;
      if(q.length<2){resBox.innerHTML='<div class="muted">En az 2 harf girin…</div>';return;}
      var idx=loadPidx();
      var hits=[];
      Object.values(idx).forEach(function(p){
        if(!p) return;
        var t=(p.title||'').toLocaleLowerCase('tr');
        var ft=(p.ft||'').toLocaleLowerCase('tr');
        if(t.indexOf(q)>=0||ft.indexOf(q)>=0){
          hits.push(p);
        }
      });
      if(!hits.length){
        resBox.innerHTML='<div class="muted">Eşleşen part bulunamadı.</div>';
        return;
      }
      resBox.innerHTML=hits.slice(0,30).map(function(p){
        var fu=findUnit(p.uid);
        return '<div class="unit-row-card" data-act="open-part-from-modal" data-pid="'+escAttr(p.id)+'" style="padding:10px 14px;margin-bottom:8px">'+
          '<div>'+
            '<div style="font-weight:700">Part '+p.no+': '+escHtml(p.title||'')+'</div>'+
            '<div class="muted" style="font-size:11.5px">'+(fu?escHtml(fu.course.name+' · '+fu.unit.name):'')+'</div>'+
          '</div>'+
          '<span class="badge '+(p.kind==='pdf'?'pdf':'md')+'">'+(p.kind==='pdf'?'PDF':'MD')+'</span>'+
        '</div>';
      }).join('');
    });
  }
}

/* ---------- 7) Ders & Ünite Oluşturma / Düzenleme Yardımcıları ---------- */
function openCourseDialog(editCourseObj){
  var isEdit=!!editCourseObj;
  var name=isEdit?editCourseObj.name:'';
  var hue=isEdit?(editCourseObj.hue||220):COURSE_HUES[loadMeta().courses.length%COURSE_HUES.length];

  openModal(
    '<div class="modal-head">'+
      '<h3 class="modal-title">'+(isEdit?'Dersi Düzenle':'+ Yeni Ders Oluştur')+'</h3>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="field">'+
        '<label class="field-label">Ders Adı</label>'+
        '<input type="text" id="courseNameInp" class="inp" value="'+escAttr(name)+'" placeholder="Örn: Signals and Systems" autofocus />'+
      '</div>'+
      '<div class="field">'+
        '<label class="field-label">Renk Tonu (Hue)</label>'+
        '<input type="range" id="courseHueInp" min="0" max="355" value="'+hue+'" class="inp" />'+
      '</div>'+
    '</div>'+
    '<div class="modal-foot">'+
      (isEdit?'<button class="btn danger" data-act="delete-course" data-cid="'+escAttr(editCourseObj.id)+'" style="margin-right:auto">Dersi Sil</button>':'')+
      '<button class="btn" data-act="close-modal">İptal</button>'+
      '<button class="btn primary" data-act="save-course" data-cid="'+(isEdit?escAttr(editCourseObj.id):'')+'">Kaydet</button>'+
    '</div>',
    false
  );
}

function openUnitDialog(cid,editUnitObj,kind){
  var isEdit=!!editUnitObj;
  var name=isEdit?editUnitObj.name:'';
  var n=isEdit?(editUnitObj.n||16):(kind==='test'?10:16);

  openModal(
    '<div class="modal-head">'+
      '<h3 class="modal-title">'+(isEdit?'Üniteyi Düzenle':(kind==='test'?'🧪 + Yeni Test Ünitesi':'+ Yeni Ünite Oluştur'))+'</h3>'+
      '<button class="icon-btn sm" data-act="close-modal">✕</button>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="field">'+
        '<label class="field-label">Ünite Adı</label>'+
        '<input type="text" id="unitNameInp" class="inp" value="'+escAttr(name)+'" placeholder="Örn: ÜNİTE 4 — Node-Voltage & Mesh-Current" autofocus />'+
      '</div>'+
      '<div class="field">'+
        '<label class="field-label">Hedef Part Sayısı</label>'+
        '<input type="number" id="unitCountInp" class="inp" min="1" max="200" value="'+n+'" />'+
      '</div>'+
    '</div>'+
    '<div class="modal-foot">'+
      (isEdit?'<button class="btn danger" data-act="delete-unit" data-uid="'+escAttr(editUnitObj.id)+'" style="margin-right:auto">Üniteyi Sil</button>':'')+
      '<button class="btn" data-act="close-modal">İptal</button>'+
      '<button class="btn primary" data-act="save-unit" data-cid="'+escAttr(cid)+'" data-uid="'+(isEdit?escAttr(editUnitObj.id):'')+'" data-kind="'+(kind||'lecture')+'">Kaydet</button>'+
    '</div>',
    false
  );
}

/* ---------- Toplu Dosya (.md / .tex / .pdf) İçe Aktarma ---------- */
function bulkImportMultiplePdfFiles(files,uid2){
  var fu=findUnit(uid2);
  if(!fu) return;
  var existing=unitParts(uid2);
  var used=new Set(existing.map(function(p){return p.no;}));
  var nextNo=1;
  var chain=Promise.resolve();
  var count=0;

  files.forEach(function(f){
    chain=chain.then(function(){
      while(used.has(nextNo)) nextNo++;
      var myNo=nextNo;
      used.add(myNo);
      return inspectPdfForImport({name:f.name,externalPath:f.path},uid2).then(function(sess){
        return executePdfImportPlan([{
          no:sess.singleNo||myNo,
          title:sess.singleTitle||f.name.replace(/\.pdf$/i,''),
          startPage:1,
          endPage:sess.numPages
        }]);
      }).then(function(){count++;});
    });
  });

  chain.then(function(){
    toast(count+' PDF dosyası üniteye eklendi ✓');
    render();
  });
}

function bulkImportMultipleBrowserFiles(fileList,uid2){
  var fu=findUnit(uid2);
  if(!fu) return;
  var c=fu.course,u=fu.unit;
  var existing=unitParts(uid2);
  var used=new Set(existing.map(function(p){return p.no;}));
  var nextNo=1;
  var chain=Promise.resolve();
  var addedCount=0;

  fileList.forEach(function(f){
    var isPdf=/\.pdf$/i.test(f.name);
    if(isPdf){
      chain=chain.then(function(){
        var extPath=NATIVE&&NATIVE.getPathForFile?NATIVE.getPathForFile(f):null;
        return f.arrayBuffer().then(function(ab){
          while(used.has(nextNo)) nextNo++;
          var myNo=nextNo;used.add(myNo);
          return inspectPdfForImport({name:f.name,externalPath:extPath,data:new Uint8Array(ab)},uid2).then(function(sess){
            return executePdfImportPlan([{
              no:sess.singleNo||myNo,
              title:sess.singleTitle||f.name.replace(/\.pdf$/i,''),
              startPage:1,
              endPage:sess.numPages
            }]);
          }).then(function(){addedCount++;});
        });
      });
    }else{
      chain=chain.then(function(){
        return f.text().then(function(txt){
          while(used.has(nextNo)) nextNo++;
          var a=analyzePart(txt,f.name);
          var pNo=a.no||nextNo;
          used.add(pNo);
          return saveMarkdownPartToUnit(u.id,pNo,a.title||('Part '+pNo),txt,a);
        }).then(function(){addedCount++;});
      });
    }
  });

  chain.then(function(){
    toast(addedCount+' dosya başarıyla eklendi ✓');
    render();
  });
}

function saveMarkdownPartToUnit(uid2,partNo,title,rawText,analysisObj){
  var fu=findUnit(uid2);
  if(!fu) return Promise.resolve(null);
  var c=fu.course,u=fu.unit;
  var a=analysisObj||analyzePart(rawText);
  var idx=loadPidx();
  var existing=unitPartByNo(u.id,partNo);
  var pid=existing?existing.id:uid('p');
  var now=Date.now();

  var entry={
    id:pid,
    cid:c.id,
    uid:u.id,
    no:partNo,
    kind:'md',
    title:title||a.title||('Part '+partNo),
    ft:a.fullTitle&&a.fullTitle!==title?a.fullTitle:undefined,
    minutes:a.minutes||8,
    wordCount:a.wordCount||0,
    eqCount:a.eqCount||0,
    codeBlockCount:a.codeBlockCount||0,
    nx:a.next||null,
    added:existing?existing.added:now,
    u:now
  };
  idx[pid]=entry;
  if(a.next&&a.next.no&&a.next.title){
    if(!u.hints) u.hints={};
    u.hints[a.next.no]=cleanHintString(a.next.title);
  }
  if(a.unitTotal&&a.unitTotal>u.n) u.n=a.unitTotal;
  if(partNo>u.n) u.n=partNo;

  touchUnit(u,c);
  saveMeta();
  savePidx();
  return putBody(pid,rawText,false).then(function(){return pid;});
}

/* ============================================================================
   Global Olay Yöneticisi (Tıklama, Kaydırma, Seçim Vurgusu, Sürükle-Bırak, Klavye)
   ============================================================================ */

function handleGlobalClick(e){
  // Vurgu silme (Markdown mark veya PDF kutusu)
  var markEl=e.target.closest&&e.target.closest('mark[data-hl-id], .pdf-hl-box[data-hl-id]');
  if(markEl&&state.pid){
    var hlId=markEl.getAttribute('data-hl-id');
    var st=getState(state.pid);
    st.hl=(st.hl||[]).filter(function(h){return h.id!==hlId;});
    touchState(state.pid);
    if(markEl.tagName==='MARK'){
      var parent=markEl.parentNode;
      while(markEl.firstChild) parent.insertBefore(markEl.firstChild,markEl);
      parent.removeChild(markEl);
    }else{
      var card=markEl.closest('.pdf-page-card');
      if(card) renderPdfHighlightsForPage(+card.getAttribute('data-pdf-page'),card);
    }
    toast('Vurgu kaldırıldı');
    return;
  }

  var actEl=e.target.closest&&e.target.closest('[data-act]');
  if(!actEl) return;
  var act=actEl.getAttribute('data-act');

  if(act==='close-modal-backdrop'){
    if(e.target===actEl) closeModal();
    return;
  }
  if(act==='close-modal'){closeModal();return;}

  // Gezinme
  if(act==='nav-lib'){e.stopPropagation();navTo('library');return;}
  if(act==='nav-course'){e.stopPropagation();navTo('course',{cid:actEl.getAttribute('data-cid')});return;}
  if(act==='nav-unit'){e.stopPropagation();navTo('unit',{uid:actEl.getAttribute('data-uid')});return;}
  if(act==='open-part'){
    e.stopPropagation();
    navTo('reader',{pid:actEl.getAttribute('data-pid')});
    return;
  }
  if(act==='open-part-from-modal'){
    closeModal();
    navTo('reader',{pid:actEl.getAttribute('data-pid')});
    return;
  }

  // Kenar çubuğu & Odak modu & Zoom
  if(act==='toggle-sidebar'){
    var pr=loadPrefs();
    pr.sidebarOpen=!pr.sidebarOpen;
    savePrefs();
    renderSidebar();
    renderTopbar();
    return;
  }
  if(act==='toggle-focus'){
    var pr2=loadPrefs();
    pr2.focus=!pr2.focus;
    savePrefs();
    applyPrefsToDOM();
    toast(pr2.focus?'Odak modu açıldı (Çıkmak için F veya Esc)':'Odak modu kapatıldı');
    return;
  }
  if(act==='zoom-in'){stepReaderZoom(0.10);return;}
  if(act==='zoom-out'){stepReaderZoom(-0.10);return;}
  if(act==='zoom-reset'){resetReaderZoom();return;}

  // Modallar
  if(act==='open-settings'){openSettingsModal('appearance');return;}
  if(act==='open-sync-settings'){openSettingsModal('sync');return;}
  if(act==='open-stats-modal'){openStatsModal();return;}
  if(act==='open-search'){openSearchModal();return;}
  if(act==='settings-tab'){
    openSettingsModal(actEl.getAttribute('data-tab'));
    return;
  }
  if(act==='set-pref'){
    var k=actEl.getAttribute('data-key'),v=actEl.getAttribute('data-val');
    loadPrefs()[k]=v;savePrefs();applyPrefsToDOM();
    openSettingsModal(state.settingsTab);
    render();
    return;
  }

  // Klasör Senkronizasyonu ve Başlık İyileştirme
  if(act==='pick-sync-folder'){pickSyncFolder().then(function(){openSettingsModal('sync');});return;}
  if(act==='force-sync-now'){
    syncPull().then(function(){
      toast('Kütüphane klasörü senkronize edildi ✓');
      openSettingsModal('sync');
      render();
    });
    return;
  }
  if(act==='run-full-heal'||act==='heal-unit-titles'){
    toast('Başlıklar ve ipuçları taranıyor…');
    healLibraryMetadata().then(function(cnt){
      flushSyncPush();
      toast('Tamamlandı! '+cnt+' part başlığı iyileştirildi ✓');
      render();
    });
    return;
  }
  if(act==='export-backup-json'){
    var data=JSON.stringify({app:'gioreader-pro',v:4,exported:Date.now(),meta:loadMeta(),parts:loadPidx(),state:loadRstate()},null,2);
    var blob=new Blob([data],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='gioreader-pro-yedek-'+todayKey()+'.json';
    a.click();
    return;
  }

  // Ders Ekle / Düzenle / Sil
  if(act==='new-course'){openCourseDialog(null);return;}
  if(act==='edit-course'){
    e.stopPropagation();
    openCourseDialog(findCourse(actEl.getAttribute('data-cid')));
    return;
  }
  if(act==='save-course'){
    var cid=actEl.getAttribute('data-cid');
    var nameInp=document.getElementById('courseNameInp');
    var hueInp=document.getElementById('courseHueInp');
    var nm=nameInp?nameInp.value.trim():'';
    if(!nm){toast('Lütfen ders adı girin');return;}
    var hueVal=hueInp?Number(hueInp.value):220;
    var m=loadMeta();
    if(cid){
      var c=findCourse(cid);
      if(c){c.name=nm;c.hue=hueVal;touchCourse(c);}
    }else{
      var nc={id:uid('c'),name:nm,hue:hueVal,folder:sanitizeSeg(nm,'Ders'),created:Date.now(),u:Date.now(),units:[],du:{}};
      m.courses.push(nc);
      state.cid=nc.id;
    }
    saveMeta();closeModal();render();
    return;
  }
  if(act==='delete-course'){
    var delCid=actEl.getAttribute('data-cid');
    if(!confirm('Bu dersi ve içindeki üniteleri silmek istediğine emin misin?')) return;
    var m2=loadMeta();
    m2.dc[delCid]=Date.now();
    m2.courses=m2.courses.filter(function(x){return x.id!==delCid;});
    saveMeta();closeModal();navTo('library');
    return;
  }

  // Ünite Ekle / Düzenle / Sil
  if(act==='new-unit'){openUnitDialog(actEl.getAttribute('data-cid'),null,'lecture');return;}
  if(act==='new-test-unit'){openUnitDialog(actEl.getAttribute('data-cid'),null,'test');return;}
  if(act==='edit-unit'){
    e.stopPropagation();
    var fu=findUnit(actEl.getAttribute('data-uid'));
    if(fu) openUnitDialog(fu.course.id,fu.unit,fu.unit.kind||'lecture');
    return;
  }
  if(act==='save-unit'){
    var uCid=actEl.getAttribute('data-cid');
    var uId=actEl.getAttribute('data-uid');
    var uKind=actEl.getAttribute('data-kind')||'lecture';
    var uNameInp=document.getElementById('unitNameInp');
    var uCntInp=document.getElementById('unitCountInp');
    var uName=uNameInp?uNameInp.value.trim():'';
    if(!uName){toast('Lütfen ünite adı girin');return;}
    var uCnt=uCntInp?Math.max(1,parseInt(uCntInp.value,10)||16):16;
    var courseObj=findCourse(uCid);
    if(!courseObj) return;
    if(uId){
      var exU=courseObj.units.find(function(x){return x.id===uId;});
      if(exU){exU.name=uName;exU.n=uCnt;touchUnit(exU,courseObj);}
    }else{
      var nu={id:uid('u'),cid:courseObj.id,name:uName,folder:sanitizeSeg(uName,'Unite'),n:uCnt,kind:uKind==='test'?'test':undefined,hints:{},created:Date.now(),ord:Date.now(),u:Date.now()};
      courseObj.units.push(nu);
      touchCourse(courseObj);
      state.uid=nu.id;
    }
    saveMeta();closeModal();render();
    return;
  }
  if(act==='delete-unit'){
    var delUid=actEl.getAttribute('data-uid');
    var fuDel=findUnit(delUid);
    if(!fuDel||!confirm('Bu üniteyi silmek istediğine emin misin?')) return;
    fuDel.course.du[delUid]=Date.now();
    fuDel.course.units=fuDel.course.units.filter(function(x){return x.id!==delUid;});
    touchCourse(fuDel.course);
    saveMeta();closeModal();navTo('course',{cid:fuDel.course.id});
    return;
  }

  if(act==='toggle-unit-table'){
    state.unitTableExpanded=!state.unitTableExpanded;
    render();
    return;
  }

  // Part Ekle / Düzenle / Sil
  if(act==='open-add-part'){
    e.stopPropagation();
    var pNoAttr=actEl.getAttribute('data-part-no');
    openAddPartModal(actEl.getAttribute('data-uid'),pNoAttr?+pNoAttr:null);
    return;
  }
  if(act==='switch-to-pdf-importer'||act==='open-pdf-importer'){
    e.stopPropagation();
    var targetUid=actEl.getAttribute('data-uid')||state.uid;
    closeModal();
    triggerPdfFileSelectionForUnit(targetUid);
    return;
  }
  if(act==='quick-import-pdf'||act==='course-import-pdf'){
    var m3=loadMeta();
    var targetCourse=act==='course-import-pdf'?findCourse(actEl.getAttribute('data-cid')):(m3.courses[0]||null);
    if(!targetCourse){
      toast('Önce bir ders oluşturun');
      openCourseDialog(null);
      return;
    }
    if(!targetCourse.units.length){
      var defU={id:uid('u'),cid:targetCourse.id,name:'ÜNİTE 1 — PDF Ders Materyalleri',folder:'UNITE_1_PDF',n:10,hints:{},created:Date.now(),ord:Date.now(),u:Date.now()};
      targetCourse.units.push(defU);
      saveMeta();
    }
    var targetUnit=targetCourse.units[targetCourse.units.length-1];
    navTo('unit',{cid:targetCourse.id,uid:targetUnit.id});
    triggerPdfFileSelectionForUnit(targetUnit.id);
    return;
  }
  if(act==='pick-md-file-for-modal'){
    var inp=document.createElement('input');
    inp.type='file';
    inp.accept='.md,.markdown,.txt,.tex,.latex';
    inp.onchange=function(){
      var f=inp.files&&inp.files[0];
      if(!f) return;
      f.text().then(function(txt){
        var bodyInp=document.getElementById('addPartBodyInp');
        if(bodyInp){
          bodyInp.value=txt;
          bodyInp.dispatchEvent(new Event('input'));
        }
      });
    };
    inp.click();
    return;
  }
  if(act==='save-new-md-part'){
    var targetU=actEl.getAttribute('data-uid');
    var noV=parseInt((document.getElementById('addPartNoInp')||{}).value,10)||1;
    var titleV=((document.getElementById('addPartTitleInp')||{}).value||'').trim();
    var bodyV=((document.getElementById('addPartBodyInp')||{}).value||'');
    if(!bodyV.trim()){toast('Lütfen içerik yapıştırın veya dosya seçin');return;}
    var a=analyzePart(bodyV);
    saveMarkdownPartToUnit(targetU,noV,titleV||a.title||('Part '+noV),bodyV,a).then(function(newPid){
      closeModal();
      toast('Part '+noV+' kaydedildi ✓');
      if(newPid) navTo('reader',{pid:newPid});
      else render();
    });
    return;
  }
  if(act==='edit-part-meta'){
    e.stopPropagation();
    openEditPartMetaModal(actEl.getAttribute('data-pid'));
    return;
  }
  if(act==='save-edit-part-meta'){
    var editPid=actEl.getAttribute('data-pid');
    var pObj=loadPidx()[editPid];
    if(!pObj) return;
    var newNo=parseInt((document.getElementById('editPartNoInp')||{}).value,10)||pObj.no;
    var newTitle=((document.getElementById('editPartTitleInp')||{}).value||'').trim();
    var newFt=((document.getElementById('editPartFullTitleInp')||{}).value||'').trim();
    pObj.no=newNo;
    if(newTitle) pObj.title=newTitle;
    if(newFt&&newFt!==newTitle) pObj.ft=newFt;
    else delete pObj.ft;
    pObj.u=Date.now();
    savePidx();
    closeModal();
    toast('Part bilgileri güncellendi ✓');
    render();
    return;
  }
  if(act==='delete-part'){
    e.stopPropagation();
    var delPid=actEl.getAttribute('data-pid');
    var pDel=loadPidx()[delPid];
    if(!pDel||!confirm('Part '+pDel.no+' ('+(pDel.title||'')+') silinsin mi?')) return;
    loadTomb()['p:'+delPid]=Date.now();
    saveTomb();
    delBody(delPid,false);
    delete loadPidx()[delPid];
    savePidx();
    toast('Part silindi');
    render();
    return;
  }
  if(act==='bulk-upload-files'){
    var bUid=actEl.getAttribute('data-uid');
    var inp2=document.createElement('input');
    inp2.type='file';
    inp2.multiple=true;
    inp2.accept='.md,.markdown,.txt,.tex,.latex,.pdf';
    inp2.onchange=function(){
      var fs=Array.prototype.slice.call(inp2.files||[]);
      if(fs.length) bulkImportMultipleBrowserFiles(fs,bUid);
    };
    inp2.click();
    return;
  }

  // PDF İçe Aktarma Modal Eylemleri
  if(act==='pdf-imp-mode'){
    pdfImportSession.mode=actEl.getAttribute('data-mode');
    renderPdfImporterModalContent(pdfImportSession);
    return;
  }
  if(act==='confirm-pdf-import'){
    var sess=pdfImportSession;
    if(!sess||!sess.uid) return;

    if(sess.mode==='single'){
      var sNo=parseInt((document.getElementById('pdfImpSingleNo')||{}).value,10)||sess.singleNo||1;
      var sTitle=((document.getElementById('pdfImpSingleTitle')||{}).value||'').trim()||sess.singleTitle;
      var sStart=Math.max(1,parseInt((document.getElementById('pdfImpStartPage')||{}).value,10)||1);
      var sEnd=Math.max(sStart,Math.min(sess.numPages,parseInt((document.getElementById('pdfImpEndPage')||{}).value,10)||sess.numPages));
      var fmt=((document.getElementById('pdfImpFormatSel')||{}).value)||'pdf';

      if(fmt==='md'&&sess.pdfDoc){
        toast('PDF metni Markdown formatına dönüştürülüyor…');
        extractPdfRangeAsMarkdown(sess.pdfDoc,sStart,sEnd,sTitle).then(function(mdTxt){
          return saveMarkdownPartToUnit(sess.uid,sNo,sTitle,mdTxt);
        }).then(function(pid){
          closeModal();
          toast('PDF Markdown olarak eklendi ✓');
          if(pid) navTo('reader',{pid:pid});
          else render();
        });
        return;
      }

      executePdfImportPlan([{no:sNo,title:sTitle,startPage:sStart,endPage:sEnd}]).then(function(ids){
        closeModal();
        toast('Ultra-HD PDF Part '+sNo+' eklendi ✓');
        if(ids&&ids[0]) navTo('reader',{pid:ids[0]});
        else render();
      });
      return;
    }

    if(sess.mode==='outline'){
      var host=document.getElementById('modalHost');
      var chks=host?host.querySelectorAll('.pdf-outline-chk'):[];
      var plan=[];
      var baseNo=sess.singleNo||1;
      for(var i=0;i<chks.length;i++){
        if(!chks[i].checked) continue;
        var idx=+chks[i].getAttribute('data-idx');
        var ch=sess.outlineChapters[idx];
        var tInp=host.querySelector('.pdf-outline-title[data-idx="'+idx+'"]');
        var tVal=(tInp&&tInp.value.trim())||ch.title||('Bölüm '+(i+1));
        plan.push({no:baseNo++,title:tVal,startPage:ch.startPage,endPage:ch.endPage});
      }
      if(!plan.length){toast('En az bir bölüm seçin');return;}
      executePdfImportPlan(plan).then(function(){
        closeModal();
        toast(plan.length+' PDF bölümü ayrı partlar olarak eklendi ✓');
        render();
      });
      return;
    }

    if(sess.mode==='chunks'){
      var cSize=Math.max(1,parseInt((document.getElementById('pdfImpChunkSize')||{}).value,10)||10);
      var startNo=Math.max(1,parseInt((document.getElementById('pdfImpChunkStartNo')||{}).value,10)||sess.singleNo||1);
      var chunkPlan=[];
      var pCur=1,k=0;
      var chain=Promise.resolve();
      while(pCur<=sess.numPages){
        (function(sP,eP,partNo){
          chain=chain.then(function(){
            return extractPdfPageSummary(sess.pdfDoc,sP).then(function(sum){
              var autoT=sum.topHeading?shortTitle(titleClean(sum.topHeading),60):null;
              if(!autoT||autoT.length<3) autoT=sess.singleTitle+' (s. '+sP+'–'+eP+')';
              chunkPlan.push({no:partNo,title:autoT,startPage:sP,endPage:eP});
            });
          });
        })(pCur,Math.min(sess.numPages,pCur+cSize-1),startNo+k);
        pCur+=cSize;k++;
      }
      chain.then(function(){
        return executePdfImportPlan(chunkPlan);
      }).then(function(){
        closeModal();
        toast(chunkPlan.length+' PDF partı oluşturuldu ✓');
        render();
      });
      return;
    }
  }

  // Okuyucu Tamamlama & İçindekiler & Kod Kopyalama
  if(act==='toggle-part-done'){
    var tPid=actEl.getAttribute('data-pid');
    var st2=getState(tPid);
    if(st2.done) delete st2.done;
    else {st2.done=Date.now();st2.pos=1;}
    touchState(tPid);
    render();
    return;
  }
  if(act==='complete-and-next'){
    var cPid=actEl.getAttribute('data-pid');
    var nPid=actEl.getAttribute('data-next-pid');
    var st3=getState(cPid);
    st3.done=Date.now();st3.pos=1;
    touchState(cPid);
    navTo('reader',{pid:nPid});
    return;
  }
  if(act==='complete-and-unit'){
    var cuPid=actEl.getAttribute('data-pid');
    var cuUid=actEl.getAttribute('data-uid');
    var st4=getState(cuPid);
    st4.done=Date.now();st4.pos=1;
    touchState(cuPid);
    navTo('unit',{uid:cuUid});
    return;
  }
  if(act==='toc-jump'){
    var targetId=actEl.getAttribute('data-target');
    var hEl=document.getElementById(targetId);
    if(hEl) hEl.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  if(act==='copy-code'){
    var pre=actEl.closest('pre');
    var code=pre?pre.querySelector('code'):null;
    if(code&&navigator.clipboard){
      navigator.clipboard.writeText(code.textContent||'');
      actEl.textContent='Kopyalandı ✓';
      setTimeout(function(){actEl.textContent='Kopyala';},1400);
    }
    return;
  }

  // Ultra-HD PDF Okuyucu Kontrolleri
  if(act==='pdf-prev-page'){scrollToPdfPartPage(pdfViewerState.currentPage-1,true);return;}
  if(act==='pdf-next-page'){scrollToPdfPartPage(pdfViewerState.currentPage+1,true);return;}
  if(act==='pdf-goto-page'){
    scrollToPdfPartPage(+actEl.getAttribute('data-page'),true);
    return;
  }
  if(act==='pdf-fit-width'||act==='pdf-fit-page'){
    var mode=act==='pdf-fit-width'?'fit-width':'fit-page';
    pdfViewerState.zoomMode=mode;
    var pr3=loadPrefs();pr3.pdfZoomMode=mode;pr3.zoom=1.0;savePrefs();
    zoomState.current=1.0;
    updateZoomToolbarBadge();
    var pCurPart=currentReaderPart();
    var fuCur=pCurPart?findUnit(pCurPart.uid):null;
    if(pCurPart&&fuCur) mountPdfReaderView(pCurPart,fuCur.unit,fuCur.course);
    return;
  }
  if(act==='pdf-toggle-spread'){
    pdfViewerState.spread=pdfViewerState.spread==='double'?'single':'double';
    var pr4=loadPrefs();pr4.pdfSpread=pdfViewerState.spread;savePrefs();
    var pCur2=currentReaderPart();
    var fuCur2=pCur2?findUnit(pCur2.uid):null;
    if(pCur2&&fuCur2) mountPdfReaderView(pCur2,fuCur2.unit,fuCur2.course);
    return;
  }
  if(act==='pdf-toggle-crop'){
    pdfViewerState.autoCrop=!pdfViewerState.autoCrop;
    var pr5=loadPrefs();pr5.pdfAutoCrop=pdfViewerState.autoCrop;savePrefs();
    updatePdfToolbarUI();
    if(pdfViewerState.autoCrop&&pdfViewerState.pdfDoc&&!pdfViewerState.cropBox){
      pdfViewerState.pdfDoc.getPage(pdfViewerState.startPage).then(detectSmartCropBox).then(function(box){
        pdfViewerState.cropBox=box;
        applyCropBoxToAllPages();
        toast('Beyaz kenar boşlukları otomatik kırpıldı ✓');
      });
    }else{
      applyCropBoxToAllPages();
    }
    return;
  }
  if(act==='pdf-toggle-drawer'){
    pdfViewerState.drawerOpen=!pdfViewerState.drawerOpen;
    var dr=document.getElementById('pdfDrawer');
    if(dr){
      dr.style.display=pdfViewerState.drawerOpen?'flex':'none';
      if(pdfViewerState.drawerOpen) renderPdfDrawerContent();
    }
    return;
  }
  if(act==='pdf-drawer-tab'){
    pdfViewerState.drawerTab=actEl.getAttribute('data-tab');
    var tabs=document.querySelectorAll('.pdf-drawer-tab');
    for(var t=0;t<tabs.length;t++) tabs[t].classList.toggle('active',tabs[t]===actEl);
    renderPdfDrawerContent();
    return;
  }
  if(act==='pdf-del-hl'){
    e.stopPropagation();
    var delHlId=actEl.getAttribute('data-hl-id');
    if(pdfViewerState.pid){
      var st5=getState(pdfViewerState.pid);
      st5.hl=(st5.hl||[]).filter(function(h){return h.id!==delHlId;});
      touchState(pdfViewerState.pid);
      renderPdfDrawerContent();
      var cards=document.querySelectorAll('.pdf-page-card');
      for(var cIdx=0;cIdx<cards.length;cIdx++){
        renderPdfHighlightsForPage(+cards[cIdx].getAttribute('data-pdf-page'),cards[cIdx]);
      }
    }
    return;
  }

  // Çoktan Seçmeli Test Kontrolleri
  if(act==='start-test'){
    e.stopPropagation();
    navTo('test',{uid:actEl.getAttribute('data-uid')});
    return;
  }
  if(act==='test-jump'){
    var fuT=findUnit(state.uid);
    if(fuT&&fuT.unit&&fuT.unit.run){
      fuT.unit.run.idx=+actEl.getAttribute('data-idx');
      saveMeta(true);
      render();
    }
    return;
  }
  if(act==='test-prev'||act==='test-next'){
    var fuT2=findUnit(state.uid);
    if(fuT2&&fuT2.unit&&fuT2.unit.run){
      fuT2.unit.run.idx+=(act==='test-next'?1:-1);
      saveMeta(true);
      render();
    }
    return;
  }
  if(act==='test-pick-opt'){
    var fuT3=findUnit(state.uid);
    if(fuT3&&fuT3.unit&&fuT3.unit.run){
      var r=fuT3.unit.run;
      var qKey=r.order[r.idx||0];
      if(!r.ans) r.ans={};
      r.ans[qKey]=actEl.getAttribute('data-opt');
      touchUnit(fuT3.unit,fuT3.course);
      saveMeta();
      render();
    }
    return;
  }
  if(act==='test-reset'){
    var fuT4=findUnit(state.uid);
    if(fuT4&&fuT4.unit&&confirm('Test ilerlemesi sıfırlansın mı?')){
      delete fuT4.unit.run;
      touchUnit(fuT4.unit,fuT4.course);
      saveMeta();
      render();
    }
    return;
  }
}

/* ---------- Kaydırma (Scroll) & Otomatik İlerleme Takibi ---------- */
function handleWindowScroll(){
  if(state.view!=='reader'||!state.pid) return;
  var p=currentReaderPart();
  if(!p||p.kind==='pdf') return; // PDF kendi sayfa gözlemcisiyle günceller

  var maxScroll=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
  var ratio=Math.max(0,Math.min(1,window.scrollY/maxScroll));
  var bar=document.getElementById('readProgressBar');
  if(bar) bar.style.width=Math.round(ratio*100)+'%';

  var st=getState(p.id);
  st.pos=Math.round(ratio*10000)/10000;
  var pr=loadPrefs();
  if(pr.autoCompleteAt95&&ratio>=0.96&&(st.sec||0)>=20&&!st.done){
    st.done=Date.now();
    saveRstate();
    toast('Part tamamlandı olarak işaretlendi ✓');
  }
}

/* ---------- Metin ve PDF Seçim Vurgulama Balonu (#selPop) ---------- */
function setupSelectionPopover(){
  var pop=document.getElementById('selPop');
  if(!pop) return;

  document.addEventListener('mouseup',function(e){
    if(pop.contains(e.target)) return;
    setTimeout(function(){
      if(state.view!=='reader'||!state.pid){pop.classList.remove('show');return;}
      var sel=window.getSelection();
      if(!sel||sel.isCollapsed||sel.toString().trim().length<2){
        pop.classList.remove('show');
        return;
      }
      var range=sel.getRangeAt(0);
      var rect=range.getBoundingClientRect();
      if(!rect||rect.width===0){pop.classList.remove('show');return;}
      pop.style.left=Math.max(12,Math.min(window.innerWidth-200,rect.left+(rect.width/2)-85))+'px';
      pop.style.top=Math.max(12,rect.top-44)+'px';
      pop.classList.add('show');
    },20);
  });

  pop.addEventListener('click',function(e){
    var btn=e.target.closest('[data-hl-col]');
    if(!btn||!state.pid) return;
    var col=btn.getAttribute('data-hl-col');
    var p=currentReaderPart();
    if(p&&p.kind==='pdf'){
      addPdfSelectionHighlight(col);
      pop.classList.remove('show');
      return;
    }
    var sel=window.getSelection();
    var q=sel?sel.toString().trim():'';
    if(q.length>=2){
      var st=getState(state.pid);
      var hId=uid('h');
      st.hl.push({id:hId,q:q.slice(0,350),c:col,at:Date.now()});
      touchState(state.pid);
      var artBody=document.getElementById('articleBody');
      if(artBody) highlightQuoteInElement(artBody,q,hId,col);
      sel.removeAllRanges();
      toast('Metin vurgulandı');
    }
    pop.classList.remove('show');
  });
}

/* ---------- Sürükle ve Bırak (Drag & Drop .pdf / .md / .tex) ---------- */
function setupDragAndDrop(){
  window.addEventListener('dragover',function(e){e.preventDefault();});
  window.addEventListener('drop',function(e){
    e.preventDefault();
    var files=Array.prototype.slice.call((e.dataTransfer&&e.dataTransfer.files)||[]);
    if(!files.length) return;
    var targetUid=state.uid;
    if(!targetUid){
      var m=loadMeta();
      if(m.courses.length&&m.courses[0].units.length){
        targetUid=m.courses[0].units[0].id;
      }
    }
    if(!targetUid){
      toast('Dosya eklemek için önce bir ders ve ünite açın');
      return;
    }
    if(files.length===1&&/\.pdf$/i.test(files[0].name)){
      var f=files[0];
      var extPath=NATIVE&&NATIVE.getPathForFile?NATIVE.getPathForFile(f):null;
      f.arrayBuffer().then(function(ab){
        openPdfImporterModalForFile({name:f.name,externalPath:extPath,data:new Uint8Array(ab)},targetUid);
      });
    }else{
      bulkImportMultipleBrowserFiles(files,targetUid);
    }
  });
}

/* ---------- Klavye Kısayolları ---------- */
function setupKeyboardShortcuts(){
  window.addEventListener('keydown',function(e){
    var inInput=/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||'');
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();
      openSearchModal();
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key===','){
      e.preventDefault();
      openSettingsModal('appearance');
      return;
    }
    if((e.ctrlKey||e.metaKey)&&(e.key==='='||e.key==='+')){
      if(isZoomableView()){e.preventDefault();stepReaderZoom(0.10);}
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='-'){
      if(isZoomableView()){e.preventDefault();stepReaderZoom(-0.10);}
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='0'){
      if(isZoomableView()){e.preventDefault();resetReaderZoom();}
      return;
    }
    if(e.key==='Escape'){
      var host=document.getElementById('modalHost');
      if(host&&host.innerHTML){closeModal();return;}
      if(loadPrefs().focus){
        loadPrefs().focus=false;savePrefs();applyPrefsToDOM();
      }
      return;
    }
    if(inInput) return;
    if(e.key.toLowerCase()==='f'&&state.view==='reader'&&!e.ctrlKey&&!e.metaKey){
      e.preventDefault();
      var pr=loadPrefs();pr.focus=!pr.focus;savePrefs();applyPrefsToDOM();
      return;
    }
    if(e.key==='\\'){
      e.preventDefault();
      var pr2=loadPrefs();pr2.sidebarOpen=!pr2.sidebarOpen;savePrefs();renderSidebar();renderTopbar();
      return;
    }
  });
}

/* ---------- Uygulama Başlatıcı (Boot) ---------- */
if(typeof window!=='undefined'){
  window.__gioFlush=flushSyncPush;
  window.__gioZoomStep=stepReaderZoom;
  window.__gioZoomReset=resetReaderZoom;
  window.__gioApi={
    loadMeta:loadMeta,
    loadPidx:loadPidx,
    loadRstate:loadRstate,
    navTo:navTo,
    setReaderZoom:setReaderZoom,
    getZoomPct:getZoomPct,
    resetReaderZoom:resetReaderZoom,
    findUnit:findUnit,
    computeUnitReadingAnalytics:computeUnitReadingAnalytics,
    inspectPdfForImport:inspectPdfForImport,
    healLibraryMetadata:healLibraryMetadata,
    flushSyncPush:flushSyncPush
  };
}

function bootApp(){
  applyPrefsToDOM();
  initZoomEngine();
  initAutoReadingTracker();
  setupSelectionPopover();
  setupDragAndDrop();
  setupKeyboardShortcuts();

  document.addEventListener('click',handleGlobalClick);
  window.addEventListener('scroll',handleWindowScroll,{passive:true});
  window.addEventListener('popstate',function(e){
    if(e.state&&e.state.view){
      navTo(e.state.view,{cid:e.state.cid,uid:e.state.uid,pid:e.state.pid},true);
    }
  });

  render();

  window.__gioBootPromise=initSync().then(function(ok){
    if(ok){
      render();
      if(sync.migratedFromLegacy){
        toast('Mevcut derslerin ve okuma geçmişin GioReader Pro\'ya aktarıldı ve başlıklar iyileştirildi ✓');
      }
    }
    return ok;
  });
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootApp);
}else{
  bootApp();
}
