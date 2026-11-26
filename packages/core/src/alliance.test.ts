import { ALLIANCE_TECH_IDS, BALANCE, BANNER_IDS, FOSSIL_IDS, SEASON_DAYS } from "@o27/data";
import type { AllianceTechId, Order } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  allianceLevel,
  alliancePercent,
  allianceTechLevel,
  allianceToday,
  allianceView,
  applyOrder,
  bannerList,
  bannerMembers,
  bannerOf,
  bannerProgress,
  createPlayer,
  deserializeState,
  donationCost,
  donationPoints,
  fossilOfDay,
  gazette,
  giftFor,
  helpRequests,
  isAlly,
  isOfficer,
  nearestBanner,
  oceanRivals,
  partyOf,
  productionRate,
  ranking,
  reinforcements,
  serializeState,
  techLevel,
  techThreshold,
} from "./index";
import type { OrderErrorCode, PlayerState } from "./index";
import { allianceDue, pour, techOrder } from "./banners";

const HOUR = 3_600_000;
const SEASON = 1_800_000_000_000;
const RULES = BALANCE.alliance;
/** Les alliances s'ouvrent au jour 9 : la saison a alors huit jours pleins. */
const OPEN = SEASON + 8 * DAY_MS;
const NOW = OPEN + 2 * DAY_MS + HOUR;

/** Un joueur du palier 9, riche, que personne n'attaque pendant le test. */
function player(patch: Partial<PlayerState> = {}, now = NOW, slot = 4): PlayerState {
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot });
  return advance(
    {
      ...base,
      tier: 9,
      counters: {
        ...base.counters,
        harvests: 10,
        organellesBuilt: 4,
        mutationsChosen: 1,
        mapHarvests: 5,
        huntsWon: 1,
      },
      mutations: ["thrift"],
      organelles: {
        ...base.organelles,
        mitochondrion: 5,
        ribosome: 3,
        vacuole: 5,
        nursery: 1,
        receptor: 3,
        nucleus: 6,
      },
      spies: 6,
      resources: { sugar: 100_000 * MICRO, bricks: 100_000 * MICRO, proteins: 100 * MICRO },
      troops: partyOf({ hunter: 20 }),
      shieldUntil: 0,
      nextRaidAt: now + 30 * DAY_MS,
      ...patch,
    },
    now,
  ).state;
}

function ok(state: PlayerState, order: Order, now = state.now): PlayerState {
  const result = applyOrder(state, order, now);
  if (!result.ok) throw new Error(`ordre refusé : ${result.error}`);
  return result.state;
}

function refusal(state: PlayerState, order: Order, now = state.now): OrderErrorCode | null {
  const result = applyOrder(state, order, now);
  return result.ok ? null : result.error;
}

/** Une technologie qui n'est pas celle que l'alliance recommande. */
function other(state: PlayerState): AllianceTechId {
  const recommended = allianceView(state)?.recommended;
  const found = ALLIANCE_TECH_IDS.find((id) => id !== recommended);
  if (found === undefined) throw new Error("technologie attendue");
  return found;
}

describe("les six bannières", () => {
  it("chaque organisme a sa bannière, toujours la même, et toutes ont des membres", () => {
    let total = 0;
    for (const banner of BANNER_IDS) {
      expect(bannerMembers(27, banner)).toBeGreaterThan(20);
      total += bannerMembers(27, banner);
    }
    expect(total).toBe(BALANCE.world.organisms);
    expect(bannerOf(27, 12)).toBe(bannerOf(27, 12));
    const here = Array.from({ length: 60 }, (_, slot) => bannerOf(27, slot));
    const there = Array.from({ length: 60 }, (_, slot) => bannerOf(28, slot));
    expect(there).not.toEqual(here);
  });

  it("au jour 9, la bannière la plus présente autour du joueur le recrute d'office", () => {
    const base = createPlayer(7, SEASON, OPEN - HOUR, { worldSeed: 27, slot: 4 });
    const early = advance(
      {
        ...base,
        tier: 8,
        counters: { ...base.counters, harvests: 10, organellesBuilt: 4, mutationsChosen: 1 },
        nextRaidAt: OPEN + 30 * DAY_MS,
      },
      OPEN - HOUR,
    ).state;
    expect(early.alliance).toBeNull();
    expect(refusal(early, { type: "claimGift" })).toBe("locked");
    const step = advance(early, OPEN);
    const banner = nearestBanner(step.state);
    expect(step.events).toContainEqual({ type: "allianceJoined", at: OPEN, banner, auto: true });
    expect(step.state.alliance).toMatchObject({
      banner,
      points: 0,
      credits: 0,
      freeUntil: OPEN + RULES.freeHours * HOUR,
      syncedAt: OPEN,
    });
    // Une seule fois : revenir plus tard ne recrute pas de nouveau.
    expect(advance(step.state, OPEN + DAY_MS).events.some((e) => e.type === "allianceJoined")).toBe(
      false,
    );
    expect(deserializeState(serializeState(step.state))).toEqual(step.state);
  });

  it("on change gratuitement pendant un jour ; ensuite on repart de zéro", () => {
    const state = player({}, OPEN + HOUR);
    const mine = state.alliance?.banner;
    const elsewhere = BANNER_IDS.find((banner) => banner !== mine);
    if (mine === undefined || elsewhere === undefined) throw new Error("bannière attendue");
    expect(refusal(state, { type: "joinAlliance", banner: mine })).toBe("sameAlliance");
    const given = ok(state, { type: "donate", tech: other(state) });
    const moved = ok(given, { type: "joinAlliance", banner: elsewhere });
    expect(moved.alliance?.banner).toBe(elsewhere);
    expect(moved.alliance?.points).toBe(RULES.donation.points);
    expect(moved.alliance?.donations).toBe(1);
    expect(moved.alliance?.tech).toEqual(bannerProgress(27, elsewhere, SEASON, moved.now).tech);
    const later = advance(moved, OPEN + 2 * DAY_MS).state;
    const back = ok(later, { type: "joinAlliance", banner: mine });
    expect(back.alliance).toMatchObject({ banner: mine, points: 0, credits: 0 });
  });

  it("le classement des bannières compte le joueur dans la sienne", () => {
    const state = player();
    const rows = bannerList(state);
    expect(rows.map((row) => row.power)).toEqual(
      [...rows.map((row) => row.power)].sort((a, b) => b - a),
    );
    expect(rows.filter((row) => row.mine)).toHaveLength(1);
    const mine = rows.find((row) => row.mine);
    expect(mine?.banner).toBe(state.alliance?.banner);
    expect(mine?.members).toBe(bannerMembers(27, mine?.banner ?? "aby") + 1);
    for (const row of rows) expect(row.level).toBeGreaterThan(1);
  });
});

describe("les technologies d'alliance", () => {
  it("chaque niveau demande deux fois plus de points que le précédent", () => {
    expect([0, 1, 2, 3, 4, 5].map((level) => techThreshold(level))).toEqual([
      0, 400, 1200, 2800, 6000, 12400,
    ]);
    expect(techLevel(399)).toBe(0);
    expect(techLevel(400)).toBe(1);
    expect(techLevel(12_400)).toBe(5);
    expect(techLevel(99_999)).toBe(5);
  });

  it("les points vont à la technologie recommandée ; à chaque niveau, on passe à la moins avancée", () => {
    const order = techOrder(27, "aby");
    const first = order[0];
    const second = order[1];
    if (first === undefined || second === undefined) throw new Error("ordre attendu");
    const start = bannerProgress(27, "aby", SEASON, OPEN);
    expect(start.recommended).toBe(first);
    expect(allianceLevel(start)).toBe(1);
    const one = pour(start, order, 399);
    expect(one.tech[first]).toBe(399);
    expect(one.recommended).toBe(first);
    const two = pour(one, order, 51);
    expect(two.tech[first]).toBe(400);
    expect(two.tech[second]).toBe(50);
    expect(two.recommended).toBe(second);
    // Tout finit au maximum, et plus rien n'est recommandé.
    const full = pour(start, order, 9 * 12_400 + 5);
    expect(allianceLevel(full)).toBe(1 + 9 * RULES.tech.maxLevel);
    expect(full.recommended).toBeNull();
  });

  it("les membres font avancer l'alliance tout seuls, et ses bonus s'appliquent au joueur", () => {
    const state = player();
    const day3 = bannerProgress(27, state.alliance?.banner ?? "aby", SEASON, NOW);
    expect(allianceLevel(day3)).toBeGreaterThan(5);
    const view = allianceView(state);
    expect(view).toEqual(day3);
    const later = advance(state, NOW + 5 * DAY_MS).state;
    expect(allianceLevel(allianceView(later) ?? day3)).toBeGreaterThan(allianceLevel(day3));
    // Membre : 5 % de production en plus, puis 2 % par niveau du Réseau nutritif.
    const alone = { ...state, alliance: null };
    expect(alliancePercent(alone, "sugarProduction")).toBe(0);
    expect(alliancePercent(state, "sugarProduction")).toBe(
      RULES.memberBonusPercent +
        RULES.techs.network.percentPerLevel * allianceTechLevel(state, "network"),
    );
    expect(productionRate(state, "sugar")).toBeGreaterThan(productionRate(alone, "sugar"));
    expect(alliancePercent(state, "defense")).toBe(
      RULES.techs.membrane.percentPerLevel * allianceTechLevel(state, "membrane"),
    );
  });

  it("avancer d'une traite ou en plusieurs fois donne le même état, niveau gagné compris", () => {
    const start = player({ resources: { sugar: 0, bricks: 0, proteins: 0 }, troops: partyOf() });
    const due = allianceDue(start);
    expect(due).toBeGreaterThan(start.now);
    expect(due).toBeLessThan(start.now + 3 * DAY_MS);
    const level = allianceLevel(allianceView(start) ?? { tech: {} as never, recommended: null });
    const just = advance(start, due - 1).state;
    expect(allianceLevel(allianceView(just) ?? { tech: {} as never, recommended: null })).toBe(
      level,
    );
    const to = due + 60_000;
    const once = advance(start, to).state;
    expect(allianceLevel(allianceView(once) ?? { tech: {} as never, recommended: null })).toBe(
      level + 1,
    );
    const twice = advance(advance(start, due - 17).state, to).state;
    const thrice = advance(advance(start, due + 3).state, to).state;
    expect(serializeState(twice)).toBe(serializeState(once));
    expect(serializeState(thrice)).toBe(serializeState(once));
  });
});

describe("donner", () => {
  it("coûte des ressources, rapporte contribution et crédits, davantage sur la recommandée", () => {
    const state = player();
    const recommended = allianceView(state)?.recommended;
    if (recommended === null || recommended === undefined) {
      throw new Error("recommandation attendue");
    }
    const plain = other(state);
    expect(donationPoints(state, plain)).toBe(RULES.donation.points);
    expect(donationPoints(state, recommended)).toBe(
      (RULES.donation.points * RULES.donation.recommendedPercent) / 100,
    );
    const before = allianceView(state)?.tech[plain] ?? 0;
    const step = applyOrder(state, { type: "donate", tech: plain }, NOW);
    if (!step.ok) throw new Error("don refusé");
    expect(step.events).toContainEqual({
      type: "allianceDonated",
      at: NOW,
      tech: plain,
      points: RULES.donation.points,
    });
    const given = step.state;
    expect(given.resources.sugar).toBe(state.resources.sugar - donationCost().sugar);
    expect(given.resources.bricks).toBe(state.resources.bricks - donationCost().bricks);
    expect(given.alliance).toMatchObject({
      points: RULES.donation.points,
      credits: RULES.donation.points,
      donations: 1,
      syncedAt: NOW,
    });
    expect(allianceView(given)?.tech[plain]).toBe(before + RULES.donation.points);
    const best = ok(given, { type: "donate", tech: recommended });
    expect(best.alliance?.points).toBe(RULES.donation.points + donationPoints(state, recommended));
    const poor = { ...state, resources: { ...state.resources, bricks: 0 } };
    expect(refusal(poor, { type: "donate", tech: plain })).toBe("insufficient");
    expect(deserializeState(serializeState(best))).toEqual(best);
  });

  it("vingt dons par jour, pas un de plus ; le lendemain, on recommence", () => {
    let state = player();
    const tech = other(state);
    for (let index = 0; index < RULES.donation.perDay; index++) {
      state = ok(state, { type: "donate", tech });
    }
    expect(allianceToday(state).donations).toBe(RULES.donation.perDay);
    expect(refusal(state, { type: "donate", tech })).toBe("donationsDone");
    const tomorrow = advance(state, state.now + DAY_MS).state;
    expect(allianceToday(tomorrow).donations).toBe(0);
    expect(refusal(tomorrow, { type: "donate", tech })).toBeNull();
  });

  it("avec assez de contribution, on devient Officier et on choisit la recommandation", () => {
    let state = player();
    const tech = other(state);
    expect(isOfficer(state)).toBe(false);
    expect(refusal(state, { type: "recommend", tech })).toBe("notOfficer");
    while (!isOfficer(state)) state = ok(state, { type: "donate", tech });
    expect(state.alliance?.points).toBeGreaterThanOrEqual(RULES.officerPoints);
    const target = ALLIANCE_TECH_IDS.find(
      (id) => id !== allianceView(state)?.recommended && allianceTechLevel(state, id) < 5,
    );
    if (target === undefined) throw new Error("technologie attendue");
    const chosen = ok(state, { type: "recommend", tech: target });
    expect(allianceView(chosen)?.recommended).toBe(target);
    // Les membres y versent désormais leurs points.
    const before = allianceView(chosen)?.tech[target] ?? 0;
    const later = advance(chosen, chosen.now + HOUR).state;
    expect(allianceView(later)?.tech[target]).toBeGreaterThan(before);
  });

  it("un don peut faire gagner un niveau, et une technologie au maximum ne prend plus rien", () => {
    const state = player();
    const alliance = state.alliance;
    if (alliance === null) throw new Error("alliance attendue");
    const tech = other(state);
    const close = {
      ...state,
      alliance: { ...alliance, tech: { ...alliance.tech, [tech]: techThreshold(3) - 10 } },
    };
    expect(allianceTechLevel(close, tech)).toBe(2);
    expect(allianceTechLevel(ok(close, { type: "donate", tech }), tech)).toBe(3);
    const maxed = {
      ...state,
      alliance: { ...alliance, tech: { ...alliance.tech, [tech]: techThreshold(5) } },
    };
    expect(refusal(maxed, { type: "donate", tech })).toBe("maxLevel");
  });
});

describe("l'entraide, le cadeau et la boutique", () => {
  it("les demandes d'aide arrivent au fil du jour ; y répondre rapporte des crédits", () => {
    const morning = player({}, OPEN + DAY_MS + 60_000);
    expect(helpRequests(morning)).toBe(RULES.help.start);
    const step = applyOrder(morning, { type: "helpAllies" }, morning.now);
    if (!step.ok) throw new Error("aide refusée");
    expect(step.events).toContainEqual({
      type: "alliesHelped",
      at: morning.now,
      count: RULES.help.start,
    });
    expect(step.state.alliance).toMatchObject({
      helped: RULES.help.start,
      credits: RULES.help.start * RULES.help.credits,
      points: RULES.help.start * RULES.help.points,
    });
    expect(refusal(step.state, { type: "helpAllies" })).toBe("noHelp");
    const noon = advance(step.state, OPEN + DAY_MS + 12 * HOUR).state;
    expect(helpRequests(noon)).toBe(24);
    const night = advance(noon, OPEN + DAY_MS + 23 * HOUR).state;
    expect(helpRequests(night)).toBe(RULES.help.perDay - RULES.help.start);
    expect(helpRequests(advance(night, OPEN + 2 * DAY_MS + 60_000).state)).toBe(RULES.help.start);
  });

  it("les alliés raccourcissent un chantier, une seule fois", () => {
    const state = player();
    expect(refusal(state, { type: "askHelp" })).toBe("noConstruction");
    const building = ok(state, { type: "upgrade", organelle: "nursery" });
    const left = (building.construction?.endsAt ?? 0) - building.now;
    expect(building.construction?.helped).toBe(false);
    const step = applyOrder(building, { type: "askHelp" }, building.now);
    if (!step.ok) throw new Error("aide refusée");
    const saved = Math.floor((left * RULES.help.buildPercent) / 100);
    expect(step.events).toContainEqual({ type: "buildHelped", at: building.now, savedMs: saved });
    expect(step.state.construction).toMatchObject({
      endsAt: (building.construction?.endsAt ?? 0) - saved,
      helped: true,
    });
    expect(refusal(step.state, { type: "askHelp" })).toBe("alreadyHelped");
    expect(deserializeState(serializeState(step.state))).toEqual(step.state);
  });

  it("un cadeau par jour, plus gros quand l'alliance monte", () => {
    const state = player();
    const level = allianceLevel(allianceView(state) ?? { tech: {} as never, recommended: null });
    const step = applyOrder(state, { type: "claimGift" }, NOW);
    if (!step.ok) throw new Error("cadeau refusé");
    const gift = giftFor(level);
    expect(step.state.resources.proteins).toBe(state.resources.proteins + gift.proteins);
    expect(step.state.energy).toBe(state.energy + gift.energy);
    expect(refusal(step.state, { type: "claimGift" })).toBe("alreadyClaimed");
    expect(refusal(advance(step.state, NOW + DAY_MS).state, { type: "claimGift" })).toBeNull();
    expect(giftFor(1).sugar).toBe(RULES.gift.sugar * MICRO);
    expect(giftFor(4).sugar).toBe(giftFor(1).sugar);
    expect(giftFor(5).sugar).toBeGreaterThan(giftFor(4).sugar);
    expect(giftFor(30).sugar).toBe(3 * giftFor(1).sugar);
  });

  it("la boutique échange les crédits contre de l'énergie, des protéines, un bouclier, un chantier fini", () => {
    const base = player();
    const alliance = base.alliance;
    if (alliance === null) throw new Error("alliance attendue");
    expect(refusal(base, { type: "buyAlliance", item: "energy" })).toBe("noCredits");
    const rich = { ...base, alliance: { ...alliance, credits: 5000 } };
    const energy = ok(rich, { type: "buyAlliance", item: "energy" });
    expect(energy.energy).toBe(rich.energy + RULES.shop.energy.amount);
    expect(energy.alliance?.credits).toBe(5000 - RULES.shop.energy.price);
    expect(deserializeState(serializeState(energy))).toEqual(energy);
    const ration = ok(rich, { type: "buyAlliance", item: "ration" });
    expect(ration.resources.proteins).toBe(
      rich.resources.proteins + RULES.shop.ration.proteins * MICRO,
    );
    const shield = ok(rich, { type: "buyAlliance", item: "shield" });
    expect(shield.shieldUntil).toBe(NOW + RULES.shop.shield.hours * HOUR);
    expect(shield.nextRaidAt ?? 0).toBeGreaterThan(shield.shieldUntil);
    expect(refusal(rich, { type: "buyAlliance", item: "instant" })).toBe("noConstruction");
    const building = ok(rich, { type: "upgrade", organelle: "nursery" });
    const done = ok(building, { type: "buyAlliance", item: "instant" });
    expect(done.construction).toBeNull();
    expect(done.organelles.nursery).toBe(building.organelles.nursery + 1);
    expect(done.alliance?.credits).toBe(5000 - RULES.shop.instant.price);
  });
});

describe("alliés et ennemis", () => {
  it("on n'espionne ni n'attaque un allié, et aucun allié ne vient attaquer", () => {
    const state = player();
    const ally = oceanRivals(state).find((rival) => isAlly(state, rival));
    const foe = oceanRivals(state).find((rival) => !isAlly(state, rival));
    if (ally === undefined || foe === undefined) throw new Error("voisins attendus");
    expect(ally.banner).toBe(state.alliance?.banner);
    expect(refusal(state, { type: "spyRival", rival: ally.id })).toBe("ally");
    expect(refusal(state, { type: "sendRaid", rival: ally.id, party: state.troops })).toBe("ally");
    expect(refusal(state, { type: "spyRival", rival: foe.id })).toBeNull();
    // Dix jours d'attaques : jamais un allié parmi les attaquants.
    const exposed = { ...state, nextRaidAt: state.now + HOUR, nightStart: null };
    const events = advance(exposed, state.now + 10 * DAY_MS).events;
    const attackers = events.flatMap((event) =>
      event.type === "attackRepelled" || event.type === "attackSuffered" ? [event.rival] : [],
    );
    expect(attackers.length).toBeGreaterThan(3);
    for (const id of attackers) {
      expect(bannerOf(27, Number(id.slice(2)))).not.toBe(state.alliance?.banner);
    }
  });

  it("les alliés proches envoient des renforts, que la technologie Renforts grossit", () => {
    // Au jour 11, presque tout le monde est déjà remonté d'une zone : le joueur aussi.
    const state = player({ zone: 1 });
    const alliance = state.alliance;
    if (alliance === null) throw new Error("alliance attendue");
    const help = reinforcements(state, state.now);
    expect(help).toBeGreaterThan(0);
    expect(reinforcements({ ...state, alliance: null }, state.now)).toBe(0);
    const level = allianceTechLevel(state, "reinforcements");
    const boosted = {
      ...state,
      alliance: {
        ...alliance,
        tech: { ...alliance.tech, reinforcements: techThreshold(RULES.tech.maxLevel) },
      },
    };
    expect(level).toBeLessThan(RULES.tech.maxLevel);
    expect(reinforcements(boosted, state.now)).toBeGreaterThan(help);
  });

  it("une sauvegarde d'avant les alliances reçoit sa bannière en revenant", () => {
    const state = player();
    const saved = JSON.parse(serializeState(state)) as Record<string, unknown>;
    const construction = { organelle: "nursery", toLevel: 2, endsAt: state.now + HOUR };
    const old = {
      ...Object.fromEntries(
        Object.entries(saved).filter(([key]) => key !== "alliance" && key !== "daily"),
      ),
      construction,
      version: 10,
    };
    const back = deserializeState(JSON.stringify(old));
    expect(back.version).toBe(11);
    expect(back.alliance).toBeNull();
    expect(back.daily).toEqual({ day: 0, wins: 0, losses: 0 });
    expect(back.construction?.helped).toBe(false);
    const step = advance(back, state.now + 1000);
    expect(step.state.alliance?.banner).toBe(nearestBanner(step.state));
    expect(step.events.some((event) => event.type === "allianceJoined")).toBe(true);
  });
});

describe("la Gazette", () => {
  it("montre un fossile différent chaque jour de la saison", () => {
    const shown = Array.from({ length: SEASON_DAYS }, (_, index) => fossilOfDay(27, index + 1));
    expect(new Set(shown).size).toBe(FOSSIL_IDS.length);
    expect(FOSSIL_IDS).toHaveLength(SEASON_DAYS);
    const elsewhere = Array.from({ length: SEASON_DAYS }, (_, index) => fossilOfDay(28, index + 1));
    expect(elsewhere).not.toEqual(shown);
  });

  it("résume le jour : les plus puissants, l'alliance en tête, le rang et les combats du joueur", () => {
    const state = player();
    const paper = gazette(state);
    const power = ranking(state, "power");
    expect(paper.day).toBe(11);
    expect(paper.daysLeft).toBe(SEASON_DAYS + 1 - 11);
    expect(paper.top).toEqual(power.rows.slice(0, 3));
    expect(paper.rank).toBe(power.mine.rank);
    expect(paper.leading?.banner).toBe(bannerList(state)[0]?.banner);
    expect(paper.raider).toEqual(ranking(state, "loot").rows[0]);
    expect(paper.fossil).toBe(fossilOfDay(27, 11));
    expect(paper.briefs.some((news) => news.kind === "leader")).toBe(true);
    expect(paper.briefs.some((news) => news.kind === "allianceLeads")).toBe(true);
    expect([paper.wins, paper.losses]).toEqual([0, 0]);
  });

  it("compte les victoires et les défaites du jour, et repart de zéro à minuit", () => {
    const state = player({ nextRaidAt: NOW + HOUR, troops: partyOf({ guardian: 400 }) });
    const fought = advance(state, NOW + 2 * HOUR);
    expect(fought.events.some((event) => event.type === "attackRepelled")).toBe(true);
    expect(gazette(fought.state).wins).toBe(1);
    expect(gazette(fought.state).losses).toBe(0);
    const weak = player({ nextRaidAt: NOW + HOUR, troops: partyOf(), alliance: null });
    const beaten = advance({ ...weak, alliance: null }, NOW + 2 * HOUR);
    if (beaten.events.some((event) => event.type === "attackSuffered")) {
      expect(gazette(beaten.state).losses).toBe(1);
    }
    const midnight = SEASON + 11 * DAY_MS;
    const tomorrow = advance({ ...fought.state, nextRaidAt: NOW + 30 * DAY_MS }, midnight + 1000);
    expect(gazette(tomorrow.state).wins).toBe(0);
  });

  it("annonce l'ouverture d'une zone et les derniers jours", () => {
    const zoneDay = BALANCE.ocean.zones[2]?.openDay ?? 12;
    const opening = player({}, SEASON + (zoneDay - 1) * DAY_MS + HOUR);
    expect(gazette(opening).headline).toEqual({ kind: "zoneOpens", zone: 2 });
    const last = gazette(player({}, SEASON + 25 * DAY_MS + HOUR));
    expect(last.daysLeft).toBe(2);
    expect([last.headline, ...last.briefs]).toContainEqual({ kind: "lastDays", days: 2 });
    const over = gazette(player({}, SEASON + 27 * DAY_MS + HOUR));
    expect(over.daysLeft).toBe(0);
  });
});
