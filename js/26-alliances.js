/* Origins 27 · 26-alliances.js
   Alliances, 2e version : elles ouvrent au jour 5. Ce jour-là, l'alliance la plus présente autour de vous vous recrute d'office
   (changement gratuit pendant 24 h). Ensuite :
   · Technologies d'alliance : 3 directions (Croissance, Conquête, Rempart), 3 technologies chacune, 5 niveaux. Les membres (vous et
     les rivaux de la bannière) y versent des points ; l'alliance suit une technologie recommandée, qui rapporte ×1,5.
     Avec 600 points de contribution, vous devenez Officier et c'est vous qui choisissez la recommandation.
   · Dons : chaque don coûte des ressources et rapporte de la contribution et des crédits d'alliance (20 dons par jour de jeu).
   · Entraide : demandez de l'aide sur une construction (les membres connectés raccourcissent le chantier) et aidez les autres (crédits).
   · Boutique : les crédits s'échangent contre de l'énergie, un coffre, un bouclier ou une construction instantanée.
   · Cadeau d'alliance chaque jour de jeu, plus gros quand l'alliance monte en niveau.
   · Discord : un lien vers le serveur de la communauté, avec une récompense au premier passage.
   Chargé dans l'ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Collez ici l'invitation du serveur Discord (par exemple "https://discord.gg/xxxxxxx"). Vide : le bouton n'apparaît pas. */
const DISCORD_URL="";
const AL_DAY=5,AL_DON_MAX=20,AL_OFFICER=600;
const AL_BR=[
  {id:"G",ic:"🌱",name:tr("Croissance","Growth"),techs:[
    {id:"g1",name:tr("Réseau nutritif","Nutrient network"),mod:"fieldPct",per:0.02},
    {id:"g2",name:tr("Réserves partagées","Shared reserves"),mod:"capPct",per:0.04},
    {id:"g3",name:tr("Chantiers communs","Common worksites"),mod:"buildPct",per:0.03}]},
  {id:"C",ic:"⚔",name:tr("Conquête","Conquest"),techs:[
    {id:"c1",name:tr("Meute","Pack"),mod:"predPct",per:0.03},
    {id:"c2",name:tr("Pillage organisé","Organized looting"),mod:"lootPct",per:0.04},
    {id:"c3",name:tr("Courants rapides","Fast currents"),mod:"speedPct",per:0.03}]},
  {id:"R",ic:"🛡",name:tr("Rempart","Bulwark"),techs:[
    {id:"r1",name:tr("Membrane commune","Common membrane"),mod:"defPct",per:0.03},
    {id:"r2",name:tr("Renforts","Reinforcements"),mod:"helpPct",per:0.15},
    {id:"r3",name:tr("Entretien partagé","Shared upkeep"),mod:"upkeepPct",per:-0.03}]}];
const AL_TECH={};AL_BR.forEach(B=>B.techs.forEach(t=>{t.br=B.id;AL_TECH[t.id]=t;}));
const AL_MAXL=5;
function alNeed(L){return Math.round(400*Math.pow(2,L));}
function alOpen(){return !!S&&(S.t>=AL_DAY*1440||!!S.ally);}
function alData(tag){S.alT=S.alT||{};if(!S.alT[tag]){const h=[...tag].reduce((a,c)=>a*31+c.charCodeAt(0),7)>>>0,ids=Object.keys(AL_TECH);S.alT[tag]={tech:{},rec:ids[h%ids.length],gift:0};ids.forEach(id=>S.alT[tag].tech[id]={l:0,p:0});}return S.alT[tag];}
function alMe(){S.al=S.al||{pts:0,cr:0,don:0,donDay:-1,helped:0,helpDay:-1,giftDay:-1,disc:0};return S.al;}
function alLevel(tag){const D=alData(tag);return 1+Object.values(D.tech).reduce((a,t)=>a+t.l,0);}
function alTechLvl(id){if(!S||!S.ally)return 0;const D=alData(S.ally);return (D.tech[id]||{l:0}).l;}
function alMods(m){if(!S||!S.ally)return;for(const id in AL_TECH){const t=AL_TECH[id],l=alTechLvl(id);if(l&&t.mod!=="helpPct")m[t.mod]=(m[t.mod]||0)+t.per*l;}}
function alHelpMult(){return 1+AL_TECH.r2.per*alTechLvl("r2");}
function alOfficer(){return S.ally&&alMe().pts>=AL_OFFICER;}
function alAddP(tag,id,v){const D=alData(tag),T=D.tech[id];if(!T||T.l>=AL_MAXL)return false;T.p+=v;let up=false;while(T.l<AL_MAXL&&T.p>=alNeed(T.l)){T.p-=alNeed(T.l);T.l++;up=true;
    if(tag===S.ally){const t=AL_TECH[id];log("🤝 "+tr("Technologie d’alliance : ","Alliance technology: ")+t.name+tr(" passe au niveau "," reaches level ")+T.l+" ("+alEffText(t,T.l)+").","good");toast("🤝 "+t.name+" "+T.l);}}
  if(T.l>=AL_MAXL)T.p=0;if(up&&D.rec===id&&T.l>=AL_MAXL)D.rec=alNextRec(tag);return up;}
function alNextRec(tag){const D=alData(tag);const ids=Object.keys(AL_TECH).filter(id=>D.tech[id].l<AL_MAXL);return ids.length?ids.sort((a,b)=>D.tech[a].l-D.tech[b].l)[0]:null;}
function alEffText(t,l){const v=Math.round(Math.abs(t.per)*l*100);if(t.mod==="helpPct")return tr("renforts +","reinforcements +")+v+PCT;return (t.per<0?"−":"+")+v+PCT+" "+(MOD_LABEL[t.mod]||t.mod);}
function alDonCost(){const v=Math.round((50+22*S.noyau)*PACE);return {atp:v,prot:v};}
function alDayReset(){const A=alMe(),d=dayIdx(S.t);if(A.donDay!==d){A.donDay=d;A.don=0;}if(A.helpDay!==d){A.helpDay=d;A.helped=0;}}
/* aide demandée par les autres membres (simulée) : une poignée par jour */
function alReqs(){if(!S.ally)return 0;alDayReset();const A=alMe(),on=allyBots(S.ally).filter(b=>botOnline(b,S.t)).length;return Math.max(0,Math.min(30-A.helped,on*2));}

/* chaque demi-heure de jeu (appelé par botsStep) */
function alTick(k){
  if(!S.bots||S.tut!=null)return;
  if(!S.ally&&!S.alAuto&&S.t>=AL_DAY*1440){S.alAuto=1;alAutoJoin();}
  Object.keys(ALLY_INFO).forEach(tag=>{const D=alData(tag);if(!D.rec)return;const on=allyBots(tag).filter(b=>botOnline(b,S.t)).length;alAddP(tag,D.rec,on*1.2*k);
    if(tag!==S.ally||!alOfficer()){if(Math.random()<0.02*k){const r=alNextRec(tag);if(r)D.rec=r;}}});
  if(S.ally&&S.build&&S.build.help!=null&&S.build.help<10){const on=allyBots(S.ally).filter(b=>botOnline(b,S.t)).length,n=Math.min(10-S.build.help,Math.ceil(on*0.6*k));
    if(n>0){const left=S.build.end-S.t;S.build.end-=Math.max(0,left)*0.02*n;S.build.help+=n;if(S.build.help>=10)log("🤝 "+tr("Vos alliés ont fini de vous aider : chantier raccourci.","Your allies are done helping: worksite shortened."),"good");dirty=true;}}
}
function alAutoJoin(){const c=cpos();let best=null,bn=-1;Object.keys(ALLY_INFO).forEach(t=>{const n=allyBots(t).filter(b=>Math.hypot(b.x-c[0],b.y-c[1])<=30).length+Math.random()*0.5;if(n>bn){bn=n;best=t;}});
  if(!best)return;joinAlly(best,true);S.alFree=S.t+1440;
  popup({kick:tr("🤝 Alliances ouvertes","🤝 Alliances open"),title:tr("Vous êtes recruté par ","You are recruited by ")+best+" "+ALLY_INFO[best],grp:"ally",body:"<p>"+tr("Jour 5 : les organismes s’organisent. L’alliance la plus présente autour de vous vous a accueilli. Ses membres ne vous attaquent plus et viennent vous défendre.","Day 5: organisms are getting organized. The alliance most present around you has taken you in. Its members no longer attack you and come to defend you.")+"</p><p>"+tr("Pas à votre goût ? Pendant <b>24 h</b>, vous pouvez en changer <b>sans pénalité</b> (onglet Rapports → Alliance).","Not to your taste? For <b>24 h</b>, you can switch <b>without penalty</b> (Reports tab → Alliance).")+'</p><p class="desc">'+tr("Donnez des ressources pour faire progresser ses technologies, demandez de l’aide sur vos chantiers, et récupérez le cadeau d’alliance chaque jour.","Donate resources to advance its technologies, ask for help on your worksites, and claim the alliance gift every day.")+'</p><div class="row"><button class="btn" data-act="algo">'+tr("Voir mon alliance","See my alliance")+"</button></div>"});}

/* actions */
function alDonate(id){if(!S.ally)return;alDayReset();const A=alMe(),t=AL_TECH[id],D=alData(S.ally);if(!t||D.tech[id].l>=AL_MAXL||A.don>=AL_DON_MAX)return;const c=alDonCost();if(!afford(c))return;pay(c);A.don++;
  const rec=D.rec===id,v=rec?60:40;A.pts+=v;A.cr+=v;alAddP(S.ally,id,v);toast("🤝 +"+v+tr(" contribution"," contribution")+(rec?" (×1,5)":""));if(typeof dqAdd==="function")dqAdd("ally",1);dirty=true;}
function alSetRec(id){if(!alOfficer()||!AL_TECH[id])return;const D=alData(S.ally);if(D.tech[id].l>=AL_MAXL)return;D.rec=id;log("🤝 "+tr("Vous recommandez la technologie ","You recommend the technology ")+AL_TECH[id].name+tr(" : l’alliance y verse ses points."," : the alliance pours its points into it."),"good");dirty=true;}
function alHelpAll(){const n=alReqs();if(!n)return;const A=alMe();A.helped+=n;A.cr+=n*10;A.pts+=n*2;toast("🤝 "+tr("Vous aidez ","You help ")+n+tr(" alliés · +"," allies · +")+n*10+tr(" crédits"," credits"));dirty=true;}
function alAskHelp(){if(!S.ally||!S.build||S.build.help!=null)return;S.build.help=0;toast(tr("🤝 Demande d’aide envoyée à l’alliance","🤝 Help request sent to the alliance"));dirty=true;}
function alGiftReady(){return !!S.ally&&alMe().giftDay!==dayIdx(S.t);}
function alGift(){if(!alGiftReady())return null;const A=alMe();A.giftDay=dayIdx(S.t);const L=alLevel(S.ally),T=CHEST_TIERS[L>=25?3:L>=12?2:L>=5?1:0],items=[],got=openChest(T,items);
  log("🤝 "+tr("Cadeau d’alliance ","Alliance gift ")+"("+T.n+") : "+got.join(", ")+".","good");return {T,items};}
const AL_SHOP=[
  {id:"en",e:"⚡",t:()=>tr("+10 énergie","+10 energy"),c:150,go:()=>{enInit();S.en=Math.min(EN_CAP,S.en+10);}},
  {id:"chest",e:"🎁",t:()=>tr("Coffre rare","Rare chest"),c:450,go:()=>{const T=CHEST_TIERS[1],items=[],got=openChest(T,items);log("🎁 "+tr("Coffre d’alliance : ","Alliance chest: ")+got.join(", ")+".","good");return {T,items};}},
  {id:"shield",e:"🛡",t:()=>tr("Bouclier 1 h (réelle)","1 h shield (real time)"),c:700,go:()=>{S.shieldR=Math.max(S.shieldR||0,Date.now())+3600e3;log("🛡 "+tr("Bouclier d’alliance : personne ne peut vous attaquer pendant 1 h.","Alliance shield: nobody can attack you for 1 h."),"good");}},
  {id:"inst",e:"🏗",t:()=>tr("Construction instantanée","Instant build"),c:1600,go:()=>{S.inst=(S.inst||0)+1;}}];
function alBuy(id){const it=AL_SHOP.find(x=>x.id===id),A=alMe();if(!it||A.cr<it.c)return null;A.cr-=it.c;const r=it.go();toast(it.e+" "+it.t());dirty=true;return r||null;}
function alLeave(){if(!S.ally)return;const free=S.alFree&&S.t<S.alFree;if(free){log(tr("Vous quittez ","You leave ")+S.ally+tr(" (changement gratuit)."," (free switch)."),"muted");S.ally=null;S.alFree=0;dirty=true;return true;}return false;}
function discordGo(){if(!DISCORD_URL)return;window.open(DISCORD_URL,"_blank","noopener");if(S&&!S.discordGot){S.discordGot=1;const A=alMe();A.cr+=300;enInit();S.en=Math.min(120,S.en+15);const T=CHEST_TIERS[1],items=[];openChest(T,items);log("💬 "+tr("Merci d’avoir rejoint le Discord : +15 ⚡, coffre rare et 300 crédits d’alliance.","Thanks for joining the Discord: +15 ⚡, a rare chest and 300 alliance credits."),"rare");setTimeout(()=>chestFX(T,items),400);dirty=true;}}
function discordCard(){if(!DISCORD_URL)return "";return '<div class="card dcard"><h2>💬 '+tr("La communauté sur Discord","The community on Discord")+'</h2><p class="desc">'+tr("C’est là que tout se passe : trouver une alliance de vrais joueurs, coordonner les pillages, signaler un bug, proposer une idée, suivre les nouveautés.","That’s where it all happens: find an alliance of real players, coordinate raids, report a bug, suggest an idea, follow the news.")+"</p>"+(S&&!S.discordGot?'<p class="up">🎁 '+tr("Première visite : +15 ⚡, un coffre rare et 300 crédits d’alliance.","First visit: +15 ⚡, a rare chest and 300 alliance credits.")+"</p>":"")+'<div class="row"><button class="btn discord" data-act="discord">'+tr("Rejoindre le Discord","Join the Discord")+"</button></div></div>";}
function alPill(){if(!S||S.tut!=null||!alOpen()||!S.ally)return "";const n=(alGiftReady()?1:0)+(alReqs()?1:0);return n?'<span class="rwpill alpill on" data-act="algo">🤝 '+tr("Alliance","Alliance")+" <b>"+n+"</b></span>":"";}

/* l'écran Alliance (onglet Rapports → Alliance) */
function allianceTabHTML(){
  if(!alOpen()){const left=AL_DAY*1440-S.t;return '<div class="card"><h2>🤝 '+tr("Alliances","Alliances")+'</h2><p class="desc">'+tr("Les alliances ouvrent au <b>jour 5</b> : d’ici là, chacun fait ses preuves. Ce jour-là, l’alliance la plus présente autour de vous vous recrutera ; vous pourrez en changer.","Alliances open on <b>day 5</b>: until then, everyone proves themselves. That day, the alliance most present around you will recruit you; you will be able to switch.")+'</p><div class="stat"><span>'+tr("Ouverture dans","Opening in")+'</span><b><span data-end="'+(AL_DAY*1440)+'">'+fmtDur(left)+"</span></b></div></div>"+discordCard()+allyListHTML();}
  if(!S.ally)return discordCard()+allyListHTML();
  alDayReset();const A=alMe(),D=alData(S.ally),L=alLevel(S.ally),bs=allyBots(S.ally),on=bs.filter(b=>botOnline(b,S.t)).length,off=alOfficer();
  let h='<div class="card alhead"><div class="kick">'+tr("Votre alliance","Your alliance")+"</div><h2>"+S.ally+" "+ALLY_INFO[S.ally]+'</h2><div class="alstats"><span>'+tr("Niveau ","Level ")+"<b>"+L+"</b></span><span>"+tr("Membres ","Members ")+"<b>"+(bs.length+1)+"</b></span><span>🟢 <b>"+on+"</b>"+tr(" en ligne"," online")+"</span><span>"+tr("Votre rang ","Your rank ")+"<b>"+(off?tr("Officier","Officer"):tr("Membre","Member"))+"</b></span></div>";
  h+='<div class="stat"><span>'+tr("Votre contribution","Your contribution")+"</span><b>"+fmt(A.pts)+(off?"":" / "+AL_OFFICER+tr(" pour devenir Officier"," to become Officer"))+'</b></div><div class="stat"><span>'+tr("Crédits d’alliance","Alliance credits")+"</span><b>🪙 "+fmt(A.cr)+"</b></div>";
  h+='<div class="row alacts">'+(alGiftReady()?'<button class="btn" data-act="algift">🎁 '+tr("Cadeau du jour","Daily gift")+"</button>":'<button class="btn alt" disabled>🎁 '+tr("Cadeau reçu · revient demain","Gift claimed · back tomorrow")+"</button>")+(alReqs()?'<button class="btn" data-act="alhelp">🤝 '+tr("Aider tout le monde","Help everyone")+" ("+alReqs()+")</button>":'<button class="btn alt" disabled>🤝 '+tr("Personne à aider","Nobody to help")+"</button>")+(S.build&&S.build.help==null?'<button class="btn alt" data-act="alask">🏗 '+tr("Demander de l’aide","Ask for help")+"</button>":S.build&&S.build.help!=null?'<span class="desc">🏗 '+tr("Aides reçues : ","Help received: ")+S.build.help+" / 10</span>":"")+"</div>";
  if(S.alFree&&S.t<S.alFree)h+='<p class="desc">'+tr("Changement d’alliance gratuit encore ","Free alliance switch for another ")+'<span data-end="'+S.alFree+'"></span>.</p>';
  h+="</div>";
  /* technologies */
  h+='<div class="card"><h2>'+tr("Technologies d’alliance","Alliance technologies")+'</h2><p class="desc">'+tr("Chaque don coûte ","Each donation costs ")+Object.entries(alDonCost()).map(([k,v])=>fmt(v)+" "+RES_NAME[k].toLowerCase()).join(tr(" et "," and "))+tr(" et rapporte 40 points (60 sur la technologie recommandée ⭐). Dons aujourd’hui : "," and gives 40 points (60 on the recommended technology ⭐). Donations today: ")+"<b>"+A.don+" / "+AL_DON_MAX+"</b>."+(off?" "+tr("Officier : touchez ☆ pour choisir la recommandation.","Officer: tap ☆ to choose the recommendation."):"")+"</p>";
  AL_BR.forEach(B=>{h+='<div class="albr"><h3>'+B.ic+" "+B.name+"</h3>";B.techs.forEach(t=>{const T=D.tech[t.id],mx=T.l>=AL_MAXL,rec=D.rec===t.id,need=alNeed(T.l);
    h+='<div class="altech'+(rec?" rec":"")+(mx?" max":"")+'"><div class="alth"><b>'+(rec?"⭐ ":off&&!mx?'<button class="alstar" data-act="alrec" data-id="'+t.id+'" aria-label="'+tr("Recommander","Recommend")+'">☆</button> ':"")+t.name+'</b><span class="muted">'+tr("niv. ","lvl ")+T.l+" / "+AL_MAXL+"</span></div>"+'<p class="desc">'+(T.l?alEffText(t,T.l)+(mx?"":" → "+alEffText(t,T.l+1)):tr("Niveau 1 : ","Level 1: ")+alEffText(t,1))+"</p>";
    if(!mx)h+='<div class="lmp"><span class="pb"><i style="width:'+Math.round(T.p/need*100)+'%"></i></span><span>'+fmt(T.p)+" / "+fmt(need)+'</span><button class="btn sm" data-act="aldon" data-id="'+t.id+'" data-need=\''+JSON.stringify(alDonCost())+"'"+(A.don>=AL_DON_MAX?" disabled":"")+">"+tr("Donner","Donate")+"</button></div>";
    h+="</div>";});h+="</div>";});
  h+="</div>";
  /* boutique */
  h+='<div class="card"><h2>'+tr("Boutique d’alliance","Alliance shop")+'</h2><p class="desc">'+tr("Les crédits se gagnent en donnant et en aidant les autres membres.","Credits are earned by donating and by helping other members.")+'</p><div class="alshop">'+AL_SHOP.map(it=>'<button class="btn alt" data-act="albuy" data-id="'+it.id+'"'+(A.cr<it.c?" disabled":"")+"><span>"+it.e+" "+it.t()+"</span><b>🪙 "+fmt(it.c)+"</b></button>").join("")+"</div></div>";
  return h+discordCard()+allyListHTML();
}
function allyListHTML(){
  let h='<div class="card"><h2>'+tr("Les 6 bannières","The 6 banners")+'</h2><p class="desc">'+tr("Une alliance ne vous attaque jamais, vous envoie des renforts quand on vous attaque (alliés à moins de 25 cases), partage sa vision et donne +5 % de production. Ses ennemis, eux, vous prennent pour cible.","An alliance never attacks you, sends reinforcements when you are attacked (allies within 25 tiles), shares its sight and gives +5% production. Its enemies, however, target you.")+"</p>";
  const c=cpos(),open=alOpen(),free=S.alFree&&S.t<S.alFree;
  Object.keys(ALLY_INFO).forEach(t=>{const bs=allyBots(t),near=bs.filter(b=>Math.hypot(b.x-c[0],b.y-c[1])<=25).length,me=S.ally===t;
    h+='<div class="allyrow'+(me?" me":"")+'"><div><b>'+t+" "+ALLY_INFO[t]+'</b><span class="desc">'+tr("Niveau ","Level ")+alLevel(t)+" · "+bs.length+tr(" membres · "," members · ")+near+tr(" près de vous"," near you")+"</span></div>"+(me?'<button class="btn sm danger" data-act="allyleave">'+(free?tr("Changer","Switch"):tr("Quitter","Leave"))+"</button>":'<button class="btn sm alt" data-act="allyjoin" data-tag="'+t+'"'+(S.ally||!open?" disabled":"")+">"+tr("Rejoindre","Join")+"</button>")+"</div>";});
  return h+(S.ally?'<p class="desc" style="margin-top:6px">'+tr("Renforts possibles maintenant : +","Possible reinforcements now: +")+fmt(allyHelp())+tr(" de défense."," defense.")+"</p>":"")+"</div>";
}
