/**
 * Les teintes de la planche noire, pour tout ce qui est dessiné par PixiJS (la cellule, la
 * goutte, l'océan). Ce sont les valeurs de `theme/tokens.css` (`--plate`, `--bone`, `--paper`,
 * `--ink` et les `--plate-*`), écrites ici en nombres parce que PixiJS ne lit pas les jetons.
 * Règles : docs/identite/charte.md, « La planche noire ».
 */
export const PLATE = {
  /** Le fond. */
  ground: 0x14110e,
  /** Le trait de la gravure, et le texte. */
  bone: 0xf1ebdd,
  /** La terre ferme : du papier au milieu de l'eau noire. */
  paper: 0xede6d6,
  ink: 0x1e1b18,
  // Les lavis, éclaircis pour rester lisibles sur le noir.
  gamboge: 0xe6b94a,
  prussian: 0x8fb4cf,
  verdigris: 0x8dbfaf,
  madder: 0xd98ba6,
  moss: 0xb9c48a,
  // Sur la terre ferme, qui est en papier, on retrouve les teintes du papier.
  /** La forêt : le vert-de-gris (`--verdigris`). */
  forest: 0x356b5e,
  /** L'eau douce, lac et rivière : le bleu de Prusse (`--prussian`). */
  water: 0x1d4f73,
} as const;

/** Mélange deux couleurs : `part` vaut 0 pour la première, 1 pour la seconde. */
export function blend(from: number, to: number, part: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * part) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}
