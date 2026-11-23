# data — les données du jeu

Équilibrage, table de déblocage, textes français et anglais. Aucune logique.

- Toute donnée est validée par un schéma ; une donnée invalide fait échouer les tests.
- Préférer une formule à peu de paramètres à un tableau rempli à la main.
- La table de déblocage est la source unique : chaque ordre et chaque élément d'interface
  appartient à exactement un palier.
- Un texte existe toujours en français et en anglais, en mots simples.
- Tout changement de chiffre est noté dans `docs/equilibrage/journal.md` avec la mesure avant et après.
