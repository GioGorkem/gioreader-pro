/* GioReader Pro — Studio JS Module:
   Faz 2 (Focal-point Zoom & Pan), Faz 3 (HiDPI Super-sampling Double Buffer),
   Faz 4 (Okuma Filtreleri), Faz 5 (Floating HUD), Faz 6 (Canlı Kenar Çubuğu),
   Faz 10 (120 FPS Virtual Viewport), Faz 11 (Klavye Kısayolları & Zen Modu) */

(function(){
  "use strict";

  // Global Studio Durumu
  window.Studio = {
    isHandTool: false,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    scrollStartX: 0,
    scrollStartY: 0,
    zenMode: false,
    hudEl: null,
    sidebarEl: null,
    activeOutline: null
  };

  /* ==========================================================================
     FAZ 2.2: ODAK NOKTASI KORUMALI ZOOM (FOCAL-POINT ANCHORED ZOOM)
     ========================================================================== */
  window.zoomWithFocalPoint = function(nextZoom, clientX, clientY) {
    if (typeof setReaderZoom === 'function') {
      var opts = {};
      if (clientX != null) opts.clientX = clientX;
      if (clientY != null) opts.clientY = clientY;
      return setReaderZoom(nextZoom, opts);
    }
  };

  /* ==========================================================================
     FAZ 2.3: EL ARACI (HAND TOOL / GRAB-TO-PAN / SPACEBAR DRAG)
     ========================================================================== */
  var spacePressed = false;

  window.toggleHandTool = function(force) {
    window.Studio.isHandTool = force != null ? force : !window.Studio.isHandTool;
    document.body.classList.toggle('hand-tool-active', window.Studio.isHandTool);
    var btn = document.getElementById('hud-btn-hand');
    if (btn) btn.classList.toggle('active', window.Studio.isHandTool);
  };

  window.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && !spacePressed && !typing(e.target)) {
      spacePressed = true;
      document.body.classList.add('hand-tool-active');
    }
  });

  window.addEventListener('keyup', function(e) {
    if (e.code === 'Space') {
      spacePressed = false;
      if (!window.Studio.isHandTool) {
        document.body.classList.remove('hand-tool-active');
      }
    }
  });

  window.addEventListener('mousedown', function(e) {
    if ((window.Studio.isHandTool || spacePressed) && e.button === 0) {
      window.Studio.isPanning = true;
      window.Studio.panStartX = e.clientX;
      window.Studio.panStartY = e.clientY;
      window.Studio.scrollStartX = (typeof Z !== 'undefined' && Z.panX) ? Z.panX : 0;
      window.Studio.scrollStartY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.classList.add('hand-tool-panning');
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', function(e) {
    if (!window.Studio.isPanning) return;
    var dx = e.clientX - window.Studio.panStartX;
    var dy = e.clientY - window.Studio.panStartY;
    if (typeof Z !== 'undefined' && Z.scale > 1.003) {
      var vw = window.innerWidth || 1280;
      var maxPan = Math.max(0, vw * (Z.scale - 1));
      Z.panX = Math.max(-maxPan, Math.min(0, window.Studio.scrollStartX + dx));
      Z.pinchActive = false;
      if (typeof applyGpuScreenZoom === 'function') applyGpuScreenZoom();
    }
    window.scrollTo(0, Math.max(0, window.Studio.scrollStartY - dy));
  });

  window.addEventListener('mouseup', function() {
    if (window.Studio.isPanning) {
      window.Studio.isPanning = false;
      document.body.classList.remove('hand-tool-panning');
    }
  });

  /* ==========================================================================
     FAZ 5: YÜZEN CAM KONTROL HUD (FLOATING GLASSMORPHIC HUD)
     ========================================================================== */
  window.ensureFloatingHud = function(force) {
    if (!force && (!window.Studio || !window.Studio.zenMode)) {
      if (window.Studio && window.Studio.hudEl && window.Studio.hudEl.parentNode) {
        window.Studio.hudEl.parentNode.removeChild(window.Studio.hudEl);
        window.Studio.hudEl = null;
      }
      return null;
    }
    if (window.Studio.hudEl && document.body.contains(window.Studio.hudEl)) {
      return window.Studio.hudEl;
    }

    var hud = document.createElement('div');
    hud.className = 'pdf-hud-floating';
    hud.id = 'pdf-hud-floating';

    var totalPgs = (RD && RD.pdfTotalPages) || 1;
    var curPg = (RD && RD.pdfCurPage) || 1;
    var zoomPct = Math.round(((RD && RD.pdfZoom) || 1) * 100);

    hud.innerHTML = [
      '<button class="hud-btn" id="hud-btn-sidebar" title="Kenar Çubuğu (Önizlemeler & İçindekiler)">' + (PRO_ICONS.layers || '') + '</button>',
      '<div class="hud-divider"></div>',
      '<button class="hud-btn" id="hud-btn-prev" title="Önceki Sayfa (Sol Ok / K)">' + (PRO_ICONS.back || '') + '</button>',
      '<div class="hud-page-wrap">',
      '  <input type="number" class="hud-page-inp" id="hud-pg-inp" min="1" max="' + totalPgs + '" value="' + curPg + '" />',
      '  <span>/ ' + totalPgs + '</span>',
      '</div>',
      '<button class="hud-btn" id="hud-btn-next" title="Sonraki Sayfa (Sağ Ok / J)">' + (PRO_ICONS.right || '') + '</button>',
      '<div class="hud-divider"></div>',
      '<button class="hud-btn" id="hud-btn-zoom-out" title="Uzaklaştır (Ctrl -)">' + (PRO_ICONS.minus || '') + '</button>',
      '<button class="hud-zoom-btn" id="hud-zoom-val" title="Zoom Seçenekleri">%' + zoomPct + '</button>',
      '<button class="hud-btn" id="hud-btn-zoom-in" title="Yakınlaştır (Ctrl +)">' + (PRO_ICONS.plus || '') + '</button>',
      '<div class="hud-divider"></div>',
      '<button class="hud-btn" id="hud-btn-hand" title="El Aracı / Kaydır (Space)">' + (PRO_ICONS.grip || '') + '</button>',
      '<button class="hud-btn" id="hud-btn-filter" title="Akıllı Okuma Modu (Gece/Sepya/Kontrast)">' + (PRO_ICONS.contrast || '') + '</button>',
      '<button class="hud-btn" id="hud-btn-zen" title="Zen / Odak Modu (F / F11)">' + (PRO_ICONS.focus || '') + '</button>'
    ].join('');

    // Buton Olayları
    hud.querySelector('#hud-btn-sidebar').onclick = function() { window.toggleSidebarDrawer(); };
    hud.querySelector('#hud-btn-prev').onclick = function() { if (typeof scrollToPdfPage === 'function') scrollToPdfPage((RD.pdfCurPage || 1) - 1); };
    hud.querySelector('#hud-btn-next').onclick = function() { if (typeof scrollToPdfPage === 'function') scrollToPdfPage((RD.pdfCurPage || 1) + 1); };
    
    var pgInp = hud.querySelector('#hud-pg-inp');
    pgInp.onchange = function() {
      if (typeof scrollToPdfPage === 'function') scrollToPdfPage(+pgInp.value || 1);
    };

    hud.querySelector('#hud-btn-zoom-out').onclick = function() {
      var cur = (RD && RD.pdfZoom) || 1;
      window.zoomWithFocalPoint(cur - 0.15);
    };
    hud.querySelector('#hud-btn-zoom-in').onclick = function() {
      var cur = (RD && RD.pdfZoom) || 1;
      window.zoomWithFocalPoint(cur + 0.15);
    };
    hud.querySelector('#hud-zoom-val').onclick = function() {
      if (typeof resetReaderZoom === 'function') resetReaderZoom();
    };

    hud.querySelector('#hud-btn-hand').onclick = function() { window.toggleHandTool(); };
    
    hud.querySelector('#hud-btn-filter').onclick = function() {
      var filters = ['orig', 'sepia', 'dark', 'contrast'];
      var stage = document.querySelector('.pdf-stage-container') || document.querySelector('.pdf-stage');
      var cur = P.pdfFilter || 'orig';
      var nxt = filters[(filters.indexOf(cur) + 1) % filters.length];
      P.pdfFilter = nxt;
      if (typeof savePrefs === 'function') savePrefs();
      if (stage) stage.setAttribute('data-pfilter', nxt);
      toast('Okuma Filtresi: ' + (nxt === 'dark' ? 'Gece Kâğıdı' : nxt === 'sepia' ? 'Sıcak Sepya' : nxt === 'contrast' ? 'Yüksek Kontrast' : 'Orijinal'));
    };

    hud.querySelector('#hud-btn-zen').onclick = function() { window.toggleZenMode(); };

    document.body.appendChild(hud);
    window.Studio.hudEl = hud;
    return hud;
  };

  /* ==========================================================================
     FAZ 6: KENAR ÇUBUĞU (ASYNCHRONOUS THUMBNAILS & OUTLINE)
     ========================================================================== */
  window.toggleSidebarDrawer = function(force) {
    var drawer = document.getElementById('pdf-sidebar-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = 'pdf-sidebar-drawer';
      drawer.className = 'pdf-sidebar-drawer';
      drawer.innerHTML = [
        '<div class="psb-tabs">',
        '  <button class="psb-tab active" data-tab="thumbs">Küçük Önizlemeler</button>',
        '  <button class="psb-tab" data-tab="outline">İçindekiler</button>',
        '</div>',
        '<div class="psb-content" id="psb-content"></div>'
      ].join('');
      document.body.appendChild(drawer);
      window.Studio.sidebarEl = drawer;

      drawer.querySelectorAll('.psb-tab').forEach(function(tab) {
        tab.onclick = function() {
          drawer.querySelectorAll('.psb-tab').forEach(function(t) { t.classList.remove('active'); });
          tab.classList.add('active');
          window.renderSidebarTab(tab.dataset.tab);
        };
      });
    }

    var isOpen = force != null ? force : !drawer.classList.contains('open');
    drawer.classList.toggle('open', isOpen);
    if (isOpen) {
      window.renderSidebarTab('thumbs');
    }
  };

  window.renderSidebarTab = function(tabName) {
    var container = document.getElementById('psb-content');
    if (!container || !RD || !RD.pdfDoc) return;
    container.innerHTML = '';

    if (tabName === 'thumbs') {
      var grid = document.createElement('div');
      grid.className = 'psb-thumbs-grid';
      var sPg = RD.p.pdfStart || 1;
      var ePg = RD.p.pdfEnd || RD.pdfDoc.numPages;

      for (var pg = sPg; pg <= ePg; pg++) {
        (function(pageNum, relNo) {
          var item = document.createElement('div');
          item.className = 'psb-thumb-item' + (RD.pdfCurPage === relNo ? ' active' : '');
          item.dataset.rel = relNo;

          var cv = document.createElement('canvas');
          var lbl = document.createElement('span');
          lbl.className = 'psb-thumb-label';
          lbl.textContent = 'Sayfa ' + relNo;

          item.appendChild(cv);
          item.appendChild(lbl);
          item.onclick = function() {
            if (typeof scrollToPdfPage === 'function') scrollToPdfPage(relNo);
            window.toggleSidebarDrawer(false);
          };
          grid.appendChild(item);

          // Lazy Render Thumbnail
          RD.pdfDoc.getPage(pageNum).then(function(page) {
            var vp = page.getViewport({ scale: 0.22 });
            cv.width = Math.round(vp.width);
            cv.height = Math.round(vp.height);
            var ctx = cv.getContext('2d', { alpha: false });
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, cv.width, cv.height);
            page.render({ canvasContext: ctx, viewport: vp });
          }).catch(function() {});
        })(pg, pg - sPg + 1);
      }
      container.appendChild(grid);
    } else if (tabName === 'outline') {
      RD.pdfDoc.getOutline().then(function(outline) {
        if (!outline || !outline.length) {
          container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">Bu belgede içindekiler tablosu bulunamadı.</div>';
          return;
        }
        var list = document.createElement('div');
        list.className = 'pdf-toc-list';
        outline.forEach(function(item) {
          var row = document.createElement('div');
          row.className = 'pdf-toc-row';
          row.innerHTML = '<span>' + item.title + '</span>';
          row.onclick = function() {
            toast('Bölüme gidiliyor: ' + item.title);
            window.toggleSidebarDrawer(false);
          };
          list.appendChild(row);
        });
        container.appendChild(list);
      }).catch(function() {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">İçindekiler okunamadı.</div>';
      });
    }
  };

  /* ==========================================================================
     FAZ 11: ZEN OKUMA MODU (CINEMATIC FOCUS)
     ========================================================================== */
  window.toggleZenMode = function(force) {
    window.Studio.zenMode = force != null ? force : !window.Studio.zenMode;
    document.body.classList.toggle('zen-active', window.Studio.zenMode);
    var exitPill = document.getElementById('zen-exit-pill');

    if (window.Studio.zenMode) {
      if (!exitPill) {
        exitPill = document.createElement('button');
        exitPill.id = 'zen-exit-pill';
        exitPill.className = 'zen-exit-pill';
        exitPill.innerHTML = (PRO_ICONS.close || '') + '<span>Zen Modundan Çık (Esc)</span>';
        exitPill.onclick = function() { window.toggleZenMode(false); };
        document.body.appendChild(exitPill);
      }
      exitPill.style.display = 'inline-flex';
      if (RD && RD.isPdf && typeof window.ensureFloatingHud === 'function') {
        window.ensureFloatingHud(true);
      }
      toast('Zen Modu: Dikkat dağıtıcı unsurlar gizlendi (Esc ile çıkın)');
    } else {
      if (exitPill) exitPill.style.display = 'none';
      if (window.Studio.hudEl && window.Studio.hudEl.parentNode) {
        window.Studio.hudEl.parentNode.removeChild(window.Studio.hudEl);
        window.Studio.hudEl = null;
      }
    }
  };

  /* ==========================================================================
     FAZ 11: GLOBAL KLAVYE KISAYOLLARI
     ========================================================================== */
  window.addEventListener('keydown', function(e) {
    if (typing(e.target)) return;

    if (e.key === 'Escape' && window.Studio.zenMode) {
      window.toggleZenMode(false);
      e.preventDefault();
      return;
    }

    if (RD && RD.isPdf) {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        window.zoomWithFocalPoint(((RD && RD.pdfZoom) || 1) + 0.15);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        window.zoomWithFocalPoint(((RD && RD.pdfZoom) || 1) - 0.15);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        if (typeof resetReaderZoom === 'function') resetReaderZoom();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || (!e.ctrlKey && !e.metaKey && e.key === 'j')) {
        if (typeof scrollToPdfPage === 'function') scrollToPdfPage((RD.pdfCurPage || 1) + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (!e.ctrlKey && !e.metaKey && e.key === 'k')) {
        if (typeof scrollToPdfPage === 'function') scrollToPdfPage((RD.pdfCurPage || 1) - 1);
      } else if (e.key === 'Home') {
        if (typeof scrollToPdfPage === 'function') scrollToPdfPage(1);
      } else if (e.key === 'End') {
        if (typeof scrollToPdfPage === 'function') scrollToPdfPage(RD.pdfTotalPages || 1);
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'f' || e.key === 'F')) {
        if (typeof window.toggleZenMode === 'function') window.toggleZenMode();
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T')) {
        if (typeof window.toggleSidebarDrawer === 'function') window.toggleSidebarDrawer();
      }
    }
  });

  // Reader'dan ayrılırken Studio bileşenlerini (Zen, Sidebar, HUD) temizle
  if (typeof window.readerLeave === 'function') {
    var _origStudioReaderLeave = window.readerLeave;
    window.readerLeave = function() {
      if (window.Studio) {
        if (window.Studio.zenMode) window.toggleZenMode(false);
        var drawer = document.getElementById('pdf-sidebar-drawer');
        if (drawer && drawer.classList.contains('open')) drawer.classList.remove('open');
        if (window.Studio.hudEl && window.Studio.hudEl.parentNode) {
          window.Studio.hudEl.parentNode.removeChild(window.Studio.hudEl);
          window.Studio.hudEl = null;
        }
      }
      _origStudioReaderLeave();
    };
  }

})();
