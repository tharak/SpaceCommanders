import { hasLineOfSight } from "../game/combat";
import { FORMATIONS } from "../game/constants";
import { formationSlots } from "../game/formations";
import { clamp, distance, normalize } from "../game/math";
import { spawnFleet } from "../game/ship-factory";
import { moveShipWithBoids } from "../game/ship-movement";
import { BodyKind, Formation, ShipRole, Side } from "../game/types";
import type { Formation as FormationType, Ship, Viewport } from "../game/types";
import type { InvadersState } from "./types";

const FLEET_SIZE = 10;
const PROJECTILE_SPEED = 330;
const ENEMY_FLEET_Y = 105;
const PLANET_BOTTOM_OFFSET = 130;
const PLAYER_FLEET_BOTTOM_OFFSET = 220;

export function createInvadersState(): InvadersState {
  return {
    formation: Formation.Line,
    selectedFormation: Formation.Line,
    enemyFormation: Formation.Line,
    enemyDestination: { x: 0, y: 0 },
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
    wave: 1,
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
    pos: {
      x: viewport.width / 2,
      y: viewport.height - PLANET_BOTTOM_OFFSET,
    },
    radius: 40,
    base: Side.Player,
    stock: 0,
    hue: 195,
    weight: 2.5,
  };
  state.planetHp = 100;
  state.projectiles = [];
  state.wave = 0;
  state.waveOffset = 0;
  state.nextShipId = 1;
  state.winner = null;
  state.ships = createFleet(
    Side.Player,
    playerFleetCenter(viewport),
    state.formation,
    ShipRole.Battleship,
    state,
  );
  spawnEnemyWave(state, viewport);
}

export function selectInvadersFormation(
  state: InvadersState,
  formation: Formation,
): void {
  state.selectedFormation = formation;
}

export function applyInvadersFormation(state: InvadersState): void {
  state.formation = state.selectedFormation;
}

export function updateInvaders(
  state: InvadersState,
  viewport: Viewport,
  elapsed: number,
): void {
  const enemySlots = formationSlots(
    state.enemyDestination,
    state.enemyFormation,
    state.enemies.length,
    34,
  );
  state.enemies.forEach((ship, index) => {
    moveFleetShip(state.enemies, ship, enemySlots[index], viewport, elapsed);
  });

  const slots = formationSlots(
    playerFleetCenter(viewport),
    state.formation,
    state.ships.length,
    32,
  );
  state.ships.forEach((ship, index) => {
    moveFleetShip(state.ships, ship, slots[index], viewport, elapsed);
    ship.cooldown -= elapsed;
  });
  state.enemies.forEach((ship) => {
    ship.cooldown -= elapsed;
  });
  fireWeapons(state);
  updateProjectiles(state, elapsed, viewport);
  state.ships = state.ships.filter((ship) => ship.hp > 0);
  state.enemies = state.enemies.filter((ship) => ship.hp > 0);
  if (state.enemies.length === 0) spawnEnemyWave(state, viewport);
}

function playerFleetCenter(viewport: Viewport): { x: number; y: number } {
  return {
    x: viewport.width / 2,
    y: viewport.height - PLAYER_FLEET_BOTTOM_OFFSET,
  };
}

function createFleet(
  side: Side,
  center: { x: number; y: number },
  formation: Formation,
  role: ShipRole,
  state: InvadersState,
): Ship[] {
  const fleet = spawnFleet(
    side,
    role,
    center,
    formation,
    FLEET_SIZE,
    34,
    state.nextShipId,
  );
  state.nextShipId += fleet.length;
  if (role === ShipRole.Guard) {
    fleet.forEach((ship) => {
      ship.hp *= 2;
      ship.maxHp *= 2;
    });
  }
  return fleet;
}

function fireWeapons(state: InvadersState): void {
  for (const ship of state.ships) {
    if (
      ship.role !== ShipRole.Battleship ||
      ship.cooldown > 0 ||
      state.enemies.length === 0
    )
      continue;
    const targets = state.enemies.filter(
      (enemy) =>
        distance(enemy.pos, ship.pos) < ship.range &&
        hasLineOfSight(
          ship,
          enemy.pos,
          [...state.ships, ...state.enemies],
          [state.planet],
          enemy,
        ),
    );
    if (targets.length === 0) continue;
    const target = targets.reduce((closest, enemy) =>
      distance(enemy.pos, ship.pos) < distance(closest.pos, ship.pos)
        ? enemy
        : closest,
    );
    target.hp -=
      ship.attack * (state.formation === state.captainFavorite ? 1.25 : 1);
    ship.cooldown = 0.7;
    spawnProjectile(state, ship, target.pos);
  }

  for (const ship of state.enemies) {
    if (ship.role !== ShipRole.Battleship || ship.cooldown > 0) continue;
    const targets = state.ships.filter(
      (defender) =>
        distance(defender.pos, ship.pos) < ship.range &&
        hasLineOfSight(
          ship,
          defender.pos,
          [...state.ships, ...state.enemies],
          [state.planet],
          defender,
        ),
    );
    const target = targets.reduce<Ship | undefined>(
      (closest, defender) =>
        !closest ||
        distance(defender.pos, ship.pos) < distance(closest.pos, ship.pos)
          ? defender
          : closest,
      undefined,
    );
    const canAttackPlanet =
      distance(state.planet.pos, ship.pos) < ship.range &&
      hasLineOfSight(
        ship,
        state.planet.pos,
        [...state.ships, ...state.enemies],
        [state.planet],
        undefined,
        state.planet,
      );
    if (!target && !canAttackPlanet) continue;
    if (target) target.hp -= ship.attack;
    else state.planetHp = clamp(state.planetHp - ship.attack, 0, 100);
    ship.cooldown = 1.15;
    spawnProjectile(state, ship, target?.pos ?? state.planet.pos);
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

function moveFleetShip(
  fleet: Ship[],
  ship: Ship,
  target: { x: number; y: number },
  viewport: Viewport,
  elapsed: number,
): void {
  ship.target = target;
  moveShipWithBoids(ship, fleet, [], viewport, elapsed);
}

function spawnEnemyWave(state: InvadersState, viewport: Viewport): void {
  state.wave++;
  state.waveOffset = 0;
  state.enemyDestination = {
    x: viewport.width / 2,
    y: viewport.height + 80,
  };
  state.enemyFormation =
    FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
  state.enemies = createFleet(
    Side.Enemy,
    { x: viewport.width / 2, y: ENEMY_FLEET_Y },
    state.enemyFormation,
    ShipRole.Guard,
    state,
  );
}
