export type Formation = "line" | "column" | "arrow" | "circle" | "pincer";
export type FireMode = "focus" | "atwill" | "hold";
export type Side = "player" | "enemy";
export type ShipRole = "battleship" | "supply" | "captain";

export type Vec = { x: number; y: number };
export type Viewport = { width: number; height: number };

export type Body = {
  kind: "planet" | "asteroids";
  pos: Vec;
  radius: number;
  base?: Side;
  stock?: number;
  hue: number;
};

export type Ship = {
  id: number;
  side: Side;
  role: ShipRole;
  pos: Vec;
  vel: Vec;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  sight: number;
  moral: number;
  supplies: number;
  range: number;
  cooldown: number;
  target?: Vec;
};

export type Config = {
  ships: number;
  planets: number;
  asteroids: number;
  speed: number;
};

export type Flash = { from: Vec; to: Vec; life: number; side: Side };

export type GameState = {
  config: Config;
  formation: Formation;
  fireMode: FireMode;
  command: Vec | null;
  pointer: Vec | null;
  bodies: Body[];
  ships: Ship[];
  flashes: Flash[];
  captainFavorite: Formation;
  winner: Side | null;
};
