/* Origins 27 · 05-troupes.js
   Troupes : caractéristiques, rangs T1 à T5, recherche militaire, production et compositions d'envoi.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const UPKEEP={atp:0.6,prot:0.45,lip:0.3,nuc:0.1};
const DIGEST=0.2; /* part de chaque récolte digérée en ATP au retour : les collectrices paient leur entretien */
const CELL_COST={prot:30,atp:20};

/* Armée : des troupes produites en masse ; l’évolution débloque des troupes plus puissantes.
   req : ["b",organite,niv], ["g",gène], ["s",spécial,valeur]. type : voie offensive propre à l’unité. */
/* Rangs des troupes : deux branches (récolte et espionnage, attaque), T1 à T5, chaque rang débloqué par une recherche militaire
   de plus en plus longue et chère. tier : rang ; br : "eco" ou "atk" ; spy : force d’espionnage. */
const UNITS={
  coll:{tier:1,br:"eco",name:tr("Collectrice","Gatherer"),pl:tr("Collectrices","Gatherers"),col:"#5ee6d0",cost:{prot:30,atp:20},t:10,atk:10,def:9,carry:20,spd:1,upk:1,spy:0,req:[["b","ribo",1]],role:tr("La base de tout : récolte, explore, se bat un peu.","The basis of everything: gathers, explores, fights a little.")},
  ecl:{tier:2,br:"eco",name:tr("Éclaireuse","Scout"),pl:tr("Éclaireuses","Scouts"),col:"#9fd8ff",cost:{lip:25,atp:15},t:6,atk:3,def:2,carry:8,spd:2.4,upk:.5,spy:3,req:[["s","rs",2],["b","flag",1]],role:tr("Très rapide. Cartographie autour de sa cible et peut espionner un rival.","Very fast. Maps the area around its target and can spy on a rival.")},
  port:{tier:2,br:"eco",name:tr("Porteuse","Carrier"),pl:tr("Porteuses","Carriers"),col:"#f3b562",cost:{prot:45,lip:30,atp:15},t:14,atk:2,def:4,carry:70,spd:.8,upk:1.2,spy:0,req:[["s","rs",2],["b","vac",2]],role:tr("Une poche géante : rapporte trois fois plus qu’une collectrice, mais lente.","A giant pouch: brings back three times more than a gatherer, but slow.")},
  diat:{tier:3,br:"eco",name:tr("Diatomée de verre","Glass diatom"),pl:tr("Diatomées de verre","Glass diatoms"),col:"#7fe0ff",cost:{prot:160,lip:120,atp:90,nuc:40},t:40,atk:8,def:40,carry:180,spd:1.3,upk:3,spy:7,req:[["s","rs",3]],role:tr("Une coque de silice : transporte beaucoup et observe à travers le verre.","A silica shell: carries a lot and watches through the glass.")},
  siph:{tier:4,br:"eco",name:tr("Siphonophore","Siphonophore"),pl:tr("Siphonophores","Siphonophores"),col:"#b28bff",cost:{prot:420,lip:320,atp:260,nuc:120},t:70,atk:20,def:90,carry:450,spd:1.6,upk:6,spy:18,req:[["s","rs",4]],role:tr("Une colonie-convoi : des dizaines de poches et d’yeux reliés.","A convoy colony: dozens of linked pouches and eyes.")},
  cten:{tier:5,br:"eco",name:tr("Cténophore spectral","Spectral ctenophore"),pl:tr("Cténophores spectraux","Spectral ctenophores"),col:"#ffd166",cost:{prot:1100,lip:900,atp:800,nuc:400},t:120,atk:40,def:150,carry:1000,spd:2.4,upk:12,spy:50,req:[["s","rs",5]],role:tr("Presque invisible, irisé : rapporte des fortunes et voit tout.","Almost invisible, iridescent: brings back fortunes and sees everything.")},
  sold:{tier:1,br:"atk",name:tr("Soldate","Soldier"),pl:tr("Soldates","Soldiers"),col:"#ff8a7a",cost:{prot:60,lip:25,atp:40},t:18,atk:28,def:30,carry:6,spd:1,upk:2,spy:0,req:[["b","ribo",2]],role:tr("Faite pour se battre : attaque et garde la base.","Built to fight: attacks and guards the base.")},
  tox:{tier:2,br:"atk",name:tr("Dinoflagellé venimeux","Venomous dinoflagellate"),pl:tr("Dinoflagellés venimeux","Venomous dinoflagellates"),col:"#b8e05a",type:"tox",cost:{prot:80,lip:90,atp:60,nuc:25},t:30,atk:72,def:20,carry:10,spd:1.1,upk:3,spy:0,req:[["s","ra",2],["g","PT"]],role:tr("Toxines : écrase les phagocytes.","Toxins: crushes phagocytes.")},
  pha:{tier:2,br:"atk",name:tr("Macrophage","Macrophage"),pl:tr("Macrophages","Macrophages"),col:"#4fc3f7",type:"pha",cost:{prot:110,lip:60,atp:60,nuc:25},t:30,atk:55,def:55,carry:35,spd:.9,upk:3,spy:0,req:[["s","ra",2],["g","PH"]],role:tr("Phagocytose : avale les parasites, tient la ligne.","Phagocytosis: swallows parasites, holds the line.")},
  par:{tier:2,br:"atk",name:tr("Phage dompté","Tamed phage"),pl:tr("Phages domptés","Tamed phages"),col:"#c77dff",type:"par",cost:{prot:70,lip:70,atp:50,nuc:40},t:30,atk:60,def:15,carry:45,spd:1.2,upk:3,spy:0,req:[["s","ra",2],["g","PP"]],role:tr("Parasitisme : détourne les enzymes, rapporte gros.","Parasitism: hijacks enzymes, brings back a lot.")},
  enz:{tier:2,br:"atk",name:tr("Lysobactérie","Lysobacterium"),pl:tr("Lysobactéries","Lysobacteria"),col:"#ff9e6b",type:"enz",cost:{prot:90,lip:60,atp:80,nuc:25},t:30,atk:66,def:30,carry:12,spd:1,upk:3,spy:0,req:[["s","ra",2],["g","PE"]],role:tr("Enzymes lytiques : dissout les harpons.","Lytic enzymes: dissolves harpoons.")},
  har:{tier:2,br:"atk",name:tr("Harponneur","Harpooner"),pl:tr("Harponneurs","Harpooners"),col:"#e3e9ee",type:"har",cost:{prot:90,lip:50,atp:90,nuc:25},t:30,atk:82,def:15,carry:10,spd:1.6,upk:3,spy:0,req:[["s","ra",2],["g","PA"]],role:tr("Harpon : perce les poches à toxines, frappe vite.","Harpoon: pierces toxin sacs, strikes fast.")},
  colo:{tier:3,br:"atk",name:tr("Volvox gardien","Guardian volvox"),pl:tr("Volvox gardiens","Guardian volvoxes"),col:"#7fd36b",cost:{prot:300,lip:250,atp:250,nuc:80},t:60,atk:140,def:240,carry:60,spd:.7,upk:6,spy:0,req:[["s","ra",3]],role:tr("Une sphère de cellules soudées : un rempart vivant qui frappe fort.","A sphere of fused cells: a living rampart that hits hard.")},
  pluri:{tier:4,br:"atk",name:tr("Ver segmenté","Segmented worm"),pl:tr("Vers segmentés","Segmented worms"),col:"#ef7fa6",cost:{prot:600,lip:400,atp:500,nuc:150},t:90,atk:360,def:180,carry:150,spd:1.3,upk:10,spy:0,req:[["s","ra",4]],role:tr("Muscles, mâchoires, tube digestif : un chasseur complet.","Muscles, jaws, gut: a complete hunter.")},
  anom:{tier:5,br:"atk",name:tr("Anomalocaride","Anomalocaris"),pl:tr("Anomalocarides","Anomalocarises"),col:"#ffd166",cost:{prot:2400,lip:1600,atp:2000,nuc:700},t:180,atk:1150,def:600,carry:300,spd:1.8,upk:25,spy:0,req:[["s","ra",5]],role:tr("Le grand prédateur : yeux à facettes, bras préhensiles, bouche en couronne.","The great predator: compound eyes, grasping arms, a crown-shaped mouth.")}
};
const RANK_COL=["","#9fb3c8","#7fd36b","#4fc3f7","#c77dff","#ffd166"];
const RANK_LBL=["",tr("Rang commun","Common rank"),tr("Rang avancé","Advanced rank"),tr("Rang supérieur","Superior rank"),tr("Rang élite","Elite rank"),tr("Rang légendaire","Legendary rank")];
const RBR={eco:{name:tr("Récolte et espionnage","Gathering and spying"),e:"🔍",col:"#5ee6d0",sp:"rs"},atk:{name:tr("Attaque","Attack"),e:"⚔",col:"#ff8a7a",sp:"ra"}};
/* Recherche militaire : coûts et durées exponentiels. Le T5 arrive dans la dernière semaine du serveur. */
const RANK_RES={
  2:{req:[["b","noyau",3]],cost:{nuc:400,atp:350,prot:350},time:120},
  3:{req:[["g","ENDO"],["b","noyau",6]],cost:{nuc:2500,atp:2000,prot:2000,lip:1400},time:480},
  4:{req:[["g","COLO"],["b","noyau",8]],cost:{nuc:8000,atp:6000,prot:6000,lip:4500},time:1440},
  5:{req:[["g","PLURI"],["b","noyau",10]],cost:{nuc:20000,atp:16000,prot:16000,lip:12000},time:2880}
};
function rankOf(br){S.rank=S.rank||{eco:1,atk:1};return S.rank[br]||1;}
function mresTime(L){return TIME_F*RANK_RES[L].time/(1+0.05*S.noyau);}
function mresBlock(br){const L=rankOf(br)+1;if(L>5)return tr("Rang maximum atteint.","Maximum rank reached.");if(S.mres)return tr("Une recherche militaire est déjà en cours.","Military research is already in progress.");if(!RANK_RES[L].req.every(reqMet))return tr("Conditions non remplies.","Requirements not met.");return capBlock(RANK_RES[L].cost);}
function mresStart(br){const L=rankOf(br)+1;if(mresBlock(br))return;const c=RANK_RES[L].cost;if(!afford(c))return;pay(c);S.mres={br,L,start:S.t,end:S.t+mresTime(L)};toast(tr("Recherche ","Research ")+RBR[br].e+" T"+L+tr(" lancée"," started"));}
function mresStep(){const R=S.mres;if(!R||S.t<R.end)return;S.mres=null;S.rank=S.rank||{eco:1,atk:1};S.rank[R.br]=Math.max(rankOf(R.br),R.L);
  const us=UNIT_ORDER.filter(k=>UNITS[k].br===R.br&&UNITS[k].tier===R.L);
  log(RBR[R.br].e+tr(" Rang T"," Rank T")+R.L+tr(" débloqué ("," unlocked (")+RBR[R.br].name+") : "+us.map(k=>UNITS[k].name).join(", ")+".","rare");
  popup({kick:tr("Recherche militaire · ","Military research · ")+RBR[R.br].name,title:tr("Rang T","Rank T")+R.L+tr(" débloqué"," unlocked"),body:'<div class="tierpop">'+us.map(k=>'<div>'+unitIcon(k,true)+"<b>"+UNITS[k].name+"</b><small>"+UNITS[k].role+"</small></div>").join("")+"</div>"+(R.L===2&&R.br==="atk"?'<p class="desc">'+tr("Les troupes T2 d’attaque demandent aussi le gène de leur voie offensive.","T2 attack troops also require the gene of their offensive path.")+"</p>":"")});dirty=true;}
const UNIT_ORDER=Object.keys(UNITS);
const LIFE=["",tr("Procaryote","Prokaryote"),tr("Eucaryote","Eukaryote"),tr("Colonie","Colony"),tr("Pluricellulaire","Multicellular"),"APEX"];
function uReq(k){return UNITS[k].req.every(reqMet);}
function uSum(a){let n=0;for(const k in a)n+=a[k]||0;return n;}
function syncIdle(){S.idle=uSum(S.army);}
function unitTime(k){if(tutFast())return 1*S.speed;return UNITS[k].t/10*cellTime();}
function laneCount(){return 1+Math.floor(blvl("ribo")/3);}
function queueEnd(){return S.queue.reduce((a,q)=>Math.max(a,q.t),S.t);}
function queueUnit(k){const L=laneCount(),ends=new Array(L).fill(S.t);S.queue.forEach(q=>{const l=Math.min(L-1,q.l||0);ends[l]=Math.max(ends[l],q.t);});let li=0;for(let i=1;i<L;i++)if(ends[i]<ends[li])li=i;
  const q={t:ends[li]+unitTime(k),k,l:li};let j=S.queue.length;while(j>0&&S.queue[j-1].t>q.t)j--;S.queue.splice(j,0,q);}
/* Production compacte, depuis le noyau ou les ribosomes */
function prodHTML(){if(blvl("ribo")<1)return '<p class="reason">'+tr("Pour produire des troupes : ","To produce troops: ")+riboHint()+"</p>";
  const qby={},L=laneCount();S.queue.forEach(q=>qby[q.k]=(qby[q.k]||0)+1);
  let h='<p class="desc">'+L+tr(" chaîne"," production line")+(L>1?"s":"")+tr(" de production","")+(S.queue.length?tr(" · en cours : "," · in progress: ")+compText(qby)+tr(" · fin dans "," · done in ")+'<span data-end="'+queueEnd()+'"></span>':tr(" · libre"," · idle"))+'</p><div class="prodl">';
  UNIT_ORDER.forEach(k=>{if(!uReq(k))return;const U=UNITS[k],mx=maxAfford(U.cost,200);
    h+=unitIcon(k)+'<div class="pn"><b>'+U.name+'</b> <span class="muted">'+(S.army[k]||0)+(qby[k]?" +"+qby[k]:"")+"</span><small>⚔"+U.atk+" 🛡"+U.def+" 🎒"+U.carry+" · "+Object.keys(U.cost).map(r=>fmt(U.cost[r])+" "+{atp:"ATP",prot:"P",lip:"L",nuc:"N"}[r]).join(" ")+" · "+fmtDur(unitTime(k))+'</small></div><div class="pb">'+[1,10].map(n=>'<button class="btn sm" data-act="cell" data-k="'+k+'" data-n="'+n+'"'+need(Object.fromEntries(Object.entries(U.cost).map(e=>[e[0],e[1]*n])))+">×"+n+"</button>").join("")+'<button class="btn sm alt" data-act="cell" data-k="'+k+'" data-n="max"'+(mx<1?" disabled":"")+">Max "+mx+"</button></div>";});
  return h+'</div><div class="row" style="margin-top:6px"><button class="btn sm alt" data-act="goto" data-tab="hero">'+tr("Toute l’armée →","Whole army →")+"</button></div>";}
function pickUnits(kind,n){const key=kind==="hunt"||kind==="raid"?"atk":kind==="explore"?"spd":kind==="spy"?"spy":"carry";const ks=UNIT_ORDER.filter(k=>(S.army[k]||0)>0&&(kind!=="spy"||UNITS[k].spy>0)).sort((a,b)=>UNITS[b][key]-UNITS[a][key]);const o={};let left=n;for(const k of ks){if(left<=0)break;const t=Math.min(left,S.army[k]);o[k]=t;left-=t;}return o;}
/* Composition choisie : en mode manuel, le joueur dit combien de chaque troupe part */
function selComp(kind){if(S.compMode!=="man")return pickUnits(kind,shownN());const o={};for(const k in (S.comp||{})){const v=Math.min(S.comp[k]||0,S.army[k]||0);if(v>0)o[k]=v;}return o;}
function compEditor(){let h='<div class="comp">';UNIT_ORDER.forEach(k=>{const have=S.army[k]||0;if(!have)return;const v=Math.min((S.comp||{})[k]||0,have),U=UNITS[k];
    h+=unitIcon(k)+'<span class="cn">'+U.name+' <span class="muted">· '+have+'</span></span><button data-act="cs" data-k="'+k+'" data-d="-1" aria-label="'+tr("Moins","Less")+'">−</button><b>'+v+'</b><button data-act="cs" data-k="'+k+'" data-d="1" aria-label="'+tr("Plus","More")+'">+</button><button data-act="cs" data-k="'+k+'" data-d="all">'+(v>=have?"0":tr("tout","all"))+"</button>";});
  return h+"</div>";}
function compText(c){return UNIT_ORDER.filter(k=>c&&c[k]).map(k=>c[k]+" "+(c[k]>1?UNITS[k].pl:UNITS[k].name).toLowerCase()).join(", ")||tr("aucune troupe","no troops");}
function compSpd(c){let s=9;for(const k in c)if(c[k])s=Math.min(s,UNITS[k].spd);return s===9?1:s;}
function compCarry(c){let s=0;for(const k in c)s+=(c[k]||0)*UNITS[k].carry;return s*(1+mods().chargePct);}
function unitF(k,w){const t=UNITS[k].type;if(!t||!w)return w?matchup(w).f:1;return BEATS[t]===w?2:BEATS[w]===t?0.5:1;}
function compAtk(c,w){let s=0;for(const k in c)s+=(c[k]||0)*UNITS[k].atk*unitF(k,w);return s*(1+mods().predPct);}
function compDef(c){let s=0;for(const k in c)s+=(c[k]||0)*UNITS[k].def;return s;}
function armyAll(){const o=Object.assign({},S.army);S.missions.forEach(M=>{for(const k in (M.u||{}))o[k]=(o[k]||0)+M.u[k];});return o;}
function applyLoss(M,lost){const tot=M.n||1,ks=Object.keys(M.u).filter(k=>M.u[k]>0).sort((a,b)=>UNITS[a].atk-UNITS[b].atk),rm={};let left=lost;
  ks.forEach(k=>{rm[k]=Math.min(M.u[k],Math.floor(lost*M.u[k]/tot));left-=rm[k];});
  for(const k of ks){if(left<=0)break;const t=Math.min(M.u[k]-rm[k],left);rm[k]+=t;left-=t;}
  for(const k in rm)M.u[k]-=rm[k];M.n=uSum(M.u);return rm;}
function killUnits(n){const ks=UNIT_ORDER.filter(k=>(S.army[k]||0)>0).sort((a,b)=>S.army[b]-S.army[a]);let left=n;for(const k of ks){if(left<=0)break;const t=Math.min(S.army[k],left);S.army[k]-=t;left-=t;}syncIdle();return n-left;}
function maxAfford(c,cap){let n=cap;for(const r in c)if(c[r]>0)n=Math.min(n,Math.floor(S.res[r]/c[r]));return Math.max(0,n);}
