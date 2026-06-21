import { COLORS } from "../game/constants";
import { ShipRole, Side } from "../game/types";
import type { Ship } from "../game/types";

export function drawShips(
  context: CanvasRenderingContext2D,
  ships: Ship[],
): void {
  for (const ship of ships) {
    const fillHeight = ship.role === ShipRole.Supply ? 10 : 18;
    const bottom = ship.role === ShipRole.Supply ? 5 : 8;
    const health = Math.max(0, Math.min(1, ship.hp / ship.maxHp));

    context.save();
    context.translate(ship.pos.x, ship.pos.y);
    context.rotate(Math.atan2(ship.heading.y, ship.heading.x) + Math.PI / 2);
    context.beginPath();
    if (ship.role === ShipRole.Supply) {
      context.rect(-5, -5, 10, 10);
    } else if (ship.role === ShipRole.Guard) {
      context.moveTo(0, -10);
      context.lineTo(8, -6);
      context.lineTo(6, 5);
      context.lineTo(0, 10);
      context.lineTo(-6, 5);
      context.lineTo(-8, -6);
      context.closePath();
    } else {
      context.moveTo(0, -10);
      context.lineTo(7, 8);
      context.lineTo(0, 5);
      context.lineTo(-7, 8);
      context.closePath();
    }

    context.save();
    context.clip();
    context.fillStyle = COLORS[ship.side];
    context.fillRect(
      -10,
      bottom - fillHeight * health,
      20,
      fillHeight * health,
    );
    context.restore();

    context.strokeStyle = COLORS[ship.side];
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();

    drawSupplyMarkers(context, ship);
  }
}

function drawSupplyMarkers(
  context: CanvasRenderingContext2D,
  ship: Ship,
): void {
  const supplyCount = Math.floor(ship.supplies);
  if (supplyCount <= 0) return;

  const markerRadius = 18;
  context.strokeStyle = ship.side === Side.Player ? "#9af4ff" : "#ffadc1";
  context.lineWidth = 1.25;
  for (let index = 0; index < supplyCount; index++) {
    const angle = (index / supplyCount) * Math.PI * 2 - Math.PI / 2;
    context.beginPath();
    context.arc(
      ship.pos.x + Math.cos(angle) * markerRadius,
      ship.pos.y + Math.sin(angle) * markerRadius,
      2,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
}
