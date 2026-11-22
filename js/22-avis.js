/* Origins 27 · 22-avis.js
   Avis des joueurs (fenêtre « Mon avis », envoi sur GitHub ou copie du texte) et compteur de visites anonyme (GoatCounter).
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Où arrivent les avis : une « Issue » du dépôt GitHub (un compte GitHub gratuit est demandé au joueur). */
const FEEDBACK_REPO="https://github.com/ShakeItOut-teach/origins-27";
/* Compteur de visites : coller ici l’adresse de votre compte GoatCounter, par exemple "https://origins27.goatcounter.com/count".
   Vide = aucun comptage. Il ne compte que sur le site en ligne (pas en local, pas dans l’artefact). */
const STATS_URL="";

const FB_KEY="o27-avis";
const FB_Q=[
  {k:"aime",t:tr("Qu’as-tu aimé ?","What did you like?"),ph:tr("Un moment, une mécanique, l’ambiance…","A moment, a mechanic, the atmosphere…")},
  {k:"bloque",t:tr("Où as-tu bloqué, hésité ou décroché ?","Where did you get stuck, hesitate or lose interest?"),ph:tr("Ce qui n’était pas clair, trop long, frustrant…","What was unclear, too long, frustrating…")},
  {k:"idee",t:tr("Une idée, un bug ? (facultatif)","An idea, a bug? (optional)"),ph:tr("Ce que tu ajouterais, ce qui ne marche pas…","What you would add, what doesn’t work…")}
];
function fbDraft(){try{return JSON.parse(localStorage.getItem(FB_KEY))||{};}catch(e){return {};}}
function fbStore(d){try{localStorage.setItem(FB_KEY,JSON.stringify(d));}catch(e){}}
function fbContext(){
  const dev=(isMobile()?"mobile":tr("ordinateur","computer"))+", "+window.innerWidth+"×"+window.innerHeight+" · "+LANG.toUpperCase();
  if(!S)return tr("Pas de partie en cours · ","No game in progress · ")+dev;
  const so=SOUCHES[S.souche];
  return fmtClock(S.t)+" · "+(S.won?tr("APEX atteint","APEX reached"):tr("stade ","stage ")+S.stage+"/5 ("+STAGE_NAME[S.stage]+")")+tr(" · souche "," · strain ")+(so?so.name:S.souche)+" · "+dev;
}
function fbText(d){
  let t=tr("Note : ","Rating: ")+(d.note?"★".repeat(d.note)+"☆".repeat(5-d.note)+" ("+d.note+"/5)":tr("non donnée","not given"))+"\n";
  FB_Q.forEach(q=>{t+="\n### "+q.t+"\n"+((d[q.k]||"").trim()||"—")+"\n";});
  return t+"\n---\n"+tr("Partie : ","Game: ")+fbContext()+"\n";
}
function showFeedback(){
  hideTip();
  if($("fbk"))return;
  const d=fbDraft(),el=document.createElement("div");el.id="fbk";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-labelledby","fbk-h");
  let h='<div class="fbk-box"><button class="fbk-x" data-fb="close" aria-label="'+tr("Fermer","Close")+'">✕</button><div class="kick">'+tr("Merci de tester Origins 27","Thanks for testing Origins 27")+'</div><h2 id="fbk-h">'+tr("Ton avis","Your feedback")+"</h2>";
  h+='<p class="desc">'+tr("Trois questions, deux minutes. Chaque réponse aide à améliorer le jeu.","Three questions, two minutes. Every answer helps improve the game.")+"</p>";
  h+='<div class="fbk-q"><span>'+tr("Ta note","Your rating")+'</span><div class="fbk-stars" role="radiogroup" aria-label="'+tr("Note sur 5","Rating out of 5")+'">'+[1,2,3,4,5].map(n=>'<button type="button" role="radio" data-fb="note" data-n="'+n+'" aria-label="'+n+tr(" sur 5"," out of 5")+'">★</button>').join("")+"</div></div>";
  FB_Q.forEach(q=>{h+='<label class="fbk-q"><span>'+q.t+'</span><textarea rows="3" data-k="'+q.k+'" placeholder="'+q.ph+'"></textarea></label>';});
  h+='<p class="desc fbk-ctx">'+tr("Ajouté automatiquement : ","Added automatically: ")+esc(fbContext())+"</p>";
  h+='<div class="row fbk-row"><button class="btn" data-fb="github">'+tr("Envoyer sur GitHub","Send on GitHub")+'</button><button class="btn alt" data-fb="copy">'+tr("Copier le texte","Copy the text")+"</button></div>";
  h+='<p class="desc fbk-help">'+tr("« Envoyer sur GitHub » ouvre une page déjà remplie : il suffit de cliquer sur <b>Create</b> (un compte GitHub gratuit est demandé). Sans compte, copie le texte et envoie-le à la personne qui t’a fait découvrir le jeu.","“Send on GitHub” opens a pre-filled page: just click <b>Create</b> (a free GitHub account is required). Without an account, copy the text and send it to the person who showed you the game.")+"</p></div>";
  el.innerHTML=h;document.body.appendChild(el);
  const stars=()=>el.querySelectorAll(".fbk-stars button").forEach(b=>{const on=+b.dataset.n<=(d.note||0);b.classList.toggle("on",on);b.setAttribute("aria-checked",+b.dataset.n===d.note?"true":"false");});
  stars();
  el.querySelectorAll("textarea").forEach(ta=>{ta.value=d[ta.dataset.k]||"";ta.addEventListener("input",()=>{d[ta.dataset.k]=ta.value;fbStore(d);});});
  const close=()=>{document.removeEventListener("keydown",key);el.remove();};
  const key=e=>{if(e.key==="Escape"){e.stopPropagation();close();}};
  document.addEventListener("keydown",key);
  el.addEventListener("click",e=>{
    if(e.target===el){close();return;}
    const b=e.target.closest("[data-fb]");if(!b)return;
    const w=b.dataset.fb;
    if(w==="close"){close();return;}
    if(w==="note"){d.note=+b.dataset.n;fbStore(d);stars();return;}
    const empty=!d.note&&!FB_Q.some(q=>(d[q.k]||"").trim());
    if(empty){toast(tr("Écris au moins une réponse ou donne une note.","Write at least one answer or give a rating."));return;}
    const txt=fbText(d);
    if(w==="github"){
      const title=tr("Avis","Feedback")+(d.note?" "+d.note+"/5":"")+" · "+((d.aime||d.bloque||d.idee||"").trim().split("\n")[0].slice(0,60)||"Origins 27");
      window.open(FEEDBACK_REPO+"/issues/new?labels=avis&title="+encodeURIComponent(title)+"&body="+encodeURIComponent(txt),"_blank","noopener");
      fbSent(d);toast(tr("Merci ! Termine l’envoi sur la page GitHub qui vient de s’ouvrir.","Thanks! Finish sending on the GitHub page that just opened."));close();return;}
    if(w==="copy"){
      const ok=()=>{fbSent(d);toast(tr("Texte copié : colle-le dans un message. Merci !","Text copied: paste it into a message. Thanks!"));close();};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,()=>fbCopyFallback(txt,ok));else fbCopyFallback(txt,ok);
    }
  });
  const first=el.querySelector("textarea");if(first&&!isMobile())first.focus();
}
function fbCopyFallback(txt,ok){const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;opacity:0";document.body.appendChild(ta);ta.select();let done=false;try{done=document.execCommand("copy");}catch(e){}ta.remove();if(done)ok();else toast(tr("Copie impossible ici : sélectionne le texte à la main.","Copying isn’t possible here: select the text by hand."));}
function fbSent(d){FB_Q.forEach(q=>delete d[q.k]);d.note=0;d.sent=Date.now();fbStore(d);}

/* Un seul rappel discret, au jour 2 d’une partie, si le joueur n’a encore rien envoyé */
setInterval(()=>{if(!S||S.t<1440)return;const d=fbDraft();if(d.sent||d.asked)return;d.asked=1;fbStore(d);toast(window.innerWidth<=480?tr("Un avis sur le jeu ? Touchez « ? » en haut, puis « Donner mon avis » ✉","Thoughts on the game? Tap “?” at the top, then “Give feedback” ✉"):tr("Un avis sur le jeu ? Bouton « Mon avis » en haut de l’écran ✉","Thoughts on the game? “Feedback” button at the top of the screen ✉"));},30000);

/* Compteur de visites anonyme : sans cookie, rien à accepter */
if(STATS_URL&&/\.github\.io$/.test(location.hostname)){const s=document.createElement("script");s.async=true;s.src="https://gc.zgo.at/count.js";s.dataset.goatcounter=STATS_URL;document.head.appendChild(s);}
