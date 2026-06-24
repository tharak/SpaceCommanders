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

  let speedMultiplier = 1;
  let alignment = { x: 0, y: 0 };
  let alignmentCount = 0;
  for (const other of ships) {
    if (other === ship) continue;
    const separation = distance(ship.pos, other.pos);
    if (separation >= GAME_CONFIG.movement.separationDistance) continue;
    const proximity = 1 - separation / GAME_CONFIG.movement.separationDistance;
    speedMultiplier = Math.min(
      speedMultiplier,
      1 -
        proximity * (1 - GAME_CONFIG.movement.separationMinimumSpeedMultiplier),
    );
    alignment.x += other.heading.x;
    alignment.y += other.heading.y;
    alignmentCount++;
  }
  const force = steeringForce(ship, speedMultiplier);
  if (alignmentCount > 0) {
    const direction = normalize(alignment);
    force.x +=
      direction.x *
      ship.speed *
      speedMultiplier *
      GAME_CONFIG.movement.alignmentForceMultiplier;
    force.y +=
      direction.y *
      ship.speed *
      speedMultiplier *
      GAME_CONFIG.movement.alignmentForceMultiplier;
  }
  if (desiredHeading) {
    const direction = normalize(desiredHeading);
    force.x +=
      direction.x *
      ship.speed *
      speedMultiplier *
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
      speedMultiplier *
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

function steeringForce(ship: Ship, speedMultiplier: number): Vec {
  if (!ship.target) return { x: 0, y: 0 };
  const vector = {
    x: ship.target.x - ship.pos.x,
    y: ship.target.y - ship.pos.y,
  };
  const length = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: (vector.x / length) * ship.speed * speedMultiplier,
    y: (vector.y / length) * ship.speed * speedMultiplier,
  };
}

function steerHeading(ship: Ship, targetHeading: Vec, deltaTime: number): void {
  const turnAmount = Math.min(1, deltaTime * GAME_CONFIG.movement.turnRate);
  ship.heading = normalize({
    x: ship.heading.x + (targetHeading.x - ship.heading.x) * turnAmount,
    y: ship.heading.y + (targetHeading.y - ship.heading.y) * turnAmount,
  });
}
