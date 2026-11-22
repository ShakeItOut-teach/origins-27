/* Origins 27 · 09-rivaux.js
   Les 499 rivaux simulés : force, protections (nuit et bouclier), pillages, attaques entrantes.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* ===== Rivaux simulés (bots) : un simulacre de PvP pour tester le prototype seul ===== */
const BOT_A=["Krill","Nocti","Plancto","Abyss","Siphon","Medus","Corail","Vortex","Spiro","Lumi","Nacre","Kelp","Murex","Bathy","Anemo","Cyano","Zoé","Diatom","Ventr","Oxy","Hydro","Proto","Nautil","Chitin","Benthi","Radio","Krak","Sargas"];
const BOT_B=["_Gang","Lord","ix","42","-Tox","Rex","Dark","_FR","Queen","Prime","_Rouge","Flux","88","Noir","ette","_KO","Zen","Max","_BE","Storm","oïde","Fang","_QC","Venom","07"];
const BOT_N=499;
const ALLY_TAGS=["[ABY]","[KRK]","[MER]","[TOX]","[LUM]","[NOX]","",""];
const EMO={win:["😈🍖","😎💪","🍽️😋","👋😏"],lose:["😤💢","🤬","😒🛡️"],hit:["😡⚔️","🔥🔥","👀🗡️","🏳️"]};
function pickA(a){return a[Math.floor(Math.random()*a.length)];}
function botsInit(rng,stx,sty,tiles){
  const bots=[],used=new Set(),names=new Set(),free=(x,y)=>inWorld(x,y)&&!isLand(x,y)&&!used.has(y*W+x)&&Math.hypot(x-stx,y-sty)>=6;
  const place=(x,y,inner)=>{x=Math.round(x);y=Math.round(y);if(!free(x,y))return false;used.add(y*W+x);const t=tiles[y*W+x];t.k=null;t.a=0;t.max=0;t.m=0;t.w=null;
    const g=(inner?1.1:0.6)+rng()*0.7;
    let nm=BOT_A[Math.floor(rng()*BOT_A.length)]+BOT_B[Math.floor(rng()*BOT_B.length)];if(names.has(nm))nm+=String(2+Math.floor(rng()*8));while(names.has(nm))nm+="x";names.add(nm);
    bots.push({id:bots.length+1,name:nm,tag:ALLY_TAGS[Math.floor(rng()*ALLY_TAGS.length)],
      x,y,g,type:TYPE_ORDER[Math.floor(rng()*5)],aggr:rng()<0.4?0.6+rng()*0.4:rng()*0.35,res:200,lastT:0,anger:0,busy:0});return true;};
  let n=0,g=0;while(n<12&&g<2000){g++;const a=rng()*Math.PI*2,r=7+rng()*15;if(place(stx+Math.cos(a)*r,sty+Math.sin(a)*r,false))n++;}
  g=0;while(bots.length<BOT_N&&g<60000){g++;const inner=rng()<0.3,a=rng()*Math.PI*2,r=inner?ZB.mid+rng()*(RW-20-ZB.mid):RW-19+rng()*17;place(C0+Math.cos(a)*r,C0+Math.sin(a)*r,inner);}
  return bots;
}
function botAt(x,y){if(!S||!S.bots)return null;for(const b of S.bots)if(b.x===x&&b.y===y)return b;return null;}
function bDays(){return S.t/1440;}
function botAtk(b){return Math.round(25+35*bDays()*b.g);}
function botDef(b){return Math.round(30+38*bDays()*b.g);}
function botStage(b){return Math.max(1,Math.min(5,1+Math.floor(bDays()*b.g/3)));}
function botCap(b){return Math.round(600*Math.pow(1.3,bDays()*b.g/2));}
function botProt(b){return Math.round(120*Math.pow(1.33,bDays()*b.g/2));}
function botSync(b){const dt=S.t-(b.lastT||0);if(dt>0){b.res=Math.min(botCap(b),b.res+(30+12*bDays()*b.g)*dt/60);b.lastT=S.t;}}
function hod(t){return ((t%1440)+1440)%1440;}
function dayIdx(t){return Math.floor(t/1440);}
/* Protections en heure RÉELLE, quelle que soit la vitesse du jeu : personne n'attaque de minuit à 7 h (heure du joueur),
   ni pendant l'heure réelle qui suit un pillage subi. realOf convertit un instant de jeu en heure réelle,
   y compris pendant le rattrapage hors ligne (cuMap). */
let cuMap=null;
function realOf(t){if(catchUp&&cuMap)return cuMap.r0+(t-cuMap.t0)/Math.max(1e-9,cuMap.t1-cuMap.t0)*(cuMap.r1-cuMap.r0);return Date.now()+(t-S.t)/Math.max(1e-9,S.speed)*1000;}
function nightAt(t){return new Date(realOf(t)).getHours()<7;}
function shieldAt(t){return !!S.shieldR&&realOf(t)<S.shieldR;}
function protAt(t){return nightAt(t)||shieldAt(t);}
function hhmm(ms){const d=new Date(ms);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}
function botPoints(b){return Math.round(botAtk(b)+botDef(b)+botStage(b)*60);}
function playerAtk(){return Math.round(compAtk(armyAll(),null));}
function defParts(dodge){const P=[["Membrane (base)",20],dodge?["Troupes au repos : esquivées, hors de la cellule",0]:["Troupes au repos : "+compText(S.army),compDef(S.army)],["Cytosquelette niv. "+blvl("cyto"),15*blvl("cyto")],["Noyau niv. "+S.noyau,6*S.noyau],["Canaux (niveaux cumulés)",6*S.fields.reduce((t,f)=>t+f.l,0)],["Stade de la base",12*baseStage()],[S.hero.busy?"Héros (en mission : absent)":"Héros présent",S.hero.busy?0:Math.round(heroBase()*0.6)]];
  return {P,mult:Math.max(0.3,1+(has("PA")?0.25:0)+(hasEm("cuirasse")?0.3:0)+mods().defPct)};}
function playerDef(dodge){const D=defParts(dodge);return Math.round(D.P.reduce((a,p)=>a+p[1],0)*D.mult);}
function playerPoints(){return Math.round(playerAtk()+playerDef()+baseStage()*60);}
function botEst(b,exact){const d=botDef(b);if(exact)return fmt(d);return "≈ "+fmt(Math.round(d*0.8/10)*10)+" – "+fmt(Math.round(d*1.25/10)*10);}
function botPanel(b,vis){botSync(b);const st=botStage(b),loot=Math.max(0,b.res-botProt(b)),ng=nightAt(S.t);
  let h='<p class="wildic" style="margin-top:6px">'+sprImg(STAGE_SPR[st],2)+'<span><b>'+esc(b.name)+"</b> "+(b.tag?'<span class="muted">'+b.tag+"</span>":"")+'<br><span class="muted" style="font-size:12px">'+(S.ally&&b.tag===S.ally?'<span class="up">Allié</span>':"Rival")+" · "+STAGE_NAME[st]+"</span></span></p>";
  h+='<div class="stat"><span>Défense estimée</span><b>'+botEst(b,vis)+'</b></div><div class="stat"><span>Voie offensive</span><b style="color:var(--t-'+b.type+')">'+TYPES[b.type].name+"</b></div>";
  h+='<div class="stat"><span>Butin pillable</span><b>'+(vis?fmt(loot):"inconnu")+'</b></div><div class="stat"><span>Humeur</span><b>'+(b.anger>0.3?"😡 rancunier":b.aggr>0.6?"😈 agressif":"😐 calme")+"</b></div>";
  {const rk=rkRows("pow").findIndex(x=>x.b===b)+1;h+='<div class="stat"><span>Classement mondial</span><b>'+leagueOf(rk)[1]+" #"+rk+" · "+fmt(botPow(b))+" pts</b></div>";}
  if(b.nem)h+='<div class="stat"><span>🎯 Ennemi juré</span><b class="neg">vous a pillé '+b.nem+" fois"+(b.avenged?" · vengé "+b.avenged+" fois":"")+"</b></div>"+(b.nemT&&S.t-b.nemT<1440?'<p class="up" style="font-size:12.5px">🔥 Vengeance possible encore <span data-end="'+(b.nemT+1440)+'"></span> : butin +50 %.</p>':"");
  if(ng)h+='<p class="desc">🌙 Enkysté pour la nuit jusqu’à 07:00 : impossible de l’attaquer.</p>';
  if(!vis)h+='<p class="desc">Hors de votre vision : ses chiffres sont des estimations.</p>';
  return h;}
function botWarnHTML(R){const b=R.B,lost=Math.round(R.n*R.lf);
  let h='<div class="kick" style="color:var(--bad)">Avertissement</div><h2>Vous risquez de perdre ce raid</h2><div class="advwild">'+sprImg(STAGE_SPR[botStage(b)],3)+"</div>";
  h+='<p>Votre force <b class="neg">'+fmt(R.pw)+"</b> contre une défense estimée à <b>"+botEst(b,R.vis)+"</b> chez "+esc(b.name)+".</p>";
  h+='<p>Pertes probables : <b class="neg">'+lost+" collectrice"+(lost>1?"s":"")+"</b> sur "+R.n+". Le défenseur, lui, ne perd rien.</p>";
  h+='<p class="desc">Un rival attaqué devient rancunier et risque de riposter.</p>';
  return h+'<div class="row" style="justify-content:center"><button class="btn alt" data-act="mclose">Renoncer</button><button class="btn" data-act="raidgo" style="background:var(--bad);border-color:var(--bad)">Attaquer quand même</button></div>';}
function raidRisk(){const p=openRef&&openRef.split(":");if(!p||p[0]!=="tile")return null;const x=+p[1],y=+p[2],B=botAt(x,y);if(!B)return null;
  const u=selComp("raid"),n=uSum(u),wh=S.heroWith&&!S.hero.busy,hp=wh?heroPower(B.type):0,pw=compAtk(u,B.type)+hp,vis=isVis(x,y),est=botDef(B)*(vis?1:1.05);
  return {B,n,pw,vis,ok:pw*ATK_ADV>=est,lf:lossFrac(pw,est)};}
function raidArrive(M){
  const B=botAt(M.x,M.y);if(!B){M.result="none";report("combat","Raid sans cible · case "+M.x+","+M.y,["Le rival avait migré ailleurs."],null);return;}
  botSync(B);
  if(nightAt(S.t)){M.result="none";report("combat","Kyste · "+B.name,["🌙 "+esc(B.name)+" s’était enkysté pour la nuit : vos collectrices font demi-tour sans combattre."],null);return;}
  if(!M.u)M.u={coll:M.n};
  const hp=M.hero?heroPower(B.type):0,pw=huntPower(M.u,B.type)+hp,def=botDef(B),win=pw*ATK_ADV>=def,lf=lossFrac(pw,def),lost=Math.min(M.n,Math.round(M.n*lf)),m=mods(),u0=Object.assign({},M.u);
  B.g=Math.min(3,B.g+0.03);
  const lostBy=applyLoss(M,lost);
  const lines=['<span class="'+(win?"up":"neg")+'">'+(win?"Pillage réussi":"Raid repoussé")+"</span> chez "+esc(B.name)+" ("+STAGE_NAME[botStage(B)]+", voie "+TYPES[B.type].name+"). Le défenseur ne perd aucune troupe.",fightTable(u0,lostBy,B.type,hp,pw,def,win,"Défense")];
  if(win){const carry=compCarry(M.u)*2+hp,stock=Math.round(B.res),prot=botProt(B),avail=Math.max(0,B.res-prot),base=Math.min(carry,avail),venge=B.nemT&&S.t-B.nemT<1440,take=base*(1+m.lootPct*0.5)*(venge?1.5:1);B.res-=Math.min(B.res,take);
    M.cargo={prot:Math.round(take*0.3),lip:Math.round(take*0.3),atp:Math.round(take*0.25),nuc:Math.round(take*0.15)};M.result="win";
    if(venge){B.nemT=0;B.avenged=(B.avenged||0)+1;lines.push('<span class="up">🔥 Vengeance ! '+esc(B.name)+" vous avait pillé : butin +50 %.</span>");log("🔥 Vengeance sur "+B.name+" !","rare");}
    lines.push("<b>Butin</b> · son stock "+fmt(stock)+", dont "+fmt(Math.min(stock,prot))+" à l’abri dans sa vacuole · pillable "+fmt(avail)+" · vos survivants peuvent porter "+fmt(carry)+(m.lootPct?" · bonus pillage +"+Math.round(m.lootPct*50)+" %":"")+".");
    lines.push(lootTable(RES.map(k=>[k,M.cargo[k]]),avail<5?"Son entrepôt était vide : tout était à l’abri.":carry<avail?"Limité par votre capacité de transport : envoyez des porteuses ou plus de troupes pour rapporter davantage.":"Vous avez vidé tout ce qui était pillable."));
    lines.push("Le butin arrive avec vos troupes, dans "+fmtDur(M.back-S.t)+".");dqAdd("raid");}
  else{M.result="lose";}
  if(M.hero)lines.push(heroGain({def,type:B.type},win,true));
  if(win)B.g=Math.max(0.4,B.g-0.01);B.anger=Math.min(1,B.anger+0.7);const em=pickA(win?EMO.hit:EMO.win);lines.push("💬 "+esc(B.name)+" : "+em);
  log((win?"Vous avez pillé ":"Raid repoussé par ")+B.name+". 💬 "+em,win?"good":"bad");toast(win?"Pillage réussi":"Raid repoussé");
  report("combat",(win?"Pillage":"Échec")+" · "+B.name,lines,win);
}
function botsStep(dm){
  if(!S.bots)return;S.inc=S.inc||[];S.botT=(S.botT||0)+dm;
  for(let i=S.inc.length-1;i>=0;i--){const A=S.inc[i];if(S.t>=A.arrive){S.inc.splice(i,1);incomingHit(A);}}
  if(S.botT<30)return;const k=Math.floor(S.botT/30);S.botT-=k*30;
  const c=cpos(),days=bDays();
  for(const b of S.bots){
    b.anger=Math.max(0,b.anger-0.02*k);
    const d=Math.hypot(b.x-c[0],b.y-c[1]);
    if(days>=1&&d<=22&&!S.inc.some(a=>a.bot===b.id)&&!S.mig&&!(S.ally&&b.tag===S.ally)){
      const p=(b.aggr*0.02+b.anger*0.1)*k*(S.ally&&b.tag?1.5:1);
      if(Math.random()<p){const travel=Math.max(6,d*1.6),arr=S.t+travel;if(!protAt(arr)&&!protAt(S.t)){
        const atk=Math.round(botAtk(b)*(0.75+Math.random()*0.4)),A={id:S.nextId++,bot:b.id,atk,arrive:arr,from:[b.x,b.y]};S.inc.push(A);
        log("⚠️ Attaque entrante : "+b.name+" arrive à "+fmtClock(arr).replace("Jour ","J")+".","bad");toast("⚠️ Attaque entrante de "+b.name);
        if(!S.incTut){S.incTut=1;popup({kick:"⚠️ Attaque entrante",title:esc(b.name)+" vous attaque !",incTut:A.id,body:incTutHTML(A,b)});}
        dirty=true;}}}
  }
  if(Math.random()<0.04*k){const a=pickA(S.bots),b=pickA(S.bots);if(a!==b){const ok=Math.random()<0.6;if(ok){a.lw=(a.lw||0)+Math.round(botAtk(a)*(1+Math.random()));a.g=Math.min(3,a.g+0.01);b.g=Math.max(0.4,b.g-0.01);}log("📣 "+a.name+" "+(ok?"a pillé":"s’est cassé les dents sur")+" "+b.name+".","muted");}}
  for(const b of S.bots)if(Math.random()<0.02*k*b.aggr)b.lw=(b.lw||0)+Math.round(botAtk(b)*(0.5+Math.random()));
  rkTick();
  S.botAd=(S.botAd||0)+k*30;if(S.botAd>=720){S.botAd=0;botsAdapt();}
  S.botMig=(S.botMig||0)+k*30;if(S.botMig>=1440){S.botMig=0;for(const b of S.bots){if(Math.random()<0.25){const r=rC(b.x,b.y),step=3+Math.floor(Math.random()*4),nx=Math.round(C0+(b.x-C0)*(r-step)/r),ny=Math.round(C0+(b.y-C0)*(r-step)/r);
    if(inWorld(nx,ny)&&!isLand(nx,ny)&&!botAt(nx,ny)&&(nx!==c[0]||ny!==c[1])){const T=S.tiles[ny*W+nx];if(!T.k&&!T.w){b.x=nx;b.y=ny;}}}}}
}
/* Attaque entrante : défendre (les troupes au repos se battent et peuvent tomber) ou esquiver (elles quittent la cellule, sans perte, mais ne défendent pas) */
function incRange(A){return fmt(Math.round(A.atk*0.9/10)*10)+" – "+fmt(Math.round(A.atk*1.15/10)*10);}
function incGuess(A){const h=allyHelp(),dd=playerDef()+h,dn=playerDef(true)+h,f=A.atk*ATK_ADV;return {dd,dn,hold:dd>f,holdN:dn>f};}
function incChoiceHTML(A){const g=incGuess(A),dg=!!A.dodge,has=uSum(S.army)>0;
  return '<div class="incch"><button class="btn sm'+(dg?" alt":"")+'" data-act="incst" data-id="'+A.id+'" data-s="def"'+(dg?"":' aria-pressed="true"')+'>🛡 Défendre<small>défense '+fmt(g.dd)+" · "+(g.hold?"✔ devrait tenir":"⚠ risque de céder")+'</small></button><button class="btn sm'+(dg?"":" alt")+'" data-act="incst" data-id="'+A.id+'" data-s="dodge"'+(dg?' aria-pressed="true"':"")+(has?"":" disabled")+'>💨 Esquiver<small>défense '+fmt(g.dn)+" · aucune perte</small></button></div>";}
function incTutHTML(A,b){const g=incGuess(A);
  return '<p><b>'+esc(b.name)+"</b> arrive dans <b><span data-end=\""+A.arrive+'"></span></b> avec une force estimée de <b>'+incRange(A)+"</b>.</p>"+
  '<div class="inctut"><p><b>🛡 Défendre</b> : vos troupes au repos restent dans la cellule et se battent. Si la défense tient, il repart bredouille et votre héros gagne de l’expérience, mais quelques troupes tombent. Si elle cède, vous êtes pillé et vous perdez la moitié des troupes présentes.</p>'+
  '<p><b>💨 Esquiver</b> : vos troupes quittent la cellule juste avant l’impact et reviennent ensuite. Aucune perte, mais seuls la membrane, les organites et le héros défendent : ce qui dépasse la part protégée par la vacuole risque d’être pillé.</p></div>'+
  '<p class="desc">Votre défense : <b>'+fmt(g.dd)+"</b> avec les troupes, <b>"+fmt(g.dn)+"</b> sans elles. Défendez si vous pouvez tenir, esquivez sinon. Vous pourrez changer d’avis jusqu’à l’arrivée, dans Rapports › En route.</p>"+incChoiceHTML(A)+
  '<p class="desc">🛡 Après un pillage subi, vous êtes protégé pendant 1 h. 🌙 De minuit à 7 h, personne n’attaque personne.</p>';}
function loseHome(frac){const o={};for(const k in S.army){const n=Math.min(S.army[k]||0,Math.round((S.army[k]||0)*frac));if(n>0){o[k]=n;S.army[k]-=n;}}syncIdle();return o;}
function incomingHit(A){
  const b=S.bots.find(z=>z.id===A.bot);if(!b)return;
  if(protAt(S.t)){const sh=shieldAt(S.t);report("combat","Attaque annulée · "+b.name,[(sh?"🛡 Vous êtes sous protection après un pillage":"🌙 Vous êtes protégé pour la nuit")+" : "+esc(b.name)+" fait demi-tour sans combattre."],null);log((sh?"🛡 ":"🌙 ")+b.name+" fait demi-tour : vous êtes protégé.","muted");return;}const dodge=!!A.dodge&&uSum(S.army)>0,help=allyHelp(),def=playerDef(dodge)+help,win=A.atk*ATK_ADV>=def,D=defParts(dodge),r=A.atk*ATK_ADV/Math.max(1,def);
  let tb='<table class="ftab"><thead><tr><th>Votre défense</th><th class="num">Points</th></tr></thead><tbody>'+D.P.filter(p=>p[1]>0||p[0].indexOf("Héros")===0).map(p=>"<tr><td>"+p[0]+'</td><td class="num">'+fmt(p[1])+"</td></tr>").join("");
  if(D.mult!==1)tb+='<tr><td>Bonus de défense (gènes, émergences, mutations)</td><td class="num">'+fmtF(D.mult)+"</td></tr>";
  if(help)tb+="<tr><td>Renforts de l’alliance "+S.ally+'</td><td class="num up">+'+fmt(help)+"</td></tr>";
  tb+='</tbody><tfoot><tr><td>Total</td><td class="num"><b>'+fmt(def)+"</b></td></tr></tfoot></table>";
  tb+='<div class="fbar def"><i style="width:'+Math.round(Math.min(100,def/(def+A.atk)*100))+'%"></i><span>Vous '+fmt(def)+"</span><span>"+esc(b.name)+" "+fmt(A.atk)+"</span></div>";
  const lines=['<span class="'+(win?"neg":"up")+'">'+(win?"Votre défense a cédé":"Attaque repoussée")+"</span> : "+esc(b.name)+" ("+STAGE_NAME[botStage(b)]+", voie "+TYPES[b.type].name+") attaquait avec une force de <b>"+fmt(A.atk)+"</b>."+(dodge?" Vous aviez choisi d’<b>esquiver</b> : vos troupes ont quitté la cellule.":""),tb];
  if(dodge)lines.push('<p class="fwhy">💨 Esquive : vos troupes reviennent intactes, sans aucune perte.</p>');
  else if(uSum(S.army)>0){const lost=loseHome(win?0.5:Math.min(0.3,0.06+0.22*r)),n=uSum(lost);
    lines.push('<p class="fwhy">🛡 Pertes au combat : '+(n?'<span class="neg">'+compText(lost)+"</span>"+(win?" (la défense a cédé : la moitié des troupes présentes).":" (elles ont tenu la ligne)."):"aucune.")+"</p>");}
  if(win){const pa=protectedAmt(),carry=Math.round(A.atk*2.2);let pool=0;const ex={};RES.forEach(r=>{ex[r]=Math.max(0,S.res[r]-pa);pool+=ex[r];});
    const take=Math.min(carry,pool),got={},before={};RES.forEach(r=>{before[r]=Math.round(S.res[r]);got[r]=pool?Math.round(ex[r]/pool*take):0;S.res[r]-=got[r];stat("lootOut",r,got[r]);});b.res+=take;b.lw=(b.lw||0)+take;
    lines.push('<p class="fwhy">Il vous manquait <b>'+fmt(Math.ceil(A.atk*ATK_ADV-def))+"</b> de défense (vous en aviez "+Math.round(100/r)+" % de ce qu’il fallait).</p>");
    lines.push('<table class="ftab loot"><thead><tr><th>Pillé</th><th class="num">Avant</th><th class="num">À l’abri</th><th class="num">Volé</th><th class="num">Reste</th></tr></thead><tbody>'+RES.map(k=>'<tr><td><span class="c-'+k+'">'+RES_NAME[k]+'</span></td><td class="num">'+fmt(before[k])+'</td><td class="num">'+fmt(Math.min(before[k],pa))+'</td><td class="num neg">'+(got[k]?"−"+fmt(got[k]):"0")+'</td><td class="num">'+fmt(Math.round(S.res[k]))+"</td></tr>").join("")+"</tbody></table>");
    lines.push(take<1?"Rien de volé : tout était à l’abri dans votre vacuole.":"Il pouvait emporter "+fmt(carry)+" et a pris "+fmt(take)+". Votre vacuole met "+fmt(pa)+" de chaque ressource à l’abri : améliorez-la, dépensez vos réserves avant de partir, ou renforcez la défense (soldates au repos, cytosquelette, héros présent).");
    b.nem=(b.nem||0)+1;b.nemT=S.t;S.tiles[b.y*W+b.x].s=1;
    S.shieldR=realOf(S.t)+3600000;/* les autres attaques déjà en route pendant la protection font demi-tour tout de suite */
    S.inc=S.inc.filter(o=>{if(!shieldAt(o.arrive))return true;const ob=S.bots.find(z=>z.id===o.bot);log("🛡 "+(ob?ob.name:"Un rival")+" fait demi-tour : vous êtes protégé.","muted");return false;});
    lines.push('<p class="fwhy">🛡 <b>Protection d’une heure</b> : aucun rival ne peut vous attaquer jusqu’à '+hhmm(S.shieldR)+". Si vous pillez quelqu’un d’ici là, la protection s’arrête.</p>");
    lines.push('<div class="row revrow"><button class="btn sm" data-act="revenge" data-id="'+b.id+'" style="background:var(--bad);border-color:var(--bad)">⚔ Riposter</button><span class="desc">Vengeance dans les 24 h de jeu : butin +50 %. '+(b.nem>1?"Il vous a déjà pillé "+b.nem+" fois.":"")+"</span></div>");
    const em=pickA(EMO.win);lines.push("💬 "+esc(b.name)+" : "+em);log("Pillé par "+b.name+". 💬 "+em,"bad");toast("Vous avez été pillé");
    report("combat","Pillage subi · "+b.name,lines,false);}
  else{dqAdd("def");b.anger=Math.max(0,b.anger-0.4);const em=pickA(EMO.lose);lines.push('<p class="fwhy">Vos défenses ont tenu avec '+fmt(Math.floor(def-A.atk*ATK_ADV))+' points de marge : il repart bredouille.</p>');
    if(!S.hero.busy)lines.push(heroGain({def:A.atk,type:b.type},true,true));lines.push("💬 "+esc(b.name)+" : "+em);log("Attaque de "+b.name+" repoussée. 💬 "+em,"good");toast("Attaque repoussée");
    report("combat","Défense réussie · "+b.name,lines,true);}
}
function nemesisHTML(){const L=S.bots.filter(b=>b.nem).sort((a,b)=>(b.nem-(b.avenged||0))-(a.nem-(a.avenged||0)));if(!L.length)return "";
  return '<div class="card"><h2>🎯 Ennemis jurés</h2>'+L.slice(0,8).map(b=>{const hot=b.nemT&&S.t-b.nemT<1440;return '<div class="nem"><span><b>'+esc(b.name)+"</b> "+(b.tag||"")+'<br><span class="muted" style="font-size:12px">vous a pillé '+b.nem+" fois"+(b.avenged?" · vengé "+b.avenged+" fois":"")+(hot?' · <span class="up">🔥 vengeance +50 %</span>':"")+'</span></span><button class="btn sm'+(hot?"":" alt")+'" data-act="revenge" data-id="'+b.id+'">Riposter</button></div>';}).join("")+"</div>";}
