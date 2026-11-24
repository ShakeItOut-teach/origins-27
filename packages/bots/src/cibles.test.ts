/**
 * Cibles d'équilibrage des paliers 0 à 2. Si un changement de chiffres casse une cible,
 * c'est l'intention qu'il faut rediscuter, pas le test qu'il faut assouplir.
 */
import { describe, expect, it } from "vitest";
import { BALANCE } from "@o27/data";
import { PROFILES, simulate } from "./index";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const HOUR = 3600;

describe("cibles d'équilibrage", () => {
  it("tout le monde atteint le palier 1 en moins de 15 secondes", () => {
    for (const profile of Object.values(PROFILES)) {
      for (const seed of SEEDS) {
        expect(simulate(profile, seed, HOUR).tierSeconds[1]).toBeLessThanOrEqual(15);
      }
    }
  });

  it("un joueur appliqué choisit sa première mutation en 2 à 6 minutes", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, HOUR);
      expect(report.mutationSeconds).toBeGreaterThanOrEqual(120);
      expect(report.mutationSeconds).toBeLessThanOrEqual(360);
    }
  });

  it("un joueur appliqué n'attend jamais plus de 90 secondes sans rien pouvoir faire", () => {
    for (const seed of SEEDS) {
      expect(simulate(PROFILES.applique, seed, HOUR).longestStuckSeconds).toBeLessThanOrEqual(90);
    }
  });

  it("un débutant choisit sa première mutation en moins de 10 minutes", () => {
    for (const seed of SEEDS) {
      expect(simulate(PROFILES.debutant, seed, HOUR).mutationSeconds).toBeLessThanOrEqual(600);
    }
  });

  it("un joueur parti après deux minutes trouve sa mutation à son retour", () => {
    const { activeSeconds, awaySeconds } = PROFILES.absent.sessions;
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.absent, seed, 24 * HOUR);
      expect(report.mutationSeconds).toBeLessThanOrEqual(2 * activeSeconds + awaySeconds);
    }
  });

  it("le même robot avec la même graine rejoue la même partie", () => {
    expect(simulate(PROFILES.debutant, 42, HOUR)).toEqual(simulate(PROFILES.debutant, 42, HOUR));
  });
});

describe("cibles d'équilibrage du palier 3 (la carte)", () => {
  const FIVE = { expeditions: 5 } as const;

  it("la première expédition part moins de 30 secondes après l'ouverture de la carte", () => {
    for (const profile of [PROFILES.applique, PROFILES.debutant]) {
      for (const seed of SEEDS) {
        const report = simulate(profile, seed, HOUR, FIVE);
        const opened = report.tierSeconds[3] ?? Number.POSITIVE_INFINITY;
        expect((report.firstExpeditionSeconds ?? Number.POSITIVE_INFINITY) - opened).toBeLessThan(
          30,
        );
      }
    }
  });

  it("cinq expéditions revenues en moins de 15 minutes de carte, dans la première session", () => {
    for (const profile of [PROFILES.applique, PROFILES.debutant]) {
      for (const seed of SEEDS) {
        const report = simulate(profile, seed, HOUR, FIVE);
        const opened = report.tierSeconds[3] ?? Number.POSITIVE_INFINITY;
        expect(
          (report.expeditionsGoalSeconds ?? Number.POSITIVE_INFINITY) - opened,
        ).toBeLessThanOrEqual(15 * 60);
      }
    }
  });

  it("un joueur soigneux perd moins d'un tiers de son butin faute de place", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, HOUR, FIVE);
      expect(report.lootLost * 2).toBeLessThanOrEqual(report.lootGained);
    }
  });

  it("sur la carte non plus, jamais plus de 90 secondes sans rien pouvoir faire", () => {
    for (const seed of SEEDS) {
      expect(simulate(PROFILES.applique, seed, HOUR, FIVE).longestStuckSeconds).toBeLessThanOrEqual(
        90,
      );
    }
  });

  it("un joueur qui revient toutes les 8 heures finit par faire ses cinq expéditions", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.absent, seed, 72 * HOUR, FIVE);
      expect(report.expeditionsGoalSeconds).not.toBeNull();
    }
  });

  it("une expédition proche rapporte plus que le même temps passé à toucher la cellule", () => {
    const near = BALANCE.expedition.bands[0];
    if (near === undefined) throw new Error("bande attendue");
    // Un débutant touche une fois par seconde, pour 1 sucre.
    expect(near.sugar).toBeGreaterThanOrEqual(near.seconds * BALANCE.tap.yield * 1.5);
  });
});

describe("cibles d'équilibrage du palier 4 (troupes et chasse)", () => {
  const SECOND_MUTATION = "secondMutation" as const;
  const opened = (report: { tierSeconds: readonly (number | null)[] }): number =>
    report.tierSeconds[4] ?? Number.POSITIVE_INFINITY;

  it("un joueur appliqué envoie sa première chasse moins de 5 minutes après l'ouverture", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, 6 * HOUR, SECOND_MUTATION);
      expect((report.firstHuntSeconds ?? Number.POSITIVE_INFINITY) - opened(report)).toBeLessThan(
        5 * 60,
      );
    }
  });

  it("il gagne sa première chasse dans la foulée, dans la première session", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, 6 * HOUR, SECOND_MUTATION);
      expect(
        (report.firstHuntWonSeconds ?? Number.POSITIVE_INFINITY) - opened(report),
      ).toBeLessThan(8 * 60);
      expect(report.huntsLost).toBe(0);
    }
  });

  it("il obtient sa deuxième mutation en moins de deux heures de jeu", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, 6 * HOUR, SECOND_MUTATION);
      expect(report.secondMutationSeconds).not.toBeNull();
      expect(report.secondMutationSeconds).toBeLessThanOrEqual(2 * HOUR);
    }
  });

  it("un joueur qui ne touche jamais la proie progresse quand même, plus lentement", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.debutant, seed, 12 * HOUR, SECOND_MUTATION);
      expect(report.secondMutationSeconds).not.toBeNull();
      expect(report.secondMutationSeconds).toBeLessThanOrEqual(4 * HOUR);
    }
  });

  it("aucune chasse, même perdue, ne laisse un joueur sans cellule fille", () => {
    for (const profile of [PROFILES.applique, PROFILES.debutant]) {
      for (const seed of SEEDS) {
        const report = simulate(profile, seed, 12 * HOUR, SECOND_MUTATION);
        expect(report.fewestTroopsAfterHunt).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("un joueur qui revient deux minutes toutes les 8 heures finit par gagner une chasse", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.absent, seed, 96 * HOUR, { huntsWon: 1 });
      expect(report.huntsWon).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("cibles des quêtes du jour", () => {
  it("un joueur appliqué ouvre au moins deux coffres dans ses six premières heures", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.applique, seed, 6 * HOUR, { huntsWon: 99 });
      expect(report.chestsOpened).toBeGreaterThanOrEqual(2);
    }
  });

  it("un débutant en ouvre au moins un : les quêtes ne sont pas réservées aux meilleurs", () => {
    for (const seed of SEEDS) {
      const report = simulate(PROFILES.debutant, seed, 6 * HOUR, { huntsWon: 99 });
      expect(report.chestsOpened).toBeGreaterThanOrEqual(1);
    }
  });

  it("le défi reste un défi : il n'est pas réussi par tout le monde dès le premier jour", () => {
    const wins = SEEDS.filter(
      (seed) =>
        simulate(PROFILES.debutant, seed, 6 * HOUR, { huntsWon: 99 }).challengeChestsOpened > 0,
    ).length;
    expect(wins).toBeLessThan(SEEDS.length);
  });
});
