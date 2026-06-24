import { Formation } from "./types";
import type { Config } from "./types";

export const DEFAULT_GAME_CONFIG = {
  ships: 5,
  planets: 3,
  asteroids: 1,
  speed: 1,
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
    enemySpacing: 45,
    playerSpacingBase: 80,
    playerCohesionSpacingMultiplier: 50,
    playerMinSpacing: 25,
    playerMaxSpacing: 70,
    captainOffsetX: 20,
    captainOffsetY: 60,
  },
  ship: {
    hp: 50,
    initialVelocityRange: 12,
    defense: 3,
    sight: 260,
    morale: 70,
  },
  battleship: {
    speed: 56,
    startingSupplies: 10,
    gun: {
      attack: 10,
      range: 135,
      initialCooldown: 1,
      cooldown: 0.75,
    },
  },
  guardShip: {
    speed: 28,
    startingSupplies: 0,
  },
  supply: {
    shipCapacity: 1,
    shipHp: 40,
    shipSpeed: 78,
    targetSupplyCapacity: 10,
    transferDistance: 32,
    returnDistance: 12,
    collectionRange: 45,
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
    separationDistance: 42,
    separationForceMultiplier: 3,
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
