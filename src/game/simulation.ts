import { DEFAULT_CONFIG, FORMATIONS } from "./constants";
import { formationSlots } from "./formations";
import { clamp, distance, normalize, randomBetween } from "./math";
import type {
  Config,
  GameState,
  Ship,
  ShipRole,
  Side,
  Vec,
  Viewport,
} from "./types";

export function createGameState(): GameState {
  return {
    config: { ...DEFAULT_CONFIG },
    formation: "arrow",
    fireMode: "atwill",
    command: null,
    pointer: null,
    bodies: [],
    ships: [],
    flashes: [],
    captainFavorite: "line",
    winner: null,
  };
}

export function resetGame(
  state: GameState,
  config: Config,
  viewport: Viewport,
): void {
  state.config = config;
  state.winner = null;
  state.command = null;
  state.flashes = [];
  state.ships = [];
  state.bodies = [];

  const margin = 100;
  const playerBase = {
    x: randomBetween(margin, viewport.width * 0.28),
    y: randomBetween(margin, viewport.height - margin),
  };
  const enemyBase = {
    x: randomBetween(viewport.width * 0.72, viewport.width - margin),
    y: randomBetween(margin, viewport.height - margin),
  };

  state.bodies.push(
    {
      kind: "planet",
      pos: playerBase,
      radius: 37,
      base: "player",
      stock: 0,
      hue: 195,
    },
    {
      kind: "planet",
      pos: enemyBase,
      radius: 37,
      base: "enemy",
      stock: 0,
      hue: 350,
    },
  );

  for (let index = 2; index < config.planets; index++) {
    state.bodies.push({
      kind: "planet",
      pos: {
        x: randomBetween(120, viewport.width - 120),
        y: randomBetween(100, viewport.height - 100),
      },
      radius: randomBetween(20, 34),
      stock: 0,
      hue: randomBetween(25, 290),
    });
  }

  for (let index = 0; index < config.asteroids; index++) {
    state.bodies.push({
      kind: "asteroids",
      pos: {
        x: randomBetween(100, viewport.width - 100),
        y: randomBetween(80, viewport.height - 80),
      },
      radius: randomBetween(32, 58),
      hue: 0,
    });
  }

  state.captainFavorite =
    FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
  let id = 0;
  for (const side of ["player", "enemy"] as const) {
    const base = side === "player" ? playerBase : enemyBase;
    for (let index = 0; index < config.ships; index++) {
      state.ships.push(
        spawnShip(side, "battleship", offsetPosition(base, 75), id++),
      );
    }
    state.ships.push(spawnShip(side, "supply", offsetPosition(base, 35), id++));
    state.ships.push(
      spawnShip(side, "captain", offsetPosition(base, 30), id++),
    );
  }
}

export function updateGame(
  state: GameState,
  viewport: Viewport,
  cohesion: number,
  elapsed: number,
): void {
  if (state.winner) return;

  const deltaTime = elapsed * state.config.speed;
  replenishPlanets(state, deltaTime);
  assignFormationTargets(state, cohesion);

  for (const ship of state.ships) {
    ship.cooldown -= deltaTime;
    resupplyShip(state, ship, deltaTime);
    collectPlanetSupplies(state, ship, deltaTime);
    moveShip(state, ship, viewport, deltaTime);
    fireWeapons(state, ship);
  }

  state.ships = state.ships.filter((ship) => ship.hp > 0);
  state.flashes = state.flashes.filter(
    (flash) => (flash.life -= deltaTime) > 0,
  );
  attackBases(state, deltaTime);
}

function spawnShip(
  side: Side,
  role: ShipRole,
  position: Vec,
  id: number,
): Ship {
  const battleship = role === "battleship";
  const captain = role === "captain";
  const hp = battleship ? 100 : captain ? 150 : 80;

  return {
    id,
    side,
    role,
    pos: { ...position },
    vel: { x: randomBetween(-12, 12), y: randomBetween(-12, 12) },
    hp,
    maxHp: hp,
    attack: battleship ? 14 : captain ? 8 : 0,
    defense: battleship ? 3 : 5,
    speed: battleship ? 56 : 45,
    sight: 260,
    moral: 70,
    supplies: battleship ? 10 : 0,
    range: battleship ? 135 : 80,
    cooldown: randomBetween(0, 0.8),
  };
}

function offsetPosition(base: Vec, range: number): Vec {
  return {
    x: base.x + randomBetween(-range, range),
    y: base.y + randomBetween(-range, range),
  };
}

function replenishPlanets(state: GameState, deltaTime: number): void {
  for (const body of state.bodies) {
    if (body.kind === "planet")
      body.stock = (body.stock ?? 0) + deltaTime * 1.1;
  }
}

function assignFormationTargets(state: GameState, cohesion: number): void {
  const playerBase = state.bodies.find((body) => body.base === "player");
  if (!playerBase) return;

  for (const side of ["player", "enemy"] as const) {
    const fleet = state.ships.filter((ship) => ship.side === side);
    const center =
      side === "player" ? (state.command ?? playerBase.pos) : playerBase.pos;
    const formation = side === "player" ? state.formation : "arrow";
    const battleships = fleet.filter((ship) => ship.role === "battleship");
    const spacing = clamp(80 - cohesion * 50, 25, 70);
    const targets = formationSlots(
      center,
      formation,
      battleships.length,
      spacing,
    );

    battleships.forEach((ship, index) => {
      ship.target = targets[index];
    });
    fleet
      .filter((ship) => ship.role !== "battleship")
      .forEach((ship, index) => {
        ship.target = { x: center.x + (index ? 20 : -20), y: center.y + 60 };
      });
  }
}

function resupplyShip(state: GameState, ship: Ship, deltaTime: number): void {
  if (ship.role !== "supply") return;

  for (const ally of state.ships) {
    if (
      ally.side !== ship.side ||
      ally.role !== "battleship" ||
      distance(ally.pos, ship.pos) >= 70 ||
      ally.supplies >= 10
    )
      continue;
    const amount = Math.min(deltaTime * 3, ship.supplies, 10 - ally.supplies);
    ship.supplies -= amount;
    ally.supplies += amount;
  }
}

function collectPlanetSupplies(
  state: GameState,
  ship: Ship,
  deltaTime: number,
): void {
  for (const planet of state.bodies) {
    if (
      planet.kind !== "planet" ||
      distance(ship.pos, planet.pos) >= planet.radius + 45
    )
      continue;
    if (planet.base && planet.base !== ship.side) continue;

    const amount = Math.min(
      deltaTime * 2,
      planet.stock ?? 0,
      10 - ship.supplies,
    );
    ship.supplies += amount;
    planet.stock = (planet.stock ?? 0) - amount;
  }
}

function moveShip(
  state: GameState,
  ship: Ship,
  viewport: Viewport,
  deltaTime: number,
): void {
  let force = steeringForce(ship);

  for (const other of state.ships) {
    if (other === ship) continue;
    const separation = distance(ship.pos, other.pos);
    if (separation >= 42) continue;
    const direction = normalize({
      x: ship.pos.x - other.pos.x,
      y: ship.pos.y - other.pos.y,
    });
    force.x += direction.x * (42 - separation) * 3;
    force.y += direction.y * (42 - separation) * 3;
  }

  for (const body of state.bodies) {
    const separation = distance(ship.pos, body.pos);
    const safeDistance = body.radius + 30;
    if (separation >= safeDistance) continue;
    const direction = normalize({
      x: ship.pos.x - body.pos.x,
      y: ship.pos.y - body.pos.y,
    });
    force.x += direction.x * (safeDistance - separation) * 5;
    force.y += direction.y * (safeDistance - separation) * 5;
  }

  ship.vel.x += (force.x - ship.vel.x) * Math.min(1, deltaTime * 2.2);
  ship.vel.y += (force.y - ship.vel.y) * Math.min(1, deltaTime * 2.2);
  ship.pos.x = clamp(
    ship.pos.x + ship.vel.x * deltaTime,
    10,
    viewport.width - 10,
  );
  ship.pos.y = clamp(
    ship.pos.y + ship.vel.y * deltaTime,
    10,
    viewport.height - 10,
  );
}

function steeringForce(ship: Ship): Vec {
  if (!ship.target) return { x: 0, y: 0 };

  const vector = {
    x: ship.target.x - ship.pos.x,
    y: ship.target.y - ship.pos.y,
  };
  const length = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: (vector.x / length) * ship.speed,
    y: (vector.y / length) * ship.speed,
  };
}

function fireWeapons(state: GameState, ship: Ship): void {
  const targets = state.ships.filter(
    (candidate) =>
      candidate.side !== ship.side &&
      distance(candidate.pos, ship.pos) < ship.range,
  );
  const canFire =
    ship.role === "battleship" &&
    ship.supplies >= 1 &&
    ship.cooldown <= 0 &&
    targets.length > 0 &&
    (ship.side === "enemy" || state.fireMode !== "hold");
  if (!canFire) return;

  let target = targets[0];
  if (ship.side === "player" && state.fireMode === "focus" && state.pointer) {
    target = targets.reduce((closest, candidate) =>
      distance(candidate.pos, state.pointer!) <
      distance(closest.pos, state.pointer!)
        ? candidate
        : closest,
    );
  }

  const bonus =
    ship.side === "player" && state.formation === state.captainFavorite
      ? 1.25
      : 1;
  target.hp -= Math.max(1, ship.attack * bonus - target.defense);
  target.moral = clamp(target.moral - 5, 0, 100);
  ship.supplies--;
  ship.cooldown = 0.75;
  state.flashes.push({
    from: { ...ship.pos },
    to: { ...target.pos },
    life: 0.12,
    side: ship.side,
  });
}

function attackBases(state: GameState, deltaTime: number): void {
  const playerBase = state.bodies.find((body) => body.base === "player");
  const enemyBase = state.bodies.find((body) => body.base === "enemy");
  if (!playerBase || !enemyBase) return;

  for (const base of [playerBase, enemyBase]) {
    const attackers = state.ships.filter(
      (ship) =>
        ship.side !== base.base &&
        ship.role === "battleship" &&
        ship.supplies > 0 &&
        distance(ship.pos, base.pos) < ship.range,
    );
    if (attackers.length === 0 || Math.random() >= deltaTime * 0.3) continue;
    base.radius -= attackers.length * 0.16;
    attackers.forEach((ship) => (ship.supplies -= 0.2));
  }

  if (playerBase.radius < 12 || enemyBase.radius < 12) {
    state.winner = playerBase.radius < 12 ? "enemy" : "player";
  }
}
