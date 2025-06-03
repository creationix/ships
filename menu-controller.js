import { ShipRenderer, SHIP_CONFIGS } from './ship-renderer.js';
import { domBuilder } from './dombuilder.js';

/**
 * Menu controller for managing ship selection and player states
 */

// Player states
const PLAYER_STATES = {
  DEACTIVATED: 'deactivated',
  SELECTING: 'selecting',
  SELECTED: 'selected',
  READY: 'ready'
};

export class MenuController {
  constructor(inputManager) {
    this.inputManager = inputManager;
    this.players = new Map(); // Map of controller ID to player data
    this.selectedShips = new Set(); // Track which ships are claimed
    this.countdownActive = false;
    this.countdownValue = 0;
    this.countdownElement = null;
    this.welcomeElement = null;
    
    this.createWelcomeMessage();
  }
  
  createWelcomeMessage() {
    this.welcomeElement = domBuilder([
      '.welcome-message',
      {
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '24px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif'
        }
      },
      'Press WASD+C+V or Arrow Keys+<+> or any gamepad button to join!'
    ]);
    document.body.appendChild(this.welcomeElement);
  }
  
  removeWelcomeMessage() {
    if (this.welcomeElement && this.welcomeElement.parentNode) {
      this.welcomeElement.parentNode.removeChild(this.welcomeElement);
      this.welcomeElement = null;
    }
  }
  
  update(time, delta) {
    const activeControllers = this.inputManager.getActiveControllers();
    
    // Remove welcome message if we have active controllers
    if (activeControllers.length > 0 && this.welcomeElement) {
      this.removeWelcomeMessage();
    }
    
    // Add welcome message back if no active controllers
    if (activeControllers.length === 0 && !this.welcomeElement) {
      this.createWelcomeMessage();
    }
    
    // Process each active controller
    for (const controller of activeControllers) {
      this.updatePlayer(controller, time);
    }
    
    // Remove players whose controllers are no longer active
    for (const [controllerId, player] of this.players) {
      if (!activeControllers.find(c => c.id === controllerId)) {
        this.removePlayer(controllerId);
      }
    }
    
    // Update player positions and rendering
    this.updatePlayerPositions(time);
    
    // Check if we should start countdown
    this.updateCountdown(time);
  }
  
  updatePlayer(controller, time) {
    let player = this.players.get(controller.id);
    
    // Create new player if doesn't exist
    if (!player) {
      player = this.createPlayer(controller);
      this.players.set(controller.id, player);
    }
    
    // Handle input based on current state
    switch (player.state) {
      case PLAYER_STATES.SELECTING:
        this.handleSelectingInput(player, controller);
        break;
      case PLAYER_STATES.SELECTED:
        this.handleSelectedInput(player, controller);
        break;
      case PLAYER_STATES.READY:
        this.handleReadyInput(player, controller);
        break;
    }
    
    // Update ship rendering based on state
    this.updatePlayerRendering(player, time);
  }
  
  createPlayer(controller) {
    // Assign random available ship
    const availableShips = SHIP_CONFIGS.filter(config => !this.selectedShips.has(config.ship));
    const randomShip = availableShips[Math.floor(Math.random() * availableShips.length)];
    
    const renderer = new ShipRenderer(randomShip.ship, randomShip.hue);
    renderer.start();
    
    const player = {
      controllerId: controller.id,
      controllerType: controller.type,
      state: PLAYER_STATES.SELECTING,
      currentShip: randomShip,
      renderer: renderer,
      x: 0,
      y: 0,
      label: this.getControllerLabel(controller)
    };
    
    this.createPlayerLabel(player);
    return player;
  }
  
  createPlayerLabel(player) {
    player.labelElement = domBuilder([
      '.player-label',
      {
        style: {
          position: 'absolute',
          color: 'white',
          fontSize: '16px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }
      },
      player.label
    ]);
    document.body.appendChild(player.labelElement);
  }
  
  removePlayer(controllerId) {
    const player = this.players.get(controllerId);
    if (player) {
      // Release selected ship
      if (player.state === PLAYER_STATES.SELECTED || player.state === PLAYER_STATES.READY) {
        this.selectedShips.delete(player.currentShip.ship);
      }
      
      // Clean up renderer and label
      player.renderer.stop();
      if (player.labelElement && player.labelElement.parentNode) {
        player.labelElement.parentNode.removeChild(player.labelElement);
      }
      
      this.players.delete(controllerId);
    }
  }
  
  getControllerLabel(controller) {
    switch (controller.id) {
      case 'keyboard-left': return 'Keyboard Left';
      case 'keyboard-right': return 'Keyboard Right';
      default: 
        if (controller.id.startsWith('gamepad-')) {
          const index = controller.id.split('-')[1];
          return `Gamepad ${parseInt(index) + 1}`;
        }
        return 'Unknown Controller';
    }
  }
  
  handleSelectingInput(player, controller) {
    // Left/Right to cycle ships
    if (this.inputManager.getLeftPress(controller.id)) {
      this.cycleShip(player, -1);
    } else if (this.inputManager.getRightPress(controller.id)) {
      this.cycleShip(player, 1);
    }
    
    // Primary button to select ship
    if (this.inputManager.getPrimaryPress(controller.id)) {
      this.selectShip(player);
    }
    
    // Secondary button to deactivate
    if (this.inputManager.getSecondaryPress(controller.id)) {
      this.inputManager.deactivateController(controller.id);
    }
  }
  
  handleSelectedInput(player, controller) {
    // Primary button to go ready
    if (this.inputManager.getPrimaryPress(controller.id)) {
      player.state = PLAYER_STATES.READY;
    }
    
    // Secondary button to go back to selecting
    if (this.inputManager.getSecondaryPress(controller.id)) {
      this.selectedShips.delete(player.currentShip.ship);
      player.state = PLAYER_STATES.SELECTING;
    }
  }
  
  handleReadyInput(player, controller) {
    // Secondary button to go back to selected
    if (this.inputManager.getSecondaryPress(controller.id)) {
      player.state = PLAYER_STATES.SELECTED;
    }
  }
  
  cycleShip(player, direction) {
    // Always cycle through ALL ships, regardless of selection status
    const currentIndex = SHIP_CONFIGS.findIndex(config => config.ship === player.currentShip.ship);
    let newIndex = (currentIndex + direction + SHIP_CONFIGS.length) % SHIP_CONFIGS.length;
    
    const newShip = SHIP_CONFIGS[newIndex];
    player.currentShip = newShip;
    
    // Update renderer
    player.renderer.stop();
    player.renderer = new ShipRenderer(newShip.ship, newShip.hue);
    player.renderer.start();
  }
  
  selectShip(player) {
    // Check if ship is available
    if (this.selectedShips.has(player.currentShip.ship)) {
      return; // Ship already taken
    }
    
    // Claim the ship
    this.selectedShips.add(player.currentShip.ship);
    player.state = PLAYER_STATES.SELECTED;
    
    // Bump other players who had this ship
    for (const [otherId, otherPlayer] of this.players) {
      if (otherId !== player.controllerId && 
          otherPlayer.currentShip.ship === player.currentShip.ship &&
          otherPlayer.state === PLAYER_STATES.SELECTING) {
        this.cycleShip(otherPlayer, 1);
      }
    }
  }
  
  updatePlayerPositions(time) {
    const players = Array.from(this.players.values());
    const playerCount = players.length;
    
    if (playerCount === 0) return;
    
    // Arrange players in a horizontal row
    const spacing = Math.min(300, window.innerWidth / (playerCount + 1));
    const startX = (window.innerWidth - (playerCount - 1) * spacing) / 2;
    const y = window.innerHeight / 2;
    
    players.forEach((player, index) => {
      player.x = startX + index * spacing;
      player.y = y;
      
      // Update label position
      if (player.labelElement) {
        player.labelElement.style.left = `${player.x - 64}px`;
        player.labelElement.style.top = `${player.y - 120}px`;
        player.labelElement.style.width = '128px';
      }
    });
  }
  
  updatePlayerRendering(player, time) {
    switch (player.state) {
      case PLAYER_STATES.SELECTING:
        player.renderer.renderCycling(player.x, player.y, time);
        break;
      case PLAYER_STATES.SELECTED:
        player.renderer.renderSelected(player.x, player.y, time);
        break;
      case PLAYER_STATES.READY:
        player.renderer.renderReady(player.x, player.y, time);
        break;
    }
  }
  
  updateCountdown(time) {
    const players = Array.from(this.players.values());
    const allReady = players.length > 0 && players.every(p => p.state === PLAYER_STATES.READY);
    
    if (allReady && !this.countdownActive) {
      this.startCountdown();
    } else if (!allReady && this.countdownActive) {
      this.stopCountdown();
    }
    
    if (this.countdownActive) {
      const elapsed = (Date.now() - this.countdownStartTime) / 1000;
      const remaining = Math.max(0, 5 - elapsed);
      const newValue = Math.ceil(remaining);
      
      if (newValue !== this.countdownValue) {
        this.countdownValue = newValue;
        this.updateCountdownDisplay();
      }
      
      if (remaining <= 0) {
        this.startGame();
      }
    }
  }
  
  startCountdown() {
    this.countdownActive = true;
    this.countdownStartTime = Date.now();
    this.countdownValue = 5;
    
    this.countdownElement = domBuilder([
      '.countdown',
      {
        style: {
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '72px',
          fontFamily: 'Arial, sans-serif',
          textShadow: '4px 4px 8px rgba(0,0,0,0.8)'
        }
      },
      '5'
    ]);
    document.body.appendChild(this.countdownElement);
  }
  
  stopCountdown() {
    this.countdownActive = false;
    if (this.countdownElement && this.countdownElement.parentNode) {
      this.countdownElement.parentNode.removeChild(this.countdownElement);
      this.countdownElement = null;
    }
  }
  
  updateCountdownDisplay() {
    if (this.countdownElement) {
      this.countdownElement.textContent = this.countdownValue.toString();
    }
  }
  
  startGame() {
    console.log('Starting game with players:', Array.from(this.players.keys()));
    this.stopCountdown();
    
    // Trigger game start callback if provided
    if (this.onGameStart) {
      this.onGameStart(Array.from(this.players.values()));
    }
  }
  
  setGameStartCallback(callback) {
    this.onGameStart = callback;
  }
  
  getPlayers() {
    return Array.from(this.players.values());
  }
  
  cleanup() {
    // Stop countdown
    this.stopCountdown();
    
    // Remove welcome message
    if (this.welcomeElement && this.welcomeElement.parentNode) {
      this.welcomeElement.parentNode.removeChild(this.welcomeElement);
    }
    
    // Clean up all player renderers and labels
    for (const [playerId, player] of this.players) {
      if (player.renderer) {
        player.renderer.stop();
      }
      if (player.labelElement && player.labelElement.parentNode) {
        player.labelElement.parentNode.removeChild(player.labelElement);
      }
    }
    
    this.players.clear();
  }
}