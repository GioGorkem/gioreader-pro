/* ===================== GioReader Pro: LaTeX Dönüştürücü & Akıllı Part/Başlık Motoru (v2) ===================== */

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
var LX_FMT={textbf:'**',bf:null,textit:'*',emph:'*',textsl:'*',textsc:'',textrm:'',textsf:'',textnormal:'',textup:'',textmd:'',text:'',mbox:'',hbox:'',underline:'',uline:'',ul:'',hl:'',fbox:'',framebox:'',boxed:'',
  textcolor:2,colorbox:2,mathbf:'**',textsuperscript:'sup',textsubscript:'sub',textbfit:'***',ensuremath:'',uppercase:'U',MakeUppercase:'U',MakeLowercase:'L',lowercase:'L',textnumero:'',
  parbox:2,makebox:1,raisebox:2,scalebox:2,resizebox:3,fcolorbox:3,vphantom:'X',hphantom:'X',phantom:'X',mbox2:''};
var LX_SEC={part:'# ',chapter:'# ',section:'## ',subsection:'### ',subsubsection:'#### ',frametitle:'### '};
var LX_DROP=/^(?:noindent|centering|raggedright|raggedleft|medskip|bigskip|smallskip|hfill|vfill|newpage|clearpage|cleardoublepage|pagebreak|nopagebreak|linebreak|nolinebreak|relax|protect|sloppy|fussy|normalsize|small|footnotesize|scriptsize|tiny|large|Large|LARGE|huge|Huge|normalfont|bfseries|itshape|slshape|ttfamily|rmfamily|sffamily|scshape|upshape|mdseries|selectfont|maketitle|tableofcontents|listoftables|listoffigures|appendix|frontmatter|mainmatter|backmatter|begingroup|endgroup|bgroup|egroup|null|strut|allowbreak|nobreak|ignorespaces|flushbottom|raggedbottom|onecolumn|twocolumn|thispagestyle|break|goodbreak|par|hrulefill|dotfill|vss|hss|midrule|toprule|bottomrule|hline|nonumber|notag|qed|qedhere|displaystyle|bf|it|em|tt|sc|rm|sf|sl)$/;
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
      if(nx==='\\'){
        out+='\\\\';i+=2;
        var o2=lxOpt(s,i);if(o2&&/^\s*-?[\d.]+\s*(?:pt|mm|cm|em|ex|in|bp)?\s*$/.test(o2.t)) i=o2.end;
        continue;
      }
      if(nx===''){out+='\\';i++;continue;}
      if(!/[A-Za-z]/.test(nx)){
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
      if(name==='texttt'||name==='lstinline'||name==='code'||name==='verb'){
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
        var cco=lxOpt(s,j);if(cco) j=cco.end;
        var cca=lxArg(s,j);
        if(cca){out+='\\caption{'+lxText(cca.t,strong)+'}';i=cca.end;continue;}
      }
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
        if(d2){
          var more=d2.end;
          if(/^(?:setlength|addtolength|setcounter|addtocounter|newcommand|renewcommand|providecommand|DeclareMathOperator|newtheorem|newenvironment|renewenvironment|def|rowcolors|titleformat|titlespacing|cmidrule|specialrule|hskip|vskip|fontsize|numberwithin|captionsetup|rowcolor|cellcolor)$/.test(name)){
            for(var z=0;z<3;z++){var oo2=lxOpt(s,more);if(oo2) more=oo2.end;var g2=lxArg(s,more);if(!g2) break;more=g2.end;}
          }
          i=more;
        }else{
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
      out+='\\'+name+star;
      i=j;
      if(name==='begin'||name==='end'){
        var g=lxGroup(s,s.charAt(i)==='{'?i:-1,'{','}');
        if(g){
          out+='{'+g.t+'}';i=g.end;
          if(name==='begin'){
            var tbl=/^(?:tabular|tabularx|tabulary|longtable|supertabular|minipage|multicols|wrapfigure|wraptable|adjustbox|tabular\*)$/.test(g.t);
            for(var q2=0;q2<(tbl?3:1);q2++){
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
  var base=name.replace(/\*$/,''),o,t;
  var store=st.store;
  switch(base){
    case 'itemize':case 'compactitem':case 'asparaitem':case 'itemize*':{
      o=lxItems(body);
      t=o.items.map(function(it){return lxIndent('- ',(it.lab?'**'+lxResolve(it.lab,store,true).trim()+'** ':'')+it.t);}).join('\n');
      return '\n\n'+(o.pre?o.pre+'\n\n':'')+t+'\n\n';
    }
    case 'enumerate':case 'compactenum':case 'asparaenum':{
      o=lxItems(body);var n=0,hasLab=o.items.some(function(it){return it.lab;});
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
  return '\n\n'+body.trim()+'\n\n';
}

function lxUnescRaw(t){return t.replace(/[\uE012\uE013\uE015-\uE019]/g,function(c){return {'\uE015':'\\&','\uE013':'\\%','\uE012':'\\$','\uE016':'\\#','\uE017':'\\_','\uE018':'\\{','\uE019':'\\}'}[c];});}
function lxMathEnv(env,inner){
  inner=inner.replace(/\\(?:label|notag|nonumber)(?:\{[^}]*\})?/g,'').replace(/^\s*\{\d+\}/,'');
  var wrap={align:'aligned',flalign:'aligned',alignat:'aligned',split:'aligned',gather:'gathered',multline:'gathered',eqnarray:'aligned'}[env];
  return wrap?'\\begin{'+wrap+'}'+inner.trim()+'\\end{'+wrap+'}':inner.trim();
}
function latexParts(src){
  var s=String(src==null?'':src).replace(/\r\n?/g,'\n');
  if(!looksLatex(s)) return {md:s,macros:'',tex:false};
  var strong=lxScore(s).strong||lxScore(s).n>=4;
  var st={store:[],thm:{}},store=st.store,macros=[];
  function put(t,text){store.push({t:t,s:t==='m'?lxUnescRaw(text):text});return lxPH(store.length-1);}
  var dm=/\\begin\{document\}/.exec(s),pre='';
  if(dm){pre=s.slice(0,dm.index);s=s.slice(dm.index+dm[0].length);var de=s.search(/\\end\{document\}/);if(de>=0) s=s.slice(0,de);}
  else{
    var first=/^[\s\S]*?(?=\n\s*\n|$)/.exec(s);
    if(first&&/\\documentclass|\\usepackage/.test(first[0])){pre=first[0];s=s.slice(first[0].length);}
  }
  function grab(txt){
    var re=/\\(newcommand|renewcommand|providecommand|DeclareMathOperator\*?|def|newtheorem|title|author|date)\b/g,mm;
    var meta={};
    while((mm=re.exec(txt))){
      var nm=mm[1],j=mm.index+mm[0].length;
      if(nm==='newtheorem'){
        var a=lxArg(txt,j);if(a){var b=lxArg(txt,a.end);if(b){st.thm[a.t.trim()]=b.t.trim();}}
        continue;
      }
      if(nm==='title'||nm==='author'||nm==='date'){
        var o=lxOpt(txt,j);if(o) j=o.end;
        var g=lxArg(txt,j);if(g) meta[nm]=g.t;
        continue;
      }
      var k=j;
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
  s=s.replace(/\\[&%$#_{}]/g,function(m){return LX_ESC[m];});
  s=s.replace(/^[ \t]*%[^\n]*\n?/gm,'').replace(/[ \t]+%[^\n]*$/gm,'');
  s=s.replace(/\$\$([\s\S]+?)\$\$/g,function(m){return '\n\n'+put('m',m)+'\n\n';});
  s=s.replace(/\\\[([\s\S]+?)\\\]/g,function(m){return '\n\n'+put('m',m)+'\n\n';});
  s=s.replace(/\\\(([\s\S]+?)\\\)/g,function(m){return put('m',m);});
  s=s.replace(/\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray|displaymath|split)(\*?)\}([\s\S]*?)\\end\{\1\2\}/g,function(m,env,star,inner){
    return '\n\n'+put('m','$$'+lxMathEnv(env,inner)+'$$')+'\n\n';
  });
  s=s.replace(/\\begin\{((?:[pbBvV]|small)?matrix|cases|array|aligned|gathered|alignedat)\}([\s\S]*?)\\end\{\1\}/g,function(m){
    return '\n\n'+put('m','$$'+m+'$$')+'\n\n';
  });
  s=s.replace(/\$([^\s$](?:(?:(?!\n[ \t]*\n)[^$]){0,800}?[^\s$])?)\$(?!\d)/g,function(m){return put('m',m);});
  s=lxText(s,strong);
  var guard=0,envRe=/\\begin\{([A-Za-z]+\*?)\}((?:(?!\\begin\{)[\s\S])*?)\\end\{\1\}/;
  while(guard++<2000){
    var em=envRe.exec(s);if(!em) break;
    s=s.slice(0,em.index)+lxEnv(em[1],em[2],st)+s.slice(em.index+em[0].length);
  }
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
function latexToMd(src){return latexParts(src).md;}

/* ===================== ÇEKİRDEK YARDIMCILAR ===================== */
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
  sec=Math.max(0,Math.round(sec||0));
  if(sec<60) return sec+' sn';
  var m=Math.round(sec/60);
  if(m<60) return m+' dk';
  var h=Math.floor(m/60),r=m%60;
  return h+' sa'+(r?' '+r+' dk':'');
}
function fmtDurExact(sec){
  sec=Math.max(0,Math.round(sec||0));
  if(sec<60) return sec+' sn';
  var m=Math.floor(sec/60),s=sec%60;
  if(m<60) return m+' dk'+(s>=10&&m<10?' '+s+' sn':'');
  var h=Math.floor(m/60),r=m%60;
  return h+' sa'+(r?' '+r+' dk':'');
}
var MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
var WDAYS=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function fmtDate(t){var d=new Date(t);return d.getDate()+' '+MONTHS[d.getMonth()];}
function fmtDateLong(t){var d=new Date(t);return d.getDate()+' '+MONTHS[d.getMonth()]+' '+WDAYS[d.getDay()];}
function fmtAgo(t,now){
  var d=Math.round((startOfDay(now||Date.now())-startOfDay(t))/DAY);
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

/* ---------- LaTeX Matematik -> Okunur Düz Metin ---------- */
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
  // Önce bozulmuş $\mathbb{Z}m$ gibi durumları da yakala
  s=s.replace(/\$\\mathbb\{([A-Z])\}\s*([a-z0-9])\$/g,function(_,B,sub){return (TX_BB[B]||B)+(TX_SUB[sub]||sub);});
  if(s.indexOf('$')<0&&s.indexOf('\\(')<0&&!/\\(?:mathbb|mathcal|mathbf|boldsymbol|frac|alpha|beta|psi|Psi|phi|Phi|xi|eta|mu|lambda|pmod|equiv|times|to|forall|exists|implies)/.test(s)) return s;
  s=s.replace(/\$\$([\s\S]+?)\$\$|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)|\\\(([\s\S]+?)\\\)/g,function(m,a,b,c){return texToText(a||b||c);});
  if(/\\[A-Za-z]+/.test(s)) s=texToText(s);
  return s;
}

/* ---------- Üstveri Birleştirme ---------- */
function mergeUnits(a,b,du){
  var map={};
  [a,b].forEach(function(list){(list||[]).forEach(function(u){if(!map[u.id]||(u.u||0)>=(map[u.id].u||0)) map[u.id]=u;});});
  return Object.keys(map).filter(function(id){return !(du[id]&&du[id]>=(map[id].u||0));}).map(function(id){return map[id];})
    .sort(function(x,y){return (x.ord!=null?x.ord:x.created||0)-(y.ord!=null?y.ord:y.created||0)||(x.created||0)-(y.created||0);});
}
function mergeMeta(a,b){
  var newer=(a.u||0)>=(b.u||0)?a:b,older=newer===a?b:a;
  var out={v:4,u:Math.max(a.u||0,b.u||0),courses:[],log:{},dc:Object.assign({},older.dc,newer.dc)};
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

/* ===================== GELİŞMİŞ PART NUMARASI VE BAŞLIK ALGILAMA MOTORU (v2) ===================== */

// Yalnızca çok satırlı kod bloklarını maskeler (satır içi `struct`, `malloc`, `.cpp` korunur!)
function maskFencedCode(s){
  return String(s||'').replace(/(^|\n)([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?(?:\n[ \t]*\3[^\n]*|$)/g,function(m){return m.replace(/[^\n]/g,' ');});
}
function maskCode(s){
  var out=maskFencedCode(s);
  return out.replace(/`[^`\n]*`/g,function(m){return m.replace(/[^\n]/g,' ');});
}

// Bilinen teknik kısaltmalar ve Romen rakamları (Title Case dönüşümünde büyük kalmalı)
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
  // Harflerin ne kadarı büyük?
  var letters=s.match(/[\p{L}]/gu)||[];
  if(letters.length<5) return s;
  var uppers=s.match(/[\p{Lu}]/gu)||[];
  // Eğer metnin %65'inden fazlası büyük harfse (Örn: "KATLI ÖZDEĞERLERDE TEMEL MATRİS...")
  if(uppers.length/letters.length<0.65) return s;

  var words=s.split(/(\s+)/);
  var firstWord=true;
  return words.map(function(w){
    if(/^\s+$/.test(w)) return w;
    // Baş ve sondaki noktalama işaretlerini ayır
    var m=/^([("'“‘\[\{]*)(.*?)([)"'”’\]\}.,;:?!]*)$/.exec(w);
    if(!m) return w;
    var pre=m[1],core=m[2],post=m[3];
    if(!core) return w;
    // Matematiksel ifade, parantezli fonksiyon veya zaten küçük harf içeren özel sembol ise (örn: exp(At), Ψ(t), detA, std::vector)
    if(/[=<>+*/^_ΨΦξλμωΔΩ∑∫√():]/.test(core)||/[\p{Ll}]/u.test(core)) {
      firstWord=false;
      return w;
    }
    var upperCore=core.toLocaleUpperCase('tr');
    if(TECH_UPPER.has(upperCore)||TECH_UPPER.has(core)){
      firstWord=false;
      return pre+(TECH_UPPER.has(core)?core:upperCore)+post;
    }
    // Kesme işaretli Türkçe ekler (Örn: C++'IN -> C++'ın, MATRİS'İN -> Matris'in)
    var aposIdx=core.search(/['’]/);
    if(aposIdx>0){
      var stem=core.slice(0,aposIdx),suf=core.slice(aposIdx);
      var stemUp=stem.toLocaleUpperCase('tr');
      var cleanStem=TECH_UPPER.has(stemUp)?stemUp:(stem.charAt(0).toLocaleUpperCase('tr')+stem.slice(1).toLocaleLowerCase('tr'));
      firstWord=false;
      return pre+cleanStem+suf.toLocaleLowerCase('tr')+post;
    }
    var low=core.toLocaleLowerCase('tr');
    if(!firstWord&&TR_LOWER_WORDS.has(low)){
      return pre+low+post;
    }
    firstWord=false;
    return pre+low.charAt(0).toLocaleUpperCase('tr')+low.slice(1)+post;
  }).join('');
}

// Dengeli parantez temizleyici (iç içe (Ψ(t)) gibi matematik ifadelerini ASLA bozmaz)
function stripRedundantParens(s){
  var out='',i=0,n=s.length;
  while(i<n){
    if(s.charAt(i)==='('){
      var d=0,j=i;
      for(;j<n;j++){
        if(s.charAt(j)==='(') d++;
        else if(s.charAt(j)===')'){
          d--;
          if(d===0) break;
        }
      }
      if(d===0){
        var inner=s.slice(i+1,j).trim();
        // Kısa matematiksel ifadeleri koru: (n), (t), (Ψ(t)), (Φ(t)), (x,y), (detA = 0), (m=3, q=1)
        var isShortMath=inner.length<=14&&(/[=<>+*/^_ΨΦξλμωΔΩ0-9]/.test(inner)||/^[a-zA-Z0-9,\s]+$/.test(inner));
        if(isShortMath){
          out+=s.slice(i,j+1);
        }else{
          // Uzun açıklama parantezini kaldırırken önceki boşluğu temizle
          out=out.replace(/\s+$/,'');
        }
        i=j+1;
        continue;
      }
    }
    out+=s.charAt(i);
    i++;
  }
  return out.replace(/\s+/g,' ').trim();
}

function titleClean(t){
  var s=String(t||'');
  // 1) Önce LaTeX matematiği okunur metne çevir (böylece _ ve ^ kaybolmaz)
  s=mathInText(s);
  // 2) HTML etiketlerini ve markdown vurgu işaretlerini temizle (satır içi kodun metnini koru!)
  s=s.replace(/<[^>]+>/g,'').replace(/(\*\*|__|\*|`)/g,'').replace(/\s+/g,' ').trim();
  // 3) Bozuk "MATRİS) VE" gibi eski kalıntıları onar
  if(s.indexOf(')')>=0&&s.indexOf('(')<0) s=s.replace(/\)/g,'');
  // 4) Baştaki ve sondaki gereksiz ayraçları temizle
  s=s.replace(/^[\s:：\-–—.)\]]+/,'').replace(/[\s:;,.\-–—]+$/,'').trim();
  // 5) "TEMA 1:", "BÖLÜM 2:", "KISIM 1:" gibi jenerik üst-başlık öneklerini soy
  s=s.replace(/^(?:TEMA|Tema|BÖLÜM|Bölüm|KISIM|Kısım|ADIM|Adım)\s*\d*(?:\.\d+)*\s*[:：\-–—.]\s*/,'');
  // 6) '"NEDEN BUNA İHTİYACIMIZ VAR?" - X' kalıbında asıl konuyu (X) öne çıkar
  var whyMatch=/^["“'‘]?NEDEN\s+BUNA\s+İHTİYACIMIZ\s+VAR\??["”'’]?\s*[:：\-–—]?\s*(.{6,})$/i.exec(s);
  if(whyMatch) s=whyMatch[1].trim();
  // 7) Başta tırnak içinde kalmış tekil sarmalayıcıyı temizle
  if(/^["“]([^"”]+)["”]$/.test(s)) s=s.slice(1,-1).trim();
  // 8) Tamamı büyük harfse Türkçe Title Case'e dönüştür
  s=normalizeTurkishCase(s);
  return s.trim();
}

// Sonunda havada kalan (tamamlanmamış tamlama/bağlaç) kelimeler
var DANGLING_END_RE=/\s+(?:ve|ile|veya|ya|da|de|için|olan|olarak|bir|bu|şu|o|en|daha|çok|gibi|kadar|göre|karşı|doğru|sonra|önce|üzerine|üzerinde|arasındaki|arasında|almanın|yapmanın|etmenin|olmanın|bulmanın|çözmenin|probleminin|sistemlerin|sistemlerinin|denklemlerin|denkleminin|özdeğerlerin|özdeğerli|vektörlerin|matrislerin|fonksiyonunun|fonksiyonların|ifadelerin|mantığının|kurallarının|kavramının|mimarisinin|analizinin|teorisinin|yönteminin|algoritmasının|geometrik|felsefi|formel|temel|özel|genel|doğrusal|olmayan|uygunsuz|düğüm|başlangıç|değer|koordinat|sınıf|dışı|katlı|kök|tek)$/i;

var GENERIC_LEFT_LABEL_RE=/^(?:Problem|Problemler|Laboratuvar|Teorem\s+Laboratuvarı|Uygulama\s+Laboratuvarı|Örnek|Yöntem|Adım|Sınıflandırma\s+Kriteri|Kriter|Çözüm\s+Yolu|Durum|Senaryo|Model|Deney| İnceleme|Genel\s+Tekrar|Epilog|Prolog|Giriş|Özet|Sonuç|Krizin\s+Ortaya\s+Çıkışı|Mutfağa\s+Giriş|Menüyü\s+Hazırlamak|Felsefesi)(?:\s+[0-9IVX]+(?:\s*(?:ve|-|–)\s*[0-9IVX]+)?)?$/i;

function shortTitle(t,max){
  max=max||68;
  var s=titleClean(t).replace(/^(?:PART|Part|part|BÖLÜM|Bölüm)\s*\d+\s*[:：\-–—.]?\s*/,'');
  if(!s) return '';
  if(s.length<=max) return s;

  // 1) Uzun parantez içi açıklamaları (İngilizce karşılıklar, Problem numaraları vb.) dengeli biçimde soy
  var noParens=stripRedundantParens(s);
  if(noParens.length>=8) s=noParens;
  if(s.length<=max) return titleClean(s);

  // 2) İki nokta (:) veya tire ( - ) varsa:
  // Eğer sol taraf "Problem 30", "Laboratuvar 1", "Yöntem 3", "Sınıflandırma Kriteri 1" gibi jenerik bir etiketse,
  // ASLA sağ tarafı çöpe atma! Sağ tarafı (veya "Problem 30 · Sağ Taraf" özetini) kullan.
  var colonMatch=/^([^:：–—-]+?)\s*(?:[:：]|\s[–—-]\s)\s*(.+)$/.exec(s);
  if(colonMatch){
    var left=titleClean(colonMatch[1]),right=titleClean(colonMatch[2]);
    if(GENERIC_LEFT_LABEL_RE.test(left)){
      // "Problem 30" veya "Örnek 3" gibi numarası önemli olanlarda kısa önek + sağ taraf
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

  // 3) Virgül veya bağlaçlardan doğal kırpma
  var cut=s.slice(0,max+1);
  var k=Math.max(cut.lastIndexOf(', '),cut.lastIndexOf(' ve '),cut.lastIndexOf(' & '),cut.lastIndexOf(' ile '),cut.lastIndexOf(': '));
  if(k>=22){
    var cand=titleClean(s.slice(0,k));
    if(!DANGLING_END_RE.test(' '+cand)) return cand;
  }

  // 4) Kelime sınırından kırp ve havada kalan tamlama kelimelerini temizle
  k=cut.lastIndexOf(' ');
  var res=titleClean(s.slice(0,k>=18?k:max));
  while(DANGLING_END_RE.test(res)&&res.indexOf(' ')>12){
    res=res.replace(/\s+\S+$/,'').trim();
  }
  return res;
}

var NEXT_AFTER_RE=/^[^\n]{0,160}?(?:konusuna\s+(?:geç|devam)|ile\s+devam|geçece[ğg]iz|geçerek|geçelim|geçebiliriz|başlayaca[ğg][ıi]z|başlayal[ıi]m|ele\s+alaca[ğg][ıi]z|işleyece[ğg]iz|devam\s+ed(?:ece[ğg]iz|elim)|konusunda\s+buluşal[ıi]m|ile\s+bulu[şs]aca[ğg][ıi]z|ile\s+(?:sürdür|ilerle)|sonraki\s+adım)/i;
var NEXT_BEFORE_RE=/(?:sonraki|bir\s+sonraki|sıradaki|next|devam\s+(?:için|etmek)|hazır\s+olduğunuzda|hazır\s+olunca|hazırsan|komutunu|ardından|ve\s+sonra)[^\n]{0,120}$/i;
var CHAT_RE=/(?:["“'‘]\s*devam(?:\s*et)?\s*["”'’]|devam\s+etmek\s+için|hazır\s+olduğunuzda|hazır\s+olduğunda|hazır\s+olunca|hazırsan|komutunu\s+ver|komut\s+ver|yazman[ıi]\s+bekl|yazmanı\s+bekl|bekliyorum\.?$)/i;

function extractTitleAfter(raw,endIdx,flags){
  var lineEnd=raw.indexOf('\n',endIdx);if(lineEnd<0) lineEnd=raw.length;
  var lineStart=raw.lastIndexOf('\n',endIdx-1)+1;
  var beforeOnLine=raw.slice(lineStart,endIdx);
  // Eğer "Part N" parantez içinde geçiyorsa (Örn: "son bölümünü (Part 16) başlatıyoruz.")
  // kapanan parantez ')' başlık ayracı DEĞİLDİR!
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
  // Giriş paragraflarında (**Kalın Konu**) ile vurgulanan ders/bölüm ana konusunu yakala
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

var LX_CACHE=[];
function latexCached(raw){
  if(raw.indexOf('\\')<0) return {md:raw,macros:'',tex:false};
  for(var i=0;i<LX_CACHE.length;i++) if(LX_CACHE[i].k===raw) return LX_CACHE[i].v;
  var v=latexParts(raw);
  LX_CACHE.push({k:raw,v:v});if(LX_CACHE.length>12) LX_CACHE.shift();
  return v;
}

function analyzePart(src,fileName){
  var raw=String(src==null?'':src).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  var lp=latexCached(raw);
  if(lp.tex) raw=lp.md.trim();

  var masked=maskCode(raw),fencedMasked=maskFencedCode(raw),len=raw.length;
  var unitTotal=null,structuredNo=null,structuredNext=null;

  // 1) Yapılandırılmış altbilgi kontrolü: --- [Durum: Part 3/14 Tamamlandı | Sıradaki Bölüm: Part 4 - Başlık | ...] ---
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

  // 2) Metin içindeki tüm "Part N" adaylarını tara
  var re=/(?:^|[^\p{L}\p{N}])((?:PART|Part|part)[ \t]*[#.:]?[ \t]*(\d{1,3}))(?!\d)(?![.,]\d)/gu,m,cands=[];
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

  // Dosya adından numara yedeklemesi (Örn: "04 - Problem Boyutu.md" veya "Unite1_CH1.pdf")
  if(!no&&fileName){
    var fnm=/^(?:Part[ \t_-]*)?(\d{1,3})\b/i.exec(String(fileName).trim());
    if(fnm){no=+fnm[1];src2='filename';conf='mid';}
  }

  // 3) Gövdeyi sohbet/durum satırlarından arındır
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

  // 4) Çok Kaynaklı Akıllı Başlık Adayları Toplama
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

  // Aday 1: "Part N: Başlık" satırı
  if(cur&&cur.end!=null){
    var tc=cur.completion?cands.filter(function(c){return c.no===cur.no&&c.head&&!c.completion&&!c.suf;})[0]:cur;
    if(tc){
      var tAfter=extractTitleAfter(raw,tc.end,{inBold:tc.inBold,isHeading:tc.isHeading,lead:tc.lead});
      if(tAfter) addCand(tAfter,'part');
    }
  }

  // Aday 2: Markdown Başlıkları (Fenced code maskelenmiş, ama inline `code` KORUNMUŞ metinden!)
  var bodyFencedMasked=maskFencedCode(body);
  var headingRe=/^(#{1,4})[ \t]+(.{3,200})$/gm,hm,headings=[];
  while((hm=headingRe.exec(bodyFencedMasked))){
    // Gerçek satırı `body` üzerinden al (böylece `struct`, `malloc`, `.cpp` vb. tam korunur)
    var hLineEnd=body.indexOf('\n',hm.index);if(hLineEnd<0) hLineEnd=body.length;
    var realHeadingLine=body.slice(hm.index,hLineEnd).replace(/^#{1,6}[ \t]+/,'').trim();
    var strippedNum=realHeadingLine.replace(/^\d+(?:\.\d+)*[.)]\s+/,'');
    headings.push({level:hm[1].length,raw:strippedNum,orig:realHeadingLine});
  }

  // Eğer ilk başlık sadece "Neden Buna İhtiyacımız Var?" gibi jenerik bir soruysa:
  var firstH=headings[0]?titleClean(headings[0].raw):'';
  var isGenericFirstH=/^Neden\s+Buna\s+İhtiyacımız\s+Var\??$/i.test(firstH);

  var introTopic=extractIntroTopic(body);
  if(isGenericFirstH&&introTopic){
    addCand(introTopic,'intro');
  }
  if(headings.length){
    if(!isGenericFirstH) addCand(headings[0].raw,'heading');
    if(headings.length>1){
      // İkinci başlık (özellikle ilk başlık jenerikse veya alternatif olarak)
      if(!/^(?:Adım|Örnek|Problem|Soru)\s+\d+$/i.test(titleClean(headings[1].raw))){
        addCand(headings[1].raw,'heading2');
      }
    }
    if(isGenericFirstH) addCand(headings[0].raw,'heading');
  }
  if(introTopic&&!isGenericFirstH){
    addCand(introTopic,'intro');
  }

  // Aday 3: Tek başına kalın satır
  var bm=/^\s*\*\*([^*\n]{4,120})\*\*\s*$/m.exec(body);
  if(bm) addCand(bm[1],'bold');

  // Aday 3.5: Çoktan seçmeli test dosyaları için Soru Aralığı ("Sorular 1–5")
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

  // Aday 4: Dosya adı (varsa)
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
    no:no,
    noSrc:src2,
    conf:conf,
    alts:alts.slice(0,5),
    title:finalTitle,
    fullTitle:finalFullTitle,
    titleCandidates:titleCandidates.slice(0,5),
    titleSrc:titleSrc,
    next:next,
    unitTotal:unitTotal,
    endMsg:endMsg.replace(/[*_]+/g,'').trim(),
    body:body.trim(),
    multi:multi,
    len:len,
    macros:lp.macros||'',
    tex:!!lp.tex,
    wordCount:stats.words,
    eqCount:stats.displayEqs,
    inlineMathCount:stats.inlineMaths,
    codeBlockCount:stats.codeBlocks,
    minutes:stats.minutes
  };
}

/* ---------- Matematik ve Kod Ağırlıklı Akıllı Okuma Süresi Hesaplama ---------- */
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
  // Akademik okuma ağırlığı:
  // Her blok denklem ~18 kelimelik inceleme süresi (~6.5 sn),
  // Her kod satırı ~3.5 kelimelik inceleme süresi,
  // Her satır içi matematik ifadesi +2 kelime ağırlığı
  var effectiveWords=words+(displayEqs*18)+(codeLines*3.5)+(inlineMaths*2);
  var minutes=Math.max(1,Math.round(effectiveWords/wpm));
  return {words:words,effectiveWords:Math.round(effectiveWords),displayEqs:displayEqs,inlineMaths:inlineMaths,codeBlocks:codeBlocks,codeLines:codeLines,minutes:minutes};
}

function countWords(body){
  return computeContentMetrics(body).words;
}
function readMinutes(body,wpm){
  return computeContentMetrics(body,wpm||170).minutes;
}

/* ---------- Markdown -> Güvenli Zengin HTML Hattı ---------- */
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
      if(/^on/.test(nm)||nm==='srcdoc'||(nm==='style'&&SAFE_ATTR_TAGS[tag])){el.removeAttribute(at[k].name);continue;}
      if(SAFE_ATTR_TAGS[tag]&&!(tag==='details'&&nm==='open')){el.removeAttribute(at[k].name);continue;}
      if(nm==='href'||nm==='src'||nm==='xlink:href'||nm==='action'||nm==='formaction'){
        var u=v.replace(/[\u0000-\u0020\u00a0]+/g,'').toLowerCase();
        if(/^(?:javascript|vbscript|file):/.test(u)||(/^data:/.test(u)&&!/^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)/.test(u))) el.removeAttribute(at[k].name);
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
  var html=typeof marked!=='undefined'&&marked.parse?sanitizeHtml(marked.parse(promoted,{gfm:true,breaks:false})):promoted;
  var inj=injectMath(html,p.maths);
  if(a.macros) inj.html='<span class="tex-macros" hidden aria-hidden="true">\\('+escHtml(a.macros)+'\\)</span>'+inj.html;
  return {html:inj.html,title:a.title,partNo:a.no,next:a.next,endMsg:a.endMsg,minutes:a.minutes,eqCount:inj.eqCount,mathCount:p.maths.length,analysis:a};
}

/* ---------- Arama, Vurgu ve ZIP Yardımcıları ---------- */
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
function reanchor(text,h){
  if(text.slice(h.s,h.e)===h.q) return {s:h.s,e:h.e};
  if(!h.q) return null;
  var best=-1,i=-1,bd=1e12;
  while((i=text.indexOf(h.q,i+1))>=0){var d=Math.abs(i-h.s);if(d<bd){bd=d;best=i;}}
  return best<0?null:{s:best,e:best+h.q.length};
}

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
function partMarkdown(text,title,by){
  var body=analyzePart(text).body.replace(/^\s*#[ \t]+[^\n]*\n+/,function(m){return m;});
  var first=/^\s*#[ \t]+([^\n]+)\n/.exec(body);
  if(first) body=body.slice(first[0].length);
  return shiftHeadings(body.trim(),by);
}

/* ---------- Çoktan Seçmeli Test Ayrıştırıcı ---------- */
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
          if(!L.trim()) break;
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
function mdSnippet(md,inline){
  var p=protect(latexCached(String(md||'')).md);
  var html=sanitizeHtml(inline?marked.parseInline(p.text,{gfm:true}):marked.parse(p.text,{gfm:true,breaks:false}));
  return injectMath(html,p.maths).html;
}
