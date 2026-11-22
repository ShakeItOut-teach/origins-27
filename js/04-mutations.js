/* Origins 27 · 04-mutations.js
   Mutations proposées à chaque niveau de noyau, familles et lignées.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Mutations : à chaque niveau de noyau, choisir 1 carte parmi 3. Trois cartes d’une même famille ouvrent une lignée.
   Elles s’ajoutent à l’arbre : l’arbre donne la direction, les mutations rendent chaque partie différente. */
const MUT_TAG={E:{name:"Métabolisme",col:"#ffe07a",e:"⚡"},P:{name:"Prédation",col:"#ff8a7a",e:"🦷"},M:{name:"Mobilité",col:"#5ee6d0",e:"🌀"},R:{name:"Résilience",col:"#a99bff",e:"🛡️"}};
const MUTS=[
  {id:"atp",tag:"E",name:"Pompe surnuméraire",desc:"Une pompe à protons copiée deux fois.",eff:{atpPct:.15},mal:{}},
  {id:"chap",tag:"E",name:"Chaperonnes",desc:"Des protéines qui plient les autres plus vite.",eff:{buildPct:.15},mal:{nucPct:-.05}},
  {id:"repl",tag:"E",name:"Réplication rapide",desc:"L’ADN se copie à la hâte.",eff:{nucPct:.2},mal:{capPct:-.1}},
  {id:"plas",tag:"E",name:"Plasmide voyageur",desc:"Un bout de génome volé à une voisine.",eff:{evoCost:-.15},mal:{protPct:-.05}},
  {id:"lyso",tag:"P",name:"Lysozyme",desc:"Une enzyme qui perce les parois.",eff:{predPct:.2},mal:{protPct:-.05}},
  {id:"esto",tag:"P",name:"Estomac extensible",desc:"Rapporter plus de chaque proie.",eff:{lootPct:.3,chargePct:.2},mal:{}},
  {id:"divi",tag:"P",name:"Division rapide",desc:"Des collectrices produites à la chaîne.",eff:{cellTime:-.3},mal:{upkeepPct:.1}},
  {id:"fren",tag:"P",name:"Frénésie",desc:"Tout pour l’attaque, rien pour la garde.",eff:{predPct:.4},mal:{defPct:-.2}},
  {id:"cils",tag:"M",name:"Cils battants",desc:"Une couronne de cils qui rame.",eff:{speedPct:.25},mal:{lipPct:-.05}},
  {id:"pigm",tag:"M",name:"Pigment photosensible",desc:"Une tache qui distingue le clair du sombre.",eff:{visionAdd:1},mal:{}},
  {id:"chim",tag:"M",name:"Chimiorécepteurs longs",desc:"Sentir la nourriture de plus loin.",eff:{rangeAdd:2},mal:{atpPct:-.05}},
  {id:"vesi",tag:"M",name:"Vésicule de gaz",desc:"Flotter plutôt que nager.",eff:{speedPct:.15,rangeAdd:1},mal:{defPct:-.1}},
  {id:"paro",tag:"R",name:"Paroi épaisse",desc:"Plus lourde, plus sûre.",eff:{capPct:.25,defPct:.15},mal:{speedPct:-.1}},
  {id:"frug",tag:"R",name:"Métabolisme frugal",desc:"Des collectrices qui mangent moins.",eff:{upkeepPct:-.35},mal:{atpPct:-.05}},
  {id:"mucu",tag:"R",name:"Capsule de mucus",desc:"Glissante pour les prédateurs.",eff:{defPct:.3},mal:{speedPct:-.1}},
  {id:"pliss",tag:"R",name:"Membrane plissée",desc:"Plus de surface, plus d’échanges.",eff:{fieldPct:.15},mal:{}}
];
const MUT_BY={};MUTS.forEach(m=>MUT_BY[m.id]=m);
const LINEAGE={E:{name:"Lignée métabolique",eff:{atpPct:.2,nucPct:.1,buildPct:.1}},P:{name:"Lignée prédatrice",eff:{predPct:.3,lootPct:.2}},M:{name:"Lignée nomade",eff:{speedPct:.3,visionAdd:1,rangeAdd:1}},R:{name:"Lignée cuirassée",eff:{defPct:.4,capPct:.2,upkeepPct:-.15}}};
function mutCount(tag){return (S.muts||[]).filter(id=>MUT_BY[id]&&MUT_BY[id].tag===tag).length;}
function lineages(){return Object.keys(LINEAGE).filter(t=>mutCount(t)>=3);}
function offerMut(){
  const own=S.muts||[],pool=MUTS.filter(m=>own.indexOf(m.id)<0);if(pool.length<1)return;
  const pick=[];const top=Object.keys(MUT_TAG).sort((a,b)=>mutCount(b)-mutCount(a))[0];
  if(mutCount(top)>0){const c=pool.filter(m=>m.tag===top);if(c.length)pick.push(c[Math.floor(Math.random()*c.length)]);}
  let g=0;while(pick.length<3&&g<200){g++;const m=pool[Math.floor(Math.random()*pool.length)];if(pick.indexOf(m)<0&&(pick.length<2||pick.some(p=>p.tag!==m.tag)||g>60))pick.push(m);}
  S.mutOffer=pick.map(m=>m.id);dirty=true;
}
function mutCardHTML(m,btn){const T=MUT_TAG[m.tag];return '<div class="mut" style="--mc:'+T.col+'"><div class="mut-h"><span class="mut-tag">'+T.e+" "+T.name+"</span>"+(mutCount(m.tag)?'<span class="mut-n">'+mutCount(m.tag)+"/3</span>":"")+"</div><b>"+m.name+'</b><p class="desc">'+m.desc+"</p>"+fxList(m.eff)+fxList(m.mal)+(btn?'<button class="btn sm" data-act="mutpick" data-id="'+m.id+'">Garder</button>':"")+"</div>";}
function mutOfferHTML(){
  let h='<div class="kick">Mutation · noyau niveau '+S.noyau+'</div><h2>Votre génome hésite</h2><p class="desc" style="text-align:center">Gardez une mutation. Trois d’une même famille ouvrent une <b>lignée</b> et son bonus.</p><div class="mutrow">';
  h+=S.mutOffer.map(id=>mutCardHTML(MUT_BY[id],true)).join("");
  return h+"</div>";
}
function mutBarHTML(){if(!S)return "";const n=(S.muts||[]).length,L=lineages();
  return '<button class="mutbar" data-act="muts"><span>🧬 Mutations <b>'+n+'</b></span><span class="mutdots">'+Object.keys(MUT_TAG).map(t=>'<i style="--mc:'+MUT_TAG[t].col+'" title="'+MUT_TAG[t].name+'">'+MUT_TAG[t].e+" "+mutCount(t)+"/3</i>").join("")+"</span>"+(L.length?'<span class="up">'+L.map(t=>LINEAGE[t].name).join(", ")+"</span>":'<span class="muted">'+(n?"":"au prochain niveau de noyau")+"</span>")+"</button>";}
function mutListHTML(){
  let h='<div class="kick">Votre génome</div><h2>Mutations et lignées</h2>';
  h+='<div class="lin">'+Object.keys(LINEAGE).map(t=>{const c=mutCount(t),on=c>=3;return '<div class="linrow'+(on?" on":"")+'" style="--mc:'+MUT_TAG[t].col+'"><b>'+MUT_TAG[t].e+" "+LINEAGE[t].name+"</b> <span>"+Math.min(c,3)+"/3</span>"+fxList(LINEAGE[t].eff)+"</div>";}).join("")+"</div>";
  const own=(S.muts||[]).map(id=>MUT_BY[id]).filter(Boolean);
  h+=own.length?'<div class="mutrow">'+own.map(m=>mutCardHTML(m,false)).join("")+"</div>":'<p class="desc" style="text-align:center;margin-top:10px">Aucune mutation pour l’instant. Chaque niveau de noyau vous en proposera trois.</p>';
  return h+'<button class="btn" data-act="mclose">Fermer</button>';
}
