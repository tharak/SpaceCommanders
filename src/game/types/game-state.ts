import type { Body } from "./body";
import type { Config } from "./config";
import type { FireMode } from "./fire-mode";
import type { Projectile } from "./projectile";
import type { Formation } from "./formation";
import type { FormationStage } from "./formation-stage";
import type { Ship } from "./ship";
import type { Side } from "./side";
import type { Vec } from "./vector";

export type ShipSpeedMode = "hold" | "normal" | "full";
export type FleetCombatStage = "forming" | "attacking";

export type FleetCommand = {
  id: string;
  side: Side;
  name: string;
  color: string;
  formation: Formation;
  selectedFormation: Formation;
  command: Vec | null;
  destination: Vec | null;
  formationRotation: number;
  cohesion: number;
  speedMode: ShipSpeedMode;
  combatStage: FleetCombatStage;
};

export type GameState = {
  config: Config;
  formation: Formation;
  selectedFormation: Formation;
  fireMode: FireMode;
  selectedFleetId: string;
  fleets: Record<string, FleetCommand>;
  command: Vec | null;
  destination: Vec | null;
  formationStage: FormationStage | null;
  previewCenter: Vec | null;
  previewRotation: number;
  formationRotation: number;
  cohesion: number;
  previewCohesion: number;
  pointer: Vec | null;
  bodies: Body[];
  ships: Ship[];
  projectiles: Projectile[];
  captainFavorite: Formation;
  winner: Side | null;
  formationMode?: {
    enemyFormation: Formation;
    charging: boolean;
    formationSelectionEnabled: boolean;
    hasSelectedFormation: boolean;
    playerAtTop: boolean;
    chargingTowardTop: boolean;
  };
};
