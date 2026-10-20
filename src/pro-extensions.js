/* ===================== GIOREADER PRO: GELİŞMİŞ UZANTILAR =====================
   Orijinal GioReader editoryal mimarisini %100 koruyarak:
   1) Gelişmiş Part Numarası & Başlık Motoru (v2) + Otomatik Kitaplık İyileştirme + Başlık Aday Çipleri
   2) Sıfır Gecikmeli (120fps GPU Compositor) Doğrudan Ekran Yakınlaştırma (2 Parmak Touchpad Zoom & Pan)
   3) Ultra-HD PDF Okuyucu (HiDPI Supersampling, %0 Görsel Bozulma, Seçilebilir Metin, Akıllı Bölümlendirici)
   4) Otomatik Ünite Okuma Analitiği & Kişisel Hız Uyarlamalı Süre Tahmini
   =========================================================================== */

/* ---------- 1. GELİŞMİŞ PART & BAŞLIK MOTORU (v2) ---------- */
function maskFencedCode(s){
  return String(s||'').replace(/(^|\n)([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?(?:\n[ \t]*\3[^\n]*|$)/g,function(m){return m.replace(/[^\n]/g,' ');});
}
var TECH_UPPER=new Set([
  'C','C++','CPU','GPU','RAM','ROM','ALU','ISA','OS','IO','I/O','OOP','ADT','AST','API','ABI','SDK','IDE','CLI','GUI','URL','URI','SQL','JSON','XML','HTML','CSS','JS','TS','DOM',
  'BST','AVL','B-TREE','RBT','BFS','DFS','DAG','MST','DP','NP','P','FIFO','LIFO','LRU','LFU','L1','L2','L3','TLB','SIMD','RISC','CISC','POSIX','IEEE','ASCII','UTF','UTF-8',
  'RLC','RC','RL','LC','KCL','KVL','AC','DC','RMS','Op-Amp','OP-AMP','MOSFET','BJT','FET','JFET','CMOS','TTL','PWM','ADC','DAC','PLL','SNR','dB','Hz','kHz','MHz','GHz',
  'ODE','PDE','IVP','BVP','LTI','FTC','WKB','PDEs','ODEs','LU','QR','SVD','RK4',
  'RSA','AES','DES','SHA','MD5','GCD','LCM','LCG','UPC','ISBN','CNF','DNF','SAT','QED','ZFC',
  'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'
]);
var TR_LOWER_WORDS=new Set(['ve','ile','için','veya','ya','da','de','ki','mi','mı','mu','mü','vs','vs.','vb','vb.','en','bir']);

function normalizeTurkishCase(str){
  var s=String(str||'').trim();
  if(!s) return s;
  var letters=s.match(/[\p{L}]/gu)||[];
  if(letters.length<5) return s;
  var uppers=s.match(/[\p{Lu}]/gu)||[];
  if(uppers.length/letters.length<0.65) return s;
  var words=s.split(/(\s+)/);
  var firstWord=true;
  return words.map(function(w){
    if(/^\s+$/.test(w)) return w;
    var m=/^([("'“‘\[\{]*)(.*?)([)"'”’\]\}.,;:?!]*)$/.exec(w);
    if(!m) return w;
    var pre=m[1],core=m[2],post=m[3];
    if(!core) return w;
    if(/[=<>+*/^_ΨΦξλμωΔΩ∑∫√():]/.test(core)||/[\p{Ll}]/u.test(core)){
      firstWord=false;
      return w;
    }
    var upperCore=core.toLocaleUpperCase('tr');
    if(TECH_UPPER.has(upperCore)||TECH_UPPER.has(core)){
      firstWord=false;
      return pre+(TECH_UPPER.has(core)?core:upperCore)+post;
    }
    var aposIdx=core.search(/['’]/);
    if(aposIdx>0){
      var stem=core.slice(0,aposIdx),suf=core.slice(aposIdx);
      var stemUp=stem.toLocaleUpperCase('tr');
      var cleanStem=TECH_UPPER.has(stemUp)?stemUp:(stem.charAt(0).toLocaleUpperCase('tr')+stem.slice(1).toLocaleLowerCase('tr'));
      firstWord=false;
      return pre+cleanStem+suf.toLocaleLowerCase('tr')+post;
    }
    var low=core.toLocaleLowerCase('tr');
    if(!firstWord&&TR_LOWER_WORDS.has(low)) return pre+low+post;
    firstWord=false;
    return pre+low.charAt(0).toLocaleUpperCase('tr')+low.slice(1)+post;
  }).join('');
}

function stripRedundantParens(s){
  var out='',i=0,n=s.length;
  while(i<n){
    if(s.charAt(i)==='('){
      var d=0,j=i;
      for(;j<n;j++){
        if(s.charAt(j)==='(') d++;
        else if(s.charAt(j)===')'){d--;if(d===0) break;}
      }
      if(d===0){
        var inner=s.slice(i+1,j).trim();
        var isShortMath=inner.length<=14&&(/[=<>+*/^_ΨΦξλμωΔΩ0-9]/.test(inner)||/^[a-zA-Z0-9,\s]+$/.test(inner));
        if(isShortMath) out+=s.slice(i,j+1);
        else out=out.replace(/\s+$/,'');
        i=j+1;
        continue;
      }
    }
    out+=s.charAt(i);
    i++;
  }
  return out.replace(/\s+/g,' ').trim();
}

function mathInText(s){
  s=String(s==null?'':s);
  s=s.replace(/\$\\mathbb\{([A-Z])\}\s*([a-z0-9])\$/g,function(_,B,sub){return (TX_BB[B]||B)+(TX_SUB[sub]||sub);});
  if(s.indexOf('$')<0&&s.indexOf('\\(')<0&&!/\\(?:mathbb|mathcal|mathbf|boldsymbol|frac|alpha|beta|psi|Psi|phi|Phi|xi|eta|mu|lambda|pmod|equiv|times|to|forall|exists|implies)/.test(s)) return s;
  s=s.replace(/\$\$([\s\S]+?)\$\$|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)|\\\(([\s\S]+?)\\\)/g,function(m,a,b,c){return texToText(a||b||c);});
  if(/\\[A-Za-z]+/.test(s)) s=texToText(s);
  return s;
}

function titleClean(t){
  var s=String(t||'');
  s=mathInText(s);
  s=s.replace(/<[^>]+>/g,'').replace(/(\*\*|__|\*|`)/g,'').replace(/\s+/g,' ').trim();
  if(s.indexOf(')')>=0&&s.indexOf('(')<0) s=s.replace(/\)/g,'');
  s=s.replace(/^[\s:：\-–—.)\]]+/,'').replace(/[\s:;,.\-–—]+$/,'').trim();
  s=s.replace(/^(?:TEMA|Tema|BÖLÜM|Bölüm|KISIM|Kısım|ADIM|Adım)\s*\d*(?:\.\d+)*\s*[:：\-–—.]\s*/,'');
  var whyMatch=/^["“'‘]?NEDEN\s+BUNA\s+İHTİYACIMIZ\s+VAR\??["”'’]?\s*[:：\-–—]?\s*(.{6,})$/i.exec(s);
  if(whyMatch) s=whyMatch[1].trim();
  if(/^["“]([^"”]+)["”]$/.test(s)) s=s.slice(1,-1).trim();
  s=normalizeTurkishCase(s);
  return s.trim();
}

var DANGLING_END_RE=/\s+(?:ve|ile|veya|ya|da|de|için|olan|olarak|bir|bu|şu|o|en|daha|çok|gibi|kadar|göre|karşı|doğru|sonra|önce|üzerine|üzerinde|arasındaki|arasında|almanın|yapmanın|etmenin|olmanın|bulmanın|çözmenin|probleminin|sistemlerin|sistemlerinin|denklemlerin|denkleminin|özdeğerlerin|özdeğerli|vektörlerin|matrislerin|fonksiyonunun|fonksiyonların|ifadelerin|mantığının|kurallarının|kavramının|mimarisinin|analizinin|teorisinin|yönteminin|algoritmasının|geometrik|felsefi|formel|temel|özel|genel|doğrusal|olmayan|uygunsuz|düğüm|başlangıç|değer|koordinat|sınıf|dışı|katlı|kök|tek)$/i;
var GENERIC_LEFT_LABEL_RE=/^(?:Problem|Problemler|Laboratuvar|Teorem\s+Laboratuvarı|Uygulama\s+Laboratuvarı|Örnek|Yöntem|Adım|Sınıflandırma\s+Kriteri|Kriter|Çözüm\s+Yolu|Durum|Senaryo|Model|Deney|İnceleme|Genel\s+Tekrar|Epilog|Prolog|Giriş|Özet|Sonuç|Krizin\s+Ortaya\s+Çıkışı|Mutfağa\s+Giriş|Menüyü\s+Hazırlamak|Felsefesi)(?:\s+[0-9IVX]+(?:\s*(?:ve|-|–)\s*[0-9IVX]+)?)?$/i;

function shortTitle(t,max){
  max=max||68;
  var s=titleClean(t).replace(/^(?:PART|Part|part|BÖLÜM|Bölüm)\s*\d+\s*[:：\-–—.]?\s*/,'');
  if(!s) return '';
  if(s.length<=max) return s;
  var noParens=stripRedundantParens(s);
  if(noParens.length>=8) s=noParens;
  if(s.length<=max) return titleClean(s);
  var colonMatch=/^([^:：–—-]+?)\s*(?:[:：]|\s[–—-]\s)\s*(.+)$/.exec(s);
  if(colonMatch){
    var left=titleClean(colonMatch[1]),right=titleClean(colonMatch[2]);
    if(GENERIC_LEFT_LABEL_RE.test(left)){
      if(/^(?:Problem|Örnek|Yöntem|Laboratuvar)\s+\d+/i.test(left)){
        var combined=left+': '+right;
        if(combined.length<=max) return combined;
        s=combined;
      }else{
        if(right.length>=6&&right.length<=max) return right;
        if(right.length>max) s=right;
      }
    }else if(left.length>=16&&left.length<=max&&!DANGLING_END_RE.test(' '+left)){
      return left;
    }
  }
  var cut=s.slice(0,max+1);
  var k=Math.max(cut.lastIndexOf(', '),cut.lastIndexOf(' ve '),cut.lastIndexOf(' & '),cut.lastIndexOf(' ile '),cut.lastIndexOf(': '));
  if(k>=22){
    var cand=titleClean(s.slice(0,k));
    if(!DANGLING_END_RE.test(' '+cand)) return cand;
  }
  k=cut.lastIndexOf(' ');
  var res=titleClean(s.slice(0,k>=18?k:max));
  while(DANGLING_END_RE.test(res)&&res.indexOf(' ')>12){
    res=res.replace(/\s+\S+$/,'').trim();
  }
  return res;
}

function extractTitleAfter(raw,endIdx,flags){
  var lineEnd=raw.indexOf('\n',endIdx);if(lineEnd<0) lineEnd=raw.length;
  var lineStart=raw.lastIndexOf('\n',endIdx-1)+1;
  var beforeOnLine=raw.slice(lineStart,endIdx);
  var openParens=(beforeOnLine.match(/\(/g)||[]).length;
  var closeParens=(beforeOnLine.match(/\)/g)||[]).length;
  var insideParens=openParens>closeParens;
  var rest=raw.slice(endIdx,lineEnd);
  rest=rest.replace(/^(\s*(?:\*\*|__)?)\s*(?:\/|of\s|\u2044)\s*\d{1,3}\b/i,'$1');
  if(/^['’][\p{L}]+/u.test(rest)) return null;
  if(insideParens&&/^\s*\)/.test(rest)) return null;
  var m;
  if(flags.inBold){
    m=/^\s*(?:\*\*|__)?\s*[:：\-–—.]?\s*([^*]*?)(?:\*\*|__)/.exec(rest);
    if(m){var t=titleClean(m[1]);if(t.length>=3&&!/^(?:tamamland|başlatıyoruz|başlıyoruz|geçiyoruz)/i.test(t)) return t.slice(0,220);}
  }
  m=/^\s*(?:\*\*|__)?\s*[:：\-–—.]\s*(.*)$/.exec(rest);
  if(m){
    var tx=m[1].replace(/\s+(?:konusuna|konusunu|ile\s+devam|ile\s+başla|ile\s+ilerle)\b.*$/i,'');
    tx=titleClean(tx.replace(/\*\*.*$/,function(){return '';}));
    if(!tx||/^(?:tamamland|başlatıyoruz|başlıyoruz|geçiyoruz|bitti)/i.test(tx)) return null;
    return tx.length>=3?tx.slice(0,220):null;
  }
  if(flags.isHeading||flags.lead){
    var t2=titleClean(rest);
    if(t2&&!/^(?:tamamland|başlatıyoruz|başlıyoruz|geçiyoruz|bitti)/i.test(t2)&&t2.length>=3&&t2.length<=220) return t2;
  }
  return null;
}

function extractIntroTopic(body){
  var headChunk=String(body||'').slice(0,1800);
  var firstHeadingIdx=headChunk.search(/^#{1,4}[ \t]+/m);
  if(firstHeadingIdx>0) headChunk=headChunk.slice(0,firstHeadingIdx);
  var patterns=[
    /(?:^|[.!?]\s+|\n)\s*\**\s*(?:Konumuz|Bu partın konusu|Bu partta|Konu|Başlık|Topic)\s*\**\s*:\s*\**([^.\n*]{4,120})/i,
    /(?:bu\s+(?:bölümde|derste|partta|laboratuvarda|adımı?mızda)|bugün|şimdi\s+seninle)[^.!?\n]{0,140}?\*\*([^*\n]{5,100})\*\*/i,
    /\*\*([^*\n]{6,95})\*\*\s*(?:ile\s+tanışaca|konusuna\s+giriş|felsefesini|mimarisini|kavramını|teorisini|formülünü|yöntemini|algoritmasını|kanıtlayaca|inşa\s+edece|inceleyece|keşfedece)/i
  ];
  for(var i=0;i<patterns.length;i++){
    var m=patterns[i].exec(headChunk);
    if(m&&m[1]){
      var cleaned=titleClean(m[1].replace(/['’][a-zğüşıöç]{1,4}$/i,''));
      if(cleaned.length>=5&&!/^(?:part|bölüm|önceki|sonraki|ad[ıi]m)\b/i.test(cleaned)) return cleaned;
    }
  }
  return null;
}

function computeContentMetrics(body,wpm){
  wpm=wpm||170;
  var s=String(body||'');
  var codeBlocks=0,codeLines=0;
  s=s.replace(/```([\s\S]*?)```|~~~([\s\S]*?)~~~/g,function(m,a,b){
    codeBlocks++;
    var c=(a||b||'').trim();
    codeLines+=c?c.split('\n').length:0;
    return ' ';
  });
  var displayEqs=0;
  s=s.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray|displaymath|split)\*?\}([\s\S]*?)\\end\{\3\*?\}/g,function(){
    displayEqs++;
    return ' ';
  });
  var inlineMaths=0;
  s=s.replace(/\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)|\\\(([\s\S]+?)\\\)/g,function(){
    inlineMaths++;
    return ' formül ';
  });
  var words=s.split(/\s+/).filter(Boolean).length;
  var effectiveWords=words+(displayEqs*18)+(codeLines*3.5)+(inlineMaths*2);
  var minutes=Math.max(1,Math.round(effectiveWords/wpm));
  return {words:words,effectiveWords:Math.round(effectiveWords),displayEqs:displayEqs,inlineMaths:inlineMaths,codeBlocks:codeBlocks,codeLines:codeLines,minutes:minutes};
}

function analyzePart(src,fileName){
  var raw=String(src==null?'':src).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  var lp=latexCached(raw);
  if(lp.tex) raw=lp.md.trim();
  var masked=maskCode(raw),len=raw.length;
  var unitTotal=null,structuredNo=null,structuredNext=null;
  var statusRe=/\[?\s*Durum\s*:\s*Part\s*(\d{1,3})(?:\s*\/\s*(\d{1,3}))?\s*Tamamland[ıi][^\n\]]*?(?:\|\s*S[ıi]radaki\s*(?:Bölüm|Part|Konu)?\s*:\s*(?:Part\s*(\d{1,3})\s*[-–—:]?\s*)?([^|\n\]]+))?/gi;
  var sm,statusMatches=[];
  while((sm=statusRe.exec(raw))){
    statusMatches.push({
      no:+sm[1],
      total:sm[2]?+sm[2]:null,
      nextNo:sm[3]?+sm[3]:(+sm[1]+1),
      nextTitle:sm[4]?titleClean(sm[4].replace(/tüm\s+müfredat.*$/i,'')):null,
      index:sm.index
    });
  }
  if(statusMatches.length){
    var lastSt=statusMatches[statusMatches.length-1];
    structuredNo=lastSt.no;
    if(lastSt.total) unitTotal=lastSt.total;
    if(lastSt.nextTitle&&!/^(?:tüm\s+müfredat|tebrikler|bitti)/i.test(lastSt.nextTitle)){
      structuredNext={no:lastSt.nextNo,title:lastSt.nextTitle};
    }
  }
  var re=/(?:^|[^\p{L}\p{N}])((?:PART|Part|part|BÖLÜM|Bölüm|KISIM|Kısım|DERS|Ders|LECTURE|Lecture|CHAPTER|Chapter|MODÜL|Modül)[ \t]*[#.:]?[ \t]*(\d{1,3}))(?!\d)(?![.,]\d)/gu,m,cands=[];
  while((m=re.exec(masked))){
    var idx=m.index+m[0].indexOf(m[1]);
    var end=idx+m[1].length;
    var ls=masked.lastIndexOf('\n',idx-1)+1,le=masked.indexOf('\n',idx);if(le<0) le=len;
    var line=masked.slice(ls,le),before=masked.slice(ls,idx);
    var lead=before.replace(/[\s#>*_\-–—•|✅📘📗📕🎯🧠🚀✔☑️:\[\]]+/gu,'').length===0||/Durum\s*:\s*$/i.test(before);
    var bolds=(before.match(/\*\*|__/g)||[]).length;
    var suf=/^['’][\p{L}]+/u.test(masked.slice(end,end+4));
    var afterSlice=masked.slice(end,end+65);
    var isComp=(/^(?:\s*\/\s*\d{1,3})?[^.\n]{0,28}?(?:tamamland|tamamlad|completed|\bbitti\b)/i.test(afterSlice)||/(?:tamamland[ıi]|completed)\s*[:\-–—]\s*[*_]*$/i.test(before))&&line.length<220;
    var c={
      no:+m[2],idx:idx,end:end,ls:ls,le:le,line:line,lead:lead,inBold:bolds%2===1,
      isHeading:/^\s{0,3}#{1,6}\s/.test(line),
      completion:isComp,suf:suf
    };
    var after=masked.slice(end,Math.min(len,end+220)),bef=masked.slice(Math.max(ls,idx-140),idx);
    c.nextRole=NEXT_AFTER_RE.test(after)||NEXT_BEFORE_RE.test(bef)||/S[ıi]radaki\s*(?:Bölüm|Part)/i.test(bef);
    c.head=idx<Math.max(1600,len*0.2);
    c.tail=idx>len-Math.max(2000,len*0.22);
    cands.push(c);
  }
  var cur=null,src2=null,conf='none',completions=cands.filter(function(c){return c.completion&&!c.suf;});
  var multi=completions.length>1&&new Set(completions.map(function(c){return c.no;})).size>1;
  if(structuredNo){
    cur=completions[completions.length-1]||cands.find(function(c){return c.no===structuredNo;})||{no:structuredNo,completion:true};
    src2='footer';conf='high';
  }else if(completions.length){
    cur=completions.filter(function(c){return c.lead;}).pop()||completions[completions.length-1];
    src2='footer';conf='high';
  }
  if(!cur){
    var heads=cands.filter(function(c){return c.head&&!c.suf&&(!c.nextRole||((c.inBold||c.isHeading||c.lead)&&len>=3500&&c.idx<len*0.15));});
    var strong=heads.filter(function(c){return c.isHeading||c.lead||c.inBold;});
    cur=strong[0]||heads[0]||null;
    if(cur){src2=(cur.isHeading||cur.lead)?'heading':'intro';conf=(cur.isHeading||cur.lead||cur.inBold)?'high':'mid';}
  }
  var next=structuredNext,no=cur?cur.no:null;
  if(!next){
    if(cur&&cur.idx!=null){
      var nx=cands.filter(function(c){return c!==cur&&c.idx>cur.idx&&c.no!==cur.no&&c.tail&&(c.nextRole||c.no===cur.no+1);}).pop();
      if(nx) next={no:nx.no,title:extractTitleAfter(raw,nx.end,{inBold:nx.inBold,isHeading:nx.isHeading,lead:nx.lead})||null};
    }else if(!cur){
      var tn=cands.filter(function(c){return c.tail&&(c.nextRole||c.no>1);}).pop();
      if(tn&&tn.no>1){
        next={no:tn.no,title:extractTitleAfter(raw,tn.end,{inBold:tn.inBold,isHeading:tn.isHeading,lead:tn.lead})||null};
        no=tn.no-1;src2='inferred';conf='low';
      }
    }
  }
  if(!no&&fileName){
    var fnm=/^(?:Part[ \t_-]*)?(\d{1,3})\b/i.exec(String(fileName).trim());
    if(fnm){no=+fnm[1];src2='filename';conf='mid';}
  }
  var body=raw;
  body=body.replace(/^[ \t]*---+[ \t]*\[?\s*Durum\s*:\s*Part\s*\d+[^\n]*$/gim,'');
  if(completions.length){
    body=body.split('\n').filter(function(l,k){
      return !completions.some(function(c){return c.ls!=null&&raw.slice(0,c.ls).split('\n').length-1===k&&c.lead;});
    }).join('\n');
  }
  var endMsg='';
  var paras=body.replace(/\s+$/,'').split(/\n{2,}/);
  var lastP=paras[paras.length-1]||'';
  if(lastP&&!/^(```|~~~|#|\||>)/.test(lastP.trim())&&lastP.length<1400){
    var sents=lastP.split(/(?<=[.!?…])\s+(?=[\p{Lu}"“*'‘(])/u);
    var keep=[],drop=[];
    sents.forEach(function(s){
      var isChat=CHAT_RE.test(s)||/^[\s*_]*PART[ \t]*\d+[ \t]+Tamamland/i.test(s)||/Durum\s*:\s*Part\s*\d+/i.test(s);
      (isChat?drop:keep).push(s);
    });
    if(drop.length){
      endMsg=drop.join(' ');
      paras[paras.length-1]=keep.join(' ');
      body=paras.join('\n\n');
    }
  }
  body=body.replace(/(?:\n[ \t]*(?:---+|\*\*\*+|___+)[ \t]*)+\s*$/,'').replace(/\s+$/,'');
  body=body.replace(/^(?:[ \t]*#{1,6}[ \t]*(?:PART|Part)[ \t]*\d+\b[^\n]*\n+)/,'');

  var titleCandidates=[];
  function addCand(rawTitle,sourceTag){
    if(!rawTitle) return;
    var full=titleClean(rawTitle);
    if(!full||full.length<3) return;
    if(/^(?:part|bölüm)\s*\d+$/i.test(full)) return;
    if(/^(?:tamamland|başlatıyoruz|başlıyoruz|devam\s+ediyoruz)$/i.test(full)) return;
    var sh=shortTitle(full,68);
    if(!sh||sh.length<3) return;
    if(!titleCandidates.some(function(x){return x.short.toLocaleLowerCase('tr')===sh.toLocaleLowerCase('tr');})){
      titleCandidates.push({short:sh,full:full,src:sourceTag});
    }
  }
  if(cur&&cur.end!=null){
    var tc=cur.completion?cands.filter(function(c){return c.no===cur.no&&c.head&&!c.completion&&!c.suf;})[0]:cur;
    if(tc){
      var tAfter=extractTitleAfter(raw,tc.end,{inBold:tc.inBold,isHeading:tc.inBold||tc.isHeading,lead:tc.lead});
      if(tAfter) addCand(tAfter,'part');
    }
  }
  var bodyFencedMasked=maskFencedCode(body);
  var headingRe=/^(#{1,4})[ \t]+(.{3,200})$/gm,hm,headings=[];
  while((hm=headingRe.exec(bodyFencedMasked))){
    var hLineEnd=body.indexOf('\n',hm.index);if(hLineEnd<0) hLineEnd=body.length;
    var realHeadingLine=body.slice(hm.index,hLineEnd).replace(/^#{1,6}[ \t]+/,'').trim();
    var strippedNum=realHeadingLine.replace(/^\d+(?:\.\d+)*[.)]\s+/,'');
    headings.push({level:hm[1].length,raw:strippedNum,orig:realHeadingLine});
  }
  var firstH=headings[0]?titleClean(headings[0].raw):'';
  var isGenericFirstH=/^Neden\s+Buna\s+İhtiyacımız\s+Var\??$/i.test(firstH);
  var introTopic=extractIntroTopic(body);
  if(isGenericFirstH&&introTopic) addCand(introTopic,'intro');
  if(headings.length){
    if(!isGenericFirstH) addCand(headings[0].raw,'heading');
    if(headings.length>1){
      if(!/^(?:Adım|Örnek|Problem|Soru)\s+\d+$/i.test(titleClean(headings[1].raw))){
        addCand(headings[1].raw,'heading2');
      }
    }
    if(isGenericFirstH) addCand(headings[0].raw,'heading');
  }
  if(introTopic&&!isGenericFirstH) addCand(introTopic,'intro');
  var bm=/^\s*\*\*([^*\n]{4,120})\*\*\s*$/m.exec(body);
  if(bm) addCand(bm[1],'bold');
  var qRe=/^[ \t]*(?:#{1,6}[ \t]+)?(?:\*\*|__)?[ \t]*(?:Soru|SORU|Question)[ \t]+(\d{1,3})\b[ \t]*(?:\*\*|__)?[ \t]*[:.)\-–—]/gm,qm,qNums=[];
  while((qm=qRe.exec(bodyFencedMasked))){
    var qn=+qm[1];
    if(qn>0&&qn<500&&qNums.indexOf(qn)<0) qNums.push(qn);
  }
  if(qNums.length>=2){
    var qMin=Math.min.apply(null,qNums),qMax=Math.max.apply(null,qNums);
    addCand('Sorular '+qMin+'–'+qMax,'questions');
  }else if(qNums.length===1){
    addCand('Soru '+qNums[0],'questions');
  }
  if(fileName){
    var fnClean=String(fileName).replace(/\.(md|markdown|txt|tex|latex|pdf)$/i,'').replace(/^(?:Part[ \t_-]*)?\d{1,3}[ \t]*[-–—._][ \t]*/i,'').replace(/_/g,' ').trim();
    if(fnClean&&!/^ads[ıi]z$/i.test(fnClean)) addCand(fnClean,'filename');
  }
  var bestCand=titleCandidates[0]||null;
  var finalTitle=bestCand?bestCand.short:null;
  var finalFullTitle=bestCand?bestCand.full:null;
  var titleSrc=bestCand?bestCand.src:null;
  var alts=[];
  cands.forEach(function(c){if(!c.suf&&c.no>0&&c.no<300&&alts.indexOf(c.no)<0&&(c.head||c.tail)) alts.push(c.no);});
  var stats=computeContentMetrics(body);
  return {
    no:no,noSrc:src2,conf:conf,alts:alts.slice(0,5),
    title:finalTitle,fullTitle:finalFullTitle,titleCandidates:titleCandidates.slice(0,5),titleSrc:titleSrc,
    next:next,unitTotal:unitTotal,endMsg:endMsg.replace(/[*_]+/g,'').trim(),body:body.trim(),
    multi:multi,len:len,macros:lp.macros||'',tex:!!lp.tex,
    wordCount:stats.words,eqCount:stats.displayEqs,inlineMathCount:stats.inlineMaths,codeBlockCount:stats.codeBlocks,minutes:stats.minutes
  };
}

/* Otomatik Kitaplık Başlık İyileştirici (264 partın tamamındaki bozuk/kesik başlıkları onarır) */
function isSuspiciousTitle(t){
  var s=String(t||'').trim();
  if(!s||s.length<4) return true;
  if(/^(?:Part|Bölüm)\s*\d+$/i.test(s)) return true;
  if(/^(?:başlatıyoruz|başlıyoruz|tamamlandı|devam|giriş)$/i.test(s)) return true;
  if(/^(?:Laboratuvar|Problem|Örnek|Yöntem|Sınıflandırma\s+Kriteri|Teorem\s+Laboratuvarı|Uygulama\s+Laboratuvarı)\s*\d*$/i.test(s)) return true;
  if(/^Neden\s+Buna\s+İhtiyacımız\s+Var\??$/i.test(s)) return true;
  if(DANGLING_END_RE.test(s)) return true;
  var letters=s.match(/[\p{L}]/gu)||[],uppers=s.match(/[\p{Lu}]/gu)||[];
  if(letters.length>=6&&uppers.length/letters.length>=0.65) return true;
  return false;
}

async function healLibraryMetadata(){
  var healed=0;

  // 1) Yanlışlıkla ağaç yapısına aktarılmış markdown ders partlarını ve mükerrer kayıtları temizle
  Object.keys(S.parts||{}).forEach(function(pid){
    var p=S.parts[pid];
    if(!p) return;
    if(p.kind!=='pdf'&&(p.role==='supplementary'||p.subGroup)){
      var dup=allParts().find(function(x){return x.id!==p.id&&x.uid===p.uid&&x.title===p.title&&!x.role;});
      if(dup){
        delete S.parts[pid];
        try{idbDel('p:'+pid);}catch(e){}
        touch('p:'+pid);
        healed++;
      }else{
        delete p.role;
        delete p.subGroup;
        delete p.subNo;
        p.no=p.no||(mainPartsOfUnit(p.uid).length+1);
        touch('p:'+p.id);
        healed++;
      }
    }
  });

  // 2) Kalan soru PDF'lerini 1..N şeklinde ardışık numaralandır
  courses().forEach(function(c){
    unitsOf(c.id).forEach(function(u){
      var subs=subPartsOfUnit(u.id);
      subs.forEach(function(sp,idx){
        if(sp.subNo!==(idx+1)){
          sp.subNo=(idx+1);
          touch('p:'+sp.id);
          healed++;
        }
      });
      var mps=mainPartsOfUnit(u.id);
      var maxNo=0;
      mps.forEach(function(x){if(x.no>maxNo) maxNo=x.no;});
      if(u.n!==Math.max(1,maxNo)){
        u.n=Math.max(1,maxNo);
        updateUnit(u);
        healed++;
      }
    });
  });

  // 3) Markdown ders başlığı anomalilerini onar
  Object.keys(S.parts||{}).forEach(function(pid){
    var p=S.parts[pid];
    if(!p||p.kind==='pdf'||!p.text) return;
    if(isTestUnit(p.uid)){
      var ql=qRangeLabel(p);
      if(ql&&ql!=='Soru bulunamadı'&&p.title!==ql){
        p.title=ql;saveLocal('p:'+pid);dirty['p:'+pid]=true;healed++;
      }
      return;
    }
    var an=analyzePart(p.text);
    if(an&&an.title){
      var curClean=shortTitle(p.title||'',68);
      if(isSuspiciousTitle(p.title)||an.title!==curClean){
        p.title=an.title;
        if(an.fullTitle&&an.fullTitle!==an.title) p.ft=an.fullTitle;
        p.minutes=an.minutes||readMinutes(an.body);
        saveLocal('p:'+pid);dirty['p:'+pid]=true;
        healed++;
      }
    }
  });
  return healed;
}

function ptitle(p){
  if(!p) return '';
  if(isTestUnit(p.uid)) return qRangeLabel(p);
  if(p.kind==='pdf') return p.title||('PDF Part '+p.no);
  return shortTitle(p.title,68);
}

/* ---------- 1.5. VEKTÖREL İKONOGRAFİ REFORMU (24x24 Lucide/Phosphor Optik Izgara) & MARKA AMBLEMİ ---------- */
LOGO_SVG='<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gr-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#134E5E"/><stop offset="52%" stop-color="#0B2B36"/><stop offset="100%" stop-color="#06131A"/></linearGradient><linearGradient id="gr-gold" gradientUnits="userSpaceOnUse" x1="112" y1="120" x2="400" y2="420"><stop offset="0%" stop-color="#FFE066"/><stop offset="50%" stop-color="#F7B731"/><stop offset="100%" stop-color="#E67E22"/></linearGradient><linearGradient id="gr-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.24"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs><rect width="512" height="512" rx="120" fill="url(#gr-bg)"/><rect x="10" y="10" width="492" height="492" rx="110" fill="none" stroke="url(#gr-glow)" stroke-width="6"/><path d="M346 148A122 122 0 1 0 380 236" fill="none" stroke="#F2FBF9" stroke-width="54" stroke-linecap="round"/><path d="M268 236H380" stroke="url(#gr-gold)" stroke-width="54" stroke-linecap="round"/><path d="M118 426H320" stroke="url(#gr-gold)" stroke-width="24" stroke-linecap="round"/><path d="M354 426H396" stroke="#FFE066" stroke-opacity="0.55" stroke-width="24" stroke-linecap="round"/></svg>';

var PRO_ICONS={
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  library:'<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  pen:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus:'<path d="M5 12h14"/>',
  contrast:'<circle cx="12" cy="12" r="10"/><path d="M12 18a6 6 0 0 0 0-12v12z" fill="currentColor"/>',
  gear:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  close:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  list:'<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  note:'<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><polyline points="15 3 15 9 21 9"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="13" y1="17" y2="17"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  right:'<path d="m9 18 6-6-6-6"/>',
  focus:'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  more:'<circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/><circle cx="5" cy="12" r="1.4" fill="currentColor"/>',
  grip:'<circle cx="9" cy="5" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="19" r="1.3" fill="currentColor"/><circle cx="15" cy="5" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="19" r="1.3" fill="currentColor"/>',
  sync:'<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  eye:'<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  cpu:'<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  keyboard:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/>',
  zoomIn:'<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
  zoomOut:'<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>',
  columns:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
  crop:'<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
};

function icon(n,sz){
  var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 24 24');
  s.setAttribute('width',sz||18);
  s.setAttribute('height',sz||18);
  s.setAttribute('fill','none');
  s.setAttribute('stroke','currentColor');
  s.setAttribute('stroke-width','1.65');
  s.setAttribute('stroke-linecap','round');
  s.setAttribute('stroke-linejoin','round');
  s.setAttribute('aria-hidden','true');
  s.innerHTML=PRO_ICONS[n]||ICONS[n]||'';
  return s;
}

/* Pro Tercihleri (Preferences) Varsayılanları ve Anlık Reaktif Uygulama (32 GB RAM Ultra Profili) */
function ensureProPrefs(){
  if(P.uiScale==null) P.uiScale='normal';
  if(P.anim==null) P.anim=true;
  if(P.pdfDefaultZoom==null) P.pdfDefaultZoom=100;
  if(P.pdfDprBoost==null) P.pdfDprBoost=3;
  if(P.pdfSpread==null) P.pdfSpread='single';
  if(P.pdfFilter==null) P.pdfFilter='auto';
  if(P.pdfWidth==null) P.pdfWidth='normal';
  if(P.pdfCrop==null) P.pdfCrop=false;
  if(P.pdfTextLayer==null) P.pdfTextLayer=true;
  if(P.gpuAccel==null) P.gpuAccel=true;
  if(P.pdfBufferPages==null) P.pdfBufferPages=4;
  if(P.pdfMaxCanvasDim==null) P.pdfMaxCanvasDim=8192;
  if(P.fpsTarget==null) P.fpsTarget=120;
  if(P.showFps==null) P.showFps=false;
  if(!P._ram32Upgraded){
    P.pdfDprBoost=Math.max(3,Number(P.pdfDprBoost)||3);
    P.pdfBufferPages=Math.max(4,Number(P.pdfBufferPages)||4);
    P.pdfMaxCanvasDim=Math.max(8192,Number(P.pdfMaxCanvasDim)||8192);
    P._ram32Upgraded=true;
    try{savePrefs();}catch(e){}
  }
}

var _origApplyPrefs=applyPrefs;
applyPrefs=function(){
  ensureProPrefs();
  _origApplyPrefs();
  var r=document.documentElement;
  r.setAttribute('data-ui-scale',P.uiScale||'normal');
  r.setAttribute('data-anim',P.anim===false?'off':'on');
  updateFpsMonitorState();
};

/* Canlı FPS Telemetri Rozeti */
var fpsMon={el:null,raf:0,frames:0,lastT:0,cur:120};
function ensureFpsBadge(){
  if(fpsMon.el) return fpsMon.el;
  var el=h('div',{class:'fps-badge',id:'fps-badge',hidden:true},h('span',{class:'fps-dot'}),h('span',{id:'fps-txt',text:'120 FPS'}));
  document.body.appendChild(el);
  fpsMon.el=el;
  return el;
}
function fpsTick(now){
  if(!P.showFps){fpsMon.raf=0;return;}
  fpsMon.frames++;
  if(!fpsMon.lastT) fpsMon.lastT=now;
  var dt=now-fpsMon.lastT;
  if(dt>=500){
    fpsMon.cur=Math.min(240,Math.max(1,Math.round((fpsMon.frames*1000)/dt)));
    fpsMon.frames=0;
    fpsMon.lastT=now;
    var t=$('fps-txt');
    if(t) t.textContent=fpsMon.cur+' FPS';
  }
  fpsMon.raf=requestAnimationFrame(fpsTick);
}
function updateFpsMonitorState(){
  var b=ensureFpsBadge();
  if(P.showFps){
    b.hidden=false;
    if(!fpsMon.raf){fpsMon.frames=0;fpsMon.lastT=performance.now();fpsMon.raf=requestAnimationFrame(fpsTick);}
  }else{
    b.hidden=true;
    if(fpsMon.raf){cancelAnimationFrame(fpsMon.raf);fpsMon.raf=0;}
  }
}

/* ---------- 2. İKİ AŞAMALI (DUAL-PHASE) 120FPS + ODAK KİLİTLİ (ANCHOR-LOCKED) YAKINLAŞTIRMA MOTORU ----------
   BÖLÜM 3 & 4 MİMARİSİ:
   - Aşama 1 (0ms Gecikme / 120 FPS Aktif Hareket): Kullanıcı touchpad 2-parmak pinch (Ctrl+Wheel) yaparken
     fare imlecinin altındaki tam noktayı (pinchLocalX, pinchLocalY) milimetrik olarak ekranda sabit tutarak
     sayfayı GPU katmanında anlık ölçekler (sıfır yukarı kayma, sıfır sapma).
   - Aşama 2 (Hareket Durduktan 80ms Sonra — Vektör & HiDPI Keskinleştirme):
     * Markdown/LaTeX okuyucuda: 3D bitmap önbelleğini kaldırıp 2D vektör rasterizasyonuna geçer.
     * PDF okuyucuda: Çift Tamponlu (Double-Buffered) Offscreen Canvas üzerinde
       32 GB RAM destekli 3x/4x HiDPI (8K/12K) çözünürlükte yeniden çizip sıfır titremeyle ön plana geçirir. */
var Z={
  scale:1,
  panX:0,
  panY:0,
  raf:0,
  pill:null,
  settleTimer:0,
  gestureActive:false,
  pinchActive:false,
  pinchLocalX:0,
  pinchLocalY:0,
  pinchClientX:0,
  pinchClientY:0,
  lastClientX:null,
  lastClientY:null
};

function ensureZoomPill(){
  if(Z.pill) return Z.pill;
  var p=h('button',{
    class:'zoom-pill',
    id:'zoom-pill',
    type:'button',
    hidden:true,
    title:'Yakınlaştırmayı sıfırla (Ctrl+0)',
    onclick:function(){resetReaderZoom();}
  });
  document.body.appendChild(p);
  Z.pill=p;
  return p;
}

function effectiveZoomScale(){
  var vv=window.visualViewport?window.visualViewport.scale:1;
  var pdfZ=(RD&&RD.isPdf&&RD.pdfZoom)?RD.pdfZoom:1;
  return Math.max(Z.scale,vv||1,pdfZ);
}

function getZoomPct(){
  return Math.round(effectiveZoomScale()*100);
}

function updateZoomPill(){
  var pill=ensureZoomPill();
  var pct=getZoomPct();
  var pdfLbl=$('pdf-zoom-lbl');
  if(pdfLbl) pdfLbl.textContent='%'+pct;
  var hudZoomLbl=$('hud-zoom-val');
  if(hudZoomLbl) hudZoomLbl.textContent='%'+pct;
  if(pct===100){
    pill.hidden=true;
  }else{
    pill.hidden=false;
    pill.innerHTML='<span>%'+pct+'</span><small>Sıfırla</small>';
  }
}

function applyGpuScreenZoom(){
  Z.raf=0;
  var v=$('view');
  if(!v) return;
  if(Z.scale<=1.003){
    Z.scale=1;
    Z.panX=0;
    Z.panY=0;
    v.style.transform='';
    v.style.willChange='';
    v.style.marginBottom='';
  }else{
    var vw=window.innerWidth||1280;
    var maxPan=Math.max(0,vw*(Z.scale-1));
    if(Z.panX>0) Z.panX=0;
    if(Z.panX<-maxPan) Z.panX=-maxPan;
    var py=Z.panY||0;
    if(Z.gestureActive){
      v.style.willChange='transform';
      v.style.transform='translate3d('+Z.panX.toFixed(2)+'px,'+py.toFixed(2)+'px,0px) scale3d('+Z.scale.toFixed(4)+','+Z.scale.toFixed(4)+',1)';
    }else{
      v.style.willChange='auto';
      v.style.transform='translate('+Z.panX.toFixed(2)+'px,'+py.toFixed(2)+'px) scale('+Z.scale.toFixed(4)+')';
    }
  }
  updateZoomPill();
}

function settleScreenZoom(){
  Z.gestureActive=false;
  Z.pinchActive=false;
  applyGpuScreenZoom();
  if(RD&&RD.isPdf){
    schedulePdfRenderQueue();
  }
}

function setReaderZoom(targetScale,opts){
  opts=opts||{};
  var minZ=(RD&&RD.isPdf)?0.5:1.0;
  var maxZ=5.0;
  var next=Math.max(minZ,Math.min(maxZ,Number(targetScale)||1));
  if(Math.abs(next-1)<0.012&&!opts.fromGesture) next=1;

  var prev=Z.scale||1;
  if(Math.abs(next-prev)<0.0005&&!opts.force) return Z.scale;

  var v=$('view');
  var vw=window.innerWidth||1280;
  var vh=window.innerHeight||800;
  var cx=opts.clientX!=null?opts.clientX:(Z.lastClientX!=null?Z.lastClientX:(vw/2));
  var cy=opts.clientY!=null?opts.clientY:(Z.lastClientY!=null?Z.lastClientY:(vh/2));

  if(!v){
    Z.scale=next;
    if(RD&&RD.isPdf) RD.pdfZoom=next;
    updateZoomPill();
    return Z.scale;
  }

  // Mevcut sahne kutusunun ekrandaki gerçek konumunu al (transform dahil)
  var rect=v.getBoundingClientRect();
  var curScrollY=window.scrollY||document.documentElement.scrollTop||0;
  // #view'ın ölçeklenmemiş doküman içi tepe Y koordinatı (panY etkisinden arındırılmış)
  var vDocTop=(rect.top-(Z.panY||0))+curScrollY;

  var localX,localY;
  if(opts.fromGesture){
    if(!Z.pinchActive){
      Z.pinchActive=true;
      Z.pinchLocalX=(cx-rect.left)/prev;
      Z.pinchLocalY=(cy-rect.top)/prev;
      Z.pinchClientX=cx;
      Z.pinchClientY=cy;
    }else{
      // Pinch sırasında parmak/imleç hafif hareket ettiyse yerel koordinatı kaymasız güncelle
      Z.pinchLocalX+=(cx-Z.pinchClientX)/prev;
      Z.pinchLocalY+=(cy-Z.pinchClientY)/prev;
      Z.pinchClientX=cx;
      Z.pinchClientY=cy;
    }
    localX=Z.pinchLocalX;
    localY=Z.pinchLocalY;
  }else{
    Z.pinchActive=false;
    localX=(cx-rect.left)/prev;
    localY=(cy-rect.top)/prev;
  }

  // 1) Yatay Odak Kilidi (Z.panX): localX noktası yeni ölçekte de tam cx ekran koordinatında kalır
  Z.panX=cx-localX*next;
  var maxPan=Math.max(0,vw*(next-1));
  if(Z.panX>0) Z.panX=0;
  if(Z.panX<-maxPan) Z.panX=-maxPan;

  // 2) Alt Boşluk (Margin-Bottom) Dengeleyici: Ölçek büyüdüğünde scrollTo'nun tavan sınırına çarpıp yukarı zıplamasını %100 önler
  var unscaledH=Math.max(vh,v.offsetHeight||vh);
  if(next>1.003){
    v.style.marginBottom=Math.ceil(unscaledH*(next-1))+'px';
  }else{
    v.style.marginBottom='';
  }

  // 3) Dikey Odak Kilidi (window.scrollY + alt-piksel Z.panY): localY noktası yeni ölçekte de tam cy ekran koordinatında kalır
  Z.scale=next;
  if(RD){
    RD.userMoved=true;
    if(RD.isPdf) RD.pdfZoom=next;
  }
  Z.gestureActive=!!opts.fromGesture;

  if(next<=1.003){
    Z.panY=0;
    var targetY0=Math.max(0,Math.round(vDocTop+localY*next-cy));
    window.scrollTo(0,targetY0);
  }else{
    var idealScrollY=vDocTop+localY*next-cy;
    var targetScrollY=Math.max(0,Math.round(idealScrollY));
    window.scrollTo(0,targetScrollY);
    var actualScrollY=window.scrollY||document.documentElement.scrollTop||0;
    // Yuvarlama farkını veya sayfa tepesi sınırını Z.panY ile telafi et (yalnızca makul aralıkta)
    var remY=actualScrollY-idealScrollY;
    if(actualScrollY===0&&idealScrollY<0){
      remY=Math.min(Math.max(0,-idealScrollY),cy);
    }else if(Math.abs(remY)>4){
      remY=0;
    }
    Z.panY=remY;
  }

  applyGpuScreenZoom();
  clearTimeout(Z.settleTimer);
  Z.settleTimer=setTimeout(settleScreenZoom,opts.fromGesture?85:20);
  return Z.scale;
}

function resetReaderZoom(opts){
  opts=opts||{};
  Z.scale=1;
  Z.panX=0;
  Z.panY=0;
  Z.gestureActive=false;
  Z.pinchActive=false;
  if(RD&&RD.isPdf) RD.pdfZoom=1;
  applyGpuScreenZoom();
  if(window.gioNative&&window.gioNative.setZoom) window.gioNative.setZoom(1).catch(function(){});
  updateZoomPill();
  if(RD&&RD.isPdf&&!opts.silent) schedulePdfRenderQueue();
}

window.__gioZoomStep=function(delta){
  setReaderZoom(effectiveZoomScale()+(delta||0.15));
};
window.__gioZoomReset=resetReaderZoom;

(function initTouchpadScreenZoom(){
  window.addEventListener('mousemove',function(e){
    Z.lastClientX=e.clientX;
    Z.lastClientY=e.clientY;
  },{passive:true});

  window.addEventListener('scroll',function(){
    if(!Z.gestureActive){
      Z.pinchActive=false;
      if(Z.panY&&Math.abs(Z.panY)<2){
        Z.panY=0;
      }
    }
  },{passive:true});

  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',function(){
      updateZoomPill();
      clearTimeout(Z.settleTimer);
      Z.settleTimer=setTimeout(settleScreenZoom,90);
    },{passive:true});
  }
  window.addEventListener('wheel',function(e){
    if(overlay.el&&(overlay.el.classList.contains('modal')||overlay.el.contains(e.target))) return;
    if(e.ctrlKey||e.metaKey){
      e.preventDefault();
      Z.lastClientX=e.clientX;
      Z.lastClientY=e.clientY;
      // Touchpad pinch küçük deltaY üretir (~1..15), fare tekerleği büyük deltaY üretir (~100)
      var rawDelta=e.deltaMode===1?(e.deltaY*18):e.deltaY;
      var clampedDelta=Math.max(-60,Math.min(60,rawDelta));
      var factor=Math.exp(-clampedDelta*0.0055);
      var minZ=(RD&&RD.isPdf)?0.5:1.0;
      var next=Math.max(minZ,Math.min(5.0,Z.scale*factor));
      setReaderZoom(next,{clientX:e.clientX,clientY:e.clientY,fromGesture:true});
      return;
    }
    // Normal kaydırma başladığında pinch çapasını sıfırla
    Z.pinchActive=false;
    if(Z.scale>1.01&&Math.abs(e.deltaX)>0.4){
      var vw=window.innerWidth||1280;
      var maxPan=Math.max(0,vw*(Z.scale-1));
      Z.panX=Math.max(-maxPan,Math.min(0,Z.panX-e.deltaX));
      if(!Z.raf) Z.raf=requestAnimationFrame(applyGpuScreenZoom);
    }
  },{passive:false});
})();

/* ---------- 3. OKUYUCU METİN SEÇİM KORUMASI & KESİNTİSİZ NATIVE SEÇİM MOTORU ---------- */
function hideSelTools(){}
function paintHighlights(){}

// PDF ve Markdown okuyucuda fare bırakıldığında seçim modunu temizle
window.addEventListener('mouseup',function(){
  document.querySelectorAll('.pdf-text-layer.selecting, .textLayer.selecting').forEach(function(el){
    el.classList.remove('selecting');
  });
},true);

// Sayfalar arası kontrolsüz seçim yayılmasını önleyen koruma
document.addEventListener('selectionchange',function(){
  var sel=window.getSelection();
  if(!sel||sel.isCollapsed) return;
  if(RD&&RD.isPdf){
    try{
      var range=sel.getRangeAt(0);
      var sc=range.startContainer,ec=range.endContainer;
      var sCard=sc.nodeType===3?sc.parentElement.closest('.pdf-page-card'):(sc.closest?sc.closest('.pdf-page-card'):null);
      var eCard=ec.nodeType===3?ec.parentElement.closest('.pdf-page-card'):(ec.closest?ec.closest('.pdf-page-card'):null);
      // Eğer seçim farklı sayfalar arasına taşmışsa, başlangıç sayfasında sınırla
      if(sCard&&eCard&&sCard!==eCard){
        sel.collapse(sc,range.startOffset);
      }
    }catch(e){}
  }
});

/* ---------- 4. BÖLÜM 2, 3, 4: SIFIR HATALI EVRENSEL PDF MOTORU + DOUBLE-BUFFERED HIDPI + SANAL KAYDIRICI ---------- */
var pdfDocCache={};
var pdfBinCache={};

function ensurePdfWorker(){
  if(!window.pdfjsLib) return;
  try{
    if(!window.pdfjsLib.GlobalWorkerOptions.workerSrc){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.min.js',window.location.href).href;
    }
  }catch(e){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';
  }
}

/* Her türlü ikili veriyi bağımsız (detached olmayan) Uint8Array'e dönüştürür ve %PDF- başlığını doğrular */
function normalizePdfBytes(raw){
  if(!raw) return null;
  var u8=null;
  if(raw instanceof Uint8Array){
    u8=new Uint8Array(raw.byteLength);
    u8.set(raw);
  }else if(raw instanceof ArrayBuffer){
    u8=new Uint8Array(raw.byteLength);
    u8.set(new Uint8Array(raw));
  }else if(ArrayBuffer.isView(raw)){
    u8=new Uint8Array(raw.byteLength);
    u8.set(new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength));
  }else if(Array.isArray(raw)){
    u8=new Uint8Array(raw);
  }else if(typeof raw==='object'&&raw.type==='Buffer'&&Array.isArray(raw.data)){
    u8=new Uint8Array(raw.data);
  }
  if(!u8||u8.byteLength<8) return null;
  // İlk 1024 bayt içinde %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D) imzasını ara ve başındaki çöp baytları temizle
  var scanLim=Math.min(1024,u8.byteLength-5);
  for(var i=0;i<=scanLim;i++){
    if(u8[i]===0x25&&u8[i+1]===0x50&&u8[i+2]===0x44&&u8[i+3]===0x46&&u8[i+4]===0x2D){
      return i>0?u8.slice(i):u8;
    }
  }
  return u8;
}

function readBlobAsUint8Array(blob){
  if(blob&&typeof blob.arrayBuffer==='function'){
    return blob.arrayBuffer().then(function(ab){return normalizePdfBytes(ab);});
  }
  return new Promise(function(resolve,reject){
    try{
      var fr=new FileReader();
      fr.onload=function(){resolve(normalizePdfBytes(fr.result));};
      fr.onerror=function(){reject(new Error('Dosya okunamadı'));};
      fr.readAsArrayBuffer(blob);
    }catch(err){reject(err);}
  });
}

async function loadPdfBinary(source){
  ensurePdfWorker();
  if(!source) throw new Error('PDF kaynağı belirtilmedi');
  var cKey=source.cacheKey||source.id||source.externalPath||source.path||(source.pdfFn&&source.pdfFn.join('/'))||'';
  if(cKey&&pdfBinCache[cKey]){
    return pdfBinCache[cKey].slice(0);
  }
  // 1) Doğrudan Uint8Array / ArrayBuffer / data alanı
  var direct=normalizePdfBytes(source instanceof Uint8Array||source instanceof ArrayBuffer?source:(source.u8||source.data));
  if(direct){
    if(cKey) pdfBinCache[cKey]=direct;
    return direct.slice(0);
  }
  // 2) File veya Blob nesnesi (veya arrayBuffer metodu)
  if(source.file&&(source.file instanceof Blob||typeof source.file.arrayBuffer==='function')){
    var fromFile=await readBlobAsUint8Array(source.file);
    if(fromFile){
      if(cKey) pdfBinCache[cKey]=fromFile;
      return fromFile.slice(0);
    }
  }
  if(source instanceof Blob||typeof source.arrayBuffer==='function'){
    var fromAb=await readBlobAsUint8Array(source);
    if(fromAb){
      if(cKey) pdfBinCache[cKey]=fromAb;
      return fromAb.slice(0);
    }
  }
  // 3) Harici dosya yolu (source.externalPath VEYA source.path)
  var extPath=source.externalPath||source.path||'';
  if(!extPath&&source.file&&NATIVE&&NATIVE.getPathForFile){
    try{extPath=NATIVE.getPathForFile(source.file)||'';}catch(e){}
  }
  if(extPath&&NATIVE&&NATIVE.readExternalBin){
    try{
      var rExt=await NATIVE.readExternalBin(extPath);
      var bExt=rExt&&normalizePdfBytes(rExt.data||rExt.u8);
      if(bExt){
        if(cKey) pdfBinCache[cKey]=bExt;
        return bExt.slice(0);
      }
    }catch(e){}
  }
  // 4) Kütüphane içi dosya yolu (source.pdfFn VEYA source.fn)
  var fnArr=source.pdfFn||source.fn||null;
  if(fnArr&&fnArr.length&&NATIVE&&NATIVE.readBin){
    try{
      var rBin=await NATIVE.readBin(fnArr);
      var bBin=rBin&&normalizePdfBytes(rBin.data||rBin.u8);
      if(bBin){
        if(cKey) pdfBinCache[cKey]=bBin;
        return bBin.slice(0);
      }
    }catch(e){}
  }
  if(fnArr&&fnArr.length&&FS.h){
    try{
      var d=await fsDir(fnArr.slice(0,-1),false);
      var fh=await d.getFileHandle(fnArr[fnArr.length-1]);
      var f=await fh.getFile();
      var bFs=await readBlobAsUint8Array(f);
      if(bFs){
        if(cKey) pdfBinCache[cKey]=bFs;
        return bFs.slice(0);
      }
    }catch(e){}
  }
  // 5) IndexedDB ikili yedek deposu (dosya taşınmış veya silinmiş olsa bile kurtarır!)
  if(source.id){
    try{
      var idbRaw=await idbGet('pdfbin:'+source.id);
      var bIdb=normalizePdfBytes(idbRaw);
      if(bIdb){
        if(cKey) pdfBinCache[cKey]=bIdb;
        return bIdb.slice(0);
      }
    }catch(e){}
  }
  throw new Error('PDF dosyasına erişilemedi. Lütfen dosyayı yeniden seçin.');
}

/* Şifreli PDF belgeleri için şık şifre giriş modalı */
function promptPdfPassword(reason,cb){
  var msg=reason===2?'Girilen şifre hatalı. Lütfen tekrar deneyin:':'Bu PDF belgesi parola korumalıdır. Açmak için şifreyi girin:';
  var inp=h('input',{type:'password',class:'inp',placeholder:'PDF şifresi…',autofocus:true});
  var sub=function(){
    var v=inp.value;
    if(!v) return;
    closeOverlay();
    cb(v);
  };
  inp.addEventListener('keydown',function(e){if(e.key==='Enter') sub();});
  modal('Şifreli PDF Belgesi',h('div',{class:'form'},
    h('div',{class:'row'},icon('lock',20),h('p',{style:{margin:0},text:msg})),
    inp,
    h('div',{class:'row end'},btn('Vazgeç','ghost',function(){closeOverlay();cb(null);}),btn('Belgeyi Aç','primary',sub,'check'))));
}

/* Hata toleranslı, CMap/Font/XFA/Şifre destekli ve otomatik Worker Fallback'li PDF.js Belge Açıcı */
async function openPdfDocumentRobust(u8,opts){
  opts=opts||{};
  ensurePdfWorker();
  if(!window.pdfjsLib||!window.pdfjsLib.getDocument) throw new Error('PDF motoru hazır değil');
  async function tryOpen(disableWorker){
    var params={
      data:u8.slice(0),
      cMapUrl:'cmaps/',
      cMapPacked:true,
      standardFontDataUrl:'standard_fonts/',
      useSystemFonts:true,
      disableFontFace:false,
      isEvalSupported:false,
      stopAtErrors:false,
      enableXfa:true,
      disableWorker:!!disableWorker,
      verbosity:0
    };
    var task=window.pdfjsLib.getDocument(params);
    task.onPassword=function(updatePassword,reason){
      promptPdfPassword(reason,function(pw){
        if(pw==null){try{task.destroy();}catch(e){}return;}
        updatePassword(pw);
      });
    };
    if(opts.onProgress){
      task.onProgress=function(p){
        if(p&&p.total>0) opts.onProgress(Math.min(1,p.loaded/p.total));
      };
    }
    return await task.promise;
  }
  try{
    return await tryOpen(false);
  }catch(err){
    return await tryOpen(true);
  }
}

async function getPdfDocument(cacheKey,source,opts){
  if(cacheKey&&pdfDocCache[cacheKey]) return pdfDocCache[cacheKey];
  var srcObj=Object.assign({cacheKey:cacheKey},source||{});
  var u8=await loadPdfBinary(srcObj);
  var pdfDoc=await openPdfDocumentRobust(u8,opts);
  if(cacheKey){
    pdfDocCache[cacheKey]=pdfDoc;
    pdfBinCache[cacheKey]=u8;
  }
  return pdfDoc;
}

async function extractPdfPageText(pdfDoc,pageNum){
  try{
    var page=await pdfDoc.getPage(pageNum);
    var tc=await page.getTextContent();
    return (tc.items||[]).map(function(it){return it.str||'';}).join(' ').replace(/\s+/g,' ').trim();
  }catch(e){return '';}
}

async function inspectPdfForImport(fileObj,targetUid,onProgress){
  ensurePdfWorker();
  var u8=await loadPdfBinary(fileObj);
  var pdfDoc=await openPdfDocumentRobust(u8,{onProgress:onProgress});
  var numPages=pdfDoc.numPages||1;
  var metaTitle='';
  try{
    var md=await pdfDoc.getMetadata();
    if(md&&md.info&&md.info.Title&&String(md.info.Title).trim().length>=3){
      var mt=String(md.info.Title).trim();
      if(!/^(?:untitled|microsoft\s+word|powerpoint|\.pdf|adsız)/i.test(mt)) metaTitle=titleClean(mt);
    }
  }catch(e){}
  var p1Text=await extractPdfPageText(pdfDoc,1);
  var fnBase=String(fileObj.name||'belge.pdf').replace(/\.pdf$/i,'').replace(/^(?:Unite|Ünite|Part|Bolum|Bölüm)[_\s-]*\d+[_\s-]*/i,'').replace(/[_\-]+/g,' ').trim();
  var singleTitle=metaTitle||shortTitle(fnBase,68)||shortTitle(p1Text.slice(0,90),68)||'PDF Ders Notu';
  var outlineItems=[];
  try{
    var outline=await pdfDoc.getOutline();
    if(Array.isArray(outline)&&outline.length){
      for(var i=0;i<outline.length;i++){
        var it=outline[i];
        var pageNo=1;
        try{
          var dest=typeof it.dest==='string'?await pdfDoc.getDestination(it.dest):it.dest;
          if(Array.isArray(dest)&&dest[0]){
            var pIdx=await pdfDoc.getPageIndex(dest[0]);
            pageNo=pIdx+1;
          }
        }catch(e){}
        if(it.title&&it.title.trim()){
          outlineItems.push({title:titleClean(it.title),startPage:pageNo});
        }
      }
      outlineItems.sort(function(a,b){return a.startPage-b.startPage;});
      for(var j=0;j<outlineItems.length;j++){
        outlineItems[j].endPage=(j+1<outlineItems.length)?Math.max(outlineItems[j].startPage,outlineItems[j+1].startPage-1):numPages;
      }
    }
  }catch(e){}
  return {
    name:fileObj.name||'belge.pdf',
    externalPath:fileObj.externalPath||fileObj.path||'',
    u8:u8,
    pdfDoc:pdfDoc,
    numPages:numPages,
    singleTitle:singleTitle,
    outline:outlineItems,
    firstPageText:p1Text,
    targetUid:targetUid||targetUnitId()
  };
}

/* ---------- Ünite Kaynak Ağacı & Soru/Ek Materyal Yönetimi ---------- */
function subPartsOfUnit(uid){
  return allParts().filter(function(p){
    return p.uid===uid&&(p.role==='supplementary'||p.subGroup);
  }).sort(function(a,b){
    return (a.subNo||a.no||0)-(b.subNo||b.no||0);
  });
}

function mainPartsOfUnit(uid){
  return allParts().filter(function(p){
    return p.uid===uid&&p.role!=='supplementary'&&!p.subGroup;
  }).sort(function(a,b){
    return (a.no||0)-(b.no||0);
  });
}

function movePartToSubGroup(pid,groupName){
  var p=S.parts[pid];if(!p) return false;
  groupName=groupName||'Sorular & Alıştırmalar';
  p.role='supplementary';
  p.subGroup=groupName;
  var existingSubs=subPartsOfUnit(p.uid);
  p.subNo=existingSubs.length+1;
  p.no=null;
  touch('p:'+p.id);
  var un=getUnit(p.uid);
  if(un){
    var mps=mainPartsOfUnit(un.id);
    var maxNo=0;
    mps.forEach(function(x){if(x.no>maxNo) maxNo=x.no;});
    un.n=Math.max(1,maxNo);
    updateUnit(un);
  }
  return true;
}

function movePartToMainFlow(pid,targetNo){
  var p=S.parts[pid];if(!p) return false;
  var un=getUnit(p.uid);if(!un) return false;
  delete p.role;
  delete p.subGroup;
  delete p.subNo;
  var n=targetNo||firstEmpty(un.id)||(un.n+1);
  p.no=n;
  touch('p:'+p.id);
  if(n>un.n){un.n=n;updateUnit(un);}
  return true;
}

function autoMigrateQuestionsToTree(uid){
  var un=getUnit(uid);if(!un) return 0;
  var ps=partsOfUnit(uid);
  var moved=0;
  ps.forEach(function(p){
    // SADECE VE SADECE PDF DOSYALARI! Markdown ve el yazısı partlara ASLA dokunulamaz!
    if(p.kind!=='pdf') return;
    if(p.role==='supplementary'||p.subGroup) return;
    if(/suggested|problem|soru|exercise|alıştırma|homework|ödev|hw|quiz|exam|sınav/i.test(p.title)){
      movePartToSubGroup(p.id,'Sorular & Alıştırmalar');
      moved++;
    }
  });
  if(moved){
    healLibraryMetadata();
    if(window.fsWriteAll) window.fsWriteAll();
  }
  return moved;
}

async function storePdfPartInUnit(uid,no,title,sess,startPage,endPage,extraOpts){
  extraOpts=extraOpts||{};
  var un=getUnit(uid);if(!un) return null;
  var c=getCourse(un.cid);if(!c) return null;
  var cSlug=slug(c.name,60),uSlug=slug(un.name,60);
  var safePdfName=slug(String(sess.name||'belge').replace(/\.pdf$/i,''),70)+'.pdf';
  var pdfFn=[cSlug,uSlug,safePdfName];
  if(NATIVE){
    try{
      if(sess.u8&&NATIVE.writeBin){
        await NATIVE.writeBin(pdfFn,sess.u8);
      }else if(sess.externalPath&&NATIVE.copyExternalTo){
        await NATIVE.copyExternalTo(sess.externalPath,pdfFn);
      }
    }catch(e){}
  }else if(FS.h&&sess.u8){
    try{
      var d=await fsDir([cSlug,uSlug],true);
      var fh=await d.getFileHandle(safePdfName,{create:true});
      var w=await fh.createWritable();
      await w.write(sess.u8);
      await w.close();
    }catch(e){}
  }
  var sPg=Math.max(1,startPage||1),ePg=Math.min(sess.numPages,endPage||sess.numPages);
  var pageCount=Math.max(1,ePg-sPg+1);
  var sampleTexts=[];
  var maxSample=Math.min(ePg,sPg+7);
  for(var pg=sPg;pg<=maxSample;pg++){
    var pt=await extractPdfPageText(sess.pdfDoc,pg);
    if(pt) sampleTexts.push('[Sayfa '+pg+'] '+pt);
  }
  var combinedText='# '+title+'\n\n'+sampleTexts.join('\n\n');
  var minutes=Math.max(1,Math.round(pageCount*1.6));
  var isTree=extraOpts.role==='supplementary'||!!extraOpts.subGroup;
  var now=Date.now(),ex=(!isTree&&no)?slotPart(uid,no):null,p;
  if(ex){
    p=ex;
    p.kind='pdf';p.title=title;p.pdfFn=pdfFn;p.externalPath=sess.externalPath||'';p.pdfStart=sPg;p.pdfEnd=ePg;p.pageCount=pageCount;
    p.text=combinedText;p.minutes=minutes;p.u=now;
  }else{
    p={
      id:uidGen('p'),cid:un.cid,uid:uid,no:isTree?null:no,
      kind:'pdf',title:title,pdfFn:pdfFn,externalPath:sess.externalPath||'',pdfStart:sPg,pdfEnd:ePg,pageCount:pageCount,
      text:combinedText,minutes:minutes,added:now,u:now
    };
    if(isTree){
      p.role='supplementary';
      p.subGroup=extraOpts.subGroup||'Sorular & Alıştırmalar';
      p.subNo=extraOpts.subNo||(subPartsOfUnit(uid).length+1);
    }
    S.parts[p.id]=p;
  }
  pdfDocCache[p.id]=sess.pdfDoc;
  if(sess.u8){
    pdfBinCache[p.id]=sess.u8;
    try{if(sess.u8.byteLength<=65*1024*1024) idbPut('pdfbin:'+p.id,sess.u8);}catch(e){}
  }
  touch('p:'+p.id);
  if(!isTree&&no&&no>un.n){un.n=no;updateUnit(un);}
  UI.lastUnit=uid;UI.lastCourse=un.cid;saveUI();
  return p;
}

function openPdfImporter(fileObj,opts){
  opts=opts||{};
  var uid=opts.uid||targetUnitId();
  if(!courses().length){openSetup();return;}
  if(!allUnits().length){openUnitSheet(null,courses()[0].id);return;}
  var u=uid?getUnit(uid):allUnits()[0];
  uid=u.id;
  var cid=u.cid;
  var progFill=h('div',{class:'pdf-loading-fill'});
  var box=modal('PDF Ders Dosyası Yükle',h('div',{class:'form'},
    h('p',{class:'muted',text:'PDF belgesi ikili (Uint8Array) motorla analiz ediliyor…'}),
    h('div',{class:'pdf-loading-bar'},progFill)),{wide:true});

  inspectPdfForImport(fileObj,uid,function(ratio){
    progFill.style.width=Math.max(12,Math.round(ratio*100))+'%';
  }).then(function(sess){
    clear(box);
    box.appendChild(h('div',{class:'sheet-h'},h('h2',{text:'PDF İçe Aktar · '+sess.name}),ibtn('close','Kapat',closeOverlay)));
    var csel=h('select',{class:'inp','aria-label':'Ders'},courses().map(function(c){return h('option',{value:c.id,text:c.name,selected:c.id===cid});}));
    var usel=h('select',{class:'inp','aria-label':'Ünite'});
    function fillU(){
      clear(usel);
      unitsOf(cid).forEach(function(x){usel.appendChild(h('option',{value:x.id,text:x.name+' ('+partsOfUnit(x.id).length+'/'+x.n+')',selected:x.id===uid}));});
    }
    fillU();
    var fe=firstEmpty(uid)||(getUnit(uid)?getUnit(uid).n+1:1);
    var numF=numField(opts.no||fe,1,300);
    var titleI=h('input',{type:'text',class:'inp',value:sess.singleTitle,maxLength:140});
    var pStartI=h('input',{type:'number',class:'inp num',min:1,max:sess.numPages,value:1});
    var pEndI=h('input',{type:'number',class:'inp num',min:1,max:sess.numPages,value:sess.numPages});
    var chunkF=numField(10,1,sess.numPages);
    var mode='single';

    var isQuestion=/suggested|problem|soru|exercise|alıştırma|homework|ödev|hw|quiz|exam|sınav/i.test(sess.name+' '+sess.singleTitle);
    var targetRole=opts.role==='supplementary'?'tree':(isQuestion?'tree':'main');
    var targetSubGroup=opts.subGroup||(isQuestion?'Sorular & Alıştırmalar':'Ek Kaynaklar');

    var groupI=h('input',{type:'text',class:'inp',value:targetSubGroup,placeholder:'Grup Adı (Örn: Sorular & Alıştırmalar)'});
    var groupF=h('div',{class:'field grow',hidden:targetRole!=='tree'},
      h('div',{class:'fl',text:'Ağaç Dalı / Grup Adı'}),
      groupI
    );
    var slotF=h('div',{class:'field',hidden:targetRole==='tree'},
      h('div',{class:'fl',text:'Part Yuvası'}),
      numF.el
    );

    var placeSeg=segc('İçerik Konumu & Ağaç Rolü',[
      ['tree','Ünite Ağacı (Sorular & Ek Kaynaklar)'],
      ['main','Ana Ders Akışı (Part N)']
    ],targetRole,function(v){
      targetRole=v;
      groupF.hidden=(v!=='tree');
      slotF.hidden=(v==='tree');
    });

    var singlePane=h('div',{class:'form'},
      placeSeg,
      h('div',{class:'add-fields'},
        slotF,
        groupF,
        h('div',{class:'field grow'},h('div',{class:'fl',text:'Part Başlığı'}),titleI)),
      h('div',{class:'row wrap'},
        h('span',{class:'muted sm',text:'Sayfa aralığı:'}),pStartI,h('span',{text:'–'}),pEndI,
        h('span',{class:'muted sm',text:'(Toplam '+sess.numPages+' sayfa · %100 vektörel/görsel koruma)'})));
    var tocChecks=[];
    var tocPane=h('div',{class:'form',hidden:true});
    if(sess.outline.length){
      var tlist=h('div',{class:'pdf-toc-list'});
      sess.outline.forEach(function(it){
        var cb=h('input',{type:'checkbox',checked:true});
        tocChecks.push({cb:cb,it:it});
        tlist.appendChild(h('label',{class:'pdf-toc-row'},cb,h('span',{text:it.title}),h('em',{text:'Sayfa '+it.startPage+'–'+it.endPage})));
      });
      tocPane.appendChild(h('p',{class:'muted sm',text:'Seçili başlıkların her biri üniteye ayrı bir PDF Partı olarak sırayla eklenir:'}));
      tocPane.appendChild(tlist);
    }else{
      tocPane.appendChild(h('p',{class:'muted sm',text:'Bu PDF dosyasında gömülü İçindekiler (Yer İmleri) tablosu bulunamadı. "Sayfa Sayısına Göre Böl" seçeneğini kullanabilirsin.'}));
    }
    var rangePane=h('div',{class:'form',hidden:true},
      h('div',{class:'field'},h('div',{class:'fl',text:'Her part kaç sayfa olsun?'}),chunkF.el),
      h('p',{class:'muted sm',text:'PDF belgesi ('+sess.numPages+' sayfa) eşit sayfa gruplarına bölünerek sıradaki boş part yuvalarına yerleştirilir.'}));

    csel.addEventListener('change',function(){cid=csel.value;var us=unitsOf(cid);uid=us[0]?us[0].id:null;fillU();if(uid) numF.inp.value=firstEmpty(uid)||1;});
    usel.addEventListener('change',function(){uid=usel.value;if(uid) numF.inp.value=firstEmpty(uid)||1;});

    var modeSeg=segc('İçe Aktarma Modu',[
      ['single','Tek Part Olarak Ekle'],
      ['toc','İçindekilere Göre Böl ('+sess.outline.length+')'],
      ['chunk','Sayfa Sayısına Göre Böl']
    ],mode,function(v){
      mode=v;
      singlePane.hidden=v!=='single';
      tocPane.hidden=v!=='toc';
      rangePane.hidden=v!=='chunk';
    });

    async function doImport(andRead){
      if(!uid||!getUnit(uid)){toast('Önce bir ünite seç');return;}
      if(mode==='single'){
        var no=numF.val();
        var sP=Math.max(1,Math.min(sess.numPages,+pStartI.value||1));
        var eP=Math.max(sP,Math.min(sess.numPages,+pEndI.value||sess.numPages));
        var ttl=titleI.value.trim()||sess.singleTitle;
        var p=await storePdfPartInUnit(uid,no,ttl,sess,sP,eP,{
          role: targetRole==='tree'?'supplementary':'main',
          subGroup: groupI.value.trim()||'Sorular & Alıştırmalar'
        });
        closeOverlay();
        toast('PDF '+(targetRole==='tree'?'Soru Ağacına':('Part '+no))+' eklendi · '+p.pageCount+' sayfa');
        if(andRead) go({v:'reader',pid:p.id});else refresh();
      }else if(mode==='toc'){
        var selItems=tocChecks.filter(function(x){return x.cb.checked;}).map(function(x){return x.it;});
        if(!selItems.length){toast('En az bir bölüm seç');return;}
        var startSlot=firstEmpty(uid)||1,firstPid=null;
        for(var i=0;i<selItems.length;i++){
          while(slotPart(uid,startSlot)) startSlot++;
          var it=selItems[i];
          var pp=await storePdfPartInUnit(uid,startSlot,it.title,sess,it.startPage,it.endPage);
          if(!firstPid&&pp) firstPid=pp.id;
          startSlot++;
        }
        closeOverlay();
        toast(selItems.length+' PDF partı eklendi');
        if(andRead&&firstPid) go({v:'reader',pid:firstPid});else refresh();
      }else if(mode==='chunk'){
        var step=Math.max(1,chunkF.val()),slot=firstEmpty(uid)||1,count=0,fPid=null;
        for(var sp=1;sp<=sess.numPages;sp+=step){
          while(slotPart(uid,slot)) slot++;
          var ep=Math.min(sess.numPages,sp+step-1);
          var cTitle=sess.singleTitle+' (Sayfa '+sp+'–'+ep+')';
          var cp=await storePdfPartInUnit(uid,slot,cTitle,sess,sp,ep);
          if(!fPid&&cp) fPid=cp.id;
          slot++;count++;
        }
        closeOverlay();
        toast(count+' PDF partı eklendi');
        if(andRead&&fPid) go({v:'reader',pid:fPid});else refresh();
      }
    }

    var body=h('div',{class:'form'},
      h('div',{class:'row wrap target'},csel,usel),
      h('div',{class:'detect ok',text:sess.name+' · '+sess.numPages+' sayfa · Dual-Phase HiDPI PDF Motoru hazır'}),
      modeSeg,
      singlePane,tocPane,rangePane,
      h('div',{class:'row end wrap'},
        btn('Vazgeç','ghost',closeOverlay),
        btn('Ekle ve Oku','',function(){doImport(true);},'book'),
        btn('Kitaplığa Ekle','primary',function(){doImport(false);},'plus')));
    box.appendChild(body);
  }).catch(function(err){
    closeOverlay();
    toast('PDF okunamadı: '+String(err&&err.message||err));
  });
}

/* Toplu PDF İçe Aktarıcı (Batch Multi-PDF Importer) */
async function openMultiPdfImporter(fileList,opts){
  opts=opts||{};
  var rawArr=Array.isArray(fileList)?fileList:Array.prototype.slice.call(fileList||[]);
  if(!rawArr.length){
    toast('İçe aktarılacak dosya bulunamadı.');
    return;
  }
  if(rawArr.length===1){
    openPdfImporter(rawArr[0],opts);
    return;
  }
  var uid=opts.uid||targetUnitId();
  if(!courses().length){openSetup();return;}
  if(!allUnits().length){openUnitSheet(null,courses()[0].id);return;}
  var u=uid?getUnit(uid):allUnits()[0];
  uid=u.id;
  var cid=u.cid;

  var collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
  var items=rawArr.map(function(f){
    var name=f.name||'';
    if(!name&&f.path) name=f.path.split(/[/\\]/).pop();
    var extPath=(NATIVE&&NATIVE.getPathForFile&&(f instanceof File))?NATIVE.getPathForFile(f):(f.externalPath||f.path||'');
    var base=name.replace(/\.pdf$/i,'').replace(/^(?:Unite|Ünite|Part|Bolum|Bölüm)[_\s-]*\d+[_\s-]*/i,'').replace(/[_\-]+/g,' ').trim();
    var cleanT=shortTitle(base,68)||'Ders Belgesi';
    return {
      name:name||'Ders Belgesi.pdf',
      file:(f instanceof File||(f.file instanceof File))?(f.file||f):null,
      externalPath:extPath,
      title:cleanT,
      pageCount:null,
      sess:null
    };
  });
  items.sort(function(a,b){return collator.compare(a.name,b.name);});

  var box=modal('Çoklu PDF İçe Aktar ('+items.length+' Dosya)',h('div',{class:'form'}),{wide:true});
  clear(box);

  box.appendChild(h('div',{class:'sheet-h'},
    h('div',{class:'row gap-sm'},
      icon('file',20),
      h('h2',{text:'Toplu PDF İçe Aktar ('+items.length+' Belge)'})
    ),
    ibtn('close','Kapat',closeOverlay)
  ));

  var csel=h('select',{class:'inp','aria-label':'Ders'},
    courses().map(function(c){return h('option',{value:c.id,text:c.name,selected:c.id===cid});})
  );
  var usel=h('select',{class:'inp','aria-label':'Ünite'});
  function fillU(){
    clear(usel);
    unitsOf(cid).forEach(function(x){
      usel.appendChild(h('option',{
        value:x.id,
        text:x.name+' ('+partsOfUnit(x.id).length+'/'+x.n+')',
        selected:x.id===uid
      }));
    });
  }
  fillU();

  var isQuestionBatch=items.some(function(it){
    return /suggested|problem|soru|exercise|alıştırma|homework|ödev|hw|quiz|exam|sınav/i.test(it.name+' '+it.title);
  });
  var targetRole=opts.role==='supplementary'?'tree':(isQuestionBatch?'tree':'main');
  var targetSubGroup=opts.subGroup||(isQuestionBatch?'Sorular & Alıştırmalar':'Ek Kaynaklar');

  var fe=firstEmpty(uid)||(getUnit(uid)?getUnit(uid).n+1:1);
  var startSlotF=numField(opts.no||fe,1,300);

  var groupI=h('input',{type:'text',class:'inp',value:targetSubGroup,placeholder:'Örn: Sorular & Alıştırmalar'});
  var groupF=h('div',{class:'field grow',hidden:targetRole!=='tree'},
    h('div',{class:'fl',text:'Ağaç Dalı / Grup Adı'}),
    groupI
  );
  var startSlotEl=h('div',{class:'field',style:{width:'130px'},hidden:targetRole==='tree'},
    h('div',{class:'fl',text:'Başlangıç Partı'}),
    startSlotF.el
  );

  var roleSeg=segc('Hedef Yerleşim Düzeni',[
    ['tree','Ünite Ağacı (Sorular & Ek Kaynaklar)'],
    ['main','Ana Ders Akışı (Part 1..N)']
  ],targetRole,function(v){
    targetRole=v;
    groupF.hidden=(v!=='tree');
    startSlotEl.hidden=(v==='tree');
    renderListRows();
  });

  var listWrap=h('div',{class:'multi-pdf-list'});

  function renderListRows(){
    clear(listWrap);
    var startSlot=+startSlotF.inp.value||1;
    items.forEach(function(it,idx){
      var curSlot=startSlot+idx;
      var slotLabel=targetRole==='tree'?('Belge '+(idx+1)):('Part '+curSlot);
      var titleInp=h('input',{
        type:'text',
        class:'inp',
        value:it.title,
        oninput:function(){it.title=titleInp.value.trim()||it.name;}
      });
      var delBtn=ibtn('trash','Listeden çıkar',function(){
        items.splice(idx,1);
        if(!items.length){closeOverlay();toast('Tüm PDF seçimleri kaldırıldı.');return;}
        renderListRows();
      });
      var row=h('div',{class:'multi-pdf-row'},
        h('span',{class:'multi-pdf-slot'+(targetRole==='tree'?' tree-badge-doc':''),text:slotLabel}),
        h('div',{class:'multi-pdf-info'},
          h('span',{class:'multi-pdf-fn',text:it.name+(it.pageCount?' · '+it.pageCount+' sayfa':'')}),
          titleInp
        ),
        delBtn
      );
      listWrap.appendChild(row);
    });
  }

  startSlotF.inp.addEventListener('input',renderListRows);
  csel.addEventListener('change',function(){
    cid=csel.value;
    var us=unitsOf(cid);
    uid=us[0]?us[0].id:null;
    fillU();
    if(uid){
      startSlotF.inp.value=firstEmpty(uid)||1;
      renderListRows();
    }
  });
  usel.addEventListener('change',function(){
    uid=usel.value;
    if(uid){
      startSlotF.inp.value=firstEmpty(uid)||1;
      renderListRows();
    }
  });

  renderListRows();

  (async function inspectAllPages(){
    for(var k=0;k<items.length;k++){
      try{
        var s=await inspectPdfForImport({name:items[k].name,file:items[k].file,externalPath:items[k].externalPath},uid);
        items[k].sess=s;
        items[k].pageCount=s.numPages;
        if(s.singleTitle&&s.singleTitle!=='PDF Ders Notu'&&items[k].title==='Ders Belgesi'){
          items[k].title=s.singleTitle;
        }
      }catch(e){}
    }
    renderListRows();
  })();

  var progFill=h('div',{class:'pdf-loading-fill',style:{width:'0%'}});
  var progBar=h('div',{class:'pdf-loading-bar',style:{display:'none'}},progFill);
  var progStatus=h('p',{class:'muted sm',style:{display:'none',margin:'6px 0 0'}});

  var isImporting=false;
  async function runBatchImport(autoReadFirst){
    if(isImporting||!items.length) return;
    isImporting=true;
    progBar.style.display='block';
    progStatus.style.display='block';
    var startSlot=+startSlotF.inp.value||1;
    var firstImportedPart=null;
    var grpTitle=groupI.value.trim()||'Sorular & Alıştırmalar';

    try{
      for(var i=0;i<items.length;i++){
        var curSlot=startSlot+i;
        var it=items[i];
        progStatus.textContent='İçe aktarılıyor ('+(i+1)+'/'+items.length+'): '+it.name;
        progFill.style.width=Math.round(((i)/items.length)*100)+'%';

        var sess=it.sess;
        if(!sess){
          sess=await inspectPdfForImport({name:it.name,file:it.file,externalPath:it.externalPath},uid);
        }
        var p=await storePdfPartInUnit(uid,targetRole==='tree'?null:curSlot,it.title||it.name,sess,1,sess.numPages,{
          role: targetRole==='tree'?'supplementary':'main',
          subGroup: grpTitle,
          subNo: i+1
        });
        if(!firstImportedPart&&p) firstImportedPart=p;
      }
      progFill.style.width='100%';
      progStatus.textContent='Tüm partlar kaydedildi!';
      await healLibraryMetadata();
      if(window.fsWriteAll) await window.fsWriteAll();

      closeOverlay();
      toast(items.length+' adet PDF '+(targetRole==='tree'?'Soru Ağacına':'Part Akışına')+' başarıyla eklendi!');

      if(autoReadFirst&&firstImportedPart){
        go({v:'reader',pid:firstImportedPart.id});
      }else{
        go({v:'unit',uid:uid});
      }
    }catch(err){
      isImporting=false;
      progStatus.textContent='Hata: '+String(err&&err.message||err);
      toast('Toplu aktarma sırasında hata oluştu: '+String(err&&err.message||err));
    }
  }

  var body=h('div',{class:'form'},
    h('div',{class:'row gap-sm'},
      h('div',{class:'field grow'},h('div',{class:'fl',text:'Hedef Ders'}),csel),
      h('div',{class:'field grow'},h('div',{class:'fl',text:'Hedef Ünite'}),usel),
      startSlotEl,
      groupF
    ),
    roleSeg,
    h('p',{class:'muted sm',text:targetRole==='tree'?'Seçilen belgeler ünitenin altına soru föyleri olarak bağlanacak ve ana ders partı sayısını (u.n) işgal etmeyecektir.':'Aşağıdaki belgeler seçilen başlangıç numarasından itibaren sırayla üniteye eklenecektir. Başlıkları dilediğiniz gibi düzenleyebilirsiniz:'}),
    listWrap,
    progBar,
    progStatus,
    h('div',{class:'row end wrap',style:{marginTop:'12px'}},
      btn('Vazgeç','ghost',closeOverlay),
      btn('Ekle ve İlkini Oku','',function(){runBatchImport(true);},'book'),
      btn('Tümünü İçe Aktar ('+items.length+' Belge)','primary',function(){runBatchImport(false);},'plus')
    )
  );
  box.appendChild(body);
}

/* Sayfa Kenar Boşluğu Algılama (Auto-Crop — Görsel Oranını %100 Korur) */
async function detectPdfCropBox(page){
  try{
    var vp=page.getViewport({scale:0.35});
    var cv=document.createElement('canvas');
    cv.width=Math.max(1,Math.floor(vp.width));
    cv.height=Math.max(1,Math.floor(vp.height));
    var ctx=cv.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,cv.width,cv.height);
    await page.render({canvasContext:ctx,viewport:vp}).promise;
    var img=ctx.getImageData(0,0,cv.width,cv.height).data;
    var w=cv.width,h2=cv.height,minX=w,minY=h2,maxX=0,maxY=0,found=0;
    for(var y=2;y<h2-2;y++){
      for(var x=2;x<w-2;x++){
        var idx=(y*w+x)*4;
        if(img[idx]<245||img[idx+1]<245||img[idx+2]<245){
          if(x<minX) minX=x;if(x>maxX) maxX=x;
          if(y<minY) minY=y;if(y>maxY) maxY=y;
          found++;
        }
      }
    }
    cv.width=0;cv.height=0;
    if(found<20||maxX<=minX||maxY<=minY) return null;
    var padX=Math.round(w*0.025),padY=Math.round(h2*0.025);
    minX=Math.max(0,minX-padX);minY=Math.max(0,minY-padY);
    maxX=Math.min(w,maxX+padX);maxY=Math.min(h2,maxY+padY);
    return {x:minX/w,y:minY/h2,w:(maxX-minX)/w,h:(maxY-minY)/h2};
  }catch(e){return null;}
}

/* BÖLÜM 4.1 & 4.2: Agresif Bellek Temizliği (Ekrandan Uzaklaşan Sayfaların Canvas'larını Düşür) */
function releasePdfPageCardMemory(card){
  if(!card) return;
  if(card._renderTask){
    try{card._renderTask.cancel();}catch(e){}
    card._renderTask=null;
  }
  card.dataset.rendering='0';
  delete card.dataset.renderedSig;
  var wrap=card.querySelector('.pdf-canvas-wrap');
  if(wrap){
    var cv=wrap.querySelector('canvas');
    if(cv){
      // Düşük bellekli hafif önizleme (0.18x) henüz kaydedilmediyse arka plana bırak
      if(!wrap.dataset.thumbUrl&&cv.width>60&&cv.height>60){
        try{
          var tCv=document.createElement('canvas');
          tCv.width=Math.max(48,Math.round(cv.width*0.14));
          tCv.height=Math.max(64,Math.round(cv.height*0.14));
          var tCtx=tCv.getContext('2d',{alpha:false});
          tCtx.drawImage(cv,0,0,tCv.width,tCv.height);
          var url=tCv.toDataURL('image/jpeg',0.68);
          wrap.dataset.thumbUrl=url;
          wrap.style.backgroundImage='url('+url+')';
          tCv.width=0;tCv.height=0;
        }catch(e){}
      }
      cv.width=0;cv.height=0;
      cv.remove();
    }
  }
  var tl=card.querySelector('.pdf-text-layer');
  if(tl) clear(tl);
}

/* BÖLÜM 3.2: Çift Tamponlu (Double-Buffered) + Native HiDPI Transform Matrisli + İptal Edilebilir PDF Sayfa Çizici */
async function renderSinglePdfPageCard(card,pdfDoc,pageNum){
  if(!card||!pdfDoc) return;
  ensureProPrefs();
  var dpr=Math.min(2.5,Math.max(1.75,window.devicePixelRatio||1.75));
  var containerW=Math.max(300,card.clientWidth||780);
  var stateSig=dpr.toFixed(2)+'|'+(P.pdfCrop?'crop':'full')+'|'+containerW;
  if(card.dataset.renderedSig===stateSig) return;

  // Eğer bu kartta eski bir zoom seviyesine ait devam eden bir çizim varsa ANINDA İPTAL ET
  if(card._renderTask){
    try{card._renderTask.cancel();}catch(e){}
    card._renderTask=null;
  }
  card.dataset.rendering='1';
  var myToken=(card._renderToken=(card._renderToken||0)+1);

  try{
    var page=await pdfDoc.getPage(pageNum);
    if(card._renderToken!==myToken||!RD||!RD.isPdf) return;
    var baseVp=page.getViewport({scale:1.0});
    var crop=null;
    if(P.pdfCrop){
      crop=card._cropBox||(card._cropBox=await detectPdfCropBox(page));
      if(card._renderToken!==myToken) return;
    }
    var cssScale=containerW/(baseVp.width*(crop?crop.w:1));
    var viewport=page.getViewport({scale:cssScale});

    // Yüksek zoom seviyelerinde (%300 - %500+) güvenli maksimum piksel tavanı (Varsayılan: 6144px / 8192px)
    var maxAllowed=Number(P.pdfMaxCanvasDim)||6144;
    var maxDim=Math.max(viewport.width*dpr,viewport.height*dpr);
    var safeDpr=maxDim>maxAllowed?(maxAllowed/Math.max(viewport.width,viewport.height)):dpr;

    // Arka Plan İkincil Canvas (Back-Buffer) — Ekranda beyazlama (flicker) olmasını %100 engeller
    var backCv=document.createElement('canvas');
    var physW=Math.max(1,Math.floor(viewport.width*safeDpr));
    var physH=Math.max(1,Math.floor(viewport.height*safeDpr));
    var wrap=card.querySelector('.pdf-canvas-wrap');

    if(crop){
      var fullCv=document.createElement('canvas');
      fullCv.width=physW;fullCv.height=physH;
      var fullCtx=fullCv.getContext('2d',{alpha:false});
      fullCtx.fillStyle='#ffffff';
      fullCtx.fillRect(0,0,physW,physH);
      var rTaskCrop=page.render({
        canvasContext:fullCtx,
        viewport:viewport,
        transform:[safeDpr,0,0,safeDpr,0,0],
        intent:'display'
      });
      card._renderTask=rTaskCrop;
      await rTaskCrop.promise;
      if(card._renderToken!==myToken){fullCv.width=0;fullCv.height=0;return;}
      var cw=Math.max(1,Math.round(physW*crop.w)),ch=Math.max(1,Math.round(physH*crop.h));
      backCv.width=cw;backCv.height=ch;
      var cropRatio=String((baseVp.width*crop.w)/(baseVp.height*crop.h));
      card.style.aspectRatio=cropRatio;
      if(wrap) wrap.style.aspectRatio=cropRatio;
      var bCtx=backCv.getContext('2d',{alpha:false});
      bCtx.imageSmoothingEnabled=true;
      bCtx.imageSmoothingQuality='high';
      bCtx.drawImage(fullCv,Math.round(physW*crop.x),Math.round(physH*crop.y),cw,ch,0,0,cw,ch);
      fullCv.width=0;fullCv.height=0;
    }else{
      backCv.width=physW;
      backCv.height=physH;
      var pageRatio=String((baseVp.width||595)/(baseVp.height||842));
      card.style.aspectRatio=pageRatio;
      if(wrap) wrap.style.aspectRatio=pageRatio;
      var ctx2=backCv.getContext('2d',{alpha:false});
      ctx2.fillStyle='#ffffff';
      ctx2.fillRect(0,0,physW,physH);
      ctx2.imageSmoothingEnabled=true;
      ctx2.imageSmoothingQuality='high';
      var rTask=page.render({
        canvasContext:ctx2,
        viewport:viewport,
        transform:[safeDpr,0,0,safeDpr,0,0],
        intent:'display'
      });
      card._renderTask=rTask;
      await rTask.promise;
      if(card._renderToken!==myToken){backCv.width=0;backCv.height=0;return;}
    }

    card._renderTask=null;
    // Double-Buffer Swap: Arka plan canvas'ını tek atomik işlemde ön plana geçir ve eski canvas belleğini boşalt
    if(wrap){
      var oldCvs=wrap.querySelectorAll('canvas');
      wrap.appendChild(backCv);
      oldCvs.forEach(function(oc){oc.width=0;oc.height=0;oc.remove();});
    }

    var textLayer=card.querySelector('.pdf-text-layer');
    if(textLayer&&!textLayer.children.length){
      if(P.pdfTextLayer!==false&&!crop&&window.pdfjsLib&&window.pdfjsLib.renderTextLayer){
        textLayer.style.setProperty('--scale-factor',String(viewport.scale));
        textLayer.style.width=Math.floor(viewport.width)+'px';
        textLayer.style.height=Math.floor(viewport.height)+'px';
        var tc=await page.getTextContent();
        if(card._renderToken===myToken){
          await window.pdfjsLib.renderTextLayer({
            textContentSource:tc,
            container:textLayer,
            viewport:viewport,
            textDivs:[]
          }).promise;
        }
      }
    }
    card.dataset.renderedSig=stateSig;
  }catch(err){
    // RenderingCancelledException normaldir, sessizce geç
  }
  if(card._renderToken===myToken) card.dataset.rendering='0';
}

/* BÖLÜM 4.1 & 4.2: Öncelik Kuyruklu Sanal Kaydırıcı (Priority Queue Virtual Scroller) */
var pdfQueueTimer=0;
var pdfIdleHandle=0;

function schedulePdfRenderQueue(){
  if(!RD||!RD.isPdf||!RD.pdfDoc||!RD.pdfStage) return;
  clearTimeout(pdfQueueTimer);
  pdfQueueTimer=setTimeout(runPdfVirtualScrollerPass,16);
}

function runPdfVirtualScrollerPass(){
  if(!RD||!RD.isPdf||!RD.pdfDoc||!RD.pdfStage) return;
  var cards=Array.prototype.slice.call(RD.pdfStage.querySelectorAll('.pdf-page-card'));
  if(!cards.length) return;
  var vh=window.innerHeight||800;
  var vCenter=vh*0.5;
  var bufCount=Math.max(1,Number(P.pdfBufferPages)||2);

  var visible=[],buffer=[],far=[];
  var bestCard=null,bestDist=1e9;

  cards.forEach(function(card){
    var r=card.getBoundingClientRect();
    var cMid=(r.top+r.bottom)*0.5;
    var dist=Math.abs(cMid-vCenter);
    if(dist<bestDist){bestDist=dist;bestCard=card;}
    if(r.bottom>=0&&r.top<=vh){
      visible.push({card:card,dist:dist});
    }else if(r.bottom>=-vh*bufCount&&r.top<=vh*(1+bufCount)){
      buffer.push({card:card,dist:dist});
    }else{
      far.push(card);
    }
  });

  // Aktif sayfa göstergesini yalnızca sayfa değiştiğinde güncelle (Sıfır gereksiz DOM tetiklemesi)
  if(bestCard){
    var relNo=+bestCard.dataset.rel||1;
    if(RD.pdfCurPage!==relNo){
      RD.pdfCurPage=relNo;
      document.querySelectorAll('#pdf-pg-inp, #hud-pg-inp').forEach(function(inp){
        if(document.activeElement!==inp) inp.value=String(relNo);
      });
      cards.forEach(function(c){c.classList.toggle('active-page',c===bestCard);});
    }
  }

  // Uzak sayfaların yüksek çözünürlüklü Canvas'larını bellekten düşür (Garbage Collection)
  far.forEach(function(card){
    if(card.dataset.renderedSig||card._renderTask){
      releasePdfPageCardMemory(card);
    }
  });

  // Öncelik 1 (Merkez Sayfa) & Öncelik 2 (Kısmen Görünen Sayfalar)
  visible.sort(function(a,b){return a.dist-b.dist;});
  visible.forEach(function(item){
    renderSinglePdfPageCard(item.card,RD.pdfDoc,+item.card.dataset.page);
  });

  // Öncelik 3 (Tampon Sayfalar): Boş zamanda (requestIdleCallback) çiz
  buffer.sort(function(a,b){return a.dist-b.dist;});
  if(pdfIdleHandle&&window.cancelIdleCallback) window.cancelIdleCallback(pdfIdleHandle);
  var runBuffer=function(){
    if(!RD||!RD.isPdf||!RD.pdfDoc) return;
    buffer.forEach(function(item){
      renderSinglePdfPageCard(item.card,RD.pdfDoc,+item.card.dataset.page);
    });
  };
  if(window.requestIdleCallback){
    pdfIdleHandle=window.requestIdleCallback(runBuffer,{timeout:260});
  }else{
    setTimeout(runBuffer,90);
  }
}

var rerenderVisiblePdfPages=schedulePdfRenderQueue;

function openPdfThumbnails(){
  if(!RD||!RD.isPdf||!RD.pdfDoc) return;
  var grid=h('div',{class:'pdf-thumbs'});
  var sPg=RD.p.pdfStart||1,ePg=RD.p.pdfEnd||RD.pdfDoc.numPages;
  for(var pg=sPg;pg<=ePg;pg++){
    (function(pageNum,relIdx){
      var cv=document.createElement('canvas');
      var b=h('button',{class:'pdf-thumb-b'+(RD.pdfCurPage===relIdx?' on':''),type:'button',onclick:function(){
        closeOverlay();
        scrollToPdfPage(relIdx);
      }},cv,h('span',{text:'Sayfa '+relIdx+(sPg>1?' ('+pageNum+')':'')}));
      grid.appendChild(b);
      RD.pdfDoc.getPage(pageNum).then(function(page){
        var vp=page.getViewport({scale:0.24});
        cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
        var ctx=cv.getContext('2d',{alpha:false});
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cv.width,cv.height);
        page.render({canvasContext:ctx,viewport:vp});
      }).catch(function(){});
    })(pg,pg-sPg+1);
  }
  modal('Sayfa Önizlemeleri · '+ptitle(RD.p),h('div',{class:'form'},grid,h('div',{class:'row end'},btn('Kapat','ghost',closeOverlay))),{wide:true});
}

function scrollToPdfPage(relPage){
  if(!RD||!RD.isPdf||!RD.pdfStage) return;
  var total=RD.pdfTotalPages||1;
  relPage=Math.max(1,Math.min(total,Math.round(+relPage||1)));
  var card=RD.pdfStage.querySelector('.pdf-page-card[data-rel="'+relPage+'"]');
  if(card){
    RD.pdfCurPage=relPage;
    document.querySelectorAll('#pdf-pg-inp, #hud-pg-inp').forEach(function(inp){
      if(document.activeElement!==inp) inp.value=String(relPage);
    });
    var barH=56;
    var bar=RD.pdfStage.parentElement?RD.pdfStage.parentElement.querySelector('.pdf-bar'):null;
    if(bar) barH=bar.offsetHeight||56;
    var targetY=Math.max(0,card.getBoundingClientRect().top+window.scrollY-barH-12);
    window.scrollTo({
      top:targetY,
      behavior:reduced?'auto':'smooth'
    });
    schedulePdfRenderQueue();
  }
}

/* ---------- 5. ÜNİTE OKUMA ANALİTİĞİ VE ZAMAN DAĞILIMI ---------- */
function computeUnitReadingAnalytics(un){
  if(!un) return null;
  var ps=partsOfUnit(un.id),wpm=curWpm();
  var totalSecSpent=0,doneParts=0,doneSec=0,remainingEstSec=0;
  var partBreakdown=[];
  ps.forEach(function(p){
    var st=S.st[p.id]||{};
    var sec=st.sec||0;
    var done=!!st.done;
    var pr=done?1:clamp01(st.pos||0);
    totalSecSpent+=sec;
    var estMin=p.kind==='pdf'?Math.max(1,Math.round((p.pageCount||1)*1.6)):partMin(p);
    var estSec=estMin*60;
    if(done){
      doneParts++;
      doneSec+=sec;
    }else{
      remainingEstSec+=Math.round(estSec*(1-pr));
    }
    partBreakdown.push({no:p.no,title:ptitle(p),sec:sec,estSec:estSec,done:done,progress:pr});
  });
  var avgSecPerDone=doneParts>0?Math.round(doneSec/doneParts):0;
  if(doneParts>=2&&avgSecPerDone>=45){
    var unloadedCount=Math.max(0,(un.n||ps.length)-ps.length);
    remainingEstSec+=unloadedCount*avgSecPerDone;
  }
  return {
    unitId:un.id,
    unitName:un.name,
    totalParts:Math.max(un.n||1,ps.length),
    loadedParts:ps.length,
    doneParts:doneParts,
    totalSecSpent:totalSecSpent,
    avgSecPerDone:avgSecPerDone,
    remainingEstSec:remainingEstSec,
    wpm:wpm,
    parts:partBreakdown
  };
}

function renderUnitAnalyticsBox(u,c){
  if(!u||u.kind==='test') return null;
  var ua=computeUnitReadingAnalytics(u);
  if(!ua||(!ua.loadedParts&&!ua.totalSecSpent)) return null;
  return h('section',{class:'uanalytics',style:hueStyle(c),'aria-label':'Ünite okuma istatistikleri'},
    h('div',{class:'ua-card'},
      h('span',{class:'ua-k',text:'Harcanan Süre'}),
      h('span',{class:'ua-v'},h('b',{text:ua.totalSecSpent>=60?fmtDur(ua.totalSecSpent):(ua.totalSecSpent+' sn')})),
      h('span',{class:'ua-s',text:ua.doneParts?(ua.doneParts+' part tamamlandı · ort. '+fmtDur(ua.avgSecPerDone)+'/part'):'Aktif okuma süresi otomatik ölçülür'})),
    h('div',{class:'ua-card'},
      h('span',{class:'ua-k',text:'Tahmini Kalan'}),
      h('span',{class:'ua-v',text:ua.remainingEstSec>=60?'~'+fmtDur(ua.remainingEstSec):'Tamamlandı'}),
      h('span',{class:'ua-s',text:'Kişisel hızına göre ('+ua.wpm+' kelime/dk)'})),
    h('div',{class:'ua-card'},
      h('span',{class:'ua-k',text:'Ünite İlerlemesi'}),
      h('span',{class:'ua-v'},h('b',{text:'%'+Math.round(unitStats(u.id).pct*100)})),
      h('span',{class:'ua-s',text:ua.doneParts+' / '+ua.totalParts+' part okundu'})));
}

/* ---------- 6. ORİJİNAL GÖRÜNÜMLERİN PRO YÜKSELTMELERİ ---------- */
function isDarkNow(){
  if(P.theme==='dark'||P.theme==='oled'||P.theme==='nord') return true;
  if(P.theme==='light'||P.theme==='sepia') return false;
  if(hostTheme) return hostTheme==='dark';
  return window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
}

function renderBar(){
  var b=$('bar-in');clear(b);
  document.body.setAttribute('data-route',route.v);
  var rd=route.v==='reader';
  $('prog').hidden=!rd;
  if(rd){
    var p=S.parts[route.pid];
    b.appendChild(ibtn('back','Üniteye dön',function(){go({v:'unit',uid:p?p.uid:null});}));
    var cur=h('button',{class:'cur',type:'button','aria-label':'Bölümler',onclick:function(){if(p&&p.kind==='pdf') openPdfThumbnails();else readerToggleToc();}},
      h('span',{class:'tx',id:'cur-label',text:p?ptitle(p):'Giriş'}),icon('chevron',14));
    b.appendChild(cur);
    if(p){
      var leftTxt=p.kind==='pdf'?((p.pageCount||1)+' sayfa PDF'):('~'+partLeftMin(p)+' dk');
      b.appendChild(h('span',{class:'chip',id:'rd-pace-chip',text:leftTxt,title:'Tahmini okuma süresi'}));
    }
    b.appendChild(h('button',{class:'btn',type:'button',id:'btn-set','aria-label':'Okuma ayarları',onclick:function(){readerToggleSettings();}},h('span',{class:'aa',text:'Aa'})));
    b.appendChild(ibtn('focus','Odak modu',function(){P.focus=true;savePrefs();applyPrefs();toast('Odak modu açık. Çıkmak için sağ üstteki düğmeye ya da Esc\'ye bas.');}));
    b.appendChild(ibtn('contrast','Gündüz / gece',toggleTheme));
    b.appendChild(ibtn('gear','Kontrol Merkezi',openSettings));
    return;
  }
  if(route.v==='test'){
    var tu=getUnit(route.uid);
    b.appendChild(ibtn('back','Üniteye dön',function(){go({v:'unit',uid:route.uid});}));
    b.appendChild(h('span',{class:'t-title',text:tu?tu.name:'Test'}));
    b.appendChild(h('span',{class:'sp'}));
    b.appendChild(h('button',{class:'btn',type:'button','aria-label':'Okuma ayarları',onclick:function(){readerToggleSettings();}},h('span',{class:'aa',text:'Aa'})));
    b.appendChild(ibtn('contrast','Gündüz / gece',toggleTheme));
    return;
  }
  b.appendChild(h('button',{class:'brand',type:'button','aria-label':'Kitaplık',onclick:function(){go({v:'home'});}},logoEl(26),h('span',{class:'brand-m',text:'GioReader'}),h('span',{class:'brand-pro',text:'PRO'})));
  b.appendChild(h('nav',{class:'tabs','aria-label':'Ana gezinme'},h('button',{class:'tab on',type:'button','aria-current':'page',onclick:function(){go({v:'home'});}},'Kitaplık')));
  b.appendChild(h('span',{class:'sp'}));
  b.appendChild(ibtn('search','Ara (Ctrl+K)',function(){openSearch();}));
  b.appendChild(ibtn('contrast','Gündüz / gece',toggleTheme));
  b.appendChild(ibtn('gear','Ayarlar',function(){openSettings();}));
  b.appendChild(btn('PDF yükle','ghost',function(){triggerPdfPick();},'file','PDF ders dosyası yükle'));
  b.appendChild(btn('Part ekle','primary',function(){openAdd();},'plus','Part ekle'));
}

function triggerPdfPick(uid,no){
  if(NATIVE&&NATIVE.pickFiles){
    NATIVE.pickFiles({pdfOnly:true,multi:true,title:'PDF Ders Dosyalarını Seç'}).then(function(files){
      if(!files||!files.length) return;
      if(files.length>1){
        openMultiPdfImporter(files,{uid:uid,no:no});
      }else if(files[0]){
        openPdfImporter(files[0],{uid:uid,no:no});
      }
    }).catch(function(err){
      toast('Dosya seçici açılamadı: '+String(err&&err.message||err));
    });
    return;
  }
  var inp=h('input',{type:'file',accept:'.pdf,.PDF,application/pdf',multiple:true});
  inp.addEventListener('change',function(){
    var fl=inp.files;
    if(!fl||!fl.length) return;
    if(fl.length>1){
      openMultiPdfImporter(fl,{uid:uid,no:no});
    }else{
      var f=fl[0];
      var extPath=NATIVE&&NATIVE.getPathForFile?NATIVE.getPathForFile(f):(f.path||'');
      openPdfImporter({name:f.name,file:f,externalPath:extPath},{uid:uid,no:no});
    }
  });
  inp.click();
}

var _origUnitStats=unitStats;
unitStats=function(uid){
  var u=getUnit(uid);
  if(!u) return _origUnitStats(uid);
  var mps=mainPartsOfUnit(uid);
  var subs=subPartsOfUnit(uid);
  var isT=u.kind==='test';
  if(isT) return _origUnitStats(uid);

  var done=0,min=0,prog=0,sec=0;
  mps.forEach(function(p){
    var d=partDone(p.id);if(d) done++;
    min+=partMin(p);prog+=d?1:partProgress(p.id);
    var st=S.st[p.id];if(st) sec+=st.sec||0;
  });
  var subDone=0,subMin=0;
  subs.forEach(function(p){
    var d=partDone(p.id);if(d) subDone++;
    subMin+=partMin(p);
    var st=S.st[p.id];if(st) sec+=st.sec||0;
  });

  var maxNo=0;
  mps.forEach(function(x){if(x.no>maxNo) maxNo=x.no;});
  var n=Math.max(u.n||1,maxNo);

  return {
    n:n,
    loaded:mps.length,
    done:done,
    minutes:min+subMin,
    pct:n?prog/n:0,
    sec:sec,
    subCount:subs.length,
    subDone:subDone
  };
};

function viewCourse(v){
  var c=getCourse(route.cid);
  if(!c){go({v:'home'},{replace:true});return;}
  setHue(c.hue);
  var s=courseStats(c.id),us=unitsOf(c.id);
  var page=h('div',{class:'page'});
  v.appendChild(page);
  page.appendChild(h('header',{class:'pg-h course-h',style:hueStyle(c)},
    h('div',null,
      crumbs([{t:'Kitaplık',fn:function(){go({v:'home'});}},{t:c.name}]),
      h('h1',{class:'pg-t',text:c.name}),
      h('div',{class:'pg-m',text:s.units?(s.units+' ünite · '+s.loaded+(s.n>s.loaded?' / '+s.n:'')+' part yüklü · '+s.done+' okundu · '+s.minutes+' dk okuma'):'Henüz ünite yok'})),
    h('div',{class:'row wrap'},
      btn('Dışa aktar','ghost',function(){openExport({cid:c.id});},'download'),
      btn('Ayarlar','ghost',function(){openCourseSheet(c);},'gear'),
      btn('Test ekle','',function(){openUnitSheet(null,c.id,{kind:'test'});},'check'),
      btn('Ünite ekle','primary',function(){openUnitSheet(null,c.id);},'plus'))));
  var bn=storageBanner();if(bn) page.appendChild(bn);
  if(!us.length){
    page.appendChild(emptyState('Bu derste ünite yok','Önce bir ünite aç ve içinde kaç part olacağını yaz. Sonra partları sırayla yapıştırırsın.',[btn('Ünite ekle','primary',function(){openUnitSheet(null,c.id);},'plus')]));
    return;
  }
  var list=h('div',{class:'ulist'});
  us.forEach(function(u){
    var st=unitStats(u.id);
    var subs=subPartsOfUnit(u.id);
    var metaText=st.kind==='test'?('Test · '+st.loaded+' / '+st.n+' part yüklü · '+st.q+' soru'+(st.last?' · son: %'+st.last.pct:'')):(st.loaded+' / '+st.n+' ders partı'+(subs.length?(' · '+subs.length+' soru föyü'):'')+' · '+st.done+' okundu'+(st.minutes?' · '+st.minutes+' dk':''));

    var treeEl=null;
    if(subs.length>0){
      var treeItems=h('div',{class:'ucard-tree-list'});
      subs.forEach(function(sp,idx){
        var isLast=(idx===subs.length-1);
        var sDone=partDone(sp.id);
        var sPr=partProgress(sp.id);
        var glyph=isLast?'└── ':'├── ';
        var itemBtn=h('button',{
          type:'button',
          class:'ucard-tree-item'+(sDone?' done':''),
          title:'Belgeyi / föyü oku: '+ptitle(sp),
          onclick:function(ev){
            ev.stopPropagation();
            go({v:'reader',pid:sp.id});
          }
        },
          h('span',{class:'tree-branch-glyph',text:glyph}),
          h('span',{class:'tree-item-icon'},icon('file',13)),
          h('span',{class:'ucard-tree-title',text:ptitle(sp)}),
          chip('PDF · '+(sp.pageCount||1)+' syf','pdf-chip'),
          sDone?chip('Tamamlandı','ok'):(sPr>0.02?chip('%'+Math.round(sPr*100)):chip('Yeni'))
        );
        treeItems.appendChild(itemBtn);
      });

      treeEl=h('div',{class:'ucard-tree'},
        h('div',{class:'ucard-tree-head'},
          h('span',{class:'tree-group-tag'},icon('folder',13),h('span',{text:'Soru Föyleri & Ek Kaynaklar ('+subs.length+' PDF)'})),
          btn('Föy Ekle','sm ghost',function(ev){
            ev.stopPropagation();
            triggerPdfPick(u.id);
          },'plus')
        ),
        treeItems
      );
    }

    var card=h('article',{class:'ucard',style:hueStyle(c),'data-id':u.id},
      us.length>1?gripBtn('Üniteyi taşı'):null,
      h('div',{class:'ucard-h'},
        h('button',{class:'ucard-t',type:'button',onclick:function(){go({v:'unit',uid:u.id});}},
          h('span',{class:'ucard-name',text:u.name}),
          h('span',{class:'ucard-m',text:metaText})),
        h('div',{class:'row'},
          st.kind==='test'&&st.q?btn('Testi çöz','sm',function(){openTestStart(u.id);},'check'):null,
          btn('Part yapıştır','sm',function(){openAdd({uid:u.id});},'plus'),
          ibtn('download','Üniteyi dışa aktar',function(){openExport({uid:u.id});}),
          btn('Aç','sm ghost',function(){go({v:'unit',uid:u.id});},'right'))),
      progLine(st.pct),
      slotStrip(u,true),
      treeEl);
    list.appendChild(card);
  });
  if(us.length>1) sortable(list,{item:'.ucard',grip:'.grip',mid:true,onSort:function(ids){
    var now=Date.now();ids.forEach(function(id,i){var uu=getUnit(id);if(uu&&uu.ord!==i+1){uu.ord=i+1;uu.u=now;}});
    touchMeta(c);toast('Sıralama kaydedildi');}});
  page.appendChild(list);
}

function viewUnit(v){
  var u=getUnit(route.uid);
  if(!u){go({v:'home'},{replace:true});return;}
  var c=getCourse(u.cid);setHue(c.hue);
  var st=unitStats(u.id),ps=partsOfUnit(u.id),fe=firstEmpty(u.id),now=Date.now(),isT=u.kind==='test';
  var page=h('div',{class:'page'});
  v.appendChild(page);
  var resumeP=null,bt=0;
  ps.forEach(function(p){var s2=S.st[p.id];if(s2&&s2.at>bt&&!s2.done){bt=s2.at;resumeP=p;}});
  if(!resumeP) resumeP=ps.find(function(p){return !partDone(p.id);})||null;
  page.appendChild(h('header',{class:'pg-h course-h',style:hueStyle(c)},
    h('div',null,
      crumbs([{t:'Kitaplık',fn:function(){go({v:'home'});}},{t:c.name,fn:function(){go({v:'course',cid:c.id});}},{t:u.name}]),
      h('h1',{class:'pg-t',text:u.name}),
      h('div',{class:'pg-m',text:isT?(st.loaded+' / '+st.n+' part yüklendi · '+st.q+' soru'+(st.last?' · son deneme %'+st.last.pct:'')):st.loaded+' / '+st.n+' ders partı'+(st.subCount?(' · '+st.subCount+' soru föyü'):'')+' · '+st.done+' okundu'+(st.minutes?' · ~'+st.minutes+' dk okuma':'')+(st.sec>=60?' · '+fmtDur(st.sec)+' okudun':'')}),
      h('div',{class:'unit-prog'},progLine(st.pct,'thick'))),
    h('div',{class:'row wrap'},
      isT?(st.q?btn(u.run&&!u.run.fin?'Teste devam et · '+Object.keys(u.run.ans||{}).length+' / '+u.run.order.length:'Testi başlat','primary',function(){openTestStart(u.id);},'check'):null):(resumeP?btn(partProgress(resumeP.id)>0.02?'Devam et':'Okumaya başla','',function(){go({v:'reader',pid:resumeP.id});},'book'):null),
      !isT?btn('PDF yükle','ghost',function(){triggerPdfPick(u.id,fe||undefined);},'file'):null,
      btn('Dışa aktar','ghost',function(){openExport({uid:u.id});},'download'),
      btn('Ayarlar','ghost',function(){openUnitSheet(u);},'gear'),
      btn(fe?'Part '+fe+' yapıştır':'Part yapıştır',isT&&st.q?'':'primary',function(){openAdd({uid:u.id,no:fe||undefined});},'plus'))));

  var uaBox=renderUnitAnalyticsBox(u,c);
  if(uaBox) page.appendChild(uaBox);

  var qCands=ps.filter(function(p){
    return p.kind==='pdf'&&p.role!=='supplementary'&&!p.subGroup&&/suggested|problem|soru|exercise|alıştırma|homework|ödev|hw|quiz|exam|sınav/i.test(p.title);
  });
  if(qCands.length>0){
    var partNumbers=qCands.map(function(x){return x.no;}).filter(Boolean).join(', ');
    var ban=h('div',{class:'unit-migration-banner'},
      h('div',{class:'unit-migration-text'},
        icon('file',18),
        h('span',null,
          h('strong',{text:qCands.length+' adet soru / alıştırma föyü bulundu'+(partNumbers?' (Part '+partNumbers+')':'')+'. '}),
          h('span',{text:'Bu föyleri ana ders akışı yerine alt ağaç ("Sorular & Alıştırmalar") yapısına taşımak ister misiniz?'})
        )
      ),
      h('div',{class:'row gap-sm'},
        btn('Ağaç Yapısına Dönüştür ('+qCands.length+' Föy)','primary sm',function(){
          autoMigrateQuestionsToTree(u.id);
          toast(qCands.length+' föy soru ağacına taşındı!');
          refresh();
        },'check')
      )
    );
    page.appendChild(ban);
  }

  var list=h('div',{class:'plist'});
  for(var no=1;no<=u.n;no++){
    (function(no){
      var p=slotPart(u.id,no);
      if(p&&isT){
        var qs=partQs(p),na=qs.filter(function(q){return q.ans;}).length;
        list.appendChild(h('div',{class:'prow',style:hueStyle(c)},
          h('button',{class:'prow-main',type:'button',onclick:function(){go({v:'reader',pid:p.id});}},
            h('span',{class:'prow-n',text:String(no)}),
            h('span',{class:'prow-b'},h('span',{class:'prow-t',text:qRangeLabel(p)}),
              h('span',{class:'prow-m'},h('span',{text:qs.length+' soru'}),na===qs.length&&qs.length?chip('cevap anahtarı tam','ok'):chip(na+' / '+qs.length+' cevap','acc')))),
          h('div',{class:'prow-a'},ibtn('more','Part işlemleri',function(){openPartMenu(p);}))));
      }else if(p){
        var s2=S.st[p.id]||{},pr=partProgress(p.id),done=partDone(p.id),isPdf=p.kind==='pdf';
        list.appendChild(h('div',{class:'prow'+(done?' done':''),style:hueStyle(c)},
          h('button',{class:'prow-main',type:'button',onclick:function(){go({v:'reader',pid:p.id});}},
            h('span',{class:'prow-n',text:String(no)}),
            h('span',{class:'prow-b'},
              h('span',{class:'prow-t',text:ptitle(p)}),
              h('span',{class:'prow-m'},
                isPdf?chip('PDF · '+(p.pageCount||1)+' syf','pdf-chip'):null,
                h('span',{text:(done||pr<0.02?partMin(p)+' dk':partLeftMin(p)+' dk kaldı')}),
                s2.sec>=45?h('span',{class:'faint',text:fmtDur(s2.sec)+' okundu'}):null,
                done?chip('Okundu','ok'):(pr>0.02?chip('%'+Math.round(pr*100)):chip('Yeni')),
                s2.at?h('span',{class:'faint',text:fmtAgo(s2.at,now)}):null),
              progLine(done?1:pr))),
          h('div',{class:'prow-a'},
            h('button',{class:'rd-toggle'+(done?' on':''),type:'button',title:done?'Okundu · okunmadı yap':'Okundu olarak işaretle','aria-label':done?'Okunmadı yap':'Okundu olarak işaretle','aria-pressed':String(done),onclick:function(){setDone(p.id,!done);refresh();}},icon('check',16)),
            ibtn('more','Part işlemleri',function(){openPartMenu(p);}))));
      }else{
        var hint=u.hints&&u.hints[no]?shortTitle(u.hints[no]):'';
        list.appendChild(h('div',{class:'prow vacant'+(no===fe?' next':''),style:hueStyle(c)},
          h('button',{class:'prow-main',type:'button',onclick:function(){openAdd({uid:u.id,no:no});}},
            h('span',{class:'prow-n',text:String(no)}),
            h('span',{class:'prow-b'},
              h('span',{class:'prow-t',text:hint||'Yüklenmedi'}),
              h('span',{class:'prow-m'},no===fe?chip('Sıradaki','acc'):null,h('span',{text:hint?'Henüz yapıştırılmadı':'Bu yuva boş'})))),
          h('div',{class:'prow-a'},
            !isT?btn('PDF','sm ghost',function(){triggerPdfPick(u.id,no);},'file'):null,
            btn('Yapıştır','sm',function(){openAdd({uid:u.id,no:no});},'plus'))));
      }
    })(no);
  }
  page.appendChild(list);

  var subPs=subPartsOfUnit(u.id);
  if(subPs.length>0){
    var groups={};
    subPs.forEach(function(sp){
      var gName=sp.subGroup||'Sorular & Alıştırmalar';
      if(!groups[gName]) groups[gName]=[];
      groups[gName].push(sp);
    });

    var treeWrap=h('div',{class:'unit-tree-section'});
    var treeHeader=h('div',{class:'unit-tree-h'},
      h('div',{class:'unit-tree-title'},
        h('span',{class:'unit-tree-folder-icon'},icon('folder',18)),
        h('h3',{text:'Ünite Ağacı: Soru Föyleri & Ek Kaynaklar ('+subPs.length+')'})
      ),
      btn('PDF Belge / Föy Ekle','ghost sm',function(){
        triggerPdfPick(u.id);
      },'plus')
    );
    treeWrap.appendChild(treeHeader);

    var groupsWrap=h('div',{class:'unit-tree-groups'});
    Object.keys(groups).forEach(function(gName){
      var gItems=groups[gName];
      var gEl=h('div',{class:'unit-tree-group'},
        h('div',{class:'tree-group-head'},
          h('span',{class:'tree-group-tag'},icon('help',13),h('span',{text:gName})),
          h('span',{class:'muted sm',text:gItems.length+' föy / belge'})
        )
      );
      var gList=h('div',{class:'tree-group-list'});
      gItems.forEach(function(sp,idx){
        var isLast=(idx===gItems.length-1);
        var sDone=partDone(sp.id);
        var sPr=partProgress(sp.id);
        var glyph=isLast?'└── ':'├── ';
        var row=h('div',{class:'prow tree-prow'+(sDone?' done':''),style:hueStyle(c)},
          h('button',{class:'prow-main',type:'button',onclick:function(){go({v:'reader',pid:sp.id});}},
            h('span',{class:'tree-branch-glyph',text:glyph}),
            h('span',{class:'tree-item-icon'},icon('file',15)),
            h('span',{class:'prow-b'},
              h('span',{class:'prow-t',text:ptitle(sp)}),
              h('span',{class:'prow-m'},
                chip('PDF · '+(sp.pageCount||1)+' syf','pdf-chip'),
                sDone?chip('Tamamlandı','ok'):(sPr>0.02?chip('%'+Math.round(sPr*100)):chip('Yeni'))
              )
            )
          ),
          h('div',{class:'prow-a'},
            h('button',{class:'rd-toggle'+(sDone?' on':''),type:'button',title:sDone?'Tamamlandı · Tamamlanmadı yap':'Tamamlandı olarak işaretle','aria-label':sDone?'Tamamlanmadı yap':'Tamamlandı olarak işaretle','aria-pressed':String(sDone),onclick:function(){setDone(sp.id,!sDone);refresh();}},icon('check',16)),
            ibtn('more','İşlemler',function(){openPartMenu(sp);})
          )
        );
        gList.appendChild(row);
      });
      gEl.appendChild(gList);
      groupsWrap.appendChild(gEl);
    });
    treeWrap.appendChild(groupsWrap);
    page.appendChild(treeWrap);
  }
  if(isT&&(u.runs||[]).length) page.appendChild(runHistory(u));
  if(!ps.length) page.appendChild(h('p',{class:'muted hint-p',text:isT?'Test partlarını Ctrl+V ile yapıştır. Her parçada "Soru 1: … A) … E) … Doğru Cevap: C" biçimindeki sorular bulunur; hepsini yükleyince testi başlatırsın.':'Part metnini kopyalayıp bu sayfada Ctrl+V yapabilir ya da "PDF yükle" ile ders PDF\'lerini doğrudan ekleyebilirsin.'}));
}

/* Okuyucu Görünümü: Hem Markdown/LaTeX hem de Ultra-HD PDF Partlarını Aynı Editoryal Estetikle Açar */
var _origReaderLeave=readerLeave;
readerLeave=function(){
  if(Z.scale>1.001||Z.panX||Z.panY){
    resetReaderZoom({silent:true});
  }
  if(RD&&RD.isPdf&&RD.pdfStage){
    RD.pdfStage.querySelectorAll('.pdf-page-card').forEach(releasePdfPageCardMemory);
    if(RD.pdfIo){try{RD.pdfIo.disconnect();}catch(e){}}
    var hud=document.getElementById('pdf-hud-floating');
    if(hud) hud.remove();
    var sb=document.getElementById('pdf-sidebar-drawer');
    if(sb) sb.remove();
    var zenPill=document.getElementById('zen-exit-pill');
    if(zenPill) zenPill.remove();
    document.body.classList.remove('zen-active', 'hand-tool-active', 'hand-tool-panning');
  }
  _origReaderLeave();
};

function viewReader(v){
  var p=S.parts[route.pid];
  if(!p||!getCourse(p.cid)||!getUnit(p.uid)){go({v:'home'},{replace:true});return;}
  var c=getCourse(p.cid);
  setHue(c.hue);
  var st=ST(p.id);
  st.at=Date.now();touch('s:'+p.id,true);

  if(p.kind==='pdf'){
    viewPdfReader(v,p,c,getUnit(p.uid),st);
    return;
  }

  RD={pid:p.id,p:p,c:c,un:getUnit(p.uid),st:st,secs:[],heads:[],ticks:[],curIdx:-2,docMax:1,lastY:-99,userMoved:false,progress:0,posTimer:null,jump:route.jump||null,isPdf:false};
  var d=buildDoc(p.text);
  RD.doc=d;
  var prose=h('article',{class:'prose',lang:'tr',id:'prose'});
  prose.innerHTML=d.html;
  RD.prose=prose;
  RD.mast=h('header',{class:'mast'});
  RD.end=h('footer',{class:'part-end',id:'end'});
  var col=h('div',{class:'col',lang:'tr',id:'article'},RD.mast,prose,RD.end);
  v.appendChild(h('div',{class:'page reader'},col));
  RD.secs=decorateProse(prose);
  paintHighlights();
  fillMast();renderEnd();
  prose.addEventListener('typeset',function(){measure();restorePos();});
  window.scrollTo(0,0);
  requestAnimationFrame(function(){measure();restorePos();});
  typeset(prose);
  RD.tick=setInterval(readTick,5000);
  if(route.jump) route.jump=null;
}

function viewPdfReader(v,p,c,un,st){
  ensureProPrefs();
  var sPg=p.pdfStart||1,ePg=p.pdfEnd||(p.pageCount||1),totalPgs=Math.max(1,ePg-sPg+1);
  var initZoom=(Number(P.pdfDefaultZoom)||100)/100;
  RD={
    pid:p.id,p:p,c:c,un:un,st:st,secs:[],heads:[],ticks:[],curIdx:-2,docMax:1,lastY:-99,
    userMoved:false,progress:0,posTimer:null,jump:route.jump||null,
    isPdf:true,pdfDoc:null,pdfStage:null,pdfCurPage:1,pdfTotalPages:totalPgs,pdfZoom:initZoom
  };
  RD.doc={eqCount:0,minutes:p.minutes||Math.max(1,Math.round(totalPgs*1.6))};
  RD.end=h('footer',{class:'part-end',id:'end'});

  var pgInp=h('input',{type:'number',class:'pdf-pg-inp',id:'pdf-pg-inp',min:1,max:totalPgs,value:1,'aria-label':'Sayfa numarası',onchange:function(){scrollToPdfPage(+pgInp.value||1);}});
  var effFilter=P.pdfFilter==='auto'?(isDarkNow()?'dark':(P.theme==='sepia'?'sepia':'orig')):P.pdfFilter;
  var stage=h('div',{class:'pdf-stage'+(P.pdfSpread==='double'?' spread-double':''),'data-pfilter':effFilter});
  RD.pdfStage=stage;

  var col=h('div',{class:'col pdf-col','data-pw':P.pdfWidth||'normal',id:'article'});

  var zoomLbl=h('button',{type:'button',class:'pdf-zoom-lbl',id:'pdf-zoom-lbl',title:'Yakınlaştırmayı %100\'e sıfırla',onclick:function(){resetReaderZoom();}},'%'+Math.round(initZoom*100));

  var partBadge=p.role==='supplementary'?(p.subGroup||'Ek Materyal'):('Part '+p.no);
  var navG=h('div',{class:'pdf-bar-g'},
    ibtn('back','Üniteye dön',function(){go({v:'unit',uid:un.id});}),
    h('span',{class:'pdf-part-chip',text:partBadge}),
    h('span',{class:'pdf-title-pill',text:ptitle(p),title:ptitle(p)}),
    h('button',{
      type:'button',
      class:'rd-chip'+(st.done?' on':''),
      'aria-pressed':String(!!st.done),
      title:st.done?'Okunmadı olarak işaretle':'Okundu olarak işaretle',
      onclick:function(){
        setDone(p.id,!st.done);
        this.classList.toggle('on',!!st.done);
        this.setAttribute('aria-pressed',String(!!st.done));
        var lbl=this.querySelector('span');
        if(lbl) lbl.textContent=st.done?'Okundu':'Tamamla';
        renderEnd();
      }
    },icon('check',13),h('span',{text:st.done?'Okundu':'Tamamla'})));

  var pageG=h('div',{class:'pdf-bar-g'},
    ibtn('back','Önceki sayfa (Sol Ok / PageUp)',function(){scrollToPdfPage((RD.pdfCurPage||1)-1);}),
    h('span',{class:'sm muted',text:'Sayfa'}),pgInp,
    h('span',{class:'sm muted',text:'/ '+totalPgs}),
    ibtn('right','Sonraki sayfa (Sağ Ok / PageDown)',function(){scrollToPdfPage((RD.pdfCurPage||1)+1);}),
    btn('Önizlemeler','sm ghost',function(){
      if(window.toggleSidebarDrawer) window.toggleSidebarDrawer();
      else openPdfThumbnails();
    },'layers'));

  var toolG=h('div',{class:'pdf-bar-g'},
    ibtn('zoomOut','Uzaklaştır (Ctrl -)',function(){setReaderZoom(effectiveZoomScale()-0.15);}),
    zoomLbl,
    ibtn('zoomIn','Yakınlaştır (Ctrl +)',function(){setReaderZoom(effectiveZoomScale()+0.15);}),
    btn(P.pdfSpread==='double'?'Çift Sayfa':'Tek Sayfa','sm ghost',function(ev){
      P.pdfSpread=P.pdfSpread==='double'?'single':'double';
      savePrefs();
      stage.classList.toggle('spread-double',P.pdfSpread==='double');
      ev.currentTarget.querySelector('.lbl').textContent=P.pdfSpread==='double'?'Çift Sayfa':'Tek Sayfa';
      setTimeout(function(){
        stage.querySelectorAll('.pdf-page-card').forEach(function(c2){delete c2.dataset.renderedSig;});
        measure();
        schedulePdfRenderQueue();
      },60);
    },'columns'),
    btn(P.pdfCrop?'Kırpma: Açık':'Kenar Kırp','sm'+(P.pdfCrop?' on':''),function(ev){
      P.pdfCrop=!P.pdfCrop;savePrefs();
      ev.currentTarget.classList.toggle('on',P.pdfCrop);
      ev.currentTarget.querySelector('.lbl').textContent=P.pdfCrop?'Kırpma: Açık':'Kenar Kırp';
      stage.querySelectorAll('.pdf-page-card').forEach(function(c2){delete c2.dataset.renderedSig;});
      schedulePdfRenderQueue();
    },'crop'),
    btn(effFilter==='dark'?'Gece':effFilter==='sepia'?'Sepya':'Orijinal','sm ghost',function(ev){
      var order=['orig','sepia','dark'];
      var nxt=order[(order.indexOf(effFilter)+1)%order.length];
      effFilter=nxt;P.pdfFilter=nxt;savePrefs();
      stage.setAttribute('data-pfilter',nxt);
      ev.currentTarget.querySelector('.lbl').textContent=nxt==='dark'?'Gece':nxt==='sepia'?'Sepya':'Orijinal';
    },'contrast'),
    btn(P.pdfWidth==='wide'?'Geniş':P.pdfWidth==='full'?'Tam':'Normal','sm ghost',function(ev){
      var wOrder=['normal','wide','full','col'];
      var nw=wOrder[(wOrder.indexOf(P.pdfWidth||'normal')+1)%wOrder.length];
      P.pdfWidth=nw;savePrefs();
      col.setAttribute('data-pw',nw);
      ev.currentTarget.querySelector('.lbl').textContent=nw==='wide'?'Geniş':nw==='full'?'Tam':nw==='col'?'Dar':'Normal';
      setTimeout(function(){
        stage.querySelectorAll('.pdf-page-card').forEach(function(c2){delete c2.dataset.renderedSig;});
        schedulePdfRenderQueue();
        measure();
      },190);
    }),
    btn('Zen','sm ghost',function(){
      if(window.toggleZenMode) window.toggleZenMode();
    },'focus'),
    ibtn('gear','Ayarlar',function(){openSettings('pdf');}));

  var bar=h('div',{class:'pdf-bar',role:'toolbar','aria-label':'PDF araç çubuğu'},navG,pageG,toolG);

  col.appendChild(bar);
  col.appendChild(stage);
  col.appendChild(RD.end);
  v.appendChild(h('div',{class:'page reader'},col));

  renderEnd();
  RD.tick=setInterval(readTick,5000);

  var loadFill=h('div',{class:'pdf-loading-fill'});
  var loadBox=h('div',{style:{width:'100%',maxWidth:'420px',padding:'32px 16px',textAlign:'center'}},
    h('p',{class:'muted',id:'pdf-loading',text:'Ultra-HD PDF sayfaları hazırlanıyor…'}),
    h('div',{class:'pdf-loading-bar'},loadFill));
  stage.appendChild(loadBox);

  getPdfDocument(p.id,{id:p.id,pdfFn:p.pdfFn,externalPath:p.externalPath},{
    onProgress:function(ratio){loadFill.style.width=Math.max(15,Math.round(ratio*100))+'%';}
  }).then(async function(pdfDoc){
    if(!RD||RD.pid!==p.id) return;
    RD.pdfDoc=pdfDoc;
    clear(stage);
    var p1=await pdfDoc.getPage(sPg);
    var vp1=p1.getViewport({scale:1});
    var defaultRatio=(vp1.width||595)/(vp1.height||842);

    var io=new IntersectionObserver(function(){
      if(!RD||!RD.isPdf) return;
      schedulePdfRenderQueue();
    },{rootMargin:'120% 0px 120% 0px',threshold:[0,0.15,0.5]});
    RD.pdfIo=io;

    for(var pg=sPg;pg<=ePg;pg++){
      (function(pageNum,relNo){
        var wrap=h('div',{class:'pdf-canvas-wrap',style:{aspectRatio:String(defaultRatio)}});
        var tl=h('div',{class:'pdf-text-layer textLayer'});
        tl.addEventListener('mousedown',function(e){
          if(e.target===tl||(e.target.classList&&e.target.classList.contains('endOfContent'))){
            e.preventDefault();
            var sel=window.getSelection();
            if(sel&&!sel.isCollapsed) sel.removeAllRanges();
            return;
          }
          tl.classList.add('selecting');
        });
        var card=h('section',{class:'pdf-page-card','data-page':pageNum,'data-rel':relNo,id:'pdf-p-'+relNo,style:{aspectRatio:String(defaultRatio)}},wrap,tl);
        stage.appendChild(card);
        io.observe(card);
        RD.secs.push({el:card,title:'Sayfa '+relNo,idx:relNo-1});
      })(pg,pg-sPg+1);
    }
    if(initZoom!==1){
      setReaderZoom(initZoom,{force:true});
    }
    requestAnimationFrame(function(){
      measure();
      restorePos();
      schedulePdfRenderQueue();
    });
  }).catch(function(err){
    clear(stage);
    stage.appendChild(emptyState('PDF dosyası açılamadı','PDF kaynağına ulaşılamadı: '+String(err&&err.message||err),[
      btn('PDF Dosyasını Yeniden Seç','primary',function(){triggerPdfPick(p.uid,p.no);},'file')
    ]));
  });
}

/* Kaydırma sırasında PDF sanal kaydırıcısını rAF kilidiyle besle */
window.addEventListener('scroll',function(){
  if(RD&&RD.isPdf&&!RD._pdfScrollRaf){
    RD._pdfScrollRaf=requestAnimationFrame(function(){
      if(RD){
        RD._pdfScrollRaf=0;
        schedulePdfRenderQueue();
      }
    });
  }
},{passive:true});

/* Part İşlemleri Menüsü: Ağaç / Ana Akış Geçişi & Başlık Aday Çipleri */
var _origOpenPartMenu=openPartMenu;
openPartMenu=function(p){
  _origOpenPartMenu(p);
  try{
    if(!p) return;
    var modalEl=document.querySelector('.sheet');
    if(modalEl){
      var formEl=modalEl.querySelector('.form');
      if(formEl){
        var isTree=p.role==='supplementary'||!!p.subGroup;
        var treeActionBox=h('div',{class:'stack',style:{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid var(--faint)'}});
        if(isTree){
          treeActionBox.appendChild(h('div',{class:'fl',text:'Ünite Ağacı Konumu: '+(p.subGroup||'Sorular & Alıştırmalar')}));
          treeActionBox.appendChild(btn('Ana Ders Akışına Taşı (Part N Yap)','',function(){
            movePartToMainFlow(p.id);
            closeOverlay();
            refresh();
            toast('Part ana ders akışına taşındı.');
          },'book'));
        }else{
          treeActionBox.appendChild(btn('Ünite Ağacına (Soru/Ek Belge) Taşı','',function(){
            movePartToSubGroup(p.id,'Sorular & Alıştırmalar');
            closeOverlay();
            refresh();
            toast('Part soru ağacına taşındı.');
          },'folder'));
        }
        var rowEnd=formEl.querySelector('.row.end');
        if(rowEnd) rowEnd.before(treeActionBox);
        else formEl.appendChild(treeActionBox);
      }
    }
    if(p.kind==='pdf'||!p.text) return;
    var inp=$('pm-t');
    if(!inp) return;
    var an=analyzePart(p.text);
    if(an&&an.titleCandidates&&an.titleCandidates.length>1){
      var candsRow=h('div',{class:'tcands'},h('span',{class:'tcands-l',text:'Adaylar:'}));
      an.titleCandidates.forEach(function(c){
        var b=h('button',{type:'button',class:'tcand'+(inp.value===c.short?' on':''),text:c.short,title:c.full,onclick:function(){
          inp.value=c.short;
          candsRow.querySelectorAll('.tcand').forEach(function(x){x.classList.remove('on');});
          b.classList.add('on');
        }});
        candsRow.appendChild(b);
      });
      inp.after(candsRow);
    }
  }catch(e){}
};

/* Part Ekle Modalı: PDF Dosyası Seçimi (ArrayBuffer/Uint8Array) ve Başlık Aday Çipleri Desteği */
var _origOpenAdd=openAdd;
openAdd=function(opts){
  _origOpenAdd(opts);
  try{
    var ta=$('paste-input'),titleI=$('ad-t'),fileInp=$('paste-file');
    if(!ta||!titleI) return;
    var candsBox=h('div',{class:'tcands',hidden:true});
    titleI.after(candsBox);
    function updateAddCands(){
      var t=ta.value.trim();
      if(t.length<80){candsBox.hidden=true;return;}
      var an=analyzePart(t);
      clear(candsBox);
      if(!an.titleCandidates||an.titleCandidates.length<1){candsBox.hidden=true;return;}
      candsBox.hidden=false;
      candsBox.appendChild(h('span',{class:'tcands-l',text:'Algılanan Başlıklar:'}));
      an.titleCandidates.forEach(function(c){
        var b=h('button',{type:'button',class:'tcand'+(titleI.value===c.short?' on':''),text:c.short,title:c.full,onclick:function(){
          titleI.value=c.short;
          titleI.dispatchEvent(new Event('input'));
          candsBox.querySelectorAll('.tcand').forEach(function(x){x.classList.remove('on');});
          b.classList.add('on');
        }});
        candsBox.appendChild(b);
      });
    }
    ta.addEventListener('input',function(){setTimeout(updateAddCands,180);});
    setTimeout(updateAddCands,50);
    if(fileInp){
      fileInp.setAttribute('accept','.md,.markdown,.txt,.tex,.latex,.pdf,.PDF,application/pdf,text/plain,text/markdown,text/x-tex');
      fileInp.setAttribute('multiple','true');
      var lbl=fileInp.parentElement&&fileInp.parentElement.querySelector('.lbl');
      if(lbl) lbl.textContent='Dosya seç (.md, .tex, .pdf)';
      fileInp.addEventListener('change',function(ev){
        var fl=fileInp.files;
        if(!fl||!fl.length) return;
        var pdfFiles=[];
        for(var i=0;i<fl.length;i++){
          var item=fl[i];
          if(/\.pdf$/i.test(item.name)||item.type==='application/pdf'){
            var extPath=NATIVE&&NATIVE.getPathForFile?NATIVE.getPathForFile(item):(item.path||'');
            pdfFiles.push({name:item.name,file:item,externalPath:extPath});
          }
        }
        if(pdfFiles.length>1){
          ev.stopImmediatePropagation();
          fileInp.value='';
          closeOverlay();
          openMultiPdfImporter(pdfFiles,opts);
        }else if(pdfFiles.length===1){
          ev.stopImmediatePropagation();
          fileInp.value='';
          closeOverlay();
          openPdfImporter(pdfFiles[0],opts);
        }
      },true);
    }
  }catch(e){}
}

/* Okuyucu Hızlı Görünüm Ayarları (Aa Popover: 6 Tema, 4 Font, 4 Genişlik + Kontrol Merkezi Bağlantısı) */
function readerToggleSettings(){
  if(overlay.el&&overlay.el.id==='pop-set'){closeOverlay();return;}
  var out=h('output',{text:String(P.size)+' px'});
  var rng=h('input',{type:'range',min:15,max:28,step:1,value:P.size,id:'size','aria-label':'Yazı boyutu'});
  rng.addEventListener('input',function(){P.size=+rng.value;out.textContent=rng.value+' px';savePrefs();applyPrefs();clearTimeout(RD&&RD.rt);if(RD) RD.rt=setTimeout(measure,150);});
  var pop=h('div',{class:'pop set',id:'pop-set',tabindex:'-1',role:'dialog','aria-label':'Okuma ayarları',style:{width:'min(390px,calc(100vw - 32px))'}},
    prefSeg('Tema','theme',[['auto','Sistem'],['light','Gündüz'],['sepia','Kâğıt'],['dark','Gece'],['oled','OLED'],['nord','Nord']],function(){if(RD&&RD.isPdf) schedulePdfRenderQueue();}),
    h('div',{class:'field'},h('label',{class:'fl',for:'size'},h('span',{text:'Yazı boyutu'}),out),rng),
    prefSeg('Yazı tipi','font',[['serif','Literata'],['classic','Klasik'],['sans','Sans'],['mono','Mono']],function(){if(RD) setTimeout(measure,150);}),
    prefSeg('Satır genişliği','width',[['narrow','Dar'],['normal','Normal'],['wide','Geniş'],['full','Tam']],function(){if(RD) setTimeout(measure,150);}),
    prefSeg('Üst çubuk','bar',[['static','Sayfayla kayar'],['fixed','Sabit']]),
    h('div',{class:'row end',style:{marginTop:'6px'}},btn('Tüm Pro Ayarlar…','sm ghost',function(){closeOverlay();openSettings();},'gear')));
  openOverlay(pop,{clear:true});
}

/* ---------- 7. BÖLÜM 1.2: LINEAR / RAYCAST / MACOS SYSTEM SETTINGS TARZI İKİ SÜTUNLU KONTROL MERKEZİ ---------- */
function openSettings(initialTab){
  ensureProPrefs();
  var activeTab=initialTab||'ui';
  var pane=h('div',{class:'pset-pane'});
  var nav=h('nav',{class:'pset-nav','aria-label':'Ayar kategorileri'});

  var tabs=[
    {id:'ui',ic:'eye',label:'Görünüm ve Arayüz'},
    {id:'pdf',ic:'file',label:'PDF ve Okuma Motoru'},
    {id:'perf',ic:'cpu',label:'Performans ve Depolama'},
    {id:'keys',ic:'keyboard',label:'Klavye ve Kontroller'}
  ];

  function pRow(title,desc,ctrlEl){
    return h('div',{class:'pset-row'},
      h('div',{class:'pset-info'},
        h('div',{class:'pset-title',text:title}),
        desc?h('div',{class:'pset-desc',text:desc}):null),
      h('div',{class:'pset-ctrl'},ctrlEl));
  }

  function pSwitch(key,after){
    var b=h('button',{
      type:'button',
      class:'pset-switch',
      role:'switch',
      'aria-checked':String(!!P[key]),
      onclick:function(){
        P[key]=!P[key];
        b.setAttribute('aria-checked',String(!!P[key]));
        savePrefs();applyPrefs();
        if(after) after(P[key]);
      }
    });
    return b;
  }

  function pSeg(key,opts,after){
    var g=h('div',{class:'seg',role:'radiogroup'});
    opts.forEach(function(o){
      g.appendChild(h('button',{
        type:'button',
        role:'radio',
        'aria-checked':String(P[key]===o[0]),
        text:o[1],
        onclick:function(){
          P[key]=o[0];
          savePrefs();applyPrefs();
          g.querySelectorAll('button').forEach(function(x,i){x.setAttribute('aria-checked',String(opts[i][0]===P[key]));});
          if(after) after(P[key]);
        }
      }));
    });
    return g;
  }

  function pRange(key,min,max,step,unit,after){
    var valEl=h('span',{class:'pset-val',text:P[key]+(unit||'')});
    var rng=h('input',{type:'range',min:min,max:max,step:step,value:P[key]});
    rng.addEventListener('input',function(){
      P[key]=+rng.value;
      valEl.textContent=P[key]+(unit||'');
      savePrefs();applyPrefs();
      if(after) after(P[key]);
    });
    return h('div',{class:'pset-range-wrap'},rng,valEl);
  }

  function renderPane(){
    clear(pane);
    pane.scrollTop=0;
    nav.querySelectorAll('.pset-tab').forEach(function(b){b.classList.toggle('on',b.dataset.tab===activeTab);});

    if(activeTab==='ui'){
      pane.appendChild(h('div',{class:'pset-group'},
        h('div',{class:'pset-group-h',text:'Tema ve Renk Atmosferi'}),
        pRow('Renk Teması','Gündüz, sıcak kâğıt (Sepya), gece veya saf siyah OLED / Nord paletleri.',
          pSeg('theme',[['auto','Sistem'],['light','Gündüz'],['sepia','Kâğıt'],['dark','Gece'],['oled','OLED'],['nord','Nord']],function(){if(RD&&RD.isPdf) schedulePdfRenderQueue();})),
        pRow('Arayüz Ölçeği','Üst çubuk, kartlar ve kontrol panellerinin genel yoğunluğu.',
          pSeg('uiScale',[['compact','Kompakt'],['normal','Standart'],['large','Geniş']])),
        pRow('Mikro-Etkileşimler ve Animasyonlar','175ms cubic-bezier buton ve panel geçiş animasyonları.',
          pSwitch('anim'))));

      pane.appendChild(h('div',{class:'pset-group'},
        h('div',{class:'pset-group-h',text:'Editoryal Tipografi ve Düzen'}),
        pRow('Okuma Yazı Tipi','Ders metinlerinde kullanılacak ana dizgi ailesi.',
          pSeg('font',[['serif','Literata'],['classic','Klasik'],['sans','Sans'],['mono','Mono']],function(){if(RD) setTimeout(measure,120);})),
        pRow('Varsayılan Yazı Boyutu','Markdown ve LaTeX ders notlarının temel punto büyüklüğü.',
          pRange('size',15,28,1,' px',function(){if(RD) setTimeout(measure,120);})),
        pRow('Satır Genişliği (Measure)','Okuyucu sütununun maksimum karakter genişliği.',
          pSeg('width',[['narrow','Dar'],['normal','Normal'],['wide','Geniş'],['full','Tam']],function(){if(RD) setTimeout(measure,120);})),
        pRow('Üst Çubuk Davranışı','Okuma sırasında üst gezinme çubuğunun konumu.',
          pSeg('bar',[['static','Sayfayla kayar'],['fixed','Sabit']])),
        pRow('Uygulama Açılış Ekranı','GioReader Pro başlatıldığında ilk açılacak görünüm.',
          pSeg('start',[['home','Kitaplık'],['resume','Kaldığım yer']]))));
      return;
    }

    if(activeTab==='pdf'){
      var speedDesc=h('div',{class:'pset-desc'});
      function updateSpeedDesc(){
        var wi=wpmInfo(),tw=0,np=0;
        allParts().forEach(function(p){if(getCourse(p.cid)&&getUnit(p.uid)){np++;tw+=partWords(p);}});
        var tot=Math.round(tw/(P.wpmFixed?WPM_DEF:wi.wpm));
        speedDesc.textContent=(wi.learned?'Kişisel okuma hızın: ~'+wi.wpm+' kelime/dk ('+wi.n+' parttan öğrenildi). ':'Varsayılan hız: '+WPM_DEF+' kelime/dk. ')+'Toplam '+np+' part · ~'+(tot>=90?Math.floor(tot/60)+' sa '+(tot%60)+' dk':tot+' dk')+' okuma.';
      }
      updateSpeedDesc();

      pane.appendChild(h('div',{class:'pset-group'},
        h('div',{class:'pset-group-h',text:'Dual-Phase HiDPI PDF Render Motoru (32 GB RAM Optimize)'}),
        pRow('Varsayılan PDF Yakınlaştırma','PDF belgeleri açıldığında uygulanacak başlangıç ölçeği.',
          pRange('pdfDefaultZoom',75,200,5,'%',function(val){if(RD&&RD.isPdf) setReaderZoom(val/100);})),
        pRow('HiDPI Vektör Keskinlik Çarpanı','Retina / 4K / 8K süper-örnekleme (super-sampling) katmanı.',
          pSeg('pdfDprBoost',[[2,'2x Retina'],[3,'3x Ultra-HD (32GB)'],[4,'4x 8K Stüdyo']],function(){
            if(RD&&RD.isPdf&&RD.pdfStage){
              RD.pdfStage.querySelectorAll('.pdf-page-card').forEach(function(c){delete c.dataset.renderedSig;});
              schedulePdfRenderQueue();
            }
          })),
        pRow('Sayfa Görünüm Düzeni','PDF sayfalarını tek sütun veya yan yana çift sayfa olarak diz.',
          pSeg('pdfSpread',[['single','Tek Sayfa'],['double','Çift Sayfa']],function(v){
            if(RD&&RD.isPdf&&RD.pdfStage){
              RD.pdfStage.classList.toggle('spread-double',v==='double');
              RD.pdfStage.querySelectorAll('.pdf-page-card').forEach(function(c){delete c.dataset.renderedSig;});
              schedulePdfRenderQueue();
            }
          })),
        pRow('PDF Sütun Genişliği','PDF okuyucu sahnesinin sayfa içindeki genişliği.',
          pSeg('pdfWidth',[['col','Dar'],['normal','Normal'],['wide','Geniş'],['full','Tam Ekran']],function(v){
            if(RD&&RD.isPdf){
              var col=$('article');if(col) col.setAttribute('data-pw',v);
              setTimeout(schedulePdfRenderQueue,180);
            }
          })),
        pRow('Varsayılan PDF Renk Filtresi','Gece/Sepya temalarında PDF sayfalarına uygulanacak akıllı kontrast filtresi.',
          pSeg('pdfFilter',[['auto','Otomatik'],['orig','Orijinal'],['sepia','Sepya'],['dark','Gece']],function(v){
            if(RD&&RD.isPdf&&RD.pdfStage){
              var eff=v==='auto'?(isDarkNow()?'dark':(P.theme==='sepia'?'sepia':'orig')):v;
              RD.pdfStage.setAttribute('data-pfilter',eff);
            }
          })),
        pRow('Otomatik Kenar Boşluğu Kırpma (Auto-Crop)','PDF sayfalarındaki gereksiz beyaz kenar boşluklarını görsel oranını bozmadan kırpar.',
          pSwitch('pdfCrop',function(){
            if(RD&&RD.isPdf&&RD.pdfStage){
              RD.pdfStage.querySelectorAll('.pdf-page-card').forEach(function(c){delete c.dataset.renderedSig;});
              schedulePdfRenderQueue();
            }
          })),
        pRow('Vektörel Metin Seçim Katmanı (TextLayer)','PDF üzerindeki metinlerin seçilebilmesini, kopyalanmasını ve vurgulanmasını sağlar.',
          pSwitch('pdfTextLayer',function(){
            if(RD&&RD.isPdf&&RD.pdfStage){
              RD.pdfStage.querySelectorAll('.pdf-page-card').forEach(function(c){delete c.dataset.renderedSig;});
              schedulePdfRenderQueue();
            }
          }))));

      pane.appendChild(h('div',{class:'pset-group'},
        h('div',{class:'pset-group-h',text:'Akıllı Okuma, Başlık Motoru ve Süre Analitiği'}),
        pRow('Part Yapıştırılınca','Yeni bir part eklendiğinde okuyucuyu hemen aç veya ünitede kal.',
          pSeg('after',[['stay','Sayfada kal'],['read','Okuyucuyu aç']])),
        pRow('Part Sonunda Otomatik Okundu Say','Sayfanın sonuna ulaşıldığında partı otomatik tamamlandı işaretle.',
          pSwitch('autoDone')),
        h('div',{class:'pset-row'},
          h('div',{class:'pset-info'},h('div',{class:'pset-title',text:'Süre Tahmini Modu'}),speedDesc),
          h('div',{class:'pset-ctrl'},pSeg('wpmFixed',[[false,'Hızımı Öğren'],[true,'Sabit 170 k/dk']],function(){wpmCache.k=-1;updateSpeedDesc();}))),
        pRow('Kitaplık Başlıklarını ve İpuçlarını Onar','Tüm derslerdeki kesik veya jenerik part başlıklarını v2 motoruyla yeniden tarar.',
          btn('Başlıkları Onar','sm',async function(){
            var cnt=await healLibraryMetadata();
            refresh();
            toast('Kitaplık tarandı · '+cnt+' part başlığı iyileştirildi');
          },'check'))));
      return;
    }

    if(activeTab==='perf'){
      var fsBox=h('div',{class:'pset-group'});
      fsBox.appendChild(h('div',{class:'pset-group-h',text:'Kitaplık Klasörü, Yedekleme ve Masaüstü'}));

      var fsStatusText=FS.state==='none'?'Bağlı değil':FS.state==='need'?(FS.name||'Klasör')+' (izin gerekiyor)':FS.state==='busy'?'Eşitleniyor…':FS.state==='err'?(FS.err||'Hata'):(FS.name||'Klasör')+' · Bağlı ve güncel';
      var fsActs=h('div',{class:'row wrap'});
      if(FS.state==='none'){
        fsActs.appendChild(btn('Klasör Bağla','sm primary',function(){fsLink().then(function(){renderPane();refresh();});},'folder'));
      }else{
        fsActs.appendChild(btn('Şimdi Eşitle','sm',function(){fsSync(true).then(function(){toast('Klasör eşitlendi');renderPane();refresh();});},'sync'));
        fsActs.appendChild(btn('Klasörü Değiştir','sm ghost',function(){fsLink().then(function(){renderPane();refresh();});},'folder'));
        if(window.gioNative) fsActs.appendChild(btn('Klasörü Aç','sm ghost',function(){window.gioNative.openFolder();},'folder'));
      }
      fsBox.appendChild(pRow('Yerel Kitaplık Klasörü',fsStatusText,fsActs));

      var expActs=h('div',{class:'row wrap'},
        btn('Tek HTML','sm',exportHTML,'file'),
        btn('ZIP Arşivi','sm',exportZip,'layers'),
        btn('JSON Yedek','sm',saveBackup,'download'),
        btn('Ünite/Ders PDF','sm',function(){closeOverlay();openExport({});},'download'));
      fsBox.appendChild(pRow('Dışa Aktarma ve Yedekleme','Kitaplığını tek dosya HTML, Markdown ZIP arşivi veya JSON yedeği olarak kaydet.',expActs));

      if(window.gioNative){
        fsBox.appendChild(pRow('Masaüstü Kısayolu','Masaüstüne ve Başlat menüsüne GioReader Pro kısayolu ekle.',
          btn('Kısayol Oluştur','sm',function(){window.gioNative.shortcut().then(function(r){toast(r&&r.ok?'Kısayol oluşturuldu: '+r.msg:'Kısayol oluşturulamadı');});},'download')));
      }

      pane.appendChild(h('div',{class:'pset-group'},
        h('div',{class:'pset-group-h',text:'Donanım Hızlandırma ve Bellek Yönetimi (32 GB RAM Profili)'}),
        pRow('GPU Çift Tamponlama (Double-Buffering)','Zoom ve sayfa geçişlerinde beyaz ekran titremesini (flicker) sıfırlar.',
          pSwitch('gpuAccel')),
        pRow('Sanal Kaydırıcı Tampon Sayfa Sayısı','Ekran dışındaki ±N sayfayı ön-bellekte hazır tutar, uzak sayfaları RAM\'den temizler.',
          pSeg('pdfBufferPages',[[2,'±2 Sayfa (Standart)'],[4,'±4 Sayfa (32GB Önerilen)'],[8,'±8 Sayfa (32GB Ultra)']])),
        pRow('Maksimum Canvas Çözünürlük Tavanı','%400–%500 zoom seviyelerinde GPU doku belleği üst sınırı.',
          pSeg('pdfMaxCanvasDim',[[4096,'4K (4096px)'],[8192,'8K (8192px · Önerilen)'],[12288,'12K (12288px · 32GB Maks)']])),
        pRow('FPS Hedef Modu','Kaydırma ve 2-parmak touchpad yakınlaştırma kare hızı hedefi.',
          pSeg('fpsTarget',[[60,'60 FPS Dengeli'],[120,'120+ FPS Ultra Akıcı']])),
        pRow('Canlı FPS Sayacını Göster','Sol alt köşede gerçek zamanlı kare hızı (FPS) telemetri rozetini gösterir.',
          pSwitch('showFps'))));

      pane.appendChild(fsBox);
      return;
    }

    if(activeTab==='keys'){
      var krows=[
        ['Touchpad 2 Parmak Kıstır / Aç','Sıfır gecikmeli (120 FPS) doğrudan ekran ve PDF yakınlaştırma'],
        ['Ctrl + Fare Tekerleği','İmleç odak noktasını koruyarak yakınlaştır / uzaklaştır'],
        ['Ctrl + 0','Yakınlaştırmayı %100 orijinal boyuta sıfırla'],
        ['Ctrl + K  veya  /','Tüm derslerde, partlarda ve PDF metinlerinde anında ara'],
        ['Ctrl + V','Kopyalanan ders metnini otomatik algılayıp ilgili part yuvasına ekle'],
        ['J  /  K','Okuyucuda sonraki / önceki alt başlığa (veya PDF sayfasına) geç'],
        ['[  /  ]','Ünitedeki önceki / sonraki parta geç'],
        ['F','Odak modunu (Focus Mode) aç / kapat'],
        ['T','İçindekiler (Bölümler) veya PDF sayfa önizlemelerini aç'],
        ['A – E  veya  1 – 5','Test modunda şık işaretle (Enter: sonraki, F: bayrak, M: soru haritası)'],
        ['Esc','Açık pencereyi, odak modunu veya yazdırma görünümünü kapat']
      ];
      var grp=h('div',{class:'pset-group'},h('div',{class:'pset-group-h',text:'Dokunmatik Yüzey (Touchpad) ve Klavye Kısayolları'}));
      krows.forEach(function(r){
        grp.appendChild(pRow(r[1],null,h('kbd',{text:r[0]})));
      });
      pane.appendChild(grp);
    }
  }

  tabs.forEach(function(t){
    nav.appendChild(h('button',{
      type:'button',
      class:'pset-tab'+(t.id===activeTab?' on':''),
      'data-tab':t.id,
      onclick:function(){activeTab=t.id;renderPane();}
    },icon(t.ic,17),h('span',{text:t.label})));
  });

  renderPane();

  var box=h('div',{class:'sheet pset-modal',role:'dialog','aria-label':'GioReader Pro Kontrol Merkezi',tabindex:'-1'},
    h('div',{class:'pset-head'},
      h('div',{class:'pset-head-t'},logoEl(22),h('h2',{text:'GioReader Pro · Kontrol Merkezi'}),h('span',{class:'brand-pro',text:'PRO'})),
      ibtn('close','Kapat',closeOverlay)),
    h('div',{class:'pset-body'},nav,pane));
  var wrap=h('div',{class:'modal',onmousedown:function(e){if(e.target===wrap) closeOverlay();}},box);
  openOverlay(wrap,{});
}

/* Sürükle-Bırak (Drag & Drop) İle Doğrudan PDF (%PDF- Magic Header Doğrulamalı) veya Markdown Ekleme */
window.addEventListener('dragover',function(e){e.preventDefault();});
window.addEventListener('drop',function(e){
  if(!e.dataTransfer||!e.dataTransfer.files||!e.dataTransfer.files.length) return;
  e.preventDefault();
  var rawFiles=Array.prototype.slice.call(e.dataTransfer.files);
  var pdfFiles=[];
  var otherFiles=[];

  rawFiles.forEach(function(f){
    var extPath=NATIVE&&NATIVE.getPathForFile?NATIVE.getPathForFile(f):(f.path||'');
    if(/\.pdf$/i.test(f.name)||f.type==='application/pdf'){
      pdfFiles.push({name:f.name,file:f,externalPath:extPath});
    }else{
      otherFiles.push(f);
    }
  });

  if(pdfFiles.length>1){
    openMultiPdfImporter(pdfFiles);
    return;
  }
  if(pdfFiles.length===1){
    openPdfImporter(pdfFiles[0]);
    return;
  }

  // Uzantısı farklı veya boş olsa bile ilk baytlarında %PDF- varsa PDF olarak aç!
  if(otherFiles.length===1){
    var f=otherFiles[0];
    var extPath=NATIVE&&NATIVE.getPathForFile?NATIVE.getPathForFile(f):(f.path||'');
    readBlobAsUint8Array(f.slice(0,1024)).then(function(headBytes){
      if(headBytes&&headBytes[0]===0x25&&headBytes[1]===0x50&&headBytes[2]===0x44&&headBytes[3]===0x46){
        openPdfImporter({name:f.name,file:f,externalPath:extPath});
      }else if(/\.(md|markdown|txt|tex|latex)$/i.test(f.name)||f.type.indexOf('text')===0){
        var r=new FileReader();
        r.onload=function(){quickAdd(String(r.result||''));};
        r.readAsText(f);
      }
    }).catch(function(){});
  }
});

/* Otomatik Doğrulama ve Self-Test Köprüsü */
window.__gioApi={
  healLibraryMetadata:healLibraryMetadata,
  loadMeta:function(){return S.meta;},
  loadPidx:function(){return S.parts;},
  findUnit:function(uid){var u=getUnit(uid);return {unit:u,course:u?getCourse(u.cid):null};},
  navTo:function(v,o){o=o||{};go(Object.assign({v:v},o));},
  setReaderZoom:setReaderZoom,
  getZoomPct:getZoomPct,
  resetReaderZoom:resetReaderZoom,
  computeUnitReadingAnalytics:computeUnitReadingAnalytics,
  inspectPdfForImport:inspectPdfForImport,
  openMultiPdfImporter:openMultiPdfImporter,
  storePdfPartInUnit:storePdfPartInUnit,
  subPartsOfUnit:subPartsOfUnit,
  mainPartsOfUnit:mainPartsOfUnit,
  movePartToSubGroup:movePartToSubGroup,
  movePartToMainFlow:movePartToMainFlow,
  autoMigrateQuestionsToTree:autoMigrateQuestionsToTree,
  openSettings:openSettings,
  closeOverlay:closeOverlay,
  flushSyncPush:async function(){await healLibraryMetadata();return await fsWriteAll();}
};

