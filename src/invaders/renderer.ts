import { COLORS } from "../game/constants";
import { TEXT } from "../ui/strings";
import { Side } from "../game/types";
import { drawGameBackground } from "../render/backgroundRenderer";
import { drawDesiredPositionMarkers, drawFiringRangeCones, drawShips } from "../render/shipRenderer";
import type { Vec } from "../game/types";
import type { InvadersRenderContext, InvadersState } from "./types";

export function renderInvaders(
  state: InvadersState,
  renderContext: InvadersRenderContext,
): void {
  const { context, viewport, status, countdown } = renderContext;
  drawGameBackground(context, viewport, [state.base]);
  drawBase(context, state, viewport);
  const fleetColors = fleetColorMap(state);
  drawDesiredPositionMarkers(context, [...state.ships, ...state.supplyShips, ...state.enemies], fleetColors);
  drawFiringRangeCones(context, [...state.ships, ...state.enemies], fleetColors);
  drawShips(context, state.ships, fleetColors);
  drawShips(context, state.supplyShips, fleetColors);
  drawShips(context, state.enemies, fleetColors);
  for (const projectile of state.projectiles) {
    drawLaser(context, projectile.pos, projectile.vel, projectile.color);
  }
  status.innerHTML = TEXT.status.defense(Math.floor(state.score));
  countdown.innerHTML =
    state.enemyDeploymentCountdown > 0
      ? `WAVE ${state.wave}<br><span>${Math.ceil(state.enemyDeploymentCountdown)}</span>`
      : "";
  countdown.classList.toggle("active", state.enemyDeploymentCountdown > 0);
}

function fleetColorMap(state: InvadersState): Record<string, string> {
  return Object.fromEntries(
    Object.values(state.fleets).map((fleet) => [fleet.id, fleet.color]),
  );
}

function drawLaser(
  context: CanvasRenderingContext2D,
  position: Vec,
  velocity: Vec,
  color: string,
): void {
  context.save();
  context.translate(position.x, position.y);
  context.rotate(Math.atan2(velocity.y, velocity.x));
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 8;
  context.fillRect(-7, -1.5, 14, 3);
  context.restore();
}

function drawBase(
  context: CanvasRenderingContext2D,
  state: InvadersState,
  viewport: { width: number; height: number },
): void {
  const { base } = state;
  context.save();
  context.translate(base.pos.x, base.pos.y);
  const width = viewport.width;
  const height = base.radius;
  context.fillStyle = "#0b2a3a";
  context.strokeStyle = COLORS[Side.Player];
  context.lineWidth = 2;
  context.fillRect(-width / 2, -height / 2, width, height);
  context.strokeRect(-width / 2, -height / 2, width, height);
  context.fillStyle = "#5de5ff66";
  context.fillRect(-width / 2, -4, width, 8);
  drawBaseSupplies(context, state);
  const health = state.baseHp / state.baseMaxHp;
  context.fillStyle = "#031017";
  context.fillRect(-width / 2, -height / 2 - 9, width, 5);
  context.fillStyle = COLORS[Side.Player];
  context.fillRect(-width / 2, -height / 2 - 9, width * health, 5);
  context.fillStyle = "#dfffff";
  context.font = "700 12px Barlow Condensed, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(`${Math.ceil(health * 100)}%`, 0, -height / 2 + 3);
  context.restore();
}

function drawBaseSupplies(
  context: CanvasRenderingContext2D,
  state: InvadersState,
): void {
  const supplyCapacity = state.baseSupplyCapacity;
  const supplyCount = Math.min(
    supplyCapacity,
    Math.floor(state.base.stock ?? 0),
  );
  const markerRadius = 2;
  const markerSpacing = 9;
  const firstMarkerX = -((supplyCapacity - 1) * markerSpacing) / 2;

  for (let index = 0; index < supplyCapacity; index++) {
    const x = firstMarkerX + index * markerSpacing;
    context.beginPath();
    context.arc(x, 12, markerRadius, 0, Math.PI * 2);
    if (index < supplyCount) {
      context.fillStyle = "#e4ff91";
      context.fill();
    } else {
      context.strokeStyle = "#e4ff9166";
      context.lineWidth = 1;
      context.stroke();
    }
  }
}
