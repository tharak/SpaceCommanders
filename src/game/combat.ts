import { distanceToSegment } from "./math";
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
