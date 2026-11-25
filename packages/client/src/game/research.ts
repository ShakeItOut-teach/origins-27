/**
 * L'onglet Recherche : tout ce qui fait évoluer l'organisme, rangé au même endroit.
 * Chaque rubrique suit la table de déblocage : elle n'existe qu'à partir de son palier.
 */
import { isVisible } from "./unlock";

/** Les évolutions du Noyau, la recherche militaire, les gènes, le compagnon. */
export type ResearchPart = "cell" | "troops" | "genes" | "companion";

/** Les rubriques ouvertes à ce palier, dans l'ordre où on les montre. Aucune : pas d'onglet. */
export function researchParts(tier: number): ResearchPart[] {
  const parts: ResearchPart[] = [];
  if (isVisible("evolutions", tier)) parts.push("cell");
  if (isVisible("militaryResearch", tier)) parts.push("troops");
  // On achète des mutations dès que l'on chasse : les protéines les paient.
  if (isVisible("hunt", tier)) parts.push("genes");
  if (isVisible("companion", tier)) parts.push("companion");
  return parts;
}
