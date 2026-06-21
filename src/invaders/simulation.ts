import {
  applyAtWillSteering,
  hasLineOfSight,
  isTargetForward,
} from "../game/combat";
import { FORMATIONS } from "../game/constants";
import { assignNearestFormationSlots } from "../game/formation-assignment";
import { formationSlotHeadings, formationSlots } from "../game/formations";
import { clamp, distance, normalize } from "../game/math";
import { spawnFleet, spawnShip } from "../game/ship-factory";
import { moveShipWithBoids } from "../game/ship-movement";
import { BodyKind, FireMode, Formation, ShipRole, Side } from "../game/types";
import type { Formation as FormationType, Ship, Viewport } from "../game/types";
import { UpgradeType } from "./upgrade-type";
import type { InvadersState } from "./types";

const FLEET_SIZE = 10;
const FLEET_SPACING = 48;
const PROJECTILE_SPEED = 330;
const ENEMY_FLEET_Y = 105;
const BASE_BOTTOM_OFFSET = 180;
const PLAYER_FLEET_BOTTOM_OFFSET = 340;
const BASE_MAX_HP = 1000;
const BASE_SUPPLY_CAPACITY = 20;
const BASE_SUPPLY_RATE = 1;
const SUPPLY_SHIP_CAPACITY = 1;

export function createInvadersState(): InvadersState {
  return {
    formation: Formation.Line,
    selectedFormation: Formation.Line,
    enemyFormation: Formation.Line,
    enemyDestination: { x: 0, y: 0 },
    playerSteeringTarget: null,
    captainFavorite: Formation.Line,
    fireMode: FireMode.AtWill,
    ships: [],
    supplyShips: [],
    enemies: [],
    projectiles: [],
    base: {
      id: 0,
      kind: BodyKind.Base,
      pos: { x: 0, y: 0 },
      radius: 40,
      base: Side.Player,
      stock: 0,
      hue: 195,
      weight: 0,
    },
    baseHp: BASE_MAX_HP,
    baseMaxHp: BASE_MAX_HP,
    baseSupplyRate: BASE_SUPPLY_RATE,
    baseSupplyCapacity: BASE_SUPPLY_CAPACITY,
    wave: 1,
    score: 0,
    upgrades: createUpgradeLevels(),
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
  state.fireMode = FireMode.AtWill;
  state.playerSteeringTarget = null;
  state.base = {
    id: 0,
    kind: BodyKind.Base,
    pos: {
      x: viewport.width / 2,
      y: viewport.height - BASE_BOTTOM_OFFSET,
    },
    radius: 40,
    base: Side.Player,
    stock: 0,
    hue: 195,
    weight: 2.5,
  };
  state.baseHp = BASE_MAX_HP;
  state.baseMaxHp = BASE_MAX_HP;
  state.baseSupplyRate = BASE_SUPPLY_RATE;
  state.baseSupplyCapacity = BASE_SUPPLY_CAPACITY;
  state.projectiles = [];
  state.wave = 0;
  state.score = 0;
  state.upgrades = createUpgradeLevels();
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
  state.supplyShips = [createSupplyShip(state.base.pos, state.nextShipId++)];
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

export function purchaseInvadersUpgrade(
  state: InvadersState,
  upgrade: UpgradeType,
): number | null {
  const cost = 100 * (state.upgrades[upgrade] + 1);
  if (state.score < cost) return null;

  state.score -= cost;
  state.upgrades[upgrade]++;
  for (const ship of state.ships) {
    switch (upgrade) {
      case UpgradeType.Damage:
        ship.attack += 2;
        break;
      case UpgradeType.Speed:
        ship.speed += 8;
        break;
      case UpgradeType.Hull:
        ship.maxHp += 10;
        ship.hp += 10;
        break;
      case UpgradeType.Range:
        ship.range += 15;
        break;
      case UpgradeType.SupplyShips:
      case UpgradeType.BaseSupplyGeneration:
      case UpgradeType.BaseSupplyCapacity:
        break;
    }
  }
  if (upgrade === UpgradeType.SupplyShips) {
    state.supplyShips.push(
      createSupplyShip(state.base.pos, state.nextShipId++),
    );
  }
  if (upgrade === UpgradeType.BaseSupplyGeneration) {
    state.baseSupplyRate += 0.5;
  }
  if (upgrade === UpgradeType.BaseSupplyCapacity) {
    state.baseSupplyCapacity += 5;
  }
  return cost;
}

export function setInvadersFireMode(
  state: InvadersState,
  fireMode: FireMode,
): void {
  state.fireMode = fireMode;
}

export function setInvadersAlignment(
  state: InvadersState,
  point: { x: number; y: number },
  viewport: Viewport,
): void {
  state.playerSteeringTarget = { ...point };
}

export function updateInvaders(
  state: InvadersState,
  viewport: Viewport,
  elapsed: number,
): void {
  const enemySlots = formationSlots(
    state.enemyDestination,
    state.enemyFormation,
    FLEET_SIZE,
    FLEET_SPACING,
  );
  const enemyHeadings = formationSlotHeadings(state.enemyFormation, FLEET_SIZE);
  for (const [ship, assignment] of assignNearestFormationSlots(
    state.enemies,
    enemySlots,
  )) {
    ship.targetHeading = enemyHeadings[assignment.slotIndex];
    moveFleetShip(
      [...state.enemies, ...state.ships],
      ship,
      assignment.position,
      viewport,
      elapsed,
      ship.targetHeading,
    );
  }

  const slots = formationSlots(
    playerFleetCenter(viewport),
    state.formation,
    FLEET_SIZE,
    FLEET_SPACING,
  );
  const playerHeadings = formationSlotHeadings(state.formation, FLEET_SIZE);
  applyAtWillSteering(
    state.ships,
    state.enemies,
    state.fireMode === FireMode.AtWill,
  );
  for (const [ship, assignment] of assignNearestFormationSlots(
    state.ships,
    slots,
  )) {
    ship.targetHeading = state.playerSteeringTarget
      ? playerSteeringHeading(state, ship)
      : playerHeadings[assignment.slotIndex];
    moveFleetShip(
      [...state.ships, ...state.enemies],
      ship,
      assignment.position,
      viewport,
      elapsed,
      ship.targetHeading,
    );
    ship.cooldown -= elapsed;
  }
  state.enemies.forEach((ship) => {
    ship.cooldown -= elapsed;
  });
  replenishBaseSupplies(state, elapsed);
  updateSupplyShips(state, viewport, elapsed);
  resolveGuardBaseContacts(state);
  if (state.winner) return;
  fireWeapons(state);
  updateProjectiles(state, elapsed, viewport);
  state.ships = state.ships.filter((ship) => ship.hp > 0);
  state.enemies = state.enemies.filter((ship) => ship.hp > 0);
  if (state.enemies.length === 0) spawnEnemyWave(state, viewport);
}

function playerSteeringHeading(
  state: InvadersState,
  ship: Ship,
): { x: number; y: number } {
  if (!state.playerSteeringTarget) return { x: 0, y: -1 };
  return normalize({
    x: state.playerSteeringTarget.x - ship.pos.x,
    y: state.playerSteeringTarget.y - ship.pos.y,
  });
}

function resolveGuardBaseContacts(state: InvadersState): void {
  for (const guard of state.enemies) {
    if (guard.pos.y < state.base.pos.y - state.base.radius / 2 - 8) continue;
    state.baseHp = clamp(state.baseHp - guard.hp, 0, state.baseMaxHp);
    guard.hp = 0;
  }
  state.enemies = state.enemies.filter((ship) => ship.hp > 0);
  if (state.baseHp <= 0) state.winner = Side.Enemy;
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
    FLEET_SPACING,
    state.nextShipId,
  );
  state.nextShipId += fleet.length;
  return fleet;
}

function fireWeapons(state: InvadersState): void {
  for (const ship of state.ships) {
    if (
      ship.role !== ShipRole.Battleship ||
      state.fireMode === FireMode.Hold ||
      ship.supplies < 1 ||
      ship.cooldown > 0 ||
      state.enemies.length === 0
    )
      continue;
    const targets = state.enemies.filter(
      (enemy) =>
        isTargetForward(ship, enemy.pos) &&
        distance(enemy.pos, ship.pos) < ship.range &&
        hasLineOfSight(
          ship,
          enemy.pos,
          [...state.ships, ...state.enemies],
          [state.base],
          enemy,
        ),
    );
    if (targets.length === 0) continue;
    const target = targets.reduce((closest, enemy) =>
      distance(enemy.pos, ship.pos) < distance(closest.pos, ship.pos)
        ? enemy
        : closest,
    );
    const damage =
      ship.attack * (state.formation === state.captainFavorite ? 1.25 : 1);
    const dealtDamage = Math.min(target.hp, damage);
    target.hp -= dealtDamage;
    state.score += dealtDamage;
    ship.supplies--;
    ship.cooldown = 0.7;
    spawnProjectile(state, ship, target.pos);
  }

  for (const ship of state.enemies) {
    if (ship.role !== ShipRole.Battleship || ship.cooldown > 0) continue;
    const targets = state.ships.filter(
      (defender) =>
        isTargetForward(ship, defender.pos) &&
        distance(defender.pos, ship.pos) < ship.range &&
        hasLineOfSight(
          ship,
          defender.pos,
          [...state.ships, ...state.enemies],
          [state.base],
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
    const canAttackBase =
      distance(state.base.pos, ship.pos) < ship.range &&
      hasLineOfSight(
        ship,
        state.base.pos,
        [...state.ships, ...state.enemies],
        [state.base],
        undefined,
        state.base,
      );
    if (!target && !canAttackBase) continue;
    if (target) target.hp -= ship.attack;
    else state.baseHp = clamp(state.baseHp - ship.attack, 0, state.baseMaxHp);
    ship.cooldown = 1.15;
    spawnProjectile(state, ship, target?.pos ?? state.base.pos);
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
    const hitBase =
      distance(state.base.pos, projectile.pos) < state.base.radius;
    return (
      !hitShip &&
      !hitBase &&
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
  formationHeading: { x: number; y: number },
): void {
  ship.target = target;
  moveShipWithBoids(ship, fleet, [], viewport, elapsed, 4, formationHeading);
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

function createSupplyShip(
  position: { x: number; y: number },
  id: number,
): Ship {
  const ship = spawnShip(Side.Player, ShipRole.Supply, position, id);
  ship.hp = 40;
  ship.maxHp = 40;
  ship.speed = 78;
  ship.supplies = 0;
  ship.range = 0;
  ship.target = { ...position };
  return ship;
}

function replenishBaseSupplies(state: InvadersState, elapsed: number): void {
  state.base.stock = Math.min(
    state.baseSupplyCapacity,
    (state.base.stock ?? 0) + elapsed * state.baseSupplyRate,
  );
}

function updateSupplyShips(
  state: InvadersState,
  viewport: Viewport,
  elapsed: number,
): void {
  for (const ship of state.supplyShips) {
    updateSupplyShip(state, ship, viewport, elapsed);
  }
}

function updateSupplyShip(
  state: InvadersState,
  ship: Ship,
  viewport: Viewport,
  elapsed: number,
): void {
  if (ship.supplies === 0) {
    ship.target = { ...state.base.pos };
    if (distance(ship.pos, state.base.pos) <= state.base.radius + 12) {
      const available = Math.floor(state.base.stock ?? 0);
      if (available >= SUPPLY_SHIP_CAPACITY) {
        state.base.stock = available - SUPPLY_SHIP_CAPACITY;
        ship.supplies = SUPPLY_SHIP_CAPACITY;
      }
    }
  } else {
    const target = state.ships.reduce<Ship | undefined>(
      (lowest, defender) =>
        !lowest || defender.supplies < lowest.supplies ? defender : lowest,
      undefined,
    );
    if (target) {
      ship.target = { ...target.pos };
      if (distance(ship.pos, target.pos) <= 32) {
        const transferred = Math.min(ship.supplies, 10 - target.supplies);
        target.supplies += transferred;
        ship.supplies -= transferred;
      }
    }
  }
  moveShipWithBoids(
    ship,
    [...state.ships, ...state.enemies, ...state.supplyShips],
    [],
    viewport,
    elapsed,
  );
}

function createUpgradeLevels(): Record<UpgradeType, number> {
  return {
    [UpgradeType.Damage]: 0,
    [UpgradeType.Speed]: 0,
    [UpgradeType.Hull]: 0,
    [UpgradeType.Range]: 0,
    [UpgradeType.SupplyShips]: 0,
    [UpgradeType.BaseSupplyGeneration]: 0,
    [UpgradeType.BaseSupplyCapacity]: 0,
  };
}
