/* Origins 27 · 17-fiches.js
   Fiches de détail, fenêtres d'aide et de risque, fenêtres modales, mise à jour en direct (live).
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Fiche de détail */
function detailHTML(){
  if(!openRef){
    const help={cell:"<h2>Votre cellule</h2><p class=\"muted\">C’est votre village. Les 4 canaux de la membrane (un par ressource) produisent vos ressources, comme des champs. À l’intérieur, 8 emplacements accueillent vos organites autour du noyau. Survolez un élément, ou gardez le doigt appuyé, pour une bulle d’aide ; touchez-le pour agir.</p>",
      map:"<h2>Hors de la cellule</h2><p class=\"muted\">Les abysses autour de vous. Touchez une case pour y envoyer des collectrices, chasser un organisme sauvage ou y étendre un filament. Les cases voilées sont inconnues : y aller les explore. L’eau s’éclaircit vers le centre, où vous attend la terre ferme ; la flèche dorée au bord de la carte vous y guide.</p>",
      evo:"<h2>Évolution</h2><p class=\"muted\">L’arbre se lit de bas en haut. Énergie et Perception ont une fourche : un choix ferme l’autre voie. La Prédation offre cinq voies offensives, deux au maximum, qui se battent en cycle. Avant d’exprimer un gène, vous n’en lisez qu’un indice ; ses effets et ses revers se révèlent ensuite.</p>",
      act:"<h2>Rapports</h2><p class=\"muted\">Vos collectrices en route, les rapports de combat et de récolte, et le journal. La pastille rouge compte les rapports non lus.</p>",
      hero:"<h2>Votre armée</h2><p class=\"muted\">Produisez vos troupes par paquets. Deux branches, cinq rangs : 🔍 récolte et espionnage, ⚔ attaque. Chaque rang, de T1 à T5, se débloque par une recherche militaire de plus en plus longue ; le T5 arrive dans la dernière semaine. Le héros accompagne vos chasses et ne meurt jamais.</p>"};
    return help[tab];
  }
  const p=openRef.split(":");
  if(p[0]==="field"){
    const i=+p[1],f=S.fields[i],u=upgradeInfo(openRef),bl=upgradeBlock(u),m=mods(),mult=prodMult(f.k,m)*(1+m.fieldPct);
    let h="<h2>"+FIELD[f.k].name+" · niv. "+f.l+'</h2><p class="desc">'+FIELD[f.k].role+"</p>";
    h+='<div class="stat" style="margin-top:8px"><span>Production de ce canal</span><b>'+fmt(fieldProd(f.l)*mult)+" / h"+(f.l<FIELD_MAX?' <span class="up">→ '+fmt(fieldProd(f.l+1)*mult)+"</span>":"")+"</b></div>";
    return h+upgradeBox(u,bl);
  }
  if(p[0]==="noyau"){
    const u=upgradeInfo("noyau"),bl=upgradeBlock(u);
    let h="<h2>Noyau · niv. "+S.noyau+'</h2><p class="desc">'+BLD.noyau.role+"</p>";
    h+='<div class="stat" style="margin-top:8px"><span>Vitesse de construction</span><b>+'+Math.round((speedUp()-1)*100)+' % <span class="up">→ +'+Math.round(0.06*(S.noyau+1)*100)+" %</span></b></div>";
    h+='<div class="stat"><span>Filaments possibles</span><b>'+filMax()+"</b></div>";
    h+='<div class="stat"><span>Stade de votre base sur la carte</span><b>'+baseStage()+" / 5"+(baseStage()<5?' <span class="up">→ '+(baseStage()+1)+" au noyau "+(baseStage()*2+1)+"</span>":"")+"</b></div>";
    h+='<h3>Produire des troupes · '+S.idle+" au repos / "+cellCount()+"</h3>"+prodHTML();
    h+="<h3>Votre souche</h3><p><b>"+SOUCHES[S.souche].name+'</b></p><p class="desc">'+SOUCHES[S.souche].trait+"</p>"+fxList(SOUCHES[S.souche].mods);
    return h+upgradeBox(u,bl);
  }
  if(p[0]==="slot"){
    const i=+p[1],sl=S.slots[i];
    if(!slotOpen(i))return "<h2>Emplacement verrouillé</h2><p class=\"muted\">Il s’ouvre avec le "+reqLink(["b","cyto",i-5])+".</p>";
    if(!sl){
      if(S.build&&S.build.type==="new"&&S.build.i===i)return "<h2>"+BLD[S.build.k].name+'</h2><p class="muted">En construction.</p>';
      let h="<h2>Emplacement libre</h2><p class=\"desc lg\">Choisissez l’organite à construire ici. Chaque organite n’existe qu’une fois par cellule.</p>";
      Object.keys(BLD).filter(k=>k!=="noyau"&&!S.slots.some(s=>s&&s.k===k)&&!(S.build&&S.build.type==="new"&&S.build.k===k)).sort((a,b)=>(BLD[b].req.every(reqMet)?1:0)-(BLD[a].req.every(reqMet)?1:0)).forEach(k=>{
        const B=BLD[k],ok=B.req.every(reqMet),c=bldCost(k,0),bl=newBlock(k);
        h+='<div class="choice'+(ok?"":" off")+'"><div class="chead"><div><div class="n">'+B.name+'</div><div class="desc"><span class="lg">'+B.role+'</span><span class="sm">'+B.short+"</span></div></div>";
        if(ok)h+='<button class="btn sm" data-act="buildnew" data-i="'+i+'" data-k="'+k+'"'+need(c)+(bl?' data-block="1"':"")+">Construire</button>";
        h+="</div>";
        if(ok){h+='<div class="cost">'+costHTML(c).replace(/^<div class="cost">|<\/div>$/g,"")+'<span class="dur">'+fmtDur(bldTime(k,0))+"</span></div>";if(bl)h+='<p class="reason">'+bl+"</p>";}
        else h+='<div class="req">Requis : '+B.req.map(reqLink).join(" · ")+"</div>";
        h+="</div>";
      });
      return h;
    }
    const u=upgradeInfo(openRef),bl=upgradeBlock(u);
    let h="<h2>"+BLD[sl.k].name+" · niv. "+sl.l+'</h2><p class="desc">'+BLD[sl.k].role+"</p>";
    h+='<div class="stat" style="margin-top:8px"><span>Actuellement</span><b>'+bldEffectText(sl.k,sl.l)+"</b></div>";
    if(sl.l<BLD[sl.k].max)h+='<div class="stat"><span>Au niveau '+(sl.l+1)+'</span><b class="up">'+bldEffectText(sl.k,sl.l+1)+"</b></div>";
    if(sl.k==="ribo")h+='<h3>Produire des troupes · '+S.idle+" au repos / "+cellCount()+"</h3>"+prodHTML();
    h+=upgradeBox(u,bl);
    return h;
  }
  if(p[0]==="tile")return tileHTML(+p[1],+p[2]);
  if(p[0]==="node")return nodeHTML(p[1]);
  return "";
}
function bqHTML(){if(!S.build)return "";let h='<div class="bqbox"><div class="abh"><span>File de constructions</span><span>'+(1+(S.bq||[]).length)+" / "+(1+BQ_MAX)+'</span></div><div class="bqi"><span>▶ '+S.build.label+'</span><span class="muted" data-end="'+S.build.end+'"></span></div>';
  (S.bq||[]).forEach((b,j)=>{h+='<div class="bqi"><span>'+(j+2)+". "+b.label+' <span class="muted">· '+fmtDur(b.time)+'</span></span><button class="lnk no" data-act="bqcancel" data-j="'+j+'">Annuler</button></div>';});
  return h+"</div>";}
function upgradeBox(u,bl,extra){
  if(u.level>=u.max)return bqHTML()+ '<p class="muted" style="margin-top:10px">Niveau maximum atteint.</p>'+(extra?'<div class="actbar">'+extra+"</div>":"");
  let h=bqHTML()+'<div class="actbar"><div class="abh"><span>Niveau '+(u.level+1)+'</span><span>'+fmtDur(u.time)+"</span></div>"+costHTML(u.cost)+'<div class="row"><button class="btn" data-act="upgrade" data-ref="'+openRef+'"'+need(u.cost)+(bl?' data-block="1"':"")+">"+(S.build?"Programmer ("+((S.bq||[]).length+1)+"/"+BQ_MAX+")":"Améliorer")+"</button></div>";
  if(bl)h+='<p class="reason">'+bl+"</p>";
  return h+(extra||"")+"</div>";
}
function tileTip(x,y){
  const T=S.tiles[y*W+x],d=dist(x,y);
  if(!inWorld(x,y))return "<b>Roche</b>Le bord du monde.";
  if(isLand(x,y))return "<b>Terre ferme</b>Le but final : aucune cellule ne peut encore y vivre.";
  if(d<0.5)return "<b>Votre cellule</b>Vision "+visR()+" cases.";
  const vis=isVis(x,y);let t="<b>Case "+x+","+y+"</b>";
  if(!T.s)t+="Inconnue.";
  else{
    if(T.w)t+=WILD_NAME[T.w.type]+" ("+TYPES[T.w.type].name+")<br>Robustesse "+T.w.def+" · votre meilleure voie : "+matchup(T.w.type).lbl+"<br>";
    if(T.k){const amt=vis?T.a:T.m;t+=(T.rich?"Source hydrothermale · ":"")+RES_NAME[T.k]+" "+fmt(amt)+(vis?"":" (souvenir)")+"<br>";}
    if(!T.w&&!T.k)t+="Eau vide.<br>";
    if(S.fils.some(f=>f.x===x&&f.y===y))t+="Reliée par un filament.<br>";
  }
  t+='<span class=m>'+ZONE_NAME[zoneOf(x,y)]+" · distance "+d.toFixed(1)+" · aller "+fmtDur(d*tileTime())+"</span>";
  return t;
}
function tileHTML(x,y){
  const T=S.tiles[y*W+x],d=dist(x,y);
  if(d<0.5)return '<h2>Votre cellule</h2><p class="muted">Vision : '+visR()+' cases autour de vous. <button class="lnk ok" data-act="tab" data-t="cell">Entrer dans la cellule</button></p>';
  if(!inWorld(x,y))return "<h2>Roche</h2><p class=\"muted\">Le bord du monde. Rien ne passe au-delà.</p>";
  if(isLand(x,y))return "<h2>Terre ferme</h2><p>Le centre du monde, et le but final. Aucune cellule ne peut encore y vivre : il faudra qu’une lignée apprenne à quitter l’eau.</p><p class=\"desc\" style=\"margin-top:6px\">C’est ici que l’APEX de votre alliance devra s’imposer.</p>";
  const vis=isVis(x,y),eta=d*tileTime(),B=T.s?botAt(x,y):null;
  let h="<h2>Case "+x+","+y+'</h2><p class="muted" style="font-size:12.5px">'+ZONE_NAME[zoneOf(x,y)]+" · "+Math.round(rC(x,y))+" cases du centre · aller "+fmtDur(eta)+"</p>";
  if(!T.s)h+="<p>Inconnue : aucune de vos cellules n’est venue ici.</p>";
  else{
    if(T.w){const w=T.w,mt=matchup(w.type);h+='<p class="wildic" style="margin-top:6px">'+(SPR["w_"+w.type]?sprImg("w_"+w.type,3):"")+'<span><b>'+WILD_NAME[w.type]+'</b></span> <span class="typechip" style="color:var(--t-'+w.type+')">'+TYPES[w.type].name+"</span></p>";
      h+='<div class="stat"><span>Robustesse · biomasse</span><b>'+w.def+" · "+fmt(vis?w.bio:w.mb)+'</b></div><div class="stat"><span>Votre meilleure voie</span><b>'+mt.lbl+"</b></div>";
      h+='<p class="desc">Battu par '+TYPES[LOSES_TO[w.type]].name+", bat "+TYPES[BEATS[w.type]].name+".</p>";}
    if(T.k){const amt=vis?T.a:T.m;h+='<p style="margin-top:6px">'+(amt<=0?"Gisement vide, il se régénère lentement.":(T.rich?"Source hydrothermale · ":"")+RES_NAME[T.k]+" : "+fmt(amt)+" / "+fmt(T.max)+(vis?"":" (souvenir)"))+"</p>";}
    if(B)h+=botPanel(B,vis||spied(B));
    if(!T.w&&!T.k&&!B)h+="<p>Eau vide.</p>";
  }
  const kind=(T.w||B)&&T.s?"hunt":T.s?"collect":"explore",man=S.compMode==="man",cu=selComp(kind),cn=uSum(cu);
  const block=S.mig?"Migration en cours.":d>range()?"Trop loin : améliorez le flagelle.":S.idle<1?"Aucune troupe disponible.":cn<1?"Choisissez au moins une troupe.":"";
  const n=shownN();
  let fil="",fb="",c=null;
  if(T.k&&T.s){fb=filBlock(x,y);c=filCost(d);
    h+='<p class="desc" style="margin-top:6px">Filament : environ '+fmt(filBase(T,mods()))+" "+RES_NAME[T.k].toLowerCase()+" par heure en continu · "+S.fils.length+" sur "+filMax()+" · portée "+filRange()+" cases.</p>";
    if(fb!=="Déjà relié."&&fb.indexOf("Trop loin")!==0&&fb.indexOf("Nombre maximum")!==0)fil='<button class="btn sm alt" data-act="filament"'+need(c)+(fb?' data-block="1"':"")+' data-tip="'+esc("<b>Étendre un filament</b>"+Object.keys(c).map(r=>fmt(c[r])+" "+RES_NAME[r]).join(", ")+" · "+fmtDur(filTime(d)))+'">Filament</button>';
  }
  h+='<div class="actbar"><div class="abh"><span>Troupes à envoyer</span><span>'+S.idle+" libre"+(S.idle>1?"s":"")+"</span></div>";
  h+='<div class="row" style="margin:6px 0"><span class="seg2" role="group" aria-label="Choix des troupes"><button data-act="compmode" data-m="auto" aria-pressed="'+!man+'">Auto</button><button data-act="compmode" data-m="man" aria-pressed="'+man+'">Je choisis</button></span></div>';
  if(man)h+=compEditor();else h+='<div class="stepper"><button data-act="n-" aria-label="Moins">−</button><b>'+n+'</b><button data-act="n+" aria-label="Plus">+</button><button data-act="nmax" style="width:auto;padding:0 10px">max</button></div>';
  let fc="";
  const withHero=(T.w||B)&&T.s&&S.heroWith&&!S.hero.busy;
  if(B){const pw=compAtk(cu,B.type)+(withHero?heroPower(B.type):0);fc='force '+fmt(pw)+" / défense "+botEst(B,vis||spied(B));}
  if(T.w&&T.s){const pw=compAtk(cu,T.w.type)+(withHero?heroPower(T.w.type):0),lf=lossFrac(pw,T.w.def),ok=pw*ATK_ADV>=T.w.def;fc='force '+fmt(pw)+" / "+T.w.def+(ok?' <span class="up">gagnable</span>':' <span class="neg">trop faible</span>')+" · pertes ≈ "+Math.round(lf*100)+" %";}
  h+='<p class="desc" style="margin:2px 0 6px">'+(man?"":"Choix auto : ")+compText(cu)+(cn?" · charge "+fmt(compCarry(cu))+" · vitesse ×"+compSpd(cu):"")+(fc?" · "+fc:"")+"</p>";
  const evs=(S.events||[]).filter(e=>Math.hypot(x-e.x,y-e.y)<=e.r+0.5);if(evs.length)h=h.replace("</h2>","</h2>"+evs.map(e=>'<p class="evline" style="--ec:'+EVENTS[e.type].col+'">'+EVENTS[e.type].ic+" "+EVENTS[e.type].name+' · encore <span data-end="'+e.end+'"></span></p>').join(""));
  h+='<div class="row">'+(B?(S.ally&&B.tag===S.ally?'<span class="up" style="font-size:12.5px">Allié '+B.tag+" : on ne pille pas les siens.</span>":'<button class="btn sm" data-act="raid" style="background:var(--bad);border-color:var(--bad)"'+(block||nightAt(S.t)?" disabled":"")+">Piller <small>⚡"+EN_COST.raid+"</small></button>"+'<button class="btn sm alt" data-act="spy"'+(S.mig||d>range()||spyIdle()<1?" disabled":"")+' data-tip="'+esc("<b>Espionner</b>"+(spyIdle()?"Envoie vos troupes d’espionnage ("+spyIdle()+" au repos). Vigilance estimée : "+fmt(botVig(B))+".":"Il faut des éclaireuses ou mieux (recherche militaire 🔍 T2)."))+'">Espionner <small>⚡1</small></button>'):'<button class="btn sm" data-act="collect"'+(block?" disabled":"")+">"+(T.s?"Collecter":"Explorer")+" <small>"+(enCostFor("collect",T)?"⚡1":"⚡ gratuit")+"</small></button>");
  if(T.w&&T.s)h+='<button class="btn sm alt" data-act="hunt"'+(block?" disabled":"")+">Chasser <small>⚡"+EN_COST.hunt+"</small></button>";
  h+=fil;
  let mig="";if(T.s&&!T.k&&!T.w&&!B){const mb=migBlock(x,y),mc=migCost(d);if(mb.indexOf("Trop loin")!==0&&mb.indexOf("Rappelez")!==0&&mb.indexOf("Une migration")!==0)mig='<button class="btn sm alt" data-act="migrate"'+need(mc)+(mb?' data-block="1"':"")+' data-tip="'+esc("<b>Migrer ici</b>"+Object.keys(mc).map(r=>fmt(mc[r])+" "+RES_NAME[r]).join(", ")+" · "+fmtDur(migTime(d))+(S.fils.length?"<br>Vos filaments seront coupés.":""))+'">Migrer ici</button>';h+=mig;
    if(mb&&(mb.indexOf("Trop loin")===0||mb.indexOf("Rappelez")===0))h+='</div><p class="desc">Migration : '+mb+(mb.indexOf("Rappelez")===0?' <button class="lnk ok" data-act="recallall">Rappeler tout</button> · retour dans <span data-end="'+Math.max(...S.missions.map(M=>M.back))+'"></span>':"")+"</p><div>";}
  h+="</div>";
  if((T.w||B)&&T.s)h+='<label class="herotog"><input type="checkbox" data-act="herowith"'+(S.heroWith?" checked":"")+(S.hero.busy?" disabled":"")+"> Avec le héros ("+S.hero.form+" niv. "+S.hero.lvl+(S.hero.busy?", déjà en mission":", force "+heroPower(T.w?T.w.type:B.type))+")</label>";
  if(mig)h+='<div class="cost" style="font-size:11px">Migration : '+Object.keys(migCost(d)).map(r=>'<span class="c-'+r+'">'+fmt(migCost(d)[r])+"</span>").join("")+'<span class="dur">'+fmtDur(migTime(d))+(S.fils.length?" · coupe les filaments":"")+"</span></div>";
  if(S.mig)h+='<p class="reason">Votre cellule migre : les envois reprendront à l’arrivée.</p>';
  if(fil&&c)h+='<div class="cost" style="font-size:11px">Filament : '+Object.keys(c).map(r=>'<span class="c-'+r+'">'+fmt(c[r])+"</span>").join("")+'<span class="dur">'+fmtDur(filTime(d))+"</span></div>";
  if(block)h+='<p class="reason">'+block+(S.idle<1&&blvl("ribo")<1?" "+riboHint():"")+"</p>";
  if(fb&&fb!=="Déjà relié."&&(fb.indexOf("Trop loin")===0||fb.indexOf("Nombre maximum")===0))h+='<p class="reason">'+fb+(fb.indexOf("Trop loin")===0?' <button class="lnk no" data-act="goto" data-tab="cell" data-ref="'+refFor(["b","flag",1])+'">Flagelle</button>':' <button class="lnk no" data-act="goto" data-tab="cell" data-ref="noyau">Noyau</button>')+"</p>";
  else if(fb==="Déjà relié.")h+='<p class="desc">Déjà reliée par un filament.</p>';
  return h+"</div>";
}
function nodeHTML(id){
  const n=NODES[id],st=nodeState(id);
  if(st==="hidden")return "<h2>???</h2><p class=\"muted\">Ce gène reste dans l’ombre tant que vous n’avez pas exprimé "+nodeLink(n.parents[0])+".</p>";
  let h="<h2>"+n.name+"</h2>";
  h+='<p class="muted" style="font-size:12px">'+(n.br==="X"?"Sommet de l’arbre":"Branche "+BRANCH[n.br]+" · rang "+n.tier)+"</p>";
  h+='<p style="margin-top:6px;font-style:italic">« '+n.hint+" »</p>";
  if(n.type)h+='<p class="desc" style="margin-top:8px"><span class="typechip" style="color:var(--t-'+n.type+')">'+TYPES[n.type].name+"</span> Fort contre <b>"+TYPES[BEATS[n.type]].name+"</b> ("+TYPES[n.type].why.toLowerCase().replace(/\.$/,"")+"). Faible contre <b>"+TYPES[LOSES_TO[n.type]].name+"</b>.</p>";
  if(st==="owned"){const L=glvl(id),mx=maxLvl(id);
    h+='<div class="stat" style="margin-top:8px"><span>Niveau</span><b>'+L+" / "+mx+"</b></div>";
    h+="<h3>Effets au niveau "+L+"</h3>"+(fxList(scaledEff(id,L))||'<p class="muted">Aucun effet chiffré.</p>');
    h+="<h3>Revers</h3>"+(Object.keys(n.mal).length?fxList(n.mal):'<p class="muted">Aucun revers connu.</p>')+'<p class="desc">Les revers ne grandissent pas avec les niveaux.</p>';
    if(L<mx){const lb=lvlBlock(id),c=lvlCost(id,L),busy=S.research&&S.research.id===id&&S.research.lvl;
      h+="<h3>Au niveau "+(L+1)+"</h3>"+fxList(scaledEff(id,L+1));
      h+='<div class="actbar"><div class="abh"><span>Niveau '+(L+1)+"</span><span>"+fmtDur(lvlTime(id,L))+"</span></div>"+costHTML(c)+'<div class="row"><button class="btn" data-act="glevel" data-id="'+id+'"'+need(c)+(lb?' data-block="1"':"")+">"+(busy?"Amélioration en cours…":"Améliorer ce gène")+"</button></div>"+(lb&&!busy?'<p class="reason">'+lb+"</p>":"")+"</div>";}
    return h;}
  if(n.excl){const sib=Object.keys(NODES).find(k=>k!==id&&NODES[k].excl===n.excl);h+='<p class="desc" style="margin-top:8px">Fourche : exprimer ce gène ferme définitivement la voie '+nodeLink(sib)+".</p>";}
  if(n.type)h+='<p class="desc" style="margin-top:6px">Deux voies offensives au maximum ; la seconde coûte le double.</p>';
  if(st==="closed")return h+'<p class="reason">'+(n.type?"Vous avez déjà deux voies offensives.":"Voie fermée par votre choix.")+"</p>";
  h+='<p class="desc lg" style="margin-top:8px">Ses effets exacts, et ses éventuels revers, ne seront connus qu’une fois le gène exprimé.</p>';
  if(n.req.length)h+='<div class="req" style="margin-top:8px">Requis : '+n.req.map(reqLink).join(" · ")+"</div>";
  if(n.parents.length)h+='<div class="req">Après : '+n.parents.map(nodeLink).join(", ")+"</div>";
  if(id==="ENDO")h+='<div class="req">Deux gènes de rang 3 : '+RANK3.map(k=>has(k)?'<span style="color:var(--lume)">'+NODES[k].name+"</span>":"").filter(Boolean).join(", ")+(RANK3.filter(has).length<2?' <span style="color:var(--bad)">('+RANK3.filter(has).length+" / 2)</span>":"")+"</div>";
  const c=nodeCost(id),bl=nodeBlock(id);
  h+='<div class="actbar"><div class="abh"><span>Exprimer</span><span>'+fmtDur(nodeTime(id))+"</span></div>"+costHTML(c)+'<div class="row"><button class="btn" data-act="express" data-id="'+id+'"'+need(c)+(bl?' data-block="1"':"")+">Exprimer ce gène</button></div>";
  if(bl&&st!=="research")h+='<p class="reason">'+bl+"</p>";
  return h+"</div>";
}

/* Fenêtres d’aide : ressources manquantes et combat risqué */
let modalExtra=null;
function showModal(h){modalExtra='<div class="pop adv">'+h+"</div>";renderModal();}
function closeModal(){modalExtra=null;renderModal();}
function rlow(r){return r==="atp"?"ATP":RES_NAME[r].toLowerCase();}
function lackOf(c){const o={};for(const r in c)if(c[r]>0&&S.res[r]<c[r])o[r]=Math.ceil(c[r]-S.res[r]);return o;}
const RES_BLD={atp:"mito",prot:"reti",lip:"golgi"};
function goBtn(tabName,ref,label){return '<button class="btn sm alt" data-act="goadv" data-tab="'+tabName+'"'+(ref?' data-ref="'+ref+'"':"")+">"+(label||"Y aller")+" →</button>";}
function advStep(icon,html,btn){return '<li>'+(icon?sprImg(icon,1):'<span class="advdot"></span>')+'<span class="advt">'+html+"</span>"+(btn||"")+"</li>";}
function adviceHTML(c){
  const lack=lackOf(c),rt=rates();let h='<div class="kick">Ressources insuffisantes</div><h2>Il vous manque</h2><div class="lackrow">';
  Object.keys(lack).forEach(r=>{h+='<div class="lack">'+sprImg("r_"+r,2)+'<b class="neg">−'+fmt(lack[r])+"</b><span>"+RES_NAME[r]+"</span></div>";});
  h+="</div>";
  Object.keys(lack).forEach(r=>{
    const rate=rt[r],wait=rate>0?lack[r]/rate*60:Infinity;
    h+='<h3 class="advh">'+sprImg("r_"+r,1)+" Plus de "+rlow(r)+'</h3><ol class="advpath">';
    if(c[r]>rt.cap)h+=advStep("o_vac","<b>Agrandissez la vacuole</b> : votre stockage ("+fmt(rt.cap)+") est plus petit que le coût.",goBtn("cell",refFor(["b","vac"])));
    const fr=refFor(["f",r]),fi=+fr.split(":")[1],fl=S.fields[fi].l;
    h+=advStep("r_"+r,"<b>Améliorez un canal "+rlow(r)+"</b> (le meilleur est niv. "+fl+") : la source principale.",goBtn("cell",fr));
    const bk=RES_BLD[r];
    if(bk){const L=blvl(bk);h+=advStep(ORG_SPR[bk],(L?"<b>Améliorez "+BLD[bk].name+"</b> (niv. "+L+")":"<b>Construisez "+BLD[bk].name+"</b>")+" : +8 % de "+rlow(r)+" par niveau.",goBtn("cell",refFor(["b",bk])));}
    h+=advStep("u_coll","<b>Récoltez sur la carte</b> : envoyez des collectrices sur un gisement de "+rlow(r)+", ou reliez-le par un filament.",goBtn("map",null,"Carte"));
    if(isFinite(wait))h+=advStep(null,"Ou patientez : environ <b>"+fmtDur(wait)+"</b> au rythme actuel ("+fmt(rate)+" / h).");
    h+="</ol>";
  });
  return h+'<button class="btn" data-act="mclose">Compris</button>';
}
function huntRisk(){
  const p=openRef&&openRef.split(":");if(!p||p[0]!=="tile")return null;
  const T=S.tiles[+p[2]*W+(+p[1])];if(!T||!T.w)return null;
  const u=selComp("hunt"),n=uSum(u),withHero=S.heroWith&&!S.hero.busy,hp=withHero?heroPower(T.w.type):0,pw=compAtk(u,T.w.type)+hp;
  return {T,n,withHero,hp,pw,ok:pw*ATK_ADV>=T.w.def,lf:lossFrac(pw,T.w.def)};
}
function huntWarnHTML(R){
  const w=R.T.w,lost=Math.round(R.n*R.lf),adv=huntAdvice(R.n,w,R.hp,R.withHero);
  let h='<div class="kick" style="color:var(--bad)">Avertissement</div><h2>Vous risquez de perdre ce combat</h2>';
  h+='<div class="advwild">'+(SPR["w_"+w.type]?sprImg("w_"+w.type,4):"")+"</div>";
  h+='<p>Votre force <b class="neg">'+fmt(R.pw)+"</b> contre une robustesse de <b>"+w.def+"</b> : "+WILD_NAME[w.type]+" résistera.</p>";
  h+='<p>Pertes probables : <b class="neg">'+lost+" collectrice"+(lost>1?"s":"")+"</b> sur "+R.n+" (≈ "+Math.round(R.lf*100)+" %), sans butin.</p>";
  if(w.tut)h+='<p class="up">Première chasse : vos pertes seront remboursées.</p>';
  if(adv.length)h+='<h3 class="advh">Pour gagner</h3><ol class="advpath">'+adv.map(a=>advStep(null,a)).join("")+"</ol>";
  return h+'<div class="row" style="justify-content:center"><button class="btn alt" data-act="mclose">Renoncer</button><button class="btn" data-act="huntgo" style="background:var(--bad);border-color:var(--bad)">Attaquer quand même</button></div>';
}

function renderModal(){
  const md=$("modal");
  if(S.mutOffer){md.innerHTML='<div class="pop adv mutpop">'+mutOfferHTML()+"</div>";md.classList.add("on");return;}
  if(!S.popups.length){if(modalExtra){md.innerHTML=modalExtra;md.classList.add("on");pxify(md);return;}md.classList.remove("on");md.innerHTML="";return;}
  const p=S.popups[0];
  const art=p.hero?'<div class="popart">'+heroSVG()+"</div>":isPixel()?'<div class="popart">'+artBox("mini",miniSVG(p.org),110,110)+"</div>":miniSVG(p.org);
  const more=p.more?'<p class="desc" style="margin-top:6px">+ '+p.more+" autre"+(p.more>1?"s":"")+" événement"+(p.more>1?"s":"")+" plus ancien"+(p.more>1?"s":"")+" : voir Rapports › Journal.</p>":"";
  const rest=S.popups.length>1?'<button class="btn alt" data-act="popall">Tout fermer ('+S.popups.length+")</button>":"";
  md.innerHTML='<div class="pop"><div class="kick">'+p.kick+"</div><h2>"+p.title+"</h2>"+art+p.body+more+'<br><div class="row" style="justify-content:center"><button class="btn" data-act="popok">Continuer</button>'+rest+"</div></div>";
  md.classList.add("on");pxify(md);
}
function live(){
  if(!S)return;
  {const n=S.inc&&S.inc.length?Math.min(...S.inc.map(A=>A.arrive)):0,bc=document.body.classList;bc.toggle("underatk",!!n);bc.toggle("atknear",!!n&&n-S.t<15);const pk=shieldAt(S.t)?2:nightAt(S.t)?1:0;if(pk!==live.pk){live.pk=pk;dirty=true;}}
  $("clock").textContent=isMobile()?fmtClock(S.t).replace("Jour ","J"):fmtClock(S.t);
  const cap=rates().cap;
  document.querySelectorAll("[data-endr]").forEach(e=>{const ms=+e.dataset.endr-Date.now();if(ms<=0)dirty=true;e.textContent=fmtDur(Math.max(0,ms/60000));});
  RES.forEach(k=>{const e=$("r-"+k);if(e)e.textContent=fmt(S.res[k]);const b=$("rb-"+k);if(b)b.classList.toggle("full",S.res[k]>=cap-0.5);});
  document.querySelectorAll("[data-end]").forEach(e=>{e.textContent=fmtDur(+e.dataset.end-S.t);});
  document.querySelectorAll("[data-ps]").forEach(e=>{const s=+e.dataset.ps,en=+e.dataset.pe;e.style.width=Math.min(100,Math.max(0,(S.t-s)/(en-s)*100))+"%";});
  document.querySelectorAll("[data-need]").forEach(e=>{e.disabled=!!e.dataset.block;e.classList.toggle("lack",!e.dataset.block&&!afford(JSON.parse(e.dataset.need)));});
  document.querySelectorAll("[data-cr]").forEach(e=>{const r=e.dataset.cr,v=+e.dataset.cv,sh=S.res[r]<v;e.classList.toggle("short",sh);const m=e.querySelector(".miss");if(m)m.textContent=sh?" (−"+fmt(Math.ceil(v-S.res[r]))+")":"";});
}

