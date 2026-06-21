export const TEXT = {
  app: {
    canvasLabel: "Space Commanders tactical map",
    eyebrow: "FLEET COMMAND // 01",
    title: "SPACE <b>COMMANDERS</b>",
    debugLabel: "Open simulation tuning",
  },
  debug: {
    battleships: "BATTLESHIPS",
    planets: "PLANETS",
    asteroids: "ASTEROID FIELDS",
    speed: "GAME SPEED",
    applyOnStart: "Changes apply when a new match starts.",
  },
  controls: {
    upgrades: "UPGRADES",
    formation: "FORMATION",
    shootMode: "SHOOT MODE",
    captainFormation: "CAPTAIN FORMATION",
    upgradePrice: (label: string, cost: number) => label + " " + cost,
    upgradeLabels: {
      damage: "DMG",
      speed: "SPD",
      hull: "HP",
      range: "RNG",
      supplyShips: "SUP",
      baseSupplyGeneration: "GEN",
      baseSupplyCapacity: "CAP",
      regeneration: "REG",
    },
  },
  launcher: {
    title: "CHOOSE YOUR COMMAND",
    message: "Select a game, choose a captain formation, and begin.",
    commanders: "COMMANDERS",
    commandersDescription: "TACTICAL CONQUEST",
    defense: "PLANETARY DEFENSE",
    defenseDescription: "WAVE DEFENSE",
    startCommanders: "START COMMANDERS",
    startDefense: "START PLANETARY DEFENSE",
  },
  match: {
    tuning: "SIMULATION TUNING",
    startMatch: "START MATCH",
    replay: "PLAY AGAIN",
    victory: "VICTORY",
    defeat: "COMMAND FLEET LOST",
    victoryMessage: "The sector is secure. Select a game to play again.",
    defeatMessage: "Your base has fallen. Select a game to try again.",
  },
  readout: {
    commandOrder: "SELECT A FORMATION, THEN TAP THE MAP TO ISSUE AN ORDER",
    defenseFormation: "SELECT A FORMATION TO REORGANIZE YOUR DEFENSIVE FLEET",
    formationSelected: (formation: string) =>
      `${formation.toUpperCase()} SELECTED — TAP MAP TO SET FLEET POSITION`,
    defenseFormationActive: (formation: string) =>
      `${formation.toUpperCase()} DEFENSIVE FORMATION ACTIVE`,
    weaponsHold: "WEAPONS HOLD",
    focusFire: "FOCUS FIRE — TAP AN ENEMY TO DESIGNATE",
    weaponsFree: "WEAPONS FREE — ENGAGING HOSTILES IN RANGE",
    upgradesDefenseOnly: "UPGRADES ARE AVAILABLE IN PLANETARY DEFENSE",
    upgradeNeeded: (cost: number, upgrade: string) =>
      `NEED ${cost} SCORE FOR ${upgrade.toUpperCase()}`,
    upgradePurchased: (upgrade: string, cost: number) =>
      `${upgrade.toUpperCase()} UPGRADED — ${cost} SCORE SPENT`,
  },
  status: {
    commanders: (fleet: number, hostiles: number) =>
      `<span style="color:#5de5ff">◈ ${fleet} FLEET</span><br><span style="color:#ff7898">◇ ${hostiles} HOSTILES</span>`,
    defense: (score: number, baseHp: number, supply: number, wave: number) =>
      `<span style="color:#5de5ff">◈ DEFENSE FLEET</span><br><span style="color:#91c9de">SCORE ${score} · BASE ${baseHp}% · SUPPLY ${supply} · WAVE ${wave}</span>`,
  },
} as const;

export function applyStaticScreenText(): void {
  const canvas = document.querySelector("#game");
  if (canvas) canvas.setAttribute("aria-label", TEXT.app.canvasLabel);
  const eyebrow = document.querySelector(".eyebrow");
  if (eyebrow) eyebrow.textContent = TEXT.app.eyebrow;
  const title = document.querySelector("h1");
  if (title) title.innerHTML = TEXT.app.title;
  const debug = document.querySelector("#debug-toggle");
  if (debug) debug.setAttribute("aria-label", TEXT.app.debugLabel);

  const labels: Record<string, string> = {
    upgrades: TEXT.controls.upgrades,
    formation: TEXT.controls.formation,
    "shoot-mode": TEXT.controls.shootMode,
    "captain-formation": TEXT.controls.captainFormation,
    battleships: TEXT.debug.battleships,
    planets: TEXT.debug.planets,
    asteroids: TEXT.debug.asteroids,
    speed: TEXT.debug.speed,
    "apply-on-start": TEXT.debug.applyOnStart,
  };
  document.querySelectorAll<HTMLElement>("[data-text]").forEach((element) => {
    const value = labels[element.dataset.text ?? ""];
    if (value) element.textContent = value;
  });

  const commanders = document.querySelector<HTMLButtonElement>(
    "[data-game='command']",
  );
  if (commanders) {
    commanders.innerHTML = `${TEXT.launcher.commanders} <small>${TEXT.launcher.commandersDescription}</small>`;
  }
  const defense = document.querySelector<HTMLButtonElement>(
    "[data-game='invaders']",
  );
  if (defense) {
    defense.innerHTML = `${TEXT.launcher.defense} <small>${TEXT.launcher.defenseDescription}</small>`;
  }
}
