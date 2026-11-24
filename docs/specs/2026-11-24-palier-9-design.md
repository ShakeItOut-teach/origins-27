# Palier 9 (jour 9) : événements de zone, alliances, Gazette — conception

Date : 2026-11-24 · État : **demandé par le propriétaire** (« passe au palier 9 »). Les
mécaniques reprennent celles de l'ancien jeu (`js/12-evenements.js`, `js/26-alliances.js`,
`js/27-saison.js` sur la branche `main`), adaptées à l'océan du nouveau jeu. Les chiffres sont
proposés par l'agent, à régler en jouant.

## Ce que le joueur vit

1. Jour 9, minuit : « L'océan s'organise ». Une bannière l'a recruté d'office.
2. Sur la carte de l'océan, de grandes auréoles apparaissent : orange (éruption), verte
   (plancton), rouge (Léviathan), violette (zone sans oxygène). Un bouton **Événements** les
   liste ; en toucher un centre la carte dessus.
3. Sur l'écran de la cellule, trois boutons de plus : **Événements**, **Alliance**, **Gazette**.
   Si sa cellule manque d'oxygène ou si un Léviathan la tient à sa portée, un bandeau rouge le
   dit, avec le compte à rebours.

## Les événements de zone

L'océan est découpé en quartiers de 24 cases. Toutes les 12 heures, chaque quartier a 14 chances
sur 100 de voir naître un événement. Tout se calcule à partir de la graine du monde et de
l'heure : tous les joueurs voient les mêmes événements, et rien n'est stocké.

| Événement              | Durée | Rayon    | Ce qu'il fait                                                                                                     |
| ---------------------- | ----- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| Éruption hydrothermale | 48 h  | 6 cases  | Cinq gisements trois fois plus riches autour d'une cheminée. Ils se vident comme les autres : premier arrivé…     |
| Efflorescence          | 48 h  | 10 cases | Six gisements qui ne se vident pas, et toute récolte dans la zone rapporte moitié plus.                           |
| Léviathan              | 36 h  | 12 cases | Toutes les 6 h, il frappe les cellules à sa portée. On peut l'affronter : vaincu, il ne menace plus le joueur.    |
| Zone anoxique          | 16 h  | 9 cases  | Les cellules de la zone produisent 30 % de moins. Les organismes qui s'y trouvent ont une garde 30 % plus faible. |

- **Le Léviathan.** Sa force : 400, plus 30 par jour de saison, multipliée par la force des
  gardes de sa zone. Sa frappe vaut la moitié de sa force, contre la défense du joueur (cellules
  à la maison, Paroi, renforts des alliés). Si la défense cède : un dixième des cellules filles
  et de chaque réserve est perdu. Un joueur à l'abri (bouclier, mode absent, nuit) n'est pas
  trouvé. Le vaincre : 400 protéines (plus près de la surface) et 5 d'énergie. On peut
  l'affronter même s'il est dans la zone du dessus, dès lors qu'il tient la cellule à sa portée.
- **La zone anoxique** est une bonne heure pour attaquer : la fiche d'un organisme affaibli le
  signale.
- Mesure sur trois saisons simulées : environ 38 événements en cours dans tout l'océan ; un
  joueur des abysses subit en moyenne une zone anoxique sur deux saisons, et un Léviathan deux
  saisons sur trois.

## Les alliances

- **Six bannières** : [ABY] Les Abyssaux, [KRK] Le Kraken, [MER] La Mer, [TOX] Les Toxiques,
  [LUM] Les Lumineux, [NOX] La Nuit. Chaque organisme en a une ; deux sur trois suivent celle
  qui tient leur sixième d'océan.
- **Recrutement d'office** au jour 9, par la bannière la plus présente à 30 cases. On en
  change librement pendant 24 h ; ensuite, changer fait perdre sa contribution et ses crédits.
- **Ce qu'une alliance apporte** : ses membres ne vous attaquent pas (et on ne les attaque
  pas) ; les alliés à moins de 25 cases envoient 15 % de leur garde en renfort quand on vous
  attaque ; 5 % de production en plus.
- **Neuf technologies**, trois directions, cinq niveaux (400, 800, 1 600, 3 200, 6 400 points) :

  | Direction  | Technologie        | Par niveau                  |
  | ---------- | ------------------ | --------------------------- |
  | Croissance | Réseau nutritif    | production +2 %             |
  | Croissance | Réserves partagées | réserves +4 %               |
  | Croissance | Chantiers communs  | durée des chantiers −3 %    |
  | Conquête   | Meute              | attaque +3 %                |
  | Conquête   | Pillage organisé   | butin porté +4 %            |
  | Conquête   | Courants rapides   | durée des trajets −3 %      |
  | Rempart    | Membrane commune   | défense +3 %                |
  | Rempart    | Renforts           | renforts des alliés +15 %   |
  | Rempart    | Entretien partagé  | entretien des cellules −3 % |

- **Qui paie ?** Chaque membre simulé verse 50 points par jour dans la technologie
  « recommandée ». Dès qu'elle gagne un niveau, la recommandation passe à la moins avancée.
- **Dons** : 100 ATP et 60 lipides, 20 par jour. Un don rapporte 40 points (60 sur la
  recommandée) à la technologie, à la contribution du joueur et à ses crédits.
- **Officier** à 600 points de contribution : on choisit soi-même la recommandation.
- **Entraide** : les demandes des autres arrivent au fil du jour (5 à minuit, puis une toutes
  les 30 minutes, 30 par jour). Y répondre : 10 crédits et 2 points chacune. On peut demander
  de l'aide pour son chantier : 20 % du temps restant en moins, une fois par chantier.
- **Cadeau du jour** : 80 ATP, 50 lipides, 10 protéines, 2 d'énergie ; × 1,5 au niveau 5,
  × 2,2 au niveau 12, × 3 au niveau 25.
- **Boutique** (crédits) : +5 énergie (150), 60 protéines (450), bouclier de 4 h (700),
  chantier terminé sur-le-champ (1 600).

## La Gazette

Un résumé du jour, que l'on peut copier pour Discord : la nouvelle du jour (zone qui s'ouvre,
événement né aujourd'hui, derniers jours), les trois plus puissants, l'alliance en tête, le
pillard le plus redouté, la journée du joueur (rang, ligue, victoires et défaites), les brèves,
et **le fossile du jour** : 27 fossiles réels, un par jour de saison, dans un ordre différent à
chaque saison (stromatolithes, Dickinsonia, Opabinia, Tiktaalik, cœlacanthe…).

## Dans le code

- `data` : `ZONE_EVENT_KINDS`, `BANNER_IDS`, `ALLIANCE_TECH_IDS`, `ALLIANCE_SHOP_IDS`,
  `FOSSIL_AGES` ; `BALANCE.events`, `BALANCE.alliance` ; huit ordres de plus.
- `core` : `events.ts` (événements, gisements d'événement, zone anoxique), `leviathan.ts`,
  `banners.ts` (bannières et technologies), `alliance.ts` (ordres), `gather.ts` (récolte),
  `daily.ts` et `gazette.ts`. État en version 11 (`alliance`, `daily`, `construction.helped`).
- Le moteur s'arrête aux instants où un bonus change tout seul (niveau de technologie gagné,
  arrivée ou fin d'une zone anoxique) : avancer d'une traite ou en plusieurs fois donne le
  même état, au millième de seconde près. Deux tests le vérifient.
- `client` : `EventsSheet.tsx`, `AllianceSheet.tsx`, `GazetteSheet.tsx` ; les auréoles et le
  Léviathan (un orthocône géant) dans `oceanLife.ts`.

## Corrigé au passage

- **Les ordres de l'océan étaient refusés par le serveur.** Depuis le palier 6, deux
  vérifications d'identifiants étaient fausses : celle des gisements (« d:… ») et celle des
  organismes de l'océan (« o:… »). En ligne, récolter un gisement, espionner ou attaquer un
  organisme de l'océan était donc refusé comme « ordre invalide ». Les tests ne jouaient ces
  ordres que sans serveur. Un test serveur les joue maintenant.
- L'énergie offerte au-delà de la jauge (coffre) était perdue à la relecture de la sauvegarde.

## Limites connues

- Les autres organismes sont simulés : un Léviathan « vaincu » ne l'est que pour le joueur qui
  l'a battu, et les membres des alliances ne sont pas de vrais joueurs.
- Pas de discussion entre alliés dans le jeu : le lien mène au Discord.
- On ne peut pas se déplacer de côté pour sortir d'une zone anoxique : on attend, ou l'on
  remonte d'une zone.
- Les rivaux simulés n'ont pas de technologies d'alliance.
- Chiffres jamais joués sur une saison entière.
