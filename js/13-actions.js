/* Origins 27 · 13-actions.js
   Actions du joueur : chaque bouton (data-act) est traité ici, dans act().
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
function act(a,el){
  hideTip();
  if(typeof seasonAct==="function"&&seasonAct(a,el))return;
  if(a==="feedback"){showFeedback();return;}
  if(a==="lang"){setLang(EN?"fr":"en");return;}
  if(a==="autocollect"){autoCollect();return;}
  if(a==="allyjoin"&&S&&!S.ally&&alOpen()){joinAlly(el.dataset.tag);return;}
  if(a==="allyleave"&&S&&S.ally&&alLeave())return;
  if(a==="opts"){showModal(optHTML());return;}
  if(a==="opt"){optAct(el.dataset.k);return;}
  if(a==="savex"){saveExportFile();return;}
  if(a==="savec"){saveCopy();return;}
  if(a==="savei"){const t=document.getElementById("svcode");saveImport(t&&t.value);return;}
  if(a==="install"){if(installEvt){installEvt.prompt();installEvt=null;}closeModal();return;}
  if(a==="algo"){closeModal();tab="act";actSub="ally";openRef=null;dirty=true;return;}
  if(a==="aldon"){alDonate(el.dataset.id);return;}
  if(a==="alrec"){alSetRec(el.dataset.id);return;}
  if(a==="alhelp"){alHelpAll();return;}
  if(a==="alask"){alAskHelp();return;}
  if(a==="algift"){const C=alGift();dirty=true;if(C)chestFX(C.T,C.items);return;}
  if(a==="albuy"){const C=alBuy(el.dataset.id);if(C)chestFX(C.T,C.items);return;}
  if(a==="discord"){discordGo();return;}
  if(a==="allyleave"&&S&&S.ally){log(tr("Vous quittez ","You leave ")+S.ally+". 💬 "+pickA(EN?["Traitor 😤","Good riddance… 😒","We’ll remember this 🗡️"]:["Traître 😤","Bon vent… 😒","On s’en souviendra 🗡️"]),"bad");allyBots(S.ally).forEach(b=>b.anger=Math.min(1,b.anger+0.4));S.ally=null;dirty=true;return;}
  if(a==="muts"){showModal(mutListHTML());return;}
  if(a==="mutpick"&&S&&S.mutOffer){const id=el.dataset.id;if(S.mutOffer.indexOf(id)<0)return;const L0=lineages();S.muts=(S.muts||[]).concat(id);S.mutOffer=null;const m=MUT_BY[id];log(tr("Mutation gardée : ","Mutation kept: ")+m.name+".","rare");
    const L1=lineages().filter(t=>L0.indexOf(t)<0);L1.forEach(t=>{log(tr("Nouvelle lignée : ","New lineage: ")+LINEAGE[t].name+".","rare");popup({kick:tr("Lignée","Lineage"),title:LINEAGE[t].name,body:"<p>"+tr("Trois mutations de la famille ","Three mutations of the ")+MUT_TAG[t].name.toLowerCase()+tr(" : votre lignée se spécialise."," family: your lineage specializes.")+"</p>"+fxList(LINEAGE[t].eff)});});
    toast(tr("Mutation : ","Mutation: ")+m.name);dirty=true;return;}
  if(a==="hint"){const H=nextHint();if(H&&H.act==="autocollect"){autoCollect();return;}if(H){tab=H.tab||tab;openRef=H.ref||null;if(H.sub)actSub=H.sub;if(H.tab==="evo"&&H.br)evoBr=H.br;dirty=true;}return;}
  if(a==="speed"){S.speed=SPEEDS[+el.dataset.i].v;dirty=true;return;}
  if(a==="tutnext"){tutNext();return;}
  if(a==="tutskip"){tutSkip();return;}
  if(a==="tutforce"){tutForce();return;}
  if((a==="tab"||a==="goto")&&S&&!tutTabOk(a==="tab"?el.dataset.t:el.dataset.tab))return;
  if(a==="tab"){tab=el.dataset.t;openRef=null;dirty=true;return;}
  if(a==="open"){openRef=el.dataset.ref;dirty=true;return;}
  if(a==="evobr"){evoBr=el.dataset.b;openRef=null;dirty=true;return;}
  if(a==="close"){openRef=null;dirty=true;return;}
  if(a==="goto"){tab=el.dataset.tab;openRef=el.dataset.ref||null;if(el.dataset.sub)actSub=el.dataset.sub;if(openRef&&openRef.indexOf("node:")===0){const n=NODES[openRef.slice(5)];if(n)evoBr=n.br;}dirty=true;return;}
  if(a==="popok"){S.popups.shift();dirty=true;return;}
  if(a==="incst"){const A=(S.inc||[]).find(x=>x.id===+el.dataset.id);if(A){A.manual=1;A.dodge=el.dataset.s==="dodge";toast(A.dodge?tr("💨 Vos troupes esquiveront l’attaque","💨 Your troops will dodge the attack"):tr("🛡 Vos troupes défendront la cellule","🛡 Your troops will defend the cell"));}
    const p=S.popups[0];if(p&&p.incTut)S.popups.shift();dirty=true;return;}
  if(a==="popall"){S.popups=[];dirty=true;return;}
  if(a==="rewards"){showModal(rewardsHTML());return;}
  if(a==="energy"){showModal(energyHTML());return;}
  if(a==="mres"){mresStart(el.dataset.br);dirty=true;return;}
  if(a==="spy"){sendMission("spy");return;}
  if(a==="accel"){doAccel(el.dataset.w);dirty=true;return;}
  if(a==="rkcat"){S.rkCat=el.dataset.c;dirty=true;return;}
  if(a==="rkall"){S.rkAll=!S.rkAll;dirty=true;return;}
  if(a==="rwleague"){claimLeague();dirty=true;if(modalExtra)showModal(rewardsHTML());return;}
  if(a==="rwdaily"||a==="rwchest"||a==="rwdq"){let C=null;if(a==="rwdaily")claimDaily();else if(a==="rwchest")C=claimChest();else claimDq(+el.dataset.j);dirty=true;if(S.mutOffer){closeModal();if(C)chestFX(C.T,C.items);return;}showModal(rewardsHTML());if(C)chestFX(C.T,C.items);return;}
  if(a==="revenge"){const B=S.bots.find(z=>z.id===+el.dataset.id);if(!B)return;S.tiles[B.y*W+B.x].s=1;tab="map";openRef="tile:"+B.x+":"+B.y;S.compMode="man";S.comp=pickUnits("raid",S.idle);dirty=true;return;}
  if(a==="reset"){if(Date.now()<resetArmUntil){resetArmUntil=0;S=null;try{localStorage.removeItem(SAVE_KEY);}catch(e){}showTitle();}else resetArmUntil=Date.now()+4000;if(S)dirty=true;else renderReset();return;}
  if(a==="intro"){showTitle();return;}
  if(a==="home"){showTitle();return;}
  if(a==="tournext"){showTour(tourI+1);return;}
  if(a==="tourskip"){showTour(-1);return;}
  if(a==="tour"){$("picker").innerHTML="";setTimeout(()=>showTour(0),150);return;}
  if(a==="slide"){showIntro(+el.dataset.i);return;}
  if(a==="tostrains"){showPicker();return;}
  if(a==="closeintro"){$("picker").innerHTML="";return;}
  if(a==="quickstart"){a="pick";el={dataset:{s:"kori"}};}
  if(a==="pick"){newGame((Math.random()*2**31)|0,el.dataset.s);document.getElementById("picker").innerHTML="";save();setTimeout(()=>{if(S&&S.tut==null&&!S.tourDone)showTour(0);},400);return;}
  if(!S)return;
  if(a==="upgrade"){const u=upgradeInfo(el.dataset.ref);if(!u||upgradeBlock(u)||!afford(u.cost))return;pay(u.cost);bqStart({type:u.type,i:u.i,time:u.time,cost:u.cost,label:u.name+tr(" → niveau "," → level ")+(u.level+1)});dirty=true;return;}
  if(a==="buildnew"){const i=+el.dataset.i,k=el.dataset.k;if(!slotOpen(i)||S.slots[i]||newBlock(k)||(S.build&&S.build.type==="new"&&S.build.i===i)||(S.bq||[]).some(b=>b.type==="new"&&b.i===i))return;const c=bldCost(k,0);if(!afford(c))return;pay(c);bqStart({type:"new",i,k,time:bldTime(k,0),cost:c,label:BLD[k].name+tr(" (nouveau)"," (new)")});dirty=true;return;}
  if(a==="bqcancel"){const j=+el.dataset.j,b=(S.bq||[])[j];if(!b)return;S.bq.splice(j,1);for(const r in b.cost)S.res[r]+=b.cost[r];toast(tr("Retiré de la file, ressources rendues","Removed from the queue, resources refunded"));dirty=true;return;}
  if(a==="glevel"){const id=el.dataset.id;if(lvlBlock(id))return;const L=glvl(id),c=lvlCost(id,L);if(!afford(c))return;pay(c);S.research={id,lvl:L+1,start:S.t,end:S.t+lvlTime(id,L)};toast(tr("Amélioration lancée : ","Upgrade started: ")+NODES[id].name);dqAdd("gene");dirty=true;return;}
  if(a==="herowith"){S.heroWith=!S.heroWith;dirty=true;return;}
  if(a==="sub"){actSub=el.dataset.s;dirty=true;return;}
  if(a==="migrate"){if(!openRef||openRef.indexOf("tile:")!==0)return;const p=openRef.split(":"),x=+p[1],y=+p[2];if(migBlock(x,y))return;const d=dist(x,y),c=migCost(d);if(!afford(c))return;pay(c);
    if(S.fils.length){log(EN?"Migration: your "+S.fils.length+" filament"+(S.fils.length>1?"s are":" is")+" cut.":"Migration : vos "+S.fils.length+" filament"+(S.fils.length>1?"s sont coupés":" est coupé")+".","bad");S.fils=[];}
    if(S.build&&S.build.type==="fil")S.build=null;
    S.mig={fx:S.px,fy:S.py,x,y,start:S.t,end:S.t+migTime(d)};toast(tr("Migration lancée","Migration started"));dirty=true;return;}
  if(a==="zoom"){camZoom(+el.dataset.z);return;}
  if(a==="recenter"){cam=null;dirty=true;return;}
  if(a==="theme"){setTheme(getTheme()==="lab"?"abyss":"lab");if(document.querySelector("#modal.on .optgrid"))showModal(optHTML());return;}
  if(a==="style"){setStyle(document.body.classList.contains("pixel")?"smooth":"pixel");return;}
  if(a==="express"){const id=el.dataset.id;if(nodeBlock(id))return;const c=nodeCost(id);if(!afford(c))return;pay(c);S.research={id,start:S.t,end:S.t+nodeTime(id)};toast(tr("Expression lancée : ","Expression started: ")+NODES[id].name);dqAdd("gene");dirty=true;return;}
  if(a==="cell"){const k=el.dataset.k||"coll",U=UNITS[k];if(!U||!uReq(k))return;const n=el.dataset.n==="max"?maxAfford(U.cost,200):+el.dataset.n;let made=0;for(let i=0;i<n;i++){if(!afford(U.cost))break;pay(U.cost);queueUnit(k);made++;}if(made)dqAdd("units",made);if(made)toast(made+" "+(made>1?U.pl:U.name).toLowerCase()+tr(" en production"," in production"));else showModal(adviceHTML(U.cost));dirty=true;return;}
  if(a==="dissolve"){const n=Math.min(S.idle,+el.dataset.n);if(n<1)return;killUnits(n);S.res.prot+=n*CELL_COST.prot*0.5;S.res.atp+=n*CELL_COST.atp*0.5;log(EN?n+" gatherer"+(n>1?"s":"")+" dissolved: half their cost is recovered.":n+" collectrice"+(n>1?"s dissoutes":" dissoute")+" : la moitié de leur coût est récupérée.");dirty=true;return;}
  if(a==="n-"){S.selN=Math.max(1,shownN()-1);dirty=true;return;}
  if(a==="n+"){S.selN=Math.min(Math.max(1,S.idle),shownN()+1);dirty=true;return;}
  if(a==="nmax"){S.selN=Math.max(1,S.idle);dirty=true;return;}
  if(a==="compmode"){const to=el.dataset.m;if(to==="man"&&S.compMode!=="man"){const p=openRef&&openRef.split(":"),T=p&&p[0]==="tile"?S.tiles[+p[2]*W+(+p[1])]:null,kind=T&&T.s&&(T.w||botAt(+p[1],+p[2]))?"hunt":T&&T.s?"collect":"explore";S.comp=pickUnits(kind,shownN());}S.compMode=to;dirty=true;return;}
  if(a==="cs"){const k=el.dataset.k,have=S.army[k]||0,d=el.dataset.d;S.comp=S.comp||{};const v=Math.min(S.comp[k]||0,have);S.comp[k]=d==="all"?(v>=have?0:have):Math.max(0,Math.min(have,v+(+d)));dirty=true;return;}
  if(a==="collect"){sendMission("collect");return;}
  if(a==="hunt"){const R=huntRisk();if(R&&!R.ok){showModal(huntWarnHTML(R));return;}sendMission("hunt");return;}
  if(a==="huntgo"){closeModal();sendMission("hunt");return;}
  if(a==="raid"){const R=raidRisk();if(R&&!R.ok){showModal(botWarnHTML(R));return;}const n0=S.missions.length;sendMission("raid");if(S.missions.length>n0&&shieldAt(S.t)){S.shieldR=0;toast(tr("🛡 Vous attaquez : votre protection s’arrête","🛡 You attack: your protection ends"));}return;}
  if(a==="raidgo"){closeModal();const n0=S.missions.length;sendMission("raid");if(S.missions.length>n0&&shieldAt(S.t)){S.shieldR=0;toast(tr("🛡 Vous attaquez : votre protection s’arrête","🛡 You attack: your protection ends"));}return;}
  if(a==="mclose"){closeModal();return;}
  if(a==="instant"){useInstant();return;}
  if(a==="learn"){showModal(lmHTML());return;}
  if(a==="lmgo"){lmGo(+el.dataset.i);return;}
  if(a==="lmclaim"){lmClaim(+el.dataset.i);return;}
  if(a==="goadv"){closeModal();tab=el.dataset.tab;openRef=el.dataset.ref||null;dirty=true;return;}
  if(a==="filament"){if(!openRef||openRef.indexOf("tile:")!==0)return;const p=openRef.split(":"),x=+p[1],y=+p[2];if(filBlock(x,y))return;const d=dist(x,y),c=filCost(d);if(!afford(c))return;pay(c);S.build={type:"fil",x,y,start:S.t,end:S.t+filTime(d),label:tr("Filament vers ","Filament to ")+x+","+y};toast(tr("Filament en croissance","Filament growing"));dirty=true;return;}
  if(a==="recallall"){let n=0;S.missions.forEach(M=>{if(M.arrived)return;const el2=S.t-M.depart;M.result="cancel";M.arrived=true;M.cancelled=true;M.arrive=S.t;M.back=S.t+el2;n++;});toast(n?n+" mission"+(n>1?"s":"")+tr(" rappelée"+(n>1?"s":"")," recalled"):tr("Toutes vos troupes sont déjà sur le retour","All your troops are already returning"));dirty=true;return;}
  if(a==="cancel"){const M=S.missions.find(m=>m.id===+el.dataset.id);if(!M||M.arrived)return;M.result="cancel";const el2=S.t-M.depart;M.arrived=true;M.cancelled=true;M.arrive=S.t;M.back=S.t+el2;toast(tr("Ordre annulé, retour en cours","Order cancelled, returning"));dirty=true;return;}
}

