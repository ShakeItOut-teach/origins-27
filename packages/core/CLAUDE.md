# core — le moteur de règles

Une seule forme : `état + ordre + maintenant + graine → nouvel état + événements` (ou une erreur typée).

- **Pur.** Pas d'horloge, pas de hasard non semé, pas de réseau, pas de stockage. Le lint l'interdit.
  Le temps est un nombre passé en paramètre ; le hasard vient de `createRng`.
- **Aucune bibliothèque.** Seul import permis : `@o27/data`. La vérification des frontières l'impose.
- **Aucun chiffre d'équilibrage ici.** Ils viennent de `data`.
- **Immuable.** Une fonction ne modifie jamais l'état reçu ; elle en renvoie un nouveau.
- Chaque règle a ses tests unitaires et, quand c'est possible, un test de propriété (fast-check).
- Propriétés à ne jamais casser : aucune ressource négative ; le temps ne recule pas ;
  même entrée et même graine = même sortie ; sérialiser puis relire = identique.
