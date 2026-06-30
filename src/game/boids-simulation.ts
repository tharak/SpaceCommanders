import { clamp, distance, normalize } from "./math";
import type { Body, Ship, Vec, Viewport } from "./types";

export type BoidsSimulationConfig = {
  arrivalDistance: number;
  separationDistance: number;
  separationWeight: number;
  alignmentWeight: number;
  desiredHeadingWeight: number;
  steeringHeadingWeight: number;
  bodyClearance: number;
  bodyAvoidanceWeight: number;
  edgeClearance: number;
  edgeAvoidanceWeight: number;
  velocityResponseRate: number;
  headingVelocityThreshold: number;
  viewportPadding: number;
  turnRate: number;
};

export type BoidsSimulationOrder = {
  desiredPosition?: Vec;
  desiredPositionWeight: number;
  desiredHeading?: Vec;
  steeringHeading?: Vec;
};

export type BoidsSimulationSetup = {
  boids: Ship[];
  bodies: Body[];
  viewport: Viewport;
  config: BoidsSimulationConfig;
};

export class BoidsSimulationManager {
  constructor(private readonly setup: BoidsSimulationSetup) {}

  update(ship: Ship, order: BoidsSimulationOrder, deltaTime: number): void {
    if (!order.desiredPosition) return;
    const { config, viewport } = this.setup;
    const desiredHeading = order.desiredHeading;
    const steeringHeading = order.steeringHeading;

    if (distance(ship.pos, order.desiredPosition) <= config.arrivalDistance) {
      ship.pos = { ...order.desiredPosition };
      ship.vel = { x: 0, y: 0 };
      const arrivalHeading = steeringHeading ?? desiredHeading;
      if (arrivalHeading) this.steerHeading(ship, arrivalHeading, deltaTime);
      return;
    }

    const force = this.desiredPositionForce(ship, order);
    this.applyBoidForces(force, ship);
    this.applyBodyAvoidance(force, ship);
    this.applyEdgeAvoidance(force, ship);
    this.applyHeadingForces(force, ship, order, deltaTime);

    ship.vel.x +=
      (force.x - ship.vel.x) *
      Math.min(1, deltaTime * config.velocityResponseRate);
    ship.vel.y +=
      (force.y - ship.vel.y) *
      Math.min(1, deltaTime * config.velocityResponseRate);

    if (Math.hypot(ship.vel.x, ship.vel.y) > config.headingVelocityThreshold) {
      ship.heading = normalize(ship.vel);
    }

    ship.pos.x = clamp(
      ship.pos.x + ship.vel.x * deltaTime,
      config.viewportPadding,
      viewport.width - config.viewportPadding,
    );
    ship.pos.y = clamp(
      ship.pos.y + ship.vel.y * deltaTime,
      config.viewportPadding,
      viewport.height - config.viewportPadding,
    );
  }

  private desiredPositionForce(ship: Ship, order: BoidsSimulationOrder): Vec {
    const target = order.desiredPosition;
    if (!target) return { x: 0, y: 0 };
    const direction = normalize({
      x: target.x - ship.pos.x,
      y: target.y - ship.pos.y,
    });
    return {
      x: direction.x * ship.speed * order.desiredPositionWeight,
      y: direction.y * ship.speed * order.desiredPositionWeight,
    };
  }

  private applyBoidForces(force: Vec, ship: Ship): void {
    const { config, boids } = this.setup;
    let alignment = { x: 0, y: 0 };
    let alignmentCount = 0;

    for (const other of boids) {
      if (other === ship) continue;
      const separation = distance(ship.pos, other.pos);
      if (separation >= config.separationDistance) continue;
      const direction = normalize({
        x: ship.pos.x - other.pos.x,
        y: ship.pos.y - other.pos.y,
      });
      force.x +=
        direction.x * (config.separationDistance - separation) * config.separationWeight;
      force.y +=
        direction.y * (config.separationDistance - separation) * config.separationWeight;
      alignment.x += other.heading.x;
      alignment.y += other.heading.y;
      alignmentCount++;
    }

    if (alignmentCount > 0) {
      const direction = normalize(alignment);
      force.x += direction.x * ship.speed * config.alignmentWeight;
      force.y += direction.y * ship.speed * config.alignmentWeight;
    }
  }

  private applyHeadingForces(
    force: Vec,
    ship: Ship,
    order: BoidsSimulationOrder,
    deltaTime: number,
  ): void {
    const { config } = this.setup;
    if (order.desiredHeading) {
      const direction = normalize(order.desiredHeading);
      force.x += direction.x * ship.speed * config.desiredHeadingWeight;
      force.y += direction.y * ship.speed * config.desiredHeadingWeight;
    }

    if (order.steeringHeading) {
      this.steerHeading(ship, order.steeringHeading, deltaTime);
      force.x += ship.heading.x * ship.speed * config.steeringHeadingWeight;
      force.y += ship.heading.y * ship.speed * config.steeringHeadingWeight;
    }
  }

  private applyBodyAvoidance(force: Vec, ship: Ship): void {
    const { config, bodies } = this.setup;
    for (const body of bodies) {
      const separation = distance(ship.pos, body.pos);
      const safeDistance = body.radius + config.bodyClearance;
      if (separation >= safeDistance) continue;
      const direction = normalize({
        x: ship.pos.x - body.pos.x,
        y: ship.pos.y - body.pos.y,
      });
      force.x += direction.x * (safeDistance - separation) * config.bodyAvoidanceWeight;
      force.y += direction.y * (safeDistance - separation) * config.bodyAvoidanceWeight;
    }
  }

  private applyEdgeAvoidance(force: Vec, ship: Ship): void {
    const { config, viewport } = this.setup;
    const left = ship.pos.x - config.edgeClearance;
    const right = viewport.width - config.edgeClearance - ship.pos.x;
    const top = ship.pos.y - config.edgeClearance;
    const bottom = viewport.height - config.edgeClearance - ship.pos.y;

    if (left < 0) force.x += -left * config.edgeAvoidanceWeight;
    if (right < 0) force.x -= -right * config.edgeAvoidanceWeight;
    if (top < 0) force.y += -top * config.edgeAvoidanceWeight;
    if (bottom < 0) force.y -= -bottom * config.edgeAvoidanceWeight;
  }

  private steerHeading(ship: Ship, targetHeading: Vec, deltaTime: number): void {
    const turnAmount = Math.min(1, deltaTime * this.setup.config.turnRate);
    ship.heading = normalize({
      x: ship.heading.x + (targetHeading.x - ship.heading.x) * turnAmount,
      y: ship.heading.y + (targetHeading.y - ship.heading.y) * turnAmount,
    });
  }
}
