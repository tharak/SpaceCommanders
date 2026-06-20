import type { Vec } from "./types";

export const randomBetween = (minimum: number, maximum: number) =>
  minimum + Math.random() * (maximum - minimum);

export const distance = (first: Vec, second: Vec) =>
  Math.hypot(first.x - second.x, first.y - second.y);

export const normalize = (vector: Vec): Vec => {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
};

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(value, maximum));

export const distanceToSegment = (point: Vec, start: Vec, end: Vec) => {
  const segment = { x: end.x - start.x, y: end.y - start.y };
  const lengthSquared = segment.x * segment.x + segment.y * segment.y;
  if (lengthSquared === 0) return distance(point, start);

  const progress = clamp(
    ((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) /
      lengthSquared,
    0,
    1,
  );
  return distance(point, {
    x: start.x + segment.x * progress,
    y: start.y + segment.y * progress,
  });
};
