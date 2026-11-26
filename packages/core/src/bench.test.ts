import { ALLIANCE_TECH_IDS, BALANCE, BANNER_IDS } from "@o27/data";
import type { BannerId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  MICRO,
  advance,
  allianceView,
  applyOrder,
  bannerList,
  benchBanner,
  benchOf,
  createPlayer,
  deserializeState,
  humanCard,
  nearestBanner,
  serializeState,
  withCrowd,
} from "./index";
import type { Crowd, HumanCard, PlayerState } from "./index";

const SEASON = 1_800_000_000_000;
/** Les alliances s'ouvrent au jour 9. */
const OPEN = SEASON + 8 * DAY_MS;
const NOW = OPEN + 2 * DAY_MS + 3_600_000;

function card(slot: number, banner: BannerId | null, given = 0): HumanCard {
  return {
    slot,
    name: `Humanus ${String(slot)}`,
    hue: 10,
    tier: 9,
    zone: 1,
    scores: { power: 1, cell: 1, troops: 0, loot: 0, defense: 0 },
    week: 0,
    contest: 0,
    seenAt: SEASON,
    family: null,
    banner,
    given,
  };
}

/** Un joueur du palier 9, riche, que personne n'attaque, avec cette foule autour de lui. */
function player(crowd: Crowd | undefined, now = NOW): PlayerState {
  const base = createPlayer(7, SEASON, now, { worldSeed: 27, slot: 4 });
  const ready: PlayerState = {
    ...base,
    tier: 9,
    resources: { sugar: 100_000 * MICRO, bricks: 100_000 * MICRO, proteins: 100 * MICRO },
    shieldUntil: 0,
    nextRaidAt: now + 30 * DAY_MS,
  };
  return advance(crowd === undefined ? ready : withCrowd(ready, crowd), now).state;
}

/** Une bannière qui n'est pas celle que le joueur aurait rejointe seul. */
function elsewhere(): BannerId {
  const alone = player(undefined);
  const found = BANNER_IDS.find((banner) => banner !== alone.alliance?.banner);
  if (found === undefined) throw new Error("bannière attendue");
  return found;
}

describe("les bancs : les humains d'une bannière, regroupés par le jeu", () => {
  it("seul, le joueur rejoint la bannière la plus présente autour de lui", () => {
    const alone = player(undefined);
    expect(alone.alliance?.banner).toBe(nearestBanner(alone));
    expect(benchBanner(alone)).toBeNull();
  });

  it("s'il y a déjà des humains, le joueur rejoint leur banc", () => {
    const banner = elsewhere();
    const state = player({ cards: [card(11, banner), card(12, banner), card(13, null)] });
    expect(state.alliance?.banner).toBe(banner);
    expect(benchOf(state, banner).map((entry) => entry.slot)).toEqual([11, 12]);
  });

  it("le banc le plus peuplé gagne ; un banc plein n'accueille plus personne", () => {
    const banner = elsewhere();
    const second = BANNER_IDS.find((entry) => entry !== banner) ?? "aby";
    const many = Array.from({ length: 3 }, (_, index) => card(20 + index, banner));
    expect(player({ cards: [...many, card(30, second)] }).alliance?.banner).toBe(banner);
    const full = Array.from({ length: BALANCE.alliance.benchHumans }, (_, index) =>
      card(40 + index, banner),
    );
    expect(player({ cards: [...full, card(90, second)] }).alliance?.banner).toBe(second);
  });

  it("les dons des autres humains du banc font avancer les technologies de chacun", () => {
    const banner = elsewhere();
    const alone = player({ cards: [card(11, banner)] });
    const shared = withCrowd(alone, { cards: [card(11, banner, 5000)] });
    const sum = (state: PlayerState): number => {
      const view = allianceView(state);
      return ALLIANCE_TECH_IDS.reduce((total, id) => total + (view?.tech[id] ?? 0), 0);
    };
    expect(sum(shared)).toBe(sum(alone) + 5000);
    // Ceux d'une autre bannière ne comptent pas.
    const other = BANNER_IDS.find((entry) => entry !== banner) ?? "aby";
    expect(sum(withCrowd(alone, { cards: [card(11, other, 5000)] }))).toBe(sum(alone));
  });

  it("les points des autres n'entrent jamais dans la sauvegarde, même après un don", () => {
    const banner = elsewhere();
    const alone = player({ cards: [card(11, banner)] });
    const shared = withCrowd(alone, { cards: [card(11, banner, 5000)] });
    const tech = alone.alliance?.recommended ?? "network";
    const given = applyOrder(shared, { type: "donate", tech }, shared.now);
    const plain = applyOrder(alone, { type: "donate", tech }, alone.now);
    expect(given.ok && plain.ok).toBe(true);
    if (!given.ok || !plain.ok) return;
    // Ce que la partie garde : ses propres points et ceux des membres simulés, pas plus.
    const saved = (state: PlayerState): number => {
      const raw = JSON.parse(serializeState(state)) as {
        alliance: { tech: Record<string, number> };
      };
      return Object.values(raw.alliance.tech).reduce((total, value) => total + value, 0);
    };
    const donated = (events: readonly { type: string; points?: number }[]): number =>
      events.find((event) => event.type === "allianceDonated")?.points ?? 0;
    expect(saved(given.state)).toBe(saved(alone) + donated(given.events));
    expect(saved(plain.state)).toBe(saved(alone) + donated(plain.events));
    expect(deserializeState(serializeState(given.state)).crowd).toBeUndefined();
  });

  it("la vitrine porte la bannière et la contribution ; la liste compte les humains", () => {
    const banner = elsewhere();
    const state = player({ cards: [card(11, banner), card(12, banner)] });
    const shown = humanCard(state);
    expect(shown.banner).toBe(banner);
    expect(shown.given).toBe(state.alliance?.points);
    expect(bannerList(state).find((row) => row.banner === banner)?.humans).toBe(2);
  });
});
