/**
 * Ship Joy - Main Game Logic
 * 
 * Uses modern input manager APIs for clean controller lifecycle management.
 * Players can join by activating any controller, cycle through ships,
 * select and ready up, then exit cleanly by pressing secondary in cycle mode.
 */

import { inputManager } from "./input.js";
import { ShipRenderer } from "./ship.js";

const MENU_STATES = ["deactivated", "cycling", "selected", "ready"];
const SHIP_COUNT = 12;
const SHIP_OPTIONS = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
const SHIP_LABELS = [
  'Keyboard Left',
  'Keyboard Right',
  'Gamepad 1',
  'Gamepad 2',
  'Gamepad 3',
  'Gamepad 4',
];

let mode = 'MENU';
let players = [];
let shipsInUse = new Set();

function randomShip(exclude = []) {
  const options = SHIP_OPTIONS.filter(s => !exclude.includes(s));
  return options[Math.floor(Math.random() * options.length)];
}

function addPlayer(ctrl) {
  // Assign a random available ship
  const shipIndex = randomShip([...shipsInUse]);
  shipsInUse.add(shipIndex);
  const ship = new ShipRenderer(shipIndex);
  ship.attach(document.body);
  const player = {
    ctrl,
    state: 1, // cycling
    shipIndex,
    ship,
    label: ctrl.label,
    selectionTime: 0,
    ignoreFirstPress: true, // flag to ignore first input
  };
  players.push(player);
  layoutPlayers();
  setupPlayerInput(player);
}

function removePlayer(ctrl) {
  const idx = players.findIndex(p => p.ctrl === ctrl);
  if (idx !== -1) {
    // Clean up player resources
    shipsInUse.delete(players[idx].shipIndex);
    players[idx].ship.detach();
    if (players[idx].labelDiv && players[idx].labelDiv.parentNode) {
      players[idx].labelDiv.parentNode.removeChild(players[idx].labelDiv);
      players[idx].labelDiv = null;
    }

    // Remove from players array FIRST to prevent re-entry
    players.splice(idx, 1);

    // Deactivate the controller - this will emit controller_removed event
    // but our event handler will be a no-op since player is already removed
    ctrl.deactivate();

    layoutPlayers();
  }
}

function setupPlayerInput(player) {
  const { ctrl } = player;
  function ignoreFirst(fn) {
    return function (...args) {
      if (player.ignoreFirstPress) {
        player.ignoreFirstPress = false;
        return;
      }
      fn(...args);
    };
  }
  ctrl.on('left', ignoreFirst(() => {
    if (player.state !== 1) return;
    // Cycle left
    let cur = SHIP_OPTIONS.indexOf(player.shipIndex);
    do {
      cur = (cur - 1 + SHIP_OPTIONS.length) % SHIP_OPTIONS.length;
    } while (shipsInUse.has(SHIP_OPTIONS[cur]));
    shipsInUse.delete(player.shipIndex);
    player.shipIndex = SHIP_OPTIONS[cur];
    shipsInUse.add(player.shipIndex);
    // Properly clean up old ship before creating new one
    player.ship.detach();
    player.ship = new ShipRenderer(player.shipIndex);
    layoutPlayers();
  }));
  ctrl.on('right', ignoreFirst(() => {
    if (player.state !== 1) return;
    // Cycle right
    let cur = SHIP_OPTIONS.indexOf(player.shipIndex);
    do {
      cur = (cur + 1) % SHIP_OPTIONS.length;
    } while (shipsInUse.has(SHIP_OPTIONS[cur]));
    shipsInUse.delete(player.shipIndex);
    player.shipIndex = SHIP_OPTIONS[cur];
    shipsInUse.add(player.shipIndex);
    // Properly clean up old ship before creating new one
    player.ship.detach();
    player.ship = new ShipRenderer(player.shipIndex);
    layoutPlayers();
  }));
  ctrl.on('primary', ignoreFirst(() => {
    if (player.state === 1) {
      // Select ship
      player.state = 2;
      layoutPlayers();
    } else if (player.state === 2) {
      // Ready
      player.state = 3;
      layoutPlayers();
      checkAllReady();
    }
  }));
  ctrl.on('secondary', ignoreFirst(() => {
    if (player.state === 3) {
      // Back to selected
      player.state = 2;
      layoutPlayers();
    } else if (player.state === 2) {
      // Back to cycling
      player.state = 1;
      layoutPlayers();
    } else if (player.state === 1) {
      // Remove player
      removePlayer(ctrl);
    }
  }));
}

function layoutPlayers() {
  // Remove all ships from DOM
  for (const p of players) p.ship.detach();

  // Additional safety: remove any orphaned ship elements that might be lingering
  const orphanedShips = document.querySelectorAll('.ship, .trail');
  orphanedShips.forEach(element => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // Remove all labels from DOM
  for (const p of players) {
    if (p.labelDiv && p.labelDiv.parentNode) {
      p.labelDiv.parentNode.removeChild(p.labelDiv);
      p.labelDiv = null; // Clear reference so new label can be created
    }
  }

  // Layout horizontally centered
  const w = window.innerWidth;
  const h = window.innerHeight;
  const n = players.length;
  const rowY = h / 2;
  const spacing = Math.min(220, w / (n + 1));

  for (let i = 0; i < n; ++i) {
    const p = players[i];
    const x = w / 2 + (i - (n - 1) / 2) * spacing;

    // Attach ship to DOM
    p.ship.attach(document.body);

    // Create label
    if (!p.labelDiv) {
      p.labelDiv = document.createElement('div');
      p.labelDiv.style.position = 'absolute';
      p.labelDiv.style.width = '160px';
      p.labelDiv.style.textAlign = 'center';
      p.labelDiv.style.color = '#fff';
      p.labelDiv.style.fontFamily = 'sans-serif';
      p.labelDiv.style.fontSize = '1.1em';
      p.labelDiv.style.top = `${rowY - 120}px`;
      document.body.appendChild(p.labelDiv);
    }
    p.labelDiv.textContent = `${p.label} - ${MENU_STATES[p.state]}`;
    p.labelDiv.style.left = `${x - 80}px`;
  }

  // Show welcome if no players
  if (players.length === 0 && !document.body.contains(welcome)) {
    document.body.appendChild(welcome);
  } else if (players.length > 0 && document.body.contains(welcome)) {
    welcome.parentNode.removeChild(welcome);
  }
}

function checkAllReady() {
  if (players.length && players.every(p => p.state === 3)) {
    // All ready, start countdown
    startCountdown();
  }
}

let countdownDiv = null;
function startCountdown() {
  if (countdownDiv) return;
  countdownDiv = document.createElement('div');
  countdownDiv.style.position = 'fixed';
  countdownDiv.style.left = '50%';
  countdownDiv.style.top = '20%';
  countdownDiv.style.transform = 'translate(-50%,0)';
  countdownDiv.style.color = '#fff';
  countdownDiv.style.fontSize = '4em';
  countdownDiv.style.fontFamily = 'sans-serif';
  countdownDiv.style.textAlign = 'center';
  document.body.appendChild(countdownDiv);
  let count = 5;
  function tick() {
    countdownDiv.textContent = count;
    if (players.some(p => p.state !== 3)) {
      // Someone backed out
      document.body.removeChild(countdownDiv);
      countdownDiv = null;
      return;
    }
    if (count > 0) {
      setTimeout(() => { count--; tick(); }, 1000);
    } else {
      // Start game!
      document.body.removeChild(countdownDiv);
      countdownDiv = null;
      // TODO: transition to game mode
      alert('Game Start!');
    }
  }
  tick();
}

// Listen for controller add/remove
inputManager.on('controller_added', ctrl => {
  // Only add player if they're not already in the game
  if (!players.some(p => p.ctrl === ctrl)) {
    addPlayer(ctrl);
  }
});
inputManager.on('controller_removed', ctrl => {
  // This is a no-op if player is already removed from array
  // but handles external controller disconnection
  removePlayer(ctrl);
});

// Initial welcome message
const welcome = document.createElement('div');
welcome.style.position = 'fixed';
welcome.style.left = '50%';
welcome.style.top = '30%';
welcome.style.transform = 'translate(-50%,0)';
welcome.style.color = '#fff';
welcome.style.fontSize = '2em';
welcome.style.fontFamily = 'sans-serif';
welcome.style.textAlign = 'center';
welcome.innerHTML = `Welcome!<br>Press any gamepad button or keyboard control to join.`;
document.body.appendChild(welcome);

function updateMenu() {
  inputManager.poll();
  if (players.length && welcome.parentNode) welcome.parentNode.removeChild(welcome);
  updateShipAnimations();
  requestAnimationFrame(updateMenu);
}

function updateShipAnimations() {
  // Only update ship animations, don't relayout DOM
  const w = window.innerWidth;
  const h = window.innerHeight;
  const n = players.length;
  const rowY = h / 2;
  const spacing = Math.min(220, w / (n + 1));

  for (let i = 0; i < n; ++i) {
    const p = players[i];
    const x = w / 2 + (i - (n - 1) / 2) * spacing;
    let mode = 'cloud';
    if (p.state === 2) mode = 'selected';
    if (p.state === 3) mode = 'ready';
    let angle = 0;
    if (mode === 'cloud') angle = (performance.now() / 1000) * 30;
    if (mode === 'selected') angle = 0;
    if (mode === 'ready') angle = Math.sin(performance.now() / 300) * 15;

    p.ship.update({
      x,
      y: rowY,
      angle,
      mode: (mode === 'cloud' ? 'cloud' : 'follow'),
      time: performance.now() / 1000
    });

    // Update label position
    if (p.labelDiv) {
      p.labelDiv.style.left = `${x - 80}px`;
    }
  }
}
updateMenu();

window.addEventListener('resize', layoutPlayers);