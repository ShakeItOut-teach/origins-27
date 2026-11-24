# Les coffres à ouvrir : conception

Date : 2026-11-24 · État : **demandé par le propriétaire** (« faire ouvrir aux gens les
récompenses sous forme de coffres donne toujours un petit plaisir, pour les récompenses
d'événements ou de quêtes »).

## Ce que le joueur vit

- Une récompense n'entre plus toute seule dans la réserve : elle arrive dans un **coffre**.
- Un bouton **Coffres à ouvrir** apparaît dès qu'un coffre attend, avec leur nombre.
- Le coffre s'affiche fermé, seul à l'écran, et remue. Le joueur le touche : le couvercle se
  lève, et le contenu en sort, pièce après pièce. S'il en reste, un bouton passe au suivant.

## Quels coffres

| Coffre              | Quand                                         | Contenu                                                 |
| ------------------- | --------------------------------------------- | ------------------------------------------------------- |
| Coffre de quête     | quête du jour finie                           | celui de la quête (inchangé)                            |
| Coffre de défi      | défi du jour fini                             | celui du défi (inchangé)                                |
| Coffre de ligue     | chaque minuit, à partir du jour 4             | la récompense de la ligue, entière                      |
| Coffre du Léviathan | Léviathan vaincu, au retour du groupe         | les protéines de la chasse, 5 d'énergie, 1 accélérateur |
| Cadeau d'alliance   | une fois par jour, depuis la fiche d'alliance | le cadeau du jour (inchangé)                            |

## Règles

- **Un coffre est un cadeau** : son contenu entre en entier, même si la réserve ou la jauge
  est pleine. Avant, une récompense de ligue ou les protéines d'un Léviathan étaient perdues
  quand la réserve débordait.
- **Rien ne s'ouvre sans le joueur.** Un coffre de quête gagné mais pas ouvert avant minuit
  n'est plus ouvert d'office : il rejoint les coffres en attente. Après une absence, les
  coffres de ligue de chaque nuit attendent tous.
- **Trente coffres en attente au plus.** Au-delà, le plus ancien s'ouvre tout seul : rien
  n'est jamais perdu.
- Le coffre d'une quête du jour et le cadeau d'alliance ne passent pas par la liste d'attente :
  on les ouvre depuis leur fiche, avec la même mise en scène.

## Dans le code

- `core/chests.ts` : `earnChest`, `openReward` ; `PlayerState.chests` ; ordre `openReward`
  (ouvert au palier 4, comme les quêtes) ; événements `chestEarned` et `rewardOpened`.
- `client/ui/ChestOverlay.tsx` : le coffre, dessiné comme une boîte de naturaliste. L'ordre ne
  part qu'au toucher ; ce que l'événement renvoie est ce qui s'affiche.

## Limites connues

- Tous les coffres ont le même dessin ; seule la couleur des sangles change selon l'origine.
- Pas de son.
- Les rivaux simulés n'ont pas de coffres : seuls les joueurs en reçoivent.
