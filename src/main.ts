import "./style.css";
import {
  createInvadersState,
  resetInvaders,
  setInvadersFormation,
  updateInvaders,
} from "./invaders/simulation";
import { renderInvaders } from "./invaders/renderer";
import {
  createGameState,
  issueFormationOrder,
  resetGame,
  updateGame,
} from "./game/simulation";
import { FireMode, Formation, Side } from "./game/types";
import type { Vec, Viewport } from "./game/types";
import { renderGame, resizeCanvas } from "./render/gameRenderer";
import {
  createCaptainFormationPicker,
  getControls,
  readConfig,
  setupControls,
  setCaptainFormation,
  setSelectedFormation,
  showReadout,
} from "./ui/controls";

type GameId = "command" | "invaders";

const canvas = requiredCanvas("#game");
const context = requiredContext(canvas);
const status = requiredElement("#status");
const setupTitle = requiredElement("#setup-title");
const setupMessage = requiredElement("#setup-message");
const startButton = requiredElement("#reset-game");
const controls = getControls();
const captainFormationControls = requiredElement("#captain-formation-controls");
const gameSelection = requiredElement("#game-selection");
const commandState = createGameState();
const invadersState = createInvadersState();
let selectedGame: GameId = "command";
let activeGame: GameId = "command";
let viewport: Viewport;
let lastFrame = performance.now();
let dragStartCohesion = commandState.cohesion;
let matchActive = false;

function reset(): void {
  if (activeGame === "command") {
    resetGame(commandState, readConfig(), viewport);
    setSelectedFormation(controls, commandState.selectedFormation);
  } else {
    resetInvaders(invadersState, viewport, commandState.captainFavorite);
    setSelectedFormation(controls, invadersState.selectedFormation);
  }
  setCaptainFormation(captainFormationControls, commandState.captainFavorite);
  showReadout(
    controls,
    activeGame === "command"
      ? "SELECT A FORMATION, THEN TAP THE MAP TO ISSUE AN ORDER"
      : "SELECT A FORMATION TO REORGANIZE YOUR DEFENSIVE FLEET",
  );
}

function startMatch(): void {
  activeGame = selectedGame;
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
      ? "The sector is secure. Select a game to play again."
      : "Your planet has fallen. Select a game to try again.",
    "PLAY AGAIN",
  );
}

setupControls(
  controls,
  {
    onFormationChange: (formation) => {
      if (activeGame === "invaders") {
        setInvadersFormation(invadersState, formation);
        showReadout(
          controls,
          `${formation.toUpperCase()} DEFENSIVE FORMATION ACTIVE`,
        );
        return;
      }
      commandState.selectedFormation = formation;
      showReadout(
        controls,
        `${formation.toUpperCase()} SELECTED — TAP MAP TO SET FLEET POSITION`,
      );
    },
    onFireModeChange: (mode) => {
      commandState.fireMode = mode;
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
  commandState.selectedFormation,
  commandState.fireMode,
);

createCaptainFormationPicker(
  captainFormationControls,
  (formation) => {
    commandState.captainFavorite = formation;
    invadersState.captainFavorite = formation;
  },
  commandState.captainFavorite,
);

gameSelection
  .querySelectorAll<HTMLButtonElement>("button[data-game]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      selectedGame =
        button.dataset.game === "invaders" ? "invaders" : "command";
      gameSelection
        .querySelectorAll("button")
        .forEach((candidate) =>
          candidate.classList.toggle("active", candidate === button),
        );
      startButton.textContent =
        selectedGame === "command"
          ? "START COMMANDERS"
          : "START PLANETARY DEFENSE";
    });
  });
gameSelection
  .querySelector<HTMLButtonElement>("[data-game='command']")
  ?.classList.add("active");

function updateViewport(): void {
  viewport = resizeCanvas(canvas, context);
}
function mapPoint(event: PointerEvent): Vec {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

canvas.addEventListener("pointermove", (event) => {
  if (!matchActive || activeGame !== "command") return;
  const point = mapPoint(event);
  commandState.pointer = point;
  if (!commandState.previewCenter) return;
  const offsetX = point.x - commandState.previewCenter.x;
  const offsetY = point.y - commandState.previewCenter.y;
  if (Math.hypot(offsetX, offsetY) >= 8)
    commandState.previewRotation = Math.atan2(offsetY, offsetX);
  commandState.previewCohesion = Math.min(
    1,
    Math.max(0.25, dragStartCohesion - offsetX / 200),
  );
});
canvas.addEventListener("pointerleave", () => {
  if (!commandState.previewCenter) commandState.pointer = null;
});
canvas.addEventListener("pointerdown", (event) => {
  if (!matchActive || activeGame !== "command") return;
  const point = mapPoint(event);
  canvas.setPointerCapture(event.pointerId);
  commandState.pointer = point;
  commandState.previewCenter = { ...point };
  commandState.previewRotation = 0;
  commandState.previewCohesion = commandState.cohesion;
  dragStartCohesion = commandState.cohesion;
});
canvas.addEventListener("pointerup", (event) => {
  if (!matchActive || activeGame !== "command" || !commandState.previewCenter)
    return;
  commandState.pointer = mapPoint(event);
  issueFormationOrder(commandState, commandState.previewCenter);
  commandState.previewCenter = null;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener("pointercancel", () => {
  commandState.previewCenter = null;
  commandState.pointer = null;
});
window.addEventListener("resize", () => {
  updateViewport();
  if (matchActive) reset();
});

function animationLoop(now: number): void {
  const deltaTime = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (matchActive) {
    if (activeGame === "command" && commandState.command) {
      updateGame(commandState, viewport, deltaTime);
      if (commandState.winner) showGameOver(commandState.winner);
    }
    if (activeGame === "invaders") {
      updateInvaders(invadersState, viewport, deltaTime);
      if (invadersState.winner) showGameOver(invadersState.winner);
    }
  }
  if (activeGame === "command")
    renderGame(commandState, { canvas, context, status, viewport });
  else renderInvaders(invadersState, { canvas, context, status, viewport });
  requestAnimationFrame(animationLoop);
}
function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const result = canvas.getContext("2d");
  if (!result) throw new Error("Canvas 2D context is unavailable");
  return result;
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
showSetup(
  "CHOOSE YOUR COMMAND",
  "Select a game, choose a captain formation, and begin.",
  "START COMMANDERS",
);
requestAnimationFrame(animationLoop);
