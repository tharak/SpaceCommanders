import "./style.css";
import { createGameState, resetGame, updateGame } from "./game/simulation";
import { FireMode, Side } from "./game/types";
import type { Vec, Viewport } from "./game/types";
import { renderGame, resizeCanvas } from "./render/gameRenderer";
import {
  getControls,
  readConfig,
  setupControls,
  setSelectedFormation,
  showReadout,
} from "./ui/controls";

const canvas = requiredCanvas("#game");
const context = requiredContext(canvas);
const status = requiredElement("#status");
const setupTitle = requiredElement("#setup-title");
const setupMessage = requiredElement("#setup-message");
const startButton = requiredElement("#reset-game");
const controls = getControls();
const state = createGameState();
let viewport: Viewport;
let lastFrame = performance.now();
let dragStartCohesion = state.cohesion;
let matchActive = false;

function reset(): void {
  resetGame(state, readConfig(), viewport);
  setSelectedFormation(controls, state.selectedFormation);
  showReadout(
    controls,
    `CAPTAIN FAVORS ${state.captainFavorite.toUpperCase()} — SELECT A FORMATION, THEN TAP THE MAP`,
  );
}

function startMatch(): void {
  reset();
  matchActive = true;
  document.body.classList.remove("setup-open", "debug-open");
}

function showSetup(title: string, message: string, buttonLabel: string): void {
  matchActive = false;
  setupTitle.textContent = title;
  setupMessage.textContent = message;
  startButton.textContent = buttonLabel;
  document.body.classList.remove("debug-open");
  document.body.classList.add("setup-open");
}

function showGameOver(winner: Side): void {
  const playerWon = winner === Side.Player;
  showSetup(
    playerWon ? "VICTORY" : "COMMAND FLEET LOST",
    playerWon
      ? "Enemy home planet captured. Tune the simulation and begin another match."
      : "Your home planet was captured. Tune the simulation and try again.",
    "START NEW MATCH",
  );
}

setupControls(
  controls,
  {
    onFormationChange: (formation) => {
      state.selectedFormation = formation;
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
    onReset: startMatch,
  },
  state.selectedFormation,
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
  if (!matchActive) return;

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
    Math.max(0.25, dragStartCohesion - offsetX / 200),
  );
});

canvas.addEventListener("pointerleave", () => {
  if (!state.previewCenter) state.pointer = null;
});

canvas.addEventListener("pointerdown", (event) => {
  if (!matchActive) return;

  const point = mapPoint(event);
  canvas.setPointerCapture(event.pointerId);
  state.pointer = point;
  state.previewCenter = { ...point };
  state.previewRotation = 0;
  dragStartCohesion = state.cohesion;
  showReadout(
    controls,
    `DRAG TO ROTATE ${state.selectedFormation.toUpperCase()} FORMATION — RELEASE TO ISSUE ORDER`,
  );
});

canvas.addEventListener("pointerup", (event) => {
  if (!matchActive || !state.previewCenter) return;

  state.pointer = mapPoint(event);
  state.command = { ...state.previewCenter };
  state.formation = state.selectedFormation;
  state.formationRotation = state.previewRotation;
  state.previewCenter = null;
  canvas.releasePointerCapture(event.pointerId);
  showReadout(
    controls,
    "FLEET MOVING IN " + state.selectedFormation.toUpperCase() + " FORMATION",
  );
});

canvas.addEventListener("pointercancel", (event) => {
  state.previewCenter = null;
  state.previewRotation = state.formationRotation;
  state.cohesion = dragStartCohesion;
  state.pointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

window.addEventListener("resize", () => {
  updateViewport();
  reset();
  if (!matchActive) {
    showSetup(
      "SIMULATION TUNING",
      "Configure the simulation, then begin the match.",
      "START MATCH",
    );
  }
});

function animationLoop(now: number): void {
  const deltaTime = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (matchActive) {
    updateGame(state, viewport, deltaTime);
    if (state.winner) showGameOver(state.winner);
  }
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
showSetup(
  "SIMULATION TUNING",
  "Configure the simulation, then begin the match.",
  "START MATCH",
);
requestAnimationFrame(animationLoop);
