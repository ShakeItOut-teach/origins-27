# ADR 0015 — Le même océan : la foule des humains, entrée du moteur

Date : 2026-11-26 · État : acceptée

## Contexte

Le propriétaire a choisi le monde hybride (`docs/veille/2026-11-25-bilan-jeux-comparables.md`,
partie 4.1). Étape 1 : les vrais joueurs d'une saison se voient dans le même océan, sans se
combattre (`docs/specs/2026-11-26-monde-partage-etape-1-design.md`). Le moteur doit rester pur
(ADR 0009) et le serveur doit rester le seul juge (ADR 0011).

## Décision

- **Une vitrine par joueur et par saison** (`HumanCard`, calculée par `core` avec
  `humanCard`) : place, nom d'espèce, teinte, palier, zone, cinq scores, progression au
  concours, dernière visite. Aucun identifiant de compte. Table `vitrines`, écrite par la
  fonction du serveur après chaque réponse (`montrer_vitrine`), lue par `lire_vitrines`.
- **La foule est une entrée du calcul**, pas une partie de la sauvegarde : le serveur la pose
  sur l'état (`withCrowd`) avant d'avancer le temps ; `serializeState` ne l'écrit jamais.
  L'appareil la reçoit avec l'état et la garde jusqu'à la réponse suivante.
- **Un humain remplace l'organisme simulé de sa place** dans les classements, les ligues, le
  concours, la Gazette et l'océan. Il porte `human: true`.
- **Pas de combat entre humains à l'étape 1** : espionner ou attaquer une place humaine est
  refusé (`human`) ; un humain ne lance pas non plus d'attaque simulée.
- **Une lecture de la base par minute** au plus : la fonction garde les vitrines une minute en
  mémoire. Si la lecture échoue, le jeu continue sans foule.

## Pourquoi

- Le moteur reste `état + ordre + maintenant + graine → nouvel état` : la foule fait partie de
  l'état reçu, comme l'heure.
- Rien n'est ajouté à la sauvegarde d'un joueur : pas de migration de parties, pas de risque de
  garder des données d'autrui dans la partie d'un autre.
- Aucun appel de plus par visite : le quota gratuit de Supabase n'est pas touché.

## Conséquences

- L'appareil prévoit avec la foule de sa dernière réponse ; un écart de rang entre deux visites
  est corrigé à la visite suivante (le serveur fait foi pour la ligue de minuit).
- Un absent garde sa dernière vitrine. Son retour au contrôle de l'ordinateur viendra avec
  l'étape 3.
- Les mémoires de calcul (`ranking`, concours, océan) prennent en compte l'empreinte de la foule
  (`crowdStamp`).
