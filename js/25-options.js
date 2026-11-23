/* Origins 27 · 25-options.js
   Options (⚙) : son et musique (tout est synthétisé, aucun fichier audio), effets visuels (gains qui s’envolent, secousse,
   chantier qui « pop »), notifications facultatives, export et import de la sauvegarde, application installable (PWA),
   et un petit journal des erreurs, joint à la fenêtre « Mon avis » pour aider à corriger les bugs.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const OPT_KEY="o27-opt";
let OPT={snd:1,mus:0.35,sfx:0.6,notif:0,fx:1};
try{Object.assign(OPT,JSON.parse(localStorage.getItem(OPT_KEY)||"{}"));}catch(e){}
function optSave(){try{localStorage.setItem(OPT_KEY,JSON.stringify(OPT));}catch(e){}}

/* ---------- son ---------- */
let AC=null,acMaster=null,acSfx=null,acMus=null,musOn=false,musTimer=null;
function acInit(){if(AC)return AC;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C();acMaster=AC.createGain();acMaster.connect(AC.destination);acSfx=AC.createGain();acSfx.connect(acMaster);acMus=AC.createGain();acMus.connect(acMaster);sndVol();}catch(e){AC=null;}return AC;}
function sndVol(){if(!AC)return;acMaster.gain.value=OPT.snd?1:0;acSfx.gain.value=OPT.sfx;acMus.gain.value=OPT.mus*0.5;}
function tone(f,t0,d,o){o=o||{};const g=AC.createGain(),os=AC.createOscillator();os.type=o.type||"sine";os.frequency.setValueAtTime(f,t0);if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t0+d);
  const v=o.v||0.2;g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(v,t0+Math.min(0.02,d/4));g.gain.exponentialRampToValueAtTime(0.0001,t0+d);os.connect(g);g.connect(o.dest||acSfx);os.start(t0);os.stop(t0+d+0.05);}
let sfxLast={};
function sfx(n){if(!OPT.snd||!OPT.sfx||catchUp||document.hidden)return;if(!acInit())return;if(AC.state==="suspended")AC.resume();const now=performance.now();if(now-(sfxLast[n]||0)<(n==="click"?40:160))return;sfxLast[n]=now;const t=AC.currentTime+0.01;
  switch(n){
    case "click":tone(1400,t,0.04,{type:"triangle",v:0.05});break;
    case "good":tone(660,t,0.18,{v:0.12});tone(990,t+0.07,0.25,{v:0.1});break;
    case "bad":tone(160,t,0.35,{type:"triangle",to:90,v:0.25});break;
    case "coin":tone(1320,t,0.08,{type:"square",v:0.05});tone(1760,t+0.06,0.14,{type:"square",v:0.05});break;
    case "build":[523,659,784,1047].forEach((f,i)=>tone(f,t+i*0.07,0.22,{type:"triangle",v:0.12}));break;
    case "chest":for(let i=0;i<7;i++)tone(900+Math.random()*1400,t+i*0.05,0.25,{v:0.06});tone(392,t,0.6,{type:"triangle",v:0.1});break;
    case "alarm":tone(520,t,0.18,{type:"sawtooth",v:0.08});tone(390,t+0.22,0.22,{type:"sawtooth",v:0.08});break;
    case "win":[392,523,659,784].forEach((f,i)=>tone(f,t+i*0.09,0.3,{type:"triangle",v:0.12}));break;
    case "lose":[392,330,262].forEach((f,i)=>tone(f,t+i*0.14,0.35,{type:"triangle",v:0.12}));break;
    case "bubble":tone(300+Math.random()*500,t,0.12,{to:900+Math.random()*600,v:0.06});break;
  }}
/* musique d’ambiance des abysses : nappe grave qui respire + gouttes pentatoniques au hasard */
function musStart(){if(musOn||!OPT.snd||!OPT.mus||!acInit())return;musOn=true;const t=AC.currentTime;
  const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=520;lp.connect(acMus);
  [55,82.4,110.3].forEach((f,i)=>{const o=AC.createOscillator(),g=AC.createGain(),l=AC.createOscillator(),lg=AC.createGain();o.type=i===1?"triangle":"sine";o.frequency.value=f;o.detune.value=(i-1)*6;
    g.gain.value=0.0001;g.gain.exponentialRampToValueAtTime(0.09,t+4);l.frequency.value=0.05+i*0.03;lg.gain.value=0.05;l.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(lp);o.start();l.start();});
  const scale=[220,247,294,330,370,440,494,587];
  const drop=()=>{if(!musOn)return;if(!document.hidden&&OPT.mus){const t2=AC.currentTime,f=scale[Math.floor(Math.random()*scale.length)];tone(f,t2,2.2,{v:0.05,dest:acMus});if(Math.random()<0.4)tone(f*1.5,t2+0.35,1.8,{v:0.03,dest:acMus});}musTimer=setTimeout(drop,2200+Math.random()*4200);};drop();}
function musStop(){if(!musOn)return;musOn=false;clearTimeout(musTimer);try{AC.close();}catch(e){}AC=null;}
/* le navigateur n’autorise le son qu’après un geste du joueur */
document.addEventListener("pointerdown",()=>{if(OPT.snd&&S){acInit();if(AC&&AC.state==="suspended")AC.resume();if(OPT.mus)musStart();}},{passive:true});
document.addEventListener("click",e=>{const el=e.target.closest&&e.target.closest("[data-act]");if(el&&!el.disabled)sfx("click");},true);
/* journal → sons : chaque fichier continue d’appeler log() comme avant */
{const _log=log;log=function(msg,cls){_log(msg,cls);if(cls==="good")sfx("good");else if(cls==="bad")sfx("bad");else if(cls==="rare")sfx("coin");};}
{const _fx=chestFX;chestFX=function(T,items){sfx("chest");return _fx(T,items);};}

/* ---------- effets visuels et notifications : on observe l’état toutes les 250 ms ---------- */
let watch=null;
function fxFloat(k,v){const el=document.getElementById("rb-"+k);if(!el||!OPT.fx)return;const r=el.getBoundingClientRect(),d=document.createElement("div");d.className="fxgain c-"+k;d.textContent="+"+fmt(v);d.style.left=(r.left+r.width/2)+"px";d.style.top=(r.top+r.height*0.6)+"px";document.body.appendChild(d);setTimeout(()=>d.remove(),1300);el.classList.remove("fxpulse");void el.offsetWidth;el.classList.add("fxpulse");}
function fxShake(){if(!OPT.fx)return;document.body.classList.remove("fxshake");void document.body.offsetWidth;document.body.classList.add("fxshake");setTimeout(()=>document.body.classList.remove("fxshake"),500);}
function fxPop(){if(!OPT.fx)return;const v=document.querySelector("#viewarea svg:not(.uilayer)");if(v){v.classList.remove("fxpop");void v.getBoundingClientRect();v.classList.add("fxpop");}
  const c=document.getElementById("viewarea");if(!c)return;const r=c.getBoundingClientRect();for(let i=0;i<14;i++){const p=document.createElement("i");p.className="fxspark";const a=Math.random()*6.283,d=60+Math.random()*90;p.style.left=(r.left+r.width/2)+"px";p.style.top=(r.top+r.height/2)+"px";p.style.setProperty("--dx",Math.cos(a)*d+"px");p.style.setProperty("--dy",Math.sin(a)*d+"px");document.body.appendChild(p);setTimeout(()=>p.remove(),900);}}
function notify(title,body){if(!OPT.notif||!document.hidden||typeof Notification==="undefined"||Notification.permission!=="granted")return;
  try{if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body,icon:"icon-192.png",tag:title}));else new Notification(title,{body,icon:"icon-192.png",tag:title});}catch(e){}}
setInterval(()=>{if(!S||catchUp){watch=null;return;}
  const w={res:Object.assign({},S.res),b:S.build?S.build.label||S.build.type:null,bEnd:S.build&&S.build.end,inc:(S.inc||[]).length,rep:S.reports[0]&&S.reports[0].id,q:S.queue.length,seed:S.seed};
  if(watch&&watch.seed===w.seed){
    const cap=rates().cap;RES.forEach(k=>{const d=w.res[k]-watch.res[k];if(d>=Math.max(12,cap*0.015))fxFloat(k,d);});
    if(watch.b&&!w.b&&watch.bEnd&&S.t>=watch.bEnd-0.5){sfx("build");if(tab==="cell")setTimeout(fxPop,60);notify(tr("Construction terminée","Construction complete"),String(watch.b).replace(/<[^>]+>/g,""));}
    if(w.inc>watch.inc){sfx("alarm");fxShake();notify(tr("⚠️ Attaque entrante !","⚠️ Incoming attack!"),tr("Un rival arrive sur votre cellule : défendez ou esquivez.","A rival is heading for your cell: defend or dodge."));}
    if(w.rep!==watch.rep&&S.reports[0]&&S.reports[0].cat==="combat"&&S.reports[0].win!=null)sfx(S.reports[0].win?"win":"lose");
    if(watch.q>0&&w.q===0)notify(tr("Production terminée","Production complete"),tr("Vos troupes sont prêtes.","Your troops are ready."));
  }
  watch=w;},250);

/* ---------- sauvegarde : exporter / importer ---------- */
async function gzB64(str){const cs=new CompressionStream("gzip"),w=new Blob([str]).stream().pipeThrough(cs),buf=new Uint8Array(await new Response(w).arrayBuffer());let s="";for(let i=0;i<buf.length;i+=32768)s+=String.fromCharCode.apply(null,buf.subarray(i,i+32768));return btoa(s);}
async function b64Gz(b){const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const ds=new DecompressionStream("gzip");return await new Response(new Blob([u]).stream().pipeThrough(ds)).text();}
async function saveCode(){save();const raw=localStorage.getItem(SAVE_KEY)||"";try{if(typeof CompressionStream!=="undefined")return "O27Z:"+await gzB64(raw);return "O27:"+btoa(unescape(encodeURIComponent(raw)));}catch(e){return "";}}
async function saveExportFile(){const code=await saveCode();if(!code)return;const b=new Blob([code],{type:"text/plain"}),a=document.createElement("a"),d=new Date();a.href=URL.createObjectURL(b);a.download="origins27-"+d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+"-jour"+Math.floor(S.t/1440+1)+".o27";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast(tr("💾 Sauvegarde téléchargée","💾 Save downloaded"));}
async function saveCopy(){const code=await saveCode();if(!code)return;const ok=()=>toast(tr("📋 Code de sauvegarde copié","📋 Save code copied"));if(navigator.clipboard)navigator.clipboard.writeText(code).then(ok,()=>{const t=document.getElementById("svcode");if(t){t.value=code;t.select();}});else{const t=document.getElementById("svcode");if(t){t.value=code;t.select();}}}
async function saveImport(code){code=String(code||"").trim().replace(/s+/g,"");let raw;try{raw=/^O27Z:/.test(code)?await b64Gz(code.slice(5)):decodeURIComponent(escape(atob(code.replace(/^O27:/,""))));const d=JSON.parse(raw);if(!d||d.v!==6||!d.fields)throw 0;}catch(e){toast(tr("❌ Code de sauvegarde invalide","❌ Invalid save code"));return false;}
  try{localStorage.setItem(SAVE_KEY,raw);}catch(e){toast(tr("❌ Impossible d’enregistrer","❌ Could not store"));return false;}S=null;toast(tr("✔ Partie importée","✔ Game imported"));setTimeout(()=>location.reload(),300);return true;}
document.addEventListener("change",e=>{if(e.target&&e.target.id==="svfile"){const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>saveImport(r.result);r.readAsText(f);}});

/* ---------- journal des erreurs (gardé sur l’appareil, joint à « Mon avis ») ---------- */
function errPush(m){try{const L=JSON.parse(localStorage.getItem("o27-errs")||"[]");L.push({t:Date.now(),m:String(m).slice(0,300),d:S?+(S.t/1440).toFixed(2):null});localStorage.setItem("o27-errs",JSON.stringify(L.slice(-8)));}catch(e){}}
window.addEventListener("error",e=>errPush((e.message||"")+" @ "+String(e.filename||"").split("/").pop()+":"+e.lineno));
window.addEventListener("unhandledrejection",e=>errPush("promise: "+((e.reason&&e.reason.message)||e.reason)));
function errText(){try{const L=JSON.parse(localStorage.getItem("o27-errs")||"[]");return L.length?L.map(x=>new Date(x.t).toISOString().slice(0,16)+" j"+x.d+" "+x.m).join("\n"):"";}catch(e){return "";}}

/* ---------- application installable ---------- */
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")&&window.top===window.self){try{navigator.serviceWorker.register("sw.js").catch(()=>{});}catch(e){}}
let installEvt=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;});

/* ---------- la fenêtre ⚙ Options ---------- */
function optHTML(){
  const pix=document.body.classList.contains("pixel"),tg=(k,on,l)=>'<button class="btn sm'+(on?"":" alt")+'" data-act="opt" data-k="'+k+'" aria-pressed="'+!!on+'">'+l+"</button>";
  let h='<div class="kick">⚙ Options</div><h2>'+tr("Réglages","Settings")+'</h2><div class="optgrid">';
  h+='<div class="optrow"><span>🔊 '+tr("Son","Sound")+"</span>"+tg("snd",OPT.snd,OPT.snd?tr("Activé","On"):tr("Coupé","Off"))+"</div>";
  h+='<div class="optrow"><span>🎵 '+tr("Musique","Music")+'</span><input type="range" min="0" max="1" step="0.05" value="'+OPT.mus+'" data-opt="mus" aria-label="'+tr("Volume de la musique","Music volume")+'"></div>';
  h+='<div class="optrow"><span>✨ '+tr("Effets sonores","Sound effects")+'</span><input type="range" min="0" max="1" step="0.05" value="'+OPT.sfx+'" data-opt="sfx" aria-label="'+tr("Volume des effets","Effects volume")+'"></div>';
  h+='<div class="optrow"><span>💥 '+tr("Effets visuels","Visual effects")+"</span>"+tg("fx",OPT.fx,OPT.fx?tr("Activés","On"):tr("Réduits","Reduced"))+"</div>";
  h+='<div class="optrow"><span>🔔 '+tr("Notifications","Notifications")+'<small class="desc">'+tr("Chantier fini, attaque, troupes prêtes : quand le jeu est ouvert en arrière-plan.","Construction done, attack, troops ready: while the game is open in the background.")+"</small></span>"+(typeof Notification==="undefined"?'<span class="muted">'+tr("indisponible","unavailable")+"</span>":tg("notif",OPT.notif&&Notification.permission==="granted",OPT.notif&&Notification.permission==="granted"?tr("Activées","On"):tr("Désactivées","Off")))+"</div>";
  h+='<div class="optrow"><span>📓 '+tr("Thème","Theme")+"</span>"+'<button class="btn sm alt" data-act="theme">'+(getTheme()==="lab"?tr("Carnet de laboratoire → Abysses","Lab notebook → Abyss"):tr("Abysses → Carnet de laboratoire","Abyss → Lab notebook"))+"</button></div>";
  h+='<div class="optrow"><span>▦ '+tr("Style graphique","Art style")+"</span>"+'<button class="btn sm alt" data-act="style">'+(pix?tr("Pixel art → lisse","Pixel art → smooth"):tr("Lisse → pixel art","Smooth → pixel art"))+"</button></div>";
  h+=typeof seasonOptHTML==="function"?seasonOptHTML():"";
  if(installEvt)h+='<div class="optrow"><span>📲 '+tr("Installer le jeu","Install the game")+'<small class="desc">'+tr("Une icône sur l’écran d’accueil, comme une application.","An icon on your home screen, like an app.")+'</small></span><button class="btn sm" data-act="install">'+tr("Installer","Install")+"</button></div>";
  h+="</div>";
  h+=typeof cloudOptHTML==="function"?cloudOptHTML():"";
  if(S)h+='<h3>💾 '+tr("Sauvegarde","Save")+'</h3><p class="desc">'+tr("La partie est gardée dans ce navigateur. Exportez-la pour la mettre à l’abri ou la continuer sur un autre appareil.","The game is kept in this browser. Export it to keep it safe or to continue on another device.")+'</p><div class="row"><button class="btn sm" data-act="savex">'+tr("Télécharger un fichier","Download a file")+'</button><button class="btn sm alt" data-act="savec">'+tr("Copier le code","Copy the code")+"</button></div>";
  h+='<h3>📥 '+tr("Importer une partie","Import a game")+'</h3><p class="desc">'+tr("Attention : remplace la partie en cours de ce navigateur.","Careful: replaces the current game in this browser.")+'</p><div class="row"><label class="btn sm alt filebtn">'+tr("Choisir un fichier .o27","Choose a .o27 file")+'<input type="file" id="svfile" accept=".o27,.txt" hidden></label></div><textarea id="svcode" rows="2" placeholder="O27:…" aria-label="'+tr("Code de sauvegarde","Save code")+'"></textarea><div class="row"><button class="btn sm alt" data-act="savei">'+tr("Importer le code","Import the code")+"</button></div>";
  h+='<p class="desc optlinks"><a href="confidentialite.html'+(EN?"?lang=en":"")+'" target="_blank" rel="noopener">'+tr("Confidentialité et crédits","Privacy and credits")+"</a>"+(typeof DISCORD_URL!=="undefined"&&DISCORD_URL?' · <a href="#" data-act="discord">Discord</a>':"")+"</p>";
  return h+'<div class="row" style="justify-content:center;margin-top:10px"><button class="btn alt" data-act="mclose">'+tr("Fermer","Close")+"</button></div>";}
function optAct(k){if(k==="snd"){OPT.snd=OPT.snd?0:1;if(!OPT.snd)musStop();else{acInit();if(OPT.mus)musStart();}}
  else if(k==="fx")OPT.fx=OPT.fx?0:1;
  else if(k==="notif"){if(OPT.notif&&Notification.permission==="granted")OPT.notif=0;else{Notification.requestPermission().then(p=>{OPT.notif=p==="granted"?1:0;optSave();showModal(optHTML());});return;}}
  optSave();sndVol();showModal(optHTML());}
document.addEventListener("input",e=>{const k=e.target&&e.target.dataset&&e.target.dataset.opt;if(!k)return;OPT[k]=+e.target.value;optSave();if(k==="mus"){if(OPT.mus&&OPT.snd)musStart();}sndVol();if(k==="sfx")sfx("good");});
