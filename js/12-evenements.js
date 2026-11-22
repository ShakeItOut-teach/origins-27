/* Origins 27 · 12-evenements.js
   Événements de zone, alliances, adaptation des rivaux et récolte automatique.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* ===== Événements de zone : des raisons de bouger ===== */
const EVENTS={
  erupt:{name:"Éruption hydrothermale",ic:"🌋",col:"#ff9e6b",dur:1440,r:2,desc:"Une faille s’ouvre : des gisements très riches apparaissent pour un jour. Envoyez des porteuses, ou migrez à côté."},
  bloom:{name:"Efflorescence de plancton",ic:"🌿",col:"#8fd36b",dur:1080,r:4,desc:"Le plancton explose : les gisements de la zone se remplissent sans cesse et la récolte y rapporte 50 % de plus."},
  levi:{name:"Léviathan",ic:"🦑",col:"#ff4d6d",dur:2160,r:8,desc:"Un prédateur géant rôde. Il attaque les bases à moins de 8 cases. Le vaincre rapporte un butin énorme et beaucoup d’expérience au héros."},
  anox:{name:"Zone anoxique",ic:"☠️",col:"#a99bff",dur:1440,r:6,desc:"L’oxygène disparaît : une base dans la zone produit 30 % de moins. Migrez hors du cercle ou attendez."}
};
function inEvent(type,x,y){return (S.events||[]).some(e=>e.type===type&&Math.hypot(x-e.x,y-e.y)<=e.r+0.5);}
function anoxHere(){const c=cpos();return inEvent("anox",c[0],c[1]);}
function freeWater(x,y){return x>=0&&y>=0&&x<W&&y<H&&inWorld(x,y)&&!isLand(x,y)&&!botAt(x,y)&&!(x===S.px&&y===S.py);}
function spawnEvent(force){
  const c=cpos(),ks=Object.keys(EVENTS).filter(k=>k!=="levi"||bDays()>=2),type=force||ks[Math.floor(Math.random()*ks.length)],E=EVENTS[type];let x,y,g=0;
  do{const a=Math.random()*Math.PI*2,r=type==="anox"?Math.random()*3:5+Math.random()*10;x=Math.round(c[0]+Math.cos(a)*r);y=Math.round(c[1]+Math.sin(a)*r);g++;}while(!freeWater(x,y)&&g<200);
  if(g>=200)return;
  const ev={id:S.nextId++,type,x,y,r:E.r,start:S.t,end:S.t+E.dur};
  if(type==="erupt"){for(let i=0;i<5;i++){const a=i/5*Math.PI*2,xx=Math.round(x+Math.cos(a)*1.5),yy=Math.round(y+Math.sin(a)*1.5);if(!freeWater(xx,yy))continue;const T=S.tiles[yy*W+xx];if(T.w)continue;T.k=["prot","lip","nuc","prot","lip"][i];T.a=T.max=T.m=2500+Math.round(Math.random()*1500);T.rich=true;T.ev=ev.id;T.s=1;}}
  if(type==="bloom"){for(let i=0;i<6;i++){const a=Math.random()*Math.PI*2,r=1+Math.random()*3,xx=Math.round(x+Math.cos(a)*r),yy=Math.round(y+Math.sin(a)*r);if(!freeWater(xx,yy))continue;const T=S.tiles[yy*W+xx];if(T.k||T.w)continue;T.k=Math.random()<0.5?"lip":"prot";T.a=T.max=T.m=600+Math.round(Math.random()*500);T.ev=ev.id;T.s=1;}}
  if(type==="levi"){const T=S.tiles[y*W+x];T.k=null;T.w={type:TYPE_ORDER[Math.floor(Math.random()*5)],def:Math.round(260+bDays()*140+cen(x,y)*6),bio:3500,max:3500,mb:3500,boss:ev.id};T.s=1;ev.atkT=S.t+240;}
  for(let dy=-E.r;dy<=E.r;dy++)for(let dx=-E.r;dx<=E.r;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&dx*dx+dy*dy<=E.r*E.r)S.tiles[yy*W+xx].s=1;}
  S.events.push(ev);const d=Math.round(dist(x,y));
  log(E.ic+" "+E.name+" à "+d+" case"+(d>1?"s":"")+" (case "+x+","+y+").","rare");toast(E.ic+" "+E.name+(d<=E.r?" sur votre base":" à "+d+" cases"));
  popup({grp:"ev",kick:"Événement",title:E.ic+" "+E.name,body:"<p>"+E.desc+"</p><p class=\"desc\">À "+d+" cases de votre base, pour "+fmtDur(E.dur)+". Ouvrez les abysses pour la voir.</p>"});
}
function bossDown(x,y,w){const ev=S.events.find(e=>e.id===w.boss);if(ev)ev.end=S.t;enGive(20,"léviathan vaincu");log("🦑 Le léviathan est vaincu !","rare");S.hero.xp+=Math.round(w.def*0.5);popup({kick:"Exploit",title:"Léviathan vaincu",body:"<p>Les abysses respirent. Votre héros gagne "+Math.round(w.def*0.5)+" XP, et le butin est énorme.</p>"});}
function eventsStep(dm){
  if(!S.events)S.events=[];
  S.evT=(S.evT||0)+dm;const every=S.evEvery||480;
  if(S.t>720&&S.evT>=every){S.evT=0;S.evEvery=360+Math.random()*420;if(S.events.length<3)spawnEvent();}
  for(let i=S.events.length-1;i>=0;i--){const e=S.events[i];
    if(e.type==="bloom"&&Math.floor(S.t/60)!==Math.floor((S.t-dm)/60)){for(let dy=-e.r;dy<=e.r;dy++)for(let dx=-e.r;dx<=e.r;dx++){const xx=e.x+dx,yy=e.y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const T=S.tiles[yy*W+xx];if(T.k&&T.max)T.a=Math.min(T.max,T.a+T.max*0.25);}}
    if(e.type==="levi"&&S.t>=e.atkT&&S.t<e.end){e.atkT=S.t+240;const T=S.tiles[e.y*W+e.x];if(!T.w||!T.w.boss){e.end=S.t;}else if(dist(e.x,e.y)<=e.r&&!S.mig){
      const atk=Math.round(T.w.def*0.7),def=playerDef(),lines=["Le léviathan attaque avec une force de "+fmt(atk)+" contre votre défense de "+fmt(def)+"."];
      if(atk>def){const k=killUnits(Math.ceil(S.idle*0.15));RES.forEach(r=>{S.res[r]=Math.max(0,S.res[r]-Math.max(0,S.res[r]-protectedAmt())*0.15);});lines.push('<span class="neg">Il dévore '+k+" troupe"+(k>1?"s":"")+" et une part de vos réserves.</span>","Montez votre défense (soldates, macrophages, volvox) ou migrez hors de sa portée.");log("🦑 Le léviathan a frappé votre base.","bad");toast("🦑 Le léviathan attaque !");report("combat","Léviathan · base attaquée",lines,false);}
      else{lines.push('<span class="up">Vos défenses tiennent : il repart bredouille.</span>');report("combat","Léviathan repoussé",lines,true);}}}
    if(S.t>=e.end){if(e.type!=="levi"||true){for(const T of S.tiles){if(T.ev===e.id){T.k=null;T.a=T.max=T.m=0;T.rich=false;T.ev=null;}if(T.w&&T.w.boss===e.id)T.w=null;}}S.events.splice(i,1);log(EVENTS[e.type].ic+" "+EVENTS[e.type].name+" : terminé.");dirty=true;}
  }
}
function eventPill(){if(!S.events||!S.events.length)return "";const e=S.events.slice().sort((a,b)=>dist(a.x,a.y)-dist(b.x,b.y))[0],E=EVENTS[e.type];return '<button class="evpill" style="--ec:'+E.col+'" data-act="goto" data-tab="map" data-ref="tile:'+e.x+":"+e.y+'">'+E.ic+" "+E.name+" · "+(dist(e.x,e.y)<=e.r+0.5?"vous y êtes":Math.round(dist(e.x,e.y))+" cases")+' · <span data-end="'+e.end+'"></span></button>';}

/* ===== Alliances : les rivaux simulés se regroupent sous des bannières ===== */
const ALLY_INFO={"[ABY]":"Les Abyssaux","[KRK]":"Le Kraken","[MER]":"La Mer","[TOX]":"Les Toxiques","[LUM]":"Les Lumineux","[NOX]":"La Nuit"};
function allyBots(tag){return S.bots.filter(b=>b.tag===tag);}
function allyHelp(){if(!S.ally)return 0;const c=cpos();return Math.round(allyBots(S.ally).filter(b=>Math.hypot(b.x-c[0],b.y-c[1])<=25).reduce((a,b)=>a+botDef(b)*0.15,0));}
function alliancesHTML(){
  let h='<div class="card"><h2>Alliances</h2><p class="desc">Une alliance ne vous attaque jamais, vous envoie des renforts quand on vous attaque (alliés à moins de 25 cases), partage sa vision et donne +5 % de production. Ses ennemis, eux, vous prennent pour cible.</p>';
  const c=cpos();
  Object.keys(ALLY_INFO).forEach(t=>{const bs=allyBots(t),pts=bs.reduce((a,b)=>a+botPow(b),0),near=bs.filter(b=>Math.hypot(b.x-c[0],b.y-c[1])<=25).length,me=S.ally===t;
    h+='<div class="allyrow'+(me?" me":"")+'"><div><b>'+t+" "+ALLY_INFO[t]+"</b><span class=\"desc\">"+bs.length+" membres · "+fmt(pts)+" points · "+near+" près de vous</span></div>"+(me?'<button class="btn sm danger" data-act="allyleave">Quitter</button>':'<button class="btn sm alt" data-act="allyjoin" data-tag="'+t+'"'+(S.ally?" disabled":"")+">Rejoindre</button>")+"</div>";});
  return h+(S.ally?'<p class="desc" style="margin-top:6px">Renforts possibles maintenant : +'+fmt(allyHelp())+" de défense.</p>":"")+"</div>";
}
function joinAlly(t){S.ally=t;S.allyT=S.t;allyBots(t).forEach(b=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=b.x+dx,y=b.y+dy;if(x>=0&&y>=0&&x<W&&y<H)S.tiles[y*W+x].s=1;}b.anger=0;});
  log("Vous rejoignez "+t+" "+ALLY_INFO[t]+". 💬 "+pickA(["Bienvenue ! 🫶","On compte sur toi 💪","Enfin du renfort 🦠"]),"good");popup({kick:"Alliance",title:t+" "+ALLY_INFO[t],body:"<p>Ses "+allyBots(t).length+" membres ne vous attaqueront plus, et les plus proches viendront vous défendre. Leur position est maintenant sur votre carte.</p><p class=\"desc\">Attention : les autres bannières vous voient désormais comme une cible.</p>"});dirty=true;}

/* Les rivaux s’adaptent à vos choix */
function botsAdapt(){
  const c=cpos(),own=ownedTypes(),pp=playerPoints();let switched=0;
  for(const b of S.bots){const d=Math.hypot(b.x-c[0],b.y-c[1]);if(d>30||b.tag&&b.tag===S.ally)continue;
    if(own.length&&Math.random()<0.25){const counter=LOSES_TO[own[0]];if(b.type!==counter){b.type=counter;switched++;}}
    const bp=botPoints(b);if(pp>bp*1.3)b.g=Math.min(3,b.g+0.05);}
  if(switched)log("📣 Les rivaux s’adaptent : "+switched+" d’entre eux développent des "+TYPES[LOSES_TO[own[0]]].name.toLowerCase()+", qui battent vos "+TYPES[own[0]].name.toLowerCase()+".","bad");
}

/* Récolte automatique : un seul geste pour occuper les collectrices libres (gisements connus, sinon exploration) */
function autoTargets(){
  const c=cpos(),R=Math.floor(range()),dep=[],unk=[];
  for(let y=c[1]-R;y<=c[1]+R;y++)for(let x=c[0]-R;x<=c[0]+R;x++){if(x<0||y<0||x>=W||y>=H||!inWorld(x,y)||isLand(x,y))continue;const d=dist(x,y);if(d<0.5||d>range()||botAt(x,y))continue;if(S.missions.some(M=>M.x===x&&M.y===y&&!M.arrived))continue;const T=S.tiles[y*W+x];
    if(T.s&&T.k&&(isVis(x,y)?T.a:T.m)>30)dep.push([x,y,d,isVis(x,y)?T.a:T.m]);else if(!T.s)unk.push([x,y,d]);}
  dep.sort((a,b)=>b[3]/b[2]-a[3]/a[2]);unk.sort((a,b)=>a[2]-b[2]);return {dep,unk};
}
function autoCollect(){
  if(!S||S.mig||S.idle<1){toast(S&&S.mig?"Migration en cours":"Aucune collectrice libre");return 0;}
  enInit();if(S.en<1){showModal(energyHTML(1));return 0;}
  const {dep,unk}=autoTargets(),keep=openRef,keepN=S.selN;let sent=0,trips=0,noEn=false;
  for(const t of dep){if(S.idle<1||trips>=4)break;const n=Math.max(1,Math.min(S.idle,Math.ceil(t[3]/capPer())));S.selN=n;openRef="tile:"+t[0]+":"+t[1];if(!sendMission("collect",true,true)){if(S.en<1){noEn=true;break;}continue;}sent+=n;trips++;}
  for(let i=0;!noEn&&S.idle>0&&trips<3&&i<unk.length;i+=Math.max(1,Math.floor(unk.length/3))){const t=unk[i];S.selN=1;openRef="tile:"+t[0]+":"+t[1];if(!sendMission("collect",true,true)){if(S.en<1){noEn=true;break;}continue;}sent++;trips++;}
  openRef=keep;S.selN=keepN;
  if(sent&&noEn)toast("⚡ Plus d’énergie : "+trips+" trajet"+(trips>1?"s":"")+" seulement");else if(sent){S.autoUsed=1;toast(sent+" collectrice"+(sent>1?"s":"")+" envoyée"+(sent>1?"s":"")+" ("+trips+" trajet"+(trips>1?"s":"")+")");}else toast("Rien à récolter à portée : explorez ou améliorez le flagelle");
  dirty=true;return sent;
}
