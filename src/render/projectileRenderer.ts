import { GAME_CONFIG } from "../game/game-settings";
import type { Vec } from "../game/types";
import { shipRenderScale } from "./shipRenderer";

export function drawLaser(
  context: CanvasRenderingContext2D,
  position: Vec,
  velocity: Vec,
  color: string,
): void {
  const shipLength = GAME_CONFIG.ship.render.tailY - GAME_CONFIG.ship.render.noseY;
  const scale = shipRenderScale();
  const length = shipLength * 1.5 * scale;
  const width = Math.max(1, shipLength * 0.25 * scale);

  context.save();
  context.translate(position.x, position.y);
  context.rotate(Math.atan2(velocity.y, velocity.x));
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 8 * scale;
  context.fillRect(-length / 2, -width / 2, length, width);
  context.restore();
}
