/* Origins 27 · 01-monde.js
   Le monde : disque de 241 × 241 cases, zones de profondeur, terre ferme au centre.
   Chargé dans l’ordre par index.html ; tous les fichiers partagent les mêmes variables globales. */
"use strict";
/* Monde : un disque de rayon RW. Taille prévue pour ~500 joueurs au départ ; on agrandit RW pour 2 000. */
const W=241,H=241,C0=120,RW=120,LAND_R=26;
const ZB={shallow:LAND_R+0.13*(RW-LAND_R),mid:LAND_R+0.30*(RW-LAND_R),deep:LAND_R+0.57*(RW-LAND_R)};
const AREA_F=(RW*RW-LAND_R*LAND_R)/(50*50-4*4);
function cen(x,y){return (RW-rC(x,y))/(RW-LAND_R)*46;}
let pendingStart=null;
function rC(x,y){return Math.hypot(x-C0,y-C0);}
function inWorld(x,y){return rC(x,y)<=RW;}
function isLand(x,y){return rC(x,y)<=LAND_R;}
function zoneOf(x,y){const r=rC(x,y);return r>RW?"void":r>ZB.deep?"abyss":r>ZB.mid?"deep":r>ZB.shallow?"mid":r>LAND_R?"shallow":"land";}
const ZONE_NAME={abyss:"Abysses",deep:"Eaux profondes",mid:"Eaux moyennes",shallow:"Hauts-fonds",land:"Terre ferme",void:"Roche"};
