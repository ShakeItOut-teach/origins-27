/* Origins 27 · 21-demarrage.js
   Démarrage : bulles d'aide, clavier et souris, sauvegarde, chargement, boucle d'animation et objet de test window.__o27.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Bulles d’aide : survol à la souris, appui long au doigt */
const tipEl=document.getElementById("tip");let lpTimer=null,tipHideTimer=null;
function showTip(html,x,y){tipEl.innerHTML=html;tipEl.classList.add("on");const w=tipEl.offsetWidth,h=tipEl.offsetHeight;let left=x+14,top=y+14;if(left+w>window.innerWidth-8)left=x-w-14;if(left<8)left=8;if(top+h>window.innerHeight-8)top=y-h-14;if(top<8)top=8;tipEl.style.left=left+"px";tipEl.style.top=top+"px";}
function hideTip(){tipEl.classList.remove("on");}
document.addEventListener("pointerover",e=>{if(e.pointerType!=="mouse")return;const t=e.target.closest&&e.target.closest("[data-tip]");if(t)showTip(t.dataset.tip,e.clientX,e.clientY);});
document.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse"||e.target===cv)return;const t=e.target.closest&&e.target.closest("[data-tip]");if(t)showTip(t.dataset.tip,e.clientX,e.clientY);else hideTip();});
document.addEventListener("pointerout",e=>{if(e.pointerType!=="mouse")return;const t=e.target.closest&&e.target.closest("[data-tip]");if(t&&!(e.relatedTarget&&t.contains(e.relatedTarget)))hideTip();});
document.addEventListener("pointerdown",e=>{
  if(e.pointerType!=="touch")return;
  const t=e.target.closest&&e.target.closest("[data-tip]");const onMap=cv&&e.target===cv;
  if(!t&&!onMap)return;
  clearTimeout(lpTimer);
  lpTimer=setTimeout(()=>{let html=null;if(t)html=t.dataset.tip;else{const tl=tileAt(e);if(tl)html=tileTip(tl[0],tl[1]);}if(html){showTip(html,e.clientX,e.clientY-40);suppressClick=true;clearTimeout(tipHideTimer);}},450);
});
["pointerup","pointercancel","pointermove"].forEach(ev=>document.addEventListener(ev,e=>{if(e.pointerType!=="touch")return;if(ev==="pointermove"&&e.movementX*e.movementX+e.movementY*e.movementY<25)return;clearTimeout(lpTimer);if(tipEl.classList.contains("on")){clearTimeout(tipHideTimer);tipHideTimer=setTimeout(hideTip,1600);}}));
document.addEventListener("contextmenu",e=>{if(e.target.closest&&e.target.closest(".viewarea,[data-tip]"))e.preventDefault();});

document.addEventListener("click",e=>{if(suppressClick&&e.target!==cv){suppressClick=false;e.preventDefault();return;}const el=e.target.closest("[data-act]");if(!el||el.disabled)return;hideTip();if(el.dataset.need&&S&&!afford(JSON.parse(el.dataset.need))){showModal(adviceHTML(JSON.parse(el.dataset.need)));return;}act(el.dataset.act,el);});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches("g[data-act]")){e.preventDefault();act(e.target.dataset.act,e.target);}if(e.key==="Escape"&&openRef){openRef=null;dirty=true;}});

function packTiles(T){const seen=[],obj=[];T.forEach((t,i)=>{if(t.s)seen.push(i);if(t.k||t.w||t.max)obj.push([i,t.k,Math.round(t.a),t.max,Math.round(t.m),t.rich?1:0,t.w,t.ev||0]);});return {n:T.length,seen,obj};}
function unpackTiles(P){const T=[];for(let i=0;i<P.n;i++)T.push({k:null,a:0,max:0,m:0,s:0,rich:false,w:null});P.seen.forEach(i=>T[i].s=1);P.obj.forEach(o=>{const t=T[o[0]];t.k=o[1];t.a=o[2];t.max=o[3];t.m=o[4];t.rich=!!o[5];t.w=o[6];if(o[7])t.ev=o[7];});return T;}
/* Anciennes sauvegardes : 12 canaux → 4, collectrices → armée */
function migrate(d){
  if(d.fields&&d.fields.length!==4){d.fields=FIELD_ORDER.map(k=>{const ls=d.fields.filter(f=>f.k===k).map(f=>f.l).sort((a,b)=>b-a);return {k,l:Math.min(FIELD_MAX,(ls[0]||0)+(ls[1]?1:0)+(ls[2]?1:0))};});if(d.build&&d.build.type==="field")d.build=null;}
  if(!d.army)d.army={coll:d.idle||0};
  (d.missions||[]).forEach(M=>{if(!M.u)M.u={coll:M.n};});
  d.queue=(d.queue||[]).map(q=>typeof q==="number"?{t:q,k:"coll"}:q);
  if(!d.events)d.events=[];if(d.ally===undefined)d.ally=null;
  if(!d.stage)d.stage=d.won?2:1;if(d.won&&!(d.nodes||[]).includes("APEX"))d.won=null;
}
function save(){if(!S)return;const T=S.tiles;try{S.realAt=Date.now();S.tiles=packTiles(T);localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(err){}finally{S.tiles=T;}}
function load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;const d=JSON.parse(raw);if(!d||d.v!==6||!d.fields)return false;if(d.tiles&&!Array.isArray(d.tiles))d.tiles=unpackTiles(d.tiles);migrate(d);S=d;  /* anciennes sauvegardes : ne garder que la dernière fenêtre de chaque sorte */
  {const seen=new Set(),keep=[];for(let i=S.popups.length-1;i>=0;i--){const p=S.popups[i],g=p.grp||(p.kick==="Événement"?"ev":p.kick+p.title);if(seen.has(g))continue;seen.add(g);keep.unshift(p);}S.popups=keep.slice(-3);}
  const away=Math.min(1440,(Date.now()-(d.realAt||Date.now()))/1000*S.speed);
  if(away>0.5){const r0=Object.assign({},S.res),n0=S.reports.length,id0=S.nextId;cuMap={t0:S.t,t1:S.t+away,r0:d.realAt||Date.now(),r1:Date.now()};catchUp=[];advance(away);const got=catchUp;catchUp=null;cuMap=null;
    log("Pendant votre absence : "+fmtDur(away)+" de jeu se sont écoulées.");
    const newRep=S.reports.filter(r=>r.id>=id0),cb=newRep.filter(r=>r.cat==="combat");
    if(away>=30&&(got.length||cb.length)){const evs=got.filter(p=>p.grp==="ev"),other=got.filter(p=>p.grp!=="ev");
      let b='<div class="stat"><span>Temps de jeu écoulé</span><b>'+fmtDur(away)+"</b></div>";
      b+='<div class="stat"><span>Ressources</span><b>'+RES.map(k=>{const dv=Math.round(S.res[k]-r0[k]);return '<span class="'+(dv>=0?"up":"neg")+'">'+(dv>=0?"+":"")+fmt(dv)+"</span> "+{atp:"ATP",prot:"prot.",lip:"lip.",nuc:"nucl."}[k];}).join(" · ")+"</b></div>";
      if(cb.length)b+='<div class="stat"><span>Combats</span><b>'+cb.filter(r=>r.win===true).length+" ✔ · "+cb.filter(r=>r.win===false).length+" ✘</b></div>";
      if(other.length)b+="<h3>Nouveautés</h3><ul class=\"advice\">"+other.map(p=>"<li><b>"+p.kick+"</b> · "+p.title+"</li>").join("")+"</ul>";
      if(evs.length){const last=evs[evs.length-1];b+="<h3>Dernier événement</h3><p><b>"+last.title+"</b></p>"+last.body+(evs.length>1?'<p class="desc">'+(evs.length-1)+" autre"+(evs.length>2?"s":"")+" événement"+(evs.length>2?"s":"")+" pendant votre absence : voir le journal.</p>":"");}
      if(evs.length)S.popups=S.popups.filter(p=>p.grp!=="ev");
      S.popups.unshift({kick:"Pendant votre absence",title:"Bon retour !",body:b});}
    else if(got.length)S.popups.push(got[got.length-1]);}
  return true;}catch(err){catchUp=null;return false;}}

try{const st=localStorage.getItem("o27-style");document.body.classList.toggle("pixel",st!=="smooth");}catch(e){document.body.classList.add("pixel");}
if(!load())showTitle();
let lastFrame=performance.now(),lastUI=0,lastSave=0;
function frame(now){
  const dtReal=Math.min(5,(now-lastFrame)/1000);lastFrame=now;
  if(S){
    advance(dtReal*S.speed);
    if(dirty)renderAll();else if(now-lastUI>200){live();lastUI=now;}
    draw(now,dtReal);
    if(resetArmUntil&&Date.now()>resetArmUntil){resetArmUntil=0;dirty=true;}
    if(now-lastSave>4000){save();lastSave=now;}
  }
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange",()=>{if(document.hidden)save();else lastFrame=performance.now();});
/* écran titre : le redessiner quand la LARGEUR change (dans un artefact, la fenêtre mesure 0 au chargement ; sur mobile, la hauteur bouge avec la barre d'adresse et ne compte pas) */
let titleW=window.innerWidth;
let wasMob=null;window.addEventListener("resize",()=>{if(document.querySelector(".title")&&Math.abs(window.innerWidth-titleW)>40){titleW=window.innerWidth;clearTimeout(showTitle.rt);showTitle.rt=setTimeout(()=>{if(document.querySelector(".title"))showTitle();},150);}if(tourI>=0)showTour(tourI);if(cv)resize();sizeStage();const m=isMobile();if(m!==wasMob){wasMob=m;dirty=true;}});
requestAnimationFrame(frame);
window.__o27={get S(){return S;},setStyle,camZoom,heroSVG,heroForm,act,advance,newGame,renderAll,setTab:t=>{tab=t;dirty=true;},setOpen:r=>{openRef=r;dirty=true;},dbg:{rates,upkeep,upgradeInfo,upgradeBlock,newBlock,bldCost,nodeCost,nodeState,nodeBlock,questTick,lvlCost,lvlBlock,spawnEvent,joinAlly,playerAtk,armyAll,pickUnits,uReq,zoneIdx,huntPower,heroPower,playerDef,botDef,botAtk,mods,setCostK:(v,p)=>{COST_K=v;if(p)PACE=p;},enGive,openChest,rollTier,giveRes,playerPoints,botPoints,botPow,myRank,rkRows,leagueOf}};
