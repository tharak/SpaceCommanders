import type { ShipRole } from "./ship-role";
import type { Side } from "./side";
import type { SupplyMission } from "./supply-mission";
import type { Vec } from "./vector";

export type Ship = {
  id: number;
  side: Side;
  role: ShipRole;
  pos: Vec;
  vel: Vec;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  sight: number;
  moral: number;
  supplies: number;
  range: number;
  cooldown: number;
  target?: Vec;
  homeBodyId?: number;
  resupplyTargetId?: number;
  supplyMission?: SupplyMission;
};
