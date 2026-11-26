import { BALANCE, ORGANELLE_IDS } from "@o27/data";
import type { OrganelleId } from "@o27/data";
import { describe, expect, it } from "vitest";
import {
  MICRO,
  applyOrder,
  capacity,
  createPlayer,
  deserializeState,
  levelCost,
  maxLevelOf,
  modifierPercent,
  nucleusCap,
  serializeState,
} from "./index";
import type { PlayerState } from "./index";

const T0 = 1_800_000_000_000;
const RULE = BALANCE.nucleusRule;

/** Un joueur du palier 2, riche, dont les organites sont aux niveaux donnés. */
function player(levels: Partial<Record<OrganelleId, number>>): PlayerState {
  const base = createPlayer(7, T0, T0);
  return {
    ...base,
    tier: 2,
    organelles: { ...base.organelles, ...levels },
    resources: { sugar: 10_000_000 * MICRO, bricks: 10_000_000 * MICRO, proteins: 0 },
  };
}

function refusal(state: PlayerState, organelle: OrganelleId): string | null {
  const result = applyOrder(state, { type: "upgrade", organelle }, state.now);
  return result.ok ? null : result.error;
}

describe("le Noyau, hôtel de ville de la cellule", () => {
  it("est là dès le départ, au niveau 1, même dans une partie d'avant", () => {
    const fresh = createPlayer(7, T0, T0);
    expect(fresh.organelles.nucleus).toBe(1);
    const raw = JSON.parse(serializeState(fresh)) as { organelles: Record<string, number> };
    raw.organelles.nucleus = 0;
    expect(deserializeState(JSON.stringify(raw)).organelles.nucleus).toBe(1);
  });

  it("aucun organite ne le dépasse ; la Vacuole peut avoir un niveau d'avance", () => {
    const state = player({ nucleus: 2, mitochondrion: 2, vacuole: 2 });
    expect(refusal(state, "mitochondrion")).toBe("needsNucleus");
    expect(refusal(state, "vacuole")).toBeNull();
    expect(refusal({ ...state, organelles: { ...state.organelles, vacuole: 3 } }, "vacuole")).toBe(
      "needsNucleus",
    );
    expect(refusal(state, "nucleus")).toBeNull();
    expect(nucleusCap(state, "nucleus")).toBe(Number.POSITIVE_INFINITY);
  });

  it("un Noyau en chantier ouvre déjà le niveau suivant (file comprise)", () => {
    // Au palier 4, la file de chantiers est ouverte.
    const state = { ...player({ nucleus: 2, mitochondrion: 2 }), tier: 4 };
    const started = applyOrder(state, { type: "upgrade", organelle: "nucleus" }, state.now);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(refusal(started.state, "mitochondrion")).toBeNull();
  });

  it("chaque niveau au-delà du premier ajoute 2 % à tout, et retire 2 % aux durées et aux coûts", () => {
    const one = player({});
    const four = player({ nucleus: 4 });
    const gain = 3 * RULE.statPercentPerLevel;
    expect(modifierPercent(four, "sugarProduction") - modifierPercent(one, "sugarProduction")).toBe(
      gain,
    );
    expect(modifierPercent(four, "defense") - modifierPercent(one, "defense")).toBe(gain);
    expect(modifierPercent(four, "buildTime") - modifierPercent(one, "buildTime")).toBe(-gain);
    expect(modifierPercent(four, "losses") - modifierPercent(one, "losses")).toBe(-gain);
  });

  it("jamais bloqué : la réserve contient toujours le prix du Noyau suivant", () => {
    const top = maxLevelOf(player({}), "nucleus");
    for (let level = 1; level < top; level++) {
      // Tout au plus haut que le Noyau permet, sans aucun autre bonus.
      const levels: Partial<Record<OrganelleId, number>> = {};
      for (const id of ORGANELLE_IDS) {
        levels[id] = Math.min(maxLevelOf(player({}), id), level);
      }
      levels.nucleus = level;
      levels.vacuole = Math.min(maxLevelOf(player({}), "vacuole"), level + RULE.storageAhead);
      const state = player(levels);
      const cost = levelCost(state, "nucleus", level + 1);
      expect(cost.sugar, `Noyau ${String(level + 1)} : ATP`).toBeLessThanOrEqual(
        capacity(state, "sugar"),
      );
      expect(cost.bricks, `Noyau ${String(level + 1)} : lipides`).toBeLessThanOrEqual(
        capacity(state, "bricks"),
      );
    }
  });
});
