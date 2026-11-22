/* Origins 27 · 07-economie.js
   Économie : production, entretien, coûts et durées, vision, combats contre la faune, journal et notifications.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
function fieldProd(L){return L<=0?0:10.5*Math.pow(1.42,L);}
function filBase(T,m){return (T.rich?80:25)*(1+m.fieldPct);}
function filRate(T,m){const b=filBase(T,m);return T.a>1?b:Math.min(b,T.max*0.015);}
function depthBG(){const L=hereLight(),b=Math.round(Math.pow(L,0.75)*DBANDS),top=depthCol(Math.min(DBANDS,b),3),mid=depthCol(Math.max(0,b-1),5),bot=depthCol(Math.max(0,b-3),7),ra=(0.02+0.12*Math.max(0,L-0.15)).toFixed(3);
  return "repeating-linear-gradient(105deg,transparent 0 46px,rgba(255,244,200,"+ra+") 46px 58px,transparent 58px 130px),linear-gradient(180deg,"+top+" 0 22%,"+mid+" 22% 55%,"+bot+" 55% 100%)";}
function depthTag(){const c=cpos(),L=depthLight(c[0],c[1]),pct=Math.round(L*100);return '<div class="depthtag" data-tip="'+esc("<b>Profondeur</b>Plus vous remontez vers la terre ferme, plus la lumière augmente."+(has("E2a")?"<br>Photosynthèse ici : +"+Math.round(mods().photoPct*photoF()*100)+" % d’ATP.":"<br>La photosynthèse en profitera."))+'"><b>'+hereZoneName()+'</b><span>≈ '+fmt(depthM(c[0],c[1]))+' m</span><span class="lbar"><i style="width:'+pct+'%"></i></span><span>lumière '+pct+" %</span></div>";}
function hereZoneName(){const c=cpos(),z=zoneOf(c[0],c[1]);return z==="void"||z==="land"?"Abysses":ZONE_NAME[z];}
function hereLight(){const c=cpos();return depthLight(c[0],c[1]);}
function photoF(){return 0.08+2.6*Math.pow(hereLight(),1.1);}
function depthM(x,y){return Math.round(Math.max(0,(rC(x,y)-LAND_R)/(RW-LAND_R))*4000/10)*10;}
function prodMult(k,m){const ph=(m.photoPct||0)*photoF();return k==="atp"?1+0.08*blvl("mito")+m.atpPct+ph:k==="prot"?1+0.08*blvl("reti")+m.protPct+ph*0.5:k==="lip"?1+0.08*blvl("golgi")+m.lipPct:1+0.05*S.noyau+m.nucPct;}
const PROD_F=0.7;
function rates(){
  const m=mods(),fp=1+m.fieldPct,o={},fil={atp:0,prot:0,lip:0,nuc:0};
  S.fils.forEach(f=>{const T=S.tiles[f.y*W+f.x];if(T.k)fil[T.k]+=filRate(T,m);});
  const base={atp:8.5,prot:9,lip:6,nuc:3.5};
  const ax=(S.events&&S.events.length&&anoxHere())?0.7:1;
  for(const k of RES){const fs=S.fields.reduce((a,f)=>f.k===k?a+fieldProd(f.l):a,0);o[k]=(Math.max(0,(base[k]+fs*fp)*prodMult(k,m))+fil[k])*ax*PROD_F;}
  o.fil=fil;
  o.cap=Math.round(520*Math.pow(1.3,blvl("vac"))*costF(blvl("vac"))*(1+m.capPct));
  return o;
}
function cellCount(){return S.idle+S.missions.reduce((a,M)=>a+M.n,0);}
function upkeep(){const A=armyAll();let n=0;for(const k in A)n+=(A[k]||0)*UNITS[k].upk;const f=Math.max(0.2,1+mods().upkeepPct),o={};for(const k in UPKEEP)o[k]=UPKEEP[k]*n*f;return o;}
function speedUp(){return (1+0.06*S.noyau)*(1+mods().buildPct);}
let COST_K=0.15,PACE=1.7;function costF(L){return PACE*(1+COST_K*L);}
/* un canal demande peu de la ressource qu’il produit (35 %) et un peu plus des autres (110 %) */
function fieldCost(L,k){const m=3.2*Math.pow(1.55,L)*costF(L),o={};for(const r in FIELD_BASE)o[r]=Math.round(FIELD_BASE[r]*m*(!k?1:r===k?0.35:1.1));return o;}
const TIME_F=0.87;
function fieldTime(L){return TIME_F*9*Math.pow(1.5,L)/speedUp();}
function bldCost(k,L){const b=BLD[k].base,m=Math.pow(1.5,L)*costF(L),o={};for(const r in b)if(b[r])o[r]=Math.round(b[r]*m);return o;}
function bldTime(k,L){return TIME_F*BLD[k].t*Math.pow(1.5,L)/speedUp();}
function capPer(){return Math.max(5,20*(1+mods().chargePct));}
function cellTime(){return 10/(1+0.4*blvl("ribo"))*Math.max(0.2,1+mods().cellTime);}
function tileTime(){return 1/(1+0.3*blvl("flag"))/Math.max(0.3,1+mods().speedPct);}
function range(){return Math.max(2,5+2*blvl("flag")+mods().rangeAdd);}
function visR(){return 1+blvl("photo")+mods().visionAdd;}
function isVis(x,y){return dist(x,y)<=visR()+0.45;}
function slotOpen(i){if(i<6)return true;return blvl("cyto")>=i-5;}
function filMax(){return 1+Math.floor(S.noyau/2)+mods().filAdd;}
function filRange(){return 3+blvl("flag");}
function filCost(d){return {prot:Math.round(50*d),lip:Math.round(70*d),atp:Math.round(40*d)};}
function filTime(d){return TIME_F*6*d/speedUp();}
function afford(need){for(const r in need)if(S.res[r]<need[r])return false;return true;}
function pay(need){for(const r in need)S.res[r]-=need[r];}
function capBlock(need){const cap=rates().cap;for(const r in need)if(need[r]>cap)return "Stockage trop petit : agrandissez la vacuole.";return "";}
function zoneIdx(){const c=cpos();return {abyss:0,deep:1,mid:2,shallow:3,land:3,void:0}[zoneOf(c[0],c[1])];}
const SPECIAL={cells:{name:"Troupes",cur:()=>cellCount(),tab:"hero"},zone:{name:"Base en zone",cur:()=>zoneIdx(),tab:"map",lbl:l=>["Abysses","Eaux profondes","Eaux moyennes","Hauts-fonds"][l]},lin:{name:"Lignées",cur:()=>lineages().length,tab:"evo"},rs:{name:"Rang récolte",cur:()=>rankOf("eco"),tab:"hero",lbl:l=>"🔍 Rang T"+l},ra:{name:"Rang attaque",cur:()=>rankOf("atk"),tab:"hero",lbl:l=>"⚔ Rang T"+l}};
function reqMet(q){const t=q[0],k=q[1],l=q[2];if(t==="g")return has(k);if(t==="s")return SPECIAL[k].cur()>=l;return t==="b"?blvl(k)>=l:fmaxlvl(k)>=l;}
function reqShort(q){if(q[0]==="g")return NODES[q[1]].name;if(q[0]==="s"){const s=SPECIAL[q[1]];return s.lbl?s.lbl(q[2]):s.name+" "+q[2];}return (q[0]==="b"?(SHORT[q[1]]||BLD[q[1]].name):FIELD[q[1]].name)+" "+q[2];}
function nodeCost(id){const n=NODES[id],f=Math.max(0.3,1+mods().evoCost);let c=n.cost*costF((n.tier||0)*1.6);if(NODES[id].type&&ownedTypes().length>=1)c*=2;return {nuc:Math.round(c*f),atp:Math.round(c*0.5)};}
function nodeTime(id){return TIME_F*NODES[id].time/(1+0.05*S.noyau);}
function matchup(wtype){const own=ownedTypes();if(!own.length)return {f:0.6,t:null,lbl:"aucune voie offensive"};let best={f:0,t:null};own.forEach(t=>{const f=BEATS[t]===wtype?2:BEATS[wtype]===t?0.5:1;if(f>best.f)best={f,t};});best.lbl=TYPES[best.t].name+(best.f===2?" (fort contre lui)":best.f===0.5?" (faible contre lui)":" (neutre)");return best;}
function huntPower(n,wtype){return compAtk(typeof n==="number"?pickUnits("hunt",n):n,wtype);}
const ATK_ADV=1.02;
function lossFrac(pw,def){const r=pw*ATK_ADV/def;return r>=1?Math.min(0.5,0.5*Math.pow(1/r,1.5)):Math.max(0.5,Math.min(1,1-0.5*Math.pow(r,1.5)));}
/* Rapports détaillés : qui a frappé combien, pourquoi on gagne ou on perd */
function fmtF(f){const s=String(Math.round(f*100)/100).replace(".",",");return f>1?'<span class="up">×'+s+"</span>":f<1?'<span class="neg">×'+s+"</span>":"×1";}
function fightTable(u0,lostBy,wtype,hp,pw,def,win,defLabel){
  const m=mods(),pp=1+m.predPct;let rows="";lostBy=lostBy||{};
  UNIT_ORDER.forEach(k=>{const c=u0[k];if(!c)return;const U=UNITS[k],f=unitF(k,wtype),ctr=c*U.atk*f*pp,l=lostBy[k]||0;
    rows+="<tr><td>"+c+" "+(c>1?U.pl:U.name).toLowerCase()+'</td><td class="num">'+U.atk+'</td><td class="num">'+fmtF(f)+'</td><td class="num">'+fmt(ctr)+'</td><td class="num'+(l?" neg":"")+'">'+l+"</td></tr>";});
  if(hp)rows+="<tr><td>Héros "+esc(S.hero.form)+" niv. "+S.hero.lvl+'</td><td class="num">'+heroBase()+'</td><td class="num">'+fmtF(formMult(wtype))+'</td><td class="num">'+fmt(hp)+'</td><td class="num">0</td></tr>';
  const r=pw*ATK_ADV/Math.max(1,def),lost=uSum(lostBy),sent=uSum(u0);
  let h='<table class="ftab"><thead><tr><th>Vos troupes</th><th class="num">⚔ / u.</th><th class="num">Voie</th><th class="num">Force</th><th class="num">Pertes</th></tr></thead><tbody>'+rows+"</tbody>";
  h+='<tfoot><tr><td>Total'+(m.predPct?' <span class="muted">(prédation '+(m.predPct>0?"+":"")+Math.round(m.predPct*100)+" %)</span>":"")+'</td><td></td><td></td><td class="num"><b>'+fmt(pw)+'</b></td><td class="num">'+lost+"/"+sent+"</td></tr></tfoot></table>";
  h+='<div class="fbar"><i style="width:'+Math.round(Math.min(100,pw/(pw+def)*100))+'%"></i><span>Vous '+fmt(pw)+"</span><span>"+defLabel+" "+fmt(def)+"</span></div>";
  let why;
  if(win)why=r>=2?"Victoire écrasante : vous étiez "+r.toFixed(1).replace(".",",")+" fois plus fort, les pertes sont minimes.":r>=1.3?"Net avantage (×"+r.toFixed(2).replace(".",",")+") : pertes modérées.":"Victoire de justesse (×"+r.toFixed(2).replace(".",",")+") : à force presque égale, on saigne beaucoup. Ajoutez des troupes pour perdre moins.";
  else{const miss=Math.max(1,Math.ceil(def/ATK_ADV-pw)),best=UNIT_ORDER.filter(k=>uReq(k)).sort((a,b)=>UNITS[b].atk*unitF(b,wtype)-UNITS[a].atk*unitF(a,wtype))[0],per=best?UNITS[best].atk*unitF(best,wtype)*pp:10;
    why="Défaite : il manquait <b>"+fmt(miss)+"</b> de force (vous aviez "+Math.round(r*100)+" % de ce qu’il fallait)."+(best?" Soit environ <b>"+Math.ceil(miss/per)+" "+UNITS[best].pl.toLowerCase()+"</b> de plus.":"")+" En cas de défaite, on perd au moins la moitié des troupes.";}
  h+='<p class="fwhy">'+why+"</p>";
  if(wtype)h+='<p class="desc">Cible '+TYPES[wtype].name+" : battue par "+TYPES[LOSES_TO[wtype]].name+" (×2), elle bat "+TYPES[BEATS[wtype]].name+" (×½). Les troupes sans voie prennent votre meilleure voie offensive.</p>";
  return h;}
function lootTable(rows,note){/* rows : [ressource, quantité] */
  return '<table class="ftab loot"><tbody>'+rows.filter(r=>r[1]>0).map(r=>'<tr><td><span class="c-'+r[0]+'">'+RES_NAME[r[0]]+'</span></td><td class="num">'+fmt(r[1])+"</td></tr>").join("")+"</tbody></table>"+(note?'<p class="desc">'+note+"</p>":"");}
const SPOIL=0.03;
function protectedAmt(){return Math.round(100*Math.pow(1.4,blvl("vac")));}
function huntAdvice(n,w,hp,withHero){
  const per=10*(1+mods().predPct)*matchup(w.type).f,mt=matchup(w.type),need=Math.max(1,Math.ceil((w.def/ATK_ADV-hp)/Math.max(0.1,per))),out=[];
  if(n<need)out.push("Envoyez plus de collectrices : il en fallait au moins <b>"+need+"</b> ici (vous : "+n+"). Produisez-en dans les ribosomes.");
  if(!ownedTypes().length)out.push("Aucune voie offensive : exprimez une voie de rang 3 en Prédation, elle double votre force contre la bonne cible.");
  else if(mt.f<1)out.push("Votre voie est <b>faible</b> contre "+WILD_NAME[w.type]+" : visez plutôt ce que vous battez sur la roue.");
  if(!withHero)out.push("Emmenez votre héros : il ajoute sa force et ne meurt jamais.");
  if(glvl("P1")<3||!has("P2"))out.push("Améliorez Pili adhésifs et exprimez Vésicules d’attaque : plus de force par collectrice.");
  return out;
}

/* Liens vers l’endroit où agir */
function refFor(q){
  const t=q[0],k=q[1];
  if(t==="f"){let bi=0,bl=-1;S.fields.forEach((f,i)=>{if(f.k===k&&f.l>bl){bl=f.l;bi=i;}});return "field:"+bi;}
  if(k==="noyau")return "noyau";
  const i=S.slots.findIndex(s=>s&&s.k===k);if(i>=0)return "slot:"+i;
  const e=S.slots.findIndex((s,j)=>!s&&slotOpen(j)&&!(S.build&&S.build.type==="new"&&S.build.i===j));return e>=0?"slot:"+e:"slot:6";
}
function reqLink(q){const t=q[0],k=q[1],l=q[2];if(t==="g")return nodeLink(k);if(t==="s"){const s=SPECIAL[k],cur=s.cur(),ok=cur>=l;return '<button class="lnk '+(ok?"ok":"no")+'" data-act="goto" data-tab="'+s.tab+'">'+(s.lbl?s.lbl(l)+" (vous : "+s.lbl(cur)+")":s.name+" "+l+" (vous : "+cur+")")+"</button>";}const cur=t==="b"?blvl(k):fmaxlvl(k),ok=reqMet(q);return '<button class="lnk '+(ok?"ok":"no")+'" data-act="goto" data-ref="'+refFor(q)+'" data-tab="cell">'+(t==="b"?BLD[k].name:FIELD[k].name)+" "+l+" (vous : "+cur+")</button>";}
function nodeLink(id){const ok=has(id);return '<button class="lnk '+(ok?"ok":"no")+'" data-act="goto" data-ref="node:'+id+'" data-tab="evo">'+NODES[id].name+"</button>";}

function log(msg,cls){S.log.unshift({t:S.t,msg,cls:cls||""});if(S.log.length>120)S.log.length=120;dirty=true;}
function toast(msg){const d=document.createElement("div");d.className="toast";d.textContent=String(msg).replace(/<[^>]+>/g,"");const box=document.getElementById("toasts");if(!box)return;box.appendChild(d);while(box.children.length>3)box.removeChild(box.firstChild);setTimeout(()=>d.remove(),3500);}
let catchUp=null; /* pendant le rattrapage hors ligne, les fenêtres sont mises de côté puis résumées en une seule */
function popup(p){if(catchUp){catchUp.push(p);return;}
  if(p.grp){const i=S.popups.findIndex(q=>q.grp===p.grp);if(i>=0){p.more=(S.popups[i].more||0)+1;S.popups.splice(i,1);}}
  S.popups.push(p);if(S.popups.length>5)S.popups.splice(0,S.popups.length-5);dirty=true;}
function stat(k,r,v){S.stats=S.stats||{};const o=S.stats[k]=S.stats[k]||{};o[r]=(o[r]||0)+v;}
