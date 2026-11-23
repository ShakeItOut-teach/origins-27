# ADR 0009 — Moteur pur et frontières vérifiées par outil

Date : 2026-11-23 · État : acceptée

## Décision

core est pur et déterministe et ne dépend que de data. Les frontières entre paquets sont vérifiées par dependency-cruiser et ESLint ; un import interdit fait échouer la CI.

## Pourquoi

Tout le code est écrit par des agents : ce qu’une machine peut vérifier doit l’être, plutôt que rappelé en prose.

## Conséquences

Le client et le serveur exécutent exactement les mêmes règles. Le temps et la graine sont toujours des paramètres.
