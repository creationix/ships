import { domBuilder } from "./dombuilder.js"

/**
 * @type "MENU" | "GAME"
 */
let mode = 'MENU'

// Gamepad input system
class GamepadManager {
  constructor() {
    this.gamepads = new Map();
    this.deadzone = 0.1;
    this.buttonStates = new Map();
    
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepads.set(e.gamepad.index, e.gamepad);
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      this.gamepads.delete(e.gamepad.index);
      this.buttonStates.delete(e.gamepad.index);
    });
  }
  
  update() {
    // Update gamepad states
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepads.set(i, gamepads[i]);
      }
    }
  }
  
  getGamepad(index = 0) {
    return this.gamepads.get(index);
  }
  
  getAxis(gamepadIndex, axisIndex) {
    const gamepad = this.getGamepad(gamepadIndex);
    if (!gamepad || !gamepad.axes[axisIndex]) return 0;
    
    const value = gamepad.axes[axisIndex];
    return Math.abs(value) > this.deadzone ? value : 0;
  }
  
  isButtonPressed(gamepadIndex, buttonIndex) {
    const gamepad = this.getGamepad(gamepadIndex);
    if (!gamepad || !gamepad.buttons[buttonIndex]) return false;
    
    return gamepad.buttons[buttonIndex].pressed;
  }
  
  isButtonJustPressed(gamepadIndex, buttonIndex) {
    const gamepad = this.getGamepad(gamepadIndex);
    if (!gamepad || !gamepad.buttons[buttonIndex]) return false;
    
    const key = `${gamepadIndex}-${buttonIndex}`;
    const currentState = gamepad.buttons[buttonIndex].pressed;
    const previousState = this.buttonStates.get(key) || false;
    
    this.buttonStates.set(key, currentState);
    
    return currentState && !previousState;
  }
  
  getConnectedGamepads() {
    return Array.from(this.gamepads.keys());
  }
}

// Game state management
class GameState {
  constructor() {
    this.players = new Map();
    this.selectedShips = new Map();
    this.maxPlayers = 4;
  }
  
  addPlayer(gamepadIndex, shipIndex) {
    if (this.players.size >= this.maxPlayers) return false;
    
    this.players.set(gamepadIndex, {
      gamepadIndex,
      shipIndex,
      ready: false
    });
    
    this.selectedShips.set(gamepadIndex, shipIndex);
    return true;
  }
  
  removePlayer(gamepadIndex) {
    this.players.delete(gamepadIndex);
    this.selectedShips.delete(gamepadIndex);
  }
  
  isShipSelected(shipIndex) {
    return Array.from(this.selectedShips.values()).includes(shipIndex);
  }
  
  getPlayerShip(gamepadIndex) {
    return this.selectedShips.get(gamepadIndex);
  }
  
  setPlayerReady(gamepadIndex, ready = true) {
    const player = this.players.get(gamepadIndex);
    if (player) {
      player.ready = ready;
    }
  }
  
  allPlayersReady() {
    if (this.players.size === 0) return false;
    return Array.from(this.players.values()).every(player => player.ready);
  }
  
  getPlayers() {
    return Array.from(this.players.values());
  }
}

const gamepadManager = new GamepadManager();
const gameState = new GameState();

// Keyboard fallback for testing
class KeyboardFallback {
  constructor() {
    this.keys = new Set();
    this.lastKeyTime = new Map();
    this.keyDelay = 0.2;
    
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }
  
  isKeyJustPressed(keyCode, time) {
    const lastTime = this.lastKeyTime.get(keyCode) || 0;
    if (this.keys.has(keyCode) && time - lastTime > this.keyDelay) {
      this.lastKeyTime.set(keyCode, time);
      return true;
    }
    return false;
  }
  
  simulateGamepad(time) {
    // Simulate gamepad 99 for keyboard
    const gamepadIndex = 99;
    
    // Add keyboard player if not exists
    if (!gameState.players.has(gamepadIndex) && mode === 'MENU') {
      menuNavigator.addCursor(gamepadIndex);
    }
    
    if (mode === 'MENU') {
      const cursor = menuNavigator.cursors.get(gamepadIndex);
      if (cursor) {
        const canMove = time - cursor.lastMoveTime > this.keyDelay;
        
        if (canMove && this.keys.has('ArrowLeft')) {
          cursor.x = Math.max(0, cursor.x - 1);
          cursor.lastMoveTime = time;
        }
        if (canMove && this.keys.has('ArrowRight')) {
          cursor.x = Math.min(3, cursor.x + 1);
          cursor.lastMoveTime = time;
        }
        if (canMove && this.keys.has('ArrowUp')) {
          cursor.y = Math.max(0, cursor.y - 1);
          cursor.lastMoveTime = time;
        }
        if (canMove && this.keys.has('ArrowDown')) {
          cursor.y = Math.min(2, cursor.y + 1);
          cursor.lastMoveTime = time;
        }
        
        // Selection
        if (this.isKeyJustPressed('Space', time)) {
          const shipIndex = cursor.y * 4 + cursor.x;
          if (!gameState.isShipSelected(shipIndex)) {
            if (cursor.selectedShip !== null) {
              const prevSprite = sprites.find(s => s.index === colorPairs[cursor.selectedShip].ship);
              if (prevSprite) prevSprite.setSelected(false);
              gameState.removePlayer(gamepadIndex);
            }
            
            cursor.selectedShip = shipIndex;
            gameState.addPlayer(gamepadIndex, shipIndex);
            
            const sprite = sprites.find(s => s.index === colorPairs[shipIndex].ship);
            if (sprite) {
              sprite.setSelected(true);
              sprite.setControlledByPlayer(gamepadIndex);
            }
          }
        }
        
        // Start game
        if (this.isKeyJustPressed('Enter', time) && cursor.selectedShip !== null) {
          gameState.setPlayerReady(gamepadIndex, true);
          if (gameState.allPlayersReady() && gameState.getPlayers().length > 0) {
            mode = 'GAME';
            for (const sprite of sprites) {
              sprite.setHighlighted(false);
            }
          }
        }
        
        menuNavigator.updateHighlighting();
      }
    }
    
    return {
      getAxis: (index) => {
        if (index === 0) { // Left stick X
          if (this.keys.has('KeyA')) return -1;
          if (this.keys.has('KeyD')) return 1;
          return 0;
        }
        if (index === 1) { // Left stick Y
          if (this.keys.has('KeyW')) return -1;
          if (this.keys.has('KeyS')) return 1;
          return 0;
        }
        if (index === 2) { // Right stick X
          if (this.keys.has('KeyJ')) return -1;
          if (this.keys.has('KeyL')) return 1;
          return 0;
        }
        if (index === 3) { // Right stick Y
          if (this.keys.has('KeyI')) return -1;
          if (this.keys.has('KeyK')) return 1;
          return 0;
        }
        return 0;
      },
      isButtonPressed: (index) => {
        if (index === 7) return this.keys.has('KeyE'); // Right trigger
        return false;
      }
    };
  }
}

const keyboardFallback = new KeyboardFallback();

// index from 0-17
function Ship(index, hue) {
  const ix = index % 4
  const iy = Math.floor(index / 4);
  const style = {
    backgroundPosition: `${-ix * 128}px ${-iy * 128}px`,
  }
  const s1 = domBuilder(['.ship', { style }])
  
  // Position of the center of the ship
  let posX = Math.random() * window.innerWidth;
  let posY = Math.random() * window.innerHeight;
  // velocity of the ship
  let velocityX = 0;
  let velocityY = 0;
  // Angle of rotation
  let offset = Math.random() * 100
  let angle = 0;
  // Acceleration in pixels per second squared
  let thrust = 200;
  const maxVelocity = 300;
  const trail = []
  
  // Player control variables
  let controlledByPlayer = null;
  let isSelected = false;
  let isHighlighted = false;
  
  for (let i = 0; i < 100; i++) {
    const t = trail[i] = domBuilder(['.trail'])
    t.x = -10
    t.y = -10
  }


  return {
    index,
    start() {
      for (const t of trail) {
        document.body.appendChild(t);
      }
      trail[-1] = {}
      document.body.appendChild(s1);
    },
    stop() {
      if (s1.parentNode) {
        s1.parentNode.removeChild(s1);
      }
      for (const t of trail) {
        if (t.parentNode) {
          t.parentNode.removeChild(t);
        }
      }
    },
    moveTo(x, y, angle) {
      s1.style.transform = `translate(${x - 64}px, ${y - 64}px) rotate(${angle + 90}deg)`;
    },
    setControlledByPlayer(playerIndex) {
      controlledByPlayer = playerIndex;
    },
    setSelected(selected) {
      isSelected = selected;
      this.updateVisualState();
    },
    setHighlighted(highlighted) {
      isHighlighted = highlighted;
      this.updateVisualState();
    },
    updateVisualState() {
      let borderColor = '';
      let borderWidth = '0px';
      
      if (isSelected) {
        borderColor = `hsl(${hue}deg, 100%, 50%)`;
        borderWidth = '4px';
      } else if (isHighlighted) {
        borderColor = 'white';
        borderWidth = '2px';
      }
      
      s1.style.border = borderWidth ? `${borderWidth} solid ${borderColor}` : '';
      s1.style.boxShadow = isSelected ? `0 0 20px hsl(${hue}deg, 100%, 50%)` : '';
    },
    updateMenu(time, delta) {
      const mx = Math.round(window.innerWidth / 4 * (iy + 0.5));
      const my = Math.round(window.innerHeight / 3 * (ix - 0.5));
      const targetX = window.innerWidth / 2 + Math.sin(time / 2) * 400;
      const targetY = window.innerHeight / 2 + Math.cos(time / 2) * 400;

      const angle = Math.atan2(targetY - my, targetX - mx) * 180 / Math.PI;
      // const angle = time * 10;
      this.moveTo(mx, my, angle);
      // Make the particles spin around the spaceship
      const radius = 100;
      const angleOffset = (Math.sin(time / 2 + offset)); // slow rotation
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        const angle = angleOffset + (i / trail.length) * Math.PI * 2; // spread particles around
        t.x = mx + Math.cos(angle * (6)) * (Math.sin(i + offset) + 1) * radius * i / trail.length;
        t.y = my + Math.sin(angle * (6)) * (Math.cos(i + offset) + 1) * radius * i / trail.length;
        const alpha = (1 - i / trail.length) * 0.5;
        const sat = i < trail.length * 0.8 ? 100 : 20
        t.style.boxShadow = `0px 0px 6px 6px hsla(${hue}deg, ${sat}%, 50%, ${alpha})`;
        t.style.transform = `translate(${t.x}px, ${t.y}px)`;

      }



    },
    updateGame(time, delta) {
      if (controlledByPlayer !== null) {
        // Player-controlled ship
        let leftStickX, leftStickY, rightStickX, rightStickY, rightTrigger;
        
        if (controlledByPlayer === 99) {
          // Keyboard control
          const kb = keyboardFallback.simulateGamepad(time);
          leftStickX = kb.getAxis(0);
          leftStickY = kb.getAxis(1);
          rightStickX = kb.getAxis(2);
          rightStickY = kb.getAxis(3);
          rightTrigger = kb.isButtonPressed(7) ? 1 : 0;
        } else {
          // Gamepad control
          leftStickX = gamepadManager.getAxis(controlledByPlayer, 0);
          leftStickY = gamepadManager.getAxis(controlledByPlayer, 1);
          rightStickX = gamepadManager.getAxis(controlledByPlayer, 2);
          rightStickY = gamepadManager.getAxis(controlledByPlayer, 3);
          rightTrigger = gamepadManager.isButtonPressed(controlledByPlayer, 7) ? 1 : 0;
        }
        
        // Use right stick for rotation, left stick for thrust direction
        if (Math.abs(rightStickX) > 0.1 || Math.abs(rightStickY) > 0.1) {
          angle = Math.atan2(rightStickY, rightStickX) * 180 / Math.PI;
        }
        
        // Thrust with left stick or right trigger
        const thrustInput = Math.sqrt(leftStickX * leftStickX + leftStickY * leftStickY);
        
        const thrustAmount = Math.max(thrustInput, rightTrigger);
        
        if (thrustAmount > 0.1) {
          let thrustAngle = angle;
          if (thrustInput > 0.1) {
            thrustAngle = Math.atan2(leftStickY, leftStickX) * 180 / Math.PI;
          }
          
          velocityX += thrust * Math.cos(thrustAngle * Math.PI / 180) * delta * thrustAmount;
          velocityY += thrust * Math.sin(thrustAngle * Math.PI / 180) * delta * thrustAmount;
        }
        
        // Apply drag
        velocityX *= 0.98;
        velocityY *= 0.98;
      } else {
        // AI-controlled ship (original behavior)
        const t = time + offset;
        angle = Math.sin(t / 1.6) * 30 + Math.sin(t / 2) * 18 + Math.cos(t / 3) * 180 + Math.cos(t / 4) * 180 + Math.cos(t / 5) * 180;

        velocityX += thrust * Math.cos(angle * Math.PI / 180) * delta * 0.3;
        velocityY += thrust * Math.sin(angle * Math.PI / 180) * delta * 0.3;
      }

      posX += velocityX * delta;
      posY += velocityY * delta;

      // Limit max velocity
      const currentVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      if (currentVelocity > maxVelocity) {
        const scale = maxVelocity / currentVelocity;
        velocityX *= scale;
        velocityY *= scale;
      }

      // Wrap around the screen
      if (posX < 0) posX += window.innerWidth;
      if (posX > window.innerWidth) posX -= window.innerWidth;
      if (posY < 0) posY += window.innerHeight;
      if (posY > window.innerHeight) posY -= window.innerHeight;

      const life = controlledByPlayer !== null ? 1 : Math.sin((time + offset) / 5) * 0.5 + 0.5;

      // Update the ship's position and rotation using CSS transforms
      this.moveTo(posX, posY, angle);
      trail[-1].x = posX + Math.cos((angle + 180) * Math.PI / 180) * 50;
      trail[-1].y = posY + Math.sin((angle + 180) * Math.PI / 180) * 50;
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i];
        let prev = trail[i - 1]
        t.x = prev.x;
        t.y = prev.y;
        const alpha = (1 - i / trail.length) * .5;
        const sat = i < trail.length * life ? 100 : 20;
        t.style.boxShadow = `0px 0px 6px 6px hsla(${hue}deg, ${sat}%, 50%, ${alpha})`;

        t.style.transform = `translate(${t.x - 3}px, ${t.y - 3}px)`;
      }
    },
    update(time, delta) {
      if (mode === 'MENU') return this.updateMenu(time, delta);
      return this.updateGame(time, delta);
    }
  }
}

const colorPairs = [
  { ship: 1, hue: 150 }, // green-blue
  { ship: 2, hue: 0 }, // red
  { ship: 3, hue: 270 }, // purple

  { ship: 5, hue: 180 }, // teal
  { ship: 6, hue: 120 }, // green
  { ship: 7, hue: 30 }, // yellow-orange

  { ship: 9, hue: 190 }, // blue-green
  { ship: 10, hue: 330 }, // pink
  { ship: 11, hue: 210 }, // blue

  { ship: 13, hue: 90 }, // lime
  { ship: 14, hue: 20 }, // orange
  { ship: 15, hue: 50 }, // yellow
]

const sprites = []
for (const { ship, hue } of colorPairs) {
  const sprite = Ship(ship, hue)
  sprites.push(sprite);
  sprite.start();
}

// Menu navigation
class MenuNavigator {
  constructor() {
    this.cursors = new Map(); // gamepadIndex -> { x, y, selectedShip, lastMoveTime }
    this.gridWidth = 4;
    this.gridHeight = 3;
    this.moveDelay = 0.2; // seconds between moves
  }
  
  addCursor(gamepadIndex) {
    if (!this.cursors.has(gamepadIndex)) {
      this.cursors.set(gamepadIndex, {
        x: 0,
        y: 0,
        selectedShip: null,
        lastMoveTime: 0
      });
    }
  }
  
  updateCursor(gamepadIndex, time) {
    const cursor = this.cursors.get(gamepadIndex);
    if (!cursor) return;
    
    // Handle D-pad or left stick navigation with timing
    const leftStickX = gamepadManager.getAxis(gamepadIndex, 0);
    const leftStickY = gamepadManager.getAxis(gamepadIndex, 1);
    
    const canMove = time - cursor.lastMoveTime > this.moveDelay;
    
    // Check for movement input (with deadzone and timing)
    if (canMove && (gamepadManager.isButtonJustPressed(gamepadIndex, 14) || leftStickX < -0.5)) { // Left
      cursor.x = Math.max(0, cursor.x - 1);
      cursor.lastMoveTime = time;
    }
    if (canMove && (gamepadManager.isButtonJustPressed(gamepadIndex, 15) || leftStickX > 0.5)) { // Right
      cursor.x = Math.min(this.gridWidth - 1, cursor.x + 1);
      cursor.lastMoveTime = time;
    }
    if (canMove && (gamepadManager.isButtonJustPressed(gamepadIndex, 12) || leftStickY < -0.5)) { // Up
      cursor.y = Math.max(0, cursor.y - 1);
      cursor.lastMoveTime = time;
    }
    if (canMove && (gamepadManager.isButtonJustPressed(gamepadIndex, 13) || leftStickY > 0.5)) { // Down
      cursor.y = Math.min(this.gridHeight - 1, cursor.y + 1);
      cursor.lastMoveTime = time;
    }
    
    // Calculate ship index from grid position
    const shipIndex = cursor.y * this.gridWidth + cursor.x;
    
    // Handle selection
    if (gamepadManager.isButtonJustPressed(gamepadIndex, 0)) { // A button
      if (!gameState.isShipSelected(shipIndex)) {
        // Select this ship
        if (cursor.selectedShip !== null) {
          // Deselect previous ship
          const prevSprite = sprites.find(s => s.index === colorPairs[cursor.selectedShip].ship);
          if (prevSprite) prevSprite.setSelected(false);
          gameState.removePlayer(gamepadIndex);
        }
        
        cursor.selectedShip = shipIndex;
        gameState.addPlayer(gamepadIndex, shipIndex);
        
        const sprite = sprites.find(s => s.index === colorPairs[shipIndex].ship);
        if (sprite) {
          sprite.setSelected(true);
          sprite.setControlledByPlayer(gamepadIndex);
        }
      }
    }
    
    // Handle ready/start
    if (gamepadManager.isButtonJustPressed(gamepadIndex, 9)) { // Start button
      if (cursor.selectedShip !== null) {
        gameState.setPlayerReady(gamepadIndex, true);
        
        // Check if all players are ready and start game
        if (gameState.allPlayersReady() && gameState.getPlayers().length > 0) {
          mode = 'GAME';
          // Reset ship positions for game mode
          for (const sprite of sprites) {
            sprite.setHighlighted(false);
          }
        }
      }
    }
    
    // Update highlighting
    this.updateHighlighting();
  }
  
  updateHighlighting() {
    // Clear all highlighting first
    for (const sprite of sprites) {
      sprite.setHighlighted(false);
    }
    
    // Highlight ships under cursors
    for (const [gamepadIndex, cursor] of this.cursors) {
      const shipIndex = cursor.y * this.gridWidth + cursor.x;
      if (shipIndex < colorPairs.length) {
        const sprite = sprites.find(s => s.index === colorPairs[shipIndex].ship);
        if (sprite && !gameState.isShipSelected(shipIndex)) {
          sprite.setHighlighted(true);
        }
      }
    }
  }
}

const menuNavigator = new MenuNavigator();

// UI for displaying game state
function createUI() {
  const ui = domBuilder(['.ui', {
    style: {
      position: 'fixed',
      top: '10px',
      left: '10px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      zIndex: '1000',
      pointerEvents: 'none'
    }
  }]);
  
  document.body.appendChild(ui);
  return ui;
}

const ui = createUI();

function updateUI() {
  const connectedGamepads = gamepadManager.getConnectedGamepads();
  const players = gameState.getPlayers();
  
  let content = '';
  
  if (mode === 'MENU') {
    content += '<div><strong>SHIP SELECTION</strong></div><br>';
    
    content += '<div><strong>Gamepad Controls:</strong></div>';
    content += '<div>• D-pad/Left stick: Navigate</div>';
    content += '<div>• A button: Select ship</div>';
    content += '<div>• START: Ready up</div><br>';
    
    content += '<div><strong>Keyboard Controls:</strong></div>';
    content += '<div>• Arrow keys: Navigate</div>';
    content += '<div>• SPACE: Select ship</div>';
    content += '<div>• ENTER: Ready up</div><br>';
    
    if (connectedGamepads.length > 0) {
      content += `<div>Connected Gamepads: ${connectedGamepads.length}</div>`;
    } else {
      content += '<div>No gamepads connected - use keyboard</div>';
    }
    
    if (players.length > 0) {
      content += '<br><div><strong>Players:</strong></div>';
      for (const player of players) {
        const ready = player.ready ? ' (READY)' : '';
        const inputType = player.gamepadIndex === 99 ? 'Keyboard' : `Gamepad ${player.gamepadIndex + 1}`;
        content += `<div>${inputType}: Ship ${player.shipIndex + 1}${ready}</div>`;
      }
    }
  } else {
    content += '<div><strong>GAME MODE</strong></div><br>';
    
    content += '<div><strong>Gamepad Controls:</strong></div>';
    content += '<div>• Left stick: Thrust</div>';
    content += '<div>• Right stick: Aim</div>';
    content += '<div>• Right trigger: Thrust</div>';
    content += '<div>• SELECT: Return to menu</div><br>';
    
    content += '<div><strong>Keyboard Controls:</strong></div>';
    content += '<div>• WASD: Thrust</div>';
    content += '<div>• IJKL: Aim</div>';
    content += '<div>• E: Thrust</div>';
    content += '<div>• ESC: Return to menu</div>';
  }
  
  ui.innerHTML = content;
}

// Animation loop using requestAnimationFrame
requestAnimationFrame(animate)
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
    for (const gamepadIndex of connectedGamepads) {
      menuNavigator.addCursor(gamepadIndex);
      menuNavigator.updateCursor(gamepadIndex, time);
    }
    
    // Handle keyboard input
    keyboardFallback.simulateGamepad(time);
  } else {
    // Handle game mode input
    const connectedGamepads = gamepadManager.getConnectedGamepads();
    for (const gamepadIndex of connectedGamepads) {
      if (gamepadManager.isButtonJustPressed(gamepadIndex, 8)) { // Select button
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
    sprite.update(time, delta);
  }
  
  // Update UI
  updateUI();
  
  requestAnimationFrame(animate);
}

// setTimeout(() => {
//   window.location.reload();
// }, 1000 * 60 * 5); // reload every 5 minutes