/**
 * Input manager for handling keyboard and gamepad controls
 */

export class InputManager {
  constructor() {
    this.controllers = new Map(); // Map of controller ID to controller state
    this.keyboardLeft = { id: 'keyboard-left', type: 'keyboard', active: false };
    this.keyboardRight = { id: 'keyboard-right', type: 'keyboard', active: false };
    this.gamepads = new Map();
    
    this.setupEventListeners();
    this.updateGamepads();
  }
  
  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Gamepad events
    window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e));
  }
  
  handleKeyDown(e) {
    // Keyboard Left (WASD + CV)
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyV'].includes(e.code)) {
      if (!this.keyboardLeft.active) {
        this.keyboardLeft.active = true;
        this.controllers.set('keyboard-left', this.keyboardLeft);
      }
      
      if (e.code === 'KeyC') {
        this.keyboardLeft.primaryPressed = true;
      } else if (e.code === 'KeyV') {
        this.keyboardLeft.secondaryPressed = true;
      } else {
        // Movement keys
        this.keyboardLeft.left = e.code === 'KeyA';
        this.keyboardLeft.right = e.code === 'KeyD';
        this.keyboardLeft.up = e.code === 'KeyW';
        this.keyboardLeft.down = e.code === 'KeyS';
      }
    }
    
    // Keyboard Right (Arrows + <,>)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Comma', 'Period'].includes(e.code)) {
      if (!this.keyboardRight.active) {
        this.keyboardRight.active = true;
        this.controllers.set('keyboard-right', this.keyboardRight);
      }
      
      if (e.code === 'Comma') { // < key
        this.keyboardRight.primaryPressed = true;
      } else if (e.code === 'Period') { // > key
        this.keyboardRight.secondaryPressed = true;
      } else {
        // Movement keys
        this.keyboardRight.left = e.code === 'ArrowLeft';
        this.keyboardRight.right = e.code === 'ArrowRight';
        this.keyboardRight.up = e.code === 'ArrowUp';
        this.keyboardRight.down = e.code === 'ArrowDown';
      }
    }
  }
  
  handleKeyUp(e) {
    // Reset button states on key up
    if (['KeyC'].includes(e.code)) {
      this.keyboardLeft.primaryPressed = false;
    } else if (['KeyV'].includes(e.code)) {
      this.keyboardLeft.secondaryPressed = false;
    } else if (['Comma'].includes(e.code)) {
      this.keyboardRight.primaryPressed = false;
    } else if (['Period'].includes(e.code)) {
      this.keyboardRight.secondaryPressed = false;
    }
  }
  
  handleGamepadConnected(e) {
    const gamepad = e.gamepad;
    const controller = {
      id: `gamepad-${gamepad.index}`,
      type: 'gamepad',
      index: gamepad.index,
      active: false
    };
    this.gamepads.set(gamepad.index, controller);
  }
  
  handleGamepadDisconnected(e) {
    const gamepadIndex = e.gamepad.index;
    const controller = this.gamepads.get(gamepadIndex);
    if (controller && controller.active) {
      this.controllers.delete(controller.id);
    }
    this.gamepads.delete(gamepadIndex);
  }
  
  updateGamepads() {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) continue;
      
      let controller = this.gamepads.get(i);
      if (!controller) {
        controller = {
          id: `gamepad-${i}`,
          type: 'gamepad',
          index: i,
          active: false
        };
        this.gamepads.set(i, controller);
      }
      
      // Check for any button press to activate gamepad
      const anyButtonPressed = gamepad.buttons.some(button => button.pressed);
      const anyAxisMoved = gamepad.axes.some(axis => Math.abs(axis) > 0.1);
      
      if ((anyButtonPressed || anyAxisMoved) && !controller.active) {
        controller.active = true;
        this.controllers.set(controller.id, controller);
      }
      
      if (controller.active) {
        // Update button states
        controller.primaryPressed = gamepad.buttons[0] && gamepad.buttons[0].pressed; // A button
        controller.secondaryPressed = gamepad.buttons[1] && gamepad.buttons[1].pressed; // B button
        
        // Update movement from left stick or D-pad
        const leftStickX = gamepad.axes[0] || 0;
        const leftStickY = gamepad.axes[1] || 0;
        const dpadLeft = gamepad.buttons[14] && gamepad.buttons[14].pressed;
        const dpadRight = gamepad.buttons[15] && gamepad.buttons[15].pressed;
        const dpadUp = gamepad.buttons[12] && gamepad.buttons[12].pressed;
        const dpadDown = gamepad.buttons[13] && gamepad.buttons[13].pressed;
        
        controller.left = leftStickX < -0.3 || dpadLeft;
        controller.right = leftStickX > 0.3 || dpadRight;
        controller.up = leftStickY < -0.3 || dpadUp;
        controller.down = leftStickY > 0.3 || dpadDown;
      }
    }
    
    // Continue updating gamepads
    requestAnimationFrame(() => this.updateGamepads());
  }
  
  getActiveControllers() {
    return Array.from(this.controllers.values()).filter(c => c.active);
  }
  
  getController(id) {
    return this.controllers.get(id);
  }
  
  deactivateController(id) {
    const controller = this.controllers.get(id);
    if (controller) {
      controller.active = false;
      this.controllers.delete(id);
      
      // Also deactivate in the source maps
      if (id === 'keyboard-left') {
        this.keyboardLeft.active = false;
      } else if (id === 'keyboard-right') {
        this.keyboardRight.active = false;
      } else if (id.startsWith('gamepad-')) {
        const index = parseInt(id.split('-')[1]);
        const gamepadController = this.gamepads.get(index);
        if (gamepadController) {
          gamepadController.active = false;
        }
      }
    }
  }
  
  // Get button press events (only fires once per press)
  getPrimaryPress(controllerId) {
    const controller = this.getController(controllerId);
    if (!controller) return false;
    
    if (controller.primaryPressed && !controller.primaryWasPressed) {
      controller.primaryWasPressed = true;
      return true;
    } else if (!controller.primaryPressed) {
      controller.primaryWasPressed = false;
    }
    return false;
  }
  
  getSecondaryPress(controllerId) {
    const controller = this.getController(controllerId);
    if (!controller) return false;
    
    if (controller.secondaryPressed && !controller.secondaryWasPressed) {
      controller.secondaryWasPressed = true;
      return true;
    } else if (!controller.secondaryPressed) {
      controller.secondaryWasPressed = false;
    }
    return false;
  }
  
  getLeftPress(controllerId) {
    const controller = this.getController(controllerId);
    if (!controller) return false;
    
    if (controller.left && !controller.leftWasPressed) {
      controller.leftWasPressed = true;
      return true;
    } else if (!controller.left) {
      controller.leftWasPressed = false;
    }
    return false;
  }
  
  getRightPress(controllerId) {
    const controller = this.getController(controllerId);
    if (!controller) return false;
    
    if (controller.right && !controller.rightWasPressed) {
      controller.rightWasPressed = true;
      return true;
    } else if (!controller.right) {
      controller.rightWasPressed = false;
    }
    return false;
  }
}