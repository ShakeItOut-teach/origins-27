/**
 * Les vrais termes de la biologie. Ils remplacent les mots simples quand le joueur le veut
 * (c'est le réglage par défaut). Seuls les textes qui changent sont ici.
 */
import type { TextKey } from "./fr";

export type ScienceTexts = Readonly<Partial<Record<TextKey, string>>>;

export const frScience = {
  "resource.sugar": "ATP",
  "resource.bricks": "Lipides",
  "organelle.mitochondrion.name": "Mitochondrie",
  "organelle.mitochondrion.role": "La centrale de la cellule : elle produit l’ATP, son carburant.",
  "organelle.vacuole.name": "Vacuole",
  "organelle.vacuole.role": "Une poche de réserve : elle garde plus d’ATP et de lipides.",
  "organelle.ribosome.name": "Réticulum",
  "organelle.ribosome.role": "Un réseau de membranes : il fabrique les lipides, de quoi bâtir.",
  "organelle.nursery.name": "Centrosome",
  "organelle.nursery.role":
    "Il organise la division : des cellules filles naissent, autant que vous pouvez en nourrir. Chaque niveau accélère les naissances.",
  "mutation.fastMetabolism.effect": "L’ATP se produit plus vite.",
  "mutation.digestivePouch.effect": "Les lipides se fabriquent plus vite.",
  "place.sugarCluster.name": "Amas de nutriments",
  "place.debris.name": "Débris organiques",
  "state.overflow": "Vacuole trop pleine : une partie du butin sera perdue. Améliorez la Vacuole.",
  "loss.text": "La vacuole était pleine. Améliorez la Vacuole pour tout garder.",
  "state.full": "Vacuole pleine",
  "unlock.4.text": "Construisez le Centrosome, puis chassez les proies de la goutte.",
  "state.nurseryFull": "Centrosome saturé",
  "quest.tapSugar": "Récoltez {n} ATP en touchant la cellule",
  "quest.upgradeStore": "Améliorez la Vacuole",
  "quest.bricksFromMap": "Rapportez {n} lipides de la goutte",
  "quest.sugarFromMap": "Rapportez {n} ATP de la goutte",
  "label.upkeepText":
    "Chaque cellule fille consomme de l’ATP. Si la vacuole tombe à zéro, les cellules en trop meurent de faim.",
  "state.starving": "Vous dépensez plus d’ATP que vous n’en produisez.",
  "troop.hunter.name": "Phagocyte",
  "troop.armored.name": "Dinoflagellé cuirassé",
  "troop.swift.name": "Flagellé",
  "troop.toxic.name": "Dinoflagellé venimeux",
  "troop.guardian.name": "Macrophage",
  "troop.scout.name": "Trypanosome",
  "troop.carrier.name": "Noctiluque",
  "lineage.metabolism.text": "Un cinquième d’ATP produit en plus.",
  "prey.soft.name": "Amibe",
  "prey.aggressive.name": "Didinium",
  "prey.fleeing.name": "Euglène",
} as const satisfies ScienceTexts;

export const enScience = {
  "resource.sugar": "ATP",
  "resource.bricks": "Lipids",
  "organelle.mitochondrion.name": "Mitochondrion",
  "organelle.mitochondrion.role": "The cell’s power plant: it produces ATP, its fuel.",
  "organelle.vacuole.name": "Vacuole",
  "organelle.vacuole.role": "A storage pouch: it keeps more ATP and lipids.",
  "organelle.ribosome.name": "Reticulum",
  "organelle.ribosome.role": "A network of membranes: it makes lipids, the building material.",
  "organelle.nursery.name": "Centrosome",
  "organelle.nursery.role":
    "It organises division: daughter cells are born, as many as you can feed. Each level speeds up births.",
  "mutation.fastMetabolism.effect": "ATP is produced faster.",
  "mutation.digestivePouch.effect": "Lipids are made faster.",
  "place.sugarCluster.name": "Nutrient cluster",
  "place.debris.name": "Organic debris",
  "state.overflow": "Vacuole too full: part of the loot will be lost. Upgrade the Vacuole.",
  "loss.text": "The vacuole was full. Upgrade the Vacuole to keep everything.",
  "state.full": "Vacuole full",
  "unlock.4.text": "Build the Centrosome, then hunt the prey of the drop.",
  "state.nurseryFull": "Centrosome saturated",
  "quest.tapSugar": "Gather {n} ATP by tapping the cell",
  "quest.upgradeStore": "Upgrade the Vacuole",
  "quest.bricksFromMap": "Bring back {n} lipids from the drop",
  "quest.sugarFromMap": "Bring back {n} ATP from the drop",
  "label.upkeepText":
    "Each daughter cell uses up ATP. If the vacuole drops to zero, the cells you cannot feed starve.",
  "state.starving": "You are spending more ATP than you make.",
  "troop.hunter.name": "Phagocyte",
  "troop.armored.name": "Armoured dinoflagellate",
  "troop.swift.name": "Flagellate",
  "troop.toxic.name": "Venomous dinoflagellate",
  "troop.guardian.name": "Macrophage",
  "troop.scout.name": "Trypanosome",
  "troop.carrier.name": "Noctiluca",
  "lineage.metabolism.text": "A fifth more ATP produced.",
  "prey.soft.name": "Amoeba",
  "prey.aggressive.name": "Didinium",
  "prey.fleeing.name": "Euglena",
} as const satisfies Record<keyof typeof frScience, string>;

/** Les mots expliqués dans le lexique : la clé du mot, et celle de son explication. */
export const LEXICON = [
  ["resource.sugar", "lexicon.sugar"],
  ["resource.bricks", "lexicon.bricks"],
  ["organelle.mitochondrion.name", "lexicon.mitochondrion"],
  ["organelle.vacuole.name", "lexicon.vacuole"],
  ["organelle.ribosome.name", "lexicon.ribosome"],
  ["organelle.nursery.name", "lexicon.nursery"],
  ["troop.hunter.name", "lexicon.hunter"],
  ["troop.armored.name", "lexicon.armored"],
  ["troop.swift.name", "lexicon.swift"],
  ["troop.toxic.name", "lexicon.toxic"],
  ["troop.guardian.name", "lexicon.guardian"],
  ["troop.scout.name", "lexicon.scout"],
  ["troop.carrier.name", "lexicon.carrier"],
  ["prey.soft.name", "lexicon.soft"],
  ["prey.aggressive.name", "lexicon.aggressive"],
  ["prey.fleeing.name", "lexicon.fleeing"],
] as const satisfies readonly (readonly [keyof typeof frScience, TextKey])[];
