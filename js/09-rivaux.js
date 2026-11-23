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
/* Rythme de vie des rivaux : chacun dort 10 h d'affilée (heure de coucher entre 21 h et 1 h, propre à chacun) et se connecte 5 fois par jour, 20 à 40 min. Ils n'attaquent que connectés. */
function botHash(a,b,c){let h=(a*73856093)^(b*19349663)^(c*83492791);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function botSleepStart(b){return (1260+Math.floor(botHash(b.id,7,1)*5)*60)%1440;}
function botAsleep(b,t){return ((hod(t)-botSleepStart(b))+1440)%1440<600;}
function botSessions(b,d){const o=[],a0=d*1440+botSleepStart(b)+600;for(let i=0;i<5;i++){const s=a0+i*168+Math.floor(botHash(b.id,d,i)*128),L=20+Math.floor(botHash(b.id,d,i+9)*21);o.push([s,s+L]);}return o;}
function botOnline(b,t){if(botAsleep(b,t))return false;const d=dayIdx(t);for(const dd of [d-1,d])for(const s of botSessions(b,dd))if(t>=s[0]&&t<s[1])return true;return false;}
function botLastSeen(b,t){let best=-1;const d=dayIdx(t);for(const dd of [d-2,d-1,d])for(const s of botSessions(b,dd))if(s[0]<=t)best=Math.max(best,Math.min(t,s[1]));return best;}
function botStatus(b){if(botOnline(b,S.t))return '<span class="up">'+tr("🟢 en ligne","🟢 online")+"</span>";if(botAsleep(b,S.t))return tr("💤 endormi","💤 asleep");const ls=botLastSeen(b,S.t);return '<span class="muted">'+tr("⚪ hors ligne","⚪ offline")+(ls>=0?tr(" · vu il y a "," · seen ")+fmtDur(S.t-ls)+tr(""," ago"):"")+"</span>";}
function botPoints(b){return Math.round(botAtk(b)+botDef(b)+botStage(b)*60);}
function playerAtk(){return Math.round(compAtk(armyAll(),null));}
const HERO_LBL=tr("Héros","Hero");
function defParts(dodge){const P=[[tr("Membrane (base)","Membrane (base)"),20],dodge?[tr("Troupes au repos : esquivées, hors de la cellule","Resting troops: dodged, outside the cell"),0]:[tr("Troupes au repos : ","Resting troops: ")+compText(S.army),compDef(S.army)],[tr("Cytosquelette niv. ","Cytoskeleton lvl ")+blvl("cyto"),15*blvl("cyto")],[tr("Noyau niv. ","Nucleus lvl ")+S.noyau,6*S.noyau],[tr("Canaux (niveaux cumulés)","Channels (total levels)"),6*S.fields.reduce((t,f)=>t+f.l,0)],[tr("Stade de la base","Base stage"),12*baseStage()],[S.hero.busy?HERO_LBL+tr(" (en mission : absent)"," (on a mission: away)"):HERO_LBL+tr(" présent"," present"),S.hero.busy?0:Math.round(heroBase()*0.6)]];
  return {P,mult:Math.max(0.3,1+(has("PA")?0.25:0)+(hasEm("cuirasse")?0.3:0)+mods().defPct)};}
function playerDef(dodge){const D=defParts(dodge);return Math.round(D.P.reduce((a,p)=>a+p[1],0)*D.mult);}
function playerPoints(){return Math.round(playerAtk()+playerDef()+baseStage()*60);}
function botEst(b,exact){const d=botDef(b);if(exact)return fmt(d);return "≈ "+fmt(Math.round(d*0.8/10)*10)+" – "+fmt(Math.round(d*1.25/10)*10);}
function botPanel(b,vis){botSync(b);const st=botStage(b),loot=Math.max(0,b.res-botProt(b)),ng=nightAt(S.t);
  let h='<p class="wildic" style="margin-top:6px">'+sprImg(STAGE_SPR[st],2)+'<span><b>'+esc(b.name)+"</b> "+(b.tag?'<span class="muted">'+b.tag+"</span>":"")+'<br><span class="muted" style="font-size:12px">'+(S.ally&&b.tag===S.ally?'<span class="up">'+tr("Allié","Ally")+"</span>":tr("Rival","Rival"))+" · "+STAGE_NAME[st]+"</span></span></p>";
  h+='<div class="stat"><span>'+tr("Défense estimée","Estimated defense")+"</span><b>"+botEst(b,vis)+'</b></div><div class="stat"><span>'+tr("Voie offensive","Offensive path")+'</span><b style="color:var(--t-'+b.type+')">'+TYPES[b.type].name+"</b></div>";
  h+='<div class="stat"><span>'+tr("Butin pillable","Raidable loot")+"</span><b>"+(vis?fmt(loot):tr("inconnu","unknown"))+'</b></div><div class="stat"><span>'+tr("Activité","Activity")+"</span><b>"+botStatus(b)+'</b></div><div class="stat"><span>'+tr("Humeur","Mood")+"</span><b>"+(b.anger>0.3?tr("😡 rancunier","😡 vengeful"):b.aggr>0.6?tr("😈 agressif","😈 aggressive"):tr("😐 calme","😐 calm"))+"</b></div>";
  {const rk=rkRows("pow").findIndex(x=>x.b===b)+1;h+='<div class="stat"><span>'+tr("Classement mondial","World ranking")+"</span><b>"+leagueOf(rk)[1]+" #"+rk+" · "+fmt(botPow(b))+" pts</b></div>";}
  if(b.nem)h+='<div class="stat"><span>'+tr("🎯 Ennemi juré","🎯 Sworn enemy")+'</span><b class="neg">'+tr("vous a pillé ","raided you ")+b.nem+tr(" fois"," times")+(b.avenged?tr(" · vengé "," · avenged ")+b.avenged+tr(" fois"," times"):"")+"</b></div>"+(b.nemT&&S.t-b.nemT<1440?'<p class="up" style="font-size:12.5px">'+tr("🔥 Vengeance possible encore ","🔥 Revenge still possible for ")+'<span data-end="'+(b.nemT+1440)+'"></span>'+tr(" : butin +50 %.",": loot +50%.")+"</p>":"");
  if(ng)h+='<p class="desc">'+tr("🌙 Enkysté pour la nuit jusqu’à 07:00 : impossible de l’attaquer.","🌙 Encysted for the night until 07:00: it cannot be attacked.")+"</p>";
  if(!vis)h+='<p class="desc">'+tr("Hors de votre vision : ses chiffres sont des estimations.","Out of your sight: its numbers are estimates.")+"</p>";
  return h;}
function botWarnHTML(R){const b=R.B,lost=Math.round(R.n*R.lf);
  let h='<div class="kick" style="color:var(--bad)">'+tr("Avertissement","Warning")+"</div><h2>"+tr("Vous risquez de perdre ce raid","You may lose this raid")+'</h2><div class="advwild">'+sprImg(STAGE_SPR[botStage(b)],3)+"</div>";
  h+="<p>"+tr("Votre force ","Your strength ")+'<b class="neg">'+fmt(R.pw)+"</b>"+tr(" contre une défense estimée à "," against an estimated defense of ")+"<b>"+botEst(b,R.vis)+"</b>"+tr(" chez "," at ")+esc(b.name)+".</p>";
  h+="<p>"+tr("Pertes probables : ","Likely losses: ")+'<b class="neg">'+lost+" "+(lost>1?UNITS.coll.pl:UNITS.coll.name).toLowerCase()+"</b>"+tr(" sur "," out of ")+R.n+tr(". Le défenseur, lui, ne perd rien.",". The defender loses nothing.")+"</p>";
  h+='<p class="desc">'+tr("Un rival attaqué devient rancunier et risque de riposter.","An attacked rival becomes vengeful and may strike back.")+"</p>";
  return h+'<div class="row" style="justify-content:center"><button class="btn alt" data-act="mclose">'+tr("Renoncer","Give up")+'</button><button class="btn" data-act="raidgo" style="background:var(--bad);border-color:var(--bad)">'+tr("Attaquer quand même","Attack anyway")+"</button></div>";}
function raidRisk(){const p=openRef&&openRef.split(":");if(!p||p[0]!=="tile")return null;const x=+p[1],y=+p[2],B=botAt(x,y);if(!B)return null;
  const u=selComp("raid"),n=uSum(u),wh=S.heroWith&&!S.hero.busy,hp=wh?heroPower(B.type):0,pw=compAtk(u,B.type)+hp,vis=isVis(x,y),est=botDef(B)*(vis?1:1.05);
  return {B,n,pw,vis,ok:pw*ATK_ADV>=est,lf:lossFrac(pw,est)};}
function raidArrive(M){
  const B=botAt(M.x,M.y);if(!B){M.result="none";report("combat",tr("Raid sans cible · case ","Raid without target · tile ")+M.x+","+M.y,[tr("Le rival avait migré ailleurs.","The rival had moved elsewhere.")],null);return;}
  if(B.tut){fakeRaid(M,B);return;} /* souche-miroir du guide : pillage d entrainement */
  botSync(B);
  if(nightAt(S.t)){M.result="none";report("combat",tr("Kyste · ","Cyst · ")+B.name,["🌙 "+esc(B.name)+tr(" s’était enkysté pour la nuit : vos collectrices font demi-tour sans combattre."," had encysted for the night: your troops turn back without fighting.")],null);return;}
  if(!M.u)M.u={coll:M.n};
  const hp=M.hero?heroPower(B.type):0,pw=huntPower(M.u,B.type)+hp,def=botDef(B),win=pw*ATK_ADV>=def,lf=lossFrac(pw,def),lost=Math.min(M.n,Math.round(M.n*lf)),m=mods(),u0=Object.assign({},M.u);
  B.g=Math.min(3,B.g+0.03);
  const lostBy=applyLoss(M,lost);
  const lines=['<span class="'+(win?"up":"neg")+'">'+(win?tr("Pillage réussi","Successful raid"):tr("Raid repoussé","Raid repelled"))+"</span>"+tr(" chez "," on ")+esc(B.name)+" ("+STAGE_NAME[botStage(B)]+tr(", voie ",", path ")+TYPES[B.type].name+tr("). Le défenseur ne perd aucune troupe.","). The defender loses no troops."),fightTable(u0,lostBy,B.type,hp,pw,def,win,tr("Défense","Defense"))];
  if(win){const carry=compCarry(M.u)*2+hp,stock=Math.round(B.res),prot=botProt(B),avail=Math.max(0,B.res-prot),base=Math.min(carry,avail),venge=B.nemT&&S.t-B.nemT<1440,take=base*(1+m.lootPct*0.5)*(venge?1.5:1);B.res-=Math.min(B.res,take);
    M.cargo={prot:Math.round(take*0.3),lip:Math.round(take*0.3),atp:Math.round(take*0.25),nuc:Math.round(take*0.15)};M.result="win";
    if(venge){B.nemT=0;B.avenged=(B.avenged||0)+1;lines.push('<span class="up">'+tr("🔥 Vengeance ! ","🔥 Revenge! ")+esc(B.name)+tr(" vous avait pillé : butin +50 %."," had raided you: loot +50%.")+"</span>");log(tr("🔥 Vengeance sur ","🔥 Revenge on ")+B.name+" !","rare");}
    lines.push(tr("<b>Butin</b> · son stock ","<b>Loot</b> · its stock ")+fmt(stock)+tr(", dont ",", of which ")+fmt(Math.min(stock,prot))+tr(" à l’abri dans sa vacuole · pillable "," safe in its vacuole · raidable ")+fmt(avail)+tr(" · vos survivants peuvent porter "," · your survivors can carry ")+fmt(carry)+(m.lootPct?tr(" · bonus pillage +"," · raid bonus +")+Math.round(m.lootPct*50)+PCT:"")+".");
    lines.push(lootTable(RES.map(k=>[k,M.cargo[k]]),avail<5?tr("Son entrepôt était vide : tout était à l’abri.","Its storage was empty: everything was safe."):carry<avail?tr("Limité par votre capacité de transport : envoyez des porteuses ou plus de troupes pour rapporter davantage.","Limited by your carrying capacity: send carriers or more troops to bring back more."):tr("Vous avez vidé tout ce qui était pillable.","You emptied everything that could be raided.")));
    lines.push(tr("Le butin arrive avec vos troupes, dans ","The loot arrives with your troops in ")+fmtDur(M.back-S.t)+".");dqAdd("raid");}
  else{M.result="lose";}
  if(M.hero)lines.push(heroGain({def,type:B.type},win,true));
  if(win)B.g=Math.max(0.4,B.g-0.01);B.anger=Math.min(1,B.anger+0.7);const em=pickA(win?EMO.hit:EMO.win);lines.push("💬 "+esc(B.name)+" : "+em);
  log((win?tr("Vous avez pillé ","You raided "):tr("Raid repoussé par ","Raid repelled by "))+B.name+". 💬 "+em,win?"good":"bad");toast(win?tr("Pillage réussi","Successful raid"):tr("Raid repoussé","Raid repelled"));
  report("combat",(win?tr("Pillage","Raid"):tr("Échec","Failure"))+" · "+B.name,lines,win);
}
function botsStep(dm){
  if(!S.bots)return;S.inc=S.inc||[];S.botT=(S.botT||0)+dm;
  /* une attaque qui pille déclenche la protection, qui retire les autres attaques en route : on parcourt une copie */
  for(const A of S.inc.filter(a=>S.t>=a.arrive).sort((a,b)=>a.arrive-b.arrive)){const i=S.inc.indexOf(A);if(i<0)continue;S.inc.splice(i,1);incomingHit(A);}
  if(S.botT<30)return;const k=Math.floor(S.botT/30);S.botT-=k*30;
  const c=cpos(),days=bDays();
  for(const b of S.bots){
    b.anger=Math.max(0,b.anger-0.02*k);
    const d=Math.hypot(b.x-c[0],b.y-c[1]);
    if(S.tut==null&&days>=1&&d<=22&&botOnline(b,S.t)&&!S.inc.some(a=>a.bot===b.id)&&!S.mig&&!(S.ally&&b.tag===S.ally)){
      const p=(b.aggr*0.02+b.anger*0.1)*4*k*(S.ally&&b.tag?1.5:1);
      if(Math.random()<p){const travel=Math.max(6,d*1.6),arr=S.t+travel;if(!protAt(arr)&&!protAt(S.t)){
        const atk=Math.round(botAtk(b)*(0.75+Math.random()*0.4)),A={id:S.nextId++,bot:b.id,atk,arrive:arr,from:[b.x,b.y]};S.inc.push(A);
        log(tr("⚠️ Attaque entrante : ","⚠️ Incoming attack: ")+b.name+tr(" arrive à "," arrives at ")+fmtClockShort(arr)+".","bad");toast(tr("⚠️ Attaque entrante de ","⚠️ Incoming attack from ")+b.name);
        if(!S.incTut){S.incTut=1;popup({kick:tr("⚠️ Attaque entrante","⚠️ Incoming attack"),title:esc(b.name)+tr(" vous attaque !"," is attacking you!"),incTut:A.id,body:incTutHTML(A,b)});}
        dirty=true;}}}
  }
  if(Math.random()<0.04*k){const a=pickA(S.bots),b=pickA(S.bots);if(a!==b){const ok=Math.random()<0.6;if(ok){a.lw=(a.lw||0)+Math.round(botAtk(a)*(1+Math.random()));a.g=Math.min(3,a.g+0.01);b.g=Math.max(0.4,b.g-0.01);}log("📣 "+a.name+" "+(ok?tr("a pillé","raided"):tr("s’est cassé les dents sur","broke its teeth on"))+" "+b.name+".","muted");}}
  for(const b of S.bots)if(Math.random()<0.02*k*b.aggr)b.lw=(b.lw||0)+Math.round(botAtk(b)*(0.5+Math.random()));
  if(typeof alTick==="function")alTick(k);
  rkTick();
  S.botAd=(S.botAd||0)+k*30;if(S.botAd>=720){S.botAd=0;botsAdapt();}
  S.botMig=(S.botMig||0)+k*30;if(S.botMig>=1440){S.botMig=0;for(const b of S.bots){if(Math.random()<0.25){const r=rC(b.x,b.y),step=3+Math.floor(Math.random()*4),nx=Math.round(C0+(b.x-C0)*(r-step)/r),ny=Math.round(C0+(b.y-C0)*(r-step)/r);
    if(inWorld(nx,ny)&&!isLand(nx,ny)&&!botAt(nx,ny)&&(nx!==c[0]||ny!==c[1])){const T=S.tiles[ny*W+nx];if(!T.k&&!T.w){b.x=nx;b.y=ny;}}}}}
}
/* Attaque entrante : défendre (les troupes au repos se battent et peuvent tomber) ou esquiver (elles quittent la cellule, sans perte, mais ne défendent pas) */
function incRange(A){return fmt(Math.round(A.atk*0.9/10)*10)+" – "+fmt(Math.round(A.atk*1.15/10)*10);}
function incGuess(A){const h=allyHelp(),dd=playerDef()+h,dn=playerDef(true)+h,f=A.atk*ATK_ADV;return {dd,dn,hold:dd>f,holdN:dn>f};}
function incChoiceHTML(A){const g=incGuess(A),dg=!!A.dodge,has=uSum(S.army)>0;
  return '<div class="incch"><button class="btn sm'+(dg?" alt":"")+'" data-act="incst" data-id="'+A.id+'" data-s="def"'+(dg?"":' aria-pressed="true"')+">"+tr("🛡 Défendre","🛡 Defend")+"<small>"+tr("défense ","defense ")+fmt(g.dd)+" · "+(g.hold?tr("✔ devrait tenir","✔ should hold"):tr("⚠ risque de céder","⚠ may give way"))+'</small></button><button class="btn sm'+(dg?"":" alt")+'" data-act="incst" data-id="'+A.id+'" data-s="dodge"'+(dg?' aria-pressed="true"':"")+(has?"":" disabled")+">"+tr("💨 Esquiver","💨 Dodge")+"<small>"+tr("défense ","defense ")+fmt(g.dn)+tr(" · aucune perte"," · no losses")+"</small></button></div>";}
function incTutHTML(A,b){const g=incGuess(A);
  return "<p><b>"+esc(b.name)+"</b>"+tr(" arrive dans "," arrives in ")+'<b><span data-end="'+A.arrive+'"></span></b>'+tr(" avec une force estimée de "," with an estimated strength of ")+"<b>"+incRange(A)+"</b>.</p>"+
  '<div class="inctut"><p>'+tr("<b>🛡 Défendre</b> : vos troupes au repos restent dans la cellule et se battent. Si la défense tient, il repart bredouille et votre héros gagne de l’expérience, mais quelques troupes tombent. Si elle cède, vous êtes pillé et vous perdez la moitié des troupes présentes.","<b>🛡 Defend</b>: your resting troops stay in the cell and fight. If the defense holds, the attacker leaves empty-handed and your hero gains experience, but a few troops fall. If it gives way, you are raided and lose half the troops present.")+"</p>"+
  "<p>"+tr("<b>💨 Esquiver</b> : vos troupes quittent la cellule juste avant l’impact et reviennent ensuite. Aucune perte, mais seuls la membrane, les organites et le héros défendent : ce qui dépasse la part protégée par la vacuole risque d’être pillé.","<b>💨 Dodge</b>: your troops leave the cell just before impact and come back afterwards. No losses, but only the membrane, organelles and hero defend: anything above the share protected by the vacuole may be raided.")+"</p></div>"+
  '<p class="desc">'+tr("Votre défense : ","Your defense: ")+"<b>"+fmt(g.dd)+"</b>"+tr(" avec les troupes, "," with troops, ")+"<b>"+fmt(g.dn)+"</b>"+tr(" sans elles. Défendez si vous pouvez tenir, esquivez sinon. Vous pourrez changer d’avis jusqu’à l’arrivée, dans Rapports › En route."," without them. Defend if you can hold, dodge otherwise. You can change your mind until arrival, in Reports › On the way.")+"</p>"+incChoiceHTML(A)+
  '<p class="desc">'+tr("🛡 Après un pillage subi, vous êtes protégé pendant 1 h. 🌙 De minuit à 7 h, personne n’attaque personne.","🛡 After being raided, you are protected for 1 h. 🌙 From midnight to 7 am, nobody attacks anybody.")+"</p>";}
function loseHome(frac){const o={};for(const k in S.army){const n=Math.min(S.army[k]||0,Math.round((S.army[k]||0)*frac));if(n>0){o[k]=n;S.army[k]-=n;}}syncIdle();return o;}
function incomingHit(A){
  const b=S.bots.find(z=>z.id===A.bot);if(!b)return;
  if(protAt(S.t)){const sh=shieldAt(S.t);report("combat",tr("Attaque annulée · ","Attack cancelled · ")+b.name,[(sh?tr("🛡 Vous êtes sous protection après un pillage","🛡 You are protected after a raid"):tr("🌙 Vous êtes protégé pour la nuit","🌙 You are protected for the night"))+" : "+esc(b.name)+tr(" fait demi-tour sans combattre."," turns back without fighting.")],null);log((sh?"🛡 ":"🌙 ")+b.name+tr(" fait demi-tour : vous êtes protégé."," turns back: you are protected."),"muted");return;}const dodge=!!A.dodge&&uSum(S.army)>0,help=allyHelp(),def=playerDef(dodge)+help,win=A.atk*ATK_ADV>=def,D=defParts(dodge),r=A.atk*ATK_ADV/Math.max(1,def);
  let tb='<table class="ftab"><thead><tr><th>'+tr("Votre défense","Your defense")+'</th><th class="num">'+tr("Points","Points")+"</th></tr></thead><tbody>"+D.P.filter(p=>p[1]>0||p[0].indexOf(HERO_LBL)===0).map(p=>"<tr><td>"+p[0]+'</td><td class="num">'+fmt(p[1])+"</td></tr>").join("");
  if(D.mult!==1)tb+="<tr><td>"+tr("Bonus de défense (gènes, émergences, mutations)","Defense bonus (genes, emergences, mutations)")+'</td><td class="num">'+fmtF(D.mult)+"</td></tr>";
  if(help)tb+="<tr><td>"+tr("Renforts de l’alliance ","Reinforcements from alliance ")+S.ally+'</td><td class="num up">+'+fmt(help)+"</td></tr>";
  tb+='</tbody><tfoot><tr><td>Total</td><td class="num"><b>'+fmt(def)+"</b></td></tr></tfoot></table>";
  tb+='<div class="fbar def"><i style="width:'+Math.round(Math.min(100,def/(def+A.atk)*100))+'%"></i><span>'+tr("Vous ","You ")+fmt(def)+"</span><span>"+esc(b.name)+" "+fmt(A.atk)+"</span></div>";
  const lines=['<span class="'+(win?"neg":"up")+'">'+(win?tr("Votre défense a cédé","Your defense gave way"):tr("Attaque repoussée","Attack repelled"))+"</span> : "+esc(b.name)+" ("+STAGE_NAME[botStage(b)]+tr(", voie ",", path ")+TYPES[b.type].name+tr(") attaquait avec une force de ",") attacked with a strength of ")+"<b>"+fmt(A.atk)+"</b>."+(dodge?tr(" Vous aviez choisi d’<b>esquiver</b> : vos troupes ont quitté la cellule."," You had chosen to <b>dodge</b>: your troops left the cell."):""),tb];
  if(dodge)lines.push('<p class="fwhy">'+tr("💨 Esquive : vos troupes reviennent intactes, sans aucune perte.","💨 Dodge: your troops return intact, with no losses.")+"</p>");
  else if(uSum(S.army)>0){const lost=loseHome(win?0.5:Math.min(0.3,0.06+0.22*r)),n=uSum(lost);
    lines.push('<p class="fwhy">'+tr("🛡 Pertes au combat : ","🛡 Combat losses: ")+(n?'<span class="neg">'+compText(lost)+"</span>"+(win?tr(" (la défense a cédé : la moitié des troupes présentes)."," (the defense gave way: half the troops present)."):tr(" (elles ont tenu la ligne)."," (they held the line).")):tr("aucune.","none."))+"</p>");}
  if(win){const pa=protectedAmt(),carry=Math.round(A.atk*2.2);let pool=0;const ex={};RES.forEach(r=>{ex[r]=Math.max(0,S.res[r]-pa);pool+=ex[r];});
    const take=Math.min(carry,pool),got={},before={};RES.forEach(r=>{before[r]=Math.round(S.res[r]);got[r]=pool?Math.round(ex[r]/pool*take):0;S.res[r]-=got[r];stat("lootOut",r,got[r]);});b.res+=take;b.lw=(b.lw||0)+take;
    lines.push('<p class="fwhy">'+tr("Il vous manquait <b>","You were short <b>")+fmt(Math.ceil(A.atk*ATK_ADV-def))+tr("</b> de défense (vous en aviez ","</b> defense (you had ")+Math.round(100/r)+PCT+tr(" de ce qu’il fallait).",", of what was needed).")+"</p>");
    lines.push('<table class="ftab loot"><thead><tr><th>'+tr("Pillé","Raided")+'</th><th class="num">'+tr("Avant","Before")+'</th><th class="num">'+tr("À l’abri","Safe")+'</th><th class="num">'+tr("Volé","Stolen")+'</th><th class="num">'+tr("Reste","Left")+"</th></tr></thead><tbody>"+RES.map(k=>'<tr><td><span class="c-'+k+'">'+RES_NAME[k]+'</span></td><td class="num">'+fmt(before[k])+'</td><td class="num">'+fmt(Math.min(before[k],pa))+'</td><td class="num neg">'+(got[k]?"−"+fmt(got[k]):"0")+'</td><td class="num">'+fmt(Math.round(S.res[k]))+"</td></tr>").join("")+"</tbody></table>");
    lines.push(take<1?tr("Rien de volé : tout était à l’abri dans votre vacuole.","Nothing stolen: everything was safe in your vacuole."):tr("Il pouvait emporter ","It could carry ")+fmt(carry)+tr(" et a pris "," and took ")+fmt(take)+tr(". Votre vacuole met ",". Your vacuole keeps ")+fmt(pa)+tr(" de chaque ressource à l’abri : améliorez-la, dépensez vos réserves avant de partir, ou renforcez la défense (soldates au repos, cytosquelette, héros présent)."," of each resource safe: upgrade it, spend your stock before leaving, or strengthen your defense (resting soldiers, cytoskeleton, hero at home)."));
    b.nem=(b.nem||0)+1;b.nemT=S.t;S.tiles[b.y*W+b.x].s=1;
    S.shieldR=realOf(S.t)+3600000;/* les autres attaques déjà en route pendant la protection font demi-tour tout de suite */
    S.inc=S.inc.filter(o=>{if(!shieldAt(o.arrive))return true;const ob=S.bots.find(z=>z.id===o.bot);log("🛡 "+(ob?ob.name:tr("Un rival","A rival"))+tr(" fait demi-tour : vous êtes protégé."," turns back: you are protected."),"muted");return false;});
    lines.push('<p class="fwhy">'+tr("🛡 <b>Protection d’une heure</b> : aucun rival ne peut vous attaquer jusqu’à ","🛡 <b>One-hour protection</b>: no rival can attack you until ")+hhmm(S.shieldR)+tr(". Si vous pillez quelqu’un d’ici là, la protection s’arrête.",". If you raid someone before then, the protection ends.")+"</p>");
    lines.push('<div class="row revrow"><button class="btn sm" data-act="revenge" data-id="'+b.id+'" style="background:var(--bad);border-color:var(--bad)">'+tr("⚔ Riposter","⚔ Strike back")+'</button><span class="desc">'+tr("Vengeance dans les 24 h de jeu : butin +50 %. ","Revenge within 24 game hours: loot +50%. ")+(b.nem>1?tr("Il vous a déjà pillé ","It has already raided you ")+b.nem+tr(" fois."," times."):"")+"</span></div>");
    const em=pickA(EMO.win);lines.push("💬 "+esc(b.name)+" : "+em);log(tr("Pillé par ","Raided by ")+b.name+". 💬 "+em,"bad");toast(tr("Vous avez été pillé","You were raided"));
    report("combat",tr("Pillage subi · ","Raided · ")+b.name,lines,false);}
  else{dqAdd("def");b.anger=Math.max(0,b.anger-0.4);const em=pickA(EMO.lose);lines.push('<p class="fwhy">'+tr("Vos défenses ont tenu avec ","Your defenses held with ")+fmt(Math.floor(def-A.atk*ATK_ADV))+tr(" points de marge : il repart bredouille."," points to spare: it leaves empty-handed.")+"</p>");
    if(!S.hero.busy)lines.push(heroGain({def:A.atk,type:b.type},true,true));lines.push("💬 "+esc(b.name)+" : "+em);log(tr("Attaque de ","Attack from ")+b.name+tr(" repoussée. 💬 "," repelled. 💬 ")+em,"good");toast(tr("Attaque repoussée","Attack repelled"));
    report("combat",tr("Défense réussie · ","Successful defense · ")+b.name,lines,true);}
}
function nemesisHTML(){const L=S.bots.filter(b=>b.nem).sort((a,b)=>(b.nem-(b.avenged||0))-(a.nem-(a.avenged||0)));if(!L.length)return "";
  return '<div class="card"><h2>'+tr("🎯 Ennemis jurés","🎯 Sworn enemies")+"</h2>"+L.slice(0,8).map(b=>{const hot=b.nemT&&S.t-b.nemT<1440;return '<div class="nem"><span><b>'+esc(b.name)+"</b> "+(b.tag||"")+'<br><span class="muted" style="font-size:12px">'+tr("vous a pillé ","raided you ")+b.nem+tr(" fois"," times")+(b.avenged?tr(" · vengé "," · avenged ")+b.avenged+tr(" fois"," times"):"")+(hot?' · <span class="up">'+tr("🔥 vengeance +50 %","🔥 revenge +50%")+"</span>":"")+'</span></span><button class="btn sm'+(hot?"":" alt")+'" data-act="revenge" data-id="'+b.id+'">'+tr("Riposter","Strike back")+"</button></div>";}).join("")+"</div>";}
