/* Origins 27 · 29-mots.js
   Mode « mots simples » (par défaut) : les termes scientifiques qui font peur sont remplacés à l’affichage
   par des mots de tous les jours (ATP → sucre, ribosomes → fabriques, vacuole → réserve…).
   · Le remplacement se fait sur le texte affiché (jamais sur la sauvegarde ni sur le code) : tout le jeu en profite,
     guide, fenêtres et infobulles compris.
   · Le vrai terme reste visible en petit sous le titre des fiches, et le Lexique (⚙ Options) explique chaque mot.
   · ⚙ Options › Vocabulaire permet de revenir aux termes scientifiques (pour les passionnés et les classes de SVT).
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const VOCAB_KEY="o27-vocab";
function vocabSimple(){try{return localStorage.getItem(VOCAB_KEY)!=="sci";}catch(e){return true;}}

/* Lexique : [mot simple, terme scientifique, explication] — dans la langue du joueur */
const LEXIQUE=[
  [tr("Sucre","Sugar"),"ATP",tr("Le carburant de la cellule : il fait tourner tout le reste.","The cell’s fuel: it powers everything else.")],
  [tr("Briques","Bricks"),tr("Protéines","Proteins"),tr("Les matériaux de construction du vivant.","The building materials of life.")],
  [tr("Graisses","Fat"),tr("Lipides","Lipids"),tr("Elle forme les parois et sert de réserve.","It forms the walls and serves as a reserve.")],
  [tr("ADN","DNA"),tr("Nucléotides","Nucleotides"),tr("Les lettres du code génétique : il en faut pour évoluer.","The letters of the genetic code: you need them to evolve.")],
  [tr("Puits","Wells"),tr("Canaux de la membrane (pompe à protons, perméase…)","Membrane channels (proton pump, permease…)"),tr("Les « champs » de votre village : ils produisent les ressources.","The “fields” of your village: they produce resources.")],
  [tr("Bâtiments","Buildings"),tr("Organites","Organelles"),tr("Les petits organes à l’intérieur de la cellule, comme les bâtiments d’un village.","The small organs inside the cell, like the buildings of a village.")],
  [tr("Fabriques","Factories"),tr("Ribosomes","Ribosomes"),tr("Elles fabriquent vos ouvrières et vos soldates.","They build your workers and soldiers.")],
  [tr("Réserve","Storehouse"),tr("Vacuole","Vacuole"),tr("Le grenier de la cellule. Une partie y est à l’abri du pillage.","The cell’s granary. Part of it is safe from raids.")],
  [tr("Centrale","Power plant"),tr("Mitochondrie","Mitochondrion"),tr("Elle produit plus de sucre.","It produces more sugar.")],
  [tr("Moteur","Motor"),tr("Flagelle","Flagellum"),tr("Une queue qui tourne : vos troupes vont plus loin et plus vite.","A spinning tail: your troops go farther and faster.")],
  [tr("Yeux","Eyes"),tr("Photorécepteurs","Photoreceptors"),tr("Ils vous font voir plus loin sur la carte.","They let you see farther on the map.")],
  [tr("Atelier à briques","Brick workshop"),tr("Réticulum","Reticulum"),tr("Il produit plus de briques.","It produces more bricks.")],
  [tr("Atelier à graisse","Fat workshop"),tr("Appareil de Golgi","Golgi apparatus"),tr("Il produit plus de graisse.","It produces more fat.")],
  [tr("Charpente","Frame"),tr("Cytosquelette","Cytoskeleton"),tr("Le squelette de la cellule : il ouvre des places pour de nouveaux bâtiments.","The cell’s skeleton: it opens room for new buildings.")],
  [tr("Ouvrières","Workers"),tr("Collectrices","Gatherers"),tr("Vos villageois : elles récoltent, chassent et pillent.","Your villagers: they gather, hunt and raid.")],
  [tr("Bactérie","Bacterium"),tr("Procaryote","Prokaryote"),tr("Votre premier stade : une cellule simple, sans noyau protégé.","Your first stage: a simple cell, with no protected nucleus.")],
  [tr("Cellule à noyau","Nucleated cell"),tr("Eucaryote","Eukaryote"),tr("Une cellule plus évoluée, avec un noyau et des centrales.","A more evolved cell, with a nucleus and power plants.")],
  [tr("Organisme","Organism"),tr("Pluricellulaire","Multicellular"),tr("Plusieurs cellules qui travaillent ensemble, chacune son métier.","Several cells working together, each with its own job.")],
  [tr("Fusion","Fusion"),tr("Endosymbiose","Endosymbiosis"),tr("Avaler une autre vie et la garder : c’est ainsi que sont nées les centrales.","Swallowing another life and keeping it: that is how power plants were born.")],
  [tr("Poison, Avaleur, Parasite, Acide, Harpon","Poison, Swallower, Parasite, Acid, Harpoon"),tr("Toxines, phagocytose, parasitisme, enzymes lytiques, harpon","Toxins, phagocytosis, parasitism, lytic enzymes, harpoon"),tr("Vos 5 façons d’attaquer. Chacune bat la suivante, comme pierre-feuille-ciseaux.","Your 5 ways to attack. Each beats the next, like rock-paper-scissors.")]
];

/* Remplacements : [motif, remplacement]. Ordre important : les tournures avec article d’abord. */
const VOCAB_FR=[
  ["l’ATP synthase","la machine à sucre"],["d’ATP","de sucre"],["d'ATP","de sucre"],["l’ATP","le sucre"],["l'ATP","le sucre"],["ATP","Sucre"],["atp","sucre"],
  ["Protéines","Briques"],["protéines","briques"],["Prot.","Briq."],["prot.","briq."],
  ["Canal lipidique","Puits à graisse"],["Lipides","Graisses"],["lipides","graisses"],["Lipi.","Gras."],["lip.","gras."],
  ["des nucléotides","de l’ADN"],["les nucléotides","l’ADN"],["de nucléotides","d’ADN"],["Nucléotides","ADN"],["nucléotides","ADN"],["Nucl.","ADN"],["nucl.","ADN"],
  ["Pompe à protons","Puits à sucre"],["pompe à protons","puits à sucre"],["Perméase","Puits à briques"],["perméase","puits à briques"],["Pore nucléique","Puits à ADN"],["pore nucléique","puits à ADN"],
  ["Nouvel organite","Nouveau bâtiment"],["nouvel organite","nouveau bâtiment"],["l’organite","le bâtiment"],["d’organite","de bâtiment"],["Organites","Bâtiments"],["organites","bâtiments"],["Organite","Bâtiment"],["organite","bâtiment"],
  ["Ribosomes","Fabriques"],["ribosomes","fabriques"],["Ribosome","Fabrique"],["ribosome","fabrique"],
  ["Vacuoles","Réserves"],["vacuoles","réserves"],["Vacuole","Réserve"],["vacuole","réserve"],
  ["Mitochondries","Centrales"],["mitochondries","centrales"],["Mitochondrie","Centrale"],["mitochondrie","centrale"],
  ["Flagelles","Moteurs"],["flagelles","moteurs"],["Flagelle","Moteur"],["flagelle","moteur"],
  ["Photorécepteurs","Yeux"],["photorécepteurs","yeux"],["Photorécepteur","Œil"],["photorécepteur","œil"],
  ["Réticulum","Atelier à briques"],["réticulum","atelier à briques"],["Appareil de Golgi","Atelier à graisse"],["appareil de Golgi","atelier à graisse"],["Golgi","Atelier à graisse"],
  ["du cytosquelette","de la charpente"],["le cytosquelette","la charpente"],["Cytosquelette","Charpente"],["cytosquelette","charpente"],
  ["Collectrices","Ouvrières"],["collectrices","ouvrières"],["Collectrice","Ouvrière"],["collectrice","ouvrière"],
  ["Procaryote","Bactérie"],["procaryote","bactérie"],["Eucaryote","Cellule à noyau"],["eucaryote","cellule à noyau"],["Pluricellulaire fortifié","Organisme fortifié"],["Pluricellulaire","Organisme"],["pluricellulaire","organisme"],
  ["Endosymbiose","Fusion"],["endosymbiose","fusion"],
  ["Enzymes lytiques","Acide"],["enzymes lytiques","acide"],["Phagocytose","Avaleur"],["phagocytose","avaleur"],["Parasitisme","Parasite"],["parasitisme","parasite"],["Toxines","Poison"]
];
const VOCAB_EN=[
  ["ATP synthase","sugar machine"],["ATP","Sugar"],["atp","sugar"],
  ["Proteins","Bricks"],["proteins","bricks"],["Prot.","Brick"],["prot.","brick"],
  ["Lipid channel","Fat well"],["Lipids","Fat"],["lipids","fat"],["Lipi.","Fat"],["lip.","fat"],
  ["Nucleotides","DNA"],["nucleotides","DNA"],["Nucl.","DNA"],["nucl.","DNA"],
  ["Proton pump","Sugar well"],["proton pump","sugar well"],["Permease","Brick well"],["permease","brick well"],["Nucleic pore","DNA well"],["nucleic pore","DNA well"],
  ["Organelles","Buildings"],["organelles","buildings"],["Organelle","Building"],["organelle","building"],
  ["Ribosomes","Factories"],["ribosomes","factories"],["Ribosome","Factory"],["ribosome","factory"],
  ["Vacuole","Storehouse"],["vacuole","storehouse"],
  ["Mitochondria","Power plants"],["mitochondria","power plants"],["Mitochondrion","Power plant"],["mitochondrion","power plant"],
  ["Flagellum","Motor"],["flagellum","motor"],["Photoreceptors","Eyes"],["photoreceptors","eyes"],
  ["Reticulum","Brick workshop"],["reticulum","brick workshop"],["Golgi apparatus","Fat workshop"],["Golgi","Fat workshop"],
  ["Cytoskeleton","Frame"],["cytoskeleton","frame"],
  ["Gatherers","Workers"],["gatherers","workers"],["Gatherer","Worker"],["gatherer","worker"],
  ["Prokaryote","Bacterium"],["prokaryote","bacterium"],["Eukaryote","Nucleated cell"],["eukaryote","nucleated cell"],["Multicellular","Organism"],["multicellular","organism"],
  ["Endosymbiosis","Fusion"],["endosymbiosis","fusion"],
  ["Lytic enzymes","Acid"],["lytic enzymes","acid"],["Phagocytosis","Swallower"],["phagocytosis","swallower"],["Parasitism","Parasite"],["parasitism","parasite"],["Toxins","Poison"]
];
let VOC=null;
function vocabBuild(){
  const L=EN?VOCAB_EN:VOCAB_FR,map=new Map(L),esc2=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  /* limites de mot sans \b (accents) : pas de lettre juste avant ni juste après */
  const re=new RegExp("(^|[^A-Za-zÀ-ÿ’'])("+L.map(p=>esc2(p[0])).join("|")+")(?![A-Za-zÀ-ÿ])","g");
  VOC={re,map,lang:EN};
}
let vocabHit=[];
function vocabText(s){
  if(!VOC||VOC.lang!==EN)vocabBuild();vocabHit=[];
  let out=s.replace(VOC.re,(m,pre,w,off)=>{let r=VOC.map.get(w);if(r==null)return m;vocabHit.push(w);
    /* majuscule en début de texte ou après un point */
    const before=s.slice(0,off+pre.length);
    if(/^[a-zà-ÿ]/.test(r)&&(before.trim()===""||/[.!?]\s+$/.test(before)))r=r[0].toUpperCase()+r.slice(1);
    return pre+r;});
  /* contractions françaises créées par un remplacement (« de le sucre » → « du sucre ») */
  if(!EN&&vocabHit.length)out=out.replace(/(^|[^A-Za-zÀ-ÿ])([dD])e le (?=[^aeiouéèêhAEIOUÉ])/g,"$1$2u ").replace(/(^|[^A-Za-zÀ-ÿ])à le (?=[^aeiouéèêhAEIOUÉ])/g,"$1au ").replace(/(^|[^A-Za-zÀ-ÿ])À le (?=[^aeiouéèêhAEIOUÉ])/g,"$1Au ").replace(/(^|[^A-Za-zÀ-ÿ])([dD])e les /g,"$1$2es ").replace(/(^|[^A-Za-zÀ-ÿ])à les /g,"$1aux ")
    .replace(/(^|[^A-Za-zÀ-ÿ])([dD])e ([aeiouéèêAEIOUÉ])/g,"$1$2’$3").replace(/(^|[^A-Za-zÀ-ÿ])([lL])e ([aeiouéèêAEIOUÉ])/g,"$1$2’$3");
  return out;
}
const VOCAB_SKIP=new Set(["SCRIPT","STYLE","TEXTAREA","INPUT","CODE","PRE"]);
/* Le vrai terme, en petit, sous le titre d’une fiche quand ce titre a été simplifié */
const VOCAB_TITLES=new Set(["H2"]);
function vocabNode(n){
  if(n.nodeType===3){const p=n.parentNode;if(!p||VOCAB_SKIP.has(p.nodeName)||(p.closest&&p.closest(".sci,[data-noword]")))return;
    const s=n.data;if(!/[A-Za-z]/.test(s))return;const t=vocabText(s);if(t===s)return;n.data=t;
    if(VOCAB_TITLES.has(p.nodeName)&&p.closest&&p.closest("#detail,#modal")&&!p.querySelector(".sci")&&vocabHit.length){const sm=document.createElement("small");sm.className="sci";sm.textContent=vocabHit.map(w=>/^[A-Z]+$/.test(w)?w:w.toLowerCase()).join(" · ");p.appendChild(sm);}
    return;}
  if(n.nodeType!==1||VOCAB_SKIP.has(n.nodeName)||(n.classList&&n.classList.contains("sci")))return;
  const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);const L=[];let x;while((x=w.nextNode()))L.push(x);L.forEach(vocabNode);
}
let vocabObs=null;
function vocabStart(){
  if(!vocabSimple()||vocabObs||typeof MutationObserver==="undefined")return;
  vocabNode(document.body);
  vocabObs=new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")vocabNode(m.target);else m.addedNodes.forEach(vocabNode);}});
  vocabObs.observe(document.body,{childList:true,subtree:true,characterData:true});
}
/* Le titre de la page (onglet du navigateur) reste « Origins 27 » : on ne touche qu’au corps de la page. */
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",vocabStart);else vocabStart();

function lexiqueHTML(){
  return '<div class="kick">📖 '+tr("Lexique","Glossary")+"</div><h2>"+tr("Les mots du jeu","The game’s words")+'</h2><p class="desc">'+(vocabSimple()?tr("Le jeu utilise des mots simples. Voici les vrais termes scientifiques, pour les curieux.","The game uses simple words. Here are the real scientific terms, for the curious."):tr("Le jeu affiche les termes scientifiques. Voici leur équivalent en mots simples.","The game shows scientific terms. Here are their plain-word equivalents."))+'</p><div class="lexique" data-noword="1">'+LEXIQUE.map(e=>'<div class="lexrow"><b>'+e[0]+'</b><span class="lexsci">'+e[1]+"</span><p>"+e[2]+"</p></div>").join("")+'</div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn alt" data-act="mclose">'+tr("Fermer","Close")+"</button></div>";
}
function vocabOptHTML(){const s=vocabSimple();
  return '<div class="optrow"><span>📖 '+tr("Vocabulaire","Vocabulary")+'<small class="desc" data-noword="1">'+tr("Mots simples (sucre, briques, fabriques…) ou vrais termes scientifiques (ATP, protéines, ribosomes…).","Simple words (sugar, bricks, factories…) or real scientific terms (ATP, proteins, ribosomes…).")+'</small></span><span class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm alt" data-act="lexique">'+tr("Lexique","Glossary")+'</button><button class="btn sm'+(s?"":" alt")+'" data-act="vocab" data-noword="1">'+(s?tr("Mots simples","Simple words"):tr("Scientifique","Scientific"))+"</button></span></div>";}
function vocabAct(a){
  if(a==="lexique"){showModal(lexiqueHTML());return true;}
  if(a==="vocab"){try{localStorage.setItem(VOCAB_KEY,vocabSimple()?"sci":"simple");}catch(e){}if(typeof save==="function")save();location.reload();return true;}
  return false;
}
