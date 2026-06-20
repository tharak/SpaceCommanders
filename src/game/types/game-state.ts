import type { Body } from "./body";
import type { Config } from "./config";
import type { FireMode } from "./fire-mode";
import type { Projectile } from "./projectile";
import type { Formation } from "./formation";
import type { Ship } from "./ship";
import type { Side } from "./side";
import type { Vec } from "./vector";

export type GameState = {
  config: Config;
  formation: Formation;
  selectedFormation: Formation;
  fireMode: FireMode;
  command: Vec | null;
  previewCenter: Vec | null;
  previewRotation: number;
  formationRotation: number;
  cohesion: number;
  pointer: Vec | null;
  bodies: Body[];
  ships: Ship[];
  projectiles: Projectile[];
  captainFavorite: Formation;
  winner: Side | null;
};
