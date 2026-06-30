import { GAME_CONFIG } from "../game-settings";
import { COLORS } from "../constants";
import { hasLineOfSight, isTargetForward } from "./combat";
import { clamp, distance, normalize } from "../utils";
import { FireMode, Side } from "../types";
import type { Battleship, GameState, GunConfig, Ship, Vec } from "../types";

export class Gun {
  attack: number;
  range: number;
  cooldownDuration: number;
  cooldown: number;
  private relativeAngle = 0;

  constructor(config: GunConfig) {
    this.attack = config.attack;
    this.range = config.range;
    this.cooldownDuration = config.cooldown;
    this.cooldown = config.initialCooldown;
  }

  update(deltaTime: number): void {
    this.cooldown -= deltaTime;
  }

  heading(shipHeading: Vec): Vec {
    const shipAngle = Math.atan2(shipHeading.y, shipHeading.x);
    const angle = shipAngle + this.relativeAngle;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  aimAt(position: Vec, shipHeading: Vec, target: Vec): void {
    const targetDirection = normalize({
      x: target.x - position.x,
      y: target.y - position.y,
    });
    this.relativeAngle =
      Math.atan2(targetDirection.y, targetDirection.x) -
      Math.atan2(shipHeading.y, shipHeading.x);
  }

  fire(state: GameState, ship: Battleship): void {
    const targets = state.ships.filter(
      (candidate) =>
        candidate.side !== ship.side &&
        isTargetForward(
          { pos: ship.pos, heading: this.heading(ship.heading) },
          candidate.pos,
        ) &&
        distance(candidate.pos, ship.pos) < this.range &&
        hasLineOfSight(
          ship,
          candidate.pos,
          state.ships,
          state.bodies,
          candidate,
        ),
    );
    const canFire =
      ship.supplies >= 1 &&
      this.cooldown <= 0 &&
      targets.length > 0 &&
      (ship.side === Side.Enemy || state.fireMode !== FireMode.Hold);
    if (!canFire) return;

    let target = nearestTarget(ship, targets);
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

    const bonus =
      ship.side === Side.Player && state.formation === state.captainFavorite
        ? GAME_CONFIG.combat.favoriteFormationDamageMultiplier
        : 1;
    target.hp -= Math.max(
      GAME_CONFIG.combat.minimumDamage,
      this.attack * bonus - target.defense,
    );
    target.moral = clamp(
      target.moral - GAME_CONFIG.combat.moraleDamage,
      0,
      GAME_CONFIG.combat.maximumMorale,
    );
    ship.supplies--;
    this.cooldown = this.cooldownDuration;
    this.spawnProjectile(state, ship, target);
  }

  private spawnProjectile(
    state: GameState,
    ship: Battleship,
    target: Ship,
  ): void {
    const direction = normalize({
      x: target.pos.x - ship.pos.x,
      y: target.pos.y - ship.pos.y,
    });
    state.projectiles.push({
      pos: { ...ship.pos },
      vel: {
        x: direction.x * GAME_CONFIG.projectile.speed,
        y: direction.y * GAME_CONFIG.projectile.speed,
      },
      side: ship.side,
      color: state.fleets[ship.fleetId]?.color ?? COLORS[ship.side],
      sourceShipId: ship.id,
    });
  }
}

function nearestTarget(ship: Battleship, targets: Ship[]): Ship {
  return targets.reduce((closest, candidate) =>
    distance(candidate.pos, ship.pos) < distance(closest.pos, ship.pos)
      ? candidate
      : closest,
  );
}
