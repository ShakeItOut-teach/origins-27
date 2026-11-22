/* Origins 27 · 11-moteur.js
   Moteur du jeu : formats d'affichage, vision, boucle de simulation (step / advance), constructions et envois.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
function fmt(n){return Math.floor(n).toLocaleString("fr-FR");}
function fmtDur(min){min=Math.max(0,min);if(min<1)return Math.max(1,Math.ceil(min*60))+" s";if(min<60)return Math.ceil(min)+" min";const h=Math.floor(min/60),m=Math.min(59,Math.ceil(min%60));return h+" h "+String(m).padStart(2,"0");}
function fmtClock(t){const d=dayIdx(t)+1,c=hod(t),h=Math.floor(c/60),m=Math.floor(c%60);return "Jour "+d+" · "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");}
function fmtMod(k,v){if(k==="revealSource")return MOD_LABEL[k];if(k==="photoPct")return "photosynthèse ×"+(Math.round(v*10)/10)+" (selon la lumière : aujourd’hui +"+Math.round(v*photoF()*100)+" % d’ATP)";if(k==="filAdd")return "filaments +"+v;const add=k==="rangeAdd"||k==="visionAdd";const s=v>0?"+":"−";const val=add?Math.abs(v)+" case"+(Math.abs(v)>1?"s":""):Math.round(Math.abs(v)*100)+" %";return MOD_LABEL[k]+" "+s+val;}
function isGood(k,v){return GOOD_WHEN_NEG[k]?v<0:v>0;}
function fxList(o){const ks=Object.keys(o).filter(k=>o[k]);if(!ks.length)return "";return '<ul class="fx">'+ks.map(k=>'<li class="'+(isGood(k,o[k])?"good":"badfx")+'">'+fmtMod(k,o[k])+"</li>").join("")+"</ul>";}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");}

function updateVision(){const r=visR()+0.45,c=cpos(),R=Math.ceil(r);for(let y=Math.max(0,c[1]-R);y<=Math.min(H-1,c[1]+R);y++)for(let x=Math.max(0,c[0]-R);x<=Math.min(W-1,c[0]+R);x++){if(dist(x,y)<=r){const T=S.tiles[y*W+x];if(!T.s)dirty=true;T.s=1;T.m=T.a;if(T.w)T.w.mb=T.w.bio;}}S.fils.forEach(f=>{const T=S.tiles[f.y*W+f.x];T.s=1;T.m=T.a;});}
function reveal(cx,cy){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=W||y>=H)continue;const T=S.tiles[y*W+x];T.s=1;T.m=T.a;if(T.w)T.w.mb=T.w.bio;}}
function revealSource(say){S.src.forEach(p=>{const T=S.tiles[p[1]*W+p[0]];T.s=1;T.m=T.a;});if(say)log("Vos magnétosomes indiquent la direction d’une source hydrothermale.","good");}

function checkEmergences(){
  S.emPairs.forEach((p,i)=>{const e=EMERG[i];if(!hasEm(e.id)&&has(p[0])&&has(p[1])){S.emerg.push(e.id);log("Émergence : "+e.name+". "+e.desc,"rare");popup({kick:"Émergence",title:e.name,body:"<p>"+e.desc+" Votre forme change, d’une manière qu’aucun arbre ne montrait.</p>"+fxList(e.eff)});}});
}
function frissonInfo(){const pend=[],lost=[];S.emPairs.forEach((p,i)=>{if(hasEm(EMERG[i].id))return;const a=has(p[0]),b=has(p[1]);if(a===b)return;const miss=a?p[1]:p[0],st=nodeState(miss);if(st==="closed")lost.push(miss);else pend.push(BRANCH[NODES[miss].br]);});return {pend,lost};}
function frisson(){return frissonInfo().pend.length;}
function frissonHTML(){const f=frissonInfo();let h="";
  if(f.pend.length){const by={};f.pend.forEach(b=>by[b]=(by[b]||0)+1);h+='<p class="frisson">Vos gènes frémissent : '+Object.keys(by).map(b=>by[b]+" partenaire"+(by[b]>1?"s":"")+" possible"+(by[b]>1?"s":"")+" dans la branche "+b).join(", ")+". Exprimez-y d’autres gènes pour déclencher une émergence.</p>";}
  if(f.lost.length)h+='<p class="frisson lost">'+f.lost.length+" émergence"+(f.lost.length>1?"s vous ont":" vous a")+" échappé : "+(f.lost.length>1?"leur":"son")+" partenaire est sur une voie que vous avez fermée.</p>";
  return h;}

function step(dm){
  enStep();stashStep();mresStep();const r=rates(),u=upkeep(),m=mods();let short=null;
  for(const k of RES){
    const net=r[k]-u[k];let v=S.res[k];
    if(net>0){if(v<r.cap)v=Math.min(r.cap,v+net*dm/60);}else v=Math.max(0,v+net*dm/60);
    const pa=protectedAmt();if(v>pa)v-=(v-pa)*SPOIL*dm/60;
    if(v<=0.5&&net<0)short=k;S.res[k]=v;
  }
  S.fils.forEach(f=>{const T=S.tiles[f.y*W+f.x];if(T.k)T.a=Math.max(0,T.a-filRate(T,m)*dm/60);});
  for(const T of S.tiles){if(T.max&&T.a<T.max)T.a=Math.min(T.max,T.a+T.max*0.015*dm/60);if(T.w&&T.w.bio<T.w.max)T.w.bio=Math.min(T.w.max,T.w.bio+T.w.max*0.02*dm/60);}
  S.wildT=(S.wildT||0)+dm;if(S.wildT>=90){S.wildT=0;let c=0;for(const T of S.tiles)if(T.w)c++;if(c<220*AREA_F)spawnWild();}
  if(S.mig&&S.t+dm>=S.mig.end){const first=!S.migDone,z0=zoneOf(S.px,S.py),L0=depthLight(S.px,S.py);S.px=S.mig.x;S.py=S.mig.y;const z1=zoneOf(S.px,S.py);if(z1!==z0){const up=depthLight(S.px,S.py)>L0;popup({kick:up?"Vous remontez":"Vous descendez",title:ZONE_NAME[z1],body:"<p>Profondeur ≈ <b>"+fmt(depthM(S.px,S.py))+" m</b> · lumière <b>"+Math.round(hereLight()*100)+" %</b>.</p><p>"+(up?"La lumière gagne : la photosynthèse rapporte davantage, mais les eaux claires sont plus disputées.":"Le noir s’épaissit : la lumière ne vous aidera plus.")+"</p>"+(has("E2a")?"<p>Photosynthèse : +"+Math.round(mods().photoPct*photoF()*100)+" % d’ATP ici.</p>":"")});log("Nouvelle zone : "+ZONE_NAME[z1]+" ("+fmt(depthM(S.px,S.py))+" m).","good");}S.mig=null;S.migDone=1;log("Migration terminée : votre cellule s’est installée en "+S.px+","+S.py+".","good");toast("Migration terminée");if(first)popup({kick:"Migration",title:"Nouveau territoire",body:"<p>Votre cellule s’est déplacée. Vos distances, votre vision et vos filaments partent désormais d’ici.</p>"});}
  if(short){S.starve+=dm;if(S.starve>=30){S.starve=0;if(S.idle>0){killUnits(1);log("Une collectrice meurt de faim : il manque des "+RES_NAME[short].toLowerCase()+". Réduisez leur nombre ou produisez plus.","bad");toast("Une collectrice meurt de faim");}}}else S.starve=0;
  S.t+=dm;
  botsStep(dm);
  if(S.build&&S.t>=S.build.end){
    const b=S.build;S.build=null;
    if(b.type==="field"){S.fields[b.i].l++;toast(FIELD[S.fields[b.i].k].name+" niveau "+S.fields[b.i].l);log(FIELD[S.fields[b.i].k].name+" passe au niveau "+S.fields[b.i].l+".");}
    else if(b.type==="noyau"){S.noyau++;toast("Noyau niveau "+S.noyau);log("Le noyau passe au niveau "+S.noyau+".");if(!S.mutOffer)offerMut();if(S.noyau%2===1&&S.noyau>1)popup({kick:"Votre base grandit",title:"Stade "+baseStage()+" sur 5",body:"<p>"+["","","Votre membrane s’épaissit et vos organites se voient de loin.","Des cellules s’amoncellent autour de la vôtre : un premier monticule.","Un anneau de pointes protège votre amas : la base se fortifie.","Une tour vivante domine l’amas, entourée d’un rempart : tout le monde vous voit venir."][baseStage()]+" Regardez-la dans les abysses.</p>"});}
    else if(b.type==="new"){S.slots[b.i]={k:b.k,l:1};log(BLD[b.k].name+" construit.","good");popup({kick:"Nouvel organite",title:BLD[b.k].name,body:"<p>"+BLD[b.k].role+"</p>",org:b.k});}
    else if(b.type==="fil"){S.fils.push({x:b.x,y:b.y});const T=S.tiles[b.y*W+b.x];log("Filament relié à la case "+b.x+","+b.y+" : il alimente votre cellule en continu.","good");if(S.fils.length===1)popup({kick:"Extension",title:"Premier filament",body:"<p>Votre cellule s’étend physiquement jusqu’à un gisement de "+RES_NAME[T.k].toLowerCase()+". Il vous alimente en continu tant qu’il en reste, puis au rythme de sa régénération. En multijoueur, une attaque pourra le couper, sans toucher à votre cellule.</p>"});else toast("Filament relié");}
    else{S.slots[b.i].l++;toast(BLD[S.slots[b.i].k].name+" niveau "+S.slots[b.i].l);log(BLD[S.slots[b.i].k].name+" passe au niveau "+S.slots[b.i].l+".");}
    if(S.bq&&S.bq.length){const n=S.bq.shift();S.build=Object.assign(n,{start:S.t,end:S.t+n.time});log("File : "+n.label+" commence.");}
  }
  if(S.research&&S.t>=S.research.end){
    const id=S.research.id,lv=S.research.lvl;S.research=null;const n=NODES[id];
    if(lv){S.glv[id]=lv;log(n.name+" passe au niveau "+lv+".","good");toast(n.name+" niveau "+lv);if(lv===5||lv===10)popup({kick:"Palier de gène",title:n.name+" · niveau "+lv,body:"<p>Ses effets sont renforcés.</p>"+fxList(scaledEff(id,lv)),node:id});}
    else{S.nodes.push(id);
    log("Gène exprimé : "+n.name+".","good");
    let body='<p style="font-style:italic">« '+n.hint+" »</p>"+fxList(n.eff)+fxList(n.mal);
    if(n.type)body+='<p class="desc" style="margin-top:8px">Fort contre '+TYPES[BEATS[n.type]].name+", faible contre "+TYPES[LOSES_TO[n.type]].name+".</p>";
    const stg=STAGE_NODES[id];if(stg){S.stage=stg;body+="<p>"+STAGE_TXT[stg]+"</p>";}
    popup({kick:stg?"Nouvelle forme de vie · "+LIFE[stg]:"Nouveau gène",title:n.name,body,node:id});
    if(n.eff.revealSource)revealSource(true);
    checkEmergences();
    if(stg){log("Stade de vie : "+LIFE[stg]+".","rare");}
    if(id==="APEX"){S.won={t:S.t};log("Votre lignée sort de l’eau. Fin du prototype !","good");}
    }
  }
  while(S.queue.length&&S.t>=S.queue[0].t){const q=S.queue.shift();S.army[q.k]=(S.army[q.k]||0)+1;syncIdle();dirty=true;if(!S.queue.length)toast("Troupes prêtes");}
  eventsStep(dm);
  for(let i=S.missions.length-1;i>=0;i--){
    const M=S.missions[i];
    if(!M.arrived&&S.t>=M.arrive){
      M.arrived=true;const T=S.tiles[M.y*W+M.x];reveal(M.x,M.y);if(!M.u)M.u={coll:M.n};
      if(M.u.ecl){for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=M.x+dx,yy=M.y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&dx*dx+dy*dy<=10)reveal(xx,yy);}}
      if(M.kind==="spy")spyArrive(M);
      else if(M.kind==="raid")raidArrive(M);
      else if(M.kind==="hunt"&&!T.w){M.result="none";report("combat","Proie disparue · case "+M.x+","+M.y,["Il n’y avait plus rien à chasser à l’arrivée : un autre raid l’avait déjà dévorée."],null);}
      else if(M.kind==="hunt"&&T.w){
        const w=T.w,mt=matchup(w.type),hp=M.hero?heroPower(w.type):0,pw=huntPower(M.u,w.type)+hp,win=pw*ATK_ADV>=w.def,lf=lossFrac(pw,w.def),n0=M.n,u0=Object.assign({},M.u),tut=!!w.tut;
        let lost=Math.min(M.n,Math.round(M.n*lf));
        const lostBy=applyLoss(M,lost),lines=['<span class="'+(win?"up":"neg")+'">'+(win?"Victoire":"Défaite")+"</span> contre "+WILD_NAME[w.type].toLowerCase()+(w.boss?" (léviathan)":"")+" · robustesse "+fmt(w.def)+".",fightTable(u0,lostBy,w.type,hp,pw,w.def,win,"Robustesse")];
        if(win){const cap0=compCarry(M.u)*2.5+hp,take=Math.min(w.bio,cap0),tot=take*(1+m.lootPct);M.cargo={prot:Math.round(tot*.5),nuc:Math.round(tot*.25),lip:Math.round(tot*.15),atp:Math.round(tot*.3)};if(w.boss)bossDown(M.x,M.y,w);T.w=null;M.result="win";
          lines.push("<b>Butin</b> · biomasse "+fmt(w.bio)+" · vos survivants peuvent porter "+fmt(cap0)+(m.lootPct?" · bonus +"+Math.round(m.lootPct*100)+" %":"")+". L’organisme est dévoré et disparaît de la carte.");
          lines.push(lootTable(RES.map(k=>[k,M.cargo[k]]),cap0<w.bio?"Une partie de la biomasse est restée sur place : il fallait plus de charge (porteuses).":""));log("Chasse réussie sur "+WILD_NAME[w.type]+".","good");dqAdd("hunt");}
        else{M.result="lose";if(M.hero)lines.push("Le héros, lui, revient toujours.");huntAdvice(n0,w,hp,M.hero).slice(0,2).forEach(a=>lines.push("Conseil : "+a));log("Chasse ratée sur "+WILD_NAME[w.type]+".","bad");toast("Chasse ratée");}
        if(M.hero)lines.push(heroGain(w,win));
        if(tut){M.u=u0;M.n=uSum(u0);S.tutHuntDone=1;lines.push('<span class="up">Première chasse : vos '+lost+" pertes sont remboursées.</span>");
          const per=10*(1+mods().predPct)*mt.f,adv=huntAdvice(n0,w,hp,M.hero),R=(v,bad)=>bad?'<b class="neg">'+v+"</b>":"<b>"+v+"</b>";
          popup({kick:"Analyse de votre première chasse",title:win?"Victoire":"Défaite",body:'<div class="ana">'+
            '<div class="stat"><span>Force totale</span>'+R(fmt(pw),!win)+'</div><div class="stat"><span>Robustesse de la proie</span><b>'+w.def+"</b></div>"+
            '<div class="stat"><span>Collectrices envoyées</span>'+R(n0,n0*per+hp<w.def/ATK_ADV)+'</div><div class="stat"><span>Force par collectrice</span>'+R(per.toFixed(1),per<10)+"</div>"+
            '<div class="stat"><span>Voie offensive</span>'+R(mt.lbl,mt.f<1)+'</div><div class="stat"><span>Héros</span>'+R(M.hero?"+"+fmt(hp):"absent",!M.hero)+"</div>"+
            '<div class="stat"><span>Pertes</span>'+R(lost+" ("+Math.round(lf*100)+" %)",lf>0.35)+"</div></div>"+
            '<p class="desc" style="margin-top:8px">'+(win?"Plus l’écart de force est grand, moins vous perdez de collectrices. À force égale, les deux camps saignent.":"Il vous manquait de la force. Le jeu vous rend vos collectrices cette fois-ci.")+"</p>"+
            (adv.length?'<ul class="advice">'+adv.map(a=>"<li>"+a+"</li>").join("")+"</ul>":"")});}
        report("combat",(win?"Victoire":"Défaite")+" · "+WILD_NAME[w.type],lines,win);
      } else if(T.k&&T.a>0){const take=Math.min(T.a,compCarry(M.u)),bl=inEvent("bloom",M.x,M.y)?1.5:1;T.a-=take;T.m=T.a;M.cargo={};M.cargo[T.k]=Math.round(take*bl*(1+m.extractPct)*(T.rich?1+m.richMult:1));M.cargo.atp=Math.round(take*DIGEST);if(T.ev)M.en=2;}
      if(T.rich&&!S.foundSrc){S.foundSrc=1;log("Vos collectrices ont trouvé une source hydrothermale. Les eaux y sont très riches.","good");popup({kick:"Découverte",title:"Source hydrothermale",body:"<p>Personne ne l’avait annoncée. Ses gisements sont dix fois plus riches que les autres. Reliez-la par un filament si vous le pouvez.</p>"});}
      dirty=true;
    }
    if(M.arrived&&S.t>=M.back){
      for(const k in (M.u||{coll:M.n}))S.army[k]=(S.army[k]||0)+(M.u?M.u[k]:M.n);syncIdle();
      const cap=rates().cap;let parts=[],lostCap=[];
      if(M.cargo){for(const k in M.cargo){const before=S.res[k];S.res[k]=Math.max(before,Math.min(cap,before+M.cargo[k]));const got=Math.round(S.res[k]-before);if(got>0)parts.push(fmt(got)+" "+RES_NAME[k].toLowerCase());if(M.cargo[k]-got>1)lostCap.push(fmt(M.cargo[k]-got)+" "+RES_NAME[k].toLowerCase());if(M.kind==="raid"||M.kind==="hunt")stat(M.kind==="raid"?"lootIn":"huntIn",k,got);}}
      if(M.en){const g=enGive(M.en);if(g)parts.push("⚡ +"+g+" énergie");}

      if(M.hero)S.hero.busy=false;
      if(M.n>0){const tp=parts.filter(p=>p[0]!=="<");log(compText(M.u)+" de retour"+(M.cancelled?" (ordre annulé)":"")+(tp.length?" : "+tp.join(", "):" les mains vides")+".");}
      if(M.kind!=="spy"&&(M.kind!=="hunt"&&M.kind!=="raid"||parts.length||lostCap.length))report("farm",(M.kind==="hunt"?"Butin de chasse":M.kind==="raid"?"Butin de pillage":M.cancelled?"Retour (ordre annulé)":parts.length?"Récolte":"Exploration")+" · case "+M.x+","+M.y,[compText(M.u)+" de retour.",parts.length?"Rapporté : "+parts.join(", ")+".":"Rien rapporté."+(S.tiles[M.y*W+M.x].k||M.cargo?"":" La zone autour est maintenant cartographiée.")].concat(lostCap.length?['<span class="neg">Perdu, entrepôt plein : '+lostCap.join(", ")+".</span> Agrandissez la vacuole ou dépensez avant le retour."]:[]),null);
      {const tp=parts.filter(p=>p[0]!=="<");if(tp.length&&M.kind==="collect")dqAdd("collect");if(tp.length)toast("+"+tp.join(", +"));}
      S.missions.splice(i,1);dirty=true;
    }
  }
  updateVision();
  if(S.q<QUESTS.length&&QUESTS[S.q].start&&!S["qs"+S.q])questTick();
}
function advance(dm){let g=0;while(dm>0&&g<3000){const s=Math.min(1,dm);step(s);dm-=s;g++;}}

function upgradeInfo(ref){
  const p=ref.split(":");
  if(p[0]==="field"){const i=+p[1],f=S.fields[i],L=f.l+bqPending("field",i);return {type:"field",i,name:FIELD[f.k].name,level:L,max:FIELD_MAX,cost:fieldCost(L,f.k),time:fieldTime(L)};}
  if(p[0]==="noyau"){const L=S.noyau+bqPending("noyau");return {type:"noyau",name:"Noyau",level:L,max:BLD.noyau.max,cost:bldCost("noyau",L),time:bldTime("noyau",L)};}
  if(p[0]==="slot"){const i=+p[1],s=S.slots[i];if(!s)return null;const L=s.l+bqPending("slot",i);return {type:"slot",i,k:s.k,name:BLD[s.k].name,level:L,max:BLD[s.k].max,cost:bldCost(s.k,L),time:bldTime(s.k,L)};}
  return null;
}
function busyMsg(){return "File pleine : "+S.build.label+" (encore "+fmtDur(S.build.end-S.t)+") et "+BQ_MAX+" constructions programmées. Annulez-en une ou attendez.";}
const BQ_MAX=2; /* constructions programmées en plus de celle en cours */
function bqFull(){return !!S.build&&(S.bq||[]).length>=BQ_MAX;}
function bqSame(b,type,i){return b&&b.type===type&&(type==="noyau"||b.i===i);}
function bqPending(type,i){return (bqSame(S.build,type,i)?1:0)+(S.bq||[]).filter(b=>bqSame(b,type,i)).length;}
function bqStart(o){dqAdd("build");if(!S.build){S.build=Object.assign(o,{start:S.t,end:S.t+o.time});toast("Construction lancée");}else{S.bq=S.bq||[];S.bq.push(o);toast("Ajouté à la file ("+S.bq.length+"/"+BQ_MAX+")");}}
function upgradeBlock(u){if(bqFull())return busyMsg();if(u.level>=u.max)return "Niveau maximum atteint.";return capBlock(u.cost);}
function newBlock(k){if(bqFull())return busyMsg();if(S.slots.some(s=>s&&s.k===k)||(S.build&&S.build.type==="new"&&S.build.k===k)||(S.bq||[]).some(b=>b.type==="new"&&b.k===k))return "Déjà construit.";if(!BLD[k].req.every(reqMet))return "Conditions non remplies.";return capBlock(bldCost(k,0));}
function nodeState(id){
  const n=NODES[id];
  if(has(id))return "owned";
  if(S.research&&S.research.id===id&&!S.research.lvl)return "research";
  if(n.excl){const sib=Object.keys(NODES).find(k=>k!==id&&NODES[k].excl===n.excl);if(has(sib)||(S.research&&S.research.id===sib&&!S.research.lvl))return "closed";}
  if(n.type){const own=ownedTypes().length+(S.research&&!S.research.lvl&&NODES[S.research.id].type?1:0);if(own>=2)return "closed";}
  if(id==="ENDO")return RANK3.filter(has).length>=2?"open":"locked";
  if(n.tier===3&&!n.type&&!has(n.parents[0]))return "hidden";
  if(n.parents.length&&!n.parents.every(has))return "locked";
  return "open";
}
function nodeBlock(id){const st=nodeState(id);if(st==="owned")return "Déjà exprimé.";if(st==="research")return "En cours d’expression.";if(st==="closed")return NODES[id].type?"Deux voies offensives au maximum.":"Voie fermée par votre choix.";if(st!=="open")return "Exprimez d’abord les gènes précédents.";if(S.research)return "Un gène est déjà en cours d’expression.";if(!NODES[id].req.every(reqMet))return "Conditions non remplies.";return capBlock(nodeCost(id));}
function filBlock(x,y){const T=S.tiles[y*W+x],d=dist(x,y);if(S.mig)return "Impossible pendant une migration.";if(!T.k)return "Il n’y a pas de gisement ici.";if(S.fils.some(f=>f.x===x&&f.y===y)||(S.build&&S.build.type==="fil"&&S.build.x===x&&S.build.y===y))return "Déjà relié.";if(d>filRange())return "Trop loin pour un filament (portée "+filRange()+" cases, augmentez le flagelle).";if(S.fils.length+(S.build&&S.build.type==="fil"?1:0)>=filMax())return "Nombre maximum de filaments atteint ("+filMax()+"). Montez le noyau.";if(S.build)return busyMsg();return capBlock(filCost(d));}

function riboHint(){const q=["b","noyau",2];return reqMet(q)?'<button class="lnk no" data-act="goto" data-tab="cell" data-ref="'+refFor(["b","ribo",1])+'">Construire des ribosomes</button>':'Il faut des ribosomes, qui demandent '+reqLink(q)+".";}
function sendMission(kind,quiet,auto){
  const p=openRef&&openRef.split(":");if(!p||p[0]!=="tile"||S.mig)return;
  const x=+p[1],y=+p[2],d=dist(x,y);if(d<0.5||d>range()||S.idle<1||!inWorld(x,y)||isLand(x,y))return;
  const T0=S.tiles[y*W+x],kk=kind==="collect"&&!T0.s?"explore":kind,u0=auto?pickUnits(kk,Math.max(1,Math.min(S.idle,S.selN||1))):selComp(kk),u=kk==="spy"?Object.fromEntries(Object.entries(u0).filter(e=>UNITS[e[0]].spy>0)):u0,n=uSum(u);
  if(n<1){if(!quiet)toast(kk==="spy"?"Il faut des troupes d’espionnage (éclaireuses ou mieux)":"Choisissez au moins une troupe");return;}
  if(!enSpend(enCostFor(kk,T0),quiet))return false;S.sentOnce=1;
  for(const k in u)S.army[k]-=u[k];syncIdle();const dur=d*tileTime()/compSpd(u);
  const hero=(kind==="hunt"||kind==="raid")&&S.heroWith&&!S.hero.busy;if(hero)S.hero.busy=true;
  S.missions.push({id:S.nextId++,kind,x,y,n,u,hero,depart:S.t,arrive:S.t+dur,back:S.t+2*dur,arrived:false,cargo:null});
  if(!quiet)toast(compText(u)+" en route");dirty=true;return true;
}
