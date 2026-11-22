/* Origins 27 · 03-regles.js
   Règles de base : ressources, souches, canaux, organites, voies offensives, gènes et émergences.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const ORG_SPR={vac:"o_vac",ribo:"o_ribo",photo:"o_photo",flag:"o_flag",mito:"o_mito",reti:"o_memb",golgi:"o_golgi",cyto:"o_cyto"};
const STAGE_SPR=["c_proc","c_proc","c_euc","c_colo","c_pluri","c_pluri"];
const STAGE_NAME=["","Procaryote","Eucaryote","Colonie","Pluricellulaire","Pluricellulaire fortifié"];
const RES=["atp","prot","lip","nuc"];
const RES_NAME={atp:"ATP",prot:"Protéines",lip:"Lipides",nuc:"Nucléotides"};
const SPEEDS=[{label:"×1",v:1/60,title:"Temps réel"},{label:"×60",v:1,title:"1 seconde = 1 minute de jeu"},{label:"×600",v:10,title:"1 seconde = 10 minutes de jeu"}];
const SAVE_KEY="origins27-proto7";
try{for(let i=1;i<7;i++)localStorage.removeItem("origins27-proto"+i);}catch(e){}

const SOUCHES={
  varenne:{name:"Varenne-58",origin:"Isolée en 1958 dans une source thermale du Massif central par la Dr Hélène Varenne.",
    mods:{nucPct:.2,atpPct:-.1,evoCost:-.15},bonus:["+20 % de nucléotides","Évolution 15 % moins chère"],malus:["10 % d’ATP en moins"],trait:"Génome instable : l’arbre lui coûte moins cher.",
    stats:{"Énergie":2,"Croissance":3,"Génome":5,"Mobilité":2,"Perception":3}},
  kori:{name:"Kōri-71",origin:"Prélevée en 1971 sous la banquise de la mer d’Okhotsk par l’équipage du brise-glace Hokusei.",
    mods:{capPct:.3,atpPct:.1,speedPct:-.2},bonus:["Stockage +30 %","+10 % d’ATP"],malus:["Trajets 20 % plus lents"],trait:"Métabolisme du froid : elle accumule et attend son heure.",
    stats:{"Énergie":4,"Croissance":3,"Génome":2,"Mobilité":1,"Perception":3}},
  abyssa:{name:"Abyssa-03",origin:"Remontée en 2003 d’une cheminée hydrothermale de la dorsale médio-atlantique par le submersible Orphée.",
    mods:{visionAdd:1,richMult:.5,protPct:-.15,revealSource:1},bonus:["Vision +1 case","Sources hydrothermales +50 %"],malus:["15 % de protéines en moins"],trait:"Mémoire des failles : elle sait où se trouve la source.",
    stats:{"Énergie":3,"Croissance":2,"Génome":3,"Mobilité":2,"Perception":5}},
  ilheu:{name:"Ilhéu-89",origin:"Isolée en 1989 dans la vase d’une mangrove de l’estuaire de l’Amazone par le Pr Tomás Ilhéu.",
    mods:{protPct:.2,chargePct:.2,nucPct:-.15,predPct:.1},bonus:["+20 % de protéines","Collectrices +20 % de charge","Chasse +10 %"],malus:["15 % de nucléotides en moins"],trait:"Vorace : elle grandit vite, mais évolue lentement.",
    stats:{"Énergie":3,"Croissance":5,"Génome":1,"Mobilité":3,"Perception":2}}
};
const FIELD={
  atp:{name:"Pompe à protons",role:"Fait tourner l’ATP synthase : produit de l’ATP."},
  prot:{name:"Perméase",role:"Fait entrer les acides aminés : produit des protéines."},
  lip:{name:"Canal lipidique",role:"Capte les acides gras : produit des lipides."},
  nuc:{name:"Pore nucléique",role:"Importe les bases azotées : produit des nucléotides."}
};
const FIELD_ORDER=["atp","prot","lip","nuc"],FIELD_MAX=15;
function fAng(i){return -Math.PI/2+Math.PI/4+i*Math.PI/2;}
const FIELD_BASE={atp:30,prot:40,lip:35,nuc:10};
const BLD={
  noyau:{name:"Noyau",short:"Accélère les constructions, débloque des organites.",role:"Le cœur de la cellule. Chaque niveau accélère toutes les constructions de 6 %, ajoute 5 % de nucléotides et, tous les deux niveaux, un filament de plus.",base:{prot:150,lip:120,atp:100,nuc:40},t:15,max:10,req:[]},
  vac:{name:"Vacuole",short:"Stockage et cachette.",role:"L’entrepôt : augmente la capacité de stockage et met une part de chaque ressource à l’abri du pillage.",base:{prot:80,lip:120,atp:60,nuc:0},t:8,max:10,req:[["b","noyau",1]]},
  ribo:{name:"Ribosomes",short:"Fabrique toutes vos troupes.",role:"La caserne de la cellule : fabriquent toutes vos troupes, plus vite à chaque niveau. Aux niveaux 3, 6 et 9, une chaîne de production de plus s’ouvre (jusqu’à 4 troupes à la fois). La production se lance aussi depuis le noyau.",base:{prot:140,lip:60,atp:90,nuc:20},t:10,max:10,req:[["b","noyau",2]]},
  photo:{name:"Photorécepteurs",short:"Vision dans le noir.",role:"La tour de guet : élargissent la vision dans le noir des abysses.",base:{prot:110,lip:80,atp:100,nuc:30},t:10,max:10,req:[["b","noyau",2]]},
  flag:{name:"Flagelle",short:"Vitesse et portée.",role:"La place de rassemblement : accélère les collectrices, allonge leur portée et celle des filaments.",base:{prot:120,lip:90,atp:140,nuc:0},t:12,max:10,req:[["b","ribo",1]]},
  mito:{name:"Mitochondrie",short:"+8 % d’ATP par niveau.",role:"Amplifie la production d’ATP de 8 % par niveau.",base:{prot:160,lip:120,atp:60,nuc:20},t:14,max:5,req:[["b","noyau",3],["f","atp",3]]},
  reti:{name:"Réticulum",short:"+8 % de protéines par niveau.",role:"Amplifie la production de protéines de 8 % par niveau.",base:{prot:60,lip:120,atp:160,nuc:20},t:14,max:5,req:[["b","noyau",3],["f","prot",3]]},
  golgi:{name:"Appareil de Golgi",short:"+8 % de lipides par niveau.",role:"Amplifie la production de lipides de 8 % par niveau. Indispensable pour sécréter des toxines.",base:{prot:120,lip:60,atp:160,nuc:20},t:14,max:5,req:[["b","noyau",3],["f","lip",3]]},
  cyto:{name:"Cytosquelette",short:"Ouvre des emplacements.",role:"La charpente : chaque niveau ouvre un emplacement d’organite de plus.",base:{prot:220,lip:220,atp:220,nuc:60},t:20,max:2,req:[["b","noyau",4]]}
};
const SLOT_COUNT=8;
const SHORT={photo:"Photorécept.",cyto:"Cytosquel.",golgi:"Golgi",mito:"Mitochon.",reti:"Réticulum"};

/* Voies offensives : un cycle de forces et de faiblesses */
const TYPES={
  tox:{name:"Toxines",node:"PT",why:"Avaler un poison, c’est s’empoisonner."},
  pha:{name:"Phagocytose",node:"PH",why:"On digère le parasite avant qu’il n’infecte."},
  par:{name:"Parasitisme",node:"PP",why:"Le parasite détourne la machinerie enzymatique."},
  enz:{name:"Enzymes lytiques",node:"PE",why:"Les enzymes dissolvent le harpon protéique."},
  har:{name:"Harpon",node:"PA",why:"Percer la poche à toxines avant qu’elle ne se vide."}
};
const BEATS={tox:"pha",pha:"par",par:"enz",enz:"har",har:"tox"};
const TYPE_ORDER=["tox","pha","par","enz","har"];
const LOSES_TO={};for(const t in BEATS)LOSES_TO[BEATS[t]]=t;
const WILD_NAME={tox:"Dinoflagellé toxique",pha:"Amibe vorace",par:"Phage errant",enz:"Myxobactérie",har:"Larve à harpons"};

const NODES={
  E1:{br:"E",tier:1,name:"Glycolyse rapide",hint:"Brûler le sucre plus vite. Plus d’ATP.",eff:{atpPct:.15},mal:{},req:[["b","noyau",2]],cost:40,time:20,parents:[]},
  E2a:{br:"E",tier:2,name:"Photosynthèse",hint:"Capter la lumière… pourtant il fait noir ici.",eff:{photoPct:1},mal:{speedPct:-.1,predPct:-.1},req:[["b","mito",1]],cost:120,time:60,parents:["E1"],excl:"E2"},
  E2b:{br:"E",tier:2,name:"Chimiosynthèse",hint:"Se nourrir de ce qui sort des failles.",eff:{richMult:1,nucPct:.1},mal:{lipPct:-.1},req:[["b","mito",1]],cost:120,time:60,parents:["E1"],excl:"E2"},
  E3a:{br:"E",tier:3,name:"Thylacoïdes",hint:"Empiler des membranes pour la lumière.",eff:{photoPct:1.2},mal:{capPct:-.1},req:[["b","mito",3]],cost:300,time:150,parents:["E2a"]},
  E3b:{br:"E",tier:3,name:"Fer-soufre",hint:"Des métaux au cœur du métabolisme.",eff:{nucPct:.3,extractPct:.15},mal:{atpPct:-.05},req:[["b","mito",3]],cost:300,time:150,parents:["E2b"]},
  P1:{br:"P",tier:1,name:"Pili adhésifs",hint:"S’accrocher à tout ce qui passe.",eff:{chargePct:.5},mal:{},req:[["b","ribo",1]],cost:40,time:20,parents:[]},
  P2:{br:"P",tier:2,name:"Vésicules d’attaque",hint:"Des poches prêtes à s’ouvrir sur une proie.",eff:{predPct:.2},mal:{lipPct:-.05},req:[["b","ribo",3]],cost:120,time:60,parents:["P1"]},
  PT:{br:"P",tier:3,type:"tox",name:"Toxines",hint:"Plus de venin, plus de poison.",eff:{predPct:.3,extractPct:.1},mal:{capPct:-.05},req:[["b","golgi",1]],cost:300,time:150,parents:["P2"]},
  PH:{br:"P",tier:3,type:"pha",name:"Phagocytose",hint:"Avaler plus gros que soi.",eff:{predPct:.3,chargePct:.3},mal:{atpPct:-.08},req:[["b","vac",3]],cost:300,time:150,parents:["P2"]},
  PP:{br:"P",tier:3,type:"par",name:"Parasitisme",hint:"Vivre dans l’autre plutôt que le tuer.",eff:{predPct:.3,lootPct:.4},mal:{nucPct:-.05},req:[["b","noyau",4]],cost:300,time:150,parents:["P2"]},
  PE:{br:"P",tier:3,type:"enz",name:"Enzymes lytiques",hint:"Dissoudre avant de digérer.",eff:{predPct:.3,extractPct:.15},mal:{protPct:-.05},req:[["b","reti",1]],cost:300,time:150,parents:["P2"]},
  PA:{br:"P",tier:3,type:"har",name:"Harpon",hint:"Un dard qui perce et qui retient.",eff:{predPct:.35,speedPct:.1},mal:{lipPct:-.08},req:[["b","flag",2]],cost:300,time:150,parents:["P2"]},
  M1:{br:"M",tier:1,name:"Chimiotactisme",hint:"Sentir d’où vient la nourriture.",eff:{visionAdd:1},mal:{},req:[["b","photo",1]],cost:40,time:20,parents:[]},
  M2a:{br:"M",tier:2,name:"Flagelle rotatif",hint:"Un moteur pour aller loin.",eff:{speedPct:.3,rangeAdd:2},mal:{atpPct:-.05},req:[["b","flag",1]],cost:120,time:60,parents:["M1"],excl:"M2"},
  M2b:{br:"M",tier:2,name:"Ocelle",hint:"Une tache qui voit.",eff:{visionAdd:2},mal:{lipPct:-.1},req:[["b","photo",2]],cost:120,time:60,parents:["M1"],excl:"M2"},
  M3a:{br:"M",tier:3,name:"Nage en essaim",hint:"Se déplacer à plusieurs.",eff:{cellTime:-.5},mal:{chargePct:-.1},req:[["b","flag",3]],cost:300,time:150,parents:["M2a"]},
  M3b:{br:"M",tier:3,name:"Magnétosomes",hint:"Une boussole dans la cellule.",eff:{revealSource:1,visionAdd:1},mal:{},req:[["b","photo",4]],cost:300,time:150,parents:["M2b"]},
  ENDO:{br:"X",tier:4,name:"Endosymbiose",hint:"Accueillir une autre vie en soi. Devenir autre chose.",eff:{},mal:{},req:[["b","noyau",5]],cost:600,time:300,parents:[]},
  COLO:{br:"X",tier:5,name:"Adhésion cellulaire",hint:"Rester ensemble après la division.",eff:{fieldPct:.25,defPct:.3},mal:{},req:[["b","noyau",6],["s","cells",25]],cost:2500,time:720,parents:["ENDO"]},
  PLURI:{br:"X",tier:6,name:"Différenciation",hint:"À chaque cellule son métier.",eff:{atpPct:.2,protPct:.2,lipPct:.2,predPct:.3},mal:{},req:[["b","noyau",8],["s","zone",2],["s","lin",1]],cost:4000,time:1080,parents:["COLO"]},
  APEX:{br:"X",tier:7,name:"Sortie des eaux",hint:"Respirer l’air. Marcher.",eff:{},mal:{},req:[["b","noyau",10],["s","zone",3]],cost:6000,time:1440,parents:["PLURI"]}
};
const STAGE_NODES={ENDO:2,COLO:3,PLURI:4,APEX:5};
const STAGE_TXT={2:"Vous êtes eucaryote : un noyau protégé, des mitochondries domestiquées. La recherche militaire T3 devient possible. Prochaine étape : rester groupées pour former une colonie.",3:"Vos cellules ne se séparent plus : une colonie. La recherche militaire T4 devient possible. Prochaine étape : se différencier, en remontant vers les eaux moyennes.",4:"Muscles, bouche, tube digestif : vous êtes pluricellulaire. La recherche militaire T5 devient possible. Dernière étape : atteindre les hauts-fonds et sortir de l’eau.",5:"Vous respirez l’air. Votre lignée a quitté l’océan : elle peut devenir l’APEX de la terre ferme."};
const BRANCH={E:"Énergie",P:"Prédation",M:"Perception"};
const TRAITS={venin:{name:"Venin",from:"tox",col:"#7fd04a"},bras:{name:"Bras",from:"pha",col:"#4fa8e0"},carapace:{name:"Carapace",from:"par",col:"#a58a64"},crochets:{name:"Crochets",from:"enz",col:"#e08a3a"},pattes:{name:"Pattes",from:"har",col:"#cbb27c"}};
const TYPE_TRAIT={};for(const k in TRAITS)TYPE_TRAIT[TRAITS[k].from]=k;
const FORMS={"pattes+venin":"Araignée","bras+venin":"Grenouille venimeuse","crochets+venin":"Serpent","carapace+venin":"Scorpion","crochets+pattes":"Fourmi soldat","carapace+pattes":"Crabe","bras+pattes":"Mante","bras+crochets":"Pieuvre à bec","bras+carapace":"Homard","carapace+crochets":"Lucane"};
const PVE_RATIO=0.1;
const ADD_KEYS={rangeAdd:1,visionAdd:1,filAdd:1};
const RANK3=Object.keys(NODES).filter(k=>NODES[k].tier===3);
const PTYPES=TYPE_ORDER.map(t=>TYPES[t].node);
const EMERG=[
  {id:"lichen",name:"Lichen",desc:"Une alliance avec une algue : de l’énergie et une chimie défensive.",eff:{atpPct:.2,extractPct:.15}},
  {id:"cuirasse",name:"Coque de silice",desc:"Une carapace de verre, comme les diatomées.",eff:{visionAdd:1,capPct:.2}},
  {id:"spirale",name:"Spirochète",desc:"Un corps en tire-bouchon qui fend l’eau.",eff:{speedPct:.2,predPct:.25}},
  {id:"filament",name:"Chaîne cyanobactérienne",desc:"Des cellules soudées en filament.",eff:{fieldPct:.15,filAdd:1}}
];
const MOD_LABEL={photoPct:"photosynthèse",atpPct:"production d’ATP",protPct:"production de protéines",lipPct:"production de lipides",nucPct:"production de nucléotides",capPct:"stockage",chargePct:"charge des collectrices",speedPct:"vitesse des trajets",rangeAdd:"portée",visionAdd:"vision",cellTime:"temps de production des collectrices",evoCost:"coût de l’évolution",richMult:"rendement des sources hydrothermales",extractPct:"nutriments extraits",fieldPct:"production des canaux et filaments",revealSource:"révèle la source hydrothermale",predPct:"force de chasse",lootPct:"butin de chasse",filAdd:"filaments"};
Object.assign(MOD_LABEL,{upkeepPct:"entretien des collectrices",defPct:"défense de la base",buildPct:"vitesse de construction"});
const GOOD_WHEN_NEG={cellTime:1,evoCost:1,upkeepPct:1};

