// Menu navigation system
export class MenuNavigator {
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
  
  updateCursor(gamepadIndex, time, gamepadManager, gameState, sprites, colorPairs) {
    const cursor = this.cursors.get(gamepadIndex);
    if (!cursor) return;
    
    // Handle D-pad or left stick navigation with timing
    const leftStickX = gamepadManager.getAxis(gamepadIndex, 0);
    const leftStickY = gamepadManager.getAxis(gamepadIndex, 1);
    
    const canMove = time - cursor.lastMoveTime > this.moveDelay;
    
    // Check for movement input (with deadzone and timing)
    if (canMove && (gamepadManager.wasButtonJustPressed(gamepadIndex, 14) || leftStickX < -0.5)) { // Left
      cursor.x = Math.max(0, cursor.x - 1);
      cursor.lastMoveTime = time;
    }
    if (canMove && (gamepadManager.wasButtonJustPressed(gamepadIndex, 15) || leftStickX > 0.5)) { // Right
      cursor.x = Math.min(this.gridWidth - 1, cursor.x + 1);
      cursor.lastMoveTime = time;
    }
    if (canMove && (gamepadManager.wasButtonJustPressed(gamepadIndex, 12) || leftStickY < -0.5)) { // Up
      cursor.y = Math.max(0, cursor.y - 1);
      cursor.lastMoveTime = time;
    }
    if (canMove && (gamepadManager.wasButtonJustPressed(gamepadIndex, 13) || leftStickY > 0.5)) { // Down
      cursor.y = Math.min(this.gridHeight - 1, cursor.y + 1);
      cursor.lastMoveTime = time;
    }
    
    // Calculate ship index from grid position
    const shipIndex = cursor.y * this.gridWidth + cursor.x;
    
    // Handle selection
    if (gamepadManager.wasButtonJustPressed(gamepadIndex, 0)) { // A button
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
    if (gamepadManager.wasButtonJustPressed(gamepadIndex, 9)) { // Start button
      if (cursor.selectedShip !== null) {
        gameState.setPlayerReady(gamepadIndex, true);
        
        // Check if all players are ready and start game
        if (gameState.allPlayersReady() && gameState.getPlayers().length > 0) {
          // Reset ship positions for game mode
          for (const sprite of sprites) {
            sprite.setHighlighted(false);
          }
          return 'GAME'; // Return new mode
        }
      }
    }
    
    // Update highlighting
    this.updateHighlighting(sprites, gameState, colorPairs);
    return null; // No mode change
  }
  
  updateHighlighting(sprites, gameState, colorPairs) {
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