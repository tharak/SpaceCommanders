import type { BodyKind } from "./body-kind";
import type { Side } from "./side";
import type { Vec } from "./vector";

export type Body = {
  id: number;
  kind: BodyKind;
  pos: Vec;
  radius: number;
  base?: Side;
  stock?: number;
  hue: number;
  weight: number;
};
