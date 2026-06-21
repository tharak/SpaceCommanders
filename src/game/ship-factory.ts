import { formationSlots } from "./formations";
import { randomBetween } from "./math";
import { ShipRole, Side } from "./types";
import type { Formation } from "./types";
import type { Ship, Vec } from "./types";

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
    heading: side === Side.Player ? { x: 0, y: -1 } : { x: 0, y: 1 },
    hp,
    maxHp: hp,
    attack: 10,
    defense: 3,
    speed: 56,
    sight: 260,
    moral: 70,
    supplies: role === ShipRole.Guard ? 0 : 10,
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
