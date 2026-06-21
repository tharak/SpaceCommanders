import { COLORS } from "../game/constants";
import { Side } from "../game/types";
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
  drawPlanet(context, state);
  drawShips(context, state.ships);
  drawShips(context, state.enemies);
  for (const projectile of state.projectiles) {
    drawLaser(context, projectile.pos, projectile.vel, COLORS[projectile.side]);
  }
  status.innerHTML = `<span style="color:#5de5ff">◈ DEFENSE FLEET</span><br><span style="color:#91c9de">PLANET READY</span>`;
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

function drawPlanet(
  context: CanvasRenderingContext2D,
  state: InvadersState,
): void {
  const { planet } = state;
  context.save();
  context.translate(planet.pos.x, planet.pos.y);
  context.fillStyle = "hsl(195,65%,42%)";
  context.beginPath();
  context.arc(0, 0, planet.radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = COLORS[Side.Player];
  context.lineWidth = 3;
  context.beginPath();
  context.arc(
    0,
    0,
    planet.radius + 7,
    -Math.PI / 2,
    -Math.PI / 2 + (Math.PI * 2 * state.planetHp) / 100,
  );
  context.stroke();
  context.restore();
}

function drawShips(
  context: CanvasRenderingContext2D,
  ships: InvadersState["ships"],
): void {
  for (const ship of ships) {
    context.save();
    context.translate(ship.pos.x, ship.pos.y);
    context.fillStyle = COLORS[ship.side];
    context.beginPath();
    context.moveTo(0, ship.side === Side.Player ? -9 : 9);
    context.lineTo(7, ship.side === Side.Player ? 8 : -8);
    context.lineTo(-7, ship.side === Side.Player ? 8 : -8);
    context.closePath();
    context.fill();
    context.restore();
  }
}
