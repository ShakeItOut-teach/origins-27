import { describe, expect, it } from "vitest";
import {
  ALLIANCE_SHOP_IDS,
  ALLIANCE_TECH_IDS,
  BANNER_IDS,
  BALANCE,
  BalanceSchema,
  FOSSIL_AGES,
  FOSSIL_IDS,
  SEASON_DAYS,
  ZONE_EVENT_KINDS,
  en,
  fr,
  MAX_RELEASED_TIER,
  MUTATION_IDS,
  ORDER_TYPES,
  OrderSchema,
  ORGANELLE_IDS,
  TRAIT_IDS,
  UI_ELEMENT_IDS,
  UNLOCKS,
} from "./index";

describe("table de déblocage", () => {
  it("les paliers se suivent à partir de 0", () => {
    expect(UNLOCKS.map((u) => u.tier)).toEqual(UNLOCKS.map((_, i) => i));
  });

  it("le palier 0 n'a aucune condition", () => {
    expect(UNLOCKS[0]).toMatchObject({ condition: null, minDay: null });
  });

  it("chaque ordre appartient à exactement un palier", () => {
    const all = UNLOCKS.flatMap((u) => u.orders);
    expect([...all].sort()).toEqual([...ORDER_TYPES].sort());
  });

  it("chaque élément d'interface appartient à exactement un palier", () => {
    const all = UNLOCKS.flatMap((u) => u.ui);
    expect([...all].sort()).toEqual([...UI_ELEMENT_IDS].sort());
  });

  it("tous les ordres existants sont dans les paliers livrés", () => {
    const released = UNLOCKS.filter((u) => u.tier <= MAX_RELEASED_TIER).flatMap((u) => u.orders);
    expect([...released].sort()).toEqual([...ORDER_TYPES].sort());
  });

  it("les dates minimales ne reculent jamais", () => {
    let last = 0;
    for (const u of UNLOCKS) {
      if (u.minDay !== null) {
        expect(u.minDay).toBeGreaterThanOrEqual(last);
        last = u.minDay;
      }
    }
  });
});

describe("équilibrage", () => {
  it("refuse une donnée invalide", () => {
    const broken = { ...BALANCE, tap: { ...BALANCE.tap, yield: -1 } };
    expect(BalanceSchema.safeParse(broken).success).toBe(false);
    expect(BalanceSchema.safeParse({ ...BALANCE, surprise: 1 }).success).toBe(false);
  });

  it("le premier organite est payable avec la réserve de départ", () => {
    const cheapest = Math.min(...ORGANELLE_IDS.map((id) => BALANCE.organelles[id].buildCost.sugar));
    expect(cheapest).toBeLessThanOrEqual(BALANCE.baseStorage.sugar);
  });

  it("les organites du palier 1 ne coûtent pas de briques (elles arrivent au palier 2)", () => {
    for (const id of ORGANELLE_IDS) {
      const o = BALANCE.organelles[id];
      if (o.tier < 2) expect(o.buildCost.bricks).toBe(0);
    }
  });

  it("il y a assez d'organites au palier 1 pour atteindre le palier 2", () => {
    const needed = UNLOCKS[2]?.condition?.atLeast ?? 0;
    const available = ORGANELLE_IDS.filter((id) => BALANCE.organelles[id].tier <= 1).length;
    expect(available).toBeGreaterThanOrEqual(needed);
  });

  it("chaque mutation a un trait visible différent", () => {
    const traits = MUTATION_IDS.map((id) => BALANCE.mutations[id].trait);
    expect(new Set(traits).size).toBe(MUTATION_IDS.length);
    expect([...traits].sort()).toEqual([...TRAIT_IDS].sort());
  });

  it("il y a plus de mutations que de choix proposés", () => {
    expect(MUTATION_IDS.length).toBeGreaterThan(BALANCE.mutationOffer.choices);
  });
});

describe("alliances et événements", () => {
  it("les quatre sortes d'événements ont un poids, et les technologies couvrent trois directions", () => {
    for (const kind of ZONE_EVENT_KINDS) expect(BALANCE.events[kind].weight).toBeGreaterThan(0);
    const branches = new Set(ALLIANCE_TECH_IDS.map((id) => BALANCE.alliance.techs[id].branch));
    expect(branches.size).toBe(3);
    for (const id of ALLIANCE_TECH_IDS) {
      const tech = BALANCE.alliance.techs[id];
      expect(tech.stats.length > 0 || id === "reinforcements").toBe(true);
    }
    expect(BALANCE.alliance.tier).toBe(BALANCE.events.tier);
    expect(UNLOCKS[BALANCE.alliance.tier]?.minDay).toBe(9);
  });
});

describe("ordres", () => {
  it("accepte un ordre valide et refuse le reste", () => {
    expect(OrderSchema.safeParse({ type: "harvest", taps: 3 }).success).toBe(true);
    expect(OrderSchema.safeParse({ type: "harvest", taps: 0 }).success).toBe(false);
    expect(OrderSchema.safeParse({ type: "harvest", taps: 3, now: 5 }).success).toBe(false);
    expect(OrderSchema.safeParse({ type: "build", organelle: "castle" }).success).toBe(false);
    expect(OrderSchema.safeParse({ type: "fly" }).success).toBe(false);
  });

  it("les lieux de l'océan passent la validation : gisement, organisme, Léviathan", () => {
    const valid = (order: unknown): boolean => OrderSchema.safeParse(order).success;
    const party = { hunter: 1, armored: 0, swift: 0 };
    expect(valid({ type: "gather", deposit: "d:3:-4:1234" })).toBe(true);
    expect(valid({ type: "gather", deposit: "v:-2:5:1234:3" })).toBe(true);
    expect(valid({ type: "gather", deposit: "d:x:1:2" })).toBe(false);
    expect(valid({ type: "gather", deposit: "v:1:2:3" })).toBe(false);
    expect(valid({ type: "spyRival", rival: "o:499" })).toBe(true);
    expect(valid({ type: "spyRival", rival: "r:1:-1" })).toBe(true);
    expect(valid({ type: "sendRaid", rival: "o:12", party })).toBe(true);
    expect(valid({ type: "sendRaid", rival: "o:12345", party })).toBe(false);
    expect(valid({ type: "huntLeviathan", event: "e:1:-2:3456", party })).toBe(true);
    expect(valid({ type: "huntLeviathan", event: "p:1:-2:3456", party })).toBe(false);
    expect(valid({ type: "joinAlliance", banner: "krk" })).toBe(true);
    expect(valid({ type: "joinAlliance", banner: "moi" })).toBe(false);
    expect(valid({ type: "donate", tech: "pack" })).toBe(true);
    expect(valid({ type: "buyAlliance", item: "shield" })).toBe(true);
    expect(valid({ type: "claimGift" })).toBe(true);
  });
});

describe("textes", () => {
  it("mêmes clés en français et en anglais, aucun texte vide", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    for (const text of [...Object.values(fr), ...Object.values(en)]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  it("chaque organite et chaque mutation a un nom et une explication", () => {
    const keys = new Set(Object.keys(fr));
    for (const id of ORGANELLE_IDS) {
      expect(keys.has(`organelle.${id}.name`)).toBe(true);
      expect(keys.has(`organelle.${id}.role`)).toBe(true);
    }
    for (const id of MUTATION_IDS) {
      expect(keys.has(`mutation.${id}.name`)).toBe(true);
      expect(keys.has(`mutation.${id}.effect`)).toBe(true);
    }
  });

  it("événements, bannières, technologies, boutique et fossiles ont leurs textes", () => {
    const keys = new Set(Object.keys(fr));
    for (const kind of ZONE_EVENT_KINDS) {
      expect(keys.has(`event.${kind}.name`)).toBe(true);
      expect(keys.has(`event.${kind}.text`)).toBe(true);
      expect(keys.has(`news.event.${kind}`)).toBe(true);
    }
    for (const id of BANNER_IDS) expect(keys.has(`banner.${id}.name`)).toBe(true);
    for (const id of ALLIANCE_TECH_IDS) expect(keys.has(`alliance.tech.${id}.name`)).toBe(true);
    for (const id of ALLIANCE_SHOP_IDS) expect(keys.has(`alliance.shop.${id}`)).toBe(true);
    for (const id of FOSSIL_IDS) {
      expect(keys.has(`fossil.${id}.name`)).toBe(true);
      expect(keys.has(`fossil.${id}.fact`)).toBe(true);
      expect(FOSSIL_AGES[id]).toBeGreaterThan(0);
    }
    // Un fossile par jour de saison.
    expect(FOSSIL_IDS).toHaveLength(SEASON_DAYS);
  });

  it("chaque palier livré après le premier a sa mise en scène", () => {
    const keys = new Set(Object.keys(fr));
    for (let tier = 1; tier <= MAX_RELEASED_TIER; tier++) {
      expect(keys.has(`unlock.${String(tier)}.title`)).toBe(true);
      expect(keys.has(`unlock.${String(tier)}.text`)).toBe(true);
    }
  });
});
