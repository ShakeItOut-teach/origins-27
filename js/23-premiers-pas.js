/* Origins 27 · 23-premiers-pas.js
   Premiers pas : le parcours guidé d’une nouvelle partie.
   Troupes → récolte dans les abysses → bilan → chasse d’un organisme neutre → héros → pillage d’entraînement → rapports → objectifs.
   Les onglets s’ouvrent au fil du guide, le temps de production et de trajet est accéléré tant qu’il dure,
   et les rivaux n’attaquent pas. S.tut : numéro de l’étape, null quand le guide est fini (ou pour une ancienne partie).
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
function tutFast(){return !!S&&S.tut!=null;}
function tutI(id){return TUT.findIndex(s=>s.id===id);}
function tutTabOk(t){if(!S||S.tut==null)return true;if(t==="cell"||t==="hero")return true;if(t==="map")return S.tut>=tutI("maptab");if(t==="act")return S.tut>=tutI("reptab");return false;}
function tutGot(kind,k,v){const g=S.tutGain=S.tutGain||{},key=kind==="hunt"?"hunt":"farm";g[key]=g[key]||{};g[key][k]=(g[key][k]||0)+v;}
const RES_SHORT=()=>({atp:"ATP",prot:tr("prot.","prot."),lip:tr("lip.","lip."),nuc:tr("nucl.","nucl.")});
function tutResRows(o){const ks=RES.filter(k=>o&&o[k]>0);if(!ks.length)return "";return '<div class="tutres">'+ks.map(k=>'<div><span class="k">'+sprImg("r_"+k,1)+RES_NAME[k]+'</span><b class="up">+'+fmt(o[k])+"</b></div>").join("")+"</div>";}
function tutRow(lbl,a,b){const up=b!==a;return '<div class="stat"><span>'+lbl+"</span><b>"+a+(up?' → <span class="up">'+b+"</span>":"")+"</b></div>";}
function tutNet(){const r=rates(),u=upkeep();return RES.map(k=>{const n=r[k]-u[k];return '<span class="'+(n<0?"neg":"")+'">'+(n<0?"−":"+")+fmt(Math.abs(n))+" "+RES_SHORT()[k]+"</span>";}).join(" · ")+tr(" par heure"," per hour");}
function tutHeroSnap(){const H=S.hero;return {lvl:H.lvl,xp:H.xp,base:heroBase(),tp:Object.assign({},H.tp),fights:H.fights};}
function tutHeroRows(h0){const H=S.hero;let h=tutRow(tr("Niveau","Level"),h0.lvl,H.lvl)+tutRow(tr("Expérience","Experience"),fmt(h0.xp)+" XP",fmt(H.xp)+" / "+fmt(xpNeed(H.lvl))+" XP")+tutRow(tr("Force de base au combat","Base combat strength"),h0.base,heroBase());
  Object.keys(TRAITS).forEach(k=>{const a=h0.tp[k]||0,b=H.tp[k]||0;if(b>a)h+=tutRow(tr("Trait ","Trait ")+TRAITS[k].name,dec(Math.round(a*10)/10),dec(Math.round(b*10)/10)+tr(" (niveau "," (level ")+traitLevel(k)+")");});
  return h;}

function tutHuntEnter(){
  if(!S.tutWild&&!S.tutHuntDone)placeTutWild();S.qs6=1;
  if(!S.tutWild){S.tutHuntDone=1;return;}
  const x=S.tutWild[0],y=S.tutWild[1];S.tiles[y*W+x].s=1;
  tab="map";openRef="tile:"+x+":"+y;cam={x:x+0.5,y:y+0.5};camClamp();
  S.heroWith=true;S.selN=Math.max(1,Math.min(S.idle,4));enInit();S.en=Math.max(S.en,EN_COST.hunt||1);
  S.tutH0=tutHeroSnap();dirty=true;}
/* Pillage d’entraînement : un vrai rapport, un vrai gain du héros, sans pertes ni trajet */
function fakeRaid(){
  const type=TYPE_ORDER[Math.floor(Math.random()*5)],u0=Object.assign({},S.army),n=uSum(u0),hp=heroPower(type),pw=compAtk(u0,type)+hp;
  const def=Math.max(30,Math.min(90,Math.round(pw*0.55))),lf=lossFrac(pw,def),lost=Math.min(u0.coll||0,Math.round(n*lf)),lostBy=lost?{coll:lost}:{};
  const stock=900,prot=300,avail=stock-prot,carry=Math.round(compCarry(u0)*2+hp),take=Math.min(carry,avail);
  const cargo={prot:Math.round(take*0.3),lip:Math.round(take*0.3),atp:Math.round(take*0.25),nuc:Math.round(take*0.15)},cap=rates().cap,got={};
  S.tutP0=tutHeroSnap();
  for(const k in cargo){const b=S.res[k];S.res[k]=Math.max(b,Math.min(cap,b+cargo[k]));got[k]=Math.round(S.res[k]-b);if(got[k])stat("lootIn",k,got[k]);}
  const name=tr("Souche-miroir","Mirror strain");
  const lines=['<span class="up">'+tr("Pillage réussi","Successful raid")+"</span>"+tr(" chez "," on ")+name+tr(" (rival d’entraînement, voie "," (training rival, path ")+TYPES[type].name+tr("). Le défenseur ne perd aucune troupe.","). The defender loses no troops."),fightTable(u0,lostBy,type,hp,pw,def,true,tr("Défense","Defense"))];
  lines.push(tr("<b>Butin</b> · son stock ","<b>Loot</b> · its stock ")+fmt(stock)+tr(", dont ",", of which ")+fmt(prot)+tr(" à l’abri dans sa vacuole · pillable "," safe in its vacuole · raidable ")+fmt(avail)+tr(" · vos troupes peuvent porter "," · your troops can carry ")+fmt(carry)+".");
  lines.push(lootTable(RES.map(k=>[k,cargo[k]]),carry<avail?tr("Limité par votre capacité de transport : plus de troupes rapportent davantage.","Limited by your carrying capacity: more troops bring back more."):tr("Vous avez vidé tout ce qui était pillable.","You emptied everything that could be raided.")));
  if(lost)lines.push('<span class="up">'+(EN?"Training: your "+lost+" losses are refunded.":"Entraînement : vos "+lost+" pertes sont remboursées.")+"</span>");
  lines.push(heroGain({def,type},true,true));
  lines.push("💬 "+name+" : "+tr("Bien joué… la prochaine fois, ce sera pour de vrai 😏","Well played… next time it’s for real 😏"));
  report("combat",tr("Pillage d’entraînement · ","Training raid · ")+name,lines,true);
  log(tr("Pillage d’entraînement réussi chez la ","Successful training raid on the ")+name+".","good");
  S.tutRaid={pw:Math.round(pw),def,lost,n,got};
}
function tutGoals(){const out=[];for(let i=S.q;i<QUESTS.length&&out.length<3;i++){if(!QUESTS[i].done())out.push(QUESTS[i]);}return out;}
function tutEnd(){S.tut=null;S.tourDone=true;S.newTab="evo";tutKey=null;openRef=null;tab="cell";questTick();toast(tr("Tout est ouvert : bonne évolution !","Everything is open: happy evolving!"));dirty=true;save();}

const TUT=[
  {id:"hello",card:1,btn:()=>tr("C’est parti","Let’s go"),t:()=>tr("Bienvenue, souche ","Welcome, strain ")+SOUCHES[S.souche].name,
    d:()=>"<p>"+tr("Vous êtes une cellule seule, au bord d’un océan obscur. 499 autres organismes convoitent la même place que vous.","You are a lone cell at the edge of a dark ocean. 499 other organisms covet the same place as you.")+"</p><p>"+tr("Pour survivre, il vous faut des bras : des <b>collectrices</b>. Ce guide vous montre l’essentiel en quelques minutes, avec un temps accéléré. Le reste du jeu s’ouvrira ensuite.","To survive, you need hands: <b>gatherers</b>. This guide shows you the essentials in a few minutes, with sped-up time. The rest of the game opens afterwards.")+"</p>"},
  {id:"armytab",sel:'nav [data-t="hero"]',block:1,t:()=>tr("Vos troupes","Your troops"),d:()=>"<p>"+tr("Ouvrez l’onglet <b>Armée</b> : c’est là que naissent vos troupes.","Open the <b>Army</b> tab: that is where your troops are born.")+"</p>",done:()=>tab==="hero"},
  {id:"make",sel:'[data-act="cell"][data-k="coll"][data-n="5"]',block:1,scroll:1,t:()=>tr("Produisez 5 collectrices","Produce 5 gatherers"),
    d:()=>"<p>"+tr("Vos ribosomes fabriquent les troupes. Une collectrice coûte 30 protéines et 20 ATP : elle récolte, explore et se bat un peu. Touchez <b>×5</b>.","Your ribosomes build the troops. A gatherer costs 30 proteins and 20 ATP: it gathers, explores and fights a little. Tap <b>×5</b>.")+"</p>",done:()=>S.queue.length>0},
  {id:"prod",float:1,t:()=>tr("Production en cours","Production under way"),
    d:()=>"<p>"+tr("Les ribosomes assemblent vos collectrices une à une. D’habitude, chacune prend plusieurs minutes ; pendant ce guide, c’est accéléré.","The ribosomes assemble your gatherers one by one. Normally each takes several minutes; during this guide it is sped up.")+' <b><span data-end="'+queueEnd()+'"></span></b></p>',done:()=>!S.queue.length},
  {id:"maptab",sel:'nav [data-t="map"]',block:1,enter:()=>{S.newTab="map";},t:()=>tr("Les abysses s’ouvrent","The abyss opens up"),
    d:()=>"<p>"+tr("Vos collectrices sont prêtes. Votre cellule, elle, ne bouge pas : ce sont vos troupes qui sortent chercher des ressources dans les abysses autour de vous. Ouvrez la carte.","Your gatherers are ready. Your cell doesn’t move: your troops go out to find resources in the abyss around you. Open the map.")+"</p>",done:()=>tab==="map"},
  {id:"auto",sel:".mapctl .auto",block:1,enter:()=>{S.tutGain={};enInit();S.en=Math.max(S.en,4);},t:()=>tr("Envoyez-les récolter","Send them harvesting"),
    d:()=>"<p>"+tr("Touchez <b>⛏</b> : vos collectrices libres partent d’un coup vers les gisements proches, ou explorent les cases voilées. Plus tard, vous pourrez aussi toucher une case pour choisir vous-même.","Tap <b>⛏</b>: your free gatherers leave at once for nearby deposits, or explore veiled tiles. Later you can also tap a tile to choose yourself.")+"</p>",done:()=>!!S.sentOnce},
  {id:"travel",float:1,t:()=>tr("En route","On the way"),
    d:()=>"<p>"+tr("Suivez vos collectrices sur la carte. Chacune porte 20 unités ; au retour, une part est digérée en ATP pour payer leur entretien. Retour dans quelques secondes.","Follow your gatherers on the map. Each carries 20 units; on return, part is digested into ATP to pay their upkeep. Back in a few seconds.")+"</p>",done:()=>!S.missions.some(M=>M.kind==="collect")},
  {id:"harvest",card:1,kick:()=>tr("Bilan","Summary"),btn:()=>tr("Continuer","Continue"),t:()=>tr("Bilan de la récolte","Harvest summary"),
    d:()=>{const g=(S.tutGain||{}).farm;return (g?"<p>"+tr("Vos collectrices ont rapporté :","Your gatherers brought back:")+"</p>"+tutResRows(g):"<p>"+tr("Vos collectrices ont surtout exploré : la carte s’est éclaircie autour de vous.","Your gatherers mostly explored: the map has cleared around you.")+"</p>")+
      "<p>"+tr("<b>Vos deux revenus</b> : les 4 canaux de la membrane produisent en continu, et vos collectrices rapportent ce qu’elles trouvent dans les abysses. Chaque troupe consomme un peu chaque heure : gardez une production positive.","<b>Your two incomes</b>: the 4 membrane channels produce continuously, and your gatherers bring back what they find in the abyss. Each troop consumes a little every hour: keep your production positive.")+'</p><p class="desc">'+tr("Production nette : ","Net production: ")+tutNet()+"</p><p>"+tr("<b>Prochaine étape : la chasse.</b> Un organisme sauvage affaibli vient d’apparaître près de vous.","<b>Next step: hunting.</b> A weakened wild organism has just appeared near you.")+"</p>";}},
  {id:"hunt",sel:'#detail [data-act="hunt"]',block:1,enter:tutHuntEnter,keep:()=>{if(S.tutWild){const r="tile:"+S.tutWild[0]+":"+S.tutWild[1];if(tab!=="map"||openRef!==r){tab="map";openRef=r;dirty=true;}}},t:()=>tr("Chassez un organisme sauvage","Hunt a wild organism"),
    d:()=>"<p>"+tr("Les organismes sauvages sont <b>neutres</b> : ils ne vous attaquent jamais, mais on les chasse pour leur biomasse. Votre <b>héros</b> part avec vos troupes : il ajoute sa force et progresse à chaque combat.","Wild organisms are <b>neutral</b>: they never attack you, but you hunt them for their biomass. Your <b>hero</b> goes with your troops: it adds its strength and improves with every fight.")+"</p><p>"+tr("Touchez <b>Chasser</b>.","Tap <b>Hunt</b>.")+"</p>",done:()=>S.missions.some(M=>M.kind==="hunt")||!!S.tutHuntDone},
  {id:"hunting",float:1,t:()=>tr("Chasse en cours","Hunt under way"),d:()=>"<p>"+tr("Vos troupes et votre héros foncent sur la proie. Le combat se règle à l’arrivée : votre force contre sa robustesse.","Your troops and hero rush at the prey. The fight is settled on arrival: your strength against its toughness.")+"</p>",done:()=>!!S.tutHuntDone&&!S.missions.some(M=>M.kind==="hunt")},
  {id:"huntsum",card:1,kick:()=>tr("Bilan","Summary"),btn:()=>tr("Voir mon héros","See my hero"),next:()=>{tab="hero";openRef=null;},t:()=>tr("Bilan de la chasse","Hunt summary"),
    d:()=>{const g=(S.tutGain||{}).hunt;return (g?"<p>"+tr("<b>Ressources</b> : la proie dévorée vous rapporte","<b>Resources</b>: the devoured prey brings you")+"</p>"+tutResRows(g):"")+"<p><b>"+tr("Votre héros","Your hero")+"</b></p>"+(S.tutH0?tutHeroRows(S.tutH0):"")+
      "<p>"+tr("<b>Son rôle</b> : il accompagne vos chasses et vos pillages et ajoute sa force à celle des troupes. Il ne meurt jamais. Chaque proie renforce un trait (venin, carapace…) ; dès le niveau 3, ses deux traits dominants lui donnent une forme, avec ses forces et ses faiblesses.","<b>Its role</b>: it joins your hunts and raids and adds its strength to your troops. It never dies. Each prey strengthens a trait (venom, shell…); from level 3, its two dominant traits give it a form, with strengths and weaknesses.")+'</p><p class="desc">'+tr("Contre un organisme sauvage, il ne gagne qu’un dixième de l’expérience d’un combat contre un autre joueur.","Against a wild organism, it gains only a tenth of the experience of a fight against another player.")+"</p>";}},
  {id:"hero",sel:".herocard",scroll:"start",tab:"hero",btn:()=>tr("Suivant","Next"),t:()=>tr("La fiche du héros","The hero sheet"),d:()=>"<p>"+tr("Son niveau, son expérience et ses traits. Décochez « L’emmener dans mes chasses » si vous voulez le garder à la maison pour défendre.","Its level, experience and traits. Untick “Bring it on my hunts” to keep it home to defend.")+"</p>"},
  {id:"pvp",card:1,kick:()=>tr("Les rivaux","Rivals"),btn:()=>tr("Lancer le pillage d’entraînement","Start the training raid"),next:fakeRaid,t:()=>tr("Les autres joueurs : pillez, défendez-vous","Other players: raid, defend yourself"),
    d:()=>"<p>"+tr("Les 499 autres organismes sont des rivaux, comme vous. Eux ne sont pas neutres : on les <b>pille</b>… et ils vous pillent.","The 499 other organisms are rivals, like you. They are not neutral: you <b>raid</b> them… and they raid you.")+'</p><ul class="tutlist"><li>'+
      tr("Un pillage réussi emporte les ressources de son entrepôt, sauf la part à l’abri dans sa vacuole.","A successful raid takes the resources in its storage, except the share safe in its vacuole.")+"</li><li>"+
      tr("Le défenseur ne perd aucune troupe ; l’attaquant en perd d’autant plus que le combat est serré.","The defender loses no troops; the attacker loses more the closer the fight.")+"</li><li>"+
      tr("Votre héros y gagne dix fois plus d’expérience qu’à la chasse.","Your hero gains ten times more experience than from hunting.")+"</li><li>"+
      tr("Un rival pillé devient rancunier et peut riposter. Après un pillage subi, vous êtes protégé 1 h ; la nuit (minuit à 7 h), personne n’attaque.","A raided rival holds a grudge and may strike back. After being raided you are protected for 1 h; at night (midnight to 7 am) nobody attacks.")+"</li></ul><p>"+
      tr("Essayons sans risque : un pillage d’entraînement contre une souche-miroir.","Let’s try it risk-free: a training raid against a mirror strain.")+"</p>"},
  {id:"pvpsum",card:1,kick:()=>tr("Rapport","Report"),btn:()=>tr("Ouvrir les rapports","Open the reports"),t:()=>tr("Pillage réussi","Successful raid"),
    d:()=>{const R=S.tutRaid||{};return '<div class="fbar"><i style="width:'+Math.round(R.pw/(R.pw+R.def)*100)+'%"></i><span>'+tr("Vous ","You ")+fmt(R.pw||0)+"</span><span>"+tr("Défense ","Defense ")+fmt(R.def||0)+"</span></div>"+
      tutRow(tr("Pertes","Losses"),(R.lost||0)+" / "+(R.n||0)+(R.lost?tr(" (remboursées)"," (refunded)"):""),(R.lost||0)+" / "+(R.n||0)+(R.lost?tr(" (remboursées)"," (refunded)"):""))+
      "<p><b>"+tr("Butin pillé","Raided loot")+"</b></p>"+tutResRows(R.got)+"<p><b>"+tr("Votre héros (combat entre joueurs : expérience complète)","Your hero (player combat: full experience)")+"</b></p>"+(S.tutP0?tutHeroRows(S.tutP0):"")+
      '<p class="desc">'+tr("Dans une vraie partie, le butin arrive avec vos troupes à leur retour, et la cible peut se venger. Tout est noté dans vos rapports.","In a real game, the loot arrives with your troops when they return, and the target may take revenge. Everything is recorded in your reports.")+"</p>";}},
  {id:"reptab",sel:'nav [data-t="act"]',block:1,enter:()=>{S.newTab="act";},after:()=>{actSub="combat";},t:()=>tr("Vos rapports","Your reports"),
    d:()=>"<p>"+tr("Chaque combat, chaque récolte et chaque pillage subi arrive ici, comme un courrier : la pastille rouge compte les rapports non lus. Ouvrez les rapports.","Every fight, every harvest and every raid you suffer arrives here, like mail: the red badge counts unread reports. Open the reports.")+"</p>",done:()=>tab==="act"},
  {id:"report",sel:"#viewarea .rep",tab:"act",enter:()=>{actSub="combat";},btn:()=>tr("Suivant","Next"),t:()=>tr("Le rapport de combat","The combat report"),
    d:()=>"<p>"+tr("Forces en présence, pertes, butin, gain du héros : tout y est. Les sous-onglets séparent les troupes en route, les combats, les récoltes, le classement et le journal.","Forces on each side, losses, loot, hero gain: it’s all there. The sub-tabs separate troops on the way, fights, harvests, ranking and the log.")+"</p>"},
  {id:"final",card:1,kick:()=>tr("Premiers pas terminés","First steps complete"),btn:()=>tr("Jouer !","Play!"),next:tutEnd,t:()=>tr("À vous de jouer","Over to you"),
    d:()=>"<h3>"+tr("Vos prochains objectifs","Your next goals")+'</h3><ol class="tutlist">'+tutGoals().map(Q=>"<li>"+Q.t+' <em class="up">'+rwText(Q.rw)+"</em></li>").join("")+"</ol>"+
      '<p class="desc">'+tr("La quête du moment s’affiche toujours en haut de l’écran : touchez-la, le jeu vous emmène au bon endroit.","The current quest always shows at the top of the screen: tap it and the game takes you to the right place.")+"</p>"+
      "<h3>"+tr("Encore à découvrir","Still to discover")+'</h3><ul class="tutdisc">'+[
        ["🧬",tr("<b>Évolution</b> (nouvel onglet) : gènes, mutations, émergences cachées, jusqu’à l’Endosymbiose.","<b>Evolution</b> (new tab): genes, mutations, hidden emergences, up to Endosymbiosis.")],
        ["🏗",tr("<b>Construire</b> : canaux de la membrane, noyau et organites de la cellule.","<b>Building</b>: membrane channels, nucleus and the cell’s organelles.")],
        ["🔬",tr("<b>Recherche militaire</b> (Armée) : des rangs T2 à T5 et de nouvelles troupes.","<b>Military research</b> (Army): ranks T2 to T5 and new troops.")],
        ["🌿",tr("<b>Filaments</b> : reliez un gisement pour qu’il vous nourrisse en continu.","<b>Filaments</b>: link a deposit so it feeds you continuously.")],
        ["👁",tr("<b>Espionnage</b> : connaître la défense d’un rival avant de le piller.","<b>Spying</b>: learn a rival’s defense before raiding it.")],
        ["🧭",tr("<b>Migration</b> : remonter vers le centre, plus lumineux… et plus disputé.","<b>Migration</b>: rise toward the center, brighter… and more contested.")],
        ["🎁",tr("<b>Coffres et récompenses</b> : un coffre gratuit toutes les 4 heures, des quêtes du jour.","<b>Chests and rewards</b>: a free chest every 4 hours, daily quests.")],
        ["🏆",tr("<b>Classement, ligues et alliances.</b>","<b>Ranking, leagues and alliances.</b>")],
        ["🦖",tr("<b>L’APEX</b> : sortir de l’eau avant la fin des 30 jours.","<b>The APEX</b>: leave the water before the 30 days are up.")]
      ].map(x=>"<li><span>"+x[0]+"</span><span>"+x[1]+"</span></li>").join("")+"</ul>"}
];

function tutStep(){return S&&S.tut!=null?TUT[S.tut]||null:null;}
function tutGo(i){if(i>=TUT.length){tutEnd();return;}S.tut=i;tutKey=null;tutScrolled=false;const st=TUT[i];if(st.enter)st.enter();if(st.tab&&tab!==st.tab){tab=st.tab;openRef=null;}dirty=true;save();}
function tutNext(){const st=tutStep();if(!st)return;if(st.next)st.next();if(S.tut==null)return;tutGo(S.tut+1);}
function tutSkip(){if(!S||S.tut==null)return;const f=tutI("final");if(S.tut===f){tutEnd();return;}tutGo(f);}
function tutStripHTML(){const st=tutStep();let h='<span class="tutpill">🎓 '+tr("Premiers pas","First steps")+" <b>"+(S.tut+1)+" / "+TUT.length+"</b>"+(st?" · "+st.t():"")+"</span>";
  if(S.queue.length)h+="<span>"+tr("Production : ","Production: ")+S.queue.length+' · <span data-end="'+queueEnd()+'"></span></span>';
  return h+'<span data-act="tab" data-t="hero">'+sprImg("u_coll",1)+tr(" Troupes "," Troops ")+"<b>"+S.idle+tr(" libres / "," free / ")+cellCount()+"</b></span>";}
function tutHTML(st){
  const kick=(st.kick?st.kick():tr("Premiers pas","First steps"))+" · "+(S.tut+1)+" / "+TUT.length;
  return '<div class="cm"></div><div class="cm"></div><div class="cm"></div><div class="cm"></div><div class="cring"></div><div class="carr"><svg viewBox="0 0 24 24"><path d="M12 22 L3 11 H9 V2 H15 V11 H21 Z"/></svg></div>'+
    '<div class="cbub" role="dialog" aria-live="polite"><div class="kick">'+kick+"</div><h2>"+st.t()+"</h2>"+st.d()+'<div class="row cbtn">'+
    (st.id==="final"?"<span></span>":'<button class="ghost sm" data-act="tutskip">'+tr("Passer le guide","Skip the guide")+"</button>")+(st.btn?'<button class="btn" data-act="tutnext">'+st.btn()+"</button>":"")+"</div></div>";}
let tutKey=null,tutScrolled=false;
function tutBox(){let b=document.getElementById("coach");if(!b){b=document.createElement("div");b.id="coach";document.body.appendChild(b);}return b;}
function tutHide(b){if(b.className||b.innerHTML){b.className="";b.innerHTML="";}tutKey=null;}
function tutTick(){
  const box=tutBox();
  if(!S){tutHide(box);return;}
  if(S.newTab&&tab===S.newTab){S.newTab=null;dirty=true;}
  const st=tutStep();if(!st){tutHide(box);return;}
  if(st.keep)st.keep();
  if(st.done&&st.done()){if(st.after)st.after();tutGo(S.tut+1);return;}
  const md=$("modal");
  if(document.getElementById("fbk")||$("picker").children.length||(md&&md.classList.contains("on"))||document.getElementById("chestfx")){tutHide(box);return;}
  const key=S.tut+(EN?"e":"f");
  if(key!==tutKey){box.innerHTML=tutHTML(st);tutKey=key;pxify(box);}
  let el=st.sel?document.querySelector(st.sel):null;
  if(el&&st.scroll&&!tutScrolled){el.scrollIntoView({block:st.scroll==="start"?"start":"center"});tutScrolled=true;}
  const vw=window.innerWidth,vh=window.innerHeight;
  let r=el?el.getBoundingClientRect():null;if(r&&(r.width<1||r.height<1||r.bottom<4||r.top>vh-4))r=null;
  const mode=st.card||(st.block&&!r)?"card":r?"point":"float";
  box.className="on c-"+mode+(st.block||st.card?" c-block":"");
  const cm=box.querySelectorAll(".cm"),ring=box.querySelector(".cring"),arr=box.querySelector(".carr"),bub=box.querySelector(".cbub");
  const S2=(e,o)=>{for(const k in o)e.style[k]=o[k];};
  if(mode==="point"){const p=6,L=Math.max(0,r.left-p),T=Math.max(0,r.top-p),R=Math.min(vw,r.right+p),B=Math.min(vh,r.bottom+p);
    if(st.block){S2(cm[0],{left:"0",top:"0",width:vw+"px",height:T+"px"});S2(cm[1],{left:"0",top:T+"px",width:L+"px",height:(B-T)+"px"});S2(cm[2],{left:R+"px",top:T+"px",width:(vw-R)+"px",height:(B-T)+"px"});S2(cm[3],{left:"0",top:B+"px",width:vw+"px",height:(vh-B)+"px"});}
    S2(ring,{left:L+"px",top:T+"px",width:(R-L)+"px",height:(B-T)+"px"});
    const bw=Math.min(340,vw-16),bh=bub.offsetHeight,cx=(L+R)/2,left=Math.max(8,Math.min(vw-bw-8,cx-bw/2));bub.style.width=bw+"px";bub.style.left=left+"px";
    let below=B+50+bh<=vh-8,above=T-50-bh>=8;
    if(below){bub.style.top=(B+46)+"px";S2(arr,{display:"block",left:(cx-18)+"px",top:(B+4)+"px",transform:"rotate(180deg)"});}
    else if(above){bub.style.top=(T-46-bh)+"px";S2(arr,{display:"block",left:(cx-18)+"px",top:(T-42)+"px",transform:"none"});}
    else{bub.style.top=Math.max(8,vh-bh-12)+"px";arr.style.display="none";}}
  else if(mode==="float"){const sb=$("strip").getBoundingClientRect(),bw=Math.min(340,vw-16);bub.style.width=bw+"px";bub.style.left=((vw-bw)/2)+"px";bub.style.top=(sb.bottom+8)+"px";arr.style.display="none";}
  else{S2(cm[0],{left:"0",top:"0",width:vw+"px",height:vh+"px"});const bw=Math.min(460,vw-16);bub.style.width=bw+"px";bub.style.left=((vw-bw)/2)+"px";bub.style.top=Math.max(8,(vh-bub.offsetHeight)/2)+"px";arr.style.display="none";}
}
setInterval(tutTick,120);
window.addEventListener("resize",()=>{tutKey=null;});
