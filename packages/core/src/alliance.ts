/**
 * Les alliances, côté joueur : rejoindre une bannière, donner, s'entraider, le cadeau du jour
 * et la boutique. Les technologies elles-mêmes sont dans `banners.ts`.
 */
import { BALANCE, BANNER_IDS, RESOURCE_IDS } from "@o27/data";
import type { AllianceShopId, AllianceTechId, BannerId, ResourceId } from "@o27/data";
import {
  allianceLevel,
  allianceView,
  bannerMembers,
  bannerOf,
  bannerProgress,
  nextRecommended,
  settledAlliance,
  techLevel,
  techOrder,
  techThreshold,
} from "./banners";
import { cellDistance, oceanOrganisms, playerCell } from "./ocean";
import { organismScore, totalPower } from "./power";
import { raiseShield } from "./rivals";
import { DAY_MS, MICRO } from "./types";
import type { Alliance, GameEvent, OrderErrorCode, PlayerState, Step } from "./types";
import { seasonDay } from "./unlock";

const RULES = BALANCE.alliance;
const HOUR_MS = 3_600_000;

type Outcome = Step | { readonly error: OrderErrorCode };

/** Les compteurs du jour d'une alliance : remis à zéro dès que le jour de saison change. */
export function allianceToday(state: PlayerState): {
  readonly donations: number;
  readonly helped: number;
  readonly gift: boolean;
} {
  const alliance = state.alliance;
  if (alliance === null || alliance.day !== seasonDay(state, state.now)) {
    return { donations: 0, helped: 0, gift: false };
  }
  return { donations: alliance.donations, helped: alliance.helped, gift: alliance.gift };
}

/** L'alliance mise au net, avec les compteurs du jour d'aujourd'hui. */
function current(state: PlayerState): Alliance | null {
  const settled = settledAlliance(state);
  if (settled === null) return null;
  return { ...settled, day: seasonDay(state, state.now), ...allianceToday(state) };
}

/** Le joueur a-t-il assez contribué pour choisir la technologie recommandée ? */
export function isOfficer(state: PlayerState): boolean {
  return state.alliance !== null && state.alliance.points >= RULES.officerPoints;
}

/** Nombre de membres d'une bannière proches de la cellule du joueur. */
function nearMembers(state: PlayerState, radius: number): Record<BannerId, number> {
  const counts: Record<BannerId, number> = { aby: 0, krk: 0, mer: 0, tox: 0, lum: 0, nox: 0 };
  const home = playerCell(state);
  for (const organism of oceanOrganisms(state.worldSeed, seasonDay(state, state.now))) {
    if (organism.slot === state.slot || cellDistance(home, organism) > radius) continue;
    counts[bannerOf(state.worldSeed, organism.slot)] += 1;
  }
  return counts;
}

/** La bannière la plus présente autour du joueur : c'est elle qui le recrute d'office. */
export function nearestBanner(state: PlayerState): BannerId {
  const counts = nearMembers(state, RULES.nearCells);
  let best: BannerId | null = null;
  for (const banner of BANNER_IDS) {
    if (counts[banner] > 0 && (best === null || counts[banner] > counts[best])) best = banner;
  }
  return best ?? bannerOf(state.worldSeed, state.slot);
}

export interface BannerRow {
  readonly banner: BannerId;
  /** Membres, le joueur compris si c'est la sienne. */
  readonly members: number;
  /** Membres à portée de renfort du joueur. */
  readonly near: number;
  readonly level: number;
  /** Puissance cumulée de ses membres. */
  readonly power: number;
  readonly mine: boolean;
}

let powerKey = "";
let powers: Readonly<Record<BannerId, number>> = { aby: 0, krk: 0, mer: 0, tox: 0, lum: 0, nox: 0 };

function bannerPowers(state: PlayerState): Readonly<Record<BannerId, number>> {
  const day = seasonDay(state, state.now);
  const key = [state.worldSeed, state.slot, day].join("/");
  if (key === powerKey) return powers;
  const totals: Record<BannerId, number> = { aby: 0, krk: 0, mer: 0, tox: 0, lum: 0, nox: 0 };
  for (let slot = 0; slot < BALANCE.world.organisms; slot++) {
    if (slot === state.slot) continue;
    totals[bannerOf(state.worldSeed, slot)] += organismScore(state.worldSeed, slot, day, "power");
  }
  powers = totals;
  powerKey = key;
  return totals;
}

/** Les six bannières telles que le joueur les voit, de la plus puissante à la moins puissante. */
export function bannerList(state: PlayerState): readonly BannerRow[] {
  const near = nearMembers(state, RULES.reinforcements.cells);
  const base = bannerPowers(state);
  const own = allianceView(state);
  const rows = BANNER_IDS.map((banner): BannerRow => {
    const mine = state.alliance?.banner === banner;
    const view =
      mine && own !== null
        ? own
        : bannerProgress(state.worldSeed, banner, state.seasonStart, state.now);
    return {
      banner,
      members: bannerMembers(state.worldSeed, banner) + (mine ? 1 : 0),
      near: near[banner],
      level: allianceLevel(view),
      power: base[banner] + (mine ? totalPower(state) : 0),
      mine,
    };
  });
  return rows.sort(
    (one, other) =>
      other.power - one.power || BANNER_IDS.indexOf(one.banner) - BANNER_IDS.indexOf(other.banner),
  );
}

function enlist(state: PlayerState, banner: BannerId, previous: Alliance | null): Alliance {
  const view = bannerProgress(state.worldSeed, banner, state.seasonStart, state.now);
  // Dans les premières heures, on change sans rien perdre ; ensuite, on repart de zéro.
  const free = previous === null || state.now < previous.freeUntil;
  const today = allianceToday(state);
  return {
    banner,
    freeUntil: previous === null ? state.now + RULES.freeHours * HOUR_MS : previous.freeUntil,
    points: free ? (previous?.points ?? 0) : 0,
    credits: free ? (previous?.credits ?? 0) : 0,
    day: seasonDay(state, state.now),
    donations: today.donations,
    helped: today.helped,
    gift: today.gift,
    tech: view.tech,
    recommended: view.recommended,
    syncedAt: state.now,
  };
}

/** À l'ouverture des alliances, la bannière la plus présente autour du joueur le recrute. */
export function ensureAlliance(state: PlayerState, at: number): Step {
  if (state.tier < RULES.tier || state.alliance !== null) return { state, events: [] };
  const banner = nearestBanner(state);
  return {
    state: { ...state, alliance: enlist(state, banner, null) },
    events: [{ type: "allianceJoined", at, banner, auto: true }],
  };
}

/** Changer de bannière. */
function join(state: PlayerState, banner: BannerId): Outcome {
  if (state.alliance === null) return { error: "noAlliance" };
  if (state.alliance.banner === banner) return { error: "sameAlliance" };
  return {
    state: { ...state, alliance: enlist(state, banner, state.alliance) },
    events: [{ type: "allianceJoined", at: state.now, banner, auto: false }],
  };
}

/** Ce que coûte un don, en millionièmes d'unité. */
export function donationCost(): Readonly<Record<ResourceId, number>> {
  return {
    sugar: RULES.donation.cost.sugar * MICRO,
    bricks: RULES.donation.cost.bricks * MICRO,
    proteins: 0,
  };
}

/** Ce que rapporte un don à cette technologie : davantage si c'est la recommandée. */
export function donationPoints(state: PlayerState, tech: AllianceTechId): number {
  const recommended = allianceView(state)?.recommended === tech;
  return recommended
    ? Math.floor((RULES.donation.points * RULES.donation.recommendedPercent) / 100)
    : RULES.donation.points;
}

function donate(state: PlayerState, tech: AllianceTechId): Outcome {
  const alliance = current(state);
  if (alliance === null) return { error: "noAlliance" };
  if (alliance.donations >= RULES.donation.perDay) return { error: "donationsDone" };
  if (techLevel(alliance.tech[tech]) >= RULES.tech.maxLevel) return { error: "maxLevel" };
  const cost = donationCost();
  if (RESOURCE_IDS.some((id) => state.resources[id] < cost[id])) return { error: "insufficient" };
  const points = donationPoints(state, tech);
  const before = techLevel(alliance.tech[tech]);
  const pool = {
    ...alliance.tech,
    [tech]: Math.min(techThreshold(RULES.tech.maxLevel), alliance.tech[tech] + points),
  };
  // La technologie recommandée vient de gagner un niveau : l'alliance passe à la moins avancée.
  const levelled = techLevel(pool[tech]) > before;
  const recommended =
    alliance.recommended === tech && levelled
      ? nextRecommended(pool, techOrder(state.worldSeed, alliance.banner))
      : alliance.recommended;
  return {
    state: {
      ...state,
      resources: {
        sugar: state.resources.sugar - cost.sugar,
        bricks: state.resources.bricks - cost.bricks,
        proteins: state.resources.proteins,
      },
      alliance: {
        ...alliance,
        tech: pool,
        recommended,
        points: alliance.points + points,
        credits: alliance.credits + points,
        donations: alliance.donations + 1,
      },
    },
    events: [{ type: "allianceDonated", at: state.now, tech, points }],
  };
}

function recommend(state: PlayerState, tech: AllianceTechId): Outcome {
  const alliance = current(state);
  if (alliance === null) return { error: "noAlliance" };
  if (alliance.points < RULES.officerPoints) return { error: "notOfficer" };
  if (techLevel(alliance.tech[tech]) >= RULES.tech.maxLevel) return { error: "maxLevel" };
  return { state: { ...state, alliance: { ...alliance, recommended: tech } }, events: [] };
}

/** Nombre de demandes d'aide auxquelles le joueur peut répondre maintenant. */
export function helpRequests(state: PlayerState): number {
  if (state.alliance === null) return 0;
  const rules = RULES.help;
  const intoDay = Math.max(0, state.now - state.seasonStart) % DAY_MS;
  const arrived = Math.min(
    rules.perDay,
    rules.start + Math.floor(intoDay / (rules.minutes * 60_000)),
  );
  return Math.max(0, arrived - allianceToday(state).helped);
}

function helpAllies(state: PlayerState): Outcome {
  const alliance = current(state);
  if (alliance === null) return { error: "noAlliance" };
  const count = helpRequests(state);
  if (count <= 0) return { error: "noHelp" };
  return {
    state: {
      ...state,
      alliance: {
        ...alliance,
        helped: alliance.helped + count,
        credits: alliance.credits + count * RULES.help.credits,
        points: alliance.points + count * RULES.help.points,
      },
    },
    events: [{ type: "alliesHelped", at: state.now, count }],
  };
}

/** Les alliés viennent sur le chantier : le temps qu'il reste raccourcit, une fois par chantier. */
function askHelp(state: PlayerState): Outcome {
  if (state.alliance === null) return { error: "noAlliance" };
  const construction = state.construction;
  if (construction === null) return { error: "noConstruction" };
  if (construction.helped) return { error: "alreadyHelped" };
  const left = Math.max(0, construction.endsAt - state.now);
  const savedMs = Math.floor((left * RULES.help.buildPercent) / 100);
  return {
    state: {
      ...state,
      construction: { ...construction, endsAt: construction.endsAt - savedMs, helped: true },
    },
    events: [{ type: "buildHelped", at: state.now, savedMs }],
  };
}

/** Le cadeau du jour, d'après le niveau de l'alliance, en millionièmes d'unité. */
export function giftFor(level: number): Readonly<Record<ResourceId, number>> & {
  readonly energy: number;
} {
  let percent = 100;
  for (const step of RULES.gift.levels) if (level >= step.from) percent = step.percent;
  const scaled = (amount: number): number => Math.floor((amount * percent * MICRO) / 100);
  return {
    sugar: scaled(RULES.gift.sugar),
    bricks: scaled(RULES.gift.bricks),
    proteins: scaled(RULES.gift.proteins),
    energy: RULES.gift.energy,
  };
}

/** Un cadeau entre toujours en entier, même si la réserve ou la jauge est pleine. */
function claimGift(state: PlayerState): Outcome {
  const alliance = current(state);
  if (alliance === null) return { error: "noAlliance" };
  if (alliance.gift) return { error: "alreadyClaimed" };
  const gift = giftFor(allianceLevel({ tech: alliance.tech, recommended: alliance.recommended }));
  const loot = { sugar: gift.sugar, bricks: gift.bricks, proteins: gift.proteins };
  return {
    state: {
      ...state,
      energy: state.energy + gift.energy,
      resources: {
        sugar: state.resources.sugar + loot.sugar,
        bricks: state.resources.bricks + loot.bricks,
        proteins: state.resources.proteins + loot.proteins,
      },
      alliance: { ...alliance, gift: true },
    },
    events: [{ type: "allianceGift", at: state.now, loot, energy: gift.energy }],
  };
}

function buy(state: PlayerState, item: AllianceShopId): Outcome {
  const alliance = current(state);
  if (alliance === null) return { error: "noAlliance" };
  const price = RULES.shop[item].price;
  if (alliance.credits < price) return { error: "noCredits" };
  const paid: PlayerState = {
    ...state,
    alliance: { ...alliance, credits: alliance.credits - price },
  };
  const events: GameEvent[] = [{ type: "allianceBought", at: state.now, item }];
  switch (item) {
    case "energy":
      return { state: { ...paid, energy: paid.energy + RULES.shop.energy.amount }, events };
    case "ration":
      return {
        state: {
          ...paid,
          resources: {
            ...paid.resources,
            proteins: paid.resources.proteins + RULES.shop.ration.proteins * MICRO,
          },
        },
        events,
      };
    case "shield":
      return { state: raiseShield(paid, RULES.shop.shield.hours, state.now), events };
    case "instant": {
      const construction = paid.construction;
      if (construction === null) return { error: "noConstruction" };
      // Le chantier se termine à l'instant : le moteur le clôt en avançant.
      return { state: { ...paid, construction: { ...construction, endsAt: state.now } }, events };
    }
  }
}

/** Applique un ordre d'alliance. */
export function allianceOrder(
  state: PlayerState,
  order:
    | { readonly type: "joinAlliance"; readonly banner: BannerId }
    | { readonly type: "donate"; readonly tech: AllianceTechId }
    | { readonly type: "recommend"; readonly tech: AllianceTechId }
    | { readonly type: "helpAllies" }
    | { readonly type: "askHelp" }
    | { readonly type: "claimGift" }
    | { readonly type: "buyAlliance"; readonly item: AllianceShopId },
): Outcome {
  switch (order.type) {
    case "joinAlliance":
      return join(state, order.banner);
    case "donate":
      return donate(state, order.tech);
    case "recommend":
      return recommend(state, order.tech);
    case "helpAllies":
      return helpAllies(state);
    case "askHelp":
      return askHelp(state);
    case "claimGift":
      return claimGift(state);
    case "buyAlliance":
      return buy(state, order.item);
  }
}
