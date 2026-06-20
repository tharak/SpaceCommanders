import type { Formation, Vec } from "./types";

export function formationSlots(
  center: Vec,
  formation: Formation,
  count: number,
  spacing: number,
): Vec[] {
  const slots: Vec[] = [];

  for (let index = 0; index < count; index++) {
    let x = 0;
    let y = 0;

    switch (formation) {
      case "line":
        x = (index - (count - 1) / 2) * spacing;
        break;
      case "column":
        y = (index - (count - 1) / 2) * spacing;
        break;
      case "arrow": {
        const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
        const rowStart = (row * (row + 1)) / 2;
        x = (index - rowStart - row / 2) * spacing;
        y = (row - 2) * spacing * 0.7;
        break;
      }
      case "circle": {
        const angle = (index / count) * Math.PI * 2;
        x = Math.cos(angle) * spacing * 1.8;
        y = Math.sin(angle) * spacing * 1.8;
        break;
      }
      case "pincer": {
        const half = index < count / 2 ? -1 : 1;
        const row = index % Math.ceil(count / 2);
        x = half * (spacing * 1.2 + row * spacing * 0.55);
        y = (row - count / 4) * spacing;
        break;
      }
    }

    slots.push({ x: center.x + x, y: center.y + y });
  }

  return slots;
}
