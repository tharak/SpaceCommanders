import { FIRE_MODES, FORMATIONS } from "../game/constants";
import { FireMode, Formation } from "../game/types";
import type { Config } from "../game/types";

type Controls = {
  formationControls: HTMLElement;
  fireControls: HTMLElement;
  cohesionControl: HTMLElement;
  tightnessValue: HTMLElement;
  readout: HTMLElement;
};

type ControlCallbacks = {
  onFormationChange: (formation: Formation) => void;
  onFireModeChange: (mode: FireMode) => void;
  onCohesionChange: (cohesion: number) => void;
  onReset: () => void;
};

export function getControls(): Controls {
  return {
    formationControls: requiredElement("#formation-controls"),
    fireControls: requiredElement("#fire-controls"),
    cohesionControl: requiredElement("#cohesion-control"),
    tightnessValue: requiredElement("#tightness-value"),
    readout: requiredElement("#order-readout"),
  };
}

export function setupControls(
  controls: Controls,
  callbacks: ControlCallbacks,
  initialFormation: Formation,
  initialFireMode: FireMode,
  initialCohesion: number,
): void {
  createFormationButtons(controls, callbacks.onFormationChange);
  createFireModeButtons(controls, callbacks.onFireModeChange);
  selectActive(controls.formationControls, initialFormation);
  selectActive(controls.fireControls, initialFireMode);
  setupCohesionControl(controls, callbacks.onCohesionChange, initialCohesion);
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

export function showReadout(controls: Controls, message: string): void {
  controls.readout.textContent = message;
}

function setupCohesionControl(
  controls: Controls,
  onChange: (cohesion: number) => void,
  initialCohesion: number,
): void {
  let cohesion = initialCohesion;
  let startX = 0;
  let startCohesion = cohesion;

  const update = (value: number) => {
    cohesion = Math.min(1, Math.max(0.25, value));
    const percent = Math.round(cohesion * 100);
    controls.tightnessValue.textContent = percent + "%";
    controls.cohesionControl.setAttribute("aria-valuenow", String(percent));
    onChange(cohesion);
  };

  controls.cohesionControl.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startCohesion = cohesion;
    controls.cohesionControl.setPointerCapture(event.pointerId);
  });
  controls.cohesionControl.addEventListener("pointermove", (event) => {
    if (!controls.cohesionControl.hasPointerCapture(event.pointerId)) return;
    update(startCohesion + (event.clientX - startX) / 200);
  });
  controls.cohesionControl.addEventListener("pointerup", (event) => {
    if (controls.cohesionControl.hasPointerCapture(event.pointerId)) {
      controls.cohesionControl.releasePointerCapture(event.pointerId);
    }
  });
  controls.cohesionControl.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") update(cohesion - 0.05);
    else if (event.key === "ArrowRight") update(cohesion + 0.05);
    else if (event.key === "Home") update(0.25);
    else if (event.key === "End") update(1);
    else return;
    event.preventDefault();
  });
  update(initialCohesion);
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
  const spread =
    mode === FireMode.Focus
      ? "M14 7h4M14 12h4M14 17h4"
      : "M11 7h4M15 12h4M19 17h4";
  return `<svg viewBox="0 0 32 30"><path d="M6 22h17l-3-5H10zM12 17l2-5h4l2 5" fill="none" stroke="currentColor" stroke-width="2"/><path d="${spread}" stroke="#80efff" stroke-width="2"/></svg>`;
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
