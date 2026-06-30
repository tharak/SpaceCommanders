import { formationSlots } from "./formations";
import { GAME_CONFIG } from "./config";
import { Gun } from "./gun";
import { randomBetween } from "./math";
import {
  BaseShip,
  Battleship,
  GuardShip,
  ShipRole,
  Side,
  SupplyShip,
} from "./types";
import type { Formation } from "./types";
import type { Ship, Vec } from "./types";

export function spawnShip(
  side: Side,
  role: ShipRole,
  position: Vec,
  id: number,
  fleetId = side + "-main",
): Ship {
  const initial = {
    id,
    side,
    role,
    fleetId,
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
    hp: GAME_CONFIG.ship.hp,
    maxHp: GAME_CONFIG.ship.hp,
    defense: GAME_CONFIG.ship.defense,
    speed: GAME_CONFIG.ship.speed,
    sight: GAME_CONFIG.ship.sight,
    moral: GAME_CONFIG.ship.morale,
    supplies: GAME_CONFIG.ship.startingSupplies,
  };
  switch (role) {
    case ShipRole.Battleship:
      return new Battleship(initial, new Gun(GAME_CONFIG.battleship.gun));
    case ShipRole.Guard:
      return new GuardShip({
        ...initial,
        speed: GAME_CONFIG.ship.speed,
        supplies: GAME_CONFIG.guardShip.startingSupplies,
      });
    case ShipRole.Supply:
      return new SupplyShip({
        ...initial,
        speed: GAME_CONFIG.supply.shipSpeed,
        supplies: GAME_CONFIG.supply.shipCapacity,
      });
    case ShipRole.Captain:
      return new BaseShip(initial, ShipRole.Captain);
  }
}

export function spawnFleet(
  side: Side,
  role: ShipRole,
  center: Vec,
  formation: Formation,
  count: number,
  spacing: number,
  firstId: number,
  fleetId = side + "-main",
): Ship[] {
  return formationSlots(center, formation, count, spacing).map(
    (position, index) =>
      spawnShip(side, role, position, firstId + index, fleetId),
  );
}
