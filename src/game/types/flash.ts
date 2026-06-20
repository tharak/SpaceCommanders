import type { Side } from "./side";
import type { Vec } from "./vector";

export type Flash = { from: Vec; to: Vec; life: number; side: Side };
