/* Origins 27 · 15-panneaux.js
   Panneaux : mouvements et rapports, héros, icônes et onglet des troupes, espionnage.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Mouvements */
function missionLabel(M){return (M.kind==="spy"?tr("Espionnage","Spying"):M.kind==="raid"?tr("Pillage","Raid"):M.kind==="hunt"?tr("Chasse","Hunt"):S.tiles[M.y*W+M.x].k?tr("Collecte","Harvest"):"Exploration")+tr(" · case "," · tile ")+M.x+","+M.y;}
let freshIds=new Set();
function reportCards(cat){
  const list=S.reports.filter(r=>r.cat===cat);
  if(!list.length)return '<p class="muted">'+(cat==="combat"?tr("Aucun combat pour l’instant. Chassez un organisme sauvage depuis les abysses.","No fights yet. Hunt a wild organism from the abyss."):tr("Aucune récolte pour l’instant.","No harvests yet."))+"</p>";
  return list.slice(0,60).map(r=>'<div class="rep'+(freshIds.has(r.id)?" fresh":"")+(r.win===true?" win":r.win===false?" lose":"")+'"><div class="rh"><b>'+r.title+"</b><time>"+fmtClock(r.t)+"</time></div>"+r.lines.map(l=>/^<(table|div|p)/.test(l)?l:"<p>"+l+"</p>").join("")+"</div>").join("");
}
function activityHTML(){
  const subs=[["move",tr("En route","On the way"),S.missions.length+(S.inc?S.inc.length:0)],["combat",tr("Combats","Fights"),unread("combat")],["farm",tr("Récoltes","Harvests"),unread("farm")],["rank",tr("Classement","Ranking"),0],["log",tr("Journal","Log"),0]];
  let h='<div class="activity"><div class="subtabs">'+subs.map(t=>'<button data-act="sub" data-s="'+t[0]+'" aria-pressed="'+(actSub===t[0])+'">'+t[1]+(t[2]?'<i class="'+(t[0]==="move"?"live":"red")+'">'+t[2]+"</i>":"")+"</button>").join("")+"</div>";
  if(actSub==="combat"){const st=S.stats||{},row=(lbl,o,cls)=>'<div class="stat"><span>'+lbl+"</span><b>"+(o&&RES.some(k=>o[k])?RES.filter(k=>o[k]).map(k=>'<span class="'+cls+'">'+fmt(o[k])+"</span> "+{atp:"ATP",prot:"prot.",lip:"lip.",nuc:"nucl."}[k]).join(" · "):"—")+"</b></div>",cb=S.reports.filter(r=>r.cat==="combat");
    return h+'<div class="card"><h2>'+tr("Bilan","Summary")+"</h2>"+row(tr("Pillé chez les rivaux","Raided from rivals"),st.lootIn,"up")+row(tr("Rapporté de vos chasses","Brought back from hunts"),st.huntIn,"up")+row(tr("Volé par les rivaux","Stolen by rivals"),st.lootOut,"neg")+'<div class="stat"><span>'+tr("Rapports récents","Recent reports")+"</span><b>"+cb.filter(r=>r.win===true).length+tr(" victoires · "," victories · ")+cb.filter(r=>r.win===false).length+tr(" défaites"," defeats")+"</b></div></div>"+'<div class="card"><h2>'+tr("Rapports de combat","Combat reports")+"</h2>"+reportCards("combat")+"</div></div>";}
  if(actSub==="farm")return h+'<div class="card"><h2>'+tr("Récoltes et explorations","Harvests and explorations")+"</h2>"+reportCards("farm")+"</div></div>";
  if(actSub==="rank")return h+worldRankHTML()+nemesisHTML()+alliancesHTML()+"</div>";
  if(actSub==="log")return h+'<div class="card"><h2>'+tr("Journal","Log")+'</h2><ul class="log">'+S.log.slice(0,80).map(e=>'<li class="'+e.cls+'"><time>'+fmtClockShort(e.t)+"</time><span>"+e.msg+"</span></li>").join("")+"</ul></div></div>";
  if(S.inc&&S.inc.length){h+='<div class="card incard"><h2>'+tr("⚠️ Attaques entrantes","⚠️ Incoming attacks")+"</h2>";S.inc.slice().sort((a,b)=>a.arrive-b.arrive).forEach(A=>{const b=S.bots.find(z=>z.id===A.bot);h+='<div class="mv"><span class="t"><b>'+esc(b?b.name:"?")+"</b>"+tr(" · force estimée "," · estimated strength ")+incRange(A)+'</span><span></span><span class="s">'+tr("Arrivée ","Arrival ")+fmtClock(A.arrive)+tr(" (dans "," (in ")+'<span data-end="'+A.arrive+'"></span>)</span></div>'+incChoiceHTML(A);});h+='<p class="desc">'+tr("<b>Défendre</b> : vos troupes au repos se battent ; quelques-unes tombent si la défense tient, la moitié si elle cède. <b>Esquiver</b> : elles quittent la cellule sans perte, mais ne défendent pas. Dans les deux cas, ce qui dépasse la part protégée par la vacuole peut être pillé si la défense cède : dépensez-le avant l’arrivée !","<b>Defend</b>: your resting troops fight; a few fall if the defense holds, half if it gives way. <b>Dodge</b>: they leave the cell with no losses, but do not defend. Either way, anything above the share protected by the vacuole can be raided if the defense gives way: spend it before arrival!")+"</p></div>";}
  h+='<div class="card"><div class="chead"><h2>'+tr("Mouvements de vos cellules","Your cells’ movements")+"</h2>"+(S.missions.some(M=>!M.arrived)?'<button class="btn sm alt" data-act="recallall">'+tr("Rappeler tout","Recall all")+"</button>":"")+"</div>";
  if(!S.missions.length)h+='<p class="muted">'+tr("Aucune collectrice en route. Ouvrez les abysses et touchez une case pour en envoyer.","No troops on the way. Open the abyss and tap a tile to send some.")+"</p>";
  S.missions.slice().sort((a,b)=>(a.arrived?a.back:a.arrive)-(b.arrived?b.back:b.arrive)).forEach(M=>{
    h+='<div class="mv"><span class="t">'+compText(M.u||{coll:M.n})+(M.hero?tr(" + héros"," + hero"):"")+" · "+missionLabel(M)+"</span>";
    h+=!M.arrived?'<button class="btn sm danger" data-act="cancel" data-id="'+M.id+'">'+tr("Annuler","Cancel")+"</button>":"<span></span>";
    if(!M.arrived)h+='<span class="s">'+tr("Arrivée ","Arrival ")+fmtClock(M.arrive)+tr(" (dans "," (in ")+'<span data-end="'+M.arrive+'"></span>)'+tr(" · retour "," · return ")+fmtClock(M.back)+"</span>";
    else h+='<span class="s">'+(M.cancelled?tr("Ordre annulé · ","Order cancelled · "):"")+tr("Retour ","Return ")+fmtClock(M.back)+tr(" (dans "," (in ")+'<span data-end="'+M.back+'"></span>)'+(M.result==="win"?tr(" · chasse réussie"," · successful hunt"):M.result==="lose"?tr(" · chasse ratée"," · failed hunt"):"")+"</span>";
    h+="</div>";
  });
  h+="</div>";
  const u=upkeep();
  h+='<div class="card"><h2>'+tr("Troupes","Troops")+'</h2><div class="stat"><span>'+tr("Disponibles","Available")+"</span><b>"+S.idle+'</b></div><div class="stat"><span>'+tr("En mission","On missions")+"</span><b>"+S.missions.reduce((a,M)=>a+M.n,0)+'</b></div><div class="stat"><span>'+tr("Entretien total","Total upkeep")+"</span><b>"+RES.map(k=>fmt(u[k])+" "+RES_NAME[k].slice(0,4)+".").join(" · ")+" / h</b></div>";
  h+='<p class="desc" style="margin-top:6px">'+tr("Une collectrice consomme ","A gatherer uses ")+UPKEEP.atp+" ATP, "+UPKEEP.prot+tr(" protéines, "," proteins, ")+UPKEEP.lip+tr(" lipides et "," lipids and ")+UPKEEP.nuc+tr(" nucléotides par heure ; les troupes plus grosses, davantage. Si une ressource tombe à zéro, elles meurent une à une. "," nucleotides per hour; bigger troops use more. If a resource drops to zero, they die one by one. ")+'<button class="lnk ok" data-act="tab" data-t="hero">'+tr("Voir l’armée","See the army")+"</button></p>";
  h+='<div class="row" style="margin-top:8px"><button class="btn sm alt" data-act="dissolve" data-n="1"'+(S.idle<1?" disabled":"")+">"+tr("Dissoudre 1","Dissolve 1")+'</button><button class="btn sm alt" data-act="dissolve" data-n="5"'+(S.idle<5?" disabled":"")+">"+tr("Dissoudre 5","Dissolve 5")+'</button><span class="muted" style="font-size:12px">'+tr("rend la moitié du coût","refunds half the cost")+"</span></div>";
  if(blvl("ribo")>=1)h+="<h3>"+tr("Produire","Produce")+"</h3>"+costHTML(CELL_COST)+'<div class="row"><button class="btn sm" data-act="cell" data-n="1"'+need(CELL_COST)+">"+tr("Produire 1","Produce 1")+'</button><button class="btn sm" data-act="cell" data-n="5"'+need({prot:150,atp:100})+">"+tr("Produire 5","Produce 5")+'</button><span class="muted" style="font-size:12px">'+fmtDur(cellTime())+tr(" chacune"," each")+"</span></div>";
  else h+='<p class="desc" style="margin-top:8px">'+tr("Pour en produire : ","To produce some: ")+riboHint()+"</p>";
  h+="</div>";
  if(S.fils.length){const m=mods();h+='<div class="card"><h2>Filaments</h2>'+S.fils.map(f=>{const T=S.tiles[f.y*W+f.x];return '<div class="stat"><span>'+tr("Case ","Tile ")+f.x+","+f.y+" · "+RES_NAME[T.k]+(T.rich?tr(" (source)"," (vent)"):"")+"</span><b>"+fmt(filRate(T,m))+" / h · stock "+fmt(T.a)+"</b></div>";}).join("")+'<p class="desc">'+S.fils.length+tr(" sur "," of ")+filMax()+tr(" possibles."," possible.")+"</p></div>";}
  return h+"</div>";
}

/* Héros */
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const t=f<0?0:255,p=Math.abs(f);r=Math.round((t-r)*p+r);g=Math.round((t-g)*p+g);b=Math.round((t-b)*p+b);return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
const FORM_PAL={"Larve":["#b9a7f0","#ddd2ff","#7a6ab0"],"Araignée":["#4a3a5c","#7a6a9c","#2a1f38"],"Grenouille venimeuse":["#3cb043","#7be07f","#1f6a24"],"Serpent":["#8bc34a","#c5e1a5","#4a7a2a"],"Scorpion":["#c98a2e","#e8b866","#7a4f16"],"Fourmi soldat":["#a83a2a","#d8664f","#5a1a10"],"Crabe":["#e0602a","#ff9a5c","#8a3410"],"Mante":["#6fbf3b","#a5e07a","#3a7a1a"],"Pieuvre à bec":["#b04a8a","#e07ab8","#6a1a50"],"Homard":["#c0392b","#e8705f","#6e1a12"],"Lucane":["#5a3a22","#8a6a42","#2a1a0a"]};
function heroGrid(formOverride){
  const N=24,G=[];for(let y=0;y<N;y++)G.push(new Array(N).fill(null));
  const set=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<N&&y<N)G[y][x]=c;};
  const line=(x0,y0,x1,y1,c,w)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;set(x,y,c);if(w)set(x+1,y,c);}};
  const path=(pts,c,w)=>{for(let i=1;i<pts.length;i++)line(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1],c,w);};
  const ell=(cx,cy,rx,ry,c)=>{for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)set(x,y,c);}};
  const sym=(pts,c,w)=>{path(pts,c,w);path(pts.map(p=>[24-p[0],p[1]]),c,w);};
  const eye=(x,y)=>{set(x,y,"#ffffff");set(x,y+1,"#111111");};
  const form=formOverride||heroForm(),P=FORM_PAL[form]||FORM_PAL.Larve,b=P[0],l=P[1],d=P[2],V="#b8e05a",R="#ff6a3d",W2="#f2e6c9";
  switch(form){
    case "Larve":for(let i=0;i<5;i++)ell(6+i*3,13+(i%2?0.5:0),2.2,2.8-i*0.15,i%2?b:l);ell(19,12,2.6,2.6,l);eye(20,11);for(let i=0;i<4;i++)set(7+i*3,16,d);break;
    case "Araignée":[[[9,11],[5,6],[2,9]],[[9,12],[4,10],[1,14]],[[9,14],[4,15],[2,19]],[[10,16],[6,18],[4,22]]].forEach(p=>sym(p,"#7a6a9c"));ell(12,16,4.5,4.5,b);ell(12,9,3,2.5,l);eye(11,8);eye(13,8);set(11,11,V);set(13,11,V);[[12,14],[11,16],[13,16],[12,18]].forEach(p=>set(p[0],p[1],R));break;
    case "Grenouille venimeuse":ell(5,18,3,2,d);ell(19,18,3,2,d);ell(12,15,7,5,b);ell(12,10,6,3.5,b);ell(8,7,1.8,1.8,l);ell(16,7,1.8,1.8,l);eye(8,6);eye(16,6);line(9,12,15,12,d);sym([[7,17],[5,21],[3,21]],l);[[10,15],[14,16],[12,18],[9,18],[15,13]].forEach(p=>set(p[0],p[1],"#ffe07a"));break;
    case "Serpent":{const pts=[[3,21],[7,22],[11,21],[14,18],[13,15],[9,13],[8,10],[10,7],[14,6]];path(pts,b,1);pts.forEach((p,i)=>{if(i%2)set(p[0],p[1]+1,d);});ell(16,6,2.6,2,l);set(17,5,"#ffffff");set(17,6,"#111111");set(16,8,W2);set(19,6,R);set(20,5,R);set(20,7,R);break;}
    case "Scorpion":sym([[10,10],[7,8],[5,5]],b,1);[[4,3],[5,3],[3,4],[3,5],[6,4]].forEach(p=>{set(p[0],p[1],l);set(24-p[0],p[1],l);});for(let i=0;i<3;i++)sym([[10,13+i*2],[6,14+i*3]],d);ell(12,15,3.5,5,b);[12,14,16,18].forEach(y=>line(9,y,15,y,d));path([[12,20],[13,22],[16,22],[19,20],[20,16],[19,12],[17,10]],b,1);set(16,9,V);set(15,9,R);eye(11,10);eye(13,10);break;
    case "Fourmi soldat":sym([[10,4],[8,1]],d);ell(12,6,3.2,2.6,b);sym([[10,8],[8,10],[9,11]],W2);eye(11,5);eye(13,5);ell(12,11,1.8,2,b);[[[11,11],[6,9],[4,12]],[[11,12],[5,13],[3,16]],[[11,13],[6,17],[5,21]]].forEach(p=>sym(p,d));ell(12,17,3.6,4.2,l);line(10,17,14,17,d);break;
    case "Crabe":sym([[10,9],[10,6]],d);eye(10,5);eye(14,5);sym([[6,12],[4,8]],b,1);[[2,4],[3,4],[4,4],[5,5],[2,5],[2,6],[3,7],[5,7]].forEach(p=>{set(p[0],p[1],l);set(24-p[0],p[1],l);});[[[5,15],[1,17]],[[5,16],[2,20]],[[6,17],[4,22]]].forEach(p=>sym(p,d));ell(12,14,8,4.5,b);line(7,13,17,13,l);break;
    case "Mante":line(11,3,13,3,b);line(10,4,14,4,b);set(10,4,"#ffffff");set(14,4,"#ffffff");sym([[11,2],[9,0]],d);line(12,5,12,11,b,1);sym([[11,7],[7,9],[8,5]],l);set(7,7,d);set(17,7,d);sym([[11,11],[6,15],[5,21]],d);sym([[11,13],[7,19]],d);ell(12,16,2.6,5,b);line(12,13,12,20,d);break;
    case "Pieuvre à bec":[6,8,10,14,16,18].forEach((x,i)=>{path([[x,12],[x+(i<3?-1:1),16],[x+(i<3?0:0),19],[x+(i<3?-2:2),21]],i%2?b:d,0);});ell(12,8,6,6,b);ell(10,5,2,1.5,l);eye(9,9);eye(15,9);set(12,13,W2);set(12,12,W2);break;
    case "Homard":sym([[11,7],[6,0]],d);sym([[10,10],[6,9]],b,1);ell(4,6,2.5,3.5,b);ell(20,6,2.5,3.5,b);line(4,3,4,6,"#06111a");line(20,3,20,6,"#06111a");set(3,5,l);set(19,5,l);[11,12,13].forEach(y=>sym([[10,y],[6,y+3]],d));ell(12,10,3,3,b);eye(11,8);eye(13,8);[[14,5,b],[16,4,l],[18,4,b],[20,3,l]].forEach(r=>line(12-Math.floor(r[1]/2),r[0],12+Math.floor(r[1]/2),r[0],r[2]));[[15,b],[17,l],[19,b]].forEach(r=>line(10,r[0],14,r[0],r[1]));line(9,22,15,22,l);line(10,21,14,21,b);break;
    case "Lucane":sym([[10,7],[7,4],[7,1]],l,0);sym([[8,4],[9,3]],l);[[[8,12],[4,10],[2,13]],[[8,15],[3,16],[2,20]],[[9,18],[5,21],[4,23]]].forEach(p=>sym(p,d));ell(12,15,5,6,b);line(12,10,12,21,d);ell(12,8,3,2,b);eye(11,8);eye(13,8);set(10,13,l);set(14,13,l);break;
  }
  if(!formOverride&&form!=="Larve"&&S&&S.hero){if(traitLevel("venin")>=6)[[2,22],[21,22]].forEach(p=>set(p[0],p[1],V));if(traitLevel("carapace")>=6)for(let x=0;x<N;x++)if(G[23-2]&&G[21][x]===b)set(x,21,d);}
  const O=G.map(r=>r.slice());
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(G[y][x])continue;if([[1,0],[-1,0],[0,1],[0,-1]].some(q=>{const yy=y+q[1],xx=x+q[0];return yy>=0&&yy<N&&xx>=0&&xx<N&&G[yy][xx];}))O[y][x]="#06111a";}
  return O;
}
function heroSVG(cls,form){const G=heroGrid(form);let s='<svg class="herosprite '+(cls||"")+'" viewBox="0 0 24 24" shape-rendering="crispEdges" role="img" aria-label="'+tr("Votre héros : ","Your hero: ")+esc(formName(S.hero.form))+'">';G.forEach((r,y)=>r.forEach((c,x)=>{if(c)s+='<rect x="'+x+'" y="'+y+'" width="1.02" height="1.02" fill="'+c+'"/>';}));return s+"</svg>";}
/* Icône de troupe : plus le rang est haut, plus la forme est aboutie (membrane, organites, armure, colonie, puis prédateur ou convoi légendaire) */
function unitIcon(k,big){const U=UNITS[k],c=U.col,T=U.tier||1,eco=U.br==="eco",id="ug"+k;
  let s='<svg class="uic t'+T+(big?" big":"")+'" viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="'+id+'" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity="'+(T>=3?.55:.15)+'"/><stop offset=".45" stop-color="'+c+'" stop-opacity="'+(.25+T*.1)+'"/><stop offset="1" stop-color="'+c+'" stop-opacity=".15"/></radialGradient></defs>';
  const ring=(r,w,o,d)=>'<circle cx="20" cy="20" r="'+r+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-opacity="'+o+'"'+(d?' stroke-dasharray="'+d+'"':"")+"/>";
  const body=r=>'<circle cx="20" cy="20" r="'+r+'" fill="url(#'+id+')" stroke="'+c+'" stroke-width="'+(T>=4?2.2:1.8)+'"/>';
  const spikes=(n,r1,r2,w)=>{let p="";for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2;p+='<line x1="'+(20+Math.cos(a)*r1).toFixed(1)+'" y1="'+(20+Math.sin(a)*r1).toFixed(1)+'" x2="'+(20+Math.cos(a)*r2).toFixed(1)+'" y2="'+(20+Math.sin(a)*r2).toFixed(1)+'" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"/>';}return p;};
  if(T===5)s+='<g class="aura">'+ring(18.5,1.2,.9,"3 2.5")+"</g>"+ring(16.8,.6,.4);
  if(T===4)s+=ring(18,1,.35);
  if(eco){
    if(T===1)s+=body(9)+'<circle cx="20" cy="20" r="2.5" fill="'+c+'"/>';
    if(T===2){if(k==="ecl")s+='<path d="M12 20Q6 16 3 20Q6 24 2 27" stroke="'+c+'" stroke-width="1.6" fill="none"/>'+body(8)+'<circle cx="23" cy="18" r="2.2" fill="#fff"/><circle cx="23.5" cy="18" r="1" fill="#06131d"/>';
      else s+=body(10.5)+'<circle cx="20" cy="21.5" r="5.5" fill="'+c+'" fill-opacity=".35" stroke="'+c+'" stroke-width="1.6"/><circle cx="20" cy="15" r="2" fill="'+c+'"/>';}
    if(T===3)s+='<path d="M20 5L32 12.5V27.5L20 35L8 27.5V12.5Z" fill="url(#'+id+')" stroke="'+c+'" stroke-width="1.8"/><path d="M20 5V35M8 12.5L32 27.5M32 12.5L8 27.5" stroke="'+c+'" stroke-width=".7" stroke-opacity=".7"/><circle cx="20" cy="20" r="3.2" fill="#fff" fill-opacity=".9"/><circle cx="20" cy="20" r="1.5" fill="'+c+'"/>';
    if(T===4){[[20,8,5],[20,17,6],[20,27,7]].forEach(b=>{s+='<ellipse cx="'+b[0]+'" cy="'+b[1]+'" rx="'+b[2]+'" ry="'+(b[2]*.75)+'" fill="url(#'+id+')" stroke="'+c+'" stroke-width="1.6"/>';});
      s+='<path d="M14 31q-2 5-5 6M20 33v5M26 31q2 5 5 6" stroke="'+c+'" stroke-width="1.2" fill="none"/><circle cx="18" cy="16" r="1.3" fill="#fff"/><circle cx="22" cy="16" r="1.3" fill="#fff"/><circle cx="20" cy="26" r="1.3" fill="#fff"/>';}
    if(T===5){s+='<ellipse cx="20" cy="20" rx="9.5" ry="13.5" fill="url(#'+id+')" stroke="'+c+'" stroke-width="2"/>';
      ["#ff6b8b","#ffd166","#5ee6d0","#7fb0ff","#c77dff"].forEach((col,i)=>{const x=13+i*3.5,o=Math.abs(2-i)*1.6;s+='<line class="comb" x1="'+x+'" y1="'+(9+o)+'" x2="'+x+'" y2="'+(31-o)+'" stroke="'+col+'" stroke-width="1.3" stroke-dasharray="1.6 1.2"/>';});
      s+='<circle cx="20" cy="14" r="2.4" fill="#fff"/><path d="M14 33q-1 4-4 5M26 33q1 4 4 5" stroke="'+c+'" stroke-width="1" fill="none"/>';}
  }else{
    if(T===1)s+=spikes(4,9,13,2)+body(9)+'<circle cx="20" cy="20" r="2.5" fill="'+c+'"/>';
    if(T===2)s+=spikes(6,10,14.5,2)+body(10)+ring(6.5,1,.7)+'<circle cx="20" cy="20" r="3.6" fill="'+c+'"/>';
    if(T===3){s+=spikes(10,11,16.5,2.2)+body(11.5)+ring(8.2,1.4,.75,"2 1.5");[[16,17],[24,17],[20,24]].forEach(p=>{s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6" fill="'+c+'"/>';});}
    if(T===4){[[9,28,4.6],[15,23.5,5.6],[22,19,6.2],[29,14,6]].forEach(b=>{s+='<circle cx="'+b[0]+'" cy="'+b[1]+'" r="'+b[2]+'" fill="url(#'+id+')" stroke="'+c+'" stroke-width="1.8"/>';});
      s+='<path d="M33 9l5-3M34.5 13.5l5 0" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="30.5" cy="12" r="1.5" fill="#fff"/><path d="M6 33l-3 3M11 33l-1 4M17 29l0 4" stroke="'+c+'" stroke-width="1.2"/>';}
    if(T===5){s+='<path d="M10 11Q2 19 8 28M30 11Q38 19 32 28" stroke="'+c+'" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M6 25l-3 1M6 28l-2 3M34 25l3 1M34 28l2 3" stroke="'+c+'" stroke-width="1.4" stroke-linecap="round"/>';
      s+='<ellipse cx="20" cy="22" rx="9.5" ry="12.5" fill="url(#'+id+')" stroke="'+c+'" stroke-width="2.2"/>';
      for(let i=0;i<5;i++)s+='<path d="M'+(12+i*4)+' 29l2 4 2-4" fill="'+c+'" fill-opacity=".75"/>';
      s+='<circle cx="14.5" cy="13.5" r="3.4" fill="#1a0f00" stroke="#fff" stroke-width="1"/><circle cx="25.5" cy="13.5" r="3.4" fill="#1a0f00" stroke="#fff" stroke-width="1"/><circle cx="14.5" cy="13.5" r="1.2" fill="#ffd166"/><circle cx="25.5" cy="13.5" r="1.2" fill="#ffd166"/><circle cx="20" cy="23" r="3.6" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="1.5 1"/>';}
  }
  s+='<g class="tb"><rect x="0" y="30" width="13" height="10" rx="3" fill="'+RANK_COL[T]+'"/><text x="6.5" y="37.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="#06131d">T'+T+"</text></g>";
  return s+"</svg>";}
/* Recherche militaire, dans l’onglet Armée */
function mresHTML(){let h='<div class="card mres"><h2>'+tr("Recherche militaire","Military research")+'</h2><p class="desc">'+tr("Chaque rang débloque des troupes plus puissantes. Les coûts et les durées montent très vite : le T5 est la récompense de la dernière semaine. Une recherche militaire à la fois, en parallèle des gènes.","Each rank unlocks stronger troops. Costs and durations rise very fast: T5 is the reward of the last week. One military research at a time, alongside genes.")+"</p>";
  if(S.mres){const R=S.mres;h+='<div class="mrun" style="--rc:'+RANK_COL[R.L]+'"><span>'+RBR[R.br].e+" <b>T"+R.L+"</b> "+RBR[R.br].name+'</span><span class="pb"><i data-ps="'+R.start+'" data-pe="'+R.end+'"></i></span><span data-end="'+R.end+'"></span>'+accelHTML("m")+"</div>";}
  ["atk","eco"].forEach(br=>{const L=rankOf(br)+1,B=RBR[br];
    if(L>5){h+='<div class="mrow2"><span>'+B.e+" "+B.name+'</span> <b style="color:'+RANK_COL[5]+'">'+tr("T5 atteint","T5 reached")+"</b></div>";return;}
    if(S.mres&&S.mres.br===br)return;
    const R=RANK_RES[L],bl=mresBlock(br),ok=R.req.every(reqMet);
    h+='<div class="mrow2" style="--rc:'+RANK_COL[L]+'"><div><b>'+B.e+" "+B.name+" → T"+L+'</b><span class="desc"> · '+fmtDur(mresTime(L))+"</span>"+(ok?costHTML(R.cost):'<div class="req">'+tr("Requis : ","Requires: ")+R.req.map(reqLink).join(" · ")+"</div>")+(ok&&bl&&bl!==tr("Une recherche militaire est déjà en cours.","Military research is already in progress.")?'<p class="reason">'+bl+"</p>":"")+"</div>"+(ok?'<button class="btn sm" data-act="mres" data-br="'+br+'"'+need(R.cost)+(bl?' data-block="1"':"")+(S.mres?" disabled":"")+">"+tr("Rechercher","Research")+"</button>":"")+"</div>";});
  return h+"</div>";}
function unitCard(k,A,qby){const U=UNITS[k],ok=uReq(k),own=A[k]||0;
  let h='<div class="unit'+(ok?"":" off")+'" style="--uc:'+U.col+'">'+unitIcon(k,true)+'<div class="ubody"><div class="uh"><b>'+U.name+"</b><span>"+(S.army[k]||0)+" / "+own+(qby[k]?" · +"+qby[k]:"")+'</span></div><p class="desc">'+U.role+(U.type?' <span class="typechip" style="color:var(--t-'+U.type+')">'+TYPES[U.type].name+"</span>":"")+"</p>";
  h+='<div class="ustats"><span title="'+tr("Attaque","Attack")+'">⚔ '+U.atk+'</span><span title="'+tr("Défense","Defense")+'">🛡 '+U.def+'</span><span title="'+tr("Charge","Load")+'">🎒 '+U.carry+"</span>"+(U.spy?'<span title="'+tr("Espionnage","Spying")+'">👁 '+U.spy+"</span>":"")+'<span title="'+tr("Vitesse","Speed")+'">» '+U.spd+"</span><span>"+fmtDur(unitTime(k))+"</span></div>";
  if(ok)h+=costHTML(U.cost)+'<div class="row ubtn">'+[1,5,10].map(n=>'<button class="btn sm" data-act="cell" data-k="'+k+'" data-n="'+n+'"'+need(Object.fromEntries(Object.entries(U.cost).map(e=>[e[0],e[1]*n])))+">×"+n+"</button>").join("")+'<button class="btn sm alt" data-act="cell" data-k="'+k+'" data-n="max">Max ('+maxAfford(U.cost,200)+")</button></div>";
  else h+='<div class="req">'+tr("Requis : ","Requires: ")+U.req.map(reqLink).join(" · ")+"</div>";
  return h+"</div></div>";}
function armyHTML(){
  const A=armyAll(),u=upkeep(),qby={};S.queue.forEach(q=>qby[q.k]=(qby[q.k]||0)+1);
  let h='<div class="card armycard"><div class="chead"><h2>'+tr("Armée","Army")+'</h2><span class="lifechip">'+tr("Stade de vie : ","Life stage: ")+LIFE[S.stage||1]+"</span></div>";
  h+='<div class="armystats"><div><b>'+S.idle+"</b><span>"+tr("au repos","resting")+"</span></div><div><b>"+(cellCount()-S.idle)+"</b><span>"+tr("en mission","on missions")+"</span></div><div><b>"+fmt(playerAtk())+"</b><span>"+tr("attaque","attack")+"</span></div><div><b>"+fmt(playerDef())+"</b><span>"+tr("défense","defense")+"</span></div></div>";
  h+='<p class="desc">'+tr("Entretien : ","Upkeep: ")+RES.map(k=>fmt(u[k])+" "+{atp:"ATP",prot:"prot.",lip:"lip.",nuc:"nucl."}[k]).join(" · ")+tr(" par heure. Sur la carte, « Auto » choisit les troupes à votre place ; « Je choisis » vous laisse composer chaque envoi."," per hour. On the map, “Auto” picks troops for you; “I choose” lets you compose each dispatch.")+"</p>";
  if(S.queue.length)h+='<p class="desc" style="margin-top:4px">'+(EN?"In production on "+laneCount()+" line"+(laneCount()>1?"s":"")+": ":"En production sur "+laneCount()+" chaîne"+(laneCount()>1?"s":"")+" : ")+compText(qby)+tr(" · fin dans "," · done in ")+'<span data-end="'+queueEnd()+'"></span></p>';
  if(blvl("ribo")<1)h+='<p class="reason" style="margin-top:6px">'+tr("Pour produire des troupes : ","To produce troops: ")+riboHint()+"</p>";
  h+="</div>"+(S.tut!=null?"":mresHTML());
  ["atk","eco"].forEach(br=>{const B=RBR[br],R=rankOf(br);
    h+='<div class="card tbranch" style="--bc:'+B.col+'"><h2>'+B.e+" "+B.name+' <span class="rkbadge" style="--rc:'+RANK_COL[R]+'">T'+R+" / T5</span></h2>";
    for(let T=1;T<=5;T++){const open=R>=T,us=UNIT_ORDER.filter(k=>{const U=UNITS[k];if(U.br!==br||U.tier!==T)return false;return (A[k]||0)>0||!U.req.some(q=>q[0]==="g"&&nodeState(q[1])==="closed");});
      h+='<div class="tier'+(open?"":" lock")+'" style="--rc:'+RANK_COL[T]+'"><div class="thead"><b>T'+T+"</b><span>"+RANK_LBL[T]+"</span>"+(open?"":'<span class="tl">🔒 '+(T===R+1?tr("Recherche militaire T","Military research T")+T:tr("Après le T","After T")+(T-1))+"</span>")+"</div>";
      if(open)h+='<div class="units">'+us.map(k=>unitCard(k,A,qby)).join("")+"</div>";
      else h+='<div class="tlocked">'+us.map(k=>'<div class="tl1">'+unitIcon(k,true)+"<b>"+UNITS[k].name+"</b><small>⚔ "+UNITS[k].atk+" · 🛡 "+UNITS[k].def+" · 🎒 "+UNITS[k].carry+(UNITS[k].spy?" · 👁 "+UNITS[k].spy:"")+"</small></div>").join("")+"</div>";
      h+="</div>";}
    h+="</div>";});
  return h;
}
/* Espionnage : des troupes discrètes vont compter les défenses d’un rival */
function spyPow(u){let s=0;for(const k in u)s+=(u[k]||0)*(UNITS[k].spy||0);return Math.round(s*(1+0.15*(rankOf("eco")-1)));}
function botVig(b){return Math.round(4+bDays()*b.g*1.6+botStage(b)*3);}
function spied(b){return !!(b&&b.spyT!=null&&S.t-b.spyT<1440);}
function spyIdle(){return UNIT_ORDER.reduce((a,k)=>a+(UNITS[k].spy?(S.army[k]||0):0),0);}
function spyArrive(M){const B=botAt(M.x,M.y);M.result="none";
  if(!B){report("combat",tr("Espionnage · case ","Spying · tile ")+M.x+","+M.y,[tr("Plus personne ici : le rival a migré.","Nobody here anymore: the rival has moved.")],null);return;}
  botSync(B);const pw=spyPow(M.u),vg=botVig(B),p=pw/(pw+vg),ok=Math.random()<p;
  const lines=[tr("Force d’espionnage <b>","Spy strength <b>")+fmt(pw)+tr("</b> contre vigilance <b>","</b> against vigilance <b>")+fmt(vg)+"</b> : "+Math.round(p*100)+PCT+tr(" de chances."," chance.")];
  if(ok){B.spyT=S.t;const loot=Math.max(0,B.res-botProt(B)),rk=rkRows("pow").findIndex(x=>x.b===B)+1,mine=compAtk(S.army,B.type);
    lines.push('<span class="up">'+tr("Réussi.","Success.")+"</span> "+tr("Pendant 24 h, ses chiffres exacts restent affichés sur la carte.","For 24 h, its exact numbers stay shown on the map."));
    lines.push('<table class="ftab"><tbody><tr><td>'+tr("Défense de la base","Base defense")+'</td><td class="num"><b>'+fmt(botDef(B))+"</b></td></tr><tr><td>"+tr("Force d’attaque","Attack strength")+'</td><td class="num">'+fmt(botAtk(B))+"</td></tr><tr><td>"+tr("Butin pillable","Raidable loot")+'</td><td class="num">'+fmt(loot)+"</td></tr><tr><td>"+tr("Voie offensive","Offensive path")+'</td><td class="num">'+TYPES[B.type].name+"</td></tr><tr><td>"+tr("Stade","Stage")+'</td><td class="num">'+STAGE_NAME[botStage(B)]+"</td></tr><tr><td>"+tr("Classement mondial","World ranking")+'</td><td class="num">#'+rk+"</td></tr><tr><td>"+tr("Vos troupes au repos","Your resting troops")+'</td><td class="num">'+tr("force ","strength ")+fmt(mine)+"</td></tr></tbody></table>");
    log("👁 "+B.name+tr(" espionné : défense "," spied: defense ")+fmt(botDef(B))+tr(", butin ",", loot ")+fmt(loot)+".","good");}
  else{const lost=Math.max(1,Math.ceil(M.n*0.5)),rm=applyLoss(M,lost);B.anger=Math.min(1,B.anger+0.3);
    lines.push('<span class="neg">'+tr("Repérées.","Spotted.")+"</span> "+compText(rm)+tr(" dévorée"+(lost>1?"s":"")," devoured")+". "+esc(B.name)+tr(" est maintenant sur ses gardes."," is now on its guard."),tr("Envoyez plus d’espionnes, ou des troupes de rang supérieur : chaque rang de la branche récolte et espionnage ajoute aussi 15 % de force d’espionnage.","Send more spies, or higher-rank troops: each rank of the gathering and spying branch also adds 15% spy strength."));
    log(tr("👁 Espionnage raté chez ","👁 Failed spying on ")+B.name+".","bad");}
  report("combat",(ok?tr("Espionnage réussi","Successful spying"):tr("Espionnage raté","Failed spying"))+" · "+B.name,lines,ok);}
function heroHTML(){
  const H=S.hero,need=xpNeed(H.lvl),pr=heroPair();
  let h='<div class="herobox"><div class="heroart">'+heroSVG()+'<p class="heroform">'+formName(H.form)+'</p><p class="muted" style="text-align:center;font-size:12.5px">'+(H.busy?tr("En mission","On a mission"):tr("Disponible","Available"))+"</p></div>";
  h+='<div class="card herocard"><h2>'+tr("Héros de la souche ","Hero of strain ")+SOUCHES[S.souche].name+"</h2>";
  h+='<div class="stat"><span>'+tr("Niveau ","Level ")+H.lvl+'</span><b>'+fmt(H.xp)+" / "+fmt(need)+' XP</b></div><div class="xpbar"><i style="width:'+Math.min(100,H.xp/need*100)+'%"></i></div>';
  h+='<div class="stat"><span>'+tr("Force de base au combat","Base combat strength")+"</span><b>"+heroBase()+"</b></div>"+formStrengthHTML();
  h+="<h3>Traits</h3>";
  Object.keys(TRAITS).forEach(k=>{const lv=traitLevel(k);h+='<div class="trait"><span class="tn"><i style="background:'+TRAITS[k].col+'"></i>'+TRAITS[k].name+'</span><span class="bar"><i style="width:'+(lv*10)+"%;background:"+TRAITS[k].col+'"></i></span><b>'+lv+'</b><span class="tsrc">'+tr("en combattant : ","by fighting: ")+WILD_NAME[TRAITS[k].from]+"</span></div>";});
  h+='<p class="desc" style="margin-top:6px">'+tr("Les deux traits dominants donnent sa forme au héros, avec leurs forces et leurs faiblesses.","The two dominant traits give the hero its form, with their strengths and weaknesses.")+(pr.length?"":tr(" Il reste une larve jusqu’au niveau 3."," It stays a larva until level 3."))+"</p>";
  h+='<div class="stat" style="margin-top:8px"><span>'+tr("Combats · victoires","Fights · victories")+"</span><b>"+H.fights+" · "+H.wins+"</b></div>";
  h+='<label class="herotog"><input type="checkbox" data-act="herowith"'+(S.heroWith?" checked":"")+"> "+tr("L’emmener dans mes chasses","Bring it on my hunts")+"</label>";
  h+="<h3>"+tr("Formes découvertes · ","Forms discovered · ")+H.seen.length+" / 11</h3><p class=\"desc\">"+H.seen.map(formName).join(", ")+'</p><p class="desc" style="margin-top:8px">'+tr("Le héros ne meurt jamais. Contre les organismes sauvages, il ne gagne qu’un dixième de l’expérience et des traits d’un combat contre un autre joueur.","The hero never dies. Against wild organisms, it gains only a tenth of the experience and traits of a fight against another player.")+"</p>";
  return h+"</div></div>";
}

