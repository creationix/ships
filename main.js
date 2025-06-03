import { GamepadManager } from "./gamepad.js"
import { GameState } from "./gamestate.js"
import { KeyboardFallback } from "./keyboard.js"
import { MenuNavigator } from "./menu.js"
import { Ship, colorPairs } from "./ship.js"
import { createUI, updateUI } from "./ui.js"

/**
 * @type "MENU" | "GAME"
 */
let mode = 'MENU'

// Initialize managers
const gamepadManager = new GamepadManager();
const gameState = new GameState();
const keyboardFallback = new KeyboardFallback();
const menuNavigator = new MenuNavigator();

// Create sprites
const sprites = []
for (const { ship, hue } of colorPairs) {
  const sprite = Ship(ship, hue)
  sprites.push(sprite);
  sprite.start();
}

// Create UI
const ui = createUI();

// Animation loop using requestAnimationFrame
let before = 0;
function animate() {
  const time = Date.now() / 1000; // seconds
  const delta = before ? time - before : 0;
  before = time;
  
  // Update gamepad manager
  gamepadManager.update();
  
  // Handle menu navigation
  if (mode === 'MENU') {
    const connectedGamepads = gamepadManager.getConnectedGamepads();
    for (const gamepad of connectedGamepads) {
      menuNavigator.addCursor(gamepad.index);
      const newMode = menuNavigator.updateCursor(gamepad.index, time, gamepadManager, gameState, sprites, colorPairs);
      if (newMode === 'GAME') {
        mode = 'GAME';
        // Reset ship positions for game mode
        for (const sprite of sprites) {
          sprite.setHighlighted(false);
        }
      }
    }
    
    // Handle keyboard input
    const keyboardResult = keyboardFallback.simulateGamepad(time, gameState, menuNavigator, sprites, colorPairs, mode);
    if (keyboardResult === 'GAME') {
      mode = 'GAME';
      // Reset ship positions for game mode
      for (const sprite of sprites) {
        sprite.setHighlighted(false);
      }
    }
  } else {
    // Handle game mode input
    const connectedGamepads = gamepadManager.getConnectedGamepads();
    for (const gamepad of connectedGamepads) {
      if (gamepadManager.isButtonJustPressed(gamepad.index, 8)) { // Select button
        mode = 'MENU';
        // Reset game state
        for (const sprite of sprites) {
          sprite.setControlledByPlayer(null);
          sprite.setSelected(false);
        }
        gameState.players.clear();
        gameState.selectedShips.clear();
        menuNavigator.cursors.clear();
        break;
      }
    }
    
    // Handle keyboard return to menu
    if (keyboardFallback.isKeyJustPressed('Escape', time)) {
      mode = 'MENU';
      // Reset game state
      for (const sprite of sprites) {
        sprite.setControlledByPlayer(null);
        sprite.setSelected(false);
      }
      gameState.players.clear();
      gameState.selectedShips.clear();
      menuNavigator.cursors.clear();
    }
  }
  
  // Update sprites
  for (const sprite of sprites) {
    sprite.update(time, delta, mode, gamepadManager, keyboardFallback);
  }
  
  // Update UI
  updateUI(ui, mode, gamepadManager, gameState);
  
  requestAnimationFrame(animate);
}

// Start the animation loop
requestAnimationFrame(animate);

// Optional: Auto-reload every 5 minutes (commented out)
// setTimeout(() => {
//   window.location.reload();
// }, 1000 * 60 * 5);