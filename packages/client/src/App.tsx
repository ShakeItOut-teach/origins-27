import {
  MICRO,
  capacity,
  describeCreature,
  levelCost,
  levelDuration,
  productionRate,
} from "@o27/core";
import type { AbsenceSummary, PlayerState } from "@o27/core";
import { BALANCE, MAX_RELEASED_TIER, ORGANELLE_IDS, RESOURCE_IDS } from "@o27/data";
import type { MutationId, OrganelleId, ResourceId, TextKey } from "@o27/data";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CellCanvas } from "./cell/CellCanvas";
import type { Account } from "./game/api";
import type { GameStore } from "./game/store";
import { formatAmount, formatAway, formatDuration, formatRate, translate } from "./game/text";
import type { Lang } from "./game/text";
import { isVisible } from "./game/unlock";
import { AccountSheet } from "./ui/AccountSheet";
import { OrganelleIcon, ResourceIcon } from "./ui/icons";

interface Props {
  readonly store: GameStore;
  readonly lang: Lang;
  readonly onSwitchLang: () => void;
  /** Absent quand le jeu tourne sans serveur. */
  readonly account: Account | null;
}

/** Position de chaque emplacement sur la lame, en pourcentage. */
const SLOT_POSITION: Readonly<Record<OrganelleId, { left: string; top: string }>> = {
  mitochondrion: { left: "17%", top: "27%" },
  vacuole: { left: "83%", top: "27%" },
  cilia: { left: "17%", top: "73%" },
  ribosome: { left: "83%", top: "73%" },
};

function canAfford(state: PlayerState, organelle: OrganelleId, toLevel: number): boolean {
  const cost = levelCost(state, organelle, toLevel);
  return RESOURCE_IDS.every((id) => state.resources[id] >= cost[id]);
}

export function App({ store, lang, onSwitchLang, account }: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const t = (key: TextKey): string => translate(lang, key);
  const [selected, setSelected] = useState<OrganelleId | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const [touched, setTouched] = useState(state.counters.harvests > 0);
  const [fullFlash, setFullFlash] = useState(0);

  const [absenceSeen, setAbsenceSeen] = useState(false);
  const absence: AbsenceSummary | null = absenceSeen ? null : store.getAbsence();

  useEffect(() => store.start(), [store]);
  useEffect(
    () =>
      store.onEvents((events) => {
        for (const event of events) {
          if (event.type === "tierReached" && event.tier >= 1 && event.tier <= MAX_RELEASED_TIER) {
            setReveal(event.tier);
          }
        }
      }),
    [store],
  );

  const creature = useMemo(
    () => describeCreature(state),
    [state.seed, state.mutations, state.organelles],
  );
  const scene = useMemo(
    () => ({
      seed: state.seed,
      creature,
      organelles: state.organelles,
      building: state.construction?.organelle ?? null,
    }),
    [state.seed, creature, state.organelles, state.construction],
  );

  const tap = (): void => {
    setTouched(true);
    const result = store.send({ type: "harvest", taps: 1 });
    if (!result.ok && result.error === "storageFull") setFullFlash((n) => n + 1);
  };

  const show = (element: Parameters<typeof isVisible>[0]): boolean =>
    isVisible(element, state.tier);
  const counters: ResourceId[] = show("bricksCounter") ? ["sugar", "bricks"] : ["sugar"];
  const slots = ORGANELLE_IDS.filter((id) => BALANCE.organelles[id].tier <= state.tier);
  const choosing =
    absence === null && reveal === null && state.mutationOffer !== null && show("mutationChoice");

  if (!store.isReady()) {
    return <main className="page" data-tier="loading" aria-busy="true" />;
  }

  return (
    <main className="page" data-tier={state.tier}>
      <button
        type="button"
        className="lang"
        aria-label={t("action.switchLanguage")}
        data-testid="lang"
        onClick={onSwitchLang}
      >
        {lang === "fr" ? "EN" : "FR"}
      </button>
      {account !== null && (
        <button
          type="button"
          className="account-open"
          aria-label={t("account.open")}
          data-testid="account-open"
          onClick={() => {
            setAccountOpen(true);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </svg>
        </button>
      )}
      {account !== null && accountOpen && (
        <AccountSheet
          account={account}
          lang={lang}
          onClose={() => {
            setAccountOpen(false);
          }}
        />
      )}
      <header className="counters">
        {counters.map((id) => {
          const full = state.resources[id] >= capacity(state, id);
          const rate = productionRate(state, id);
          return (
            <div
              key={id === "sugar" ? `${id}-${String(fullFlash)}` : id}
              className={`counter${full ? " is-full" : ""}${id === "sugar" && fullFlash > 0 && full ? " shake" : ""}`}
              data-testid={`counter-${id}`}
            >
              <ResourceIcon id={id} />
              <span className="counter-value">{formatAmount(state.resources[id], lang)}</span>
              <span className="counter-label">{full ? t("state.full") : t(`resource.${id}`)}</span>
              {show("productionRate") && rate > 0 && (
                <span className="counter-rate">
                  +{formatRate(rate, lang)} {t("label.perSecond")}
                </span>
              )}
            </div>
          );
        })}
      </header>

      <section className="lens">
        <CellCanvas scene={scene} label={t("label.cell")} onTap={tap} />
        {!touched && state.counters.harvests === 0 && <p className="hint">{t("hint.tap")}</p>}
        {show("buildSlots") &&
          slots.map((id) => {
            const level = state.organelles[id];
            const building = state.construction?.organelle === id ? state.construction : null;
            const ready =
              level === 0 && state.construction === null && canAfford(state, id, 1) && !building;
            return (
              <button
                key={id}
                type="button"
                className={`slot${level > 0 ? " is-built" : ""}${building ? " is-building" : ""}${ready ? " is-ready" : ""}`}
                style={SLOT_POSITION[id]}
                aria-label={t(`organelle.${id}.name`)}
                data-testid={`slot-${id}`}
                onClick={() => {
                  setSelected(id);
                }}
              >
                {level > 0 || building ? (
                  <OrganelleIcon id={id} />
                ) : (
                  <span className="plus">+</span>
                )}
                {building && show("constructionTimer") && (
                  <span className="slot-timer">{formatDuration(building.endsAt - state.now)}</span>
                )}
              </button>
            );
          })}
      </section>

      {selected !== null && (
        <OrganelleSheet
          state={state}
          id={selected}
          lang={lang}
          canUpgrade={show("upgradeButton")}
          onClose={() => {
            setSelected(null);
          }}
          onAct={(order) => {
            if (store.send(order).ok) setSelected(null);
          }}
        />
      )}

      {absence !== null && (
        <div className="veil" role="dialog" aria-modal="true">
          <div className="note" data-testid="absence">
            <h2>{t("absence.title")}</h2>
            <p>
              {t("absence.away")} {formatAway(absence.elapsedMs, lang)}
            </p>
            <ul className="absence-list">
              {RESOURCE_IDS.filter((id) => absence.gained[id] >= MICRO).map((id) => (
                <li key={id}>
                  <ResourceIcon id={id} />+{formatAmount(absence.gained[id], lang)}{" "}
                  {t(`resource.${id}`)}
                </li>
              ))}
              {absence.constructionsDone.map((done) => (
                <li key={done.organelle}>
                  <OrganelleIcon id={done.organelle} />
                  {t(`organelle.${done.organelle}.name`)} · {t("absence.built")}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="button"
              onClick={() => {
                setAbsenceSeen(true);
              }}
            >
              {t("action.continue")}
            </button>
          </div>
        </div>
      )}

      {absence === null && reveal !== null && (
        <div className="veil" role="dialog" aria-modal="true">
          <div className="note" data-testid="reveal">
            <h2>{t(`unlock.${String(reveal)}.title` as TextKey)}</h2>
            <p>{t(`unlock.${String(reveal)}.text` as TextKey)}</p>
            <button
              type="button"
              className="button"
              onClick={() => {
                setReveal(null);
              }}
            >
              {t("action.continue")}
            </button>
          </div>
        </div>
      )}

      {choosing && (
        <MutationChoice
          options={state.mutationOffer}
          lang={lang}
          onChoose={(mutation) => {
            store.send({ type: "chooseMutation", mutation });
          }}
        />
      )}
    </main>
  );
}

interface SheetProps {
  readonly state: PlayerState;
  readonly id: OrganelleId;
  readonly lang: Lang;
  readonly canUpgrade: boolean;
  readonly onClose: () => void;
  readonly onAct: (
    order: { type: "build"; organelle: OrganelleId } | { type: "upgrade"; organelle: OrganelleId },
  ) => void;
}

function OrganelleSheet({ state, id, lang, canUpgrade, onClose, onAct }: SheetProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const level = state.organelles[id];
  const building = state.construction?.organelle === id ? state.construction : null;
  const maxed = level >= BALANCE.organelles[id].maxLevel;
  const offersAction = !building && (level === 0 || (canUpgrade && !maxed));
  const toLevel = level + 1;
  const cost = levelCost(state, id, toLevel);
  const affordable = canAfford(state, id, toLevel) && state.construction === null;

  return (
    <div className="veil veil-bottom" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        data-testid="sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-head">
          <span className="sheet-icon">
            <OrganelleIcon id={id} />
          </span>
          <div>
            <h2>{t(`organelle.${id}.name`)}</h2>
            {level > 0 && canUpgrade && (
              <p className="sheet-level">
                {t("label.level")} {level}
              </p>
            )}
          </div>
          <button type="button" className="close" aria-label={t("action.close")} onClick={onClose}>
            ×
          </button>
        </div>
        <p className="sheet-role">{t(`organelle.${id}.role`)}</p>

        {building && (
          <p className="sheet-building">
            {t("state.building")} · {formatDuration(building.endsAt - state.now)}
          </p>
        )}

        {offersAction && (
          <>
            <div className="costs">
              {RESOURCE_IDS.filter((resource) => cost[resource] > 0).map((resource) => (
                <span
                  key={resource}
                  className={`cost${state.resources[resource] < cost[resource] ? " is-missing" : ""}`}
                >
                  <ResourceIcon id={resource} />
                  {formatAmount(cost[resource], lang)}
                </span>
              ))}
              <span className="cost cost-time">
                {formatDuration(levelDuration(state, id, toLevel))}
              </span>
            </div>
            <button
              type="button"
              className="button"
              disabled={!affordable}
              data-testid="sheet-action"
              onClick={() => {
                onAct({ type: level === 0 ? "build" : "upgrade", organelle: id });
              }}
            >
              {level === 0 ? t("action.build") : t("action.upgrade")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface ChoiceProps {
  readonly options: readonly MutationId[];
  readonly lang: Lang;
  readonly onChoose: (mutation: MutationId) => void;
}

function MutationChoice({ options, lang, onChoose }: ChoiceProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const [picked, setPicked] = useState<MutationId | null>(null);
  return (
    <div className="veil" role="dialog" aria-modal="true">
      <div className="note note-wide" data-testid="mutation-choice">
        <h2>{t("unlock.2.text")}</h2>
        <div className="mutations">
          {options.map((id) => (
            <button
              key={id}
              type="button"
              className={`mutation${picked === id ? " is-picked" : ""}`}
              aria-pressed={picked === id}
              data-testid={`mutation-${id}`}
              onClick={() => {
                setPicked(id);
              }}
            >
              <strong>{t(`mutation.${id}.name`)}</strong>
              <span>{t(`mutation.${id}.effect`)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button"
          disabled={picked === null}
          data-testid="mutation-confirm"
          onClick={() => {
            if (picked !== null) onChoose(picked);
          }}
        >
          {t("action.choose")}
        </button>
      </div>
    </div>
  );
}
