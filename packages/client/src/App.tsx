import {
  MICRO,
  crisisOf,
  crisisRate,
  speciesOf,
  maxLevelOf,
  nucleusCap,
  nucleusPercent,
  isHigherLevel,
  plannedLevel,
  queueHasRoom,
  allianceToday,
  contestBoard,
  attackWarning,
  helpRequests,
  leviathanThreat,
  playerAnoxia,
  visibleEvents,
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
  BannerId,
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
import type { Community } from "./game/community";
import type { Installer } from "./game/visit";
import type { GameStore } from "./game/store";
import {
  formatAmount,
  formatAway,
  formatCountdown,
  formatDuration,
  formatPerMinute,
  saveScience,
  savedScience,
  setScience,
  translate,
} from "./game/text";
import type { Lang } from "./game/text";
import { researchParts } from "./game/research";
import type { ResearchPart } from "./game/research";
import { isVisible } from "./game/unlock";
import { AccountSheet } from "./ui/AccountSheet";
import { AllianceSheet, bannerLabel, bannerTag } from "./ui/AllianceSheet";
import { ApexSheet, MuseumSheet } from "./ui/ApexSheets";
import { EventsSheet } from "./ui/EventsSheet";
import { GazetteSheet } from "./ui/GazetteSheet";
import { JournalSheet } from "./ui/JournalSheet";
import { EnergyIcon, OrganelleIcon, ResourceIcon } from "./ui/icons";
import { MapView } from "./ui/MapView";
import { CalendarSheet, openingName } from "./ui/CalendarSheet";
import { ChestOverlay } from "./ui/ChestOverlay";
import type { ChestLoot, ChestTone } from "./ui/ChestOverlay";
import { companionName } from "./ui/CompanionPanel";
import { ContestSheet } from "./ui/ContestSheet";
import { AdvancedSheet, ordinaryPathDone } from "./ui/AdvancedSheet";
import { MissingHint } from "./ui/MissingHint";
import { StorageHint } from "./ui/StorageHint";
import { LexiconSheet } from "./ui/LexiconSheet";
import { QuestSheet } from "./ui/QuestSheet";
import { RankingSheet } from "./ui/RankingSheet";
import { RaidBubble } from "./ui/RaidBubble";
import { ResearchView } from "./ui/ResearchView";
import { RivalsView } from "./ui/RivalsView";
import { CrisisSheet, SpeciesSheet } from "./ui/SeasonSheets";
import { TroopPanel } from "./ui/TroopPanel";

interface Props {
  readonly store: GameStore;
  readonly lang: Lang;
  readonly onSwitchLang: () => void;
  /** Absents quand le jeu tourne sans serveur. */
  readonly account: Account | null;
  readonly community: Community | null;
  readonly installer: Installer;
  /** Le compte vient d'être supprimé : l'appareil oublie tout et repart de zéro. */
  readonly onAccountDeleted: () => void;
}

/** Ce que le joueur ouvre : un coffre en attente, le coffre d'une quête finie, le cadeau d'alliance. */
type Opening =
  | { readonly kind: "reward" }
  | { readonly kind: "quest"; readonly index: number }
  | { readonly kind: "gift" };

/** Où l'appareil retient l'heure du dernier rapport lu. */
const REPORTS_SEEN_KEY = "o27.rapports.vus";
/** Où l'appareil retient que la fenêtre « Aller plus loin » a déjà été montrée. */
const ADVANCED_SEEN_KEY = "o27.plus-loin.vu";
/** Durée du rougeoiement après un coup reçu. */
const ALARM_FLASH_MS = 6000;

/** Les grands onglets du jeu. */
type View = "cell" | "map" | "rivals" | "research";

/** Position de chaque emplacement sur la lame, en pourcentage : huit autour, le Noyau au centre. */
/** Les touchers comptent dans la production affichée tant qu'on touche ; 10 s sans toucher, on repart de zéro. */
const TAP_IDLE_MS = 10_000;
/** Le chiffre reste en gras tant qu'on touche (un toucher de moins de deux secondes). */
const TAP_BOLD_MS = 2_000;

const SLOT_POSITION: Readonly<Record<OrganelleId, { left: string; top: string }>> = {
  // Neuf repères autour du Noyau, un tous les 40 degrés, dans le sens des aiguilles d'une montre.
  wall: { left: "50%", top: "9%" },
  vacuole: { left: "76.4%", top: "18.6%" },
  golgi: { left: "90.4%", top: "42.9%" },
  ribosome: { left: "85.5%", top: "70.5%" },
  nursery: { left: "64%", top: "88.5%" },
  receptor: { left: "36%", top: "88.5%" },
  lysosome: { left: "14.5%", top: "70.5%" },
  cilia: { left: "9.6%", top: "42.9%" },
  // Le Noyau est au cœur de la cellule : son repère se pose sur lui.
  nucleus: { left: "50%", top: "50%" },
  mitochondrion: { left: "23.6%", top: "18.6%" },
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

export function App({
  store,
  lang,
  onSwitchLang,
  account,
  community,
  installer,
  onAccountDeleted,
}: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [view, setView] = useState<View>("cell");
  /** La rubrique de l'onglet Recherche que le joueur regarde. */
  const [researchPart, setResearchPart] = useState<ResearchPart>("cell");
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tamed, setTamed] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [allianceOpen, setAllianceOpen] = useState(false);
  const [gazetteOpen, setGazetteOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [contestOpen, setContestOpen] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [apexOpen, setApexOpen] = useState(false);
  /** La fenêtre « Aller plus loin » : ouverte d'elle-même une fois, au bout du chemin ordinaire. */
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [museumOpen, setMuseumOpen] = useState(false);
  /** La place obtenue en sortant des eaux, quand la lignée vient d'arriver. */
  const [landed, setLanded] = useState<number | null>(null);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  /** Le rang obtenu au concours qui vient de finir. */
  const [contestRank, setContestRank] = useState<number | null>(null);
  /** Le coffre que le joueur est en train d'ouvrir, et un compteur pour repartir d'un coffre fermé. */
  const [opening, setOpening] = useState<Opening | null>(null);
  const [openingCount, setOpeningCount] = useState(0);
  const present = (next: Opening): void => {
    setOpening(next);
    setOpeningCount((count) => count + 1);
  };
  /** Instant du dernier rapport que le joueur a vu : les suivants sont « nouveaux ». */
  const [reportsSeen, setReportsSeen] = useState(
    () => Number(window.localStorage.getItem(REPORTS_SEEN_KEY)) || 0,
  );
  /** Instant de la dernière attaque subie : l'écran rougit quelques secondes. */
  const [hitAt, setHitAt] = useState(0);
  /** La bannière qui vient d'accueillir le joueur, et s'il a été recruté d'office. */
  const [enlisted, setEnlisted] = useState<{ banner: BannerId; auto: boolean } | null>(null);
  /** La dernière frappe du Léviathan : repoussée, ou ce qu'elle a coûté. */
  const [beastNote, setBeastNote] = useState<{
    repelled: boolean;
    sugar: number;
    bricks: number;
    proteins: number;
    troopsLost: number;
  } | null>(null);
  /** Dernière évolution exprimée : on le dit, une fois. */
  const [evolved, setEvolved] = useState<{ evolution: EvolutionId; level: number } | null>(null);
  /** Cellules filles mortes de faim depuis la dernière note. */
  const [starved, setStarved] = useState(0);
  /** Dernière récompense de ligue reçue. */
  // Vrais termes de la biologie ou mots simples : le choix du joueur, gardé sur l'appareil.
  const [science, setScienceChoice] = useState(() => savedScience(window.localStorage) ?? true);
  const [termsAsked, setTermsAsked] = useState(() => savedScience(window.localStorage) !== null);
  const [lexiconOpen, setLexiconOpen] = useState(false);
  setScience(science);
  /** Contenu du dernier coffre ouvert. */
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
  const [taps, setTaps] = useState<readonly { readonly at: number; readonly gained: number }[]>([]);
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
          if (event.type === "companionTamed") setTamed(true);
          if (event.type === "apexReached") setLanded(event.place);
          if (event.type === "contestEnded") setContestRank(event.rank);
          if (event.type === "allianceJoined") {
            setEnlisted({ banner: event.banner, auto: event.auto });
          }
          if (event.type === "attackSuffered" || event.type === "leviathanStruck") {
            setHitAt(event.at);
          }
          if (event.type === "leviathanRepelled") {
            setBeastNote({ repelled: true, sugar: 0, bricks: 0, proteins: 0, troopsLost: 0 });
          }
          if (event.type === "leviathanStruck") {
            setBeastNote({
              repelled: false,
              sugar: event.sugar,
              bricks: event.bricks,
              proteins: event.proteins,
              troopsLost: event.troopsLost,
            });
          }
          if (event.type === "evolutionDone") {
            setEvolved({ evolution: event.evolution, level: event.level });
          }
          if (event.type === "troopsStarved") {
            const dead = event.count;
            setStarved((count) => count + dead);
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
              troopsLost: event.troopsLost,
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
    if (!result.ok) return;
    let gained = 0;
    for (const event of result.events) if (event.type === "harvested") gained += event.amount;
    if (gained <= 0) return;
    // Les touchers de la dernière minute s'ajoutent à la production affichée.
    const at = Date.now();
    setTaps((list) => {
      const last = list.at(-1)?.at ?? 0;
      return [...(at - last > TAP_IDLE_MS ? [] : list), { at, gained }];
    });
  };

  /** Un prix dépasse la réserve : on referme ce qui est ouvert et on montre la Vacuole. */
  const openStore = (): void => {
    setApexOpen(false);
    setView("cell");
    setSelected("vacuole");
  };
  const show = (element: Parameters<typeof isVisible>[0]): boolean =>
    isVisible(element, state.tier);
  // Au bout du chemin ordinaire, la fenêtre « Aller plus loin » s'ouvre d'elle-même, une fois.
  const quiet = absence === null && reveal === null && selected === null && termsAsked;
  const pathDone = show("upgradeButton") && ordinaryPathDone(state);
  useEffect(() => {
    if (!quiet || !pathDone || window.localStorage.getItem(ADVANCED_SEEN_KEY) !== null) return;
    window.localStorage.setItem(ADVANCED_SEEN_KEY, String(Date.now()));
    setAdvancedOpen(true);
  }, [quiet, pathDone]);
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
  // Une mutation à portée de main : l'onglet Recherche le signale d'un point.
  const mutationReady =
    show("hunt") &&
    state.mutationOffer === null &&
    mutationPool(state).length > 0 &&
    state.resources.proteins >= nextMutationPrice(state);
  const slots = ORGANELLE_IDS.filter((id) => BALANCE.organelles[id].tier <= state.tier);
  const choosing =
    absence === null && reveal === null && state.mutationOffer !== null && show("mutationChoice");

  const onMap = view === "map" && show("map");
  const onRivals = view === "rivals" && show("rivals");
  // L'onglet Recherche range tout ce qui fait évoluer l'organisme : il existe dès qu'une
  // rubrique est ouverte, et s'ouvre sur la première si celle que l'on regardait n'existe pas.
  const parts = researchParts(state.tier);
  const part = parts.find((id) => id === researchPart) ?? parts[0];
  const onResearch = view === "research" && part !== undefined;
  const openResearch = (next: ResearchPart): void => {
    setSelected(null);
    setAdvancedOpen(false);
    setResearchPart(next);
    setView("research");
  };
  const views: View[] = ["cell", "map"];
  if (show("rivals")) views.push("rivals");
  if (parts.length > 0) views.push("research");
  const raid = state.raid;
  /** Le groupe se bat chez un rival : le joueur peut l'aider. */
  const raidStrikeLeft =
    raid !== null && !raid.cancelled && raid.outcome === null && state.now >= raid.arrivesAt
      ? raid.resolveAt - state.now
      : null;
  const rivalName = (id: string): string => nameOfRival(state, id);
  const powerRank = ranking(state, "power");
  const upcoming = nextOpening(state);
  // Ce qui pèse sur la cellule en ce moment : une zone anoxique, un Léviathan à portée.
  const anoxia = show("zoneEvents") ? playerAnoxia(state) : null;
  const threat = show("zoneEvents") ? leviathanThreat(state) : null;
  const eventCount = show("zoneEvents")
    ? visibleEvents(state).filter((event) => event.zone <= state.zone).length
    : 0;
  // L'écran rougit quand une attaque approche, quand le Léviathan va frapper, ou juste après un coup reçu.
  const warning = show("rivals") ? attackWarning(state) : null;
  const strikeSoon =
    threat !== null &&
    threat.strikesAt - state.now <= BALANCE.rivals.incoming.warningMinutes * 60_000;
  const alarm = warning !== null || strikeSoon || state.now - hitAt < ALARM_FLASH_MS;
  const newReports = state.reports.filter((report) => report.at > reportsSeen).length;
  const contest = show("contest") ? contestBoard(state) : null;
  const crisis = show("crisis") ? crisisOf(state) : null;
  const allianceToDo =
    show("alliances") && state.alliance !== null
      ? (allianceToday(state).gift ? 0 : 1) + (helpRequests(state) > 0 ? 1 : 0)
      : 0;

  const chestTitle = (): { title: string; tone: ChestTone } => {
    if (opening?.kind === "gift") return { title: t("chest.kind.gift"), tone: "gift" };
    if (opening?.kind === "quest") {
      const tone = state.quests?.items[opening.index]?.challenge === true ? "challenge" : "quest";
      return { title: t(`chest.kind.${tone}`), tone };
    }
    const first = state.chests[0];
    if (first === undefined) return { title: t("chest.title"), tone: "quest" };
    const league =
      first.kind === "league" ? ` · ${t(`league.${String(first.level)}.name` as TextKey)}` : "";
    return { title: `${t(`chest.kind.${first.kind}`)}${league}`, tone: first.kind };
  };
  const openChest = (): ChestLoot | null => {
    if (opening === null) return null;
    const order: Order =
      opening.kind === "reward"
        ? { type: "openReward", index: 0 }
        : opening.kind === "quest"
          ? { type: "claimQuest", index: opening.index }
          : { type: "claimGift" };
    const result = store.send(order);
    if (!result.ok) return null;
    for (const event of result.events) {
      if (event.type === "rewardOpened") return event.loot;
      if (event.type === "allianceGift") return { ...event.loot, energy: event.energy, boosts: 0 };
      if (event.type === "chestOpened") {
        return {
          sugar: (event.loot.sugar ?? 0) * MICRO,
          bricks: (event.loot.bricks ?? 0) * MICRO,
          proteins: (event.loot.proteins ?? 0) * MICRO,
          energy: event.loot.energy ?? 0,
          boosts: 0,
        };
      }
    }
    return null;
  };

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
        {/* Dans une boîte flexible, l'espace du début serait mangé : on le rend insécable. */}
        <small>
          {" / "}
          {SEASON_DAYS}
        </small>
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
      {
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
      }
      {accountOpen && (
        <AccountSheet
          account={account}
          community={community}
          installer={installer}
          lang={lang}
          onDeleted={onAccountDeleted}
          onClose={() => {
            setAccountOpen(false);
          }}
        />
      )}
      <header className="counters">
        {counters.map((id) => {
          // Ce que les touchers de la dernière minute ont rapporté, en plus de la production.
          const wall = Date.now();
          const latest = taps.at(-1)?.at ?? 0;
          const recent = id === "sugar" && wall - latest <= TAP_IDLE_MS ? taps : [];
          const tapped = recent.reduce((sum, entry) => sum + entry.gained, 0);
          const lastTap = recent.at(-1)?.at ?? 0;
          const tapping = wall - lastTap < TAP_BOLD_MS;
          const full = state.resources[id] >= capacity(state, id);
          // Ce que la cellule gagne vraiment : sa production, moins ce que mangent les troupes.
          const rate =
            crisisRate(state, productionRate(state, id)) - (id === "sugar" ? upkeepRate(state) : 0);
          return (
            <div
              key={id === "sugar" ? `${id}-${String(fullFlash)}` : id}
              className={`counter${full ? " is-full" : ""}${id === "sugar" && fullFlash > 0 && full ? " shake" : ""}`}
              data-testid={`counter-${id}`}
            >
              <ResourceIcon id={id} />
              <span className="counter-value">{formatAmount(state.resources[id], lang)}</span>
              <span className="counter-label">{full ? t("state.full") : t(`resource.${id}`)}</span>
              {((show("productionRate") && rate !== 0) || tapped > 0) && (
                <span
                  className={`counter-rate${rate + tapped / 60_000 < 0 ? " is-negative" : ""}${tapping ? " is-tapping" : ""}`}
                  data-testid={`rate-${id}`}
                >
                  {rate * 60_000 + tapped >= 0 ? "+" : "−"}
                  {formatPerMinute(Math.abs(rate * 60_000 + tapped), lang)}
                  {show("energy") ? "/min" : ` ${t("label.perMinute")}`}
                  {tapped > 0 && (
                    <strong key={lastTap} className="counter-tap" data-testid="rate-tap">
                      +{formatPerMinute(tapped, lang)}
                    </strong>
                  )}
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
      {alarm && <div className="alarm" data-testid="alarm" aria-hidden="true" />}
      {warning !== null && (
        <p className="season-next is-danger" role="alert" data-testid="attack-strip">
          <strong>{t("alarm.attack")}</strong>
          <span className="season-next-left">
            {t("label.in")} {formatCountdown(warning - state.now, lang)}
          </span>
        </p>
      )}
      {crisis !== null && crisis.phase !== "done" && (
        <button
          type="button"
          className="season-next is-danger"
          data-testid="crisis-strip"
          onClick={() => {
            setCrisisOpen(true);
          }}
        >
          <strong>{t(`crisis.${crisis.kind}.name`)}</strong>
          <span className="season-next-left">
            {crisis.phase === "warning"
              ? `${t("crisis.warning")} ${formatCountdown(crisis.startsAt - state.now, lang)}`
              : `${t("crisis.on")} ${formatCountdown(crisis.endsAt - state.now, lang)}`}
          </span>
        </button>
      )}
      {show("crisis") && crisisOpen && (
        <CrisisSheet
          state={state}
          lang={lang}
          onClose={() => {
            setCrisisOpen(false);
          }}
        />
      )}
      {anoxia !== null && (
        <button
          type="button"
          className="season-next is-danger"
          data-testid="anoxia-strip"
          onClick={() => {
            setEventsOpen(true);
          }}
        >
          <strong>{t("state.anoxic")}</strong>
          <span className="season-next-left">
            {t("label.endsIn")} {formatCountdown(anoxia.endsAt - state.now, lang)}
          </span>
        </button>
      )}
      {threat !== null && (
        <button
          type="button"
          className="season-next is-danger"
          data-testid="leviathan-strip"
          onClick={() => {
            setEventsOpen(true);
          }}
        >
          <strong>{t("state.leviathanNear")}</strong>
          <span className="season-next-left">
            {t("label.nextStrike")} {formatCountdown(threat.strikesAt - state.now, lang)}
          </span>
        </button>
      )}
      {show("zoneEvents") && eventsOpen && (
        <EventsSheet
          state={state}
          lang={lang}
          onClose={() => {
            setEventsOpen(false);
          }}
        />
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
          showEvents={show("zoneEvents")}
          onOrder={(order) => store.send(order).ok}
          onOpenStore={openStore}
          onHome={() => {
            setView("cell");
          }}
        />
      )}

      {onRivals && (
        <RivalsView state={state} lang={lang} onOrder={(order) => store.send(order).ok} />
      )}

      {onResearch && (
        <ResearchView
          state={state}
          lang={lang}
          parts={parts}
          part={part}
          onPart={setResearchPart}
          families={show("genome")}
          onOrder={(order) => {
            store.send(order);
          }}
          onOpenStore={openStore}
          onOpenOrganelle={(id) => {
            setView("cell");
            setSelected(id);
          }}
        />
      )}

      <section className="lens" hidden={onMap || onRivals || onResearch}>
        <CellCanvas scene={scene} label={t("label.cell")} onTap={tap} />
        <span className="scale-bar" aria-hidden="true">
          10 µm
        </span>
        {!touched && state.counters.harvests === 0 && <p className="hint">{t("hint.tap")}</p>}
        {show("buildSlots") &&
          slots.map((id) => {
            const level = state.organelles[id];
            const building = state.construction?.organelle === id ? state.construction : null;
            const queued = state.buildQueue.filter((entry) => entry.organelle === id).length;
            const ready =
              level === 0 && state.construction === null && canAfford(state, id, 1) && !building;
            return (
              <button
                key={id}
                type="button"
                className={`slot${id === "nucleus" ? " is-core" : ""}${level > 0 ? " is-built" : ""}${building ? " is-building" : ""}${ready ? " is-ready" : ""}`}
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
                {/* Le niveau se lit d'un coup d'œil, sur chaque organite. */}
                {level > 0 && !building && (
                  <span
                    className="slot-level"
                    data-testid={id === "nucleus" ? "nucleus-level" : `slot-level-${id}`}
                  >
                    {id === "nucleus" ? `${t("label.levelShort")} ${String(level)}` : level}
                  </span>
                )}
                {queued > 0 && (
                  <span className="slot-queue" data-testid={`slot-queue-${id}`}>
                    +{queued}
                  </span>
                )}
              </button>
            );
          })}
      </section>

      {!onMap && !onRivals && !onResearch && state.buildQueue.length > 0 && (
        <div className="build-queue" data-testid="build-queue">
          <span className="build-queue-label">{t("queue.label")}</span>
          {state.buildQueue.map((entry, index) => (
            <span key={index} className="build-queue-item">
              <OrganelleIcon id={entry.organelle} />
              {entry.toLevel}
            </span>
          ))}
          <button
            type="button"
            className="link-button"
            data-testid="unqueue"
            onClick={() => {
              store.send({ type: "unqueue" });
            }}
          >
            {t("queue.remove")}
          </button>
        </div>
      )}

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
              {id === "research" && mutationReady && (
                <span className="view-dot" data-testid="research-dot" aria-hidden="true" />
              )}
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
            // Un coffre ne s'ouvre pas d'un simple bouton : le joueur le touche lui-même.
            if (order.type === "claimQuest") present({ kind: "quest", index: order.index });
            else store.send(order);
          }}
        />
      )}
      {show("chests") && state.chests.length > 0 && (
        <button
          type="button"
          className="quests-open chests-open has-chest"
          data-testid="chests-open"
          onClick={() => {
            present({ kind: "reward" });
          }}
        >
          {t("label.chests")}
          <span className="badge">{state.chests.length}</span>
        </button>
      )}
      {opening !== null && (
        <ChestOverlay
          key={openingCount}
          lang={lang}
          {...chestTitle()}
          waiting={state.chests.length}
          onOpen={openChest}
          onNext={() => {
            present({ kind: "reward" });
          }}
          onClose={() => {
            setOpening(null);
          }}
        />
      )}

      {contest !== null && (
        <button
          type="button"
          className="quests-open contest-open"
          data-testid="contest-open"
          onClick={() => {
            setContestOpen(true);
          }}
        >
          {t("label.contest")}
          <span className="badge">
            {t("contest.rank").replace("{n}", String(contest.mine.rank))} ·{" "}
            {formatCountdown(contest.endsAt - state.now, lang)}
          </span>
        </button>
      )}
      {show("contest") && contestOpen && (
        <ContestSheet
          state={state}
          lang={lang}
          onClose={() => {
            setContestOpen(false);
          }}
        />
      )}
      {contestRank !== null && (
        <div className="loss is-good" role="status" data-testid="contest-note">
          <strong>{t("contest.ended")}</strong>
          <span>{t("contest.endedRank").replace("{n}", String(contestRank))}</span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setContestRank(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      {show("rivals") && (
        <button
          type="button"
          className={`quests-open journal-open${newReports > 0 ? " has-chest" : ""}`}
          data-testid="journal-open"
          onClick={() => {
            setJournalOpen(true);
            // Tout ce qui est affiché est lu : l'appareil s'en souvient.
            setReportsSeen(state.now);
            window.localStorage.setItem(REPORTS_SEEN_KEY, String(state.now));
          }}
        >
          {t("label.reports")}
          {newReports > 0 && <span className="badge">{newReports}</span>}
        </button>
      )}
      {show("rivals") && journalOpen && (
        <JournalSheet
          state={state}
          lang={lang}
          onClose={() => {
            setJournalOpen(false);
          }}
        />
      )}
      {show("zoneEvents") && (
        <button
          type="button"
          className="quests-open events-open"
          data-testid="events-list-open"
          onClick={() => {
            setEventsOpen(true);
          }}
        >
          {t("label.events")}
          <span className="badge">{eventCount}</span>
        </button>
      )}
      {show("alliances") && state.alliance !== null && (
        <button
          type="button"
          className={`quests-open alliance-open${allianceToDo > 0 ? " has-chest" : ""}`}
          data-testid="alliance-open"
          onClick={() => {
            setAllianceOpen(true);
          }}
        >
          {t("label.alliance")}
          <span className="badge">{bannerTag(state.alliance.banner)}</span>
        </button>
      )}
      {show("alliances") && allianceOpen && (
        <AllianceSheet
          state={state}
          lang={lang}
          onClose={() => {
            setAllianceOpen(false);
          }}
          onOrder={(order) => {
            // Le cadeau du jour s'ouvre comme un coffre : le joueur le touche lui-même.
            if (order.type !== "claimGift") return store.send(order).ok;
            present({ kind: "gift" });
            return true;
          }}
        />
      )}
      {show("speciesSheet") && (
        <button
          type="button"
          className="quests-open species-open"
          data-testid="species-open"
          onClick={() => {
            setSpeciesOpen(true);
          }}
        >
          {t("label.species")}
          <span className="badge species-badge">{speciesOf(state).name}</span>
        </button>
      )}
      {show("speciesSheet") && speciesOpen && (
        <SpeciesSheet
          state={state}
          lang={lang}
          onClose={() => {
            setSpeciesOpen(false);
          }}
        />
      )}
      {show("apexRace") && (
        <button
          type="button"
          className={`quests-open apex-open${state.apex === null ? " has-chest" : ""}`}
          data-testid="apex-open"
          onClick={() => {
            setApexOpen(true);
          }}
        >
          {t("label.apex")}
          {state.apex !== null && state.apex.place === 0 && (
            <span className="badge">{formatCountdown(state.apex.endsAt - state.now, lang)}</span>
          )}
          {state.apex !== null && state.apex.place > 0 && (
            <span className="badge">
              {t("apex.place").replace("{n}", String(state.apex.place))}
            </span>
          )}
        </button>
      )}
      {advancedOpen && (
        <AdvancedSheet
          state={state}
          lang={lang}
          showEvolutions={show("evolutions")}
          showDrills={show("militaryResearch")}
          onClose={() => {
            setAdvancedOpen(false);
          }}
          onOpen={(id) => {
            setAdvancedOpen(false);
            setView("cell");
            setSelected(id);
          }}
          onResearch={openResearch}
        />
      )}
      {show("apexRace") && apexOpen && (
        <ApexSheet
          state={state}
          lang={lang}
          onClose={() => {
            setApexOpen(false);
          }}
          onOrder={(order) => store.send(order).ok}
          onOpenStore={openStore}
        />
      )}
      {landed !== null && (
        <div className="loss is-good" role="status" data-testid="apex-note">
          <strong>{t("apex.done")}</strong>
          <span>{t("apex.place").replace("{n}", String(landed))}</span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setLanded(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      {show("museum") && (
        <button
          type="button"
          className="quests-open museum-open"
          data-testid="museum-open"
          onClick={() => {
            setMuseumOpen(true);
          }}
        >
          {t("label.museum")}
        </button>
      )}
      {show("museum") && museumOpen && (
        <MuseumSheet
          state={state}
          lang={lang}
          loadPlates={community?.plates ?? null}
          onClose={() => {
            setMuseumOpen(false);
          }}
        />
      )}
      {show("gazette") && (
        <button
          type="button"
          className="quests-open gazette-open"
          data-testid="gazette-open"
          onClick={() => {
            setGazetteOpen(true);
          }}
        >
          {t("label.gazette")}
        </button>
      )}
      {show("gazette") && gazetteOpen && (
        <GazetteSheet
          state={state}
          lang={lang}
          onClose={() => {
            setGazetteOpen(false);
          }}
        />
      )}
      {enlisted !== null && (
        <div className="loss is-good" role="status" data-testid="alliance-note">
          <strong>{enlisted.auto ? t("alliance.recruited") : t("alliance.joined")}</strong>
          <span>{bannerLabel(lang, enlisted.banner)}</span>
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setEnlisted(null);
            }}
          >
            ×
          </button>
        </div>
      )}
      {beastNote !== null && (
        <div
          className={`loss${beastNote.repelled ? " is-good" : ""}`}
          role="status"
          data-testid="leviathan-note"
        >
          <strong>
            {beastNote.repelled ? t("event.leviathan.repelled") : t("event.leviathan.struck")}
          </strong>
          {!beastNote.repelled && (
            <span className="chest-loot">
              {(["sugar", "bricks", "proteins"] as const).map((id) => (
                <span key={id}>
                  <ResourceIcon id={id} />−{formatAmount(beastNote[id], lang)}
                </span>
              ))}
              <span>
                {t("hunt.losses")} : {beastNote.troopsLost}
              </span>
            </span>
          )}
          <button
            type="button"
            className="close"
            aria-label={t("action.close")}
            onClick={() => {
              setBeastNote(null);
            }}
          >
            ×
          </button>
        </div>
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
            {huntNote.won && huntNote.gained > 0 && (
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
          onOpen={setSelected}
          onGoFurther={() => {
            setSelected(null);
            setAdvancedOpen(true);
          }}
          onResearch={openResearch}
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
  /** Ouvre la fiche d'un autre organite (la Vacuole, quand la réserve est trop petite). */
  readonly onOpen: (id: OrganelleId) => void;
  /** Ouvre la fenêtre « Aller plus loin ». */
  readonly onGoFurther: () => void;
  /** Ouvre l'onglet Recherche à la bonne rubrique. */
  readonly onResearch: (part: ResearchPart) => void;
  readonly onAct: (
    order: { type: "build"; organelle: OrganelleId } | { type: "upgrade"; organelle: OrganelleId },
  ) => void;
}

function OrganelleSheet({
  state,
  id,
  lang,
  canUpgrade,
  onClose,
  onOpen,
  onGoFurther,
  onResearch,
  onAct,
  onOrder,
}: SheetProps) {
  const t = (key: TextKey): string => translate(lang, key);
  const level = state.organelles[id];
  const building = state.construction?.organelle === id ? state.construction : null;
  // Le niveau une fois achevés le chantier en cours et la file : on prévoit à partir de lui.
  const planned = plannedLevel(state, id);
  const queuedHere = state.buildQueue.filter((entry) => entry.organelle === id);
  const busy = state.construction !== null;
  const queueOpen = state.tier >= BALANCE.buildQueue.tier;
  const maxed = planned >= maxLevelOf(state, id);
  const offersAction = (planned === 0 || (canUpgrade && !maxed)) && (!busy || queueHasRoom(state));
  const toLevel = planned + 1;
  const cost = levelCost(state, id, toLevel);
  const affordable = canAfford(state, id, toLevel);
  // Le Noyau commande : un organite ne monte pas plus haut que lui.
  const capped = planned > 0 && toLevel > nucleusCap(state, id);
  const openStore = (): void => {
    onOpen("vacuole");
  };

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
          <TroopPanel
            state={state}
            lang={lang}
            onOrder={onOrder}
            onResearch={() => {
              onResearch("troops");
            }}
            onGenes={() => {
              onResearch("genes");
            }}
          />
        )}
        {id === "nucleus" && canUpgrade && level > 1 && (
          <p className="sheet-level" data-testid="nucleus-bonus">
            {t("nucleus.bonus").replace("{n}", String(nucleusPercent(state, "sugarProduction")))}
          </p>
        )}
        {id === "nucleus" && isVisible("evolutions", state.tier) && (
          <button
            type="button"
            className="button button-quiet"
            data-testid="nucleus-research"
            onClick={() => {
              onResearch("cell");
            }}
          >
            {t("research.seeEvolutions")} →
          </button>
        )}

        {building && (
          <p className="sheet-building">
            {t("state.building")} · {formatDuration(building.endsAt - state.now)}
          </p>
        )}
        {building && state.boosts > 0 && (
          <button
            type="button"
            className="button button-small button-quiet"
            data-testid="boost-construction"
            onClick={() => {
              onOrder({ type: "useBoost", target: "construction" });
            }}
          >
            {t("action.boost").replace("{t}", formatAway(BALANCE.boost.minutes * 60_000, lang))} ·{" "}
            {t("boost.left").replace("{n}", String(state.boosts))}
          </button>
        )}

        {queuedHere.length > 0 && (
          <p className="sheet-note" data-testid="sheet-queued">
            {t("queue.here").replace(
              "{n}",
              queuedHere.map((entry) => String(entry.toLevel)).join(", "),
            )}
          </p>
        )}
        {queueOpen && busy && !queueHasRoom(state) && !maxed && (
          <p className="sheet-note" data-testid="sheet-queue-full">
            {t("queue.full").replace("{n}", String(BALANCE.buildQueue.size))}
          </p>
        )}
        {level > 0 && canUpgrade && maxed && !building && queuedHere.length === 0 && (
          <p className="sheet-note" data-testid="sheet-maxed">
            {t("sheet.maxed")}
          </p>
        )}
        {offersAction && !capped && level > 0 && isHigherLevel(id, toLevel) && (
          <p className="storage-hint sheet-higher" data-testid="sheet-higher">
            <span>{t("sheet.higher")}</span>
            <button
              type="button"
              className="link-button"
              data-testid="sheet-go-further"
              onClick={onGoFurther}
            >
              {t("sheet.goFurther")} →
            </button>
          </p>
        )}

        {offersAction && capped && (
          <p className="storage-hint" data-testid="sheet-needs-nucleus">
            <span>
              {t("nucleus.needed").replace(
                "{n}",
                String(toLevel - (id === "vacuole" ? BALANCE.nucleusRule.storageAhead : 0)),
              )}
            </span>
            <button
              type="button"
              className="link-button"
              data-testid="sheet-open-nucleus"
              onClick={() => {
                onOpen("nucleus");
              }}
            >
              {t("nucleus.open")} →
            </button>
          </p>
        )}
        {offersAction && !capped && (
          <>
            {id !== "vacuole" && (
              <StorageHint state={state} cost={cost} lang={lang} onOpenStore={openStore} />
            )}
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
            <MissingHint state={state} cost={cost} lang={lang} />
            <button
              type="button"
              className="button"
              disabled={!affordable}
              data-testid="sheet-action"
              onClick={() => {
                onAct({ type: planned === 0 ? "build" : "upgrade", organelle: id });
              }}
            >
              {busy ? t("action.queue") : planned === 0 ? t("action.build") : t("action.upgrade")}
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
