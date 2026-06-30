import { FORMATIONS, PLAYER_FLEET_COLORS, PLAYER_FLEET_IDS, PLAYER_FLEET_NAMES } from "./constants";
import { applyGunSteering } from "./combat";
import { DEFAULT_GAME_CONFIG, GAME_CONFIG } from "./config";
import { assignNearestFormationSlots } from "./formation-assignment";
import { formationSlotHeadings, formationSlots } from "./formations";
import { spawnFleet, spawnShip } from "./ship-factory";
import { moveShipWithBoids } from "./ship-movement";
import { distance, randomBetween } from "./math";
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

export const PLAYER_MAIN_FLEET_ID = PLAYER_FLEET_IDS[0];
export const ENEMY_MAIN_FLEET_ID = "enemy-main";

export function createGameState(): GameState {
  return {
    config: { ...DEFAULT_GAME_CONFIG },
    formation: GAME_CONFIG.match.initialFormation,
    selectedFormation: GAME_CONFIG.match.initialFormation,
    fireMode: FireMode.AtWill,
    selectedFleetId: PLAYER_MAIN_FLEET_ID,
    fleets: createDefaultFleetCommands(),
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

function createDefaultFleetCommands(): GameState["fleets"] {
  const fleets: GameState["fleets"] = {};
  for (const id of PLAYER_FLEET_IDS) {
    fleets[id] = createFleetCommand(
      id,
      Side.Player,
      PLAYER_FLEET_NAMES[id],
      PLAYER_FLEET_COLORS[id],
    );
  }
  fleets[ENEMY_MAIN_FLEET_ID] = createFleetCommand(
    ENEMY_MAIN_FLEET_ID,
    Side.Enemy,
    "Enemy",
    "#ff6d91",
  );
  return fleets;
}

function createFleetCommand(
  id: string,
  side: Side,
  name: string,
  color: string,
): GameState["fleets"][string] {
  return {
    id,
    side,
    name,
    color,
    formation: GAME_CONFIG.match.initialFormation,
    selectedFormation: GAME_CONFIG.match.initialFormation,
    command: null,
    destination: null,
    formationRotation: 0,
    cohesion: GAME_CONFIG.match.initialCohesion,
    speedMode: "normal",
    combatStage: "forming",
  };
}

export function playerFleetCommands(state: GameState): GameState["fleets"][string][] {
  return Object.values(state.fleets).filter((fleet) => fleet.side === Side.Player);
}

export function selectedFleetCommand(state: GameState): GameState["fleets"][string] | undefined {
  return state.fleets[state.selectedFleetId];
}

export function selectPlayerFleet(state: GameState, fleetId: string): void {
  const fleet = state.fleets[fleetId];
  if (!fleet || fleet.side !== Side.Player) return;
  state.selectedFleetId = fleetId;
  state.formation = fleet.formation;
  state.selectedFormation = fleet.selectedFormation;
  state.command = fleet.command;
  state.destination = fleet.destination;
  state.formationRotation = fleet.formationRotation;
  state.cohesion = fleet.cohesion;
  state.previewCohesion = fleet.cohesion;
}

export function setSelectedFleetFormation(state: GameState, formation: Formation): void {
  const fleet = selectedFleetCommand(state);
  if (!fleet) return;
  fleet.selectedFormation = formation;
  state.selectedFormation = formation;
}


export function setFleetSpeedMode(
  state: GameState,
  fleetId: string,
  speedMode: GameState["fleets"][string]["speedMode"],
): void {
  const fleet = state.fleets[fleetId];
  if (!fleet) return;
  fleet.speedMode = speedMode;
}

export function resetGame(
  state: GameState,
  config: Config,
  viewport: Viewport,
): void {
  state.config = config;
  state.winner = null;
  state.formationMode = undefined;
  state.fleets = createDefaultFleetCommands();
  state.selectedFleetId = PLAYER_MAIN_FLEET_ID;
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
  for (const [fleetIndex, fleetId] of PLAYER_FLEET_IDS.entries()) {
    const center = playerFleetStartCenter(playerBase, fleetIndex);
    const ships = spawnFleet(
      Side.Player,
      ShipRole.Battleship,
      center,
      Formation.Line,
      config.ships,
      GAME_CONFIG.formation.spacing,
      id,
      fleetId,
    );
    for (const ship of ships) {
      ship.heading = { x: 0, y: -1 };
      ship.target = { ...ship.pos };
      ship.targetHeading = { ...ship.heading };
    }
    state.ships.push(...ships);
    id += config.ships;
  }
  state.ships.push(
    ...spawnFleet(
      Side.Enemy,
      ShipRole.Battleship,
      enemyBase,
      GAME_CONFIG.match.initialFormation,
      config.ships,
      GAME_CONFIG.formation.spacing,
      id,
      ENEMY_MAIN_FLEET_ID,
    ),
  );
}

function playerFleetStartCenter(playerBase: Vec, fleetIndex: number): Vec {
  const fleetWidth = (DEFAULT_GAME_CONFIG.ships - 1) * GAME_CONFIG.formation.spacing;
  const fleetGap = GAME_CONFIG.formation.spacing * 2;
  const offset =
    (fleetIndex - (PLAYER_FLEET_IDS.length - 1) / 2) *
    (fleetWidth + fleetGap);
  const shipLength =
    GAME_CONFIG.ship.render.tailY - GAME_CONFIG.ship.render.noseY;
  return {
    x: playerBase.x + offset,
    y:
      playerBase.y -
      GAME_CONFIG.map.basePlanet.radius -
      shipLength * GAME_CONFIG.map.basePlanet.borderShipSpacing,
  };
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
  for (const fleet of playerFleetCommands(state)) {
    fleet.formation = playerFormation;
    fleet.selectedFormation = playerFormation;
  }
  const formationMode = createFormationModeFleets(viewport, playerFormation);
  state.ships = formationMode.ships;
  state.formationMode = {
    enemyFormation: formationMode.enemyFormation,
    charging: false,
    formationSelectionEnabled: true,
    hasSelectedFormation: false,
    playerAtTop: false,
    chargingTowardTop: true,
  };
}

export function setFormationModePlayerFormation(
  state: GameState,
  viewport: Viewport,
  playerFormation: Formation,
): void {
  const mode = state.formationMode;
  if (!mode || !mode.formationSelectionEnabled) return;
  mode.chargingTowardTop = !mode.playerAtTop;

  setSelectedFleetFormation(state, playerFormation);
  const selectedFleet = selectedFleetCommand(state);
  if (!selectedFleet) return;
  selectedFleet.formation = playerFormation;
  state.formation = playerFormation;
  state.selectedFormation = playerFormation;
  if (!mode.hasSelectedFormation) {
    const playerShips = state.ships.filter(
      (ship) => ship.fleetId === state.selectedFleetId,
    );
    const fleetIndex = PLAYER_FLEET_IDS.indexOf(
      state.selectedFleetId as (typeof PLAYER_FLEET_IDS)[number],
    );
    const slots = formationSlots(
      formationModePlayerCenter(viewport, Math.max(0, fleetIndex), false),
      playerFormation,
      playerShips.length,
      GAME_CONFIG.formation.spacing,
    );
    const headings = formationSlotHeadings(playerFormation, playerShips.length);
    playerShips.forEach((ship, index) => {
      ship.pos = { ...slots[index] };
      ship.vel = { x: 0, y: 0 };
      ship.heading = headings[index];
    });
    mode.hasSelectedFormation = true;
  }
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
    for (const [fleetIndex, fleetCommand] of playerFleetCommands(state).entries()) {
      advanceFormationFleet(
        state,
        viewport,
        fleetCommand.id,
        fleetCommand.formation,
        formationModePlayerCenter(viewport, fleetIndex, mode.chargingTowardTop),
        mode.chargingTowardTop ? 0 : Math.PI,
        deltaTime,
      );
    }
    advanceFormationFleet(
      state,
      viewport,
      Side.Enemy,
      mode.enemyFormation,
      {
        x: viewport.width / 2,
        y: viewport.height * (mode.chargingTowardTop ? 0.8 : 0.2),
      },
      mode.chargingTowardTop ? Math.PI : 0,
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
      (mode.chargingTowardTop
        ? playerShips.every((ship) => ship.pos.y <= viewport.height / 2) &&
          enemyShips.every((ship) => ship.pos.y >= viewport.height / 2)
        : playerShips.every((ship) => ship.pos.y >= viewport.height / 2) &&
          enemyShips.every((ship) => ship.pos.y <= viewport.height / 2));
    if (allAliveShipsPassedMidpoint) {
      mode.playerAtTop = mode.chargingTowardTop;
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
  fleetKey: string,
  formation: Formation,
  center: Vec,
  rotation: number,
  deltaTime: number,
): void {
  const fleet = state.ships.filter(
    (ship) => ship.fleetId === fleetKey || ship.side === fleetKey,
  );
  const slots = formationSlots(
    center,
    formation,
    fleet.length,
    GAME_CONFIG.formation.spacing,
    rotation,
  );
  const headings = formationSlotHeadings(formation, fleet.length, rotation);
  for (const [ship, assignment] of assignNearestFormationSlots(fleet, slots)) {
    ship.target = assignment.position;
    ship.targetHeading = headings[assignment.slotIndex];
  }
  for (const ship of fleet) moveShip(state, ship, viewport, deltaTime * shipSpeedMultiplier(state, ship));
}

function createFormationModeFleets(
  viewport: Viewport,
  playerFormation: Formation,
): { ships: Ship[]; enemyFormation: Formation } {
  const enemyFormation =
    FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
  let firstId = 0;
  const playerShips = PLAYER_FLEET_IDS.flatMap((fleetId, fleetIndex) => {
    const ships = spawnFleet(
      Side.Player,
      ShipRole.Battleship,
      formationModePlayerCenter(viewport, fleetIndex, false),
      playerFormation,
      10,
      GAME_CONFIG.formation.spacing,
      firstId,
      fleetId,
    );
    firstId += ships.length;
    return ships;
  });
  const enemyShips = spawnFleet(
    Side.Enemy,
    ShipRole.Battleship,
    { x: viewport.width / 2, y: viewport.height * 0.2 },
    enemyFormation,
    10,
    GAME_CONFIG.formation.spacing,
    firstId,
    ENEMY_MAIN_FLEET_ID,
  );
  return { ships: [...playerShips, ...enemyShips], enemyFormation };
}

function formationModePlayerCenter(
  viewport: Viewport,
  fleetIndex: number,
  atTop: boolean,
): Vec {
  const offset =
    (fleetIndex - (PLAYER_FLEET_IDS.length - 1) / 2) *
    GAME_CONFIG.formation.spacing *
    5;
  return {
    x: viewport.width / 2 + offset,
    y: viewport.height * (atTop ? 0.2 : 0.8),
  };
}
type MatchMap = {
  bodies: Body[];
  playerBase: Vec;
  enemyBase: Vec;
};

function createMatchMap(config: Config, viewport: Viewport): MatchMap {
  const baseOffset = basePlanetBorderOffset();
  const playerBase = {
    x: viewport.width / 2,
    y: viewport.height - baseOffset,
  };
  const enemyBase = {
    x: viewport.width / 2,
    y: baseOffset,
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

function basePlanetBorderOffset(): number {
  const shipLength =
    GAME_CONFIG.ship.render.tailY - GAME_CONFIG.ship.render.noseY;
  return (
    GAME_CONFIG.map.basePlanet.radius +
    shipLength * GAME_CONFIG.map.basePlanet.borderShipSpacing
  );
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


export function issueFormationOrder(state: GameState, destination: Vec): void {
  const fleet = selectedFleetCommand(state);
  if (!fleet) return;
  const battleships = state.ships.filter(
    (ship) => ship.fleetId === fleet.id && ship.role === ShipRole.Battleship,
  );
  const center = fleetCenter(battleships);
  if (!center) return;

  fleet.formation = fleet.selectedFormation;
  fleet.formationRotation = Math.atan2(
    destination.y - center.y,
    destination.x - center.x,
  );
  fleet.cohesion = state.previewCohesion;
  fleet.command = center;
  fleet.destination = { ...destination };
  fleet.speedMode = "normal";
  fleet.combatStage = "forming";
  state.formation = fleet.formation;
  state.selectedFormation = fleet.selectedFormation;
  state.formationRotation = fleet.formationRotation;
  state.cohesion = fleet.cohesion;
  state.command = fleet.command;
  state.destination = fleet.destination;
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
    moveShip(state, ship, viewport, deltaTime * shipSpeedMultiplier(state, ship));
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

  if (ship.supplies <= 0) {
    ship.supplyMission = SupplyMission.Returning;
    ship.target = { ...homePlanet.pos };
    return;
  }

  const currentTarget = state.ships.find(
    (candidate) =>
      candidate.id === ship.resupplyTargetId &&
      candidate.role === ShipRole.Battleship &&
      candidate.side === ship.side &&
      candidate.hp > 0,
  );
  if (!currentTarget) {
    const replacementTarget = findClosestLeastSuppliedBattleship(
      state,
      ship.side,
      ship.pos,
    );
    if (
      !replacementTarget ||
      replacementTarget.supplies >= GAME_CONFIG.supply.targetSupplyCapacity
    ) {
      ship.supplyMission = SupplyMission.Returning;
      ship.target = { ...homePlanet.pos };
      return;
    }
    ship.resupplyTargetId = replacementTarget.id;
  }

  const target =
    currentTarget ??
    state.ships.find((candidate) => candidate.id === ship.resupplyTargetId);
  if (!target) return;
  if (target.supplies >= GAME_CONFIG.supply.targetSupplyCapacity) {
    const replacementTarget = findClosestLeastSuppliedBattleship(
      state,
      ship.side,
      ship.pos,
    );
    if (
      replacementTarget &&
      replacementTarget.id !== target.id &&
      replacementTarget.supplies < GAME_CONFIG.supply.targetSupplyCapacity
    ) {
      ship.resupplyTargetId = replacementTarget.id;
      ship.target = { ...replacementTarget.pos };
      return;
    }
    ship.supplyMission = SupplyMission.Returning;
    ship.target = { ...homePlanet.pos };
    return;
  }

  ship.target = { ...target.pos };
  if (distance(ship.pos, target.pos) > GAME_CONFIG.supply.transferDistance)
    return;

  const transferred = Math.min(
    ship.supplies,
    GAME_CONFIG.supply.targetSupplyCapacity - target.supplies,
  );
  if (transferred <= 0) {
    ship.supplyMission = SupplyMission.Returning;
    ship.target = { ...homePlanet.pos };
    return;
  }
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
  const enemyBase = state.bodies.find((body) => body.base === Side.Enemy);

  for (const fleetCommand of Object.values(state.fleets)) {
    const { id: fleetId, side, speedMode } = fleetCommand;
    const homeBase = state.bodies.find((body) => body.base === side);
    if (!homeBase) continue;

    const fleet = state.ships.filter((ship) => ship.fleetId === fleetId);
    const battleships = fleet.filter(
      (ship) => ship.role === ShipRole.Battleship,
    );
    const enemyAdvancing =
      side === Side.Enemy &&
      playerFleetCommands(state).some(
        (playerFleet) => playerFleet.combatStage === "attacking",
      ) &&
      playerBase;
    const center =
      side === Side.Player
        ? speedMode === "hold"
          ? fleetCenter(battleships) ?? homeBase.pos
          : (fleetCommand.command ?? fleetCenter(battleships) ?? homeBase.pos)
        : enemyAdvancing
          ? playerBase.pos
          : homeBase.pos;
    const formation =
      side === Side.Player
        ? fleetCommand.formation
        : enemyAdvancing
          ? Formation.Arrow
          : Formation.Circle;
    const rotation = side === Side.Player ? fleetCommand.formationRotation : 0;
    const targets = formationSlots(
      center,
      formation,
      battleships.length,
      GAME_CONFIG.formation.spacing,
      rotation,
    );
    const headings = formationSlotHeadings(
      formation,
      battleships.length,
      rotation,
    );
    const assignments = assignNearestFormationSlots(battleships, targets);

    for (const [ship, assignment] of assignments) {
      ship.target = assignment.position;
      ship.targetHeading = headings[assignment.slotIndex];
    }

    if (
      side === Side.Player &&
      fleetCommand.combatStage === "forming" &&
      fleetCommand.command &&
      fleetCommand.destination &&
      assignments.size > 0 &&
      Array.from(assignments).every(
        ([ship, assignment]) =>
          distance(ship.pos, assignment.position) <=
          GAME_CONFIG.formation.arrivalDistance,
      )
    ) {
      fleetCommand.combatStage = "attacking";
      fleetCommand.speedMode = "full";
      fleetCommand.command = { ...fleetCommand.destination };
      fleetCommand.destination = null;
      fleetCommand.formationRotation = Math.atan2(
        fleetCommand.command.y - center.y,
        fleetCommand.command.x - center.x,
      );
      if (state.selectedFleetId === fleetCommand.id) {
        state.command = fleetCommand.command;
        state.destination = fleetCommand.destination;
        state.formationRotation = fleetCommand.formationRotation;
      }
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
function fleetCenter(ships: Ship[]): Vec | undefined {
  if (ships.length === 0) return undefined;
  const total = ships.reduce(
    (sum, ship) => ({
      x: sum.x + ship.pos.x,
      y: sum.y + ship.pos.y,
    }),
    { x: 0, y: 0 },
  );
  return { x: total.x / ships.length, y: total.y / ships.length };
}

function shipSpeedMultiplier(state: GameState, ship: Ship): number {
  const fleet = state.fleets[ship.fleetId];
  if (!fleet) return 1;
  if (fleet.speedMode === "hold") return 0;
  if (ship.side === Side.Player && fleet.command) {
    return fleet.combatStage === "attacking" ? 2 : 1;
  }
  return fleet.speedMode === "full" ? 2 : 1;
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
    if (amount <= 0) continue;
    ship.supplies += amount;
    planet.stock = (planet.stock ?? 0) - amount;
  }
}

function fleetHeading(state: GameState, fleetId: string): Vec {
  const rotation = state.fleets[fleetId]?.formationRotation ?? 0;
  return { x: Math.cos(rotation), y: Math.sin(rotation) };
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
      ? fleetHeading(state, ship.fleetId)
      : undefined,
  );
}
