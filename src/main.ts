import "./style.css";
import { createGameState, resetGame, updateGame } from "./game/simulation";
import { FireMode } from "./game/types";
import type { Vec, Viewport } from "./game/types";
import { renderGame, resizeCanvas } from "./render/gameRenderer";
import {
  getControls,
  readConfig,
  setupControls,
  showCohesion,
  showReadout,
} from "./ui/controls";

const canvas = requiredCanvas("#game");
const context = requiredContext(canvas);
const status = requiredElement("#status");
const controls = getControls();
const state = createGameState();
let viewport: Viewport;
let lastFrame = performance.now();
let dragStartCohesion = state.cohesion;

function reset(): void {
  resetGame(state, readConfig(), viewport);
  showReadout(
    controls,
    `CAPTAIN FAVORS ${state.captainFavorite.toUpperCase()} — SELECT A FORMATION, THEN TAP THE MAP`,
  );
}

setupControls(
  controls,
  {
    onFormationChange: (formation) => {
      state.formation = formation;
      state.command = null;
      state.previewCenter = null;
      state.formationRotation = 0;
      showReadout(
        controls,
        `${formation.toUpperCase()} SELECTED — TAP MAP TO SET FLEET POSITION`,
      );
    },
    onFireModeChange: (mode) => {
      state.fireMode = mode;
      const message =
        mode === FireMode.Hold
          ? "WEAPONS HOLD"
          : mode === FireMode.Focus
            ? "FOCUS FIRE — TAP AN ENEMY TO DESIGNATE"
            : "WEAPONS FREE — ENGAGING HOSTILES IN RANGE";
      showReadout(controls, message);
    },
    onCohesionChange: (cohesion) => {
      state.cohesion = cohesion;
    },
    onReset: reset,
  },
  state.formation,
  state.fireMode,
  state.cohesion,
);

function updateViewport(): void {
  viewport = resizeCanvas(canvas, context);
}

function mapPoint(event: PointerEvent): Vec {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

canvas.addEventListener("pointermove", (event) => {
  const point = mapPoint(event);
  state.pointer = point;
  if (!state.previewCenter) return;

  const offsetX = point.x - state.previewCenter.x;
  const offsetY = point.y - state.previewCenter.y;
  if (Math.hypot(offsetX, offsetY) >= 8) {
    state.previewRotation = Math.atan2(offsetY, offsetX);
  }
  state.cohesion = Math.min(
    1,
    Math.max(0.25, dragStartCohesion + offsetX / 200),
  );
  showCohesion(controls, state.cohesion);
});

canvas.addEventListener("pointerleave", () => {
  if (!state.previewCenter) state.pointer = null;
});

canvas.addEventListener("pointerdown", (event) => {
  const point = mapPoint(event);
  canvas.setPointerCapture(event.pointerId);
  state.pointer = point;
  state.previewCenter = { ...point };
  state.previewRotation = 0;
  dragStartCohesion = state.cohesion;
  showReadout(
    controls,
    `DRAG TO ROTATE ${state.formation.toUpperCase()} FORMATION — RELEASE TO ISSUE ORDER`,
  );
});

canvas.addEventListener("pointerup", (event) => {
  if (!state.previewCenter) return;

  state.pointer = mapPoint(event);
  state.command = { ...state.previewCenter };
  state.formationRotation = state.previewRotation;
  state.previewCenter = null;
  canvas.releasePointerCapture(event.pointerId);
  showReadout(
    controls,
    `FLEET MOVING IN ${state.formation.toUpperCase()} FORMATION — COHESION ${Math.round(state.cohesion * 100)}%`,
  );
});

canvas.addEventListener("pointercancel", (event) => {
  state.previewCenter = null;
  state.previewRotation = state.formationRotation;
  state.cohesion = dragStartCohesion;
  showCohesion(controls, state.cohesion);
  state.pointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

window.addEventListener("resize", () => {
  updateViewport();
  reset();
});

function animationLoop(now: number): void {
  const deltaTime = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  updateGame(state, viewport, deltaTime);
  renderGame(state, { canvas, context, status, viewport });
  requestAnimationFrame(animationLoop);
}

function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  return context;
}

function requiredCanvas(selector: string): HTMLCanvasElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error(`Missing required canvas: ${selector}`);
  }
  return element;
}

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

updateViewport();
reset();
requestAnimationFrame(animationLoop);
