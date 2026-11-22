/* Origins 27 · 10-classement.js
   Classement mondial, ligues, gain d'expérience du héros, migration.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* ===== Classement mondial : 5 catégories, tendances jour après jour, ligues et récompense quotidienne ===== */
const RK_CATS=[["pow","🏆 Puissance","Points"],["atk","⚔ Attaque","Attaque"],["def","🛡 Défense","Défense"],["loot","💰 Pillards","Butin"],["ally","🏳 Alliances","Points"]];
const LEAGUES=[[0.01,"👑","Souverain",3],[0.05,"💎","Diamant",2],[0.15,"🥇","Or",1.5],[0.35,"🥈","Argent",1.1],[0.65,"🥉","Bronze",0.8],[1,"🦠","Plancton",0.5]];
function sumRes(o){return o?RES.reduce((a,k)=>a+(o[k]||0),0):0;}
function playerDefFull(){const D=defParts();let s=0;D.P.forEach((p,i)=>{s+=i===1?compDef(armyAll()):i===6?Math.round(heroBase()*0.6):p[1];});return Math.round(s*D.mult);}
function playerPowRaw(){return playerAtk()+playerDefFull()+baseStage()*60;}
function playerPow(){return Math.round(S.rkPow!=null?S.rkPow:playerPowRaw());}
function rkVal(cat,b){if(!b)return cat==="pow"?playerPow():cat==="atk"?playerAtk():cat==="def"?playerDefFull():Math.round(sumRes((S.stats||{}).lootIn));
  const p=botPow(b);return cat==="pow"?p:cat==="atk"?Math.round(p*(0.3+0.3*b.aggr)):cat==="def"?Math.round(p*(0.55-0.25*b.aggr)):Math.round(b.lw||0);}
function botPow(b){if(b.age==null)b.age=((b.id*7919)%997)/997*1.5;return Math.round(130+600*(bDays()+b.age)*b.g+botStage(b)*60);}
function rkRows(cat){
  if(cat==="ally"){const pp=playerPow();return Object.keys(ALLY_INFO).map(t=>{const bs=allyBots(t);return {id:t,n:t+" "+ALLY_INFO[t],v:bs.reduce((a,b)=>a+botPow(b),0)+(S.ally===t?pp:0),m:bs.length+(S.ally===t?1:0),me:S.ally===t};}).sort((a,b)=>b.v-a.v);}
  const rows=S.bots.map(b=>({id:b.id,b,v:rkVal(cat,b)}));rows.push({id:"me",me:true,v:rkVal(cat,null)});
  return rows.sort((a,b)=>b.v-a.v||(a.me?-1:b.me?1:0));}
function myRank(cat){return rkRows(cat||"pow").findIndex(r=>r.me)+1;}
function leagueCut(L){return Math.max(1,Math.round(L[0]*(S.bots.length+1)));}
function leagueOf(rank){return LEAGUES.find(L=>rank<=leagueCut(L))||LEAGUES[LEAGUES.length-1];}
function rkSnap(){const p={};RK_CATS.forEach(c=>{const o={};rkRows(c[0]).forEach((r,i)=>{o[r.id]=i+1;});p[c[0]]=o;});S.rk={day:dayIdx(S.t),prev:p};}
function rkTick(){if(!S.bots)return;{const raw=playerPowRaw();S.rkPow=S.rkPow==null?raw:S.rkPow+(raw-S.rkPow)*0.08;}if(S.t<360)return;const dn=dayIdx(S.t);
  if(!S.rk){rkSnap();}
  else if(S.rk.day!==dn){const r=myRank("pow"),L=leagueOf(r);S.rkRew={lg:LEAGUES.indexOf(L),rank:r,day:S.rk.day+1,done:false};rkSnap();
    log(L[1]+" Fin du jour "+S.rkRew.day+" : vous finissez #"+r+" du classement mondial, ligue "+L[2]+". Récompense de ligue à récupérer (🎁).","good");}
  const r=myRank("pow"),li=LEAGUES.indexOf(leagueOf(r));S.rkBest=Math.min(S.rkBest||999,r);
  if(S.rkLg!=null&&li<S.rkLg){const L=LEAGUES[li];log(L[1]+" Promotion : ligue "+L[2]+" (rang #"+r+").","rare");
    popup({grp:"league",kick:"Classement mondial",title:L[1]+" Ligue "+L[2],body:"<p>Vous montez au rang <b>#"+r+"</b> sur "+(S.bots.length+1)+".</p><p class=\"desc\">À la fin de chaque jour de jeu, votre ligue vous rapporte une récompense : ×"+String(L[3]).replace(".",",")+" en ligue "+L[2]+".</p>"});}
  else if(S.rkLg!=null&&li>S.rkLg)log("📉 Vous redescendez en ligue "+LEAGUES[li][2]+" (rang #"+r+").","bad");
  S.rkLg=li;}
function claimLeague(){const R=S.rkRew;if(!R||R.done)return;R.done=true;const L=LEAGUES[R.lg],got=giveRes(L[3]);{const e=enGive(Math.round(6*L[3]));if(e)got.push("⚡ +"+e+" énergie");}
  if(R.lg===0){const el=UNIT_ORDER.filter(k=>UNITS[k].type&&uReq(k));if(el.length)got.push(giveTroops(el[Math.floor(Math.random()*el.length)],5));}
  log(L[1]+" Récompense de ligue "+L[2]+" : "+got.join(", ")+".","good");toast(L[1]+" Ligue "+L[2]+" : "+got.join(", "));}
function leagueRewardHTML(inModal){const R=S.rkRew;if(!R||R.done)return inModal?"":'<p class="desc">Chaque fin de jour de jeu, votre ligue vous rapporte des ressources (de ×0,5 en Plancton à ×3 en Souverain).</p>';const L=LEAGUES[R.lg];
  return '<div class="lgrew"><span>'+L[1]+" Jour "+R.day+" terminé #"+R.rank+", ligue <b>"+L[2]+"</b> : ressources ×"+String(L[3]).replace(".",",")+(R.lg===0?" + 5 troupes d’élite":"")+'</span><button class="btn sm" data-act="rwleague">Récupérer</button></div>';}
function rkTrend(prev,id,i){const p=prev[id];if(!p)return '<span class="muted">·</span>';const d=p-(i+1);return d>0?'<span class="up">▲'+d+"</span>":d<0?'<span class="neg">▼'+(-d)+"</span>":'<span class="muted">=</span>';}
function worldRankHTML(){
  const cat=S.rkCat||"pow",C=RK_CATS.find(c=>c[0]===cat),n=S.bots.length+1,rows=rkRows(cat),prev=(S.rk&&S.rk.prev&&S.rk.prev[cat])||{};
  const pw=cat==="pow"?rows:rkRows("pow"),r=pw.findIndex(x=>x.me)+1,L=leagueOf(r),li=LEAGUES.indexOf(L),above=pw[r-2],nextL=li>0?LEAGUES[li-1]:null;
  let h='<div class="card wrk"><h2>🌍 Classement mondial</h2>';
  h+='<div class="rksum"><div class="rkbig"><b>#'+r+"</b><span>sur "+n+'</span></div><div class="rkinfo"><div class="rklg">'+L[1]+" Ligue "+L[2]+" "+rkTrend((S.rk&&S.rk.prev&&S.rk.prev.pow)||{},"me",r-1)+'</div>';
  h+='<div class="desc">'+(above?"Encore <b>"+fmt(above.v-pw[r-1].v+1)+"</b> points pour dépasser "+esc(above.b.name)+" (#"+(r-1)+")":'<span class="up">Vous dominez le monde.</span>')+"</div>";
  if(nextL){const cut=leagueCut(nextL);h+='<div class="desc">'+nextL[1]+" "+nextL[2]+" à partir du rang #"+cut+" : encore "+(r-cut)+" place"+(r-cut>1?"s":"")+"</div>";}
  {const raw=playerPowRaw(),cur=pw[r-1].v;if(Math.abs(raw-cur)>cur*0.05)h+='<div class="desc">Puissance réelle '+fmt(raw)+' '+(raw>cur?'<span class="up">↗</span>':'<span class="neg">↘</span>')+" : le classement la rattrape en quelques heures.</div>";}
  h+='<div class="desc">Puissance '+fmt(pw[r-1].v)+" · meilleur rang #"+(S.rkBest||r)+"</div></div></div>";
  h+='<div class="lgrow">'+LEAGUES.slice().reverse().map(x=>'<span class="'+(x===L?"on":"")+'"><i>'+x[1]+"</i>"+x[2]+"<small>"+(x[0]<1?"top "+leagueCut(x):"tous")+"</small></span>").join("")+"</div>";
  h+=leagueRewardHTML(false);
  h+='<div class="rkchips">'+RK_CATS.map(c=>'<button data-act="rkcat" data-c="'+c[0]+'" aria-pressed="'+(c[0]===cat)+'">'+c[1]+"</button>").join("")+"</div>";
  if(cat==="ally"){
    h+='<table class="rank"><thead><tr><th>#</th><th></th><th>Alliance</th><th class="num">Membres</th><th class="num">Points</th></tr></thead><tbody>'+rows.map((x,i)=>'<tr'+(x.me?' class="me"':"")+"><td>"+(i+1)+"</td><td>"+rkTrend(prev,x.id,i)+"</td><td>"+esc(x.n)+(x.me?" (vous)":"")+'</td><td class="num">'+x.m+'</td><td class="num">'+fmt(x.v)+"</td></tr>").join("")+"</tbody></table>";
    return h+'<p class="desc" style="margin-top:8px">Somme des points de tous les membres. Rejoindre une alliance y ajoute les vôtres.</p></div>';}
  const me=rows.findIndex(x=>x.me),show=new Set();
  if(S.rkAll)rows.forEach((x,i)=>show.add(i));else{for(let i=0;i<10;i++)show.add(i);for(let i=me-2;i<=me+2;i++)if(i>=0&&i<rows.length)show.add(i);}
  const line=(x,i)=>{if(x.me)return '<tr class="me"><td>'+(i+1)+"</td><td>"+rkTrend(prev,"me",i)+"</td><td>"+sprImg(STAGE_SPR[baseStage()],1)+" Vous ("+esc(SOUCHES[S.souche].name)+")"+(S.ally?' <span class="muted">'+S.ally+"</span>":"")+'</td><td class="num">'+fmt(x.v)+"</td></tr>";
    const b=x.b,seen=S.tiles[b.y*W+b.x].s,ic=(S.ally&&b.tag===S.ally?" 🤝":"")+(b.nem?" 🎯":"");
    return "<tr"+(seen?' class="go" data-act="goto" data-tab="map" data-ref="tile:'+b.x+":"+b.y+'"':"")+"><td>"+(i+1)+"</td><td>"+rkTrend(prev,b.id,i)+"</td><td>"+sprImg(STAGE_SPR[botStage(b)],1)+" "+(b.tag?'<span class="muted">'+b.tag+"</span> ":"")+esc(b.name)+ic+(seen?" 📍":"")+'</td><td class="num">'+fmt(x.v)+"</td></tr>";};
  h+='<table class="rank"><thead><tr><th>#</th><th></th><th>Organisme</th><th class="num">'+C[2]+"</th></tr></thead><tbody>";let last=-1;
  rows.forEach((x,i)=>{if(!show.has(i))return;if(last>=0&&i>last+1)h+='<tr><td colspan="4" class="muted">…</td></tr>';h+=line(x,i);last=i;});
  h+="</tbody></table>";
  h+='<div class="row" style="margin-top:8px;justify-content:space-between"><span class="desc">'+({pow:"Puissance de tout l’organisme : attaque de l’armée + défense + stade × 60.",atk:"Force d’attaque de toute l’armée.",def:"Défense de la base, toute l’armée rentrée et le héros présent.",loot:"Ressources pillées depuis le début de la partie."}[cat])+" ▲▼ : évolution depuis le début du jour. 📍 : position connue, touchez pour la voir.</span>"+'<button class="btn sm alt" data-act="rkall">'+(S.rkAll?"Réduire":"Voir les "+n)+"</button></div>";
  return h+"</div>";
}

function heroGain(w,win,pvp){
  const H=S.hero,xp=Math.max(1,Math.round(w.def*(win?1:0.4)*(pvp?1:PVE_RATIO))),tk=TYPE_TRAIT[w.type],tl0=traitLevel(tk);
  H.xp+=xp;H.fights++;if(win)H.wins++;H.tp[tk]+=win?0.3:0.1;
  let msg="Héros : +"+xp+" XP ("+(pvp?"combat entre joueurs : XP complète":"combat PvE, 1/10 d’un combat entre joueurs")+"), trait "+TRAITS[tk].name+" renforcé.";
  if(traitLevel(tk)>tl0)msg+=" "+TRAITS[tk].name+" passe au niveau "+traitLevel(tk)+".";
  while(H.xp>=xpNeed(H.lvl)){H.xp-=xpNeed(H.lvl);H.lvl++;log("Votre héros passe au niveau "+H.lvl+".","good");popup({grp:"herolvl",kick:"Héros",title:"Niveau "+H.lvl,body:"<p>Votre héros gagne en force : "+heroBase()+" de base au combat.</p>",hero:1});}
  const f=heroForm();if(f!==H.form){H.form=f;if(H.seen.indexOf(f)<0)H.seen.push(f);log("Votre héros prend la forme : "+f+".","rare");const pr=heroPair();popup({kick:"Métamorphose du héros",title:f,body:"<p>Ses combats ont façonné son corps : "+pr.map(k=>TRAITS[k].name.toLowerCase()).join(" et ")+".</p>"+formStrengthHTML(),hero:1});}
  return msg;
}
function formStrengthHTML(){const pr=heroPair();if(!pr.length)return '<p class="desc">Encore une larve : pas de forces ni de faiblesses marquées.</p>';const st=pr.map(k=>BEATS[TRAITS[k].from]),wk=pr.map(k=>LOSES_TO[TRAITS[k].from]);return '<p class="desc">Fort contre '+[...new Set(st)].map(t=>WILD_NAME[t]).join(", ")+" (+30 %). Faible contre "+[...new Set(wk)].map(t=>WILD_NAME[t]).join(", ")+" (−25 %).</p>";}
function spawnWild(){const near=Math.random()<0.6,c=cpos();for(let g=0;g<300;g++){let x,y;if(near){const a=Math.random()*Math.PI*2,r=4+Math.random()*10;x=Math.round(c[0]+Math.cos(a)*r);y=Math.round(c[1]+Math.sin(a)*r);if(x<0||y<0||x>=W||y>=H)continue;}else{x=Math.floor(Math.random()*W);y=Math.floor(Math.random()*H);}if(!inWorld(x,y)||isLand(x,y))continue;const T=S.tiles[y*W+x];if(T.k||T.w||dist(x,y)<4||botAt(x,y))continue;const r=rC(x,y),type=TYPE_ORDER[Math.floor(Math.random()*5)],mx=Math.round(200+cen(x,y)*20);T.w={type,def:Math.round(20+cen(x,y)*4+Math.random()*15),bio:mx,max:mx,mb:mx};return;}}
function migRange(){return 4+2*blvl("flag")+Math.max(0,mods().rangeAdd);}
function migCost(d){return {atp:Math.round(60*d),lip:Math.round(40*d),prot:Math.round(30*d)};}
function migTime(d){return TIME_F*20*d/(1+0.3*blvl("flag"))/Math.max(0.3,1+mods().speedPct);}
function migBlock(x,y){const T=S.tiles[y*W+x],d=dist(x,y);if(!inWorld(x,y))return "C’est de la roche.";if(isLand(x,y))return "Terre ferme : votre lignée devra évoluer avant d’y vivre.";if(botAt(x,y))return "Case occupée par un rival.";if(S.mig)return "Une migration est déjà en cours.";if(!T.s)return "Case inconnue : explorez-la d’abord.";if(T.k||T.w)return "Il faut une case d’eau libre.";if(d>migRange())return "Trop loin pour migrer (portée "+migRange()+" cases, augmentez le flagelle).";if(S.missions.length)return "Rappelez d’abord vos collectrices en mission.";return capBlock(migCost(d));}
function lvlCost(id,L){const n=NODES[id],f=Math.max(0.3,1+mods().evoCost),g=Math.pow(1.45,L-1)*costF(L+(n.tier||0));return {nuc:Math.round(n.cost*0.8*g*f),atp:Math.round(n.cost*0.4*g)};}
function lvlTime(id,L){return TIME_F*NODES[id].time*0.6*Math.pow(1.35,L-1)/(1+0.05*S.noyau);}
function lvlBlock(id){if(!has(id))return "Gène non exprimé.";const L=glvl(id);if(L>=maxLvl(id))return "Niveau maximum atteint.";if(S.research)return "Un gène est déjà en cours d’expression.";return capBlock(lvlCost(id,L));}
