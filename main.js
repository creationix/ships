import { InputManager } from './input-manager.js';
import { MenuController } from './menu-controller.js';

/**
 * Ship Joy - Main Game Controller
 * Implements the menu selection system as described in game.md
 */

class Game {
  constructor() {
    this.mode = 'MENU'; // 'MENU' or 'GAME'
    this.inputManager = new InputManager();
    this.menuController = new MenuController(this.inputManager);
    
    this.startGameLoop();
  }
  
  startGameLoop() {
    let lastTime = 0;
    
    const gameLoop = (currentTime) => {
      const time = currentTime / 1000; // Convert to seconds
      const delta = lastTime ? time - lastTime : 0;
      lastTime = time;
      
      this.update(time, delta);
      requestAnimationFrame(gameLoop);
    };
    
    requestAnimationFrame(gameLoop);
  }
  
  update(time, delta) {
    switch (this.mode) {
      case 'MENU':
        this.menuController.update(time, delta);
        break;
      case 'GAME':
        // TODO: Implement game mode
        break;
    }
  }
  
  switchToGame() {
    this.mode = 'GAME';
    // TODO: Initialize game mode with selected players
  }
}

// Initialize the game
const game = new Game();