import type { Body, Vec, Viewport } from "../game/types";

export function drawGameBackground(
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
