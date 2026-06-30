import { Formation } from "./types";
import type { Config } from "./types";

export const DEFAULT_GAME_CONFIG = {
  ships: 16,
  planets: 3,
  asteroids: 1,
  speed: 1,
  debugFormationMap: false,
} satisfies Config;

export const GAME_CONFIG = {
  match: {
    initialFormation: Formation.Line,
    captainFavorite: Formation.Line,
    initialCohesion: 0.7,
  },
  map: {
    basePlanet: {
      radius: 18.5,
      hue: {
        player: 195,
        enemy: 350,
      },
      weight: 2.5,
      edgeClearance: 120,
      borderShipSpacing: 2,
    },
    neutralPlanet: {
      horizontalMargin: 60,
      verticalMargin: 50,
      minRadius: 10,
      maxRadius: 17,
      minHue: 25,
      maxHue: 290,
      minWeight: 0.8,
      maxWeight: 2,
    },
    asteroidField: {
      horizontalMargin: 50,
      verticalMargin: 40,
      minRadius: 16,
      maxRadius: 29,
    },
  },
  formation: {
    arrivalDistance: 4,
    finalApproachDistance: 18,
    finalApproachSeparationMultiplier: 0.15,
    spacing: 24,
    captainOffsetX: 10,
    captainOffsetY: 30,
  },
  debug: {
    formationMapShipsPerFormation: 6,
    formationMapSpacing: 14,
  },
  ship: {
    hp: 50,
    initialVelocityRange: 12,
    defense: 3,
    speed: 17,
    sight: 130,
    morale: 70,
    startingSupplies: 10,
    render: {
      fillHeight: 6,
      bottom: 2.5,
      noseY: -3.5,
      wingX: 2.5,
      tailY: 2.5,
      tailNotchY: 1.5,
      guardWingX: 2.5,
      guardInnerWingX: 2,
      guardShoulderY: -2,
      healthBarWidth: 6.5,
    },
  },
  battleship: {
    gun: {
      attack: 10,
      range: 33.75,
      initialCooldown: 1,
      cooldown: 0.75,
    },
  },
  guardShip: {
    startingSupplies: 0,
  },
  supply: {
    shipCapacity: 1,
    shipHp: 40,
    shipSpeed: 31,
    targetSupplyCapacity: 10,
    transferDistance: 36,
    returnDistance: 18,
    collectionRange: 22.5,
    render: {
      size: 3.5,
      fillHeight: 3.5,
      bottom: 1.5,
      healthBarWidth: 6.5,
    },
  },
  planet: {
    stockCapacityRadiusDivisor: 1,
    supplyGenerationRate: 0.55,
    captureRange: 22.5,
    captureRate: 0.03,
  },
  projectile: {
    speed: 360,
    hitRadius: 3.5,
  },
  combat: {
    firingConeDegrees: 40,
    allyLineBlockDistance: 3.5,
    favoriteFormationDamageMultiplier: 1.25,
    minimumDamage: 1,
    moraleDamage: 5,
    maximumMorale: 100,
  },
  movement: {
    separationDistance: 16,
    separationForceMultiplier: 6.5,
    alignmentForceMultiplier: 0.18,
    desiredHeadingForceMultiplier: 0.25,
    steeringHeadingForceMultiplier: 0.45,
    bodyClearance: 15,
    bodyAvoidanceForceMultiplier: 5,
    edgeClearance: 30,
    edgeAvoidanceForceMultiplier: 4,
    formationDesiredPositionWeight: 0.95,
    velocityResponseRate: 1.55,
    headingVelocityThreshold: 1,
    arrivalTurnRate: 2.2,
    viewportPadding: 5,
  },
} as const;
