import { ShipRole } from "./ship-role";
import type { Side } from "./side";
import type { SupplyMission } from "./supply-mission";
import type { Vec } from "./vector";
import type { Gun } from "../gun";

export class BaseShip {
  declare id: number;
  declare side: Side;
  readonly role: ShipRole;
  declare pos: Vec;
  declare vel: Vec;
  declare heading: Vec;
  declare hp: number;
  declare maxHp: number;
  declare defense: number;
  declare speed: number;
  declare sight: number;
  declare moral: number;
  declare supplies: number;
  declare fleetId: string;
  declare target?: Vec;
  declare targetHeading?: Vec;
  declare steeringHeading?: Vec;
  declare homeBodyId?: number;
  declare resupplyTargetId?: number;
  declare supplyMission?: SupplyMission;

  constructor(initial: Omit<BaseShip, "role">, role: ShipRole) {
    Object.assign(this, initial);
    this.role = role;
  }
}

export class Battleship extends BaseShip {
  readonly gun: Gun;

  constructor(initial: Omit<BaseShip, "role">, gun: Gun) {
    super(initial, ShipRole.Battleship);
    this.gun = gun;
  }
}

export class SupplyShip extends BaseShip {
  constructor(initial: Omit<BaseShip, "role">) {
    super(initial, ShipRole.Supply);
  }
}

export class GuardShip extends BaseShip {
  constructor(initial: Omit<BaseShip, "role">) {
    super(initial, ShipRole.Guard);
  }
}

export type Ship = BaseShip | Battleship | SupplyShip | GuardShip;
