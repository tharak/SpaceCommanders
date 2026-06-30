import { UpgradeType } from "./upgrade-type";
import type {
  Body,
  FleetCommand,
  FireMode,
  Formation,
  Projectile,
  Ship,
  Side,
  Vec,
  Viewport,
} from "../game/types";

export type InvadersState = {
  formation: Formation;
  selectedFormation: Formation;
  selectedFleetId: string;
  fleets: Record<string, FleetCommand>;
  enemyFormation: Formation;
  enemyDestination: Vec;
  playerSteeringTarget: Vec | null;
  captainFavorite: Formation;
  fireMode: FireMode;
  ships: Ship[];
  supplyShips: Ship[];
  enemies: Ship[];
  projectiles: Projectile[];
  base: Body;
  baseHp: number;
  baseMaxHp: number;
  baseSupplyRate: number;
  baseSupplyCapacity: number;
  regenerationRate: number;
  wave: number;
  enemyDeploymentCountdown: number;
  score: number;
  money: number;
  upgrades: Record<UpgradeType, number>;
  waveOffset: number;
  waveDirection: number;
  nextShipId: number;
  winner: Side | null;
};

export type InvadersRenderContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  status: HTMLElement;
  countdown: HTMLElement;
  viewport: Viewport;
};
