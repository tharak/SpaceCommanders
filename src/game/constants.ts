import type { Config, FireMode, Formation, Side } from "./types";

export const FORMATIONS: Formation[] = [
  "line",
  "column",
  "arrow",
  "circle",
  "pincer",
];
export const FIRE_MODES: FireMode[] = ["focus", "atwill", "hold"];
export const COLORS: Record<Side, string> = {
  player: "#5de5ff",
  enemy: "#ff6d91",
};
export const DEFAULT_CONFIG: Config = {
  ships: 10,
  planets: 5,
  asteroids: 3,
  speed: 1,
};
