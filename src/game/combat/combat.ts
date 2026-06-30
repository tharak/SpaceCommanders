import { distance, distanceToSegment } from "../utils";
import { GAME_CONFIG } from "../game-settings";
import { Battleship, FireMode } from "../types";

export const FIRING_CONE_ANGLE =
  (GAME_CONFIG.combat.firingConeDegrees * Math.PI) / 180;
export const FIRING_CONE_HALF_ANGLE = FIRING_CONE_ANGLE / 2;
import type { Body, Ship, Vec } from "../types";

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
      distanceToSegment(other.pos, ship.pos, target) <
        GAME_CONFIG.combat.allyLineBlockDistance,
  );
  if (allyBlocksLine) return false;

  return !bodies.some(
    (body) =>
      body !== targetBody &&
      distanceToSegment(body.pos, ship.pos, target) < body.radius,
  );
}

export function isTargetForward(
  source: Pick<Ship, "pos" | "heading">,
  target: Vec,
): boolean {
  const targetDirection = {
    x: target.x - source.pos.x,
    y: target.y - source.pos.y,
  };
  const targetLength = Math.hypot(targetDirection.x, targetDirection.y) || 1;
  const headingLength = Math.hypot(source.heading.x, source.heading.y) || 1;
  const dot =
    (source.heading.x / headingLength) * (targetDirection.x / targetLength) +
    (source.heading.y / headingLength) * (targetDirection.y / targetLength);
  return dot >= Math.cos(FIRING_CONE_HALF_ANGLE);
}

export function applyGunSteering(
  ships: Ship[],
  enemies: Ship[],
  fireMode: FireMode,
): void {
  for (const ship of ships) {
    if (!(ship instanceof Battleship) || fireMode !== FireMode.AtWill) continue;
    const target = enemies
      .filter((enemy) => distance(enemy.pos, ship.pos) < ship.gun.range)
      .reduce<
        Ship | undefined
      >((closest, enemy) => (!closest || distance(enemy.pos, ship.pos) < distance(closest.pos, ship.pos) ? enemy : closest), undefined)?.pos;
    if (target) ship.gun.aimAt(ship.pos, ship.heading, target);
  }
}
