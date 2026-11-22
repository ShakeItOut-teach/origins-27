/* Origins 27 · 19-carte.js
   La carte : caméra, zoom, dessin des cases, de la base et de la mini-carte.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Carte : caméra, pixels */
let cv=null,ctx=null,ro=null,drag=null;
const TS=8,ZOOMS=[13,21,31,45,71];
const HEX={prot:"#f3b562",lip:"#ef7fa6",nuc:"#a99bff"};

/* Profondeur : la lumière du soleil arrive petit à petit en remontant vers la terre ferme */

function hash2(x,y){let h=(x*374761393+y*668265263)|0;h=(h^(h>>>13))*1274126177|0;return (h^(h>>>16))>>>0;}
function landTile(px,py,x,y,dim){const r=rC(x,y),h=hash2(x,y),sh=(c)=>dim?mixHex(c,"#03070c",dim):c;
  if(r>LAND_R-2.2){ctx.fillStyle=sh(h&1?"#d2bb84":"#c4ad76");ctx.fillRect(px,py,TS-1,TS-1);if(h%7===0){ctx.fillStyle=sh("#e8d8b0");ctx.fillRect(px+2,py+5,2,1);}return;}
  const forest=r<LAND_R*0.55||h%9<2;ctx.fillStyle=sh(forest?"#2f5a2a":(h&1?"#4f8a3a":"#477f34"));ctx.fillRect(px,py,TS-1,TS-1);
  if(forest){ctx.fillStyle=sh("#1d3b1c");ctx.fillRect(px+1,py+1,4,3);ctx.fillStyle=sh("#3f7a34");ctx.fillRect(px+2,py+1,2,1);ctx.fillStyle=sh("#5a3a22");ctx.fillRect(px+3,py+4,1,2);}
  else if(h%5===0){ctx.fillStyle=sh("#8bc34a");ctx.fillRect(px+2,py+3,1,1);ctx.fillRect(px+5,py+5,1,1);}}
const DIR8=EN?["east","southeast","south","southwest","west","northwest","north","northeast"]:["est","sud-est","sud","sud-ouest","ouest","nord-ouest","nord","nord-est"],ARR8=["→","↘","↓","↙","←","↖","↑","↗"];
function dirTo(x0,y0,x1,y1){const a=Math.atan2(y1-y0,x1-x0),i=((Math.round(a/(Math.PI/4))%8)+8)%8;return i;}
function depthLight(x,y){const r=rC(x,y);return Math.pow(Math.max(0,Math.min(1,1-(r-LAND_R)/(RW-LAND_R))),1.7);}
const DEEP_RGB=[7,22,32],SHAL_RGB=[58,170,176],DBANDS=9,DCOL={};
function depthBand(x,y){return Math.round(Math.pow(depthLight(x,y),0.75)*DBANDS);}
function depthCol(b,dk){const k=b+":"+dk;if(DCOL[k])return DCOL[k];const t=b/DBANDS,f=1-dk*0.09,c=DEEP_RGB.map((v,i)=>Math.round((v+(SHAL_RGB[i]-v)*t)*f));return DCOL[k]="rgb("+c+")";}
const ZCOL={abyss:["#17435a","#123749","#0e2c3b"],deep:["#1d5670","#184a61","#143f53"],mid:["#24678a","#1f5b79","#1a4f69"],shallow:["#2f8a9a","#2a7c8b","#256f7d"],land:["#d2bb84","#c4ad76","#b59e68"]};
const ZMEM={abyss:["#0a1822","#0b1b26"],deep:["#0c1e2b","#0d212f"],mid:["#0f2636","#10293a"],shallow:["#143642","#163a47"],land:["#4a4230","#514835"]};
const THEX={tox:"#b8e05a",pha:"#4fc3f7",par:"#c77dff",enz:"#ff9e6b",har:"#e3e9ee"};
const WSPR={
  tox:["c..c..c",".ccccc.","ccwcwcc",".ccccc.","ccccccc",".c.c.c.","c.....c"],
  pha:["..ccc..",".ccccc.","cccwccc","ccccccc",".ccccc.","c.ccc.c","..c.c.."],
  par:["..ccc..",".cwcwc.","..ccc..","...c...","...c...",".c.c.c.","c..c..c"],
  enz:[".......",".ccccc.","cwccccc","ccccccc",".ccccwc","..c.c..",".c...c."],
  har:["c.....c",".c...c.","..ccc..",".cwcwc.","..ccc..",".c...c.","c.....c"]
};
const DSPR={1:["xx","xx"],2:[".xx.","xxxx","xxxx",".xx."],3:[".xxxx.","xxxxxx","xxxxxx","xxxxxx","xxxxxx",".xxxx."]};
function camInit(){if(!cam){const c=S.mig?[S.mig.fx,S.mig.fy]:cpos();cam={x:c[0]+0.5,y:c[1]+0.5};}camClamp();}
function camClamp(){const h=camVT/2;cam.x=Math.max(h,Math.min(W-h,cam.x));cam.y=Math.max(h,Math.min(H-h,cam.y));}
function camZoom(dz){let i=ZOOMS.indexOf(camVT);if(i<0)i=1;i=Math.max(0,Math.min(ZOOMS.length-1,i+dz));camVT=ZOOMS[i];if(cv){resize();camClamp();}}
function tileAt(e){if(!cv||!cam)return null;const b=cv.getBoundingClientRect(),x=Math.floor((e.clientX-b.left)/b.width*camVT+cam.x-camVT/2),y=Math.floor((e.clientY-b.top)/b.height*camVT+cam.y-camVT/2);return x<0||y<0||x>=W||y>=H?null:[x,y];}
function bindMap(){
  cv=$("map");ctx=cv.getContext("2d");if(!bindMap.z0){bindMap.z0=1;if(isMobile())camVT=ZOOMS[0];}camInit();resize();
  if(ro)ro.disconnect();if(window.ResizeObserver){ro=new ResizeObserver(()=>{resize();});ro.observe($("viewarea"));}
  cv.addEventListener("click",e=>{if(suppressClick){suppressClick=false;return;}const t=tileAt(e);if(!t)return;openRef="tile:"+t[0]+":"+t[1];dirty=true;});
  /* Pincer pour zoomer (deux doigts) */
  const pts=new Map();let pinch=null;
  const pd=()=>{const a=[...pts.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);};
  cv.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2){pinch={d:pd()};drag=null;suppressClick=true;clearTimeout(lpTimer);return;}drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,moved:false,id:e.pointerId};});
  const lift=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;};
  cv.addEventListener("pointerup",lift);cv.addEventListener("pointercancel",lift);
  cv.addEventListener("pointermove",e=>{
    if(pts.has(e.pointerId))pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pts.size===2){const d=pd(),r=d/Math.max(1,pinch.d);if(r>1.3){camZoom(-1);pinch.d=d;}else if(r<0.77){camZoom(1);pinch.d=d;}hideTip();return;}
    if(drag&&drag.id===e.pointerId&&(e.buttons||e.pointerType==="touch")){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&dx*dx+dy*dy>64){drag.moved=true;try{cv.setPointerCapture(e.pointerId);}catch(_){}}if(drag.moved){const b=cv.getBoundingClientRect();cam.x=drag.cx-dx/b.width*camVT;cam.y=drag.cy-dy/b.height*camVT;camClamp();hideTip();}return;}
    if(e.pointerType!=="mouse")return;const t=tileAt(e);if(t)showTip(tileTip(t[0],t[1]),e.clientX,e.clientY);else hideTip();});
  const end=e=>{if(drag&&drag.moved)suppressClick=true;drag=null;};
  cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",()=>{drag=null;});
  cv.addEventListener("pointerleave",hideTip);
  cv.addEventListener("wheel",e=>{e.preventDefault();camZoom(e.deltaY>0?1:-1);},{passive:false});
  const mc=$("mini");if(mc)mc.addEventListener("click",e=>{const b=mc.getBoundingClientRect();cam={x:(e.clientX-b.left)/b.width*W,y:(e.clientY-b.top)/b.height*H};camClamp();suppressClick=false;});
}
let mapU=1;
function resize(){if(!cv)return;const va=$("viewarea"),w=va.clientWidth-12,h=va.clientHeight-30,s=Math.max(200,Math.min(w,h,900)),dpr=window.devicePixelRatio||1,N=camVT*TS;mapU=Math.max(1,Math.floor(s*dpr/N));const D=N*mapU;if(cv.width!==D){cv.width=D;cv.height=D;}cv.style.width=D/dpr+"px";cv.style.height=D/dpr+"px";ctx.imageSmoothingEnabled=false;}
function sprite(rows,x0,y0,map,alpha){ctx.globalAlpha=alpha==null?1:alpha;rows.forEach((r,y)=>{for(let x=0;x<r.length;x++){const c=map[r[x]];if(c){ctx.fillStyle=c;ctx.fillRect(x0+x,y0+y,1,1);}}});ctx.globalAlpha=1;}
function pxLine(x0,y0,x1,y1,c,w,k){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1,m=Math.round(n*(k==null?1:k));ctx.fillStyle=c;for(let i=0;i<=m;i++)ctx.fillRect(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),w,w);}
/* Mini-skins des troupes en trajet (5 × 5 pixels de carte) : vos troupes se reconnaissent d’un coup d’œil ;
   les troupes ennemies, elles, n’apparaissent que comme une troupe basique rouge. o : contour, c : couleur, l : reflet */
const TROOP_PX={
  coll:[" ooo ","occco","oclco","occco"," ooo "],
  ecl:["oo   ","occo ","oclco","occo ","oo   "],
  port:["ooooo","ocllo","ocllo","occco","ooooo"],
  diat:["  o  "," oco ","oclco"," oco ","  o  "],
  siph:[" oco "," olo "," oco "," olo "," oco "],
  cten:[" ooo ","olclo","olclo","olclo"," ooo "],
  sold:["o o o"," ccc ","oclco"," ccc ","o o o"],
  tox:[" oo  ","occo ","oclco"," occo","   oo"],
  pha:[" o o ","occco"," clc ","occco"," o o "],
  par:[" ooo "," olo "," ooo ","  c  "," c c "],
  enz:["     ","ooooo","occlo","ooooo","     "],
  har:["    o","   co","  c  "," c   ","l    "],
  colo:[" lcl ","l   l","c   c","l   l"," lcl "],
  pluri:["     ","ococo","clclc","ococo","     "],
  anom:["o   o","oc co"," ccc "," clc ","o c o"]
};
const TROOP_ENEMY={rows:TROOP_PX.coll,map:{o:"#5a0f14",c:"#ff4d4d",l:"#ffb3b3"}};
function troopMain(u){let best=null,bn=0;for(const k in u||{}){const n=u[k]||0;if(!n||!UNITS[k])continue;if(n>bn||(n===bn&&UNITS[k].tier>UNITS[best].tier)){best=k;bn=n;}}return best||"coll";}
function troopDraw(k,X,Y){const U=UNITS[k]||UNITS.coll,rows=TROOP_PX[k]||TROOP_PX.coll;sprite(rows,X-2,Y-2,{o:shade(U.col,-0.55),c:U.col,l:shade(U.col,0.5)});}
let snowPx=[];
function draw(now,dtReal){
  if(tab!=="map"||!cv||!document.body.contains(cv))return;
  camInit();
  const N=camVT*TS,r=visR(),reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,t=reduce?0:now/1000;
  const left=cam.x-camVT/2,top=cam.y-camVT/2,PX=x=>Math.round((x-left)*TS),PY=y=>Math.round((y-top)*TS);
  ctx.setTransform(mapU,0,0,mapU,0,0);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle="#03070c";ctx.fillRect(0,0,N,N);
  if(snowPx.length!==60)snowPx=Array.from({length:60},()=>({x:Math.random(),y:Math.random(),v:0.01+Math.random()*0.02}));
  snowPx.forEach(p=>{if(!reduce){p.y+=p.v*dtReal;if(p.y>1){p.y=0;p.x=Math.random();}}const wx=Math.floor(left+p.x*camVT),wy=Math.floor(top+p.y*camVT),Lp=depthLight(wx,wy);ctx.fillStyle="rgba("+(Lp>0.5?"255,240,200":"170,210,225")+","+(0.18+0.3*Lp).toFixed(2)+")";ctx.fillRect(Math.floor(p.x*N),Math.floor(p.y*N),1,1);});
  const x0=Math.max(0,Math.floor(left)-1),x1=Math.min(W-1,Math.ceil(left+camVT)),y0=Math.max(0,Math.floor(top)-1),y1=Math.min(H-1,Math.ceil(top+camVT));
  const c=cpos();
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const T=S.tiles[y*W+x],d=dist(x,y),vis=d<=r+0.45,px=PX(x),py=PY(y);
    const z=zoneOf(x,y);
    if(z==="void"){ctx.fillStyle=((x*7+y*3)%5===0)?"#1d1712":"#15110d";ctx.fillRect(px,py,TS,TS);if((x*13+y*7)%11===0){ctx.fillStyle="#2a221a";ctx.fillRect(px+2,py+3,2,1);}continue;}
    if(vis){const q=d/(r+0.5),dk=q<0.4?0:q<0.75?1:2;
      if(z==="land")landTile(px,py,x,y,dk*0.08);
      else{const b=depthBand(x,y),L=b/DBANDS;ctx.fillStyle=depthCol(b,dk);ctx.fillRect(px,py,TS-1,TS-1);
        if(L>0.3){const ph=((x-y)+Math.floor(t*0.8))%11,ph2=((x-y)*2+Math.floor(t*1.3))%17;if(ph===0||ph2===0){ctx.fillStyle="rgba(255,244,200,"+(0.05+0.16*(L-0.3)).toFixed(3)+")";for(let k=0;k<TS-1;k++)ctx.fillRect(px+k,py+TS-2-k,1,1);}}
        else if(L<0.18&&((x*31+y*17+Math.floor(t*0.7))%53===0)){ctx.fillStyle=((x+y)&1)?"#5ee6d0":"#a99bff";ctx.fillRect(px+3,py+3,1,1);}}
      ctx.fillStyle="rgba(255,255,255,"+(z==="land"?.06:(0.02+0.07*depthLight(x,y))).toFixed(3)+")";ctx.fillRect(px,py,TS-1,1);
      if(z==="shallow"&&((x+y+Math.floor(t*2))%6===0)){ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(px+1,py+3,3,1);}}
    else if(T.s){if(z==="land")landTile(px,py,x,y,0.35);else{ctx.fillStyle=depthCol(depthBand(x,y),5+((x+y)&1));ctx.fillRect(px,py,TS-1,TS-1);}}
    else{if(z==="land")landTile(px,py,x,y,0.62);else{ctx.fillStyle=depthCol(depthBand(x,y),8);ctx.fillRect(px,py,TS,TS);if(((x+y)&3)===0){ctx.fillStyle=depthCol(depthBand(x,y),6);ctx.fillRect(px+3,py+3,1,1);}}}
  }
  { const lx=PX(C0)+4,ly=PY(C0)+4,lt=S.tiles[C0*W+C0];if(lt.s||dist(C0,C0)<=r+LAND_R)sprDraw("t_land",lx,ly,lt.s&&dist(C0,C0)>r+LAND_R?0.6:1); }
  if(S.bots)for(const b of S.bots){if(b.x<x0-2||b.x>x1+2||b.y<y0-2||b.y>y1+2)continue;const T=S.tiles[b.y*W+b.x],v=dist(b.x,b.y)<=r+0.45;if(!v&&!T.s)continue;
    const bx=PX(b.x)+4,by=PY(b.y)+4,st=botStage(b),R=Math.ceil(SPR[STAGE_SPR[st]][0]/2)+2,col=nightAt(S.t)?"#7aa8ff":b.anger>0.3?"#ff4d4d":b.aggr>0.6?"#ff8a3d":"#e8c46a";
    ctx.globalAlpha=v?1:0.55;ctx.fillStyle=col;for(let a=0;a<360;a+=10){ctx.fillRect(Math.round(bx+Math.cos(a*Math.PI/180)*R),Math.round(by+Math.sin(a*Math.PI/180)*R),1,1);}ctx.globalAlpha=1;sprDraw(STAGE_SPR[st],bx,by,v?1:0.55);}
  if(S.inc)for(const A of S.inc){const b=S.bots.find(z=>z.id===A.bot);if(!b)continue;const f=Math.min(1,Math.max(0,1-(A.arrive-S.t)/Math.max(6,Math.hypot(b.x-c[0],b.y-c[1])*1.6))),sx=PX(A.from[0])+4,sy=PY(A.from[1])+4,tx=PX(c[0])+4,ty=PY(c[1])+4;
    ctx.fillStyle="rgba(255,77,77,.45)";for(let i=0;i<=24;i+=2)ctx.fillRect(Math.round(sx+(tx-sx)*i/24),Math.round(sy+(ty-sy)*i/24),1,1);sprite(TROOP_ENEMY.rows,Math.round(sx+(tx-sx)*f)-2,Math.round(sy+(ty-sy)*f)-2,TROOP_ENEMY.map);}
  { const vx=C0+0.5-cam.x,vy=C0+0.5-cam.y,dd=Math.hypot(vx,vy);if(dd>camVT/2-1){const ux=vx/dd,uy=vy/dd,h=N/2-10,k=Math.min(h/Math.max(Math.abs(ux),1e-3),h/Math.max(Math.abs(uy),1e-3)),ax=Math.round(N/2+ux*k),ay=Math.round(N/2+uy*k),pulse=reduce?1:0.65+0.35*Math.sin(t*3);
      const q=Math.max(1,Math.round(camVT/16));ctx.globalAlpha=pulse;ctx.fillStyle="#ffe9a8";for(let i=0;i<7;i++){const w=7-i;for(let j=-Math.floor(w/2);j<=Math.floor(w/2);j++)ctx.fillRect(Math.round(ax+(ux*(i-3)-uy*j)*q),Math.round(ay+(uy*(i-3)+ux*j)*q),q,q);}
      for(let i=4;i<14;i+=2)ctx.fillRect(Math.round(ax-ux*i*q),Math.round(ay-uy*i*q),q,q);ctx.globalAlpha=1;}}
  // filaments
  const cx0=PX(c[0])+3,cy0=PY(c[1])+3;
  S.fils.forEach(f=>pxLine(cx0,cy0,PX(f.x)+3,PY(f.y)+3,"#5ee6d0",2));
  if(S.build&&S.build.type==="fil")pxLine(cx0,cy0,PX(S.build.x)+3,PY(S.build.y)+3,"rgba(94,230,208,.55)",2,Math.max(0.05,Math.min(1,(S.t-S.build.start)/(S.build.end-S.build.start))));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const T=S.tiles[y*W+x],d=dist(x,y),vis=d<=r+0.45,px=PX(x),py=PY(y);
    if(!vis&&!T.s)continue;
    if(!inWorld(x,y)||isLand(x,y))continue;
    const al=vis?1:0.5;
    if(T.k){const amt=vis?T.a:T.m,col=HEX[T.k];
      if(amt<=1){ctx.globalAlpha=al*0.6;ctx.fillStyle=col;ctx.fillRect(px+3,py+3,1,1);ctx.globalAlpha=1;}
      else{const sz=T.rich?3:amt<300?1:amt<800?2:3,spr=DSPR[sz],o=Math.floor((7-spr.length)/2);sprite(spr,px+o,py+o,{x:col},al);ctx.globalAlpha=al;ctx.fillStyle="#ffffff";ctx.fillRect(px+o+1,py+o+(sz>1?1:0),1,1);
        if(T.rich&&(Math.floor(t*3+x+y)%3===0)){ctx.fillStyle="#ffe07a";ctx.fillRect(px,py,1,1);ctx.fillRect(px+6,py+6,1,1);}ctx.globalAlpha=1;}}
    if(T.w&&!sprDraw("w_"+T.w.type,px+3.5,py+3.5,al))sprite(WSPR[T.w.type],px,py,{c:THEX[T.w.type],w:"#06111a"},al);
    if(S.fils.some(f=>f.x===x&&f.y===y)){ctx.fillStyle="#5ee6d0";ctx.fillRect(px,py,TS-1,1);ctx.fillRect(px,py+TS-2,TS-1,1);}
  }
  // événements de zone
  (S.events||[]).forEach(e=>{const E=EVENTS[e.type],ex=PX(e.x)+3,ey=PY(e.y)+3,rr=(e.r+0.5)*TS,pulse=reduce?1:0.55+0.45*Math.sin(t*2.5);
    ctx.globalAlpha=0.18;ctx.fillStyle=E.col;if(e.type==="anox"){for(let yy=-rr;yy<=rr;yy+=2)for(let xx=-rr;xx<=rr;xx+=2){if(xx*xx+yy*yy<=rr*rr&&((xx+yy)/2)%2===0)ctx.fillRect(Math.round(ex+xx),Math.round(ey+yy),1,1);}}
    ctx.globalAlpha=pulse;for(let a=0;a<360;a+=4){ctx.fillRect(Math.round(ex+Math.cos(a*Math.PI/180)*rr),Math.round(ey+Math.sin(a*Math.PI/180)*rr),1,1);}
    ctx.globalAlpha=1;ctx.fillStyle=E.col;ctx.fillRect(ex-1,ey-6,3,3);ctx.fillRect(ex,ey-8,1,1);});
  // vision
  ctx.fillStyle="rgba(94,230,208,.35)";for(let a=0;a<360;a+=6){const rr=(r+0.45)*TS,X=Math.round(cx0+Math.cos(a*Math.PI/180)*rr),Y=Math.round(cy0+Math.sin(a*Math.PI/180)*rr);ctx.fillRect(X,Y,1,1);}
  // sélection
  if(openRef&&openRef.indexOf("tile:")===0){const p=openRef.split(":"),sx=PX(+p[1])-1,sy=PY(+p[2])-1;ctx.fillStyle="#ffffff";ctx.fillRect(sx,sy,TS+1,1);ctx.fillRect(sx,sy+TS,TS+1,1);ctx.fillRect(sx,sy,1,TS+1);ctx.fillRect(sx+TS,sy,1,TS+1);}
  // missions
  S.missions.forEach(M=>{const tx=PX(M.x)+3,ty=PY(M.y)+3;let f=!M.arrived?(S.t-M.depart)/Math.max(0.001,M.arrive-M.depart):(M.cancelled?(M.back-S.t)/Math.max(0.001,M.back-M.arrive)*((M.arrive-M.depart)/Math.max(0.001,dist(M.x,M.y)*tileTime())):1-(S.t-M.arrive)/Math.max(0.001,M.back-M.arrive));f=Math.max(0,Math.min(1,f));
    ctx.fillStyle=M.kind!=="collect"?"rgba(255,138,122,.35)":"rgba(94,230,208,.25)";for(let i=0;i<=20;i+=2){ctx.fillRect(Math.round(cx0+(tx-cx0)*i/20),Math.round(cy0+(ty-cy0)*i/20),1,1);}
    const ck=M.cargo&&Object.keys(M.cargo)[0],X=Math.round(cx0+(tx-cx0)*f),Y=Math.round(cy0+(ty-cy0)*f);
    troopDraw(troopMain(M.u||{coll:M.n}),X,Y);
    if(M.arrived&&ck&&HEX[ck]){ctx.fillStyle=HEX[ck];ctx.fillRect(X+2,Y+1,2,2);}
    if(M.hero){ctx.fillStyle="#ffe07a";ctx.fillRect(X+2,Y-3,2,2);}});
  // cellule
  let ccx=cx0,ccy=cy0;
  if(S.mig){const k=Math.max(0,Math.min(1,(S.t-S.mig.start)/(S.mig.end-S.mig.start)));ccx=Math.round(PX(S.mig.fx)+3+(PX(S.mig.x)-PX(S.mig.fx))*k);ccy=Math.round(PY(S.mig.fy)+3+(PY(S.mig.y)-PY(S.mig.fy))*k);ctx.fillStyle="rgba(255,224,122,.6)";for(let i=0;i<=20;i+=2)ctx.fillRect(Math.round(ccx+(PX(S.mig.x)+3-ccx)*i/20),Math.round(ccy+(PY(S.mig.y)+3-ccy)*i/20),1,1);}
  drawBase(ccx,ccy,t);
  const co=$("mapcoord");if(co)co.textContent=tr("Votre base : ","Your base: ")+c[0]+","+c[1]+" · "+ZONE_NAME[zoneOf(c[0],c[1])]+tr(", à ",", ")+Math.round(rC(c[0],c[1]))+tr(" cases du centre (terre ferme : "," tiles from the center (dry land: ")+Math.max(0,Math.round(rC(c[0],c[1])-LAND_R))+tr(" cases "," tiles ")+ARR8[dirTo(c[0],c[1],C0,C0)]+" "+DIR8[dirTo(c[0],c[1],C0,C0)]+") · ≈ "+fmt(depthM(c[0],c[1]))+tr(" m, lumière "," m, light ")+Math.round(depthLight(c[0],c[1])*100)+PCT+tr(" · stade "," · stage ")+baseStage()+"/5 ("+STAGE_NAME[baseStage()]+")";
  if(!draw._m||now-draw._m>700){draw._m=now;drawMini();}
}

/* La base sur la carte : 5 stades selon le noyau */
function baseStage(){return Math.min(5,1+Math.floor((S.noyau-1)/2));}
function pcirc(cx,cy,r,fill,line){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const q=dx*dx+dy*dy;if(q<=r*r+r*0.6){ctx.fillStyle=q>=(r-1)*(r-1)+(r-1)*0.6?line:fill;ctx.fillRect(cx+dx,cy+dy,1,1);}}}
function drawBase(x,y,t){
  const st=baseStage(),L="#5ee6d0",F="#12474a",F2="#0e3a3c",blink=Math.floor(t*2)%2;
  let R=4,my=y;
  if(st>=5){ctx.fillStyle="rgba(94,230,208,.45)";for(let a=0;a<360;a+=10){const X=Math.round(x+Math.cos(a*Math.PI/180)*13),Y=Math.round(y+Math.sin(a*Math.PI/180)*12);ctx.fillRect(X,Y,1,1);}}
  if(st>=4){ctx.fillStyle="#e3e9ee";const n=st>=5?16:12,rr=st>=5?11:9;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;ctx.fillRect(Math.round(x+Math.cos(a)*rr),Math.round(y+Math.sin(a)*rr),1,1);ctx.fillRect(Math.round(x+Math.cos(a)*(rr+1)),Math.round(y+Math.sin(a)*(rr+1)),1,1);}}
  const useSpr=SPRI[STAGE_SPR[st]]&&SPRI[STAGE_SPR[st]].complete&&SPRI[STAGE_SPR[st]].naturalWidth;
  if(useSpr){
    R=Math.ceil(SPR[STAGE_SPR[st]][0]/2);my=y;
    if(st>=2){ctx.fillStyle="rgba(94,230,208,.35)";const rr=R+2;for(let a=0;a<360;a+=12)ctx.fillRect(Math.round(x+Math.cos(a*Math.PI/180)*rr),Math.round(my+Math.sin(a*Math.PI/180)*rr),1,1);}
    if(has("M2a")){ctx.fillStyle=L;for(let i=0;i<6;i++)ctx.fillRect(x-R-1-i,my+R+i+(Math.floor(t*6+i)%2),1,1);}
    sprDraw(STAGE_SPR[st],x,my);
    if(st>=5){ctx.fillStyle=blink?"#ffe07a":"#a99bff";ctx.fillRect(x,my-R-3,1,2);}
    if(has("PT")){ctx.fillStyle="#b8e05a";ctx.fillRect(x+R-1,my-R,2,2);}
    if(has("PA")){ctx.fillStyle="#e3e9ee";[[-1,0],[1,0],[0,-1],[0,1]].forEach(d=>ctx.fillRect(x+d[0]*(R+2),my+d[1]*(R+2),1,1));}
    return;
  }
  if(st>=5){[[-7,4,4],[7,4,4],[0,7,4],[-5,-5,3],[5,-5,3]].forEach(c=>pcirc(x+c[0],y+c[1],c[2],F2,L));}
  else if(st>=4){[[-5,4,3],[5,4,3],[-4,-4,2],[4,-4,2],[0,6,3]].forEach(c=>pcirc(x+c[0],y+c[1],c[2],F2,L));}
  else if(st>=3){[[-5,3,3],[5,3,3]].forEach(c=>pcirc(x+c[0],y+c[1],c[2],F2,L));}
  if(st>=2){ctx.fillStyle="rgba(94,230,208,.35)";const rr=st>=3?7:6;for(let a=0;a<360;a+=15)ctx.fillRect(Math.round(x+Math.cos(a*Math.PI/180)*rr),Math.round(my-1+Math.sin(a*Math.PI/180)*rr),1,1);}
  R=st===1?4:st===2?5:st===3?5:6;my=st>=3?y-1:y;
  if(has("M2a")){ctx.fillStyle=L;for(let i=0;i<6;i++)ctx.fillRect(x-R-1-i,my+R+i+(Math.floor(t*6+i)%2),1,1);}
  if(has("E2a")){ctx.fillStyle="#3f9a4a";ctx.fillRect(x-R-4,my-3,3,2);ctx.fillRect(x+R+1,my+1,3,2);}
  if(st>=5){for(let dy=-8;dy<=6;dy++)for(let dx=-5;dx<=5;dx++){const q=(dx/5)**2+(dy/7.5)**2;if(q<=1){ctx.fillStyle=q>0.78?L:F;ctx.fillRect(x+dx,my-1+dy,1,1);}}ctx.fillStyle=blink?"#ffe07a":"#a99bff";ctx.fillRect(x,my-10,1,2);}
  else pcirc(x,my,R,F,L);
  ctx.fillStyle="#a99bff";ctx.fillRect(x-1,my-1,2,2);
  if(st>=2){ctx.fillStyle="#ffe07a";ctx.fillRect(x+2,my+1,1,1);ctx.fillStyle="#f3b562";ctx.fillRect(x-2,my+2,1,1);ctx.fillStyle="#ef7fa6";ctx.fillRect(x+1,my-3,1,1);}
  if(has("PT")){ctx.fillStyle="#b8e05a";ctx.fillRect(x+R-2,my-R,2,2);}
  if(has("PA")){ctx.fillStyle="#e3e9ee";[[-1,0],[1,0],[0,-1],[0,1]].forEach(d=>ctx.fillRect(x+d[0]*(R+2),my+d[1]*(R+2),1,1));}
  if(has("P1")){ctx.fillStyle="#9fd8cf";[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(d=>ctx.fillRect(x+d[0]*(R+1),my+d[1]*(R+1),1,1));}
}
let MINI_BG=null;
function drawMini(){const mc=$("mini");if(!mc||!S)return;const g=mc.getContext("2d");
  if(!MINI_BG){MINI_BG=g.createImageData(W,H);const a=MINI_BG.data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const z=zoneOf(x,y),i=(y*W+x)*4;let c;
      if(z==="void")c=[22,17,13];else if(z==="land")c=rC(x,y)>LAND_R-2.2?[200,180,128]:rC(x,y)<LAND_R*0.55?[47,90,42]:[79,138,58];
      else{const b=depthBand(x,y),tt=b/DBANDS;c=DEEP_RGB.map((v,j)=>Math.round(v+(SHAL_RGB[j]-v)*tt*0.85));
        const rr=rC(x,y);if([ZB.shallow,ZB.mid,ZB.deep].some(R=>Math.abs(rr-R)<0.6))c=c.map(v=>Math.min(255,v+14));
        if(tt>0.3&&(x-y+300)%9===0)c=c.map(v=>Math.min(255,v+Math.round(18*(tt-0.3))));}
      a[i]=c[0];a[i+1]=c[1];a[i+2]=c[2];a[i+3]=255;}}
  if(!drawMini.buf)drawMini.buf=g.createImageData(W,H);const B=drawMini.buf.data,M=MINI_BG.data;for(let i=0;i<W*H;i++){const o=i*4,f=S.tiles[i].s?1:0.5;B[o]=M[o]*f;B[o+1]=M[o+1]*f;B[o+2]=M[o+2]*f;B[o+3]=255;}
  g.putImageData(drawMini.buf,0,0);
  if(cam){g.strokeStyle="rgba(255,255,255,.7)";g.lineWidth=1;g.strokeRect(Math.round(cam.x-camVT/2)+0.5,Math.round(cam.y-camVT/2)+0.5,camVT,camVT);}
  if(S.bots){for(const b of S.bots)if(S.tiles[b.y*W+b.x].s){g.fillStyle=S.ally&&b.tag===S.ally?"#5ee6d0":"#ff6a4d";g.fillRect(b.x-1,b.y-1,3,3);}}
  (S.events||[]).forEach(e=>{g.strokeStyle=EVENTS[e.type].col;g.lineWidth=1.5;g.beginPath();g.arc(e.x+0.5,e.y+0.5,e.r+1.5,0,Math.PI*2);g.stroke();});
  const c=cpos();g.fillStyle="#03070c";g.fillRect(c[0]-3,c[1]-3,7,7);g.fillStyle="#ffe07a";g.fillRect(c[0]-2,c[1]-2,5,5);}

