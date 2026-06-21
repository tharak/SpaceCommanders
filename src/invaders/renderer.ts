import { COLORS } from "../game/constants";
import { Side } from "../game/types";
import { drawFiringRangeCones, drawShips } from "../render/shipRenderer";
import type { Vec } from "../game/types";
import type { InvadersRenderContext, InvadersState } from "./types";

export function renderInvaders(
  state: InvadersState,
  renderContext: InvadersRenderContext,
): void {
  const { context, viewport, status } = renderContext;
  context.fillStyle = "#020a06";
  context.fillRect(0, 0, viewport.width, viewport.height);
  drawStars(context, viewport);
  drawBase(context, state);
  drawFiringRangeCones(context, [...state.ships, ...state.enemies]);
  drawShips(context, state.ships);
  drawShips(context, state.enemies);
  for (const projectile of state.projectiles) {
    drawLaser(context, projectile.pos, projectile.vel, COLORS[projectile.side]);
  }
  status.innerHTML = `<span style="color:#5de5ff">◈ DEFENSE FLEET</span><br><span style="color:#91c9de">BASE ${Math.ceil(state.baseHp)}% · WAVE ${state.wave}</span>`;
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

function drawStars(
  context: CanvasRenderingContext2D,
  viewport: { width: number; height: number },
): void {
  context.fillStyle = "#16412c";
  for (let index = 0; index < 60; index++) {
    const x = (index * 137) % viewport.width;
    const y = (index * 83) % viewport.height;
    context.fillRect(x, y, 1, 1);
  }
}

function drawBase(
  context: CanvasRenderingContext2D,
  state: InvadersState,
): void {
  const { base } = state;
  context.save();
  context.translate(base.pos.x, base.pos.y);
  context.fillStyle = "#0b2a3a";
  context.strokeStyle = COLORS[Side.Player];
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < 6; index++) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 3;
    const x = Math.cos(angle) * base.radius;
    const y = Math.sin(angle) * base.radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#5de5ff66";
  context.fillRect(-base.radius * 0.45, -4, base.radius * 0.9, 8);
  context.strokeStyle = COLORS[Side.Player];
  context.lineWidth = 3;
  context.beginPath();
  context.arc(
    0,
    0,
    base.radius + 7,
    -Math.PI / 2,
    -Math.PI / 2 + (Math.PI * 2 * state.baseHp) / 100,
  );
  context.stroke();
  context.restore();
}
