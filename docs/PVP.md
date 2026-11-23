# Feuille de route du PvP

**Principe :** en PvP, c’est le serveur qui fait foi. Il calcule les ressources, les armées et les combats, et le navigateur ne fait qu’afficher et envoyer des ordres. Le jeu est asynchrone, comme Travian :
- l’état d’un joueur est recalculé « depuis sa dernière visite » à chaque connexion ;
- chaque combat est résolu à l’heure d’arrivée des troupes.

**Hébergement :** Supabase, qui fournit la base PostgreSQL, les comptes (Discord et e-mail), les fonctions serveur et le temps réel. C’est gratuit pour la bêta, puis environ 25 $/mois.

| Étape | Contenu | État |
|---|---|---|
| **1. Préparer le code** | Séparer les règles (économie, combats, bots) de l’affichage, pour que le serveur et le navigateur partagent exactement le même code. Rendre les combats déterministes (même entrée = même résultat). | à faire |
| **2. Comptes et sauvegarde en ligne** | Connexion Discord ou e-mail, partie retrouvée sur tous les appareils, suppression du compte. Pas encore de PvP. | ✅ codé, en attente des clés Supabase ([guide](SUPABASE.md)) |
| **3. Classement et alliances réels** | Les vrais joueurs apparaissent parmi les bots, avec un classement par saison. La Gazette parle de vraies personnes, et les alliances deviennent partagées. | à faire |
| **4. PvP entre joueurs** | Monde partagé par saison, pillage et espionnage entre joueurs calculés côté serveur, notifications « attaque entrante » sur téléphone. Les bots deviennent des joueurs du serveur (10 h de sommeil, 5 connexions par jour). | à faire |
| **5. Bêta fermée** | Une saison de 27 jours, 30 à 50 joueurs du Discord, complétée par des bots jusqu’à 500. | recrutement ([plan](RECRUTEMENT.md)) |

## Décisions déjà prises
- **Saison :** 27 jours en temps réel. Les vitesses ×60 et ×600 restent réservées au mode solo et au guide.
- **Bots :** ils complètent le serveur. Ils ne sont pas excellents, dorment 10 h par jour et se connectent 5 fois par jour.
- **Alliances :** on peut en rejoindre une à partir du jour 5. Elles se forment d’abord automatiquement, puis le joueur peut choisir.
- **Chat :** sur Discord, pas dans le jeu, pour éviter une modération lourde.
- **Dormance :** 8 h par jour, choisies par le joueur. Piller pendant ce temps brise la protection jusqu’au matin, après confirmation.
- **Grande crise :** une par saison, au jour 18, annoncée 48 h avant.

## Ce qui reste à trancher plus tard
- Le nombre de serveurs en parallèle, si plus de 500 joueurs.
- Les serveurs « éclair » (7 jours en ×4) pour les événements Discord.
- L’envoi d’e-mails (Brevo ou Resend) dès que l’on dépasse quelques inscriptions par heure.
