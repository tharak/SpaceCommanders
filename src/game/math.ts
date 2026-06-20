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
