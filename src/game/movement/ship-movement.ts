import { GAME_CONFIG } from "../config";
import { BoidsSimulationManager } from "./boids-simulation";
import type { Body, Ship, Vec, Viewport } from "../types";

export type ShipBoidsWeights = {
  desiredPosition?: number;
};

export function moveShipWithBoids(
  ship: Ship,
  ships: Ship[],
  bodies: Body[],
  viewport: Viewport,
  deltaTime: number,
  arrivalDistance: number = GAME_CONFIG.formation.arrivalDistance,
  formationHeading?: Vec,
  weights: ShipBoidsWeights = {},
): void {
  const manager = new BoidsSimulationManager({
    boids: ships,
    bodies,
    viewport,
    config: {
      arrivalDistance,
      finalApproachDistance: GAME_CONFIG.formation.finalApproachDistance,
      finalApproachSeparationMultiplier:
        GAME_CONFIG.formation.finalApproachSeparationMultiplier,
      separationDistance: GAME_CONFIG.movement.separationDistance,
      separationWeight: GAME_CONFIG.movement.separationForceMultiplier,
      alignmentWeight: GAME_CONFIG.movement.alignmentForceMultiplier,
      desiredHeadingWeight: GAME_CONFIG.movement.desiredHeadingForceMultiplier,
      steeringHeadingWeight: GAME_CONFIG.movement.steeringHeadingForceMultiplier,
      bodyClearance: GAME_CONFIG.movement.bodyClearance,
      bodyAvoidanceWeight: GAME_CONFIG.movement.bodyAvoidanceForceMultiplier,
      edgeClearance: GAME_CONFIG.movement.edgeClearance,
      edgeAvoidanceWeight: GAME_CONFIG.movement.edgeAvoidanceForceMultiplier,
      velocityResponseRate: GAME_CONFIG.movement.velocityResponseRate,
      headingVelocityThreshold: GAME_CONFIG.movement.headingVelocityThreshold,
      arrivalTurnRate: GAME_CONFIG.movement.arrivalTurnRate,
      viewportPadding: GAME_CONFIG.movement.viewportPadding,
    },
  });

  manager.update(
    ship,
    {
      desiredPosition: ship.target,
      desiredPositionWeight: weights.desiredPosition ?? 1,
      desiredHeading: ship.targetHeading ?? formationHeading,
      steeringHeading: ship.steeringHeading,
    },
    deltaTime,
  );
}
