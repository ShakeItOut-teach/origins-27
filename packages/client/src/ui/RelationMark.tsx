/**
 * Allié, neutre ou ennemi : la pastille posée devant un nom (bleu, blanc, rouge). Rien tant que
 * le joueur n'a pas d'alliance. La forme change aussi : rond plein, rond vide, losange.
 */
import type { Relation } from "@o27/core";
import { translate } from "../game/text";
import type { Lang } from "../game/text";

export function RelationMark({
  relation,
  lang,
}: {
  readonly relation: Relation | null;
  readonly lang: Lang;
}) {
  if (relation === null) return null;
  const label = translate(lang, `relation.${relation}`);
  return (
    <span
      className={`relation is-${relation}`}
      role="img"
      aria-label={label}
      title={label}
      data-relation={relation}
    />
  );
}

/** La légende des trois pastilles. */
export function RelationLegend({ lang }: { readonly lang: Lang }) {
  const relations: readonly Relation[] = ["ally", "neutral", "enemy"];
  return (
    <p className="relation-legend" data-testid="relation-legend">
      {relations.map((relation) => (
        <span key={relation}>
          <RelationMark relation={relation} lang={lang} />
          {translate(lang, `relation.${relation}.plural`)}
        </span>
      ))}
    </p>
  );
}
