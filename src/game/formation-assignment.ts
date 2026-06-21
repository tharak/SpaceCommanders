import { distance } from "./math";
import type { Ship, Vec } from "./types";

export function assignNearestFormationSlots(
  ships: Ship[],
  slots: Vec[],
): Map<Ship, Vec> {
  const availableSlots = [...slots];
  const assignments = new Map<Ship, Vec>();

  for (const ship of ships) {
    let nearestIndex = 0;
    for (let index = 1; index < availableSlots.length; index++) {
      if (
        distance(ship.pos, availableSlots[index]) <
        distance(ship.pos, availableSlots[nearestIndex])
      ) {
        nearestIndex = index;
      }
    }
    const [slot] = availableSlots.splice(nearestIndex, 1);
    if (slot) assignments.set(ship, slot);
  }

  return assignments;
}
