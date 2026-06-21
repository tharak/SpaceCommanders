import { clamp, distance, normalize } from "./math";
import type { Body, Ship, Vec, Viewport } from "./types";

export function moveShipWithBoids(
  ship: Ship,
  ships: Ship[],
  bodies: Body[],
  viewport: Viewport,
  deltaTime: number,
  arrivalDistance = 4,
): void {
  if (!ship.target) return;
  if (distance(ship.pos, ship.target) <= arrivalDistance) {
    ship.pos = { ...ship.target };
    ship.vel = { x: 0, y: 0 };
    return;
  }

  const force = steeringForce(ship);
  let alignment = { x: 0, y: 0 };
  let alignmentCount = 0;
  for (const other of ships) {
    if (other === ship) continue;
    const separation = distance(ship.pos, other.pos);
    if (separation >= 42) continue;
    const direction = normalize({
      x: ship.pos.x - other.pos.x,
      y: ship.pos.y - other.pos.y,
    });
    force.x += direction.x * (42 - separation) * 3;
    force.y += direction.y * (42 - separation) * 3;
    alignment.x += other.heading.x;
    alignment.y += other.heading.y;
    alignmentCount++;
  }
  if (alignmentCount > 0) {
    const direction = normalize(alignment);
    force.x += direction.x * ship.speed * 0.25;
    force.y += direction.y * ship.speed * 0.25;
  }
  for (const body of bodies) {
    const separation = distance(ship.pos, body.pos);
    const safeDistance = body.radius + 30;
    if (separation >= safeDistance) continue;
    const direction = normalize({
      x: ship.pos.x - body.pos.x,
      y: ship.pos.y - body.pos.y,
    });
    force.x += direction.x * (safeDistance - separation) * 5;
    force.y += direction.y * (safeDistance - separation) * 5;
  }

  ship.vel.x += (force.x - ship.vel.x) * Math.min(1, deltaTime * 2.2);
  ship.vel.y += (force.y - ship.vel.y) * Math.min(1, deltaTime * 2.2);
  if (Math.hypot(ship.vel.x, ship.vel.y) > 1) {
    ship.heading = normalize(ship.vel);
  }
  ship.pos.x = clamp(
    ship.pos.x + ship.vel.x * deltaTime,
    10,
    viewport.width - 10,
  );
  ship.pos.y = clamp(
    ship.pos.y + ship.vel.y * deltaTime,
    10,
    viewport.height - 10,
  );
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
