import type { Side } from "./side";
import type { Vec } from "./vector";

export type Projectile = {
  pos: Vec;
  vel: Vec;
  side: Side;
};
