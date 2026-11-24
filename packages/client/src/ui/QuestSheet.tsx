import { MICRO, questIsAmount, questsRenewAt } from "@o27/core";
import type { PlayerState, Quest } from "@o27/core";
import type { Order, TextKey } from "@o27/data";
import { formatAway, translate } from "../game/text";
import type { Lang } from "../game/text";

interface Props {
  readonly state: PlayerState;
  readonly lang: Lang;
  readonly onClose: () => void;
  readonly onOrder: (order: Order) => void;
}

/** Objectif et avancement d'une quête, en unités lisibles. */
function inUnits(quest: Quest, value: number): number {
  return questIsAmount(quest.id) ? Math.floor(value / MICRO) : value;
}

/** Les quêtes du jour : trois qui rappellent les bases, et un défi facultatif. */
export function QuestSheet({ state, lang, onClose, onOrder }: Props) {
  const t = (key: TextKey): string => translate(lang, key);
  const quests = state.quests;
  if (quests === null) return null;

  const row = (quest: Quest, index: number) => {
    const done = quest.progress >= quest.target;
    const target = inUnits(quest, quest.target);
    return (
      <li
        key={index}
        className={`quest${done ? " is-done" : ""}${quest.claimed ? " is-claimed" : ""}`}
        data-testid={`quest-${String(index)}`}
      >
        <p className="quest-text">{t(`quest.${quest.id}`).replace("{n}", String(target))}</p>
        <div
          className="quest-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={inUnits(quest, quest.progress)}
        >
          <span
            style={{ width: `${String(Math.round((100 * quest.progress) / quest.target))}%` }}
          />
        </div>
        <p className="quest-count">
          {inUnits(quest, quest.progress)}/{target}
        </p>
        {done && !quest.claimed && (
          <button
            type="button"
            className="button quest-claim"
            data-testid={`claim-${String(index)}`}
            onClick={() => {
              onOrder({ type: "claimQuest", index });
            }}
          >
            {t("action.openChest")}
          </button>
        )}
        {quest.claimed && <p className="quest-opened">{t("state.chestOpened")}</p>}
      </li>
    );
  };

  const ordinary = quests.items.map((quest, index) => ({ quest, index }));

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet sheet-tall"
        role="dialog"
        aria-modal="true"
        data-testid="quests"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head sheet-head-plain">
          <div>
            <h2>{t("label.quests")}</h2>
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>
        <ul className="quest-list">
          {ordinary
            .filter(({ quest }) => !quest.challenge)
            .map(({ quest, index }) => row(quest, index))}
        </ul>
        <div className="challenge">
          <p className="challenge-head">
            <strong>{t("label.challenge")}</strong> · {t("label.challengeNote")}
          </p>
          <ul className="quest-list">
            {ordinary
              .filter(({ quest }) => quest.challenge)
              .map(({ quest, index }) => row(quest, index))}
          </ul>
        </div>
        <p className="account-note">
          {t("label.renews")} {formatAway(questsRenewAt(state) - state.now, lang)}
        </p>
      </div>
    </div>
  );
}
