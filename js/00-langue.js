/* Origins 27 · 00-langue.js
   Langue du jeu (français ou anglais) : choisie par ?lang=fr|en, puis le dernier choix du joueur, puis la langue du navigateur.
   Chaque texte du jeu s’écrit tr("en français","in English") : les deux langues restent côte à côte dans le code.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
const LANG=(()=>{
  try{const q=new URLSearchParams(location.search).get("lang");if(q==="fr"||q==="en"){localStorage.setItem("o27-lang",q);return q;}
    const s=localStorage.getItem("o27-lang");if(s==="fr"||s==="en")return s;}catch(e){}
  const n=(navigator.languages&&navigator.languages[0])||navigator.language||"fr";
  return /^fr\b/i.test(n)?"fr":"en";
})();
const EN=LANG==="en";
function tr(fr,en){return EN?en:fr;}
/* Typographie : « 12 % » et « 1,5 » en français, « 12% » et « 1.5 » en anglais */
const PCT=EN?"%":" %";
function dec(s){return EN?String(s):String(s).replace(".",",");}
/* Changer de langue : on sauvegarde, puis on recharge la page (les textes sont calculés au chargement) */
function setLang(l){try{localStorage.setItem("o27-lang",l);}catch(e){}try{if(typeof save==="function")save();}catch(e){}
  try{const u=new URL(location.href);if(u.searchParams.has("lang")){u.searchParams.delete("lang");location.replace(u.toString());return;}}catch(e){}
  location.reload();}
/* Textes fixes de index.html : attributs data-en (texte), data-en-title, data-en-aria */
document.documentElement.lang=LANG;
if(EN){
  document.querySelectorAll("[data-en]").forEach(e=>{e.textContent=e.dataset.en;});
  document.querySelectorAll("[data-en-title]").forEach(e=>{e.title=e.dataset.enTitle;});
  document.querySelectorAll("[data-en-aria]").forEach(e=>{e.setAttribute("aria-label",e.dataset.enAria);});
  document.title="Origins 27 · From bacterium to APEX";
}
