/* ============================================================================
   GioReader Pro — Ultra-HD Native PDF Reader & Smart PDF Importer/Splitter
   ============================================================================ */

var MAX_CANVAS_PIXELS=18500000; // GPU bellek sınırını aşmadan maksimum ~4300x4300 piksel Ultra-HD render

var pdfViewerState={
  active:false,
  pid:null,
  uid:null,
  pdfDoc:null,
  startPage:1,
  endPage:1,
  totalPartPages:1,
  currentPage:1, // Part içi 1-tabanlı sayfa (1..totalPartPages)
  baseScale:1.0,
  renderedZoom:1.0,
  spread:'single', // 'single' | 'double'
  zoomMode:'fit-width', // 'fit-width' | 'fit-page' | 'custom'
  filter:'auto', // 'auto' | 'original' | 'dark' | 'sepia'
  autoCrop:false,
  cropBox:null, // {top,right,bottom,left} yüzde (0..0.22)
  outline:[],
  drawerOpen:false,
  drawerTab:'thumbs', // 'thumbs' | 'outline' | 'highlights'
  pageStates:{}, // pageNum -> {rendering, renderedScale, task, textItems, vp}
  thumbRendered:{},
  observer:null,
  searchOpen:false,
  searchQuery:'',
  searchHits:[], // [{page, itemIdx, text}]
  searchIdx:0
};

function ensurePdfJsReady(){
  if(typeof pdfjsLib==='undefined') return false;
  if(!pdfjsLib.GlobalWorkerOptions.workerSrc){
    pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';
  }
  return true;
}

function loadPdfDocument(srcSpec){
  if(!ensurePdfJsReady()) return Promise.reject(new Error('PDF.js motoru yüklenemedi.'));
  var params={
    isEvalSupported:false,
    enableXfa:true
  };
  if(srcSpec.url){
    params.url=srcSpec.url;
  }else if(srcSpec.data){
    params.data=srcSpec.data instanceof Uint8Array?srcSpec.data:new Uint8Array(srcSpec.data);
  }else{
    return Promise.reject(new Error('Geçersiz PDF kaynağı.'));
  }
  return pdfjsLib.getDocument(params).promise;
}

function destroyActivePdfViewer(){
  if(pdfViewerState.observer){
    try{pdfViewerState.observer.disconnect();}catch(e){}
    pdfViewerState.observer=null;
  }
  Object.keys(pdfViewerState.pageStates).forEach(function(k){
    var ps=pdfViewerState.pageStates[k];
    if(ps&&ps.task&&ps.task.cancel){
      try{ps.task.cancel();}catch(e){}
    }
  });
  pdfViewerState.pageStates={};
  pdfViewerState.thumbRendered={};
  if(pdfViewerState.pdfDoc){
    try{pdfViewerState.pdfDoc.destroy();}catch(e){}
    pdfViewerState.pdfDoc=null;
  }
  pdfViewerState.active=false;
  pdfViewerState.pid=null;
}

/* ---------- Ultra-HD PDF Okuyucu Başlatma ---------- */
function mountPdfReaderView(part,unit,course){
  destroyActivePdfViewer();
  var pr=loadPrefs();
  pdfViewerState.active=true;
  pdfViewerState.pid=part.id;
  pdfViewerState.uid=unit.id;
  pdfViewerState.spread=pr.pdfSpread||'single';
  pdfViewerState.zoomMode=pr.pdfZoomMode||'fit-width';
  pdfViewerState.filter=pr.pdfFilter||'auto';
  pdfViewerState.autoCrop=!!pr.pdfAutoCrop;
  pdfViewerState.cropBox=null;
  pdfViewerState.renderedZoom=zoomState.current||1.0;
  pdfViewerState.searchOpen=false;
  pdfViewerState.searchQuery='';
  pdfViewerState.searchHits=[];

  var stage=document.getElementById('pdfStage');
  if(!stage) return;
  stage.innerHTML='<div class="pdf-loading"><div class="pdf-spinner"></div><div>Ultra-HD PDF Motoru hazırlanıyor…</div></div>';

  getPdfSourceForPart(part).then(function(srcSpec){
    if(!srcSpec) throw new Error('PDF dosyası diskte veya önbellekte bulunamadı.');
    return loadPdfDocument(srcSpec).then(function(pdfDoc){
      if(!pdfViewerState.active||pdfViewerState.pid!==part.id){
        try{pdfDoc.destroy();}catch(e){}
        return;
      }
      pdfViewerState.pdfDoc=pdfDoc;
      var sPage=Math.max(1,Math.min(pdfDoc.numPages,part.pdfStart||1));
      var ePage=Math.max(sPage,Math.min(pdfDoc.numPages,part.pdfEnd||pdfDoc.numPages));
      pdfViewerState.startPage=sPage;
      pdfViewerState.endPage=ePage;
      pdfViewerState.totalPartPages=(ePage-sPage+1);

      // Part meta bilgisini güncelle
      if(part.pageCount!==pdfViewerState.totalPartPages){
        part.pageCount=pdfViewerState.totalPartPages;
        savePidx();
      }

      // Kayıtlı okuma konumundan başlangıç sayfasını hesapla
      var st=getState(part.id);
      var savedPage=1;
      if(st.pdfPage&&st.pdfPage>=1&&st.pdfPage<=pdfViewerState.totalPartPages){
        savedPage=st.pdfPage;
      }else if(st.pos>0&&st.pos<0.99){
        savedPage=Math.max(1,Math.min(pdfViewerState.totalPartPages,Math.round(st.pos*pdfViewerState.totalPartPages)));
      }
      pdfViewerState.currentPage=savedPage;

      // İlk sayfadan temel boyutları ve varsa Auto-Crop sınırlarını hesapla
      return pdfDoc.getPage(sPage).then(function(firstPage){
        var vp1=firstPage.getViewport({scale:1.0});
        computePdfBaseScale(vp1.width,vp1.height);
        buildPdfPageShells(stage,vp1.width,vp1.height);
        setupPdfIntersectionObserver(stage);

        // Kayıtlı sayfaya kaydır
        if(savedPage>1){
          setTimeout(function(){scrollToPdfPartPage(savedPage,false);},40);
        }
        updatePdfToolbarUI();

        // Outline (İçindekiler) ağacını yükle
        pdfDoc.getOutline().then(function(outline){
          pdfViewerState.outline=outline||[];
          if(pdfViewerState.drawerOpen&&pdfViewerState.drawerTab==='outline'){
            renderPdfDrawerContent();
          }
        }).catch(function(){});

        // Auto-Crop açıksa ilk sayfadan akıllı kenar boşluğu tespiti yap
        if(pdfViewerState.autoCrop){
          detectSmartCropBox(firstPage).then(function(box){
            if(box&&pdfViewerState.active){
              pdfViewerState.cropBox=box;
              applyCropBoxToAllPages();
            }
          });
        }
      });
    });
  }).catch(function(err){
    stage.innerHTML='<div class="pdf-error"><div class="pdf-error-title">PDF Yüklenemedi</div>'+
      '<p>'+escHtml(String(err&&err.message||err))+'</p>'+
      '<button class="btn primary" data-act="pdf-reimport">PDF Dosyasını Yeniden Seç</button></div>';
  });
}

function computePdfBaseScale(pageW,pageH){
  var stage=document.getElementById('pdfStage');
  var availW=(stage&&stage.clientWidth?stage.clientWidth:window.innerWidth)-64;
  if(pdfViewerState.drawerOpen) availW-=280;
  availW=Math.max(360,availW);
  var availH=Math.max(420,window.innerHeight-150);

  if(pdfViewerState.spread==='double'){
    var perPageW=(availW-28)/2;
    if(pdfViewerState.zoomMode==='fit-page'){
      pdfViewerState.baseScale=Math.min(perPageW/pageW,availH/pageH);
    }else{
      pdfViewerState.baseScale=perPageW/pageW;
    }
  }else{
    if(pdfViewerState.zoomMode==='fit-page'){
      pdfViewerState.baseScale=Math.min(availW/pageW,availH/pageH);
    }else if(pdfViewerState.zoomMode==='fit-width'){
      var maxTargetW=Math.min(availW,1040);
      pdfViewerState.baseScale=maxTargetW/pageW;
    }else{
      var stdW=Math.min(availW,860);
      pdfViewerState.baseScale=stdW/pageW;
    }
  }
  pdfViewerState.baseScale=Math.max(0.4,Math.min(3.0,pdfViewerState.baseScale));
}

function buildPdfPageShells(stage,defaultW,defaultH){
  var z=zoomState.current||1.0;
  var cssScale=pdfViewerState.baseScale*z;
  var w=Math.round(defaultW*cssScale);
  var h=Math.round(defaultH*cssScale);

  var filterCls='pdf-filter-'+(pdfViewerState.filter||'auto');
  var spreadCls=pdfViewerState.spread==='double'?'pdf-spread-double':'pdf-spread-single';

  var html=['<div class="pdf-pages-grid '+spreadCls+' '+filterCls+'" id="pdfPagesGrid">'];
  for(var pNo=pdfViewerState.startPage;pNo<=pdfViewerState.endPage;pNo++){
    var relNo=pNo-pdfViewerState.startPage+1;
    html.push(
      '<div class="pdf-page-card" data-pdf-page="'+pNo+'" data-rel-page="'+relNo+'" style="width:'+w+'px;height:'+h+'px">',
        '<div class="pdf-page-inner" style="width:'+w+'px;height:'+h+'px">',
          '<canvas class="pdf-canvas"></canvas>',
          '<div class="pdf-hl-layer" data-hl-page="'+pNo+'"></div>',
          '<div class="pdf-text-layer textLayer"></div>',
        '</div>',
        '<div class="pdf-page-badge">Sayfa '+relNo+' / '+pdfViewerState.totalPartPages+
          (pdfViewerState.startPage>1?' <span class="muted">(PDF s. '+pNo+')</span>':'')+
        '</div>',
      '</div>'
    );
  }
  html.push('</div>');
  stage.innerHTML=html.join('');
}

function setupPdfIntersectionObserver(stage){
  if(pdfViewerState.observer){
    try{pdfViewerState.observer.disconnect();}catch(e){}
  }
  pdfViewerState.observer=new IntersectionObserver(function(entries){
    if(!pdfViewerState.active||!pdfViewerState.pdfDoc) return;
    var bestVisiblePage=null,bestRatio=0;
    entries.forEach(function(ent){
      var card=ent.target;
      var pNo=+card.getAttribute('data-pdf-page');
      var relNo=+card.getAttribute('data-rel-page');
      if(ent.isIntersecting){
        queuePdfPageRender(pNo,card);
        // Komşu sayfaları da önceden hazırla (kesintisiz kaydırma için)
        if(pNo+1<=pdfViewerState.endPage){
          var nextCard=stage.querySelector('.pdf-page-card[data-pdf-page="'+(pNo+1)+'"]');
          if(nextCard) queuePdfPageRender(pNo+1,nextCard);
        }
        if(ent.intersectionRatio>bestRatio){
          bestRatio=ent.intersectionRatio;
          bestVisiblePage=relNo;
        }
      }
    });
    if(bestVisiblePage&&bestVisiblePage!==pdfViewerState.currentPage){
      pdfViewerState.currentPage=bestVisiblePage;
      onPdfPageChanged(bestVisiblePage);
    }
  },{
    root:null,
    rootMargin:'600px 0px 600px 0px',
    threshold:[0.01,0.25,0.6]
  });

  var cards=stage.querySelectorAll('.pdf-page-card');
  for(var i=0;i<cards.length;i++) pdfViewerState.observer.observe(cards[i]);
}

function queuePdfPageRender(pageNo,card){
  if(!pdfViewerState.active||!pdfViewerState.pdfDoc||!card) return;
  var targetScale=pdfViewerState.baseScale*(zoomState.current||1.0);
  var ps=pdfViewerState.pageStates[pageNo];
  if(ps){
    if(ps.rendering&&Math.abs(ps.targetScale-targetScale)<0.02) return;
    if(!ps.rendering&&ps.renderedScale&&Math.abs(ps.renderedScale-targetScale)<0.02) return;
    if(ps.task&&ps.task.cancel){
      try{ps.task.cancel();}catch(e){}
    }
  }
  ps=pdfViewerState.pageStates[pageNo]={
    rendering:true,
    targetScale:targetScale,
    renderedScale:0,
    task:null
  };

  pdfViewerState.pdfDoc.getPage(pageNo).then(function(page){
    if(!pdfViewerState.active||!pdfViewerState.pdfDoc) return;
    var vpCss=page.getViewport({scale:targetScale});
    var cssW=Math.round(vpCss.width);
    var cssH=Math.round(vpCss.height);

    card.style.width=cssW+'px';
    card.style.height=cssH+'px';
    var inner=card.querySelector('.pdf-page-inner');
    if(inner){
      inner.style.width=cssW+'px';
      inner.style.height=cssH+'px';
      inner.style.transform='';
    }

    // Ultra-HD HiDPI Supersampling Katsayısı:
    // Standart ekranda bile en az 1.75x–2.25x piksel yoğunluğu ile render ederek
    // matematiksel indisleri ve devre şemalarını jilet netliğinde çizer.
    var dpr=window.devicePixelRatio||1;
    var boost=(zoomState.current||1.0)<1.35?1.45:1.15;
    var hiDpiRatio=Math.min(3.5,Math.max(1.6,dpr*boost));

    var rawPixelW=Math.round(cssW*hiDpiRatio);
    var rawPixelH=Math.round(cssH*hiDpiRatio);
    if(rawPixelW*rawPixelH>MAX_CANVAS_PIXELS){
      var capFactor=Math.sqrt(MAX_CANVAS_PIXELS/(rawPixelW*rawPixelH));
      hiDpiRatio*=capFactor;
      rawPixelW=Math.round(cssW*hiDpiRatio);
      rawPixelH=Math.round(cssH*hiDpiRatio);
    }

    var vpRender=page.getViewport({scale:targetScale*hiDpiRatio});
    var canvas=card.querySelector('.pdf-canvas');
    if(!canvas) return;

    // İkincil (offscreen) canvas üzerinde çizip tek karede aktar (zoom sırasında beyaz yanıp sönmeyi önler!)
    var offCanvas=document.createElement('canvas');
    offCanvas.width=Math.round(vpRender.width);
    offCanvas.height=Math.round(vpRender.height);
    var ctx=offCanvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,offCanvas.width,offCanvas.height);

    var renderTask=page.render({
      canvasContext:ctx,
      viewport:vpRender,
      intent:'display'
    });
    ps.task=renderTask;

    return renderTask.promise.then(function(){
      if(!pdfViewerState.active) return;
      canvas.width=offCanvas.width;
      canvas.height=offCanvas.height;
      canvas.style.width=cssW+'px';
      canvas.style.height=cssH+'px';
      var destCtx=canvas.getContext('2d',{alpha:false});
      destCtx.drawImage(offCanvas,0,0);

      ps.rendering=false;
      ps.renderedScale=targetScale;
      ps.vp=vpCss;
      card.classList.add('is-rendered');

      if(pdfViewerState.autoCrop&&pdfViewerState.cropBox){
        applyCropBoxToCard(card,pdfViewerState.cropBox);
      }

      // Seçilebilir Metin Katmanını (TextLayer) oluştur
      var textLayerDiv=card.querySelector('.pdf-text-layer');
      if(textLayerDiv){
        renderPdfTextLayer(page,vpCss,textLayerDiv,pageNo);
      }
      // Kayıtlı PDF vurgularını (highlights) çiz
      renderPdfHighlightsForPage(pageNo,card);
    });
  }).catch(function(err){
    if(err&&err.name==='RenderingCancelledException') return;
    ps.rendering=false;
  });
}

function renderPdfTextLayer(page,viewport,container,pageNo){
  page.getTextContent().then(function(textContent){
    if(!pdfViewerState.active) return;
    container.innerHTML='';
    container.style.width=Math.round(viewport.width)+'px';
    container.style.height=Math.round(viewport.height)+'px';
    container.style.setProperty('--scale-factor',String(viewport.scale));

    if(typeof pdfjsLib.renderTextLayer==='function'){
      try{
        var tlTask=pdfjsLib.renderTextLayer({
          textContentSource:textContent,
          container:container,
          viewport:viewport,
          textDivs:[]
        });
        if(tlTask&&tlTask.promise){
          tlTask.promise.then(function(){
            highlightSearchMatchesInPage(pageNo,container);
          }).catch(function(){});
        }
        return;
      }catch(e){}
    }
    // Yedek metin katmanı yerleşimi
    (textContent.items||[]).forEach(function(item){
      if(!item.str) return;
      var tx=pdfjsLib.Util.transform(viewport.transform,item.transform);
      var fontHeight=Math.hypot(tx[2],tx[3]);
      var span=document.createElement('span');
      span.textContent=item.str;
      span.style.left=tx[4]+'px';
      span.style.top=(tx[5]-fontHeight)+'px';
      span.style.fontSize=fontHeight+'px';
      container.appendChild(span);
    });
    highlightSearchMatchesInPage(pageNo,container);
  }).catch(function(){});
}

/* ---------- 2-Parmak Touchpad Canlı PDF Zoom + HiDPI Netleştirme ---------- */
function applyPdfLiveZoom(newZoom,ratio,focalX,focalY,fromGesture){
  var grid=document.getElementById('pdfPagesGrid');
  if(!grid) return;

  var rect=grid.getBoundingClientRect();
  var offsetY=focalY-rect.top;
  var offsetX=focalX-rect.left;

  var cards=grid.querySelectorAll('.pdf-page-card');
  for(var i=0;i<cards.length;i++){
    var card=cards[i];
    var pNo=+card.getAttribute('data-pdf-page');
    var ps=pdfViewerState.pageStates[pNo];
    var baseW=ps&&ps.vp?ps.vp.width/ps.renderedScale:(card.offsetWidth/(pdfViewerState.baseScale*(newZoom/ratio)));
    var baseH=ps&&ps.vp?ps.vp.height/ps.renderedScale:(card.offsetHeight/(pdfViewerState.baseScale*(newZoom/ratio)));
    var targetScale=pdfViewerState.baseScale*newZoom;
    var newW=Math.round(baseW*targetScale);
    var newH=Math.round(baseH*targetScale);

    card.style.width=newW+'px';
    card.style.height=newH+'px';
    var inner=card.querySelector('.pdf-page-inner');
    var canvas=card.querySelector('.pdf-canvas');
    if(inner){
      inner.style.width=newW+'px';
      inner.style.height=newH+'px';
    }
    if(canvas){
      canvas.style.width=newW+'px';
      canvas.style.height=newH+'px';
    }
  }

  // Focal-Point (Odak Noktası) Koruyucu Kaydırma
  var newOffsetY=offsetY*ratio;
  window.scrollBy(0,newOffsetY-offsetY);

  var stage=document.getElementById('pdfStage');
  if(stage&&newZoom>1.02){
    var newOffsetX=offsetX*ratio;
    stage.scrollLeft+=(newOffsetX-offsetX);
  }
}

function commitPdfHiDpiZoom(finalZoom){
  if(!pdfViewerState.active||!pdfViewerState.pdfDoc) return;
  pdfViewerState.renderedZoom=finalZoom;
  var stage=document.getElementById('pdfStage');
  if(!stage) return;

  // Görünürdeki sayfaları yeni zoom seviyesinde Ultra-HD olarak yeniden çiz
  var cards=stage.querySelectorAll('.pdf-page-card');
  var viewTop=-400,viewBot=window.innerHeight+400;
  for(var i=0;i<cards.length;i++){
    var r=cards[i].getBoundingClientRect();
    if(r.bottom>=viewTop&&r.top<=viewBot){
      var pNo=+cards[i].getAttribute('data-pdf-page');
      queuePdfPageRender(pNo,cards[i]);
    }
  }
}

/* ---------- Akıllı Beyaz Kenar Boşluğu Kırpma (Smart Auto-Crop) ---------- */
function detectSmartCropBox(page){
  return new Promise(function(resolve){
    try{
      var vp=page.getViewport({scale:0.35});
      var c=document.createElement('canvas');
      c.width=Math.round(vp.width);
      c.height=Math.round(vp.height);
      var ctx=c.getContext('2d');
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,c.width,c.height);
      page.render({canvasContext:ctx,viewport:vp}).promise.then(function(){
        var img=ctx.getImageData(0,0,c.width,c.height).data;
        var w=c.width,h=c.height;
        var minX=w,minY=h,maxX=0,maxY=0,found=0;
        for(var y=4;y<h-4;y++){
          for(var x=4;x<w-4;x++){
            var idx=(y*w+x)*4;
            if(img[idx]<242||img[idx+1]<242||img[idx+2]<242){
              if(x<minX) minX=x;
              if(x>maxX) maxX=x;
              if(y<minY) minY=y;
              if(y>maxY) maxY=y;
              found++;
            }
          }
        }
        if(found<50){resolve(null);return;}
        var pad=0.022;
        var box={
          left:Math.max(0,Math.min(0.18,(minX/w)-pad)),
          top:Math.max(0,Math.min(0.16,(minY/h)-pad)),
          right:Math.max(0,Math.min(0.18,1-(maxX/w)-pad)),
          bottom:Math.max(0,Math.min(0.16,1-(maxY/h)-pad))
        };
        resolve(box);
      }).catch(function(){resolve(null);});
    }catch(e){resolve(null);}
  });
}

function applyCropBoxToCard(card,box){
  var inner=card.querySelector('.pdf-page-inner');
  if(!inner) return;
  if(!box||!pdfViewerState.autoCrop){
    inner.style.clipPath='';
    inner.style.transform='';
    return;
  }
  var scaleX=1/(1-box.left-box.right);
  var scaleY=1/(1-box.top-box.bottom);
  var scale=Math.min(1.28,Math.min(scaleX,scaleY));
  var tx=((box.right-box.left)/2)*100;
  var ty=((box.bottom-box.top)/2)*100;
  inner.style.transform='scale('+scale.toFixed(3)+') translate('+tx.toFixed(2)+'%, '+ty.toFixed(2)+'%)';
}

function applyCropBoxToAllPages(){
  var stage=document.getElementById('pdfStage');
  if(!stage) return;
  var cards=stage.querySelectorAll('.pdf-page-card');
  for(var i=0;i<cards.length;i++){
    applyCropBoxToCard(cards[i],pdfViewerState.cropBox);
  }
}

/* ---------- PDF Sayfa Gezinme, Arama ve Vurgulama ---------- */
function scrollToPdfPartPage(relPage,smooth){
  relPage=Math.max(1,Math.min(pdfViewerState.totalPartPages,relPage));
  var absPage=pdfViewerState.startPage+relPage-1;
  var stage=document.getElementById('pdfStage');
  if(!stage) return;
  var card=stage.querySelector('.pdf-page-card[data-pdf-page="'+absPage+'"]');
  if(card){
    card.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'});
    pdfViewerState.currentPage=relPage;
    onPdfPageChanged(relPage);
  }
}

function onPdfPageChanged(relPage){
  var inp=document.getElementById('pdfPageInput');
  if(inp&&document.activeElement!==inp) inp.value=String(relPage);

  if(pdfViewerState.pid){
    var st=getState(pdfViewerState.pid);
    st.pdfPage=relPage;
    var ratio=pdfViewerState.totalPartPages>1?(relPage-1)/(pdfViewerState.totalPartPages-1):1;
    st.pos=Math.max(st.pos||0,Math.round(ratio*1000)/1000);
    // Son sayfaya ulaşıldığında ve yeterli süre okunduğunda otomatik tamamlama kontrolü
    var pr=loadPrefs();
    if(pr.autoCompleteAt95&&relPage>=pdfViewerState.totalPartPages&&(st.sec||0)>=20&&!st.done){
      st.done=Date.now();
      if(typeof toast==='function') toast('Part tamamlandı olarak işaretlendi ✓');
    }
    saveRstate();
    var bar=document.getElementById('readProgressBar');
    if(bar) bar.style.width=Math.round((relPage/pdfViewerState.totalPartPages)*100)+'%';
  }
}

function addPdfSelectionHighlight(color){
  if(!pdfViewerState.active||!pdfViewerState.pid) return false;
  var sel=window.getSelection();
  if(!sel||sel.isCollapsed) return false;
  var text=sel.toString().trim();
  if(!text||text.length<2) return false;

  var anchorNode=sel.anchorNode;
  var el=anchorNode&&anchorNode.nodeType===3?anchorNode.parentElement:anchorNode;
  var card=el&&el.closest?el.closest('.pdf-page-card'):null;
  if(!card) return false;

  var pageNo=+card.getAttribute('data-pdf-page');
  var inner=card.querySelector('.pdf-page-inner');
  var innerRect=inner.getBoundingClientRect();
  var range=sel.getRangeAt(0);
  var clientRects=range.getClientRects();
  var boxes=[];
  for(var i=0;i<clientRects.length;i++){
    var r=clientRects[i];
    if(r.width<2||r.height<2) continue;
    boxes.push({
      x:+((r.left-innerRect.left)/innerRect.width).toFixed(4),
      y:+((r.top-innerRect.top)/innerRect.height).toFixed(4),
      w:+(r.width/innerRect.width).toFixed(4),
      h:+(r.height/innerRect.height).toFixed(4)
    });
  }
  if(!boxes.length) return false;

  var st=getState(pdfViewerState.pid);
  st.hl.push({
    id:uid('h'),
    kind:'pdf',
    page:pageNo,
    relPage:pageNo-pdfViewerState.startPage+1,
    q:text.slice(0,360),
    c:color||'y',
    boxes:boxes,
    at:Date.now()
  });
  touchState(pdfViewerState.pid);
  sel.removeAllRanges();
  renderPdfHighlightsForPage(pageNo,card);
  if(typeof toast==='function') toast('PDF vurgusu kaydedildi');
  return true;
}

function renderPdfHighlightsForPage(pageNo,card){
  if(!pdfViewerState.pid||!card) return;
  var layer=card.querySelector('.pdf-hl-layer');
  if(!layer) return;
  var st=getState(pdfViewerState.pid);
  var hls=(st.hl||[]).filter(function(h){return h.kind==='pdf'&&h.page===pageNo;});
  if(!hls.length){layer.innerHTML='';return;}

  var out=[];
  hls.forEach(function(h){
    (h.boxes||[]).forEach(function(b){
      out.push(
        '<div class="pdf-hl-box hl-'+(h.c||'y')+'" data-hl-id="'+escAttr(h.id)+'" title="Vurguyu kaldırmak için tıkla" '+
        'style="left:'+(b.x*100)+'%;top:'+(b.y*100)+'%;width:'+(b.w*100)+'%;height:'+(b.h*100)+'%"></div>'
      );
    });
  });
  layer.innerHTML=out.join('');
}

function runPdfInDocumentSearch(query){
  pdfViewerState.searchQuery=String(query||'').trim();
  pdfViewerState.searchHits=[];
  pdfViewerState.searchIdx=0;
  var stage=document.getElementById('pdfStage');
  if(!stage) return;

  var allSpans=stage.querySelectorAll('.pdf-text-layer span');
  for(var i=0;i<allSpans.length;i++) allSpans[i].classList.remove('pdf-search-hit','pdf-search-active');

  if(!pdfViewerState.searchQuery||!pdfViewerState.pdfDoc){
    updatePdfSearchCounter();
    return;
  }

  var qLow=pdfViewerState.searchQuery.toLocaleLowerCase('tr');
  var chain=Promise.resolve();
  for(var pNo=pdfViewerState.startPage;pNo<=pdfViewerState.endPage;pNo++){
    (function(pageNo){
      chain=chain.then(function(){
        return pdfViewerState.pdfDoc.getPage(pageNo).then(function(page){
          return page.getTextContent();
        }).then(function(tc){
          (tc.items||[]).forEach(function(it,idx){
            if(it.str&&it.str.toLocaleLowerCase('tr').indexOf(qLow)>=0){
              pdfViewerState.searchHits.push({page:pageNo,relPage:pageNo-pdfViewerState.startPage+1,itemIdx:idx,str:it.str});
            }
          });
        });
      });
    })(pNo);
  }
  chain.then(function(){
    var cards=stage.querySelectorAll('.pdf-page-card');
    for(var i=0;i<cards.length;i++){
      var pNo=+cards[i].getAttribute('data-pdf-page');
      var tl=cards[i].querySelector('.pdf-text-layer');
      if(tl) highlightSearchMatchesInPage(pNo,tl);
    }
    updatePdfSearchCounter();
    if(pdfViewerState.searchHits.length){
      jumpToPdfSearchHit(0);
    }
  });
}

function highlightSearchMatchesInPage(pageNo,textLayer){
  var q=pdfViewerState.searchQuery;
  if(!q||!textLayer) return;
  var qLow=q.toLocaleLowerCase('tr');
  var spans=textLayer.querySelectorAll('span');
  for(var i=0;i<spans.length;i++){
    var t=(spans[i].textContent||'').toLocaleLowerCase('tr');
    if(t.indexOf(qLow)>=0) spans[i].classList.add('pdf-search-hit');
  }
}

function jumpToPdfSearchHit(idx){
  var hits=pdfViewerState.searchHits;
  if(!hits.length) return;
  pdfViewerState.searchIdx=((idx%hits.length)+hits.length)%hits.length;
  var hit=hits[pdfViewerState.searchIdx];
  scrollToPdfPartPage(hit.relPage,true);
  updatePdfSearchCounter();
}

function updatePdfSearchCounter(){
  var el=document.getElementById('pdfSearchCount');
  if(!el) return;
  if(!pdfViewerState.searchQuery){el.textContent='';return;}
  var n=pdfViewerState.searchHits.length;
  el.textContent=n?(pdfViewerState.searchIdx+1)+' / '+n:'0 sonuç';
}

function updatePdfToolbarUI(){
  var p=loadPrefs();
  var grid=document.getElementById('pdfPagesGrid');
  if(grid){
    grid.className='pdf-pages-grid '+(pdfViewerState.spread==='double'?'pdf-spread-double':'pdf-spread-single')+' pdf-filter-'+(pdfViewerState.filter||'auto');
  }
  var cropBtn=document.getElementById('pdfCropToggleBtn');
  if(cropBtn) cropBtn.classList.toggle('active',!!pdfViewerState.autoCrop);
  var spreadBtn=document.getElementById('pdfSpreadToggleBtn');
  if(spreadBtn) spreadBtn.classList.toggle('active',pdfViewerState.spread==='double');
  var filterSel=document.getElementById('pdfFilterSelect');
  if(filterSel) filterSel.value=pdfViewerState.filter||'auto';
}

function renderPdfDrawerContent(){
  var body=document.getElementById('pdfDrawerBody');
  if(!body||!pdfViewerState.active||!pdfViewerState.pdfDoc) return;

  if(pdfViewerState.drawerTab==='thumbs'){
    var out=['<div class="pdf-thumbs-grid">'];
    for(var pNo=pdfViewerState.startPage;pNo<=pdfViewerState.endPage;pNo++){
      var rel=pNo-pdfViewerState.startPage+1;
      var activeCls=rel===pdfViewerState.currentPage?' is-current':'';
      out.push(
        '<div class="pdf-thumb-item'+activeCls+'" data-act="pdf-goto-page" data-page="'+rel+'">',
          '<canvas class="pdf-thumb-canvas" data-thumb-page="'+pNo+'" width="140" height="186"></canvas>',
          '<div class="pdf-thumb-label">Sayfa '+rel+'</div>',
        '</div>'
      );
    }
    out.push('</div>');
    body.innerHTML=out.join('');
    // Küçük resimleri arka planda çiz
    var canvases=body.querySelectorAll('.pdf-thumb-canvas');
    for(var i=0;i<canvases.length;i++){
      (function(cv){
        var pNo=+cv.getAttribute('data-thumb-page');
        pdfViewerState.pdfDoc.getPage(pNo).then(function(page){
          var vp=page.getViewport({scale:0.22});
          cv.width=Math.round(vp.width);
          cv.height=Math.round(vp.height);
          var ctx=cv.getContext('2d');
          ctx.fillStyle='#ffffff';
          ctx.fillRect(0,0,cv.width,cv.height);
          page.render({canvasContext:ctx,viewport:vp});
        }).catch(function(){});
      })(canvases[i]);
    }
    return;
  }

  if(pdfViewerState.drawerTab==='outline'){
    var items=pdfViewerState.outline||[];
    if(!items.length){
      body.innerHTML='<div class="empty-note">Bu PDF dosyasında gömülü İçindekiler (Bookmark) tablosu bulunmuyor. Küçük Resimler sekmesinden tüm sayfalara göz atabilirsin.</div>';
      return;
    }
    var list=['<div class="pdf-outline-list">'];
    items.forEach(function(it,idx){
      list.push('<button class="pdf-outline-item" data-act="pdf-outline-jump" data-idx="'+idx+'">'+escHtml(it.title||('Bölüm '+(idx+1)))+'</button>');
    });
    list.push('</div>');
    body.innerHTML=list.join('');
    return;
  }

  if(pdfViewerState.drawerTab==='highlights'){
    var st=getState(pdfViewerState.pid);
    var hls=(st.hl||[]).filter(function(h){return h.kind==='pdf';});
    if(!hls.length){
      body.innerHTML='<div class="empty-note">Bu PDF üzerinde henüz vurgu yapmadın. Metin seçerek 4 renkte vurgulama yapabilirsin.</div>';
      return;
    }
    var hlHtml=['<div class="pdf-hl-list">'];
    hls.forEach(function(h){
      hlHtml.push(
        '<div class="pdf-hl-card hl-border-'+(h.c||'y')+'" data-act="pdf-goto-page" data-page="'+(h.relPage||1)+'">',
          '<div class="pdf-hl-meta">Sayfa '+(h.relPage||1)+' <button class="icon-btn sm" data-act="pdf-del-hl" data-hl-id="'+escAttr(h.id)+'" title="Sil">✕</button></div>',
          '<div class="pdf-hl-text">'+escHtml(h.q||'')+'</div>',
        '</div>'
      );
    });
    hlHtml.push('</div>');
    body.innerHTML=hlHtml.join('');
  }
}

/* ============================================================================
   Akıllı PDF İçe Aktarıcı & Part Bölücü (Smart PDF Importer & Part Splitter)
   ============================================================================ */

var pdfImportSession={
  uid:null,
  cid:null,
  fileName:'',
  externalPath:null,
  data:null,
  pdfDoc:null,
  numPages:0,
  metaTitle:'',
  outlineChapters:[], // [{title, startPage, endPage}]
  pageHeadings:{}, // pageNo -> {title, cands, wordCount}
  mode:'single', // 'single' | 'outline' | 'chunks' | 'custom'
  singleStart:1,
  singleEnd:1,
  singleNo:1,
  singleTitle:'',
  singleCandidates:[],
  chunkSize:12,
  customRangesText:''
};

function inspectPdfForImport(fileObj,uid2){
  // fileObj: { name, externalPath?, data?: Uint8Array|ArrayBuffer }
  var fu=findUnit(uid2);
  if(!fu) return Promise.reject(new Error('Ünite bulunamadı.'));

  pdfImportSession.uid=uid2;
  pdfImportSession.cid=fu.course.id;
  pdfImportSession.fileName=fileObj.name||'Ders_Notu.pdf';
  pdfImportSession.externalPath=fileObj.externalPath||null;
  pdfImportSession.data=fileObj.data||null;
  pdfImportSession.outlineChapters=[];
  pdfImportSession.pageHeadings={};

  var srcPromise=fileObj.data
    ?Promise.resolve({data:fileObj.data})
    :(fileObj.externalPath&&NATIVE
      ?NATIVE.readExternalBin(fileObj.externalPath).then(function(r){
        if(!r||!r.data) throw new Error('PDF dosyası okunamadı.');
        var u8=r.data instanceof Uint8Array?r.data:new Uint8Array(r.data);
        pdfImportSession.data=u8;
        return {data:u8.slice(0)};
      })
      :Promise.reject(new Error('PDF kaynağı bulunamadı.')));

  return srcPromise.then(loadPdfDocument).then(function(pdfDoc){
    pdfImportSession.pdfDoc=pdfDoc;
    pdfImportSession.numPages=pdfDoc.numPages;
    pdfImportSession.singleStart=1;
    pdfImportSession.singleEnd=pdfDoc.numPages;

    var existing=unitParts(uid2);
    var usedNos=new Set(existing.map(function(p){return p.no;}));
    var nextNo=1;while(usedNos.has(nextNo)) nextNo++;

    // Dosya adından ve ilk sayfadan Part No / Başlık adaylarını çıkar
    return Promise.all([
      pdfDoc.getMetadata().catch(function(){return null;}),
      pdfDoc.getOutline().catch(function(){return null;}),
      extractPdfPageSummary(pdfDoc,1)
    ]).then(function(res){
      var metaObj=res[0],outline=res[1],p1=res[2];
      var infoTitle=metaObj&&metaObj.info&&metaObj.info.Title?String(metaObj.info.Title).trim():'';
      var fnClean=pdfImportSession.fileName.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').trim();

      var a1=analyzePart(p1.text,pdfImportSession.fileName);
      pdfImportSession.singleNo=a1.no||nextNo;

      var cands=[];
      function pushCand(t,src){
        if(!t) return;
        var cl=titleClean(t);
        if(!cl||cl.length<3||/^(?:Microsoft\s+Word|Untitled|Adsız|Slide\s+\d+|Page\s+\d+)$/i.test(cl)) return;
        var sh=shortTitle(cl,68);
        if(!cands.some(function(x){return x.short.toLocaleLowerCase('tr')===sh.toLocaleLowerCase('tr');})){
          cands.push({short:sh,full:cl,src:src});
        }
      }
      if(p1.topHeading) pushCand(p1.topHeading,'pdf-heading');
      (a1.titleCandidates||[]).forEach(function(c){pushCand(c.full,c.src);});
      if(infoTitle) pushCand(infoTitle,'pdf-meta');
      if(fnClean) pushCand(fnClean,'filename');

      pdfImportSession.singleCandidates=cands.slice(0,6);
      pdfImportSession.singleTitle=(cands[0]&&cands[0].short)||fnClean||'PDF Ders Bölümü';

      // Eğer PDF içinde yer imleri (Outline) varsa sayfa numaralarını çözümle
      return resolvePdfOutlinePageRanges(pdfDoc,outline||[]);
    }).then(function(chapters){
      pdfImportSession.outlineChapters=chapters;
      pdfImportSession.mode=chapters.length>=2?'outline':'single';
      return pdfImportSession;
    });
  });
}

function extractPdfPageSummary(pdfDoc,pageNo){
  return pdfDoc.getPage(pageNo).then(function(page){
    return page.getTextContent().then(function(tc){
      var items=tc.items||[];
      var maxFont=0;
      var linesByY=[];
      items.forEach(function(it){
        var s=String(it.str||'').trim();
        if(!s) return;
        var h=it.transform?Math.hypot(it.transform[2],it.transform[3]):12;
        if(h>maxFont) maxFont=h;
        linesByY.push({str:s,h:h,y:it.transform?Math.round(it.transform[5]):0});
      });
      // En büyük fontlu başlık satırlarını birleştir
      var bigLines=linesByY.filter(function(x){return x.h>=maxFont*0.88&&x.str.length>=2;}).slice(0,4).map(function(x){return x.str;});
      var topHeading=bigLines.join(' ').replace(/\s+/g,' ').trim();
      var fullText=items.map(function(it){return it.str;}).join(' ');
      return {
        pageNo:pageNo,
        topHeading:topHeading,
        text:fullText,
        wordCount:fullText.split(/\s+/).filter(Boolean).length
      };
    });
  }).catch(function(){return {pageNo:pageNo,topHeading:'',text:'',wordCount:0};});
}

function resolvePdfOutlinePageRanges(pdfDoc,outline){
  if(!outline||!outline.length) return Promise.resolve([]);
  var jobs=outline.slice(0,40).map(function(item){
    var dest=item.dest;
    var pPromise=typeof dest==='string'?pdfDoc.getDestination(dest):Promise.resolve(dest);
    return pPromise.then(function(d){
      if(!Array.isArray(d)||!d[0]) return null;
      return pdfDoc.getPageIndex(d[0]).then(function(idx){
        return {title:titleClean(item.title||'Bölüm'),startPage:idx+1};
      });
    }).catch(function(){return null;});
  });
  return Promise.all(jobs).then(function(list){
    var valid=list.filter(function(x){return x&&x.startPage>=1&&x.startPage<=pdfDoc.numPages;});
    valid.sort(function(a,b){return a.startPage-b.startPage;});
    // Aynı sayfadan başlayan mükerrer başlıkları sadeleştir
    var dedup=[];
    valid.forEach(function(v){
      if(!dedup.length||dedup[dedup.length-1].startPage!==v.startPage) dedup.push(v);
    });
    for(var i=0;i<dedup.length;i++){
      var nextStart=i+1<dedup.length?dedup[i+1].startPage-1:pdfDoc.numPages;
      dedup[i].endPage=Math.max(dedup[i].startPage,nextStart);
    }
    return dedup;
  });
}

function executePdfImportPlan(planList){
  // planList: [{ no, title, fullTitle?, startPage, endPage }]
  var fu=findUnit(pdfImportSession.uid);
  if(!fu||!planList||!planList.length) return Promise.resolve([]);
  var course=fu.course,unit=fu.unit;

  return storePdfFileInLibrary(course,unit,pdfImportSession.fileName,{
    externalPath:pdfImportSession.externalPath,
    data:pdfImportSession.data
  }).then(function(stored){
    var idx=loadPidx();
    var now=Date.now();
    var createdIds=[];

    planList.forEach(function(item,k){
      var pageCount=Math.max(1,(item.endPage-item.startPage+1));
      // Akademik PDF sayfası başına ortalama ~2.2 dakika okuma süresi
      var estMinutes=Math.max(2,Math.round(pageCount*2.2));
      var existing=unitPartByNo(unit.id,item.no);
      var pid=existing?existing.id:uid('p');
      var entry={
        id:pid,
        cid:course.id,
        uid:unit.id,
        no:item.no,
        kind:'pdf',
        title:item.title||('Part '+item.no),
        ft:item.fullTitle&&item.fullTitle!==item.title?item.fullTitle:undefined,
        minutes:estMinutes,
        pdfFn:stored.pdfFn,
        pdfBinKey:stored.pdfBinKey,
        pdfStart:item.startPage,
        pdfEnd:item.endPage,
        pageCount:pageCount,
        added:existing?existing.added:(now+k),
        u:now+k
      };
      idx[pid]=entry;
      createdIds.push(pid);
      if(item.no>unit.n) unit.n=item.no;
    });

    touchUnit(unit,course);
    saveMeta();
    savePidx();
    return createdIds;
  });
}

function extractPdfRangeAsMarkdown(pdfDoc,startPage,endPage,title){
  var s=Math.max(1,startPage||1),e=Math.min(pdfDoc.numPages,endPage||pdfDoc.numPages);
  var pages=[];
  var chain=Promise.resolve();
  for(var p=s;p<=e;p++){
    (function(pNo){
      chain=chain.then(function(){
        return pdfDoc.getPage(pNo).then(function(page){
          return page.getTextContent();
        }).then(function(tc){
          var items=tc.items||[];
          if(!items.length) return;
          var maxH=0;
          items.forEach(function(it){
            var h=it.transform?Math.hypot(it.transform[2],it.transform[3]):11;
            if(h>maxH) maxH=h;
          });
          var lines=[],curLine='',lastY=null,lastH=11;
          items.forEach(function(it){
            var str=String(it.str||'');
            if(!str) return;
            var y=it.transform?Math.round(it.transform[5]):0;
            var h=it.transform?Math.hypot(it.transform[2],it.transform[3]):11;
            if(lastY!==null&&Math.abs(y-lastY)>Math.max(4,lastH*0.55)){
              if(curLine.trim()) lines.push({text:curLine.trim(),h:lastH});
              curLine=str;
            }else{
              curLine+=(curLine&&!/[\s\-–—]$/.test(curLine)&&!/^[\s.,;:?!)]/.test(str)?' ':'')+str;
            }
            lastY=y;lastH=h;
          });
          if(curLine.trim()) lines.push({text:curLine.trim(),h:lastH});

          var mdLines=['## Sayfa '+pNo];
          lines.forEach(function(L){
            if(L.h>=maxH*0.88&&L.text.length>3&&L.text.length<120&&maxH>13){
              mdLines.push('\n### '+L.text+'\n');
            }else{
              mdLines.push(L.text);
            }
          });
          pages.push(mdLines.join('\n'));
        });
      });
    })(p);
  }
  return chain.then(function(){
    var head=title?('# '+title+'\n\n'):'';
    return head+pages.join('\n\n---\n\n');
  });
}
