import { formationSlots } from "../game/formations";
import { BodyKind, Formation, ShipRole, Side } from "../game/types";
import type { Formation as FormationType, Ship, Viewport } from "../game/types";
import type { InvadersState } from "./types";

const FLEET_SIZE = 7;
const ENEMY_FLEET_Y = 105;
const PLANET_BOTTOM_OFFSET = 130;
const ENEMY_FLEET_SPEED = 20;
const PLAYER_FLEET_BOTTOM_OFFSET = 220;

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
  state.wave = 1;
  state.waveOffset = 0;
  state.nextShipId = 1;
  state.winner = null;
  state.ships = createFleet(
    Side.Player,
    playerFleetCenter(viewport),
    state.formation,
    state,
  );
  state.enemies = createFleet(
    Side.Enemy,
    { x: viewport.width / 2, y: ENEMY_FLEET_Y },
    Formation.Line,
    state,
  );
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
  state.waveOffset += ENEMY_FLEET_SPEED * elapsed;
  const enemySlots = formationSlots(
    { x: viewport.width / 2, y: ENEMY_FLEET_Y + state.waveOffset },
    Formation.Line,
    state.enemies.length,
    34,
  );
  state.enemies.forEach((ship, index) => {
    ship.pos = { ...enemySlots[index] };
    ship.vel = { x: 0, y: ENEMY_FLEET_SPEED };
  });

  const slots = formationSlots(
    playerFleetCenter(viewport),
    state.formation,
    state.ships.length,
    32,
  );
  state.ships.forEach((ship, index) => {
    ship.pos = { ...slots[index] };
    ship.vel = { x: 0, y: 0 };
  });
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
  state: InvadersState,
): Ship[] {
  return formationSlots(center, formation, FLEET_SIZE, 34).map((pos) => ({
    id: state.nextShipId++,
    side,
    role: ShipRole.Battleship,
    pos,
    vel: { x: 0, y: 0 },
    hp: 30,
    maxHp: 30,
    attack: 10,
    defense: 0,
    speed: 0,
    sight: 0,
    moral: 100,
    supplies: 0,
    range: 0,
    cooldown: 0,
  }));
}
