import { clamp, distance, normalize } from "./math";
import { GAME_CONFIG } from "./config";
import type { Body, Ship, Vec, Viewport } from "./types";

export function moveShipWithBoids(
  ship: Ship,
  ships: Ship[],
  bodies: Body[],
  viewport: Viewport,
  deltaTime: number,
  arrivalDistance = GAME_CONFIG.formation.arrivalDistance,
  formationHeading?: Vec,
): void {
  if (!ship.target) return;
  const desiredHeading = ship.targetHeading ?? formationHeading;
  const steeringHeading = ship.steeringHeading;
  if (distance(ship.pos, ship.target) <= arrivalDistance) {
    ship.pos = { ...ship.target };
    ship.vel = { x: 0, y: 0 };
    const arrivalHeading = steeringHeading ?? desiredHeading;
    if (arrivalHeading) steerHeading(ship, arrivalHeading, deltaTime);
    return;
  }

  const force = steeringForce(ship);
  let alignment = { x: 0, y: 0 };
  let alignmentCount = 0;
  for (const other of ships) {
    if (other === ship) continue;
    const separation = distance(ship.pos, other.pos);
    if (separation >= GAME_CONFIG.movement.separationDistance) continue;
    const direction = normalize({
      x: ship.pos.x - other.pos.x,
      y: ship.pos.y - other.pos.y,
    });
    force.x +=
      direction.x *
      (GAME_CONFIG.movement.separationDistance - separation) *
      GAME_CONFIG.movement.separationForceMultiplier;
    force.y +=
      direction.y *
      (GAME_CONFIG.movement.separationDistance - separation) *
      GAME_CONFIG.movement.separationForceMultiplier;
    alignment.x += other.heading.x;
    alignment.y += other.heading.y;
    alignmentCount++;
  }
  if (alignmentCount > 0) {
    const direction = normalize(alignment);
    force.x +=
      direction.x * ship.speed * GAME_CONFIG.movement.alignmentForceMultiplier;
    force.y +=
      direction.y * ship.speed * GAME_CONFIG.movement.alignmentForceMultiplier;
  }
  if (desiredHeading) {
    const direction = normalize(desiredHeading);
    force.x +=
      direction.x *
      ship.speed *
      GAME_CONFIG.movement.desiredHeadingForceMultiplier;
    force.y +=
      direction.y *
      ship.speed *
      GAME_CONFIG.movement.desiredHeadingForceMultiplier;
  }
  if (steeringHeading) {
    steerHeading(ship, steeringHeading, deltaTime);
    force.x +=
      ship.heading.x *
      ship.speed *
      GAME_CONFIG.movement.steeringHeadingForceMultiplier;
    force.y +=
      ship.heading.y *
      ship.speed *
      GAME_CONFIG.movement.steeringHeadingForceMultiplier;
  }
  for (const body of bodies) {
    const separation = distance(ship.pos, body.pos);
    const safeDistance = body.radius + GAME_CONFIG.movement.bodyClearance;
    if (separation >= safeDistance) continue;
    const direction = normalize({
      x: ship.pos.x - body.pos.x,
      y: ship.pos.y - body.pos.y,
    });
    force.x +=
      direction.x *
      (safeDistance - separation) *
      GAME_CONFIG.movement.bodyAvoidanceForceMultiplier;
    force.y +=
      direction.y *
      (safeDistance - separation) *
      GAME_CONFIG.movement.bodyAvoidanceForceMultiplier;
  }

  applyEdgeAvoidance(force, ship, viewport);

  ship.vel.x +=
    (force.x - ship.vel.x) *
    Math.min(1, deltaTime * GAME_CONFIG.movement.velocityResponseRate);
  ship.vel.y +=
    (force.y - ship.vel.y) *
    Math.min(1, deltaTime * GAME_CONFIG.movement.velocityResponseRate);
  if (
    Math.hypot(ship.vel.x, ship.vel.y) >
    GAME_CONFIG.movement.headingVelocityThreshold
  ) {
    ship.heading = normalize(ship.vel);
  }
  ship.pos.x = clamp(
    ship.pos.x + ship.vel.x * deltaTime,
    GAME_CONFIG.movement.viewportPadding,
    viewport.width - GAME_CONFIG.movement.viewportPadding,
  );
  ship.pos.y = clamp(
    ship.pos.y + ship.vel.y * deltaTime,
    GAME_CONFIG.movement.viewportPadding,
    viewport.height - GAME_CONFIG.movement.viewportPadding,
  );
}

function applyEdgeAvoidance(force: Vec, ship: Ship, viewport: Viewport): void {
  const clearance = GAME_CONFIG.movement.edgeClearance;
  const multiplier = GAME_CONFIG.movement.edgeAvoidanceForceMultiplier;
  const left = ship.pos.x - clearance;
  const right = viewport.width - clearance - ship.pos.x;
  const top = ship.pos.y - clearance;
  const bottom = viewport.height - clearance - ship.pos.y;

  if (left < 0) force.x += -left * multiplier;
  if (right < 0) force.x -= -right * multiplier;
  if (top < 0) force.y += -top * multiplier;
  if (bottom < 0) force.y -= -bottom * multiplier;
}

function steeringForce(ship: Ship): Vec {
  if (!ship.target) return { x: 0, y: 0 };
  const vector = {
    x: ship.target.x - ship.pos.x,
    y: ship.target.y - ship.pos.y,
  };
  const length = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: (vector.x / length) * ship.speed,
    y: (vector.y / length) * ship.speed,
  };
}

function steerHeading(ship: Ship, targetHeading: Vec, deltaTime: number): void {
  const turnAmount = Math.min(1, deltaTime * GAME_CONFIG.movement.turnRate);
  ship.heading = normalize({
    x: ship.heading.x + (targetHeading.x - ship.heading.x) * turnAmount,
    y: ship.heading.y + (targetHeading.y - ship.heading.y) * turnAmount,
  });
}
