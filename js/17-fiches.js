/* Origins 27 · 17-fiches.js
   Fiches de détail, fenêtres d'aide et de risque, fenêtres modales, mise à jour en direct (live).
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Fiche de détail */
/* débuts des messages de blocage testés plus bas (ils suivent la langue de filBlock et migBlock) */
const FB_LINKED=tr("Déjà relié.","Already linked."),FB_FAR=tr("Trop loin","Too far"),FB_MAX=tr("Nombre maximum","Maximum number"),MB_FAR=tr("Trop loin","Too far"),MB_RECALL=tr("Rappelez","First recall"),MB_BUSY=tr("Une migration","A migration");
function detailHTML(){
  if(!openRef){
    const help=EN?{cell:"<h2>Your cell</h2><p class=\"muted\">This is your village. The 4 membrane channels (one per resource) produce your resources, like fields. Inside, 8 slots hold your organelles around the nucleus. Hover over an element, or keep your finger pressed, for a tooltip; tap it to act.</p>",
      map:"<h2>Outside the cell</h2><p class=\"muted\">The abyss around you. Tap a tile to send gatherers there, hunt a wild organism or extend a filament to it. Veiled tiles are unknown: going there explores them. The water brightens toward the center, where dry land awaits; the golden arrow at the edge of the map guides you there.</p>",
      evo:"<h2>Evolution</h2><p class=\"muted\">The tree reads from bottom to top. Energy and Perception have a fork: one choice closes the other path. Predation offers five offensive paths, two at most, which beat each other in a cycle. Before expressing a gene, you only read a hint; its effects and drawbacks are revealed afterwards.</p>",
      act:"<h2>Reports</h2><p class=\"muted\">Your troops on the way, combat and harvest reports, and the log. The red badge counts unread reports.</p>",
      hero:"<h2>Your army</h2><p class=\"muted\">Produce your troops in batches. Two branches, five ranks: 🔍 gathering and spying, ⚔ attack. Each rank, from T1 to T5, is unlocked by ever longer military research; T5 arrives in the last week. The hero joins your hunts and never dies.</p>"}:{cell:"<h2>Votre cellule</h2><p class=\"muted\">C’est votre village. Les 4 canaux de la membrane (un par ressource) produisent vos ressources, comme des champs. À l’intérieur, 8 emplacements accueillent vos organites autour du noyau. Survolez un élément, ou gardez le doigt appuyé, pour une bulle d’aide ; touchez-le pour agir.</p>",
      map:"<h2>Hors de la cellule</h2><p class=\"muted\">Les abysses autour de vous. Touchez une case pour y envoyer des collectrices, chasser un organisme sauvage ou y étendre un filament. Les cases voilées sont inconnues : y aller les explore. L’eau s’éclaircit vers le centre, où vous attend la terre ferme ; la flèche dorée au bord de la carte vous y guide.</p>",
      evo:"<h2>Évolution</h2><p class=\"muted\">L’arbre se lit de bas en haut. Énergie et Perception ont une fourche : un choix ferme l’autre voie. La Prédation offre cinq voies offensives, deux au maximum, qui se battent en cycle. Avant d’exprimer un gène, vous n’en lisez qu’un indice ; ses effets et ses revers se révèlent ensuite.</p>",
      act:"<h2>Rapports</h2><p class=\"muted\">Vos collectrices en route, les rapports de combat et de récolte, et le journal. La pastille rouge compte les rapports non lus.</p>",
      hero:"<h2>Votre armée</h2><p class=\"muted\">Produisez vos troupes par paquets. Deux branches, cinq rangs : 🔍 récolte et espionnage, ⚔ attaque. Chaque rang, de T1 à T5, se débloque par une recherche militaire de plus en plus longue ; le T5 arrive dans la dernière semaine. Le héros accompagne vos chasses et ne meurt jamais.</p>"};
    return help[tab];
  }
  const p=openRef.split(":");
  if(p[0]==="field"){
    const i=+p[1],f=S.fields[i],u=upgradeInfo(openRef),bl=upgradeBlock(u),m=mods(),mult=prodMult(f.k,m)*(1+m.fieldPct);
    let h="<h2>"+FIELD[f.k].name+tr(" · niv. "," · lvl ")+f.l+'</h2><p class="desc">'+FIELD[f.k].role+"</p>";
    h+='<div class="stat" style="margin-top:8px"><span>'+tr("Production de ce canal","This channel’s production")+"</span><b>"+fmt(fieldProd(f.l)*mult)+" / h"+(f.l<FIELD_MAX?' <span class="up">→ '+fmt(fieldProd(f.l+1)*mult)+"</span>":"")+"</b></div>";
    return h+upgradeBox(u,bl);
  }
  if(p[0]==="noyau"){
    const u=upgradeInfo("noyau"),bl=upgradeBlock(u);
    let h="<h2>"+tr("Noyau · niv. ","Nucleus · lvl ")+S.noyau+'</h2><p class="desc">'+BLD.noyau.role+"</p>";
    h+='<div class="stat" style="margin-top:8px"><span>'+tr("Vitesse de construction","Building speed")+"</span><b>+"+Math.round((speedUp()-1)*100)+PCT+' <span class="up">→ +'+Math.round(0.06*(S.noyau+1)*100)+PCT+"</span></b></div>";
    h+='<div class="stat"><span>'+tr("Filaments possibles","Possible filaments")+"</span><b>"+filMax()+"</b></div>";
    h+='<div class="stat"><span>'+tr("Stade de votre base sur la carte","Your base stage on the map")+"</span><b>"+baseStage()+" / 5"+(baseStage()<5?' <span class="up">→ '+(baseStage()+1)+tr(" au noyau "," at nucleus ")+(baseStage()*2+1)+"</span>":"")+"</b></div>";
    h+="<h3>"+tr("Produire des troupes · ","Produce troops · ")+S.idle+tr(" au repos / "," resting / ")+cellCount()+"</h3>"+prodHTML();
    h+="<h3>"+tr("Votre souche","Your strain")+"</h3><p><b>"+SOUCHES[S.souche].name+'</b></p><p class="desc">'+SOUCHES[S.souche].trait+"</p>"+fxList(SOUCHES[S.souche].mods);
    return h+upgradeBox(u,bl);
  }
  if(p[0]==="slot"){
    const i=+p[1],sl=S.slots[i];
    if(!slotOpen(i))return "<h2>"+tr("Emplacement verrouillé","Locked slot")+"</h2><p class=\"muted\">"+tr("Il s’ouvre avec le ","It opens with ")+reqLink(["b","cyto",i-5])+".</p>";
    if(!sl){
      if(S.build&&S.build.type==="new"&&S.build.i===i)return "<h2>"+BLD[S.build.k].name+'</h2><p class="muted">'+tr("En construction.","Under construction.")+"</p>";
      let h="<h2>"+tr("Emplacement libre","Free slot")+"</h2><p class=\"desc lg\">"+tr("Choisissez l’organite à construire ici. Chaque organite n’existe qu’une fois par cellule.","Choose the organelle to build here. Each organelle exists only once per cell.")+"</p>";
      Object.keys(BLD).filter(k=>k!=="noyau"&&!S.slots.some(s=>s&&s.k===k)&&!(S.build&&S.build.type==="new"&&S.build.k===k)).sort((a,b)=>(BLD[b].req.every(reqMet)?1:0)-(BLD[a].req.every(reqMet)?1:0)).forEach(k=>{
        const B=BLD[k],ok=B.req.every(reqMet),c=bldCost(k,0),bl=newBlock(k);
        h+='<div class="choice'+(ok?"":" off")+'"><div class="chead"><div><div class="n">'+B.name+'</div><div class="desc"><span class="lg">'+B.role+'</span><span class="sm">'+B.short+"</span></div></div>";
        if(ok)h+='<button class="btn sm" data-act="buildnew" data-i="'+i+'" data-k="'+k+'"'+need(c)+(bl?' data-block="1"':"")+">"+tr("Construire","Build")+"</button>";
        h+="</div>";
        if(ok){h+='<div class="cost">'+costHTML(c).replace(/^<div class="cost">|<\/div>$/g,"")+'<span class="dur">'+fmtDur(bldTime(k,0))+"</span></div>";if(bl)h+='<p class="reason">'+bl+"</p>";}
        else h+='<div class="req">'+tr("Requis : ","Requires: ")+B.req.map(reqLink).join(" · ")+"</div>";
        h+="</div>";
      });
      return h;
    }
    const u=upgradeInfo(openRef),bl=upgradeBlock(u);
    let h="<h2>"+BLD[sl.k].name+tr(" · niv. "," · lvl ")+sl.l+'</h2><p class="desc">'+BLD[sl.k].role+"</p>";
    h+='<div class="stat" style="margin-top:8px"><span>'+tr("Actuellement","Currently")+"</span><b>"+bldEffectText(sl.k,sl.l)+"</b></div>";
    if(sl.l<BLD[sl.k].max)h+='<div class="stat"><span>'+tr("Au niveau ","At level ")+(sl.l+1)+'</span><b class="up">'+bldEffectText(sl.k,sl.l+1)+"</b></div>";
    if(sl.k==="ribo")h+="<h3>"+tr("Produire des troupes · ","Produce troops · ")+S.idle+tr(" au repos / "," resting / ")+cellCount()+"</h3>"+prodHTML();
    h+=upgradeBox(u,bl);
    return h;
  }
  if(p[0]==="tile")return tileHTML(+p[1],+p[2]);
  if(p[0]==="node")return nodeHTML(p[1]);
  return "";
}
function bqHTML(){if(!S.build)return "";let h='<div class="bqbox"><div class="abh"><span>'+tr("File de constructions","Build queue")+"</span><span>"+(1+(S.bq||[]).length)+" / "+(1+BQ_MAX)+'</span></div><div class="bqi"><span>▶ '+S.build.label+'</span><span class="muted" data-end="'+S.build.end+'"></span></div>';
  (S.bq||[]).forEach((b,j)=>{h+='<div class="bqi"><span>'+(j+2)+". "+b.label+' <span class="muted">· '+fmtDur(b.time)+'</span></span><button class="lnk no" data-act="bqcancel" data-j="'+j+'">'+tr("Annuler","Cancel")+"</button></div>";});
  return h+"</div>";}
function upgradeBox(u,bl,extra){
  if(u.level>=u.max)return bqHTML()+ '<p class="muted" style="margin-top:10px">'+tr("Niveau maximum atteint.","Maximum level reached.")+"</p>"+(extra?'<div class="actbar">'+extra+"</div>":"");
  let h=bqHTML()+'<div class="actbar"><div class="abh"><span>'+tr("Niveau ","Level ")+(u.level+1)+'</span><span>'+fmtDur(u.time)+"</span></div>"+costHTML(u.cost)+'<div class="row"><button class="btn" data-act="upgrade" data-ref="'+openRef+'"'+need(u.cost)+(bl?' data-block="1"':"")+">"+(S.build?tr("Programmer (","Queue (")+((S.bq||[]).length+1)+"/"+BQ_MAX+")":tr("Améliorer","Upgrade"))+"</button></div>";
  if(bl)h+='<p class="reason">'+bl+"</p>";
  return h+(extra||"")+"</div>";
}
function tileTip(x,y){
  const T=S.tiles[y*W+x],d=dist(x,y);
  if(!inWorld(x,y))return tr("<b>Roche</b>Le bord du monde.","<b>Rock</b>The edge of the world.");
  if(isLand(x,y))return tr("<b>Terre ferme</b>Le but final : aucune cellule ne peut encore y vivre.","<b>Dry land</b>The final goal: no cell can live there yet.");
  if(d<0.5)return tr("<b>Votre cellule</b>Vision ","<b>Your cell</b>Sight ")+visR()+tr(" cases."," tiles.");
  const vis=isVis(x,y);let t="<b>"+tr("Case ","Tile ")+x+","+y+"</b>";
  if(!T.s)t+=tr("Inconnue.","Unknown.");
  else{
    if(T.w)t+=WILD_NAME[T.w.type]+" ("+TYPES[T.w.type].name+")<br>"+tr("Robustesse ","Toughness ")+T.w.def+tr(" · votre meilleure voie : "," · your best path: ")+matchup(T.w.type).lbl+"<br>";
    if(T.k){const amt=vis?T.a:T.m;t+=(T.rich?tr("Source hydrothermale · ","Hydrothermal vent · "):"")+RES_NAME[T.k]+" "+fmt(amt)+(vis?"":tr(" (souvenir)"," (last seen)"))+"<br>";}
    if(!T.w&&!T.k)t+=tr("Eau vide.<br>","Empty water.<br>");
    if(S.fils.some(f=>f.x===x&&f.y===y))t+=tr("Reliée par un filament.<br>","Linked by a filament.<br>");
  }
  t+='<span class=m>'+ZONE_NAME[zoneOf(x,y)]+" · distance "+dec(d.toFixed(1))+tr(" · aller "," · trip ")+fmtDur(d*tileTime())+"</span>";
  return t;
}
function tileHTML(x,y){
  const T=S.tiles[y*W+x],d=dist(x,y);
  if(d<0.5)return "<h2>"+tr("Votre cellule","Your cell")+'</h2><p class="muted">'+tr("Vision : ","Sight: ")+visR()+tr(" cases autour de vous. "," tiles around you. ")+'<button class="lnk ok" data-act="tab" data-t="cell">'+tr("Entrer dans la cellule","Enter the cell")+"</button></p>";
  if(!inWorld(x,y))return tr("<h2>Roche</h2><p class=\"muted\">Le bord du monde. Rien ne passe au-delà.</p>","<h2>Rock</h2><p class=\"muted\">The edge of the world. Nothing gets past it.</p>");
  if(isLand(x,y))return tr("<h2>Terre ferme</h2><p>Le centre du monde, et le but final. Aucune cellule ne peut encore y vivre : il faudra qu’une lignée apprenne à quitter l’eau.</p><p class=\"desc\" style=\"margin-top:6px\">C’est ici que l’APEX de votre alliance devra s’imposer.</p>","<h2>Dry land</h2><p>The center of the world, and the final goal. No cell can live there yet: a lineage will have to learn to leave the water.</p><p class=\"desc\" style=\"margin-top:6px\">This is where your alliance’s APEX will have to prevail.</p>");
  const vis=isVis(x,y),eta=d*tileTime(),B=T.s?botAt(x,y):null;
  let h="<h2>"+tr("Case ","Tile ")+x+","+y+'</h2><p class="muted" style="font-size:12.5px">'+ZONE_NAME[zoneOf(x,y)]+" · "+Math.round(rC(x,y))+tr(" cases du centre · aller "," tiles from the center · trip ")+fmtDur(eta)+"</p>";
  if(!T.s)h+="<p>"+tr("Inconnue : aucune de vos cellules n’est venue ici.","Unknown: none of your cells has been here.")+"</p>";
  else{
    if(T.w){const w=T.w,mt=matchup(w.type);h+='<p class="wildic" style="margin-top:6px">'+(SPR["w_"+w.type]?sprImg("w_"+w.type,3):"")+'<span><b>'+WILD_NAME[w.type]+'</b></span> <span class="typechip" style="color:var(--t-'+w.type+')">'+TYPES[w.type].name+"</span></p>";
      h+='<div class="stat"><span>'+tr("Robustesse · biomasse","Toughness · biomass")+"</span><b>"+w.def+" · "+fmt(vis?w.bio:w.mb)+'</b></div><div class="stat"><span>'+tr("Votre meilleure voie","Your best path")+"</span><b>"+mt.lbl+"</b></div>";
      h+='<p class="desc">'+tr("Battu par ","Beaten by ")+TYPES[LOSES_TO[w.type]].name+tr(", bat ",", beats ")+TYPES[BEATS[w.type]].name+".</p>";}
    if(T.k){const amt=vis?T.a:T.m;h+='<p style="margin-top:6px">'+(amt<=0?tr("Gisement vide, il se régénère lentement.","Empty deposit, it regenerates slowly."):(T.rich?tr("Source hydrothermale · ","Hydrothermal vent · "):"")+RES_NAME[T.k]+" : "+fmt(amt)+" / "+fmt(T.max)+(vis?"":tr(" (souvenir)"," (last seen)")))+"</p>";}
    if(B)h+=botPanel(B,vis||spied(B));
    if(!T.w&&!T.k&&!B)h+="<p>"+tr("Eau vide.","Empty water.")+"</p>";
  }
  const kind=(T.w||B)&&T.s?"hunt":T.s?"collect":"explore",man=S.compMode==="man",cu=selComp(kind),cn=uSum(cu);
  const block=S.mig?tr("Migration en cours.","Migration in progress."):d>range()?tr("Trop loin : améliorez le flagelle.","Too far: upgrade the flagellum."):S.idle<1?tr("Aucune troupe disponible.","No troops available."):cn<1?tr("Choisissez au moins une troupe.","Choose at least one troop."):"";
  const n=shownN();
  let fil="",fb="",c=null;
  if(T.k&&T.s){fb=filBlock(x,y);c=filCost(d);
    h+='<p class="desc" style="margin-top:6px">'+tr("Filament : environ ","Filament: about ")+fmt(filBase(T,mods()))+" "+RES_NAME[T.k].toLowerCase()+tr(" par heure en continu · "," per hour continuously · ")+S.fils.length+tr(" sur "," of ")+filMax()+tr(" · portée "," · range ")+filRange()+tr(" cases."," tiles.")+"</p>";
    if(fb!==FB_LINKED&&fb.indexOf(FB_FAR)!==0&&fb.indexOf(FB_MAX)!==0)fil='<button class="btn sm alt" data-act="filament"'+need(c)+(fb?' data-block="1"':"")+' data-tip="'+esc(tr("<b>Étendre un filament</b>","<b>Extend a filament</b>")+Object.keys(c).map(r=>fmt(c[r])+" "+RES_NAME[r]).join(", ")+" · "+fmtDur(filTime(d)))+'">Filament</button>';
  }
  h+='<div class="actbar"><div class="abh"><span>'+tr("Troupes à envoyer","Troops to send")+"</span><span>"+S.idle+tr(" libre"+(S.idle>1?"s":"")," free")+"</span></div>";
  h+='<div class="row" style="margin:6px 0"><span class="seg2" role="group" aria-label="'+tr("Choix des troupes","Troop choice")+'"><button data-act="compmode" data-m="auto" aria-pressed="'+!man+'">Auto</button><button data-act="compmode" data-m="man" aria-pressed="'+man+'">'+tr("Je choisis","I choose")+"</button></span></div>";
  if(man)h+=compEditor();else h+='<div class="stepper"><button data-act="n-" aria-label="'+tr("Moins","Less")+'">−</button><b>'+n+'</b><button data-act="n+" aria-label="'+tr("Plus","More")+'">+</button><button data-act="nmax" style="width:auto;padding:0 10px">max</button></div>';
  let fc="";
  const withHero=(T.w||B)&&T.s&&S.heroWith&&!S.hero.busy;
  if(B){const pw=compAtk(cu,B.type)+(withHero?heroPower(B.type):0);fc=tr("force ","strength ")+fmt(pw)+tr(" / défense "," / defense ")+botEst(B,vis||spied(B));}
  if(T.w&&T.s){const pw=compAtk(cu,T.w.type)+(withHero?heroPower(T.w.type):0),lf=lossFrac(pw,T.w.def),ok=pw*ATK_ADV>=T.w.def;fc=tr("force ","strength ")+fmt(pw)+" / "+T.w.def+(ok?' <span class="up">'+tr("gagnable","winnable")+"</span>":' <span class="neg">'+tr("trop faible","too weak")+"</span>")+tr(" · pertes ≈ "," · losses ≈ ")+Math.round(lf*100)+PCT;}
  h+='<p class="desc" style="margin:2px 0 6px">'+(man?"":tr("Choix auto : ","Auto choice: "))+compText(cu)+(cn?tr(" · charge "," · load ")+fmt(compCarry(cu))+tr(" · vitesse ×"," · speed ×")+dec(compSpd(cu)):"")+(fc?" · "+fc:"")+"</p>";
  const evs=(S.events||[]).filter(e=>Math.hypot(x-e.x,y-e.y)<=e.r+0.5);if(evs.length)h=h.replace("</h2>","</h2>"+evs.map(e=>'<p class="evline" style="--ec:'+EVENTS[e.type].col+'">'+EVENTS[e.type].ic+" "+EVENTS[e.type].name+tr(" · encore "," · ")+'<span data-end="'+e.end+'"></span></p>').join(""));
  h+='<div class="row">'+(B?(S.ally&&B.tag===S.ally?'<span class="up" style="font-size:12.5px">'+tr("Allié ","Ally ")+B.tag+tr(" : on ne pille pas les siens.",": you don’t raid your own.")+"</span>":'<button class="btn sm" data-act="raid" style="background:var(--bad);border-color:var(--bad)"'+(block||(nightAt(S.t)&&!B.tut)?" disabled":"")+">"+tr("Piller","Raid")+" <small>⚡"+EN_COST.raid+"</small></button>"+'<button class="btn sm alt" data-act="spy"'+(S.mig||d>range()||spyIdle()<1?" disabled":"")+' data-tip="'+esc(tr("<b>Espionner</b>","<b>Spy</b>")+(spyIdle()?tr("Envoie vos troupes d’espionnage (","Sends your spy troops (")+spyIdle()+tr(" au repos). Vigilance estimée : "," resting). Estimated vigilance: ")+fmt(botVig(B))+".":tr("Il faut des éclaireuses ou mieux (recherche militaire 🔍 T2).","You need scouts or better (military research 🔍 T2).")))+'">'+tr("Espionner","Spy")+" <small>⚡1</small></button>"):'<button class="btn sm" data-act="collect"'+(block?" disabled":"")+">"+(T.s?tr("Collecter","Harvest"):tr("Explorer","Explore"))+" <small>"+(enCostFor("collect",T)?"⚡1":tr("⚡ gratuit","⚡ free"))+"</small></button>");
  if(T.w&&T.s)h+='<button class="btn sm alt" data-act="hunt"'+(block?" disabled":"")+">"+tr("Chasser","Hunt")+" <small>⚡"+EN_COST.hunt+"</small></button>";
  h+=fil;
  let mig="";if(T.s&&!T.k&&!T.w&&!B){const mb=migBlock(x,y),mc=migCost(d);if(mb.indexOf(MB_FAR)!==0&&mb.indexOf(MB_RECALL)!==0&&mb.indexOf(MB_BUSY)!==0)mig='<button class="btn sm alt" data-act="migrate"'+need(mc)+(mb?' data-block="1"':"")+' data-tip="'+esc(tr("<b>Migrer ici</b>","<b>Migrate here</b>")+Object.keys(mc).map(r=>fmt(mc[r])+" "+RES_NAME[r]).join(", ")+" · "+fmtDur(migTime(d))+(S.fils.length?tr("<br>Vos filaments seront coupés.","<br>Your filaments will be cut."):""))+'">'+tr("Migrer ici","Migrate here")+"</button>";h+=mig;
    if(mb&&(mb.indexOf(MB_FAR)===0||mb.indexOf(MB_RECALL)===0))h+='</div><p class="desc">'+tr("Migration : ","Migration: ")+mb+(mb.indexOf(MB_RECALL)===0?' <button class="lnk ok" data-act="recallall">'+tr("Rappeler tout","Recall all")+"</button>"+tr(" · retour dans "," · back in ")+'<span data-end="'+Math.max(...S.missions.map(M=>M.back))+'"></span>':"")+"</p><div>";}
  h+="</div>";
  if((T.w||B)&&T.s)h+='<label class="herotog"><input type="checkbox" data-act="herowith"'+(S.heroWith?" checked":"")+(S.hero.busy?" disabled":"")+"> "+tr("Avec le héros (","With the hero (")+formName(S.hero.form)+tr(" niv. "," lvl ")+S.hero.lvl+(S.hero.busy?tr(", déjà en mission",", already on a mission"):tr(", force ",", strength ")+heroPower(T.w?T.w.type:B.type))+")</label>";
  if(mig)h+='<div class="cost" style="font-size:11px">'+tr("Migration : ","Migration: ")+Object.keys(migCost(d)).map(r=>'<span class="c-'+r+'">'+fmt(migCost(d)[r])+"</span>").join("")+'<span class="dur">'+fmtDur(migTime(d))+(S.fils.length?tr(" · coupe les filaments"," · cuts filaments"):"")+"</span></div>";
  if(S.mig)h+='<p class="reason">'+tr("Votre cellule migre : les envois reprendront à l’arrivée.","Your cell is migrating: dispatches will resume on arrival.")+"</p>";
  if(fil&&c)h+='<div class="cost" style="font-size:11px">'+tr("Filament : ","Filament: ")+Object.keys(c).map(r=>'<span class="c-'+r+'">'+fmt(c[r])+"</span>").join("")+'<span class="dur">'+fmtDur(filTime(d))+"</span></div>";
  if(block)h+='<p class="reason">'+block+(S.idle<1&&blvl("ribo")<1?" "+riboHint():"")+"</p>";
  if(fb&&fb!==FB_LINKED&&(fb.indexOf(FB_FAR)===0||fb.indexOf(FB_MAX)===0))h+='<p class="reason">'+fb+(fb.indexOf(FB_FAR)===0?' <button class="lnk no" data-act="goto" data-tab="cell" data-ref="'+refFor(["b","flag",1])+'">'+BLD.flag.name+"</button>":' <button class="lnk no" data-act="goto" data-tab="cell" data-ref="noyau">'+BLD.noyau.name+"</button>")+"</p>";
  else if(fb===FB_LINKED)h+='<p class="desc">'+tr("Déjà reliée par un filament.","Already linked by a filament.")+"</p>";
  return h+"</div>";
}
function nodeHTML(id){
  const n=NODES[id],st=nodeState(id);
  if(st==="hidden")return "<h2>???</h2><p class=\"muted\">"+tr("Ce gène reste dans l’ombre tant que vous n’avez pas exprimé ","This gene stays in the shadows until you have expressed ")+nodeLink(n.parents[0])+".</p>";
  let h="<h2>"+n.name+"</h2>";
  h+='<p class="muted" style="font-size:12px">'+(n.br==="X"?tr("Sommet de l’arbre","Top of the tree"):tr("Branche "+BRANCH[n.br]+" · rang ",BRANCH[n.br]+" branch · rank ")+n.tier)+"</p>";
  h+='<p style="margin-top:6px;font-style:italic">'+tr("« "+n.hint+" »","“"+n.hint+"”")+"</p>";
  if(n.type)h+='<p class="desc" style="margin-top:8px"><span class="typechip" style="color:var(--t-'+n.type+')">'+TYPES[n.type].name+"</span> "+tr("Fort contre ","Strong against ")+"<b>"+TYPES[BEATS[n.type]].name+"</b> ("+TYPES[n.type].why.toLowerCase().replace(/\.$/,"")+"). "+tr("Faible contre ","Weak against ")+"<b>"+TYPES[LOSES_TO[n.type]].name+"</b>.</p>";
  if(st==="owned"){const L=glvl(id),mx=maxLvl(id);
    h+='<div class="stat" style="margin-top:8px"><span>'+tr("Niveau","Level")+"</span><b>"+L+" / "+mx+"</b></div>";
    h+="<h3>"+tr("Effets au niveau ","Effects at level ")+L+"</h3>"+(fxList(scaledEff(id,L))||'<p class="muted">'+tr("Aucun effet chiffré.","No numeric effect.")+"</p>");
    h+="<h3>"+tr("Revers","Drawbacks")+"</h3>"+(Object.keys(n.mal).length?fxList(n.mal):'<p class="muted">'+tr("Aucun revers connu.","No known drawbacks.")+"</p>")+'<p class="desc">'+tr("Les revers ne grandissent pas avec les niveaux.","Drawbacks do not grow with levels.")+"</p>";
    if(L<mx){const lb=lvlBlock(id),c=lvlCost(id,L),busy=S.research&&S.research.id===id&&S.research.lvl;
      h+="<h3>"+tr("Au niveau ","At level ")+(L+1)+"</h3>"+fxList(scaledEff(id,L+1));
      h+='<div class="actbar"><div class="abh"><span>'+tr("Niveau ","Level ")+(L+1)+"</span><span>"+fmtDur(lvlTime(id,L))+"</span></div>"+costHTML(c)+'<div class="row"><button class="btn" data-act="glevel" data-id="'+id+'"'+need(c)+(lb?' data-block="1"':"")+">"+(busy?tr("Amélioration en cours…","Upgrade in progress…"):tr("Améliorer ce gène","Upgrade this gene"))+"</button></div>"+(lb&&!busy?'<p class="reason">'+lb+"</p>":"")+"</div>";}
    return h;}
  if(n.excl){const sib=Object.keys(NODES).find(k=>k!==id&&NODES[k].excl===n.excl);h+='<p class="desc" style="margin-top:8px">'+tr("Fourche : exprimer ce gène ferme définitivement la voie ","Fork: expressing this gene permanently closes the path ")+nodeLink(sib)+".</p>";}
  if(n.type)h+='<p class="desc" style="margin-top:6px">'+tr("Deux voies offensives au maximum ; la seconde coûte le double.","Two offensive paths at most; the second costs double.")+"</p>";
  if(st==="closed")return h+'<p class="reason">'+(n.type?tr("Vous avez déjà deux voies offensives.","You already have two offensive paths."):tr("Voie fermée par votre choix.","Path closed by your choice."))+"</p>";
  h+='<p class="desc lg" style="margin-top:8px">'+tr("Ses effets exacts, et ses éventuels revers, ne seront connus qu’une fois le gène exprimé.","Its exact effects, and any drawbacks, will only be known once the gene is expressed.")+"</p>";
  if(n.req.length)h+='<div class="req" style="margin-top:8px">'+tr("Requis : ","Requires: ")+n.req.map(reqLink).join(" · ")+"</div>";
  if(n.parents.length)h+='<div class="req">'+tr("Après : ","After: ")+n.parents.map(nodeLink).join(", ")+"</div>";
  if(id==="ENDO")h+='<div class="req">'+tr("Deux gènes de rang 3 : ","Two rank 3 genes: ")+RANK3.map(k=>has(k)?'<span style="color:var(--lume)">'+NODES[k].name+"</span>":"").filter(Boolean).join(", ")+(RANK3.filter(has).length<2?' <span style="color:var(--bad)">('+RANK3.filter(has).length+" / 2)</span>":"")+"</div>";
  const c=nodeCost(id),bl=nodeBlock(id);
  h+='<div class="actbar"><div class="abh"><span>'+tr("Exprimer","Express")+"</span><span>"+fmtDur(nodeTime(id))+"</span></div>"+costHTML(c)+'<div class="row"><button class="btn" data-act="express" data-id="'+id+'"'+need(c)+(bl?' data-block="1"':"")+">"+tr("Exprimer ce gène","Express this gene")+"</button></div>";
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
function goBtn(tabName,ref,label){return '<button class="btn sm alt" data-act="goadv" data-tab="'+tabName+'"'+(ref?' data-ref="'+ref+'"':"")+">"+(label||tr("Y aller","Go"))+" →</button>";}
function advStep(icon,html,btn){return '<li>'+(icon?sprImg(icon,1):'<span class="advdot"></span>')+'<span class="advt">'+html+"</span>"+(btn||"")+"</li>";}
function adviceHTML(c){
  const lack=lackOf(c),rt=rates();let h='<div class="kick">'+tr("Ressources insuffisantes","Not enough resources")+"</div><h2>"+tr("Il vous manque","You are missing")+'</h2><div class="lackrow">';
  Object.keys(lack).forEach(r=>{h+='<div class="lack">'+sprImg("r_"+r,2)+'<b class="neg">−'+fmt(lack[r])+"</b><span>"+RES_NAME[r]+"</span></div>";});
  h+="</div>";
  Object.keys(lack).forEach(r=>{
    const rate=rt[r],wait=rate>0?lack[r]/rate*60:Infinity;
    h+='<h3 class="advh">'+sprImg("r_"+r,1)+tr(" Plus de "," More ")+rlow(r)+'</h3><ol class="advpath">';
    if(c[r]>rt.cap)h+=advStep("o_vac",tr("<b>Agrandissez la vacuole</b> : votre stockage (","<b>Upgrade the vacuole</b>: your storage (")+fmt(rt.cap)+tr(") est plus petit que le coût.",") is smaller than the cost."),goBtn("cell",refFor(["b","vac"])));
    const fr=refFor(["f",r]),fi=+fr.split(":")[1],fl=S.fields[fi].l;
    h+=advStep("r_"+r,tr("<b>Améliorez un canal "+rlow(r)+"</b> (le meilleur est niv. ","<b>Upgrade a "+rlow(r)+" channel</b> (the best is lvl ")+fl+tr(") : la source principale.","): the main source."),goBtn("cell",fr));
    const bk=RES_BLD[r];
    if(bk){const L=blvl(bk);h+=advStep(ORG_SPR[bk],(L?tr("<b>Améliorez ","<b>Upgrade ")+BLD[bk].name+tr("</b> (niv. ","</b> (lvl ")+L+")":tr("<b>Construisez ","<b>Build ")+BLD[bk].name+"</b>")+" : +8"+PCT+tr(" de "," ")+rlow(r)+tr(" par niveau."," per level."),goBtn("cell",refFor(["b",bk])));}
    h+=advStep("u_coll",tr("<b>Récoltez sur la carte</b> : envoyez des collectrices sur un gisement de ","<b>Harvest on the map</b>: send gatherers to a deposit of ")+rlow(r)+tr(", ou reliez-le par un filament.",", or link it with a filament."),goBtn("map",null,tr("Carte","Map")));
    if(isFinite(wait))h+=advStep(null,tr("Ou patientez : environ <b>","Or wait: about <b>")+fmtDur(wait)+tr("</b> au rythme actuel (","</b> at the current rate (")+fmt(rate)+" / h).");
    h+="</ol>";
  });
  return h+'<button class="btn" data-act="mclose">'+tr("Compris","Got it")+"</button>";
}
function huntRisk(){
  const p=openRef&&openRef.split(":");if(!p||p[0]!=="tile")return null;
  const T=S.tiles[+p[2]*W+(+p[1])];if(!T||!T.w)return null;
  const u=selComp("hunt"),n=uSum(u),withHero=S.heroWith&&!S.hero.busy,hp=withHero?heroPower(T.w.type):0,pw=compAtk(u,T.w.type)+hp;
  return {T,n,withHero,hp,pw,ok:pw*ATK_ADV>=T.w.def,lf:lossFrac(pw,T.w.def)};
}
function huntWarnHTML(R){
  const w=R.T.w,lost=Math.round(R.n*R.lf),adv=huntAdvice(R.n,w,R.hp,R.withHero);
  let h='<div class="kick" style="color:var(--bad)">'+tr("Avertissement","Warning")+"</div><h2>"+tr("Vous risquez de perdre ce combat","You may lose this fight")+"</h2>";
  h+='<div class="advwild">'+(SPR["w_"+w.type]?sprImg("w_"+w.type,4):"")+"</div>";
  h+="<p>"+tr("Votre force ","Your strength ")+'<b class="neg">'+fmt(R.pw)+"</b>"+tr(" contre une robustesse de "," against a toughness of ")+"<b>"+w.def+"</b> : "+WILD_NAME[w.type]+tr(" résistera."," will hold out.")+"</p>";
  h+="<p>"+tr("Pertes probables : ","Likely losses: ")+'<b class="neg">'+lost+" "+(lost>1?UNITS.coll.pl:UNITS.coll.name).toLowerCase()+"</b>"+tr(" sur "," out of ")+R.n+" (≈ "+Math.round(R.lf*100)+PCT+tr("), sans butin.","), with no loot.")+"</p>";
  if(w.tut)h+='<p class="up">'+tr("Première chasse : vos pertes seront remboursées.","First hunt: your losses will be refunded.")+"</p>";
  if(adv.length)h+='<h3 class="advh">'+tr("Pour gagner","To win")+'</h3><ol class="advpath">'+adv.map(a=>advStep(null,a)).join("")+"</ol>";
  return h+'<div class="row" style="justify-content:center"><button class="btn alt" data-act="mclose">'+tr("Renoncer","Give up")+'</button><button class="btn" data-act="huntgo" style="background:var(--bad);border-color:var(--bad)">'+tr("Attaquer quand même","Attack anyway")+"</button></div>";
}

function renderModal(){
  const md=$("modal");
  if(S.mutOffer){md.innerHTML='<div class="pop adv mutpop">'+mutOfferHTML()+"</div>";md.classList.add("on");return;}
  if(!S.popups.length){if(modalExtra){md.innerHTML=modalExtra;md.classList.add("on");pxify(md);return;}md.classList.remove("on");md.innerHTML="";return;}
  const p=S.popups[0];
  const art=p.hero?'<div class="popart">'+heroSVG()+"</div>":isPixel()?'<div class="popart">'+artBox("mini",miniSVG(p.org),110,110)+"</div>":miniSVG(p.org);
  const more=p.more?'<p class="desc" style="margin-top:6px">+ '+p.more+(EN?" older event"+(p.more>1?"s":"")+": see Reports › Log.":" autre"+(p.more>1?"s":"")+" événement"+(p.more>1?"s":"")+" plus ancien"+(p.more>1?"s":"")+" : voir Rapports › Journal.")+"</p>":"";
  const rest=S.popups.length>1?'<button class="btn alt" data-act="popall">'+tr("Tout fermer (","Close all (")+S.popups.length+")</button>":"";
  md.innerHTML='<div class="pop"><div class="kick">'+p.kick+"</div><h2>"+p.title+"</h2>"+art+p.body+more+'<br><div class="row" style="justify-content:center"><button class="btn" data-act="popok">'+tr("Continuer","Continue")+"</button>"+rest+"</div></div>";
  md.classList.add("on");pxify(md);
}
function live(){
  if(!S)return;if(typeof seasonTick==="function")seasonTick();
  {const n=S.inc&&S.inc.length?Math.min(...S.inc.map(A=>A.arrive)):0,bc=document.body.classList;bc.toggle("underatk",!!n);bc.toggle("atknear",!!n&&n-S.t<15);const pk=shieldAt(S.t)?2:nightAt(S.t)?1:0;if(pk!==live.pk){live.pk=pk;dirty=true;}}
  $("clock").textContent=isMobile()?fmtClockShort(S.t):fmtClock(S.t);
  const cap=rates().cap;
  document.querySelectorAll("[data-endr]").forEach(e=>{const ms=+e.dataset.endr-Date.now();if(ms<=0)dirty=true;e.textContent=fmtDur(Math.max(0,ms/60000));});
  RES.forEach(k=>{const e=$("r-"+k);if(e)e.textContent=fmt(S.res[k]);const b=$("rb-"+k);if(b)b.classList.toggle("full",S.res[k]>=cap-0.5);});
  document.querySelectorAll("[data-end]").forEach(e=>{e.textContent=fmtDur(+e.dataset.end-S.t);});
  document.querySelectorAll("[data-ps]").forEach(e=>{const s=+e.dataset.ps,en=+e.dataset.pe;e.style.width=Math.min(100,Math.max(0,(S.t-s)/(en-s)*100))+"%";});
  document.querySelectorAll("[data-need]").forEach(e=>{e.disabled=!!e.dataset.block;e.classList.toggle("lack",!e.dataset.block&&!afford(JSON.parse(e.dataset.need)));});
  document.querySelectorAll("[data-cr]").forEach(e=>{const r=e.dataset.cr,v=+e.dataset.cv,sh=S.res[r]<v;e.classList.toggle("short",sh);const m=e.querySelector(".miss");if(m)m.textContent=sh?" (−"+fmt(Math.ceil(v-S.res[r]))+")":"";});
}

