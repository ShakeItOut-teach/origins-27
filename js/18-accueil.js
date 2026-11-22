/* Origins 27 · 18-accueil.js
   Portrait, visite guidée, choix de la souche, introduction et écran titre.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const STATS={
  [ST_EN]:{e:"⚡",d:tr("ATP : le carburant de toutes vos actions, construire, évoluer, nourrir vos collectrices.","ATP: the fuel for all your actions, building, evolving, feeding your gatherers.")},
  [ST_CR]:{e:"🌱",d:tr("Protéines : grandir, construire vos organites et produire des collectrices.","Proteins: growing, building your organelles and producing gatherers.")},
  [ST_GE]:{e:"🧬",d:tr("Nucléotides : le prix et la vitesse de l’évolution. C’est le chemin vers l’APEX.","Nucleotides: the price and speed of evolution. It is the road to the APEX.")},
  [ST_MO]:{e:"🌀",d:tr("Vitesse et portée de vos collectrices et de vos filaments.","Speed and range of your gatherers and filaments.")},
  [ST_PE]:{e:"👁️",d:tr("Ce que vous voyez dans le noir : proies, dangers, gisements, failles.","What you see in the dark: prey, dangers, deposits, rifts.")}
};
function portrait(id){
  const b='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" aria-hidden="true"><defs><radialGradient id="pg-'+id+'" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#0d2a3a"/><stop offset="1" stop-color="#02060b"/></radialGradient></defs><rect width="240" height="120" fill="url(#pg-'+id+')"/>';
  let s="";
  if(id==="varenne"){
    for(let i=0;i<9;i++)s+='<circle cx="'+(30+i*23)+'" cy="'+(105-((i*37)%60))+'" r="'+(2+(i%3))+'" fill="none" stroke="#9fd8cf" stroke-opacity=".35"/>';
    s+='<rect x="62" y="40" width="116" height="44" rx="22" fill="#2a2150" stroke="#a99bff" stroke-width="2"/>';
    s+='<path d="M80 62 q8 -14 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#c9c0ff" stroke-width="2.4"/><path d="M80 62 q8 14 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#7a6fe0" stroke-width="2.4"/>';
    s+='<circle cx="196" cy="34" r="3" fill="#a99bff"/><circle cx="204" cy="22" r="2" fill="#a99bff" fill-opacity=".6"/>';
  } else if(id==="kori"){
    for(let i=0;i<6;i++){const x=28+i*38,y=i%2?24:98;s+='<g stroke="#bfe6ff" stroke-opacity=".55" stroke-width="1.2"><line x1="'+(x-7)+'" y1="'+y+'" x2="'+(x+7)+'" y2="'+y+'"/><line x1="'+x+'" y1="'+(y-7)+'" x2="'+x+'" y2="'+(y+7)+'"/><line x1="'+(x-5)+'" y1="'+(y-5)+'" x2="'+(x+5)+'" y2="'+(y+5)+'"/><line x1="'+(x-5)+'" y1="'+(y+5)+'" x2="'+(x+5)+'" y2="'+(y-5)+'"/></g>';}
    s+='<circle cx="120" cy="60" r="40" fill="#0f2e40" stroke="#bfe6ff" stroke-width="5" stroke-opacity=".7"/><circle cx="120" cy="60" r="33" fill="#123a52" stroke="#78bee6" stroke-width="1.5"/>';
    s+='<circle cx="108" cy="52" r="9" fill="#ffe07a" fill-opacity=".7"/><circle cx="132" cy="66" r="7" fill="#ffe07a" fill-opacity=".5"/><circle cx="118" cy="74" r="5" fill="#78bee6" fill-opacity=".7"/>';
  } else if(id==="abyssa"){
    s+='<polygon points="168,120 184,72 200,120" fill="#2b1a14" stroke="#7a4a35"/><path d="M184 72 q-10 -20 4 -36 q10 -12 -2 -30" fill="none" stroke="#7e97a7" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/>';
    let d="";for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,r=i%2?30:38;d+=(i?"L":"M")+(100+Math.cos(a)*r)+" "+(62+Math.sin(a)*r);}
    s+='<path d="'+d+'Z" fill="#3a1410" stroke="#ff8a5c" stroke-width="1.8"/>';
    for(let i=0;i<7;i++){const a=i*0.9;s+='<circle cx="'+(100+Math.cos(a)*18)+'" cy="'+(62+Math.sin(a)*16)+'" r="3" fill="#ffe07a"/>';}
    s+='<circle cx="112" cy="50" r="8" fill="#7a1f12" stroke="#ff6a3d" stroke-width="1.5"/><circle cx="110" cy="48" r="2.6" fill="#ffd2b8"/>';
  } else {
    for(let i=0;i<14;i++)s+='<circle cx="'+((i*53)%240)+'" cy="'+(96+((i*17)%22))+'" r="'+(1.5+(i%3))+'" fill="#6b5a3a" fill-opacity=".6"/>';
    s+='<path d="M50 70 C80 30 140 30 175 52 C190 62 196 72 192 78 C160 62 110 58 64 84 C54 90 44 82 50 70Z" fill="#24402a" stroke="#9be15d" stroke-width="2"/>';
    for(let i=0;i<22;i++){const t=i/21,x=58+t*130,y=58-Math.sin(t*Math.PI)*22;s+='<line x1="'+x+'" y1="'+y+'" x2="'+(x-3)+'" y2="'+(y-9)+'" stroke="#c9e9a8" stroke-opacity=".6"/>';}
    s+='<circle cx="100" cy="62" r="5" fill="#f3b562"/><circle cx="128" cy="56" r="4" fill="#f3b562"/><circle cx="152" cy="60" r="3.5" fill="#f3b562"/>';
  }
  return b+s+"</svg>";
}
const TOUR=[
  {sel:"#resbar",t:tr("Vos ressources","Your resources"),d:tr("ATP, protéines, lipides et nucléotides : leur production par heure, moins l’entretien de vos collectrices. Gardez le doigt appuyé, ou survolez, pour le détail.","ATP, proteins, lipids and nucleotides: their production per hour, minus your troops’ upkeep. Keep your finger pressed, or hover, for details.")},
  {sel:"#strip",t:tr("Suivez la quête","Follow the quest"),d:tr("Elle vous dit toujours quoi faire ensuite : touchez-la, le jeu vous emmène au bon endroit. Une fois les quêtes finies, le conseiller prend le relais.","It always tells you what to do next: tap it and the game takes you to the right place. Once the quests are done, the advisor takes over.")},
  {sel:'nav [data-t="cell"]',t:tr("Cellule : construire","Cell: build"),d:tr("Touchez un canal de la membrane ou un emplacement pour l’améliorer. Une seule construction à la fois.","Tap a membrane channel or a slot to upgrade it. One build at a time.")},
  {sel:'nav [data-t="map"]',t:tr("Abysses : récolter","Abyss: harvest"),d:tr("Votre cellule ne bouge pas, vos collectrices si. Le bouton ⛏ les envoie toutes récolter en un geste. Pincez pour zoomer.","Your cell doesn’t move, your gatherers do. The ⛏ button sends them all harvesting in one tap. Pinch to zoom.")},
  {sel:'nav [data-t="evo"]',t:tr("Évolution : se transformer","Evolution: transform"),d:tr("Des gènes à exprimer et, à chaque niveau de noyau, une mutation à choisir. Le but : l’Endosymbiose. Héros et rapports se découvriront en route.","Genes to express and, at each nucleus level, a mutation to choose. The goal: Endosymbiosis. Hero and reports will reveal themselves along the way.")}
];
let tourI=-1;
function showTour(i){
  const box=$("tour");tourI=i;
  if(i<0||i>=TOUR.length){box.innerHTML="";box.classList.remove("on");tourI=-1;if(S){S.tourDone=true;save();}return;}
  const st=TOUR[i],el=document.querySelector(st.sel);if(!el){showTour(i+1);return;}
  const r=el.getBoundingClientRect(),pad=4,below=r.bottom+190<window.innerHeight;
  const left=Math.max(8,Math.min(window.innerWidth-308,r.left+r.width/2-150));
  box.innerHTML='<div class="hole" style="left:'+(r.left-pad)+"px;top:"+(r.top-pad)+"px;width:"+(r.width+pad*2)+"px;height:"+(r.height+pad*2)+'px"></div><div class="tbub" style="left:'+left+"px;"+(below?"top:"+(r.bottom+12)+"px":"top:"+(r.top-12)+"px;transform:translateY(-100%)")+'"><div class="kick">'+tr("Visite · ","Tour · ")+(i+1)+" / "+TOUR.length+"</div><h2>"+st.t+"</h2><p>"+st.d+'</p><div class="row" style="justify-content:space-between;margin-top:10px"><button class="ghost" data-act="tourskip">'+tr("Passer","Skip")+'</button><button class="btn" data-act="tournext">'+(i===TOUR.length-1?tr("Terminer","Finish"):tr("Suivant","Next"))+"</button></div></div>";
  box.classList.add("on");
}
function showPicker(){
  let h='<div class="picker"><div class="picker-in"><h2>'+tr("Choisissez votre souche","Choose your strain")+'</h2><p class="lead">'+tr("Votre cellule de départ fixe vos forces et vos faiblesses pour tout le serveur. Plus tard, elle deviendra le héros de votre lignée. ","Your starting cell sets your strengths and weaknesses for the whole server. Later, it will become the hero of your lineage. ")+'<button class="lnk ok" data-act="slide" data-i="0">'+tr("Revoir le but du jeu","See the game goal again")+"</button></p>";
  h+='<div class="statlegend">'+Object.keys(STATS).map(k=>"<div><b>"+STATS[k].e+" "+k+"</b><span>"+STATS[k].d+"</span></div>").join("")+"</div>";
  h+='<div class="strains">';
  for(const id in SOUCHES){const o=SOUCHES[id];
    h+='<div class="strain"><div class="portrait">'+artBox("por",portrait(id),120,60)+'</div><h3>'+tr("Souche ","Strain ")+o.name+'</h3><p class="origin">'+o.origin+'</p><div class="bars">';
    for(const k in o.stats)h+='<span class="lbl" data-tip="'+esc("<b>"+STATS[k].e+" "+k+"</b>"+STATS[k].d)+'">'+STATS[k].e+" "+k+'</span><span class="bar"><i style="width:'+(o.stats[k]*20)+'%"></i></span>';
    h+="</div><ul>"+o.bonus.map(b=>'<li class="b">'+b+"</li>").join("")+o.malus.map(b=>'<li class="m">'+b+"</li>").join("")+'<li class="t">'+o.trait+'</li></ul><button class="btn" data-act="pick" data-s="'+id+'">'+tr("Choisir cette souche","Choose this strain")+"</button></div>";}
  h+='</div><p class="fictif">'+tr("Souches, lieux de prélèvement et chercheurs sont imaginaires.","Strains, sampling sites and researchers are fictional.")+"</p></div></div>";
  $("picker").innerHTML=h;$("picker").firstChild.scrollTop=0;pxify($("picker"));
}
/* Introduction : le but du jeu, étape par étape */
function cellBlob(x,y,r,fill,stroke,extra){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.8"/>'+(extra||"");}
const INTRO=[
  {k:tr("Il y a 4 milliards d’années","4 billion years ago"),t:tr("Au fond de l’océan, dans le noir","At the bottom of the ocean, in the dark"),
   p:EN?["You are a bacterium born at the edge of the world, in the abyss, among 499 other organisms. The world is a vast circle: the closer you get to the center, the shallower the water, all the way to dry land.","Food is scarce and every action costs energy. To grow, you will have to harvest, explore… then raid the others before they raid you."]:["Vous êtes une bactérie née au bord du monde, dans les abysses, parmi 499 autres organismes. Le monde est un immense cercle : plus on avance vers le centre, plus les eaux remontent, jusqu’à la terre ferme.","La nourriture est rare et chaque action coûte de l’énergie. Pour grandir, il faudra récolter, explorer… puis piller les autres avant qu’ils ne vous pillent."],
   art:()=>{let s='<rect width="360" height="220" fill="#02060b"/>';const rr=mulberry32(27);for(let i=0;i<50;i++)s+='<circle cx="'+(rr()*360)+'" cy="'+(rr()*220)+'" r="'+(0.6+(i%3)*0.5)+'" fill="#9fc3d3" fill-opacity="'+(0.15+(i%4)*0.08)+'"/>';
     s+='<polygon points="250,220 275,150 300,220" fill="#1c120e" stroke="#4a3024"/><path d="M275 150 q-14 -26 6 -50 q14 -18 -4 -44" fill="none" stroke="#7e97a7" stroke-opacity=".3" stroke-width="12" stroke-linecap="round"/>';
     s+='<circle cx="120" cy="120" r="34" fill="#5ee6d0" fill-opacity=".12"/>'+cellBlob(120,120,16,"#123a3a","#5ee6d0",'<circle cx="120" cy="120" r="5" fill="#a99bff"/>');
     s+=cellBlob(40,60,7,"#2a1414","#ff8a7a")+cellBlob(330,40,6,"#2a1414","#ff8a7a")+cellBlob(200,190,5,"#2a1414","#ff8a7a");return s;}},
  {k:tr("Jours 1 à 3 · Procaryote","Days 1 to 3 · Prokaryote"),t:tr("Grandir dans le noir","Growing in the dark"),
   p:EN?["You build your cell like a fortress: channels on the membrane to produce, organelles to build, train your troops and store.","Your first troops, rank T1, harvest and hunt. Every 4 hours, a free chest: a stroke of luck can multiply its contents by 8."]:["Vous bâtissez votre cellule comme une forteresse : des canaux sur la membrane pour produire, des organites pour construire, entraîner vos troupes et stocker.","Vos premières troupes, rang T1, récoltent et chassent. Toutes les 4 heures, un coffre gratuit : un coup de chance peut multiplier son contenu par 8."],
   art:()=>{let s='<rect width="360" height="220" fill="#02060b"/>';s+='<rect x="110" y="80" width="140" height="60" rx="30" fill="#123a3a" stroke="#5ee6d0" stroke-width="2"/>';for(let i=0;i<30;i++){const t=i/29,x=125+t*110;s+='<line x1="'+x+'" y1="80" x2="'+(x-2)+'" y2="70" stroke="#9fd8cf" stroke-opacity=".6"/><line x1="'+x+'" y1="140" x2="'+(x-2)+'" y2="150" stroke="#9fd8cf" stroke-opacity=".6"/>';}
     s+='<path d="M140 110 q10 -12 20 0 t20 0 t20 0 t20 0" fill="none" stroke="#a99bff" stroke-width="2.2"/>';[[50,60,"#f3b562"],[70,170,"#ef7fa6"],[300,60,"#a99bff"],[310,180,"#f3b562"]].forEach(d=>{s+='<circle cx="'+d[0]+'" cy="'+d[1]+'" r="7" fill="'+d[2]+'"/>';});
     s+='<line x1="250" y1="110" x2="296" y2="68" stroke="#5ee6d0" stroke-dasharray="3 4"/><circle cx="282" cy="81" r="4" fill="#5ee6d0"/>';return s;}},
  {k:tr("Jours 3 à 7 · Eucaryote","Days 3 to 7 · Eukaryote"),t:tr("Avaler une autre vie","Swallowing another life"),
   p:EN?["The first great leap: endosymbiosis. Your cell swallows another without digesting it. It becomes part of you.","You are now a eukaryote, with a true nucleus: the only road to large living beings. T3 military research opens, and the real raids begin."]:["Le premier grand saut : l’endosymbiose. Votre cellule en avale une autre sans la digérer. Elle devient une partie de vous.","Vous voilà eucaryote, avec un vrai noyau : la seule voie vers les grands êtres vivants. La recherche militaire T3 s’ouvre, et les vrais pillages commencent."],
   art:()=>{let s='<rect width="360" height="220" fill="#02060b"/>'+cellBlob(170,110,72,"#0f3238","#5ee6d0")+'<circle cx="170" cy="110" r="66" fill="none" stroke="#a99bff" stroke-opacity=".5" stroke-dasharray="3 4"/>';
     s+='<circle cx="160" cy="105" r="26" fill="#2a2150" stroke="#a99bff" stroke-width="2"/><circle cx="168" cy="98" r="8" fill="#5a4fb0"/>';
     s+='<ellipse cx="238" cy="110" rx="22" ry="13" fill="#1d3b2c" stroke="#7fd36b" stroke-width="2"/><path d="M222 110 q4 -8 8 0 t8 0 t8 0 t8 0" fill="none" stroke="#7fd36b"/>';
     s+='<ellipse cx="200" cy="150" rx="14" ry="8" fill="#2b2411" stroke="#ffe07a"/>';return s;}},
  {k:tr("Jours 7 à 12 · Colonie","Days 7 to 12 · Colony"),t:tr("Ne plus être seul","No longer alone"),
   p:EN?["Alliances open up: six colonies fight over the world. Whoever attacks one member takes on, in time, the whole colony.","Every day, the world ranking places you in a league, from Plankton to Sovereign. The higher you climb, the bigger the evening reward."]:["Les alliances s’ouvrent : six colonies se disputent le monde. Celui qui attaque un membre s’attaque, avec le temps, à toute la colonie.","Chaque jour, le classement mondial vous range dans une ligue, de Plancton à Souverain. Plus vous montez, plus la récompense du soir est grosse."],
   art:()=>{let s='<rect width="360" height="220" fill="#02060b"/>';const pts=[[180,110],[140,90],[220,90],[140,135],[220,135],[180,68],[180,152]];
     pts.slice(1).forEach(p=>{s+='<line x1="180" y1="110" x2="'+p[0]+'" y2="'+p[1]+'" stroke="#5ee6d0" stroke-width="3" stroke-opacity=".5"/>';});
     const cols=["#5ee6d0","#ffe07a","#ef7fa6","#a99bff","#f3b562","#4fc3f7","#b8e05a"];pts.forEach((p,i)=>{s+=cellBlob(p[0],p[1],19,"#0f3238",cols[i],'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="'+cols[i]+'" fill-opacity=".7"/>');});return s;}},
  {k:tr("Jours 12 à 20 · Pluricellulaire","Days 12 to 20 · Multicellular"),t:tr("Chaque joueur devient un organe","Each player becomes an organ"),
   p:EN?["The alliance becomes a body. Each member picks a role: digestion, muscles, nervous system, defense, skeleton.","A body has strengths and weaknesses. Your spies reveal your rivals’ exact numbers, and rank T4 brings giants into your army."]:["L’alliance devient un corps. Chacun choisit un rôle : digestion, muscles, système nerveux, défense, squelette.","Un corps a des forces et des faiblesses. Vos espionnes révèlent les chiffres exacts de vos rivaux, et le rang T4 fait entrer les géants dans votre armée."],
   art:()=>{let s='<rect width="360" height="220" fill="#02060b"/>';const cols=["#ff8a5c","#ffe07a","#5ee6d0","#a99bff","#ef7fa6","#b8e05a","#4fc3f7"];
     for(let i=0;i<7;i++){const x=70+i*36,y=110+Math.sin(i*0.9)*16,r=24-Math.abs(i-3)*2.5;s+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#0f2a33" stroke="'+cols[i]+'" stroke-width="2.2"/><circle cx="'+x+'" cy="'+y+'" r="'+(r*0.35)+'" fill="'+cols[i]+'" fill-opacity=".6"/>';}
     s+='<circle cx="62" cy="100" r="5" fill="#ffd2b8"/>';return s;}},
  {k:tr("Jours 20 à 30 · L’APEX","Days 20 to 30 · The APEX"),t:tr("Conquérir la terre ferme","Conquer dry land"),
   p:EN?["The final goal: rise to the center of the world and leave the water. No aquatic form can win: the APEX must live on dry land. In the last week, legendary T5 troops enter the stage.","With your alliance, you choose the lineage that will rule, depending on the evolutions your members have worked on: great predator, flying reptile or giant herbivore. Nobody announces it: only spying and betrayals reveal who is getting close."]:["Le but final : remonter jusqu’au centre du monde et sortir de l’eau. Aucune forme aquatique ne peut gagner : l’APEX doit vivre sur la terre ferme. La dernière semaine, les troupes légendaires T5 entrent en scène.","Avec votre alliance, vous choisissez la lignée qui dominera, selon les évolutions que vos membres ont travaillées : grand prédateur, reptile volant ou géant herbivore. Personne ne l’annonce : seuls l’espionnage et les trahisons révèlent qui s’en approche."],
   res:[270,165],
   art:()=>{const R=mulberry32(65);let s='<defs>'+
       '<linearGradient id="ap-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e3a4c"/><stop offset=".5" stop-color="#7d7672"/><stop offset=".8" stop-color="#c9a478"/><stop offset="1" stop-color="#dcb684"/></linearGradient>'+
       '<linearGradient id="ap-mud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e5f4a"/><stop offset="1" stop-color="#3e3428"/></linearGradient>'+
       '<linearGradient id="ap-rex" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c3c26"/><stop offset=".55" stop-color="#7a6240"/><stop offset="1" stop-color="#b9a27c"/></linearGradient>'+
       '<linearGradient id="ap-rexd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2e1e"/><stop offset="1" stop-color="#6a5638"/></linearGradient>'+
       '<linearGradient id="ap-tri" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46503a"/><stop offset=".6" stop-color="#6b7350"/><stop offset="1" stop-color="#9a9a74"/></linearGradient>'+
       '<linearGradient id="ap-frill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6e4a"/><stop offset="1" stop-color="#5a4630"/></linearGradient>'+
       '<radialGradient id="ap-sun" cx="76%" cy="42%" r="40%"><stop offset="0" stop-color="#fff0c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff0c8" stop-opacity="0"/></radialGradient>'+
       '<linearGradient id="ap-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8c4a0" stop-opacity="0"/><stop offset="1" stop-color="#d8c4a0" stop-opacity=".6"/></linearGradient></defs>';
     s+='<rect width="360" height="220" fill="url(#ap-sky)"/><rect width="360" height="220" fill="url(#ap-sun)"/>';
     s+='<path d="M0 118 L40 104 L78 112 L120 96 L170 110 L214 100 L262 112 L300 98 L360 110 L360 132 L0 132Z" fill="#76788a" fill-opacity=".55"/>';
     const arau=(x,b,h,c,w)=>{let t='<line x1="'+x+'" y1="'+b+'" x2="'+x+'" y2="'+(b-h)+'" stroke="'+c+'" stroke-width="'+(w*0.35)+'"/>';for(let k=0;k<3;k++){const y=b-h+k*5;t+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+(w-k*1.5)+'" ry="'+(2.6+k*0.6)+'" fill="'+c+'"/>';}return t;};
     const conif=(x,b,h,c)=>'<polygon points="'+(x-h*0.18)+','+b+' '+x+','+(b-h)+' '+(x+h*0.18)+','+b+'" fill="'+c+'"/>';
     for(let i=0;i<34;i++){const x=R()*360;s+=R()<0.35?arau(x,132,34+R()*16,"#5d6464",9):conif(x,132,24+R()*20,"#5a6260");}
     s+='<rect y="112" width="360" height="26" fill="url(#ap-fog)"/>';
     for(let i=0;i<24;i++){const x=R()*360;s+=R()<0.4?arau(x,146,44+R()*20,"#3c4840",11):conif(x,146,34+R()*22,"#36443a");}
     s+='<rect y="128" width="360" height="22" fill="url(#ap-fog)" opacity=".7"/>';
     s+='<polygon points="270,0 300,0 230,170 196,170" fill="#fff4d6" fill-opacity=".07"/><polygon points="318,0 338,0 280,170 254,170" fill="#fff4d6" fill-opacity=".06"/>';
     s+='<path d="M0 146 Q90 140 180 146 T360 144 L360 220 L0 220Z" fill="url(#ap-mud)"/>';
     s+='<path d="M196 166 Q250 160 320 168 Q262 174 200 172Z" fill="#9aa3a6" fill-opacity=".45"/><path d="M40 176 Q80 172 120 178 Q78 182 42 180Z" fill="#9aa3a6" fill-opacity=".35"/>';
     for(let i=0;i<60;i++){const x=R()*360,y=150+R()*66;s+='<rect x="'+x+'" y="'+y+'" width="'+(2+R()*5)+'" height="1.4" fill="#2e271e" fill-opacity="'+(0.25+R()*0.35)+'"/>';}
     const cycad=(x,y,sc,c)=>{let t='<rect x="'+(x-2*sc)+'" y="'+(y-10*sc)+'" width="'+(4*sc)+'" height="'+(10*sc)+'" fill="#4a3a28"/>';for(let k=0;k<9;k++){const a=Math.PI+k*Math.PI/8;t+='<path d="M'+x+' '+(y-10*sc)+' Q'+(x+Math.cos(a)*14*sc)+' '+(y-10*sc+Math.sin(a)*14*sc-6*sc)+' '+(x+Math.cos(a)*24*sc)+' '+(y-10*sc+Math.sin(a)*10*sc+4*sc)+'" stroke="'+c+'" stroke-width="'+(2.4*sc)+'" fill="none"/>';}return t;};
     s+=cycad(330,170,1.1,"#3f5a30")+cycad(18,160,0.9,"#42603a");
     // Tricératops (à droite, tête baissée vers la gauche)
     s+='<g transform="translate(24 8) scale(.92)">';
     s+='<path d="M334 128 C346 132 356 140 362 152 C350 148 342 144 334 140Z" fill="#4d5638"/>';
     s+='<path d="M298 150 h11 l1 26 h-12z" fill="#3e4630"/><path d="M262 146 h11 l1 28 h-12z" fill="#3e4630"/>';
     s+='<path d="M250 120 C268 104 316 102 336 120 C348 134 342 156 322 160 C298 166 262 162 250 150 C242 142 242 128 250 120Z" fill="url(#ap-tri)"/>';
     for(let i=0;i<9;i++)s+='<path d="M'+(258+i*9)+' '+(112+Math.abs(4-i)*1.2)+' q4 6 0 12" stroke="#3a4230" stroke-width="1.2" fill="none" stroke-opacity=".6"/>';
     s+='<path d="M316 150 h13 l1 28 h-14z" fill="#525c40"/><path d="M276 150 h13 l1 28 h-14z" fill="#525c40"/>';
     [[270,178],[312,178]].forEach(f=>{s+='<path d="M'+(f[0]-1)+' '+f[1]+' h17 l-2 3 h-13z" fill="#3a3326"/>';});
     s+='<path d="M246 98 C232 90 216 98 212 114 C212 130 222 144 240 146 C254 142 258 126 254 110Z" fill="url(#ap-frill)" stroke="#b39a6c" stroke-width="2"/>';
     for(let i=0;i<7;i++){const a=-1.9+i*0.42;s+='<circle cx="'+(232+Math.cos(a)*24)+'" cy="'+(120+Math.sin(a)*24)+'" r="1.6" fill="#c8b07c"/>';}
     s+='<path d="M232 122 C226 130 214 134 204 140 L196 150 L206 154 L222 150 C232 146 240 138 242 128Z" fill="#6b7150"/>';
     s+='<path d="M196 150 L190 156 L202 156Z" fill="#2e2a22"/><path d="M204 141 L196 132 L208 139Z" fill="#e2d6b8"/>';
     s+='<path d="M226 124 L180 112 L182 116 L224 130Z" fill="#e9dfc6"/><path d="M180 112 L176 111 L182 116Z" fill="#3a3326"/>';
     s+='<path d="M232 120 L192 104 L193 108 L230 125Z" fill="#cfc2a2"/>';
     s+='<circle cx="224" cy="132" r="1.6" fill="#111"/><path d="M220 129 q4 -2 7 1" stroke="#3a3326" stroke-width="1" fill="none"/>';
     s+='</g>';
     // Tyrannosaure (à gauche, gueule ouverte vers la droite)
     s+='<g transform="translate(-22 10) scale(.94)">';
     s+='<path d="M120 132 C116 146 112 160 118 176 L110 186 L132 186 L128 176 C126 162 134 146 136 134Z" fill="url(#ap-rexd)"/>';
     s+='<path d="M112 110 C80 104 44 110 10 128 C44 120 82 124 114 134Z" fill="url(#ap-rex)"/>';
     s+='<path d="M100 108 C120 98 160 98 178 108 C186 118 180 134 162 140 C142 146 112 142 102 134 C95 127 95 114 100 108Z" fill="url(#ap-rex)"/>';
     for(let i=0;i<10;i++)s+='<path d="M'+(70+i*11)+' '+(106+(i<4?4-i:0))+' l3 8" stroke="#3a2c1a" stroke-width="2" stroke-opacity=".55"/>';
     s+='<path d="M170 104 C180 96 188 90 194 88 L202 98 C194 106 186 112 178 120Z" fill="url(#ap-rex)"/>';
     s+='<path d="M186 72 C200 64 224 64 240 72 L242 80 L226 84 L206 88 L190 94 C182 88 180 78 186 72Z" fill="#7e6644"/>';
     s+='<path d="M188 72 C204 66 224 66 238 72" stroke="#5a4628" stroke-width="2" fill="none"/>';
     s+='<path d="M194 98 L214 96 L236 106 L234 111 L208 111 L196 106Z" fill="#8a7050"/>';
     s+='<path d="M206 88 L226 84 L242 80 L236 106 L214 96 L194 98Z" fill="#3a1e18"/>';
     for(let i=0;i<7;i++){s+='<path d="M'+(208+i*4.5)+' '+(87.2-i*0.6)+' l1.4 4 l1.4 -4" fill="#efe6d0"/>';s+='<path d="M'+(212+i*3.4)+' '+(100+i*1)+' l1.3 -3.6 l1.3 3.6" fill="#e6dcc4"/>';}
     s+='<circle cx="206" cy="74" r="2" fill="#e8b84a"/><circle cx="206.4" cy="74" r=".9" fill="#111"/><path d="M200 70 q6 -3 12 0" stroke="#4a3820" stroke-width="2" fill="none"/>';
     s+='<path d="M168 124 l7 4 l-1 5 M175 128 l3 3" stroke="#6a5436" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
     s+='<path d="M132 126 C152 120 162 138 156 154 L148 158 C140 146 128 140 132 126Z" fill="url(#ap-rex)"/>';
     s+='<path d="M148 150 L160 178 L176 186 L152 188 L142 160Z" fill="#6a5436"/><path d="M152 188 l-4 3 M160 188 l0 3 M168 187 l4 3" stroke="#d8ccb0" stroke-width="1.6"/>';
     s+='</g>';
     // poussière et boue soulevées
     [[150,186,20,.4],[196,182,16,.3],[262,184,22,.35],[120,190,14,.3]].forEach(d=>{s+='<ellipse cx="'+d[0]+'" cy="'+d[1]+'" rx="'+d[2]+'" ry="5" fill="#cdb48a" fill-opacity="'+d[3]+'"/>';});
     for(let i=0;i<14;i++){s+='<rect x="'+(150+R()*120)+'" y="'+(164+R()*18)+'" width="1.6" height="1.6" fill="#4a3c2c"/>';}
     s+='<path d="M0 220 L0 196 Q16 186 30 196 Q38 180 52 190 L60 220Z" fill="#26301f"/><path d="M360 220 L360 192 Q344 184 334 196 Q322 182 310 194 L304 220Z" fill="#26301f"/>';
     return s;}},
  {k:tr("Avant de commencer","Before you start"),t:tr("Ce qui compte pour votre souche","What matters for your strain"),
   p:[tr("Votre souche de départ a cinq qualités. Aucune n’est meilleure qu’une autre : elles orientent votre manière de jouer.","Your starting strain has five qualities. None is better than another: they shape the way you play."),Object.keys(STATS).map(k=>"<b>"+STATS[k].e+" "+k+"</b> ("+STATS[k].d.replace(/\.$/,"")+")").join("<br>")],
   art:()=>{let s='<rect width="360" height="220" fill="#02060b"/>';["varenne","kori","abyssa","ilheu"].forEach((id,i)=>{s+='<g transform="translate('+(10+(i%2)*175)+" "+(8+Math.floor(i/2)*106)+') scale(0.71)">'+portrait(id).replace(/^<svg[^>]*>/,"").replace(/<\/svg>$/,"").replace(/id="pg-/g,'id="pgi-').replace(/url\(#pg-/g,"url(#pgi-")+"</g>";});return s;}}
];
const TL=STAGE_NAME.slice(1,5).concat("APEX");
function showIntro(i){
  i=Math.max(0,Math.min(INTRO.length-1,i));const sl=INTRO[i],last=i===INTRO.length-1;
  const on=i>=1&&i<=5?i-1:-1;
  let h='<div class="picker"><div class="intro">';
  h+='<div class="intro-nav"><span class="kicker">'+sl.k+'</span>'+(S?'<button class="ghost" data-act="closeintro">'+tr("Reprendre la partie","Resume the game")+"</button>":'<span class="row"><button class="ghost" data-act="home">'+tr("Accueil","Home")+'</button><button class="ghost" data-act="tostrains">'+tr("Passer","Skip")+"</button></span>")+"</div>";
  h+="<h2>"+sl.t+'</h2><div class="timeline">'+TL.map((t,j)=>'<span class="'+(j===on?"on":"")+'">'+t+"</span>").join("")+"</div>";
  const rs=sl.res||[180,110];h+='<div class="art">'+artBox("intro",'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" role="img" aria-label="'+esc(sl.t)+'">'+sl.art()+"</svg>",rs[0],rs[1])+"</div>";
  h+='<div class="txt">'+sl.p.map(t=>"<p>"+t+"</p>").join("")+"</div>";
  if(i===0&&!S)h+='<div class="quick"><button class="btn big" data-act="quickstart">'+tr("Jouer tout de suite","Play right now")+'</button><span class="desc">'+tr("Souche conseillée : Kōri-71, la plus tolérante. Vous pourrez relire l’histoire avec « ? ».","Recommended strain: Kōri-71, the most forgiving. You can read the story again with “?”.")+"</span></div>";
  h+='<div class="intro-nav"><button class="btn alt" data-act="slide" data-i="'+(i-1)+'"'+(i===0?" disabled":"")+">"+tr("Précédent","Previous")+'</button><div class="dots">'+INTRO.map((_,j)=>'<i class="'+(j===i?"on":"")+'"></i>').join("")+"</div>";
  h+=last?(S?'<span class="row"><button class="btn alt" data-act="tour">'+tr("Visite des onglets","Tab tour")+'</button><button class="btn" data-act="closeintro">'+tr("Reprendre","Resume")+"</button></span>":'<button class="btn" data-act="tostrains">'+tr("Choisir ma souche","Choose my strain")+"</button>"):'<button class="btn" data-act="slide" data-i="'+(i+1)+'">'+tr("Suivant","Next")+"</button>";
  h+="</div></div></div>";
  $("picker").innerHTML=h;pxify($("picker"));
}
/* Écran titre : l'image clé. Deux couches : le décor (pixelisé en style pixel) et un calque net animé (neige, chemin, jalons). */
const TT_P=[[720,640],[830,555],[925,440],[990,315],[1005,238]];
function ttPath(){const P=TT_P;return "M"+P[0]+" C790 630 800 580 "+P[1]+" S900 480 "+P[2]+" S960 360 "+P[3]+" S990 280 "+P[4];}
function titleArt(narrow,size){
  const R=mulberry32(2727);
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"'+(size?' width="'+size[0]+'" height="'+size[1]+'"':"")+' preserveAspectRatio="'+(narrow?"xMaxYMid":"xMidYMid")+' slice" aria-hidden="true"><defs>'+
    '<linearGradient id="tt-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b6a74"/><stop offset=".22" stop-color="#0c3a4a"/><stop offset=".55" stop-color="#061a26"/><stop offset="1" stop-color="#02060b"/></linearGradient>'+
    '<linearGradient id="tt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22324a"/><stop offset=".55" stop-color="#b9806a"/><stop offset="1" stop-color="#ffd59a"/></linearGradient>'+
    '<radialGradient id="tt-sun" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1000 230) scale(380 280)"><stop offset="0" stop-color="#fff3d2" stop-opacity=".95"/><stop offset=".25" stop-color="#ffd59a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="tt-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8fff8" stop-opacity=".22"/><stop offset="1" stop-color="#e8fff8" stop-opacity="0"/></linearGradient>'+
    '<linearGradient id="tt-land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4030"/><stop offset="1" stop-color="#1e211c"/></linearGradient>'+
    '<linearGradient id="tt-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd59a" stop-opacity="0"/><stop offset="1" stop-color="#ffd59a" stop-opacity=".45"/></linearGradient>'+
    '<radialGradient id="tt-halo"><stop offset="0" stop-color="#5ee6d0" stop-opacity=".5"/><stop offset="1" stop-color="#5ee6d0" stop-opacity="0"/></radialGradient>'+
    '<radialGradient id="tt-halog"><stop offset="0" stop-color="#ffd166" stop-opacity=".55"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>'+
    '<radialGradient id="tt-cell" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#d8fff7" stop-opacity=".6"/><stop offset=".5" stop-color="#5ee6d0" stop-opacity=".28"/><stop offset="1" stop-color="#5ee6d0" stop-opacity=".08"/></radialGradient>'+
    '<radialGradient id="tt-celln" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#efeaff" stop-opacity=".6"/><stop offset=".5" stop-color="#a99bff" stop-opacity=".3"/><stop offset="1" stop-color="#a99bff" stop-opacity=".08"/></radialGradient>'+
    '<radialGradient id="tt-cellg" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff6d8" stop-opacity=".7"/><stop offset=".5" stop-color="#ffd166" stop-opacity=".35"/><stop offset="1" stop-color="#ffb347" stop-opacity=".1"/></radialGradient>'+
    // ombre chinoise d'un APEX : la forme du jeu, remplie de noir, avec un liseré de lumière
    '<filter id="tt-sil" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 1  0 0 0 0 .84  0 0 0 0 .6  0 0 0 .9 0" result="rim"/><feMorphology in="SourceAlpha" operator="erode" radius=".7" result="in"/><feColorMatrix in="in" type="matrix" values="0 0 0 0 .05  0 0 0 0 .06  0 0 0 0 .07  0 0 0 1 0" result="dark"/><feMerge><feMergeNode in="rim"/><feMergeNode in="dark"/></feMerge></filter>'+
    '<filter id="tt-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter></defs>';
  // ciel, soleil levant et horizon
  s+='<rect width="1200" height="700" fill="url(#tt-sea)"/><rect width="1200" height="252" fill="url(#tt-sky)"/><rect width="1200" height="410" fill="url(#tt-sun)"/>';
  s+='<path d="M0 252 L1200 252 L1200 260 L0 260Z" fill="#ffe3b0" fill-opacity=".35"/>';
  // les ptérosaures planent dans le ciel du soir
  const dino=id=>DINOS.find(d=>d.id===id);
  const apex=(id,x,y,sc,flip)=>'<g transform="translate('+x+" "+y+") scale("+(flip?-sc:sc)+" "+sc+')" filter="url(#tt-sil)">'+dino(id).svg().replace(/id="g-/g,'id="tt-g-').replace(/url\(#g-/g,"url(#tt-g-")+"</g>";
  s+=apex("ptero",735,168,.6,false)+apex("ptero",690,34,1.15,false);
  // la forêt originelle : des troncs immenses dont la cime se perd au-dessus du cadre
  const trunk=(x,base,w,col,bark)=>{const top=-160,fl=w*0.9;let t='<path d="M'+(x-w/2-fl)+" "+base+" Q"+(x-w/2)+" "+(base-6)+" "+(x-w/2)+" "+(base-w*1.2)+" L"+(x-w*0.42)+" "+top+" L"+(x+w*0.42)+" "+top+" L"+(x+w/2)+" "+(base-w*1.2)+" Q"+(x+w/2)+" "+(base-6)+" "+(x+w/2+fl)+" "+base+'Z" fill="'+col+'"/>';
    if(bark)for(let k=0;k<4;k++){const bx=x-w*0.3+k*w*0.2;t+='<path d="M'+bx.toFixed(1)+" "+(base-w*0.6)+" L"+(bx+(k%2?2:-2)).toFixed(1)+' 0" stroke="'+bark+'" stroke-width="'+Math.max(1.5,w*0.05).toFixed(1)+'" fill="none"/>';}
    return t;};
  const canopy=(cx,cy,spread,n,col,hi)=>{let a="",b="";for(let i=0;i<n;i++){const x=cx+(R()-0.5)*spread,y=cy+(R()-0.5)*spread*0.35,r=spread*(0.16+R()*0.14);a+='<ellipse cx="'+(x-r*0.12).toFixed(1)+'" cy="'+(y-r*0.16).toFixed(1)+'" rx="'+(r*1.2).toFixed(1)+'" ry="'+(r*0.78).toFixed(1)+'" fill="'+hi+'"/>';b+='<ellipse cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="'+(r*1.2).toFixed(1)+'" ry="'+(r*0.75).toFixed(1)+'" fill="'+col+'"/>';}return a+b;};
  const fern=(x,base,h,col)=>{let t='<g fill="none" stroke="'+col+'" stroke-linecap="round"><path d="M'+x+" "+base+" Q"+(x+3)+" "+(base-h/2)+" "+x+" "+(base-h)+'" stroke-width="5"/>';
    for(let k=0;k<9;k++){const a=-Math.PI+k*Math.PI/8,L=h*0.55;t+='<path d="M'+x+" "+(base-h)+" Q"+(x+Math.cos(a)*L*0.6).toFixed(1)+" "+(base-h-L*0.3).toFixed(1)+" "+(x+Math.cos(a)*L).toFixed(1)+" "+(base-h+L*0.35).toFixed(1)+'" stroke-width="3.5"/>';}
    return t+"</g>";};
  s+='<g transform="translate(0 80)">';
  // plan lointain, voilé de brume dorée : la canopée forme un plafond
  [[935,16],[1000,20],[1062,18],[1120,22],[1185,18]].forEach(t=>{s+=trunk(t[0],166,t[1],"#5a5448");});
  s+=canopy(960,6,150,9,"#57524a","#8f7f66")+canopy(1100,-4,190,11,"#57524a","#8f7f66");
  s+='<rect x="820" y="40" width="380" height="132" fill="url(#tt-haze)"/>';
  // la terre ferme
  s+='<path d="M780 178 Q850 160 920 157 L1200 152 L1200 180Z" fill="url(#tt-land)"/>';
  s+='<path d="M780 178 Q850 166 930 165 L1200 161" stroke="#ffe9c4" stroke-opacity=".5" stroke-width="2" fill="none"/>';
  // le Brachiosaure, pourtant le plus grand de tous, n'arrive qu'aux premières branches
  s+='<circle cx="1030" cy="100" r="190" fill="url(#tt-halog)"/>'+apex("brachio",900,14,2.7,false);
  // plan proche : deux géants sombres qui encadrent la scène
  s+=fern(1150,170,46,"#18231a")+fern(905,172,40,"#18231a");
  s+=trunk(858,178,46,"#141a15","#232b22")+trunk(1182,174,62,"#141a15","#232b22");
  s+=canopy(880,-6,170,10,"#141c16","#3f4a2e")+canopy(1185,-48,190,12,"#141c16","#3f4a2e")+canopy(1030,-82,320,14,"#121812","#3a4430");
  s+='<path d="M800 180 Q940 200 1040 196 Q1120 194 1200 190 L1200 240 Q1080 236 980 222 Q900 206 800 180Z" fill="#2a3a36" fill-opacity=".55"/></g>';
  // rayons de lumière qui plongent
  [[700,90],[820,70],[930,110],[1040,80],[1140,60],[600,60]].forEach((r,i)=>{s+='<polygon class="ray r'+(i%3)+'" points="'+(r[0]-r[1]/2)+',260 '+(r[0]+r[1]/2)+',260 '+(r[0]-180+r[1])+',700 '+(r[0]-260)+',700" fill="url(#tt-ray)"/>';});
  // silhouettes lointaines : un léviathan dans le bleu
  s+='<g opacity=".22" filter="url(#tt-blur)"><path d="M120 300 C200 250 340 250 420 290 C460 310 470 330 430 340 C330 360 200 350 120 330 C80 320 80 310 120 300Z" fill="#031018"/><path d="M120 310 L40 270 L60 320 L40 360Z" fill="#031018"/></g>';
  // le sillage lumineux de l'évolution
  s+='<path d="'+ttPath()+'" fill="none" stroke="#5ee6d0" stroke-opacity=".18" stroke-width="10" stroke-linecap="round"/>';
  const halo=(x,y,r,g)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="url(#'+(g||"tt-halo")+')"/>';
  // 1 · procaryote
  s+=halo(720,640,60)+'<g class="bob b1" transform="translate(720 640) rotate(-24)"><path d="M-22 0 C-36 -8 -44 8 -58 0 S-76 -6 -86 2" stroke="#9fd8cf" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="-24" y="-11" width="48" height="22" rx="11" fill="url(#tt-cell)" stroke="#5ee6d0" stroke-width="2.4"/><path d="M-12 0 q5 -6 10 0 t10 0 t10 0" stroke="#a99bff" stroke-width="2" fill="none"/></g>';
  // 2 · eucaryote
  s+=halo(830,555,80,"tt-halo")+'<g class="bob b2" transform="translate(830 555)"><circle r="38" fill="url(#tt-celln)" stroke="#a99bff" stroke-width="2.6"/><circle r="32" fill="none" stroke="#a99bff" stroke-opacity=".45" stroke-dasharray="3 4"/><circle cx="-6" cy="-4" r="14" fill="#3a2f78" stroke="#cfc6ff" stroke-width="2"/><circle cx="-2" cy="-8" r="4.5" fill="#8d80ff"/>'+
    '<g transform="translate(18 14) rotate(30)"><ellipse rx="12" ry="7" fill="#1d4a30" stroke="#7fd36b" stroke-width="2"/><path d="M-8 0 q2 -5 4 0 t4 0 t4 0 t4 0" stroke="#7fd36b" fill="none"/></g><ellipse cx="16" cy="-20" rx="6" ry="4" fill="#4a3a14" stroke="#ffe07a" stroke-width="1.6"/></g>';
  // 3 · colonie
  s+=halo(925,440,100)+'<g class="bob b3" transform="translate(925 440)"><circle r="58" fill="#5ee6d0" fill-opacity=".05" stroke="#5ee6d0" stroke-opacity=".5" stroke-width="2"/>';
  const cc=["#5ee6d0","#ffe07a","#ef7fa6","#a99bff","#f3b562","#4fc3f7","#b8e05a"];
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=Math.cos(a)*32,y=Math.sin(a)*32;s+='<line x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+cc[i+1]+'" stroke-opacity=".6" stroke-width="3"/>';}
  for(let i=0;i<7;i++){const a=i/6*Math.PI*2,x=i===6?0:Math.cos(a)*32,y=i===6?0:Math.sin(a)*32,c=cc[(i+1)%7];s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="14" fill="#0b2a32" stroke="'+c+'" stroke-width="2.4"/><circle cx="'+(x-3).toFixed(1)+'" cy="'+(y-3).toFixed(1)+'" r="4.5" fill="'+c+'" fill-opacity=".8"/>';}
  s+='</g>';
  // 4 · pluricellulaire : un nageur segmenté
  s+=halo(990,315,110,"tt-halog")+'<g class="bob b4" transform="translate(990 315) rotate(-38)">';
  for(let i=6;i>=0;i--){const x=-i*15,r=17-i*1.6;s+='<path d="M'+(x-2)+' '+(-r)+' q-8 -10 -14 -12 M'+(x-2)+' '+r+' q-8 10 -14 12" stroke="#ffb347" stroke-opacity=".75" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="'+x+'" rx="'+(r*0.7).toFixed(1)+'" ry="'+r.toFixed(1)+'" fill="url(#tt-cellg)" stroke="#ffd166" stroke-width="2"/>';}
  s+='<path d="M-104 0 q-16 -14 -30 -8 M-104 0 q-16 14 -30 8" stroke="#ffd166" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 -9 q22 -10 26 6 q-10 -4 -18 4 M14 9 q22 10 26 -6 q-10 4 -18 -4" fill="#ffd166" fill-opacity=".85"/><circle cx="8" cy="-8" r="3.4" fill="#fff"/><circle cx="8" cy="8" r="3.4" fill="#fff"/><circle cx="9" cy="-8" r="1.5" fill="#1a1206"/><circle cx="9" cy="8" r="1.5" fill="#1a1206"/></g>';
  // l'eau frémit là où la vie sort de l'eau
  s+='<ellipse cx="880" cy="262" rx="60" ry="4" fill="none" stroke="#e8fff8" stroke-opacity=".5"/><ellipse cx="880" cy="262" rx="96" ry="7" fill="none" stroke="#e8fff8" stroke-opacity=".22"/>';
  // des rivaux tapis dans le noir
  [[420,660,7],[300,560,6],[640,690,5],[180,640,8],[760,640,6]].forEach(e=>{s+='<circle cx="'+e[0]+'" cy="'+e[1]+'" r="'+e[2]+'" fill="#2a1414" stroke="#ff8a7a" stroke-width="1.6" stroke-opacity=".8"/><circle cx="'+e[0]+'" cy="'+e[1]+'" r="'+(e[2]*2.4)+'" fill="#ff8a7a" fill-opacity=".06"/>';});
  return s+"</svg>";
}
// calque net : neige marine, sillage animé et jalons
function titleOver(narrow,px){
  const R=mulberry32(77);
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" preserveAspectRatio="'+(narrow?"xMaxYMid":"xMidYMid")+' slice" aria-hidden="true"'+(px?' shape-rendering="crispEdges"':"")+">";
  let sn1="",sn2="";for(let i=0;i<90;i++){const x=(R()*1200).toFixed(0),y=(185+R()*515).toFixed(0),r=0.8+R()*1.8,o=(0.12+R()*0.3).toFixed(2);
    const c=px?'<rect x="'+x+'" y="'+y+'" width="'+Math.round(r*2.2)+'" height="'+Math.round(r*2.2)+'" fill="#cfeef0" fill-opacity="'+o+'"/>':'<circle cx="'+x+'" cy="'+y+'" r="'+r.toFixed(1)+'" fill="#cfeef0" fill-opacity="'+o+'"/>';if(i%2)sn1+=c;else sn2+=c;}
  s+='<g class="snow s1">'+sn1+'</g><g class="snow s2">'+sn2+'</g>';
  s+='<path class="trail" d="'+ttPath()+'" fill="none" stroke="#bff7ec" stroke-opacity=".7" stroke-width="'+(px?3:2)+'" stroke-dasharray="'+(px?"4 9":"2 10")+'" stroke-linecap="'+(px?"butt":"round")+'"/>';
  const font=px?'"Pixelify Sans",monospace':"IBM Plex Mono,monospace";
  [[STAGE_NAME[1].toUpperCase(),720,640,40,40],[STAGE_NAME[2].toUpperCase(),830,555,52,6],[STAGE_NAME[3].toUpperCase(),925,440,74,6],[STAGE_NAME[4].toUpperCase(),990,315,180,50,1],["APEX",1005,238,-125,34,1]].forEach(l=>{s+='<text x="'+(l[1]+l[3])+'" y="'+(l[2]+l[4])+'"'+(l[5]?' text-anchor="'+(l[5]==="m"?"middle":"end")+'"':"")+' font-family=\''+font+'\' font-size="'+(px?17:15)+'" letter-spacing="2" fill="#d9f6f1" fill-opacity=".85" paint-order="stroke" stroke="#02060b" stroke-opacity=".6" stroke-width="3">'+l[0]+'</text>';});
  return s+"</svg>";
}
// en style pixel, le décor est rendu en basse résolution puis agrandi sans lissage
function titlePixel(narrow,tries){
  const cv=document.querySelector(".title .tpx");if(!cv)return;
  /* dans un cadre (artefact, iframe), la fenêtre peut mesurer 0 au chargement : on attend qu'elle ait une vraie taille */
  const vw=window.innerWidth||document.documentElement.clientWidth,vh=window.innerHeight||document.documentElement.clientHeight;
  if(vw<50||vh<50){if((tries||0)<60)setTimeout(()=>titlePixel(narrow,(tries||0)+1),100);return;}
  const w=Math.max(200,Math.min(520,Math.round(vw/3.6))),h=Math.max(120,Math.round(w*vh/vw));
  rasterize(titleArt(narrow,[w,h]),w,h,c=>{if(!cv.isConnected)return;cv.width=w;cv.height=h;const g=cv.getContext("2d");g.drawImage(c,0,0);
    // palette réduite : les dégradés deviennent des aplats, comme en pixel art
    try{const im=g.getImageData(0,0,w,h),d=im.data,q=14;for(let i=0;i<d.length;i+=4){d[i]=Math.round(d[i]/q)*q;d[i+1]=Math.round(d[i+1]/q)*q;d[i+2]=Math.round(d[i+2]/q)*q;}g.putImageData(im,0,0);}catch(e){}});
}
function showTitle(){
  const narrow=window.innerWidth<760;
  const px=isPixel();
  let h='<div class="picker title"><div class="tbg">'+(px?'<canvas class="tpx" width="2" height="2"></canvas>':titleArt(narrow))+titleOver(narrow,px)+'</div><div class="tscrim"></div><div class="tin">';
  h+='<div class="tkick">'+tr("Stratégie en temps réel · Serveur de 30 jours · 500 organismes","Real-time strategy · 30-day server · 500 organisms")+"</div>";
  h+='<h1 class="tlogo">ORIGINS<span>27</span></h1>';
  h+='<div class="tbadges"><span class="tb1">FREE TO PLAY</span><span class="tb2">NO PAY TO WIN</span><small>'+tr("100 % gratuit : aucun achat ne donne d’avantage.","100% free: no purchase gives any advantage.")+"</small></div>";
  h+='<p class="thook">'+tr("Vous naissez bactérie dans un monde hostile.<br>Irez-vous au bout du chemin pour devenir <b>l’APEX légendaire</b> ?","You are born a bacterium in a hostile world.<br>Will you go all the way to become <b>the legendary APEX</b>?")+"</p>";
  h+='<p class="tsub">'+tr("Évoluez au détriment de vos rivaux, formez une colonie avec vos alliés, gérez vos troupes et vos ressources : soyez celui qui façonnera le monde de demain… ou pas.","Evolve at your rivals’ expense, form a colony with your allies, manage your troops and resources: be the one who will shape tomorrow’s world… or not.")+"</p>";
  h+='<div class="tcta">'+(S?'<button class="btn tbig" data-act="closeintro">'+tr("Reprendre ma partie","Resume my game")+'</button><button class="btn alt" data-act="slide" data-i="0">'+tr("L’histoire","The story")+"</button>":'<button class="btn tbig" data-act="quickstart">'+tr("Jouer maintenant","Play now")+'</button><button class="btn alt" data-act="tostrains">'+tr("Choisir ma souche","Choose my strain")+'</button><button class="btn alt" data-act="slide" data-i="0">'+tr("L’histoire","The story")+"</button>")+"</div>";
  const st=["#5ee6d0","#a99bff","#4fc3f7","#ffd166","#ff9e6b"];
  const F=[
    [tr("Évoluez","Evolve"),tr("Aucune partie ne ressemble à la précédente : les chemins de l’évolution changent et se tirent au hasard. Réflexion et analyse feront votre domination.","No two games are alike: evolution’s paths change and are drawn at random. Thought and analysis will make you dominant."),'<div class="tstages">'+st.map((c,i)=>'<i style="--c:'+c+';--s:'+(8+i*3)+'px"></i>').join("")+"</div>"],
    [tr("Pillez","Raid"),tr("499 autres organismes convoitent votre place. Le meilleur moyen de la garder ? Ne pas leur laisser le choix.","499 other organisms covet your place. The best way to keep it? Leave them no choice."),'<div class="ticons">'+["tox","pha","par","enz","har"].map(k=>unitIcon(k)).join("")+"</div>"],
    [tr("Commandez","Command"),tr("Vos troupes évoluent au fil des semaines, du rang T1 au légendaire T5. Combinez vos gènes pour forger les meilleures.","Your troops evolve over the weeks, from rank T1 to legendary T5. Combine your genes to forge the best."),'<div class="ticons">'+["sold","tox","colo","pluri","anom"].map(k=>unitIcon(k)).join("")+"</div>"],
    [tr("Dominez","Dominate"),tr("Classement mondial, ligues et compétitions : des récompenses chaque jour pour creuser votre avance.","World ranking, leagues and competitions: rewards every day to widen your lead."),'<div class="tleague">'+LEAGUES.slice().reverse().map(l=>"<span>"+l[1]+"</span>").join("")+"</div>"]];
  h+='<div class="tfeats">'+F.map(f=>'<div class="tfeat">'+f[2]+"<h3>"+f[0]+"</h3><p>"+f[1]+"</p></div>").join("")+"</div>";
  h+='<div class="tfoot">Free to play · No pay to win · '+tr("Sans installation · Jouable sur mobile","No install · Playable on mobile")+' · <button class="tfb" data-act="feedback">'+tr("✉ Donner mon avis","✉ Give feedback")+'</button> · <button class="tfb" data-act="lang">'+tr("🌐 English","🌐 Français")+"</button></div>";
  h+="</div></div>";
  $("picker").innerHTML=h;
  if(px)titlePixel(narrow);
}
document.addEventListener("keydown",e=>{const pk=$("picker");if(!pk||!pk.querySelector(".intro"))return;const cur=[...pk.querySelectorAll(".dots i")].findIndex(d=>d.classList.contains("on"));if(e.key==="ArrowRight")showIntro(cur+1);if(e.key==="ArrowLeft")showIntro(cur-1);});

