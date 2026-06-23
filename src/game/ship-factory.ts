import { formationSlots } from "./formations";
import { GAME_CONFIG } from "./config";
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
  const hp = GAME_CONFIG.ship.hp;
  const speed =
    role === ShipRole.Guard
      ? GAME_CONFIG.ship.guardSpeed
      : GAME_CONFIG.ship.standardSpeed;
  return {
    id,
    side,
    role,
    pos: { ...position },
    vel: {
      x: randomBetween(
        -GAME_CONFIG.ship.initialVelocityRange,
        GAME_CONFIG.ship.initialVelocityRange,
      ),
      y: randomBetween(
        -GAME_CONFIG.ship.initialVelocityRange,
        GAME_CONFIG.ship.initialVelocityRange,
      ),
    },
    heading: side === Side.Player ? { x: 0, y: -1 } : { x: 0, y: 1 },
    hp,
    maxHp: hp,
    attack: GAME_CONFIG.ship.attack,
    defense: GAME_CONFIG.ship.defense,
    speed,
    sight: GAME_CONFIG.ship.sight,
    moral: GAME_CONFIG.ship.morale,
    supplies: role === ShipRole.Guard ? 0 : GAME_CONFIG.ship.startingSupplies,
    range: GAME_CONFIG.ship.range,
    cooldown: GAME_CONFIG.ship.initialCooldown,
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
