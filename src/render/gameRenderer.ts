import { COLORS } from "../game/constants";
import { formationSlots } from "../game/formations";
import { clamp } from "../game/math";
import { BodyKind, Side } from "../game/types";
import type { Body, GameState, Vec, Viewport } from "../game/types";

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
  drawBackground(context, viewport, state.bodies);
  drawBodies(context, state);
  drawFormationPreview(context, state);
  drawFlashes(context, state);
  drawShips(context, state);
  updateStatus(renderContext.status, state);
  drawWinner(context, state, viewport);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  bodies: Body[],
): void {
  context.fillStyle = "#030711";
  context.fillRect(0, 0, viewport.width, viewport.height);

  const gradient = context.createRadialGradient(
    viewport.width * 0.53,
    viewport.height * 0.48,
    30,
    viewport.width * 0.53,
    viewport.height * 0.48,
    Math.max(viewport.width, viewport.height) * 0.7,
  );
  gradient.addColorStop(0, "#0a2435");
  gradient.addColorStop(1, "#030711");
  context.fillStyle = gradient;
  context.fillRect(0, 0, viewport.width, viewport.height);

  drawGeodesicGrid(context, viewport, bodies);
}

function drawGeodesicGrid(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  bodies: Body[],
): void {
  const gridSpacing = 72;
  const sampleSpacing = 12;
  context.strokeStyle = "#5bd8ff66";
  context.lineWidth = 1.2;

  for (
    let x = -gridSpacing;
    x <= viewport.width + gridSpacing;
    x += gridSpacing
  ) {
    drawWarpedLine(
      context,
      { x, y: -gridSpacing },
      { x, y: viewport.height + gridSpacing },
      sampleSpacing,
      bodies,
    );
  }

  for (
    let y = -gridSpacing;
    y <= viewport.height + gridSpacing;
    y += gridSpacing
  ) {
    drawWarpedLine(
      context,
      { x: -gridSpacing, y },
      { x: viewport.width + gridSpacing, y },
      sampleSpacing,
      bodies,
    );
  }
}

function drawWarpedLine(
  context: CanvasRenderingContext2D,
  start: Vec,
  end: Vec,
  sampleSpacing: number,
  bodies: Body[],
): void {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const steps = Math.ceil(length / sampleSpacing);
  context.beginPath();

  for (let index = 0; index <= steps; index++) {
    const progress = index / steps;
    const point = warpPoint(
      {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      },
      bodies,
    );
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function warpPoint(point: Vec, bodies: Body[]): Vec {
  const warped = { ...point };

  for (const body of bodies) {
    const offsetX = body.pos.x - point.x;
    const offsetY = body.pos.y - point.y;
    const distanceSquared = offsetX * offsetX + offsetY * offsetY;
    const softening = body.radius * body.radius;
    const distance = Math.sqrt(distanceSquared) || 1;
    const pull = Math.min(
      body.radius * 1.25,
      (body.weight * body.radius * 900) / (distanceSquared + softening),
    );

    warped.x += (offsetX / distance) * pull;
    warped.y += (offsetY / distance) * pull;
  }

  return warped;
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
      context.fillStyle = `hsl(${body.hue},65%,42%)`;
      context.beginPath();
      context.arc(0, 0, body.radius, 0, 7);
      context.fill();

      if (body.base) {
        context.strokeStyle = COLORS[body.base];
        context.lineWidth = 2;
        context.beginPath();
        context.arc(0, 0, body.radius + 6, 0, 7);
        context.stroke();
      }
    }
    context.restore();
  }
}

function drawFormationPreview(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  const center = state.previewCenter ?? state.command ?? state.pointer;
  if (!center) return;
  const slots = formationSlots(
    center,
    state.formation,
    state.config.ships,
    clamp(80 - state.cohesion * 50, 25, 70),
    state.previewCenter ? state.previewRotation : state.formationRotation,
  );
  context.strokeStyle = "#62e8ff66";
  context.setLineDash([5, 5]);
  context.beginPath();
  context.arc(center.x, center.y, 10, 0, 7);
  context.stroke();
  context.setLineDash([]);
  for (const slot of slots) {
    context.fillStyle = "#62e8ff77";
    context.beginPath();
    context.arc(slot.x, slot.y, 5, 0, 7);
    context.fill();
  }
}

function drawFlashes(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  for (const flash of state.flashes) {
    context.strokeStyle = flash.side === Side.Player ? "#8df6ff" : "#ff86a3";
    context.globalAlpha = flash.life / 0.12;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(flash.from.x, flash.from.y);
    context.lineTo(flash.to.x, flash.to.y);
    context.stroke();
    context.globalAlpha = 1;
  }
}

function drawShips(context: CanvasRenderingContext2D, state: GameState): void {
  for (const ship of state.ships) {
    context.save();
    context.translate(ship.pos.x, ship.pos.y);
    context.rotate(Math.atan2(ship.vel.y, ship.vel.x) + Math.PI / 2);
    context.fillStyle = COLORS[ship.side];
    context.beginPath();
    context.moveTo(0, -10);
    context.lineTo(7, 8);
    context.lineTo(0, 5);
    context.lineTo(-7, 8);
    context.closePath();
    context.fill();
    context.restore();

    context.fillStyle = "#000a";
    context.fillRect(ship.pos.x - 11, ship.pos.y - 17, 22, 3);
    context.fillStyle = ship.side === Side.Player ? "#69eaff" : "#ff6e91";
    context.fillRect(
      ship.pos.x - 11,
      ship.pos.y - 17,
      22 * (ship.hp / ship.maxHp),
      3,
    );
    if (ship.side === Side.Player) {
      context.fillStyle = "#c9efff";
      context.font = "10px Rajdhani";
      context.fillText(
        `${Math.floor(ship.supplies)}`,
        ship.pos.x + 9,
        ship.pos.y + 8,
      );
    }
  }
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

function drawWinner(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewport: Viewport,
): void {
  if (!state.winner) return;

  context.fillStyle = "#03101ad9";
  context.fillRect(0, 0, viewport.width, viewport.height);
  context.fillStyle = state.winner === Side.Player ? "#6eeeff" : "#ff7797";
  context.textAlign = "center";
  context.font = "700 42px Barlow Condensed";
  context.fillText(
    state.winner === Side.Player
      ? "ENEMY BASE DESTROYED"
      : "COMMAND FLEET LOST",
    viewport.width / 2,
    viewport.height / 2,
  );
  context.font = "600 16px Rajdhani";
  context.fillText(
    "Use the debug reset control to run another simulation",
    viewport.width / 2,
    viewport.height / 2 + 32,
  );
  context.textAlign = "left";
}
