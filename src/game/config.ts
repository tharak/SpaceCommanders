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
    initialFormation: Formation.Circle,
    captainFavorite: Formation.Line,
    initialCohesion: 0.7,
  },
  map: {
    basePlanet: {
      radius: 37,
      hue: {
        player: 195,
        enemy: 350,
      },
      weight: 2.5,
      borderShipSpacing: 2,
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
    spacing: 30,
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
      fillHeight: 12,
      bottom: 5,
      noseY: -7,
      wingX: 5,
      tailY: 5,
      tailNotchY: 3,
      guardWingX: 5,
      guardInnerWingX: 4,
      guardShoulderY: -4,
      healthBarWidth: 13,
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
      size: 7,
      fillHeight: 7,
      bottom: 3,
      healthBarWidth: 13,
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
    hitRadius: 7,
  },
  combat: {
    firingConeDegrees: 40,
    allyLineBlockDistance: 7,
    favoriteFormationDamageMultiplier: 1.25,
    minimumDamage: 1,
    moraleDamage: 5,
    maximumMorale: 100,
  },
  movement: {
    separationDistance: 32,
    separationForceMultiplier: 5.5,
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
