import { InputManager } from './input-manager.js';
import { MenuController } from './menu-controller.js';
import { GameController } from './game-controller.js';

/**
 * Ship Joy - Main Game Controller
 * Implements the menu selection system and gameplay as described in game.md
 */

class Game {
  constructor() {
    this.mode = 'MENU'; // 'MENU' or 'GAME'
    this.inputManager = new InputManager();
    this.menuController = new MenuController(this.inputManager);
    this.gameController = null;
    
    // Set up menu to game transition
    this.menuController.setGameStartCallback((players) => {
      this.switchToGame(players);
    });
    
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
        if (this.gameController) {
          this.gameController.update(time, delta);
        }
        break;
    }
  }
  
  switchToGame(players) {
    console.log('Switching to game mode with players:', players.map(p => p.name));
    
    // Clean up menu
    this.menuController.cleanup();
    
    // Initialize game mode
    this.gameController = new GameController(this.inputManager, players);
    this.mode = 'GAME';
  }
}

// Initialize the game
const game = new Game();