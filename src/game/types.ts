export enum Formation {
  Line = "line",
  Column = "column",
  Arrow = "arrow",
  Circle = "circle",
  Pincer = "pincer",
}

export enum FireMode {
  Focus = "focus",
  AtWill = "atwill",
  Hold = "hold",
}

export enum Side {
  Player = "player",
  Enemy = "enemy",
}

export enum ShipRole {
  Battleship = "battleship",
  Captain = "captain",
}

export enum BodyKind {
  Planet = "planet",
  Asteroids = "asteroids",
}

export type Vec = { x: number; y: number };
export type Viewport = { width: number; height: number };

export type Body = {
  kind: BodyKind;
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
