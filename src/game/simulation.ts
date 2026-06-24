import { FORMATIONS } from "./constants";
import { applyGunSteering } from "./combat";
import { DEFAULT_GAME_CONFIG, GAME_CONFIG } from "./config";
import { assignNearestFormationSlots } from "./formation-assignment";
import { formationSlotHeadings, formationSlots } from "./formations";
import { spawnFleet, spawnShip } from "./ship-factory";
import { moveShipWithBoids } from "./ship-movement";
import { clamp, distance, randomBetween } from "./math";
import {
  Body,
  Battleship,
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
    config: { ...DEFAULT_GAME_CONFIG },
    formation: GAME_CONFIG.match.initialFormation,
    selectedFormation: GAME_CONFIG.match.initialFormation,
    fireMode: FireMode.AtWill,
    command: null,
    destination: null,
    formationStage: null,
    previewCenter: null,
    previewRotation: 0,
    formationRotation: 0,
    cohesion: GAME_CONFIG.match.initialCohesion,
    previewCohesion: GAME_CONFIG.match.initialCohesion,
    pointer: null,
    bodies: [],
    ships: [],
    projectiles: [],
    captainFavorite: GAME_CONFIG.match.captainFavorite,
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
  state.formationMode = undefined;
  state.formation = GAME_CONFIG.match.initialFormation;
  state.selectedFormation = GAME_CONFIG.match.initialFormation;
  state.command = null;
  state.destination = null;
  state.formationStage = null;
  state.previewCenter = null;
  state.previewRotation = 0;
  state.formationRotation = 0;
  state.previewCohesion = state.cohesion;
  state.projectiles = [];
  state.ships = [];
  if (config.debugFormationMap) {
    createFormationDebugMap(state, viewport);
    return;
  }
  const { bodies, playerBase, enemyBase } = createMatchMap(config, viewport);
  state.bodies = bodies;

  let id = 0;
  for (const side of [Side.Player, Side.Enemy] as const) {
    const base = side === Side.Player ? playerBase : enemyBase;
    state.ships.push(
      ...spawnFleet(
        side,
        ShipRole.Battleship,
        base,
        GAME_CONFIG.match.initialFormation,
        config.ships,
        side === Side.Player
          ? playerFormationSpacing(state.cohesion)
          : GAME_CONFIG.formation.enemySpacing,
        id,
      ),
    );
    id += config.ships;
    //state.ships.push(
    //  spawnShip(side, ShipRole.Captain, offsetPosition(base, 30), id++),
    //);
  }
}

function createFormationDebugMap(state: GameState, viewport: Viewport): void {
  state.bodies = [
    createBasePlanet(0, { x: 48, y: viewport.height / 2 }, Side.Player),
    createBasePlanet(
      1,
      { x: viewport.width - 48, y: viewport.height / 2 },
      Side.Enemy,
    ),
  ];

  const centers = [
    { x: viewport.width * 0.2, y: viewport.height * 0.28 },
    { x: viewport.width * 0.5, y: viewport.height * 0.28 },
    { x: viewport.width * 0.8, y: viewport.height * 0.28 },
    { x: viewport.width * 0.33, y: viewport.height * 0.72 },
    { x: viewport.width * 0.67, y: viewport.height * 0.72 },
  ];
  const { formationMapShipsPerFormation: count, formationMapSpacing: spacing } =
    GAME_CONFIG.debug;

  let firstId = 0;
  for (const [index, formation] of FORMATIONS.entries()) {
    const ships = spawnFleet(
      Side.Player,
      ShipRole.Battleship,
      centers[index],
      formation,
      count,
      spacing,
      firstId,
    );
    const headings = formationSlotHeadings(formation, count);
    ships.forEach((ship, shipIndex) => {
      ship.heading = headings[shipIndex];
    });
    state.ships.push(...ships);
    firstId += ships.length;
  }
}

export function resetFormations(
  state: GameState,
  viewport: Viewport,
  playerFormation: Formation,
): void {
  resetGame(
    state,
    { ...DEFAULT_GAME_CONFIG, ships: 10, planets: 2, asteroids: 0 },
    viewport,
  );
  state.bodies = [];
  state.formation = playerFormation;
  state.selectedFormation = playerFormation;
  const formationMode = createFormationModeFleets(viewport, playerFormation);
  state.ships = formationMode.ships;
  state.formationMode = {
    enemyFormation: formationMode.enemyFormation,
    charging: false,
    formationSelectionEnabled: true,
    playerAtTop: false,
  };
}

export function setFormationModePlayerFormation(
  state: GameState,
  viewport: Viewport,
  playerFormation: Formation,
): void {
  const mode = state.formationMode;
  if (!mode || !mode.formationSelectionEnabled) return;
  if (mode.charging) mode.playerAtTop = !mode.playerAtTop;

  state.formation = playerFormation;
  state.selectedFormation = playerFormation;
  const enemyShips = state.ships.filter((ship) => ship.side === Side.Enemy);
  const playerCenter = {
    x: viewport.width / 2,
    y: viewport.height * (mode.playerAtTop ? 0.2 : 0.8),
  };
  const playerShips = spawnFleet(
    Side.Player,
    ShipRole.Battleship,
    playerCenter,
    playerFormation,
    10,
    GAME_CONFIG.formation.enemySpacing,
    0,
  );
  state.ships = [...playerShips, ...enemyShips];
  mode.charging = true;
  mode.formationSelectionEnabled = false;
}

export function updateFormations(
  state: GameState,
  viewport: Viewport,
  deltaTime: number,
): void {
  const mode = state.formationMode;
  if (!mode) return;

  if (mode.charging) {
    advanceFormationFleet(
      state,
      viewport,
      Side.Player,
      state.formation,
      {
        x: viewport.width / 2,
        y: viewport.height * (mode.playerAtTop ? 0.8 : 0.2),
      },
      mode.playerAtTop ? Math.PI : 0,
      deltaTime,
    );
    advanceFormationFleet(
      state,
      viewport,
      Side.Enemy,
      mode.enemyFormation,
      {
        x: viewport.width / 2,
        y: viewport.height * (mode.playerAtTop ? 0.2 : 0.8),
      },
      mode.playerAtTop ? 0 : Math.PI,
      deltaTime,
    );

    const playerShips = state.ships.filter(
      (ship) => ship.side === Side.Player && ship.hp > 0,
    );
    const enemyShips = state.ships.filter(
      (ship) => ship.side === Side.Enemy && ship.hp > 0,
    );
    const allAliveShipsPassedMidpoint =
      playerShips.length > 0 &&
      enemyShips.length > 0 &&
      (mode.playerAtTop
        ? playerShips.every((ship) => ship.pos.y >= viewport.height / 2) &&
          enemyShips.every((ship) => ship.pos.y <= viewport.height / 2)
        : playerShips.every((ship) => ship.pos.y <= viewport.height / 2) &&
          enemyShips.every((ship) => ship.pos.y >= viewport.height / 2));
    if (allAliveShipsPassedMidpoint) {
      mode.formationSelectionEnabled = true;
    }
  }

  const playerShips = state.ships.filter((ship) => ship.side === Side.Player);
  const enemyShips = state.ships.filter((ship) => ship.side === Side.Enemy);
  applyGunSteering(playerShips, enemyShips, state.fireMode);
  applyGunSteering(enemyShips, playerShips, FireMode.AtWill);
  for (const ship of state.ships) {
    if (!(ship instanceof Battleship)) continue;
    ship.gun.update(deltaTime);
    ship.gun.fire(state, ship);
  }
  state.ships = state.ships.filter((ship) => ship.hp > 0);
  if (!state.ships.some((ship) => ship.side === Side.Player)) {
    state.winner = Side.Enemy;
  } else if (!state.ships.some((ship) => ship.side === Side.Enemy)) {
    state.winner = Side.Player;
  }
  updateProjectiles(state, deltaTime, viewport);
}

function advanceFormationFleet(
  state: GameState,
  viewport: Viewport,
  side: Side,
  formation: Formation,
  center: Vec,
  rotation: number,
  deltaTime: number,
): void {
  const fleet = state.ships.filter((ship) => ship.side === side);
  const slots = formationSlots(
    center,
    formation,
    fleet.length,
    GAME_CONFIG.formation.enemySpacing,
    rotation,
  );
  const headings = formationSlotHeadings(formation, fleet.length, rotation);
  for (const [ship, assignment] of assignNearestFormationSlots(fleet, slots)) {
    ship.target = assignment.position;
    ship.targetHeading = headings[assignment.slotIndex];
  }
  for (const ship of fleet) moveShip(state, ship, viewport, deltaTime);
}

function createFormationModeFleets(
  viewport: Viewport,
  playerFormation: Formation,
): { ships: Ship[]; enemyFormation: Formation } {
  const enemyFormation =
    FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
  const playerShips = spawnFleet(
    Side.Player,
    ShipRole.Battleship,
    { x: viewport.width / 2, y: viewport.height * 0.8 },
    playerFormation,
    10,
    GAME_CONFIG.formation.enemySpacing,
    0,
  );
  const enemyShips = spawnFleet(
    Side.Enemy,
    ShipRole.Battleship,
    { x: viewport.width / 2, y: viewport.height * 0.2 },
    enemyFormation,
    10,
    GAME_CONFIG.formation.enemySpacing,
    playerShips.length,
  );
  return { ships: [...playerShips, ...enemyShips], enemyFormation };
}

type MatchMap = {
  bodies: Body[];
  playerBase: Vec;
  enemyBase: Vec;
};

function createMatchMap(config: Config, viewport: Viewport): MatchMap {
  const { baseMargin } = GAME_CONFIG.map;
  const playerBase = {
    x: randomBetween(
      baseMargin,
      viewport.width * GAME_CONFIG.map.playerBaseMaxXRatio,
    ),
    y: randomBetween(baseMargin, viewport.height - baseMargin),
  };
  const enemyBase = {
    x: randomBetween(
      viewport.width * GAME_CONFIG.map.enemyBaseMinXRatio,
      viewport.width - baseMargin,
    ),
    y: randomBetween(baseMargin, viewport.height - baseMargin),
  };
  const bodies: Body[] = [
    createBasePlanet(0, playerBase, Side.Player),
    createBasePlanet(1, enemyBase, Side.Enemy),
  ];

  for (let id = 2; id < config.planets; id++) {
    bodies.push(createNeutralPlanet(id, viewport));
  }
  for (let index = 0; index < config.asteroids; index++) {
    bodies.push(createAsteroidField(bodies.length, viewport));
  }
  return { bodies, playerBase, enemyBase };
}

function createBasePlanet(id: number, position: Vec, side: Side): Body {
  return {
    id,
    kind: BodyKind.Planet,
    pos: position,
    radius: GAME_CONFIG.map.basePlanet.radius,
    base: side,
    stock: 0,
    hue:
      side === Side.Player
        ? GAME_CONFIG.map.basePlanet.hue.player
        : GAME_CONFIG.map.basePlanet.hue.enemy,
    weight: GAME_CONFIG.map.basePlanet.weight,
  };
}

function createNeutralPlanet(id: number, viewport: Viewport): Body {
  return {
    id,
    kind: BodyKind.Planet,
    pos: {
      x: randomBetween(
        GAME_CONFIG.map.neutralPlanet.horizontalMargin,
        viewport.width - GAME_CONFIG.map.neutralPlanet.horizontalMargin,
      ),
      y: randomBetween(
        GAME_CONFIG.map.neutralPlanet.verticalMargin,
        viewport.height - GAME_CONFIG.map.neutralPlanet.verticalMargin,
      ),
    },
    radius: randomBetween(
      GAME_CONFIG.map.neutralPlanet.minRadius,
      GAME_CONFIG.map.neutralPlanet.maxRadius,
    ),
    stock: 0,
    hue: randomBetween(
      GAME_CONFIG.map.neutralPlanet.minHue,
      GAME_CONFIG.map.neutralPlanet.maxHue,
    ),
    weight: randomBetween(
      GAME_CONFIG.map.neutralPlanet.minWeight,
      GAME_CONFIG.map.neutralPlanet.maxWeight,
    ),
  };
}

function createAsteroidField(id: number, viewport: Viewport): Body {
  return {
    id,
    kind: BodyKind.Asteroids,
    pos: {
      x: randomBetween(
        GAME_CONFIG.map.asteroidField.horizontalMargin,
        viewport.width - GAME_CONFIG.map.asteroidField.horizontalMargin,
      ),
      y: randomBetween(
        GAME_CONFIG.map.asteroidField.verticalMargin,
        viewport.height - GAME_CONFIG.map.asteroidField.verticalMargin,
      ),
    },
    radius: randomBetween(
      GAME_CONFIG.map.asteroidField.minRadius,
      GAME_CONFIG.map.asteroidField.maxRadius,
    ),
    hue: 0,
    weight: 0,
  };
}

function playerFormationSpacing(cohesion: number): number {
  return clamp(
    GAME_CONFIG.formation.playerSpacingBase -
      cohesion * GAME_CONFIG.formation.playerCohesionSpacingMultiplier,
    GAME_CONFIG.formation.playerMinSpacing,
    GAME_CONFIG.formation.playerMaxSpacing,
  );
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
  if (state.config.debugFormationMap) return;

  const deltaTime = elapsed * state.config.speed;
  replenishPlanets(state, deltaTime);
  updatePlanetCaptures(state, deltaTime);
  if (state.winner) return;
  spawnResupplyShips(state);
  assignFormationTargets(state);
  applyFireModeSteering(state);

  for (const ship of state.ships) {
    if (ship instanceof Battleship) ship.gun.update(deltaTime);
    if (ship.role === ShipRole.Supply) {
      updateSupplyMission(state, ship);
      if (ship.hp <= 0) continue;
    } else {
      collectPlanetSupplies(state, ship);
    }
    moveShip(state, ship, viewport, deltaTime);
    if (ship instanceof Battleship) ship.gun.fire(state, ship);
  }

  state.ships = state.ships.filter((ship) => ship.hp > 0);
  updateProjectiles(state, deltaTime, viewport);
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
        distance(ship.pos, projectile.pos) < GAME_CONFIG.projectile.hitRadius,
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
    const capacity = Math.floor(
      body.radius / GAME_CONFIG.planet.stockCapacityRadiusDivisor,
    );
    body.stock = Math.min(
      capacity,
      (body.stock ?? 0) + deltaTime * GAME_CONFIG.planet.supplyGenerationRate,
    );
  }
}

function updatePlanetCaptures(state: GameState, deltaTime: number): void {
  for (const planet of state.bodies) {
    if (planet.kind !== BodyKind.Planet) continue;

    const playerShips = state.ships.filter(
      (ship) =>
        ship.side === Side.Player &&
        ship.role === ShipRole.Battleship &&
        distance(ship.pos, planet.pos) <
          planet.radius + GAME_CONFIG.planet.captureRange,
    ).length;
    const enemyShips = state.ships.filter(
      (ship) =>
        ship.side === Side.Enemy &&
        ship.role === ShipRole.Battleship &&
        distance(ship.pos, planet.pos) <
          planet.radius + GAME_CONFIG.planet.captureRange,
    ).length;
    if (playerShips === enemyShips) continue;

    const capturingSide = playerShips > enemyShips ? Side.Player : Side.Enemy;
    if (planet.base === capturingSide) {
      planet.capturingSide = undefined;
      planet.captureProgress = 0;
      continue;
    }

    const captureAmount =
      deltaTime *
      GAME_CONFIG.planet.captureRate *
      Math.abs(playerShips - enemyShips);
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
    planet.stock = Math.max(planet.stock ?? 0, GAME_CONFIG.supply.shipCapacity);
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
      (planet.stock ?? 0) < GAME_CONFIG.supply.shipCapacity
    ) {
      continue;
    }
    const activeMission = state.ships.some(
      (ship) =>
        ship.role === ShipRole.Supply &&
        ship.homeBodyId === planet.id &&
        ship.hp > 0,
    );
    const target = findClosestLeastSuppliedBattleship(
      state,
      planet.base,
      planet.pos,
    );
    if (
      activeMission ||
      !target ||
      target.supplies >= GAME_CONFIG.supply.targetSupplyCapacity
    )
      continue;

    planet.stock = (planet.stock ?? 0) - GAME_CONFIG.supply.shipCapacity;
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
  const ship = spawnShip(side, ShipRole.Supply, homePlanet.pos, id);
  ship.hp = GAME_CONFIG.supply.shipHp;
  ship.maxHp = GAME_CONFIG.supply.shipHp;
  ship.speed = GAME_CONFIG.supply.shipSpeed;
  ship.supplies = GAME_CONFIG.supply.shipCapacity;
  ship.homeBodyId = homePlanet.id;
  ship.resupplyTargetId = target.id;
  ship.supplyMission = SupplyMission.Delivering;
  ship.target = { ...target.pos };
  return ship;
}

function updateSupplyMission(state: GameState, ship: Ship): void {
  const homePlanet = state.bodies.find((body) => body.id === ship.homeBodyId);
  if (!homePlanet) {
    ship.hp = 0;
    return;
  }

  if (ship.supplyMission === SupplyMission.Returning) {
    ship.target = { ...homePlanet.pos };
    if (
      distance(ship.pos, homePlanet.pos) <=
      homePlanet.radius + GAME_CONFIG.supply.returnDistance
    ) {
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
  const target =
    currentTarget ??
    findClosestLeastSuppliedBattleship(state, ship.side, ship.pos);
  if (!target) {
    ship.supplyMission = SupplyMission.Returning;
    ship.target = { ...homePlanet.pos };
    return;
  }

  ship.resupplyTargetId = target.id;
  ship.target = { ...target.pos };
  if (distance(ship.pos, target.pos) > GAME_CONFIG.supply.transferDistance)
    return;

  const transferred = Math.min(
    ship.supplies,
    GAME_CONFIG.supply.targetSupplyCapacity - target.supplies,
  );
  target.supplies += transferred;
  ship.supplies -= transferred;
  ship.supplyMission = SupplyMission.Returning;
  ship.target = { ...homePlanet.pos };
}

function findClosestLeastSuppliedBattleship(
  state: GameState,
  side: Side,
  origin: Vec,
): Ship | undefined {
  return state.ships
    .filter(
      (ship) =>
        ship.side === side && ship.role === ShipRole.Battleship && ship.hp > 0,
    )
    .reduce<Ship | undefined>((best, ship) => {
      if (!best || ship.supplies < best.supplies) return ship;
      if (ship.supplies > best.supplies) return best;
      return distance(ship.pos, origin) < distance(best.pos, origin)
        ? ship
        : best;
    }, undefined);
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
        ? playerFormationSpacing(state.cohesion)
        : GAME_CONFIG.formation.enemySpacing;
    const rotation = side === Side.Player ? state.formationRotation : 0;
    const targets = formationSlots(
      center,
      formation,
      state.config.ships,
      spacing,
      rotation,
    );
    const headings = formationSlotHeadings(
      formation,
      state.config.ships,
      rotation,
    );

    for (const [ship, assignment] of assignNearestFormationSlots(
      battleships,
      targets,
    )) {
      ship.target = assignment.position;
      ship.targetHeading = headings[assignment.slotIndex];
    }
    fleet
      .filter((ship) => ship.role === ShipRole.Captain)
      .forEach((ship, index) => {
        ship.target = {
          x:
            center.x +
            (index
              ? GAME_CONFIG.formation.captainOffsetX
              : -GAME_CONFIG.formation.captainOffsetX),
          y: center.y + GAME_CONFIG.formation.captainOffsetY,
        };
      });
  }
}

function applyFireModeSteering(state: GameState): void {
  applyGunSteering(
    state.ships.filter(
      (ship) => ship.side === Side.Player && ship.role === ShipRole.Battleship,
    ),
    state.ships.filter((ship) => ship.side === Side.Enemy),
    state.fireMode,
  );
  applyGunSteering(
    state.ships.filter((ship) => ship.side === Side.Enemy),
    state.ships.filter((ship) => ship.side === Side.Player),
    FireMode.AtWill,
  );
}

function collectPlanetSupplies(state: GameState, ship: Ship): void {
  if (ship.supplyMission == null) {
    return;
  }
  for (const planet of state.bodies) {
    if (
      planet.kind !== BodyKind.Planet ||
      distance(ship.pos, planet.pos) >=
        planet.radius + GAME_CONFIG.supply.collectionRange
    )
      continue;
    if (planet.base !== ship.side) continue;

    const amount = Math.min(
      planet.stock ?? 0,
      GAME_CONFIG.supply.targetSupplyCapacity - ship.supplies,
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
  moveShipWithBoids(
    ship,
    state.ships,
    state.bodies,
    viewport,
    deltaTime,
    GAME_CONFIG.formation.arrivalDistance,
    ship.side === Side.Player
      ? {
          x: Math.cos(state.formationRotation),
          y: Math.sin(state.formationRotation),
        }
      : undefined,
  );
}
