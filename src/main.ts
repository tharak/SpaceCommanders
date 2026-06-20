import "./style.css";
import { createGameState, resetGame, updateGame } from "./game/simulation";
import type { Vec, Viewport } from "./game/types";
import { renderGame, resizeCanvas } from "./render/gameRenderer";
import {
  getCohesion,
  getControls,
  readConfig,
  setupControls,
  showReadout,
} from "./ui/controls";

const canvas = requiredCanvas("#game");
const context = requiredContext(canvas);

const status = requiredElement("#status");
const controls = getControls();
const state = createGameState();
let viewport: Viewport;
let lastFrame = performance.now();

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
      showReadout(
        controls,
        `${formation.toUpperCase()} SELECTED — TAP MAP TO SET FLEET POSITION`,
      );
    },
    onFireModeChange: (mode) => {
      state.fireMode = mode;
      const message =
        mode === "hold"
          ? "WEAPONS HOLD"
          : mode === "focus"
            ? "FOCUS FIRE — TAP AN ENEMY TO DESIGNATE"
            : "WEAPONS FREE — ENGAGING HOSTILES IN RANGE";
      showReadout(controls, message);
    },
    onReset: reset,
  },
  state.formation,
  state.fireMode,
);

function updateViewport(): void {
  viewport = resizeCanvas(canvas, context);
}

function mapPoint(event: PointerEvent): Vec {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

canvas.addEventListener("pointermove", (event) => {
  state.pointer = mapPoint(event);
});
canvas.addEventListener("pointerleave", () => {
  state.pointer = null;
});
canvas.addEventListener("pointerdown", (event) => {
  state.pointer = mapPoint(event);
  state.command = { ...state.pointer };
  showReadout(
    controls,
    `FLEET MOVING IN ${state.formation.toUpperCase()} FORMATION — COHESION ${controls.tightness.value}%`,
  );
});
window.addEventListener("resize", () => {
  updateViewport();
  reset();
});

function animationLoop(now: number): void {
  const deltaTime = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  const cohesion = getCohesion(controls);
  updateGame(state, viewport, cohesion, deltaTime);
  renderGame(state, { canvas, context, status, viewport, cohesion });
  requestAnimationFrame(animationLoop);
}

function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  return context;
}

function requiredCanvas(selector: string): HTMLCanvasElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLCanvasElement))
    throw new Error(`Missing required canvas: ${selector}`);
  return element;
}

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement))
    throw new Error(`Missing required element: ${selector}`);
  return element;
}

updateViewport();
reset();
requestAnimationFrame(animationLoop);
