import {
  MICRO,
  nextMutationPrice,
  companionForm,
  leagueOf,
  mutationPool,
  nextOpening,
  ranking,
  rivalName as nameOfRival,
  seasonDay,
  totalPower,
  upkeepRate,
  capacity,
  describeCreature,
  levelCost,
  levelDuration,
  productionRate,
} from "@o27/core";
import type { AbsenceSummary, PlayerState } from "@o27/core";
import { BALANCE, MAX_RELEASED_TIER, ORGANELLE_IDS, RESOURCE_IDS, SEASON_DAYS } from "@o27/data";
import type {
  ChestReward,
  EvolutionId,
  GeneFamily,
  MutationId,
  Order,
  OrganelleId,
  ResourceId,
  TextKey,
} from "@o27/data";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CellCanvas } from "./cell/CellCanvas";
import type { Account } from "./game/api";
import type { GameStore } from "./game/store";
import {
  formatAmount,
  formatAway,
  formatCountdown,
  formatDuration,
  formatRate,
  saveScience,
  savedScience,
  setScience,
  translate,
} from "./game/text";
import type { Lang } from "./game/text";
import { isVisible } from "./game/unlock";
import { AccountSheet } from "./ui/AccountSheet";
import { EnergyIcon, OrganelleIcon, ResourceIcon } from "./ui/icons";
import { MapView } from "./ui/MapView";
import { CalendarSheet, openingName } from "./ui/CalendarSheet";
import { CompanionSheet, companionName } from "./ui/CompanionSheet";
import { EvolutionPanel } from "./ui/EvolutionPanel";
import { GenomeSheet } from "./ui/GenomeSheet";
import { LexiconSheet } from "./ui/LexiconSheet";
import { QuestSheet } from "./ui/QuestSheet";
import { RankingSheet } from "./ui/RankingSheet";
import { RaidBubble } from "./ui/RaidBubble";
import { RivalsView } from "./ui/RivalsView";
import { TroopPanel } from "./ui/TroopPanel";

interface Props {
  readonly store: GameStore;
  readonly lang: Lang;
  readonly onSwitchLang: () => void;
  /** Absent quand le jeu tourne sans serveur. */
  readonly account: Account | null;
}

/** Position de chaque emplacement sur la lame, en pourcentage. */
const SLOT_POSITION: Readonly<Record<OrganelleId, { left: string; top: string }>> = {
  wall: { left: "50%", top: "9%" },
  vacuole: { left: "76%", top: "19%" },
  golgi: { left: "90%", top: "43%" },
  ribosome: { left: "85%", top: "70%" },
  nursery: { left: "64%", top: "88%" },
  lysosome: { left: "36%", top: "88%" },
  cilia: { left: "15%", top: "70%" },
  nucleus: { left: "10%", top: "43%" },
  mitochondrion: { left: "24%", top: "19%" },
};

/** La teinte du compagnon : celle de la famille qui l'a façonné. */
const FAMILY_HUE: Readonly<Record<GeneFamily | "none", number>> = {
  none: 280,
  metabolism: 42,
  predation: 352,
  mobility: 165,
  resilience: 212,
};

function canAfford(state: PlayerState, organelle: OrganelleId, toLevel: number): boolean {
  const cost = levelCost(state, organelle, toLevel);
  return RESOURCE_IDS.every((id) => state.resources[id] >= cost[id]);
}

export function App({ store, lang, onSwitchLang, account }: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [view, setView] = useState<"cell" | "map" | "rivals">("cell");
  /** Résultat de la dernière attaque rentrée, et dernière attaque subie. */
  const [raidNote, setRaidNote] = useState<{
    won: boolean;
    gained: Readonly<Record<ResourceId, number>>;
    losses: number;
  } | null>(null);
  const [attackNote, setAttackNote] = useState<{
    rival: string;
    repelled: boolean;
    sugar: number;
    bricks: number;
    proteins: number;
    troopsLost: number;
  } | null>(null);
  /** Butin perdu au dernier retour, faute de place : on le dit, une fois. */
  const [loss, setLoss] = useState<{ resource: ResourceId; amount: number } | null>(null);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [genomeOpen, setGenomeOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [tamed, setTamed] = useState(false);
  /** Dernière évolution exprimée : on le dit, une fois. */
  const [evolved, setEvolved] = useState<{ evolution: EvolutionId; level: number } | null>(null);
  /** Cellules filles mortes de faim depuis la dernière note. */
  const [starved, setStarved] = useState(0);
  /** Dernière récompense de ligue reçue. */
  const [leagueNote, setLeagueNote] = useState<{
    league: number;
    loot: Readonly<Record<ResourceId, number>>;
  } | null>(null);
  // Vrais termes de la biologie ou mots simples : le choix du joueur, gardé sur l'appareil.
  const [science, setScienceChoice] = useState(() => savedScience(window.localStorage) ?? true);
  const [termsAsked, setTermsAsked] = useState(() => savedScience(window.localStorage) !== null);
  const [lexiconOpen, setLexiconOpen] = useState(false);
  setScience(science);
  /** Contenu du dernier coffre ouvert. */
  const [chest, setChest] = useState<Readonly<Partial<Record<ChestReward, number>>> | null>(null);
  /** Résultat de la dernière chasse rentrée. */
  const [huntNote, setHuntNote] = useState<{
    won: boolean;
    gained: number;
    losses: number;
  } | null>(null);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const t = (key: TextKey): string => translate(lang, key);
  const [selected, setSelected] = useState<OrganelleId | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const [touched, setTouched] = useState(state.counters.harvests > 0);
  const [fullFlash, setFullFlash] = useState(0);

  const [absenceSeen, setAbsenceSeen] = useState(false);
  const absence: AbsenceSummary | null = absenceSeen ? null : store.getAbsence();

  useEffect(
    () =>
      store.onEvents((events) => {
        for (const event of events) {
          if (event.type === "tierReached" && event.tier >= 1 && event.tier <= MAX_RELEASED_TIER) {
            setReveal(event.tier);
          }
          if (event.type === "expeditionReturned" && event.lost >= MICRO) {
            setLoss({ resource: event.resource, amount: event.lost });
          }
          if (event.type === "chestOpened") setChest(event.loot);
          if (event.type === "companionTamed") setTamed(true);
          if (event.type === "evolutionDone") {
            setEvolved({ evolution: event.evolution, level: event.level });
          }
          if (event.type === "troopsStarved") {
            const dead = event.count;
            setStarved((count) => count + dead);
          }
          if (event.type === "leagueReward") {
            setLeagueNote({ league: event.league, loot: event.loot });
          }
          if (event.type === "raidReturned" && !event.cancelled) {
            setRaidNote({ won: event.won, gained: event.gained, losses: event.losses });
          }
          if (event.type === "attackRepelled") {
            setAttackNote({
              rival: event.rival,
              repelled: true,
              sugar: 0,
              bricks: 0,
              proteins: 0,
              troopsLost: 0,
            });
          }
          if (event.type === "attackSuffered") {
            setAttackNote({
              rival: event.rival,
              repelled: false,
              sugar: event.sugar,
              bricks: event.bricks,
              proteins: event.proteins,
              troopsLost: event.troopsLost,
            });
          }
          if (event.type === "huntReturned" && !event.cancelled) {
            setHuntNote({ won: event.won, gained: event.gained, losses: event.losses });
          }
        }
      }),
    [store],
  );

  // Après l'abonnement ci-dessus, pour ne manquer aucun événement du premier tic.
  useEffect(() => store.start(), [store]);

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
      researching: state.research !== null,
      companion:
        state.companion === null
          ? null
          : {
              species: state.companion.species,
              stage: companionForm(state.companion).stage,
              hue: FAMILY_HUE[companionForm(state.companion).family ?? "none"],
            },
    }),
    [state.seed, creature, state.organelles, state.construction, state.research, state.companion],
  );

  const tap = (): void => {
    setTouched(true);
    const result = store.send({ type: "harvest", taps: 1 });
    if (!result.ok && result.error === "storageFull") setFullFlash((n) => n + 1);
  };

  const show = (element: Parameters<typeof isVisible>[0]): boolean =>
    isVisible(element, state.tier);
  const counters: ResourceId[] = ["sugar"];
  if (show("bricksCounter")) counters.push("bricks");
  if (show("hunt")) counters.push("proteins");
  const hunt = state.hunt;
  /** Le groupe est face à la proie : le joueur peut la toucher. */
  const strikeLeft =
    hunt !== null && !hunt.cancelled && hunt.outcome === null && state.now >= hunt.arrivesAt
      ? hunt.resolveAt - state.now
      : null;
  const quests = show("dailyQuests") ? state.quests : null;
  const chestsReady = (quests?.items ?? []).filter(
    (quest) => !quest.claimed && quest.progress >= quest.target,
  ).length;
  const questsDone = (quests?.items ?? []).filter((quest) => quest.progress >= quest.target).length;
  const mutationPrice = nextMutationPrice(state);
  const canMutate = show("hunt") && state.mutationOffer === null && mutationPool(state).length > 0;
  const slots = ORGANELLE_IDS.filter((id) => BALANCE.organelles[id].tier <= state.tier);
  const choosing =
    absence === null && reveal === null && state.mutationOffer !== null && show("mutationChoice");

  const onMap = view === "map" && show("map");
  const onRivals = view === "rivals" && show("rivals");
  const views: ("cell" | "map" | "rivals")[] = show("rivals")
    ? ["cell", "map", "rivals"]
    : ["cell", "map"];
  const raid = state.raid;
  /** Le groupe se bat chez un rival : le joueur peut l'aider. */
  const raidStrikeLeft =
    raid !== null && !raid.cancelled && raid.outcome === null && state.now >= raid.arrivesAt
      ? raid.resolveAt - state.now
      : null;
  const rivalName = (id: string): string => nameOfRival(state, id);
  const powerRank = ranking(state, "power");
  const upcoming = nextOpening(state);

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
      <p className="season-day" data-testid="season-day">
        {t("label.day").replace("{n}", String(Math.min(SEASON_DAYS, seasonDay(state, state.now))))}
        <small> / {SEASON_DAYS}</small>
      </p>
      <button
        type="button"
        className="lang lexicon-open"
        aria-label={t("action.lexicon")}
        data-testid="lexicon-open"
        onClick={() => {
          setLexiconOpen(true);
        }}
      >
        Aa
      </button>
      {(lexiconOpen || (!termsAsked && state.tier >= 1 && absence === null && reveal === null)) && (
        <LexiconSheet
          lang={lang}
          onClose={() => {
            saveScience(window.localStorage, science);
            setTermsAsked(true);
            setLexiconOpen(false);
          }}
          onChoose={(value) => {
            saveScience(window.localStorage, value);
            setTermsAsked(true);
            setScienceChoice(value);
          }}
        />
      )}
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
          // Ce que la cellule gagne vraiment : sa production, moins ce que mangent les troupes.
          const rate = productionRate(state, id) - (id === "sugar" ? upkeepRate(state) : 0);
          return (
            <div
              key={id === "sugar" ? `${id}-${String(fullFlash)}` : id}
              className={`counter${full ? " is-full" : ""}${id === "sugar" && fullFlash > 0 && full ? " shake" : ""}`}
              data-testid={`counter-${id}`}
            >
              <ResourceIcon id={id} />
              <span className="counter-value">{formatAmount(state.resources[id], lang)}</span>
              <span className="counter-label">{full ? t("state.full") : t(`resource.${id}`)}</span>
              {show("productionRate") && rate !== 0 && (
                <span className={`counter-rate${rate < 0 ? " is-negative" : ""}`}>
                  {rate > 0 ? "+" : "−"}
                  {formatRate(Math.abs(rate), lang)}
                  {show("energy") ? "/s" : ` ${t("label.perSecond")}`}
                </span>
              )}
            </div>
          );
        })}
        {show("energy") && (
          <div className="counter counter-energy" data-testid="counter-energy">
            <EnergyIcon />
            <span className="counter-value">
              {state.energy}
              <small>/{BALANCE.energy.max}</small>
            </span>
            <span className="counter-label">{t("label.energy")}</span>
            {state.energy < BALANCE.energy.max && (
              <span className="counter-rate" data-testid="energy-next">
                +1 ·{" "}
                {formatDuration(state.energyAt + BALANCE.energy.regenSeconds * 1000 - state.now)}
              </span>
            )}
          </div>
        )}
      </header>

      {show("calendar") && upcoming !== null && (
        <button
          type="button"
          className="season-next"
          data-testid="season-next"
          onClick={() => {
            setCalendarOpen(true);
          }}
        >
          <span className="season-next-label">{t("label.nextOpening")}</span>
          <strong>{openingName(lang, upcoming)}</strong>
          <span className="season-next-left">
            {t("label.in")} {formatCountdown(upcoming.at - state.now, lang)}
          </span>
        </button>
      )}
      {show("calendar") && calendarOpen && (
        <CalendarSheet
          state={state}
          lang={lang}
          onClose={() => {
            setCalendarOpen(false);
          }}
        />
      )}
      {show("map") && (
        <MapView
          hidden={!onMap}
          state={state}
          hue={creature.hue}
          lang={lang}
          showPrey={show("hunt")}
          showWorld={show("worldMap")}
          showPredators={show("predators")}
          onOrder={(order) => store.send(order).ok}
        />
      )}

      {onRivals && (
        <RivalsView state={state} lang={lang} onOrder={(order) => store.send(order).ok} />
      )}

      <section className="lens" hidden={onMap || onRivals}>
        <CellCanvas scene={scene} label={t("label.cell")} onTap={tap} />
        <span className="scale-bar" aria-hidden="true">
          10 µm
        </span>
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

      {show("map") && (
        <div className="views" role="tablist">
          {views.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={`view${view === id ? " is-on" : ""}`}
              data-testid={`view-${id}`}
              onClick={() => {
                setView(id);
              }}
            >
              {t(`view.${id}`)}
            </button>
          ))}
        </div>
      )}

      {show("ranking") && (
        <button
          type="button"
          className="quests-open ranking-open"
          data-testid="ranking-open"
          onClick={() => {
            setRankingOpen(true);
          }}
        >
          {t("label.power")} <strong>{totalPower(state)}</strong>
          <span className="badge">
            {t(
              `league.${String(leagueOf(powerRank.mine.rank, powerRank.rows.length))}.name` as TextKey,
            )}{" "}
            · {powerRank.mine.rank}
          </span>
        </button>
      )}
      {show("ranking") && rankingOpen && (
        <RankingSheet
          state={state}
          lang={lang}
          onClose={() => {
            setRankingOpen(false);
          }}
        />
      )}
      {evolved !== null && (
        <div className="loss is-good" role="status" data-testid="evolution-note">
          <strong>{t("evolution.done")}</strong>
          <span>
            {t(`evolution.${evolved.evolution}.name`)} · {t("label.level")} {evolved.level}
          </span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setEvolved(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      {starved > 0 && (
        <div className="loss" role="status" data-testid="starve-note">
          <strong>{t("starve.title")}</strong>
          <span>
            {t("starve.text")} : {starved}
          </span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setStarved(0);
            }}
          >
            ×
          </button>
        </div>
      )}
      {leagueNote !== null && (
        <div className="loss is-good is-chest" role="status" data-testid="league-note">
          <strong>
            {t("league.note")} · {t(`league.${String(leagueNote.league)}.name` as TextKey)}
          </strong>
          <span className="chest-loot">
            {(["sugar", "bricks", "proteins"] as const).map((id) => (
              <span key={id}>
                <ResourceIcon id={id} />+{formatAmount(leagueNote.loot[id], lang)}
              </span>
            ))}
          </span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setLeagueNote(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      {quests !== null && (
        <button
          type="button"
          className={`quests-open${chestsReady > 0 ? " has-chest" : ""}`}
          data-testid="quests-open"
          onClick={() => {
            setQuestsOpen(true);
          }}
        >
          {t("label.quests")} · {questsDone}/{quests.items.length}
          {chestsReady > 0 && (
            <span className="badge">
              {t("label.chestReady")} {chestsReady}
            </span>
          )}
        </button>
      )}
      {quests !== null && questsOpen && (
        <QuestSheet
          state={state}
          lang={lang}
          onClose={() => {
            setQuestsOpen(false);
          }}
          onOrder={(order) => {
            store.send(order);
          }}
        />
      )}

      {chest !== null && (
        <div className="loss is-good is-chest" role="status" data-testid="chest-note">
          <strong>{t("chest.title")}</strong>
          <span className="chest-loot">
            {(["sugar", "bricks", "proteins"] as const)
              .filter((id) => chest[id] !== undefined)
              .map((id) => (
                <span key={id}>
                  <ResourceIcon id={id} />+{chest[id]}
                </span>
              ))}
            {chest.energy !== undefined && (
              <span>
                <EnergyIcon />+{chest.energy} {t("chest.energy")}
              </span>
            )}
          </span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setChest(null);
            }}
          >
            ×
          </button>
        </div>
      )}

      {show("genome") && (
        <button
          type="button"
          className="quests-open genome-open"
          data-testid="genome-open"
          onClick={() => {
            setGenomeOpen(true);
          }}
        >
          {t("label.genome")}
          <span className="badge">
            {state.mutations.length} {t("label.genes")}
          </span>
        </button>
      )}
      {show("genome") && genomeOpen && (
        <GenomeSheet
          state={state}
          lang={lang}
          onClose={() => {
            setGenomeOpen(false);
          }}
        />
      )}
      {show("companion") && (
        <button
          type="button"
          className="quests-open companion-open"
          data-testid="companion-open"
          onClick={() => {
            setCompanionOpen(true);
          }}
        >
          {t("label.companion")}
          {state.companion !== null && (
            <span className="badge">{companionName(lang, state.companion)}</span>
          )}
        </button>
      )}
      {show("companion") && companionOpen && (
        <CompanionSheet
          state={state}
          lang={lang}
          onClose={() => {
            setCompanionOpen(false);
          }}
          onOrder={(order) => {
            if (store.send(order).ok && order.type === "releaseCompanion") setCompanionOpen(false);
          }}
        />
      )}
      {tamed && state.companion !== null && (
        <div className="loss is-good" role="status" data-testid="companion-note">
          <strong>{t("companion.tamed")}</strong>
          <span>{companionName(lang, state.companion)}</span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setTamed(false);
            }}
          >
            ×
          </button>
        </div>
      )}
      {canMutate && (
        <button
          type="button"
          className="mutate"
          disabled={state.resources.proteins < mutationPrice}
          data-testid="mutate"
          onClick={() => {
            store.send({ type: "buyMutation" });
          }}
        >
          {t("action.mutate")} · <ResourceIcon id="proteins" />
          {formatAmount(mutationPrice, lang)}
        </button>
      )}

      {strikeLeft !== null && (
        <button
          type="button"
          className="strike"
          data-testid="strike"
          onClick={() => {
            store.send({ type: "strikeHunt" });
          }}
        >
          <strong>{t("action.strike")}</strong>
          <span>
            {t("hunt.strikeHint")} · {formatDuration(strikeLeft)}
          </span>
        </button>
      )}

      {raidStrikeLeft !== null && (
        <>
          <div className="strike is-hint" role="status" data-testid="strike-raid">
            <strong>{t("action.strikeRaid")}</strong>
            <span>
              {t("raid.strikeHint")} {raid === null ? "" : rivalName(raid.rival)} ·{" "}
              {formatDuration(raidStrikeLeft)}
            </span>
          </div>
          {raid !== null && (
            <RaidBubble
              key={raid.arrivesAt}
              fightStart={raid.arrivesAt}
              elapsedMs={state.now - raid.arrivesAt}
              label={t("label.bubble")}
              onCatch={() => {
                store.send({ type: "strikeRaid" });
              }}
            />
          )}
        </>
      )}

      {raidNote !== null && (
        <div
          className={`loss${raidNote.won ? " is-good" : ""}`}
          role="status"
          data-testid="raid-note"
        >
          <strong>{raidNote.won ? t("raid.won") : t("raid.lost")}</strong>
          <span className="chest-loot">
            {raidNote.won &&
              (["sugar", "bricks", "proteins"] as const)
                .filter((id) => raidNote.gained[id] >= MICRO)
                .map((id) => (
                  <span key={id}>
                    <ResourceIcon id={id} />+{formatAmount(raidNote.gained[id], lang)}
                  </span>
                ))}
            <span>
              {t("hunt.losses")} : {raidNote.losses}
            </span>
          </span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setRaidNote(null);
            }}
          >
            ×
          </button>
        </div>
      )}

      {attackNote !== null && (
        <div
          className={`loss${attackNote.repelled ? " is-good" : ""}`}
          role="status"
          data-testid="attack-note"
        >
          <strong>
            {attackNote.repelled ? t("incoming.repelled") : t("incoming.suffered")}{" "}
            {rivalName(attackNote.rival)}
          </strong>
          {!attackNote.repelled && (
            <span className="chest-loot">
              {t("incoming.lost")} :
              <span>
                <ResourceIcon id="sugar" />
                {formatAmount(attackNote.sugar, lang)}
              </span>
              <span>
                <ResourceIcon id="bricks" />
                {formatAmount(attackNote.bricks, lang)}
              </span>
              {attackNote.proteins >= MICRO && (
                <span>
                  <ResourceIcon id="proteins" />
                  {formatAmount(attackNote.proteins, lang)}
                </span>
              )}
              <span>
                {t("hunt.losses")} : {attackNote.troopsLost}
              </span>
            </span>
          )}
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setAttackNote(null);
            }}
          >
            ×
          </button>
        </div>
      )}

      {huntNote !== null && (
        <div
          className={`loss${huntNote.won ? " is-good" : ""}`}
          role="status"
          data-testid="hunt-note"
        >
          <strong>
            {huntNote.won ? t("hunt.won") : t("hunt.lost")}
            {huntNote.won && (
              <>
                {" · "}
                <ResourceIcon id="proteins" />+{formatAmount(huntNote.gained, lang)}
              </>
            )}
          </strong>
          <span>
            {t("hunt.losses")} : {huntNote.losses}
          </span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setHuntNote(null);
            }}
          >
            ×
          </button>
        </div>
      )}

      {loss !== null && (
        <div className="loss" role="status" data-testid="loss">
          <strong>
            {t("loss.title")} · <ResourceIcon id={loss.resource} />
            {formatAmount(loss.amount, lang)}
          </strong>
          <span>{t("loss.text")}</span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setLoss(null);
            }}
          >
            ×
          </button>
        </div>
      )}

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
          onOrder={(order) => {
            store.send(order);
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
              {(absence.expeditionsBack as number | undefined) !== undefined &&
                absence.expeditionsBack > 0 && (
                  <li>
                    {t("absence.expedition")}
                    {absence.expeditionsBack > 1 ? ` × ${String(absence.expeditionsBack)}` : ""}
                  </li>
                )}
              {((absence.attacksRepelled as number | undefined) ?? 0) > 0 && (
                <li>
                  {t("absence.repelled")} : {absence.attacksRepelled}
                </li>
              )}
              {((absence.troopsStarved as number | undefined) ?? 0) > 0 && (
                <li>
                  {t("absence.starved")} : {absence.troopsStarved}
                </li>
              )}
              {((absence.attacksSuffered as number | undefined) ?? 0) > 0 && (
                <li>
                  {t("absence.suffered")} : {absence.attacksSuffered}
                </li>
              )}
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
                // La carte vient de s'ouvrir : on y emmène le joueur.
                if (reveal === 3 || reveal === 6) setView("map");
                if (reveal === 5) setView("rivals");
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
          families={show("genome")}
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
  /** Un ordre qui laisse la fiche ouverte (faire naître une cellule fille). */
  readonly onOrder: (order: Order) => void;
  readonly onClose: () => void;
  readonly onAct: (
    order: { type: "build"; organelle: OrganelleId } | { type: "upgrade"; organelle: OrganelleId },
  ) => void;
}

function OrganelleSheet({ state, id, lang, canUpgrade, onClose, onAct, onOrder }: SheetProps) {
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
        {id === "nursery" && level > 0 && (
          <TroopPanel state={state} lang={lang} onOrder={onOrder} />
        )}
        {id === "nucleus" && level > 0 && (
          <EvolutionPanel state={state} lang={lang} onOrder={onOrder} />
        )}

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
  /** Les familles de gènes ne se montrent qu'à leur palier. */
  readonly families: boolean;
  readonly lang: Lang;
  readonly onChoose: (mutation: MutationId) => void;
}

function MutationChoice({ options, families, lang, onChoose }: ChoiceProps) {
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
              {families && (
                <small className="mutation-family" data-testid={`mutation-family-${id}`}>
                  {t(`family.${BALANCE.mutations[id].family}.name`)}
                </small>
              )}
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
