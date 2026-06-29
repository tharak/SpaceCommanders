import { FIRING_CONE_HALF_ANGLE } from "../game/combat";
import { GAME_CONFIG } from "../game/config";
import { COLORS } from "../game/constants";
import { Battleship, ShipRole, Side } from "../game/types";
import type { Ship } from "../game/types";

export function drawShips(
  context: CanvasRenderingContext2D,
  ships: Ship[],
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
    context.fillStyle = COLORS[ship.side];
    context.fillRect(
      -render.healthBarWidth / 2,
      bottom - fillHeight * health,
      render.healthBarWidth,
      fillHeight * health,
    );
    context.restore();

    context.strokeStyle = COLORS[ship.side];
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();

    drawSupplyMarkers(context, ship, scale);
  }
}

function drawSupplyMarkers(
  context: CanvasRenderingContext2D,
  ship: Ship,
  scale: number,
): void {
  const supplyCount = Math.floor(ship.supplies);
  if (supplyCount <= 0) return;

  const markerRadius = 18 * scale;
  context.strokeStyle = ship.side === Side.Player ? "#9af4ff" : "#ffadc1";
  context.lineWidth = 1.25;
  for (let index = 0; index < supplyCount; index++) {
    const angle = (index / supplyCount) * Math.PI * 2 - Math.PI / 2;
    context.beginPath();
    context.arc(
      ship.pos.x + Math.cos(angle) * markerRadius,
      ship.pos.y + Math.sin(angle) * markerRadius,
      2 * scale,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
}

export function drawFiringRangeCones(
  context: CanvasRenderingContext2D,
  ships: Ship[],
): void {
  for (const ship of ships) {
    if (!(ship instanceof Battleship)) continue;
    const gunHeading = ship.gun.heading(ship.heading);
    const angle = Math.atan2(gunHeading.y, gunHeading.x);
    context.save();
    context.translate(ship.pos.x, ship.pos.y);
    context.fillStyle = `${COLORS[ship.side]}18`;
    context.strokeStyle = `${COLORS[ship.side]}66`;
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
