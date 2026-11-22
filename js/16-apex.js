/* Origins 27 · 16-apex.js
   Lignées de l'APEX : les dinosaures en pixel art.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Lignées de l’APEX : dinosaures originaux en pixel art (vue de profil, tournés vers la droite) */
const DGRAD=(id,top,bot)=>'<linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+top+'"/><stop offset="1" stop-color="'+bot+'"/></linearGradient>';
const OL='#1a1410';
const DINOS=[
 {id:"trex",spr:"d_trex",name:"Tyrannosaure",grp:"pred",role:"Le grand prédateur : une mâchoire capable de broyer l’os.",
  svg:()=>'<defs>'+DGRAD("g-trex","#5a4128","#c2a77a")+'</defs>'+
   '<path d="M44 34 L41 47 L45 52 L37 52 L36 46 L38 34Z" fill="#4a3620" stroke="'+OL+'"/>'+
   '<path d="M2 24 C14 20 30 17 44 17 C54 16 62 17 68 19 C72 15 78 12 86 12 C92 12 95 15 95 18 L87 20 L93 21 L91 24 L81 24 C75 26 71 29 67 31 C65 35 61 37 57 37 L59 47 L63 52 L55 52 L53 46 L49 37 C45 37 41 35 39 32 C31 29 16 27 2 24Z" fill="url(#g-trex)" stroke="'+OL+'"/>'+
   '<path d="M86 21 l1 2 l1 -2 l1 2 l1 -2 l1 2" stroke="#efe6d0" stroke-width=".8" fill="none"/><circle cx="85" cy="15" r="1" fill="#e8b84a"/><path d="M68 29 l3 2 l-1 2" stroke="'+OL+'" fill="none"/>'+
   '<path d="M30 19 l2 4 M38 18 l2 4 M46 17 l2 4 M54 17 l2 4" stroke="#3a2a18" stroke-width="1.2"/>'},
 {id:"raptor",spr:"d_raptor",name:"Dromaéosaure",grp:"pred",role:"Le chasseur en meute : plumes, griffe en faucille, vitesse.",
  svg:()=>'<defs>'+DGRAD("g-rap","#3e4a5a","#b8b4a0")+'</defs>'+
   '<path d="M46 34 L44 44 L47 48 L41 48 L40 43 L41 34Z" fill="#323c48" stroke="'+OL+'"/>'+
   '<path d="M4 20 C20 19 34 19 44 20 C50 19 56 19 60 21 C63 16 68 13 74 13 C80 13 84 15 85 17 L77 19 C73 21 69 24 67 27 C65 30 61 32 57 32 L59 42 L63 46 L57 46 L56 44 L54 40 L51 32 C47 32 43 30 41 27 C32 24 18 22 4 20Z" fill="url(#g-rap)" stroke="'+OL+'"/>'+
   '<path d="M4 19 l-2 -2 M8 19 l-2 -3 M12 19 l-1 -3 M66 26 l-4 6 M64 27 l-5 4" stroke="#6a5a48" stroke-width="1.2"/>'+
   '<path d="M56 46 q-2 -4 1 -6" stroke="#efe6d0" fill="none"/><circle cx="76" cy="15" r=".9" fill="#e8b84a"/><path d="M70 12 l2 -3 l1 3" stroke="#6a5a48" fill="none"/>'},
 {id:"brachio",spr:"d_brachio",name:"Brachiosaure",grp:"geant",role:"Le géant : brouter la cime des arbres, inaccessible aux autres.",
  svg:()=>'<defs>'+DGRAD("g-bra","#5c6470","#b6b8b0")+'</defs>'+
   '<path d="M30 40 L29 54 L35 54 L36 40Z M62 36 L62 54 L68 54 L68 36Z" fill="#4a525c" stroke="'+OL+'"/>'+
   '<path d="M6 40 C14 36 22 32 30 30 C40 26 52 26 62 28 C66 22 70 14 74 8 C76 4 80 2 84 3 C88 3 90 5 89 7 L84 8 C80 12 76 20 74 30 C74 36 72 40 68 42 L70 54 L64 54 L62 44 C52 44 42 44 36 42 L36 54 L30 54 L30 42 C22 42 14 42 6 40Z" fill="url(#g-bra)" stroke="'+OL+'"/>'+
   '<circle cx="85" cy="4.6" r=".8" fill="#111"/><path d="M76 10 l2 -2 M75 14 l2 -2 M74 18 l2 -2 M73 22 l2 -2" stroke="#8a2a24" stroke-width="1"/>'},
 {id:"diplo",spr:"d_diplo",name:"Diplodocus",grp:"geant",role:"Le géant à long cou : une queue en fouet pour se défendre.",
  svg:()=>'<defs>'+DGRAD("g-dip","#5a5e58","#bfb39a")+'</defs>'+
   '<path d="M34 36 L33 50 L39 50 L39 36Z M56 36 L56 50 L62 50 L62 36Z" fill="#4a4c46" stroke="'+OL+'"/>'+
   '<path d="M1 34 C10 34 20 30 30 26 C40 22 54 22 64 26 C72 22 82 18 90 16 C93 15 95 17 94 19 L88 21 C80 24 72 30 68 34 C66 38 64 40 62 40 L64 50 L58 50 L56 40 C48 41 42 41 38 40 L38 50 L32 50 L32 38 C22 36 12 36 1 34Z" fill="url(#g-dip)" stroke="'+OL+'"/>'+
   '<path d="M40 22 l2 -2 M48 21 l2 -2 M56 22 l2 -2" stroke="#3a3a34"/><circle cx="91" cy="17" r=".7" fill="#111"/>'},
 {id:"trice",spr:"d_trice",name:"Tricératops",grp:"arme",role:"Le cornu : trois cornes et une collerette face aux prédateurs.",
  svg:()=>'<defs>'+DGRAD("g-tri","#4c583a","#a4a47a")+DGRAD("g-fr","#8a6a44","#5a4630")+'</defs>'+
   '<path d="M28 38 L27 50 L33 50 L34 38Z M54 38 L54 50 L60 50 L60 38Z" fill="#3e4830" stroke="'+OL+'"/>'+
   '<path d="M4 32 C10 30 16 26 22 24 C34 18 52 18 62 24 C68 28 70 34 66 38 L66 50 L60 50 L58 42 C48 44 40 44 34 42 L34 50 L28 50 L26 40 C18 38 10 36 4 32Z" fill="url(#g-tri)" stroke="'+OL+'"/>'+
   '<path d="M64 14 C58 18 58 30 64 36 C70 38 76 34 76 26 C76 18 70 12 64 14Z" fill="url(#g-fr)" stroke="#b39a6c"/>'+
   '<path d="M68 26 C72 22 80 22 86 26 L92 32 L88 36 C82 38 74 36 70 32Z" fill="#6b7150" stroke="'+OL+'"/>'+
   '<path d="M74 22 L92 12 L76 25Z M78 23 L94 16 L80 26Z" fill="#e9dfc6" stroke="'+OL+'" stroke-width=".6"/><path d="M86 27 L89 21 L88 28Z" fill="#e9dfc6"/><circle cx="76" cy="27" r=".8" fill="#111"/>'},
 {id:"anky",spr:"d_anky",name:"Ankylosaure",grp:"arme",role:"Le blindé : une armure d’os et une massue au bout de la queue.",
  svg:()=>'<defs>'+DGRAD("g-ank","#6a5632","#b8a274")+'</defs>'+
   '<path d="M30 40 L29 48 L35 48 L36 40Z M58 40 L58 48 L64 48 L64 40Z" fill="#4e4026" stroke="'+OL+'"/>'+
   '<ellipse cx="8" cy="36" rx="6" ry="4" fill="#7a6440" stroke="'+OL+'"/>'+
   '<path d="M12 36 C20 34 24 30 30 27 C42 21 60 21 70 27 C76 30 80 34 82 36 C86 34 90 35 91 38 C90 41 86 42 82 41 L76 41 C70 42 66 42 64 42 L64 48 L58 48 L56 42 C48 43 42 43 36 42 L36 48 L30 48 L28 41 C22 40 16 38 12 36Z" fill="url(#g-ank)" stroke="'+OL+'"/>'+
   [[36,26],[44,24],[52,24],[60,25],[40,30],[48,29],[56,29],[64,30],[32,32],[70,32]].map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1.6" fill="#d8c8a0" stroke="#5a4628" stroke-width=".5"/>').join("")+
   '<path d="M84 34 l2 -3 M80 33 l1 -3" stroke="'+OL+'"/><circle cx="87" cy="37" r=".7" fill="#111"/>'},
 {id:"stego",spr:"d_stego",name:"Stégosaure",grp:"arme",role:"Les plaques et les piques : impressionner, puis frapper.",
  svg:()=>'<defs>'+DGRAD("g-ste","#4e5a3c","#aeb084")+'</defs>'+
   [[22,27,6],[30,22,9],[38,19,11],[47,18,12],[56,19,11],[64,23,8]].map(p=>'<path d="M'+(p[0]-4)+' '+(p[1]+3)+' L'+(p[0]-1)+' '+(p[1]-p[2])+' L'+(p[0]+2)+' '+(p[1]-p[2]+1)+' L'+(p[0]+4)+' '+(p[1]+3)+'Z" fill="#c26a3a" stroke="'+OL+'" stroke-width=".7"/>').join("")+
   '<path d="M30 40 L29 50 L35 50 L36 40Z M60 40 L60 50 L66 50 L65 40Z" fill="#3e4830" stroke="'+OL+'"/>'+
   '<path d="M4 30 C12 30 18 28 24 26 C34 20 54 18 64 24 C70 28 72 34 76 36 C80 37 86 38 88 40 C87 42 84 43 80 42 L70 42 L66 50 L60 50 L60 42 C50 44 42 44 36 42 L36 50 L30 50 L28 40 C18 38 10 34 4 30Z" fill="url(#g-ste)" stroke="'+OL+'"/>'+
   '<path d="M6 30 L2 24 M10 31 L6 25 M6 31 L1 34 M10 32 L5 36" stroke="#e9dfc6" stroke-width="1.2"/><circle cx="84" cy="39" r=".7" fill="#111"/>'},
 {id:"para",spr:"d_para",name:"Parasaurolophe",grp:"arme",role:"Le troupeau : une crête creuse qui résonne pour alerter les siens.",
  svg:()=>'<defs>'+DGRAD("g-par","#5a6a4a","#c4bc92")+'</defs>'+
   '<path d="M46 36 L44 50 L50 50 L50 36Z" fill="#46543a" stroke="'+OL+'"/>'+
   '<path d="M4 26 C16 24 28 22 40 22 C50 20 58 20 64 22 C68 18 72 15 76 14 C82 13 88 15 90 18 L86 21 L80 20 C76 22 72 26 70 30 C68 34 64 36 60 36 L62 50 L56 50 L54 38 C48 38 42 36 38 32 C28 30 16 28 4 26Z" fill="url(#g-par)" stroke="'+OL+'"/>'+
   '<path d="M74 14 C70 10 62 6 56 6 C58 8 66 12 72 16Z" fill="#c26a3a" stroke="'+OL+'" stroke-width=".7"/><path d="M68 28 l2 6" stroke="'+OL+'"/><circle cx="80" cy="16" r=".8" fill="#111"/>'},
 {id:"ptero",spr:"d_ptero",name:"Ptérosaure",grp:"vol",role:"Le maître du ciel : des ailes de peau tendues sur un doigt géant.",
  svg:()=>'<defs>'+DGRAD("g-pte","#4a3a3e","#b8a090")+'</defs>'+
   '<path d="M8 34 C20 24 34 18 44 22 L50 26 L60 22 C70 18 82 22 92 32 C80 30 68 30 58 32 L50 34 L42 32 C30 30 18 32 8 34Z" fill="url(#g-pte)" stroke="'+OL+'"/>'+
   '<path d="M48 26 C52 22 56 18 62 14 C66 12 74 10 82 10 L74 13 C68 15 62 18 58 22Z" fill="#8a6a5a" stroke="'+OL+'"/><path d="M60 15 C58 10 54 6 50 4 C56 6 60 10 62 13Z" fill="#c26a3a" stroke="'+OL+'" stroke-width=".6"/>'+
   '<circle cx="64" cy="15" r=".8" fill="#111"/><path d="M46 34 l-2 6 M50 34 l1 6" stroke="'+OL+'"/>'},
 {id:"archeo",spr:"d_archeo",name:"Oiseau primitif",grp:"vol",role:"Le dinosaure qui a appris à voler : la lignée qui survivra.",
  svg:()=>'<defs>'+DGRAD("g-arc","#2e3a44","#8c8a7a")+'</defs>'+
   '<path d="M22 30 C30 22 40 18 48 20 L56 22 C62 16 70 14 76 16 L80 18 L74 20 C70 22 66 26 64 30 C62 34 56 36 50 36 L52 44 L56 46 L50 46 L48 42 L46 36 C40 36 34 34 30 32 C24 34 14 36 4 36 C12 34 18 32 22 30Z" fill="url(#g-arc)" stroke="'+OL+'"/>'+
   '<path d="M36 22 C30 12 22 8 12 8 C18 12 26 18 32 26 M40 21 C36 10 30 4 22 2 C28 8 34 16 38 24" fill="#4a5a64" stroke="'+OL+'" stroke-width=".8"/>'+
   '<path d="M4 36 l-2 -2 M8 35 l-2 -3 M12 35 l-1 -3" stroke="#6a6a5a"/><circle cx="74" cy="17" r=".8" fill="#e8b84a"/>'}
];
const DGRP={pred:{name:"Grand prédateur",col:"#ff8a7a",from:"Prédation et Perception : voies offensives, vitesse, vision."},geant:{name:"Géant herbivore",col:"#5ee6d0",from:"Énergie et Croissance : production, stockage, taille."},arme:{name:"Herbivore armé",col:"#ffe07a",from:"Carapace et défense : cornes, plaques, armure."},vol:{name:"Volant",col:"#a99bff",from:"Perception et mobilité : vision, portée, vitesse."}};
function dinoSVG(d){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 56" role="img" aria-label="'+d.name+'">'+d.svg()+"</svg>";}

function apexHTML(compact){
  let h='<div class="apexbox"><h2>Lignées de l’APEX</h2><p class="desc">La fin du serveur se joue sur la terre ferme. Votre alliance y fera régner l’une de ces lignées, selon les évolutions que ses membres auront travaillées. Aucune forme aquatique ne peut gagner.</p>';
  for(const g in DGRP){const G=DGRP[g];h+='<div class="dgroup"><h3 style="color:'+G.col+'">'+G.name+'</h3><p class="desc">Vient de : '+G.from+'</p><div class="dgrid">';
    DINOS.filter(d=>d.grp===g).forEach(d=>{h+='<div class="dcard" data-tip="'+esc("<b>"+d.name+"</b>"+d.role+"<br><span class=m>"+G.name+" · "+G.from+"</span>")+'"><div class="dart">'+(d.spr?sprImg(d.spr,2,"",d.name):artBox("dino",dinoSVG(d),96,56))+"</div><b>"+d.name+"</b>"+(compact?"":"<p>"+d.role+"</p>")+"</div>";});
    h+="</div></div>";}
  return h+"</div>";
}

