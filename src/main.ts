import "./style.css";
import {
  createInvadersState,
  purchaseInvadersUpgrade,
  resetInvaders,
  applyInvadersFormation,
  invadersFleetCommands,
  selectInvadersFormation,
  selectInvadersFleet,
  setInvadersAlignment,
  setInvadersFireMode,
  setInvadersFleetSpeedMode,
  updateInvaders,
} from "./invaders/simulation";
import { renderInvaders } from "./invaders/renderer";
import { getUpgradeCost } from "./invaders/config";
import { UpgradeType } from "./invaders/upgrade-type";
import { applyStaticScreenText, TEXT } from "./ui/strings";
import {
  createGameState,
  playerFleetCommands,
  issueFormationOrder,
  resetGame,
  resetFormations,
  selectPlayerFleet,
  setFormationModePlayerFormation,
  setSelectedFleetFormation,
  setFleetSpeedMode,
  updateFormations,
  updateGame,
} from "./game/simulation";
import { FireMode, Formation } from "./game/types";
import type { ShipSpeedMode } from "./game/types";
import type { Vec, Viewport } from "./game/types";
import { renderGame, resizeCanvas } from "./render/gameRenderer";
import {
  getControls,
  readConfig,
  setupControls,
  animateMoneySpent,
  setSelectedFormation,
  setFleetOptions,
  setFormationSelectionEnabled,
  setMoneyDisplay,
  setSelectedFleet,
  setSelectedShipSpeedMode,
  setUpgradeAvailability,
  setUpgradePrices,
  showReadout,
} from "./ui/controls";

type GameId = "command" | "invaders" | "formations";

applyStaticScreenText();

const canvas = requiredCanvas("#game");
const context = requiredContext(canvas);
const status = requiredElement("#status");
const countdown = requiredElement("#enemy-countdown");
const controls = getControls();
const gameSelection = requiredElement("#game-selection");
const commandState = createGameState();
const invadersState = createInvadersState();
let selectedGame: GameId = "command";
let activeGame: GameId = "command";
let viewport!: Viewport;
let lastFrame = performance.now();
let dragStartCohesion = commandState.cohesion;
let matchActive = false;

function activeFleetOptions() {
  return (activeGame === "invaders"
    ? invadersFleetCommands(invadersState)
    : playerFleetCommands(commandState)
  ).map((fleet) => ({
    id: fleet.id,
    name: fleet.name,
    color: fleet.color,
  }));
}

function activeSelectedFleetId(): string {
  return activeGame === "invaders"
    ? invadersState.selectedFleetId
    : commandState.selectedFleetId;
}

function syncFleetControls(): void {
  setFleetOptions(controls, activeFleetOptions(), activeSelectedFleetId(), selectActiveFleet);
}

function selectActiveFleet(fleetId: string): void {
  if (activeGame === "invaders") {
    selectInvadersFleet(invadersState, fleetId);
    setSelectedFormation(controls, invadersState.selectedFormation);
    setSelectedFleet(controls, invadersState.selectedFleetId);
    setSelectedShipSpeedMode(controls, selectedFleetSpeedMode());
  } else {
    selectPlayerFleet(commandState, fleetId);
    setSelectedFormation(controls, commandState.selectedFormation);
    setSelectedFleet(controls, commandState.selectedFleetId);
    setSelectedShipSpeedMode(controls, selectedFleetSpeedMode());
  }
}

function reset(): void {
  if (activeGame === "command") {
    resetGame(commandState, readConfig(), viewport);
    setSelectedFormation(controls, commandState.selectedFormation);
  } else if (activeGame === "formations") {
    resetFormations(commandState, viewport, commandState.selectedFormation);
    setSelectedFormation(controls, commandState.selectedFormation);
  } else {
    resetInvaders(invadersState, viewport, commandState.captainFavorite);
    setSelectedFormation(controls, invadersState.selectedFormation);
  }
  syncFleetControls();
  setSelectedShipSpeedMode(controls, selectedFleetSpeedMode());
  setFormationSelectionEnabled(
    controls,
    activeGame !== "formations" ||
      (commandState.formationMode?.formationSelectionEnabled ?? true),
  );
  setUpgradePrices(controls, invadersState.upgrades);
  syncInvadersControls();
  showReadout(
    controls,
    activeGame === "command"
      ? TEXT.readout.commandOrder
      : activeGame === "formations"
        ? TEXT.readout.formations
        : TEXT.readout.defenseFormation,
  );
}

function startMatch(): void {
  activeGame = selectedGame;
  reset();
  matchActive = true;
  document.body.classList.remove("setup-open", "debug-open");
  document.body.classList.toggle("base-defense", activeGame === "invaders");
}

function showSetup(): void {
  matchActive = false;
  document.body.classList.remove("debug-open");
  document.body.classList.add("setup-open");
}

setupControls(
  controls,
  {
    onFleetChange: (fleetId) => {
      selectActiveFleet(fleetId);
    },
    onFormationChange: (formation) => {
      if (activeGame === "invaders") {
        selectInvadersFormation(invadersState, formation);
        applyInvadersFormation(invadersState);
        showReadout(controls, TEXT.readout.defenseFormationActive(formation));
        return;
      }
      setSelectedFleetFormation(commandState, formation);
      if (activeGame === "formations") {
        setFormationModePlayerFormation(commandState, viewport, formation);
        setSelectedFormation(controls, formation);
        setFormationSelectionEnabled(controls, false);
        return;
      }
      showReadout(controls, TEXT.readout.formationSelected(formation));
    },
    onShipSpeedModeChange: (mode: ShipSpeedMode) => {
      if (activeGame === "invaders") {
        setInvadersFleetSpeedMode(invadersState, invadersState.selectedFleetId, mode);
      } else {
        setFleetSpeedMode(commandState, commandState.selectedFleetId, mode);
      }
      const message =
        mode === "hold"
          ? TEXT.readout.shipsHold
          : mode === "full"
            ? TEXT.readout.shipsFull
            : TEXT.readout.shipsNormal;
      showReadout(controls, message);
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
        const nextCost = getUpgradeCost(
          upgrade,
          invadersState.upgrades[upgrade],
        );
        showReadout(controls, TEXT.readout.upgradeNeeded(nextCost, upgrade));
        return;
      }
      setUpgradePrices(controls, invadersState.upgrades);
      setMoneyDisplay(controls, invadersState.money);
      animateMoneySpent(controls, upgrade, cost);
      setUpgradeAvailability(
        controls,
        invadersState.upgrades,
        invadersState.money,
      );
      showReadout(controls, TEXT.readout.upgradePurchased(upgrade, cost));
    },
  },
  activeFleetOptions(),
  commandState.selectedFleetId,
  commandState.selectedFormation,
  commandState.fireMode,
  selectedFleetSpeedMode(),
);

gameSelection
  .querySelectorAll<HTMLButtonElement>("button[data-game]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      selectedGame =
        button.dataset.game === "invaders"
          ? "invaders"
          : button.dataset.game === "formations"
            ? "formations"
            : "command";
      gameSelection
        .querySelectorAll("button")
        .forEach((candidate) =>
          candidate.classList.toggle("active", candidate === button),
        );
      startMatch();
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
  if (activeGame === "command" && selectedFleetSpeedMode() === "hold") return;
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
  if (activeGame === "command" && selectedFleetSpeedMode() === "hold") return;
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
  commandState.pointer = event.pointerType === "mouse" ? mapPoint(event) : null;
  issueFormationOrder(commandState, commandState.previewCenter);
  commandState.previewCenter = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
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
  if (matchActive) updateActiveGame(deltaTime);
  renderActiveGame();
  requestAnimationFrame(animationLoop);
}

function updateActiveGame(deltaTime: number): void {
  if (activeGame === "command") {
    updateGame(commandState, viewport, deltaTime);
    if (commandState.winner) showSetup();
    return;
  }
  if (activeGame === "formations") {
    updateFormations(commandState, viewport, deltaTime);
    setFormationSelectionEnabled(
      controls,
      commandState.formationMode?.formationSelectionEnabled ?? false,
    );
    if (commandState.winner) showSetup();
    return;
  }

  updateInvaders(invadersState, viewport, deltaTime);
  syncInvadersControls();
  if (invadersState.winner) showSetup();
}

function syncInvadersControls(): void {
  setMoneyDisplay(controls, invadersState.money);
  setUpgradeAvailability(controls, invadersState.upgrades, invadersState.money);
}

function selectedFleetSpeedMode(): ShipSpeedMode {
  if (activeGame === "invaders") {
    return invadersState.fleets[invadersState.selectedFleetId]?.speedMode ?? "normal";
  }
  return commandState.fleets[commandState.selectedFleetId]?.speedMode ?? "normal";
}

function renderActiveGame(): void {
  if (activeGame === "command" || activeGame === "formations") {
    if (countdown.classList.contains("active") || countdown.hasChildNodes()) {
      countdown.classList.remove("active");
      countdown.replaceChildren();
    }
    renderGame(commandState, { canvas, context, status, viewport });
    return;
  }
  renderInvaders(invadersState, {
    canvas,
    context,
    status,
    countdown,
    viewport,
  });
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
resetGame(commandState, { ...readConfig(), debugFormationMap: true }, viewport);
showSetup();
requestAnimationFrame(animationLoop);
