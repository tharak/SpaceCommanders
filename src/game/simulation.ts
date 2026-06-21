import {
  DEFAULT_CONFIG,
  ENEMY_FORMATION_SPACING,
  FORMATION_ARRIVAL_DISTANCE,
  FORMATIONS,
  PLANET_CAPTURE_RANGE,
  PLANET_CAPTURE_RATE,
  SUPPLY_TRANSFER_DISTANCE,
  SUPPLY_SHIP_CAPACITY,
} from "./constants";
import { hasLineOfSight, isTargetForward } from "./combat";
import { formationSlots } from "./formations";
import { spawnFleet, spawnShip } from "./ship-factory";
import { moveShipWithBoids } from "./ship-movement";
import { clamp, distance, normalize, randomBetween } from "./math";
import {
  Body,
  Config,
  GameState,
  Ship,
  ShipRole,
  Side,
  BodyKind,
  Formation,
  FireMode,
  Projectile,
  SupplyMission,
  Vec,
  Viewport,
} from "./types";

export function createGameState(): GameState {
  return {
    config: { ...DEFAULT_CONFIG },
    formation: Formation.Circle,
    selectedFormation: Formation.Circle,
    fireMode: FireMode.AtWill,
    command: null,
    destination: null,
    formationStage: null,
    previewCenter: null,
    previewRotation: 0,
    formationRotation: 0,
    cohesion: 0.7,
    previewCohesion: 0.7,
    pointer: null,
    bodies: [],
    ships: [],
    projectiles: [],
    captainFavorite: Formation.Line,
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
  state.formation = Formation.Circle;
  state.selectedFormation = Formation.Circle;
  state.command = null;
  state.destination = null;
  state.formationStage = null;
  state.previewCenter = null;
  state.previewRotation = 0;
  state.formationRotation = 0;
  state.previewCohesion = state.cohesion;
  state.projectiles = [];
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
  let bodyId = 0;

  state.bodies.push(
    {
      id: bodyId++,
      kind: BodyKind.Planet,
      pos: playerBase,
      radius: 37,
      base: Side.Player,
      stock: 0,
      hue: 195,
      weight: 2.5,
    },
    {
      id: bodyId++,
      kind: BodyKind.Planet,
      pos: enemyBase,
      radius: 37,
      base: Side.Enemy,
      stock: 0,
      hue: 350,
      weight: 2.5,
    },
  );

  for (let index = 2; index < config.planets; index++) {
    state.bodies.push({
      id: bodyId++,
      kind: BodyKind.Planet,
      pos: {
        x: randomBetween(120, viewport.width - 120),
        y: randomBetween(100, viewport.height - 100),
      },
      radius: randomBetween(20, 34),
      stock: 0,
      hue: randomBetween(25, 290),
      weight: randomBetween(0.8, 2),
    });
  }

  for (let index = 0; index < config.asteroids; index++) {
    state.bodies.push({
      id: bodyId++,
      kind: BodyKind.Asteroids,
      pos: {
        x: randomBetween(100, viewport.width - 100),
        y: randomBetween(80, viewport.height - 80),
      },
      radius: randomBetween(32, 58),
      hue: 0,
      weight: 0,
    });
  }

  let id = 0;
  for (const side of [Side.Player, Side.Enemy] as const) {
    const base = side === Side.Player ? playerBase : enemyBase;
    state.ships.push(
      ...spawnFleet(
        side,
        ShipRole.Battleship,
        base,
        Formation.Circle,
        config.ships,
        side === Side.Player
          ? clamp(80 - state.cohesion * 50, 25, 70)
          : ENEMY_FORMATION_SPACING,
        id,
      ),
    );
    id += config.ships;
    //state.ships.push(
    //  spawnShip(side, ShipRole.Captain, offsetPosition(base, 30), id++),
    //);
  }
}

export function issueFormationOrder(state: GameState, destination: Vec): void {
  state.formation = state.selectedFormation;
  state.formationRotation = state.previewRotation;
  state.cohesion = state.previewCohesion;
  state.command = { ...destination };
  state.destination = null;
  state.formationStage = null;
}

export function updateGame(
  state: GameState,
  viewport: Viewport,
  elapsed: number,
): void {
  if (state.winner) return;

  const deltaTime = elapsed * state.config.speed;
  replenishPlanets(state, deltaTime);
  updatePlanetCaptures(state, deltaTime);
  if (state.winner) return;
  spawnResupplyShips(state);
  assignFormationTargets(state);

  for (const ship of state.ships) {
    ship.cooldown -= deltaTime;
    if (ship.role === ShipRole.Supply) {
      updateSupplyMission(state, ship);
      if (ship.hp <= 0) continue;
    } else {
      collectPlanetSupplies(state, ship);
    }
    moveShip(state, ship, viewport, deltaTime);
    fireWeapons(state, ship);
  }

  state.ships = state.ships.filter((ship) => ship.hp > 0);
  updateProjectiles(state, deltaTime, viewport);
}

const PROJECTILE_SPEED = 360;

function spawnProjectile(
  state: GameState,
  from: Vec,
  to: Vec,
  side: Side,
  sourceShipId: number,
): void {
  const direction = normalize({ x: to.x - from.x, y: to.y - from.y });
  state.projectiles.push({
    pos: { ...from },
    vel: {
      x: direction.x * PROJECTILE_SPEED,
      y: direction.y * PROJECTILE_SPEED,
    },
    side,
    sourceShipId,
  });
}

function updateProjectiles(
  state: GameState,
  deltaTime: number,
  viewport: Viewport,
): void {
  state.projectiles = state.projectiles.filter((projectile) => {
    projectile.pos.x += projectile.vel.x * deltaTime;
    projectile.pos.y += projectile.vel.y * deltaTime;
    const hitShip = state.ships.some(
      (ship) =>
        ship.id !== projectile.sourceShipId &&
        distance(ship.pos, projectile.pos) < 10,
    );
    const hitBody = state.bodies.some(
      (body) => distance(body.pos, projectile.pos) < body.radius,
    );
    return (
      !hitShip &&
      !hitBody &&
      projectile.pos.x >= 0 &&
      projectile.pos.x <= viewport.width &&
      projectile.pos.y >= 0 &&
      projectile.pos.y <= viewport.height
    );
  });
}

function replenishPlanets(state: GameState, deltaTime: number): void {
  for (const body of state.bodies) {
    if (body.kind !== BodyKind.Planet) continue;
    const capacity = Math.floor(body.radius / 2);
    body.stock = Math.min(capacity, (body.stock ?? 0) + deltaTime * 0.55);
  }
}

function updatePlanetCaptures(state: GameState, deltaTime: number): void {
  for (const planet of state.bodies) {
    if (planet.kind !== BodyKind.Planet) continue;

    const playerShips = state.ships.filter(
      (ship) =>
        ship.side === Side.Player &&
        ship.role === ShipRole.Battleship &&
        distance(ship.pos, planet.pos) < planet.radius + PLANET_CAPTURE_RANGE,
    ).length;
    const enemyShips = state.ships.filter(
      (ship) =>
        ship.side === Side.Enemy &&
        ship.role === ShipRole.Battleship &&
        distance(ship.pos, planet.pos) < planet.radius + PLANET_CAPTURE_RANGE,
    ).length;
    if (playerShips === enemyShips) continue;

    const capturingSide = playerShips > enemyShips ? Side.Player : Side.Enemy;
    if (planet.base === capturingSide) {
      planet.capturingSide = undefined;
      planet.captureProgress = 0;
      continue;
    }

    const captureAmount =
      deltaTime * PLANET_CAPTURE_RATE * Math.abs(playerShips - enemyShips);
    if (
      planet.capturingSide &&
      planet.capturingSide !== capturingSide &&
      (planet.captureProgress ?? 0) > 0
    ) {
      planet.captureProgress = Math.max(
        0,
        (planet.captureProgress ?? 0) - captureAmount,
      );
      if (planet.captureProgress > 0) continue;
    }

    planet.capturingSide = capturingSide;
    planet.captureProgress = Math.min(
      1,
      (planet.captureProgress ?? 0) + captureAmount,
    );
    if (planet.captureProgress < 1) continue;

    planet.base = capturingSide;
    planet.capturingSide = undefined;
    planet.captureProgress = 0;
    planet.stock = Math.max(planet.stock ?? 0, SUPPLY_SHIP_CAPACITY);
  }

  const playerOwnsPlanet = state.bodies.some(
    (body) => body.kind === BodyKind.Planet && body.base === Side.Player,
  );
  const enemyOwnsPlanet = state.bodies.some(
    (body) => body.kind === BodyKind.Planet && body.base === Side.Enemy,
  );
  if (!playerOwnsPlanet) state.winner = Side.Enemy;
  if (!enemyOwnsPlanet) state.winner = Side.Player;
}

function spawnResupplyShips(state: GameState): void {
  let nextShipId = Math.max(-1, ...state.ships.map((ship) => ship.id)) + 1;

  for (const planet of state.bodies) {
    if (
      planet.kind !== BodyKind.Planet ||
      !planet.base ||
      (planet.stock ?? 0) < SUPPLY_SHIP_CAPACITY
    ) {
      continue;
    }
    const activeMission = state.ships.some(
      (ship) =>
        ship.role === ShipRole.Supply &&
        ship.homeBodyId === planet.id &&
        ship.hp > 0,
    );
    const target = findLeastSuppliedBattleship(state, planet.base);
    if (activeMission || !target || target.supplies >= 10) continue;

    planet.stock = (planet.stock ?? 0) - SUPPLY_SHIP_CAPACITY;
    state.ships.push(
      spawnSupplyShip(planet.base, planet, target, nextShipId++),
    );
  }
}

function spawnSupplyShip(
  side: Side,
  homePlanet: Body,
  target: Ship,
  id: number,
): Ship {
  return {
    ...spawnShip(side, ShipRole.Supply, homePlanet.pos, id),
    hp: 40,
    maxHp: 40,
    speed: 78,
    supplies: SUPPLY_SHIP_CAPACITY,
    range: 0,
    homeBodyId: homePlanet.id,
    resupplyTargetId: target.id,
    supplyMission: SupplyMission.Delivering,
    target: { ...target.pos },
  };
}

function updateSupplyMission(state: GameState, ship: Ship): void {
  const homePlanet = state.bodies.find((body) => body.id === ship.homeBodyId);
  if (!homePlanet) {
    ship.hp = 0;
    return;
  }

  if (ship.supplyMission === SupplyMission.Returning) {
    ship.target = { ...homePlanet.pos };
    if (distance(ship.pos, homePlanet.pos) <= homePlanet.radius + 12) {
      ship.hp = 0;
    }
    return;
  }

  const currentTarget = state.ships.find(
    (candidate) =>
      candidate.id === ship.resupplyTargetId &&
      candidate.role === ShipRole.Battleship &&
      candidate.side === ship.side &&
      candidate.hp > 0,
  );
  const target = currentTarget ?? findLeastSuppliedBattleship(state, ship.side);
  if (!target) {
    ship.supplyMission = SupplyMission.Returning;
    ship.target = { ...homePlanet.pos };
    return;
  }

  ship.resupplyTargetId = target.id;
  ship.target = { ...target.pos };
  if (distance(ship.pos, target.pos) > SUPPLY_TRANSFER_DISTANCE) return;

  const transferred = Math.min(ship.supplies, 10 - target.supplies);
  target.supplies += transferred;
  ship.supplies -= transferred;
  ship.supplyMission = SupplyMission.Returning;
  ship.target = { ...homePlanet.pos };
}

function findLeastSuppliedBattleship(
  state: GameState,
  side: Side,
): Ship | undefined {
  return state.ships
    .filter(
      (ship) =>
        ship.side === side && ship.role === ShipRole.Battleship && ship.hp > 0,
    )
    .reduce<
      Ship | undefined
    >((lowest, ship) => (!lowest || ship.supplies < lowest.supplies ? ship : lowest), undefined);
}

function assignFormationTargets(state: GameState): void {
  const playerBase = state.bodies.find((body) => body.base === Side.Player);

  for (const side of [Side.Player, Side.Enemy] as const) {
    const homeBase = state.bodies.find((body) => body.base === side);
    if (!homeBase) continue;

    const fleet = state.ships.filter((ship) => ship.side === side);
    const enemyAdvancing =
      side === Side.Enemy && state.command !== null && playerBase;
    const center =
      side === Side.Player
        ? (state.command ?? homeBase.pos)
        : enemyAdvancing
          ? playerBase.pos
          : homeBase.pos;
    const formation =
      side === Side.Player
        ? state.formation
        : enemyAdvancing
          ? Formation.Arrow
          : Formation.Circle;
    const battleships = fleet.filter(
      (ship) => ship.role === ShipRole.Battleship,
    );
    const spacing =
      side === Side.Player
        ? clamp(80 - state.cohesion * 50, 25, 70)
        : ENEMY_FORMATION_SPACING;
    const targets = formationSlots(
      center,
      formation,
      battleships.length,
      spacing,
      side === Side.Player ? state.formationRotation : 0,
    );

    battleships.forEach((ship, index) => {
      ship.target = targets[index];
    });
    fleet
      .filter((ship) => ship.role === ShipRole.Captain)
      .forEach((ship, index) => {
        ship.target = { x: center.x + (index ? 20 : -20), y: center.y + 60 };
      });
  }
}

function collectPlanetSupplies(state: GameState, ship: Ship): void {
  if (ship.supplyMission == null) {
    return;
  }
  for (const planet of state.bodies) {
    if (
      planet.kind !== BodyKind.Planet ||
      distance(ship.pos, planet.pos) >= planet.radius + 45
    )
      continue;
    if (planet.base !== ship.side) continue;

    const amount = Math.min(planet.stock ?? 0, 10 - ship.supplies);
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
  moveShipWithBoids(
    ship,
    state.ships,
    state.bodies,
    viewport,
    deltaTime,
    FORMATION_ARRIVAL_DISTANCE,
  );
}

function attackDamage(state: GameState, ship: Ship, defense = 0): number {
  const bonus =
    ship.side === Side.Player && state.formation === state.captainFavorite
      ? 1.25
      : 1;
  return Math.max(1, ship.attack * bonus - defense);
}

function fireWeapons(state: GameState, ship: Ship): void {
  const targets = state.ships.filter(
    (candidate) =>
      candidate.side !== ship.side &&
      isTargetForward(ship, candidate.pos) &&
      distance(candidate.pos, ship.pos) < ship.range &&
      hasLineOfSight(ship, candidate.pos, state.ships, state.bodies, candidate),
  );
  const canFire =
    ship.role === ShipRole.Battleship &&
    ship.supplies >= 1 &&
    ship.cooldown <= 0 &&
    targets.length > 0 &&
    (ship.side === Side.Enemy || state.fireMode !== FireMode.Hold);
  if (!canFire) return;

  let target = targets[0];
  if (
    ship.side === Side.Player &&
    state.fireMode === FireMode.Focus &&
    state.pointer
  ) {
    target = targets.reduce((closest, candidate) =>
      distance(candidate.pos, state.pointer!) <
      distance(closest.pos, state.pointer!)
        ? candidate
        : closest,
    );
  }

  target.hp -= attackDamage(state, ship, target.defense);
  target.moral = clamp(target.moral - 5, 0, 100);
  ship.supplies--;
  ship.cooldown = 0.75;
  spawnProjectile(state, ship.pos, target.pos, ship.side, ship.id);
}
