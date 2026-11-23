/* Origins 27 · 27-saison.js
   La saison de 27 jours et ce qui rend chaque partie unique :
   · dormance : 8 h par jour choisies par le joueur, sans attaque dans un sens ni dans l'autre ;
   · réflexes : des ordres permanents (esquive automatique, récolte en boucle) pour jouer 5 minutes à la fois ;
   · mutations visibles : chaque mutation se dessine sur la cellule, avec des taches propres à la partie ;
   · espèce : un nom latin, un cousin fossile réel (Ediacarien → Carbonifère), une planche à partager ;
   · fossiles de la saison : 6 fossiles mis en vitrine, qui donnent un petit bonus aux espèces qui leur ressemblent ;
   · Gazette du serveur : le résumé du jour, à copier sur Discord ;
   · fin de saison au jour 27 : l'espèce entre au Muséum (gardé dans ce navigateur).
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const DORM_LEN=8,DORM_STARTS=[20,21,22,23,0,1,2,3],MUSEUM_KEY="o27-museum";

/* ===== Saison ===== */
function museum(){try{return JSON.parse(localStorage.getItem(MUSEUM_KEY)||"[]");}catch(e){return [];}}
function seasonNo(){if(!S)return 1;if(!S.season)S.season=museum().length+1;return S.season;}
function seasonSeed(){return ((S&&S.seed)||12345)+seasonNo()*7919;}
function seasonDay(){return Math.min(SEASON_DAYS,dayIdx(S.t)+1);}
function seasonLeft(){return Math.max(0,SEASON_DAYS*1440-S.t);}
/* Le jeu se dévoile : au noyau niveau 3, on annonce ce qui vient d’apparaître dans l’interface. */
function unlockTick(){
  if(!S||S.unlock3||S.tut!=null||S.noyau<3)return;S.unlock3=1;if(S.noyau>3)return;
  popup({kick:tr("Noyau niveau 3","Nucleus level 3"),title:tr("Nouvelles possibilités","New possibilities"),body:'<ul class="advice"><li>⚔ <b>'+tr("Recherche militaire","Military research")+"</b> "+tr("(onglet Armée) : de nouvelles troupes, plus fortes.","(Army tab): new, stronger troops.")+"</li><li>🏆 <b>"+tr("Classement mondial","World ranking")+"</b> "+tr("et","and")+" 📰 <b>"+tr("Gazette du serveur","Server gazette")+"</b> "+tr("(onglet Rapports).","(Reports tab).")+"</li><li>🔬 <b>"+tr("Mon espèce","My species")+"</b> "+tr("(onglet Évolution) : votre cousin fossile et votre planche à partager.","(Evolution tab): your fossil cousin and your plate to share.")+"</li></ul>"});dirty=true;}
function seasonTick(){
  unlockTick();
  if(S&&S.bots)crisisTick();
  if(!S||S.seasonEnd||S.tut!=null||S.t<SEASON_DAYS*1440)return;
  const rk=myRank("pow"),L=leagueOf(rk),sp=speciesInfo();
  S.seasonEnd={t:S.t,rank:rk,league:L[2]};
  const entry={season:seasonNo(),name:sp.name,cousin:sp.cousin.name,rank:rk,of:S.bots.length+1,league:L[1]+" "+L[2],crisis:crisisBadge()?tr("Survivant : ","Survivor: ")+crisisBadge().name:"",stage:LIFE[S.stage||1]||"",muts:(S.muts||[]).length,date:new Date().toISOString().slice(0,10)};
  try{const M=museum();M.push(entry);localStorage.setItem(MUSEUM_KEY,JSON.stringify(M.slice(-60)));}catch(e){}
  log("🏛 "+tr("Fin de la saison ","End of season ")+seasonNo()+" : "+sp.name+tr(" entre au Muséum."," enters the Museum."),"rare");
  popup({kick:tr("Jour ","Day ")+SEASON_DAYS+tr(" · fin de la saison "," · end of season ")+seasonNo(),title:tr("Votre espèce entre au Muséum","Your species enters the Museum"),body:seasonEndHTML(entry)});
  dirty=true;
}
function seasonEndHTML(e){
  return '<p class="specname"><i>'+esc(e.name)+"</i></p><p>"+tr("Classement final : ","Final ranking: ")+"<b>"+e.rank+tr("e","th")+"</b> / "+e.of+" · "+e.league+tr(" · cousin fossile : "," · fossil cousin: ")+"<b>"+esc(e.cousin)+"</b>"+(e.crisis?" · 🏅 "+esc(e.crisis):"")+".</p>"+
  '<p class="desc">'+tr("Vous pouvez continuer à jouer cette partie (prolongation, sans classement de saison) ou ouvrir la saison suivante : une nouvelle carte, de nouveaux rivaux et de nouveaux fossiles en vitrine. Votre planche reste au Muséum.","You can keep playing this game (extra time, no season ranking) or open the next season: a new map, new rivals and new fossils on display. Your plate stays in the Museum.")+"</p>"+
  '<div class="row" style="justify-content:center"><button class="btn" data-act="species">'+tr("Voir la planche","See the plate")+'</button><button class="btn alt" data-act="newseason">'+tr("Ouvrir la saison ","Open season ")+(e.season+1)+"</button></div>";
}

/* ===== Grande crise : une par saison, annoncée 48 h avant, 24 h de jeu =====
   Rien de durable n’est détruit : seule la production est freinée, et d’autant plus que l’on est haut au classement.
   Les 30 % derniers en profitent (+10 %) : après les grandes extinctions, les petits repeuplent les niches libérées.
   Deux mutations de la bonne famille divisent le malus par deux : la crise se prépare. */
const CRISIS_DAY=18,CRISIS_WARN=2*1440,CRISIS_LEN=1440;
const CRISES={
  glace:{ic:"❄",name:tr("Glaciation","Glaciation"),fam:"R",col:"#78bee6",desc:tr("Les eaux se refroidissent : tout le métabolisme ralentit.","The waters cool down: all metabolism slows."),adv:tr("Mutations de résilience (paroi épaisse, métabolisme frugal, capsule de mucus, membrane plissée)","Resilience mutations (thick wall, frugal metabolism, mucus capsule, folded membrane)")},
  anox:{ic:"🫧",name:tr("Anoxie","Anoxia"),fam:"E",col:"#a99bff",desc:tr("L’oxygène disparaît des eaux : la respiration s’essouffle.","Oxygen vanishes from the waters: respiration falters."),adv:tr("Mutations de métabolisme (pompe surnuméraire, chaperonnes, réplication rapide, plasmide voyageur)","Metabolism mutations (extra pump, chaperones, fast replication, roaming plasmid)")},
  meteo:{ic:"☄",name:tr("Impact de météorite","Meteor impact"),fam:"M",col:"#ff9e6b",desc:tr("Un impact trouble les eaux et coupe la lumière.","An impact clouds the waters and cuts off the light."),adv:tr("Mutations de mobilité (cils battants, pigment, chimiorécepteurs, vésicule de gaz)","Mobility mutations (beating cilia, pigment, chemoreceptors, gas vesicle)")}
};
function crisisType(){const k=Object.keys(CRISES);return k[Math.floor(mulberry32(seasonSeed()^0x2545f491)()*k.length)];}
function crisisStart(){return (CRISIS_DAY-1)*1440;}
function crisisPhase(t){if(!S||S.tut!=null)return null;t=t==null?S.t:t;const s=crisisStart();if(t<s-CRISIS_WARN)return null;if(t<s)return "warn";if(t<s+CRISIS_LEN)return "on";return "done";}
function crisisRankP(){/* place au classement entre 0 (premier) et 1 (dernier), recalculée toutes les 30 min de jeu */
  const k=Math.floor(S.t/30);if(S.crP&&S.crP.k===k)return S.crP.p;
  if(crisisRankP.busy)return S.crP?S.crP.p:0.5;/* le classement appelle mods() : pas de boucle */
  crisisRankP.busy=1;try{const n=S.bots.length+1,p=n>1?(myRank("pow")-1)/(n-1):0;S.crP={k,p};return p;}finally{crisisRankP.busy=0;}}
function crisisAdapted(){return mutCount(CRISES[crisisType()].fam)>=2;}
function crisisEffect(p){if(p>=0.7)return 0.10;return -0.25*Math.pow(1-p,1.5);}
function crisisMine(){const p=crisisRankP();let e=crisisEffect(p);if(e<0&&crisisAdapted())e/=2;return Math.round(e*1000)/1000;}
function crisisMods(m){if(crisisPhase()!=="on")return;const e=crisisMine();["atpPct","protPct","lipPct","nucPct"].forEach(k=>m[k]=(m[k]||0)+e);}
function crisisTick(){
  const ph=crisisPhase(),C=CRISES[crisisType()];if(!ph)return;
  if(ph!=="done"&&!S.crWarned){S.crWarned=1;log(C.ic+" "+tr("Alerte : ","Alert: ")+C.name+tr(" au jour "," on day ")+CRISIS_DAY+".","bad");popup({kick:C.ic+" "+tr("Grande crise annoncée","Great crisis announced"),title:C.name+tr(" au jour "," on day ")+CRISIS_DAY,body:crisisInfoHTML(true)});}
  if(ph==="on"&&!S.crOn){S.crOn=1;log(C.ic+" "+C.name+tr(" : la crise commence pour 24 h."," : the crisis begins, for 24 h."),"bad");popup({kick:C.ic+" "+tr("Grande crise","Great crisis"),title:C.name,body:crisisInfoHTML(false)});}
  if(ph==="done"&&S.crOn&&!S.crDone){S.crDone={type:crisisType(),eff:crisisMine()};
    /* les rivaux aussi ont perdu (ou gagné) une journée de production : le classement se resserre */
    const rows=rkRows("pow"),n=rows.length;rows.forEach((r,i)=>{if(r.me)return;const e=crisisEffect(n>1?i/(n-1):0);r.b.g=Math.max(0.3,r.b.g*(1+e/CRISIS_DAY));});S.crP=null;
    log("🏅 "+tr("Vous avez survécu à la crise : ","You survived the crisis: ")+C.name+".","rare");
    popup({kick:"🏅 "+tr("Fin de la crise","End of the crisis"),title:tr("Survivant : ","Survivor: ")+C.name,body:"<p>"+tr("La production revient à la normale. Votre espèce porte désormais le badge <b>Survivant</b> sur sa planche et au Muséum.","Production is back to normal. Your species now wears the <b>Survivor</b> badge on its plate and in the Museum.")+"</p>"});}
}
function crisisInfoHTML(warn){
  const C=CRISES[crisisType()],p=crisisRankP(),e0=crisisEffect(p),ad=crisisAdapted(),e=crisisMine(),pct=v=>(v>0?"+":"−")+Math.round(Math.abs(v)*100)+PCT;
  let h='<p>'+C.desc+" "+(warn?tr("Elle commencera au <b>jour ","It will begin on <b>day ")+CRISIS_DAY+tr("</b> et durera 24 h de jeu.","</b> and last 24 game hours."):tr("Elle dure 24 h de jeu.","It lasts 24 game hours."))+"</p>";
  h+='<p>'+tr("Rien n’est détruit : seule la production de ressources change pendant la crise, selon votre place au classement. Les plus gros sont les plus touchés ; les 30 % derniers en profitent.","Nothing is destroyed: only resource production changes during the crisis, depending on your ranking. The biggest are hit hardest; the bottom 30% benefit.")+"</p>";
  h+='<div class="fosscard"><div class="kick">'+tr("Pour vous","For you")+"</div><b>"+(e>=0?'<span class="up">'+pct(e)+"</span>":'<span class="neg">'+pct(e)+"</span>")+"</b> "+tr("de production","production")+(e0<0?(ad?'<p class="up">✔ '+tr("Votre espèce est adaptée : malus divisé par deux.","Your species is adapted: penalty halved.")+"</p>":'<p>'+tr("Pour diviser ce malus par deux : avoir au moins 2 ","To halve this penalty: have at least 2 ")+C.adv+".</p>"):"")+"</div>";
  return h;
}
function crisisPill(){const ph=crisisPhase();if(!ph||ph==="done")return "";const C=CRISES[crisisType()],e=crisisMine();
  return '<button class="evpill" style="--ec:'+C.col+'" data-act="crisis">'+C.ic+" "+C.name+" · "+(ph==="warn"?tr("dans ","in ")+'<span data-end="'+crisisStart()+'"></span>':tr("en cours · ","ongoing · ")+(e>=0?"+":"−")+Math.round(Math.abs(e)*100)+PCT+' · <span data-end="'+(crisisStart()+CRISIS_LEN)+'"></span>')+"</button>";}
function crisisGazette(){const ph=crisisPhase(),C=CRISES[crisisType()];if(!ph)return "";
  if(ph==="done")return S.crDone?'<p class="desc">🏅 '+tr("Le serveur a traversé la crise : ","The server went through the crisis: ")+C.name+".</p>":"";
  return '<div class="fosscard"><div class="kick">'+C.ic+" "+(ph==="warn"?tr("Alerte météo des abysses","Abyss weather alert"):tr("Crise en cours","Crisis ongoing"))+"</div><b>"+C.name+"</b> "+(ph==="warn"?tr("au jour ","on day ")+CRISIS_DAY:tr("jusqu’à demain","until tomorrow"))+"<p>"+C.desc+" "+tr("Les espèces adaptées : ","Adapted species: ")+C.adv.toLowerCase()+".</p></div>";}
function crisisBadge(){return S&&S.crDone?CRISES[S.crDone.type]:null;}

/* ===== Dormance : 8 h choisies par le joueur (heure réelle) ===== */
function dormH(){return S&&S.dormH!=null?S.dormH:23;}
function dormRaw(r){const d=new Date(r),x=d.getHours()+d.getMinutes()/60;return ((x-dormH())%24+24)%24;}
function dormAt(t){const r=realOf(t);if(dormRaw(r)>=DORM_LEN)return false;return !(S&&S.dormBrk&&r<S.dormBrk);}
function hh(h){return String(((h%24)+24)%24).padStart(2,"0")+":00";}
function dormEndTxt(){return hh(dormH()+DORM_LEN);}
function dormSentence(){const a=hh(dormH()),b=dormEndTxt();return tr("🌙 Pendant votre dormance ("+a+" – "+b+"), personne ne vous attaque. Si vous pillez, vous perdez cette protection jusqu’au matin.","🌙 During your dormancy ("+a+" – "+b+"), nobody attacks you. If you raid, you lose this protection until morning.");}
/* Briser sa protection : piller pendant la dormance la supprime jusqu’à la fin de la nuit ;
   pendant le bouclier d’après-pillage, jusqu’à la fin de l’heure. Une confirmation est demandée avant. */
function dormBreak(){const r=Date.now(),el=dormRaw(r);
  if(el<DORM_LEN&&!(S.dormBrk&&r<S.dormBrk)){S.dormBrk=r+(DORM_LEN-el)*3600000;log("🌙 "+tr("Dormance brisée : vous pouvez être attaqué jusqu’à ","Dormancy broken: you can be attacked until ")+hhmm(S.dormBrk)+".","bad");}
  if(shieldAt(S.t)){S.shieldR=0;log("🛡 "+tr("Bouclier brisé : vous pouvez être attaqué.","Shield broken: you can be attacked."),"bad");}
  dirty=true;}
function brkNeeded(){if(!S||!openRef||openRef.indexOf("tile:")!==0)return null;const p=openRef.split(":"),B=botAt(+p[1],+p[2]);if(!B||B.tut)return null;return dormAt(S.t)?"dorm":shieldAt(S.t)?"shield":null;}
function brkHTML(kind,k){const dorm=kind==="dorm";
  const txt=dorm?tr("Vous êtes en dormance jusqu’à <b>"+dormEndTxt()+"</b>. Si vous pillez maintenant, vous perdez cette protection pour <b>le reste de la nuit</b> : les rivaux pourront vous attaquer jusqu’à "+dormEndTxt()+".","You are dormant until <b>"+dormEndTxt()+"</b>. If you raid now, you lose this protection for <b>the rest of the night</b>: rivals will be able to attack you until "+dormEndTxt()+".")
    :tr("Vous êtes protégé jusqu’à <b>"+hhmm(S.shieldR)+"</b>. Si vous pillez maintenant, vous perdez ce bouclier pour <b>le reste de l’heure</b>.","You are protected until <b>"+hhmm(S.shieldR)+"</b>. If you raid now, you lose this shield for <b>the rest of the hour</b>.");
  return '<div class="kick">'+(dorm?"🌙 "+tr("Dormance","Dormancy"):"🛡 "+tr("Bouclier","Shield"))+"</div><h2>"+tr("Briser votre protection ?","Break your protection?")+"</h2><p>"+txt+'</p><div class="row" style="justify-content:center"><button class="btn" data-act="raidbrk" data-k="'+k+'" style="background:var(--bad);border-color:var(--bad)">'+tr("Briser et piller","Break and raid")+'</button><button class="btn alt" data-act="mclose">'+tr("Garder ma protection","Keep my protection")+"</button></div>";}
function dormCanChange(){return !S.dormSetR||Date.now()-S.dormSetR>=86400000;}
function setDorm(h){if(!S)return;h=+h;if(DORM_STARTS.indexOf(h)<0||h===dormH())return;
  if(!dormCanChange()){toast(tr("Vous pourrez la changer à nouveau à ","You can change it again at ")+hhmm(S.dormSetR+86400000));return;}
  if(dormAt(S.t)&&S.inc&&S.inc.length){toast(tr("Impossible pendant une attaque en cours","Not possible while an attack is on its way"));return;}
  S.dormH=h;S.dormSetR=Date.now();log("🌙 "+tr("Dormance réglée : ","Dormancy set: ")+hh(h)+" – "+dormEndTxt()+".","muted");dirty=true;}

/* ===== Réflexes : des ordres permanents ===== */
function rfx(k){const R=S.rfx||{};return k==="dodge"?R.dodge!==0:!!R[k];}
function rfxToggle(k){S.rfx=S.rfx||{};S.rfx[k]=rfx(k)?0:1;dirty=true;}
function rfxIncoming(A){
  if(!rfx("dodge")||A.manual||A.rfxDone)return;A.rfxDone=1;
  if(uSum(S.army)<1)return;const g=incGuess(A);
  if(!g.hold){A.dodge=true;log("💨 "+tr("Réflexe : votre défense ne tiendrait pas, vos troupes esquivent (aucune perte).","Reflex: your defense would not hold, your troops dodge (no losses)."),"muted");}
  else A.dodge=false;
}
function rfxLoop(M){
  if(!rfx("loop")||S.mig||S.tut!=null)return;const T=S.tiles[M.y*W+M.x];if(!T||!T.k||T.a<20||S.idle<1)return;
  const o=openRef,sn=S.selN;openRef="tile:"+M.x+":"+M.y;S.selN=Math.max(1,Math.min(S.idle,M.n||1));let ok=false;
  try{ok=sendMission("collect",true,true);}catch(e){ok=false;}
  openRef=o;if(sn==null)delete S.selN;else S.selN=sn;
  if(ok)log("🔁 "+tr("Réflexe : vos collectrices repartent sur la case ","Reflex: your gatherers head back to tile ")+M.x+","+M.y+".","muted");
}
function seasonOptHTML(){
  if(!S)return "";const cur=dormH(),can=dormCanChange();
  let h='<div class="optrow"><span>🌙 '+tr("Dormance","Dormancy")+'<small class="desc">'+tr("8 h par jour où personne ne vous attaque. Piller pendant ce temps la brise jusqu’au matin. Modifiable une fois par 24 h.","8 h a day when nobody attacks you. Raiding during that time breaks it until morning. Can be changed once every 24 h.")+(can?"":"<br>"+tr("Prochain changement possible à ","Next change possible at ")+hhmm(S.dormSetR+86400000))+'</small></span><select data-dorm="1" aria-label="'+tr("Début de la dormance","Dormancy start")+'"'+(can?"":" disabled")+">"+DORM_STARTS.map(x=>'<option value="'+x+'"'+(x===cur?" selected":"")+">"+hh(x)+" – "+hh(x+DORM_LEN)+"</option>").join("")+"</select></div>";
  const tg=(k,l,d)=>'<div class="optrow"><span>'+l+'<small class="desc">'+d+'</small></span><button class="btn sm'+(rfx(k)?"":" alt")+'" data-act="rfx" data-k="'+k+'" aria-pressed="'+rfx(k)+'">'+(rfx(k)?tr("Activé","On"):tr("Désactivé","Off"))+"</button></div>";
  h+=tg("dodge","💨 "+tr("Réflexe d’esquive","Dodge reflex"),tr("Si une attaque arrive et que votre défense ne tiendrait pas, vos troupes esquivent toutes seules. Un choix fait à la main garde la priorité.","If an attack comes and your defense would not hold, your troops dodge on their own. A choice made by hand takes priority."));
  h+=tg("loop","🔁 "+tr("Récolte en boucle","Harvest loop"),tr("Les collectrices qui reviennent d’un gisement y repartent tant qu’il reste de quoi récolter et assez d’énergie.","Gatherers coming back from a deposit go back as long as there is something left and enough energy."));
  return h;
}
document.addEventListener("change",e=>{const t=e.target;if(t&&t.dataset&&t.dataset.dorm&&S){setDorm(t.value);showModal(optHTML());}});

/* ===== Mutations visibles ===== */
function mutOuterSVG(C,mem){
  if(!S||!S.muts||!S.muts.length)return "";const M=id=>S.muts.indexOf(id)>=0,D=Math.PI/180;let s="";
  if(M("mucu"))s+='<circle cx="'+C+'" cy="'+C+'" r="'+(mem+44)+'" fill="rgba(190,240,220,.07)" stroke="#bff0dc" stroke-opacity=".28" stroke-width="2" stroke-dasharray="2 6"/>';
  if(M("paro"))s+='<circle cx="'+C+'" cy="'+C+'" r="'+(mem+15)+'" fill="none" stroke="#8a6a3c" stroke-width="7" stroke-opacity=".8"/><circle cx="'+C+'" cy="'+C+'" r="'+(mem+19)+'" fill="none" stroke="#e9b86c" stroke-opacity=".5" stroke-width="1"/>';
  if(M("pliss")){let d="";for(let i=0;i<=180;i++){const a=i/180*Math.PI*2,r=mem+5+Math.sin(i*0.7)*3.5,p=polar(C,a,r);d+=(i?" L":"M")+p;}s+='<path d="'+d+'Z" fill="none" stroke="#9fd8cf" stroke-width="1.6" stroke-opacity=".7"/>';}
  if(M("cils")){for(let i=0;i<40;i++){const a=(20+i*3.5)*D,b=polar(C,a,mem+10),m=polar(C,a+0.03,mem+17),t=polar(C,a-0.01,mem+25);s+='<path d="M'+b+" Q"+m+" "+t+'" fill="none" stroke="#5ee6d0" stroke-width="1.4" stroke-linecap="round"/>';}}
  if(M("chim")){[-104,-76].forEach((g,i)=>{const a=g*D,b=polar(C,a,mem+8),m=polar(C,a+(i?.12:-.12),mem+42),t=polar(C,a+(i?.2:-.2),mem+74);s+='<path d="M'+b+" Q"+m+" "+t+'" fill="none" stroke="#a9c7d6" stroke-width="2.4" stroke-linecap="round"/><circle cx="'+t[0]+'" cy="'+t[1]+'" r="4" fill="#d6e5ec"/>';});}
  if(M("esto")){const a=250*D,p=polar(C,a,mem+20);s+='<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="34" ry="22" transform="rotate('+(250+90)+" "+p[0]+" "+p[1]+')" fill="rgba(239,127,166,.3)" stroke="#ef7fa6" stroke-width="2"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="#ef7fa6" fill-opacity=".7"/>';}
  if(M("fren")){for(let i=0;i<7;i++){const a=(-75+i*6)*D,p1=polar(C,a-0.025,mem+9),p2=polar(C,a+0.025,mem+9),t=polar(C,a,mem+24+(i%2)*8);s+='<polygon points="'+p1+" "+t+" "+p2+'" fill="#ff6a4d"/>';}}
  if(M("lyso")){for(let i=0;i<12;i++){const p=polar(C,(i*30+8)*D,mem+12);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.2" fill="#ff8a7a" stroke="#7a1f12" stroke-width=".8"/>';}}
  if(M("divi")){[0,180].forEach(g=>{const a=g*D,p1=polar(C,a-0.05,mem+10),p2=polar(C,a+0.05,mem+10),t=polar(C,a,mem-12);s+='<polygon points="'+p1+" "+t+" "+p2+'" fill="#0a2a30" stroke="#5ee6d0" stroke-width="1.2"/>';});}
  return s;
}
function mutInnerSVG(C,mem){
  if(!S)return "";const M=id=>(S.muts||[]).indexOf(id)>=0,D=Math.PI/180;let s="";
  /* Taches de pigment propres à la partie : deux cellules ne se ressemblent jamais */
  const rnd=mulberry32(seasonSeed()),pal=["#ffd166","#ef7fa6","#a99bff","#7fd36b","#ff9e6b","#78bee6"],c1=pal[Math.floor(rnd()*pal.length)],n=4+Math.floor(rnd()*5);
  for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,r=95+rnd()*95,p=polar(C,a,r),rr=3+rnd()*6;s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+rr+'" fill="'+c1+'" fill-opacity=".32"/>';}
  if(M("atp")){for(let i=0;i<6;i++){const a=(195+i*9)*D,p=polar(C,a,mem-6);s+='<rect x="'+(p[0]-3)+'" y="'+(p[1]-6)+'" width="6" height="12" rx="2" transform="rotate('+(a/D+90)+" "+p[0]+" "+p[1]+')" fill="#ffe07a"/>';}}
  if(M("chap")){for(let i=0;i<4;i++){const p=polar(C,(i*90+70)*D,165);s+='<path d="M'+(p[0]+6)+" "+(p[1]-6)+" A8 8 0 1 0 "+(p[0]+6)+" "+(p[1]+6)+'" fill="none" stroke="#c9c0ff" stroke-width="2.2" stroke-linecap="round"/>';}}
  if(M("repl")){let d1="",d2="";for(let i=0;i<=24;i++){const x=C-60+i*5,y=C+92+Math.sin(i*0.6)*7,y2=C+92-Math.sin(i*0.6)*7;d1+=(i?" L":"M")+x+" "+y;d2+=(i?" L":"M")+x+" "+y2;}s+='<path d="'+d1+'" fill="none" stroke="#a99bff" stroke-width="2"/><path d="'+d2+'" fill="none" stroke="#5ee6d0" stroke-width="2"/>';}
  if(M("plas")){[[-0.9,150],[2.2,140],[3.6,158]].forEach(q=>{const p=polar(C,q[0],q[1]);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="8" fill="none" stroke="#ffd166" stroke-width="2"/>';});}
  if(M("pigm")){const p=polar(C,-60*D,mem-18);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="9" fill="#3a0d08" stroke="#ff6a3d" stroke-width="2"/><circle cx="'+(p[0]+2)+'" cy="'+(p[1]-2)+'" r="2.5" fill="#ffd2b8"/>';}
  if(M("vesi")){for(let i=0;i<6;i++){const p=polar(C,(300+(i%3)*9)*D,110+Math.floor(i/3)*16);s+='<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="7" ry="4.5" fill="rgba(214,229,236,.25)" stroke="#d6e5ec" stroke-width="1"/>';}}
  if(M("frug")){for(let i=0;i<9;i++){const p=polar(C,(i*40+20)*D,75+(i%3)*12);s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#7e97a7" fill-opacity=".8"/>';}}
  return s;
}

/* ===== Fossiles : des animaux réels et documentés, de l’Ediacarien au Carbonifère ===== */
const ERAS={1:tr("Ediacarien","Ediacaran"),2:tr("Cambrien","Cambrian"),3:tr("Ordovicien","Ordovician"),4:tr("Dévonien","Devonian"),5:tr("Carbonifère","Carboniferous")};
const FOSSILS=[
  {id:"charnia",name:"Charnia",era:1,ma:562,v:[3,0,0,1],eff:{atpPct:.05},fact:tr("Une fronde fixée au fond, sans bouche ni intestin. Le premier fossile de ce type a été reconnu en 1957 grâce à un écolier anglais, Roger Mason.","A frond anchored to the seafloor, with no mouth or gut. The first such fossil was recognised in 1957 thanks to an English schoolboy, Roger Mason.")},
  {id:"dickinsonia",name:"Dickinsonia",era:1,ma:558,v:[2,0,0,2],eff:{capPct:.06},fact:tr("Un ovale côtelé qui pouvait dépasser 1 m. Des traces de cholestérol trouvées dans ses fossiles en 2018 montrent que c’était bien un animal.","A ribbed oval that could exceed 1 m. Traces of cholesterol found in its fossils in 2018 show it really was an animal.")},
  {id:"kimberella",name:"Kimberella",era:1,ma:555,v:[2,1,1,0],eff:{extractPct:.05},fact:tr("Un mollusque primitif qui raclait les tapis de microbes : on voit encore ses traces de broutage près de la mer Blanche, en Russie.","A primitive mollusc that scraped microbial mats: its grazing marks can still be seen near the White Sea, in Russia.")},
  {id:"cloudina",name:"Cloudina",era:1,ma:550,v:[0,0,0,3],eff:{defPct:.06},fact:tr("L’un des tout premiers squelettes durs : des tubes de calcaire empilés comme des cornets. Certains portent les trous laissés par des prédateurs.","One of the very first hard skeletons: limestone tubes stacked like cones. Some bear holes left by predators.")},
  {id:"anomalocaris",name:"Anomalocaris",era:2,ma:508,v:[0,3,2,0],eff:{predPct:.06},fact:tr("Jusqu’à un mètre de long : le grand prédateur du Cambrien, avec deux appendices épineux devant une bouche en anneau. Trouvé dans les schistes de Burgess, au Canada.","Up to a metre long: the great predator of the Cambrian, with two spiny appendages in front of a ring-shaped mouth. Found in the Burgess Shale, Canada.")},
  {id:"opabinia",name:"Opabinia",era:2,ma:505,v:[0,1,3,0],eff:{visionAdd:1},fact:tr("Cinq yeux et une longue trompe terminée par une pince. Quand il a été présenté en 1972, la salle a éclaté de rire.","Five eyes and a long proboscis ending in a claw. When it was presented in 1972, the audience burst out laughing.")},
  {id:"hallucigenia",name:"Hallucigenia",era:2,ma:505,v:[0,0,1,2],eff:{defPct:.05},fact:tr("Si étrange qu’on l’a d’abord dessinée à l’envers, marchant sur ses épines, et la tête à la place de la queue.","So strange that it was first drawn upside down, walking on its spines, with its head where its tail should be.")},
  {id:"wiwaxia",name:"Wiwaxia",era:2,ma:505,v:[1,0,0,2],eff:{capPct:.05},fact:tr("Couverte d’écailles et de longues épines, elle broutait le fond à l’abri des prédateurs.","Covered in scales and long spines, it grazed the seafloor safe from predators.")},
  {id:"marrella",name:"Marrella",era:2,ma:505,v:[1,0,2,0],eff:{cellTime:-.05},fact:tr("L’animal le plus courant des schistes de Burgess : plus de 25 000 spécimens ont été récoltés.","The most common animal of the Burgess Shale: over 25,000 specimens have been collected.")},
  {id:"pikaia",name:"Pikaia",era:2,ma:508,v:[1,0,2,1],eff:{nucPct:.06},fact:tr("Un petit ruban de 5 cm avec une corde dorsale : un lointain cousin de tous les vertébrés, nous compris.","A small 5 cm ribbon with a dorsal cord: a distant cousin of all vertebrates, including us.")},
  {id:"haikouichthys",name:"Haikouichthys",era:2,ma:518,v:[0,0,3,0],eff:{speedPct:.06},fact:tr("L’un des tout premiers poissons, long de 2,5 cm et sans mâchoires, trouvé à Chengjiang, en Chine.","One of the very first fish, 2.5 cm long and jawless, found at Chengjiang, China.")},
  {id:"trilobite",name:tr("Trilobite","Trilobite"),era:2,ma:521,v:[0,0,1,3],eff:{defPct:.06},fact:tr("Des yeux aux lentilles de calcite, parmi les plus anciens yeux complexes connus. Plus de 20 000 espèces décrites, sur près de 270 millions d’années.","Eyes with calcite lenses, among the oldest complex eyes known. Over 20,000 species described, across nearly 270 million years.")},
  {id:"cameroceras",name:"Cameroceras",era:3,ma:470,v:[0,2,1,2],eff:{lootPct:.08},fact:tr("Un nautiloïde à coquille droite, peut-être long de plusieurs mètres : l’un des plus grands prédateurs de l’Ordovicien.","A straight-shelled nautiloid, perhaps several metres long: one of the largest predators of the Ordovician.")},
  {id:"jaekelopterus",name:"Jaekelopterus",era:4,ma:390,v:[0,3,0,1],eff:{predPct:.06},fact:tr("Le scorpion de mer géant : une pince de 46 cm trouvée en Allemagne laisse estimer l’animal à 2,5 m.","The giant sea scorpion: a 46 cm claw found in Germany suggests an animal 2.5 m long.")},
  {id:"dunkleosteus",name:"Dunkleosteus",era:4,ma:375,v:[0,3,0,2],eff:{predPct:.04,defPct:.04},fact:tr("Un poisson cuirassé de plusieurs mètres, sans vraies dents : ses plaques osseuses tranchantes en tenaient lieu.","An armoured fish several metres long, with no real teeth: its sharp bony plates did the job.")},
  {id:"tiktaalik",name:"Tiktaalik",era:4,ma:375,v:[1,0,2,1],eff:{fieldPct:.05},fact:tr("Mi-poisson, mi-tétrapode : des nageoires avec un poignet et un cou. Découvert en 2004 sur l’île d’Ellesmere, au Canada.","Half fish, half tetrapod: fins with a wrist, and a neck. Discovered in 2004 on Ellesmere Island, Canada.")},
  {id:"arthropleura",name:"Arthropleura",era:5,ma:300,v:[1,0,0,3],eff:{capPct:.06},fact:tr("Un mille-pattes de plus de 2 m : le plus grand arthropode terrestre connu.","A millipede over 2 m long: the largest land arthropod known.")},
  {id:"meganeura",name:"Meganeura",era:5,ma:300,v:[0,1,3,0],eff:{speedPct:.06},fact:tr("Une libellule de 70 cm d’envergure, à une époque où l’air contenait plus d’oxygène qu’aujourd’hui.","A dragonfly with a 70 cm wingspan, at a time when the air held more oxygen than today.")}
];
const FOS_BY={};FOSSILS.forEach(f=>FOS_BY[f.id]=f);
function seasonShowcase(){const rnd=mulberry32(seasonSeed()^0x5bd1e995),ids=FOSSILS.map(f=>f.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,6);}
function profile(){
  const br=b=>S.nodes.filter(id=>NODES[id]&&NODES[id].br===b).length;
  return [0.3+mutCount("E")+br("E")+(hasEm("lichen")?1:0),0.3+mutCount("P")+br("P"),0.3+mutCount("M")+br("M")+(hasEm("spirale")?1:0),0.3+mutCount("R")+(hasEm("cuirasse")?2:0)+(has("COLO")?1:0)];
}
function cosSim(a,b){let d=0,na=0,nb=0;for(let i=0;i<4;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return d/Math.sqrt(na*nb||1);}
let SPC=null;
function speciesInfo(){
  const key=[S.souche,S.stage,(S.muts||[]).join(","),S.nodes.join(","),S.emerg.join(","),seasonNo()].join("|");if(SPC&&SPC.key===key&&SPC.S===S)return SPC.v;
  const P=profile(),era=Math.max(1,Math.min(5,S.stage||1)),pool=FOSSILS.filter(f=>f.era<=era);
  const ranked=pool.map(f=>({f,s:cosSim(P,f.v)})).sort((a,b)=>b.s-a.s),cousin=ranked[0].f,show=seasonShowcase();
  const dom=[0,1,2,3].sort((a,b)=>P[b]-P[a])[0],rnd=mulberry32(seasonSeed()+dom);
  const PRE=[["Photo","Chemo","Thermo","Glyco"],["Lyco","Phago","Toxo","Dino"],["Nauto","Cilio","Opto","Dromo"],["Scuto","Lorico","Thoraco","Ostraco"]][dom];
  const SUF=["monas","cystis","zoon","caris","pleura"][Math.max(0,Math.min(4,(S.stage||1)-1))];
  const EP={varenne:"varennae",kori:"korii",abyssa:"abyssalis",ilheu:"ilheuensis"}[S.souche]||"originis";
  const name=PRE[Math.floor(rnd()*PRE.length)]+SUF+" "+EP;
  const v={name,cousin,match:Math.round(ranked[0].s*100),show,inShow:show.indexOf(cousin.id)>=0,P};
  SPC={key,S,v};return v;
}
function seasonMods(m){if(!S||!S.nodes)return;crisisMods(m);const sp=speciesInfo();if(sp.inShow){const e=sp.cousin.eff;for(const k in e)m[k]=(m[k]||0)+e[k];}}
function speciesBarHTML(){if(!S||earlyGame())return "";const sp=speciesInfo();return '<button class="mutbar specbar" data-act="species"><span>🔬 '+tr("Mon espèce","My species")+" : <i>"+esc(sp.name)+"</i></span><span>"+tr("cousin fossile ","fossil cousin ")+"<b>"+esc(sp.cousin.name)+"</b>"+(sp.inShow?' <span class="up">'+tr("★ en vitrine cette saison","★ on display this season")+"</span>":"")+'</span><span class="muted">'+tr("Voir la planche →","See the plate →")+"</span></button>";}
function speciesHTML(){
  const sp=speciesInfo(),c=sp.cousin;
  let h='<div class="kick">'+tr("Saison ","Season ")+seasonNo()+" · "+tr("jour ","day ")+seasonDay()+"/"+SEASON_DAYS+"</div><h2><i>"+esc(sp.name)+"</i></h2>"+(crisisBadge()?'<p class="up" style="text-align:center">🏅 '+tr("Survivant : ","Survivor: ")+crisisBadge().name+"</p>":"")+'<div class="specwrap"><div class="specimg" id="specimg"><span class="muted">'+tr("Préparation de la planche…","Preparing the plate…")+'</span></div><div class="specinfo">';
  h+='<div class="fosscard"><div class="kick">'+tr("Cousin fossile","Fossil cousin")+" · "+sp.match+tr(" % de ressemblance","% resemblance")+"</div><b>"+esc(c.name)+'</b> <span class="muted">'+ERAS[c.era]+" · −"+c.ma+" Ma</span><p>"+c.fact+"</p>"+(sp.inShow?'<p class="up">★ '+tr("En vitrine cette saison : ","On display this season: ")+fxList(c.eff).replace(/<\/?ul[^>]*>/g,"").replace(/<\/?li[^>]*>/g,"")+"</p>":'<p class="desc">'+tr("Pas en vitrine cette saison : faites évoluer votre espèce vers l’un des fossiles ci-dessous pour un petit bonus.","Not on display this season: evolve your species toward one of the fossils below for a small bonus.")+"</p>")+"</div>";
  h+='<h3>'+tr("Fossiles de la saison ","Fossils of season ")+seasonNo()+'</h3><div class="fossrow">'+sp.show.map(id=>{const f=FOS_BY[id],lock=f.era>Math.max(1,S.stage||1);return '<span class="fosspill'+(id===c.id?" on":"")+(lock?" lock":"")+'" title="'+esc(ERAS[f.era]+" · −"+f.ma+" Ma")+'">'+esc(f.name)+"<small>"+ERAS[f.era]+(lock?tr(" · plus tard"," · later"):"")+"</small></span>";}).join("")+"</div>";
  h+='<p class="desc">'+tr("Votre espèce ressemble au fossile le plus proche de vos choix (mutations, gènes, émergences). Les fossiles plus récents s’ouvrent quand vous changez de stade de vie.","Your species resembles the fossil closest to your choices (mutations, genes, emergences). More recent fossils open up as you change life stage.")+"</p>";
  h+='<div class="row"><button class="btn" data-act="specdl">'+tr("⬇ Télécharger l’image","⬇ Download the image")+"</button>"+(navigator.share?'<button class="btn alt" data-act="specshare">'+tr("Partager","Share")+"</button>":"")+'<button class="btn alt" data-act="speccopy">'+tr("Copier le texte","Copy the text")+"</button></div>";
  const M=museum();if(M.length)h+="<h3>🏛 "+tr("Muséum","Museum")+'</h3><div class="museum">'+M.slice(-8).reverse().map(e=>'<div class="musrow"><b>'+tr("Saison ","Season ")+e.season+"</b> <i>"+esc(e.name)+"</i> · "+esc(e.cousin)+" · "+e.rank+"/"+e.of+"</div>").join("")+"</div>";
  return h+'</div></div><div class="row" style="justify-content:center;margin-top:8px"><button class="btn alt" data-act="mclose">'+tr("Fermer","Close")+"</button></div>";
}
function speciesText(){const sp=speciesInfo(),rk=myRank("pow");return "🔬 *"+sp.name+"* · "+tr("Origins 27, saison ","Origins 27, season ")+seasonNo()+", "+tr("jour ","day ")+seasonDay()+"/"+SEASON_DAYS+"\n"+tr("Stade : ","Stage: ")+(LIFE[S.stage||1]||"")+" · "+tr("Rang ","Rank ")+rk+"/"+(S.bots.length+1)+" · "+tr("cousin fossile : ","fossil cousin: ")+sp.cousin.name+" ("+ERAS[sp.cousin.era]+", −"+sp.cousin.ma+" Ma)\n"+tr("Mutations : ","Mutations: ")+((S.muts||[]).map(id=>MUT_BY[id]&&MUT_BY[id].name).filter(Boolean).join(", ")||"—")+"\nhttps://shakeitout-teach.github.io/origins-27/";}
function cellCanvas(cb){rasterize(evoLayerSVG(),CELL_RES,CELL_RES,ev=>{const out=document.createElement("canvas");out.width=out.height=CELL_RES;const g=out.getContext("2d");g.imageSmoothingEnabled=false;cellBaseLayer(g);g.drawImage(ev,0,0);cellTopLayer(g);cb(out);});}
function wrapText(g,txt,x,y,maxW,lh){const words=String(txt).split(" ");let line="",n=0;for(const w of words){const t=line?line+" "+w:w;if(g.measureText(t).width>maxW&&line){g.fillText(line,x,y+n*lh);n++;line=w;}else line=t;}if(line){g.fillText(line,x,y+n*lh);n++;}return n;}
function speciesCard(cb){
  const go=()=>cellCanvas(cell=>{
    const W2=1080,H2=1350,cv=document.createElement("canvas");cv.width=W2;cv.height=H2;const g=cv.getContext("2d"),sp=speciesInfo(),INK="#1d2433",RED="#a8402c",MUT="#5a6273";
    g.fillStyle="#f3ecdc";g.fillRect(0,0,W2,H2);g.strokeStyle="rgba(29,36,51,.07)";g.lineWidth=1;for(let x=0;x<W2;x+=36){g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,H2);g.stroke();}for(let y=0;y<H2;y+=36){g.beginPath();g.moveTo(0,y+.5);g.lineTo(W2,y+.5);g.stroke();}
    g.fillStyle=INK;g.fillRect(46,46,W2-80,H2-80);g.fillStyle="#fbf7ec";g.fillRect(36,36,W2-80,H2-80);g.strokeStyle=INK;g.lineWidth=4;g.strokeRect(36,36,W2-80,H2-80);
    g.fillStyle=MUT;g.font='500 24px "IBM Plex Mono", monospace';g.textAlign="left";g.fillText((tr("SPÉCIMEN N° ","SPECIMEN NO. ")+seasonNo()+"-"+myRank("pow")+tr(" · PRÉLEVÉ À −"," · SAMPLED AT −")+fmt(depthM(S.px,S.py))+" M").toUpperCase(),76,96);
    g.textAlign="right";g.fillText(tr("JOUR ","DAY ")+seasonDay()+"/"+SEASON_DAYS,W2-76,96);
    const cx=W2/2,cy=420,R=285;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.fillStyle="#0b1a24";g.fill();g.lineWidth=6;g.strokeStyle=INK;g.stroke();
    g.save();g.beginPath();g.arc(cx,cy,R-4,0,Math.PI*2);g.clip();g.imageSmoothingEnabled=false;const sc=2.6,sz=CELL_RES*sc;g.drawImage(cell,cx-sz/2,cy-sz/2,sz,sz);g.restore();
    g.textAlign="center";g.fillStyle=INK;g.font='italic 84px "Instrument Serif", serif';g.fillText(sp.name,cx,800);
    g.fillStyle=MUT;g.font='30px "IBM Plex Sans", sans-serif';g.fillText(tr("Souche ","Strain ")+SOUCHES[S.souche].name+" · "+(LIFE[S.stage||1]||"")+" · "+tr("rang ","rank ")+myRank("pow")+" / "+(S.bots.length+1),cx,846);
    {const B=crisisBadge();if(B){const t=tr("SURVIVANT · ","SURVIVOR · ")+B.name.toUpperCase();g.font='600 22px "IBM Plex Mono", monospace';const w=g.measureText(t).width+36;g.fillStyle="#d9a441";g.fillRect(W2-76-w,120,w,40);g.strokeStyle=INK;g.lineWidth=3;g.strokeRect(W2-76-w,120,w,40);g.fillStyle=INK;g.textAlign="left";g.fillText(t,W2-76-w+18,148);g.textAlign="center";}}
    g.textAlign="left";let y=910;g.fillStyle=RED;g.font='500 22px "IBM Plex Mono", monospace';g.fillText(tr("COUSIN FOSSILE","FOSSIL COUSIN"),90,y);
    g.fillStyle=INK;g.font='italic 52px "Instrument Serif", serif';g.fillText(sp.cousin.name,90,y+52);g.fillStyle=MUT;g.font='26px "IBM Plex Sans", sans-serif';g.fillText(ERAS[sp.cousin.era]+" · −"+sp.cousin.ma+" Ma · "+sp.match+tr(" % de ressemblance","% resemblance"),90,y+92);
    g.fillStyle=INK;g.font='26px "IBM Plex Sans", sans-serif';const n=wrapText(g,sp.cousin.fact,90,y+134,W2-180,34);
    y=y+134+n*34+18;const ms=(S.muts||[]).map(id=>MUT_BY[id]).filter(Boolean);
    if(ms.length&&y<H2-170){g.font='600 22px "IBM Plex Sans", sans-serif';let x=90;for(const m of ms){const w=g.measureText(m.name).width+28;if(x+w>W2-90){x=90;y+=44;}if(y>H2-150)break;g.fillStyle=MUT_TAG[m.tag].col;g.fillRect(x,y,w,34);g.strokeStyle=INK;g.lineWidth=2;g.strokeRect(x,y,w,34);g.fillStyle=INK;g.fillText(m.name,x+14,y+24);x+=w+10;}}
    g.fillStyle=INK;g.fillRect(76,H2-118,W2-152,2);g.font='italic 40px "Instrument Serif", serif';g.fillStyle=INK;g.fillText("Origins ",76,H2-70);const w0=g.measureText("Origins ").width;g.fillStyle=RED;g.fillText("27",76+w0,H2-70);
    g.textAlign="right";g.fillStyle=MUT;g.font='500 22px "IBM Plex Mono", monospace';g.fillText("shakeitout-teach.github.io/origins-27",W2-76,H2-76);
    cb(cv);});
  if(document.fonts&&document.fonts.load)Promise.all(['italic 84px "Instrument Serif"','30px "IBM Plex Sans"','500 22px "IBM Plex Mono"'].map(f=>document.fonts.load(f).catch(()=>0))).then(go,go);else go();
}
function speciesShow(){showModal(speciesHTML());speciesCard(cv=>{const box=document.getElementById("specimg");if(!box)return;box.innerHTML="";const im=new Image();im.alt=tr("Planche de votre espèce","Plate of your species");im.src=cv.toDataURL("image/png");box.appendChild(im);});}
function speciesFile(cb){speciesCard(cv=>cv.toBlob(b=>cb(b,"origins27-"+speciesInfo().name.replace(/\s+/g,"-").toLowerCase()+".png"),"image/png"));}
function copyText(t,ok){const done=()=>toast(ok||tr("Copié","Copied")),fb=()=>{let r=false;try{const ta=document.createElement("textarea");ta.value=t;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;left:-9999px;opacity:0";document.body.appendChild(ta);ta.select();r=document.execCommand("copy");ta.remove();}catch(e){r=false;}if(r)done();else toast(tr("Copie impossible sur ce navigateur","Copying is not possible in this browser"));};try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}catch(e){fb();}}

/* ===== Gazette du serveur ===== */
function gazetteData(){
  const d=dayIdx(S.t),t0=d*1440,rows=rkRows("pow"),top=rows.slice(0,3),al=rkRows("ally"),rk=myRank("pow"),L=leagueOf(rk);
  const news=S.log.filter(l=>l.t>=t0&&l.msg.indexOf("📣")===0).map(l=>l.msg.slice(2).trim());
  const raider=S.bots.slice().sort((a,b)=>(b.lw||0)-(a.lw||0))[0];
  const mine=S.reports.filter(r=>r.cat==="combat"&&r.t!=null?r.t>=t0:false),wins=mine.filter(r=>r.win===true).length,loss=mine.filter(r=>r.win===false).length;
  const show=seasonShowcase(),fos=FOS_BY[show[d%show.length]];
  return {d:d+1,top,al:al[0],rk,L,news,raider,wins,loss,fos,left:Math.ceil(seasonLeft()/1440)};
}
function gzName(r){return r.me?tr("Vous","You"):esc((r.b.tag?r.b.tag+" ":"")+r.b.name);}
function gazetteHTML(){
  const G=gazetteData();
  let h='<div class="card gazette"><div class="kick">'+tr("Gazette du serveur · saison ","Server gazette · season ")+seasonNo()+" · "+tr("jour ","day ")+G.d+"/"+SEASON_DAYS+"</div>";
  h+="<h2>"+(G.news.length?esc(G.news[0]):tr("Calme plat dans les abysses","Dead calm in the abyss"))+"</h2>";
  h+='<p class="desc">'+(G.left>0?tr("Fin de la saison dans ","Season ends in ")+G.left+tr(" jour"+(G.left>1?"s":"")," day"+(G.left>1?"s":""))+".":tr("La saison est terminée : prolongation.","The season is over: extra time."))+"</p>";
  h+=crisisGazette();
  h+='<div class="gzcols"><div><h3>'+tr("Les plus puissants","The most powerful")+"</h3><ol>"+G.top.map(r=>"<li>"+gzName(r)+' <span class="muted">'+fmt(r.v)+"</span></li>").join("")+"</ol></div>";
  h+="<div><h3>"+tr("Alliance en tête","Leading alliance")+"</h3><p><b>"+esc(G.al?G.al.n:"—")+"</b>"+(G.al?' <span class="muted">'+G.al.m+tr(" membres"," members")+"</span>":"")+"</p><h3>"+tr("Pillard le plus redouté","Most feared raider")+"</h3><p><b>"+esc(G.raider?G.raider.name:"—")+"</b>"+(G.raider?' <span class="muted">'+fmt(G.raider.lw||0)+tr(" pillés"," raided")+"</span>":"")+"</p></div></div>";
  h+="<h3>"+tr("Votre journée","Your day")+"</h3><p>"+tr("Rang ","Rank ")+"<b>"+G.rk+"</b> · "+G.L[1]+" "+G.L[2]+" · "+G.wins+tr(" victoire"+(G.wins>1?"s":"")," win"+(G.wins>1?"s":""))+", "+G.loss+tr(" défaite"+(G.loss>1?"s":"")," loss"+(G.loss>1?"es":""))+".</p>";
  if(G.news.length>1)h+="<h3>"+tr("Brèves","In brief")+'</h3><ul class="gznews">'+G.news.slice(1,6).map(n=>"<li>"+esc(n)+"</li>").join("")+"</ul>";
  h+='<div class="fosscard"><div class="kick">'+tr("Le fossile du jour","Fossil of the day")+"</div><b>"+esc(G.fos.name)+'</b> <span class="muted">'+ERAS[G.fos.era]+" · −"+G.fos.ma+" Ma</span><p>"+G.fos.fact+"</p></div>";
  h+='<div class="row"><button class="btn sm" data-act="gazcopy">'+tr("Copier pour Discord","Copy for Discord")+"</button>"+(typeof DISCORD_URL!=="undefined"&&DISCORD_URL?'<button class="btn sm alt" data-act="discord">'+tr("Ouvrir le Discord","Open the Discord")+"</button>":"")+"</div></div>";
  return h;
}
function gazetteText(){const G=gazetteData(),nm=r=>r.me?tr("(vous)","(you)"):(r.b.tag?r.b.tag+" ":"")+r.b.name;
  return "📰 **"+tr("Gazette d’Origins 27","Origins 27 Gazette")+"** · "+tr("saison ","season ")+seasonNo()+", "+tr("jour ","day ")+G.d+"/"+SEASON_DAYS+"\n"+(G.news.length?"> "+G.news[0]+"\n":"")+"🏆 "+G.top.map((r,i)=>(i+1)+". "+nm(r)).join(" · ")+"\n🤝 "+tr("Alliance en tête : ","Leading alliance: ")+(G.al?G.al.n:"—")+"\n🦴 "+tr("Fossile du jour : ","Fossil of the day: ")+G.fos.name+" ("+ERAS[G.fos.era]+", −"+G.fos.ma+" Ma) : "+G.fos.fact+"\n"+tr("Mon rang : ","My rank: ")+G.rk+" · "+speciesInfo().name;}

/* ===== Actions ===== */
function seasonAct(a,el){
  if(!S)return false;
  if((a==="raid"||a==="raidgo")&&!seasonAct.brk){const k=brkNeeded();if(k){showModal(brkHTML(k,a));return true;}}
  if(a==="raidbrk"){dormBreak();closeModal();seasonAct.brk=1;try{act(el.dataset.k==="raidgo"?"raidgo":"raid",el);}finally{seasonAct.brk=0;}return true;}
  if(a==="crisis"){const C=CRISES[crisisType()];showModal('<div class="kick">'+C.ic+" "+tr("Grande crise","Great crisis")+"</div><h2>"+C.name+"</h2>"+crisisInfoHTML(crisisPhase()==="warn")+'<div class="row" style="justify-content:center"><button class="btn alt" data-act="mclose">'+tr("Fermer","Close")+"</button></div>");return true;}
  if(a==="species"&&el&&el.closest&&el.closest(".pop")&&S.popups.length)S.popups.shift();
  if(a==="species"){speciesShow();return true;}
  if(a==="specdl"){speciesFile((b,n)=>{const u=URL.createObjectURL(b),x=document.createElement("a");x.href=u;x.download=n;document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast(tr("Image enregistrée","Image saved"));});return true;}
  if(a==="specshare"){speciesFile((b,n)=>{const f=new File([b],n,{type:"image/png"}),d={title:"Origins 27",text:speciesText()};if(navigator.canShare&&navigator.canShare({files:[f]}))d.files=[f];navigator.share(d).catch(()=>{});});return true;}
  if(a==="speccopy"){copyText(speciesText(),tr("Texte copié : collez-le sur Discord","Text copied: paste it on Discord"));return true;}
  if(a==="gazcopy"){copyText(gazetteText(),tr("Gazette copiée : collez-la sur Discord","Gazette copied: paste it on Discord"));return true;}
  if(a==="rfx"){rfxToggle(el.dataset.k);showModal(optHTML());return true;}
  if(a==="newseason"){if(Date.now()<(seasonAct.arm||0)){seasonAct.arm=0;closeModal();S=null;try{localStorage.removeItem(SAVE_KEY);}catch(e){}showTitle();}else{seasonAct.arm=Date.now()+4000;el.textContent=tr("Confirmer : nouvelle carte","Confirm: new map");}return true;}
  return false;
}
