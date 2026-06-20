import { COLORS } from "../game/constants";
import { formationSlots } from "../game/formations";
import { clamp } from "../game/math";
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
  drawBackground(context, viewport, state.bodies);
  drawBodies(context, state);
  drawFormationPreview(context, state);
  drawProjectiles(context, state);
  drawShips(context, state);
  updateStatus(renderContext.status, state);
  drawWinner(context, state, viewport);
}

function drawBackground(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  bodies: Body[],
): void {
  context.fillStyle = "#020a06";
  context.fillRect(0, 0, viewport.width, viewport.height);

  const gradient = context.createRadialGradient(
    viewport.width * 0.53,
    viewport.height * 0.48,
    30,
    viewport.width * 0.53,
    viewport.height * 0.48,
    Math.max(viewport.width, viewport.height) * 0.7,
  );
  gradient.addColorStop(0, "#0b2a1b");
  gradient.addColorStop(1, "#020a06");
  context.fillStyle = gradient;
  context.fillRect(0, 0, viewport.width, viewport.height);

  drawGeodesicGrid(context, viewport, bodies);
}

function drawGeodesicGrid(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  bodies: Body[],
): void {
  const gridSpacing = 20;
  const sampleSpacing = 8;
  context.strokeStyle = "#67f7a166";
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
    state.selectedFormation,
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

function drawProjectiles(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  for (const projectile of state.projectiles) {
    context.fillStyle = COLORS[projectile.side];
    context.globalAlpha = projectile.life / projectile.maxLife;
    context.beginPath();
    context.arc(projectile.pos.x, projectile.pos.y, 3, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }
}

function drawShips(context: CanvasRenderingContext2D, state: GameState): void {
  for (const ship of state.ships) {
    const fillHeight = ship.role === ShipRole.Supply ? 10 : 18;
    const bottom = ship.role === ShipRole.Supply ? 5 : 8;
    const health = Math.max(0, Math.min(1, ship.hp / ship.maxHp));

    context.save();
    context.translate(ship.pos.x, ship.pos.y);
    context.rotate(Math.atan2(ship.vel.y, ship.vel.x) + Math.PI / 2);
    context.beginPath();
    if (ship.role === ShipRole.Supply) {
      context.rect(-5, -5, 10, 10);
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
