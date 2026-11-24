import { describe, expect, it } from "vitest";
import { isVisible, visibleElements } from "./unlock";

describe("ce que l'écran montre à chaque palier", () => {
  it("palier 0 : la cellule et le sucre, rien d'autre", () => {
    expect(visibleElements(0).sort()).toEqual(["cell", "sugarCounter"]);
  });

  it("palier 1 : s'ajoutent les emplacements, la production et le chantier", () => {
    expect(visibleElements(1).sort()).toEqual(
      ["buildSlots", "cell", "constructionTimer", "productionRate", "sugarCounter"].sort(),
    );
  });

  it("palier 2 : s'ajoutent les briques, l'amélioration et la mutation", () => {
    expect(visibleElements(2).sort()).toEqual(
      [
        "bricksCounter",
        "buildSlots",
        "cell",
        "constructionTimer",
        "creatureTraits",
        "mutationChoice",
        "productionRate",
        "sugarCounter",
        "upgradeButton",
      ].sort(),
    );
  });

  it("rien des paliers suivants n'est visible au palier 2", () => {
    for (const element of ["map", "troops", "rivals", "ranking", "alliances"] as const) {
      expect(isVisible(element, 2)).toBe(false);
    }
  });

  it("palier 9 : s'ajoutent les événements de zone, les alliances et la Gazette", () => {
    for (const element of ["zoneEvents", "alliances", "gazette"] as const) {
      expect(isVisible(element, 8)).toBe(false);
      expect(isVisible(element, 9)).toBe(true);
    }
    // La suite n'est pas encore livrée.
    for (const element of ["speciesSheet", "higherRanks", "crisis", "apexRace"] as const) {
      expect(isVisible(element, 9)).toBe(false);
    }
  });

  it("palier 10 : s'ajoutent les rangs supérieurs ; la crise et l'APEX attendent", () => {
    expect(isVisible("higherRanks", 10)).toBe(true);
    for (const element of ["speciesSheet", "crisis", "apexRace"] as const) {
      expect(isVisible(element, 10)).toBe(false);
    }
  });
});
