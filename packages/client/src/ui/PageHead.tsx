/**
 * L'en-tête d'une page d'atlas : le numéro de planche, le titre en capitales, un double filet.
 * Les écrans de papier (rivaux, recherche) commencent tous ainsi (docs/identite/charte.md).
 */
export function PageHead(props: {
  /** « Planche III » : la place de la page dans l'atlas. */
  readonly plate: string;
  readonly title: string;
  /** Une phrase en italique sous le titre, si la page en a besoin. */
  readonly note?: string;
}) {
  return (
    <header className="page-head">
      <p className="page-plate">{props.plate}</p>
      <h2 className="page-title">{props.title}</h2>
      {props.note !== undefined && <p className="page-note">{props.note}</p>}
    </header>
  );
}
