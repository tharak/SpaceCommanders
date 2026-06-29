import { Formation } from "./types";
import type { Config } from "./types";

export const DEFAULT_GAME_CONFIG = {
  ships: 6,
  planets: 3,
  asteroids: 1,
  speed: 1,
  debugFormationMap: false,
} satisfies Config;

export const GAME_CONFIG = {
  match: {
    initialFormation: Formation.Circle,
    captainFavorite: Formation.Line,
    initialCohesion: 0.7,
  },
  map: {
    baseMargin: 100,
    playerBaseMaxXRatio: 0.28,
    enemyBaseMinXRatio: 0.72,
    basePlanet: {
      radius: 37,
      hue: {
        player: 195,
        enemy: 350,
      },
      weight: 2.5,
    },
    neutralPlanet: {
      horizontalMargin: 120,
      verticalMargin: 100,
      minRadius: 20,
      maxRadius: 34,
      minHue: 25,
      maxHue: 290,
      minWeight: 0.8,
      maxWeight: 2,
    },
    asteroidField: {
      horizontalMargin: 100,
      verticalMargin: 80,
      minRadius: 32,
      maxRadius: 58,
    },
  },
  formation: {
    arrivalDistance: 4,
    spacing: 45,
    captainOffsetX: 20,
    captainOffsetY: 60,
  },
  debug: {
    formationMapShipsPerFormation: 6,
    formationMapSpacing: 28,
  },
  ship: {
    hp: 50,
    initialVelocityRange: 12,
    defense: 3,
    speed: 45,
    sight: 260,
    morale: 70,
    startingSupplies: 10,
    render: {
      fillHeight: 18,
      bottom: 8,
      noseY: -10,
      wingX: 7,
      tailY: 8,
      tailNotchY: 5,
      guardWingX: 8,
      guardInnerWingX: 6,
      guardShoulderY: -6,
      healthBarWidth: 20,
    },
  },
  battleship: {
    gun: {
      attack: 10,
      range: 67.5,
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
    shipSpeed: 62,
    targetSupplyCapacity: 10,
    transferDistance: 72,
    returnDistance: 36,
    collectionRange: 45,
    render: {
      size: 10,
      fillHeight: 10,
      bottom: 5,
      healthBarWidth: 20,
    },
  },
  planet: {
    stockCapacityRadiusDivisor: 2,
    supplyGenerationRate: 0.55,
    captureRange: 45,
    captureRate: 0.12,
  },
  projectile: {
    speed: 360,
    hitRadius: 10,
  },
  combat: {
    firingConeDegrees: 40,
    allyLineBlockDistance: 10,
    favoriteFormationDamageMultiplier: 1.25,
    minimumDamage: 1,
    moraleDamage: 5,
    maximumMorale: 100,
  },
  movement: {
    separationDistance: 56,
    separationForceMultiplier: 8,
    alignmentForceMultiplier: 0.25,
    desiredHeadingForceMultiplier: 0.4,
    steeringHeadingForceMultiplier: 0.65,
    bodyClearance: 30,
    bodyAvoidanceForceMultiplier: 5,
    velocityResponseRate: 2.2,
    headingVelocityThreshold: 1,
    viewportPadding: 10,
    turnRate: 4,
  },
} as const;
