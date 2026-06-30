import {
  applyGunSteering,
  hasLineOfSight,
  isTargetForward,
} from "../game/combat";
import { FORMATIONS, PLAYER_FLEET_COLORS, PLAYER_FLEET_IDS, PLAYER_FLEET_NAMES } from "../game/constants";
import { assignNearestFormationSlots } from "../game/formation-assignment";
import { formationSlotHeadings, formationSlots } from "../game/formations";
import { clamp, distance, normalize } from "../game/math";
import { spawnFleet, spawnShip } from "../game/ship-factory";
import { moveShipWithBoids } from "../game/ship-movement";
import {
  Battleship,
  BodyKind,
  FireMode,
  Formation,
  ShipRole,
  Side,
} from "../game/types";
import type { Formation as FormationType, Ship, Viewport } from "../game/types";
import { getUpgradeCost, INVADERS_CONFIG, UPGRADE_CONFIG } from "./config";
import { UpgradeType } from "./upgrade-type";
import type { InvadersState } from "./types";

export function createInvadersState(): InvadersState {
  return {
    formation: Formation.Line,
    selectedFormation: Formation.Line,
    selectedFleetId: PLAYER_FLEET_IDS[0],
    fleets: createInvadersFleetCommands(),
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
      radius: INVADERS_CONFIG.base.radius,
      base: Side.Player,
      stock: 0,
      hue: INVADERS_CONFIG.base.hue,
      weight: 0,
    },
    baseHp: INVADERS_CONFIG.base.maxHp,
    baseMaxHp: INVADERS_CONFIG.base.maxHp,
    baseSupplyRate: INVADERS_CONFIG.base.supplyRate,
    baseSupplyCapacity: INVADERS_CONFIG.base.supplyCapacity,
    regenerationRate: 0,
    wave: 1,
    enemyDeploymentCountdown: 0,
    score: 0,
    money: 0,
    upgrades: createUpgradeLevels(),
    waveOffset: 0,
    waveDirection: 1,
    nextShipId: 1,
    winner: null,
  };
}

function createInvadersFleetCommands(): InvadersState["fleets"] {
  const fleets: InvadersState["fleets"] = {};
  for (const id of PLAYER_FLEET_IDS) {
    fleets[id] = {
      id,
      side: Side.Player,
      name: PLAYER_FLEET_NAMES[id],
      color: PLAYER_FLEET_COLORS[id],
      formation: Formation.Line,
      selectedFormation: Formation.Line,
      command: null,
      destination: null,
      formationRotation: 0,
      cohesion: 1,
      speedMode: "normal",
      combatStage: "forming",
    };
  }
  return fleets;
}

export function invadersFleetCommands(state: InvadersState): InvadersState["fleets"][string][] {
  return Object.values(state.fleets);
}

export function selectInvadersFleet(state: InvadersState, fleetId: string): void {
  const fleet = state.fleets[fleetId];
  if (!fleet) return;
  state.selectedFleetId = fleetId;
  state.formation = fleet.formation;
  state.selectedFormation = fleet.selectedFormation;
  state.playerSteeringTarget = fleet.command;
}

export function resetInvaders(
  state: InvadersState,
  viewport: Viewport,
  captain: FormationType,
): void {
  state.formation = Formation.Line;
  state.selectedFormation = Formation.Line;
  state.selectedFleetId = PLAYER_FLEET_IDS[0];
  state.fleets = createInvadersFleetCommands();
  state.captainFavorite = captain;
  state.fireMode = FireMode.AtWill;
  state.playerSteeringTarget = null;
  state.base = {
    id: 0,
    kind: BodyKind.Base,
    pos: {
      x: viewport.width / 2,
      y: viewport.height - INVADERS_CONFIG.base.bottomOffset,
    },
    radius: INVADERS_CONFIG.base.radius,
    base: Side.Player,
    stock: 0,
    hue: INVADERS_CONFIG.base.hue,
    weight: INVADERS_CONFIG.base.weight,
  };
  state.baseHp = INVADERS_CONFIG.base.maxHp;
  state.baseMaxHp = INVADERS_CONFIG.base.maxHp;
  state.baseSupplyRate = INVADERS_CONFIG.base.supplyRate;
  state.baseSupplyCapacity = INVADERS_CONFIG.base.supplyCapacity;
  state.regenerationRate = 0;
  state.projectiles = [];
  state.wave = 0;
  state.enemyDeploymentCountdown = 0;
  state.score = 0;
  state.money = 0;
  state.upgrades = createUpgradeLevels();
  state.waveOffset = 0;
  state.nextShipId = 1;
  state.winner = null;
  state.ships = PLAYER_FLEET_IDS.flatMap((fleetId, fleetIndex) =>
    createFleet(
      Side.Player,
      playerFleetCenter(viewport, fleetIndex),
      state.fleets[fleetId].formation,
      ShipRole.Battleship,
      state,
      INVADERS_CONFIG.player.fleetSize,
      fleetId,
    ),
  );
  state.supplyShips = Array.from(
    { length: INVADERS_CONFIG.supplyShips.initialCount },
    () => createSupplyShip(state.base.pos, state.nextShipId++),
  );
  spawnEnemyWave(state, viewport);
}

export function selectInvadersFormation(
  state: InvadersState,
  formation: Formation,
): void {
  const fleet = state.fleets[state.selectedFleetId];
  if (!fleet) return;
  fleet.selectedFormation = formation;
  state.selectedFormation = formation;
}

export function applyInvadersFormation(state: InvadersState): void {
  const fleet = state.fleets[state.selectedFleetId];
  if (!fleet) return;
  fleet.formation = fleet.selectedFormation;
  state.formation = fleet.formation;
}

export function purchaseInvadersUpgrade(
  state: InvadersState,
  upgrade: UpgradeType,
): number | null {
  const config = UPGRADE_CONFIG[upgrade];
  const cost = getUpgradeCost(upgrade, state.upgrades[upgrade]);
  if (state.money < cost) return null;

  state.money -= cost;
  state.upgrades[upgrade]++;
  for (const ship of state.ships) {
    if (ship instanceof Battleship) {
      ship.gun.attack += config.attack ?? 0;
      ship.gun.range += config.range ?? 0;
    }
    ship.speed += config.speed ?? 0;
    ship.maxHp += config.hull ?? 0;
    ship.hp += config.hull ?? 0;
  }
  for (let index = 0; index < (config.supplyShips ?? 0); index++) {
    state.supplyShips.push(
      createSupplyShip(state.base.pos, state.nextShipId++),
    );
  }
  state.baseSupplyRate += config.baseSupplyRate ?? 0;
  state.baseSupplyCapacity += config.baseSupplyCapacity ?? 0;
  state.regenerationRate += config.regenerationRate ?? 0;
  return cost;
}

export function setInvadersFireMode(
  state: InvadersState,
  fireMode: FireMode,
): void {
  state.fireMode = fireMode;
}

export function setInvadersFleetSpeedMode(
  state: InvadersState,
  fleetId: string,
  speedMode: InvadersState["fleets"][string]["speedMode"],
): void {
  const fleet = state.fleets[fleetId];
  if (!fleet) return;
  fleet.speedMode = speedMode;
}

export function setInvadersAlignment(
  state: InvadersState,
  point: { x: number; y: number },
  viewport: Viewport,
): void {
  const fleet = state.fleets[state.selectedFleetId];
  if (!fleet) return;
  fleet.command = { ...point };
  state.playerSteeringTarget = fleet.command;
}

export function updateInvaders(
  state: InvadersState,
  viewport: Viewport,
  elapsed: number,
): void {
  const enemiesCanAct = updateEnemyDeployment(state, elapsed);
  if (enemiesCanAct) updateEnemyFleet(state, viewport, elapsed);
  updatePlayerFleet(state, viewport, elapsed);
  if (enemiesCanAct) decrementCooldowns(state.enemies, elapsed);

  regenerateDefenders(state, elapsed);
  replenishBaseSupplies(state, elapsed);
  updateSupplyShips(state, viewport, elapsed);
  if (enemiesCanAct) resolveBaseContacts(state);
  if (state.winner) return;

  fireWeapons(state, enemiesCanAct);
  updateProjectiles(state, elapsed, viewport);
  removeDestroyedShips(state);
  if (state.enemies.length === 0) spawnEnemyWave(state, viewport);
}

function updateEnemyDeployment(state: InvadersState, elapsed: number): boolean {
  if (state.enemyDeploymentCountdown <= 0) return true;
  state.enemyDeploymentCountdown = Math.max(
    0,
    state.enemyDeploymentCountdown - elapsed,
  );
  return false;
}

function updatePlayerFleet(
  state: InvadersState,
  viewport: Viewport,
  elapsed: number,
): void {
  applyGunSteering(state.ships, state.enemies, state.fireMode);
  for (const [fleetIndex, fleetCommand] of invadersFleetCommands(state).entries()) {
    const fleetShips = state.ships.filter(
      (ship) => ship.fleetId === fleetCommand.id,
    );
    const slots = formationSlots(
      playerFleetCenter(viewport, fleetIndex),
      fleetCommand.formation,
      fleetShips.length,
      INVADERS_CONFIG.fleet.spacing,
    );
    const playerHeadings = formationSlotHeadings(
      fleetCommand.formation,
      fleetShips.length,
    );
    for (const [ship, assignment] of assignNearestFormationSlots(
      fleetShips,
      slots,
    )) {
      ship.targetHeading = fleetCommand.command
        ? playerSteeringHeading(fleetCommand.command, ship)
        : playerHeadings[assignment.slotIndex];
      moveFleetShip(
        [...state.ships, ...state.enemies],
        ship,
        assignment.position,
        viewport,
        elapsed * shipSpeedMultiplier(state, ship),
        ship.targetHeading,
      );
      if (ship instanceof Battleship) ship.gun.update(elapsed);
    }
  }
}
function shipSpeedMultiplier(state: InvadersState, ship: Ship): number {
  const mode = state.fleets[ship.fleetId]?.speedMode ?? "normal";
  if (mode === "hold") return 0;
  return mode === "full" ? 2 : 1;
}

function decrementCooldowns(ships: Ship[], elapsed: number): void {
  for (const ship of ships) {
    if (ship instanceof Battleship) ship.gun.update(elapsed);
  }
}

function removeDestroyedShips(state: InvadersState): void {
  state.ships = state.ships.filter((ship) => ship.hp > 0);
  state.enemies = state.enemies.filter((ship) => ship.hp > 0);
}

function updateEnemyFleet(
  state: InvadersState,
  viewport: Viewport,
  elapsed: number,
): void {
  applyGunSteering(state.enemies, state.ships, FireMode.AtWill);
  const enemySlots = formationSlots(
    state.enemyDestination,
    state.enemyFormation,
    INVADERS_CONFIG.enemy.waveSize,
    INVADERS_CONFIG.fleet.spacing,
  );
  const enemyHeadings = formationSlotHeadings(
    state.enemyFormation,
    INVADERS_CONFIG.enemy.waveSize,
  );
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
}

function playerSteeringHeading(
  target: { x: number; y: number },
  ship: Ship,
): { x: number; y: number } {
  return normalize({
    x: target.x - ship.pos.x,
    y: target.y - ship.pos.y,
  });
}

function resolveBaseContacts(state: InvadersState): void {
  for (const ship of state.enemies) {
    if (
      ship.pos.y <
      state.base.pos.y -
        state.base.radius / 2 -
        INVADERS_CONFIG.base.contactMargin
    )
      continue;
    state.baseHp = clamp(state.baseHp - ship.hp, 0, state.baseMaxHp);
    ship.hp = 0;
  }
  state.enemies = state.enemies.filter((ship) => ship.hp > 0);
  if (state.baseHp <= 0) state.winner = Side.Enemy;
}

function playerFleetCenter(
  viewport: Viewport,
  fleetIndex = 0,
): { x: number; y: number } {
  const offset =
    (fleetIndex - (PLAYER_FLEET_IDS.length - 1) / 2) *
    INVADERS_CONFIG.fleet.spacing *
    5;
  return {
    x: viewport.width / 2 + offset,
    y: viewport.height - INVADERS_CONFIG.player.fleetBottomOffset,
  };
}

function createFleet(
  side: Side,
  center: { x: number; y: number },
  formation: Formation,
  role: ShipRole,
  state: InvadersState,
  count: number,
  fleetId = side + "-main",
): Ship[] {
  const fleet = spawnFleet(
    side,
    role,
    center,
    formation,
    count,
    INVADERS_CONFIG.fleet.spacing,
    state.nextShipId,
    fleetId,
  );
  for (const ship of fleet) {
    if (ship instanceof Battleship) {
      ship.gun.cooldownDuration =
        side === Side.Player
          ? INVADERS_CONFIG.player.weaponCooldown
          : INVADERS_CONFIG.enemy.weaponCooldown;
    }
  }
  state.nextShipId += fleet.length;
  return fleet;
}

function fireWeapons(state: InvadersState, enemiesCanAct: boolean): void {
  for (const ship of state.ships) {
    if (
      !(ship instanceof Battleship) ||
      state.fireMode === FireMode.Hold ||
      ship.supplies < 1 ||
      ship.gun.cooldown > 0 ||
      state.enemies.length === 0
    )
      continue;
    const targets = state.enemies.filter(
      (enemy) =>
        isTargetForward(
          { pos: ship.pos, heading: ship.gun.heading(ship.heading) },
          enemy.pos,
        ) &&
        distance(enemy.pos, ship.pos) < ship.gun.range &&
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
      ship.gun.attack *
      (state.formation === state.captainFavorite
        ? INVADERS_CONFIG.player.favoriteFormationDamageMultiplier
        : 1);
    const dealtDamage = Math.min(target.hp, damage);
    target.hp -= dealtDamage;
    state.score += dealtDamage;
    state.money += dealtDamage;
    ship.supplies--;
    ship.gun.cooldown = ship.gun.cooldownDuration;
    spawnProjectile(state, ship, target.pos);
  }

  if (!enemiesCanAct) return;

  for (const ship of state.enemies) {
    if (
      !(ship instanceof Battleship) ||
      ship.supplies < 1 ||
      ship.gun.cooldown > 0
    )
      continue;
    const targets = state.ships.filter(
      (defender) =>
        isTargetForward(
          { pos: ship.pos, heading: ship.gun.heading(ship.heading) },
          defender.pos,
        ) &&
        distance(defender.pos, ship.pos) < ship.gun.range &&
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
      distance(state.base.pos, ship.pos) < ship.gun.range &&
      hasLineOfSight(
        ship,
        state.base.pos,
        [...state.ships, ...state.enemies],
        [state.base],
        undefined,
        state.base,
      );
    if (!target && !canAttackBase) continue;
    if (target) target.hp -= ship.gun.attack;
    else {
      state.baseHp = clamp(state.baseHp - ship.gun.attack, 0, state.baseMaxHp);
    }
    ship.supplies--;
    ship.gun.cooldown = ship.gun.cooldownDuration;
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
      x: direction.x * INVADERS_CONFIG.projectile.speed,
      y: direction.y * INVADERS_CONFIG.projectile.speed,
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
        distance(ship.pos, projectile.pos) <
          INVADERS_CONFIG.projectile.hitRadius,
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
  moveShipWithBoids(
    ship,
    fleet,
    [],
    viewport,
    elapsed,
    INVADERS_CONFIG.fleet.arrivalDistance,
    formationHeading,
  );
}

function spawnEnemyWave(state: InvadersState, viewport: Viewport): void {
  state.wave++;
  state.enemyDeploymentCountdown = INVADERS_CONFIG.enemy.deploymentDelay;
  state.waveOffset = 0;
  state.enemyDestination = {
    x: viewport.width / 2,
    y: viewport.height + INVADERS_CONFIG.enemy.destinationBottomOffset,
  };
  state.enemyFormation =
    FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
  state.enemies = createFleet(
    Side.Enemy,
    { x: viewport.width / 2, y: INVADERS_CONFIG.enemy.fleetY },
    state.enemyFormation,
    ShipRole.Battleship,
    state,
    INVADERS_CONFIG.enemy.waveSize,
  );
}

function createSupplyShip(
  position: { x: number; y: number },
  id: number,
): Ship {
  const ship = spawnShip(Side.Player, ShipRole.Supply, position, id);
  ship.hp = INVADERS_CONFIG.supplyShips.hp;
  ship.maxHp = INVADERS_CONFIG.supplyShips.hp;
  ship.speed = INVADERS_CONFIG.supplyShips.speed;
  ship.supplies = 0;
  ship.target = { ...position };
  return ship;
}

function regenerateDefenders(state: InvadersState, elapsed: number): void {
  if (state.regenerationRate <= 0) return;
  for (const ship of state.ships) {
    ship.hp = Math.min(ship.maxHp, ship.hp + elapsed * state.regenerationRate);
  }
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
    ship.resupplyTargetId = undefined;
    ship.target = { ...state.base.pos };
    if (
      distance(ship.pos, state.base.pos) <=
      state.base.radius + INVADERS_CONFIG.supplyShips.baseLoadingDistance
    ) {
      const available = Math.floor(state.base.stock ?? 0);
      if (available >= INVADERS_CONFIG.supplyShips.capacity) {
        state.base.stock = available - INVADERS_CONFIG.supplyShips.capacity;
        ship.supplies = INVADERS_CONFIG.supplyShips.capacity;
      }
    }
  } else {
    let target = state.ships.find(
      (defender) => defender.id === ship.resupplyTargetId && defender.hp > 0,
    );
    if (
      !target ||
      target.supplies >= INVADERS_CONFIG.supplyShips.targetSupplyCapacity
    ) {
      target = state.ships.reduce<Ship | undefined>(
        (lowest, defender) => {
          if (
            defender.supplies >=
            INVADERS_CONFIG.supplyShips.targetSupplyCapacity
          )
            return lowest;
          return !lowest || defender.supplies < lowest.supplies
            ? defender
            : lowest;
        },
        undefined,
      );
      ship.resupplyTargetId = target?.id;
    }

    if (target) {
      ship.target = { ...target.pos };
      if (
        distance(ship.pos, target.pos) <=
        INVADERS_CONFIG.supplyShips.deliveryDistance
      ) {
        const transferred = Math.min(
          ship.supplies,
          INVADERS_CONFIG.supplyShips.targetSupplyCapacity - target.supplies,
        );
        if (transferred > 0) {
          target.supplies += transferred;
          ship.supplies -= transferred;
          if (ship.supplies <= 0) ship.resupplyTargetId = undefined;
        }
      }
    } else {
      ship.target = { ...state.base.pos };
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
    [UpgradeType.Regeneration]: 0,
  };
}
