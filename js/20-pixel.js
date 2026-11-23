/* Origins 27 · 20-pixel.js
   Rendu pixel art : conversion des dessins en pixels et cellule dessinée case par case.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Pixel art : rendu des dessins vectoriels en pixels */
function isPixel(){return document.body.classList.contains("pixel");}
function setStyle(st){document.body.classList.toggle("pixel",st==="pixel");try{localStorage.setItem("o27-style",st);}catch(e){}dirty=true;const pk=$("picker");if(pk&&pk.querySelector(".intro")){const cur=[...pk.querySelectorAll(".dots i")].findIndex(d=>d.classList.contains("on"));showIntro(cur);}else if(pk&&pk.querySelector(".strains"))showPicker();else if(pk&&pk.querySelector(".title"))showTitle();}
function cssVars(svg){const cs=getComputedStyle(document.documentElement);return svg.replace(/var\(--([\w-]+)\)/g,(m,k)=>cs.getPropertyValue("--"+k).trim()||"#ffffff");}
const RCACHE=new Map();
function upscale(src,dest,cssMax){const dpr=window.devicePixelRatio||1,u=Math.max(1,Math.floor(cssMax*dpr/src.width+1e-3));dest.width=src.width*u;dest.height=src.height*u;const g=dest.getContext("2d");g.imageSmoothingEnabled=false;g.drawImage(src,0,0,dest.width,dest.height);dest.style.width=dest.width/dpr+"px";dest.style.height=dest.height/dpr+"px";}
function rasterize(svg,w,h,cb){
  const key=w+"x"+h+":"+svg;if(RCACHE.has(key)){cb(RCACHE.get(key));return;}
  const img=new Image();
  img.onload=()=>{const K=4,big=document.createElement("canvas");big.width=w*K;big.height=h*K;const gb=big.getContext("2d");gb.drawImage(img,0,0,w*K,h*K);
    const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");
    try{const sd=gb.getImageData(0,0,w*K,h*K).data,out=g.createImageData(w,h),o=out.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=((y*K+K/2)*w*K+(x*K+K/2))*4,di=(y*w+x)*4;if(sd[si+3]<128)continue;o[di]=sd[si];o[di+1]=sd[si+1];o[di+2]=sd[si+2];o[di+3]=255;}g.putImageData(out,0,0);}catch(e){g.imageSmoothingEnabled=false;g.drawImage(big,0,0,w,h);}
    RCACHE.set(key,c);if(RCACHE.size>90)RCACHE.delete(RCACHE.keys().next().value);cb(c);};
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(cssVars(svg));
}
const PXS={};let pxN=0;
function artBox(key,svg,w,h){if(!isPixel())return svg;const k=key+"-"+(++pxN);PXS[k]={svg,w,h};return '<canvas class="pxc" data-px="'+k+'" width="'+w+'" height="'+h+'"></canvas>';}
function pxify(root){(root||document).querySelectorAll("canvas[data-px]").forEach(cn=>{const o=PXS[cn.dataset.px];if(!o)return;delete PXS[cn.dataset.px];rasterize(o.svg,o.w,o.h,c=>{const pe=cn.parentElement,pw=pe?pe.clientWidth:o.w*3,ph=pe&&pe.clientHeight?pe.clientHeight:pw*o.h/o.w,avail=Math.min(pw,ph*o.w/o.h);upscale(c,cn,avail);});});}
const CELL_RES=220;

/* Cellule dessinée en pixels par le jeu : une grille fixe de 220 × 220, des couches indépendantes.
   Chaque couleur vient d’un thème (skin) : on peut changer l’apparence sans toucher aux règles. */
const CELL_SKINS={
  abyssa:{name:"Abyssale",memLine:"#5fd3c4",memFill:"#1b4a4c",memDark:"#0f2d33",cyto:"#0c2128",speck:"#1f4650",plate:"#123039",plateLine:"#3b7a80",accent:"#5fd3c4"},
  kori:{name:"Banquise",memLine:"#a8dcf2",memFill:"#25475c",memDark:"#132a3a",cyto:"#0b1c28",speck:"#24445a",plate:"#132b3b",plateLine:"#4a7f9c",accent:"#a8dcf2"},
  varenne:{name:"Source chaude",memLine:"#e9b86c",memFill:"#4f3a22",memDark:"#2c2014",cyto:"#17150f",speck:"#3a3020",plate:"#2a2216",plateLine:"#8a6a3c",accent:"#e9b86c"},
  ilheu:{name:"Mangrove",memLine:"#8fd36b",memFill:"#2f4a24",memDark:"#1a2a15",cyto:"#0f1a10",speck:"#2a3d22",plate:"#18291a",plateLine:"#4f7f3c",accent:"#8fd36b"}
};
const CELL_SHADOW="#03070b",CELL_LOCK="#08161c",CELL_LOCKLINE="#16303a",CELL_LOCKICON="#2f4f58";
function cellSkin(){return CELL_SKINS[(S&&S.skin)||(S&&S.souche)]||CELL_SKINS.abyssa;}
function cpx(u){return Math.round((u+50)/3);}
function pxDisc(g,cx,cy,r,fill,line){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const q=x*x+y*y;if(q<=r*r+r*0.5){g.fillStyle=line&&q>(r-1)*(r-1)+(r-1)*0.5?line:fill;g.fillRect(cx+x,cy+y,1,1);}}}
function pxRing(g,cx,cy,r1,r2,col){g.fillStyle=col;for(let y=-r2;y<=r2;y++)for(let x=-r2;x<=r2;x++){const d=Math.hypot(x,y);if(d>=r1&&d<r2)g.fillRect(cx+x,cy+y,1,1);}}
function mixHex(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=p(a),B=p(b);return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("");}
function cellBaseLayer(g){
  const K0=cellSkin(),Lh=hereLight(),K=Object.assign({},K0,{cyto:mixHex(K0.cyto,"#3aaab0",Lh*0.22),speck:mixHex(K0.speck,"#fff4c8",Lh*0.3)}),C=110;
  pxDisc(g,C,C+2,82,CELL_SHADOW);
  pxRing(g,C,C,74,82,K.memDark);
  pxRing(g,C,C,75,81,K.memFill);
  pxRing(g,C,C,80,81.2,K.memLine);
  pxRing(g,C,C,75,76,mixHex(K.memLine,K.memFill,.45));
  pxDisc(g,C,C,74,K.cyto);
  let sd=S?((S.souche||"").length*7+3):3;const rnd=()=>{sd=(sd*9301+49297)%233280;return sd/233280;};
  g.fillStyle=K.speck;for(let i=0;i<70;i++){const a=rnd()*Math.PI*2,r=8+rnd()*62,x=Math.round(C+Math.cos(a)*r),y=Math.round(C+Math.sin(a)*r);g.fillRect(x,y,1+(i%3===0),1);}
}
function cellTopLayer(g){
  const K=cellSkin(),cs=getComputedStyle(document.documentElement),RC={};["atp","prot","lip","nuc"].forEach(k=>RC[k]=(cs.getPropertyValue("--"+k).trim()||"#ffffff"));
  const C0=280,mem=233;
  S.fields.forEach((f,i)=>{const a=fAng(i),x=cpx(C0+Math.cos(a)*mem),y=cpx(C0+Math.sin(a)*mem),col=f.l?RC[f.k]:mixHex(RC[f.k],K.memDark,.62);
    pxDisc(g,x,y+1,9,CELL_SHADOW);pxDisc(g,x,y,9,K.memDark,"#050b12");pxDisc(g,x,y,6,col);
    g.fillStyle=mixHex(col,"#ffffff",.55);g.fillRect(x-4,y-4,2,3);g.fillRect(x-2,y-5,2,1);
    g.fillStyle=mixHex(col,"#000000",.45);g.fillRect(x-1,y-3,2,7);});
  for(let i=0;i<SLOT_COUNT;i++){
    const a=-Math.PI/2+Math.PI/8+i*Math.PI/4,x=cpx(C0+Math.cos(a)*138),y=cpx(C0+Math.sin(a)*138),sl=S.slots[i];
    const building=S.build&&S.build.type==="new"&&S.build.i===i;
    if(sl||building){pxDisc(g,x,y+2,14,CELL_SHADOW);pxDisc(g,x,y,14,K.plate,K.plateLine);pxRing(g,x,y,12,13,mixHex(K.plate,K.plateLine,.35));
      const k=ORG_SPR[sl?sl.k:S.build.k],im=SPRI[k];if(im&&im.complete&&im.naturalWidth){g.globalAlpha=sl?1:.45;g.drawImage(im,Math.round(x-im.naturalWidth/2),Math.round(y-im.naturalHeight/2));g.globalAlpha=1;}}
    else if(slotOpen(i)){pxDisc(g,x,y,13,mixHex(K.cyto,K.plate,.5));g.fillStyle=K.accent;for(let d=0;d<360;d+=15){const r=d*Math.PI/180;g.fillRect(Math.round(x+Math.cos(r)*12),Math.round(y+Math.sin(r)*12),1,1);}
      g.fillRect(x-3,y,7,1);g.fillRect(x,y-3,1,7);}
    else{const LK=mixHex(K.cyto,"#000000",.35),LL=mixHex(K.memDark,K.plateLine,.25);pxDisc(g,x,y,13,LK,LL);g.fillStyle=mixHex(K.plateLine,K.cyto,.45);g.fillRect(x-2,y-5,5,1);g.fillRect(x-3,y-4,1,3);g.fillRect(x+3,y-4,1,3);g.fillRect(x-4,y-1,9,6);g.fillStyle=LK;g.fillRect(x,y+1,1,2);}
  }
  const C=110,im=SPRI.o_noyau;pxDisc(g,C,C+2,20,CELL_SHADOW);pxDisc(g,C,C,20,K.plate,K.plateLine);
  if(im&&im.complete&&im.naturalWidth)g.drawImage(im,C-Math.round(im.naturalWidth/2),C-Math.round(im.naturalHeight/2));
}
function evoLayerSVG(){const C=280,mem=233,defs=(bodySVG(C,mem).match(/<defs>[\s\S]*?<\/defs>/)||[""])[0];return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 660 660">'+defs+evoOuter(C,mem)+evoInner(C,mem)+"</svg>";}
function drawCellStage(){
  rasterize(evoLayerSVG(),CELL_RES,CELL_RES,ev=>{const t=$("pxart"),st=$("pxstage");if(!t||!st)return;
    const out=document.createElement("canvas");out.width=out.height=CELL_RES;const g=out.getContext("2d");g.imageSmoothingEnabled=false;
    cellBaseLayer(g);g.drawImage(ev,0,0);cellTopLayer(g);t._src=out;upscale(out,t,parseFloat(st.style.width)||600);});
}

function sizeStage(){const st=$("pxstage");if(!st)return;const va=$("viewarea"),s=Math.max(240,Math.min(va.clientWidth-12,va.clientHeight-12)),dpr=window.devicePixelRatio||1,u=Math.max(1,Math.floor(s*dpr/CELL_RES+1e-3)),css=CELL_RES*u/dpr;st.style.width=css+"px";st.style.height=css+"px";const t=$("pxart");if(t&&t._src)upscale(t._src,t,css);}

/* Thème : « lab » (carnet de laboratoire, par défaut) ou « abyss » (l'ancien thème sombre). */
function getTheme(){try{return localStorage.getItem("o27-theme")==="abyss"?"abyss":"lab";}catch(e){return "lab";}}
function setTheme(th){document.body.classList.toggle("lab",th==="lab");try{localStorage.setItem("o27-theme",th);}catch(e){}const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=th==="lab"?"#f3ecdc":"#02060b";dirty=true;}
