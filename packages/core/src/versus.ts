/**
 * Les combats entre humains (monde partagé, étape 3).
 *
 * L'appareil prévoit avec la vitrine de la cible ; le serveur fait foi avec sa vraie partie,
 * qu'il passe au moteur (`VersusContext`). L'attaque part de chez l'attaquant, attend son
 * heure, puis le serveur appelle `resolveDuel` avec les deux parties et celles des alliés
 * venus en renfort. Aucun hasard : la plus forte des deux forces l'emporte, et chaque camp
 * perd d'autant moins qu'il était fort (règle du propriétaire du 26/11/2026).
 */
import { BALANCE, RESOURCE_IDS, TROOP_IDS } from "@o27/data";
import type { ResourceId, TroopId } from "@o27/data";
import { advance } from "./advance";
import { attackTroops, defenseTroops, line, side } from "./battle";
import { humansBySlot } from "./crowd";
import { trackDaily } from "./daily";
import { awaitsDuel, bounceRaid } from "./escort";
import { combatLossPercent, partyOf, partyPower, partySize, spared, takeLosses } from "./hunt";
import { totalPower } from "./power";
import { trackQuests } from "./quests";
import { trackReports } from "./reports";
import {
  defenseParts,
  loadLoot,
  oceanRivals,
  protectedUntil,
  raidForce,
  raidWins,
  reinforcements,
} from "./rivals";
import type { Loot, Rival } from "./rivals";
import { receptorLevel, spiedLevel, spiesAt, spyReveal } from "./spy";
import { speciesOf } from "./species";
import { capacity, modifierPercent, travelMs } from "./stats";
import { MICRO } from "./types";
import type {
  Battle,
  BattleLine,
  Duels,
  GameEvent,
  HumanIntel,
  OrderErrorCode,
  PlayerState,
  Step,
} from "./types";
import { seasonDay } from "./unlock";

const HOUR_MS = 3_600_000;
const RULES = BALANCE.rivals.versus;

/** Une attaque de la file du serveur, telle qu'il la connaît. */
export interface PendingAttack {
  readonly id: string;
  /** La place de l'humain attaqué. */
  readonly slot: number;
  /** L'instant du combat. */
  readonly resolveAt: number;
}

/**
 * Ce que le serveur sait en plus de l'appareil, pour un ordre qui touche un autre humain.
 * Sans lui (sur l'appareil), le moteur prévoit avec la vitrine de la cible.
 */
export interface VersusContext {
  /** La vraie partie de l'humain espionné ou attaqué. */
  readonly opponent?: PlayerState;
  /** Pour des renforts : l'attaque visée ; `null` si la file ne la connaît pas (ou plus). */
  readonly attack?: PendingAttack | null;
}

/** Ce que le moteur sait d'une cible humaine pour juger d'une attaque. */
export interface HumanTarget {
  readonly slot: number;
  readonly tier: number;
  readonly power: number;
  /** À l'abri jusqu'à cet instant (bouclier, mode absent, nuit). */
  readonly shield: number;
}

type Outcome = Step | { readonly error: OrderErrorCode };

/** La place d'un organisme de l'océan d'après son identifiant ; `null` pour un voisin de la goutte. */
export function slotOf(rivalId: string): number | null {
  const found = /^o:(\d{1,4})$/.exec(rivalId);
  return found === null ? null : Number(found[1]);
}

/** Une partie amenée à l'instant `at` (jamais en arrière). */
function at(state: PlayerState, when: number): Step {
  return when > state.now ? advance(state, when) : { state, events: [] };
}

/** La cible : sa vraie partie si le serveur l'a donnée, sinon sa vitrine. */
export function humanTarget(
  state: PlayerState,
  rival: Rival,
  opponent?: PlayerState,
): HumanTarget | null {
  const slot = slotOf(rival.id);
  if (slot === null) return null;
  if (opponent !== undefined) {
    const now = Math.max(state.now, opponent.now);
    return {
      slot,
      tier: opponent.tier,
      power: totalPower(opponent),
      shield: protectedUntil(opponent, now),
    };
  }
  const card = humansBySlot(state).get(slot);
  if (card === undefined) return null;
  return { slot, tier: card.tier, power: card.scores.power, shield: card.shield };
}

/** Les compteurs de combats entre humains, remis à zéro au jour et à la semaine qui changent. */
export function duelsAt(state: PlayerState, when: number): Duels {
  const day = seasonDay(state, when);
  const week = Math.ceil(day / 7);
  const sameDay = state.duels.day === day;
  const sameWeek = state.duels.week === week;
  if (sameDay && sameWeek) return state.duels;
  return {
    day,
    targets: sameDay ? state.duels.targets : {},
    week,
    lost: sameWeek ? state.duels.lost : { sugar: 0, bricks: 0, proteins: 0 },
  };
}

/** Combien d'attaques le joueur a déjà envoyées aujourd'hui contre cette place. */
export function attacksToday(state: PlayerState, slot: number): number {
  return duelsAt(state, state.now).targets[String(slot)] ?? 0;
}

/**
 * Pourquoi on ne peut pas attaquer cette espèce humaine maintenant ; `null` si rien ne
 * l'empêche. Les garde-fous du bilan des jeux comparables (partie 4.1).
 */
export function versusBlock(state: PlayerState, target: HumanTarget): OrderErrorCode | null {
  if (state.tier < RULES.tier) return "locked";
  if (target.tier < RULES.tier) return "newcomer";
  if (target.power * 100 < totalPower(state) * RULES.minPowerPercent) return "tooWeak";
  if (attacksToday(state, target.slot) >= RULES.perTargetPerDay) return "tooOften";
  if (target.shield > state.now) return "shielded";
  return null;
}

/**
 * Ce qu'une attaque peut emporter chez un humain : son sucre et ses briques, une part de ses
 * protéines, et jamais plus que ce que le plafond de la semaine laisse encore prendre.
 */
export function lootable(state: PlayerState, when: number): Loot {
  const lost = duelsAt(state, when).lost;
  const room = (id: ResourceId): number =>
    Math.max(0, Math.floor((capacity(state, id) * RULES.weeklyLootPercent) / 100) - lost[id]);
  const share = BALANCE.rivals.raid.proteinSharePercent;
  return {
    sugar: Math.min(state.resources.sugar, room("sugar")),
    bricks: Math.min(state.resources.bricks, room("bricks")),
    proteins: Math.min(Math.floor((state.resources.proteins * share) / 100), room("proteins")),
  };
}

/** La défense complète d'un humain : ses cellules, sa Paroi, ses bonus, ses voisins alliés. */
function fullDefense(state: PlayerState, when: number): number {
  return defenseParts(state).total + reinforcements(state, when);
}

/** Le rapport d'espionnage d'un humain, au niveau des Récepteurs de l'espion. */
export function intelOf(target: PlayerState, level: number, when: number): HumanIntel {
  const reveal = spyReveal(level);
  const res = target.resources;
  const loot = lootable(target, when);
  const cells = partySize(target.troops);
  const margin = reveal.troopsMargin;
  return {
    at: when,
    level,
    total: reveal.total ? res.sugar + res.bricks + res.proteins : 0,
    sugar: reveal.available ? loot.sugar : 0,
    bricks: reveal.available ? loot.bricks : 0,
    proteins: reveal.available ? loot.proteins : 0,
    defense: reveal.power ? fullDefense(target, when) : 0,
    troopsLow: margin === null ? 0 : Math.floor((cells * (100 - margin)) / 100),
    troopsHigh: margin === null ? 0 : Math.ceil((cells * (100 + margin)) / 100),
    troops: reveal.everything ? partyOf(target.troops) : null,
    shieldUntil: reveal.everything ? protectedUntil(target, when) : 0,
  };
}

/**
 * Espionner un humain. Ses Récepteurs plus hauts que les siens : la sonde est perdue. Sinon le
 * rapport est une photo de sa partie. Sur l'appareil, sans sa partie, on ne peut que prévoir
 * que la sonde part : le serveur rend le vrai rapport.
 */
export function spyHuman(state: PlayerState, rival: Rival, opponent?: PlayerState): Outcome {
  if (receptorLevel(state) <= 0) return { error: "notBuilt" };
  const target = humanTarget(state, rival, opponent);
  if (target === null) return { error: "unknownRival" };
  if (target.tier < RULES.tier) return { error: "newcomer" };
  if (spiedLevel(state, rival.id) >= receptorLevel(state)) return { error: "alreadySpied" };
  const probes = spiesAt(state, state.now);
  if (probes.spies <= 0) return { error: "noSpies" };
  const spent: PlayerState = { ...state, spies: probes.spies - 1, spiesAt: probes.spiesAt };
  const level = receptorLevel(state);
  if (opponent !== undefined && receptorLevel(opponent) > level) {
    return { state: spent, events: [{ type: "rivalSpyFailed", at: state.now, rival: rival.id }] };
  }
  const view = opponent === undefined ? null : at(opponent, state.now).state;
  return {
    state: {
      ...spent,
      spiedUntil: {
        ...state.spiedUntil,
        [rival.id]: state.now + BALANCE.rivals.spy.hours * HOUR_MS,
      },
      spyLevels: { ...state.spyLevels, [rival.id]: level },
      intel:
        view === null
          ? state.intel
          : { ...state.intel, [rival.id]: intelOf(view, level, state.now) },
    },
    events: [{ type: "rivalSpied", at: state.now, rival: rival.id, level }],
  };
}

/** Compte une attaque de plus contre cette place, aujourd'hui. */
export function countAttack(state: PlayerState, slot: number): PlayerState {
  const duels = duelsAt(state, state.now);
  const key = String(slot);
  return {
    ...state,
    duels: { ...duels, targets: { ...duels.targets, [key]: (duels.targets[key] ?? 0) + 1 } },
  };
}

/**
 * Le trajet des renforts jusqu'à un allié, en millisecondes ; `null` s'il est hors de portée.
 * Comme une attaque : le trajet compté par pas est un aller et retour ; on ne fait que l'aller.
 */
export function escortTrip(state: PlayerState, slot: number): number | null {
  const ally = oceanRivals(state).find((entry) => entry.id === `o:${String(slot)}`);
  if (ally === undefined) return null;
  return Math.floor(travelMs(state, BALANCE.rivals.raid.stepSeconds * ally.steps * 1000) / 2);
}

/**
 * Envoyer des cellules filles défendre un allié humain attaqué. Elles comptent dans sa défense
 * si elles arrivent avant le combat, puis rentrent avec leurs pertes.
 */
export function reinforceAlly(
  state: PlayerState,
  attack: string,
  slot: number,
  party: Readonly<Record<TroopId, number>>,
  context?: VersusContext,
): Outcome {
  if (state.escort !== null) return { error: "busy" };
  if (state.alliance === null) return { error: "noAlliance" };
  const card = humansBySlot(state).get(slot);
  if (card === undefined) return { error: "unknownRival" };
  if (card.banner !== state.alliance.banner) return { error: "notAlly" };
  const trip = escortTrip(state, slot);
  if (trip === null) return { error: "unknownRival" };
  if (partySize(party) === 0 || TROOP_IDS.some((id) => party[id] > state.troops[id])) {
    return { error: "noTroops" };
  }
  const arrivesAt = state.now + trip;
  if (context?.attack !== undefined) {
    const known = context.attack;
    if (known?.id !== attack || known.slot !== slot) return { error: "noAttack" };
    if (arrivesAt > known.resolveAt) return { error: "tooLate" };
  }
  const troops = { ...state.troops };
  for (const id of TROOP_IDS) troops[id] -= party[id];
  return {
    state: {
      ...state,
      troops,
      escort: {
        attack,
        slot,
        party: partyOf(party),
        startedAt: state.now,
        arrivesAt,
        returnsAt: null,
        losses: partyOf(),
        held: false,
      },
    },
    events: [{ type: "escortSent", at: state.now, attack, slot, arrivesAt }],
  };
}

/** Les renforts rentrent sans avoir combattu (attaque rappelée, cible à l'abri, arrivés trop tard). */
export function releaseEscort(state: PlayerState, attack: string, when: number): PlayerState {
  const escort = state.escort;
  if (escort?.attack !== attack || escort.returnsAt !== null) return state;
  const back = Math.max(when, state.now) + (escort.arrivesAt - escort.startedAt);
  return { ...state, escort: { ...escort, returnsAt: back } };
}

/** Le résumé d'un combat entre humains : ce que la file du serveur garde, pour les fils et les mesures. */
export interface DuelSummary {
  /** Faux : la cible était à l'abri, rien ne s'est battu. */
  readonly fought: boolean;
  readonly attackerWon: boolean;
  readonly attackerForce: number;
  readonly defenderForce: number;
  /** Cellules perdues de chaque côté (les renforts à part). */
  readonly attackerLost: number;
  readonly defenderLost: number;
  readonly helpersLost: number;
  /** Les alliés venus à temps. */
  readonly helpers: number;
  /** Le butin emporté, en unités entières. */
  readonly loot: number;
}

export interface DuelInput {
  readonly attack: string;
  readonly attacker: PlayerState;
  readonly defender: PlayerState;
  /** Les parties des alliés qui ont envoyé des renforts pour cette attaque. */
  readonly helpers: readonly PlayerState[];
}

export interface DuelResult {
  readonly attacker: Step;
  readonly defender: Step;
  readonly helpers: readonly Step[];
  /** `null` : l'attaque n'existe plus chez l'attaquant (rappelée, déjà jouée, trop ancienne). */
  readonly summary: DuelSummary | null;
}

/** Ce que les rapports, les quêtes et la Gazette retiennent d'événements arrivés hors d'un ordre. */
function told(state: PlayerState, events: readonly GameEvent[]): PlayerState {
  return trackReports(trackDaily(trackQuests(state, events), events), events);
}

function joined(first: Step, state: PlayerState, events: readonly GameEvent[]): Step {
  return { state: told(state, events), events: [...first.events, ...events] };
}

/**
 * Le combat d'une attaque entre humains, joué par le serveur à l'heure du combat. Chaque partie
 * est d'abord amenée à cet instant ; rien n'est tiré au sort.
 */
export function resolveDuel(input: DuelInput): DuelResult {
  const { attack } = input;
  const raid0 = input.attacker.raid;
  const unchanged = (state: PlayerState): Step => ({ state, events: [] });
  const stale = (): DuelResult => ({
    attacker: unchanged(input.attacker),
    defender: unchanged(input.defender),
    helpers: input.helpers.map((state) => unchanged(releaseEscort(state, attack, state.now))),
    summary: null,
  });
  if (raid0 === null || raid0.versus !== input.defender.slot || !awaitsDuel(raid0)) return stale();

  // Le défenseur à l'heure du combat (ou plus tard s'il a déjà joué au-delà).
  const dStep = at(input.defender, raid0.resolveAt);
  const when = dStep.state.now;
  const aStep = at(input.attacker, when);
  const raid = aStep.state.raid;
  if (raid === null || raid.versus !== input.defender.slot || !awaitsDuel(raid)) return stale();
  const hSteps = input.helpers.map((state) => at(state, when));

  // À l'abri à l'arrivée (mode absent, nuit, attaque subie juste avant) : pas de combat.
  if (protectedUntil(dStep.state, when) > when) {
    const bounced = bounceRaid(aStep.state, raid, when);
    return {
      attacker: joined(aStep, bounced.state, bounced.events),
      defender: dStep,
      helpers: hSteps.map((step) => ({
        state: releaseEscort(step.state, attack, when),
        events: step.events,
      })),
      summary: {
        fought: false,
        attackerWon: false,
        attackerForce: 0,
        defenderForce: 0,
        attackerLost: 0,
        defenderLost: 0,
        helpersLost: 0,
        helpers: 0,
        loot: 0,
      },
    };
  }

  const a = aStep.state;
  const d = dStep.state;
  const struck = raid.struck === true;
  const cells = partyPower(raid.party, raid.kind);
  const strikeForce = raidForce(raid.party, raid.kind, struck);
  const attackPercent = modifierPercent(a, "attack");
  const force = Math.floor((strikeForce * (100 + attackPercent)) / 100);

  // Les renforts arrivés à temps, au nom de chaque allié.
  const counted = hSteps.map((step) => {
    const escort = step.state.escort;
    return (
      escort !== null &&
      escort.attack === attack &&
      escort.slot === d.slot &&
      escort.returnsAt === null &&
      escort.arrivesAt <= when
    );
  });
  const helperLines: BattleLine[] = [];
  hSteps.forEach((step, index) => {
    const escort = step.state.escort;
    if (counted[index] !== true || escort === null) return;
    let value = 0;
    for (const id of TROOP_IDS) value += escort.party[id] * BALANCE.troops[id].defense;
    helperLines.push({ ...line("reinforcements", value), name: speciesOf(step.state).name });
  });
  const parts = defenseParts(d);
  const nearby = reinforcements(d, when);
  const defense = parts.total + nearby + helperLines.reduce((sum, entry) => sum + entry.value, 0);

  const won = raidWins(force, defense);
  const combat = BALANCE.rivals.combat;
  const attackerPercent = combatLossPercent(combat.attackerLossPercent, force, defense);
  const defenderPercent = combatLossPercent(combat.defenderLossPercent, defense, force);
  const attackerLosses = spared(a, takeLosses(raid.party, attackerPercent, true));
  const defenderLosses = spared(d, takeLosses(d.troops, defenderPercent, false));
  const helperLosses = hSteps.map((step, index) => {
    const escort = step.state.escort;
    return counted[index] === true && escort !== null
      ? spared(step.state, takeLosses(escort.party, defenderPercent, false))
      : partyOf();
  });

  const battle: Battle = {
    mine: "attacker",
    attacker: side(
      attackTroops(raid.party, raid.kind, attackerLosses),
      [
        line("strike", strikeForce - cells, BALANCE.rivals.raid.strikeAttackPercent),
        line("attackBonus", force - strikeForce, attackPercent),
      ],
      attackerPercent,
    ),
    defender: side(
      defenseTroops(d.troops, defenderLosses),
      [
        line("wall", parts.wall),
        line("defenseBonus", parts.total - parts.cells - parts.wall, parts.bonusPercent),
        line("reinforcements", nearby),
        ...helperLines,
      ],
      defenderPercent,
    ),
    attackerWon: won,
    kind: raid.kind,
  };
  const asDefender: Battle = { ...battle, mine: "defender" };

  // Le butin : tout ce que les survivantes peuvent porter, sous le plafond de la semaine.
  let load = 0;
  for (const id of TROOP_IDS) {
    load += (raid.party[id] - attackerLosses[id]) * BALANCE.troops[id].carry;
  }
  const carry = Math.floor(
    (load * BALANCE.rivals.raid.carryPerCell * MICRO * (100 + modifierPercent(a, "carry"))) / 100,
  );
  const taken: Loot = won
    ? loadLoot(carry, lootable(d, when))
    : { sugar: 0, bricks: 0, proteins: 0 };

  // Le défenseur : ses pertes, ce qu'on lui a pris, et une heure à l'abri s'il a été pillé.
  const troops = { ...d.troops };
  for (const id of TROOP_IDS) troops[id] -= defenderLosses[id];
  const duels = duelsAt(d, when);
  const lost = { ...duels.lost };
  for (const id of RESOURCE_IDS) lost[id] += taken[id];
  const attackerLost = partySize(attackerLosses);
  const defenderLost = partySize(defenderLosses);
  const rival = `o:${String(a.slot)}`;
  const defenderEvent: GameEvent = won
    ? {
        type: "attackSuffered",
        at: when,
        rival,
        sugar: taken.sugar,
        bricks: taken.bricks,
        proteins: taken.proteins,
        troopsLost: defenderLost,
        battle: asDefender,
      }
    : { type: "attackRepelled", at: when, rival, troopsLost: defenderLost, battle: asDefender };
  const defended: PlayerState = {
    ...d,
    troops,
    resources: {
      sugar: d.resources.sugar - taken.sugar,
      bricks: d.resources.bricks - taken.bricks,
      proteins: d.resources.proteins - taken.proteins,
    },
    duels: { ...duels, lost },
    shieldUntil: won
      ? Math.max(d.shieldUntil, when + BALANCE.rivals.incoming.shieldHours * HOUR_MS)
      : d.shieldUntil,
    counters: {
      ...d.counters,
      rivalFights: d.counters.rivalFights + 1,
      attacksRepelled: d.counters.attacksRepelled + (won ? 0 : 1),
      duelPoints: d.counters.duelPoints + attackerLost,
    },
  };

  // L'attaquant : l'issue rangée dans son attaque ; le butin entre à son retour.
  const helpersLost = helperLosses.reduce((sum, losses) => sum + partySize(losses), 0);
  const attacked: PlayerState = {
    ...a,
    raid: {
      ...raid,
      sugar: taken.sugar,
      bricks: taken.bricks,
      proteins: taken.proteins,
      returnsAt: Math.max(raid.returnsAt, a.now),
      outcome: { won, struck, losses: attackerLosses, battle },
    },
    counters: { ...a.counters, duelPoints: a.counters.duelPoints + defenderLost + helpersLost },
  };
  const attackerEvent: GameEvent = {
    type: "raidResolved",
    at: when,
    won,
    struck,
    losses: attackerLosses,
    battle,
  };

  const helpers = hSteps.map((step, index): Step => {
    const escort = step.state.escort;
    const losses = helperLosses[index];
    if (counted[index] !== true || escort === null || losses === undefined) {
      return { state: releaseEscort(step.state, attack, when), events: step.events };
    }
    return {
      state: {
        ...step.state,
        escort: {
          ...escort,
          losses,
          battle: asDefender,
          held: !won,
          returnsAt: when + (escort.arrivesAt - escort.startedAt),
        },
      },
      events: step.events,
    };
  });

  return {
    attacker: joined(aStep, attacked, [attackerEvent]),
    defender: joined(dStep, defended, [defenderEvent]),
    helpers,
    summary: {
      fought: true,
      attackerWon: won,
      attackerForce: force,
      defenderForce: defense,
      attackerLost,
      defenderLost,
      helpersLost,
      helpers: helperLines.length,
      loot: Math.floor((taken.sugar + taken.bricks + taken.proteins) / MICRO),
    },
  };
}
