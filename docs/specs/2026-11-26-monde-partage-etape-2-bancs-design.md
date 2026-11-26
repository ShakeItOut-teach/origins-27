# Monde partagé, étape 2 : les bancs — conception

Date : 2026-11-26 · État : **demandé par le propriétaire** (« Oui, les bancs »). Suit l'étape 1
(`2026-11-26-monde-partage-etape-1-design.md`) et le bilan des jeux comparables (partie 4.1).

## L'idée

Le jeu a déjà des alliances : six bannières, recrutement d'office au jour 9, dons, technologies,
entraide, cadeau du jour, boutique. Mais tous les membres sont simulés : un don ne profite qu'au
joueur qui le fait.

Un **banc**, c'est la troupe des espèces humaines d'une même bannière, **vingt au plus**. Le jeu
forme les bancs lui-même : à l'ouverture des alliances, un humain rejoint la bannière qui a déjà
le plus d'humains, tant qu'elle en a moins de vingt. Avec peu de joueurs, tous les humains se
retrouvent ensemble ; quand un banc est plein, le suivant se forme sous une autre bannière. Les
organismes simulés de la bannière restent là : un banc n'est jamais vide.

C'est une alliance automatique, comme l'a résumé le propriétaire, mais avec de vrais joueurs
dedans : coopérer avant de s'affronter.

## Ce que voient les joueurs (premier morceau)

1. **Le recrutement regroupe les humains.** Le message d'arrivée dans l'alliance ne change pas ;
   la bannière choisie est celle du banc.
2. **Les dons des humains comptent pour tout le banc.** Les points versés par les autres humains
   de la bannière s'ajoutent aux technologies de chacun, comme ceux des membres simulés : niveau
   d'alliance, bonus, cadeau du jour, tout suit.
3. **Une rubrique « Votre banc »** dans la fiche d'alliance : les autres espèces humaines de la
   bannière, avec l'étiquette « humain », leur palier, leur puissance et leur contribution.
4. **La liste des bannières** montre combien d'humains chacune compte : changer de bannière pour
   rejoindre d'autres joueurs reste possible (gratuit pendant 24 h, comme aujourd'hui).

## Les règles

- La vitrine porte la bannière du joueur et sa contribution (ses points d'alliance). Rien
  d'autre ne s'ajoute.
- Les points des autres humains ne sont **jamais sauvegardés** dans la partie d'un joueur : ils
  s'ajoutent à la lecture, à partir de la foule (ADR 0015). Un joueur qui change de bannière
  emporte sa contribution, puisqu'elle suit sa vitrine.
- Taille d'un banc : `BALANCE.alliance.benchHumans` = 20 (le bilan conseillait 20 à 25 membres ;
  les organismes simulés complètent).

## Ce qu'on mesure

Pour le gardien : le nombre d'humains par bannière, et les points versés par les humains.

## Plus tard (morceaux suivants de l'étape 2)

- **Entraide réelle** : une demande d'aide d'un humain arrive chez les autres humains du banc,
  et leur réponse raccourcit vraiment son chantier (il faut écrire dans la partie d'un autre :
  une file d'aides lue par le serveur à la visite suivante).
- **Un objectif commun au serveur**, comme le roi de The Ants : des points collectifs dépensés
  en bonus pour tous.
- **Messages structurés du banc** (pas de texte libre sans modération, voir le bilan 4.4).
