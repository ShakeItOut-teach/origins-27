import { BALANCE, PLACE_RESOURCE } from "@o27/data";
import type { Order } from "@o27/data";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  advance,
  applyOrder,
  capacity,
  createPlayer,
  deserializeState,
  MICRO,
  placeOffer,
  serializeState,
  slotPosition,
  summarizeAbsence,
  visiblePlaces,
} from "./index";
import type { OrderErrorCode, Place, PlayerState } from "./index";

const T0 = 1_800_000_000_000;
const WORLD = { worldSeed: 27, slot: 4 };
const REGEN = BALANCE.energy.regenSeconds * 1000;

/** Un joueur déjà au palier 3, sans passer par toute la partie. */
function atTier3(overrides: Partial<PlayerState> = {}): PlayerState {
  const base = createPlayer(7, T0, T0, WORLD);
  return {
    ...base,
    tier: 3,
    counters: { ...base.counters, harvests: 10, organellesBuilt: 3, mutationsChosen: 1 },
    mutations: ["thrift"],
    ...overrides,
  };
}

function ok(state: PlayerState, order: Order, now: number): PlayerState {
  const result = applyOrder(state, order, now);
  if (!result.ok) throw new Error(`ordre refusé : ${result.error}`);
  return result.state;
}

function refusal(state: PlayerState, order: Order, now: number): OrderErrorCode | null {
  const result = applyOrder(state, order, now);
  return result.ok ? null : result.error;
}

function places(): readonly Place[] {
  return visiblePlaces(WORLD.worldSeed, WORLD.slot);
}

function place(band: number): Place {
  const found = places().find((entry) => entry.band === band);
  if (found === undefined) throw new Error("lieu attendu");
  return found;
}

function send(target: Place): Order {
  return { type: "sendExpedition", place: target.id };
}

describe("la goutte", () => {
  it("chaque joueur a sa place, toutes différentes, la première au centre", () => {
    expect(slotPosition(0)).toEqual({ x: 0, y: 0 });
    const seen = new Set<string>();
    for (let slot = 0; slot < 500; slot++) {
      const { x, y } = slotPosition(slot);
      seen.add(`${String(x)},${String(y)}`);
    }
    expect(seen.size).toBe(500);
  });

  it("deux voisins sont toujours à au moins un écart l'un de l'autre", () => {
    const spacing = BALANCE.world.playerSpacing;
    for (let slot = 1; slot < 500; slot++) {
      const a = slotPosition(slot - 1);
      const b = slotPosition(slot);
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(spacing);
    }
  });

  it("tout joueur voit six lieux : le plus proche donne des briques, un au moins du sucre", () => {
    for (let slot = 0; slot < 500; slot++) {
      const seen = visiblePlaces(27, slot);
      expect(seen).toHaveLength(6);
      expect(seen[0]?.kind).toBe("debris");
      expect(seen.some((entry) => entry.kind === "sugarCluster")).toBe(true);
      expect(seen.map((entry) => entry.band)).toEqual([0, 0, 1, 1, 2, 2]);
      expect(new Set(seen.map((entry) => entry.id)).size).toBe(6);
    }
  });

  it("les lieux sont rangés du plus proche au plus loin, jamais sous la cellule", () => {
    const min = BALANCE.world.minDistance;
    const distances = places().map((entry) => entry.x * entry.x + entry.y * entry.y);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    expect(distances[0]).toBeGreaterThanOrEqual(min * min);
  });

  it("deux voisins voient le même lieu au même endroit du monde", () => {
    const a = slotPosition(1);
    const b = slotPosition(2);
    const fromA = new Map(visiblePlaces(27, 1).map((p) => [p.id, [p.x + a.x, p.y + a.y]]));
    const shared = visiblePlaces(27, 2).filter((p) => fromA.has(p.id));
    for (const p of shared) expect(fromA.get(p.id)).toEqual([p.x + b.x, p.y + b.y]);
  });

  it("une autre graine de saison donne une autre goutte", () => {
    const a = visiblePlaces(27, 0).map((p) => p.id);
    const b = visiblePlaces(28, 0).map((p) => p.id);
    expect(a).not.toEqual(b);
  });

  it("plus c'est loin, plus ça rapporte, plus c'est long et plus ça coûte", () => {
    const bands = BALANCE.expedition.bands;
    for (let i = 1; i < bands.length; i++) {
      const near = bands[i - 1];
      const far = bands[i];
      if (near === undefined || far === undefined) throw new Error("bande attendue");
      expect(far.energy).toBeGreaterThan(near.energy);
      expect(far.seconds).toBeGreaterThan(near.seconds);
      expect(far.sugar).toBeGreaterThan(near.sugar);
      expect(far.bricks).toBeGreaterThan(near.bricks);
    }
  });
});

describe("palier 3 : expéditions", () => {
  it("avant le palier 3, la carte n'existe pas", () => {
    const base = atTier3();
    const state: PlayerState = {
      ...base,
      tier: 2,
      mutations: [],
      counters: { ...base.counters, mutationsChosen: 0 },
    };
    expect(refusal(state, send(place(0)), T0)).toBe("locked");
    expect(refusal(state, { type: "cancelExpedition" }, T0)).toBe("locked");
  });

  it("le palier 3 s'ouvre au choix de la première mutation", () => {
    const base = createPlayer(7, T0, T0, WORLD);
    const state: PlayerState = {
      ...base,
      tier: 2,
      counters: { ...base.counters, harvests: 10, organellesBuilt: 3 },
      mutationOffer: ["thrift", "thickWall", "swiftCilia"],
    };
    const result = applyOrder(state, { type: "chooseMutation", mutation: "thrift" }, T0);
    if (!result.ok) throw new Error("ordre attendu");
    expect(result.state.tier).toBe(3);
    expect(result.state.energy).toBe(BALANCE.energy.max);
    expect(result.events.some((event) => event.type === "tierReached" && event.tier === 3)).toBe(
      true,
    );
  });

  it("envoyer coûte de l'énergie tout de suite, le butin arrive au retour", () => {
    const target = place(0);
    const offer = placeOffer(target);
    const sent = ok(atTier3(), send(target), T0);
    expect(sent.energy).toBe(BALANCE.energy.max - offer.energy);
    expect(sent.expedition?.returnsAt).toBe(T0 + offer.durationMs);
    expect(sent.resources[offer.resource]).toBe(0);

    const almost = advance(sent, T0 + offer.durationMs - 1).state;
    expect(almost.expedition).not.toBeNull();
    expect(almost.resources[offer.resource]).toBe(0);

    const back = advance(sent, T0 + offer.durationMs);
    expect(back.state.expedition).toBeNull();
    expect(back.state.resources[offer.resource]).toBe(offer.loot);
    expect(back.state.counters.mapHarvests).toBe(1);
    expect(back.events).toContainEqual({
      type: "expeditionReturned",
      at: T0 + offer.durationMs,
      place: target.id,
      resource: offer.resource,
      gained: offer.loot,
      lost: 0,
      cancelled: false,
    });
  });

  it("une seule expédition à la fois", () => {
    const sent = ok(atTier3(), send(place(0)), T0);
    expect(refusal(sent, send(place(1)), T0 + 1000)).toBe("busy");
  });

  it("refuse un lieu inconnu ou hors de vue", () => {
    expect(refusal(atTier3(), { type: "sendExpedition", place: "900:900" }, T0)).toBe(
      "unknownPlace",
    );
  });

  it("refuse l'envoi sans assez d'énergie, et rien ne change", () => {
    const state = atTier3({ energy: 2, energyAt: T0 });
    expect(refusal(state, send(place(2)), T0)).toBe("noEnergy");
    expect(ok(state, send(place(1)), T0).energy).toBe(0);
  });

  it("un lieu visité se regarnit avant de resservir", () => {
    const target = place(0);
    const offer = placeOffer(target);
    const back = advance(ok(atTier3(), send(target), T0), T0 + offer.durationMs).state;
    expect(refusal(back, send(target), T0 + offer.durationMs + offer.restMs - 1)).toBe(
      "placeResting",
    );
    const again = ok(back, send(target), T0 + offer.durationMs + offer.restMs);
    expect(again.expedition?.place).toBe(target.id);
    expect(again.placeReadyAt).toEqual({});
  });

  it("le butin qui dépasse la réserve est perdu, et le dit", () => {
    const target = places().find((entry) => entry.kind === "sugarCluster" && entry.band === 2);
    const sugarFar = target ?? place(0);
    const offer = placeOffer(sugarFar);
    const room = 10 * MICRO;
    const start = atTier3();
    const full: PlayerState = {
      ...start,
      resources: { ...start.resources, [offer.resource]: capacity(start, offer.resource) - room },
    };
    const back = advance(ok(full, send(sugarFar), T0), T0 + offer.durationMs);
    expect(back.state.resources[offer.resource]).toBe(capacity(start, offer.resource));
    const event = back.events.find((entry) => entry.type === "expeditionReturned");
    expect(event).toMatchObject({ gained: room, lost: offer.loot - room });
    expect(back.state.counters.mapHarvests).toBe(1);
  });

  it("cinq expéditions revenues ouvrent le palier 4, et pas davantage", () => {
    let state = atTier3({ energy: BALANCE.energy.max });
    let now = T0;
    for (let trip = 0; trip < 6; trip++) {
      const target = places().find((entry) => (state.placeReadyAt[entry.id] ?? 0) <= now);
      if (target === undefined) throw new Error("lieu attendu");
      state = ok({ ...state, energy: BALANCE.energy.max }, send(target), now);
      now += placeOffer(target).durationMs;
      state = advance(state, now).state;
    }
    expect(state.counters.mapHarvests).toBe(6);
    expect(state.tier).toBe(4);
  });
});

describe("annuler une expédition", () => {
  const target = place(2);
  const offer = placeOffer(target);

  it("à l'aller : retour dix fois plus rapide que le chemin parcouru, énergie rendue", () => {
    const sent = ok(atTier3(), send(target), T0);
    const elapsed = 100_000;
    const cancelled = ok(sent, { type: "cancelExpedition" }, T0 + elapsed);
    expect(cancelled.energy).toBe(BALANCE.energy.max);
    expect(cancelled.expedition?.cancelled).toBe(true);
    expect(cancelled.expedition?.returnsAt).toBe(
      T0 + elapsed + elapsed / BALANCE.expedition.cancelSpeedup,
    );
  });

  it("au retour : seul le chemin restant compte", () => {
    const sent = ok(atTier3(), send(target), T0);
    const left = 60_000;
    const at = T0 + offer.durationMs - left;
    const cancelled = ok(sent, { type: "cancelExpedition" }, at);
    expect(cancelled.expedition?.returnsAt).toBe(at + left / BALANCE.expedition.cancelSpeedup);
  });

  it("elle rentre à vide : ni butin, ni récolte comptée, lieu intact", () => {
    const sent = ok(atTier3(), send(target), T0);
    const cancelled = ok(sent, { type: "cancelExpedition" }, T0 + 50_000);
    const home = advance(cancelled, T0 + 50_000 + 5000);
    expect(home.state.expedition).toBeNull();
    expect(home.state.resources).toEqual({ sugar: 0, bricks: 0, proteins: 0 });
    expect(home.state.counters.mapHarvests).toBe(0);
    expect(home.state.placeReadyAt).toEqual({});
    expect(refusal(home.state, send(target), T0 + 55_000)).toBeNull();
  });

  it("pendant le court retour, on ne peut ni renvoyer ni annuler encore", () => {
    const sent = ok(atTier3(), send(target), T0);
    const cancelled = ok(sent, { type: "cancelExpedition" }, T0 + 50_000);
    expect(refusal(cancelled, send(place(0)), T0 + 50_001)).toBe("busy");
    expect(refusal(cancelled, { type: "cancelExpedition" }, T0 + 50_001)).toBe("noExpedition");
  });

  it("rien à annuler quand rien n'est parti", () => {
    expect(refusal(atTier3(), { type: "cancelExpedition" }, T0)).toBe("noExpedition");
  });
});

describe("énergie", () => {
  it("un point revient à intervalle fixe, jamais au-delà du maximum", () => {
    const state = atTier3({ energy: 0, energyAt: T0 });
    expect(advance(state, T0 + REGEN - 1).state.energy).toBe(0);
    expect(advance(state, T0 + REGEN).state.energy).toBe(1);
    expect(advance(state, T0 + 3 * REGEN + 5).state.energy).toBe(3);
    expect(advance(state, T0 + 1000 * REGEN).state.energy).toBe(BALANCE.energy.max);
  });

  it("le temps déjà attendu vers le prochain point n'est pas perdu", () => {
    const state = atTier3({ energy: 0, energyAt: T0 });
    const partial = advance(state, T0 + REGEN + 500_000).state;
    expect(advance(partial, T0 + 2 * REGEN).state.energy).toBe(2);
  });

  it("une jauge pleine ne met rien de côté : le compte repart à la dépense", () => {
    const later = T0 + 50 * REGEN;
    const sent = ok(atTier3(), send(place(0)), later);
    expect(sent.energy).toBe(BALANCE.energy.max - 1);
    expect(advance(sent, later + REGEN - 1).state.energy).toBe(BALANCE.energy.max - 1);
    expect(advance(sent, later + REGEN).state.energy).toBe(BALANCE.energy.max);
  });
});

describe("garanties du moteur avec la carte", () => {
  const order = fc.oneof(
    fc.constant<Order>({ type: "harvest", taps: 3 }),
    fc.constant<Order>({ type: "cancelExpedition" }),
    fc.constantFrom(...places().map((entry): Order => send(entry))),
    fc.constantFrom<Order>(
      { type: "build", organelle: "mitochondrion" },
      { type: "upgrade", organelle: "mitochondrion" },
    ),
  );
  const steps = fc.array(fc.tuple(order, fc.integer({ min: 0, max: 900_000 })), {
    minLength: 1,
    maxLength: 40,
  });

  it("quoi qu'on envoie : rien de négatif, énergie bornée, réserve respectée", () => {
    fc.assert(
      fc.property(steps, (sequence) => {
        let state = atTier3();
        let now = T0;
        for (const [next, wait] of sequence) {
          now += wait;
          const result = applyOrder(state, next, now);
          state = result.ok ? result.state : advance(state, now).state;
          expect(state.energy).toBeGreaterThanOrEqual(0);
          expect(state.energy).toBeLessThanOrEqual(BALANCE.energy.max);
          expect(state.resources.sugar).toBeGreaterThanOrEqual(0);
          expect(state.resources.bricks).toBeGreaterThanOrEqual(0);
          expect(state.resources.sugar).toBeLessThanOrEqual(capacity(state, "sugar"));
          expect(state.resources.bricks).toBeLessThanOrEqual(capacity(state, "bricks"));
          expect(state.now).toBe(now);
        }
      }),
    );
  });

  it("avancer en une fois ou en plusieurs donne le même état", () => {
    fc.assert(
      fc.property(
        steps,
        fc.array(fc.integer({ min: 1, max: 2_000_000 }), { minLength: 1, maxLength: 6 }),
        (sequence, pauses) => {
          let state = atTier3();
          let now = T0;
          for (const [next, wait] of sequence) {
            now += wait;
            const result = applyOrder(state, next, now);
            if (result.ok) state = result.state;
          }
          const end = now + pauses.reduce((sum, pause) => sum + pause, 0);
          let stepped = state;
          let at = now;
          for (const pause of pauses) {
            at += pause;
            stepped = advance(stepped, at).state;
          }
          expect(serializeState(stepped)).toBe(serializeState(advance(state, end).state));
        },
      ),
    );
  });

  it("sauvegarder puis relire rend exactement le même état, expédition comprise", () => {
    const sent = ok(atTier3(), send(place(1)), T0);
    const rested = advance(sent, T0 + placeOffer(place(1)).durationMs).state;
    for (const state of [sent, rested]) {
      expect(deserializeState(serializeState(state))).toEqual(state);
    }
  });

  it("une sauvegarde d'avant la carte est convertie sans rien perdre", () => {
    // On retire ce que la carte a ajouté, pour retrouver la forme d'une ancienne sauvegarde.
    const added = ["worldSeed", "slot", "energy", "energyAt", "expedition", "placeReadyAt"];
    const old = Object.fromEntries(
      Object.entries(
        JSON.parse(serializeState(atTier3({ tier: 2 }))) as Record<string, unknown>,
      ).filter(([key]) => !added.includes(key)),
    );
    const text = JSON.stringify({ ...old, version: 1 });

    const alone = deserializeState(text);
    expect(alone.version).toBe(10);
    expect(alone.counters.harvests).toBe(10);
    expect(alone.energy).toBe(BALANCE.energy.max);
    expect(alone.slot).toBe(0);

    const placed = deserializeState(text, { worldSeed: 27, slot: 12 });
    expect(placed.worldSeed).toBe(27);
    expect(placed.slot).toBe(12);
  });

  it("refuse une sauvegarde dont l'expédition est abîmée", () => {
    const text = serializeState(ok(atTier3(), send(place(0)), T0));
    expect(() => deserializeState(text.replace('"cancelled":false', '"cancelled":0'))).toThrow(
      TypeError,
    );
    expect(() => deserializeState(text.replace(/"kind":"[a-zA-Z]+"/, '"kind":"or"'))).toThrow(
      TypeError,
    );
  });

  it("le résumé d'absence compte les expéditions revenues", () => {
    const target = place(0);
    const sent = ok(atTier3(), send(target), T0);
    const later = advance(sent, T0 + 8 * 3_600_000);
    const summary = summarizeAbsence(sent, later.state, later.events);
    expect(summary.expeditionsBack).toBe(1);
    expect(summary.gained[PLACE_RESOURCE[target.kind]]).toBe(placeOffer(target).loot);
  });
});
