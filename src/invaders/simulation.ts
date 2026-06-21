import { formationSlots } from "../game/formations";
import { clamp, distance, normalize } from "../game/math";
import { BodyKind, Formation, ShipRole, Side } from "../game/types";
import type { Formation as FormationType, Ship, Viewport } from "../game/types";
import type { InvadersState } from "./types";

const PLAYER_SHIPS = 7;
const PROJECTILE_SPEED = 330;

export function createInvadersState(): InvadersState {
  return {
    formation: Formation.Line,
    selectedFormation: Formation.Line,
    captainFavorite: Formation.Line,
    ships: [],
    enemies: [],
    projectiles: [],
    planet: {
      id: 0,
      kind: BodyKind.Planet,
      pos: { x: 0, y: 0 },
      radius: 40,
      base: Side.Player,
      stock: 0,
      hue: 195,
      weight: 2.5,
    },
    planetHp: 100,
    wave: 0,
    waveOffset: 0,
    waveDirection: 1,
    nextShipId: 1,
    winner: null,
  };
}

export function resetInvaders(
  state: InvadersState,
  viewport: Viewport,
  captain: FormationType,
): void {
  state.formation = Formation.Line;
  state.selectedFormation = Formation.Line;
  state.captainFavorite = captain;
  state.planet = {
    id: 0,
    kind: BodyKind.Planet,
    pos: { x: viewport.width / 2, y: viewport.height - 68 },
    radius: 40,
    base: Side.Player,
    stock: 0,
    hue: 195,
    weight: 2.5,
  };
  state.planetHp = 100;
  state.ships = [];
  state.enemies = [];
  state.projectiles = [];
  state.wave = 0;
  state.nextShipId = 1;
  state.winner = null;
  for (const position of formationSlots(
    { x: viewport.width / 2, y: viewport.height - 145 },
    Formation.Line,
    PLAYER_SHIPS,
    34,
  )) {
    state.ships.push(createShip(Side.Player, position, state.nextShipId++));
  }
  spawnWave(state, viewport);
}

export function setInvadersFormation(
  state: InvadersState,
  formation: Formation,
): void {
  state.selectedFormation = formation;
  state.formation = formation;
}

export function updateInvaders(
  state: InvadersState,
  viewport: Viewport,
  elapsed: number,
): void {
  if (state.winner) return;
  const slots = formationSlots(
    { x: viewport.width / 2, y: viewport.height - 145 },
    state.formation,
    state.ships.length,
    32,
  );
  state.ships.forEach((ship, index) => moveTo(ship, slots[index], elapsed));

  state.waveOffset += state.waveDirection * elapsed * (28 + state.wave * 2);
  const limit = Math.max(70, viewport.width * 0.32);
  if (Math.abs(state.waveOffset) > limit) state.waveDirection *= -1;
  const enemySlots = formationSlots(
    { x: viewport.width / 2 + state.waveOffset, y: 110 + state.wave * 2 },
    Formation.Line,
    state.enemies.length,
    38,
  );
  state.enemies.forEach((ship, index) =>
    moveTo(ship, enemySlots[index], elapsed),
  );

  for (const ship of [...state.ships, ...state.enemies])
    ship.cooldown -= elapsed;
  firePlayerWeapons(state);
  fireEnemyWeapons(state);
  updateProjectiles(state, elapsed, viewport);
  state.ships = state.ships.filter((ship) => ship.hp > 0);
  state.enemies = state.enemies.filter((ship) => ship.hp > 0);
  if (state.planetHp <= 0 || state.ships.length === 0)
    state.winner = Side.Enemy;
  if (state.enemies.length === 0) spawnWave(state, viewport);
}

function spawnWave(state: InvadersState, viewport: Viewport): void {
  state.wave++;
  state.waveOffset = 0;
  state.waveDirection = 1;
  const count = 6 + state.wave * 2;
  const slots = formationSlots(
    { x: viewport.width / 2, y: 110 },
    Formation.Line,
    count,
    38,
  );
  state.enemies = slots.map((position) =>
    createShip(Side.Enemy, position, state.nextShipId++),
  );
}

function createShip(
  side: Side,
  pos: { x: number; y: number },
  id: number,
): Ship {
  return {
    id,
    side,
    role: ShipRole.Battleship,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    hp: 30,
    maxHp: 30,
    attack: 10,
    defense: 0,
    speed: 180,
    sight: 999,
    moral: 100,
    supplies: 999,
    range: 999,
    cooldown: 0.5,
  };
}

function moveTo(
  ship: Ship,
  target: { x: number; y: number },
  elapsed: number,
): void {
  const vector = { x: target.x - ship.pos.x, y: target.y - ship.pos.y };
  const length = Math.hypot(vector.x, vector.y);
  if (length < 1) return;
  const step = Math.min(length, ship.speed * elapsed);
  ship.vel = {
    x: (vector.x / length) * ship.speed,
    y: (vector.y / length) * ship.speed,
  };
  ship.pos.x += (vector.x / length) * step;
  ship.pos.y += (vector.y / length) * step;
}

function firePlayerWeapons(state: InvadersState): void {
  for (const ship of state.ships) {
    if (ship.cooldown > 0 || state.enemies.length === 0) continue;
    const target = state.enemies.reduce((closest, enemy) =>
      distance(enemy.pos, ship.pos) < distance(closest.pos, ship.pos)
        ? enemy
        : closest,
    );
    target.hp -=
      ship.attack * (state.formation === state.captainFavorite ? 1.25 : 1);
    ship.cooldown = 0.65;
    spawnProjectile(state, ship, target.pos);
  }
}

function fireEnemyWeapons(state: InvadersState): void {
  for (const ship of state.enemies) {
    if (ship.cooldown > 0) continue;
    state.planetHp = clamp(state.planetHp - 1.4, 0, 100);
    ship.cooldown = Math.max(0.45, 1.3 - state.wave * 0.04);
    spawnProjectile(state, ship, state.planet.pos);
  }
}

function spawnProjectile(
  state: InvadersState,
  ship: Ship,
  target: { x: number; y: number },
): void {
  const direction = normalize({
    x: target.x - ship.pos.x,
    y: target.y - ship.pos.y,
  });
  state.projectiles.push({
    pos: { ...ship.pos },
    vel: {
      x: direction.x * PROJECTILE_SPEED,
      y: direction.y * PROJECTILE_SPEED,
    },
    side: ship.side,
    sourceShipId: ship.id,
  });
}

function updateProjectiles(
  state: InvadersState,
  elapsed: number,
  viewport: Viewport,
): void {
  state.projectiles = state.projectiles.filter((projectile) => {
    projectile.pos.x += projectile.vel.x * elapsed;
    projectile.pos.y += projectile.vel.y * elapsed;
    const hitShip = [...state.ships, ...state.enemies].some(
      (ship) =>
        ship.id !== projectile.sourceShipId &&
        distance(ship.pos, projectile.pos) < 10,
    );
    const hitPlanet =
      distance(state.planet.pos, projectile.pos) < state.planet.radius;
    return (
      !hitShip &&
      !hitPlanet &&
      projectile.pos.x >= 0 &&
      projectile.pos.x <= viewport.width &&
      projectile.pos.y >= 0 &&
      projectile.pos.y <= viewport.height
    );
  });
}
