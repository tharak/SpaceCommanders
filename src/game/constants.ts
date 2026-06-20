import { FireMode, Formation, Side } from "./types";
import type { Config } from "./types";

export const FORMATIONS = [
  Formation.Line,
  Formation.Column,
  Formation.Arrow,
  Formation.Circle,
  Formation.Pincer,
] as const;
export const FIRE_MODES = [
  FireMode.Focus,
  FireMode.AtWill,
  FireMode.Hold,
] as const;
export const COLORS: Record<Side, string> = {
  [Side.Player]: "#5de5ff",
  [Side.Enemy]: "#ff6d91",
};
export const FORMATION_ARRIVAL_DISTANCE = 4;

export const DEFAULT_CONFIG: Config = {
  ships: 10,
  planets: 5,
  asteroids: 3,
  speed: 1,
};
