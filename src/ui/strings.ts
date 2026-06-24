export const TEXT = {
  debug: {
    battleships: "BATTLESHIPS",
    planets: "PLANETS",
    asteroids: "ASTEROID FIELDS",
    speed: "GAME SPEED",
    formationMap: "FORMATION MAP",
    applyOnStart: "Changes apply when a new match starts.",
  },
  controls: {
    upgrades: "UPGRADES",
    money: "₿",
    formation: "FORMATION",
    shootMode: "SHOOT MODE",
    captainFormation: "CAPTAIN FORMATION",
    upgradePrice: (label: string, cost: number) => label + " " + cost + " ₿",
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
    commanders: "BASE CONQUEST",
    defense: "WAVE DEFENSE",
    formations: "FORMATION DRILL",
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
    formations: "SELECT A FORMATION TO POSITION YOUR FLEET",
    formationSelected: (formation: string) =>
      `${formation.toUpperCase()} SELECTED — TAP MAP TO SET FLEET POSITION`,
    defenseFormationActive: (formation: string) =>
      `${formation.toUpperCase()} DEFENSIVE FORMATION ACTIVE`,
    weaponsHold: "WEAPONS HOLD",
    focusFire: "FOCUS FIRE — TAP AN ENEMY TO DESIGNATE",
    weaponsFree: "WEAPONS FREE — ENGAGING HOSTILES IN RANGE",
    upgradesDefenseOnly: "UPGRADES ARE AVAILABLE IN BASE DEFENSE",
    upgradeNeeded: (cost: number, upgrade: string) =>
      `NEED ${cost} ₿ FOR ${upgrade.toUpperCase()}`,
    upgradePurchased: (upgrade: string, cost: number) =>
      `${upgrade.toUpperCase()} UPGRADED — ${cost} ₿ SPENT`,
  },
  status: {
    commanders: (fleet: number, hostiles: number) =>
      `<span style="color:#5de5ff">◈ ${fleet} FLEET</span><br><span style="color:#ff7898">◇ ${hostiles} HOSTILES</span>`,
    defense: (score: number) =>
      `<span style="color:#5de5ff">SCORE ${score}</span>`,
  },
} as const;

export function applyStaticScreenText(): void {
  const labels: Record<string, string> = {
    upgrades: TEXT.controls.upgrades,
    money: TEXT.controls.money,
    formation: TEXT.controls.formation,
    "shoot-mode": TEXT.controls.shootMode,
    "captain-formation": TEXT.controls.captainFormation,
    battleships: TEXT.debug.battleships,
    planets: TEXT.debug.planets,
    asteroids: TEXT.debug.asteroids,
    speed: TEXT.debug.speed,
    "apply-on-start": TEXT.debug.applyOnStart,
    "formation-map": TEXT.debug.formationMap,
  };
  document.querySelectorAll<HTMLElement>("[data-text]").forEach((element) => {
    const value = labels[element.dataset.text ?? ""];
    if (value) element.textContent = value;
  });

  const commanders = document.querySelector<HTMLButtonElement>(
    "[data-game='command']",
  );
  if (commanders) commanders.textContent = TEXT.launcher.commanders;
  const defense = document.querySelector<HTMLButtonElement>(
    "[data-game='invaders']",
  );
  if (defense) defense.textContent = TEXT.launcher.defense;
  const formations = document.querySelector<HTMLButtonElement>(
    "[data-game='formations']",
  );
  if (formations) formations.textContent = TEXT.launcher.formations;
}
