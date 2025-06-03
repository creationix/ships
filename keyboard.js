// Keyboard input fallback system
export class KeyboardFallback {
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
  
  simulateGamepad(time, gameState, menuNavigator, sprites, colorPairs, mode) {
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
            return 'GAME'; // Return new mode
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