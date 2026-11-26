# Monde partagé, étape 3 : la prédation entre humains — conception (proposition)

Date : 2026-11-26 · État : **règles données par le propriétaire, chiffres proposés, à valider
avant de construire.** Suit les étapes 1 et 2 et le bilan des jeux comparables (partie 4.1,
garde-fous).

## Ce que le propriétaire a fixé (26/11/2026)

> « Attaquer fait perdre des troupes. Plus il y a de différence entre l'attaque et la défense,
> moins il y a de pertes. La défense perd moins, mais elle perd aussi, moitié moins que
> l'attaque dans l'idée […] et cela va en s'accentuant en fonction des différences de
> puissance. On pourrait aussi avoir une troupe défensive. »

> « L'espionnage envoie un rapport et une notif au défenseur. Il faut monter un bâtiment pour
> l'espionnage pour avoir plus de précisions […] jusqu'à avoir toutes les infos. Si l'ennemi a
> un bâtiment d'espionnage plus élevé, l'espionnage est infructueux. L'espionnage coûte des
> troupes d'espionnage, qui sont dans le bâtiment ET dans le bâtiment des troupes. Elles montent
> de niveau avec le bâtiment. »

## 1. Le combat : les pertes des deux côtés

Aujourd'hui, une attaque se joue à la chance, et seul l'attaquant perd des cellules (de 0 à
50 % s'il gagne, 50 à 90 % s'il perd). Le défenseur simulé ne perd rien.

**Proposition.** Soit `A` la force de l'attaque et `D` celle de la défense.

- **Pertes de l'attaquant** : `30 % × D / A`.
- **Pertes du défenseur** : `15 % × A / D` (la moitié de celles de l'attaquant à force égale).
- Bornes : jamais moins de 2 %, jamais plus de 90 % ; il reste toujours au moins une cellule.

| Rapport des forces | Attaquant perd | Défenseur perd |
| ------------------ | -------------- | -------------- |
| A = D              | 30 %           | 15 %           |
| A = 2 × D          | 15 %           | 30 %           |
| A = 4 × D          | 7,5 %          | 60 %           |
| A = D / 2          | 60 %           | 7,5 %          |

L'écart « s'accentue » : plus l'un est fort, moins il perd, et plus l'autre perd.

- **Qui gagne** : comme aujourd'hui, à la chance, `A / (A + D)` ; le butin ne part qu'en cas
  de victoire. (Option : victoire certaine dès que `A > D`. Plus lisible, mais moins de
  suspense.)
- **Une troupe défensive** : la **Sentinelle**, une cellule fille qui ne quitte jamais la
  cellule. Défense forte, attaque nulle, bon marché. Elle compte dans la défense contre tout
  attaquant, humain ou simulé.
- **Les mêmes règles contre les organismes simulés** : un seul système de combat, plus simple
  à comprendre et à équilibrer. Les organismes simulés reçoivent une garnison calculée.

## 2. L'espionnage : un organite, des éclaireuses

- **Nouvel organite : les Chimiorécepteurs** (les capteurs par lesquels une cellule « sent »
  ses voisines). Dixième emplacement de la cellule. Débloqué avec la recherche militaire
  (palier 8).
- **Les Éclaireuses**, nouvelle cellule fille, sont formées à la Pouponnière et logées dans
  les Chimiorécepteurs (leur nombre est limité par le niveau de l'organite). Leur niveau est
  celui des Chimiorécepteurs.
- **Espionner coûte des éclaireuses** (une par mission, perdue si l'espionnage échoue) en plus
  de l'énergie.
- **Ce qu'on apprend dépend du niveau** :

  | Niveau | Le rapport donne                                             |
  | ------ | ------------------------------------------------------------ |
  | 1      | les ressources totales                                       |
  | 3      | les ressources disponibles (ce qu'une attaque peut emporter) |
  | 5      | + la puissance                                               |
  | 7      | + les troupes, à ± 50 % près                                 |
  | 9      | + les troupes, à ± 15 % près                                 |
  | 11     | tout : troupes exactes, défense, organites, bouclier         |

- **Contre-espionnage** : si les Chimiorécepteurs de la cible sont **plus élevés** que les
  siens, l'espionnage échoue, l'éclaireuse est perdue, et la cible apprend qui a essayé.
- **La cible est toujours prévenue** : un rapport « On vous a espionné », réussi ou non.
- Mêmes règles contre les organismes simulés (ils ont un niveau de Chimiorécepteurs calculé).

## 3. Les garde-fous entre humains

Repris du bilan (partie 4.1) :

- **Protection des débutants** : pas d'attaque contre un humain avant le palier 6 ;
- **Écart de puissance** : on n'attaque pas un humain qui a moins de la moitié de sa puissance ;
- **Acharnement** : 3 attaques au plus par jour contre la même cible ;
- **Plafond de pillage** par semaine de saison ;
- **Nuit et absence** : le **bouclier de nuit** et le **mode absence** existent déjà et
  protègent aussi des humains ;
- **Trajet** : une attaque entre humains met au moins quelques heures ; on décidera du chiffre
  avec le bouclier de nuit, qui couvre déjà le sommeil ;
- **Classement à part** des points gagnés contre des humains.

## 4. Les notifications

L'attaque et l'espionnage préviennent le défenseur **dans le jeu** (rapports, alerte). Une vraie
notification sur le téléphone (push) demande le jeu installé et une paire de clés que le
propriétaire collera lui-même dans les secrets GitHub et Supabase. C'est un chantier à part,
utile ici.

## 5. Mesures

Attaques et espionnages entre humains par jour, taux de réussite, pertes moyennes des deux
côtés, part des attaques arrêtées par un garde-fou (`human`, `tooWeak`, `tooOften`…).

## Découpage proposé

1. Les pertes des deux côtés et la Sentinelle (contre les organismes simulés d'abord).
2. Les Chimiorécepteurs, les Éclaireuses, les rapports d'espionnage par niveau.
3. L'attaque entre humains : file des attaques sur le serveur, résolution à l'arrivée, garde-fous.
4. Les notifications push.
