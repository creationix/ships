// Gamepad input system
export class GamepadManager {
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
  
  wasButtonJustPressed(gamepadIndex, buttonIndex) {
    const gamepad = this.getGamepad(gamepadIndex);
    if (!gamepad || !gamepad.buttons[buttonIndex]) return false;
    
    const key = `${gamepadIndex}-${buttonIndex}`;
    const currentState = gamepad.buttons[buttonIndex].pressed;
    const previousState = this.buttonStates.get(key) || false;
    
    this.buttonStates.set(key, currentState);
    
    return currentState && !previousState;
  }
  
  getLeftStick(gamepadIndex = 0) {
    return {
      x: this.getAxis(gamepadIndex, 0),
      y: this.getAxis(gamepadIndex, 1)
    };
  }
  
  getRightStick(gamepadIndex = 0) {
    return {
      x: this.getAxis(gamepadIndex, 2),
      y: this.getAxis(gamepadIndex, 3)
    };
  }
  
  getRightTrigger(gamepadIndex = 0) {
    const gamepad = this.getGamepad(gamepadIndex);
    if (!gamepad || !gamepad.buttons[7]) return 0;
    return gamepad.buttons[7].value;
  }
  
  getConnectedGamepads() {
    return Array.from(this.gamepads.values()).filter(gamepad => gamepad !== null);
  }
}