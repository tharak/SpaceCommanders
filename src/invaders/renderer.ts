import { COLORS } from "../game/constants";
import { TEXT } from "../ui/strings";
import { Side } from "../game/types";
import { drawGameBackground } from "../render/backgroundRenderer";
import { drawFiringRangeCones, drawShips } from "../render/shipRenderer";
import type { Vec } from "../game/types";
import type { InvadersRenderContext, InvadersState } from "./types";

export function renderInvaders(
  state: InvadersState,
  renderContext: InvadersRenderContext,
): void {
  const { context, viewport, status } = renderContext;
  drawGameBackground(context, viewport, [state.base]);
  drawBase(context, state, viewport);
  drawFiringRangeCones(context, [...state.ships, ...state.enemies]);
  drawShips(context, state.ships);
  drawShips(context, [state.supplyShip]);
  drawShips(context, state.enemies);
  for (const projectile of state.projectiles) {
    drawLaser(context, projectile.pos, projectile.vel, COLORS[projectile.side]);
  }
  status.innerHTML = TEXT.status.defense(
    Math.floor(state.score),
    Math.ceil(state.baseHp),
    Math.floor(state.base.stock ?? 0),
    state.wave,
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
  const health = state.baseHp / state.baseMaxHp;
  context.fillStyle = "#031017";
  context.fillRect(-width / 2, -height / 2 - 9, width, 5);
  context.fillStyle = COLORS[Side.Player];
  context.fillRect(-width / 2, -height / 2 - 9, width * health, 5);
  context.restore();
}
