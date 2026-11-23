/* Origins 27 · 28-compte.js
   Comptes et sauvegarde en ligne (Supabase), étape 2 du chemin vers le PvP.
   · Connexion avec Discord, ou par un lien reçu par e-mail.
   · La partie est envoyée en ligne toutes les 2 minutes et quand on quitte l’onglet : on la retrouve sur un autre appareil.
   · Au premier branchement, si une partie existe déjà en ligne, le joueur choisit laquelle garder (jamais d’écrasement silencieux).
   · « Supprimer mon compte » efface tout côté serveur.
   Tant que SUPA_URL et SUPA_KEY sont vides, rien ne s’affiche et rien n’est chargé : le jeu reste 100 % hors ligne.
   La clé à coller ici est la clé PUBLIQUE « anon » (Supabase › Settings › API). Jamais la clé « service_role ».
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const SUPA_URL="";
const SUPA_KEY="";
const SUPA_LIB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
const CLOUD_EVERY=120000;
let SB=null,SBuser=null,SBready=null,cloudLast=0,cloudBusy=false,cloudErr="",cloudAsk=null;

/* Pas dans l’artefact claude.ai (iframe) : la connexion Discord a besoin d’une vraie page. */
function cloudOn(){return !!(SUPA_URL&&SUPA_KEY)&&window.top===window.self&&(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1");}
function cloudInit(){
  if(!cloudOn())return Promise.resolve(null);if(SBready)return SBready;
  SBready=new Promise(ok=>{const s=document.createElement("script");s.src=SUPA_LIB;s.async=true;
    s.onload=()=>{try{SB=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"pkce"}});
      SB.auth.onAuthStateChange((ev,ses)=>{const was=SBuser&&SBuser.id;SBuser=ses&&ses.user||null;if(SBuser&&SBuser.id!==was)setTimeout(()=>cloudOnLogin(),0);if(!SBuser)cloudAsk=null;dirty=true;cloudRefreshUI();});
      SB.auth.getSession().then(r=>{SBuser=r.data&&r.data.session&&r.data.session.user||null;ok(SB);if(SBuser)cloudOnLogin();cloudRefreshUI();},()=>ok(SB));}catch(e){cloudErr=String(e&&e.message||e);ok(null);}};
    s.onerror=()=>{cloudErr=tr("Service de comptes injoignable","Account service unreachable");ok(null);};document.head.appendChild(s);});
  return SBready;
}
function cloudName(){if(!SBuser)return "";const m=SBuser.user_metadata||{};return m.custom_claims&&m.custom_claims.global_name||m.full_name||m.name||m.user_name||tr("Joueur","Player");}
function cloudProvider(){return SBuser&&SBuser.app_metadata&&SBuser.app_metadata.provider||"";}
function cleanPseudo(s){return String(s||"").replace(/[<>"&]/g,"").trim().slice(0,24);}

/* ----- connexion ----- */
async function cloudDiscord(){const sb=await cloudInit();if(!sb)return toast(cloudErr||tr("Comptes indisponibles","Accounts unavailable"));
  const {error}=await sb.auth.signInWithOAuth({provider:"discord",options:{redirectTo:location.origin+location.pathname,scopes:"identify"}});if(error)toast("❌ "+error.message);}
async function cloudEmail(){const el=document.getElementById("cloudmail"),em=el&&el.value.trim();if(!em||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))return toast(tr("Adresse e-mail invalide","Invalid email address"));
  const sb=await cloudInit();if(!sb)return toast(cloudErr||tr("Comptes indisponibles","Accounts unavailable"));
  const {error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.origin+location.pathname}});
  if(error)toast("❌ "+error.message);else{toast(tr("📧 Lien envoyé : ouvrez-le sur cet appareil","📧 Link sent: open it on this device"));if(el)el.value="";}}
async function cloudLogout(){if(!SB)return;await cloudPush(true);await SB.auth.signOut();SBuser=null;toast(tr("Déconnecté","Signed out"));cloudRefreshUI();}

/* ----- sauvegarde ----- */
function clientVersion(){const s=document.querySelector('script[src*="28-compte"]');const m=s&&s.src.match(/[?&](?:v|x)=(\w+)/);return m?m[1]:"";}
async function cloudPush(force){
  if(!SB||!SBuser||!S||cloudBusy||cloudAsk)return false;if(S.cloudUser&&S.cloudUser!==SBuser.id)return false;
  if(!force&&Date.now()-cloudLast<CLOUD_EVERY)return false;cloudBusy=true;
  try{S.cloudUser=SBuser.id;const code=await saveCode();if(!code)return false;
    const {error}=await SB.from("saves").upsert({user_id:SBuser.id,data:code,game_day:+(S.t/1440).toFixed(3),real_at:Date.now(),client_version:clientVersion(),updated_at:new Date().toISOString()});
    if(error){cloudErr=error.message;return false;}cloudErr="";cloudLast=Date.now();return true;}
  catch(e){cloudErr=String(e&&e.message||e);return false;}finally{cloudBusy=false;cloudRefreshUI();}
}
async function cloudOnLogin(){
  if(!SB||!SBuser)return;
  /* pseudo public : celui de Discord, ou « Joueur-xxxx » ; jamais l’e-mail */
  try{const {data:p}=await SB.from("profiles").select("pseudo").eq("id",SBuser.id).maybeSingle();
    if(!p){const ps=cleanPseudo(cloudProvider()==="discord"?cloudName():"")||(tr("Joueur-","Player-")+SBuser.id.slice(0,4));await SB.from("profiles").insert({id:SBuser.id,pseudo:ps.length<2?ps+"__":ps});}}catch(e){}
  let row=null;try{const r=await SB.from("saves").select("data,game_day,real_at,updated_at").eq("user_id",SBuser.id).maybeSingle();row=r.data;}catch(e){}
  if(!row){if(S){S.cloudUser=SBuser.id;await cloudPush(true);toast(tr("☁ Partie sauvegardée en ligne","☁ Game saved online"));}return;}
  const localOk=S&&S.cloudUser===SBuser.id;
  if(localOk&&(S.realAt||0)>=(row.real_at||0)-5000){await cloudPush(true);return;}/* cet appareil est à jour : on envoie */
  if(!S){await saveImport(row.data);return;}
  cloudAsk=row;showModal(cloudAskHTML(row));
}
function cloudAskHTML(row){const loc=S?Math.floor(S.t/1440)+1:0,on=Math.floor(row.game_day||0)+1,when=row.real_at?new Date(row.real_at).toLocaleString(EN?"en-GB":"fr-FR",{dateStyle:"short",timeStyle:"short"}):"";
  return '<div class="kick">☁ '+tr("Sauvegarde en ligne","Online save")+"</div><h2>"+tr("Deux parties trouvées","Two games found")+"</h2><p>"+tr("Votre compte contient déjà une partie. Laquelle voulez-vous garder ? L’autre sera remplacée.","Your account already holds a game. Which one do you want to keep? The other will be replaced.")+'</p><div class="cloudpick"><button class="btn" data-act="cloudkeep" data-k="online">'+tr("☁ La partie en ligne","☁ The online game")+"<small>"+tr("jour ","day ")+on+(when?" · "+when:"")+'</small></button><button class="btn alt" data-act="cloudkeep" data-k="local">'+tr("💻 Celle de cet appareil","💻 The one on this device")+"<small>"+tr("jour ","day ")+loc+"</small></button></div>";}
async function cloudKeep(k){const row=cloudAsk;cloudAsk=null;closeModal();if(!row)return;
  if(k==="online"){await saveImport(row.data);}else{S.cloudUser=SBuser.id;await cloudPush(true);toast(tr("☁ Cette partie est maintenant en ligne","☁ This game is now online"));}}
async function cloudDelete(el){
  if(Date.now()>(cloudDelete.arm||0)){cloudDelete.arm=Date.now()+5000;el.textContent=tr("Confirmer : tout effacer en ligne","Confirm: erase everything online");return;}
  cloudDelete.arm=0;if(!SB||!SBuser)return;const {error}=await SB.rpc("delete_me");if(error){toast("❌ "+error.message);return;}
  if(S)delete S.cloudUser;await SB.auth.signOut();SBuser=null;toast(tr("Compte supprimé. Votre partie reste sur cet appareil.","Account deleted. Your game stays on this device."));cloudRefreshUI();}

/* ----- interface (fenêtre ⚙ Options) ----- */
function cloudOptHTML(){
  if(!cloudOn())return "";cloudInit();
  return '<h3>☁ '+tr("Compte et sauvegarde en ligne","Account and online save")+'</h3><div id="cloudbox">'+cloudBoxHTML()+"</div>";}
function cloudBoxHTML(){
  if(!SB&&!cloudErr)return '<p class="desc">'+tr("Chargement…","Loading…")+"</p>";
  if(!SB)return '<p class="desc neg">'+esc(cloudErr)+"</p>";
  if(!SBuser)return '<p class="desc">'+tr("Retrouvez votre partie sur tous vos appareils. Bientôt : le classement et le PvP entre vrais joueurs.","Find your game on all your devices. Coming soon: the ranking and PvP between real players.")+'</p><div class="row"><button class="btn discord" data-act="clouddiscord">'+tr("Se connecter avec Discord","Sign in with Discord")+'</button></div><div class="row cloudmail"><input type="email" id="cloudmail" autocomplete="email" placeholder="'+tr("ou votre e-mail","or your email")+'" aria-label="E-mail"><button class="btn sm alt" data-act="cloudemail">'+tr("Recevoir un lien","Get a link")+"</button></div>";
  const ago=cloudLast?Math.max(0,Math.round((Date.now()-cloudLast)/60000)):null;
  return '<p class="desc">'+tr("Connecté : ","Signed in: ")+"<b>"+esc(cloudProvider()==="discord"?cloudName():tr("compte e-mail","email account"))+"</b>"+(cloudProvider()==="discord"?" (Discord)":"")+"<br>"+(cloudErr?'<span class="neg">'+esc(cloudErr)+"</span>":ago==null?tr("Pas encore synchronisé.","Not synced yet."):tr("Dernière sauvegarde en ligne : il y a "+ago+" min","Last online save: "+ago+" min ago"))+'</p><div class="row"><button class="btn sm" data-act="cloudsync">'+tr("Sauvegarder maintenant","Save now")+'</button><button class="btn sm alt" data-act="cloudout">'+tr("Se déconnecter","Sign out")+'</button><button class="btn sm alt" data-act="clouddel">'+tr("Supprimer mon compte","Delete my account")+"</button></div>";}
function cloudRefreshUI(){const b=document.getElementById("cloudbox");if(b)b.innerHTML=cloudBoxHTML();}

function cloudAct(a,el){
  if(a==="cloudkeep"){cloudKeep(el.dataset.k);return true;}
  if(!cloudOn())return false;
  if(a==="cloudopen"){showModal(optHTML());return true;}
  if(a==="cloudsync"){cloudPush(true).then(ok=>toast(ok?tr("☁ Sauvegardé en ligne","☁ Saved online"):tr("Échec de la sauvegarde en ligne","Online save failed")));return true;}
  if(a==="cloudout"){cloudLogout();return true;}
  if(a==="clouddel"){cloudDelete(el);return true;}
  if(a==="cloudemail"){cloudEmail();return true;}
  if(a==="clouddiscord"){cloudDiscord();return true;}
  return false;
}
/* sauvegarde automatique : toutes les 2 min et quand l’onglet passe en arrière-plan */
if(cloudOn())window.addEventListener("load",()=>setTimeout(()=>{
  cloudInit();
  setInterval(()=>{if(SBuser&&S&&!document.hidden)cloudPush(false);},30000);
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&SBuser&&S)cloudPush(true);});
},400));
