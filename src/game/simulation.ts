import { FORMATIONS } from "./constants";
import { applyAtWillSteering, hasLineOfSight, isTargetForward } from "./combat";
import { DEFAULT_GAME_CONFIG, GAME_CONFIG } from "./config";
import { assignNearestFormationSlots } from "./formation-assignment";
import { formationSlotHeadings, formationSlots } from "./formations";
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
  state.bodies = [];

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
  let bodyId = 0;

  state.bodies.push(
    {
      id: bodyId++,
      kind: BodyKind.Planet,
      pos: playerBase,
      radius: GAME_CONFIG.map.basePlanet.radius,
      base: Side.Player,
      stock: 0,
      hue: GAME_CONFIG.map.basePlanet.hue.player,
      weight: GAME_CONFIG.map.basePlanet.weight,
    },
    {
      id: bodyId++,
      kind: BodyKind.Planet,
      pos: enemyBase,
      radius: GAME_CONFIG.map.basePlanet.radius,
      base: Side.Enemy,
      stock: 0,
      hue: GAME_CONFIG.map.basePlanet.hue.enemy,
      weight: GAME_CONFIG.map.basePlanet.weight,
    },
  );

  for (let index = 2; index < config.planets; index++) {
    state.bodies.push({
      id: bodyId++,
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
    });
  }

  for (let index = 0; index < config.asteroids; index++) {
    state.bodies.push({
      id: bodyId++,
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
          ? clamp(
              GAME_CONFIG.formation.playerSpacingBase -
                state.cohesion *
                  GAME_CONFIG.formation.playerCohesionSpacingMultiplier,
              GAME_CONFIG.formation.playerMinSpacing,
              GAME_CONFIG.formation.playerMaxSpacing,
            )
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
  applyFireModeSteering(state);

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
      x: direction.x * GAME_CONFIG.projectile.speed,
      y: direction.y * GAME_CONFIG.projectile.speed,
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
    const target = findLeastSuppliedBattleship(state, planet.base);
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
  return {
    ...spawnShip(side, ShipRole.Supply, homePlanet.pos, id),
    hp: GAME_CONFIG.supply.shipHp,
    maxHp: GAME_CONFIG.supply.shipHp,
    speed: GAME_CONFIG.supply.shipSpeed,
    supplies: GAME_CONFIG.supply.shipCapacity,
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
  const target = currentTarget ?? findLeastSuppliedBattleship(state, ship.side);
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
        ? clamp(
            GAME_CONFIG.formation.playerSpacingBase -
              state.cohesion *
                GAME_CONFIG.formation.playerCohesionSpacingMultiplier,
            GAME_CONFIG.formation.playerMinSpacing,
            GAME_CONFIG.formation.playerMaxSpacing,
          )
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
  applyAtWillSteering(
    state.ships.filter(
      (ship) => ship.side === Side.Player && ship.role === ShipRole.Battleship,
    ),
    state.ships.filter((ship) => ship.side === Side.Enemy),
    state.fireMode === FireMode.AtWill,
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

function attackDamage(state: GameState, ship: Ship, defense = 0): number {
  const bonus =
    ship.side === Side.Player && state.formation === state.captainFavorite
      ? GAME_CONFIG.combat.favoriteFormationDamageMultiplier
      : 1;
  return Math.max(
    GAME_CONFIG.combat.minimumDamage,
    ship.attack * bonus - defense,
  );
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

  let target = targets.reduce((closest, candidate) =>
    distance(candidate.pos, ship.pos) < distance(closest.pos, ship.pos)
      ? candidate
      : closest,
  );
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
  target.moral = clamp(
    target.moral - GAME_CONFIG.combat.moraleDamage,
    0,
    GAME_CONFIG.combat.maximumMorale,
  );
  ship.supplies--;
  ship.cooldown = GAME_CONFIG.combat.weaponCooldown;
  spawnProjectile(state, ship.pos, target.pos, ship.side, ship.id);
}
