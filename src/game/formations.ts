import { GAME_CONFIG } from "./config";
import { Formation } from "./types";
import type { Vec } from "./types";

export function formationSpacing(cohesion = 1): number {
  return Math.max(
    GAME_CONFIG.formation.spacing * cohesion,
    minimumShipSpacing(),
  );
}

function minimumShipSpacing(): number {
  const render = GAME_CONFIG.ship.render;
  const radius = Math.hypot(
    Math.max(render.wingX, render.guardWingX, render.healthBarWidth / 2),
    Math.max(Math.abs(render.noseY), render.tailY),
  );
  return radius * 2;
}

export function formationSlots(
  center: Vec,
  formation: Formation,
  count: number,
  spacing: number,
  rotation = 0,
): Vec[] {
  const slots: Vec[] = [];
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  for (let index = 0; index < count; index++) {
    let x = 0;
    let y = 0;

    switch (formation) {
      case Formation.Line:
        x = (index - (count - 1) / 2) * spacing;
        break;
      case Formation.Column:
        y = (index - (count - 1) / 2) * spacing;
        break;
      case Formation.Arrow: {
        const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
        const rowStart = (row * (row + 1)) / 2;
        x = (index - rowStart - row / 2) * spacing;
        y = (row - 2) * spacing * 0.7;
        break;
      }
      case Formation.Circle: {
        const angle = (index / count) * Math.PI * 2;
        x = Math.cos(angle) * spacing * 1.8;
        y = Math.sin(angle) * spacing * 1.8;
        break;
      }
      case Formation.Pincer: {
        const half = index < count / 2 ? -1 : 1;
        const row = index % Math.ceil(count / 2);
        x = -half * (spacing * 1.2 + row * spacing * 0.55);
        y = -(row - count / 4) * spacing;
        break;
      }
    }

    slots.push({
      x: center.x + x * cosine - y * sine,
      y: center.y + x * sine + y * cosine,
    });
  }

  return slots;
}

export function formationSlotHeadings(
  formation: Formation,
  count: number,
  rotation = 0,
): Vec[] {
  return Array.from({ length: count }, (_, index) => {
    let heading: Vec;
    switch (formation) {
      case Formation.Column:
        heading =
          index === 0
            ? { x: 0, y: -1 }
            : { x: index % 2 === 0 ? 0.7 : -0.7, y: -0.7 };
        break;
      case Formation.Pincer: {
        const leftWing = index < count / 2;
        heading = { x: leftWing ? -0.55 : 0.55, y: -0.85 };
        break;
      }
      case Formation.Circle: {
        const angle = (index / count) * Math.PI * 2;
        heading = { x: Math.cos(angle), y: Math.sin(angle) };
        break;
      }
      case Formation.Line:
      case Formation.Arrow:
      default:
        heading = { x: 0, y: -1 };
        break;
    }
    return rotateHeading(heading, rotation);
  });
}

function rotateHeading(heading: Vec, rotation: number): Vec {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    x: heading.x * cosine - heading.y * sine,
    y: heading.x * sine + heading.y * cosine,
  };
}
