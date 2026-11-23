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
function tutGot(kind,k,v){const g=S.tutGain=S.tutGain||{},key=kind==="hunt"?"hunt":kind==="raid"?"raid":"farm";g[key]=g[key]||{};g[key][k]=(g[key][k]||0)+v;}
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
function fakeRaid(M,B){
  const type=B?B.type:TYPE_ORDER[Math.floor(Math.random()*5)],u0=Object.assign({},M?M.u:S.army),n=uSum(u0),hp=!M||M.hero?heroPower(type):0,pw=compAtk(u0,type)+hp;
  const def=Math.max(30,Math.min(90,Math.round(pw*0.55))),lf=lossFrac(pw,def),lost=Math.min(u0.coll||0,Math.round(n*lf)),lostBy=lost?{coll:lost}:{};
  const stock=900,prot=300,avail=stock-prot,carry=Math.round(compCarry(u0)*2+hp),take=Math.min(carry,avail);
  const cargo={prot:Math.round(take*0.3),lip:Math.round(take*0.3),atp:Math.round(take*0.25),nuc:Math.round(take*0.15)},cap=rates().cap,got={};
  S.tutP0=tutHeroSnap();
  if(M){M.cargo=cargo;M.result="win";Object.assign(got,cargo);}
  else for(const k in cargo){const b=S.res[k];S.res[k]=Math.max(b,Math.min(cap,b+cargo[k]));got[k]=Math.round(S.res[k]-b);if(got[k])stat("lootIn",k,got[k]);}
  const name=tr("Souche-miroir","Mirror strain");
  const lines=['<span class="up">'+tr("Pillage réussi","Successful raid")+"</span>"+tr(" chez "," on ")+name+tr(" (rival d’entraînement, voie "," (training rival, path ")+TYPES[type].name+tr("). Le défenseur ne perd aucune troupe.","). The defender loses no troops."),fightTable(u0,lostBy,type,hp,pw,def,true,tr("Défense","Defense"))];
  lines.push(tr("<b>Butin</b> · son stock ","<b>Loot</b> · its stock ")+fmt(stock)+tr(", dont ",", of which ")+fmt(prot)+tr(" à l’abri dans sa vacuole · pillable "," safe in its vacuole · raidable ")+fmt(avail)+tr(" · vos troupes peuvent porter "," · your troops can carry ")+fmt(carry)+".");
  lines.push(lootTable(RES.map(k=>[k,cargo[k]]),carry<avail?tr("Limité par votre capacité de transport : plus de troupes rapportent davantage.","Limited by your carrying capacity: more troops bring back more."):tr("Vous avez vidé tout ce qui était pillable.","You emptied everything that could be raided.")));
  if(lost)lines.push('<span class="up">'+(EN?"Training: your "+lost+" losses are refunded.":"Entraînement : vos "+lost+" pertes sont remboursées.")+"</span>");
  if(hp)lines.push(heroGain({def,type},true,true));
  if(M)lines.push(tr("Le butin arrive avec vos troupes, dans ","The loot arrives with your troops in ")+fmtDur(M.back-S.t)+".");
  lines.push("💬 "+name+" : "+tr("Bien joué… la prochaine fois, ce sera pour de vrai 😏","Well played… next time it’s for real 😏"));
  report("combat",tr("Pillage d’entraînement · ","Training raid · ")+name,lines,true);
  log(tr("Pillage d’entraînement réussi chez la ","Successful training raid on the ")+name+".","good");
  S.tutRaid={pw:Math.round(pw),def,lost,n,got};
}
function tutGoals(){const out=[];for(let i=S.q;i<QUESTS.length&&out.length<3;i++){if(!QUESTS[i].done())out.push(QUESTS[i]);}return out;}
function tutEnd(){S.tut=null;camVT=isMobile()?ZOOMS[0]:ZOOMS[1];if(cv)resize();tutBotRemove();S.tourDone=true;S.newTab="evo";tutKey=null;openRef=null;tab="cell";questTick();toast(tr("Tout est ouvert : bonne évolution !","Everything is open: happy evolving!"));dirty=true;save();}

const TUT=[
  {id:"hello",card:1,btn:()=>tr("C’est parti","Let’s go"),t:()=>tr("Bienvenue, souche ","Welcome, strain ")+SOUCHES[S.souche].name,
    d:()=>"<p>"+tr("Vous êtes une cellule seule, au bord d’un océan obscur. 499 autres organismes convoitent la même place que vous.","You are a lone cell at the edge of a dark ocean. 499 other organisms covet the same place as you.")+"</p><p>"+tr("Pour survivre, il vous faut des bras : des <b>collectrices</b>. Ce guide vous montre l’essentiel en quelques minutes, avec un temps accéléré. Le reste du jeu s’ouvrira ensuite.","To survive, you need hands: <b>gatherers</b>. This guide shows you the essentials in a few minutes, with sped-up time. The rest of the game opens afterwards.")+"</p>"},
  {id:"armytab",sel:'nav [data-t="hero"]',block:1,t:()=>tr("Vos troupes","Your troops"),d:()=>"<p>"+tr("Ouvrez l’onglet <b>Armée</b> : c’est là que naissent vos troupes.","Open the <b>Army</b> tab: that is where your troops are born.")+"</p>",done:()=>tab==="hero"},
  {id:"make",tab:"hero",sel:'[data-act="cell"][data-k="coll"][data-n="5"]',block:1,scroll:1,t:()=>tr("Produisez 5 collectrices","Produce 5 gatherers"),
    d:()=>"<p>"+tr("Vos ribosomes fabriquent les troupes. Une collectrice coûte 30 protéines et 20 ATP : elle récolte, explore et se bat un peu. Touchez <b>×5</b>.","Your ribosomes build the troops. A gatherer costs 30 proteins and 20 ATP: it gathers, explores and fights a little. Tap <b>×5</b>.")+"</p>",done:()=>S.queue.length>0},
  {id:"prod",float:1,t:()=>tr("Production en cours","Production under way"),
    d:()=>"<p>"+tr("Les ribosomes assemblent vos collectrices une à une. D’habitude, chacune prend plusieurs minutes ; pendant ce guide, c’est accéléré.","The ribosomes assemble your gatherers one by one. Normally each takes several minutes; during this guide it is sped up.")+' <b><span data-end="'+queueEnd()+'"></span></b></p>',done:()=>!S.queue.length},
  {id:"maptab",sel:'nav [data-t="map"]',block:1,enter:()=>{S.newTab="map";},t:()=>tr("Les abysses s’ouvrent","The abyss opens up"),
    d:()=>"<p>"+tr("Vos collectrices sont prêtes. Votre cellule, elle, ne bouge pas : ce sont vos troupes qui sortent chercher des ressources dans les abysses autour de vous. Ouvrez la carte.","Your gatherers are ready. Your cell doesn’t move: your troops go out to find resources in the abyss around you. Open the map.")+"</p>",done:()=>tab==="map"},
  {id:"auto",zoom:1,tab:"map",sel:".mapctl .auto",block:1,enter:()=>{S.tutGain={};enInit();S.en=Math.max(S.en,4);},t:()=>tr("Envoyez-les récolter","Send them harvesting"),
    d:()=>"<p>"+tr("Touchez <b>⛏</b> : vos collectrices libres partent d’un coup vers les gisements proches, ou explorent les cases voilées. Plus tard, vous pourrez aussi toucher une case pour choisir vous-même.","Tap <b>⛏</b>: your free gatherers leave at once for nearby deposits, or explore veiled tiles. Later you can also tap a tile to choose yourself.")+"</p>",done:()=>!!S.sentOnce},
  {id:"travel",zoom:1,float:1,t:()=>tr("En route","On the way"),
    d:()=>"<p>"+tr("Suivez vos collectrices sur la carte. Chacune porte 20 unités ; au retour, une part est digérée en ATP pour payer leur entretien. Retour dans quelques secondes.","Follow your gatherers on the map. Each carries 20 units; on return, part is digested into ATP to pay their upkeep. Back in a few seconds.")+"</p>",done:()=>!S.missions.some(M=>M.kind==="collect")},
  {id:"harvest",card:1,kick:()=>tr("Bilan","Summary"),btn:()=>tr("Continuer","Continue"),t:()=>tr("Bilan de la récolte","Harvest summary"),
    d:()=>{const g=(S.tutGain||{}).farm;return (g?"<p>"+tr("Vos collectrices ont rapporté :","Your gatherers brought back:")+"</p>"+tutResRows(g):"<p>"+tr("Vos collectrices ont surtout exploré : la carte s’est éclaircie autour de vous.","Your gatherers mostly explored: the map has cleared around you.")+"</p>")+
      "<p>"+tr("<b>Vos deux revenus</b> : les 4 canaux de la membrane produisent en continu, et vos collectrices rapportent ce qu’elles trouvent dans les abysses. Chaque troupe consomme un peu chaque heure : gardez une production positive.","<b>Your two incomes</b>: the 4 membrane channels produce continuously, and your gatherers bring back what they find in the abyss. Each troop consumes a little every hour: keep your production positive.")+'</p><p class="desc">'+tr("Production nette : ","Net production: ")+tutNet()+"</p><p>"+tr("<b>Prochaine étape : la chasse.</b> Un organisme sauvage affaibli vient d’apparaître près de vous.","<b>Next step: hunting.</b> A weakened wild organism has just appeared near you.")+"</p>";}},
  {id:"hunt",zoom:1,sel:'#detail [data-act="hunt"]',block:1,enter:tutHuntEnter,keep:()=>{if(S.tutWild){const r="tile:"+S.tutWild[0]+":"+S.tutWild[1];if(tab!=="map"||openRef!==r){tab="map";openRef=r;dirty=true;}}},t:()=>tr("Chassez un organisme sauvage","Hunt a wild organism"),
    d:()=>"<p>"+tr("Les organismes sauvages sont <b>neutres</b> : ils ne vous attaquent jamais, mais on les chasse pour leur biomasse. Votre <b>héros</b> part avec vos troupes : il ajoute sa force et progresse à chaque combat.","Wild organisms are <b>neutral</b>: they never attack you, but you hunt them for their biomass. Your <b>hero</b> goes with your troops: it adds its strength and improves with every fight.")+"</p><p>"+tr("Touchez <b>Chasser</b>.","Tap <b>Hunt</b>.")+"</p>",done:()=>S.missions.some(M=>M.kind==="hunt")||!!S.tutHuntDone},
  {id:"hunting",zoom:1,float:1,t:()=>tr("Chasse en cours","Hunt under way"),d:()=>"<p>"+tr("Vos troupes et votre héros foncent sur la proie. Le combat se règle à l’arrivée : votre force contre sa robustesse.","Your troops and hero rush at the prey. The fight is settled on arrival: your strength against its toughness.")+"</p>",done:()=>!!S.tutHuntDone&&!S.missions.some(M=>M.kind==="hunt")},
  {id:"huntsum",card:1,kick:()=>tr("Bilan","Summary"),btn:()=>tr("Voir mon héros","See my hero"),next:()=>{tab="hero";openRef=null;},t:()=>tr("Bilan de la chasse","Hunt summary"),
    d:()=>{const g=(S.tutGain||{}).hunt;return (g?"<p>"+tr("<b>Ressources</b> : la proie dévorée vous rapporte","<b>Resources</b>: the devoured prey brings you")+"</p>"+tutResRows(g):"")+"<p><b>"+tr("Votre héros","Your hero")+"</b></p>"+(S.tutH0?tutHeroRows(S.tutH0):"")+
      "<p>"+tr("<b>Son rôle</b> : il accompagne vos chasses et vos pillages et ajoute sa force à celle des troupes. Il ne meurt jamais. Chaque proie renforce un trait (venin, carapace…) ; dès le niveau 3, ses deux traits dominants lui donnent une forme, avec ses forces et ses faiblesses.","<b>Its role</b>: it joins your hunts and raids and adds its strength to your troops. It never dies. Each prey strengthens a trait (venom, shell…); from level 3, its two dominant traits give it a form, with strengths and weaknesses.")+'</p><p class="desc">'+tr("Contre un organisme sauvage, il ne gagne qu’un dixième de l’expérience d’un combat contre un autre joueur.","Against a wild organism, it gains only a tenth of the experience of a fight against another player.")+"</p>";}},
  {id:"hero",sel:".herocard",scroll:"start",tab:"hero",btn:()=>tr("Suivant","Next"),t:()=>tr("La fiche du héros","The hero sheet"),d:()=>"<p>"+tr("Son niveau, son expérience et ses traits. Décochez « L’emmener dans mes chasses » si vous voulez le garder à la maison pour défendre.","Its level, experience and traits. Untick “Bring it on my hunts” to keep it home to defend.")+"</p>"},
  {id:"pvp",card:1,kick:()=>tr("Les rivaux","Rivals"),btn:()=>tr("Aller piller","Go raiding"),next:placeTutBot,t:()=>tr("Les autres joueurs : pillez, défendez-vous","Other players: raid, defend yourself"),
    d:()=>"<p>"+tr("Les 499 autres organismes sont des rivaux, comme vous. Eux ne sont pas neutres : on les <b>pille</b>… et ils vous pillent.","The 499 other organisms are rivals, like you. They are not neutral: you <b>raid</b> them… and they raid you.")+'</p><ul class="tutlist"><li>'+
      tr("Un pillage réussi emporte les ressources de son entrepôt, sauf la part à l’abri dans sa vacuole.","A successful raid takes the resources in its storage, except the share safe in its vacuole.")+"</li><li>"+
      tr("Le défenseur ne perd aucune troupe ; l’attaquant en perd d’autant plus que le combat est serré.","The defender loses no troops; the attacker loses more the closer the fight.")+"</li><li>"+
      tr("Votre héros y gagne dix fois plus d’expérience qu’à la chasse.","Your hero gains ten times more experience than from hunting.")+"</li><li>"+
      tr("Un rival pillé devient rancunier et peut riposter. Après un pillage subi, vous êtes protégé 1 h ; pendant votre dormance (8 h par nuit, réglable dans les options), personne ne vous attaque.","A raided rival holds a grudge and may strike back. After being raided you are protected for 1 h; during your dormancy (8 h a night, set in the options) nobody attacks you.")+"</li></ul><p>"+
      tr("Essayons sans risque : une souche-miroir, un faux rival d’entraînement, vient d’apparaître près de vous dans les abysses.","Let’s try it risk-free: a mirror strain, a fake training rival, has just appeared near you in the abyss.")+"</p>"},
  {id:"raidtab",sel:'nav [data-t="map"]',block:1,t:()=>tr("Direction les abysses","Off to the abyss"),d:()=>"<p>"+tr("Les rivaux vivent dans les abysses, comme vous. Ouvrez la carte.","Rivals live in the abyss, like you. Open the map.")+"</p>",done:()=>tab==="map"},
  {id:"raidpick",zoom:1,tab:"map",rect:tutBotRect,block:1,enter:()=>{openRef=null;},t:()=>tr("Choisissez votre cible","Pick your target"),d:()=>"<p>"+tr("Voici la <b>souche-miroir</b>, un faux rival d’entraînement. Sur la carte, chaque rival est une base comme la vôtre. Touchez-la.","Here is the <b>mirror strain</b>, a fake training rival. On the map, each rival is a base like yours. Tap it.")+"</p>",done:()=>{const B=tutBot();return !!B&&openRef==="tile:"+B.x+":"+B.y;}},
  {id:"raidgo",zoom:1,sel:'#detail [data-act="raid"]',block:1,enter:()=>{enInit();S.en=Math.max(S.en,EN_COST.raid||1);S.heroWith=true;},keep:()=>{const B=tutBot();if(B){const r="tile:"+B.x+":"+B.y;if(tab!=="map"||openRef!==r){tab="map";openRef=r;dirty=true;}}},t:()=>tr("Pillez-la","Raid it"),d:()=>"<p>"+tr("Sa fiche montre votre force face à sa défense estimée. Votre héros part avec vos troupes. Touchez <b>Piller</b>.","Its sheet shows your strength against its estimated defense. Your hero goes with your troops. Tap <b>Raid</b>.")+"</p>",done:()=>S.missions.some(M=>M.kind==="raid")||!!S.tutRaid},
  {id:"raiding",zoom:1,float:1,t:()=>tr("Pillage en cours","Raid under way"),d:()=>"<p>"+tr("Vos troupes et votre héros foncent vers la souche-miroir. Le combat se règle à l’arrivée, puis elles rentrent avec le butin.","Your troops and hero rush toward the mirror strain. The fight is settled on arrival, then they come home with the loot.")+"</p>",done:()=>!!S.tutRaid&&!S.missions.some(M=>M.kind==="raid")},
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
      "<p>"+tr("En plus, le carnet <b>📘 Apprentissage</b> (en haut de l’écran) propose de petites missions récompensées pour comprendre chaque bâtiment. Elles sont facultatives, mais qui les termine toutes gagne un <b>coffre doré</b> avec 2 constructions instantanées.","Also, the <b>📘 Learning</b> notebook (top of the screen) offers small rewarded missions to understand each building. They are optional, but finishing them all earns a <b>golden chest</b> with 2 instant builds.")+"</p>"+
      "<h3>"+tr("Encore à découvrir","Still to discover")+'</h3><ul class="tutdisc">'+[
        ["🧬",tr("<b>Évolution</b> (nouvel onglet) : gènes, mutations, émergences cachées, jusqu’à l’Endosymbiose.","<b>Evolution</b> (new tab): genes, mutations, hidden emergences, up to Endosymbiosis.")],
        ["🏗",tr("<b>Construire</b> : canaux de la membrane, noyau et organites de la cellule.","<b>Building</b>: membrane channels, nucleus and the cell’s organelles.")],
        ["🔬",tr("<b>Recherche militaire</b> (Armée) : des rangs T2 à T5 et de nouvelles troupes.","<b>Military research</b> (Army): ranks T2 to T5 and new troops.")],
        ["🌿",tr("<b>Filaments</b> : reliez un gisement pour qu’il vous nourrisse en continu.","<b>Filaments</b>: link a deposit so it feeds you continuously.")],
        ["👁",tr("<b>Espionnage</b> : connaître la défense d’un rival avant de le piller.","<b>Spying</b>: learn a rival’s defense before raiding it.")],
        ["🧭",tr("<b>Migration</b> : remonter vers le centre, plus lumineux… et plus disputé.","<b>Migration</b>: rise toward the center, brighter… and more contested.")],
        ["🎁",tr("<b>Coffres et récompenses</b> : un coffre gratuit toutes les 4 heures, des quêtes du jour.","<b>Chests and rewards</b>: a free chest every 4 hours, daily quests.")],
        ["🏆",tr("<b>Classement, ligues et alliances.</b>","<b>Ranking, leagues and alliances.</b>")],
        ["🦖",tr("<b>L’APEX</b> : sortir de l’eau avant la fin des 27 jours.","<b>The APEX</b>: leave the water before the 27 days are up.")]
      ].map(x=>"<li><span>"+x[0]+"</span><span>"+x[1]+"</span></li>").join("")+"</ul>"}
];

function tutStep(){return S&&S.tut!=null?TUT[S.tut]||null:null;}
function tutGo(i){if(i>=TUT.length){tutEnd();return;}S.tut=i;tutKey=null;tutMiss=0;tutScrolled=false;const st=TUT[i];if(st.enter)st.enter();if(st.tab&&tab!==st.tab){tab=st.tab;openRef=null;}dirty=true;save();}
function tutNext(){const st=tutStep();if(!st)return;if(st.next)st.next();if(S.tut==null)return;tutGo(S.tut+1);}
function tutSkip(){if(!S||S.tut==null)return;S.tutSkipped=1;const f=tutI("final");if(S.tut===f){tutEnd();return;}tutGo(f);}
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
  if(st.tab&&tab!==st.tab&&tutTabOk(st.tab)){tab=st.tab;openRef=null;dirty=true;}
  if(st.zoom&&tab==="map"){if(camVT!==ZOOMS[0]){camVT=ZOOMS[0];if(cv)resize();dirty=true;}if(tutTick.cz!==S.tut){tutTick.cz=S.tut;const c=cpos();cam={x:c[0]+0.5,y:c[1]+0.5};camClamp();dirty=true;}} /* zoom serré sur la cellule : on voit les trajets */
  if(st.done&&st.done()){if(st.after)st.after();tutGo(S.tut+1);return;}
  const md=$("modal");
  if(document.getElementById("fbk")||$("picker").children.length||(md&&md.classList.contains("on"))||document.getElementById("chestfx")){tutHide(box);return;}
  const key=S.tut+(EN?"e":"f");
  if(key!==tutKey){box.innerHTML=tutHTML(st);tutKey=key;pxify(box);}
  let el=st.sel?document.querySelector(st.sel):null;
  if(el&&st.scroll&&!tutScrolled){el.scrollIntoView({block:st.scroll==="start"?"start":"center"});tutScrolled=true;}
  if(el){const q=el.getBoundingClientRect();if((q.bottom<4||q.top>window.innerHeight-4)&&Date.now()-(tutTick.sc||0)>700){tutTick.sc=Date.now();el.scrollIntoView({block:"center"});}}
  if(el&&el.disabled)el=null;
  const vw=window.innerWidth,vh=window.innerHeight;
  let r=el?el.getBoundingClientRect():null;if(st.rect)r=st.rect();if(r&&(r.width<1||r.height<1||r.bottom<4||r.top>vh-4))r=null;
  if(st.block&&!r){if(!tutTick.mt)tutTick.mt=Date.now();}else tutTick.mt=0;
  const lost=!!(st.block&&!r&&Date.now()-tutTick.mt>1500); /* cible introuvable : on ne bloque plus le joueur */
  const mode=st.card||(st.block&&!r&&!lost)?"card":r?"point":"float";
  box.className="on c-"+mode+(st.card||(st.block&&!lost)?" c-block":"");
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
/* Coffre doré, récompense finale du carnet d’apprentissage : ressources, énergie, XP du héros et 2 constructions instantanées */
function goldChest(){if(!S||S.goldDone)return;S.goldDone=1;
  const items=[];giveRes(1.6,RES,items);const e=enGive(15);if(e)items.push({k:"en",v:e});
  const xp=Math.round(xpNeed(S.hero.lvl)*0.5),H=S.hero;H.xp+=xp;items.push({k:"xp",v:xp});while(H.xp>=xpNeed(H.lvl)){H.xp-=xpNeed(H.lvl);H.lvl++;}
  S.inst=(S.inst||0)+2;items.push({k:"inst",v:2});
  const T=Object.assign({},CHEST_TIERS[3],{n:tr("Doré","Golden"),mt:tr("Apprentissage","Learning"),ti:3});
  log("👑 "+tr("Coffre doré de l’apprentissage : ressources, énergie, XP du héros et 2 constructions instantanées.","Golden learning chest: resources, energy, hero XP and 2 instant builds."),"rare");
  dirty=true;save();chestFX(T,items);}
function instPill(){if(!S||S.tut!=null||!(S.inst>0)||S.build)return "";return '<span class="rwpill instpill" data-tip="'+esc(tr("<b>Construction instantanée</b>Lancez une construction dans la cellule, puis touchez 🏗 à côté de sa barre : elle se termine tout de suite.","<b>Instant build</b>Start a build in the cell, then tap 🏗 next to its bar: it finishes right away."))+'">🏗 ×'+S.inst+"</span>";}
function useInstant(){if(!S||!S.build||!(S.inst>0))return;S.inst--;S.build.end=S.t;S.build.start=Math.min(S.build.start,S.t);toast(tr("🏗 Construction terminée !","🏗 Build complete!"));dirty=true;}
/* Sortie de secours : si le joueur touche le voile au lieu de la cible, on lui montre la bulle ; au 3e essai, il peut forcer l’étape */
let tutMiss=0;
document.addEventListener("click",e=>{if(!e.target.classList||!e.target.classList.contains("cm")||!e.target.closest("#coach"))return;const b=document.querySelector("#coach .cbub");if(b){b.classList.remove("nudge");void b.offsetWidth;b.classList.add("nudge");}
  tutMiss++;if(tutMiss===3&&b&&!b.querySelector('[data-act="tutforce"]')){const r=b.querySelector(".cbtn");if(r)r.insertAdjacentHTML("beforeend",'<button class="btn alt" data-act="tutforce">'+tr("Continuer quand même","Continue anyway")+"</button>");}});
function tutForce(){const st=tutStep();if(!st)return;if(st.id==="hunt"||st.id==="hunting")S.tutHuntDone=1;if(st.id==="auto")S.sentOnce=1;if((st.id==="raidpick"||st.id==="raidgo"||st.id==="raiding")&&!S.tutRaid){fakeRaid();S.missions=S.missions.filter(M=>M.kind!=="raid");tutGo(tutI("pvpsum"));return;}if(st.after)st.after();if(st.next)st.next();if(S.tut==null)return;tutGo(S.tut+1);}
/* La souche-miroir : un faux rival posé près de la cellule pour le pillage d’entraînement */
function tutBot(){return S&&S.bots?S.bots.find(b=>b.tut):null;}
function placeTutBot(){if(tutBot())return;const c=cpos();let best=null;
  for(let y=c[1]-4;y<=c[1]+4;y++)for(let x=c[0]-4;x<=c[0]+4;x++){if(x<0||y<0||x>=W||y>=H||!inWorld(x,y)||isLand(x,y))continue;const T=S.tiles[y*W+x],d=dist(x,y);if(T.k||T.w||botAt(x,y)||d<2||d>3.6||d>range())continue;if(!best||Math.abs(d-2.8)<Math.abs(best[2]-2.8))best=[x,y,d];}
  if(!best)return;const T=S.tiles[best[1]*W+best[0]];T.s=1;
  S.bots.push({id:99999,name:tr("Souche-miroir","Mirror strain"),tag:null,x:best[0],y:best[1],g:0.5,type:TYPE_ORDER[Math.floor(Math.random()*5)],aggr:0,res:900,lastT:S.t,anger:0,busy:0,tut:1});dirty=true;}
function tutBotRemove(){if(S&&S.bots)S.bots=S.bots.filter(b=>!b.tut);}
function tutBotCam(){const B=tutBot();if(!B)return;tab="map";cam={x:B.x+0.5,y:B.y+0.5};camClamp();dirty=true;}
function tutBotRect(){const B=tutBot(),c=document.getElementById("map");if(!B||!c||!cam)return null;const b=c.getBoundingClientRect(),sx=b.width/camVT,sy=b.height/camVT,L=b.left+(B.x-cam.x+camVT/2)*sx,T=b.top+(B.y-cam.y+camVT/2)*sy;
  if(L+sx<b.left||L>b.right||T+sy<b.top||T>b.bottom){if(Date.now()-(tutBotRect.t||0)>800){tutBotRect.t=Date.now();tutBotCam();}return null;}
  return {left:L,top:T,right:L+sx,bottom:T+sy,width:sx,height:sy};}
