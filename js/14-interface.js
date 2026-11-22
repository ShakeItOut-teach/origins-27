/* Origins 27 · 14-interface.js
   Rendu de l'interface : en-tête, onglets, quêtes, conseiller, dessin de la cellule et arbre d'évolution.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* ---------- Rendu ---------- */
const $=id=>document.getElementById(id);
function costSpan(r,v){const sh=S&&S.res[r]<v;return '<span class="c-'+r+(sh?" short":"")+'" data-cr="'+r+'" data-cv="'+v+'">'+fmt(v)+" "+RES_NAME[r]+'<i class="miss">'+(sh?" (−"+fmt(Math.ceil(v-S.res[r]))+")":"")+"</i></span>";}
function costHTML(c){return '<div class="cost">'+Object.keys(c).filter(r=>c[r]>0).map(r=>costSpan(r,c[r])).join("")+"</div>";}
function need(c){return " data-need='"+JSON.stringify(c)+"'";}
const NAV_ICONS={
  cell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="2.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/></svg>',
  evo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21V13M12 13l-6-5M12 13l6-5M6 8V4M18 8V4"/></svg>',
  act:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="14" rx="5" ry="5"/><circle cx="12" cy="7" r="2.5"/><path d="M7 12L3 9M17 12l4-3M7 16l-4 3M17 16l4 3"/></svg>'
};
function renderAll(){
  dirty=false;questTick();if(tab==="hero")S.sawHero=1;
  $("speeds").innerHTML=SPEEDS.map((s,i)=>'<button data-act="speed" data-i="'+i+'" title="'+s.title+'" aria-pressed="'+(Math.abs(S.speed-s.v)<1e-9)+'">'+s.label+"</button>").join("");
  renderReset();
  $("soucheChip").textContent=tr("Souche ","Strain ")+SOUCHES[S.souche].name;
  const r=rates(),u=upkeep();
  $("resbar").innerHTML=RES.map(k=>{const net=r[k]-u[k];const tip="<b>"+RES_NAME[k]+"</b>Production "+fmt(r[k])+" / h"+(r.fil[k]?tr(" (dont filaments "," (filaments ")+fmt(r.fil[k])+")":"")+"<br>"+tr("Entretien des collectrices −","Troop upkeep −")+fmt(u[k])+" / h<br><span class=m>"+tr("Stockage maximum ","Maximum storage ")+fmt(r.cap)+" · "+fmt(protectedAmt())+tr(" à l’abri du pillage (vacuole)<br>Au-delà, les réserves s’abîment : −"," safe from raids (vacuole)<br>Above that, stock spoils: −")+Math.round(SPOIL*100)+PCT+tr(" par heure de l’excédent. Dépensez-les !"," of the excess per hour. Spend it!")+"</span>";return '<div class="res" id="rb-'+k+'" data-tip="'+esc(tip)+'"><span class="k">'+sprImg("r_"+k,1)+(isMobile()?{atp:"ATP",prot:"Prot.",lip:"Lip.",nuc:"Nucl."}[k]:RES_NAME[k])+'</span><span class="v"><span id="r-'+k+'">0</span> <small>/ '+fmt(r.cap)+'</small></span><span class="r'+(net<0?" neg":"")+'">'+(net<0?"−":"+")+fmt(Math.abs(net))+" / h</span></div>";}).join("");
  const nM=S.missions.length;
  freshIds=new Set();
  if(tab==="act"&&(actSub==="combat"||actSub==="farm"))S.reports.forEach(r=>{if(r.cat===actSub&&!r.read){freshIds.add(r.id);r.read=true;}});
  const un=unread();
  $("tabs").innerHTML=[["cell",tr("Cellule","Cell"),""],["map",hereZoneName(),""],["evo",tr("Évolution","Evolution"),""],["hero",tr("Armée","Army"),""],["act",tr("Rapports","Reports"),""]].filter(t=>tutTabOk(t[0])).map(t=>{let b="";if(S.newTab===t[0])b='<span class="badge new">'+tr("Nouveau","New")+"</span>";if(t[0]==="act"){if(un)b='<span class="badge red">'+un+"</span>";else if(nM)b='<span class="badge live">'+nM+"</span>";}if(t[0]==="hero"&&S.hero.busy)b='<span class="badge live">•</span>';return '<button role="tab" data-act="tab" data-t="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+NAV_ICONS[t[0]]+"<span>"+t[1]+"</span>"+b+"</button>";}).join("");
  $("strip").innerHTML=stripHTML();
  const va=$("viewarea");
  if(tab==="map"){va.classList.remove("scroll");if(!$("map")){va.innerHTML='<div class="mapbox" id="mapbox"><canvas id="map" aria-label="'+tr("Carte des abysses","Abyss map")+'"></canvas><div class="mapctl"><button data-act="zoom" data-z="-1" aria-label="'+tr("Zoomer","Zoom in")+'">+</button><button data-act="zoom" data-z="1" aria-label="'+tr("Dézoomer","Zoom out")+'">−</button><button data-act="recenter" aria-label="'+tr("Recentrer sur la cellule","Center on the cell")+'">◎</button><button data-act="autocollect" class="auto" aria-label="'+tr("Récolte automatique : envoyer les collectrices libres sur les gisements proches","Auto-harvest: send free troops to nearby deposits")+'" title="'+tr("Récolte automatique","Auto-harvest")+'">⛏</button></div><div class="mapcoord" id="mapcoord"></div><canvas id="mini" width="'+W+'" height="'+H+'" aria-label="'+tr("Mini-carte du monde","World minimap")+'" title="'+tr("Le monde entier : touchez pour vous y déplacer","The whole world: tap to move there")+'"></canvas></div>';bindMap();}}
  else{const sl=va.scrollLeft,st=va.scrollTop,same=lastTab===tab;const mob=isMobile(),px=isPixel();va.classList.toggle("scroll",(tab==="evo"&&!mob)||tab==="act"||tab==="hero");
    if(tab==="cell"){va.innerHTML=depthTag()+'<div class="pxstage" id="pxstage"><canvas class="pxart" id="pxart"></canvas>'+cellSVG("ui")+"</div>";sizeStage();drawCellStage();}
    else{va.innerHTML=tab==="evo"?(mob?mobileTreeHTML():treeHTML()):tab==="hero"?'<div class="armywrap">'+armyHTML()+heroHTML()+"</div>":activityHTML();if(tab==="evo")pxify(va);}
    cv=null;
    if(same){va.scrollLeft=sl;va.scrollTop=st;}else{hideTip();va.scrollTop=0;va.scrollLeft=tab==="evo"?Math.max(0,(va.scrollWidth-va.clientWidth)/2):0;}}
  va.style.background=(tab==="cell"||tab==="map")?depthBG():"";
  if(lastTab!==tab)hideTip();lastTab=tab;
  $("detail").innerHTML=(openRef?'<button class="sheet-close" data-act="close" aria-label="'+tr("Fermer","Close")+'">×</button>':"")+detailHTML();
  $("aside").classList.toggle("open",!!openRef);
  $("winbox").innerHTML=S.won?'<div class="win"><h2>'+tr("Votre lignée sort de l’eau","Your lineage leaves the water")+"</h2><p>"+tr("Sortie des eaux exprimée après ","Leaving the water expressed after ")+fmtDur(S.won.t)+tr(" de jeu, avec "," of play, with ")+S.nodes.length+tr(" gènes et "," genes and ")+S.emerg.length+" "+tr("émergence","emergence")+(S.emerg.length>1?"s":"")+tr(". Notez ces chiffres pour le retour de test.",". Note these numbers for your test feedback.")+"</p></div>":"";
  renderModal();
  live();
}
function renderReset(){const rb=$("reset"),armed=Date.now()<resetArmUntil;rb.innerHTML=armed?'<span class="lg">'+tr("Confirmer : tout effacer ?","Confirm: erase everything?")+'</span><span class="sm">'+tr("Effacer ?","Erase?")+"</span>":'<span class="lg">'+tr("Nouvelle partie","New game")+'</span><span class="sm">↺</span>';rb.setAttribute("aria-label",armed?tr("Confirmer la nouvelle partie","Confirm new game"):tr("Nouvelle partie","New game"));rb.classList.toggle("arm",armed);}
function rwText(rw){return Object.keys(rw).map(k=>"+"+rw[k]+" "+RES_NAME[k].toLowerCase()).join(", ");}
function startTutHunt(){
  if(S.tutHuntDone||S.tutWild)return;
  const best=placeTutWild();if(!best)return;const type=S.tiles[best[1]*W+best[0]].w.type;
  popup({kick:tr("Quête","Quest"),title:tr("Votre première chasse","Your first hunt"),body:"<p>"+tr("Un "+WILD_NAME[type].toLowerCase()+" affaibli rôde à "+best[2].toFixed(0)+" cases de vous. Ouvrez les abysses, touchez-le, choisissez combien de collectrices envoyer, puis « Chasser ».","A weakened "+WILD_NAME[type].toLowerCase()+" prowls "+best[2].toFixed(0)+" tiles from you. Open the abyss, tap it, choose how many gatherers to send, then “Hunt”.")+"</p><p class=\"desc\" style=\"margin-top:6px\">"+tr("Cette fois, le jeu vous rembourse vos pertes et vous explique le combat. Pensez à emmener votre héros.","This time, the game refunds your losses and explains the fight. Remember to bring your hero.")+"</p>"});
}
function placeTutWild(){
  const c=cpos();let best=null;
  for(let y=c[1]-5;y<=c[1]+5;y++)for(let x=c[0]-5;x<=c[0]+5;x++){if(x<0||y<0||x>=W||y>=H||!inWorld(x,y)||isLand(x,y))continue;const T=S.tiles[y*W+x],d=dist(x,y);if(T.k||T.w||d<2.5||d>4.5)continue;if(!best||Math.abs(d-3.2)<Math.abs(best[2]-3.2))best=[x,y,d];}
  if(!best){S.tutHuntDone=1;return;}
  const type=TYPE_ORDER[Math.floor(Math.random()*5)],T=S.tiles[best[1]*W+best[0]];
  T.w={type,def:28,bio:260,max:260,mb:260,tut:true};T.s=1;S.tutWild=[best[0],best[1]];
  return best;
}
const QUESTS=[
  {t:tr("Améliorer un canal de la membrane","Upgrade a membrane channel"),done:()=>S.fields.some(f=>f.l>0),ref:()=>"field:1",tab:"cell",rw:{prot:60,lip:60}},
  {t:tr("Monter le noyau au niveau 2","Raise the nucleus to level 2"),done:()=>S.noyau>=2,ref:()=>"noyau",tab:"cell",rw:{atp:100,prot:100}},
  {t:tr("Construire les ribosomes","Build the ribosomes"),done:()=>blvl("ribo")>=1,ref:()=>refFor(["b","ribo",1]),tab:"cell",rw:{prot:150}},
  {t:tr("Avoir quatre collectrices","Have four gatherers"),done:()=>cellCount()+S.queue.length>=4,ref:()=>refFor(["b","ribo",1]),tab:"cell",rw:{atp:80,prot:60}},
  {t:tr("Envoyer vos collectrices récolter (bouton ⛏ sur la carte)","Send your gatherers to harvest (⛏ button on the map)"),done:()=>!!S.sentOnce,ref:()=>null,tab:"map",rw:{lip:100,atp:60}},
  {t:tr("Exprimer Pili adhésifs, votre premier gène de Prédation","Express Sticky pili, your first Predation gene"),done:()=>has("P1")||!!(S.research&&S.research.id==="P1"),ref:()=>"node:P1",tab:"evo",rw:{nuc:60}},
  {t:tr("Première chasse : attaquer l’organisme signalé","First hunt: attack the marked organism"),done:()=>!!S.tutHuntDone,ref:()=>S.tutWild?"tile:"+S.tutWild[0]+":"+S.tutWild[1]:null,tab:"map",rw:{prot:150,nuc:50},start:startTutHunt},
  {t:tr("Lire le rapport de combat","Read the combat report"),done:()=>S.reports.some(r=>r.cat==="combat"&&r.read),ref:()=>null,tab:"act",sub:"combat",rw:{nuc:40}},
  {t:tr("Aller voir votre héros","Go see your hero"),done:()=>!!S.sawHero,ref:()=>null,tab:"hero",rw:{atp:100}},
  {t:tr("Étendre un premier filament vers un gisement","Extend a first filament to a deposit"),done:()=>S.fils.length>0||!!(S.build&&S.build.type==="fil"),ref:()=>null,tab:"map",rw:{lip:150}},
  {t:tr("Exprimer un gène d’Énergie ou de Perception","Express an Energy or Perception gene"),done:()=>has("E1")||has("M1"),ref:()=>"node:E1",tab:"evo",rw:{nuc:80}},
  {t:tr("Monter le noyau au niveau 3 : votre base grandit","Raise the nucleus to level 3: your base grows"),done:()=>S.noyau>=3,ref:()=>"noyau",tab:"cell",rw:{atp:150,prot:150,lip:150,nuc:50}},
  {t:tr("Construire la mitochondrie : plus d’ATP","Build the mitochondrion: more ATP"),done:()=>blvl("mito")>=1,ref:()=>refFor(["b","mito",1]),tab:"cell",rw:{atp:200,nuc:60}},
  {t:tr("Choisir une voie offensive (rang 3 de Prédation)","Choose an offensive path (Predation rank 3)"),done:()=>ownedTypes().length>0||!!(S.research&&NODES[S.research.id].type),ref:()=>"node:PT",tab:"evo",br:"P",rw:{nuc:150,prot:150}},
  {t:tr("Avoir deux mutations d’une même famille","Have two mutations of the same family"),done:()=>Object.keys(MUT_TAG).some(t=>mutCount(t)>=2),ref:()=>null,tab:"evo",rw:{atp:200,lip:200}},
  {t:tr("Monter le noyau au niveau 5 : l’Endosymbiose s’approche","Raise the nucleus to level 5: Endosymbiosis is near"),done:()=>S.noyau>=5,ref:()=>"noyau",tab:"cell",rw:{atp:300,prot:300,lip:300,nuc:150}},
  {t:tr("Exprimer l’Endosymbiose : devenir eucaryote","Express Endosymbiosis: become a eukaryote"),done:()=>has("ENDO"),ref:()=>"node:ENDO",tab:"evo",br:"X",rw:{nuc:200,atp:300}},
  {t:tr("Lever une armée de 25 troupes","Raise an army of 25 troops"),done:()=>cellCount()>=25,ref:()=>null,tab:"hero",rw:{prot:300,atp:200}},
  {t:tr("Adhésion cellulaire : devenir une colonie","Cell adhesion: become a colony"),done:()=>has("COLO"),ref:()=>"node:COLO",tab:"evo",rw:{atp:400,prot:400,lip:400,nuc:200}},
  {t:tr("Migrer jusqu’aux eaux moyennes","Migrate to the middle waters"),done:()=>zoneIdx()>=2,ref:()=>null,tab:"map",rw:{atp:400,lip:400}},
  {t:tr("Différenciation : devenir pluricellulaire","Differentiation: become multicellular"),done:()=>has("PLURI"),ref:()=>"node:PLURI",tab:"evo",rw:{atp:600,prot:600,lip:600,nuc:300}},
  {t:tr("Atteindre les hauts-fonds","Reach the shallows"),done:()=>zoneIdx()>=3,ref:()=>null,tab:"map",rw:{atp:600,lip:600}},
  {t:tr("Sortie des eaux : devenir l’APEX","Leave the water: become the APEX"),done:()=>!!S.won,ref:()=>"node:APEX",tab:"evo",rw:{nuc:100}}
];
function questTick(){if(!S||S.tut!=null)return;let g=0;while(S.q<QUESTS.length&&g<20){g++;const Q=QUESTS[S.q];if(Q.start&&!S["qs"+S.q]){S["qs"+S.q]=1;Q.start();}if(!Q.done())break;const cap=rates().cap;for(const k in Q.rw)S.res[k]=Math.min(Math.max(S.res[k],cap),S.res[k]+Q.rw[k]);log(tr("Quête accomplie : ","Quest complete: ")+Q.t+tr(". Récompense : ",". Reward: ")+rwText(Q.rw)+".","good");toast(tr("Quête accomplie · ","Quest complete · ")+rwText(Q.rw));S.q++;dirty=true;}}
function goalHTML(){if(S.q>=QUESTS.length)return "";const Q=QUESTS[S.q],r=Q.ref();return '<button class="goal" data-act="goto" data-tab="'+Q.tab+'"'+(r?' data-ref="'+r+'"':"")+(Q.sub?' data-sub="'+Q.sub+'"':"")+'><span>'+tr("Quête ","Quest ")+(S.q+1)+"/"+QUESTS.length+"</span> "+Q.t+' <em>'+rwText(Q.rw)+"</em> →</button>";}
/* Conseiller : la prochaine action utile, en un geste */
function buildChoices(){
  const out=[];const push=(ref,u)=>{if(u&&!upgradeBlock(u))out.push({ref,name:u.name+tr(" → niv. "," → lvl ")+(u.level+1),cost:u.cost});};
  push("noyau",upgradeInfo("noyau"));
  S.slots.forEach((s,i)=>{if(s)push("slot:"+i,upgradeInfo("slot:"+i));});
  const seen={};S.fields.forEach((f,i)=>{const key=f.k+":"+f.l;if(seen[key])return;seen[key]=1;push("field:"+i,upgradeInfo("field:"+i));});
  for(const k in BLD){if(k==="noyau"||S.slots.some(s=>s&&s.k===k)||newBlock(k))continue;const i=S.slots.findIndex((s,j)=>!s&&slotOpen(j));if(i>=0)out.push({ref:"slot:"+i,name:BLD[k].name+tr(" (nouveau)"," (new)"),cost:bldCost(k,0),k});}
  return out;
}
function waitFor(c){const r=rates(),u=upkeep();let t=0;for(const k in c){const lack=c[k]-S.res[k];if(lack<=0)continue;const net=r[k]-u[k];if(net<=0)return Infinity;t=Math.max(t,lack/net*60);}return t;}
function nextHint(){
  if(!S||S.won)return null;
  if(S.idle>0&&!S.mig&&cellCount()>0){const t=autoTargets();if(t.dep.length||t.unk.length)return {t:EN?S.idle+" idle troop"+(S.idle>1?"s":"")+": auto-harvest":S.idle+" collectrice"+(S.idle>1?"s":"")+" au repos : récolte auto",act:"autocollect",ic:"⛏"};}
  if(!S.build){const ch=buildChoices().map(c=>Object.assign(c,{w:waitFor(c.cost)})).sort((a,b)=>a.w-b.w||(a.ref==="noyau"?-1:1));
    if(ch.length){const c=ch[0];return c.w<=0?{t:tr("Chantier libre : ","Builder free: ")+c.name,tab:"cell",ref:c.ref,ic:"🔨"}:{t:tr("Chantier libre · ","Builder free · ")+c.name+tr(" dans "," in ")+(isFinite(c.w)?fmtDur(c.w):"—"),tab:"cell",ref:c.ref,ic:"⏳",wait:1};}}
  if(!S.research){const open=Object.keys(NODES).filter(id=>nodeState(id)==="open"&&NODES[id].req.every(reqMet)&&!capBlock(nodeCost(id)));
    if(open.length){open.sort((a,b)=>waitFor(nodeCost(a))-waitFor(nodeCost(b)));const id=open[0],w=waitFor(nodeCost(id));return {t:(w<=0?tr("Gène abordable : ","Affordable gene: "):tr("Prochain gène · ","Next gene · "))+NODES[id].name+(w>0&&isFinite(w)?tr(" dans "," in ")+fmtDur(w):""),tab:"evo",ref:"node:"+id,br:NODES[id].br==="X"?"X":NODES[id].br,ic:"🧬",wait:w>0?1:0};}}
  return null;
}
function hintHTML(){const H=nextHint();if(!H)return "";return '<button class="hint'+(H.wait?" wait":"")+'" data-act="hint">'+H.ic+" "+H.t+" →</button>";}
function stripHTML(){
  if(S.tut!=null)return tutStripHTML();
  let h=goalHTML()||hintHTML();
  h+=S.build?'<span>'+tr("Construction ","Building ")+'<b>'+S.build.label+'</b><span class="pb"><i data-ps="'+S.build.start+'" data-pe="'+S.build.end+'"></i></span><span data-end="'+S.build.end+'"></span>'+accelHTML("b")+((S.bq||[]).length?' <b class="bqn">+'+S.bq.length+tr(" en file"," queued")+"</b>":"")+'</span>':(S.q<QUESTS.length?'<button class="lnk ok" data-act="hint">'+tr("Aucune construction : que faire ?","Nothing building: what to do?")+"</button>":"<span>"+tr("Aucune construction","Nothing building")+"</span>");
  if(S.mig)h+='<span>Migration <b>'+tr("vers ","to ")+S.mig.x+","+S.mig.y+'</b><span class="pb"><i data-ps="'+S.mig.start+'" data-pe="'+S.mig.end+'"></i></span><span data-end="'+S.mig.end+'"></span></span>';
  h+=S.research?'<span>'+tr("Gène ","Gene ")+'<b>'+NODES[S.research.id].name+(S.research.lvl?tr(" niv. "," lvl ")+S.research.lvl:"")+'</b><span class="pb evo"><i data-ps="'+S.research.start+'" data-pe="'+S.research.end+'"></i></span><span data-end="'+S.research.end+'"></span>'+accelHTML("r")+'</span>':"<span>"+tr("Aucun gène en cours","No gene in progress")+"</span>";
  if(S.mres)h+='<span>'+tr("Recherche ","Research ")+'<b>'+RBR[S.mres.br].e+" T"+S.mres.L+'</b><span class="pb evo"><i data-ps="'+S.mres.start+'" data-pe="'+S.mres.end+'"></i></span><span data-end="'+S.mres.end+'"></span>'+accelHTML("m")+"</span>";
  h+=enPill()+lmPill()+instPill();
  {const st=stashTotal();if(st>=1)h+='<span class="rwpill" data-act="rewards">🧺 <b>'+fmt(st)+"</b>"+tr(" en réserve"," in reserve")+"</span>";}
  {const n=rwCount();h+='<span class="rwpill'+(n?" on":"")+'" data-act="rewards">🎁 '+(n?tr("Récompenses ","Rewards ")+"<b>"+n+"</b>":tr("Coffre dans ","Chest in ")+"<span data-endr=\""+S.chestAt+"\"></span>")+"</span>";}
  {const r=myRank("pow"),L=leagueOf(r);h+='<span class="rkpill" data-act="goto" data-tab="act" data-sub="rank">'+L[1]+" <b>#"+r+"</b>"+tr(" mondial"," world")+"</span>";}
  h+=eventPill();
  if(S.inc&&S.inc.length){const A=S.inc.slice().sort((a,b)=>a.arrive-b.arrive)[0],b=S.bots.find(z=>z.id===A.bot);h+='<span class="incw" data-act="goto" data-tab="act" data-sub="move">'+tr("⚠️ Attaque de ","⚠️ Attack from ")+'<b>'+esc(b?b.name:"?")+'</b>'+tr(" dans "," in ")+'<span data-end="'+A.arrive+'"></span>'+(S.inc.length>1?" (+"+(S.inc.length-1)+")":"")+"</span>";}
  else if(shieldAt(S.t))h+='<span class="protw" data-tip="'+esc(tr("<b>Protection après un pillage</b>Aucun rival ne peut vous attaquer pendant 1 h. Piller quelqu’un met fin à la protection.","<b>Protection after a raid</b>No rival can attack you for 1 h. Raiding someone ends the protection."))+'">'+tr("🛡 Protégé encore ","🛡 Protected for ")+'<span data-endr="'+S.shieldR+'"></span></span>';
  else if(nightAt(S.t))h+='<span class="protw" data-tip="'+esc(tr("<b>Nuit protégée</b>De minuit à 7 h, personne n’attaque personne : dormez tranquille.","<b>Protected night</b>From midnight to 7 am, nobody attacks anybody: sleep easy."))+'">'+tr("🌙 Nuit protégée jusqu’à 07:00","🌙 Protected night until 07:00")+"</span>";
  h+='<span data-act="tab" data-t="hero">'+sprImg("u_coll",1)+tr(" Troupes "," Troops ")+"<b>"+S.idle+tr(" libres / "," free / ")+cellCount()+"</b>"+(S.queue.length?" · "+S.queue.length+tr(" en production"," in production"):"")+"</span>";
  return h;
}

/* Dessins d’évolution sur la cellule */
function polar(C,a,r){return [C+Math.cos(a)*r,C+Math.sin(a)*r];}
function evoOuter(C,mem){
  let s="";const N=n=>has(n),D=Math.PI/180;
  if(N("P1")){for(let i=0;i<72;i++){const a=i*5*D,p=polar(C,a,mem+11),q=polar(C,a+0.02,mem+20);s+='<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="#9fd8cf" stroke-opacity=".55" stroke-width="1"/>';}}
  if(N("PA")){for(let i=0;i<16;i++){const a=(i*22.5+11)*D,p1=polar(C,a-0.04,mem+10),p2=polar(C,a+0.04,mem+10),t=polar(C,a,mem+30);s+='<polygon points="'+p1+" "+t+" "+p2+'" fill="#e3e9ee"/>';}}
  if(N("E2a")||N("E3a")){[-160,20,100].forEach((g,i)=>{const a=g*D,b=polar(C,a,mem+8),t=polar(C,a,mem+(N("E3a")?62:48)),perp=a+Math.PI/2,w=N("E3a")?18:13,c1=[(b[0]+t[0])/2+Math.cos(perp)*w,(b[1]+t[1])/2+Math.sin(perp)*w],c2=[(b[0]+t[0])/2-Math.cos(perp)*w,(b[1]+t[1])/2-Math.sin(perp)*w];
    s+='<path d="M'+b+" Q"+c1+" "+t+" Q"+c2+" "+b+'Z" fill="#3f9a4a" stroke="#7fd36b" stroke-width="1.4"/><line x1="'+b[0]+'" y1="'+b[1]+'" x2="'+t[0]+'" y2="'+t[1]+'" stroke="#bff0a8" stroke-opacity=".6"/>';
    if(hasEm("lichen"))s+='<circle cx="'+((b[0]+t[0])/2)+'" cy="'+((b[1]+t[1])/2)+'" r="4" fill="#b8e05a"/>';});}
  if(N("PT")){const a=-30*D,p=polar(C,a,mem+16);s+='<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="26" ry="19" transform="rotate(-30 '+p[0]+" "+p[1]+')" fill="rgba(184,224,90,.35)" stroke="#b8e05a" stroke-width="2"/><circle cx="'+(p[0]-6)+'" cy="'+(p[1]+3)+'" r="5" fill="#b8e05a"/><circle cx="'+(p[0]+7)+'" cy="'+(p[1]-4)+'" r="3.5" fill="#b8e05a"/><circle cx="'+(p[0]+2)+'" cy="'+(p[1]+8)+'" r="2.5" fill="#b8e05a"/>';}
  if(N("PH")){[60,165,-75].forEach(g=>{const a=g*D,p1=polar(C,a-0.22,mem),p2=polar(C,a+0.22,mem),t=polar(C,a,mem+40),c1=polar(C,a-0.25,mem+42),c2=polar(C,a+0.25,mem+42);s+='<path d="M'+p1+" C"+c1+" "+t+" "+t+" C"+t+" "+c2+" "+p2+'" fill="#123f44" stroke="#4fc3f7" stroke-width="2"/>';});}
  if(N("PP")){[-5,85,195].forEach(g=>{const a=g*D,p=polar(C,a,mem+8),t=polar(C,a,mem+40);s+='<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+t[0]+'" y2="'+t[1]+'" stroke="#c77dff" stroke-width="4" stroke-linecap="round"/><circle cx="'+t[0]+'" cy="'+t[1]+'" r="3" fill="#f3dcff"/>';});}
  if(N("M2a")){const a=135*D;let d="",p0=polar(C,a,mem+6);d="M"+p0;for(let i=1;i<=10;i++){const r=mem+6+i*10,off=Math.sin(i*1.3)*10,pp=polar(C,a,r);d+=" L"+(pp[0]+Math.cos(a+Math.PI/2)*off)+" "+(pp[1]+Math.sin(a+Math.PI/2)*off);}s+='<path d="'+d+'" fill="none" stroke="#5ee6d0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';}
  if(N("M1")){for(let i=0;i<6;i++){const a=(i*60+30)*D,b=polar(C,a,mem+10),t=polar(C,a,mem+22),l=polar(C,a-0.06,mem+28),r=polar(C,a+0.06,mem+28);s+='<path d="M'+b+" L"+t+" L"+l+" M"+t+" L"+r+'" fill="none" stroke="#a9c7d6" stroke-width="1.4"/>';}}
  if(N("E3b")){for(let i=0;i<10;i++){const a=(i*36+18)*D,p=polar(C,a,mem+14);s+='<rect x="'+(p[0]-4)+'" y="'+(p[1]-4)+'" width="8" height="8" transform="rotate(45 '+p[0]+" "+p[1]+')" fill="#c0613a"/>';}}
  if(N("M3a")){[45,135,225,315].forEach(g=>{const p=polar(C,(g+10)*D,mem+58);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="11" fill="#123a3a" stroke="#5ee6d0" stroke-width="1.4"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="#a99bff"/>';});}
  if(hasEm("cuirasse")){for(let i=0;i<14;i++){const a=i/14*Math.PI*2,p=polar(C,a,mem+24);s+='<rect x="'+(p[0]-11)+'" y="'+(p[1]-6)+'" width="22" height="12" rx="3" transform="rotate('+(a/D+90)+" "+p[0]+" "+p[1]+')" fill="rgba(169,199,214,.25)" stroke="#a9c7d6"/>';}}
  if(hasEm("spirale")){let d="";for(let i=0;i<=120;i++){const a=i/120*Math.PI*4,r=mem+8+i*0.45,p=polar(C,a,r);d+=(i?" L":"M")+p;}s+='<path d="'+d+'" fill="none" stroke="#c77dff" stroke-opacity=".7" stroke-width="2"/>';}
  if(hasEm("filament")){for(let i=0;i<5;i++){const p=polar(C,-90*D,mem+16+i*14);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="#123a3a" stroke="#5ee6d0"/>';}}
  return s;
}
function evoInner(C,mem){
  let s="";const N=n=>has(n),D=Math.PI/180;
  if(N("E1"))s+='<circle cx="'+C+'" cy="'+C+'" r="'+(mem-14)+'" fill="url(#glow)"/>';
  if(N("E2a")){for(let i=0;i<5;i++){const p=polar(C,(i*72+40)*D,198);s+='<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="11" ry="6" transform="rotate('+(i*72+130)+" "+p[0]+" "+p[1]+')" fill="#2f7d3a" stroke="#7fd36b"/>';if(N("E3a"))s+='<line x1="'+(p[0]-6)+'" y1="'+p[1]+'" x2="'+(p[0]+6)+'" y2="'+p[1]+'" stroke="#bff0a8"/>';}}
  if(N("E2b")){for(let i=0;i<10;i++){const p=polar(C,(i*36+5)*D,203);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#ffe07a" fill-opacity=".85"/>';}}
  if(N("P2")){for(let i=0;i<6;i++){const p=polar(C,(i*60+15)*D,206);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4.5" fill="none" stroke="#ef7fa6"/>';}}
  if(N("PE")){for(let i=0;i<5;i++){const p=polar(C,(i*72+60)*D,192);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="#ff9e6b" fill-opacity=".35" stroke="#ff9e6b"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="2" fill="#ff9e6b"/>';}}
  if(N("M2b")){const p=polar(C,-120*D,mem-6);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="11" fill="#7a1f12" stroke="#ff6a3d" stroke-width="2"/><circle cx="'+(p[0]-2)+'" cy="'+(p[1]-2)+'" r="3.5" fill="#ffd2b8"/>';}
  if(N("M3b")){for(let i=0;i<8;i++){const p=polar(C,(200+i*5)*D,190);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#0b0b0b" stroke="#a9c7d6" stroke-width=".8"/>';}}
  if(N("ENDO")){s+='<circle cx="'+C+'" cy="'+C+'" r="'+(mem-20)+'" fill="none" stroke="#a99bff" stroke-opacity=".5" stroke-dasharray="3 4"/><ellipse cx="'+C+'" cy="'+(C-76)+'" rx="17" ry="10" fill="#1d3b2c" stroke="#7fd36b" stroke-width="1.5"/><ellipse cx="'+C+'" cy="'+(C-76)+'" rx="12" ry="6" fill="none" stroke="#7fd36b" stroke-opacity=".6"/>';}
  return s;
}
function bodySVG(C,mem){
  let s='<defs><radialGradient id="cyto" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#0f3238"/><stop offset="1" stop-color="#08202a"/></radialGradient><radialGradient id="nucg" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#3b3270"/><stop offset="1" stop-color="#1b1840"/></radialGradient><radialGradient id="glow"><stop offset=".55" stop-color="#ffe07a" stop-opacity="0"/><stop offset="1" stop-color="#ffe07a" stop-opacity=".16"/></radialGradient></defs>';
  s+=evoOuter(C,mem);
  s+='<circle cx="'+C+'" cy="'+C+'" r="'+(mem+11)+'" fill="#0a2a30" stroke="#5ee6d0" stroke-opacity=".35" stroke-width="1"/>';
  s+='<circle cx="'+C+'" cy="'+C+'" r="'+(mem-11)+'" fill="url(#cyto)" stroke="#5ee6d0" stroke-opacity=".55" stroke-width="1.5"/>';
  for(let i=0;i<90;i++){const a=i/90*Math.PI*2;s+='<line x1="'+(C+Math.cos(a)*(mem-10))+'" y1="'+(C+Math.sin(a)*(mem-10))+'" x2="'+(C+Math.cos(a)*(mem+10))+'" y2="'+(C+Math.sin(a)*(mem+10))+'" stroke="#5ee6d0" stroke-opacity=".12"/>';}
  s+=evoInner(C,mem);
  return s;
}
function orgArt(k,x,y){
  if(ORG_SPR[k])return sprSVG(ORG_SPR[k],x,y,3,-50);
  switch(k){
    case "vac":return '<circle cx="'+x+'" cy="'+y+'" r="30" fill="rgba(120,190,230,.14)" stroke="#78bee6" stroke-width="1.5"/><circle cx="'+(x-9)+'" cy="'+(y-9)+'" r="7" fill="rgba(255,255,255,.08)"/>';
    case "ribo":{let s="";[[-14,-8],[0,-14],[13,-6],[-8,6],[7,8],[-18,10],[18,12],[0,0],[-3,17]].forEach(d=>{s+='<circle cx="'+(x+d[0])+'" cy="'+(y+d[1])+'" r="4.2" fill="#f3b562"/>';});return '<circle cx="'+x+'" cy="'+y+'" r="30" fill="rgba(243,181,98,.06)"/>'+s;}
    case "photo":return '<ellipse cx="'+x+'" cy="'+y+'" rx="24" ry="17" fill="#2a1410" stroke="#ff8a5c" stroke-width="1.5"/><circle cx="'+x+'" cy="'+y+'" r="9" fill="#ff6a3d"/><circle cx="'+(x-3)+'" cy="'+(y-3)+'" r="3" fill="#ffd2b8"/>';
    case "flag":return '<circle cx="'+(x-12)+'" cy="'+y+'" r="8" fill="#123a3a" stroke="#5ee6d0" stroke-width="1.5"/><path d="M'+(x-4)+" "+y+' q6 -10 12 0 t12 0 t8 0" fill="none" stroke="#5ee6d0" stroke-width="2.2" stroke-linecap="round"/>';
    case "mito":return '<ellipse cx="'+x+'" cy="'+y+'" rx="30" ry="17" fill="#2b2411" stroke="#ffe07a" stroke-width="1.5"/><path d="M'+(x-22)+" "+y+' q4 -10 8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="#ffe07a" stroke-width="1.4"/>';
    case "reti":{let s="";for(let i=-2;i<=2;i++)s+='<path d="M'+(x-26)+" "+(y+i*8)+' q6.5 -5 13 0 t13 0 t13 0 t13 0" fill="none" stroke="#f3b562" stroke-width="1.6" stroke-opacity="'+(1-Math.abs(i)*0.2)+'"/>';return s;}
    case "golgi":{let s="";for(let i=0;i<4;i++){const w=30-i*4;s+='<path d="M'+(x-w)+" "+(y-10+i*7)+" Q"+x+" "+(y-24+i*7)+" "+(x+w)+" "+(y-10+i*7)+'" fill="none" stroke="#ef7fa6" stroke-width="2.4" stroke-linecap="round"/>';}return s+'<circle cx="'+(x+26)+'" cy="'+(y+14)+'" r="3.5" fill="#ef7fa6"/>';}
    case "cyto":{let s="";for(let i=0;i<6;i++){const a=i*Math.PI/3;s+='<line x1="'+x+'" y1="'+y+'" x2="'+(x+Math.cos(a)*28)+'" y2="'+(y+Math.sin(a)*28)+'" stroke="#a9c7d6" stroke-width="1.5"/>';}return s+'<circle cx="'+x+'" cy="'+y+'" r="4" fill="#a9c7d6"/>';}
  }
  return "";
}
function bldEffectText(k,L){
  const m=mods();
  if(k==="vac")return tr("Stockage ","Storage ")+fmt(520*Math.pow(1.3,L)*costF(L)*(1+m.capPct))+", "+fmt(100*Math.pow(1.4,L))+tr(" à l’abri"," safe");
  if(k==="ribo")return fmtDur(10/(1+0.4*L)*Math.max(0.2,1+m.cellTime))+tr(" par collectrice · "," per gatherer · ")+(1+Math.floor(L/3))+tr(" chaîne"+(L>=3?"s":"")+" en parallèle"," parallel line"+(L>=3?"s":""));
  if(k==="photo")return "Vision "+(1+L+m.visionAdd)+tr(" cases"," tiles");
  if(k==="flag")return tr("Portée ","Range ")+(5+2*L+m.rangeAdd)+tr(" cases, vitesse +"," tiles, speed +")+Math.round(30*L)+PCT;
  if(k==="mito")return "+"+8*L+PCT+tr(" d’ATP"," ATP");
  if(k==="reti")return "+"+8*L+PCT+tr(" de protéines"," proteins");
  if(k==="golgi")return "+"+8*L+PCT+tr(" de lipides"," lipids");
  if(k==="cyto")return (6+L)+tr(" emplacements sur 8"," of 8 slots");
  return "";
}
function cellSVG(mode){
  mode=mode||"full";const A=x=>mode==="ui"?"":x,U=x=>mode==="art"?"":x;
  const C=280,mem=233,m=mods();
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 660 660" role="img" aria-label="'+tr("Intérieur de votre cellule","Inside your cell")+'"'+(mode==="ui"?' class="uilayer"':"")+">";
  if(mode!=="ui"){for(let i=0;i<46;i++){const a=i*2.39996,rr=255+((i*37)%60);s+='<circle cx="'+(C+Math.cos(a)*rr)+'" cy="'+(C+Math.sin(a)*rr)+'" r="'+(1.2+(i%3)*0.8)+'" fill="#9fc3d3" fill-opacity="'+(0.18+(i%4)*0.06)+'"/>';}s+=bodySVG(C,mem);}
  S.fields.forEach((f,i)=>{
    const a=fAng(i),x=C+Math.cos(a)*mem,y=C+Math.sin(a)*mem,ref="field:"+i,col="var(--"+f.k+")";
    const busy=S.build&&S.build.type==="field"&&S.build.i===i,selc=openRef===ref?" sel":"";
    const prod=fieldProd(f.l)*prodMult(f.k,m)*(1+m.fieldPct);
    const tip="<b>"+FIELD[f.k].name+tr(" · niveau "," · level ")+f.l+"</b>"+(f.l?fmt(prod)+" "+RES_NAME[f.k].toLowerCase()+tr(" par heure"," per hour"):tr("Inactif : améliorez-le pour produire.","Inactive: upgrade it to produce."))+"<br><span class=m>"+tr("Touchez pour améliorer.","Tap to upgrade.")+"</span>";
    s+=U('<g class="hit'+selc+'" data-act="open" data-ref="'+ref+'" data-tip="'+esc(tip)+'" tabindex="0" role="button" aria-label="'+FIELD[f.k].name+tr(" niveau "," level ")+f.l+'"><circle cx="'+x+'" cy="'+y+'" r="36" fill="rgba(0,0,0,0)"/><circle class="ring" cx="'+x+'" cy="'+y+'" r="34"/>');
    s+=A('<circle cx="'+x+'" cy="'+y+'" r="26" fill="#061620" stroke="'+col+'" stroke-width="4"/><g transform="rotate('+(a*180/Math.PI+90)+" "+x+" "+y+')"><rect x="'+(x-10)+'" y="'+(y-16)+'" width="7" height="32" fill="'+col+'"/><rect x="'+(x+3)+'" y="'+(y-16)+'" width="7" height="32" fill="'+col+'"/></g>');
    s+=U('<circle cx="'+(x+22)+'" cy="'+(y-22)+'" r="12" fill="#03080f" stroke="'+col+'"/><text x="'+(x+22)+'" y="'+(y-18)+'" text-anchor="middle" class="svgs" style="fill:#d6e5ec;font-size:12px">'+f.l+"</text>"+(busy?'<circle class="busy" cx="'+x+'" cy="'+y+'" r="36"/>':"")+"</g>");
  });
  for(let i=0;i<SLOT_COUNT;i++){
    const a=-Math.PI/2+Math.PI/8+i*Math.PI/4,x=C+Math.cos(a)*138,y=C+Math.sin(a)*138,ref="slot:"+i,sl=S.slots[i];
    const busy=S.build&&(S.build.type==="slot"||S.build.type==="new")&&S.build.i===i,selc=openRef===ref?" sel":"";
    let tip;
    if(sl)tip="<b>"+BLD[sl.k].name+tr(" · niveau "," · level ")+sl.l+"</b>"+BLD[sl.k].short+"<br>"+bldEffectText(sl.k,sl.l)+"<br><span class=m>"+tr("Touchez pour améliorer.","Tap to upgrade.")+"</span>";
    else if(busy)tip="<b>"+BLD[S.build.k].name+"</b>"+tr("En construction.","Under construction.");
    else if(slotOpen(i))tip=tr("<b>Emplacement libre</b>Touchez pour choisir un organite à construire.","<b>Free slot</b>Tap to choose an organelle to build.");
    else tip=tr("<b>Emplacement verrouillé</b>Il s’ouvre avec le cytosquelette niveau ","<b>Locked slot</b>It opens with cytoskeleton level ")+(i-5)+".";
    s+=U('<g class="hit'+selc+'" data-act="open" data-ref="'+ref+'" data-tip="'+esc(tip)+'" tabindex="0" role="button" aria-label="'+tr("Emplacement ","Slot ")+(i+1)+'"><circle cx="'+x+'" cy="'+y+'" r="40" fill="rgba(0,0,0,0)"/><circle class="ring" cx="'+x+'" cy="'+y+'" r="40"/>');
    if(sl){s+=A('<circle cx="'+x+'" cy="'+y+'" r="36" fill="#061a22" fill-opacity=".7"/>'+orgArt(sl.k,x,y))+U('<circle cx="'+(x+30)+'" cy="'+(y-30)+'" r="11" fill="#03080f" stroke="#7e97a7"/><text x="'+(x+30)+'" y="'+(y-26)+'" text-anchor="middle" class="svgs" style="fill:#d6e5ec;font-size:12px">'+sl.l+"</text>");}
    else if(busy&&S.build.type==="new"){s+=A('<g opacity=".45">'+orgArt(S.build.k,x,y)+"</g>")+U('<text x="'+x+'" y="'+(y+52)+'" text-anchor="middle" class="svgl">'+BLD[S.build.k].name+'</text><text x="'+x+'" y="'+(y+65)+'" text-anchor="middle" class="svgs">'+tr("en construction","building")+'</text>');}
    else if(slotOpen(i)){s+=A('<circle cx="'+x+'" cy="'+y+'" r="32" fill="rgba(3,8,15,.45)" stroke="#7e97a7" stroke-opacity=".7" stroke-width="2" stroke-dasharray="6 6"/>')+U('<text x="'+x+'" y="'+(y+56)+'" text-anchor="middle" class="svgs">'+tr("libre","free")+'</text>');}
    else{s+=A('<circle cx="'+x+'" cy="'+y+'" r="32" fill="none" stroke="#173349" stroke-width="2" stroke-dasharray="3 7"/>')+U("");}
    s+=U((busy?'<circle class="busy" cx="'+x+'" cy="'+y+'" r="42"/>':"")+"</g>");
  }
  const nb=S.build&&S.build.type==="noyau",nsel=openRef==="noyau"?" sel":"";
  const ntip="<b>"+tr("Noyau · niveau ","Nucleus · level ")+S.noyau+"</b>"+tr("Constructions +","Building +")+Math.round((speedUp()-1)*100)+PCT+tr(" plus rapides, "," faster, ")+filMax()+" filament"+(filMax()>1?"s":"")+tr(" possible"+(filMax()>1?"s":"")," possible")+".<br><span class=m>"+tr("Touchez pour améliorer.","Tap to upgrade.")+"</span>";
  s+=U('<g class="hit'+nsel+'" data-act="open" data-ref="noyau" data-tip="'+esc(ntip)+'" tabindex="0" role="button" aria-label="'+tr("Noyau niveau ","Nucleus level ")+S.noyau+'"><circle cx="'+C+'" cy="'+C+'" r="64" fill="rgba(0,0,0,0)"/><circle class="ring" cx="'+C+'" cy="'+C+'" r="64"/>');
  s+=A(sprSVG("o_noyau",C,C-6,3,-50));
  s+=U('<circle cx="'+(C+44)+'" cy="'+(C-44)+'" r="12" fill="#03080f" stroke="#a99bff"/><text x="'+(C+44)+'" y="'+(C-40)+'" text-anchor="middle" class="svgs" style="fill:#c9c0ff;font-size:12px">'+S.noyau+"</text>"+(nb?'<circle class="busy" cx="'+C+'" cy="'+C+'" r="66"/>':"")+"</g>");
  return s+"</svg>";
}
function miniSVG(org){
  const C=280,mem=233;
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 660 660" aria-hidden="true">'+bodySVG(C,mem);
  s+='<circle cx="'+C+'" cy="'+C+'" r="58" fill="url(#nucg)" stroke="#a99bff" stroke-width="2"/>';
  if(org)s+='<g transform="translate('+C+" "+C+") scale(2.4) translate("+(-C)+" "+(-C)+')">'+orgArt(org,C,C)+"</g>";
  return s+"</svg>";
}

/* Arbre */
const TREE_POS=(()=>{const p={E1:[130,520],E2a:[64,400],E2b:[196,400],E3a:[64,262],E3b:[196,262],P1:[450,520],P2:[450,410],M1:[770,520],M2a:[704,400],M2b:[836,400],M3a:[704,262],M3b:[836,262],ENDO:[450,46]};
  TYPE_ORDER.forEach((t,i)=>{const a=(-90+i*72)*Math.PI/180;p[TYPES[t].node]=[450+Math.cos(a)*118,215+Math.sin(a)*112];});return p;})();
function nodeTip(id){
  const n=NODES[id],st=nodeState(id);
  if(st==="hidden")return tr("<b>???</b>Gène caché : exprimez d’abord celui qui le précède.","<b>???</b>Hidden gene: first express the one before it.");
  let t="<b>"+n.name+"</b><i>"+tr("« "+n.hint+" »","“"+n.hint+"”")+"</i>";
  if(n.type)t+="<br>"+tr("Fort contre ","Strong against ")+TYPES[BEATS[n.type]].name+tr(", faible contre ",", weak against ")+TYPES[LOSES_TO[n.type]].name+".";
  t+="<br><span class=m>"+({owned:tr("Exprimé : touchez pour voir ses effets.","Expressed: tap to see its effects."),research:tr("En cours d’expression.","Being expressed."),closed:tr("Voie fermée.","Path closed."),open:tr("Disponible : touchez pour l’exprimer.","Available: tap to express it."),locked:tr("Pas encore accessible.","Not available yet.")}[st])+"</span>";
  return t;
}
function nodeView(id){
  const n=NODES[id],st=nodeState(id),tcol=n.type?"var(--t-"+n.type+")":null;
  let stroke="#173349",fill="#0a1b29",name=n.name,sub="",op=1,blocked=false;
  if(st==="owned"){stroke=tcol||"#5ee6d0";fill="rgba(94,230,208,.14)";const L=glvl(id);sub=(S.research&&S.research.id===id&&S.research.lvl)?tr("Niv. ","Lvl ")+L+" → "+(L+1)+"…":STAGE_NODES[id]?tr("Exprimé","Expressed"):tr("Niv. ","Lvl ")+L+(L>=maxLvl(id)?" · max":" / 10");}
  else if(st==="research"){stroke="#a99bff";sub=tr("En cours…","In progress…");}
  else if(st==="open"){stroke=tcol||"#5ee6d0";blocked=!n.req.every(reqMet);sub=blocked?tr("Requis ","Requires ")+n.req.filter(q=>!reqMet(q)).map(reqShort).join(", "):fmt(nodeCost(id).nuc)+tr(" nucléotides"," nucleotides");if(blocked)op=.8;}
  else if(st==="closed"){op=.35;sub=n.type?tr("2 voies déjà prises","2 paths already taken"):tr("Voie fermée","Path closed");}
  else if(st==="hidden"){name="???";sub=tr("Caché","Hidden");}
  else{sub=id==="ENDO"?tr("Deux gènes de rang 3","Two rank 3 genes"):STAGE_NODES[id]?tr("Après ","After ")+NODES[n.parents[0]].name:tr("Plus tard","Later");if(tcol){stroke=tcol;op=.6;}}
  return {st,tcol,name,sub,op,stroke,fill,ready:st==="open"&&!blocked};
}
function nodeIcon(id,st){const n=NODES[id];if(st==="hidden")return "g_unk2";if(n.type)return "g_"+n.type;return {E2a:"o_chloro",E2b:"r_atp",M2a:"o_flag",M2b:"o_photo",M3b:"o_photo",P1:"u_coll",P2:"u_phago",E1:"o_mito",M1:"o_photo",ENDO:"c_euc",COLO:"c_colo",PLURI:"c_pluri",APEX:"t_land"}[id]||null;}
function mCard(id){const v=nodeView(id);return '<button class="mnode st-'+v.st+(openRef==="node:"+id?" sel":"")+'" data-act="open" data-ref="node:'+id+'"'+(v.tcol?' style="--tc:'+v.tcol+'"':"")+'>'+(nodeIcon(id,v.st)?sprImg(nodeIcon(id,v.st),1):"")+'<b>'+esc(v.name)+"</b><span>"+esc(v.sub)+"</span></button>";}
function wheelSVG(){
  const cx=170,cy=118,pos={};let s='<svg viewBox="0 0 340 236" role="img" aria-label="'+tr("Roue des voies offensives","Offensive path wheel")+'"><defs><marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';
  TYPE_ORDER.forEach((t,i)=>{const a=(-90+i*72)*Math.PI/180;pos[t]=[cx+Math.cos(a)*112,cy+Math.sin(a)*92];});
  TYPE_ORDER.forEach(t=>{const a=pos[t],b=pos[BEATS[t]],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,o=46;s+='<line x1="'+(a[0]+ux*o)+'" y1="'+(a[1]+uy*o*0.6)+'" x2="'+(b[0]-ux*o)+'" y2="'+(b[1]-uy*o*0.6)+'" stroke="var(--t-'+t+')" stroke-width="2" marker-end="url(#arr2)"/>';});
  s+='<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" class="svgs" style="font-size:10px">'+tr("une flèche = « bat »","an arrow = “beats”")+'</text><text x="'+cx+'" y="'+(cy+10)+'" text-anchor="middle" class="svgs" style="font-size:10px">'+tr("2 voies au maximum","2 paths at most")+'</text>';
  TYPE_ORDER.forEach(t=>{const id=TYPES[t].node,v=nodeView(id),p=pos[t],w=112,h=42,sel=openRef==="node:"+id;
    s+='<g class="hit" data-act="open" data-ref="node:'+id+'" role="button" tabindex="0" aria-label="'+esc(v.name)+'" opacity="'+v.op+'"><rect x="'+(p[0]-w/2)+'" y="'+(p[1]-h/2)+'" width="'+w+'" height="'+h+'" rx="10" fill="'+v.fill+'" stroke="'+(sel?"#fff":v.stroke)+'" stroke-width="2"/>';
    const wi=nodeIcon(id,v.st);s+=sprSVG(wi,p[0]-w/2+14,p[1],0.95);
    s+='<text x="'+(p[0]+10)+'" y="'+(p[1]-2)+'" text-anchor="middle" class="svgl" style="font-size:'+(v.name.length>12?10:11.5)+'px'+(v.st==="owned"?";fill:var(--t-"+t+")":"")+'">'+esc(v.name)+'</text><text x="'+(p[0]+10)+'" y="'+(p[1]+12)+'" text-anchor="middle" class="svgs" style="font-size:'+(v.sub.length>16?8:9.5)+'px">'+esc(v.sub)+"</text></g>";});
  return s+"</svg>";
}
function mobileTreeHTML(){
  const cnt=b=>Object.keys(NODES).filter(k=>NODES[k].br===b&&nodeView(k).ready).length;
  const tabs=[["E",BRANCH.E],["P",BRANCH.P],["M",BRANCH.M],["X",tr("Stades","Stages")],["A","APEX"]];
  let h='<div class="mtree">'+mutBarHTML()+'<div class="mtabs">'+tabs.map(t=>{const c=cnt(t[0]);return '<button data-act="evobr" data-b="'+t[0]+'" aria-pressed="'+(evoBr===t[0])+'">'+t[1]+(c?"<i>"+c+"</i>":"")+"</button>";}).join("")+'</div><div class="mbody">';
  const line='<div class="mlink"></div>';
  if(evoBr==="E"||evoBr==="M"){const b=evoBr;
    h+='<p class="mnote">'+tr("Rang 3","Rank 3")+'</p><div class="mrow">'+mCard(b+"3a")+mCard(b+"3b")+"</div>"+'<div class="mrow links"><div class="mlink"></div><div class="mlink"></div></div>';
    h+='<p class="mnote">'+tr("Rang 2 · fourche : un choix ferme l’autre voie","Rank 2 · fork: one choice closes the other path")+'</p><div class="mrow">'+mCard(b+"2a")+mCard(b+"2b")+"</div>"+line;
    h+='<p class="mnote">'+tr("Rang 1","Rank 1")+'</p><div class="mrow one">'+mCard(b+"1")+"</div>";
  } else if(evoBr==="P"){
    h+='<p class="mnote">'+tr("Rang 3 · cinq voies offensives","Rank 3 · five offensive paths")+'</p><div class="mwheel">'+wheelSVG()+"</div>"+line;
    h+='<div class="mrow one">'+mCard("P2")+"</div>"+line+'<div class="mrow one">'+mCard("P1")+"</div>";
  } else if(evoBr==="A"){
    h+='<div class="mapex">'+apexHTML(true)+"</div>";
  } else {
    h+='<p class="mnote">'+tr("Stades de vie · ","Life stages · ")+LIFE[S.stage||1]+'</p><div class="mrow"><div>'+mCard("PLURI")+'</div><div>'+mCard("APEX")+'</div></div><div class="mrow"><div>'+mCard("ENDO")+'</div><div>'+mCard("COLO")+"</div></div>";
    h+='<p class="mnote">'+tr("Gènes de rang 3 : ","Rank 3 genes: ")+(RANK3.filter(has).map(k=>NODES[k].name).join(", ")||tr("aucun","none"))+" ("+RANK3.filter(has).length+tr(" / 2 requis)"," / 2 required)")+"</p>";
    h+=frissonHTML();
    h+='<div class="emerg">'+EMERG.map(e=>hasEm(e.id)?'<div class="em got">'+sprImg("g_emerg",1,"emi")+'<b>'+e.name+"</b>"+e.desc+"</div>":'<div class="em">'+sprImg("g_unk2",1,"emi")+'<b>???</b><span class="muted">'+tr("Émergence cachée","Hidden emergence")+"</span></div>").join("")+"</div>";
  }
  return h+"</div></div>";
}
function treeHTML(){
  const W2=900,H2=640;
  let s='<div class="treebox">'+mutBarHTML()+'<svg viewBox="0 0 '+W2+" "+H2+'" role="img" aria-label="'+tr("Arbre d’évolution","Evolution tree")+'"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';
  const P=TREE_POS,curve=(a,b,on,dash)=>{const y1=a[1]-23,y2=b[1]+23,my=(y1+y2)/2;s+='<path d="M'+a[0]+" "+y1+" C"+a[0]+" "+my+" "+b[0]+" "+my+" "+b[0]+" "+y2+'" fill="none" stroke="'+(on?"#5ee6d0":"#173349")+'" stroke-width="'+(on?2:1.5)+'"'+(dash?' stroke-dasharray="4 5"':"")+"/>";};
  const root=[450,620];
  ["E1","P1","M1"].forEach(id=>curve([root[0],root[1]+23],P[id],has(id)));
  ["E2a","E2b"].forEach(id=>curve(P.E1,P[id],has(id)));["M2a","M2b"].forEach(id=>curve(P.M1,P[id],has(id)));
  curve(P.E2a,P.E3a,has("E3a"));curve(P.E2b,P.E3b,has("E3b"));curve(P.M2a,P.M3a,has("M3a"));curve(P.M2b,P.M3b,has("M3b"));
  curve(P.P1,P.P2,has("P2"));
  s+='<line x1="450" y1="'+(P.P2[1]-23)+'" x2="450" y2="252" stroke="'+(has("P2")?"#5ee6d0":"#173349")+'" stroke-width="1.5"/>';
  ["E3a","E3b","M3a","M3b"].forEach(id=>curve(P[id],P.ENDO,has(id)&&has("ENDO"),true));
  s+='<path d="M'+(P.PT[0])+" "+(P.PT[1]-23)+" L450 69\" stroke=\"#173349\" stroke-dasharray=\"4 5\" fill=\"none\"/>";
  // Roue des forces et faiblesses
  s+='<circle cx="450" cy="222" r="34" fill="#071420" stroke="#173349"/><text x="450" y="219" text-anchor="middle" class="svgs" style="font-size:9.5px;letter-spacing:.08em">'+tr("2 VOIES","2 PATHS")+'</text><text x="450" y="231" text-anchor="middle" class="svgs" style="font-size:9.5px;letter-spacing:.08em">'+tr("MAXIMUM","AT MOST")+'</text>';
  TYPE_ORDER.forEach(t=>{const a=P[TYPES[t].node],b=P[TYPES[BEATS[t]].node],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,o=58;s+='<line x1="'+(a[0]+ux*o)+'" y1="'+(a[1]+uy*o*0.55)+'" x2="'+(b[0]-ux*o)+'" y2="'+(b[1]-uy*o*0.55)+'" stroke="var(--t-'+t+')" stroke-width="1.6" marker-end="url(#arr)" opacity=".85"/>';});
  [["E",130,175],["M",770,175]].forEach(b=>{s+='<text x="'+b[1]+'" y="'+b[2]+'" text-anchor="middle" class="svgs" style="letter-spacing:.14em">'+BRANCH[b[0]].toUpperCase()+"</text>";});
  s+='<text x="450" y="366" text-anchor="middle" class="svgs" style="letter-spacing:.14em">'+tr("PRÉDATION · une flèche = « bat »","PREDATION · an arrow = “beats”")+'</text>';
  s+='<text x="450" y="'+(root[1]+6)+'" text-anchor="middle" class="svgs" style="fill:#5ee6d0">'+tr("Souche ","Strain ")+SOUCHES[S.souche].name+"</text>";
  for(const id in NODES){
    if(!P[id])continue;
    const n=NODES[id],p=P[id],ic0=nodeIcon(id,nodeState(id)),w=(id==="ENDO"?170:(n.type?120:124))+(ic0&&n.type?10:0),h=46,x=p[0]-w/2,y=p[1]-h/2,sel=openRef==="node:"+id,tx=p[0]+(ic0?11:0);
    const v=nodeView(id),st=v.st,tcol=v.tcol,name=v.name,sub=v.sub,op=v.op,dash=st==="hidden"?' stroke-dasharray="4 4"':"";let stroke=v.stroke,fill=v.fill;
    if(sel)stroke="#ffffff";
    s+='<g class="hit" data-act="open" data-ref="node:'+id+'" data-tip="'+esc(nodeTip(id))+'" tabindex="0" role="button" aria-label="'+esc(name)+'" opacity="'+op+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="10" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(n.type?2:1.6)+'"'+dash+"/>";
    if(ic0)s+=sprSVG(ic0,x+15,p[1],0.95);
    s+='<text x="'+tx+'" y="'+(p[1]-3)+'" text-anchor="middle" class="svgl" style="font-size:'+(name.length>13&&ic0?11:12.5)+'px'+(st==="owned"?";fill:"+(tcol||"#5ee6d0"):"")+'">'+esc(name)+'</text><text x="'+tx+'" y="'+(p[1]+13)+'" text-anchor="middle" class="svgs" style="font-size:'+(sub.length>(ic0?18:22)?9:10.5)+'px">'+esc(sub)+"</text></g>";
  }
  s+="</svg>";
  s+='<div class="stages"><span class="mnote">'+tr("Stades de vie · ","Life stages · ")+LIFE[S.stage||1]+'</span><div class="stagerow">'+["ENDO","COLO","PLURI","APEX"].map(mCard).join('<span class="sarr">→</span>')+"</div></div>";
  s+=frissonHTML();
  s+='<div class="emerg">'+EMERG.map(e=>hasEm(e.id)?'<div class="em got">'+sprImg("g_emerg",1,"emi")+'<b>'+e.name+"</b>"+e.desc+fxList(e.eff)+"</div>":'<div class="em">'+sprImg("g_unk2",1,"emi")+'<b>???</b><span class="muted">'+tr("Émergence cachée : deux gènes de branches différentes.","Hidden emergence: two genes from different branches.")+"</span></div>").join("")+"</div>"+apexHTML(false)+"</div>";
  return s;
}

