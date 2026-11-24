/**
 * L'espèce du joueur : un nom latin, bâti sur ce qu'il a fait de sa cellule, et un cousin
 * fossile bien réel. Rien n'est stocké : tout se lit dans ses gènes, sa zone et sa bannière.
 */
import { FOSSIL_IDS, GENE_FAMILIES } from "@o27/data";
import type { FossilId, GeneFamily } from "@o27/data";
import { familyGenes } from "./genes";
import { createRng } from "./rng";
import type { PlayerState } from "./types";

/** Les racines du nom de genre, par famille de gènes dominante. */
const ROOTS: Readonly<Record<GeneFamily, readonly string[]>> = {
  metabolism: ["Photo", "Chemo", "Thermo", "Glyco"],
  predation: ["Lyco", "Phago", "Toxo", "Dino"],
  mobility: ["Nauto", "Cilio", "Opto", "Dromo"],
  resilience: ["Scuto", "Lorico", "Thoraco", "Ostraco"],
};
/** La fin du nom de genre : elle change à mesure que l'on remonte vers la surface. */
const ENDINGS = ["monas", "cystis", "zoon", "caris", "pleura"] as const;
/** L'épithète : celle de la bannière, ou « des origines » sans alliance. */
const EPITHETS = {
  aby: "abyssalis",
  krk: "krakenii",
  mer: "pelagica",
  tox: "toxica",
  lum: "lucifera",
  nox: "nocturna",
} as const;
/** Les fossiles dont chaque famille se rapproche le plus. */
const COUSINS: Readonly<Record<GeneFamily, readonly FossilId[]>> = {
  metabolism: ["stromatolite", "grypania", "bangiomorpha", "charnia", "dickinsonia"],
  predation: ["anomalocaris", "opabinia", "ottoia", "cameroceras", "dunkleosteus", "megalodon"],
  mobility: ["pikaia", "haikouichthys", "tiktaalik", "ichthyosaur", "archaeopteryx", "ammonite"],
  resilience: ["trilobite", "wiwaxia", "cloudina", "hallucigenia", "coelacanth", "kimberella"],
};

export interface Species {
  /** Le nom latin : genre et épithète. */
  readonly name: string;
  /** La famille de gènes qui domine ; `null` tant que le joueur n'a aucun gène. */
  readonly family: GeneFamily | null;
  readonly cousin: FossilId;
}

/** L'espèce que la cellule du joueur est devenue. */
export function speciesOf(state: PlayerState): Species {
  // À égalité, l'ordre des familles départage : le résultat ne dépend jamais du hasard.
  const ranked = [...GENE_FAMILIES].sort(
    (one, other) => familyGenes(state, other) - familyGenes(state, one),
  );
  const top = ranked[0] ?? "metabolism";
  const family = familyGenes(state, top) > 0 ? top : null;
  const rng = createRng(
    (state.seed ^ 0x51ed270b ^ Math.imul(GENE_FAMILIES.indexOf(top) + 1, 0x9e3779b1)) >>> 0,
  );
  rng.next();
  rng.next();
  const roots = ROOTS[top];
  const genus = `${roots[rng.int(roots.length)] ?? "Proto"}${ENDINGS[Math.min(state.zone, ENDINGS.length - 1)] ?? "monas"}`;
  const epithet = state.alliance === null ? "originis" : EPITHETS[state.alliance.banner];
  const cousins = family === null ? FOSSIL_IDS : COUSINS[family];
  const cousin = cousins[rng.int(cousins.length)] ?? "trilobite";
  return { name: `${genus} ${epithet}`, family, cousin };
}
