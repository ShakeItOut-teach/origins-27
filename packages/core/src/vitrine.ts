/**
 * La vitrine d'un joueur : ce que les autres humains de la saison voient de lui. Calculée ici,
 * par les règles, pour que le serveur montre exactement ce que l'écran du joueur affiche.
 */
import { GENE_FAMILIES, RANKING_IDS } from "@o27/data";
import type { GeneFamily, RankingId } from "@o27/data";
import { contestProgress } from "./contest";
import { humansBySlot } from "./crowd";
import { familyGenes } from "./genes";
import { organismHue } from "./ocean";
import { playerScore } from "./power";
import { protectedUntil } from "./rivals";
import { speciesOf } from "./species";
import type { HumanCard, PlayerState } from "./types";

/** La famille la plus travaillée ; à égalité, l'ordre des familles départage. */
export function topFamily(state: PlayerState): HumanCard["family"] {
  let best: HumanCard["family"] = null;
  let most = 0;
  for (const family of GENE_FAMILIES) {
    const genes = familyGenes(state, family);
    if (genes > most) {
      best = family;
      most = genes;
    }
  }
  return best;
}

export function humanCard(state: PlayerState): HumanCard {
  const scores = {} as Record<RankingId, number>;
  for (const id of RANKING_IDS) scores[id] = playerScore(state, id);
  return {
    slot: state.slot,
    name: speciesOf(state).name,
    hue: organismHue(state.worldSeed, state.slot),
    tier: state.tier,
    zone: state.zone,
    scores,
    week: state.contest?.week ?? 0,
    contest: contestProgress(state),
    seenAt: state.now,
    family: topFamily(state),
    banner: state.alliance?.banner ?? null,
    given: state.alliance?.points ?? 0,
    shield: protectedUntil(state, state.now),
  };
}

/**
 * En dessous, la part des familles n'est pas publiée : elle désignerait presque chaque joueur,
 * et ne dirait rien de l'océan.
 */
const FAMILY_MIN_HUMANS = 3;

/**
 * La part de chaque famille de gènes chez les espèces humaines de la saison, le joueur compris,
 * en pourcentage. `null` tant que trop peu d'humains ont des gènes.
 */
export function humanFamilies(state: PlayerState): Readonly<Record<GeneFamily, number>> | null {
  const counts = Object.fromEntries(GENE_FAMILIES.map((family) => [family, 0])) as Record<
    GeneFamily,
    number
  >;
  let total = 0;
  const count = (family: GeneFamily | null): void => {
    if (family === null) return;
    counts[family] += 1;
    total += 1;
  };
  count(topFamily(state));
  for (const card of humansBySlot(state).values()) count(card.family);
  if (total < FAMILY_MIN_HUMANS) return null;
  const shares = {} as Record<GeneFamily, number>;
  for (const family of GENE_FAMILIES) shares[family] = Math.round((100 * counts[family]) / total);
  return shares;
}
