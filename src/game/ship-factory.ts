import { formationSlots } from "./formations";
import { randomBetween } from "./math";
import { ShipRole } from "./types";
import type { Formation } from "./types";
import type { Ship, Side, Vec } from "./types";

export function spawnShip(
  side: Side,
  role: ShipRole,
  position: Vec,
  id: number,
): Ship {
  const hp = 50;
  return {
    id,
    side,
    role,
    pos: { ...position },
    vel: { x: randomBetween(-12, 12), y: randomBetween(-12, 12) },
    hp,
    maxHp: hp,
    attack: 10,
    defense: 3,
    speed: 56,
    sight: 260,
    moral: 70,
    supplies: 10,
    range: 135,
    cooldown: 1,
  };
}

export function spawnFleet(
  side: Side,
  role: ShipRole,
  center: Vec,
  formation: Formation,
  count: number,
  spacing: number,
  firstId: number,
): Ship[] {
  return formationSlots(center, formation, count, spacing).map(
    (position, index) => spawnShip(side, role, position, firstId + index),
  );
}
