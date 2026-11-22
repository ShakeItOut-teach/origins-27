/* Origins 27 · 03-regles.js
   Règles de base : ressources, souches, canaux, organites, voies offensives, gènes et émergences.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const ORG_SPR={vac:"o_vac",ribo:"o_ribo",photo:"o_photo",flag:"o_flag",mito:"o_mito",reti:"o_memb",golgi:"o_golgi",cyto:"o_cyto"};
const STAGE_SPR=["c_proc","c_proc","c_euc","c_colo","c_pluri","c_pluri"];
const STAGE_NAME=["",tr("Procaryote","Prokaryote"),tr("Eucaryote","Eukaryote"),tr("Colonie","Colony"),tr("Pluricellulaire","Multicellular"),tr("Pluricellulaire fortifié","Fortified multicellular")];
const RES=["atp","prot","lip","nuc"];
const RES_NAME={atp:"ATP",prot:tr("Protéines","Proteins"),lip:tr("Lipides","Lipids"),nuc:tr("Nucléotides","Nucleotides")};
const SPEEDS=[{label:"×1",v:1/60,title:tr("Temps réel","Real time")},{label:"×60",v:1,title:tr("1 seconde = 1 minute de jeu","1 second = 1 game minute")},{label:"×600",v:10,title:tr("1 seconde = 10 minutes de jeu","1 second = 10 game minutes")}];
const SAVE_KEY="origins27-proto7";
try{for(let i=1;i<7;i++)localStorage.removeItem("origins27-proto"+i);}catch(e){}

const ST_EN=tr("Énergie","Energy"),ST_CR=tr("Croissance","Growth"),ST_GE=tr("Génome","Genome"),ST_MO=tr("Mobilité","Mobility"),ST_PE="Perception";
const SOUCHES={
  varenne:{name:"Varenne-58",origin:tr("Isolée en 1958 dans une source thermale du Massif central par la Dr Hélène Varenne.","Isolated in 1958 from a hot spring in France’s Massif Central by Dr Hélène Varenne."),
    mods:{nucPct:.2,atpPct:-.1,evoCost:-.15},bonus:[tr("+20 % de nucléotides","+20% nucleotides"),tr("Évolution 15 % moins chère","Evolution 15% cheaper")],malus:[tr("10 % d’ATP en moins","10% less ATP")],trait:tr("Génome instable : l’arbre lui coûte moins cher.","Unstable genome: the tree costs it less."),
    stats:{[ST_EN]:2,[ST_CR]:3,[ST_GE]:5,[ST_MO]:2,[ST_PE]:3}},
  kori:{name:"Kōri-71",origin:tr("Prélevée en 1971 sous la banquise de la mer d’Okhotsk par l’équipage du brise-glace Hokusei.","Sampled in 1971 beneath the Sea of Okhotsk pack ice by the crew of the icebreaker Hokusei."),
    mods:{capPct:.3,atpPct:.1,speedPct:-.2},bonus:[tr("Stockage +30 %","Storage +30%"),tr("+10 % d’ATP","+10% ATP")],malus:[tr("Trajets 20 % plus lents","Trips 20% slower")],trait:tr("Métabolisme du froid : elle accumule et attend son heure.","Cold metabolism: it hoards and bides its time."),
    stats:{[ST_EN]:4,[ST_CR]:3,[ST_GE]:2,[ST_MO]:1,[ST_PE]:3}},
  abyssa:{name:"Abyssa-03",origin:tr("Remontée en 2003 d’une cheminée hydrothermale de la dorsale médio-atlantique par le submersible Orphée.","Brought up in 2003 from a hydrothermal vent on the Mid-Atlantic Ridge by the submersible Orphée."),
    mods:{visionAdd:1,richMult:.5,protPct:-.15,revealSource:1},bonus:[tr("Vision +1 case","Vision +1 tile"),tr("Sources hydrothermales +50 %","Hydrothermal vents +50%")],malus:[tr("15 % de protéines en moins","15% fewer proteins")],trait:tr("Mémoire des failles : elle sait où se trouve la source.","Memory of the rifts: it knows where the vent lies."),
    stats:{[ST_EN]:3,[ST_CR]:2,[ST_GE]:3,[ST_MO]:2,[ST_PE]:5}},
  ilheu:{name:"Ilhéu-89",origin:tr("Isolée en 1989 dans la vase d’une mangrove de l’estuaire de l’Amazone par le Pr Tomás Ilhéu.","Isolated in 1989 from mangrove mud in the Amazon estuary by Prof. Tomás Ilhéu."),
    mods:{protPct:.2,chargePct:.2,nucPct:-.15,predPct:.1},bonus:[tr("+20 % de protéines","+20% proteins"),tr("Collectrices +20 % de charge","Gatherers +20% load"),tr("Chasse +10 %","Hunting +10%")],malus:[tr("15 % de nucléotides en moins","15% fewer nucleotides")],trait:tr("Vorace : elle grandit vite, mais évolue lentement.","Voracious: it grows fast but evolves slowly."),
    stats:{[ST_EN]:3,[ST_CR]:5,[ST_GE]:1,[ST_MO]:3,[ST_PE]:2}}
};
const FIELD={
  atp:{name:tr("Pompe à protons","Proton pump"),role:tr("Fait tourner l’ATP synthase : produit de l’ATP.","Drives ATP synthase: produces ATP.")},
  prot:{name:tr("Perméase","Permease"),role:tr("Fait entrer les acides aminés : produit des protéines.","Brings in amino acids: produces proteins.")},
  lip:{name:tr("Canal lipidique","Lipid channel"),role:tr("Capte les acides gras : produit des lipides.","Captures fatty acids: produces lipids.")},
  nuc:{name:tr("Pore nucléique","Nucleic pore"),role:tr("Importe les bases azotées : produit des nucléotides.","Imports nitrogen bases: produces nucleotides.")}
};
const FIELD_ORDER=["atp","prot","lip","nuc"],FIELD_MAX=15;
function fAng(i){return -Math.PI/2+Math.PI/4+i*Math.PI/2;}
const FIELD_BASE={atp:30,prot:40,lip:35,nuc:10};
const BLD={
  noyau:{name:tr("Noyau","Nucleus"),short:tr("Accélère les constructions, débloque des organites.","Speeds up building, unlocks organelles."),role:tr("Le cœur de la cellule. Chaque niveau accélère toutes les constructions de 6 %, ajoute 5 % de nucléotides et, tous les deux niveaux, un filament de plus.","The heart of the cell. Each level speeds up all building by 6%, adds 5% nucleotides and, every two levels, one more filament."),base:{prot:150,lip:120,atp:100,nuc:40},t:15,max:10,req:[]},
  vac:{name:tr("Vacuole","Vacuole"),short:tr("Stockage et cachette.","Storage and hideout."),role:tr("L’entrepôt : augmente la capacité de stockage et met une part de chaque ressource à l’abri du pillage.","The warehouse: raises storage capacity and keeps a share of each resource safe from raids."),base:{prot:80,lip:120,atp:60,nuc:0},t:8,max:10,req:[["b","noyau",1]]},
  ribo:{name:tr("Ribosomes","Ribosomes"),short:tr("Fabrique toutes vos troupes.","Builds all your troops."),role:tr("La caserne de la cellule : fabriquent toutes vos troupes, plus vite à chaque niveau. Aux niveaux 3, 6 et 9, une chaîne de production de plus s’ouvre (jusqu’à 4 troupes à la fois). La production se lance aussi depuis le noyau.","The cell’s barracks: build all your troops, faster with each level. At levels 3, 6 and 9 another production line opens (up to 4 troops at once). Production can also be started from the nucleus."),base:{prot:140,lip:60,atp:90,nuc:20},t:10,max:10,req:[["b","noyau",2]]},
  photo:{name:tr("Photorécepteurs","Photoreceptors"),short:tr("Vision dans le noir.","Sight in the dark."),role:tr("La tour de guet : élargissent la vision dans le noir des abysses.","The watchtower: widen your sight in the darkness of the abyss."),base:{prot:110,lip:80,atp:100,nuc:30},t:10,max:10,req:[["b","noyau",2]]},
  flag:{name:tr("Flagelle","Flagellum"),short:tr("Vitesse et portée.","Speed and range."),role:tr("La place de rassemblement : accélère les collectrices, allonge leur portée et celle des filaments.","The rally point: speeds up gatherers and extends their range and that of filaments."),base:{prot:120,lip:90,atp:140,nuc:0},t:12,max:10,req:[["b","ribo",1]]},
  mito:{name:tr("Mitochondrie","Mitochondrion"),short:tr("+8 % d’ATP par niveau.","+8% ATP per level."),role:tr("Amplifie la production d’ATP de 8 % par niveau.","Boosts ATP production by 8% per level."),base:{prot:160,lip:120,atp:60,nuc:20},t:14,max:5,req:[["b","noyau",3],["f","atp",3]]},
  reti:{name:tr("Réticulum","Reticulum"),short:tr("+8 % de protéines par niveau.","+8% proteins per level."),role:tr("Amplifie la production de protéines de 8 % par niveau.","Boosts protein production by 8% per level."),base:{prot:60,lip:120,atp:160,nuc:20},t:14,max:5,req:[["b","noyau",3],["f","prot",3]]},
  golgi:{name:tr("Appareil de Golgi","Golgi apparatus"),short:tr("+8 % de lipides par niveau.","+8% lipids per level."),role:tr("Amplifie la production de lipides de 8 % par niveau. Indispensable pour sécréter des toxines.","Boosts lipid production by 8% per level. Required to secrete toxins."),base:{prot:120,lip:60,atp:160,nuc:20},t:14,max:5,req:[["b","noyau",3],["f","lip",3]]},
  cyto:{name:tr("Cytosquelette","Cytoskeleton"),short:tr("Ouvre des emplacements.","Opens slots."),role:tr("La charpente : chaque niveau ouvre un emplacement d’organite de plus.","The framework: each level opens one more organelle slot."),base:{prot:220,lip:220,atp:220,nuc:60},t:20,max:2,req:[["b","noyau",4]]}
};
const SLOT_COUNT=8;
const SHORT={photo:tr("Photorécept.","Photorecept."),cyto:tr("Cytosquel.","Cytoskel."),golgi:"Golgi",mito:tr("Mitochon.","Mitochon."),reti:tr("Réticulum","Reticulum")};

/* Voies offensives : un cycle de forces et de faiblesses */
const TYPES={
  tox:{name:tr("Toxines","Toxins"),node:"PT",why:tr("Avaler un poison, c’est s’empoisonner.","Swallowing poison means poisoning yourself.")},
  pha:{name:tr("Phagocytose","Phagocytosis"),node:"PH",why:tr("On digère le parasite avant qu’il n’infecte.","The parasite is digested before it can infect.")},
  par:{name:tr("Parasitisme","Parasitism"),node:"PP",why:tr("Le parasite détourne la machinerie enzymatique.","The parasite hijacks the enzyme machinery.")},
  enz:{name:tr("Enzymes lytiques","Lytic enzymes"),node:"PE",why:tr("Les enzymes dissolvent le harpon protéique.","Enzymes dissolve the protein harpoon.")},
  har:{name:tr("Harpon","Harpoon"),node:"PA",why:tr("Percer la poche à toxines avant qu’elle ne se vide.","Pierce the toxin sac before it empties.")}
};
const BEATS={tox:"pha",pha:"par",par:"enz",enz:"har",har:"tox"};
const TYPE_ORDER=["tox","pha","par","enz","har"];
const LOSES_TO={};for(const t in BEATS)LOSES_TO[BEATS[t]]=t;
const WILD_NAME={tox:tr("Dinoflagellé toxique","Toxic dinoflagellate"),pha:tr("Amibe vorace","Ravenous amoeba"),par:tr("Phage errant","Wandering phage"),enz:tr("Myxobactérie","Myxobacterium"),har:tr("Larve à harpons","Harpoon larva")};

const NODES={
  E1:{br:"E",tier:1,name:tr("Glycolyse rapide","Fast glycolysis"),hint:tr("Brûler le sucre plus vite. Plus d’ATP.","Burn sugar faster. More ATP."),eff:{atpPct:.15},mal:{},req:[["b","noyau",2]],cost:40,time:20,parents:[]},
  E2a:{br:"E",tier:2,name:tr("Photosynthèse","Photosynthesis"),hint:tr("Capter la lumière… pourtant il fait noir ici.","Catch the light… yet it is dark down here."),eff:{photoPct:1},mal:{speedPct:-.1,predPct:-.1},req:[["b","mito",1]],cost:120,time:60,parents:["E1"],excl:"E2"},
  E2b:{br:"E",tier:2,name:tr("Chimiosynthèse","Chemosynthesis"),hint:tr("Se nourrir de ce qui sort des failles.","Feed on what seeps from the rifts."),eff:{richMult:1,nucPct:.1},mal:{lipPct:-.1},req:[["b","mito",1]],cost:120,time:60,parents:["E1"],excl:"E2"},
  E3a:{br:"E",tier:3,name:tr("Thylacoïdes","Thylakoids"),hint:tr("Empiler des membranes pour la lumière.","Stack membranes to catch light."),eff:{photoPct:1.2},mal:{capPct:-.1},req:[["b","mito",3]],cost:300,time:150,parents:["E2a"]},
  E3b:{br:"E",tier:3,name:tr("Fer-soufre","Iron-sulfur"),hint:tr("Des métaux au cœur du métabolisme.","Metals at the heart of metabolism."),eff:{nucPct:.3,extractPct:.15},mal:{atpPct:-.05},req:[["b","mito",3]],cost:300,time:150,parents:["E2b"]},
  P1:{br:"P",tier:1,name:tr("Pili adhésifs","Sticky pili"),hint:tr("S’accrocher à tout ce qui passe.","Cling to anything that drifts by."),eff:{chargePct:.5},mal:{},req:[["b","ribo",1]],cost:40,time:20,parents:[]},
  P2:{br:"P",tier:2,name:tr("Vésicules d’attaque","Attack vesicles"),hint:tr("Des poches prêtes à s’ouvrir sur une proie.","Pouches ready to burst open on prey."),eff:{predPct:.2},mal:{lipPct:-.05},req:[["b","ribo",3]],cost:120,time:60,parents:["P1"]},
  PT:{br:"P",tier:3,type:"tox",name:tr("Toxines","Toxins"),hint:tr("Plus de venin, plus de poison.","More venom, more poison."),eff:{predPct:.3,extractPct:.1},mal:{capPct:-.05},req:[["b","golgi",1]],cost:300,time:150,parents:["P2"]},
  PH:{br:"P",tier:3,type:"pha",name:tr("Phagocytose","Phagocytosis"),hint:tr("Avaler plus gros que soi.","Swallow something bigger than you."),eff:{predPct:.3,chargePct:.3},mal:{atpPct:-.08},req:[["b","vac",3]],cost:300,time:150,parents:["P2"]},
  PP:{br:"P",tier:3,type:"par",name:tr("Parasitisme","Parasitism"),hint:tr("Vivre dans l’autre plutôt que le tuer.","Live inside the other instead of killing it."),eff:{predPct:.3,lootPct:.4},mal:{nucPct:-.05},req:[["b","noyau",4]],cost:300,time:150,parents:["P2"]},
  PE:{br:"P",tier:3,type:"enz",name:tr("Enzymes lytiques","Lytic enzymes"),hint:tr("Dissoudre avant de digérer.","Dissolve before digesting."),eff:{predPct:.3,extractPct:.15},mal:{protPct:-.05},req:[["b","reti",1]],cost:300,time:150,parents:["P2"]},
  PA:{br:"P",tier:3,type:"har",name:tr("Harpon","Harpoon"),hint:tr("Un dard qui perce et qui retient.","A barb that pierces and holds."),eff:{predPct:.35,speedPct:.1},mal:{lipPct:-.08},req:[["b","flag",2]],cost:300,time:150,parents:["P2"]},
  M1:{br:"M",tier:1,name:tr("Chimiotactisme","Chemotaxis"),hint:tr("Sentir d’où vient la nourriture.","Sense where food comes from."),eff:{visionAdd:1},mal:{},req:[["b","photo",1]],cost:40,time:20,parents:[]},
  M2a:{br:"M",tier:2,name:tr("Flagelle rotatif","Rotary flagellum"),hint:tr("Un moteur pour aller loin.","A motor to travel far."),eff:{speedPct:.3,rangeAdd:2},mal:{atpPct:-.05},req:[["b","flag",1]],cost:120,time:60,parents:["M1"],excl:"M2"},
  M2b:{br:"M",tier:2,name:tr("Ocelle","Eyespot"),hint:tr("Une tache qui voit.","A spot that sees."),eff:{visionAdd:2},mal:{lipPct:-.1},req:[["b","photo",2]],cost:120,time:60,parents:["M1"],excl:"M2"},
  M3a:{br:"M",tier:3,name:tr("Nage en essaim","Swarm swimming"),hint:tr("Se déplacer à plusieurs.","Move as a group."),eff:{cellTime:-.5},mal:{chargePct:-.1},req:[["b","flag",3]],cost:300,time:150,parents:["M2a"]},
  M3b:{br:"M",tier:3,name:tr("Magnétosomes","Magnetosomes"),hint:tr("Une boussole dans la cellule.","A compass inside the cell."),eff:{revealSource:1,visionAdd:1},mal:{},req:[["b","photo",4]],cost:300,time:150,parents:["M2b"]},
  ENDO:{br:"X",tier:4,name:tr("Endosymbiose","Endosymbiosis"),hint:tr("Accueillir une autre vie en soi. Devenir autre chose.","Take another life inside you. Become something else."),eff:{},mal:{},req:[["b","noyau",5]],cost:600,time:300,parents:[]},
  COLO:{br:"X",tier:5,name:tr("Adhésion cellulaire","Cell adhesion"),hint:tr("Rester ensemble après la division.","Stay together after dividing."),eff:{fieldPct:.25,defPct:.3},mal:{},req:[["b","noyau",6],["s","cells",25]],cost:2500,time:720,parents:["ENDO"]},
  PLURI:{br:"X",tier:6,name:tr("Différenciation","Differentiation"),hint:tr("À chaque cellule son métier.","Each cell to its own trade."),eff:{atpPct:.2,protPct:.2,lipPct:.2,predPct:.3},mal:{},req:[["b","noyau",8],["s","zone",2],["s","lin",1]],cost:4000,time:1080,parents:["COLO"]},
  APEX:{br:"X",tier:7,name:tr("Sortie des eaux","Leaving the water"),hint:tr("Respirer l’air. Marcher.","Breathe air. Walk."),eff:{},mal:{},req:[["b","noyau",10],["s","zone",3]],cost:6000,time:1440,parents:["PLURI"]}
};
const STAGE_NODES={ENDO:2,COLO:3,PLURI:4,APEX:5};
const STAGE_TXT={2:tr("Vous êtes eucaryote : un noyau protégé, des mitochondries domestiquées. La recherche militaire T3 devient possible. Prochaine étape : rester groupées pour former une colonie.","You are a eukaryote: a protected nucleus, tamed mitochondria. T3 military research is now possible. Next step: stay together to form a colony."),3:tr("Vos cellules ne se séparent plus : une colonie. La recherche militaire T4 devient possible. Prochaine étape : se différencier, en remontant vers les eaux moyennes.","Your cells no longer split apart: a colony. T4 military research is now possible. Next step: differentiate, while rising toward the middle waters."),4:tr("Muscles, bouche, tube digestif : vous êtes pluricellulaire. La recherche militaire T5 devient possible. Dernière étape : atteindre les hauts-fonds et sortir de l’eau.","Muscles, mouth, gut: you are multicellular. T5 military research is now possible. Last step: reach the shallows and leave the water."),5:tr("Vous respirez l’air. Votre lignée a quitté l’océan : elle peut devenir l’APEX de la terre ferme.","You breathe air. Your lineage has left the ocean: it can become the APEX of dry land.")};
const BRANCH={E:tr("Énergie","Energy"),P:tr("Prédation","Predation"),M:"Perception"};
const TRAITS={venin:{name:tr("Venin","Venom"),from:"tox",col:"#7fd04a"},bras:{name:tr("Bras","Arms"),from:"pha",col:"#4fa8e0"},carapace:{name:tr("Carapace","Shell"),from:"par",col:"#a58a64"},crochets:{name:tr("Crochets","Fangs"),from:"enz",col:"#e08a3a"},pattes:{name:tr("Pattes","Legs"),from:"har",col:"#cbb27c"}};
const TYPE_TRAIT={};for(const k in TRAITS)TYPE_TRAIT[TRAITS[k].from]=k;
const FORMS={"pattes+venin":"Araignée","bras+venin":"Grenouille venimeuse","crochets+venin":"Serpent","carapace+venin":"Scorpion","crochets+pattes":"Fourmi soldat","carapace+pattes":"Crabe","bras+pattes":"Mante","bras+crochets":"Pieuvre à bec","bras+carapace":"Homard","carapace+crochets":"Lucane"};
/* Les formes du héros restent en français dans la sauvegarde (ce sont aussi des clés) ; formName() donne le nom affiché */
const FORM_EN={"Larve":"Larva","Araignée":"Spider","Grenouille venimeuse":"Poison frog","Serpent":"Snake","Scorpion":"Scorpion","Fourmi soldat":"Soldier ant","Crabe":"Crab","Mante":"Mantis","Pieuvre à bec":"Beaked octopus","Homard":"Lobster","Lucane":"Stag beetle"};
function formName(f){return EN&&FORM_EN[f]?FORM_EN[f]:f;}
const PVE_RATIO=0.1;
const ADD_KEYS={rangeAdd:1,visionAdd:1,filAdd:1};
const RANK3=Object.keys(NODES).filter(k=>NODES[k].tier===3);
const PTYPES=TYPE_ORDER.map(t=>TYPES[t].node);
const EMERG=[
  {id:"lichen",name:tr("Lichen","Lichen"),desc:tr("Une alliance avec une algue : de l’énergie et une chimie défensive.","An alliance with an alga: energy and defensive chemistry."),eff:{atpPct:.2,extractPct:.15}},
  {id:"cuirasse",name:tr("Coque de silice","Silica shell"),desc:tr("Une carapace de verre, comme les diatomées.","A glass armor, like diatoms."),eff:{visionAdd:1,capPct:.2}},
  {id:"spirale",name:tr("Spirochète","Spirochete"),desc:tr("Un corps en tire-bouchon qui fend l’eau.","A corkscrew body that cuts through water."),eff:{speedPct:.2,predPct:.25}},
  {id:"filament",name:tr("Chaîne cyanobactérienne","Cyanobacterial chain"),desc:tr("Des cellules soudées en filament.","Cells fused into a filament."),eff:{fieldPct:.15,filAdd:1}}
];
const MOD_LABEL={photoPct:tr("photosynthèse","photosynthesis"),atpPct:tr("production d’ATP","ATP production"),protPct:tr("production de protéines","protein production"),lipPct:tr("production de lipides","lipid production"),nucPct:tr("production de nucléotides","nucleotide production"),capPct:tr("stockage","storage"),chargePct:tr("charge des collectrices","gatherer load"),speedPct:tr("vitesse des trajets","travel speed"),rangeAdd:tr("portée","range"),visionAdd:"vision",cellTime:tr("temps de production des collectrices","gatherer production time"),evoCost:tr("coût de l’évolution","evolution cost"),richMult:tr("rendement des sources hydrothermales","hydrothermal vent yield"),extractPct:tr("nutriments extraits","nutrients extracted"),fieldPct:tr("production des canaux et filaments","channel and filament production"),revealSource:tr("révèle la source hydrothermale","reveals the hydrothermal vent"),predPct:tr("force de chasse","hunting strength"),lootPct:tr("butin de chasse","hunting loot"),filAdd:"filaments"};
Object.assign(MOD_LABEL,{upkeepPct:tr("entretien des collectrices","gatherer upkeep"),defPct:tr("défense de la base","base defense"),buildPct:tr("vitesse de construction","building speed")});
const GOOD_WHEN_NEG={cellTime:1,evoCost:1,upkeepPct:1};
