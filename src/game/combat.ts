import { distance, distanceToSegment } from "./math";
import { ShipRole } from "./types";

export const FIRING_CONE_ANGLE = (40 * Math.PI) / 180;
export const FIRING_CONE_HALF_ANGLE = FIRING_CONE_ANGLE / 2;
import type { Body, Ship, Vec } from "./types";

export function hasLineOfSight(
  ship: Ship,
  target: Vec,
  ships: Ship[],
  bodies: Body[],
  targetShip?: Ship,
  targetBody?: Body,
): boolean {
  const allyBlocksLine = ships.some(
    (other) =>
      other !== ship &&
      other !== targetShip &&
      other.side === ship.side &&
      distanceToSegment(other.pos, ship.pos, target) < 10,
  );
  if (allyBlocksLine) return false;

  return !bodies.some(
    (body) =>
      body !== targetBody &&
      distanceToSegment(body.pos, ship.pos, target) < body.radius,
  );
}

export function isTargetForward(ship: Ship, target: Vec): boolean {
  const targetDirection = {
    x: target.x - ship.pos.x,
    y: target.y - ship.pos.y,
  };
  const targetLength = Math.hypot(targetDirection.x, targetDirection.y) || 1;
  const headingLength = Math.hypot(ship.heading.x, ship.heading.y) || 1;
  const dot =
    (ship.heading.x / headingLength) * (targetDirection.x / targetLength) +
    (ship.heading.y / headingLength) * (targetDirection.y / targetLength);
  return dot >= Math.cos(FIRING_CONE_HALF_ANGLE);
}

export function applyAtWillSteering(
  ships: Ship[],
  enemies: Ship[],
  enabled: boolean,
): void {
  for (const ship of ships) {
    ship.steeringHeading = undefined;
    if (!enabled || ship.role !== ShipRole.Battleship) continue;
    const target = enemies
      .filter((enemy) => distance(enemy.pos, ship.pos) < ship.range)
      .reduce<
        Ship | undefined
      >((closest, enemy) => (!closest || distance(enemy.pos, ship.pos) < distance(closest.pos, ship.pos) ? enemy : closest), undefined);
    if (target) {
      ship.steeringHeading = {
        x: target.pos.x - ship.pos.x,
        y: target.pos.y - ship.pos.y,
      };
    }
  }
}
