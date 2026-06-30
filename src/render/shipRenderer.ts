import { FIRING_CONE_HALF_ANGLE } from "../game/combat";
import { GAME_CONFIG } from "../game/config";
import { COLORS } from "../game/constants";
import { Battleship, ShipRole } from "../game/types";
import type { Ship } from "../game/types";

type FleetColorMap = Record<string, string>;

export function drawShips(
  context: CanvasRenderingContext2D,
  ships: Ship[],
  fleetColors: FleetColorMap = {},
): void {
  const scale = mobileShipScale();
  for (const ship of ships) {
    const render =
      ship.role === ShipRole.Supply
        ? GAME_CONFIG.supply.render
        : GAME_CONFIG.ship.render;
    const fillHeight = render.fillHeight;
    const bottom = render.bottom;
    const health = Math.max(0, Math.min(1, ship.hp / ship.maxHp));

    context.save();
    context.translate(ship.pos.x, ship.pos.y);
    context.scale(scale, scale);
    context.rotate(Math.atan2(ship.heading.y, ship.heading.x) + Math.PI / 2);
    context.beginPath();
    if (ship.role === ShipRole.Supply) {
      const halfSize = GAME_CONFIG.supply.render.size / 2;
      context.rect(
        -halfSize,
        -halfSize,
        GAME_CONFIG.supply.render.size,
        GAME_CONFIG.supply.render.size,
      );
    } else if (ship.role === ShipRole.Guard) {
      const {
        noseY,
        tailY,
        tailNotchY,
        guardWingX,
        guardInnerWingX,
        guardShoulderY,
      } = GAME_CONFIG.ship.render;
      context.moveTo(0, noseY);
      context.lineTo(guardWingX, guardShoulderY);
      context.lineTo(guardInnerWingX, tailNotchY);
      context.lineTo(0, tailY);
      context.lineTo(-guardInnerWingX, tailNotchY);
      context.lineTo(-guardWingX, guardShoulderY);
      context.closePath();
    } else {
      const { noseY, wingX, tailY, tailNotchY } = GAME_CONFIG.ship.render;
      context.moveTo(0, noseY);
      context.lineTo(wingX, tailY);
      context.lineTo(0, tailNotchY);
      context.lineTo(-wingX, tailY);
      context.closePath();
    }

    context.save();
    context.clip();
    context.fillStyle = shipColor(ship, fleetColors);
    context.fillRect(
      -render.healthBarWidth / 2,
      bottom - fillHeight * health,
      render.healthBarWidth,
      fillHeight * health,
    );
    context.restore();

    context.strokeStyle = shipColor(ship, fleetColors);
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();

    drawSupplyMarkers(context, ship, scale, fleetColors);
  }
}

function drawSupplyMarkers(
  context: CanvasRenderingContext2D,
  ship: Ship,
  scale: number,
  fleetColors: FleetColorMap,
): void {
  const supplyCount = Math.floor(ship.supplies);
  if (supplyCount <= 0) return;

  const rear = { x: -ship.heading.x, y: -ship.heading.y };
  const side = { x: -ship.heading.y, y: ship.heading.x };
  const markerSize = Math.max(1, 1.5 * scale);
  const markerGap = 2 * scale;
  const trailOffset = 9 * scale;
  const rowGap = 3 * scale;
  const columns = Math.min(5, supplyCount);

  context.fillStyle = shipColor(ship, fleetColors);

  for (let index = 0; index < supplyCount; index++) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const lateral = (column - (columns - 1) / 2) * (markerSize + markerGap);
    const trailing = trailOffset + row * rowGap;
    const center = {
      x: ship.pos.x + rear.x * trailing + side.x * lateral,
      y: ship.pos.y + rear.y * trailing + side.y * lateral,
    };
    context.fillRect(
      center.x - markerSize / 2,
      center.y - markerSize / 2,
      markerSize,
      markerSize,
    );
  }
}

function shipColor(ship: Ship, fleetColors: FleetColorMap): string {
  return fleetColors[ship.fleetId] ?? COLORS[ship.side];
}

export function drawFiringRangeCones(
  context: CanvasRenderingContext2D,
  ships: Ship[],
  fleetColors: FleetColorMap = {},
): void {
  for (const ship of ships) {
    if (!(ship instanceof Battleship)) continue;
    const gunHeading = ship.gun.heading(ship.heading);
    const angle = Math.atan2(gunHeading.y, gunHeading.x);
    context.save();
    context.translate(ship.pos.x, ship.pos.y);
    context.fillStyle = `${shipColor(ship, fleetColors)}18`;
    context.strokeStyle = `${shipColor(ship, fleetColors)}66`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(
      0,
      0,
      ship.gun.range,
      angle - FIRING_CONE_HALF_ANGLE,
      angle + FIRING_CONE_HALF_ANGLE,
    );
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
}

function mobileShipScale(): number {
  return Math.min(1, Math.max(0.65, window.innerWidth / 600));
}
