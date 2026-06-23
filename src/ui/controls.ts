import { FIRE_MODES, FORMATIONS } from "../game/constants";
import { TEXT } from "./strings";
import { UpgradeType } from "../invaders/upgrade-type";
import { FireMode, Formation } from "../game/types";
import type { Config } from "../game/types";

type Controls = {
  formationControls: HTMLElement;
  fireControls: HTMLElement;
  upgradeControls: HTMLElement;
  moneyDisplay: HTMLElement;
  moneyAmount: HTMLElement;
};

type ControlCallbacks = {
  onFormationChange: (formation: Formation) => void;
  onFireModeChange: (mode: FireMode) => void;
  onUpgrade: (upgrade: UpgradeType) => void;
  onReset: () => void;
};

export function getControls(): Controls {
  return {
    formationControls: requiredElement("#formation-controls"),
    fireControls: requiredElement("#fire-controls"),
    upgradeControls: requiredElement("#upgrade-controls"),
    moneyDisplay: requiredElement("#money-display"),
    moneyAmount: requiredElement("#money-amount"),
  };
}

export function setupControls(
  controls: Controls,
  callbacks: ControlCallbacks,
  initialFormation: Formation,
  initialFireMode: FireMode,
): void {
  createFormationButtons(controls, callbacks.onFormationChange);
  createFireModeButtons(controls, callbacks.onFireModeChange);
  createUpgradeButtons(controls, callbacks.onUpgrade);
  selectActive(controls.formationControls, initialFormation);
  selectActive(controls.fireControls, initialFireMode);
  requiredElement("#debug-toggle").addEventListener("click", () =>
    document.body.classList.toggle("debug-open"),
  );
  requiredElement("#reset-game").addEventListener("click", callbacks.onReset);
  setupDebugReadouts();
}

export function readConfig(): Config {
  return {
    ships: Number(requiredInput("#ship-count").value),
    planets: Number(requiredInput("#planet-count").value),
    asteroids: Number(requiredInput("#asteroid-count").value),
    speed: Number(requiredInput("#game-speed").value),
  };
}

export function showReadout(_controls: Controls, _message: string): void {}

export function createCaptainFormationPicker(
  root: HTMLElement,
  onChange: (formation: Formation) => void,
  initialFormation: Formation,
): void {
  for (const formation of FORMATIONS) {
    const button = document.createElement("button");
    button.ariaLabel = TEXT.controls.captainFormation;
    button.dataset.value = formation;
    button.innerHTML = formationIcon(formation);
    button.addEventListener("click", () => {
      selectActive(root, formation);
      onChange(formation);
    });
    root.append(button);
  }
  selectActive(root, initialFormation);
}

export function setCaptainFormation(
  root: HTMLElement,
  formation: Formation,
): void {
  selectActive(root, formation);
}

export function setUpgradePrices(
  controls: Controls,
  levels: Record<UpgradeType, number>,
): void {
  controls.upgradeControls
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((button) => {
      const upgrade = button.dataset.value as UpgradeType;
      const label = button.dataset.label;
      if (!label || !(upgrade in levels)) return;
      setUpgradeButtonText(button, label, 100 * (levels[upgrade] + 1));
      const level =
        button.parentElement?.querySelector<HTMLElement>(".upgrade-level");
      if (level) level.textContent = `LV ${levels[upgrade]}`;
    });
}

export function setUpgradeAvailability(
  controls: Controls,
  levels: Record<UpgradeType, number>,
  money: number,
): void {
  controls.upgradeControls
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((button) => {
      const upgrade = button.dataset.value as UpgradeType;
      if (!(upgrade in levels)) return;
      const cost = 100 * (levels[upgrade] + 1);
      button.classList.toggle("affordable", money >= cost);
    });
}

export function setMoneyDisplay(controls: Controls, money: number): void {
  controls.moneyAmount.textContent = `${Math.floor(money)}`;
}

export function animateMoneySpent(
  controls: Controls,
  upgrade: UpgradeType,
  cost: number,
): void {
  const { moneyDisplay } = controls;
  moneyDisplay.classList.remove("money-spent");
  void moneyDisplay.offsetWidth;
  moneyDisplay.classList.add("money-spent");
  const button = controls.upgradeControls.querySelector<HTMLButtonElement>(
    `button[data-value="${upgrade}"]`,
  );
  const item = button?.parentElement;
  if (!item) return;
  item.dataset.spend = `-${cost} ₿`;
  item.classList.remove("money-spent");
  void item.offsetWidth;
  item.classList.add("money-spent");
}

export function setSelectedFormation(
  controls: Controls,
  formation: Formation,
): void {
  selectActive(controls.formationControls, formation);
}

function createFormationButtons(
  controls: Controls,
  onChange: (formation: Formation) => void,
): void {
  for (const formation of FORMATIONS) {
    const button = document.createElement("button");
    button.ariaLabel = `${formation} formation`;
    button.dataset.value = formation;
    button.innerHTML = formationIcon(formation);
    button.addEventListener("click", () => {
      selectActive(controls.formationControls, formation);
      onChange(formation);
    });
    controls.formationControls.append(button);
  }
}

function createUpgradeButtons(
  controls: Controls,
  onUpgrade: (upgrade: UpgradeType) => void,
): void {
  const labels: Record<UpgradeType, string> = {
    [UpgradeType.Damage]: TEXT.controls.upgradeLabels.damage,
    [UpgradeType.Speed]: TEXT.controls.upgradeLabels.speed,
    [UpgradeType.Hull]: TEXT.controls.upgradeLabels.hull,
    [UpgradeType.Range]: TEXT.controls.upgradeLabels.range,
    [UpgradeType.SupplyShips]: TEXT.controls.upgradeLabels.supplyShips,
    [UpgradeType.BaseSupplyGeneration]:
      TEXT.controls.upgradeLabels.baseSupplyGeneration,
    [UpgradeType.BaseSupplyCapacity]:
      TEXT.controls.upgradeLabels.baseSupplyCapacity,
    [UpgradeType.Regeneration]: TEXT.controls.upgradeLabels.regeneration,
  };
  for (const upgrade of Object.values(UpgradeType)) {
    const item = document.createElement("div");
    item.className = "upgrade-item";
    const level = document.createElement("span");
    level.className = "upgrade-level";
    level.textContent = "LV 0";
    const button = document.createElement("button");
    button.ariaLabel = TEXT.controls.upgrades;
    button.dataset.value = upgrade;
    button.dataset.label = labels[upgrade];
    setUpgradeButtonText(button, labels[upgrade], 100);
    button.addEventListener("click", () => onUpgrade(upgrade));
    item.append(level, button);
    controls.upgradeControls.append(item);
  }
}

function setUpgradeButtonText(
  button: HTMLButtonElement,
  label: string,
  cost: number,
): void {
  const name = document.createElement("span");
  name.textContent = label;
  const price = document.createElement("small");
  price.textContent = TEXT.controls.upgradePrice("", cost).trim();
  button.replaceChildren(name, price);
}

function createFireModeButtons(
  controls: Controls,
  onChange: (mode: FireMode) => void,
): void {
  for (const mode of FIRE_MODES) {
    const button = document.createElement("button");
    button.ariaLabel = mode;
    button.dataset.value = mode;
    button.innerHTML = fireModeIcon(mode);
    button.addEventListener("click", () => {
      selectActive(controls.fireControls, mode);
      onChange(mode);
    });
    controls.fireControls.append(button);
  }
}

function setupDebugReadouts(): void {
  for (const id of [
    "ship-count",
    "planet-count",
    "asteroid-count",
    "game-speed",
  ]) {
    const input = requiredInput(`#${id}`);
    const output = input.parentElement?.querySelector("output");
    if (!(output instanceof HTMLOutputElement))
      throw new Error(`Missing output for ${id}`);
    const update = () => {
      output.textContent =
        id === "game-speed" ? `${input.value}×` : input.value;
    };
    update();
    input.addEventListener("input", update);
  }
}

function selectActive(root: HTMLElement, value: string): void {
  root.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === value);
  });
}

function formationIcon(formation: Formation): string {
  const dot = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="2" fill="currentColor"/>`;
  const points: Record<Formation, [number, number][]> = {
    [Formation.Line]: [
      [7, 14],
      [13, 14],
      [19, 14],
      [25, 14],
    ],
    [Formation.Column]: [
      [16, 6],
      [16, 12],
      [16, 18],
      [16, 24],
    ],
    [Formation.Arrow]: [
      [16, 7],
      [11, 14],
      [21, 14],
      [7, 21],
      [25, 21],
    ],
    [Formation.Circle]: [
      [16, 6],
      [25, 11],
      [25, 19],
      [16, 24],
      [7, 19],
      [7, 11],
    ],
    [Formation.Pincer]: [
      [7, 7],
      [12, 12],
      [7, 21],
      [12, 17],
      [25, 7],
      [20, 12],
      [25, 21],
      [20, 17],
    ],
  };
  return `<svg viewBox="0 0 32 30">${points[formation].map(([x, y]) => dot(x, y)).join("")}</svg>`;
}

function fireModeIcon(mode: FireMode): string {
  if (mode === FireMode.Hold) {
    return `<svg viewBox="0 0 32 30"><path d="M7 19h17l-3-4H11zM12 14l2-5h4l2 5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="22" cy="9" r="7" fill="#081724" stroke="#ff7292" stroke-width="2"/><path d="M17 4l10 10" stroke="#ff7292" stroke-width="2"/></svg>`;
  }
  if (mode === FireMode.Focus) {
    return `<svg viewBox="0 0 32 30"><path d="M16 5l7 16-7-3-7 3zM13 14h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }
  return `<svg viewBox="0 0 32 30"><g class="at-will-ship"><path d="M16 5l7 16-7-3-7 3zM13 14h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></g><path d="M6 8l-2 3 2 3M26 8l2 3-2 3" fill="none" stroke="#80efff" stroke-width="1.5"/></svg>`;
}

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement))
    throw new Error(`Missing required element: ${selector}`);
  return element;
}

function requiredInput(selector: string): HTMLInputElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLInputElement))
    throw new Error(`Missing required input: ${selector}`);
  return element;
}
