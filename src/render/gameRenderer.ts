import { COLORS } from "../game/constants";
import { formationSlotHeadings, formationSlots } from "../game/formations";
import { clamp } from "../game/math";
import { drawGameBackground } from "./backgroundRenderer";
import { drawFiringRangeCones, drawShips } from "./shipRenderer";
import { BodyKind, ShipRole, Side } from "../game/types";
import type { Body, GameState, Ship, Vec, Viewport } from "../game/types";

type RenderContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  status: HTMLElement;
  viewport: Viewport;
};

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): Viewport {
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  canvas.width = viewport.width * pixelRatio;
  canvas.height = viewport.height * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return viewport;
}

export function renderGame(
  state: GameState,
  renderContext: RenderContext,
): void {
  const { context, viewport } = renderContext;
  drawGameBackground(context, viewport, state.bodies);
  drawBodies(context, state);
  drawFormationPreview(context, state);
  drawProjectiles(context, state);
  drawFiringRangeCones(context, state.ships);
  drawShips(context, state.ships);
  updateStatus(renderContext.status, state);
}

function drawBodies(context: CanvasRenderingContext2D, state: GameState): void {
  for (const body of state.bodies) {
    context.save();
    context.translate(body.pos.x, body.pos.y);

    if (body.kind === BodyKind.Asteroids) {
      for (let index = 0; index < 15; index++) {
        const angle = index * 0.9;
        const radius = body.radius * (0.3 + (index % 3) * 0.22);
        context.fillStyle = "#78818b";
        context.beginPath();
        context.arc(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          3 + (index % 4),
          0,
          7,
        );
        context.fill();
      }
    } else {
      const glow = context.createRadialGradient(
        -body.radius * 0.3,
        -body.radius * 0.3,
        2,
        0,
        0,
        body.radius * 1.7,
      );
      glow.addColorStop(0, `hsla(${body.hue},80%,80%,.95)`);
      glow.addColorStop(0.45, `hsla(${body.hue},75%,42%,.9)`);
      glow.addColorStop(1, `hsla(${body.hue},75%,30%,0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(0, 0, body.radius * 1.7, 0, 7);
      context.fill();
      context.fillStyle = "hsl(" + body.hue + ",65%,42%)";
      context.beginPath();
      context.arc(0, 0, body.radius, 0, Math.PI * 2);
      context.fill();
      drawPlanetSupplies(context, body);

      if (body.base) {
        context.strokeStyle = COLORS[body.base];
        context.lineWidth = 2;
        context.beginPath();
        context.arc(0, 0, body.radius, 0, Math.PI * 2);
        context.stroke();
      }
      if (body.capturingSide && body.captureProgress) {
        context.strokeStyle = COLORS[body.capturingSide];
        context.lineWidth = 3;
        context.beginPath();
        context.arc(
          0,
          0,
          body.radius + 6,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * body.captureProgress,
        );
        context.stroke();
      }
    }
    context.restore();
  }
}

function drawPlanetSupplies(
  context: CanvasRenderingContext2D,
  body: Body,
): void {
  const supplyCount = Math.floor(body.stock ?? 0);
  if (supplyCount <= 0) return;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const markerRadius = Math.max(
    0.75,
    Math.min(2, body.radius / (Math.sqrt(supplyCount) * 3)),
  );
  const usableRadius = body.radius - markerRadius * 3;
  context.strokeStyle = body.base ? COLORS[body.base] : "#e4ff91";
  context.lineWidth = Math.max(0.75, markerRadius * 0.65);

  for (let index = 0; index < supplyCount; index++) {
    const angle = index * goldenAngle;
    const radius = usableRadius * Math.sqrt((index + 0.5) / supplyCount);
    context.beginPath();
    context.arc(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      markerRadius,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
}

function drawFormationPreview(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  const center =
    state.previewCenter ?? state.destination ?? state.command ?? state.pointer;
  if (!center) return;
  const rotation = state.previewCenter
    ? state.previewRotation
    : state.formationRotation;
  const slots = formationSlots(
    center,
    state.selectedFormation,
    state.config.ships,
    clamp(
      80 - (state.previewCenter ? state.previewCohesion : state.cohesion) * 50,
      25,
      70,
    ),
    rotation,
  );
  const headings = formationSlotHeadings(
    state.selectedFormation,
    state.config.ships,
    rotation,
  );
  context.strokeStyle = "#62e8ff66";
  context.setLineDash([5, 5]);
  context.beginPath();
  context.arc(center.x, center.y, 10, 0, 7);
  context.stroke();
  context.setLineDash([]);
  for (const [index, slot] of slots.entries()) {
    context.save();
    context.translate(slot.x, slot.y);
    context.rotate(Math.atan2(headings[index].y, headings[index].x));
    context.fillStyle = "#62e8ff99";
    context.beginPath();
    context.moveTo(7, 0);
    context.lineTo(-5, -4);
    context.lineTo(-2, 0);
    context.lineTo(-5, 4);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function drawProjectiles(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  for (const projectile of state.projectiles) {
    drawLaser(context, projectile.pos, projectile.vel, COLORS[projectile.side]);
  }
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

function updateStatus(status: HTMLElement, state: GameState): void {
  const playerShips = state.ships.filter(
    (ship) => ship.side === Side.Player,
  ).length;
  const enemyShips = state.ships.filter(
    (ship) => ship.side === Side.Enemy,
  ).length;
  status.innerHTML = `<span style="color:#5de5ff">◈ ${playerShips} FLEET</span><br><span style="color:#ff7898">◇ ${enemyShips} HOSTILES</span>`;
}
