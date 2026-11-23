/** Textes français, en mots simples. Chaque clé doit exister aussi dans en.ts. */
export const fr = {
  "resource.sugar": "Sucre",
  "resource.bricks": "Briques",

  "organelle.mitochondrion.name": "Centrale",
  "organelle.mitochondrion.role": "Fabrique du sucre toute seule.",
  "organelle.vacuole.name": "Réserve",
  "organelle.vacuole.role": "Permet de garder plus de sucre et de briques.",
  "organelle.cilia.name": "Cils",
  "organelle.cilia.role": "Chaque toucher rapporte plus.",
  "organelle.ribosome.name": "Fabrique",
  "organelle.ribosome.role": "Fabrique des briques toute seule.",

  "mutation.swiftCilia.name": "Cils vifs",
  "mutation.swiftCilia.effect": "Chaque toucher rapporte moitié plus.",
  "mutation.thickWall.name": "Paroi épaisse",
  "mutation.thickWall.effect": "Un quart de place en plus dans la réserve.",
  "mutation.fastMetabolism.name": "Métabolisme rapide",
  "mutation.fastMetabolism.effect": "Le sucre se fabrique plus vite.",
  "mutation.digestivePouch.name": "Poche digestive",
  "mutation.digestivePouch.effect": "Les briques se fabriquent plus vite.",
  "mutation.quickDivision.name": "Division rapide",
  "mutation.quickDivision.effect": "Les constructions vont plus vite.",
  "mutation.thrift.name": "Économe",
  "mutation.thrift.effect": "Les constructions coûtent moins cher.",

  "unlock.1.title": "Votre cellule peut grandir",
  "unlock.1.text": "Touchez un emplacement pour construire.",
  "unlock.2.title": "Votre cellule vient de muter",
  "unlock.2.text": "Choisissez ce qu’elle devient.",

  "action.build": "Construire",
  "action.upgrade": "Améliorer",
  "action.choose": "Choisir",
  "action.continue": "Continuer",

  "action.close": "Fermer",

  "hint.tap": "Touchez la cellule",
  "state.full": "Réserve pleine",
  "state.building": "En construction",
  "label.level": "Niveau",
  "label.perSecond": "par seconde",
  "label.cell": "Votre cellule",

  "absence.title": "Pendant votre absence",
  "account.keep": "Retrouver ma partie sur un autre appareil",
} as const;

export type TextKey = keyof typeof fr;
