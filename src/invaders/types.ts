import type {
  Body,
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
  enemyFormation: Formation;
  enemyDestination: Vec;
  playerSteeringTarget: Vec | null;
  captainFavorite: Formation;
  ships: Ship[];
  enemies: Ship[];
  projectiles: Projectile[];
  base: Body;
  baseHp: number;
  baseMaxHp: number;
  wave: number;
  score: number;
  waveOffset: number;
  waveDirection: number;
  nextShipId: number;
  winner: Side | null;
};

export type InvadersRenderContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  status: HTMLElement;
  viewport: Viewport;
};
