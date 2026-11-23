# Brancher les comptes (Supabase + Discord)

Environ 20 minutes. À la fin, tu m’envoies **deux valeurs publiques** (l’adresse du projet et la clé `anon`), et j’active les comptes dans le jeu.

> 🔒 **Ne m’envoie jamais** : le mot de passe de la base de données, la clé `service_role`, ni le « Client Secret » de Discord. Ils restent chez toi.
> La clé `anon` est faite pour être publique : la sécurité vient des règles de la base (chaque joueur ne voit que ses propres données).

---

## 1. Créer le projet Supabase

1. Va sur <https://supabase.com> › **Start your project**, et connecte-toi (avec GitHub, c’est le plus simple).
2. **New project** :
   - Name : `origins-27`
   - Database Password : clique sur **Generate a password**, puis garde-le dans ton gestionnaire de mots de passe.
   - Region : **Central EU (Frankfurt)**. Les données restent en Europe, ce qui compte pour le RGPD.
   - Plan : **Free**.
3. Attends 1 à 2 minutes que le projet soit prêt.

## 2. Créer les tables

1. Menu de gauche › **SQL Editor** › **New query**.
2. Ouvre le fichier [`supabase/001_init.sql`](../supabase/001_init.sql) du dépôt, copie **tout** son contenu et colle-le.
3. Clique sur **Run**. Le message attendu est « Success. No rows returned ».

## 3. Créer l’application Discord (pour « Se connecter avec Discord »)

1. Va sur <https://discord.com/developers/applications> › **New Application** › nom : `Origins 27` › accepte les conditions › **Create**.
2. Onglet **OAuth2** :
   - copie le **Client ID** ;
   - clique sur **Reset Secret** et copie le **Client Secret**. Il ne s’affiche qu’une fois : ne le partage avec personne.
   - **Redirects › Add Redirect**, colle `https://TON-PROJET.supabase.co/auth/v1/callback`. Remplace `TON-PROJET` par l’identifiant de ton projet : c’est le début de l’adresse visible dans Supabase › **Project Settings › Data API › Project URL**.
   - **Save Changes**.
3. (Facultatif) Onglet **General Information** : mets l’icône du jeu (`icon-512.png` du dépôt) et une courte description.

## 4. Activer les connexions dans Supabase

1. **Authentication › Sign In / Providers** (ou **Providers** selon la version) :
   - **Discord** : active-le, colle le Client ID et le Client Secret de l’étape 3, puis **Save**.
   - **Email** : laisse-le activé (c’est le « lien magique » par e-mail).
2. **Authentication › URL Configuration** :
   - **Site URL** : `https://shakeitout-teach.github.io/origins-27/`
   - **Redirect URLs › Add URL** :
     - `https://shakeitout-teach.github.io/origins-27/`
     - `http://localhost:8765/game/` (pour mes tests)
3. (Recommandé) **Authentication › Emails › SMTP** : le service d’e-mail fourni d’office est limité à quelques envois par heure. C’est suffisant pour tester, mais pas pour 50 joueurs. On branchera un service d’envoi gratuit (Brevo ou Resend) avant la bêta : je te guiderai le moment venu.

## 5. M’envoyer les deux valeurs publiques

**Project Settings › Data API** (ou **API**) :

- **Project URL**, par exemple `https://abcdefghijkl.supabase.co`
- **Project API keys › `anon` `public`** : une longue chaîne qui commence par `eyJ…`, ou une clé `sb_publishable_…` dans les versions récentes.

Colle-les simplement dans la conversation. Je les mets dans `js/28-compte.js` (`SUPA_URL`, `SUPA_KEY`), je teste la connexion, et je publie.

---

### Ce que ça active dans le jeu
- ⚙ Options › **Compte et sauvegarde en ligne** : connexion avec Discord, ou lien par e-mail.
- La partie est sauvegardée en ligne toutes les 2 minutes et quand on quitte l’onglet. On la retrouve sur téléphone et sur ordinateur.
- Si deux parties existent (appareil et compte), le joueur choisit laquelle garder. Rien n’est écrasé sans lui demander.
- « Supprimer mon compte » efface tout côté serveur.
- La connexion ne fonctionne que sur le site (GitHub Pages), pas dans l’aperçu claude.ai.
