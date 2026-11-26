/**
 * La chasse : force d'un groupe, chances de victoire, pertes, issue du combat.
 * Entiers uniquement. Le seul hasard vient de la graine du joueur.
 */
import { BALANCE, ORGANELLE_IDS, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { PreyKind, TroopId } from "@o27/data";
import { createRng } from "./rng";
import { modifierPercent } from "./stats";
import { MICRO } from "./types";
import type { GameEvent, Hunt, PlayerState, Step } from "./types";

export type Party = Readonly<Record<TroopId, number>>;

/** Un groupe vide, ou complété à partir de quelques sortes seulement. */
export function partyOf(some: Partial<Record<TroopId, number>> = {}): Record<TroopId, number> {
  return {
    hunter: 0,
    armored: 0,
    swift: 0,
    toxic: 0,
    guardian: 0,
    scout: 0,
    carrier: 0,
    rotifer: 0,
    tardigrade: 0,
    copepod: 0,
    salp: 0,
    chaetognath: 0,
    ostracod: 0,
    krill: 0,
    larvacean: 0,
    eurypterid: 0,
    trilobite: 0,
    conodont: 0,
    nautiloid: 0,
    ...some,
  };
}

export function partySize(party: Party): number {
  return TROOP_IDS.reduce((sum, id) => sum + party[id], 0);
}

/** Force d'un groupe face à une sorte de proie : la cellule du bon type compte davantage. */
export function partyPower(party: Party, kind: PreyKind): number {
  return TROOP_IDS.reduce(
    (sum, id) =>
      sum +
      party[id] *
        BALANCE.troops[id].power *
        (STRONG_AGAINST[id] === kind ? BALANCE.hunt.strongMultiplier : 1),
    0,
  );
}

/** Chances de victoire, de 1 à 99 %. À force égale : une chance sur deux. */
export function winChance(party: Party, kind: PreyKind, preyPower: number): number {
  const power = partyPower(party, kind);
  if (power <= 0) return 1;
  const percent = Math.round((100 * power) / (power + preyPower));
  return Math.max(1, Math.min(99, percent));
}

/** Chances quand le joueur n'est pas là pour toucher : un peu moins bonnes. */
export function unattendedChance(chance: number): number {
  return Math.max(1, chance - BALANCE.hunt.unattendedPenaltyPercent);
}

/** Ce que vaut un toucher du joueur : victoire certaine, ou chances doublées. */
export function strikeChance(chance: number): number {
  return chance >= BALANCE.hunt.certainFromPercent ? 100 : Math.min(99, chance * 2);
}

/**
 * Cellules perdues. Victoire : d'autant moins que le groupe était fort. Défaite : au moins
 * la moitié, mais jamais toutes : il reste toujours une survivante pour rentrer.
 */
export function lossesFor(party: Party, chance: number, won: boolean): Record<TroopId, number> {
  const percent = won
    ? Math.floor((100 - chance) / 2)
    : Math.min(90, 50 + Math.floor((100 - chance) / 4));
  return takeLosses(party, percent, true);
}

/** Les mêmes pertes, réduites à ce pourcentage (arrondi en dessous). */
function scaleLosses(
  losses: Readonly<Record<TroopId, number>>,
  percent: number,
): Record<TroopId, number> {
  const kept = { ...losses };
  for (const id of TROOP_IDS) kept[id] = Math.floor((losses[id] * percent) / 100);
  return kept;
}

/**
 * La part qu'un camp perd dans un combat contre un organisme : `base` % à force égale, moins
 * quand il est plus fort que l'autre, davantage quand il est plus faible. Bornée.
 */
export function combatLossPercent(base: number, own: number, foe: number): number {
  const rules = BALANCE.rivals.combat;
  if (own <= 0) return rules.maxLossPercent;
  const percent = Math.round((base * Math.max(0, foe)) / own);
  return Math.max(rules.minLossPercent, Math.min(rules.maxLossPercent, percent));
}

/**
 * Retire `percent` % d'un groupe, réparti sur les sortes les plus nombreuses. Avec `keepOne`,
 * il reste toujours une survivante (pour rentrer à la maison).
 */
export function takeLosses(
  party: Party,
  percent: number,
  keepOne: boolean,
): Record<TroopId, number> {
  const size = partySize(party);
  const most = keepOne ? Math.max(0, size - 1) : size;
  let toLose = Math.min(most, Math.floor((size * percent) / 100));
  const left: Record<TroopId, number> = { ...party };
  const lost = partyOf();
  while (toLose > 0) {
    // On retire à tour de rôle dans le type le plus nombreux : les pertes restent réparties.
    let biggest: TroopId = "hunter";
    for (const id of TROOP_IDS) if (left[id] > left[biggest]) biggest = id;
    left[biggest] -= 1;
    lost[biggest] += 1;
    toLose -= 1;
  }
  return lost;
}

/** Accélération des naissances, en pourcentage ; `null` tant que rien ne fait naître de cellules. */
function trainingBonus(state: PlayerState): number | null {
  let bonus: number | null = null;
  for (const id of ORGANELLE_IDS) {
    const effect = BALANCE.organelles[id].effect;
    const level = state.organelles[id];
    if (effect.kind === "trainingSpeed" && level > 0) {
      bonus = (bonus ?? 0) + effect.percentPerLevel * (level - 1);
    }
  }
  return bonus;
}

/** Le joueur peut-il faire naître des cellules filles ? Leur nombre n'a pas de plafond. */
export function canTrain(state: PlayerState): boolean {
  return trainingBonus(state) !== null;
}

/**
 * Combien de cellules d'une sorte le bouton « Max » fait naître : autant que le permettent
 * 90 % de chaque ressource. Aucun autre plafond : c'est l'entretien qui limite une armée.
 */
export function maxTrainable(state: PlayerState, troop: TroopId): number {
  const data = BALANCE.troops[troop];
  const percent = BALANCE.training.maxSpendPercent;
  const prices: readonly (readonly [number, number])[] = [
    [state.resources.sugar, data.cost.sugar],
    [state.resources.bricks, data.cost.bricks],
    [state.resources.proteins, data.proteins],
  ];
  let count = Number.POSITIVE_INFINITY;
  for (const [stock, price] of prices) {
    if (price <= 0) continue;
    count = Math.min(count, Math.floor((stock * percent) / (100 * price * MICRO)));
  }
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

/** Durée d'une naissance, en millisecondes : plus courte quand l'organite monte de niveau. */
export function trainMs(state: PlayerState, troop: TroopId): number {
  const bonus = trainingBonus(state) ?? 0;
  const base = Math.floor((BALANCE.troops[troop].seconds * 100_000) / (100 + bonus));
  return Math.max(1000, Math.floor((base * (100 + modifierPercent(state, "trainTime"))) / 100));
}

/**
 * Ce que les cellules filles vivantes consomment, à la maison comme en sortie, en
 * millionièmes de sucre par milliseconde. C'est l'entretien qui limite la taille d'une armée.
 */
export function upkeepRate(state: PlayerState): number {
  let parts = 0;
  for (const id of TROOP_IDS) {
    let alive = state.troops[id];
    for (const sortie of [state.hunt, state.raid]) {
      if (sortie !== null) alive += sortie.party[id] - (sortie.outcome?.losses[id] ?? 0);
    }
    // Une cellule de rang 2 mange davantage.
    parts += alive * BALANCE.troops[id].upkeep;
  }
  const raw = parts * BALANCE.troopUpkeep.milliPerSecond;
  return Math.max(0, Math.floor((raw * (100 + modifierPercent(state, "upkeep"))) / 100));
}

/** Toutes les cellules filles du joueur : à la maison, en chasse, et celles qui vont naître. */
export function troopsOwned(state: PlayerState): number {
  let total = partySize(state.troops) + (state.training?.remaining ?? 0);
  if (state.hunt !== null) {
    total += partySize(state.hunt.party);
    if (state.hunt.outcome !== null) total -= partySize(state.hunt.outcome.losses);
  }
  if (state.raid !== null) {
    total += partySize(state.raid.party);
    if (state.raid.outcome !== null) total -= partySize(state.raid.outcome.losses);
  }
  return total;
}

/** Les pertes une fois comptés les pouvoirs qui épargnent des cellules (recherche militaire). */
export function spared(
  state: PlayerState,
  losses: Readonly<Record<TroopId, number>>,
): Record<TroopId, number> {
  const percent = Math.max(0, 100 + modifierPercent(state, "losses"));
  const kept = { ...losses };
  if (percent === 100) return kept;
  for (const id of TROOP_IDS) kept[id] = Math.floor((losses[id] * percent) / 100);
  return kept;
}

/**
 * Le combat a lieu : soit le joueur vient de toucher la proie, soit la fenêtre est passée et
 * le sort décide. Le tirage consomme la graine du joueur, donc le serveur et l'appareil
 * trouvent le même résultat.
 */
export function resolveHunt(state: PlayerState, hunt: Hunt, at: number, struck: boolean): Step {
  const base = winChance(hunt.party, hunt.kind, hunt.power);
  const chance = struck ? strikeChance(base) : unattendedChance(base);
  const rng = createRng(state.rngState);
  const won = rng.int(100) < chance;
  const full = lossesFor(hunt.party, base, won);
  // Les proies se chassent pour leurs protéines : on y perd dix fois moins de cellules qu'à la
  // guerre. Les prédateurs (identifiants « p: ») gardent leurs pertes entières.
  const prey = !hunt.prey.startsWith("p:");
  const scaled = prey ? scaleLosses(full, BALANCE.hunt.preyLossPercent) : full;
  const losses = spared(state, scaled);
  const event: GameEvent = { type: "huntResolved", at, won, struck, losses };
  return {
    state: { ...state, rngState: rng.state, hunt: { ...hunt, outcome: { won, struck, losses } } },
    events: [event],
  };
}
