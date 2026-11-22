/* Origins 27 · 06-etat.js
   État de la partie (variable S), nouvelle partie et bonus cumulés (mods).
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
let lastTab=null;
let S=null,openRef=null,tab="cell",resetArmUntil=0,dirty=true,suppressClick=false,evoBr="E",actSub="move",cam=null,camVT=21;
function shownN(){return Math.max(1,Math.min(S.selN||1,Math.max(1,S.idle)));}
function isMobile(){return !!(window.matchMedia&&window.matchMedia("(max-width:820px)").matches);}

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function cpos(){return S&&S.px!=null?[S.px,S.py]:pendingStart||[C0,C0];}
function dist(x,y){const c=cpos();return Math.hypot(x-c[0],y-c[1]);}
function has(id){return S.nodes.indexOf(id)>=0;}
function hasEm(id){return S.emerg.indexOf(id)>=0;}
function blvl(k){if(k==="noyau")return S.noyau;const s=S.slots.find(x=>x&&x.k===k);return s?s.l:0;}
function fmaxlvl(k){return S.fields.reduce((a,f)=>f.k===k?Math.max(a,f.l):a,0);}
function ownedTypes(){return TYPE_ORDER.filter(t=>has(TYPES[t].node));}
function glvl(id){return has(id)?(S.glv[id]||1):0;}
function maxLvl(id){return STAGE_NODES[id]?1:10;}
function scaledEff(id,L){const e=NODES[id].eff,o={};for(const k in e){const v=e[k];if(k==="revealSource")o[k]=v;else if(ADD_KEYS[k])o[k]=v+(v>0?Math.floor((L-1)/3):0);else o[k]=Math.round(v*(1+0.2*(L-1))*1000)/1000;}return o;}

function newGame(seed,souche){
  S=null;
  const rng=mulberry32(seed),pick=a=>a[Math.floor(rng()*a.length)];
  const sa=rng()*Math.PI*2,sr=RW-19+rng()*16,stx=Math.round(C0+Math.cos(sa)*sr),sty=Math.round(C0+Math.sin(sa)*sr);pendingStart=[stx,sty];
  const tiles=[];
  for(let i=0;i<W*H;i++)tiles.push({k:null,a:0,max:0,m:0,s:0,rich:false,w:null});
  const ok=(x,y)=>inWorld(x,y)&&!isLand(x,y);
  const put=(x,y,k,a,rich)=>{const t=tiles[y*W+x];t.k=k;t.a=a;t.max=a;t.m=a;t.rich=!!rich;};
  const kind=()=>{const r=rng();return r<0.45?"prot":r<0.8?"lip":"nuc";};
  let n=0;
  while(n<Math.round(620*AREA_F)){const x=Math.floor(rng()*W),y=Math.floor(rng()*H);if(!ok(x,y)||dist(x,y)<1||tiles[y*W+x].k)continue;put(x,y,kind(),Math.round(150+rng()*450+cen(x,y)*12));n++;}
  const near=r=>{let c=0;for(let y=sty-4;y<=sty+4;y++)for(let x=stx-4;x<=stx+4;x++){if(x>=0&&y>=0&&x<W&&y<H&&tiles[y*W+x].k&&dist(x,y)<=r)c++;}return c;};
  const ring=(r0,r1,cx,cy)=>{const c=[];const R=Math.ceil(r1);for(let y=Math.max(0,cy-R);y<=Math.min(H-1,cy+R);y++)for(let x=Math.max(0,cx-R);x<=Math.min(W-1,cx+R);x++){const d=Math.hypot(x-cx,y-cy);if(d>=r0&&d<=r1&&ok(x,y)&&!tiles[y*W+x].k&&!tiles[y*W+x].w)c.push([x,y]);}return c;};
  if(near(1.5)<1){const p=pick(ring(0.9,1.5,stx,sty));put(p[0],p[1],"prot",300);}
  while(near(2.9)<2){const p=pick(ring(1.5,2.9,stx,sty));put(p[0],p[1],kind(),260);}
  let src=[];
  const clusters=[[stx,sty,9,11.5]];const oldR=r=>LAND_R+(r-4)/46*(RW-LAND_R);for(let i=0;i<6;i++)for(let j=0;j<Math.max(1,Math.round(AREA_F/2));j++)clusters.push([C0,C0,oldR(8+i*6),oldR(10+i*6)]);
  clusters.forEach((cl,ci)=>{let sx,sy,g=0;do{const a=rng()*Math.PI*2,r=cl[2]+rng()*(cl[3]-cl[2]);sx=Math.round(cl[0]+Math.cos(a)*r);sy=Math.round(cl[1]+Math.sin(a)*r);g++;}while((!ok(sx,sy)||rC(sx,sy)<LAND_R+3)&&g<200);
    const cel=[];[[0,0,"nuc"],[1,0,"prot"],[-1,0,"prot"],[0,1,"nuc"],[0,-1,"prot"]].forEach(d=>{const x=sx+d[0],y=sy+d[1];if(ok(x,y)){put(x,y,d[2],2200+Math.round(cen(x,y)*60),true);cel.push([x,y]);}});
    if(ci===0)src=cel;});
  const wildAt=(x,y,type,easy)=>{const cc=cen(x,y),mx=Math.round(200+cc*20);tiles[y*W+x].w={type,def:easy?28:Math.round(20+cc*4+rng()*15),bio:mx,max:mx,mb:mx};};
  for(let i=0;i<5;i++){const c=ring(3,9,stx,sty);if(c.length){const p=pick(c);wildAt(p[0],p[1],TYPE_ORDER[i]);}}
  for(let i=0;i<Math.round(215*AREA_F);i++){const x=Math.floor(rng()*W),y=Math.floor(rng()*H);if(!ok(x,y)||tiles[y*W+x].k||tiles[y*W+x].w||dist(x,y)<3)continue;wildAt(x,y,pick(TYPE_ORDER));}
  const cand=Object.keys(NODES).filter(k=>NODES[k].tier===2||NODES[k].tier===3),pairs=[],used=new Set();
  EMERG.forEach(()=>{let a,b,key,g=0;do{a=pick(cand);b=pick(cand);key=[a,b].sort().join("+");g++;}while((NODES[a].br===NODES[b].br||used.has(key))&&g<500);used.add(key);pairs.push([a,b].sort());});
  const bots=botsInit(rng,stx,sty,tiles);
  S={v:6,seed,bots,inc:[],souche,t:0,speed:1,realAt:Date.now(),px:stx,py:sty,mig:null,
    res:{atp:250,prot:250,lip:250,nuc:80},
    fields:FIELD_ORDER.map(k=>({k,l:0})),noyau:1,slots:new Array(SLOT_COUNT).fill(null),
    build:null,research:null,idle:2,army:{coll:2},events:[],ally:null,stage:1,selN:1,queue:[],missions:[],fils:[],nextId:1,starve:0,wildT:0,
    tiles,src,nodes:[],glv:{},emerg:[],emPairs:pairs,log:[],reports:[],popups:[],won:null,q:0,tourDone:false,
    hero:{xp:0,lvl:1,tp:{venin:0,bras:0,carapace:0,crochets:0,pattes:0},busy:false,fights:0,wins:0,form:"Larve",seen:["Larve"]},heroWith:true};
  pendingStart=null;openRef=null;tab="cell";cam=null;
  {const si=S.slots.findIndex((s,j)=>!s&&slotOpen(j));if(si>=0)S.slots[si]={k:"ribo",l:1};} /* les ribosomes sont offerts : le guide commence par produire des troupes */
  S.tut=0;
  if(mods().revealSource)revealSource(false);
  updateVision();
  log(tr("Votre souche ","Your strain ")+SOUCHES[souche].name+tr(" s’éveille au bord du monde, dans les abysses. Le centre, loin devant, remonte vers la terre ferme."," awakens at the edge of the world, in the abyss. The center, far ahead, rises toward dry land."));
  log(tr("Touchez un canal de la membrane ou un emplacement libre pour commencer à construire.","Tap a membrane channel or a free slot to start building."));
  dirty=true;
}

function mods(){
  const m={};for(const k in MOD_LABEL)m[k]=0;
  const add=o=>{for(const k in o)m[k]=(m[k]||0)+o[k];};
  add(SOUCHES[S.souche].mods);
  S.nodes.forEach(id=>{add(scaledEff(id,glvl(id)));add(NODES[id].mal);});
  S.emerg.forEach(id=>add(EMERG.find(e=>e.id===id).eff));
  (S.muts||[]).forEach(id=>{const u=MUT_BY[id];if(u){add(u.eff);add(u.mal);}});
  lineages().forEach(t=>add(LINEAGE[t].eff));
  if(S.ally)m.fieldPct+=0.05;
  return m;
}
