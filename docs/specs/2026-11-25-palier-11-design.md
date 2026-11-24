# Recherche militaire, récolte automatique, palier 11 — conception

Date : 2026-11-25 · État : **demandé par le propriétaire**. Trois mécaniques reprises de
l'ancien jeu (`js/05-troupes.js`, `js/27-saison.js`), adaptées au nouveau.

## Récolte automatique (palier 4)

Un bouton « Récolte auto » sur la goutte, avec une phrase d'explication dessous. Enclenchée,
les cellules qui rentrent d'une récolte repartent aussitôt : dans la goutte, vers le lieu
disponible le plus proche ; dans l'océan, vers le même gisement s'il en reste, sinon vers le
plus proche. Elles s'arrêtent quand l'énergie manque ou que la réserve est pleine. Le moteur
la fait tourner pendant l'absence du joueur.

## Recherche militaire (jour 5, dans le Centrosome)

Quatre pouvoirs pour toutes les cellules filles, huit niveaux chacun. Le premier niveau coûte
300 ATP, 200 lipides et 40 protéines ; **chaque niveau coûte le double du précédent** (le
huitième : 38 400 ATP). Les derniers demandent donc une réserve que seuls les hauts niveaux de
Vacuole donnent.

| Pouvoir | Par niveau                |
| ------- | ------------------------- |
| Furie   | attaque +2 %              |
| Garde   | défense +3 %              |
| Survie  | pertes au combat −5 %     |
| Hâte    | durée des naissances −4 % |

## Palier 11 (jour 17)

- **Crise de saison.** Une par saison, tirée de la graine du monde : glaciation, anoxie ou
  impact de météorite. Annoncée au jour 17, elle frappe tout le jour 19. Comme dans l'ancien
  jeu, les mieux classés y perdent le plus (le premier : −25 % de production, selon la courbe
  (1 − place) puissance 1,5) et les trois derniers dixièmes du classement gagnent 10 %. Deux
  gènes de la bonne famille (Résilience, Métabolisme ou Mobilité) divisent le malus par deux.
- **Niveaux 11 à 15** pour les organites, sur les mêmes règles que les niveaux 6 à 10.
- **Cellules filles de rang 4**, une par famille, avec la lignée : Chétognathe (attaque × 20),
  Ostracode (défense × 26), Krill (attaque × 15, butin × 11), Appendiculaire (butin × 30).
- **Fiche d'espèce.** Un nom latin bâti sur la famille de gènes dominante, la zone atteinte et
  la bannière (par exemple _Lycomonas krakenii_), un cousin fossile réel, le rang. La planche
  se copie pour être partagée.

## Limites connues

- La crise n'a pas de récompense propre ni de badge de survivant (l'ancien jeu en donnait un
  au Muséum, prévu au palier 12).
- La récolte automatique se règle depuis la goutte seulement, même si elle vaut aussi dans
  l'océan.
- L'ancien jeu liait les rangs de troupes à la recherche militaire ; ici les rangs s'ouvrent
  par les gènes et la date, et la recherche donne des pouvoirs.
- Chiffres jamais joués par de vrais joueurs.
