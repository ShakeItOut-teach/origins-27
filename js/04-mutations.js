/* Origins 27 · 04-mutations.js
   Mutations proposées à chaque niveau de noyau, familles et lignées.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Mutations : à chaque niveau de noyau, choisir 1 carte parmi 3. Trois cartes d’une même famille ouvrent une lignée.
   Elles s’ajoutent à l’arbre : l’arbre donne la direction, les mutations rendent chaque partie différente. */
const MUT_TAG={E:{name:tr("Métabolisme","Metabolism"),col:"#ffe07a",e:"⚡"},P:{name:tr("Prédation","Predation"),col:"#ff8a7a",e:"🦷"},M:{name:tr("Mobilité","Mobility"),col:"#5ee6d0",e:"🌀"},R:{name:tr("Résilience","Resilience"),col:"#a99bff",e:"🛡️"}};
const MUTS=[
  {id:"atp",tag:"E",name:tr("Pompe surnuméraire","Extra pump"),desc:tr("Une pompe à protons copiée deux fois.","A proton pump copied twice."),eff:{atpPct:.15},mal:{}},
  {id:"chap",tag:"E",name:tr("Chaperonnes","Chaperones"),desc:tr("Des protéines qui plient les autres plus vite.","Proteins that fold the others faster."),eff:{buildPct:.15},mal:{nucPct:-.05}},
  {id:"repl",tag:"E",name:tr("Réplication rapide","Fast replication"),desc:tr("L’ADN se copie à la hâte.","DNA copies itself in a hurry."),eff:{nucPct:.2},mal:{capPct:-.1}},
  {id:"plas",tag:"E",name:tr("Plasmide voyageur","Roaming plasmid"),desc:tr("Un bout de génome volé à une voisine.","A piece of genome stolen from a neighbor."),eff:{evoCost:-.15},mal:{protPct:-.05}},
  {id:"lyso",tag:"P",name:tr("Lysozyme","Lysozyme"),desc:tr("Une enzyme qui perce les parois.","An enzyme that pierces cell walls."),eff:{predPct:.2},mal:{protPct:-.05}},
  {id:"esto",tag:"P",name:tr("Estomac extensible","Stretchy stomach"),desc:tr("Rapporter plus de chaque proie.","Bring back more from every prey."),eff:{lootPct:.3,chargePct:.2},mal:{}},
  {id:"divi",tag:"P",name:tr("Division rapide","Fast division"),desc:tr("Des collectrices produites à la chaîne.","Gatherers off the assembly line."),eff:{cellTime:-.3},mal:{upkeepPct:.1}},
  {id:"fren",tag:"P",name:tr("Frénésie","Frenzy"),desc:tr("Tout pour l’attaque, rien pour la garde.","All for attack, nothing for guard."),eff:{predPct:.4},mal:{defPct:-.2}},
  {id:"cils",tag:"M",name:tr("Cils battants","Beating cilia"),desc:tr("Une couronne de cils qui rame.","A crown of rowing cilia."),eff:{speedPct:.25},mal:{lipPct:-.05}},
  {id:"pigm",tag:"M",name:tr("Pigment photosensible","Light-sensitive pigment"),desc:tr("Une tache qui distingue le clair du sombre.","A spot that tells light from dark."),eff:{visionAdd:1},mal:{}},
  {id:"chim",tag:"M",name:tr("Chimiorécepteurs longs","Long chemoreceptors"),desc:tr("Sentir la nourriture de plus loin.","Smell food from farther away."),eff:{rangeAdd:2},mal:{atpPct:-.05}},
  {id:"vesi",tag:"M",name:tr("Vésicule de gaz","Gas vesicle"),desc:tr("Flotter plutôt que nager.","Float rather than swim."),eff:{speedPct:.15,rangeAdd:1},mal:{defPct:-.1}},
  {id:"paro",tag:"R",name:tr("Paroi épaisse","Thick wall"),desc:tr("Plus lourde, plus sûre.","Heavier, safer."),eff:{capPct:.25,defPct:.15},mal:{speedPct:-.1}},
  {id:"frug",tag:"R",name:tr("Métabolisme frugal","Frugal metabolism"),desc:tr("Des collectrices qui mangent moins.","Gatherers that eat less."),eff:{upkeepPct:-.35},mal:{atpPct:-.05}},
  {id:"mucu",tag:"R",name:tr("Capsule de mucus","Mucus capsule"),desc:tr("Glissante pour les prédateurs.","Slippery for predators."),eff:{defPct:.3},mal:{speedPct:-.1}},
  {id:"pliss",tag:"R",name:tr("Membrane plissée","Folded membrane"),desc:tr("Plus de surface, plus d’échanges.","More surface, more exchange."),eff:{fieldPct:.15},mal:{}}
];
const MUT_BY={};MUTS.forEach(m=>MUT_BY[m.id]=m);
const LINEAGE={E:{name:tr("Lignée métabolique","Metabolic lineage"),eff:{atpPct:.2,nucPct:.1,buildPct:.1}},P:{name:tr("Lignée prédatrice","Predator lineage"),eff:{predPct:.3,lootPct:.2}},M:{name:tr("Lignée nomade","Nomad lineage"),eff:{speedPct:.3,visionAdd:1,rangeAdd:1}},R:{name:tr("Lignée cuirassée","Armored lineage"),eff:{defPct:.4,capPct:.2,upkeepPct:-.15}}};
function mutCount(tag){return (S.muts||[]).filter(id=>MUT_BY[id]&&MUT_BY[id].tag===tag).length;}
function lineages(){return Object.keys(LINEAGE).filter(t=>mutCount(t)>=3);}
function offerMut(){
  const own=S.muts||[],pool=MUTS.filter(m=>own.indexOf(m.id)<0);if(pool.length<1)return;
  const pick=[];const top=Object.keys(MUT_TAG).sort((a,b)=>mutCount(b)-mutCount(a))[0];
  if(mutCount(top)>0){const c=pool.filter(m=>m.tag===top);if(c.length)pick.push(c[Math.floor(Math.random()*c.length)]);}
  let g=0;while(pick.length<3&&g<200){g++;const m=pool[Math.floor(Math.random()*pool.length)];if(pick.indexOf(m)<0&&(pick.length<2||pick.some(p=>p.tag!==m.tag)||g>60))pick.push(m);}
  S.mutOffer=pick.map(m=>m.id);dirty=true;
}
function mutCardHTML(m,btn){const T=MUT_TAG[m.tag];return '<div class="mut" style="--mc:'+T.col+'"><div class="mut-h"><span class="mut-tag">'+T.e+" "+T.name+"</span>"+(mutCount(m.tag)?'<span class="mut-n">'+mutCount(m.tag)+"/3</span>":"")+"</div><b>"+m.name+'</b><p class="desc">'+m.desc+"</p>"+fxList(m.eff)+fxList(m.mal)+(btn?'<button class="btn sm" data-act="mutpick" data-id="'+m.id+'">'+tr("Garder","Keep")+"</button>":"")+"</div>";}
function mutOfferHTML(){
  let h='<div class="kick">'+tr("Mutation · noyau niveau ","Mutation · nucleus level ")+S.noyau+"</div><h2>"+tr("Votre génome hésite","Your genome hesitates")+'</h2><p class="desc" style="text-align:center">'+tr("Gardez une mutation. Trois d’une même famille ouvrent une <b>lignée</b> et son bonus.","Keep one mutation. Three of the same family open a <b>lineage</b> and its bonus.")+'</p><div class="mutrow">';
  h+=S.mutOffer.map(id=>mutCardHTML(MUT_BY[id],true)).join("");
  return h+"</div>";
}
function mutBarHTML(){if(!S)return "";const n=(S.muts||[]).length,L=lineages();
  return '<button class="mutbar" data-act="muts"><span>🧬 Mutations <b>'+n+'</b></span><span class="mutdots">'+Object.keys(MUT_TAG).map(t=>'<i style="--mc:'+MUT_TAG[t].col+'" title="'+MUT_TAG[t].name+'">'+MUT_TAG[t].e+" "+mutCount(t)+"/3</i>").join("")+"</span>"+(L.length?'<span class="up">'+L.map(t=>LINEAGE[t].name).join(", ")+"</span>":'<span class="muted">'+(n?"":tr("au prochain niveau de noyau","at the next nucleus level"))+"</span>")+"</button>";}
function mutListHTML(){
  let h='<div class="kick">'+tr("Votre génome","Your genome")+"</div><h2>"+tr("Mutations et lignées","Mutations and lineages")+"</h2>";
  h+='<div class="lin">'+Object.keys(LINEAGE).map(t=>{const c=mutCount(t),on=c>=3;return '<div class="linrow'+(on?" on":"")+'" style="--mc:'+MUT_TAG[t].col+'"><b>'+MUT_TAG[t].e+" "+LINEAGE[t].name+"</b> <span>"+Math.min(c,3)+"/3</span>"+fxList(LINEAGE[t].eff)+"</div>";}).join("")+"</div>";
  const own=(S.muts||[]).map(id=>MUT_BY[id]).filter(Boolean);
  h+=own.length?'<div class="mutrow">'+own.map(m=>mutCardHTML(m,false)).join("")+"</div>":'<p class="desc" style="text-align:center;margin-top:10px">'+tr("Aucune mutation pour l’instant. Chaque niveau de noyau vous en proposera trois.","No mutations yet. Each nucleus level will offer you three.")+"</p>";
  return h+'<button class="btn" data-act="mclose">'+tr("Fermer","Close")+"</button>";
}
