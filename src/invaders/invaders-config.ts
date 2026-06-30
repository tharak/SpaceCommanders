import { UpgradeType } from "./upgrade-type";

export const INVADERS_CONFIG = {
  fleet: {
    spacing: 15,
    arrivalDistance: 2,
  },
  player: {
    fleetSize: 16,
    fleetBottomOffset: 170,
    weaponCooldown: 0.7,
    favoriteFormationDamageMultiplier: 1.25,
  },
  enemy: {
    waveSize: 10,
    fleetY: 52.5,
    destinationBottomOffset: 40,
    deploymentDelay: 2,
    weaponCooldown: 1.15,
  },
  projectile: {
    speed: 330,
    hitRadius: 5,
  },
  base: {
    bottomOffset: 150,
    maxHp: 1000,
    radius: 20,
    hue: 195,
    weight: 2.5,
    contactMargin: 4,
    supplyCapacity: 20,
    supplyRate: 1,
  },
  supplyShips: {
    initialCount: 5,
    capacity: 1,
    hp: 40,
    speed: 39,
    baseLoadingDistance: 6,
    deliveryDistance: 36,
    targetSupplyCapacity: 10,
  },
} as const;

type UpgradeConfig = {
  baseCost: number;
  attack?: number;
  speed?: number;
  hull?: number;
  range?: number;
  supplyShips?: number;
  baseSupplyRate?: number;
  baseSupplyCapacity?: number;
  regenerationRate?: number;
};

export const UPGRADE_CONFIG: Record<UpgradeType, UpgradeConfig> = {
  [UpgradeType.Damage]: { baseCost: 100, attack: 2 },
  [UpgradeType.Speed]: { baseCost: 100, speed: 4 },
  [UpgradeType.Hull]: { baseCost: 100, hull: 10 },
  [UpgradeType.Range]: { baseCost: 100, range: 7.5 },
  [UpgradeType.SupplyShips]: { baseCost: 100, supplyShips: 1 },
  [UpgradeType.BaseSupplyGeneration]: { baseCost: 100, baseSupplyRate: 0.5 },
  [UpgradeType.BaseSupplyCapacity]: { baseCost: 100, baseSupplyCapacity: 5 },
  [UpgradeType.Regeneration]: { baseCost: 100, regenerationRate: 1 },
};

export function getUpgradeCost(upgrade: UpgradeType, level: number): number {
  return UPGRADE_CONFIG[upgrade].baseCost * (level + 1);
}
