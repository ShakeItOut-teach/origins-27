# Publier Origins 27 sur itch.io

Tout ce qu’il faut pour la page itch.io : le paquet du jeu, la couverture, les captures en anglais et les textes à copier-coller.

## 1. Fabriquer le paquet

Depuis le dossier du dépôt :

```powershell
powershell -ExecutionPolicy Bypass -File tools\itch-zip.ps1
```

Le fichier `dist\origins27-itch.zip` contient `index.html` à la racine, `css/` et `js/` : c’est ce que demande itch.io.

## 2. Créer la page (à faire sur itch.io, connecté à votre compte)

1. **Dashboard → Create new project.**
2. **Title :** `Origins 27` · **Project URL :** `origins-27` (au choix).
3. **Short description or tagline :** voir le texte plus bas.
4. **Classification :** *Games*. **Kind of project :** *HTML*.
5. **Uploads → Upload files :** `origins27-itch.zip`, puis cochez **This file will be played in the browser**.
6. **Embed options :**
   - *Viewport dimensions* : **1280 × 720**.
   - Cochez **Mobile friendly** (orientation : *Default* ou *Portrait*), **Automatically start on page load** et **Fullscreen button**.
   - *Scrollbars* : décochez **Enable scrollbars** (le jeu gère son propre défilement).
7. **Details :**
   - *Description* : collez le texte anglais plus bas (vous pouvez ajouter la version française en dessous).
   - *Genre* : **Strategy**.
   - *Tags* : `strategy`, `real-time`, `browser`, `evolution`, `pixel-art`, `incremental`, `singleplayer`, `free`.
   - *Pricing* : **No payment** (ou « $0 or donate » si vous voulez permettre les dons).
8. **Media :**
   - *Cover image* : `cover-630x500.png`.
   - *Screenshots* : les images du dossier `itch/screenshots-en` (et, si vous voulez, celles de `presentation/paysage-1920x1080` pour le public francophone).
   - *Gameplay video or trailer* : itch.io n’accepte qu’un lien YouTube ou Vimeo. Si vous mettez la bande-annonce sur YouTube, collez son lien ici.
9. **Visibility & access :** commencez en **Draft**, ouvrez la page avec **View page** pour tester, puis passez en **Public**.

À savoir :
- **Langue :** le jeu s’ouvre en anglais si le navigateur du joueur n’est pas en français, et chacun peut changer avec le bouton FR / EN (ou « 🌐 » sur l’écran d’accueil).
- **Sauvegardes :** sur itch.io, chaque joueur garde sa partie dans son navigateur, séparée de celle de GitHub Pages.
- **Mises à jour :** à chaque nouvelle version, relancez `tools\itch-zip.ps1` et remplacez le fichier dans **Uploads** (ou utilisez l’outil *butler* d’itch.io).

## 3. Textes à copier-coller

### Short description (tagline)

> Born a bacterium in a hostile ocean. Evolve, raid 499 rivals and become the legendary APEX. Free to play, no pay to win.

### Description (English)

**You are born a bacterium in a hostile world. Will you go all the way to become the legendary APEX?**

Origins 27 is a real-time strategy game that runs in your browser. Start as a single cell at the edge of a dark ocean, among 499 other organisms, and climb toward the light, from prokaryote to eukaryote, colony, multicellular creature, and finally the APEX that leaves the water.

- **Evolve:** no two games are alike. Evolution paths are drawn at random; genes, mutations and hidden emergences shape your own lineage.
- **Raid:** 499 rivals covet your place. Hunt, spy, raid, and strike back at those who raided you.
- **Command:** troops evolve over the weeks, from rank T1 to legendary T5.
- **Dominate:** world ranking, six leagues and daily rewards.

**FREE TO PLAY · NO PAY TO WIN.** Nothing to buy, ever.

A full game lasts 30 in-game days. The 499 rivals are simulated and react to your choices. Your progress is saved in your browser, and a protected night (midnight to 7 am) and a one-hour shield after being raided let you sleep in peace.

Available in English and French. Playable on desktop and mobile.

Feedback is very welcome: use the **Feedback** button in the game, or leave a comment below.

### Description (français)

**Vous naissez bactérie dans un monde hostile. Irez-vous au bout du chemin pour devenir l’APEX légendaire ?**

Origins 27 est un jeu de stratégie en temps réel, jouable dans le navigateur. Partez d’une seule cellule au bord d’un océan obscur, parmi 499 autres organismes, et remontez vers la lumière : procaryote, eucaryote, colonie, pluricellulaire, puis l’APEX qui sort de l’eau.

Free to play, no pay to win. Les 499 rivaux sont simulés et s’adaptent à vos choix. Jeu en français et en anglais, sur ordinateur et sur mobile.
