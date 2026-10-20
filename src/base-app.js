(function(){
'use strict';
/* ===================== LaTeX → Markdown dönüştürücü =====================
   Yapıştırılan metin LaTeX biçimindeyse (\section, \textbf, itemize, tabular, theorem …)
   saklanan ham metne dokunmadan, çözümleme/okuma/dışa aktarma sırasında Markdown'a çevrilir.
   Matematik ($…$, \[…\], align…) olduğu gibi korunur ve MathJax'e bırakılır. */
var LX_STRUCT=/\\(?:documentclass|usepackage|begin\{document\}|(?:sub)*section\*?[\[{]|chapter\*?[\[{]|textbf\{|textit\{|emph\{|textsc\{|underline\{|begin\{(?:itemize|enumerate|description|tabular|tabularx|longtable|theorem|thm|lemma|definition|proof|example|remark|proposition|corollary|center|verbatim|lstlisting|figure|table|quote|quotation|abstract|minipage|thebibliography|tikzpicture|circuitikz)\*?\}|item\b|paragraph\{|maketitle|hline|toprule|midrule|includegraphics|footnote\{|href\{|texttt\{)/g;
function lxScore(s){
  var t=String(s).replace(/(^|\n)[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(?:\n[ \t]*\2[^\n]*|$)/g,' ')
    .replace(/`[^`\n]*`/g,' ').replace(/\$\$[\s\S]*?\$\$/g,' ').replace(/\\\[[\s\S]*?\\\]/g,' ')
    .replace(/\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray|displaymath|array|(?:[pbBvV]|small)?matrix|cases|split|aligned)(\*?)\}[\s\S]*?\\end\{\1\2\}/g,' ')
    .replace(/\$[^$\n]{1,300}\$/g,' ');
  var m=t.match(LX_STRUCT);
  return {n:m?m.length:0,strong:/\\documentclass|\\begin\{document\}/.test(t)};
}
function looksLatex(s){
  s=String(s||'');
  if(s.indexOf('\\')<0) return false;
  var r=lxScore(s);
  return r.n>=2||r.strong;
}

var LX_ACC={'`':'\u0300',"'":'\u0301','^':'\u0302','~':'\u0303','"':'\u0308','=':'\u0304','.':'\u0307','u':'\u0306','v':'\u030C','c':'\u0327','H':'\u030B','k':'\u0328','r':'\u030A','d':'\u0323','b':'\u0331'};
var LX_SPEC={ss:'ß',o:'ø',O:'Ø',ae:'æ',AE:'Æ',oe:'œ',OE:'Œ',aa:'å',AA:'Å',l:'ł',L:'Ł',i:'ı',j:'ȷ',S:'§',P:'¶',dag:'†',ddag:'‡',copyright:'©',pounds:'£',textdegree:'°',textregistered:'®',texttrademark:'™',texteuro:'€',textbullet:'•',
  textbackslash:'\\\\',textasciitilde:'~',textasciicircum:'^',textless:'<',textgreater:'>',textbar:'|',ldots:'…',dots:'…',textellipsis:'…',LaTeX:'LaTeX',TeX:'TeX',LaTeXe:'LaTeX2e',
  textquoteleft:'‘',textquoteright:'’',textquotedblleft:'“',textquotedblright:'”',guillemotleft:'«',guillemotright:'»',textendash:'–',textemdash:'—',
  today:'',degree:'°',checkmark:'✓',textperiodcentered:'·',textperthousand:'‰',textminus:'−',textpm:'±',texttimes:'×',textdiv:'÷',
  quad:' ',qquad:'  ',enspace:' ',thinspace:' ',space:' ',nbsp:'\u00a0'};
/* tek argümanlı biçim komutları: komut → işaretleyici ('' = sadece içeriği al) */
var LX_FMT={textbf:'**',bf:null,textit:'*',emph:'*',textsl:'*',textsc:'',textrm:'',textsf:'',textnormal:'',textup:'',textmd:'',text:'',mbox:'',hbox:'',underline:'',uline:'',ul:'',hl:'',fbox:'',framebox:'',boxed:'',
  textcolor:2,colorbox:2,mathbf:'**',textsuperscript:'sup',textsubscript:'sub',textbfit:'***',ensuremath:'',uppercase:'U',MakeUppercase:'U',MakeLowercase:'L',lowercase:'L',textnumero:'',
  parbox:2,makebox:1,raisebox:2,scalebox:2,resizebox:3,fcolorbox:3,vphantom:'X',hphantom:'X',phantom:'X',mbox2:''};
var LX_SEC={part:'# ',chapter:'# ',section:'## ',subsection:'### ',subsubsection:'#### ',frametitle:'### '};
/* tamamen silinen (argümansız) komutlar */
var LX_DROP=/^(?:noindent|centering|raggedright|raggedleft|medskip|bigskip|smallskip|hfill|vfill|newpage|clearpage|cleardoublepage|pagebreak|nopagebreak|linebreak|nolinebreak|relax|protect|sloppy|fussy|normalsize|small|footnotesize|scriptsize|tiny|large|Large|LARGE|huge|Huge|normalfont|bfseries|itshape|slshape|ttfamily|rmfamily|sffamily|scshape|upshape|mdseries|selectfont|maketitle|tableofcontents|listoftables|listoffigures|appendix|frontmatter|mainmatter|backmatter|begingroup|endgroup|bgroup|egroup|null|strut|allowbreak|nobreak|ignorespaces|flushbottom|raggedbottom|onecolumn|twocolumn|thispagestyle|break|goodbreak|par|hrulefill|dotfill|vss|hss|midrule|toprule|bottomrule|hline|nonumber|notag|qed|qedhere|displaystyle|bf|it|em|tt|sc|rm|sf|sl)$/;
/* argümanını (ve varsa [opt] kısmını) tamamen silen komutlar */
var LX_DROP1=/^(?:label|index|vspace|hspace|vskip|hskip|pagestyle|pagenumbering|setlength|addtolength|setcounter|addtocounter|geometry|graphicspath|bibliographystyle|bibliography|input|include|usepackage|documentclass|usetikzlibrary|color|pagecolor|newcounter|title|date|author|thanks|tikzset|hypersetup|captionsetup|lstset|setcounter|fontsize|linespread|renewcommand|newcommand|providecommand|DeclareMathOperator|newtheorem|theoremstyle|newenvironment|renewenvironment|def|let|makeatletter|makeatother|titleformat|titlespacing|rowcolors|rowcolor|cellcolor|arrayrulecolor|extrarowheight|cmidrule|cline|specialrule|addlinespace|nopagebreak|enlargethispage|setstretch|doublespacing|singlespacing|onehalfspacing|numberwithin|maketitle)$/;
var LX_ESC={'\\&':'\uE015','\\%':'\uE013','\\$':'\uE012','\\#':'\uE016','\\_':'\uE017','\\{':'\uE018','\\}':'\uE019'};
var LX_UNESC={'\uE015':'&','\uE013':'%','\uE012':'$','\uE016':'#','\uE017':'_','\uE018':'{','\uE019':'}'};
var LX_ESCMD={'\uE015':'&','\uE013':'%','\uE012':'\\$','\uE016':'\\#','\uE017':'\\_','\uE018':'\\{','\uE019':'\\}'};
function lxPH(i){return '\uE010'+i+'\uE011';}
function lxUnesc(t){return t.replace(/[\uE012\uE013\uE015-\uE019]/g,function(c){return LX_UNESC[c];});}
function lxGroup(s,i,o,c){
  if(s.charAt(i)!==o) return null;
  var d=0;
  for(var j=i;j<s.length;j++){
    var ch=s.charAt(j);
    if(ch==='\\'){j++;continue;}
    if(ch===o) d++;
    else if(ch===c){d--;if(d===0) return {t:s.slice(i+1,j),end:j+1};}
  }
  return null;
}
function lxArg(s,i){
  var k=i;
  while(k<s.length&&(s.charAt(k)===' '||s.charAt(k)==='\t'||s.charAt(k)==='\n')) k++;
  if(s.charAt(k)==='{') return lxGroup(s,k,'{','}');
  /* \textbf x gibi tek karakterli argüman */
  return null;
}
function lxOpt(s,i){
  var k=i;
  while(k<s.length&&(s.charAt(k)===' '||s.charAt(k)==='\t')) k++;
  if(s.charAt(k)==='[') return lxGroup(s,k,'[',']');
  return null;
}
function lxWrap(mk,t){
  var lead=/^\s*/.exec(t)[0],trail=/\s*$/.exec(t)[0],core=t.trim();
  if(!core) return t;
  if(mk==='sup') return '<sup>'+core+'</sup>';
  if(mk==='sub') return '<sub>'+core+'</sub>';
  if(!mk) return t;
  if(/\n\s*\n/.test(core)) return t;
  return lead+mk+core+mk+trail;
}
function lxAccent(acc,ch){
  var base=ch.charAt(0),r=base+LX_ACC[acc]+ch.slice(1);
  try{return r.normalize('NFC');}catch(e){return r;}
}
var LX_RE=/\\([A-Za-z]+)(\*?)/y;
function lxText(s,strong){
  var out='',i=0,n=s.length;
  while(i<n){
    var c=s.charAt(i);
    if(c==='\\'){
      var nx=s.charAt(i+1);
      if(nx==='\\'){ /* \\ ve isteğe bağlı [len] */
        out+='\\\\';i+=2;
        var o2=lxOpt(s,i);if(o2&&/^\s*-?[\d.]+\s*(?:pt|mm|cm|em|ex|in|bp)?\s*$/.test(o2.t)) i=o2.end;
        continue;
      }
      if(nx===''){out+='\\';i++;continue;}
      if(!/[A-Za-z]/.test(nx)){
        /* kontrol sembolü */
        if(LX_ACC[nx]&&/[`'^~"=.]/.test(nx)){
          var a=lxArg(s,i+2);
          if(a){out+=lxAccent(nx,lxText(a.t,strong)||'e');i=a.end;continue;}
          var nc=s.charAt(i+2);
          if(nc==='\\'&&/^\\[ij]\b/.test(s.slice(i+2,i+5))){out+=lxAccent(nx,s.charAt(i+3)==='i'?'ı':'ȷ');i+=4;continue;}
          if(/[A-Za-z]/.test(nc)){out+=lxAccent(nx,nc);i+=3;continue;}
          out+=nx;i+=2;continue;
        }
        if(nx===','||nx===';'||nx===':'||nx==='!'||nx===' '||nx==='/'||nx==='@'){out+=(nx==='!'||nx==='/'||nx==='@')?'':' ';i+=2;continue;}
        if(nx==='-'){i+=2;continue;}
        out+='\\'+nx;i+=2;continue;
      }
      LX_RE.lastIndex=i;
      var m=LX_RE.exec(s);
      var name=m[1],star=m[2],j=i+m[0].length;
      /* harf aksanları: \c{c} \u{g} \v s */
      if(LX_ACC[name]&&name.length===1&&/[uvcHkrdb]/.test(name)){
        var a2=lxArg(s,j);
        if(a2){out+=lxAccent(name,lxText(a2.t,strong)||'e');i=a2.end;continue;}
        var sp=/^[ \t]+([A-Za-z])/.exec(s.slice(j,j+4));
        if(sp){out+=lxAccent(name,sp[1]);i=j+sp[0].length;continue;}
      }
      if(LX_SPEC.hasOwnProperty(name)){
        out+=LX_SPEC[name];
        if(s.substr(j,2)==='{}') j+=2;
        i=j;continue;
      }
      if(LX_SEC.hasOwnProperty(name)){
        var so=lxOpt(s,j);if(so) j=so.end;
        var sa=lxArg(s,j);
        if(sa){out+='\n\n'+LX_SEC[name]+lxText(sa.t,strong).replace(/\s*\n\s*/g,' ').trim()+'\n\n';i=sa.end;continue;}
      }
      if(name==='paragraph'||name==='subparagraph'){
        var po=lxOpt(s,j);if(po) j=po.end;
        var pa=lxArg(s,j);
        if(pa){out+='\n\n**'+lxText(pa.t,strong).trim()+'.** ';i=pa.end;continue;}
      }
      if(LX_FMT.hasOwnProperty(name)){
        var mk=LX_FMT[name];
        var oo=lxOpt(s,j);if(oo&&(mk===1||mk===2||mk===3)) j=oo.end;
        if(typeof mk==='number'){
          var k=j,arg=null;
          for(var q=0;q<mk;q++){arg=lxArg(s,k);if(!arg) break;k=arg.end;}
          if(arg){out+=lxText(arg.t,strong);i=arg.end;continue;}
        }else if(mk!==null){
          var ag=lxArg(s,j);
          if(ag){
            var inner=lxText(ag.t,strong);
            if(mk==='U') inner=inner.toLocaleUpperCase('tr');
            else if(mk==='L') inner=inner.toLocaleLowerCase('tr');
            else if(mk==='X') inner='';
            out+=(mk==='U'||mk==='L'||mk==='X')?inner:lxWrap(mk,inner);
            i=ag.end;continue;
          }
        }
      }
      if(name==='texttt'||name==='texttt'||name==='lstinline'||name==='code'||name==='verb'){
        var ta=lxArg(s,j);
        if(ta){var tx=lxUnesc(lxText(ta.t,strong)).trim();out+=tx?(tx.indexOf('`')>=0?'`` '+tx+' ``':'`'+tx+'`'):'';i=ta.end;continue;}
      }
      if(name==='footnote'||name==='footnotetext'||name==='marginpar'||name==='sidenote'){
        var fo=lxOpt(s,j);if(fo) j=fo.end;
        var fa=lxArg(s,j);
        if(fa){out+=' *('+lxText(fa.t,strong).replace(/\s+/g,' ').trim()+')*';i=fa.end;continue;}
      }
      if(name==='cite'||name==='citep'||name==='citet'||name==='nocite'){
        var co=lxOpt(s,j),jj=co?co.end:j,ca=lxArg(s,jj);
        if(ca){out+=name==='nocite'?'':'['+ca.t.replace(/\s+/g,' ').trim()+(co?', '+co.t.trim():'')+']';i=ca.end;continue;}
      }
      if(name==='ref'||name==='eqref'||name==='pageref'||name==='autoref'||name==='cref'||name==='Cref'||name==='nameref'||name==='vref'){
        var ra=lxArg(s,j);
        if(ra){out+='('+ra.t.trim()+')';i=ra.end;continue;}
      }
      if(name==='url'){
        var ua=lxArg(s,j);
        if(ua){out+=lxUnesc(ua.t).trim();i=ua.end;continue;}
      }
      if(name==='href'){
        var h1=lxArg(s,j);
        if(h1){var h2=lxArg(s,h1.end);if(h2){out+='['+lxText(h2.t,strong)+']('+lxUnesc(h1.t).trim()+')';i=h2.end;continue;}}
      }
      if(name==='includegraphics'){
        var io=lxOpt(s,j),ik=io?io.end:j,ia=lxArg(s,ik);
        if(ia){out+='\n\n*[Görsel: '+lxUnesc(ia.t).trim()+']*\n\n';i=ia.end;continue;}
      }
      if(name==='caption'||name==='captionof'){
        /* ortam içinde işlenir; burada sadece sar */
        var cco=lxOpt(s,j);if(cco) j=cco.end;
        var cca=lxArg(s,j);
        if(cca){out+='\\caption{'+lxText(cca.t,strong)+'}';i=cca.end;continue;}
      }
      if(name==='textsuperscript'||name==='textsubscript'){}
      if(name==='today'||name==='thispagestyle'){i=j;continue;}
      if(name==='multicolumn'){
        var m1=lxArg(s,j),m2=m1?lxArg(s,m1.end):null,m3=m2?lxArg(s,m2.end):null;
        if(m3){out+='\\multicolumn{'+m1.t+'}{'+m2.t+'}{'+lxText(m3.t,strong)+'}';i=m3.end;continue;}
      }
      if(name==='multirow'||name==='multirowcell'){
        var r1=lxArg(s,j),rk=r1?r1.end:j,ro=lxOpt(s,rk);if(ro) rk=ro.end;
        var r2=r1?lxArg(s,rk):null,r3=null;
        if(r2){var rk2=r2.end,ro2=lxOpt(s,rk2);if(ro2) rk2=ro2.end;r3=lxArg(s,rk2);}
        if(r3){out+='\\multirow{'+r1.t+'}{'+r2.t+'}{'+lxText(r3.t,strong)+'}';i=r3.end;continue;}
      }
      if(name==='bibitem'){
        var bo=lxOpt(s,j),bk=bo?bo.end:j,ba=lxArg(s,bk);
        if(ba){out+='\\bibitem'+(bo?'['+bo.t+']':'')+'{'+ba.t+'}';i=ba.end;continue;}
      }
      if(LX_DROP1.test(name)){
        var pr=/^\s*\([^)]*\)/.exec(s.slice(j,j+24));if(pr) j+=pr[0].length;
        var d1=lxOpt(s,j),dk=d1?d1.end:j,d2=lxArg(s,dk);
        if(name==='author'||name==='date'||name==='thanks'){ /* meta */ }
        if(d2){
          var more=d2.end;
          /* \setlength{\a}{1em}, \newcommand{\x}{..}[n]{..}: ikinci/üçüncü grubu da at */
          if(/^(?:setlength|addtolength|setcounter|addtocounter|newcommand|renewcommand|providecommand|DeclareMathOperator|newtheorem|newenvironment|renewenvironment|def|rowcolors|titleformat|titlespacing|cmidrule|specialrule|hskip|vskip|fontsize|numberwithin|captionsetup|rowcolor|cellcolor)$/.test(name)){
            for(var z=0;z<3;z++){var oo2=lxOpt(s,more);if(oo2) more=oo2.end;var g2=lxArg(s,more);if(!g2) break;more=g2.end;}
          }
          i=more;
        }else{
          /* \renewcommand\arraystretch{1.2} gibi */
          var bs=/^[ \t]*\\[A-Za-z]+/.exec(s.slice(dk,dk+40));
          i=bs?dk+bs[0].length:dk;
          var g3=lxArg(s,i);if(g3&&/^(?:renewcommand|newcommand|providecommand|def|let|setlength)$/.test(name)) i=g3.end;
        }
        continue;
      }
      if(LX_DROP.test(name)){
        if(name==='par') out+='\n\n';
        i=j;
        while(s.charAt(i)===' '||s.charAt(i)==='\t') i++;
        if(name==='hline'||name==='toprule'||name==='midrule'||name==='bottomrule'){out+='\\hline';}
        continue;
      }
      /* bilinmeyen / ortam komutları: \begin{..} \end{..} \item \multicolumn … aynen koru (grupları özyinelemeli işle) */
      out+='\\'+name+star;
      i=j;
      if(name==='begin'||name==='end'){
        var g=lxGroup(s,s.charAt(i)==='{'?i:-1,'{','}');
        if(g){
          out+='{'+g.t+'}';i=g.end;
          if(name==='begin'){
            var tbl=/^(?:tabular|tabularx|tabulary|longtable|supertabular|minipage|multicols|wrapfigure|wraptable|adjustbox|tabular\*)$/.test(g.t);
            for(var q=0;q<(tbl?3:1);q++){
              var ch2=s.charAt(i),gx=ch2==='['?lxGroup(s,i,'[',']'):(ch2==='{'&&tbl?lxGroup(s,i,'{','}'):null);
              if(!gx) break;
              out+=ch2+gx.t+(ch2==='['?']':'}');i=gx.end;
            }
          }
        }
      }
      continue;
    }
    if(c==='{'){
      var gg=lxGroup(s,i,'{','}');
      if(!gg){out+=c;i++;continue;}
      var fm=/^\s*\\(bf|bfseries|it|itshape|em|sl|slshape|tt|ttfamily|sc|scshape|rm|sf|normalfont|large|Large|LARGE|huge|Huge|small|footnotesize|scriptsize|tiny|centering|raggedright|upshape|mdseries|color\{[^}]*\})(?![A-Za-z])\s*/.exec(gg.t);
      if(fm){
        var body=lxText(gg.t.slice(fm[0].length),strong),k2=fm[1];
        if(k2==='bf'||k2==='bfseries') out+=lxWrap('**',body);
        else if(k2==='it'||k2==='itshape'||k2==='em'||k2==='sl'||k2==='slshape') out+=lxWrap('*',body);
        else if(k2==='tt'||k2==='ttfamily'){var tt=lxUnesc(body).trim();out+=tt?'`'+tt+'`':'';}
        else out+=body;
        i=gg.end;continue;
      }
      var inner2=lxText(gg.t,strong);
      out+=strong?inner2:'{'+inner2+'}';
      i=gg.end;continue;
    }
    if(c==='}'&&strong){i++;continue;}
    if(c==='~'&&strong){out+='\u00a0';i++;continue;}
    out+=c;i++;
  }
  return out;
}

/* tablo gövdesini (tabular içeriği) GFM tablosuna çevir */
function lxAlign(spec){
  var out=[],i=0;
  spec=spec.replace(/@\{[^}]*\}|!\{[^}]*\}/g,'');
  while(i<spec.length){
    var ch=spec.charAt(i);
    if(ch==='*'){
      var a=lxGroup(spec,i+1,'{','}');
      if(a){var b=lxGroup(spec,a.end,'{','}');if(b){var rep=lxAlign(b.t);for(var r=0;r<(+a.t||1);r++) out=out.concat(rep);i=b.end;continue;}}
    }
    if(ch==='l') out.push('l');
    else if(ch==='c') out.push('c');
    else if(ch==='r') out.push('r');
    else if(ch==='p'||ch==='m'||ch==='b'||ch==='X'||ch==='L'||ch==='C'||ch==='R'||ch==='S'){
      if(ch==='C') out.push('c');else if(ch==='R') out.push('r');else out.push('l');
      var g=lxGroup(spec,i+1,'{','}');if(g){i=g.end;continue;}
    }
    i++;
  }
  return out;
}
function lxTable(body,store){
  var spec='',g;
  body=body.replace(/^\s*(?:\[[^\]]*\])?/,'');
  /* tabularx: {genişlik}{sütunlar}; tabular: {sütunlar} */
  g=lxGroup(body,body.search(/\S/)<0?0:body.search(/\S/),'{','}');
  if(g){
    spec=g.t;body=body.slice(g.end);
    if(/^\s*\{/.test(body)&&/^[\d.]*\s*(?:\\?[A-Za-z]+|cm|mm|pt|em)/.test(spec)&&!/[lcr]/.test(spec.replace(/\\[A-Za-z]+|cm|mm|pt|em/g,''))){
      var g2=lxGroup(body,body.search(/\S/),'{','}');if(g2){spec=g2.t;body=body.slice(g2.end);}
    }
  }
  var al=lxAlign(spec);
  var rows=body.replace(/\\hline|\\cline\{[^}]*\}/g,'\uE020').split(/\\\\(?:\[[^\]]*\])?/);
  var data=[];
  rows.forEach(function(r){
    var t=r.replace(/\uE020/g,'').trim();
    if(!t) return;
    var cells=[],raw=r.replace(/\uE020/g,'').split('&');
    raw.forEach(function(cell){
      var cm=/^\s*\\multicolumn\{(\d+)\}\{[^}]*\}\{([\s\S]*)\}\s*$/.exec(cell);
      var txt=cell,span=1;
      if(cm){span=+cm[1];txt=cm[2];}
      var mr=/^\s*\\multirow\{[^}]*\}(?:\[[^\]]*\])?\{[^}]*\}(?:\[[^\]]*\])?\{([\s\S]*)\}\s*$/.exec(txt);
      if(mr) txt=mr[1];
      txt=lxResolve(txt,store,true).replace(/\s+/g,' ').replace(/\|/g,'\\|').trim();
      cells.push(txt);
      for(var z=1;z<span;z++) cells.push('');
    });
    data.push(cells);
  });
  if(!data.length) return '';
  var cols=Math.max.apply(null,data.map(function(r){return r.length;}));
  if(al.length<cols){for(var q=al.length;q<cols;q++) al.push('l');}
  function row(r){var a=r.slice();while(a.length<cols) a.push('');return '| '+a.map(function(x){return x||' ';}).join(' | ')+' |';}
  var sep='|'+al.slice(0,cols).map(function(a){return a==='c'?':-:':a==='r'?'-:':':-';}).join('|')+'|';
  return '\n\n'+row(data[0])+'\n'+sep+(data.length>1?'\n'+data.slice(1).map(row).join('\n'):'')+'\n\n';
}
/* yer tutucuları geri koy; list/quote önekini devam satırlarına taşı */
function lxResolve(text,store,flat){
  return text.replace(/\uE010(\d+)\uE011/g,function(m,i,off,whole){
    var e=store[+i];if(!e) return '';
    var c=e.s;
    if(c.indexOf('\n')<0) return c;
    var ls=whole.lastIndexOf('\n',off-1)+1,prefix=whole.slice(ls,off);
    var structural=/^(?:[ \t]*(?:>[ \t]?)*(?:[-*+][ \t]+|\d+[.)][ \t]+)?)*$/.test(prefix);
    if(e.t==='m'){
      if(flat||prefix.length){c=c.replace(/(^|[^\\])%[^\n]*/g,'$1').replace(/\s*\n\s*/g,' ');return c;}
      return c;
    }
    if(flat) return '`'+c.replace(/```[^\n]*\n?|\n/g,' ').trim()+'`';
    if(!structural||!prefix.length) return c;
    var cont=prefix.replace(/[-*+][ \t]+|\d+[.)][ \t]+/g,function(x){return new Array(x.length+1).join(' ');});
    return c.replace(/\n/g,'\n'+cont);
  });
}
function lxFence(code,lang){
  var f='```';while(code.indexOf(f)>=0) f+='`';
  return f+(lang||'')+'\n'+code.replace(/^\n+|\s+$/g,'')+'\n'+f;
}
var LX_THM_BASE=['theorem','thm','lemma','lem','proposition','prop','corollary','cor','definition','defn','defi','example','exm','remark','rem','note','notation','claim','fact','observation','conjecture','axiom','exercise','problem','question','solution','proof','prf','answer','hint','warning','important'];
var LX_THM_TR={theorem:'Teorem',thm:'Teorem',lemma:'Lemma',lem:'Lemma',proposition:'Önerme',prop:'Önerme',corollary:'Sonuç',cor:'Sonuç',definition:'Tanım',defn:'Tanım',defi:'Tanım',example:'Örnek',exm:'Örnek',remark:'Not',rem:'Not',note:'Not',notation:'Gösterim',claim:'İddia',fact:'Olgu',observation:'Gözlem',conjecture:'Sanı',axiom:'Aksiyom',exercise:'Alıştırma',problem:'Problem',question:'Soru',solution:'Çözüm',proof:'İspat',prf:'İspat',answer:'Cevap',hint:'İpucu',warning:'Uyarı',important:'Önemli'};
function lxQuote(t){return t.replace(/^/gm,'> ').replace(/^> $/gm,'>');}
function lxItems(body){
  /* \item [label] metin … */
  var parts=body.split(/\\item(?![A-Za-z])/),items=[];
  for(var i=1;i<parts.length;i++){
    var p=parts[i],lab=null,o=/^\s*\[/.test(p)?lxOpt(p,0):null;
    if(o){lab=o.t;p=p.slice(o.end);}
    items.push({lab:lab,t:p.trim()});
  }
  return {pre:parts[0].trim(),items:items};
}
function lxIndent(first,txt){
  var pad=new Array(first.length+1).join(' ');
  return first+txt.replace(/\n(?=[^\n])/g,'\n'+pad);
}
function lxEnv(name,body,st){
  var base=name.replace(/\*$/,''),o,m,t;
  var store=st.store;
  switch(base){
    case 'itemize':case 'compactitem':case 'asparaitem':case 'itemize*':{
      o=lxItems(body);
      t=o.items.map(function(it){return lxIndent('- ',(it.lab?'**'+lxResolve(it.lab,store,true).trim()+'** ':'')+it.t);}).join('\n');
      return '\n\n'+(o.pre?o.pre+'\n\n':'')+t+'\n\n';
    }
    case 'enumerate':case 'compactenum':case 'asparaenum':{
      o=lxItems(body);var n=0,hasLab=o.items.some(function(it){return it.lab;});
      /* [label=...] / [(a)] seçenekleri enumerate başında olabilir: gövde başında köşeli parantez */
      t=o.items.map(function(it){
        if(it.lab) return lxIndent('- ','**'+it.lab.trim()+'** '+it.t);
        n++;return lxIndent((hasLab?'- ':n+'. '),it.t);
      }).join('\n');
      return '\n\n'+(o.pre&&!/^\[[^\]]*\]$/.test(o.pre)?o.pre+'\n\n':'')+t+'\n\n';
    }
    case 'description':{
      o=lxItems(body);
      t=o.items.map(function(it){return lxIndent('- ',(it.lab?'**'+it.lab.trim()+'** — ':'')+it.t);}).join('\n');
      return '\n\n'+t+'\n\n';
    }
    case 'tabular':case 'tabularx':case 'tabulary':case 'longtable':case 'array':case 'supertabular':
      return lxTable(body,store);
    case 'table':case 'figure':case 'wrapfigure':case 'wraptable':case 'sidewaystable':case 'sidewaysfigure':case 'subfigure':case 'subtable':case 'algorithm':{
      var isFig=/fig/.test(base);
      body=body.replace(/^\s*(?:\[[^\]]*\])?(?:\{[^{}]*\})?/,'');
      body=body.replace(/\\caption\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,function(mm,c){return '\n\n*'+(isFig?'Şekil':'algorithm'===base?'Algoritma':'Tablo')+': '+c.trim()+'*\n\n';});
      return '\n\n'+body.trim()+'\n\n';
    }
    case 'quote':case 'quotation':case 'verse':case 'displayquote':
      return '\n\n'+lxQuote(body.trim())+'\n\n';
    case 'abstract':
      return '\n\n**Özet.** '+body.trim()+'\n\n';
    case 'thebibliography':{
      var bi=body.replace(/^\s*\{[^}]*\}/,'').split(/\\bibitem/),outb=[];
      for(var i=1;i<bi.length;i++){
        var p=bi[i],bo=lxOpt(p,0);if(bo) p=p.slice(bo.end);
        var bk=lxArg(p,0);if(!bk) continue;
        outb.push(lxIndent('- ','['+(bo?bo.t:bk.t)+'] '+p.slice(bk.end).trim().replace(/\s+/g,' ')));
      }
      return '\n\n**Kaynakça**\n\n'+outb.join('\n')+'\n\n';
    }
    case 'minipage':case 'multicols':case 'adjustbox':case 'spacing':case 'singlespace':case 'doublespace':
      return '\n\n'+body.replace(/^\s*(?:\[[^\]]*\])?(?:\{[^{}]*\})?/,'').trim()+'\n\n';
    case 'frame':{
      var fb=body.replace(/^\s*(?:\[[^\]]*\])?(?:<[^>]*>)?/,'');
      return '\n\n'+fb.trim()+'\n\n';
    }
    case 'document':
      return body;
  }
  var key=base,disp=st.thm[key]||LX_THM_TR[key];
  if(disp){
    t=body;var title='',to=lxOpt(t,0);
    if(to){title=to.t.trim();t=t.slice(to.end);}
    t=t.trim();
    var label='**'+disp+(title?' ('+title+')':'')+'.**';
    var isProof=(key==='proof'||key==='prf');
    if(isProof) t+=' ∎';
    var first=t.split('\n')[0];
    var fm0=/^\uE010(\d+)\uE011/.exec(first.trim()),fe=fm0?store[+fm0[1]]:null;
    var blockStart=/^(?:[-*+]\s|\d+[.)]\s|\||#|>)/.test(first.trim())||(fe&&(fe.t==='c'||/^\s*(?:\$\$|\\\[)/.test(fe.s)));
    return '\n\n'+(blockStart?label+'\n\n'+t:label+' '+t)+'\n\n';
  }
  /* bilinmeyen ortam: içeriği koru */
  return '\n\n'+body.trim()+'\n\n';
}

/* ana giriş: {md, macros} */
function latexParts(src){
  var s=String(src==null?'':src).replace(/\r\n?/g,'\n');
  if(!looksLatex(s)) return {md:s,macros:'',tex:false};
  var strong=lxScore(s).strong||lxScore(s).n>=4;
  var st={store:[],thm:{}},store=st.store,macros=[];
  function put(t,text){store.push({t:t,s:t==='m'?lxUnescRaw(text):text});return lxPH(store.length-1);}
  /* 1) belge gövdesi / önsöz */
  var dm=/\\begin\{document\}/.exec(s),pre='';
  if(dm){pre=s.slice(0,dm.index);s=s.slice(dm.index+dm[0].length);var de=s.search(/\\end\{document\}/);if(de>=0) s=s.slice(0,de);}
  else{
    var first=/^[\s\S]*?(?=\n\s*\n|$)/.exec(s);
    if(first&&/\\documentclass|\\usepackage/.test(first[0])){pre=first[0];s=s.slice(first[0].length);}
  }
  function grab(txt){
    var out='';
    /* makrolar */
    var re=/\\(newcommand|renewcommand|providecommand|DeclareMathOperator\*?|def|newtheorem|title|author|date)\b/g,mm;
    var meta={};
    while((mm=re.exec(txt))){
      var nm=mm[1],j=mm.index+mm[0].length,end=j;
      if(nm==='newtheorem'){
        var a=lxArg(txt,j);if(a){var b=lxArg(txt,a.end);if(b){st.thm[a.t.trim()]=b.t.trim();}}
        continue;
      }
      if(nm==='title'||nm==='author'||nm==='date'){
        var o=lxOpt(txt,j);if(o) j=o.end;
        var g=lxArg(txt,j);if(g) meta[nm]=g.t;
        continue;
      }
      /* makro tanımı: bütün tanımı yakala */
      var k=j,parts=0;
      if(nm==='def'){
        var nameM=/^\s*\\[A-Za-z]+/.exec(txt.slice(k));if(!nameM) continue;k+=nameM[0].length;
        var pm=/^(?:#\d)*/.exec(txt.slice(k));k+=pm[0].length;
        var body=lxArg(txt,k);if(!body) continue;
        macros.push(txt.slice(mm.index,body.end));continue;
      }
      var arg1=lxArg(txt,k);
      if(arg1){k=arg1.end;}
      else{var bm=/^\s*\\[A-Za-z]+/.exec(txt.slice(k));if(!bm) continue;k+=bm[0].length;}
      var ok=true;
      for(var z=0;z<3&&ok;z++){var o3=lxOpt(txt,k);if(o3){k=o3.end;continue;}var g3=lxArg(txt,k);if(g3){k=g3.end;if(nm.indexOf('DeclareMathOperator')===0||z>=1) break;}else ok=false;}
      var full=txt.slice(mm.index,k);
      if(/\\(?:arraystretch|baselinestretch|thesection|theequation|labelenum|labelitem)/.test(full)) continue;
      macros.push(full);
    }
    return meta;
  }
  var meta=grab(pre);
  var meta2=grab(s);
  meta.title=meta.title||meta2.title;meta.author=meta.author||meta2.author;
  /* 3) kod / ham ortamlar */
  s=s.replace(/(^|\n)([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?(?:\n[ \t]*\3[^\n]*|$)/g,function(m,nl){return nl+put('c',m.slice(nl.length));});
  s=s.replace(/\\begin\{(verbatim\*?|Verbatim\*?|lstlisting|minted|alltt|algorithmic|tikzpicture|circuitikz|pgfpicture|forest|pgfplots|axis)\}([\s\S]*?)\\end\{\1\}/g,function(m,env,code){
    var lang='',noteTxt='';
    if(env==='minted'){var mg=/^\s*(?:\[[^\]]*\])?\{([^}]*)\}/.exec(code);if(mg){lang=mg[1];code=code.slice(mg[0].length);}}
    else if(env==='lstlisting'){var lo=/^\s*\[([^\]]*)\]/.exec(code);if(lo){var lm=/language\s*=\s*\{?([A-Za-z+#]+)/.exec(lo[1]);if(lm) lang=lm[1].toLowerCase().replace('c++','cpp');code=code.slice(lo[0].length);}}
    else if(/tikz|circuitikz|pgf|forest|axis/.test(env)){lang='latex';noteTxt='\n\n*Çizim (TikZ/LaTeX kaynağı olarak gösteriliyor):*\n\n';code='\\begin{'+env+'}'+code+'\\end{'+env+'}';}
    else if(env==='algorithmic'){lang='text';}
    return '\n\n'+put('c',noteTxt.trim()?noteTxt.trim()+'\n\n'+lxFence(code,lang):lxFence(code,lang))+'\n\n';
  });
  s=s.replace(/\\(?:verb|lstinline)\*?([^A-Za-z\s*{])([^\n]*?)\1/g,function(m,d,c){return put('c','`'+c+'`');});
  s=s.replace(/`[^`\n]+`/g,function(m){return put('c',m);});
  /* 2) kaçışlı karakterler */
  s=s.replace(/\\[&%$#_{}]/g,function(m){return LX_ESC[m];});
  /* 4) yorumlar */
  s=s.replace(/^[ \t]*%[^\n]*\n?/gm,'').replace(/[ \t]+%[^\n]*$/gm,'');
  /* 5) matematik */
  function pm2(t,tex){return put('m',tex);}
  s=s.replace(/\$\$([\s\S]+?)\$\$/g,function(m){return '\n\n'+put('m',m)+'\n\n';});
  s=s.replace(/\\\[([\s\S]+?)\\\]/g,function(m){return '\n\n'+put('m',m)+'\n\n';});
  s=s.replace(/\\\(([\s\S]+?)\\\)/g,function(m){return put('m',m);});
  s=s.replace(/\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray|displaymath|split)(\*?)\}([\s\S]*?)\\end\{\1\2\}/g,function(m,env,star,inner){
    return '\n\n'+put('m','$$'+lxMathEnv(env,inner)+'$$')+'\n\n';
  });
  s=s.replace(/\\begin\{((?:[pbBvV]|small)?matrix|cases|array|aligned|gathered|alignedat)\}([\s\S]*?)\\end\{\1\}/g,function(m){
    /* tabular dışı array: matematik gibi */
    return '\n\n'+put('m','$$'+m+'$$')+'\n\n';
  });
  s=s.replace(/\$([^\s$](?:(?:(?!\n[ \t]*\n)[^$]){0,800}?[^\s$])?)\$(?!\d)/g,function(m){return put('m',m);});
  /* 6) satır içi komutlar */
  s=lxText(s,strong);
  /* 7) ortamlar (en içten dışa) */
  var guard=0,envRe=/\\begin\{([A-Za-z]+\*?)\}((?:(?!\\begin\{)[\s\S])*?)\\end\{\1\}/;
  while(guard++<2000){
    var em=envRe.exec(s);if(!em) break;
    s=s.slice(0,em.index)+lxEnv(em[1],em[2],st)+s.slice(em.index+em[0].length);
  }
  /* 8) temizlik */
  s=s.replace(/\\(?:begin|end)\{[A-Za-z]+\*?\}/g,'').replace(/\\item(?![A-Za-z])\s*(?:\[[^\]]*\])?/g,'- ').replace(/\\hline/g,'');
  s=s.replace(/[ \t]*\\\\[ \t]*\n?/g,'  \n');
  s=s.replace(/\\caption\{([^{}]*)\}/g,'\n\n*$1*\n\n');
  if(strong){
    s=s.replace(/``/g,'“').replace(/''/g,'”');
    s=s.split('\n').map(function(l){
      if(/^\s*(?:-{3,}|\*{3,})\s*$/.test(l)||/^\s*\|?[\s:|-]+\|?\s*$/.test(l)) return l;
      return l.replace(/---/g,'—').replace(/--/g,'–');
    }).join('\n');
  }
  s=s.replace(/[\uE012\uE013\uE015-\uE019]/g,function(c){return LX_ESCMD[c];});
  s=lxResolve(s,store,false);
  /* başlık / yazar */
  var head='';
  if(meta.title){
    var tt=lxText(meta.title.replace(/\\([&%$#_{}])/g,'$1'),true).replace(/\\\\/g,' ').replace(/\s+/g,' ').trim();
    if(tt) head='# '+tt+'\n\n';
    if(meta.author){var au=lxText(meta.author,true).replace(/\\\\/g,', ').replace(/\\and\b/g,', ').replace(/\s+/g,' ').trim();if(au) head+='*'+au+'*\n\n';}
  }
  s=(head+s).replace(/[ \t]+\n/g,function(m){return m.length>=3&&m.charAt(0)===' '&&m.charAt(1)===' '&&m.charAt(m.length-1)==='\n'&&m.length===3?m:'\n';}).replace(/\n{3,}/g,'\n\n').trim();
  var mac=macros.map(function(x){return x.replace(/[\uE012\uE013\uE015-\uE019]/g,function(c){return LX_UNESC[c];});}).join('\n');
  mac=lxResolve(mac,store,true);
  return {md:s,macros:mac,tex:true};
}
function lxUnescRaw(t){return t.replace(/[\uE012\uE013\uE015-\uE019]/g,function(c){return {'\uE015':'\\&','\uE013':'\\%','\uE012':'\\$','\uE016':'\\#','\uE017':'\\_','\uE018':'\\{','\uE019':'\\}'}[c];});}
function latexToMd(src){return latexParts(src).md;}

function lxMathEnv(env,inner){
  inner=inner.replace(/\\(?:label|notag|nonumber)(?:\{[^}]*\})?/g,'').replace(/^\s*\{\d+\}/,'');
  var wrap={align:'aligned',flalign:'aligned',alignat:'aligned',split:'aligned',gather:'gathered',multline:'gathered',eqnarray:'aligned'}[env];
  return wrap?'\\begin{'+wrap+'}'+inner.trim()+'\\end{'+wrap+'}':inner.trim();
}

//#CORE-START
/* ===================== ÇEKİRDEK (DOM'suz saf mantık) ===================== */
var DAY=864e5;
var ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX'];
function roman(n){return ROMAN[n]||String(n+1);}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escAttr(s){return escHtml(s).replace(/"/g,'&quot;');}
function pad2(n){return n<10?'0'+n:''+n;}
function dayKey(t){var d=new Date(t==null?Date.now():t);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function startOfDay(t){var d=new Date(t);d.setHours(0,0,0,0);return d.getTime();}
function shiftDay(t,n){var d=new Date(t);d.setDate(d.getDate()+n);return d.getTime();}
function hashStr(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);}
function uidGen(p){return (p||'x')+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);}
function clamp01(x){return x<0?0:x>1?1:x;}
function fmtDur(sec){
  sec=Math.max(0,Math.round(sec));
  if(sec<60) return sec+' sn';
  var m=Math.round(sec/60);
  if(m<60) return m+' dk';
  var h=Math.floor(m/60),r=m%60;
  return h+' sa'+(r?' '+r+' dk':'');
}
var MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
var WDAYS=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function fmtDate(t){var d=new Date(t);return d.getDate()+' '+MONTHS[d.getMonth()];}
function fmtDateLong(t){var d=new Date(t);return d.getDate()+' '+MONTHS[d.getMonth()]+' '+WDAYS[d.getDay()];}
function fmtAgo(t,now){
  var d=Math.round((startOfDay(now)-startOfDay(t))/DAY);
  if(d<=0) return 'bugün';
  if(d===1) return 'dün';
  if(d<14) return d+' gün önce';
  return fmtDate(t);
}
function slug(s,max){
  var t=String(s||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
  t=t.replace(/[. ]+$/,'');
  if(max&&t.length>max) t=t.slice(0,max).replace(/\s+\S*$/,'').trim();
  return t||'adsiz';
}

/* ---------- Üstveri birleştirme (cihazlar / yedek arası) ---------- */
function mergeUnits(a,b,du){
  var map={};
  [a,b].forEach(function(list){(list||[]).forEach(function(u){if(!map[u.id]||(u.u||0)>=(map[u.id].u||0)) map[u.id]=u;});});
  return Object.keys(map).filter(function(id){return !(du[id]&&du[id]>=(map[id].u||0));}).map(function(id){return map[id];})
    .sort(function(x,y){return (x.ord!=null?x.ord:x.created||0)-(y.ord!=null?y.ord:y.created||0)||(x.created||0)-(y.created||0);});
}
function mergeMeta(a,b){
  var newer=(a.u||0)>=(b.u||0)?a:b,older=newer===a?b:a;
  var out={v:3,u:Math.max(a.u||0,b.u||0),courses:[],log:{},dc:Object.assign({},older.dc,newer.dc)};
  var map={};
  [older,newer].forEach(function(m){(m.courses||[]).forEach(function(c){
    var cur=map[c.id];
    if(!cur){map[c.id]=JSON.parse(JSON.stringify(c));return;}
    var cn=(c.u||0)>=(cur.u||0)?c:cur,co=cn===c?cur:c;
    var du=Object.assign({},co.du,cn.du);
    var merged=Object.assign({},JSON.parse(JSON.stringify(cn)));
    merged.du=du;
    merged.units=mergeUnits(co.units,cn.units,du);
    map[c.id]=merged;
  });});
  Object.keys(map).forEach(function(id){
    if(out.dc[id]&&out.dc[id]>=(map[id].u||0)) return;
    var c=map[id];c.du=c.du||{};c.units=mergeUnits(c.units,[],c.du);
    out.courses.push(c);
  });
  out.courses.sort(function(x,y){return (x.ord!=null?x.ord:x.created||0)-(y.ord!=null?y.ord:y.created||0)||(x.created||0)-(y.created||0);});
  [older,newer].forEach(function(m){
    Object.keys(m.log||{}).forEach(function(k){
      var e=m.log[k],o=out.log[k]||(out.log[k]={sec:0});
      o.sec=Math.max(o.sec,e.sec||0);
    });
  });
  return out;
}

/* ---------- Part numarası / başlık algılama ---------- */
function maskCode(s){
  var out=s.replace(/(^|\n)([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?(?:\n[ \t]*\3[^\n]*|$)/g,function(m){return m.replace(/[^\n]/g,' ');});
  return out.replace(/`[^`\n]*`/g,function(m){return m.replace(/[^\n]/g,' ');});
}
var NEXT_AFTER_RE=/^[^\n]{0,160}?(?:konusuna\s+(?:geç|devam)|ile\s+devam|geçece[ğg]iz|geçerek|geçelim|geçebiliriz|başlayaca[ğg][ıi]z|başlayal[ıi]m|ele\s+alaca[ğg][ıi]z|işleyece[ğg]iz|devam\s+ed(?:ece[ğg]iz|elim)|konusunda\s+buluşal[ıi]m|ile\s+bulu[şs]aca[ğg][ıi]z|ile\s+(?:sürdür|ilerle)|sonraki\s+adım)/i;
var NEXT_BEFORE_RE=/(?:sonraki|bir\s+sonraki|sıradaki|next|devam\s+(?:için|etmek)|hazır\s+olduğunuzda|hazır\s+olunca|hazırsan|komutunu|ardından|ve\s+sonra)[^\n]{0,120}$/i;
var CHAT_RE=/(?:["“'‘]\s*devam(?:\s*et)?\s*["”'’]|devam\s+etmek\s+için|hazır\s+olduğunuzda|hazır\s+olduğunda|hazır\s+olunca|hazırsan|komutunu\s+ver|komut\s+ver|yazman[ıi]\s+bekl|yazmanı\s+bekl|bekliyorum\.?$)/i;
function titleClean(t){
  t=mathInText(String(t||'')).replace(/<[^>]+>/g,'').replace(/[*_`]+/g,'').replace(/\s+/g,' ').trim();
  t=t.replace(/^[\s:：\-–—.)\]]+/,'').replace(/[\s:;,.\-–—]+$/,'').trim();
  return t;
}
function extractTitleAfter(raw,endIdx,flags){
  var lineEnd=raw.indexOf('\n',endIdx);if(lineEnd<0) lineEnd=raw.length;
  var rest=raw.slice(endIdx,lineEnd);
  rest=rest.replace(/^(\s*(?:\*\*|__)?)\s*(?:\/|of\s|\u2044)\s*\d{1,3}\b/i,'$1');
  if(/^['’][\p{L}]+/u.test(rest)) return null;
  var m;
  if(flags.inBold){
    m=/^\s*(?:\*\*|__)?\s*[:：\-–—.)]?\s*([^*]*?)(?:\*\*|__)/.exec(rest);
    if(m){var t=titleClean(m[1]);if(t.length>=2) return t.slice(0,200);}
  }
  m=/^\s*(?:\*\*|__)?\s*[:：\-–—.)]\s*(.*)$/.exec(rest);
  if(m){
    var tx=m[1].replace(/\s+(?:konusuna|konusunu|ile\s+devam|ile\s+başla|ile\s+ilerle)\b.*$/i,'');
    tx=titleClean(tx.replace(/\*\*.*$/,function(x){return '';}));
    if(!tx||/^tamamland/i.test(tx)) return null;
    return tx.length>=2?tx.slice(0,200):null;
  }
  if(flags.isHeading||flags.lead){
    var t2=titleClean(rest);
    if(t2&&!/^tamamland/i.test(t2)&&t2.length>=2&&t2.length<=200) return t2;
  }
  return null;
}
function deriveTitle(body){
  var m=/^#[ \t]+(.+)$/m.exec(body);
  if(m){
    var t=titleClean(m[1].replace(/^(?:PART|Part|part|BÖLÜM|Bölüm)\s*\d+\s*[:：\-–—.]?\s*/,''));
    if(t) return t;
  }
  m=/(?:^|[.!?]\s+|\n)\s*\**\s*(?:Konumuz|Bu partın konusu|Bu partta|Konu|Başlık|Topic)\s*\**\s*:\s*\**([^.\n*]{3,110})/i.exec(body);
  if(m) return titleClean(m[1]);
  return null;
}
var LX_CACHE=[];
function latexCached(raw){
  if(raw.indexOf('\\')<0) return {md:raw,macros:'',tex:false};
  for(var i=0;i<LX_CACHE.length;i++) if(LX_CACHE[i].k===raw) return LX_CACHE[i].v;
  var v=latexParts(raw);
  LX_CACHE.push({k:raw,v:v});if(LX_CACHE.length>6) LX_CACHE.shift();
  return v;
}
function analyzePart(src){
  var raw=String(src==null?'':src).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  var lp=latexCached(raw);
  if(lp.tex) raw=lp.md.trim();
  var masked=maskCode(raw),len=raw.length;
  var re=/(?:^|[^\p{L}\p{N}])((?:PART|Part|part)[ \t]*[#.:]?[ \t]*(\d{1,3}))(?!\d)(?![.,]\d)/gu,m,cands=[];
  while((m=re.exec(masked))){
    var idx=m.index+m[0].indexOf(m[1]);
    var end=idx+m[1].length;
    var ls=masked.lastIndexOf('\n',idx-1)+1,le=masked.indexOf('\n',idx);if(le<0) le=len;
    var line=masked.slice(ls,le),before=masked.slice(ls,idx);
    var lead=before.replace(/[\s#>*_\-–—•|✅📘📗📕🎯🧠🚀✔☑️:]+/gu,'').length===0;
    var bolds=(before.match(/\*\*|__/g)||[]).length;
    var suf=/^['’][\p{L}]+/u.test(masked.slice(end,end+4));
    var c={no:+m[2],idx:idx,end:end,ls:ls,le:le,line:line,lead:lead,inBold:bolds%2===1,isHeading:/^\s{0,3}#{1,6}\s/.test(line),
      completion:(/^[^.\n]{0,28}?(?:tamamland|tamamlad|completed|\bbitti\b)/i.test(masked.slice(end,end+60))||/(?:tamamland[ıi]|completed)\s*[:\-–—]\s*[*_]*$/i.test(before))&&line.length<150,suf:suf};
    var after=masked.slice(end,Math.min(len,end+220)),bef=masked.slice(Math.max(ls,idx-140),idx);
    c.nextRole=NEXT_AFTER_RE.test(after)||NEXT_BEFORE_RE.test(bef);
    c.head=idx<Math.max(1600,len*.2);
    c.tail=idx>len-Math.max(2000,len*.22);
    cands.push(c);
  }
  var cur=null,src2=null,conf='none',completions=cands.filter(function(c){return c.completion&&!c.suf;});
  var multi=completions.length>1&&new Set(completions.map(function(c){return c.no;})).size>1;
  if(completions.length){
    cur=completions.filter(function(c){return c.lead;}).pop()||completions[completions.length-1];
    src2='footer';conf='high';
  }
  if(!cur){
    var heads=cands.filter(function(c){return c.head&&!c.suf&&(!c.nextRole||((c.inBold||c.isHeading||c.lead)&&len>=3500&&c.idx<len*.15));});
    var strong=heads.filter(function(c){return c.isHeading||c.inBold||c.lead;});
    cur=strong[0]||heads[0]||null;
    if(cur){src2=(cur.isHeading||cur.lead)?'heading':'intro';conf=(cur.isHeading||cur.lead||cur.inBold)?'high':'mid';}
  }
  var next=null,no=cur?cur.no:null;
  if(cur){
    var nx=cands.filter(function(c){return c!==cur&&c.idx>cur.idx&&c.no!==cur.no&&c.tail&&(c.nextRole||c.no===cur.no+1);}).pop();
    if(nx) next=nx;
  }else{
    var tn=cands.filter(function(c){return c.tail&&(c.nextRole||c.no>1);}).pop();
    if(tn&&tn.no>1){next=tn;no=tn.no-1;src2='inferred';conf='low';}
  }
  var title=null,titleSrc=null;
  if(cur){
    var tc=cur.completion?cands.filter(function(c){return c.no===cur.no&&c.head&&!c.completion&&!c.suf;})[0]:cur;
    if(tc){
      title=extractTitleAfter(raw,tc.end,{inBold:tc.inBold,isHeading:tc.isHeading,lead:tc.lead});
      if(!title&&(tc.isHeading||tc.lead)&&!tc.completion){
        var nl=/^\s*\n+[ \t]*(?:#{1,4}[ \t]+|\*\*)([^\n*]{3,120})/.exec(raw.slice(raw.indexOf('\n',tc.end)<0?raw.length:raw.indexOf('\n',tc.end)));
        if(nl) title=titleClean(nl[1]);
      }
      if(title) titleSrc='part';
    }
  }
  /* gövde: sohbet artıklarını ayıkla */
  var body=raw,lines,i;
  if(completions.length){
    body=body.split('\n').filter(function(l,k){
      return !completions.some(function(c){return raw.slice(0,c.ls).split('\n').length-1===k&&c.lead;});
    }).join('\n');
  }
  var nextTitle=next?extractTitleAfter(raw,next.end,{inBold:next.inBold,isHeading:next.isHeading,lead:next.lead}):null;
  var endMsg='';
  var paras=body.replace(/\s+$/,'').split(/\n{2,}/);
  var lastP=paras[paras.length-1]||'';
  if(lastP&&!/^(```|~~~|#|\||>)/.test(lastP.trim())&&lastP.length<1400){
    var sents=lastP.split(/(?<=[.!?…])\s+(?=[\p{Lu}"“*'‘(])/u);
    var keep=[],drop=[];
    sents.forEach(function(s){
      var isChat=CHAT_RE.test(s)||/^[\s*_]*PART[ \t]*\d+[ \t]+Tamamland/i.test(s);
      var hasNext=next&&s.indexOf(raw.slice(next.idx,next.end))>=0&&NEXT_AFTER_RE.test(s.slice(Math.max(0,s.indexOf(raw.slice(next.idx,next.end)))));
      (isChat||hasNext?drop:keep).push(s);
    });
    if(drop.length){
      endMsg=drop.join(' ');
      paras[paras.length-1]=keep.join(' ');
      body=paras.join('\n\n');
    }
  }
  body=body.replace(/(?:\n[ \t]*(?:---+|\*\*\*+|___+)[ \t]*)+\s*$/,'').replace(/\s+$/,'');
  body=body.replace(/^(?:[ \t]*#{1,6}[ \t]*(?:PART|Part)[ \t]*\d+\b[^\n]*\n+)/,'');
  if(!title) title=deriveTitle(body);
  if(!title){
    var hm=/^#{1,4}[ \t]+(.{3,120})$/m.exec(maskCode(body));
    if(hm){var ht=titleClean(hm[1].replace(/^\d+(?:\.\d+)*[.)]?\s+/,''));if(ht.length>=3&&!/^(?:part|bölüm)\s*\d+$/i.test(ht)) title=ht;}
  }
  if(!title){
    var bm=/^\s*\*\*([^*\n]{4,100})\*\*\s*$/m.exec(body);
    if(bm) title=titleClean(bm[1]);
  }
  if(title) titleSrc=titleSrc||'text';
  var alts=[];
  cands.forEach(function(c){if(!c.suf&&c.no>0&&c.no<300&&alts.indexOf(c.no)<0&&(c.head||c.tail)) alts.push(c.no);});
  return {no:no,noSrc:src2,conf:conf,alts:alts.slice(0,4),title:title,titleSrc:titleSrc,
    next:next?{no:next.no,title:nextTitle||null}:null,endMsg:endMsg.replace(/[*_]+/g,'').trim(),body:body.trim(),multi:multi,len:len,macros:lp.macros||'',tex:!!lp.tex};
}

/* ---------- Metin hattı: ham markdown → HTML ---------- */
function countWords(body){
  return String(body).replace(/\$\$[\s\S]*?\$\$/g,' ').split(/\s+/).filter(Boolean).length;
}
function readMinutes(body){return Math.max(1,Math.round(countWords(body)/170));}
/* Uzun başlıkları kısalt: parantez, alt başlık, liste sonu */
function shortTitle(t,max){
  max=max||52;
  t=titleClean(t).replace(/^(?:PART|Part|part|BÖLÜM|Bölüm)\s*\d+\s*[:：\-–—.]?\s*/,'');
  if(t.length<=max) return t;
  var s=t.replace(/\s*\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
  if(s.length<6) s=t;
  if(s.length<=max) return titleClean(s);
  var m=/^(.{8,}?)\s*(?:[:：;]|\s[–—-]\s)\s*\S/.exec(s);
  if(m&&m[1].length<=max) return titleClean(m[1]);
  var cut=s.slice(0,max+1);
  var k=Math.max(cut.lastIndexOf(', '),cut.lastIndexOf(' ve '),cut.lastIndexOf(' & '),cut.lastIndexOf(' ile '));
  if(k>=16) return titleClean(s.slice(0,k));
  k=cut.lastIndexOf(' ');
  return titleClean(s.slice(0,k>=16?k:max))+'…';
}
var SAFE_TAG=/^<\/?(?:sup|sub|kbd|mark|u|br|details|summary|del|ins|small)(?:\s[^<>]*)?\/?>/i;
function protect(src){
  var codes=[],maths=[];
  function PH(k,i){return '\uE000'+k+i+'\uE001';}
  var s=src.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g,function(m){codes.push(m);return PH('C',codes.length-1);});
  s=s.replace(/\\\$/g,'\uE004');
  function mt(t){return t.replace(/\uE004/g,'\\$').trim();}
  function lineEmpty(w,off){var ls=w.lastIndexOf('\n',off-1)+1;return w.slice(ls,off);}
  function disp(m,t,off,w){
    maths.push({d:true,t:mt(t)});
    var pre=lineEmpty(w,off);
    if(pre.length&&/^(?:[ \t]*(?:>[ \t]?)*(?:[-*+][ \t]+|\d+[.)][ \t]+)?)*$/.test(pre)) return PH('M',maths.length-1);
    return '\n\n'+PH('M',maths.length-1)+'\n\n';
  }
  function envm(m,env,star,inner,off,w){return disp(m,lxMathEnv(env,inner),off,w);}
  function inl(m,t){maths.push({d:false,t:mt(t)});return PH('M',maths.length-1);}
  s=s.replace(/\$\$([\s\S]+?)\$\$/g,disp);
  s=s.replace(/\\\[([\s\S]+?)\\\]/g,disp);
  s=s.replace(/\\\(([\s\S]+?)\\\)/g,inl);
  s=s.replace(/\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray|displaymath|split)(\*?)\}([\s\S]*?)\\end\{\1\2\}/g,envm);
  s=s.replace(/\\begin\{((?:[pbBvV]|small)?matrix|cases|array|aligned|gathered|alignedat)\}[\s\S]*?\\end\{\1\}/g,function(m,env,off,w){return disp(m,m,off,w);});
  s=s.replace(/\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g,inl);
  s=s.replace(/\uE004/g,'&#36;');
  s=s.replace(/<(?=[A-Za-z\/!?])/g,function(m,off,w){return SAFE_TAG.test(w.slice(off,off+160))?'<':'&lt;';});
  s=s.replace(/\uE000C(\d+)\uE001/g,function(m,i){return codes[+i];});
  return {text:s,maths:maths};
}
/* Güvenli HTML: tehlikeli etiket/öznitelikleri at, bağlantıları güvenli aç */
var SAFE_ATTR_TAGS={sup:1,sub:1,kbd:1,mark:1,u:1,br:1,details:1,summary:1,del:1,ins:1,small:1};
function sanitizeHtml(html){
  if(typeof document==='undefined') return html;
  var tpl=document.createElement('template');
  tpl.innerHTML=html;
  var bad=tpl.content.querySelectorAll('script,iframe,object,embed,link,meta,base,style,form,frame,frameset,applet,noscript');
  for(var i=0;i<bad.length;i++) bad[i].remove();
  var all=tpl.content.querySelectorAll('*');
  for(var j=0;j<all.length;j++){
    var el=all[j],tag=el.tagName.toLowerCase(),at=el.attributes;
    for(var k=at.length-1;k>=0;k--){
      var nm=at[k].name.toLowerCase(),v=at[k].value;
      if(/^on/.test(nm)||nm==='srcdoc'||nm==='style'&&SAFE_ATTR_TAGS[tag]){el.removeAttribute(at[k].name);continue;}
      if(SAFE_ATTR_TAGS[tag]&&!(tag==='details'&&nm==='open')){el.removeAttribute(at[k].name);continue;}
      if(nm==='href'||nm==='src'||nm==='xlink:href'||nm==='action'||nm==='formaction'){
        var u=v.replace(/[\u0000-\u0020\u00a0]+/g,'').toLowerCase();
        if(/^(?:javascript|vbscript|file):/.test(u)||(/^data:/.test(u)&&!/^data:image\/(?:png|jpe?g|gif|webp|avif|bmp)/.test(u))) el.removeAttribute(at[k].name);
      }
    }
    if(tag==='a'&&el.getAttribute('href')){
      if(/^[a-z][a-z0-9+.-]*:/i.test(el.getAttribute('href'))){el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}
    }
    if(tag==='img'){el.setAttribute('loading','lazy');el.setAttribute('referrerpolicy','no-referrer');el.setAttribute('decoding','async');}
    if(tag==='input'&&el.getAttribute('type')!=='checkbox') el.remove();
  }
  return tpl.innerHTML;
}
/* Başlık düzeyleri: bölümler hep h2 olsun (### ile yazılmış metinler de bölümlenir) */
function normalizeHeadings(src){
  var lines=src.split('\n'),fence=false,hs=[];
  for(var i=0;i<lines.length;i++){
    var L=lines[i];
    if(/^\s*(```|~~~)/.test(L)){fence=!fence;continue;}
    if(fence) continue;
    var m=/^(#{1,6})[ \t]+\S/.exec(L);
    if(m) hs.push({i:i,l:m[1].length});
  }
  if(!hs.length) return src;
  var titleIdx=-1;
  var n1=hs.filter(function(x){return x.l===1;}).length;
  if(n1===1&&hs[0].l===1) titleIdx=0;
  var rest=hs.filter(function(x,k){return k!==titleIdx;});
  if(!rest.length) return src;
  var min=Math.min.apply(null,rest.map(function(x){return x.l;}));
  var shift=min-2;
  if(shift===0) return src;
  rest.forEach(function(x){
    var nl=Math.max(2,Math.min(6,x.l-shift));
    lines[x.i]=lines[x.i].replace(/^#{1,6}/,new Array(nl+1).join('#'));
  });
  return lines.join('\n');
}
function promoteHeadings(src){
  if((src.match(/^#{1,3}[ \t]+\S/gm)||[]).length>=2) return src;
  var lines=src.split('\n'),out=lines.slice(),fence=false;
  for(var i=0;i<lines.length;i++){
    var L=lines[i].trim();
    if(/^(```|~~~)/.test(L)){fence=!fence;continue;}
    if(fence||!L) continue;
    var prevBlank=i===0||!lines[i-1].trim();
    var nextBlank=i===lines.length-1||!lines[i+1].trim();
    if(!prevBlank||!nextBlank) continue;
    var bm=/^\*\*([^*]+)\*\*$/.exec(L);
    if(bm) L=bm[1].trim();
    if(/^([#>|`$\-*+\u2022]|\d+[.)][ \t]|!\[|<|\\|\uE000)/.test(L)) continue;
    if(/[.!?;,\u2026:]$/.test(L)||/[.!?\u2026]["'\u201D\u2019\u00BB)\]*_]+$/.test(L)) continue;
    if(L.length>110||L.split(/\s+/).length>16) continue;
    if(!/^[\p{Lu}\d]/u.test(L)) continue;
    if(/^PART\s*\d+/i.test(L)) continue;
    var j=i+1;while(j<lines.length&&!lines[j].trim()) j++;
    if(j>=lines.length) continue;
    out[i]='## '+L;
  }
  return out.join('\n');
}
function injectMath(html,maths){
  var eq=0;
  html=html.replace(/<p>\s*\uE000M(\d+)\uE001\s*<\/p>/g,function(m,i){
    var x=maths[+i];
    if(x.d){eq++;return '<div class="eq"><div class="eq-body" data-tex="'+escAttr(x.t)+'">\\['+escHtml(x.t)+'\\]</div><span class="eq-no">('+eq+')</span></div>';}
    return '<p><span class="m" data-tex="'+escAttr(x.t)+'">\\('+escHtml(x.t)+'\\)</span></p>';
  });
  html=html.replace(/\uE000M(\d+)\uE001/g,function(m,i){
    var x=maths[+i];
    return x.d?'<span class="m" data-d="1" data-tex="'+escAttr(x.t)+'">\\['+escHtml(x.t)+'\\]</span>':'<span class="m" data-tex="'+escAttr(x.t)+'">\\('+escHtml(x.t)+'\\)</span>';
  });
  return {html:html,eqCount:eq};
}
function buildDoc(src){
  var a=analyzePart(src);
  var p=protect(a.body);
  var promoted=promoteHeadings(normalizeHeadings(p.text));
  var html=sanitizeHtml(marked.parse(promoted,{gfm:true,breaks:false}));
  var inj=injectMath(html,p.maths);
  if(a.macros) inj.html='<span class="tex-macros" hidden aria-hidden="true">\\('+escHtml(a.macros)+'\\)</span>'+inj.html;
  return {html:inj.html,title:a.title,partNo:a.no,next:a.next,endMsg:a.endMsg,minutes:readMinutes(a.body),eqCount:inj.eqCount,mathCount:p.maths.length,analysis:a};
}

/* ---------- Arama ---------- */
function plainOf(text){
  return latexCached(String(text||'')).md.replace(/\r/g,'').replace(/^[ \t]*PART[ \t]*\d+[ \t]+Tamamland[^\n]*$/gim,'')
    .replace(/```\w*/g,'').replace(/\$\$?/g,'').replace(/\\[()\[\]]/g,'').replace(/[*_`#>]/g,'').replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'\n').trim();
}
function findAll(plain,q,max){
  var lp=plain.toLocaleLowerCase('tr'),lq=q.toLocaleLowerCase('tr').trim(),out=[],i=0;
  if(!lq) return out;
  while(out.length<max&&(i=lp.indexOf(lq,i))>=0){out.push(i);i+=lq.length;}
  return out;
}
function snippetAt(plain,i,len){
  var a=Math.max(0,i-60),b=Math.min(plain.length,i+len+90);
  return {pre:(a>0?'\u2026':'')+plain.slice(a,i).replace(/\s+/g,' '),hit:plain.slice(i,i+len),post:plain.slice(i+len,b).replace(/\s+/g,' ')+(b<plain.length?'\u2026':'')};
}
/* Vurguyu yeni metinde yeniden bağla: önce eski konum, sonra alıntı aramasıyla */
function reanchor(text,h){
  if(text.slice(h.s,h.e)===h.q) return {s:h.s,e:h.e};
  if(!h.q) return null;
  var best=-1,i=-1,bd=1e12;
  while((i=text.indexOf(h.q,i+1))>=0){var d=Math.abs(i-h.s);if(d<bd){bd=d;best=i;}}
  return best<0?null:{s:best,e:best+h.q.length};
}

/* ---------- Basit zip yazıcı (depolamasız) ---------- */
var CRC_T=null;
function crc32(u8){
  if(!CRC_T){CRC_T=new Uint32Array(256);for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++) c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);CRC_T[n]=c>>>0;}}
  var crc=0xFFFFFFFF;
  for(var i=0;i<u8.length;i++) crc=CRC_T[(crc^u8[i])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}
function makeZip(files){
  var enc=new TextEncoder(),chunks=[],central=[],offset=0;
  function u16(v){return [v&255,(v>>>8)&255];}
  function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
  var d=new Date(),dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  files.forEach(function(f){
    var name=enc.encode(f.name),data=typeof f.data==='string'?enc.encode(f.data):f.data,crc=crc32(data);
    var head=[].concat([0x50,0x4b,0x03,0x04],u16(20),u16(0x0800),u16(0),u16(tm),u16(dt),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0));
    chunks.push(new Uint8Array(head),name,data);
    central.push({name:name,crc:crc,size:data.length,off:offset});
    offset+=head.length+name.length+data.length;
  });
  var cstart=offset,csize=0;
  central.forEach(function(c){
    var h=[].concat([0x50,0x4b,0x01,0x02],u16(20),u16(20),u16(0x0800),u16(0),u16(tm),u16(dt),u32(c.crc),u32(c.size),u32(c.size),u16(c.name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(c.off));
    chunks.push(new Uint8Array(h),c.name);csize+=h.length+c.name.length;
  });
  var end=[].concat([0x50,0x4b,0x05,0x06],u16(0),u16(0),u16(central.length),u16(central.length),u32(csize),u32(cstart),u16(0));
  chunks.push(new Uint8Array(end));
  return new Blob(chunks,{type:'application/zip'});
}
//#CORE-END

/* ---------- Dışa aktarma yardımcıları ---------- */
function shiftHeadings(md,by){
  var out=[],fence=null;
  String(md).split('\n').forEach(function(l){
    var f=/^[ \t]*(```|~~~)/.exec(l);
    if(f){if(!fence) fence=f[1];else if(f[1]===fence) fence=null;out.push(l);return;}
    if(fence){out.push(l);return;}
    var m=/^(#{1,6})([ \t]+.*)$/.exec(l);
    out.push(m?'#'.repeat(Math.min(6,m[1].length+by))+m[2]:l);
  });
  return out.join('\n');
}
/* Bir partın temiz metni (sohbet artıkları ve başlıktaki Part satırı olmadan), başlıkları by düzey aşağı itilmiş */
function partMarkdown(text,title,by){
  var body=analyzePart(text).body.replace(/^\s*#[ \t]+[^\n]*\n+/,function(m){return m;});
  var first=/^\s*#[ \t]+([^\n]+)\n/.exec(body);
  if(first) body=body.slice(first[0].length);
  return shiftHeadings(body.trim(),by);
}


/* ---------- Test (çoktan seçmeli) ayrıştırma ---------- */
var Q_START=/^[ \t]*(?:\*\*|__)?[ \t]*(?:Soru|SORU|Question|Q)[ \t]*(\d{1,3})[ \t]*(?:\*\*|__)?[ \t]*[:.)\-–—]?[ \t]*(?:\*\*|__)?/;
var OPT_RE=/^[ \t]*(?:[-*][ \t]+)?(?:\*\*)?\(?([A-Ea-e])[).](?:\*\*)?[ \t]+(\S.*)$/;
var ANS_RE=/(?:Doğru\s+(?:Cevap|Şık|Yanıt)|Cevap|Yanıt|Correct\s+Answer|Answer)\s*(?:[:：]|\bis\b|=)\s*\**\s*\(?([A-Ea-e])\b/i;
function parseQuestions(text){
  var raw=latexCached(String(text||'').replace(/\r\n?/g,'\n')).md;
  var lines=raw.split('\n'),fence=false,starts=[];
  for(var i=0;i<lines.length;i++){
    if(/^\s*(```|~~~)/.test(lines[i])){fence=!fence;continue;}
    if(fence) continue;
    var m=Q_START.exec(lines[i]);
    if(m&&lines[i].slice(m[0].length).trim().length>0||(m&&starts.length===0&&lines[i+1]!==undefined)) starts.push({i:i,n:+m[1],rest:lines[i].slice(m[0].length)});
  }
  var out=[];
  starts.forEach(function(st,k){
    var end=k+1<starts.length?starts[k+1].i:lines.length;
    var blk=[st.rest].concat(lines.slice(st.i+1,end));
    var stem=[],opts=[],j=0,inOpt=false,fn=false,rest=[];
    var expect='A';
    for(j=0;j<blk.length;j++){
      var L=blk[j];
      if(/^\s*(```|~~~)/.test(L)) fn=!fn;
      if(!fn){
        var om=OPT_RE.exec(L);
        if(om&&om[1].toUpperCase()===expect){opts.push({k:expect,t:om[2].trim()});expect=String.fromCharCode(expect.charCodeAt(0)+1);inOpt=true;continue;}
        if(inOpt){
          if(!L.trim()){ /* boş satır: seçenekler bitti */ break; }
          if(/^\s*(?:\[|\(?\s*(?:Doğru|Cevap|Yanıt|Correct|Answer))/i.test(L)) break;
          opts[opts.length-1].t+=' '+L.trim();continue;
        }
      }
      stem.push(L);
    }
    rest=blk.slice(j);
    var tail=rest.join('\n');
    var am=ANS_RE.exec(tail)||ANS_RE.exec(stem.join('\n'));
    var ans=am?am[1].toUpperCase():null;
    var exp=tail.replace(/^\s*\[[^\]\n]{3,60}\]\s*$/m,'').replace(/^\s*\(?\s*(?:Doğru\s+(?:Cevap|Şık|Yanıt)|Cevap|Yanıt|Correct\s+Answer|Answer)\s*[:：][^\n]*\n?/im,'').replace(/^\s*---+\s*$/gm,'').trim();
    if(opts.length>=2) out.push({n:st.n,stem:stem.join('\n').trim(),opts:opts,ans:ans&&opts.some(function(o){return o.k===ans;})?ans:null,exp:exp});
  });
  /* cevap anahtarı sonda ise */
  if(out.length&&out.every(function(q){return !q.ans;})){
    var km=/(?:Cevap\s+Anahtar[ıi]|Answer\s+Key)[^\n]*\n([\s\S]{0,1500})$/i.exec(raw);
    if(km){
      var re=/(\d{1,3})\s*[-–.:)]\s*([A-Ea-e])\b/g,x,key={};
      while((x=re.exec(km[1]))) key[+x[1]]=x[2].toUpperCase();
      out.forEach(function(q){if(key[q.n]) q.ans=key[q.n];});
    }
  }
  return out;
}
/* Tek parça markdown (soru metni, çözüm) → HTML; satır içi için inline=true */
function mdSnippet(md,inline){
  var p=protect(latexCached(String(md||'')).md);
  var html=sanitizeHtml(inline?marked.parseInline(p.text,{gfm:true}):marked.parse(p.text,{gfm:true,breaks:false}));
  return injectMath(html,p.maths).html;
}

/* ---------- LaTeX → okunur düz metin (başlıklar, dosya adları, arama için) ---------- */
var TX_SYM={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',vartheta:'ϑ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',upsilon:'υ',phi:'φ',varphi:'φ',chi:'χ',psi:'ψ',omega:'ω',Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',ell:'ℓ',partial:'∂',nabla:'∇',
  leq:'≤',le:'≤',geq:'≥',ge:'≥',neq:'≠',ne:'≠',equiv:'≡',approx:'≈',sim:'∼',cong:'≅',propto:'∝',ll:'≪',gg:'≫',cup:'∪',cap:'∩',in:'∈',notin:'∉',ni:'∋',subseteq:'⊆',subset:'⊂',supseteq:'⊇',supset:'⊃',emptyset:'∅',varnothing:'∅',setminus:'∖',
  to:'→',rightarrow:'→',leftarrow:'←',Rightarrow:'⇒',Leftarrow:'⇐',implies:'⟹',impliedby:'⟸',iff:'⟺',leftrightarrow:'↔',Leftrightarrow:'⇔',mapsto:'↦',uparrow:'↑',downarrow:'↓',
  times:'×',cdot:'·',pm:'±',mp:'∓',div:'÷',ast:'∗',star:'⋆',circ:'∘',bullet:'•',infty:'∞',forall:'∀',exists:'∃',nexists:'∄',neg:'¬',lnot:'¬',land:'∧',wedge:'∧',lor:'∨',vee:'∨',oplus:'⊕',otimes:'⊗',odot:'⊙',
  ldots:'…',dots:'…',cdots:'⋯',vdots:'⋮',mid:'∣',nmid:'∤',parallel:'∥',perp:'⊥',top:'⊤',bot:'⊥',vdash:'⊢',models:'⊨',therefore:'∴',because:'∵',
  sum:'Σ',prod:'Π',int:'∫',oint:'∮',sqrt:'√',langle:'⟨',rangle:'⟩',lfloor:'⌊',rfloor:'⌋',lceil:'⌈',rceil:'⌉',triangle:'△',angle:'∠',degree:'°',prime:'′',Re:'ℜ',Im:'ℑ',aleph:'ℵ',hbar:'ħ',
  gcd:'gcd',lcm:'lcm',log:'log',ln:'ln',lg:'lg',sin:'sin',cos:'cos',tan:'tan',cot:'cot',sec:'sec',csc:'csc',sinh:'sinh',cosh:'cosh',tanh:'tanh',exp:'exp',max:'max',min:'min',sup:'sup',inf:'inf',det:'det',deg:'deg',dim:'dim',ker:'ker',lim:'lim',arg:'arg',Pr:'Pr',mod:'mod',bmod:'mod',
  quad:' ',qquad:'  ',',':' ',';':' ',':':' ','!':'','{':'{','}':'}','%':'%','&':'&','_':'_','#':'#','$':'$',' ':' '};
var TX_BB={Z:'ℤ',N:'ℕ',Q:'ℚ',R:'ℝ',C:'ℂ',P:'ℙ',H:'ℍ',F:'𝔽',E:'𝔼',B:'𝔹',A:'𝔸',K:'𝕂'};
var TX_SUB={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎',a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ'};
var TX_SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾',n:'ⁿ',i:'ⁱ',T:'ᵀ',a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',o:'ᵒ',p:'ᵖ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ','*':'*'};
function txGroup(s,i){
  /* s[i] bir '{' ise eşleşen '}' ile içeriği döndür */
  if(s.charAt(i)!=='{') return null;
  var d=0;
  for(var j=i;j<s.length;j++){
    if(s.charAt(j)==='{') d++;
    else if(s.charAt(j)==='}'){d--;if(d===0) return {t:s.slice(i+1,j),end:j+1};}
  }
  return null;
}
function txMap(str,map){var out='';for(var k=0;k<str.length;k++){var c=str.charAt(k);if(c===' ') continue;if(!map[c]) return null;out+=map[c];}return out;}
function texToText(tex){
  var s=String(tex||''),out='',i=0;
  while(i<s.length){
    var c=s.charAt(i);
    if(c==='\\'){
      var m=/^\\([A-Za-z]+|[^A-Za-z])/.exec(s.slice(i));
      if(!m){i++;continue;}
      var cmd=m[1];i+=m[0].length;
      if(cmd==='\\'){out+=' ';continue;}
      var arg=null,a2=null;
      while(s.charAt(i)===' '&&/^(?:mathbb|mathcal|mathbf|mathrm|mathit|mathsf|mathtt|boldsymbol|text|textbf|textit|operatorname|overline|bar|hat|vec|tilde|frac|dfrac|tfrac|binom|sqrt|pmod|left|right|big|Big)$/.test(cmd)&&s.charAt(i+1)==='{') i++;
      if(/^(?:mathbb|mathcal|mathbf|mathrm|mathit|mathsf|mathtt|boldsymbol|text|textbf|textit|operatorname|overline|bar|hat|vec|tilde|frac|dfrac|tfrac|binom|sqrt|pmod|mathscr|mathfrak|underline|widehat|widetilde|cancel)$/.test(cmd)){
        arg=txGroup(s,i);
        if(!arg&&cmd!=='sqrt'&&s.charAt(i)&&s.charAt(i)!=='\\'){arg={t:s.charAt(i),end:i+1};}
        if(arg){
          i=arg.end;
          var inner=texToText(arg.t);
          if(cmd==='mathbb'){out+=inner.split('').map(function(ch){return TX_BB[ch]||ch;}).join('');}
          else if(cmd==='overline'||cmd==='bar'){out+=inner+(inner.length===1?'̄':'');}
          else if(cmd==='hat'||cmd==='widehat'){out+=inner+(inner.length===1?'̂':'');}
          else if(cmd==='tilde'||cmd==='widetilde'){out+=inner+(inner.length===1?'̃':'');}
          else if(cmd==='vec'){out+=inner+(inner.length===1?'⃗':'');}
          else if(cmd==='frac'||cmd==='dfrac'||cmd==='tfrac'||cmd==='binom'){
            a2=txGroup(s,i);if(!a2&&s.charAt(i)){a2={t:s.charAt(i),end:i+1};}
            if(a2){i=a2.end;var d2=texToText(a2.t);var wr=function(x){return /^[\w.]+$/.test(x)?x:'('+x+')';};out+=cmd==='binom'?'C('+inner+', '+d2+')':wr(inner)+'/'+wr(d2);}else out+=inner;
          }
          else if(cmd==='sqrt'){out+='√'+(inner.length>1?'('+inner+')':inner);}
          else if(cmd==='pmod'){out+=' (mod '+inner+')';}
          else out+=inner;
        }else if(cmd==='sqrt') out+='√';
        continue;
      }
      if(cmd==='left'||cmd==='right'||cmd==='big'||cmd==='Big'||cmd==='bigg'||cmd==='Bigg'){if(s.charAt(i)==='.') i++;continue;}
      out+=Object.prototype.hasOwnProperty.call(TX_SYM,cmd)?TX_SYM[cmd]:'';
      if(/^[A-Za-z]{3,}$/.test(cmd)&&/^(?:gcd|lcm|log|ln|lg|sin|cos|tan|cot|sec|csc|exp|max|min|det|deg|dim|ker|lim|arg|mod|bmod|sup|inf)$/.test(cmd)&&/[A-Za-z0-9]/.test(s.charAt(i))) out+=' ';
      continue;
    }
    if(c==='_'||c==='^'){
      var map=c==='_'?TX_SUB:TX_SUP,g=txGroup(s,i+1),body,end;
      if(g){body=texToText(g.t);end=g.end;}
      else if(s.charAt(i+1)==='\\'){var mm=/^\\([A-Za-z]+)/.exec(s.slice(i+1));if(mm){body=texToText(mm[0]);end=i+1+mm[0].length;}else{body=s.charAt(i+2);end=i+3;}}
      else{body=s.charAt(i+1);end=i+2;}
      var mapped=txMap(body,map);
      out+=mapped!==null?mapped:(body.length>1?(c==='_'?'_(':'^(')+body+')':c+body);
      i=end;continue;
    }
    if(c==='{'||c==='}'){i++;continue;}
    if(c==='~'){out+=' ';i++;continue;}
    out+=c;i++;
  }
  return out.replace(/\s+/g,' ').trim();
}
function mathInText(s){
  s=String(s==null?'':s);
  if(s.indexOf('$')<0&&s.indexOf('\\(')<0&&!/\\(?:mathbb|mathcal|frac|alpha|beta|pmod|equiv)/.test(s)) return s;
  s=s.replace(/\$\$([\s\S]+?)\$\$|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)|\\\(([\s\S]+?)\\\)/g,function(m,a,b,c){return texToText(a||b||c);});
  if(/\\[A-Za-z]+/.test(s)) s=texToText(s);
  return s;
}

/* ===================== DEPO (tarayıcı + IndexedDB + hesap eşitleme) ===================== */
var LSK='giopro1:';
var S={meta:null,parts:{},st:{},tomb:{}};
var P={tmode:'instant',torder:'seq',after:'stay',autoDone:true,wpmFixed:false,theme:'auto',size:19,font:'serif',width:'normal',bar:'static',start:'home',focus:false,noBanner:false,pdfFilter:'auto',pdfWidth:'normal',pdfCrop:false};
var UI={last:null};
var sync={state:'local',msg:'Yalnızca bu cihazda saklanıyor',last:0};
var lsOK=true,R=null,dirty={},flushTimer=null,flushSoft=false,flushing=false;
var onSyncChange=function(){};
var onDataChange=function(){};/* (soft) */

function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){lsOK=false;return false;}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}
function jparse(s,d){try{var v=JSON.parse(s);return v==null?d:v;}catch(e){return d;}}

/* IndexedDB: localStorage dolsa ya da silinse bile ikinci bir kopya */
var IDB=null;
function idbOpen(){
  return new Promise(function(res){
    try{
      var r=indexedDB.open('gioreader-pro',1);
      r.onupgradeneeded=function(){try{r.result.createObjectStore('kv');}catch(e){}};
      r.onsuccess=function(){IDB=r.result;res(IDB);};
      r.onerror=function(){res(null);};
      r.onblocked=function(){res(null);};
    }catch(e){res(null);}
  });
}
function idbPut(key,val){if(!IDB) return;try{IDB.transaction('kv','readwrite').objectStore('kv').put(val,key);}catch(e){}}
function idbDel(key){if(!IDB) return;try{IDB.transaction('kv','readwrite').objectStore('kv').delete(key);}catch(e){}}
function idbGet(key){
  return new Promise(function(res){
    if(!IDB) return res(null);
    try{var q=IDB.transaction('kv','readonly').objectStore('kv').get(key);q.onsuccess=function(){res(q.result==null?null:q.result);};q.onerror=function(){res(null);};}catch(e){res(null);}
  });
}
function idbAll(){
  return new Promise(function(res){
    if(!IDB) return res({});
    var out={};
    try{
      var rq=IDB.transaction('kv','readonly').objectStore('kv').openCursor();
      rq.onsuccess=function(){var c=rq.result;if(c){out[c.key]=c.value;c.continue();}else res(out);};
      rq.onerror=function(){res(out);};
    }catch(e){res(out);}
  });
}

/* ---------- belge şekilleri ---------- */
function defaultMeta(){return {v:3,u:0,courses:[],log:{},dc:{}};}
function normCourse(c){
  c=c||{};
  if(Array.isArray(c.units)) c.units=c.units.map(function(u){u.cid=c.id;u.hints=u.hints||{};u.n=Math.max(1,u.n||1);return u;});
  c.du=c.du||{};
  return c;
}
function normMeta(m){
  m=m||{};
  var d=defaultMeta();
  d.u=m.u||0;d.courses=Array.isArray(m.courses)?m.courses.map(normCourse):[];d.log=m.log||{};d.dc=m.dc||{};
  return d;
}
function ST(sid){return S.st[sid]||(S.st[sid]={pos:0,sec:0,hl:[],u:0});}
function docOf(key){
  if(key==='m') return S.meta;
  var id=key.slice(2);
  return key[0]==='p'?S.parts[id]:S.st[id];
}
function saveLocal(key){
  var d=docOf(key);
  if(!d) return;
  var js=JSON.stringify(d);
  lsSet(LSK+key,js);idbPut(key,js);
}
function saveTomb(){var js=JSON.stringify(S.tomb);lsSet(LSK+'tomb',js);idbPut('tomb',js);}
function savePrefs(){var js=JSON.stringify(P);lsSet(LSK+'prefs',js);idbPut('prefs',js);}
function saveUI(){var js=JSON.stringify(UI);lsSet(LSK+'ui',js);idbPut('ui',js);}

async function loadLocal(){
  await idbOpen();
  var ls={},i,k;
  try{for(i=0;i<localStorage.length;i++){k=localStorage.key(i);if(k&&k.indexOf(LSK)===0) ls[k.slice(LSK.length)]=localStorage.getItem(k);}}catch(e){}
  var db=await idbAll();
  S.meta=defaultMeta();
  var keys={};Object.keys(ls).forEach(function(x){keys[x]=1;});Object.keys(db).forEach(function(x){keys[x]=1;});
  Object.keys(keys).forEach(function(key){
    var a=ls[key]!=null?jparse(ls[key],null):null,b=db[key]!=null?jparse(db[key],null):null;
    function newer(x,y){if(!x) return y;if(!y) return x;return (y.u||0)>(x.u||0)?y:x;}
    if(key==='m'){
      var ma=a&&a.courses?normMeta(a):null,mb=b&&b.courses?normMeta(b):null;
      S.meta=ma&&mb?normMeta(mergeMeta(ma,mb)):(ma||mb||defaultMeta());
    }else if(key==='tomb'){
      S.tomb=Object.assign({},b||{},a||{});
    }else if(key==='prefs'){Object.assign(P,b||{},a||{});}
    else if(key==='ui'){UI=Object.assign({last:null},b||{},a||{});}
    else if(key.indexOf('p:')===0){var d=newer(a,b);if(d&&d.id&&!d.del) S.parts[d.id]=d;}
    else if(key.indexOf('s:')===0){
      var s2=newer(a,b);
      if(s2&&!s2.del){s2.hl=s2.hl||[];delete s2.cards;S.st[key.slice(2)]=s2;}
    }
  });
  /* silinmiş (mezar taşlı) kayıtlar geri gelmesin */
  Object.keys(S.tomb).forEach(function(key){
    var d=docOf(key);
    if(d&&(d.u||0)<=S.tomb[key]) removeLocal(key);
  });
  migrateV3();
}
function hasData(){return S.meta.courses.length>0||Object.keys(S.parts).length>0;}

/* eski sürüm (ders → part) verisini ders → ünite → part yapısına taşı */
function migrateV3(){
  var changed=false;
  S.meta.courses.forEach(function(c){
    if(!Array.isArray(c.units)){c.units=[];changed=true;}
    var orphans=Object.keys(S.parts).map(function(k){return S.parts[k];}).filter(function(p){return p.cid===c.id&&(!p.uid||!c.units.some(function(u){return u.id===p.uid;}));});
    if(!orphans.length) return;
    var un=c.units[0];
    if(!un){
      un={id:uidGen('u'),cid:c.id,name:'Ünite 1',n:1,hints:{},created:c.created||Date.now(),ord:c.created||Date.now(),u:Date.now()};
      c.units.push(un);
    }
    var used={};
    S.parts&&Object.keys(S.parts).forEach(function(k){var p=S.parts[k];if(p.uid===un.id&&p.no) used[p.no]=1;});
    orphans.sort(function(a,b){var x=a.no==null?1e9:a.no,y=b.no==null?1e9:b.no;return x-y||(a.added||0)-(b.added||0);});
    orphans.forEach(function(p){
      var no=p.no,an=null;
      if(!no||/^adsız/i.test(p.title||'')){try{an=analyzePart(p.text);}catch(e){an=null;}}
      if(!no&&an&&an.no&&!used[an.no]) no=an.no;
      if(!no||used[no]){no=1;while(used[no]) no++;}
      used[no]=1;p.no=no;p.uid=un.id;
      if(!p.title||/^adsız/i.test(p.title)) p.title=(an&&an.title)||'Part '+no;
      saveLocal('p:'+p.id);dirty['p:'+p.id]=true;
      if(no>un.n) un.n=no;
    });
    c.u=Date.now();un.u=Date.now();changed=true;
  });
  if(changed){S.meta.u=Date.now();saveLocal('m');dirty.m=true;}
  return changed;
}

/* ---------- işaretleme / yazma ---------- */
function touch(key,soft){
  var d=docOf(key);
  if(!d) return;
  d.u=Date.now();
  saveLocal(key);
  dirty[key]=true;
  scheduleFlush(!!soft);
  try{onDataChange(!!soft);}catch(e){}
}
function scheduleFlush(soft){
  if(!R) return;
  if(flushTimer&&soft) return;
  if(flushTimer&&!flushSoft&&!soft) return;
  clearTimeout(flushTimer);
  flushSoft=soft;
  flushTimer=setTimeout(flush,soft?45000:1500);
}
function payloadFor(key){
  if(S.tomb[key]!=null&&!docOf(key)) return {del:1,u:S.tomb[key]};
  var d=docOf(key);
  return d?JSON.parse(JSON.stringify(d)):null;
}
function refFor(key){
  if(key==='m') return R;
  var id=key.slice(2);
  return key[0]==='p'?R.collection('parts').doc(id):R.collection('st').doc(id);
}
async function flush(){
  flushTimer=null;
  if(!R||flushing) return;
  flushing=true;
  var keys=Object.keys(dirty);
  dirty={};
  var failed=false;
  for(var i=0;i<keys.length;i++){
    var key=keys[i],pl=payloadFor(key);
    if(!pl) continue;
    try{
      await refFor(key).set(pl);
    }catch(e){
      var code=e&&e.code;
      if(code==='unavailable'||code==='resource_exhausted'){dirty[key]=true;failed=true;}
      else{
        setSync('err',code==='quota_exceeded'?'Hesap depolama alanı dolu':code==='invalid_argument'?'Bir kayıt çok büyük olduğu için eşitlenemedi':'Eşitleme hatası');
        failed=true;
      }
    }
  }
  flushing=false;
  if(!failed){sync.last=Date.now();setSync('ok','Hesabına eşitlendi');}
  if(Object.keys(dirty).length) scheduleFlush(false);
}
function setSync(state,msg){sync.state=state;sync.msg=msg;try{onSyncChange();}catch(e){}}

function removeLocal(key){
  if(key==='m') return;
  var id=key.slice(2);
  if(key[0]==='p') delete S.parts[id]; else delete S.st[id];
  lsDel(LSK+key);idbDel(key);
}
function tombstone(key){
  removeLocal(key);
  S.tomb[key]=Date.now();
  saveTomb();
  dirty[key]=true;
  scheduleFlush(false);
  try{onDataChange(false);}catch(e){}
}
function untomb(key){
  if(S.tomb[key]!=null){delete S.tomb[key];saveTomb();}
}

/* ---------- Hesap eşitleme ---------- */
async function initSync(){
  try{
    if(!window.claude||typeof window.claude.use!=='function'){setSync('local','Hesap depolaması bu görünümde yok');return false;}
    var r=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    var db=r[0],user=r[1],uid=user?await user.id():null;
    if(!db||!uid){setSync('local','Hesap depolaması kapalı');return false;}
    R=db.doc('data/users/'+uid+'/profile');
    return true;
  }catch(e){setSync('local','Hesap depolamasına ulaşılamadı');return false;}
}
function localKeys(){
  var ks=['m'];
  Object.keys(S.parts).forEach(function(id){ks.push('p:'+id);});
  Object.keys(S.st).forEach(function(id){ks.push('s:'+id);});
  Object.keys(S.tomb).forEach(function(k){if(ks.indexOf(k)<0) ks.push(k);});
  return ks;
}
function metaSig(m){return JSON.stringify([m.courses,m.log]);}
/* iki kaynağı (hesap / klasör / yedek / gömülü kitaplık) tek kuralla birleştirir: en yeni belge kazanır */
function mergeDocs(remote,opts){
  opts=opts||{};
  var changed=false,seen={};
  Object.keys(remote).concat(localKeys()).forEach(function(key){
    if(seen[key]) return;seen[key]=1;
    var r=remote[key],l=docOf(key),tu=S.tomb[key];
    if(key==='m'){
      if(r&&(S.meta.u||S.meta.courses.length||Object.keys(S.meta.log).length)){
        var merged=normMeta(mergeMeta(S.meta,normMeta(r)));
        if(metaSig(merged)!==metaSig(S.meta)) changed=true;
        if(metaSig(merged)!==metaSig(normMeta(r))) dirty.m=true;
        S.meta=merged;saveLocal('m');
      }else if(r){S.meta=normMeta(r);saveLocal('m');changed=true;}
      else if(S.meta.u||S.meta.courses.length){dirty.m=true;}
      return;
    }
    var lu=l?(l.u||0):(tu!=null?tu:-1),ru=r?(r.u||0):-1;
    if(ru>lu){
      changed=true;
      if(r.del){removeLocal(key);S.tomb[key]=r.u;}
      else{
        var id=key.slice(2);
        if(key[0]==='p') S.parts[id]=r; else{r.hl=r.hl||[];delete r.cards;S.st[id]=r;}
        saveLocal(key);delete S.tomb[key];
      }
    }else if(lu>ru){dirty[key]=true;}
  });
  saveTomb();
  if(migrateV3()) changed=true;
  return changed;
}
async function syncAll(){
  if(!R) return {changed:false};
  setSync('busy','Eşitleniyor…');
  var changed=false;
  try{
    var res=await Promise.all([R.get(),R.collection('parts').limit(1000).get(),R.collection('st').limit(1000).get()]);
    var remote={};
    if(res[0].exists) remote.m=res[0].data();
    res[1].docs.forEach(function(d){remote['p:'+d.id]=d.data();});
    res[2].docs.forEach(function(d){remote['s:'+d.id]=d.data();});
    changed=mergeDocs(remote);
    if(Object.keys(dirty).length){clearTimeout(flushTimer);flushTimer=null;await flush();}
    else{sync.last=Date.now();setSync('ok','Hesabına eşitlendi');}
  }catch(e){
    setSync('err','Eşitlenemedi: '+((e&&e.code)||'hata'));
  }
  return {changed:changed};
}

/* ---------- Sorgular ---------- */
function courses(){return S.meta.courses.slice().sort(function(a,b){return (a.ord!=null?a.ord:a.created||0)-(b.ord!=null?b.ord:b.created||0)||(a.created||0)-(b.created||0);});}
function getCourse(id){return S.meta.courses.find(function(c){return c.id===id;})||null;}
function unitsOf(cid){
  var c=getCourse(cid);
  return c?(c.units||[]).slice().sort(function(a,b){return (a.ord!=null?a.ord:a.created||0)-(b.ord!=null?b.ord:b.created||0)||(a.created||0)-(b.created||0);}):[];
}
function getUnit(uid){
  for(var i=0;i<S.meta.courses.length;i++){
    var us=S.meta.courses[i].units||[];
    for(var j=0;j<us.length;j++) if(us[j].id===uid) return us[j];
  }
  return null;
}
function allUnits(){var o=[];courses().forEach(function(c){unitsOf(c.id).forEach(function(u){o.push(u);});});return o;}
function allParts(){return Object.keys(S.parts).map(function(k){return S.parts[k];});}
function partsOfUnit(uid){
  return allParts().filter(function(p){return p.uid===uid;}).sort(function(a,b){return (a.no||0)-(b.no||0);});
}
function partsOfCourse(cid){
  var out=[];
  unitsOf(cid).forEach(function(u){partsOfUnit(u.id).forEach(function(p){out.push(p);});});
  return out;
}
function slotPart(uid,no){
  var ps=allParts();
  for(var i=0;i<ps.length;i++) if(ps[i].uid===uid&&ps[i].no===no) return ps[i];
  return null;
}
function firstEmpty(uid){
  var u=getUnit(uid);if(!u) return null;
  var used={};partsOfUnit(uid).forEach(function(p){used[p.no]=1;});
  for(var i=1;i<=u.n;i++) if(!used[i]) return i;
  return null;
}
function unitOfPart(p){return p?getUnit(p.uid):null;}
function courseOfPart(p){return p?getCourse(p.cid):null;}
function partProgress(pid){var st=S.st[pid];return st?clamp01(st.pos||0):0;}
function partDone(pid){var st=S.st[pid];return !!(st&&st.done);}
/* ---- test üniteleri ---- */
function isTestUnit(uid){var u=getUnit(uid);return !!(u&&u.kind==='test');}
var qCache={};
function partQs(p){
  var c=qCache[p.id];
  if(c&&c.u===p.u) return c.q;
  var q=parseQuestions(p.text);qCache[p.id]={u:p.u,q:q};return q;
}
function unitQs(uid){
  var out=[];
  partsOfUnit(uid).forEach(function(p){partQs(p).forEach(function(q){out.push({id:p.no+':'+q.n,pno:p.no,n:q.n,stem:q.stem,opts:q.opts,ans:q.ans,exp:q.exp});});});
  return out;
}
function qRangeLabel(p){
  var q=partQs(p);
  if(!q.length) return 'Soru bulunamadı';
  var a=q[0].n,b=q[q.length-1].n;
  return a===b?'Soru '+a:'Sorular '+a+'–'+b;
}
/* ---- kelime sayısı ve kişisel okuma hızı ---- */
var wcCache={};
function partWords(p){
  var c=wcCache[p.id];
  if(c&&c.u===p.u) return c.w;
  var w=countWords(analyzePart(p.text).body);
  wcCache[p.id]={u:p.u,w:w};return w;
}
var WPM_DEF=170;
function wpmInfo(){
  var xs=[];
  allParts().forEach(function(p){
    var st=S.st[p.id];
    if(!st||isTestUnit(p.uid)||!(st.sec>=45)||!(st.done||(st.pos||0)>=0.9)) return;
    var w=partWords(p);if(w<150) return;
    var v=w/(st.sec/60);
    if(v>=60&&v<=700) xs.push({v:v,at:st.at||0});
  });
  xs.sort(function(a,b){return b.at-a.at;});xs=xs.slice(0,14);
  var n=xs.length,vals=xs.map(function(x){return x.v;}).sort(function(a,b){return a-b;});
  var med=n?(n%2?vals[(n-1)/2]:(vals[n/2-1]+vals[n/2])/2):WPM_DEF;
  var w=n/(n+3);
  var wpm=P.wpmFixed?WPM_DEF:Math.round(w*med+(1-w)*WPM_DEF);
  return {wpm:wpm,n:n,learned:n>0&&!P.wpmFixed};
}
var wpmCache={k:-1,v:null};
function curWpm(){
  var k=Object.keys(S.st).length+'|'+(P.wpmFixed?1:0)+'|'+(S.meta.u||0)+'|'+lastSecTotal();
  if(wpmCache.k!==k){wpmCache={k:k,v:wpmInfo()};}
  return wpmCache.v.wpm;
}
function lastSecTotal(){var t=0;Object.keys(S.st).forEach(function(k){var s=S.st[k];if(s&&s.done) t+=(s.sec||0);});return t;}
function partMin(p){return Math.max(1,Math.round(partWords(p)/curWpm()));}
function partLeftMin(p){return Math.max(1,Math.round(partMin(p)*(1-partProgress(p.id))));}
function setDone(pid,val){
  var st=ST(pid);
  if(val){if(!st.done) st.done=Date.now();}else st.done=0;
  touch('s:'+pid);
}
function unitStats(uid){
  var u=getUnit(uid),ps=partsOfUnit(uid),done=0,min=0,prog=0,sec=0;
  if(u&&u.kind==='test'){
    var q=0;ps.forEach(function(p){q+=partQs(p).length;});
    var n0=Math.max(u.n,ps.length),lr=(u.runs||[])[0]||null;
    return {kind:'test',n:n0,loaded:ps.length,done:0,minutes:0,pct:n0?ps.length/n0:0,sec:0,q:q,last:lr};
  }
  ps.forEach(function(p){
    var d=partDone(p.id);if(d) done++;
    min+=partMin(p);prog+=d?1:partProgress(p.id);
    var st=S.st[p.id];if(st) sec+=st.sec||0;
  });
  var n=u?Math.max(u.n,ps.length):ps.length;
  return {n:n,loaded:ps.length,done:done,minutes:min,pct:n?prog/n:0,sec:sec};
}
function courseStats(cid){
  var us=unitsOf(cid),r={units:us.length,n:0,loaded:0,done:0,minutes:0,pct:0,sec:0},prog=0;
  r.tests=0;r.q=0;
  us.forEach(function(u){var s=unitStats(u.id);if(s.kind==='test'){r.tests++;r.q+=s.q;return;}r.n+=s.n;r.loaded+=s.loaded;r.done+=s.done;r.minutes+=s.minutes;r.sec+=s.sec;prog+=s.pct*s.n;});
  r.pct=r.n?prog/r.n:0;
  return r;
}
function neighbors(p){
  var ps=partsOfUnit(p.uid),i=ps.findIndex(function(x){return x.id===p.id;});
  var u=getUnit(p.uid),nextNo=p.no+1,hasSlot=u&&nextNo<=u.n;
  return {prev:ps[i-1]||null,next:ps[i+1]&&ps[i+1].no===p.no+1?ps[i+1]:(ps[i+1]||null),nextNo:nextNo,hasSlot:hasSlot,nextIsDirect:!!(ps[i+1]&&ps[i+1].no===p.no+1)};
}
function ptitle(p){if(isTestUnit(p.uid)) return qRangeLabel(p);return shortTitle(p.title);}
function slotTitle(un,no){var p=slotPart(un.id,no);return p?ptitle(p):shortTitle((un.hints&&un.hints[no])||'');}
function partLabel(p){return 'Part '+p.no+' · '+ptitle(p);}

/* ---------- Değişiklikler ---------- */
function bump(field,n){
  var k=dayKey(),e=S.meta.log[k]||(S.meta.log[k]={sec:0});
  e[field]=(e[field]||0)+n;
  S.meta.u=Date.now();
  saveLocal('m');dirty.m=true;scheduleFlush(true);
}
function touchMeta(c){
  var now=Date.now();
  if(c) c.u=now;
  S.meta.u=now;
  touch('m');
}
function addCourse(name,hue){
  var now=Date.now();
  var c={id:uidGen('c'),name:name||'Yeni ders',hue:hue==null?175:hue,created:now,u:now,units:[],du:{}};
  S.meta.courses.push(c);touch('m');return c;
}
function updateCourse(c){c.u=Date.now();touch('m');}
function deleteCourse(cid){
  allParts().filter(function(p){return p.cid===cid;}).forEach(function(p){tombstone('p:'+p.id);tombstone('s:'+p.id);});
  S.meta.courses=S.meta.courses.filter(function(c){return c.id!==cid;});
  S.meta.dc[cid]=Date.now();
  touch('m');
}
function addUnit(cid,o){
  var c=getCourse(cid);if(!c) return null;
  o=o||{};
  var now=Date.now(),hints={};
  (o.titles||[]).forEach(function(t,i){t=String(t||'').trim();if(t) hints[i+1]=t;});
  var n=Math.max(1,Math.min(300,+o.n||(o.titles&&o.titles.length)||10));
  var u={id:uidGen('u'),cid:cid,name:(o.name||'').trim()||((o.kind==='test'?'Test ':'Ünite ')+((c.units||[]).length+1)),n:n,hints:hints,created:now,ord:now,u:now};
  if(o.kind==='test') u.kind='test';
  c.units=c.units||[];c.units.push(u);
  touchMeta(c);
  return u;
}
function updateUnit(u){u.u=Date.now();var c=getCourse(u.cid);touchMeta(c);}
function deleteUnit(uid){
  var u=getUnit(uid);if(!u) return;
  var c=getCourse(u.cid);
  partsOfUnit(uid).forEach(function(p){tombstone('p:'+p.id);tombstone('s:'+p.id);});
  c.units=c.units.filter(function(x){return x.id!==uid;});
  c.du=c.du||{};c.du[uid]=Date.now();
  touchMeta(c);
}
/* Bir parttı ünitenin belirli bir yuvasına yaz. Yuva doluysa eski metin "prev" olarak yedeklenir. */
function putPart(uid,no,text,opts){
  opts=opts||{};
  var un=getUnit(uid);if(!un) return null;
  var t=String(text).replace(/\r\n?/g,'\n').replace(/^﻿/,'').trim();
  var an=opts.an||analyzePart(t);
  var title=(opts.title&&opts.title.trim())||(an.title&&shortTitle(an.title))||(un.hints&&un.hints[no])||('Part '+no);
  var now=Date.now(),minutes=readMinutes(an.body),ex=slotPart(uid,no),p,res;
  var nx=an.next&&an.next.no?{no:an.next.no,title:an.next.title||''}:null;
  if(ex){
    var old={text:ex.text,title:ex.title,minutes:ex.minutes,nx:ex.nx,u:ex.u};
    ex.prev={text:old.text,title:old.title,at:old.u};
    ex.text=t;ex.title=title;ex.minutes=minutes;ex.nx=nx;
    touch('p:'+ex.id);
    p=ex;
    res={part:p,replaced:true,undo:function(){
      var q=S.parts[p.id];if(!q) return;
      q.text=old.text;q.title=old.title;q.minutes=old.minutes;q.nx=old.nx;delete q.prev;touch('p:'+q.id);
    }};
  }else{
    p={id:uidGen('p'),cid:un.cid,uid:uid,no:no,title:title,ft:(an.title&&an.title!==title?an.title:undefined),text:t,minutes:minutes,nx:nx,added:now,u:now};
    S.parts[p.id]=p;touch('p:'+p.id);
    res={part:p,replaced:false,undo:function(){tombstone('p:'+p.id);tombstone('s:'+p.id);}};
  }
  var ch=false;
  if(no>un.n){un.n=no;ch=true;}
  if(nx&&nx.title&&nx.no>0&&nx.no<=Math.max(un.n,nx.no)&&!slotPart(uid,nx.no)&&!(un.hints&&un.hints[nx.no])){
    un.hints=un.hints||{};un.hints[nx.no]=nx.title;ch=true;
    if(nx.no>un.n&&nx.no<=un.n+1){/* ünite sınırı dışındaki ipucu yuva açmaz */ }
  }
  if(ch) updateUnit(un);
  UI.lastUnit=uid;UI.lastCourse=un.cid;saveUI();
  return res;
}
function renumberPart(pid,no){
  var p=S.parts[pid];if(!p||no<1||no===p.no) return false;
  var other=slotPart(p.uid,no),old=p.no;
  if(other){other.no=old;touch('p:'+other.id);}
  p.no=no;touch('p:'+pid);
  var u=getUnit(p.uid);if(u&&no>u.n){u.n=no;updateUnit(u);}
  return true;
}
function setPartTitle(pid,title){
  var p=S.parts[pid];if(!p) return;
  p.title=title.trim()||('Part '+p.no);touch('p:'+pid);
}
function movePartTo(pid,uid,no){
  var p=S.parts[pid],un=getUnit(uid);
  if(!p||!un||slotPart(uid,no)) return false;
  p.uid=uid;p.cid=un.cid;p.no=no;touch('p:'+pid);
  if(no>un.n){un.n=no;updateUnit(un);}
  return true;
}
function deletePart(pid){
  var p=S.parts[pid];if(!p) return null;
  var st=S.st[pid]?JSON.parse(JSON.stringify(S.st[pid])):null,pc=JSON.parse(JSON.stringify(p));
  tombstone('p:'+pid);tombstone('s:'+pid);
  return function restore(){
    pc.u=Date.now();S.parts[pc.id]=pc;untomb('p:'+pc.id);saveLocal('p:'+pc.id);dirty['p:'+pc.id]=true;
    if(st){st.u=Date.now();S.st[pc.id]=st;untomb('s:'+pc.id);saveLocal('s:'+pc.id);dirty['s:'+pc.id]=true;}
    scheduleFlush(false);try{onDataChange();}catch(e){}
  };
}

/* ===================== KAYIT: dışa aktarma, klasör, gömülü kitaplık ===================== */
function snapshot(){
  return {app:'gioreader',v:3,exported:Date.now(),meta:S.meta,parts:S.parts,st:S.st,tomb:S.tomb};
}
function remoteFromSnapshot(o){
  var r={};
  if(o.meta) r.m=o.meta;
  Object.keys(o.parts||{}).forEach(function(id){r['p:'+id]=o.parts[id];});
  Object.keys(o.st||{}).forEach(function(id){r['s:'+id]=o.st[id];});
  Object.keys(o.tomb||{}).forEach(function(k){if(!r[k]) r[k]={del:1,u:o.tomb[k]};});
  return r;
}
function applySnapshot(o){
  var before=Object.keys(S.parts).length;
  var changed=mergeDocs(remoteFromSnapshot(o));
  scheduleFlush(false);
  try{onDataChange();}catch(e){}
  return {changed:changed,added:Object.keys(S.parts).length-before};
}
function exportJSON(){return JSON.stringify(snapshot());}
function importJSON(text){
  var o=jparse(text,null);
  if(!o||(o.app!=='gioreader'&&o.app!=='ayrik-okuyucu')||!o.meta){toast('Bu dosya bir GioReader yedeği gibi görünmüyor');return false;}
  var r=applySnapshot(o);
  toast('Yedek yüklendi'+(r.added>0?' · '+r.added+' yeni part':''));
  return true;
}
function readEmbedded(){
  var el=document.getElementById('embedded-lib');
  if(!el) return null;
  var o=jparse(el.textContent,null);
  return o&&(o.app==='gioreader'||o.app==='ayrik-okuyucu')&&o.meta?o:null;
}

/* ---------- dosya kaydetme (hesap indirme izni → tarayıcı indirmesi → pano) ---------- */
async function saveFile(name,data,mime){
  try{
    var dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;
    if(dl){
      await dl.save({filename:name,data:data});
      return 'saved';
    }
  }catch(e){
    if(e&&e.code==='declined') return 'declined';
  }
  try{
    var blob=data instanceof Blob?data:new Blob([data],{type:mime||'application/octet-stream'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},4000);
    return 'saved';
  }catch(e){return 'failed';}
}
async function saveBackup(){
  var r=await saveFile('gioreader-yedek-'+dayKey()+'.json',exportJSON(),'application/json');
  if(r==='saved') toast('Yedek dosyası hazırlandı');
  else if(r==='failed') showBackupText(exportJSON());
}
function showBackupText(data){
  var ta=h('textarea',{class:'inp area',readOnly:true,value:data,'aria-label':'Yedek metni'});
  modal('Yedek',h('div',{class:'form'},h('p',{class:'muted',text:'Bu metnin tamamını kopyalayıp güvenli bir yere kaydet.'}),ta,h('div',{class:'row end'},btn('Kapat','',closeOverlay))),{wide:true});
  setTimeout(function(){ta.select();},50);
}

/* ---------- klasör düzeni (Ders/Ünite/NN - Başlık.md) ---------- */
function fsPaths(){
  var out={},used={};
  courses().forEach(function(c){
    var cd=slug(c.name,60);
    var ud={};
    unitsOf(c.id).forEach(function(u,ui){
      var base=slug(u.name,60),nm=base,k=2;
      while(ud[nm]){nm=base+' ('+k+')';k++;}
      ud[nm]=1;
      partsOfUnit(u.id).forEach(function(p){
        var f=pad2(p.no)+' - '+slug(shortTitle(p.title,70),80)+'.md';
        out[p.id]=[cd,nm,f];
      });
    });
  });
  return out;
}
function zipFiles(){
  var files=[],paths=fsPaths();
  Object.keys(paths).forEach(function(pid){
    var p=S.parts[pid];if(!p) return;
    files.push({name:paths[pid].join('/'),data:p.text});
  });
  files.push({name:'kutuphane.json',data:exportJSON()});
  return files;
}
async function exportZip(){
  if(!Object.keys(S.parts).length){toast('Henüz part yok');return;}
  var r=await saveFile('gioreader-kitapligim-'+dayKey()+'.zip',makeZip(zipFiles()),'application/zip');
  if(r==='saved') toast('Zip hazırlandı · her part ayrı .md dosyası');
  else if(r==='failed') toast('Zip kaydedilemedi');
}

/* ---------- tek dosya HTML: uygulama + kitaplık ---------- */
var APP_PARTS=null;
function captureShell(){
  try{
    var root=document.getElementById('root');
    APP_PARTS={shell:root?root.innerHTML:null};
  }catch(e){APP_PARTS=null;}
}
function elText(id){var e=document.getElementById(id);return e?e.textContent:null;}
function buildHTMLExport(){
  if(!APP_PARTS||!APP_PARTS.shell) return null;
  var ids=['mj-config','lib-marked','lib-hljs','lib-hljs-langs','lib-mathjax','app-main'],txt={};
  for(var i=0;i<ids.length;i++){txt[ids[i]]=elText(ids[i]);if(txt[ids[i]]==null) return null;}
  var style=elText('app-style');
  if(style==null) return null;
  var snap=JSON.stringify(snapshot()).replace(/</g,'\\u003c').split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');
  var fonts='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,300..700;1,7..72,300..700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">';
  return '<!doctype html>\n<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Ayrık Okuyucu</title>'+fonts+
    '<style id="app-style">'+style+'</style></head><body><div id="root">'+APP_PARTS.shell+'</div>\n'+
    '<script id="mj-config">'+txt['mj-config']+'</scr'+'ipt>\n'+
    '<script id="lib-marked">'+txt['lib-marked']+'</scr'+'ipt>\n'+
    '<script id="lib-hljs">'+txt['lib-hljs']+'</scr'+'ipt>\n'+
    '<script id="lib-hljs-langs">'+txt['lib-hljs-langs']+'</scr'+'ipt>\n'+
    '<script id="lib-mathjax">'+txt['lib-mathjax']+'</scr'+'ipt>\n'+
    '<script type="application/json" id="embedded-lib">'+snap+'</scr'+'ipt>\n'+
    '<script id="app-main">'+txt['app-main']+'</scr'+'ipt>\n</body></html>';
}
async function exportHTML(){
  var html=buildHTMLExport();
  if(!html){toast('Bu görünümde HTML dosyası oluşturulamıyor');return;}
  var r=await saveFile('gioreader-'+dayKey()+'.html',new Blob([html],{type:'text/html'}),'text/html');
  if(r==='saved') toast('HTML dosyası hazırlandı · kitaplığın içinde');
  else if(r==='failed') toast('HTML dosyası kaydedilemedi');
}

/* ---------- Bilgisayardaki klasör (Chrome / Edge) ---------- */
/* ---------- Masaüstü uygulaması köprüsü: File System Access API'sinin Node dosya sistemine bağlı eşi ---------- */
var NATIVE=window.gioNative||null;
var NATIVE_NAME='';
function nfe(){var e=new Error('Bulunamadı');e.name='NotFoundError';return e;}
class NFile{
  constructor(parts){this.kind='file';this.parts=parts;this.name=parts[parts.length-1];}
  async getFile(){
    var r=await NATIVE.read(this.parts);
    return {name:this.name,lastModified:r.mtime,text:async function(){return r.text;}};
  }
  async createWritable(){
    var parts=this.parts,buf='';
    return {write:async function(x){buf+=String(x);},close:async function(){await NATIVE.write(parts,buf);}};
  }
}
class NDir{
  constructor(parts){this.kind='directory';this.parts=parts;this.name=parts.length?parts[parts.length-1]:NATIVE_NAME;}
  async getDirectoryHandle(n,o){
    var p=this.parts.concat([n]);
    if(!(await NATIVE.dirExists(p,!!(o&&o.create)))) throw nfe();
    return new NDir(p);
  }
  async getFileHandle(n,o){
    var p=this.parts.concat([n]);
    if(!(await NATIVE.fileExists(p,!!(o&&o.create)))) throw nfe();
    return new NFile(p);
  }
  async removeEntry(n){await NATIVE.remove(this.parts.concat([n]));}
  async *values(){
    var items=await NATIVE.list(this.parts);
    for(var i=0;i<items.length;i++){
      var it=items[i],p=this.parts.concat([it.name]);
      yield it.kind==='directory'?new NDir(p):new NFile(p);
    }
  }
  async queryPermission(){return 'granted';}
  async requestPermission(){return 'granted';}
}
var FS={sup:typeof window.showDirectoryPicker==='function'||!!NATIVE,h:null,name:'',state:'none',last:0,err:'',busy:false,timer:null,softTimer:null,paths:{},sig:{},again:false};
function fsSet(state,err){FS.state=state;FS.err=err||'';try{onSyncChange();}catch(e){}if(state==='need') armFsAllow();}
/* İzin sıfırlandıysa ilk tıklamada / tuşta sessizce yeniden iste (klasörü yeniden seçtirmeden) */
function armFsAllow(){
  if(FS.armed||!FS.h) return;
  FS.armed=true;
  function fn(){
    document.removeEventListener('pointerdown',fn,true);document.removeEventListener('keydown',fn,true);FS.armed=false;
    if(FS.state!=='need'||!FS.h) return;
    fsAllow().then(function(r){if(FS.state==='ok'){toast('Klasör bağlandı'+(r&&r.changed?' · değişiklikler yüklendi':''));if(r&&r.changed) afterSync({changed:true});else if(route.v==='home'||route.v==='course'||route.v==='unit') refresh();}});
  }
  document.addEventListener('pointerdown',fn,true);document.addEventListener('keydown',fn,true);
}
async function fsInit(){
  if(!FS.sup) return;
  if(NATIVE){
    try{
      FS.paths=jparse(await idbGet('fs:paths'),{});
      var inf=await NATIVE.info();
      if(inf&&inf.folder){NATIVE_NAME=inf.name||'';FS.h=new NDir([]);FS.name=NATIVE_NAME;fsSet('ok');}
    }catch(e){fsSet('err','Klasöre erişilemedi');}
    return;
  }
  try{
    FS.paths=jparse(await idbGet('fs:paths'),{});
    var h=await idbGet('fs:dir');
    if(!h||typeof h.queryPermission!=='function') return;
    FS.h=h;FS.name=h.name||'';
    var pm=await h.queryPermission({mode:'readwrite'});
    fsSet(pm==='granted'?'ok':'need');
  }catch(e){}
}
async function fsLink(){
  if(NATIVE){
    try{
      var cf=await NATIVE.chooseFolder();
      if(!cf) return null;
      NATIVE_NAME=cf.name||'';FS.h=new NDir([]);FS.name=NATIVE_NAME;FS.sig={};FS.paths={};
      fsSet('ok');
      return await fsSync(true);
    }catch(e){fsSet('err','Klasör seçilemedi');return null;}
  }
  try{
    var h=await window.showDirectoryPicker({id:'ayrik-okuyucu',mode:'readwrite'});
    FS.h=h;FS.name=h.name||'';
    idbPut('fs:dir',h);
    FS.sig={};
    fsSet('ok');
    var r=await fsSync(true);
    return r;
  }catch(e){
    if(e&&e.name==='AbortError') return null;
    fsSet(FS.h?'need':'none','Bu görünümde klasör seçilemiyor. Kaydettiğin HTML dosyasını bilgisayardan açıp orada dene.');
    return null;
  }
}
async function fsAllow(){
  if(!FS.h) return fsLink();
  try{
    var pm=await FS.h.requestPermission({mode:'readwrite'});
    if(pm!=='granted'){fsSet('need');return null;}
    fsSet('ok');
    return await fsSync(true);
  }catch(e){fsSet('need','Klasör izni alınamadı');return null;}
}
async function fsUnlink(){
  if(NATIVE) return;
  FS.h=null;FS.name='';FS.sig={};idbDel('fs:dir');fsSet('none');
}
async function fsDir(parts,create){
  var d=FS.h;
  for(var i=0;i<parts.length;i++) d=await d.getDirectoryHandle(parts[i],{create:!!create});
  return d;
}
async function fsWrite(dirParts,name,text){
  var d=await fsDir(dirParts,true);
  var fh=await d.getFileHandle(name,{create:true});
  var w=await fh.createWritable();
  await w.write(text);
  await w.close();
}
async function fsRead(dirParts,name){
  try{
    var d=await fsDir(dirParts,false),fh=await d.getFileHandle(name),f=await fh.getFile();
    return {text:await f.text(),mtime:f.lastModified};
  }catch(e){return null;}
}
async function fsRemove(pathArr){
  try{
    var d=await fsDir(pathArr.slice(0,-1),false);
    await d.removeEntry(pathArr[pathArr.length-1]);
  }catch(e){}
}
/* klasörden oku: .gioreader-pro/ (veya ilk geçişte .ayrik/) içindeki kayıtlar + elle düzenlenen / eklenen .md ve .pdf dosyaları */
var META_DIR='.gioreader-pro';
async function fsReadAll(){
  var meta=await fsRead([META_DIR],'meta.json'),pj=await fsRead([META_DIR],'parts.json'),sj=await fsRead([META_DIR],'state.json');
  if(!meta&&!pj){
    meta=await fsRead(['.ayrik'],'meta.json');
    pj=await fsRead(['.ayrik'],'parts.json');
    sj=await fsRead(['.ayrik'],'state.json');
  }
  var remote={},found=0;
  var m=meta?jparse(meta.text,null):null;
  if(m&&m.meta){remote.m=m.meta;Object.keys(m.tomb||{}).forEach(function(k){remote[k]={del:1,u:m.tomb[k]};});}
  var pm=pj?jparse(pj.text,{}):{};
  var ids=Object.keys(pm);
  for(var i=0;i<ids.length;i++){
    var id=ids[i],e=pm[id];
    if(e.kind==='pdf'){
      var recPdf=Object.assign({},e);
      recPdf.id=id;
      recPdf.text=String(e.text||'');
      if(e.fn&&e.fn.length){
        var fp=await fsRead(e.fn.slice(0,-1),e.fn[e.fn.length-1]);
        if(fp&&fp.text) recPdf.text=fp.text.replace(/\r\n?/g,'\n').trim();
        FS.paths[id]=e.fn;
      }
      delete recPdf.fn;
      remote['p:'+id]=recPdf;found++;
      continue;
    }
    var path=e.fn&&e.fn.length?e.fn:null;
    if(!path) continue;
    var f=await fsRead(path.slice(0,-1),path[path.length-1]);
    if(!f) continue;
    var rec=Object.assign({},e);delete rec.fn;
    rec.id=id;rec.text=f.text.replace(/\r\n?/g,'\n').trim();
    var local=S.parts[id];
    if(local&&local.text===rec.text) rec.u=Math.max(rec.u||0,local.u||0);
    else if(f.mtime>(rec.u||0)+3000&&(!local||f.mtime>(local.u||0))){rec.u=f.mtime;rec.minutes=readMinutes(analyzePart(rec.text).body);}
    remote['p:'+id]=rec;found++;
    FS.paths[id]=path;
  }
  var st=sj?jparse(sj.text,{}):{};
  Object.keys(st).forEach(function(id){remote['s:'+id]=st[id];});
  return {remote:remote,found:found,hasMeta:!!m};
}
async function fsWriteAll(){
  var paths=fsPaths(),wrote=0;
  var metaTxt=JSON.stringify({app:'gioreader',v:3,exported:Date.now(),meta:S.meta,tomb:S.tomb});
  var msig=hashStr(metaTxt.replace(/"exported":\d+,/,''));
  if(FS.sig.meta!==msig){await fsWrite([META_DIR],'meta.json',metaTxt);FS.sig.meta=msig;wrote++;}
  var pm={},partsChanged=false;
  Object.keys(S.parts).forEach(function(pid){
    var p=S.parts[pid],np=paths[pid];if(!np) return;
    var e=Object.assign({},p);
    if(p.kind!=='pdf') delete e.text;
    delete e.prev;e.fn=np;pm[pid]=e;
  });
  var pids=Object.keys(S.parts);
  for(var i=0;i<pids.length;i++){
    var pid=pids[i],p=S.parts[pid],np=paths[pid];
    if(!np) continue;
    var sg=p.u+'|'+np.join('/');
    if(FS.sig['p:'+pid]===sg) continue;
    var old=FS.paths[pid];
    await fsWrite(np.slice(0,-1),np[np.length-1],(p.text||'')+'\n');
    if(old&&old.join('/')!==np.join('/')) await fsRemove(old);
    FS.paths[pid]=np;FS.sig['p:'+pid]=sg;partsChanged=true;wrote++;
  }
  Object.keys(FS.paths).forEach(function(pid){
    if(S.parts[pid]) return;
    fsRemove(FS.paths[pid]);delete FS.paths[pid];delete FS.sig['p:'+pid];partsChanged=true;
  });
  var psig=hashStr(JSON.stringify(pm));
  if(partsChanged||FS.sig.parts!==psig){await fsWrite([META_DIR],'parts.json',JSON.stringify(pm));FS.sig.parts=psig;wrote++;}
  var stTxt=JSON.stringify(S.st),ssig=hashStr(stTxt);
  if(FS.sig.st!==ssig){await fsWrite([META_DIR],'state.json',stTxt);FS.sig.st=ssig;wrote++;}
  idbPut('fs:paths',JSON.stringify(FS.paths));
  var cr=await fsReadmeOnce();
  return wrote;
}
async function fsReadmeOnce(){
  if(FS.sig.readme) return;
  FS.sig.readme=1;
  try{
    var ex=await fsRead([],'OKU-BENİ.txt');
    if(ex) return;
    await fsWrite([],'OKU-BENİ.txt','GioReader Pro kitaplık klasörü\n\n- Ders/Ünite klasörlerindeki .md ve .pdf dosyaları partların içeriğidir.\n- .gioreader-pro/ klasörü GioReader Pro ünite yapısını ve okuma konumlarını tutar (.ayrik/ klasörüne dokunulmaz).\n');
  }catch(e){}
}
/* klasörde, kayıtta olmayan .md dosyalarını yeni part olarak ekle (yuvası boşsa) */
async function fsScanNew(){
  var known={};Object.keys(FS.paths).forEach(function(id){known[FS.paths[id].join('/')]=1;});
  var added=0;
  try{
    for await (var ce of FS.h.values()){
      if(ce.kind!=='directory'||ce.name.charAt(0)==='.') continue;
      var course=courses().find(function(c){return slug(c.name,60)===ce.name;});
      if(!course) continue;
      for await (var ue of ce.values()){
        if(ue.kind!=='directory') continue;
        var unit=unitsOf(course.id).find(function(u){return slug(u.name,60)===ue.name;});
        if(!unit) continue;
        for await (var fe of ue.values()){
          if(fe.kind!=='file'||!/\.(md|markdown|txt)$/i.test(fe.name)) continue;
          var key=[ce.name,ue.name,fe.name].join('/');
          if(known[key]) continue;
          var f=await fe.getFile(),text=(await f.text()).trim();
          if(text.length<80) continue;
          var an=analyzePart(text),no=an.no||(/^(\d{1,3})\b/.exec(fe.name)||[])[1];
          no=+no||0;
          if(!no||slotPart(unit.id,no)) continue;
          putPart(unit.id,no,text,{an:an});added++;
        }
      }
    }
  }catch(e){}
  return added;
}
async function fsSync(initial){
  if(!FS.h||FS.busy||FS.state==='need'||FS.state==='none') return null;
  FS.busy=true;fsSet('busy');
  var res={changed:false,wrote:0,added:0};
  try{
    var ok=true;
    try{ok=(await FS.h.queryPermission({mode:'readwrite'}))==='granted';}catch(e){}
    if(!ok){fsSet('need');FS.busy=false;return null;}
    if(initial){
      var rd=await fsReadAll();
      if(Object.keys(rd.remote).length) res.changed=mergeDocs(rd.remote);
      res.added=await fsScanNew();
      if(res.added) res.changed=true;
    }
    res.wrote=await fsWriteAll();
    FS.last=Date.now();
    fsSet('ok');
  }catch(e){
    fsSet('err','Klasöre yazılamadı: '+(e&&e.message||e));
  }
  FS.busy=false;
  if(FS.again){FS.again=false;fsQueue(false);}
  return res;
}
function fsQueue(soft){
  if(!FS.h||FS.state!=='ok') return;
  if(FS.busy){FS.again=true;return;}
  var t=soft?60000:2500;
  if(FS.timer&&soft) return;
  clearTimeout(FS.timer);
  FS.timer=setTimeout(function(){FS.timer=null;fsSync(false);},t);
}
function fsFlushNow(){
  if(FS.h&&FS.state==='ok'&&FS.timer){clearTimeout(FS.timer);FS.timer=null;fsSync(false);}
}

/* ===================== ARAYÜZ: yardımcılar ===================== */
var HUES=[175,215,255,305,345,18,38,130];
var LOGO_SVG='<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gr-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14575a"/><stop offset="1" stop-color="#0a1b22"/></linearGradient><linearGradient id="gr-a" gradientUnits="userSpaceOnUse" x1="118" y1="0" x2="394" y2="0"><stop offset="0" stop-color="#F7C948"/><stop offset="1" stop-color="#F29E2E"/></linearGradient></defs><rect width="512" height="512" rx="116" fill="url(#gr-g)"/><path d="M345 150A122 122 0 1 0 378 236" fill="none" stroke="#EEF8F5" stroke-width="56" stroke-linecap="round"/><path d="M270 236H378" stroke="url(#gr-a)" stroke-width="56" stroke-linecap="round"/><path d="M118 428H318" stroke="url(#gr-a)" stroke-width="24" stroke-linecap="round"/><path d="M350 428H394" stroke="#F7C948" stroke-opacity=".45" stroke-width="24" stroke-linecap="round"/></svg>';
function logoEl(sz){var d=document.createElement('span');d.className='logo';d.innerHTML=LOGO_SVG;var s=d.firstChild;s.setAttribute('width',sz||24);s.setAttribute('height',sz||24);s.setAttribute('aria-hidden','true');return d;}

var ICONS={
  home:'<path d="M3.5 9.2 10 3.6l6.5 5.6V16a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9z"/><path d="M8 16.9v-4.4h4v4.4"/>',
  book:'<path d="M4 3.8h9.2A2.8 2.8 0 0 1 16 6.6v9.6H6.8A2.8 2.8 0 0 1 4 13.4z"/><path d="M4 13.4a2.8 2.8 0 0 1 2.8-2.8H16"/>',
  library:'<path d="M4.2 3.6v12.8M8 3.6v12.8M11.4 4.4l3.4 12 1.6-.5-3.4-12z"/>',
  folder:'<path d="M3.4 6.2a1.4 1.4 0 0 1 1.4-1.4h3.2l1.6 1.8h5.6a1.4 1.4 0 0 1 1.4 1.4v6.6a1.4 1.4 0 0 1-1.4 1.4H4.8a1.4 1.4 0 0 1-1.4-1.4z"/>',
  file:'<path d="M5.4 3.4h6.2l3 3v10.2H5.4z"/><path d="M11.4 3.4v3.2h3.2M7.6 10h4.8M7.6 12.8h4.8"/>',
  layers:'<path d="m10 3.6 7 3.6-7 3.6-7-3.6z"/><path d="m3 10.2 7 3.6 7-3.6M3 13.4l7 3.6 7-3.6"/>',
  pen:'<path d="M12.6 4.2 15.8 7.4 7.6 15.6 3.8 16.2 4.4 12.4z"/><path d="M11 5.8 14.2 9"/>',
  search:'<circle cx="8.8" cy="8.8" r="5.2"/><path d="m12.7 12.7 4 4"/>',
  plus:'<path d="M10 4v12M4 10h12"/>',
  contrast:'<circle cx="10" cy="10" r="6.6"/><path d="M10 3.4a6.6 6.6 0 0 1 0 13.2z" fill="currentColor"/>',
  gear:'<circle cx="10" cy="10" r="2.6"/><path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M4.8 15.2l1.4-1.4M13.8 6.2l1.4-1.4"/>',
  back:'<path d="M11.6 4.6 6.2 10l5.4 5.4"/>',
  close:'<path d="M5 5l10 10M15 5 5 15"/>',
  check:'<path d="m4.6 10.4 3.6 3.6 7.2-7.8"/>',
  list:'<path d="M3.5 5h13M3.5 10h13M3.5 15h8"/>',
  note:'<path d="M4 4.2h12v8.6l-3.6 3.6H4z"/><path d="M12.4 16.4v-3.6H16M6.8 8h6.4M6.8 11h3.4"/>',
  trash:'<path d="M4.6 6h10.8M8 6V4.2h4V6M6 6l.6 9.8h6.8L14 6"/>',
  edit:'<path d="M12.6 4.2 15.8 7.4 7.6 15.6 3.8 16.2 4.4 12.4z"/>',
  clock:'<circle cx="10" cy="10" r="6.6"/><path d="M10 6.2V10l2.6 1.6"/>',
  copy:'<rect x="7" y="7" width="9" height="9" rx="1.4"/><path d="M13 7V5.4A1.4 1.4 0 0 0 11.6 4H5.4A1.4 1.4 0 0 0 4 5.4v6.2A1.4 1.4 0 0 0 5.4 13H7"/>',
  download:'<path d="M10 3.6v9M6.4 9.4 10 13l3.6-3.6M4 16.4h12"/>',
  upload:'<path d="M10 13.4v-9M6.4 7.6 10 4l3.6 3.6M4 16.4h12"/>',
  chevron:'<path d="m5.4 8 4.6 4.6L14.6 8"/>',
  right:'<path d="m8 5.4 4.6 4.6L8 14.6"/>',
  focus:'<path d="M3.6 7V4.6A1 1 0 0 1 4.6 3.6H7M13 3.6h2.4a1 1 0 0 1 1 1V7M16.4 13v2.4a1 1 0 0 1-1 1H13M7 16.4H4.6a1 1 0 0 1-1-1V13"/>',
  more:'<circle cx="4.8" cy="10" r="1.1" fill="currentColor"/><circle cx="10" cy="10" r="1.1" fill="currentColor"/><circle cx="15.2" cy="10" r="1.1" fill="currentColor"/>',
  grip:'<circle cx="7.5" cy="5" r="1.3" fill="currentColor"/><circle cx="12.5" cy="5" r="1.3" fill="currentColor"/><circle cx="7.5" cy="10" r="1.3" fill="currentColor"/><circle cx="12.5" cy="10" r="1.3" fill="currentColor"/><circle cx="7.5" cy="15" r="1.3" fill="currentColor"/><circle cx="12.5" cy="15" r="1.3" fill="currentColor"/>',
  sync:'<path d="M15.6 8A6 6 0 0 0 5 6.4M4.4 12A6 6 0 0 0 15 13.6M5 3.8v2.8h2.8M15 16.2v-2.8h-2.8"/>',
};
function icon(n,sz){
  var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 20 20');s.setAttribute('width',sz||18);s.setAttribute('height',sz||18);
  s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.6');
  s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');s.setAttribute('aria-hidden','true');
  s.innerHTML=ICONS[n]||'';
  return s;
}
function h(tag,props){
  var el=document.createElement(tag);
  if(props){
    Object.keys(props).forEach(function(k){
      var v=props[k];
      if(v==null||v===false) return;
      if(k==='class') el.className=v;
      else if(k==='text') el.textContent=v;
      else if(k==='html') el.innerHTML=v;
      else if(k.slice(0,2)==='on') el.addEventListener(k.slice(2),v);
      else if(k==='style'&&typeof v==='object') Object.keys(v).forEach(function(sk){if(sk.indexOf('--')===0) el.style.setProperty(sk,v[sk]);else el.style[sk]=v[sk];});
      else if(k.indexOf('data-')===0||k.indexOf('aria-')===0||k==='for'||k==='role') el.setAttribute(k,v===true?'':v);
      else if(k in el) el[k]=v;
      else el.setAttribute(k,v===true?'':v);
    });
  }
  for(var i=2;i<arguments.length;i++) add(el,arguments[i]);
  return el;
}
function add(el,c){
  if(c==null||c===false) return;
  if(Array.isArray(c)){c.forEach(function(x){add(el,x);});return;}
  el.appendChild(typeof c==='object'?c:document.createTextNode(String(c)));
}
function $(id){return document.getElementById(id);}
function clear(el){while(el.firstChild) el.removeChild(el.firstChild);}
function btn(label,cls,fn,ic,aria){
  var b=h('button',{class:'btn'+(cls?' '+cls:''),type:'button','aria-label':aria||null,onclick:fn});
  if(ic) b.appendChild(icon(ic));
  if(label) b.appendChild(h('span',{class:'lbl',text:label}));
  return b;
}
function ibtn(ic,label,fn,cls){
  return h('button',{class:'ico'+(cls?' '+cls:''),type:'button','aria-label':label,title:label,onclick:fn},icon(ic,17));
}
var reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var hostTheme=document.documentElement.getAttribute('data-theme');

/* ---------- toast ---------- */
var toastTimer=null;
function toast(msg,act){
  var t=$('toast');clear(t);
  t.appendChild(h('span',{text:msg}));
  (Array.isArray(act)?act:(act?[act]:[])).forEach(function(a){t.appendChild(h('button',{type:'button',class:'toast-act',text:a.label,onclick:function(){t.hidden=true;a.fn();}}));});
  t.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.hidden=true;},act?7500:2800);
}

/* ---------- tema ve tercihler ---------- */
function applyPrefs(){
  var r=document.documentElement;
  if(P.theme==='auto'){if(hostTheme==null) r.removeAttribute('data-theme');else r.setAttribute('data-theme',hostTheme);}
  else r.setAttribute('data-theme',P.theme);
  r.style.setProperty('--fs',P.size+'px');
  r.setAttribute('data-font',P.font);
  r.setAttribute('data-measure',P.width);
  r.setAttribute('data-bar',P.bar);
  r.setAttribute('data-focus',P.focus?'1':'0');
}
function setHue(hue){document.documentElement.style.setProperty('--hue',hue==null?175:hue);}
function isDarkNow(){
  if(P.theme==='dark') return true;
  if(P.theme==='light'||P.theme==='sepia') return false;
  if(hostTheme) return hostTheme==='dark';
  return window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
}
function toggleTheme(){P.theme=isDarkNow()?'light':'dark';savePrefs();applyPrefs();}

/* ---------- MathJax kuyruğu ---------- */
var tsQueue=[];
function typeset(el){
  if(!el) return;
  if(window.__mjReady&&window.MathJax&&MathJax.typesetPromise){
    try{MathJax.typesetPromise([el]).then(function(){el.dispatchEvent(new Event('typeset'));},function(){});}catch(e){}
  }else if(tsQueue.indexOf(el)<0) tsQueue.push(el);
}
window.addEventListener('mj-ready',function(){var q=tsQueue;tsQueue=[];q.forEach(typeset);});

/* ---------- açılır paneller ---------- */
var overlay={el:null,close:null};
function closeOverlay(){
  if(!overlay.el) return;
  var o=overlay;overlay={el:null,close:null};
  if(o.el.parentNode) o.el.parentNode.removeChild(o.el);
  $('scrim').hidden=true;
  if(o.close) o.close();
  if(o.focus&&o.focus.focus&&document.contains(o.focus)) o.focus.focus();
}
function openOverlay(el,opts){
  opts=opts||{};
  closeOverlay();
  $('overlays').appendChild(el);
  overlay={el:el,close:opts.onclose||null,focus:document.activeElement};
  $('scrim').className='scrim'+(opts.clear?' clear':'');
  $('scrim').hidden=!(opts.scrim||opts.clear);
  var f=el.querySelector('[autofocus]')||el;
  if(f.focus) setTimeout(function(){f.focus();},0);
}
$('scrim').addEventListener('click',closeOverlay);

function modal(title,body,opts){
  opts=opts||{};
  var box=h('div',{class:'sheet'+(opts.wide?' wide':''),role:'dialog','aria-label':title,tabindex:'-1'},
    h('div',{class:'sheet-h'},h('h2',{text:title}),ibtn('close','Kapat',closeOverlay)),
    body);
  var wrap=h('div',{class:'modal',onmousedown:function(e){if(e.target===wrap) closeOverlay();}},box);
  openOverlay(wrap,{onclose:opts.onclose});
  return box;
}
function confirmInline(label,fn){
  var b=h('button',{class:'btn danger sm',type:'button',text:label});
  var armed=false,timer=null;
  b.addEventListener('click',function(e){
    e.stopPropagation();
    if(!armed){armed=true;b.textContent='Emin misin?';b.classList.add('armed');timer=setTimeout(function(){armed=false;b.textContent=label;b.classList.remove('armed');},3000);return;}
    clearTimeout(timer);fn();
  });
  return b;
}

/* ---------- gezinme ---------- */
var route={v:'home'};
var navStack=[];
function go(r,opts){
  opts=opts||{};
  leaveRoute();
  if(!opts.replace) navStack.push(route);
  if(navStack.length>40) navStack.shift();
  route=r;
  renderRoute();
  if(!opts.keepScroll) window.scrollTo(0,0);
}
function goBack(){
  leaveRoute();
  var r=navStack.pop()||{v:'home'};
  route=r;renderRoute();window.scrollTo(0,0);
}
function leaveRoute(){
  if(route.v==='reader') readerLeave();
  if(route.v==='test') testLeave();
  closeOverlay();
}
function saveLast(){
  UI.last=route.v==='reader'?{v:'reader',pid:route.pid}:{v:route.v,cid:route.cid,uid:route.uid};
  saveUI();
}

/* ---------- sürükle-bırak sıralama (yan tutamaç) ---------- */
function sortable(container,o){
  function order(){return Array.prototype.filter.call(container.children,function(c){return c.matches(o.item);});}
  container.addEventListener('pointerdown',function(e){
    var g=e.target.closest(o.grip);if(!g||!container.contains(g)||(e.button&&e.button!==0)) return;
    var item=g.closest(o.item);if(!item||item.parentNode!==container) return;
    e.preventDefault();
    item.classList.add('dragging');container.classList.add('sorting');
    var before=order().map(function(c){return c.dataset.id;}).join();
    function move(ev){
      var y=ev.clientY;
      if(y<70) window.scrollBy(0,-16);else if(y>window.innerHeight-70) window.scrollBy(0,16);
      var els=order();
      for(var i=0;i<els.length;i++){
        var c=els[i];if(c===item) continue;
        var r=c.getBoundingClientRect();
        if(ev.clientX<r.left||ev.clientX>r.right||y<r.top||y>r.bottom) continue;
        var following=!!(item.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING);
        if(o.mid){var mid=r.top+r.height/2;if(following&&y<mid) break;if(!following&&y>mid) break;}
        if(following) container.insertBefore(item,c.nextSibling);else container.insertBefore(item,c);
        break;
      }
    }
    function up(){
      document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);
      item.classList.remove('dragging');container.classList.remove('sorting');
      var ids=order().map(function(c){return c.dataset.id;});
      if(ids.join()!==before) o.onSort(ids);
    }
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
  });
  container.addEventListener('keydown',function(e){
    var g=e.target.closest&&e.target.closest(o.grip);if(!g||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)<0) return;
    var item=g.closest(o.item),els=order(),i=els.indexOf(item),fw=(e.key==='ArrowDown'||e.key==='ArrowRight');
    e.preventDefault();
    var j=fw?i+1:i-1;if(j<0||j>=els.length) return;
    if(fw) container.insertBefore(item,els[j].nextSibling);else container.insertBefore(item,els[j]);
    g.focus();
    o.onSort(order().map(function(c){return c.dataset.id;}));
  });
}
function gripBtn(label){return h('button',{class:'grip',type:'button','aria-label':label||'Sırayı değiştir (sürükle ya da ok tuşları)',title:'Sürükleyerek sırala'},icon('grip',18));}

/* ===================== ARAYÜZ: kabuk, kitaplık, ders, ünite ===================== */
function tabOf(v){return v==='course'||v==='unit'?'home':v;}

function renderBar(){
  var b=$('bar-in');clear(b);
  document.body.setAttribute('data-route',route.v);
  var rd=route.v==='reader';
  $('prog').hidden=!rd;
  if(rd){
    var p=S.parts[route.pid];
    b.appendChild(ibtn('back','Üniteye dön',function(){go({v:'unit',uid:p?p.uid:null});}));
    var cur=h('button',{class:'cur',type:'button','aria-label':'Bölümler',onclick:function(){readerToggleToc();}},
      h('span',{class:'tx',id:'cur-label',text:'Giriş'}),icon('chevron',14));
    b.appendChild(cur);
    b.appendChild(h('button',{class:'btn',type:'button',id:'btn-set','aria-label':'Okuma ayarları',onclick:function(){readerToggleSettings();}},h('span',{class:'aa',text:'Aa'})));
    b.appendChild(ibtn('focus','Odak modu',function(){P.focus=true;savePrefs();applyPrefs();toast('Odak modu açık. Çıkmak için sağ üstteki düğmeye ya da Esc\'ye bas.');}));
    b.appendChild(ibtn('contrast','Gündüz / gece',toggleTheme));
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
  b.appendChild(h('button',{class:'brand',type:'button','aria-label':'Kitaplık',onclick:function(){go({v:'home'});}},logoEl(26),h('span',{class:'brand-m',text:'GioReader'})));
  b.appendChild(h('nav',{class:'tabs','aria-label':'Ana gezinme'},h('button',{class:'tab on',type:'button','aria-current':'page',onclick:function(){go({v:'home'});}},'Kitaplık')));
  b.appendChild(h('span',{class:'sp'}));
  b.appendChild(ibtn('search','Ara (Ctrl+K)',function(){openSearch();}));
  b.appendChild(ibtn('contrast','Gündüz / gece',toggleTheme));
  b.appendChild(ibtn('gear','Ayarlar',function(){openSettings();}));
  b.appendChild(btn('Part ekle','primary',function(){openAdd();},'plus','Part ekle'));
}
function renderTabbar(){
  var t=$('tabbar');clear(t);
  var items=[
    {n:'Kitaplık',i:'library',on:tabOf(route.v)==='home',fn:function(){go({v:'home'});}},
    {n:'Ara',i:'search',fn:function(){openSearch();}},
    {n:'Ekle',i:'plus',add:true,fn:function(){openAdd();}},
    {n:'Ayarlar',i:'gear',fn:function(){openSettings();}}
  ];
  items.forEach(function(x){
    t.appendChild(h('button',{class:'tb'+(x.on?' on':'')+(x.add?' add':''),type:'button','aria-current':x.on?'page':null,onclick:x.fn},icon(x.i,x.add?22:20),h('span',{text:x.n})));
  });
}
function renderRoute(){
  var v=$('view');
  clear(v);
  if(route.v!=='reader'){document.documentElement.setAttribute('data-focus','0');}
  else document.documentElement.setAttribute('data-focus',P.focus?'1':'0');
  var fn={home:viewHome,course:viewCourse,unit:viewUnit,reader:viewReader,test:viewTest}[route.v]||viewHome;
  if(route.v!=='reader'){
    var hc=route.cid&&getCourse(route.cid)?getCourse(route.cid):(route.uid&&getUnit(route.uid)?getCourse(getUnit(route.uid).cid):null);
    setHue(hc?hc.hue:175);
  }
  renderBar();renderTabbar();
  fn(v);
  saveLast();
}
function refresh(){var y=window.scrollY;renderRoute();window.scrollTo(0,y);}

/* ---------- ortak parçalar ---------- */
function hueStyle(c){return {'--ch':String(c?c.hue:175)};}
function emptyState(title,text,actions){
  return h('div',{class:'empty'},h('h2',{class:'empty-h',text:title}),h('p',{text:text}),h('div',{class:'row wrap'},actions));
}
function chip(text,cls){return h('span',{class:'chip'+(cls?' '+cls:''),text:text});}
function progLine(p,cls){return h('span',{class:'pl'+(cls?' '+cls:'')},h('i',{style:{width:Math.round(clamp01(p)*100)+'%'}}));}
function crumbs(items){
  var el=h('nav',{class:'crumbs','aria-label':'Konum'});
  items.forEach(function(it,i){
    if(i) el.appendChild(h('span',{class:'crumb-sep',text:'/'}));
    el.appendChild(it.fn?h('button',{class:'crumb',type:'button',onclick:it.fn},it.t):h('span',{class:'crumb cur',text:it.t}));
  });
  return el;
}
function lastReadPart(){
  var best=null,bt=0;
  allParts().forEach(function(p){
    var st=S.st[p.id];
    if(st&&st.at&&st.at>bt&&getCourse(p.cid)&&getUnit(p.uid)&&!isTestUnit(p.uid)){best=p;bt=st.at;}
  });
  if(!best){
    var cs=courses();
    for(var ci=0;ci<cs.length&&!best;ci++){
      var pl=partsOfCourse(cs[ci].id);
      for(var pj=0;pj<pl.length;pj++) if(!partDone(pl[pj].id)&&!isTestUnit(pl[pj].uid)){best=pl[pj];break;}
    }
    return best;
  }
  if(partDone(best.id)){
    var ps=partsOfUnit(best.uid);
    for(var j=0;j<ps.length;j++) if(ps[j].no>best.no&&!partDone(ps[j].id)) return ps[j];
  }
  return best;
}
function weekSeconds(){
  var now=Date.now(),t=0;
  for(var i=0;i<7;i++){var e=S.meta.log[dayKey(shiftDay(now,-i))];if(e) t+=e.sec||0;}
  return t;
}
function storageBanner(){
  if(hasData()&&FS.state==='need') return h('aside',{class:'banner',role:'note'},
    h('div',{class:'banner-t'},h('b',{text:'Klasörün ('+(FS.name||'bağlı klasör')+') için tarayıcı yeniden izin istiyor.'}),h('span',{text:' Tek tıkla izin ver; açılan pencerede "Her ziyarette izin ver" varsa onu seç, bir daha sormaz. Kitaplığın bu sırada da güvende (tarayıcında ve hesabında).'})),
    h('div',{class:'row wrap'},btn('Klasöre izin ver','sm primary',function(){fsAllow().then(function(r){toast(FS.state==='ok'?'Klasör bağlandı':'İzin verilmedi');refresh();});},'folder')));
  if(P.noBanner||!hasData()||FS.state==='ok') return null;
  var acts=[];
  if(FS.sup&&FS.state==='none') acts.push(btn('Klasör bağla','sm',function(){fsLink().then(function(r){if(r){toast('Klasör bağlandı · kitaplığın orada da duruyor');refresh();}else refresh();});},'folder'));
  acts.push(btn('HTML olarak kaydet','sm',exportHTML,'file'));
  acts.push(btn('Kapat','sm ghost',function(){P.noBanner=true;savePrefs();refresh();}));
  return h('aside',{class:'banner',role:'note'},
    h('div',{class:'banner-t'},h('b',{text:'Kitaplığın şu an yalnızca tarayıcında'+(R?' ve hesabında':'')+' duruyor.'}),
      h('span',{text:FS.sup?' Bilgisayarına da kaydedebilirsin: bir klasör bağla ya da her şeyi içinde taşıyan tek bir HTML dosyası indir.':' Bilgisayarına, her şeyi içinde taşıyan tek bir HTML dosyası olarak da kaydedebilirsin.'})),
    h('div',{class:'row wrap'},acts));
}

/* ---------- Kitaplık ---------- */
function viewHome(v){
  var now=Date.now(),page=h('div',{class:'page home'});
  v.appendChild(page);
  var cs=courses();
  if(!cs.length){
    page.appendChild(h('header',{class:'home-h'},h('div',null,h('div',{class:'eyebrow',text:'GioReader'}),h('h1',{class:'home-t',text:'Kitaplık'}))));
    page.appendChild(emptyState('Henüz ders yok','Her ders için bir ünite aç, ünitede kaç part olacağını yaz, sonra partları tek tek yapıştır. Numara ve başlıkları metinden kendisi bulur.',[
      btn('İlk dersini oluştur','primary big',function(){openSetup();},'plus'),
      h('span',{class:'btn filebtn ghost'},icon('upload'),h('span',{class:'lbl',text:'Yedekten ya da HTML dosyasından yükle'}),importInput())]));
    return;
  }
  var total=0,done=0;cs.forEach(function(c){var s=courseStats(c.id);total+=s.loaded;done+=s.done;});
  var wk=weekSeconds();
  page.appendChild(h('header',{class:'home-h'},
    h('div',null,h('div',{class:'eyebrow',text:WDAYS[new Date(now).getDay()]+' · '+fmtDate(now)}),h('h1',{class:'home-t',text:'Kitaplık'})),
    h('div',{class:'home-m'},h('b',{text:total+' part'}),h('span',{text:done+' okundu'+(wk>=60?' · bu hafta '+fmtDur(wk):'')}))));
  var last=lastReadPart();
  if(last){
    var lc=getCourse(last.cid),un=getUnit(last.uid),pr=partProgress(last.id),left=partLeftMin(last);
    page.appendChild(h('section',{class:'resume',style:hueStyle(lc)},
      h('div',{class:'resume-in'},
        h('div',{class:'eyebrow acc',text:lc.name+(un?' · '+un.name:'')}),
        h('h2',{class:'resume-t',text:'Part '+last.no+' · '+ptitle(last)}),
        h('div',{class:'resume-m'},progLine(pr),h('span',{text:pr<0.02?(partMin(last)+' dk okuma'):('%'+Math.round(pr*100)+' · yaklaşık '+left+' dk kaldı')})),
        h('div',{class:'row'},btn(pr<0.02?'Okumaya başla':'Kaldığın yerden devam et','primary',function(){go({v:'reader',pid:last.id});},'book')))));
  }
  var bn=storageBanner();if(bn) page.appendChild(bn);
  var sec=h('section',{class:'sec-box'},h('div',{class:'sec-hr'},h('h2',{class:'sec-h',text:'Dersler'}),btn('Yeni ders','sm',function(){openCourseSheet();},'plus')));
  var grid=h('div',{class:'cgrid'});
  cs.forEach(function(c){
    var s=courseStats(c.id),us=unitsOf(c.id);
    grid.appendChild(h('div',{class:'cwrap','data-id':c.id},gripBtn('Dersi taşı'),h('button',{class:'ccard',type:'button',style:hueStyle(c),onclick:function(){go({v:'course',cid:c.id});}},
      h('span',{class:'ccard-n',text:String(s.loaded)}),
      h('span',{class:'ccard-t',text:c.name}),
      progLine(s.pct),
      h('span',{class:'ccard-m',text:s.units?(s.units+' ünite · '+s.loaded+(s.n>s.loaded?' / '+s.n:'')+' part yüklü · '+s.done+' okundu'):'Henüz ünite yok'}),
      h('span',{class:'ccard-f'},s.minutes?chip(s.minutes+' dk okuma'):null,s.tests?chip(s.tests+' test · '+s.q+' soru'):null))));
  });
  grid.appendChild(h('button',{class:'ccard add',type:'button',onclick:function(){openCourseSheet();}},icon('plus',22),h('span',{text:'Yeni ders'})));
  if(cs.length>1) sortable(grid,{item:'.cwrap',grip:'.grip',onSort:function(ids){
    var now=Date.now();ids.forEach(function(id,i){var cc=getCourse(id);if(cc&&cc.ord!==i+1){cc.ord=i+1;cc.u=now;}});
    touchMeta(null);}});
  sec.appendChild(grid);
  page.appendChild(sec);
}
function importInput(onDone){
  var file=h('input',{type:'file',accept:'.json,.html,.htm,application/json,text/html','aria-label':'Yedek dosyası seç'});
  file.addEventListener('change',function(){
    var f=file.files&&file.files[0];if(!f) return;
    var r=new FileReader();
    r.onload=function(){
      var txt=String(r.result||'');
      var m=/<script type="application\/json" id="embedded-lib">([\s\S]*?)<\/script>/.exec(txt);
      if(m) txt=m[1];
      if(importJSON(txt)){closeOverlay();if(onDone) onDone();else{navStack=[];route={v:'home'};renderRoute();}}
    };
    r.readAsText(f);file.value='';
  });
  return file;
}

/* ---------- Ders oluştur / düzenle ---------- */
function hueSwatches(hue,onPick){
  var sw=h('div',{class:'swatches',role:'radiogroup','aria-label':'Ders rengi'});
  function paint(){sw.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-checked',String(+b.dataset.hue===hue));});}
  HUES.forEach(function(x){
    sw.appendChild(h('button',{type:'button',role:'radio','data-hue':x,'aria-label':'Renk '+x,style:{'--ch':String(x)},onclick:function(){hue=x;onPick(x);paint();}}));
  });
  paint();
  return sw;
}
function openCourseSheet(c){
  var editing=!!c,hue=c?c.hue:HUES[courses().length%HUES.length];
  var name=h('input',{type:'text',id:'cname',class:'inp',value:c?c.name:'',placeholder:'Örn. Ayrık Matematik (Discrete)',autofocus:true,maxLength:60});
  var sw=hueSwatches(hue,function(x){hue=x;});
  var save=btn(editing?'Kaydet':'Dersi oluştur','primary',function(){
    var n=name.value.trim();
    if(!n){name.focus();return;}
    if(editing){c.name=n;c.hue=hue;updateCourse(c);closeOverlay();refresh();}
    else{var nc=addCourse(n,hue);closeOverlay();go({v:'course',cid:nc.id});setTimeout(function(){openUnitSheet(null,nc.id);},120);}
  });
  var body=h('div',{class:'form'},
    h('label',{class:'fl',for:'cname',text:'Ders adı'}),name,
    h('div',{class:'fl',text:'Renk'}),sw,
    editing?null:h('p',{class:'muted sm',text:'Sonra bu ders için ünite açıp kaç part olacağını gireceksin.'}),
    h('div',{class:'row end'},
      editing?confirmInline('Dersi sil',function(){
        var n=partsOfCourse(c.id).length;
        deleteCourse(c.id);closeOverlay();toast('Ders silindi'+(n?' · '+n+' part':''));go({v:'home'},{replace:true});
      }):null,
      h('span',{class:'sp'}),btn('Vazgeç','ghost',closeOverlay),save));
  name.addEventListener('keydown',function(e){if(e.key==='Enter') save.click();});
  modal(editing?'Ders ayarları':'Yeni ders',body);
}
/* İlk kurulum: ders + ünite + part sayısı tek adımda */
var pendingPaste=null;
function takePending(){var t=pendingPaste;pendingPaste=null;return t;}
function openSetup(text){
  if(text) pendingPaste=text;
  var cname=h('input',{type:'text',class:'inp',id:'su-c',placeholder:'Ders adı (örn. Data Structures)',autofocus:true,maxLength:60});
  var uname=h('input',{type:'text',class:'inp',id:'su-u',placeholder:'Ünite adı (örn. Ünite 1 · C++ Temelleri)',maxLength:80});
  var cnt=numField(12,1,300);
  var hue=HUES[courses().length%HUES.length];
  var sw=hueSwatches(hue,function(x){hue=x;});
  var go1=btn('Oluştur ve part ekle','primary',function(){
    var cn=cname.value.trim();if(!cn){cname.focus();return;}
    var c=addCourse(cn,hue),u=addUnit(c.id,{name:uname.value.trim()||'Ünite 1',n:cnt.val()});
    closeOverlay();go({v:'unit',uid:u.id});var pt=takePending();setTimeout(function(){openAdd({uid:u.id,text:pt||undefined});},150);
  });
  var body=h('div',{class:'form'},
    h('p',{class:'muted',text:'Ders → ünite → part. Ünitede kaç part olacağını baştan yazarsan her partı sırayla yapıştırırsın; sıra dışı bir part gelirse uyarırım.'}),
    h('label',{class:'fl',for:'su-c',text:'Ders'}),cname,
    h('label',{class:'fl',for:'su-u',text:'İlk ünite'}),uname,
    h('div',{class:'fl',text:'Bu ünitede kaç part olacak?'}),cnt.el,
    h('div',{class:'fl',text:'Renk'}),sw,
    h('div',{class:'row end'},h('span',{class:'sp'}),btn('Vazgeç','ghost',closeOverlay),go1));
  [cname,uname].forEach(function(i){i.addEventListener('keydown',function(e){if(e.key==='Enter') go1.click();});});
  modal('Başlayalım',body);
}
function numField(val,min,max){
  var inp=h('input',{type:'number',class:'inp num',min:min,max:max,value:val,inputMode:'numeric','aria-label':'Sayı'});
  function clampv(){var n=Math.round(+inp.value||min);n=Math.max(min,Math.min(max,n));return n;}
  var minus=h('button',{type:'button',class:'btn ghost sm step','aria-label':'Azalt',onclick:function(){inp.value=Math.max(min,clampv()-1);inp.dispatchEvent(new Event('input'));}},'−');
  var plus=h('button',{type:'button',class:'btn ghost sm step','aria-label':'Artır',onclick:function(){inp.value=Math.min(max,clampv()+1);inp.dispatchEvent(new Event('input'));}},'+');
  return {el:h('div',{class:'numf'},minus,inp,plus),inp:inp,val:clampv};
}

/* ---------- Ünite oluştur / düzenle ---------- */
function openUnitSheet(u,cid,o){
  o=o||{};
  var editing=!!u,isTest=u?u.kind==='test':o.kind==='test';
  cid=u?u.cid:cid;
  var c=getCourse(cid);if(!c) return;
  var maxNo=0;if(u) partsOfUnit(u.id).forEach(function(p){if(p.no>maxNo) maxNo=p.no;});
  var name=h('input',{type:'text',id:'un-n',class:'inp',value:u?u.name:'',placeholder:isTest?'Örn. Ünite 1 Testi':'Örn. Ünite 1 · C++ Temelleri',autofocus:true,maxLength:80});
  var testCb=h('input',{type:'checkbox',checked:isTest,onchange:function(){isTest=testCb.checked;paintKind();}});
  var cnt=numField(u?u.n:(isTest?6:12),Math.max(1,maxNo),300);
  var lines='';
  if(u){var arr=[];for(var i=1;i<=u.n;i++) arr.push(slotTitle(u,i));lines=arr.join('\n').replace(/\n+$/,'');}
  var titles=h('textarea',{class:'inp area',id:'un-t',rows:6,spellcheck:false,placeholder:'İstersen planladığın başlıkları buraya yaz, her satıra bir part (1. satır = Part 1).\nPart yüklenince başlığı metinden alınır.',value:lines});
  var titleBox=h('div',null,h('label',{class:'fl',for:'un-t',text:'Part başlıkları (isteğe bağlı)'}),titles);
  function paintKind(){titleBox.hidden=isTest;var l=document.getElementById('un-cl');if(l) l.textContent=isTest?'Test kaç parta bölünecek? (soruları parça parça yapıştıracaksın)':'Kaç part olacak?';}
  var save=btn(editing?'Kaydet':(isTest?'Testi oluştur':'Üniteyi oluştur'),'primary',function(){
    var tl=titles.value.split('\n').map(function(x){return x.trim();});
    var n=cnt.val();
    if(tl.length>n&&tl.slice(n).some(Boolean)) n=Math.min(300,tl.length);
    if(editing){
      u.name=name.value.trim()||u.name;u.n=Math.max(n,maxNo);u.hints=u.hints||{};
      if(isTest) u.kind='test';else delete u.kind;
      for(var i=1;i<=u.n;i++){
        var t=tl[i-1]||'',pp=slotPart(u.id,i);
        if(pp){if(!isTest&&t&&t!==ptitle(pp)) setPartTitle(pp.id,t);}
        else if(t) u.hints[i]=t;else delete u.hints[i];
      }
      Object.keys(u.hints).forEach(function(k){if(+k>u.n) delete u.hints[k];});
      updateUnit(u);closeOverlay();refresh();
    }else{
      var nu=addUnit(cid,{name:name.value,n:n,titles:tl,kind:isTest?'test':undefined});
      closeOverlay();go({v:'unit',uid:nu.id});
      var pt=takePending();if(pt) setTimeout(function(){openAdd({uid:nu.id,text:pt});},150);
    }
  });
  var body=h('div',{class:'form'},
    h('div',{class:'muted sm',text:c.name}),
    h('label',{class:'fl',for:'un-n',text:'Ünite adı'}),name,
    h('label',{class:'xu kindrow'},testCb,h('span',{text:'Bu bir test ünitesi (çoktan seçmeli sorular)'})),
    h('div',{class:'fl',id:'un-cl',text:'Kaç part olacak?'}),cnt.el,
    titleBox,
    editing&&maxNo?h('p',{class:'muted sm',text:'Yüklü en büyük part numarası '+maxNo+' olduğu için sayı bundan aşağı inemez.'}):null,
    h('div',{class:'row end'},
      editing?confirmInline('Üniteyi sil',function(){
        var n=partsOfUnit(u.id).length;deleteUnit(u.id);closeOverlay();toast('Ünite silindi'+(n?' · '+n+' part':''));go({v:'course',cid:cid},{replace:true});
      }):null,
      h('span',{class:'sp'}),btn('Vazgeç','ghost',closeOverlay),save));
  name.addEventListener('keydown',function(e){if(e.key==='Enter') save.click();});
  modal(editing?'Ünite ayarları':'Yeni ünite',body);
  paintKind();
}

/* ---------- Ders sayfası ---------- */
function slotStrip(un,compact){
  var strip=h('div',{class:'strip'+(compact?' compact':''),role:'list'});
  var fe=firstEmpty(un.id);
  var total=Math.max(un.n,1);
  for(var i=1;i<=total;i++){
    (function(no){
      var p=slotPart(un.id,no),cls='slot',tip;
      if(p){
        cls+=partDone(p.id)?' done':(partProgress(p.id)>0.02?' part':' has');
        tip='Part '+no+' · '+ptitle(p)+' (Shift+tık: okundu / okunmadı)';
      }else{cls+=(no===fe?' next':' vac');tip='Part '+no+' · '+(un.hints&&un.hints[no]?shortTitle(un.hints[no])+' · ':'')+'yüklenmedi';}
      var b=h('button',{class:cls,type:'button',role:'listitem',title:tip,'aria-label':tip,onclick:function(e){
        e.stopPropagation();
        if(p&&(e.shiftKey||e.altKey)){setDone(p.id,!partDone(p.id));refresh();return;}
        if(p) go({v:'reader',pid:p.id});else openAdd({uid:un.id,no:no});
      },oncontextmenu:function(e){if(p){e.preventDefault();setDone(p.id,!partDone(p.id));refresh();}}},h('span',{class:'slot-n',text:String(no)}));
      if(p&&!partDone(p.id)){var pr=partProgress(p.id);if(pr>0.02) b.style.setProperty('--fill',Math.round(pr*100)+'%');}
      strip.appendChild(b);
    })(i);
  }
  return strip;
}
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
    var card=h('article',{class:'ucard',style:hueStyle(c),'data-id':u.id},
      us.length>1?gripBtn('Üniteyi taşı'):null,
      h('div',{class:'ucard-h'},
        h('button',{class:'ucard-t',type:'button',onclick:function(){go({v:'unit',uid:u.id});}},
          h('span',{class:'ucard-name',text:u.name}),
          h('span',{class:'ucard-m',text:st.kind==='test'?('Test · '+st.loaded+' / '+st.n+' part yüklü · '+st.q+' soru'+(st.last?' · son: %'+st.last.pct:'')):(st.loaded+' / '+st.n+' part yüklü · '+st.done+' okundu'+(st.minutes?' · '+st.minutes+' dk':''))})),
        h('div',{class:'row'},
          st.kind==='test'&&st.q?btn('Testi çöz','sm',function(){openTestStart(u.id);},'check'):null,
          btn('Part yapıştır','sm',function(){openAdd({uid:u.id});},'plus'),
          ibtn('download','Üniteyi dışa aktar',function(){openExport({uid:u.id});}),
          btn('Aç','sm ghost',function(){go({v:'unit',uid:u.id});},'right'))),
      progLine(st.pct),
      slotStrip(u,true));
    list.appendChild(card);
  });
  if(us.length>1) sortable(list,{item:'.ucard',grip:'.grip',mid:true,onSort:function(ids){
    var now=Date.now();ids.forEach(function(id,i){var uu=getUnit(id);if(uu&&uu.ord!==i+1){uu.ord=i+1;uu.u=now;}});
    touchMeta(c);toast('Sıralama kaydedildi');}});
  page.appendChild(list);
}

/* ---------- Ünite sayfası ---------- */
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
      h('div',{class:'pg-m',text:isT?(st.loaded+' / '+st.n+' part yüklendi · '+st.q+' soru'+(st.last?' · son deneme %'+st.last.pct:'')):st.loaded+' / '+st.n+' part yüklendi · '+st.done+' okundu'+(st.minutes?' · ~'+st.minutes+' dk okuma':'')+(st.sec>=60?' · '+fmtDur(st.sec)+' okudun':'')}),
      h('div',{class:'unit-prog'},progLine(st.pct,'thick'))),
    h('div',{class:'row wrap'},
      isT?(st.q?btn(u.run&&!u.run.fin?'Teste devam et · '+Object.keys(u.run.ans||{}).length+' / '+u.run.order.length:'Testi başlat','primary',function(){openTestStart(u.id);},'check'):null):(resumeP?btn(partProgress(resumeP.id)>0.02?'Devam et':'Okumaya başla','',function(){go({v:'reader',pid:resumeP.id});},'book'):null),
      btn('Dışa aktar','ghost',function(){openExport({uid:u.id});},'download'),
      btn('Ayarlar','ghost',function(){openUnitSheet(u);},'gear'),
      btn(fe?'Part '+fe+' yapıştır':'Part yapıştır',isT&&st.q?'':'primary',function(){openAdd({uid:u.id,no:fe||undefined});},'plus'))));
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
        var s2=S.st[p.id]||{},pr=partProgress(p.id),done=partDone(p.id);
        list.appendChild(h('div',{class:'prow'+(done?' done':''),style:hueStyle(c)},
          h('button',{class:'prow-main',type:'button',onclick:function(){go({v:'reader',pid:p.id});}},
            h('span',{class:'prow-n',text:String(no)}),
            h('span',{class:'prow-b'},
              h('span',{class:'prow-t',text:ptitle(p)}),
              h('span',{class:'prow-m'},
                h('span',{text:(done||pr<0.02?partMin(p)+' dk':partLeftMin(p)+' dk kaldı')}),
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
          h('div',{class:'prow-a'},btn('Yapıştır','sm',function(){openAdd({uid:u.id,no:no});},'plus'))));
      }
    })(no);
  }
  page.appendChild(list);
  if(isT&&(u.runs||[]).length) page.appendChild(runHistory(u));
  if(!ps.length) page.appendChild(h('p',{class:'muted hint-p',text:isT?'Test partlarını Ctrl+V ile yapıştır. Her parçada "Soru 1: … A) … E) … Doğru Cevap: C" biçimindeki sorular bulunur; hepsini yükleyince testi başlatırsın.':'Part metnini kopyalayıp bu sayfada Ctrl+V yapman yeterli. Numarası ve başlığı metinden bulunur, doğru yuvaya yerleşir.'}));
}
function openPartMenu(p){
  var un=getUnit(p.uid),c=getCourse(p.cid),st=ST(p.id);
  var title=h('input',{type:'text',class:'inp',id:'pm-t',value:mathInText(p.title),maxLength:140,'aria-label':'Başlık'});
  var num=numField(p.no,1,300);
  var saveT=btn('Kaydet','sm',function(){
    var changed=false;
    if(title.value.trim()!==mathInText(p.title)){setPartTitle(p.id,title.value);changed=true;}
    var n=num.val();
    if(n!==p.no){
      var other=slotPart(p.uid,n);
      renumberPart(p.id,n);changed=true;
      if(other) toast('Part '+n+' ile yer değiştirdi');
    }
    closeOverlay();if(changed&&!document.getElementById('toast').textContent){toast('Kaydedildi');}refresh();
  });
  var others=[];
  courses().forEach(function(cc){unitsOf(cc.id).forEach(function(uu){if(uu.id!==p.uid) others.push({c:cc,u:uu});});});
  var msel=h('select',{class:'inp','aria-label':'Taşınacak ünite'},others.map(function(o,i){return h('option',{value:o.u.id,text:o.c.name+' › '+o.u.name});}));
  var body=h('div',{class:'form'},
    h('div',{class:'muted sm',text:c.name+' · '+un.name}),
    h('label',{class:'fl',for:'pm-t',text:'Başlık'}),title,
    p.ft&&p.ft!==p.title?h('p',{class:'muted sm',text:'Metindeki tam başlık: '+p.ft}):null,
    h('div',{class:'fl',text:'Part numarası'}),h('div',{class:'row'},num.el,saveT),
    h('div',{class:'stack'},
      btn(partDone(p.id)?'Okunmadı olarak işaretle':'Okundu olarak işaretle','',function(){
        setDone(p.id,!partDone(p.id));closeOverlay();refresh();
      },'check'),
      btn('Bu part ve öncekileri okundu yap','',function(){
        var n=0;partsOfUnit(p.uid).forEach(function(q){if(q.no<=p.no&&!partDone(q.id)){setDone(q.id,true);n++;}});
        closeOverlay();toast(n+' part okundu olarak işaretlendi');refresh();
      },'check'),
      btn('Okuma konumunu başa al','',function(){st.pos=0;touch('s:'+p.id);closeOverlay();refresh();},'back'),
      p.prev?btn('Önceki sürümü geri getir ('+fmtAgo(p.prev.at||p.u,Date.now())+')','',function(){
        var cur={text:p.text,title:p.title,at:p.u};
        p.text=p.prev.text;p.title=p.prev.title;p.prev=cur;p.minutes=readMinutes(analyzePart(p.text).body);delete p.ft;touch('p:'+p.id);closeOverlay();toast('Önceki sürüm geri getirildi');refresh();
      },'clock'):null,
      btn('Metni .md olarak indir','',function(){saveFile(slug('Part '+p.no+' '+p.title,80)+'.md',p.text,'text/markdown');},'download')),
    others.length?h('div',{class:'stack'},h('label',{class:'fl',text:'Başka üniteye taşı'}),h('div',{class:'row'},msel,btn('Taşı','',function(){
      var tu=msel.value,fe=firstEmpty(tu),no=slotPart(tu,p.no)?fe:p.no;
      if(!no){toast('Hedef ünitede boş yuva yok');return;}
      if(movePartTo(p.id,tu,no)){closeOverlay();toast('Part taşındı · yuva '+no);refresh();}
    }))):null,
    h('div',{class:'row end'},confirmInline('Partı sil',function(){
      var restore=deletePart(p.id);closeOverlay();
      toast('Part silindi',{label:'Geri al',fn:function(){if(restore){restore();refresh();}}});refresh();
    }),h('span',{class:'sp'}),btn('Kapat','ghost',closeOverlay)));
  modal('Part işlemleri',body);
}

/* ---------- Part ekleme: algıla, uyar, yerleştir ---------- */
function targetUnitId(){
  if(route.v==='unit'&&getUnit(route.uid)) return route.uid;
  if(route.v==='reader'&&S.parts[route.pid]&&getUnit(S.parts[route.pid].uid)) return S.parts[route.pid].uid;
  if(route.v==='course'&&getCourse(route.cid)){
    var us=unitsOf(route.cid);
    if(UI.lastUnit&&us.some(function(x){return x.id===UI.lastUnit;})) return UI.lastUnit;
    var f=us.find(function(x){return firstEmpty(x.id)!=null;});
    return f?f.id:(us[0]?us[0].id:null);
  }
  if(UI.lastUnit&&getUnit(UI.lastUnit)) return UI.lastUnit;
  var all=allUnits();
  return all.length?all[all.length-1].id:null;
}
/* Yerleştirme planı: numara, başlık ve uyarılar */
function planAdd(text,uid,wantNo,userTitle){
  var an=analyzePart(text),u=getUnit(uid),warns=[],no=wantNo||an.no,fe=u?firstEmpty(uid):null;
  if(!no){no=fe||(u?u.n+1:1);warns.push({k:'none',t:'Part numarası metinde bulunamadı. Yuva olarak Part '+no+' seçildi, kontrol et.'});}
  else if(!wantNo||wantNo===an.no){
    if(an.conf==='low') warns.push({k:'low',t:'Numara kesin değil: metindeki "sonraki part" ifadesinden Part '+no+' olarak tahmin edildi.'});
  }
  var isT=!!(u&&u.kind==='test'),qs=parseQuestions(text);
  if(isT&&!qs.length) warns.push({k:'nottest',t:'Bu bir test ünitesi ama metinde soru bulunamadı (Soru 1: … A) … B) … biçimi bekleniyor).'});
  if(u&&!isT&&qs.length>=2&&qs.filter(function(q){return q.ans;}).length>=2) warns.push({k:'istest',t:'Bu metin çoktan seçmeli bir test gibi görünüyor ama bu ünite normal bir okuma ünitesi. Test ünitesi açıp oraya eklemek daha doğru olur.'});
  if(isT&&qs.length&&qs.some(function(q){return !q.ans;})) warns.push({k:'noans',t:qs.filter(function(q){return !q.ans;}).length+' sorunun doğru cevabı metinde bulunamadı. Bu sorular puanlanmaz.'});
  if(an.multi&&!isT) warns.push({k:'multi',t:'Bu metin birden fazla part içeriyor gibi görünüyor. Partları tek tek yapıştırman daha iyi olur.'});
  var ex=u?slotPart(uid,no):null;
  if(ex){
    if(ex.text.trim()===String(text).replace(/\r\n?/g,'\n').trim()) warns.push({k:'same',t:'Bu metin Part '+no+' yuvasında zaten yüklü.'});
    else warns.push({k:'occupied',t:'Part '+no+' yuvasında zaten bir part var: "'+ptitle(ex)+'". Devam edersen yerine geçer; eskisi "önceki sürüm" olarak saklanır.'});
  }else if(u&&fe!=null&&no>fe){
    warns.push({k:'skip',t:'Bu metin Part '+no+' gibi görünüyor ama sıradaki boş yuva Part '+fe+'.',fix:fe});
  }
  if(u&&no>u.n&&!ex) warns.push({k:'beyond',t:'Ünite '+u.n+' part olarak planlanmıştı. Part '+no+' eklenince '+no+' part olacak.'});
  var title=(userTitle&&userTitle.trim())||(an.title&&shortTitle(an.title))||(u&&u.hints&&u.hints[no])||('Part '+no);
  var hard=warns.some(function(w){return w.k!=='beyond';});
  return {an:an,no:no,title:title,warns:warns,clean:!hard,ex:ex,fe:fe};
}
function commitAdd(uid,plan,text,opts){
  opts=opts||{};
  var r=putPart(uid,plan.no,text,{an:plan.an,title:plan.title});
  if(!r) return null;
  var u=getUnit(uid),c=getCourse(u.cid),read=opts.read!=null?opts.read:P.after==='read';
  if(!opts.quiet){
    var acts=[{label:'Geri al',fn:function(){r.undo();refresh();}}];
    if(!read) acts.push({label:'Aç',fn:function(){go({v:'reader',pid:r.part.id});}});
    toast('Part '+plan.no+(r.replaced?' güncellendi':' eklendi')+' · '+c.name+' › '+u.name,acts);
  }
  if(read&&!opts.quiet) go({v:'reader',pid:r.part.id});
  else if(!opts.noRefresh){if(RD&&route.v==='reader') renderEnd();else if(route.v!=='reader') refresh();}
  return r;
}
function quickAdd(text){
  var uid=targetUnitId();
  if(!uid){openAdd({text:text});return;}
  var plan=planAdd(text,uid);
  if(plan.clean) commitAdd(uid,plan,text);
  else openAdd({text:text,uid:uid});
}
function openAdd(opts){
  opts=opts||{};
  var uid=opts.uid||targetUnitId(),u=uid?getUnit(uid):null;
  if(!courses().length){openSetup(opts.text);return;}
  if(!allUnits().length){var c0=courses()[0];if(opts.text) pendingPaste=opts.text;openUnitSheet(null,c0.id);return;}
  if(!u){u=allUnits()[0];uid=u.id;}
  var cid=u.cid,wantNo=opts.no||null,touchedNo=!!opts.no,touchedTitle=false;
  var ta=h('textarea',{id:'paste-input',class:'inp area paste',spellcheck:false,placeholder:'Part metnini buraya yapıştır (Ctrl+V)',autofocus:true});
  if(opts.text) ta.value=opts.text;
  var csel=h('select',{class:'inp','aria-label':'Ders'},courses().map(function(c){return h('option',{value:c.id,text:c.name,selected:c.id===cid});}));
  var usel=h('select',{class:'inp','aria-label':'Ünite'});
  function fillUnits(){
    clear(usel);
    unitsOf(cid).forEach(function(x){usel.appendChild(h('option',{value:x.id,text:x.name+' ('+partsOfUnit(x.id).length+'/'+x.n+')',selected:x.id===uid}));});
    if(!unitsOf(cid).length) usel.appendChild(h('option',{value:'',text:'Bu derste ünite yok'}));
  }
  fillUnits();
  csel.addEventListener('change',function(){cid=csel.value;var us=unitsOf(cid);uid=us.length?us[0].id:null;fillUnits();touchedNo=false;analyse();});
  usel.addEventListener('change',function(){uid=usel.value||null;touchedNo=false;analyse();});
  var numF=numField(wantNo||1,1,300),titleI=h('input',{type:'text',class:'inp',id:'ad-t',maxLength:140,placeholder:'Başlık',autofocus:false});
  var info=h('div',{class:'detect'}),warnBox=h('div',{class:'warns',role:'status',['aria-live']:'polite'});
  var addB=btn('Ekle','primary',function(){submit(false);},'plus');
  var readB=btn('Ekle ve oku','',function(){submit(true);},'book');
  var forceB=btn('Yine de ekle','warnbtn',function(){submit(false);},'plus');
  var forceReadB=btn('Yine de ekle ve oku','ghost',function(){submit(true);},'book');
  var openB=btn('Zaten yüklü · partı aç','primary',function(){var p2=planAdd(readText(),uid,numF.val());if(p2.ex){closeOverlay();go({v:'reader',pid:p2.ex.id});}},'book');
  var go2={disabled:false};
  var added=h('div',{class:'added-list',role:'status','aria-live':'polite'});
  function setBtns(mode){
    [addB,readB,forceB,forceReadB,openB].forEach(function(b){b.hidden=true;});
    if(mode==='off') return;
    if(mode==='ok'){addB.hidden=false;readB.hidden=false;addB.disabled=readB.disabled=false;}
    else if(mode==='warn'){forceB.hidden=false;forceReadB.hidden=false;}
    else if(mode==='same'){openB.hidden=false;}
  }
  var plan=null;
  function readText(){return ta.value.replace(/\r\n?/g,'\n').trim();}
  function analyse(){
    var t=readText();
    clear(warnBox);
    if(t.length<80){
      plan=null;info.textContent=t.length?'Metin çok kısa görünüyor.':'Metni yapıştırınca part numarası, başlık ve bölümler otomatik algılanır.';info.classList.remove('ok');
      if(!touchedNo&&uid) numF.inp.value=firstEmpty(uid)||(getUnit(uid)?getUnit(uid).n+1:1);
      setBtns('off');return;
    }
    var want=touchedNo?numF.val():null;
    plan=planAdd(t,uid,want,touchedTitle?titleI.value:'');
    if(!touchedNo) numF.inp.value=plan.no;
    if(!touchedTitle) titleI.value=plan.title;
    if(plan.an.title&&plan.an.title!==plan.title&&!touchedTitle) titleI.title='Metindeki tam başlık: '+plan.an.title;
    var d=buildDoc(t);
    info.classList.add('ok');
    var tq=(getUnit(uid)&&getUnit(uid).kind==='test')?parseQuestions(t):null;
    info.textContent=tq?'Part '+plan.no+' · '+tq.length+' soru · '+tq.filter(function(q){return q.ans;}).length+' cevap anahtarı bulundu':'Part '+plan.no+' · ~'+Math.max(1,Math.round(countWords(plan.an.body)/curWpm()))+' dk okuma'+(d.eqCount?' · '+d.eqCount+' denklem':'')+(plan.an.tex?' · LaTeX algılandı, Markdown olarak gösterilir':'')+(plan.an.next?' · sonraki: Part '+plan.an.next.no+(plan.an.next.title?' '+shortTitle(plan.an.next.title):''):'');
    plan.warns.forEach(function(w){
      var row=h('div',{class:'warn w-'+w.k},h('span',{class:'warn-t',text:w.t}));
      if(w.fix) row.appendChild(btn('Part '+w.fix+' olarak ekle','sm',function(){touchedNo=true;numF.inp.value=w.fix;analyse();}));
      warnBox.appendChild(row);
    });
    var occ=plan.warns.some(function(w){return w.k==='occupied';});
    forceB.querySelector('.lbl').textContent=occ?'Yine de değiştir':'Yine de ekle';
    forceReadB.querySelector('.lbl').textContent=occ?'Değiştir ve oku':'Yine de ekle ve oku';
    setBtns(plan.warns.some(function(w){return w.k==='same';})?'same':plan.clean?'ok':'warn');
    if(!plan.clean) warnBox.insertBefore(h('div',{class:'warn-lead',text:'Bu part yerine oturmuyor gibi. Doğruysa aşağıdan açıkça onaylayarak ekleyebilirsin.'}),warnBox.firstChild);
  }
  var timer=null;
  ta.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(analyse,160);});
  numF.inp.addEventListener('input',function(){touchedNo=true;analyse();});
  titleI.addEventListener('input',function(){touchedTitle=true;});
  var file=h('input',{type:'file',id:'paste-file',multiple:true,accept:'.md,.markdown,.txt,.tex,.latex,text/plain,text/markdown,text/x-tex','aria-label':'Dosya seç'});
  file.addEventListener('change',function(){
    var fs=Array.prototype.slice.call(file.files||[]);file.value='';
    if(!fs.length) return;
    Promise.all(fs.map(function(f){return new Promise(function(res){var r=new FileReader();r.onload=function(){res({name:f.name,text:String(r.result||'')});};r.readAsText(f);});})).then(function(items){
      if(items.length===1){ta.value=items[0].text;touchedNo=false;touchedTitle=false;analyse();return;}
      items.sort(function(a,b){return a.name.localeCompare(b.name,'tr',{numeric:true});});
      importMany(uid,items);
    });
  });
  function submit(read){
    var t=readText();
    if(t.length<80){toast('Metin çok kısa görünüyor');return;}
    if(!uid||!getUnit(uid)){toast('Önce bir ünite seç');return;}
    var no=numF.val();
    var p2=planAdd(t,uid,no,titleI.value);
    if(p2.warns.some(function(w){return w.k==='same';})){var ex=p2.ex;closeOverlay();go({v:'reader',pid:ex.id});return;}
    if(read){closeOverlay();commitAdd(uid,p2,t,{read:true});return;}
    var r=commitAdd(uid,p2,t,{quiet:true,read:false});
    if(!r) return;
    added.appendChild(h('div',{class:'added'},icon('check',14),h('span',{text:'Part '+p2.no+' · '+ptitle(r.part)+(r.replaced?' (değiştirildi)':'')}),
      h('button',{type:'button',class:'toast-act',text:'Geri al',onclick:function(ev){r.undo();ev.target.parentNode.remove();refresh();analyse();}})));
    ta.value='';touchedNo=false;touchedTitle=false;titleI.value='';
    fillUnits();analyse();ta.focus();
  }
  ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();var b=!addB.hidden?addB:null;if(b) b.click();else toast('Önce uyarıları kontrol et; gerekirse "Yine de ekle"ye bas');}});
  var body=h('div',{class:'form add'},
    h('div',{class:'row wrap target'},csel,usel),
    ta,info,
    h('div',{class:'add-fields'},
      h('div',{class:'field'},h('div',{class:'fl',text:'Part numarası'}),numF.el),
      h('div',{class:'field grow'},h('label',{class:'fl',for:'ad-t',text:'Başlık'}),titleI)),
    warnBox,added,
    h('div',{class:'row end wrap'},h('span',{class:'btn ghost filebtn'},icon('upload'),h('span',{class:'lbl',text:'Dosya seç (.md, .tex)'}),file),h('span',{class:'sp'}),btn('Kapat','ghost',closeOverlay),readB,forceReadB,addB,forceB,openB));
  modal('Part ekle',body,{wide:true});
  analyse();
}
/* Birden çok dosya: temiz olanları ekle, kalanları raporla */
function importMany(uid,items){
  var added=0,skipped=[];
  items.forEach(function(it){
    var t=it.text.trim();
    if(t.length<80){skipped.push([it.name,'çok kısa']);return;}
    var pl=planAdd(t,uid);
    var bad=pl.warns.filter(function(w){return w.k==='occupied'||w.k==='none'||w.k==='multi'||w.k==='same';})[0];
    if(bad){skipped.push([it.name,bad.k==='occupied'||bad.k==='same'?'Part '+pl.no+' yuvası dolu':bad.k==='none'?'numara bulunamadı':'birden fazla part']);return;}
    commitAdd(uid,pl,t,{quiet:true});added++;
  });
  closeOverlay();
  if(!skipped.length){toast(added+' part eklendi');go({v:'unit',uid:uid});return;}
  var list=h('ul',{class:'skip-list'},skipped.map(function(s){return h('li',null,h('b',{text:s[0]}),' · '+s[1]);}));
  go({v:'unit',uid:uid});
  modal('Dosyalar eklendi',h('div',{class:'form'},h('p',{text:added+' part eklendi, '+skipped.length+' dosya atlandı:'}),list,h('p',{class:'muted sm',text:'Atlananları tek tek "Part ekle" ile yapıştırıp numarayı elle düzeltebilirsin.'}),h('div',{class:'row end'},btn('Tamam','primary',closeOverlay))));
}

/* ---------- Arama ---------- */
var plainCache={};
function plainFor(p){
  var c=plainCache[p.id];
  if(c&&c.u===p.u) return c.t;
  var t=plainOf(p.text);plainCache[p.id]={u:p.u,t:t};return t;
}
function openSearch(initial){
  var inp=h('input',{type:'search',class:'inp big',id:'sq',placeholder:'Tüm derslerde ara',autofocus:true,autocomplete:'off',value:initial||''});
  var out=h('div',{class:'sres'});
  function run(){
    clear(out);
    var q=inp.value.trim();
    if(q.length<2){out.appendChild(h('p',{class:'muted',text:'En az 2 harf yaz.'}));return;}
    var lq=q.toLocaleLowerCase('tr'),n=0;
    var groups=[];
    allParts().filter(function(p){return getCourse(p.cid)&&getUnit(p.uid);}).forEach(function(p){
      var c=getCourse(p.cid),plain=plainFor(p);
      var titleHit=(p.title+' '+(p.ft||'')).toLocaleLowerCase('tr').indexOf(lq)>=0;
      var pos=findAll(plain,q,3);
      if(!titleHit&&!pos.length) return;
      groups.push({p:p,c:c,u:getUnit(p.uid),titleHit:titleHit,pos:pos,plain:plain});
    });
    if(groups.length){
      out.appendChild(h('h3',{class:'sres-h',text:'Partlar'}));
      groups.slice(0,12).forEach(function(g){
        var item=h('div',{class:'sitem',style:hueStyle(g.c)},
          h('button',{class:'sitem-t',type:'button',onclick:function(){closeOverlay();go({v:'reader',pid:g.p.id,jump:{q:q}});}},
            h('span',{class:'eyebrow acc',text:g.c.name+' · '+g.u.name}),h('b',{text:'Part '+g.p.no+' · '+ptitle(g.p)})));
        g.pos.forEach(function(i){
          var sn=snippetAt(g.plain,i,q.length);
          item.appendChild(h('button',{class:'ssnip',type:'button',onclick:function(){closeOverlay();go({v:'reader',pid:g.p.id,jump:{q:sn.hit,ctx:sn.pre.slice(-24)}});}},sn.pre,h('mark',{text:sn.hit}),sn.post));
        });
        out.appendChild(item);n++;
      });
    }
    if(!n) out.appendChild(h('p',{class:'muted',text:'Sonuç yok.'}));
  }
  var t=null;
  inp.addEventListener('input',function(){clearTimeout(t);t=setTimeout(run,120);});
  modal('Ara',h('div',{class:'form'},inp,out),{wide:true});
  run();
}

/* ---------- Ayarlar / kayıt ---------- */
function openSettings(){
  var syncEl=h('div',{class:'syncline'}),fsEl=h('div',{class:'fsbox'}),speedEl=h('p',{class:'muted sm'});
  function paintSpeed(){
    var wi=wpmInfo(),tw=0,np=0,tot=0;
    allParts().forEach(function(p){if(getCourse(p.cid)&&getUnit(p.uid)){np++;tw+=partWords(p);}});
    tot=Math.round(tw/(P.wpmFixed?WPM_DEF:wi.wpm));
    speedEl.textContent=(wi.learned?'Okuma hızın şu an yaklaşık '+wi.wpm+' kelime/dk ('+wi.n+' okunmuş partın gerçek süresinden öğrenildi). ':'Varsayılan hız: '+WPM_DEF+' kelime/dk'+(P.wpmFixed?'. ':'; birkaç partı sonuna kadar okuyunca hızın öğrenilir. '))+'Kitaplığın: '+np+' part, '+tw.toLocaleString('tr-TR')+' kelime, yaklaşık '+(tot>=90?Math.floor(tot/60)+' sa '+(tot%60)+' dk':tot+' dk')+' okuma.';
  }
  paintSpeed();
  function paintSync(){
    syncEl.className='syncline s-'+sync.state;
    clear(syncEl);
    syncEl.appendChild(h('span',{class:'sdot'}));
    syncEl.appendChild(h('span',{text:'Hesap: '+sync.msg+(sync.last&&sync.state==='ok'?' · '+new Date(sync.last).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'')}));
    paintFs();
  }
  function paintFs(){
    clear(fsEl);
    if(!FS.sup){
      fsEl.appendChild(h('p',{class:'muted sm',text:'Klasöre kaydetme bu tarayıcıda ya da bu görünümde yok. Chrome ya da Edge ile, kaydettiğin HTML dosyasını bilgisayardan açarak kullanabilirsin.'}));
      return;
    }
    if(FS.state==='need') fsEl.appendChild(h('p',{class:'muted sm',text:'Tarayıcı, sekmeyi kapatıp açınca klasör iznini sıfırlayabilir. "Erişime izin ver"e basman yeter; klasörü yeniden seçmen gerekmez. İzin penceresinde "Her ziyarette izin ver" çıkarsa onu seç.'}));
    var line=h('div',{class:'syncline s-'+(FS.state==='ok'?'ok':FS.state==='err'?'err':FS.state==='busy'?'busy':'local')},h('span',{class:'sdot'}),
      h('span',{text:'Klasör: '+(FS.state==='none'?'bağlı değil':FS.state==='need'?(FS.name||'klasör')+' · izin gerekiyor':FS.state==='busy'?'yazılıyor…':FS.state==='err'?(FS.err||'hata'):(FS.name||'klasör')+' · bağlı'+(FS.last?' · '+new Date(FS.last).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):''))}));
    fsEl.appendChild(line);
    var acts=h('div',{class:'row wrap'});
    if(FS.state==='none') acts.appendChild(btn('Klasör bağla','',function(){fsLink().then(function(r){paintFs();if(r) toast('Klasör bağlandı'+(r.changed?' · klasördeki kayıtlar yüklendi':''));if(r&&r.changed) refresh();});},'folder'));
    else{
      if(FS.state==='need') acts.appendChild(btn('Erişime izin ver','primary',function(){fsAllow().then(function(r){paintFs();if(r&&r.changed) refresh();});},'folder'));
      else acts.appendChild(btn('Şimdi yaz','',function(){fsSync(true).then(function(r){paintFs();if(r){toast('Klasör güncellendi');if(r.changed) refresh();}});},'sync'));
      acts.appendChild(btn('Klasörü değiştir','',function(){fsLink().then(function(r){paintFs();if(r){toast('Klasör değişti · kitaplığın yeni klasöre de yazıldı');if(r.changed) refresh();}});},'folder'));
      if(!window.gioNative) acts.appendChild(btn('Bağlantıyı kes','ghost',function(){fsUnlink().then(paintFs);}));
    }
    fsEl.appendChild(acts);
    if(FS.state==='ok') fsEl.appendChild(h('p',{class:'muted sm',text:'Her part Ders/Ünite/NN - Başlık.md dosyası olarak yazılır. Dosyayı bir editörde düzenlersen okuyucu değişikliği sonraki açılışta alır. Okuma konumu ve ayarlar klasördeki .ayrik/ içinde tutulur (eski sürümle uyumlu olsun diye adı değişmedi).'}));
  }
  paintSync();
  var prevHook=onSyncChange;
  onSyncChange=function(){paintSync();prevHook();};
  function seg(label,key,opts,after){
    var g=h('div',{class:'seg',role:'radiogroup','aria-label':label});
    opts.forEach(function(o){
      g.appendChild(h('button',{type:'button',role:'radio','aria-checked':String(P[key]===o[0]),text:o[1],onclick:function(){
        P[key]=o[0];savePrefs();applyPrefs();g.querySelectorAll('button').forEach(function(x,i){x.setAttribute('aria-checked',String(opts[i][0]===P[key]));});if(after) after();
      }}));
    });
    return h('div',{class:'field'},h('div',{class:'fl',text:label}),g);
  }
  var body=h('div',{class:'form settings'},
    h('h3',{class:'sres-h',text:'Görünüm'}),
    seg('Tema','theme',[['auto','Sistem'],['light','Gündüz'],['sepia','Kâğıt'],['dark','Gece'],['oled','OLED'],['nord','Nord']]),
    seg('Yazı tipi','font',[['serif','Literata'],['classic','Klasik'],['sans','Sans'],['mono','Mono']]),
    seg('Satır genişliği','width',[['narrow','Dar'],['normal','Normal'],['wide','Geniş'],['full','Tam']]),
    seg('Üst çubuk','bar',[['static','Sayfayla kayar'],['fixed','Sabit']]),
    seg('Açılışta','start',[['home','Kitaplık'],['resume','Kaldığım yer']]),
    h('h3',{class:'sres-h',text:'Ekleme ve okuma'}),
    seg('Part yapıştırılınca','after',[['stay','Sayfada kal'],['read','Okuyucuyu aç']]),
    seg('Part sonuna gelince','autoDone',[[true,'Otomatik okundu say'],[false,'Elle işaretle']]),
    seg('Süre tahmini','wpmFixed',[[false,'Hızımı öğren'],[true,'Sabit 170 kelime/dk']],function(){wpmCache.k=-1;paintSpeed();}),
    speedEl,
    h('div',{class:'row wrap'},
      btn('Part başlıklarını ve ipuçlarını onar','',function(){var r=healLibraryMetadata();refresh();toast('Kitaplık tarandı · '+r.healedParts+' başlık, '+r.healedUnits+' ünite ipucu iyileştirildi');},'check'),
      btn('Üniteyi / dersi dışa aktar (.md, PDF)','',function(){openExport({});},'download')),
    h('h3',{class:'sres-h',text:'Kitaplığını sakla'}),
    h('div',{class:'syncline s-ok'},h('span',{class:'sdot'}),h('span',{text:'Tarayıcı: bu cihazda kayıtlı'+(lsOK?'':' (yerel kayıt kısıtlı, IndexedDB kullanılıyor)')})),
    syncEl,
    fsEl,
    h('div',{class:'row wrap'},
      btn('Tek HTML olarak kaydet','',exportHTML,'file'),
      btn('Markdown klasörü (.zip)','',exportZip,'layers'),
      btn('Yedek (.json)','',saveBackup,'download'),
      h('span',{class:'btn filebtn'},icon('upload'),h('span',{class:'lbl',text:'Yedekten / HTML\'den yükle'}),importInput(function(){refresh();}))),
    h('p',{class:'muted sm',text:'HTML dosyası GioReader'+'\'ın kendisidir ve tüm kitaplığını içinde taşır. Bilgisayarında çift tıklayıp açabilirsin; internetsiz de çalışır (yalnızca yazı tipleri sistemin yazı tipine döner).'}),
    R?h('div',{class:'row wrap'},btn('Hesapla şimdi eşitle','',async function(){var r=await syncAll();if(r.changed){toast('Başka cihazdaki değişiklikler yüklendi');refresh();}else toast('Her şey güncel');},'sync')):null,
    h('h3',{class:'sres-h',text:'Masaüstü kısayolu'}),
    window.gioNative?h('div',{class:'kshort'},logoEl(56),h('div',{style:{flex:'1 1 260px'}},h('p',{class:'muted sm',style:{margin:'0 0 8px'},text:'Bu, GioReader masaüstü uygulaması. Kitaplığın seçtiğin klasörde .md dosyaları olarak durur; klasör izni sormaz.'}),h('div',{class:'row wrap'},
      btn('Masaüstü kısayolu oluştur','',function(){window.gioNative.shortcut().then(function(r){toast(r&&r.ok?'Kısayol oluşturuldu: '+r.msg:'Kısayol oluşturulamadı');});},'download'),
      btn('Veri klasörünü aç','',function(){window.gioNative.openFolder();},'folder')),
      h('h4',{class:'sres-h',style:{marginTop:'14px'},text:'Güncelleme'}),
      h('p',{class:'muted sm',style:{margin:'0 0 8px'},text:'Yeni sürümde tek yapman gereken yeni gioreader.html dosyasını indirmek: uygulama İndirilenler klasöründe bulur ve kendini günceller. Kurup silmek gerekmez; kitaplığın etkilenmez.'}),
      h('p',{class:'muted sm',style:{margin:'0 0 8px'},id:'gio-build',text:''}),
      h('div',{class:'row wrap'},
        btn('Güncelleme ara','',function(){window.gioNative.updateCheck().then(function(r){toast(r&&r.msg||'Kontrol edildi');});},'sync'),
        btn('Dosyadan güncelle…','',function(){window.gioNative.updatePick().then(function(r){if(r&&r.msg) toast(r.msg);});},'upload'),
        btn('Yerleşik sürüme dön','ghost',function(){window.gioNative.updateReset();})))):
    h('div',{class:'kshort'},logoEl(56),h('p',{class:'muted sm',style:{margin:0,flex:'1 1 260px'},text:'Chrome / Edge: sağ üstteki ⋮ menüsü → "Kaydet ve paylaş" → "Kısayol oluştur…" (ya da "Uygulama olarak yükle"), "Pencere olarak aç"ı işaretle. GioReader masaüstünde kendi simgesiyle, ayrı pencerede açılır. Klasör bağlantın ve kitaplığın aynı kalır.'})),
    h('h3',{class:'sres-h',text:'Klavye'}),
    shortcutList(),
    h('div',{class:'row end'},confirmInline('Tüm verileri sil',function(){wipeAll();}),h('span',{class:'sp'}),btn('Kapat','',closeOverlay)));
  modal('Ayarlar',body,{wide:true,onclose:function(){onSyncChange=prevHook;}});
  if(window.gioNative&&window.gioNative.info) window.gioNative.info().then(function(i){var e=document.getElementById('gio-build');if(e) e.textContent='Sürüm: '+(i.build||'?')+(i.updated?' (güncellenmiş)':' (yerleşik)')+' · veri klasörü: '+i.folder;});
}
function shortcutList(){
  var rows=[['Ctrl K  ·  /','Ara'],['Ctrl V','Herhangi bir yerde yapıştır → part okumadan eklenir'],['Shift + tık','Ünitedeki part kutusunda: okundu / okunmadı'],['A–E  ·  1–5','Testte şık işaretle (Enter sonraki, ← önceki, F bayrak, M soru haritası)'],['J  ·  K','Sonraki / önceki başlık'],['[  ·  ]','Önceki / sonraki part'],['F','Odak modu'],['T','Başlıklar listesi'],['Esc','Kapat / geri']];
  var dl=h('dl',{class:'keys'});
  rows.forEach(function(r){dl.appendChild(h('div',null,h('dt',null,h('kbd',{text:r[0]})),h('dd',{text:r[1]})));});
  return dl;
}
function wipeAll(){
  Object.keys(S.parts).forEach(function(id){tombstone('p:'+id);});
  Object.keys(S.st).forEach(function(id){tombstone('s:'+id);});
  S.meta.courses.forEach(function(c){S.meta.dc[c.id]=Date.now();});
  S.meta=normMeta({u:Date.now(),dc:S.meta.dc});
  saveLocal('m');dirty.m=true;scheduleFlush(false);
  UI={last:null};saveUI();
  closeOverlay();navStack=[];route={v:'home'};renderRoute();
  toast('Tüm veriler silindi');
}

/* ---------- Ünite / ders dışa aktarma: tek .md ya da PDF ---------- */
function exportBase(uids){
  var us=uids.map(getUnit).filter(Boolean),cs={};
  us.forEach(function(u){cs[u.cid]=1;});
  var cn=Object.keys(cs).map(function(k){return getCourse(k).name;});
  return cn.length===1?(us.length===1?cn[0]+' - '+us[0].name:cn[0]):'GioReader';
}
function exportItems(uids){
  var out=[];
  uids.forEach(function(id){
    var u=getUnit(id);if(!u) return;
    out.push({u:u,c:getCourse(u.cid),parts:partsOfUnit(id)});
  });
  return out;
}
function buildExportMd(uids,toc){
  var items=exportItems(uids),multi=items.length>1;
  var cn=items.length?items[0].c.name:'';
  var single=!multi?items[0]:null;
  var by=multi?3:2,total=0,miss=[];
  var md='# '+(multi?cn:cn+' · '+single.u.name)+'\n\n';
  items.forEach(function(it){total+=it.parts.length;var fe=[];for(var i=1;i<=it.u.n;i++) if(!slotPart(it.u.id,i)) fe.push(i);if(fe.length) miss.push(it.u.name+': Part '+fe.join(', '));});
  md+='*GioReader ile hazırlandı · '+fmtDate(Date.now())+' · '+total+' part'+(miss.length?' · yüklenmemiş: '+miss.join(' | '):'')+'*\n\n';
  if(toc){
    md+='## İçindekiler\n\n';
    items.forEach(function(it){
      if(multi) md+='- **'+it.u.name+'**\n';
      it.parts.forEach(function(p){md+=(multi?'  ':'')+'- Part '+p.no+' · '+ptitle(p)+'\n';});
    });
    md+='\n---\n\n';
  }
  items.forEach(function(it){
    if(multi) md+='## '+it.u.name+'\n\n';
    it.parts.forEach(function(p){
      md+='#'.repeat(by)+' Part '+p.no+' · '+ptitle(p)+'\n\n'+partMarkdown(p.text,p.title,by)+'\n\n---\n\n';
    });
  });
  return md.replace(/\n+---\n\n$/,'\n');
}
function openExport(opts){
  opts=opts||{};
  var all=[];
  courses().forEach(function(c){unitsOf(c.id).forEach(function(u){all.push({c:c,u:u,n:partsOfUnit(u.id).length});});});
  if(!all.length){toast('Dışa aktarılacak ünite yok');return;}
  var sel={};
  all.forEach(function(x){sel[x.u.id]=opts.uid?x.u.id===opts.uid:opts.cid?x.c.id===opts.cid:false;});
  if(!Object.keys(sel).some(function(k){return sel[k];})){var fc=all[0].c.id;all.forEach(function(x){if(x.c.id===fc) sel[x.u.id]=true;});}
  var toc=true;
  var list=h('div',{class:'xlist'});
  var info=h('p',{class:'muted sm'});
  var btns=[];
  function ids(){return all.filter(function(x){return sel[x.u.id]&&x.n;}).map(function(x){return x.u.id;});}
  function paintInfo(){
    var n=0;all.forEach(function(x){if(sel[x.u.id]) n+=x.n;});
    info.textContent=n?n+' part, tek dosyada ünite sırasıyla birleşir; kod blokları ve denklemler korunur.':'En az bir ünite seç.';
    btns.forEach(function(b){b.disabled=!n;});
  }
  var lastC=null;
  all.forEach(function(x){
    if(x.c.id!==lastC){lastC=x.c.id;list.appendChild(h('div',{class:'xc',text:x.c.name}));}
    var cb=h('input',{type:'checkbox',checked:!!sel[x.u.id],disabled:!x.n,onchange:function(){sel[x.u.id]=cb.checked;paintInfo();}});
    list.appendChild(h('label',{class:'xu'},cb,h('span',{text:x.u.name}),h('em',{text:x.n+' part'})));
  });
  var tocCb=h('input',{type:'checkbox',checked:true,onchange:function(){toc=tocCb.checked;}});
  function mk(label,ic,fn,cls){var b=btn(label,cls||'',function(){if(ids().length) fn(ids());},ic);btns.push(b);return b;}
  var body=h('div',{class:'form'},
    h('p',{class:'muted',text:'Seçtiğin ünitelerdeki tüm partları tek dosyada indir. Tüm konu anlatımını yapay zekâya verip test hazırlatmak için ideal.'}),
    list,
    h('label',{class:'xu'},tocCb,h('span',{text:'Başa içindekiler listesi ekle'})),
    info,
    h('div',{class:'row wrap'},
      mk('Markdown (.md)','download',function(u){saveFile(slug(exportBase(u),80)+'.md',buildExportMd(u,toc),'text/markdown').then(function(r){if(r==='saved') toast('Markdown dosyası hazırlandı');});},'primary'),
      mk('PDF','file',function(u){openPrintView(u);}),
      mk('Panoya kopyala','copy',function(u){var t=buildExportMd(u,toc);if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function(){toast('Kopyalandı · '+Math.round(t.length/1000)+' bin karakter');},function(){toast('Kopyalanamadı, .md olarak indir');});else toast('Kopyalanamadı, .md olarak indir');})),
    h('div',{class:'row end'},btn('Kapat','ghost',closeOverlay)));
  modal('Dışa aktar',body,{wide:true});
  paintInfo();
}
/* PDF: yazdırma görünümü (tarayıcının "PDF olarak kaydet"i) + indirilebilir yazdırılabilir HTML */
function openPrintView(uids){
  var items=exportItems(uids),multi=items.length>1;
  closeOverlay();
  var pv=$('printview');clear(pv);
  var bar=h('div',{class:'pv-bar'},
    h('b',{text:exportBase(uids)}),h('span',{class:'sp'}),
    btn('PDF olarak kaydet / yazdır','primary',function(){try{window.print();}catch(e){toast('Yazdırma bu görünümde engellendi; HTML olarak indir');}},'file'),
    btn('Yazdırılabilir HTML indir','',function(){savePrintHtml(uids);},'download'),
    btn('Kapat','ghost',closePrintView));
  var doc=h('div',{class:'pv-doc'});
  var by=multi?'h3':'h2';
  doc.appendChild(h('h1',{class:'pv-title',text:multi?items[0].c.name:items[0].c.name+' · '+items[0].u.name}));
  doc.appendChild(h('p',{class:'pv-sub',text:'GioReader · '+fmtDate(Date.now())}));
  items.forEach(function(it){
    if(multi) doc.appendChild(h('h2',{class:'pv-unit',text:it.u.name}));
    it.parts.forEach(function(p){
      var art=h('article',{class:'prose pv-part'});
      art.innerHTML=buildDoc(p.text).html;
      decorateProse(art,{plain:true});
      art.querySelectorAll('.codeblock.folded').forEach(function(w){w.classList.remove('folded');});
      art.insertBefore(h(by,{class:'pv-pt',text:'Part '+p.no+' · '+ptitle(p)}),art.firstChild);
      doc.appendChild(art);
    });
  });
  pv.appendChild(bar);pv.appendChild(doc);
  pv.hidden=false;document.body.classList.add('printing');
  window.scrollTo(0,0);
  typeset(doc);
}
function closePrintView(){
  var pv=$('printview');pv.hidden=true;clear(pv);document.body.classList.remove('printing');
}
function savePrintHtml(uids){
  var doc=$('printview').querySelector('.pv-doc');if(!doc) return;
  var css=($('app-style')||{}).textContent||'';
  var html='<!doctype html>\n<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escHtml(exportBase(uids))+'</title>'
   +'<style>'+css+'\n.pv{display:block!important}.pv-bar{display:none}</style>'
   +'<script>window.MathJax={tex:{inlineMath:[["\\(","\\)"]],displayMath:[["\\[","\\]"]]},svg:{fontCache:"local"}};<\/script>'
   +'<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"><\/script></head><body class="printing"><div id="printview" class="pv">'+doc.outerHTML.replace(/<mjx-container[^>]*>[\s\S]*?<\/mjx-container>/g,function(m){return m;})+'</div></body></html>';
  saveFile(slug(exportBase(uids),80)+'.html',new Blob([html],{type:'text/html'}),'text/html').then(function(r){if(r==='saved') toast('HTML hazır · açıp Ctrl+P ile PDF olarak kaydet');});
}

/* ===================== ARAYÜZ: okuyucu ===================== */
var RD=null;
var lastAct=Date.now();
['scroll','keydown','pointerdown','pointermove','wheel','touchstart'].forEach(function(ev){
  window.addEventListener(ev,function(){lastAct=Date.now();},{passive:true,capture:true});
});

/* ---- metin düğümleri (vurgu konumları için ortak yürüyüş) ---- */
var SKIP_SEL='.m,.eq,mjx-container,pre,.code-head,.eq-no,script,style';
function proseTextNodes(root){
  var out=[];
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    var p=n.parentElement;
    if(!p||!n.nodeValue.length) return NodeFilter.FILTER_REJECT;
    if(p.closest(SKIP_SEL)) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  while(w.nextNode()) out.push(w.currentNode);
  return out;
}
function wrapRange(root,s,e,cls,attrs){
  var nodes=proseTextNodes(root),pos=0,made=[];
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i],len=n.nodeValue.length,ns=pos,ne=pos+len;pos=ne;
    if(ne<=s) continue;
    if(ns>=e) break;
    var a=Math.max(s,ns)-ns,b=Math.min(e,ne)-ns,target=n;
    if(a>0) target=n.splitText(a);
    if(b-a<target.nodeValue.length) target.splitText(b-a);
    var m=document.createElement('mark');
    m.className=cls;
    Object.keys(attrs||{}).forEach(function(k){m.setAttribute(k,attrs[k]);});
    target.parentNode.insertBefore(m,target);
    m.appendChild(target);
    made.push(m);
  }
  return made;
}
function unwrapMarks(root,sel){
  root.querySelectorAll(sel).forEach(function(m){
    var par=m.parentNode;
    while(m.firstChild) par.insertBefore(m.firstChild,m);
    par.removeChild(m);
    par.normalize();
  });
}

/* ---- açılış ---- */
function viewReader(v){
  var p=S.parts[route.pid];
  if(!p||!getCourse(p.cid)||!getUnit(p.uid)){go({v:'home'},{replace:true});return;}
  var c=getCourse(p.cid);
  setHue(c.hue);
  var st=ST(p.id);
  st.at=Date.now();touch('s:'+p.id,true);
  RD={pid:p.id,p:p,c:c,un:getUnit(p.uid),st:st,secs:[],heads:[],ticks:[],curIdx:-2,docMax:1,lastY:-99,userMoved:false,progress:0,posTimer:null,jump:route.jump||null};
  var d=buildDoc(p.text);
  RD.doc=d;
  var prose=h('article',{class:'prose',lang:'tr',id:'prose'});
  prose.innerHTML=d.html;
  RD.prose=prose;
  RD.mast=h('header',{class:'mast'});
  RD.end=h('footer',{class:'part-end',id:'end'});
  var col=h('div',{class:'col',lang:'tr'},RD.mast,prose,RD.end);
  v.appendChild(h('div',{class:'page reader'},col));
  RD.secs=decorateProse(prose);
  fillMast();renderEnd();
  prose.addEventListener('typeset',function(){measure();restorePos();});
  window.scrollTo(0,0);
  requestAnimationFrame(function(){measure();restorePos();});
  typeset(prose);
  RD.tick=setInterval(readTick,5000);
  if(route.jump) route.jump=null;
}
function readerLeave(){
  if(!RD) return;
  clearInterval(RD.tick);clearTimeout(RD.posTimer);
  var st=RD.st;
  if(RD.ready){st.pos=+RD.progress.toFixed(4);touch('s:'+RD.pid,true);}
  RD=null;
}
function readTick(){
  if(!RD||document.hidden||Date.now()-lastAct>120000) return;
  var st=RD.st;
  st.sec=(st.sec||0)+5;
  bump('sec',5);
  touch('s:'+RD.pid,true);
  if(P.autoDone&&!st.done&&RD.progress>=0.97&&st.sec>=Math.max(30,partMin(RD.p)*60*0.25)) markDone(true);
}
function markDone(auto){
  if(!RD) return;
  var st=RD.st;
  if(!st.done){
    st.done=Date.now();
    touch('s:'+RD.pid);
    if(auto) toast('Part okundu olarak işaretlendi.');
  }
  renderEnd();fillMast();
}

/* ---- metni süsle ---- */
function markEnglish(root){
  var nodes=[];
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    var p=n.parentElement;
    if(!p||p.closest('code,pre,.m,.eq,mjx-container,.en')) return NodeFilter.FILTER_REJECT;
    return /\([A-Za-z]/.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  while(w.nextNode()) nodes.push(w.currentNode);
  var re=/\(([A-Za-z][A-Za-z0-9 \-\/.'’,&]{2,60})\)/g;
  nodes.forEach(function(n){
    var t=n.nodeValue,last=0,m,frag=document.createDocumentFragment(),hit=false;
    re.lastIndex=0;
    while((m=re.exec(t))){
      hit=true;
      if(m.index>last) frag.appendChild(document.createTextNode(t.slice(last,m.index)));
      frag.appendChild(h('span',{class:'en',text:m[0]}));
      last=m.index+m[0].length;
    }
    if(!hit) return;
    if(last<t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    n.parentNode.replaceChild(frag,n);
  });
}
var CALL_MAP={'tanım':'def','tanim':'def','definition':'def','teorem':'thm','önerme':'thm','lemma':'thm','sonuç':'thm','theorem':'thm','corollary':'thm','örnek':'ex','example':'ex','not':'note','önemli':'note','dikkat':'note','ipucu':'note','uyarı':'note','note':'note','warning':'note','remark':'note','özet':'note','ispat':'proof','kanıt':'proof','proof':'proof'};
function markCallouts(root){
  root.querySelectorAll('p>strong:first-child,p>b:first-child').forEach(function(st){
    var p=st.parentElement;
    if(p.firstChild!==st) return;
    var t=st.textContent.trim().replace(/[:.\s]+$/,'');
    var m=/^([\p{L}]+)(?:\s*\d+(?:\.\d+)*)?(?:\s*\([^)]{1,60}\))?$/u.exec(t);
    if(!m) return;
    var k=CALL_MAP[m[1].toLocaleLowerCase('tr')];
    if(!k) return;
    p.classList.add('callout','c-'+k);
  });
}
function decorateProse(root,o){
  var first=root.firstElementChild;
  if(first&&first.tagName==='H1') first.remove();
  var out=[];
  root.querySelectorAll('h2,h3').forEach(function(hd,idx){
    hd.classList.add('hd');
    if(hd.tagName==='H2'){hd.id='s'+(out.length+1);out.push({el:hd,title:hd.textContent.trim().replace(/\\[()\[\]]/g,''),idx:out.length});}
  });
  markEnglish(root);
  markCallouts(root);
  root.querySelectorAll('table').forEach(function(t){var d=h('div',{class:'tablewrap'});t.parentNode.insertBefore(d,t);d.appendChild(t);});
  root.querySelectorAll('a[href]').forEach(function(a){a.target='_blank';a.rel='noopener noreferrer';});
  root.querySelectorAll('img').forEach(function(im){
    function bad(){if(!im.parentNode) return;im.parentNode.replaceChild(h('span',{class:'img-bad',text:'Görsel yüklenemedi'+(im.alt?': '+im.alt:'')}),im);}
    if(im.complete&&!im.naturalWidth&&im.getAttribute('src')&&!im.loading) bad();
    else im.addEventListener('error',bad,{once:true});
  });
  highlightCode(root);
  return out;
}
var LANG_ALIAS={asm:'x86asm',nasm:'x86asm',assembly:'x86asm',x86:'x86asm',arm:'armasm',armv7:'armasm',mips:'mipsasm','c++':'cpp',cc:'cpp',h:'c',hpp:'cpp',py:'python',sh:'bash',zsh:'bash',shell:'bash',js:'javascript',ts:'typescript',sv:'verilog',systemverilog:'verilog',v:'verilog',text:'plaintext',txt:'plaintext'};
var LANG_NAME={c:'C',cpp:'C++',python:'Python',java:'Java',bash:'Bash',javascript:'JavaScript',typescript:'TypeScript',x86asm:'x86 Assembly',armasm:'ARM Assembly',mipsasm:'MIPS Assembly',verilog:'Verilog',vhdl:'VHDL',sql:'SQL',rust:'Rust',go:'Go',csharp:'C#',makefile:'Makefile',json:'JSON',xml:'XML',yaml:'YAML',plaintext:'Metin',diff:'Diff',lua:'Lua',php:'PHP',kotlin:'Kotlin',swift:'Swift',r:'R',perl:'Perl',ruby:'Ruby',markdown:'Markdown',wasm:'WASM',ini:'INI'};
var EXTRA_LANGS={x86asm:1,armasm:1,mipsasm:1,verilog:1,vhdl:1,avrasm:1};
var langLoading={};
function loadLang(name){
  if(langLoading[name]) return langLoading[name];
  var urls=['https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/'+name+'.min.js','https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/languages/'+name+'.min.js'];
  langLoading[name]=new Promise(function(res){
    (function next(i){
      if(window.hljs&&hljs.getLanguage(name)) return res(true);
      if(i>=urls.length) return res(false);
      var s=document.createElement('script');s.src=urls[i];
      s.onload=function(){res(!!(window.hljs&&hljs.getLanguage(name)));};
      s.onerror=function(){next(i+1);};
      document.head.appendChild(s);
    })(0);
  });
  return langLoading[name];
}
function paintCode(code,lang){
  var txt=code.textContent,used=lang;
  if(!window.hljs){return used;}
  try{
    var r;
    if(lang&&hljs.getLanguage(lang)) r=hljs.highlight(txt,{language:lang,ignoreIllegals:true});
    else if(!lang){r=hljs.highlightAuto(txt,['c','cpp','python','bash','java','javascript','sql','rust','go','makefile','plaintext']);if(r.relevance<4) r=null;}
    if(r){code.innerHTML=r.value;if(!lang) used=r.language||'';}
  }catch(e){}
  return used;
}
function highlightCode(root){
  root.querySelectorAll('pre').forEach(function(pre){
    if(pre.closest('.codeblock')) return;
    var code=pre.querySelector('code')||pre;
    var raw=((/language-([\w+#.-]+)/.exec(code.className)||[])[1]||'').toLowerCase();
    var lang=LANG_ALIAS[raw]||raw;
    var text=code.textContent.replace(/\n$/,'');
    var lines=text.split('\n').length;
    var langLabel=h('span',{class:'code-lang'});
    var used=paintCode(code,lang);
    function label(u){langLabel.textContent=LANG_NAME[u]||(u?u.toUpperCase():'Kod');}
    label(used);
    var gut=h('div',{class:'code-gut','aria-hidden':'true'});
    var nums='';for(var i=1;i<=lines;i++) nums+=i+'\n';
    gut.textContent=nums.replace(/\n$/,'');
    pre.tabIndex=0;
    pre.setAttribute('aria-label',(LANG_NAME[used]||'Kod')+' kod bloğu, '+lines+' satır');
    var copy=h('button',{class:'code-copy',type:'button',text:'Kopyala'});
    copy.addEventListener('click',function(){
      function ok(){copy.textContent='Kopyalandı';setTimeout(function(){copy.textContent='Kopyala';},1600);}
      function fb(){try{var r=document.createRange();r.selectNodeContents(pre);var s=getSelection();s.removeAllRanges();s.addRange(r);copy.textContent='Seçildi';setTimeout(function(){copy.textContent='Kopyala';},1600);}catch(e){}}
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok,fb);else fb();
    });
    var head=h('div',{class:'code-head'},langLabel,h('span',{class:'code-n',text:lines+' satır'}),h('span',{class:'sp'}),copy);
    var body=h('div',{class:'code-body'},gut);
    var wrap=h('div',{class:'codeblock'},head,body);
    pre.parentNode.insertBefore(wrap,pre);
    body.appendChild(pre);
    if(lines>26){
      wrap.classList.add('long','folded');
      var more=h('button',{class:'code-more',type:'button'});
      var paint=function(){more.textContent=wrap.classList.contains('folded')?'Tümünü göster · '+lines+' satır':'Daralt';};
      more.addEventListener('click',function(){
        var folded=wrap.classList.toggle('folded');
        paint();
        if(folded) wrap.scrollIntoView({block:'nearest'});
        if(RD) setTimeout(measure,30);
      });
      paint();
      wrap.appendChild(more);
    }
    if(!lang&&!used){/* dili bilinmeyen blok düz metin gibi kalır */}
    if(EXTRA_LANGS[lang]&&window.hljs&&!hljs.getLanguage(lang)){
      loadLang(lang).then(function(ok){if(!ok) return;code.textContent=text;paintCode(code,lang);label(lang);});
    }
  });
}

/* ---- başlık, harita, son ---- */
function fillMast(){
  var p=RD.p,st=RD.st;
  clear(RD.mast);
  RD.mast.className='mast';
  RD.mast.appendChild(h('div',{class:'mast-no',text:String(p.no)}));
  RD.mast.appendChild(h('h1',{class:'mast-title',text:ptitle(p)}));
  if(p.ft&&p.ft!==p.title&&p.ft.length>ptitle(p).length+4) RD.mast.appendChild(h('p',{class:'mast-full',text:p.ft}));
  var bits=[RD.c.name,RD.un.name,'Part '+p.no+' / '+Math.max(RD.un.n,p.no),'~'+partMin(p)+' dk okuma'];
  if(RD.doc.eqCount) bits.push(RD.doc.eqCount+' denklem');
  var meta=h('div',{class:'mast-meta'},h('span',{text:bits.join(' · ')}));
  meta.appendChild(h('button',{class:'rd-chip'+(st.done?' on':''),type:'button','aria-pressed':String(!!st.done),title:st.done?'Okunmadı olarak işaretle':'Okundu olarak işaretle',onclick:function(){setDone(p.id,!st.done);renderEnd();fillMast();}},icon('check',13),h('span',{text:st.done?'Okundu':'Okundu işaretle'})));
  RD.mast.appendChild(meta);
}
function secGo(i){
  var el=RD.secs[i]&&RD.secs[i].el;if(!el) return;
  el.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
}
function renderEnd(){
  var p=RD.p,st=RD.st,e=RD.end,un=RD.un,nb=neighbors(p);
  clear(e);
  e.appendChild(h('div',{class:'end-h'},
    h('div',{class:'end-t'},h('b',{text:'Part '+p.no}),st.done?' okundu':' sonu'),
    h('div',{class:'end-s',text:fmtDur(st.sec||0)+' okuma'+(st.done&&st.sec>=45?' · '+Math.round(partWords(p)/(st.sec/60))+' kelime/dk':'')})));
  var acts=h('div',{class:'row wrap'});
  if(!st.done) acts.appendChild(btn('Okundu olarak işaretle','primary',function(){markDone(false);},'check'));
  else acts.appendChild(btn('Okunmadı yap','ghost sm',function(){setDone(p.id,false);renderEnd();fillMast();},'back'));
  e.appendChild(acts);
  var nav=h('div',{class:'pn'});
  nav.appendChild(nb.prev?h('button',{class:'pn-b prev',type:'button',onclick:function(){go({v:'reader',pid:nb.prev.id});}},h('span',{class:'pn-k',text:'← Part '+nb.prev.no}),h('span',{class:'pn-t',text:ptitle(nb.prev)})):h('span'));
  if(nb.next&&nb.next.no===p.no+1){
    nav.appendChild(h('button',{class:'pn-b next',type:'button',onclick:function(){go({v:'reader',pid:nb.next.id});}},h('span',{class:'pn-k',text:'Part '+nb.next.no+' →'}),h('span',{class:'pn-t',text:ptitle(nb.next)})));
  }else if(nb.hasSlot||(p.nx&&p.nx.no===p.no+1)){
    var hint=slotTitle(un,p.no+1)||(p.nx&&p.nx.no===p.no+1?shortTitle(p.nx.title):'');
    nav.appendChild(h('button',{class:'pn-b next empty',type:'button',onclick:function(){openAdd({uid:un.id,no:p.no+1});}},h('span',{class:'pn-k',text:'Part '+(p.no+1)+' · henüz yüklenmedi'}),h('span',{class:'pn-t',text:hint||'Metni kopyalayıp Ctrl+V yapman yeterli'})));
  }else{
    nav.appendChild(h('button',{class:'pn-b next',type:'button',onclick:function(){go({v:'unit',uid:un.id});}},h('span',{class:'pn-k',text:'Ünite sonu'}),h('span',{class:'pn-t',text:un.name+' · tümünü gör'})));
  }
  e.appendChild(nav);
}

/* ---- ölçüm ve ilerleme ---- */
function measure(){
  if(!RD) return;
  RD.lastY=-99;
  var y=window.scrollY,vh=window.innerHeight;
  RD.heads=RD.secs.map(function(s){return {top:s.el.getBoundingClientRect().top+y};});
  RD.docMax=Math.max(1,document.documentElement.scrollHeight-vh);
  var prog=$('prog');
  updateReader();
}
function updateReader(){
  if(!RD) return;
  var y=window.scrollY,p=clamp01(y/RD.docMax);
  if(Math.abs(y-RD.lastY)<3&&RD.curIdx!==-2) return;
  RD.lastY=y;
  RD.ready=true;
  RD.progress=p;
  $('prog-fill').style.width=(p*100).toFixed(1)+'%';
  var line=y+window.innerHeight*.28,c=-1;
  for(var i=0;i<RD.heads.length;i++) if(RD.heads[i].top<=line) c=i;
  if(c!==RD.curIdx){
    RD.curIdx=c;
    var lab=$('cur-label');
    if(lab) lab.textContent=c<0?ptitle(RD.p):RD.secs[c].title;
    var tocEl=$('pop-toc');
    if(tocEl) tocEl.querySelectorAll('.toc-i').forEach(function(b){b.classList.toggle('on',+b.dataset.i===c);});
  }
  clearTimeout(RD.posTimer);
  var rd=RD;
  RD.posTimer=setTimeout(function(){if(RD!==rd) return;rd.st.pos=+p.toFixed(4);touch('s:'+rd.pid,true);},800);
}
window.addEventListener('scroll',function(){
  if(!RD||RD.tk) return;
  RD.tk=true;
  requestAnimationFrame(function(){if(RD){RD.tk=false;updateReader();}});
},{passive:true});
window.addEventListener('resize',function(){if(!RD) return;clearTimeout(RD.rt);RD.rt=setTimeout(measure,150);});
['wheel','touchstart','keydown','mousedown'].forEach(function(ev){window.addEventListener(ev,function(){if(RD) RD.userMoved=true;},{passive:true});});

function restorePos(){
  if(!RD) return;
  if(RD.jump){var j=RD.jump;RD.jump=null;if(doJump(j)) {RD.userMoved=true;return;}}
  if(RD.userMoved) return;
  var r=RD.st.pos||0;
  if(r>0.01&&r<0.995) window.scrollTo(0,r*RD.docMax);
}
function doJump(j){
  var prose=RD.prose,nodes=proseTextNodes(prose),text=nodes.map(function(n){return n.nodeValue;}).join('');
  if(!j.q) return false;
  var lt=text.toLocaleLowerCase('tr'),lq=j.q.toLocaleLowerCase('tr'),i=-1;
  if(j.ctx){i=lt.indexOf((j.ctx+j.q).toLocaleLowerCase('tr'));if(i>=0) i+=j.ctx.length;}
  if(i<0) i=lt.indexOf(lq);
  if(i<0) return false;
  var made=wrapRange(prose,i,i+j.q.length,'hl flash',{'data-id':'flash'});
  if(made[0]) made[0].scrollIntoView({block:'center'});
  setTimeout(function(){if(RD&&RD.prose===prose) unwrapMarks(prose,'mark[data-id="flash"]');},2600);
  return true;
}
function flashMark(m){m.classList.add('flash');setTimeout(function(){m.classList.remove('flash');},2200);}

/* ---- içindekiler / ayarlar / notlar açılır panelleri ---- */
function popAt(el,opts){
  el.classList.add('pop');
  openOverlay(el,{clear:true,onclose:opts&&opts.onclose});
}
function readerToggleToc(){
  if(overlay.el&&overlay.el.id==='pop-toc'){closeOverlay();return;}
  var pop=h('div',{class:'pop toc',id:'pop-toc',tabindex:'-1',role:'dialog','aria-label':'Bölümler'});
  var top=h('button',{class:'toc-i',type:'button',onclick:function(){closeOverlay();window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});}},h('span',{class:'nm',text:'Başa dön'}));
  pop.appendChild(top);
  RD.secs.forEach(function(s,i){
    pop.appendChild(h('button',{class:'toc-i'+(i===RD.curIdx?' on':''),'data-i':i,type:'button',onclick:function(){closeOverlay();secGo(i);}},h('span',{class:'nm',text:s.title})));
  });
  pop.appendChild(h('button',{class:'toc-i',type:'button',onclick:function(){closeOverlay();window.scrollTo({top:document.documentElement.scrollHeight,behavior:reduced?'auto':'smooth'});}},h('span',{class:'nm',text:'Part sonu'})));
  openOverlay(pop,{clear:true});
}
function prefSeg(label,key,opts,after){
  var g=h('div',{class:'seg',role:'radiogroup','aria-label':label});
  opts.forEach(function(o){
    g.appendChild(h('button',{type:'button',role:'radio','aria-checked':String(P[key]===o[0]),text:o[1],onclick:function(){
      P[key]=o[0];savePrefs();applyPrefs();
      g.querySelectorAll('button').forEach(function(x,i){x.setAttribute('aria-checked',String(opts[i][0]===P[key]));});
      if(after) after();
    }}));
  });
  return h('div',{class:'field'},h('div',{class:'fl',text:label}),g);
}
function readerToggleSettings(){
  if(overlay.el&&overlay.el.id==='pop-set'){closeOverlay();return;}
  var out=h('output',{text:String(P.size)});
  var rng=h('input',{type:'range',min:15,max:28,step:1,value:P.size,id:'size','aria-label':'Yazı boyutu'});
  rng.addEventListener('input',function(){P.size=+rng.value;out.textContent=rng.value;savePrefs();applyPrefs();clearTimeout(RD&&RD.rt);if(RD) RD.rt=setTimeout(measure,150);});
  var pop=h('div',{class:'pop set',id:'pop-set',tabindex:'-1',role:'dialog','aria-label':'Okuma ayarları'},
    prefSeg('Tema','theme',[['auto','Sistem'],['light','Gündüz'],['dark','Gece'],['sepia','Kâğıt']]),
    h('div',{class:'field'},h('label',{class:'fl',for:'size'},h('span',{text:'Yazı boyutu'}),out),rng),
    prefSeg('Yazı tipi','font',[['serif','Serif'],['sans','Sans']],function(){if(RD) setTimeout(measure,150);}),
    prefSeg('Satır genişliği','width',[['narrow','Dar'],['normal','Normal'],['wide','Geniş']],function(){if(RD) setTimeout(measure,150);}),
    prefSeg('Üst çubuk','bar',[['static','Sayfayla kayar'],['fixed','Sabit']]));
  openOverlay(pop,{clear:true});
}

/* ===================== ARAYÜZ: testler (çoktan seçmeli) ===================== */
var TS=null,TT=null;
function fmtClock(s){s=Math.max(0,Math.round(s));var h2=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h2?h2+':'+(m<10?'0':''):'')+m+':'+(x<10?'0':'')+x;}
function curRun(u){return u&&u.run&&!u.run.fin?u.run:null;}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function segc(label,opts,val,onset){
  var g=h('div',{class:'seg',role:'radiogroup','aria-label':label});
  function paint(){g.querySelectorAll('button').forEach(function(b,i){b.setAttribute('aria-checked',String(opts[i][0]===val));});}
  opts.forEach(function(o){g.appendChild(h('button',{type:'button',role:'radio',text:o[1],onclick:function(){val=o[0];onset(val);paint();}}));});
  paint();
  return h('div',{class:'field'},h('div',{class:'fl',text:label}),g);
}
function runHistory(u){
  var box=h('section',{class:'sec-box thist'},h('div',{class:'sec-hr'},h('h2',{class:'sec-h',text:'Denemeler'}),u.run&&u.run.fin?btn('Son sonucu gör','sm',function(){go({v:'test',uid:u.id,res:1});},'right'):null));
  (u.runs||[]).slice(0,8).forEach(function(r){
    box.appendChild(h('div',{class:'throw'},
      h('span',{class:'throw-p',text:'%'+r.pct}),
      h('span',{class:'throw-b'},h('b',{text:r.correct+' / '+r.total+' doğru'}),h('span',{class:'muted',text:fmtDate(r.at)+' · '+(r.mode==='exam'?'sınav modu':'öğrenme modu')+' · '+fmtDur(r.sec)})),
      progLine(r.pct/100)));
  });
  return box;
}

/* ---------- başlatma ---------- */
function openTestStart(uid){
  var u=getUnit(uid);if(!u) return;
  var qs=unitQs(uid);
  if(!qs.length){toast('Bu testte henüz soru yok');return;}
  var run=curRun(u),last=(u.runs&&u.runs[0])||null;
  var wrongIds=((last&&last.wrong)||[]).filter(function(id){return qs.some(function(q){return q.id===id;});});
  var mode=P.tmode||'instant',order=P.torder||'seq',scope='all';
  var cnt=numField(qs.length,1,qs.length);
  var cntBox=h('div',null,h('div',{class:'fl',text:'Kaç soru?'}),cnt.el);
  var st=unitStats(uid),missing=st.n-st.loaded;
  var scopeSeg=wrongIds.length?segc('Hangi sorular',[['all','Tümü ('+qs.length+')'],['wrong','Son denemede yanlış / boş ('+wrongIds.length+')']],scope,function(v){scope=v;cntBox.hidden=v!=='all';}):null;
  var body=h('div',{class:'form'},
    missing>0?h('div',{class:'warn w-skip'},h('span',{class:'warn-t',text:'Testin '+missing+' partı henüz yüklenmedi. Şimdi başlarsan yalnızca yüklü '+st.loaded+' partın '+qs.length+' sorusu çıkar.'})):null,
    run?h('div',{class:'resume-box'},h('b',{text:'Yarım kalan deneme var'}),h('span',{class:'muted',text:Object.keys(run.ans).length+' / '+run.order.length+' soru cevaplandı · '+fmtDur(run.sec)}),
      btn('Devam et','primary',function(){closeOverlay();go({v:'test',uid:uid});},'right')):null,
    run?h('div',{class:'muted sm',text:'Ya da yeni bir deneme başlat (yarım kalan silinir):'}):null,
    segc('Mod',[['instant','Öğrenme: her sorudan sonra çözümü göster'],['exam','Sınav: çözümler sonda']],mode,function(v){mode=v;P.tmode=v;savePrefs();}),
    segc('Sıra',[['seq','Metindeki sıra'],['rand','Karışık']],order,function(v){order=v;P.torder=v;savePrefs();}),
    scopeSeg,cntBox,
    h('p',{class:'muted sm',text:'Klavye: A–E ya da 1–5 ile işaretle, Enter / → sonraki, ← önceki, F bayrak. Bir şıkkın yanındaki ✕ ile şık eleyebilirsin.'}),
    h('div',{class:'row end'},h('span',{class:'sp'}),btn('Vazgeç','ghost',closeOverlay),btn(run?'Yeni deneme başlat':'Testi başlat','primary',function(){
      closeOverlay();startRun(uid,{mode:mode,order:order,scope:scope,count:cnt.val(),wrong:wrongIds});
    },'check')));
  modal('Test · '+u.name,body);
}
function startRun(uid,o){
  var u=getUnit(uid),qs=unitQs(uid);
  var ids=qs.map(function(q){return q.id;});
  if(o.scope==='wrong'&&o.wrong&&o.wrong.length) ids=o.wrong.slice();
  if(o.order==='rand') ids=shuffle(ids);
  if(o.scope!=='wrong'&&o.count&&o.count<ids.length) ids=ids.slice(0,o.count);
  u.run={id:uidGen('r'),at:Date.now(),mode:o.mode,order:ids,idx:0,ans:{},flag:{},elim:{},sec:0,qt:{}};
  updateUnit(u);
  go({v:'test',uid:uid});
}

/* ---------- görünüm ---------- */
function viewTest(v){
  var u=getUnit(route.uid);
  if(!u||!u.run){go({v:'home'},{replace:true});return;}
  var qmap={};unitQs(u.id).forEach(function(q){qmap[q.id]=q;});
  var list=u.run.order.filter(function(id){return qmap[id];});
  if(!list.length){toast('Bu denemenin soruları bulunamadı');go({v:'unit',uid:u.id},{replace:true});return;}
  setHue(getCourse(u.cid).hue);
  var page=h('div',{class:'page ttest'});v.appendChild(page);
  TS={u:u,run:u.run,qmap:qmap,list:list,page:page};
  if(u.run.fin) renderResult();
  else{
    if(TS.run.idx>=list.length) TS.run.idx=list.length-1;
    startTimer();renderQ();
  }
}
function testLeave(){
  clearInterval(TT);TT=null;
  if(TS&&TS.run&&!TS.run.fin) updateUnit(TS.u);
  TS=null;
}
function startTimer(){
  clearInterval(TT);
  TT=setInterval(function(){
    if(!TS||TS.run.fin||document.hidden||Date.now()-lastAct>90000) return;
    TS.run.sec++;
    var id=TS.list[TS.run.idx];TS.run.qt[id]=(TS.run.qt[id]||0)+1;
    var el=$('t-timer');if(el) el.textContent=fmtClock(TS.run.sec);
  },1000);
}
function qHtml(el,md,inline){
  el.innerHTML=mdSnippet(md,inline);
  if(!inline){highlightCode(el);el.querySelectorAll('a[href]').forEach(function(a){a.target='_blank';a.rel='noopener noreferrer';});}
}
function optRow(q,o,st){
  /* st: {sel, elim, reveal, ans, onpick, onelim} */
  var cls='t-opt';
  if(st.sel) cls+=' sel';
  if(st.elim) cls+=' elim';
  var mark=null;
  if(st.reveal&&q.ans){
    if(o.k===q.ans){cls+=' right';mark=icon('check',18);}
    else if(st.sel){cls+=' wrong';mark=icon('close',18);}
    else cls+=' dim';
  }
  var txt=h('span',{class:'t-ot'});qHtml(txt,o.t,true);
  var b=h('button',{class:cls,type:'button','aria-pressed':String(!!st.sel),disabled:!!st.reveal||!st.onpick,onclick:st.onpick?function(){st.onpick(o.k);}:null},
    h('span',{class:'t-k',text:o.k}),txt,mark?h('span',{class:'t-mark'},mark):null);
  var w=h('div',{class:'t-optw'},b);
  if(st.onelim&&!st.reveal) w.appendChild(h('button',{class:'t-x',type:'button',title:st.elim?'Şıkkı geri getir':'Şıkkı ele','aria-label':st.elim?'Şıkkı geri getir':'Şıkkı ele',onclick:function(){st.onelim(o.k);}},st.elim?icon('back',14):icon('close',14)));
  return w;
}
function renderQ(keepScroll){
  var run=TS.run,list=TS.list,i=run.idx,q=TS.qmap[list[i]],page=TS.page;
  var a=run.ans[q.id],instant=run.mode==='instant',locked=instant&&!!a;
  var elim=run.elim[q.id]||[];
  clear(page);
  var answered=list.filter(function(id){return run.ans[id];}).length;
  var timer=h('span',{class:'t-timer',id:'t-timer',title:'Geçen süre',text:fmtClock(run.sec)});
  var flagB=h('button',{class:'t-flag'+(run.flag[q.id]?' on':''),type:'button',title:'Bayrakla (F)','aria-pressed':String(!!run.flag[q.id]),onclick:function(){toggleFlag();}},icon('note',16),h('span',{class:'lbl',text:'Bayrak'}));
  page.appendChild(h('header',{class:'t-head'},
    h('div',{class:'t-top'},
      h('span',{class:'t-count'},'Soru ',h('b',{text:String(i+1)}),' / '+list.length),
      h('span',{class:'t-cnt2',text:answered+' cevaplandı'}),
      h('span',{class:'sp'}),timer,flagB,
      h('button',{class:'btn ghost sm',type:'button',onclick:openTestMap},icon('list',16),h('span',{class:'lbl',text:'Sorular'}))),
    h('div',{class:'t-bar'},h('i',{style:{width:(answered/list.length*100)+'%'}}))));
  var stem=h('div',{class:'prose t-stem'});qHtml(stem,q.stem);
  var opts=h('div',{class:'t-opts',role:'group','aria-label':'Şıklar'});
  q.opts.forEach(function(o){
    opts.appendChild(optRow(q,o,{sel:a===o.k,elim:elim.indexOf(o.k)>=0,reveal:locked,onpick:locked?null:pick,onelim:toggleElim}));
  });
  var card=h('article',{class:'t-card'},
    h('div',{class:'eyebrow acc',text:'Soru '+q.n+' · Part '+q.pno+(q.ans?'':' · cevap anahtarı yok')}),
    stem,opts);
  if(locked){
    var ok=q.ans&&a===q.ans;
    var fb=h('section',{class:'t-fb '+(q.ans?(ok?'ok':'bad'):'')},
      h('div',{class:'t-fb-h'},q.ans?icon(ok?'check':'close',18):null,h('b',{text:q.ans?(ok?'Doğru!':'Yanlış · doğru cevap '+q.ans):'Bu soru için cevap anahtarı bulunamadı'})));
    if(q.exp){var ex=h('div',{class:'prose t-exp'});qHtml(ex,q.exp);fb.appendChild(h('div',{class:'t-fb-l',text:'Çözüm ve analiz'}));fb.appendChild(ex);}
    card.appendChild(fb);
  }
  page.appendChild(card);
  var last=i===list.length-1;
  var nextLbl=last?(instant?(a?'Sonucu gör':'Bitir'):'Testi bitir'):(instant&&!a?'Atla':'Sonraki');
  page.appendChild(h('div',{class:'t-actions'},
    btn('Önceki','ghost',function(){go2(i-1);},'back'),h('span',{class:'sp'}),
    instant||!a?null:h('span',{class:'muted sm t-hint',text:'Cevabını değiştirebilirsin'}),
    h('button',{class:'btn '+((a||last)?'primary':'ghost')+' t-next',type:'button',onclick:nextQ},h('span',{class:'lbl',text:nextLbl}),icon('right'))));
  typeset(page);
  if(!keepScroll) window.scrollTo(0,0);
  if(locked) setTimeout(function(){var f=page.querySelector('.t-fb');if(f&&f.getBoundingClientRect().bottom>window.innerHeight) f.scrollIntoView({behavior:reduced?'auto':'smooth',block:'nearest'});},60);
}
function curQ(){return TS.qmap[TS.list[TS.run.idx]];}
function pick(k){
  var run=TS.run,q=curQ();
  if(run.mode==='instant'&&run.ans[q.id]) return;
  if(run.mode==='exam'&&run.ans[q.id]===k) delete run.ans[q.id];else run.ans[q.id]=k;
  var el=run.elim[q.id];if(el){run.elim[q.id]=el.filter(function(x){return x!==k;});}
  updateUnit(TS.u);
  renderQ(true);
}
function toggleElim(k){
  var run=TS.run,q=curQ(),el=run.elim[q.id]||(run.elim[q.id]=[]);
  var j=el.indexOf(k);if(j>=0) el.splice(j,1);else el.push(k);
  if(run.ans[q.id]===k&&run.mode==='exam') delete run.ans[q.id];
  updateUnit(TS.u);renderQ(true);
}
function toggleFlag(){
  var run=TS.run,q=curQ();
  if(run.flag[q.id]) delete run.flag[q.id];else run.flag[q.id]=1;
  updateUnit(TS.u);renderQ(true);
}
function go2(i){
  if(i<0||i>=TS.list.length) return;
  TS.run.idx=i;updateUnit(TS.u);renderQ();
}
function nextQ(){
  var run=TS.run,i=run.idx;
  if(i<TS.list.length-1){go2(i+1);return;}
  var empty=TS.list.filter(function(id){return !run.ans[id];});
  if(!empty.length){finishRun();return;}
  var body=h('div',{class:'form'},h('p',{text:empty.length+' soru boş kaldı. Bitirirsen bunlar yanlış sayılmaz ama puana katılmaz; "yanlış ve boşları tekrar çöz"de çıkarlar.'}),
    h('div',{class:'row end'},btn('Boşlara dön','ghost',function(){closeOverlay();go2(TS.list.indexOf(empty[0]));}),btn('Testi bitir','primary',function(){closeOverlay();finishRun();},'check')));
  modal('Testi bitirelim mi?',body);
}
function openTestMap(){
  var run=TS.run,pop=h('div',{class:'pop tmap',role:'dialog','aria-label':'Sorular',tabindex:'-1'});
  pop.appendChild(h('div',{class:'tmap-h',text:'Sorular'}));
  var grid=h('div',{class:'tmap-g'});
  TS.list.forEach(function(id,i){
    var q=TS.qmap[id],a=run.ans[id],cls='tm';
    if(i===run.idx) cls+=' cur';
    if(a){cls+=' ans';if(run.mode==='instant'&&q.ans) cls+=a===q.ans?' right':' wrong';}
    if(run.flag[id]) cls+=' flag';
    grid.appendChild(h('button',{class:cls,type:'button',title:'Soru '+q.n,onclick:function(){closeOverlay();go2(i);}},String(i+1)));
  });
  pop.appendChild(grid);
  var empty=TS.list.filter(function(id){return !run.ans[id];});
  pop.appendChild(h('div',{class:'tmap-f'},h('span',{class:'muted sm',text:empty.length+' boş · '+Object.keys(run.flag).length+' bayraklı'}),h('span',{class:'sp'}),
    btn('Testi bitir','sm primary',function(){closeOverlay();nextQNoSkip();},'check')));
  openOverlay(pop,{clear:true});
}
function nextQNoSkip(){
  var run=TS.run,empty=TS.list.filter(function(id){return !run.ans[id];});
  if(!empty.length){finishRun();return;}
  var save=TS.run.idx;TS.run.idx=TS.list.length-1;nextQ();TS.run.idx=save;
}

/* ---------- sonuç ---------- */
function scoreOf(run,list,qmap){
  var r={total:0,correct:0,empty:0,wrong:[],per:{},flagged:0};
  list.forEach(function(id){
    var q=qmap[id],a=run.ans[id];
    if(run.flag[id]) r.flagged++;
    if(!q.ans) return;
    r.total++;
    var pp=r.per[q.pno]||(r.per[q.pno]={t:0,c:0});pp.t++;
    if(!a){r.empty++;r.wrong.push(id);}
    else if(a===q.ans){r.correct++;pp.c++;}
    else r.wrong.push(id);
  });
  r.pct=r.total?Math.round(r.correct/r.total*100):0;
  return r;
}
function finishRun(){
  var u=TS.u,run=TS.run;
  run.fin=Date.now();
  var sc=scoreOf(run,TS.list,TS.qmap);
  var rec={at:run.fin,mode:run.mode,total:sc.total,correct:sc.correct,empty:sc.empty,wrong:sc.wrong,pct:sc.pct,sec:run.sec,n:TS.list.length};
  u.runs=[rec].concat(u.runs||[]).slice(0,15);
  updateUnit(u);
  clearInterval(TT);TT=null;
  renderResult();
}
function ring(pct){
  var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 120 120');s.setAttribute('class','t-ring');s.setAttribute('role','img');s.setAttribute('aria-label','%'+pct);
  var C=2*Math.PI*52;
  s.innerHTML='<circle cx="60" cy="60" r="52" fill="none" stroke="var(--faint)" stroke-width="9"/><circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+(C*pct/100).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle" font-size="30" font-weight="600" fill="currentColor" font-family="Instrument Serif,Georgia,serif">%'+pct+'</text>';
  return s;
}
function renderResult(){
  var u=TS.u,run=TS.run,page=TS.page,sc=scoreOf(run,TS.list,TS.qmap);
  clear(page);window.scrollTo(0,0);
  var verdict=sc.pct>=85?'Harika iş!':sc.pct>=70?'İyi gidiyorsun':sc.pct>=50?'Fena değil, biraz tekrar':'Konuyu tekrar okuma zamanı';
  var avg=TS.list.length?Math.round(run.sec/TS.list.length):0;
  page.appendChild(h('section',{class:'t-res'},
    ring(sc.pct),
    h('div',{class:'t-res-b'},
      crumbs([{t:'Kitaplık',fn:function(){go({v:'home'});}},{t:getCourse(u.cid).name,fn:function(){go({v:'course',cid:u.cid});}},{t:u.name,fn:function(){go({v:'unit',uid:u.id});}}]),
      h('h1',{class:'pg-t',text:verdict}),
      h('div',{class:'t-stats'},
        h('span',{class:'ts ok'},h('b',{text:String(sc.correct)}),' doğru'),
        h('span',{class:'ts bad'},h('b',{text:String(sc.total-sc.correct-sc.empty)}),' yanlış'),
        h('span',{class:'ts'},h('b',{text:String(sc.empty)}),' boş'),
        h('span',{class:'ts'},h('b',{text:fmtClock(run.sec)}),' süre'),
        h('span',{class:'ts'},h('b',{text:avg+' sn'}),' / soru')),
      sc.total<TS.list.length?h('p',{class:'muted sm',text:(TS.list.length-sc.total)+' sorunun cevap anahtarı olmadığı için puanlanmadı.'}):null)));
  var acts=h('div',{class:'row wrap t-acts'});
  if(sc.wrong.length) acts.appendChild(btn('Yanlış ve boşları tekrar çöz ('+sc.wrong.length+')','primary',function(){startRun(u.id,{mode:run.mode==='exam'?'instant':run.mode,order:'rand',scope:'wrong',wrong:sc.wrong});},'sync'));
  acts.appendChild(btn('Baştan çöz',sc.wrong.length?'':'primary',function(){openTestStart(u.id);},'check'));
  if(sc.wrong.length) acts.appendChild(btn('Yanlışları .md indir','ghost',function(){exportWrongMd(sc.wrong);},'download'));
  acts.appendChild(btn('Üniteye dön','ghost',function(){go({v:'unit',uid:u.id});},'back'));
  page.appendChild(acts);
  /* part bazlı */
  var pk=Object.keys(sc.per).map(Number).sort(function(a,b){return a-b;});
  if(pk.length>1){
    var per=h('section',{class:'sec-box'},h('div',{class:'sec-hr'},h('h2',{class:'sec-h',text:'Parçalara göre'})));
    pk.forEach(function(n){
      var x=sc.per[n],pc=Math.round(x.c/x.t*100),p=slotPart(u.id,n);
      per.appendChild(h('div',{class:'throw'},h('span',{class:'throw-p'+(pc<60?' low':''),text:'%'+pc}),h('span',{class:'throw-b'},h('b',{text:'Part '+n+(p?' · '+qRangeLabel(p):'')}),h('span',{class:'muted',text:x.c+' / '+x.t+' doğru'})),progLine(pc/100)));
    });
    page.appendChild(per);
  }
  /* gözden geçirme */
  var filt='all',rv=h('section',{class:'sec-box'}),chips=h('div',{class:'chips-f'}),list=h('div',{class:'t-rvl'});
  rv.appendChild(h('div',{class:'sec-hr'},h('h2',{class:'sec-h',text:'Soru soru gözden geçir'})));
  rv.appendChild(chips);rv.appendChild(list);page.appendChild(rv);
  function status(id){var q=TS.qmap[id],a=run.ans[id];if(!q.ans) return 'na';if(!a) return 'empty';return a===q.ans?'ok':'bad';}
  function paintRv(){
    clear(chips);clear(list);
    [['all','Tümü',TS.list.length],['bad','Yanlış',TS.list.filter(function(id){return status(id)==='bad';}).length],['empty','Boş',sc.empty],['flag','Bayraklı',sc.flagged]].forEach(function(f){
      chips.appendChild(h('button',{type:'button',class:'fchip'+(filt===f[0]?' on':''),onclick:function(){filt=f[0];paintRv();}},f[1],h('em',{text:String(f[2])})));
    });
    TS.list.forEach(function(id,i){
      var q=TS.qmap[id],st=status(id);
      if(filt==='bad'&&st!=='bad') return;
      if(filt==='empty'&&st!=='empty') return;
      if(filt==='flag'&&!run.flag[id]) return;
      var a=run.ans[id];
      var d=h('details',{class:'t-rv s-'+st},
        h('summary',null,h('span',{class:'t-rvn',text:String(i+1)}),
          h('span',{class:'t-rvi'},st==='ok'?icon('check',15):st==='bad'?icon('close',15):h('span',{class:'dash',text:'–'})),
          h('span',{class:'t-rvs',text:plainOf(q.stem).replace(/\\[a-zA-Z]+/g,'').replace(/[{}\\]/g,'').replace(/\s+/g,' ').trim().slice(0,110)}),
          h('span',{class:'t-rva muted',text:(a?'Sen '+a:'Boş')+(q.ans?' · Doğru '+q.ans:'')}),
          run.flag[id]?h('span',{class:'t-rvf',title:'Bayraklı'},icon('note',13)):null));
      var ready=false;
      d.addEventListener('toggle',function(){
        if(!d.open||ready) return;ready=true;
        var body=h('div',{class:'t-rvb'});
        var stem=h('div',{class:'prose t-stem'});qHtml(stem,q.stem);body.appendChild(stem);
        var os=h('div',{class:'t-opts'});q.opts.forEach(function(o){os.appendChild(optRow(q,o,{sel:a===o.k,reveal:true}));});body.appendChild(os);
        if(q.exp){var ex=h('div',{class:'prose t-exp'});qHtml(ex,q.exp);body.appendChild(h('section',{class:'t-fb'},h('div',{class:'t-fb-l',text:'Çözüm ve analiz'}),ex));}
        d.appendChild(body);typeset(body);
      });
      list.appendChild(d);
    });
    if(!list.firstChild) list.appendChild(h('p',{class:'muted',text:'Bu filtrede soru yok.'}));
  }
  paintRv();
}
function exportWrongMd(ids){
  var u=TS.u,out='# '+getCourse(u.cid).name+' · '+u.name+' · yanlış ve boş sorular\n\n';
  ids.forEach(function(id){
    var q=TS.qmap[id],a=TS.run.ans[id];
    out+='## Soru '+q.n+' (Part '+q.pno+')\n\n'+q.stem+'\n\n'+q.opts.map(function(o){return '- '+o.k+') '+o.t;}).join('\n')+'\n\n**Doğru cevap:** '+(q.ans||'?')+' · **Benim cevabım:** '+(a||'boş')+'\n\n'+(q.exp?q.exp+'\n\n':'')+'---\n\n';
  });
  saveFile(slug(u.name+' yanlışlar',80)+'.md',out,'text/markdown').then(function(r){if(r==='saved') toast('Dosya hazırlandı');});
}

/* ---------- klavye ---------- */
document.addEventListener('keydown',function(e){
  if(route.v!=='test'||!TS||e.ctrlKey||e.metaKey||e.altKey) return;
  var t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')) return;
  if(overlay.el&&overlay.el.classList.contains('modal')) return;
  if(TS.run.fin) return;
  var k=e.key,q=curQ();
  var idx=/^[1-6]$/.test(k)?+k-1:'abcdef'.indexOf(k.toLowerCase());
  if(k.length===1&&idx>=0&&idx<q.opts.length){e.preventDefault();pick(q.opts[idx].k);return;}
  if(k==='Enter'||k==='ArrowRight'){if(t&&t.tagName==='BUTTON'&&k==='Enter'&&!t.classList.contains('t-next')) return;e.preventDefault();nextQ();}
  else if(k==='ArrowLeft'){e.preventDefault();go2(TS.run.idx-1);}
  else if(k.toLowerCase()==='f'){e.preventDefault();toggleFlag();}
  else if(k.toLowerCase()==='m'){e.preventDefault();openTestMap();}
},true);

/* ===================== ARAYÜZ: klavye, başlatma ===================== */
function partRef(p){var u=getUnit(p.uid);return (u?u.name+' · ':'')+'Part '+p.no+' · '+ptitle(p);}
function partOrder(a,b){
  var ca=getCourse(a.cid),cb=getCourse(b.cid);
  var ua=getUnit(a.uid),ub=getUnit(b.uid);
  return ((ca&&ca.created)||0)-((cb&&cb.created)||0)||((ua&&(ua.ord!=null?ua.ord:ua.created))||0)-((ub&&(ub.ord!=null?ub.ord:ub.created))||0)||(a.no||0)-(b.no||0);
}
/* ---------- klavye, yapıştırma, başlatma ---------- */
function typing(t){return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    if(overlay.el){closeOverlay();return;}
    if(!$('printview').hidden){closePrintView();return;}
    if(P.focus&&route.v==='reader'){P.focus=false;savePrefs();applyPrefs();return;}
    return;
  }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();return;}
  if(typing(e.target)||e.ctrlKey||e.metaKey||e.altKey) return;
  if(overlay.el&&overlay.el.classList.contains('modal')) return;
  if(e.key==='/'){e.preventDefault();openSearch();return;}
  if(e.key==='?'){openSettings();return;}
  if(route.v==='reader'&&RD){
    if(e.key==='j'){e.preventDefault();if(RD.secs.length) secGo(Math.min(RD.secs.length-1,RD.curIdx+1));}
    else if(e.key==='k'){e.preventDefault();if(RD.curIdx>0&&RD.secs.length) secGo(RD.curIdx-1);else window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});}
    else if(e.key==='f'){P.focus=!P.focus;savePrefs();applyPrefs();}
    else if(e.key==='t'){readerToggleToc();}
    else if(e.key===']'||e.key==='['){
      var nb=neighbors(RD.p),tg=e.key===']'?nb.next:nb.prev;
      if(tg&&(e.key==='['||tg.no===RD.p.no+1)) go({v:'reader',pid:tg.id});
      else if(e.key===']') toast('Part '+(RD.p.no+1)+' henüz yüklenmedi');
    }
  }
});
document.addEventListener('paste',function(e){
  if(typing(e.target)) return;
  var txt=(e.clipboardData&&e.clipboardData.getData('text'))||'';
  if(txt.trim().length>=120){e.preventDefault();closeOverlay();quickAdd(txt);}
});
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    if(RD&&RD.ready){RD.st.pos=+RD.progress.toFixed(4);touch('s:'+RD.pid,true);}
    flush();fsFlushNow();
  }
});
window.addEventListener('pagehide',function(){flush();fsFlushNow();});
/* masaüstü uygulaması: pencere kapanırken bekleyen yazmaları bitir */
window.__gioFlush=function(){
  try{if(RD&&RD.ready){RD.st.pos=+RD.progress.toFixed(4);touch('s:'+RD.pid,true);}flush();}catch(e){}
  fsFlushNow();
  return new Promise(function(res){var n=0;(function w(){if((!FS.busy&&!FS.timer&&!FS.again)||n++>90) return res(1);setTimeout(w,50);})();});
};
if(window.gioNative&&window.gioNative.printPdf){
  document.documentElement.classList.add('native');
  window.print=function(){var t=(document.querySelector('.pv-doc h1,.pv-h')||{}).textContent||document.title;window.gioNative.printPdf(t);};
}

function initialRoute(){
  if(P.start==='resume'&&UI.last&&UI.last.v==='reader'&&S.parts[UI.last.pid]) return {v:'reader',pid:UI.last.pid};
  return {v:'home'};
}
function afterSync(r){
  if(!r||!r.changed) return;
  try{if(typeof healLibraryMetadata==='function') healLibraryMetadata();}catch(e){}
  if(route.v==='reader'){toast('Başka kaynaktaki değişiklikler yüklendi. Görmek için kitaplığa dön.');return;}
  refresh();
  toast('Başka kaynaktaki değişiklikler yüklendi');
}
async function boot(){
  var view=$('view');
  try{
    captureShell();
    await loadLocal();
    applyPrefs();
    view.appendChild(h('div',{class:'splash',text:'Yükleniyor…'}));
    renderBar();renderTabbar();
    if(!window.marked||!window.marked.parse) throw new Error('marked yüklenemedi');
    $('focus-exit').addEventListener('click',function(){P.focus=false;savePrefs();applyPrefs();});
    onDataChange=function(soft){fsQueue(!!soft);};
    /* gömülü kitaplık (kaydedilmiş HTML dosyasından açıldıysa) */
    var emb=readEmbedded(),embN=0;
    if(emb){var rr=applySnapshot(emb);embN=rr.added;}
    await fsInit();
    var fsDone=false;
    if(FS.state==='ok'&&!hasData()){try{await fsSync(true);fsDone=true;}catch(e){}}
    try{if(typeof healLibraryMetadata==='function') healLibraryMetadata();}catch(e){}
    if(hasData()){
      route=initialRoute();renderRoute();
      if(embN>0) toast('Dosyadaki kitaplık yüklendi · '+embN+' part');
    }else{
      var ok=await Promise.race([initSync(),new Promise(function(r){setTimeout(function(){r(false);},4500);})]);
      if(ok) await syncAll();
      try{if(typeof healLibraryMetadata==='function') healLibraryMetadata();}catch(e){}
      route={v:'home'};renderRoute();
    }
    if(hasData()){
      initSync().then(function(ok){return ok?syncAll():null;}).then(afterSync);
    }
    if(FS.state==='ok'&&!fsDone){
      var rSync=await fsSync(true);
      try{if(typeof healLibraryMetadata==='function') healLibraryMetadata();}catch(e){}
      if(rSync&&rSync.changed) afterSync({changed:true});
    }
    document.addEventListener('visibilitychange',function(){
      if(!document.hidden&&R&&sync.last&&Date.now()-sync.last>5*60*1000) syncAll().then(afterSync);
    });
  }catch(err){
    clear(view);
    view.appendChild(h('div',{class:'empty'},h('h2',{class:'empty-h',text:'Okuyucu başlatılamadı'}),h('p',{text:'Gerekli bileşenler yüklenemedi. Sayfayı yenile.'}),h('p',{class:'muted sm',text:String(err&&err.message||err)})));
  }
}
onSyncChange=function(){};
window.__gioBootPromise=boot();

})();
