import { distance } from "../utils/math";
import type { Ship, Vec } from "../types";

export type FormationAssignment = {
  position: Vec;
  slotIndex: number;
};

export function assignNearestFormationSlots(
  ships: Ship[],
  slots: Vec[],
): Map<Ship, FormationAssignment> {
  const availableSlots = slots.map((position, slotIndex) => ({
    position,
    slotIndex,
  }));
  const assignments = new Map<Ship, FormationAssignment>();

  for (const ship of ships) {
    let nearestIndex = 0;
    for (let index = 1; index < availableSlots.length; index++) {
      if (
        distance(ship.pos, availableSlots[index].position) <
        distance(ship.pos, availableSlots[nearestIndex].position)
      ) {
        nearestIndex = index;
      }
    }
    const [assignment] = availableSlots.splice(nearestIndex, 1);
    if (assignment) assignments.set(ship, assignment);
  }

  return assignments;
}

export function assignStableFormationSlots(
  ships: Ship[],
  slots: Vec[],
): Map<Ship, FormationAssignment> {
  const assignments = new Map<Ship, FormationAssignment>();
  [...ships]
    .sort((first, second) => first.id - second.id)
    .forEach((ship, slotIndex) => {
      const position = slots[slotIndex];
      if (position) assignments.set(ship, { position, slotIndex });
    });

  return assignments;
}
