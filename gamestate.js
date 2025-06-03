// Game state management
export class GameState {
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