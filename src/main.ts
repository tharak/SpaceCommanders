import "./style.css";
import {
  createInvadersState,
  purchaseInvadersUpgrade,
  resetInvaders,
  applyInvadersFormation,
  selectInvadersFormation,
  setInvadersAlignment,
  setInvadersFireMode,
  updateInvaders,
} from "./invaders/simulation";
import { renderInvaders } from "./invaders/renderer";
import { UpgradeType } from "./invaders/upgrade-type";
import { applyStaticScreenText, TEXT } from "./ui/strings";
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
  setUpgradeAvailability,
  setUpgradePrices,
  showReadout,
} from "./ui/controls";

type GameId = "command" | "invaders";

applyStaticScreenText();

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
  setUpgradePrices(controls, invadersState.upgrades);
  setUpgradeAvailability(controls, invadersState.upgrades, invadersState.score);
  showReadout(
    controls,
    activeGame === "command"
      ? TEXT.readout.commandOrder
      : TEXT.readout.defenseFormation,
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
    playerWon ? TEXT.match.victory : TEXT.match.defeat,
    playerWon ? TEXT.match.victoryMessage : TEXT.match.defeatMessage,
    TEXT.match.replay,
  );
}

setupControls(
  controls,
  {
    onFormationChange: (formation) => {
      if (activeGame === "invaders") {
        selectInvadersFormation(invadersState, formation);
        applyInvadersFormation(invadersState);
        showReadout(controls, TEXT.readout.defenseFormationActive(formation));
        return;
      }
      commandState.selectedFormation = formation;
      showReadout(controls, TEXT.readout.formationSelected(formation));
    },
    onFireModeChange: (mode) => {
      if (activeGame === "invaders") {
        setInvadersFireMode(invadersState, mode);
      } else {
        commandState.fireMode = mode;
      }
      const message =
        mode === FireMode.Hold
          ? TEXT.readout.weaponsHold
          : mode === FireMode.Focus
            ? TEXT.readout.focusFire
            : TEXT.readout.weaponsFree;
      showReadout(controls, message);
    },
    onUpgrade: (upgrade: UpgradeType) => {
      if (activeGame !== "invaders") {
        showReadout(controls, TEXT.readout.upgradesDefenseOnly);
        return;
      }
      const cost = purchaseInvadersUpgrade(invadersState, upgrade);
      if (cost == null) {
        const nextCost = 100 * (invadersState.upgrades[upgrade] + 1);
        showReadout(controls, TEXT.readout.upgradeNeeded(nextCost, upgrade));
        return;
      }
      setUpgradePrices(controls, invadersState.upgrades);
      setUpgradeAvailability(
        controls,
        invadersState.upgrades,
        invadersState.score,
      );
      showReadout(controls, TEXT.readout.upgradePurchased(upgrade, cost));
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
          ? TEXT.launcher.startCommanders
          : TEXT.launcher.startDefense;
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
  if (!matchActive) return;
  const point = mapPoint(event);
  if (activeGame === "invaders") {
    if (canvas.hasPointerCapture(event.pointerId)) {
      setInvadersAlignment(invadersState, point, viewport);
    }
    return;
  }
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
  if (!matchActive) return;
  if (activeGame === "invaders") {
    setInvadersAlignment(invadersState, mapPoint(event), viewport);
    canvas.setPointerCapture(event.pointerId);
    return;
  }
  const point = mapPoint(event);
  canvas.setPointerCapture(event.pointerId);
  commandState.pointer = point;
  commandState.previewCenter = { ...point };
  commandState.previewRotation = 0;
  commandState.previewCohesion = commandState.cohesion;
  dragStartCohesion = commandState.cohesion;
});
canvas.addEventListener("pointerup", (event) => {
  if (!matchActive) return;
  if (activeGame === "invaders") {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    return;
  }
  if (!commandState.previewCenter) return;
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
      setUpgradeAvailability(
        controls,
        invadersState.upgrades,
        invadersState.score,
      );
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
  TEXT.launcher.title,
  TEXT.launcher.message,
  TEXT.launcher.startCommanders,
);
requestAnimationFrame(animationLoop);
