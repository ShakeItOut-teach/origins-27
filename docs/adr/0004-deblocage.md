# ADR 0004 — Déblocage par accomplissement, avec date minimale

Date : 2026-11-23 · État : acceptée

## Décision

Une mécanique s’ouvre quand le joueur a accompli la condition du palier. Les mécaniques collectives ont en plus un jour de saison minimal. La table vit dans data et pilote moteur, serveur et interface.

## Pourquoi

La complexité progressive est le pilier du jeu ; une date commune évite qu’un joueur soit attaqué avant de savoir se défendre.

## Conséquences

Un test par palier, côté client et côté serveur. Personne n’est attaquable avant le palier 5.
