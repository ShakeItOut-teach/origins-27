/* Origins 27 · 08-recompenses.js
   Énergie, récompenses quotidiennes, coffres (avec l'ouverture animée), quêtes du jour et héros.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* ===== Énergie : chaque action la consomme ; seuls le temps, les coffres, les quêtes, les boss et les événements la rendent ===== */
const EN_MAX=30,EN_REGEN=20,EN_CAP=120,EN_COST={collect:1,explore:1,spy:1,hunt:2,raid:3,accel:5};
function enInit(){if(S.en==null){S.en=EN_MAX;S.enT=S.t;}}
function enStep(){enInit();if(S.en>=EN_MAX){S.enT=S.t;return;}const n=Math.floor((S.t-S.enT)/EN_REGEN);if(n>0){S.en=Math.min(EN_MAX,S.en+n);S.enT+=n*EN_REGEN;if(S.en>=EN_MAX)S.enT=S.t;}}
function enGive(n,why){enInit();const b=S.en;S.en=Math.min(EN_CAP,S.en+n);const g=S.en-b;if(g>0&&why)log("⚡ +"+g+" énergie : "+why+".","good");return g;}
function enCostFor(kind,T){if(kind==="collect"&&T&&T.ev)return 0;return EN_COST[kind]||0;}
function enSpend(c,quiet){enInit();if(!c)return true;if(S.en<c){if(!quiet)showModal(energyHTML(c));return false;}if(S.en>=EN_MAX)S.enT=S.t;S.en-=c;return true;}
function enNext(){return S.en>=EN_MAX?null:S.enT+EN_REGEN;}
function energyHTML(need){enInit();const nx=enNext();
  return '<div class="kick">Énergie</div><h2>'+(need?"Il vous faut ⚡ "+need:"⚡ "+S.en+" / "+EN_MAX)+"</h2>"+(need?"<p>Vous avez <b>"+S.en+"</b> énergie.</p>":"")+
  "<p>Chaque action en consomme : récolter ou explorer <b>1</b>, chasser <b>2</b>, piller <b>3</b>, accélérer un chantier ou un gène <b>5</b>. Récolter un gisement d’événement est gratuit.</p>"+
  '<h3>La regagner</h3><p class="desc">+1 toutes les '+EN_REGEN+" min de jeu, jusqu’à "+EN_MAX+(nx?' (prochaine dans <span data-end="'+nx+'"></span>)':" (jauge pleine : elle ne se recharge plus seule)")+".</p>"+
  '<p class="desc">Au-delà de '+EN_MAX+" (jusqu’à "+EN_CAP+"), seules les récompenses en donnent : connexion du jour, coffres (plus ils sont rares, plus il y en a), quêtes du jour, ligue du classement, boss vaincus et gisements d’événement.</p>"+
  '<div class="row" style="margin-top:10px"><button class="btn" data-act="rewards">🎁 Voir les récompenses</button><button class="btn alt" data-act="mclose">Fermer</button></div>';}
function enPill(){enInit();const nx=enNext();return '<span class="enpill'+(S.en<3?" low":"")+'" data-act="energy">⚡ <b>'+S.en+"</b>/"+EN_MAX+(nx?' <small>+1 <span data-end="'+nx+'"></span></small>':"")+"</span>";}
function accelHTML(w){const J=w==="r"?S.research:w==="m"?S.mres:S.build;if(!J||J.end-S.t<1)return "";return '<button class="accb" data-act="accel" data-w="'+w+'" data-tip="'+esc("<b>Accélérer</b>−1 h sur "+(w==="r"?"le gène":w==="m"?"la recherche militaire":"le chantier")+" en cours · ⚡ "+EN_COST.accel)+'">'+(J.end-S.t<=60?"⚡ Finir":"⚡−1h")+"</button>";}
function doAccel(w){const J=w==="r"?S.research:w==="m"?S.mres:S.build;if(!J||J.end-S.t<1)return;if(!enSpend(EN_COST.accel))return;const d=Math.min(60,J.end-S.t);J.end-=d;J.start-=d;toast("⚡ "+(w==="r"?"Gène":w==="m"?"Recherche":"Chantier")+" accéléré de "+fmtDur(d));}
/* ===== Récompenses : connexion quotidienne, coffre toutes les 4 h, quêtes du jour (en temps réel) ===== */
function dayKey(off){const d=new Date(Date.now()+(off||0)*86400e3);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();}
const DQ_POOL=[["hunt","Gagner 2 chasses",2],["raid","Réussir 1 pillage",1],["collect","Ramener 5 récoltes",5],["units","Produire 10 troupes",10],["build","Lancer 2 constructions",2],["def","Repousser 1 attaque",1],["gene","Lancer 1 gène",1]];
const CHEST_MS=4*3600e3;
function rwInit(){S.daily=S.daily||{last:"",streak:0};if(S.chestAt==null)S.chestAt=Date.now();
  if(!S.dq||S.dq.day!==dayKey()){const pool=DQ_POOL.slice(),list=[];while(list.length<3){const q=pool.splice(Math.floor(Math.random()*pool.length),1)[0];if(q[0]==="raid"&&S.t<1440)continue;list.push({id:q[0],txt:q[1],goal:q[2],got:0,done:false});}S.dq={day:dayKey(),list,bonus:false};}}
function dqAdd(id,n){if(!S||!S.dq||catchUp)return;S.dq.list.forEach(q=>{if(q.id===id&&!q.done&&q.got<q.goal){q.got=Math.min(q.goal,q.got+(n||1));if(q.got>=q.goal)toast("🎯 Quête du jour : "+q.txt+" ✔");}});}
function rwBase(){return (120+70*S.noyau+40*(S.stage||1))*PACE;}
/* Ce qui ne rentre pas dans les entrepôts va en réserve : rien n’est perdu, la réserve se vide dès qu’il y a de la place. */
function giveRes(mult,ks,items){const cap=rates().cap,got=[];let kept=0;S.stash=S.stash||{};(ks||RES).forEach(r=>{const v=Math.round(rwBase()*mult*(r==="nuc"?0.4:1)),b=S.res[r];S.res[r]=Math.max(b,Math.min(cap,b+v));const over=v-(S.res[r]-b);if(over>0){S.stash[r]=(S.stash[r]||0)+over;kept+=over;}got.push(fmt(v)+" "+RES_NAME[r].toLowerCase());if(items)items.push({k:"res",r,v});});
  if(kept>1){got.push(fmt(kept)+" mis en réserve (entrepôts pleins)");if(items)items.kept=kept;}return got;}
function stashTotal(){return S.stash?RES.reduce((a,r)=>a+(S.stash[r]||0),0):0;}
function stashStep(){if(!S.stash)return;const cap=rates().cap;RES.forEach(r=>{const s=S.stash[r]||0;if(s<=0)return;const room=cap-S.res[r];if(room<=0)return;const m=Math.min(room,s);S.res[r]+=m;S.stash[r]=s-m;});}
function stashHTML(){const t=stashTotal();if(t<1)return "";return '<div class="stash">🧺 Réserve des récompenses : '+RES.filter(r=>S.stash[r]>=1).map(r=>'<span class="c-'+r+'">'+fmt(S.stash[r])+" "+RES_NAME[r].toLowerCase()+"</span>").join(" · ")+'<br><span class="desc">Elle remplit vos entrepôts automatiquement dès qu’il y a de la place. Dépensez ou agrandissez la vacuole pour la vider plus vite.</span></div>';}
function bestTroop(){const ks=["sold","coll"].filter(k=>uReq(k)||k==="coll");return ks[0];}
function giveTroops(k,n){S.army[k]=(S.army[k]||0)+n;syncIdle();return n+" "+(n>1?UNITS[k].pl:UNITS[k].name).toLowerCase();}
function dailyDay(){const d=S.daily;const next=d.last===dayKey(-1)?d.streak+1:1;return ((next-1)%7)+1;}
function rwCount(){rwInit();return (S.daily.last!==dayKey()?1:0)+(Date.now()>=S.chestAt?1:0)+S.dq.list.filter(q=>q.got>=q.goal&&!q.done).length+(S.dq.list.every(q=>q.done)&&!S.dq.bonus?1:0)+(S.rkRew&&!S.rkRew.done?1:0);}
const DAILY_TXT=["","🧪","🧪 ×1,5","🦠 ×5","🧪 ×2","⏩ 2 h","🧪 ×2,5","🧬 ×3"];
const DAILY_LONG=["","des ressources","des ressources ×1,5","des troupes offertes","des ressources ×2","le chantier et le gène en cours accélérés de 2 h","des ressources ×2,5","une mutation à choisir et des ressources ×3"];
function claimDaily(){rwInit();const d=S.daily;if(d.last===dayKey())return;d.streak=d.last===dayKey(-1)?d.streak+1:1;d.last=dayKey();const n=((d.streak-1)%7)+1;let got=[];
  if(n===1)got=giveRes(0.5);else if(n===2)got=giveRes(0.75);else if(n===3)got=[giveTroops(bestTroop(),bestTroop()==="sold"?5:10)];else if(n===4)got=giveRes(1);
  else if(n===5){if(S.build)S.build.end=Math.max(S.t,S.build.end-120);if(S.research)S.research.end=Math.max(S.t,S.research.end-120);got=["−2 h sur le chantier et le gène en cours"];}
  else if(n===6)got=giveRes(1.25);else{got=giveRes(1.5);if(!S.mutOffer)offerMut();got.push("une mutation à choisir");}
  {const e=enGive(n===7?30:10+2*n);if(e)got.push("⚡ +"+e+" énergie");}
  log("🎁 Récompense du jour "+n+" (série de "+d.streak+" jours) : "+got.join(", ")+".","good");toast("🎁 Jour "+n+" : "+got.join(", "));}
const CHEST_TIERS=[{n:"Commun",m:1,p:0.70,c:"#9fb3c8",e:"📦"},{n:"Rare",m:2,p:0.20,c:"#5ee6d0",e:"🎁"},{n:"Très rare",m:4,p:0.08,c:"#b28bff",e:"💎"},{n:"Extrêmement rare",m:8,p:0.02,c:"#ffd166",e:"👑"}];
function rollTier(){let r=Math.random();for(const T of CHEST_TIERS){if(r<T.p)return T;r-=T.p;}return CHEST_TIERS[0];}
function openChest(T,items){const m=T.m,got=[],ks=RES.slice().sort(()=>Math.random()-0.5).slice(0,m>=4?4:m>=2?3:2);
  got.push(...giveRes((0.45+Math.random()*0.5)*m,ks,items));
  const e=enGive(4*m);if(e){got.push("⚡ +"+e+" énergie");if(items)items.push({k:"en",v:e});}
  const x=Math.random();
  if(x<0.2){const el=UNIT_ORDER.filter(k=>UNITS[k].type&&uReq(k));if(el.length){const u=el[Math.floor(Math.random()*el.length)];got.push(giveTroops(u,2*m));if(items)items.push({k:"unit",u,v:2*m});}}
  else if(x<0.4){const xp=Math.round(xpNeed(S.hero.lvl)*0.3*m);S.hero.xp+=xp;got.push("+"+xp+" XP pour le héros");if(items)items.push({k:"xp",v:xp});const H=S.hero;while(H.xp>=xpNeed(H.lvl)){H.xp-=xpNeed(H.lvl);H.lvl++;}}
  return got;}
function claimChest(){rwInit();if(Date.now()<S.chestAt)return null;S.chestAt=Date.now()+CHEST_MS;const T=rollTier(),items=[],got=openChest(T,items);
  log(T.e+" Coffre "+T.n.toLowerCase()+" (×"+T.m+") : "+got.join(", ")+".",T.m>1?"rare":"good");
  S.lastChest={n:T.n,m:T.m,e:T.e,c:T.c,got};return {T,items};}
/* Ouverture de coffre animée : le coffre tombe, monte en rareté (gris → turquoise → violet → or), s'ouvre dans un éclat
   de lumière, puis les récompenses en sortent une à une. Un toucher passe directement au résultat. */
function chestSVG(){return '<svg class="cfx-chest" viewBox="0 0 140 120" aria-hidden="true"><ellipse cx="70" cy="112" rx="52" ry="7" fill="rgba(0,0,0,.45)"/>'+
  '<ellipse class="cfx-in" cx="70" cy="54" rx="44" ry="12" fill="var(--tc)"/>'+
  '<rect x="22" y="54" width="96" height="54" rx="6" fill="#4a3322"/><rect x="22" y="54" width="96" height="10" fill="#5c412b"/>'+
  '<rect x="22" y="54" width="96" height="54" rx="6" fill="none" stroke="var(--tc)" stroke-width="5"/><rect x="38" y="54" width="8" height="54" fill="var(--tc)"/><rect x="94" y="54" width="8" height="54" fill="var(--tc)"/>'+
  '<g class="cfx-lid"><path d="M18 56 L18 38 Q18 16 70 14 Q122 16 122 38 L122 56 Z" fill="#5c412b"/><path d="M18 56 L18 38 Q18 16 70 14 Q122 16 122 38 L122 56 Z" fill="none" stroke="var(--tc)" stroke-width="5"/>'+
  '<rect x="38" y="16" width="8" height="40" fill="var(--tc)"/><rect x="94" y="16" width="8" height="40" fill="var(--tc)"/><path d="M30 30 Q70 18 110 30" stroke="rgba(255,255,255,.25)" stroke-width="3" fill="none"/></g>'+
  '<rect x="60" y="48" width="20" height="24" rx="4" fill="var(--tc)"/><rect x="67" y="56" width="6" height="9" rx="2" fill="#2a1a0e"/></svg>';}
function chestItemHTML(it){let ic,lb;
  if(it.k==="res"){ic=sprImg("r_"+it.r,2);lb='<span class="c-'+it.r+'">'+RES_NAME[it.r]+"</span>";}
  else if(it.k==="en"){ic='<span class="cfx-emo">⚡</span>';lb="Énergie";}
  else if(it.k==="unit"){ic=unitIcon(it.u);lb=(it.v>1?UNITS[it.u].pl:UNITS[it.u].name);}
  else {ic='<span class="cfx-emo">⭐</span>';lb="XP du héros";}
  return '<div class="cfx-it"><span class="cfx-ic">'+ic+'</span><b data-v="'+it.v+'">+0</b><small>'+lb+"</small></div>";}
function chestFX(T,items){const old=document.getElementById("chestfx");if(old)old.remove();
  const ti=Math.max(0,CHEST_TIERS.indexOf(T)),el=document.createElement("div"),np=14+ti*12;let ps="";
  for(let i=0;i<np;i++){const a=Math.random()*Math.PI*2,d=110+Math.random()*(160+ti*50);ps+='<i class="cfx-p" style="--x:'+Math.round(Math.cos(a)*d)+"px;--y:"+Math.round(Math.sin(a)*d-40)+"px;--r:"+Math.round(Math.random()*720-360)+"deg;--d:"+Math.round(Math.random()*120)+"ms;--s:"+(0.6+Math.random()*0.9).toFixed(2)+'"></i>';}
  el.id="chestfx";el.className="t"+ti;el.setAttribute("role","dialog");el.setAttribute("aria-label","Coffre "+T.n+", multiplicateur "+T.m);el.style.setProperty("--tc",CHEST_TIERS[0].c);
  el.innerHTML='<div class="cfx-rays"></div><div class="cfx-tier"><span class="k">Coffre</span><span class="n">'+T.n+'</span><span class="m">×'+T.m+'</span></div><div class="cfx-stage"><div class="cfx-upg"></div>'+chestSVG()+ps+'</div><div class="cfx-items">'+items.map(chestItemHTML).join("")+"</div>"+(items.kept?'<p class="cfx-kept">🧺 '+fmt(items.kept)+" mis en réserve : vos entrepôts sont pleins.</p>":"")+'<button class="btn cfx-btn">Récupérer</button><p class="cfx-hint">Touchez pour passer</p>';
  document.body.appendChild(el);
  const timers=[],at=(ms,f)=>timers.push(setTimeout(f,ms)),cards=[...el.querySelectorAll(".cfx-it")];
  const count=(b,instant)=>{const v=+b.dataset.v;if(instant){b.textContent="+"+fmt(v);return;}const t0=performance.now(),go=now=>{const k=Math.min(1,(now-t0)/450);b.textContent="+"+fmt(Math.round(v*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(go);};requestAnimationFrame(go);};
  const bump=i=>{el.style.setProperty("--tc",CHEST_TIERS[i].c);const u=el.querySelector(".cfx-upg");u.textContent=CHEST_TIERS[i].n+" !";el.classList.remove("up");void el.offsetWidth;el.classList.add("up");};
  const open=()=>{el.style.setProperty("--tc",T.c);el.classList.remove("up");el.classList.add("open");};
  const card=(c,instant)=>{if(c.classList.contains("in"))return;c.classList.add("in");count(c.querySelector("b"),instant);};
  const finish=()=>{timers.forEach(clearTimeout);open();cards.forEach(c=>card(c,true));el.classList.add("done");};
  const close=()=>{timers.forEach(clearTimeout);document.removeEventListener("keydown",key);el.classList.add("bye");setTimeout(()=>el.remove(),180);};
  const key=e=>{if(e.key==="Escape"||e.key==="Enter"||e.key===" "){e.preventDefault();el.classList.contains("done")?close():finish();}};
  document.addEventListener("keydown",key);
  el.addEventListener("click",e=>{e.stopPropagation();if(el.classList.contains("done")){if(e.target.closest(".cfx-btn")||!e.target.closest(".cfx-items"))close();}else finish();});
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){finish();return;}
  for(let i=1;i<=ti;i++)at(380+i*380,()=>bump(i));
  const tOpen=560+ti*380;at(tOpen,open);
  cards.forEach((c,j)=>at(tOpen+320+j*130,()=>card(c,false)));
  at(tOpen+320+cards.length*130+380,()=>{el.classList.add("done");el.querySelector(".cfx-btn").focus();});}
function claimDq(j){const q=S.dq.list[j];if(!q||q.done||q.got<q.goal)return;q.done=true;const got=giveRes(0.8);{const e=enGive(5);if(e)got.push("⚡ +"+e);}toast("🎯 "+got.join(", "));
  if(S.dq.list.every(x=>x.done)&&!S.dq.bonus){S.dq.bonus=true;S.chestAt=Math.min(S.chestAt,Date.now());toast("Les 3 quêtes du jour : un coffre offert !");}}
function rewardsHTML(){rwInit();const d=S.daily,can=d.last!==dayKey(),cur=can?dailyDay():((d.streak-1)%7)+1;
  let h='<div class="kick">Récompenses</div><h2>Chaque jour compte</h2>';enInit();
  h+=stashHTML();h+='<p class="desc">'+enPill()+" Les récompenses sont la seule façon de dépasser "+EN_MAX+" d’énergie (jusqu’à "+EN_CAP+").</p>";
  if(S.rkRew&&!S.rkRew.done)h+="<h3>Ligue du classement mondial</h3>"+leagueRewardHTML(true);
  {const sr=can&&d.last!==dayKey(-1)?0:d.streak;h+='<h3>Connexion quotidienne · '+(sr?"série de "+sr+" jour"+(sr>1?"s":""):"nouvelle série")+'</h3>';}h+='<div class="dtrack">'+[1,2,3,4,5,6,7].map(n=>{const st=n<cur||(!can&&n===cur)?"got":n===cur&&can?"now":"";return '<div class="dday '+st+'"><b>J'+n+"</b><span>"+DAILY_TXT[n]+"</span></div>";}).join("")+"</div>";
  h+=can?'<p class="desc">Aujourd’hui : '+DAILY_LONG[cur]+" et ⚡ "+(cur===7?30:10+2*cur)+' énergie.</p><button class="btn" data-act="rwdaily">Récupérer le jour '+cur+"</button>":'<p class="desc">Revenez demain pour le jour '+(cur%7+1)+". Manquer un jour remet la série à zéro.</p>";
  const ready=Date.now()>=S.chestAt;
  h+='<h3>Coffre gratuit</h3><p class="desc">Un coffre toutes les 4 heures : ressources, énergie, et parfois de l’expérience pour le héros ou des troupes d’élite. Sa rareté multiplie tout son contenu. Rien n’est perdu : ce qui ne rentre pas dans vos entrepôts attend en réserve.</p><div class="tiers">'+CHEST_TIERS.map(T=>'<span style="--tc:'+T.c+'">'+T.e+" "+T.n+"<small><b>×"+T.m+"</b> · "+Math.round(T.p*100)+" %</small></span>").join("")+"</div>"+(S.lastChest?'<p class="desc">Dernier coffre : <b style="color:'+S.lastChest.c+'">'+S.lastChest.e+" "+S.lastChest.n+" ×"+S.lastChest.m+"</b>.</p>":"")+(ready?'<button class="btn" data-act="rwchest">📦 Ouvrir le coffre</button>':'<p>Prochain coffre dans <b>'+fmtDur((S.chestAt-Date.now())/60000)+"</b> (temps réel).</p>");
  h+="<h3>Quêtes du jour</h3>"+S.dq.list.map((q,j)=>'<div class="dq'+(q.done?" done":"")+'"><span>'+q.txt+'</span><span class="bar"><i style="width:'+Math.round(q.got/q.goal*100)+'%"></i></span><span class="num">'+q.got+"/"+q.goal+"</span>"+(q.done?"<span>✔</span>":q.got>=q.goal?'<button class="btn sm" data-act="rwdq" data-j="'+j+'">Prendre</button>':"<span></span>")+"</div>").join("");
  h+='<p class="desc">'+(S.dq.bonus?"Bonus du jour obtenu.":"Les trois quêtes terminées offrent un coffre de plus.")+" Nouvelles quêtes demain.</p>";
  return h+'<button class="btn alt" data-act="mclose">Fermer</button>';}
function report(cat,title,lines,win){S.reports.unshift({id:S.nextId++,t:S.t,cat,title,lines,win:win==null?null:!!win,read:false});if(S.reports.length>120)S.reports.length=120;dirty=true;}
function unread(cat){return S.reports.filter(r=>!r.read&&(!cat||r.cat===cat)).length;}
function traitLevel(k){return Math.min(10,Math.floor(Math.sqrt(S.hero.tp[k]*2)));}
function heroTop(){return Object.keys(TRAITS).map(k=>[k,traitLevel(k),S.hero.tp[k]]).sort((a,b)=>b[1]-a[1]||b[2]-a[2]);}
function heroForm(){const t=heroTop();if(S.hero.lvl<3||t[1][1]<1)return "Larve";return FORMS[[t[0][0],t[1][0]].sort().join("+")];}
function heroPair(){const t=heroTop();return heroForm()==="Larve"?[]:[t[0][0],t[1][0]];}
function formMult(wtype){const pr=heroPair();let f=1;pr.forEach(k=>{const t=TRAITS[k].from;if(BEATS[t]===wtype)f=Math.max(f,1.3);});pr.forEach(k=>{const t=TRAITS[k].from;if(LOSES_TO[t]===wtype)f=Math.min(f,0.75);});return f;}
function heroBase(){const H=S.hero;return 15+12*H.lvl+3*Object.keys(TRAITS).reduce((a,k)=>a+traitLevel(k),0);}
function heroPower(wtype){return Math.round(heroBase()*formMult(wtype));}
function xpNeed(L){return Math.round(20*Math.pow(L,1.5));}

