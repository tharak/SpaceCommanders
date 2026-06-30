import { FireMode, Formation, Side } from "./types";

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

export const PLAYER_FLEET_IDS = ["player-vanguard", "player-core", "player-flank"] as const;

export const PLAYER_FLEET_COLORS: Record<(typeof PLAYER_FLEET_IDS)[number], string> = {
  "player-vanguard": "#5de5ff",
  "player-core": "#f0cf77",
  "player-flank": "#9dff8a",
};

export const PLAYER_FLEET_NAMES: Record<(typeof PLAYER_FLEET_IDS)[number], string> = {
  "player-vanguard": "Vanguard",
  "player-core": "Core",
  "player-flank": "Flank",
};
