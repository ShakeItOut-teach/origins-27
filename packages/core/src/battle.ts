/**
 * Le détail d'un combat, pour la page du rapport : les cellules de chaque camp, ce que vaut
 * chacune, ce qui s'ajoute à leur force, les pertes, et ce qui a fait la différence.
 * Ce module ne décide rien : il raconte les nombres que le combat a vraiment utilisés.
 */
import { BALANCE, STRONG_AGAINST, TROOP_IDS } from "@o27/data";
import type { PreyKind, TroopId } from "@o27/data";
import type { Battle, BattleLine, BattleSide, BattleTroop } from "./types";

type Party = Readonly<Record<TroopId, number>>;

/** Ce que vaut une cellule à l'attaque contre ce tempérament : double si elle est du bon type. */
export function attackEach(troop: TroopId, kind: PreyKind): number {
  return (
    BALANCE.troops[troop].power *
    (STRONG_AGAINST[troop] === kind ? BALANCE.hunt.strongMultiplier : 1)
  );
}

/** Les cellules d'un groupe à l'attaque, une ligne par sorte présente. */
export function attackTroops(party: Party, kind: PreyKind, losses: Party): BattleTroop[] {
  return TROOP_IDS.filter((id) => party[id] > 0).map((id) => ({
    troop: id,
    count: party[id],
    each: attackEach(id, kind),
    strong: STRONG_AGAINST[id] === kind,
    lost: losses[id],
  }));
}

/** Les cellules restées à la maison, en défense, une ligne par sorte présente. */
export function defenseTroops(troops: Party, losses: Party): BattleTroop[] {
  return TROOP_IDS.filter((id) => troops[id] > 0).map((id) => ({
    troop: id,
    count: troops[id],
    each: BALANCE.troops[id].defense,
    strong: false,
    lost: losses[id],
  }));
}

export function troopsTotal(troops: readonly BattleTroop[]): number {
  return troops.reduce((sum, entry) => sum + entry.count * entry.each, 0);
}

export function line(key: BattleLine["key"], value: number, percent = 0): BattleLine {
  return { key, value, percent };
}

/** Un camp : ses cellules, ses lignes, et une force qui en est exactement la somme. */
export function side(
  troops: readonly BattleTroop[],
  lines: readonly BattleLine[],
  lossPercent: number | null,
): BattleSide {
  const kept = lines.filter((entry) => entry.value !== 0);
  const total = troopsTotal(troops) + kept.reduce((sum, entry) => sum + entry.value, 0);
  return { troops, lines: kept, total, lossPercent };
}

/** Ce qu'il fallait de plus, et avec quoi, pour que le combat tourne autrement. */
export interface BattleAdvice {
  /** Le joueur a-t-il gagné ce combat (attaque réussie ou défense qui tient) ? */
  readonly won: boolean;
  /** L'écart entre les deux forces, et ce qu'il représente par rapport à la plus faible. */
  readonly margin: number;
  readonly marginPercent: number;
  /** Ce qu'il aurait fallu en plus au joueur pour l'emporter ; 0 s'il a gagné. */
  readonly missing: number;
  /** La meilleure de ses cellules pour combler ce manque, et combien il en fallait. */
  readonly troop: TroopId | null;
  readonly troopCount: number;
  /** En attaque : toucher la bulle pendant le combat aurait suffi. */
  readonly strikeWouldWin: boolean;
}

/**
 * La clé du combat. En attaque, il faut être plus fort que la garde ; en défense, une défense
 * au moins égale à l'attaque la repousse. Aucun hasard : l'écart dit tout.
 */
export function battleAdvice(battle: Battle): BattleAdvice {
  const mine = battle.mine === "attacker" ? battle.attacker : battle.defender;
  const foe = battle.mine === "attacker" ? battle.defender : battle.attacker;
  const won = battle.mine === "attacker" ? battle.attackerWon : !battle.attackerWon;
  const margin = Math.abs(mine.total - foe.total);
  const weaker = Math.max(1, Math.min(mine.total, foe.total));
  // L'attaquant doit dépasser la garde ; le défenseur n'a qu'à l'égaler.
  const missing = won
    ? 0
    : battle.mine === "attacker"
      ? foe.total - mine.total + 1
      : foe.total - mine.total;
  let best: BattleTroop | null = null;
  for (const entry of mine.troops) if (best === null || entry.each > best.each) best = entry;
  const strikePercent = BALANCE.rivals.raid.strikeAttackPercent;
  const struck = mine.lines.some((entry) => entry.key === "strike");
  const cells = troopsTotal(mine.troops);
  const strikeWouldWin =
    !won &&
    battle.mine === "attacker" &&
    !struck &&
    mine.total + Math.floor((cells * strikePercent) / 100) > foe.total;
  return {
    won,
    margin,
    marginPercent: Math.round((100 * margin) / weaker),
    missing: Math.max(0, missing),
    troop: missing > 0 && best !== null ? best.troop : null,
    troopCount: missing > 0 && best !== null ? Math.ceil(missing / Math.max(1, best.each)) : 0,
    strikeWouldWin,
  };
}
