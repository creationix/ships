/**
 * Input Manager Library for Ship Joy
 * 
 * Supports up to 6 controllers: 2 keyboard, 4 gamepads
 * Provides both event-based (menu) and state-based (game) APIs
 * 
 * Controller Lifecycle:
 * - Controllers activate on first input (first press is ignored)
 * - Can be deactivated cleanly using controller.deactivate()
 * - Automatically reactivate on new input after deactivation
 * - Emits global events for controller add/remove
 * 
 * Input APIs:
 * 1. Event-based: listen for 'left', 'right', 'up', 'down', 'primary', 'secondary'
 *    and their release events: 'left_up', 'right_up', etc.
 * 2. State-based: get current x/y axes (-1 to 1) and button states
 * 
 * Movement vectors are normalized to unit circle for diagonal input.
 * 
 * Clean API Design:
 * - Controllers expose only public methods: on(), off(), deactivate(), getStatus()
 * - Internal state management is encapsulated
 * - Proper lifecycle event handling without manual state manipulation
 */

// Keyboard mappings: WASD+C/V (left) and arrows+,/. (right)
const KEYBOARD_CODES = {
  KeyW: [0, "up"],
  KeyS: [0, "down"],
  KeyA: [0, "left"],
  KeyD: [0, "right"],
  KeyC: [0, "primary"],
  KeyV: [0, "secondary"],
  ArrowUp: [1, "up"],
  ArrowDown: [1, "down"],
  ArrowLeft: [1, "left"],
  ArrowRight: [1, "right"],
  Comma: [1, "primary"],   // < key
  Period: [1, "secondary"], // > key
};

const KEYBOARD_LEFT = 0;
const KEYBOARD_RIGHT = 1;
const GAMEPAD_OFFSET = 2; // Gamepad indices start at 2
const MAX_CONTROLLERS = 6;

// Standard gamepad button mappings
const GAMEPAD_BUTTONS = {
  primary: 0,    // A button
  secondary: 1,  // B button
  dpad_up: 12,
  dpad_down: 13,
  dpad_left: 14,
  dpad_right: 15,
};

/**
 * @typedef {Object} InputState
 * @property {number} x - Horizontal axis (-1.0 to 1.0)
 * @property {number} y - Vertical axis (-1.0 to 1.0)
 * @property {boolean} primary - Primary button state
 * @property {boolean} secondary - Secondary button state
 * @property {boolean} left - Left direction state
 * @property {boolean} right - Right direction state
 * @property {boolean} up - Up direction state
 * @property {boolean} down - Down direction state
 */

/**
 * @typedef {'left'|'right'|'up'|'down'|'primary'|'secondary'|'left_up'|'right_up'|'up_up'|'down_up'|'primary_up'|'secondary_up'} InputEvent
 */

/**
 * @typedef {Object} InputController
 * @property {'keyboard'|'gamepad'} type - Controller type
 * @property {number} index - Controller index (0-5)
 * @property {string} label - Human-readable label
 * @property {boolean} active - Whether controller is active
 * @property {function(InputEvent, Function): void} on - Add event listener
 * @property {function(InputEvent, Function): void} off - Remove event listener
 * @property {function(): void} deactivate - Properly deactivate controller
 * @property {function(): InputState} getStatus - Get current status
 */

/**
 * Creates an input controller
 * @param {'keyboard'|'gamepad'} type - Controller type
 * @param {number} index - Controller index (0-5)
 * @param {string} label - Display label
 * @param {Function} globalEmit - Global event emitter for controller lifecycle events
 * @returns {InputController}
 */
function createInputController(type, index, label, globalEmit) {
  let listeners = {};
  let state = {
    x: 0, y: 0, primary: false, secondary: false,
    left: false, right: false, up: false, down: false,
  };
  let active = true;

  // Internal methods
  function emit(event, data) {
    (listeners[event] || []).forEach(cb => cb(data));
  }

  function updateState(newState) {
    // Emit events for button presses and releases
    for (const key of ['left', 'right', 'up', 'down', 'primary', 'secondary']) {
      if (newState[key] && !state[key]) {
        // Button pressed
        emit(key, newState[key]);
      } else if (!newState[key] && state[key]) {
        // Button released
        emit(`${key}_up`, newState[key]);
      }
    }
    Object.assign(state, newState);
  }

  return {
    type,
    index,
    label,
    listeners,
    state,
    active,
    emit, // Internal use only
    updateState, // Internal use only
    /**
     * Add event listener
     * @param {InputEvent} event - Event type
     * @param {Function} cb - Callback function
     */
    on(event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
    },
    /**
     * Remove event listener
     * @param {InputEvent} event - Event type
     * @param {Function} cb - Callback to remove
     */
    off(event, cb) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(f => f !== cb);
    },
    /**
     * Properly deactivate this controller
     * Clears all event listeners and emits controller_removed event
     */
    deactivate() {
      this.active = false;
      this.listeners = {}; // Clear all event listeners
      // Emit controller_removed event through the input manager
      globalEmit('controller_removed', this);
    },
    /**
     * Get current controller state
     * @returns {InputState} Current state
     */
    getStatus() {
      return {
        x: state.x,
        y: state.y,
        primary: !!state.primary,
        secondary: !!state.secondary,
        left: !!state.left,
        right: !!state.right,
        up: !!state.up,
        down: !!state.down,
      };
    }
  };
}

/**
 * @typedef {Object} InputManager
 * @property {InputController[]} controllers - Array of all controllers
 * @property {function(string, Function): void} on - Add global event listener
 * @property {function(string, Function): void} off - Remove global event listener
 * @property {function(): void} stop - Stop the input manager
 * @property {function(): Object.<number, InputState>} getStatus - Get all controller statuses
 * @property {function(number, number): void} vibrate - Vibrate a gamepad
 * @property {function(): InputController[]} getControllers - Get active controllers
 * @property {function(): void} poll - Poll for gamepad updates
 */

/**
 * Creates the main input manager
 * @returns {InputManager} Input manager instance
 */
export function createInputManager() {
  const controllers = [];
  const globalListeners = {};
  const keyboardStates = [{}, {}];

  /**
   * Add global event listener
   * @param {string} event - Event type
   * @param {Function} cb - Callback function
   */
  function on(event, cb) {
    (globalListeners[event] = globalListeners[event] || []).push(cb);
  }

  /**
   * Emit global event
   * @param {string} event - Event type
   * @param {*} [data] - Optional data
   */
  function emit(event, data) {
    (globalListeners[event] || []).forEach(cb => cb(data));
  }

  /**
   * Setup keyboard event listeners
   */
  function initKeyboard() {
    window.addEventListener('keydown', e => handleKey(e, true));
    window.addEventListener('keyup', e => handleKey(e, false));
  }

  /**
   * Handle keyboard input and update controller
   * @param {KeyboardEvent} e - Keyboard event
   * @param {boolean} pressed - Key pressed state
   */
  function handleKey(e, pressed) {
    const code = e.code;
    const mapping = KEYBOARD_CODES[code];
    if (!mapping) return;

    const [i, dir] = mapping;
    keyboardStates[i][dir] = pressed;

    let ctrl = controllers[i];
    if (!(ctrl && ctrl.active)) {
      // Activate controller on first input
      const label = i === 0 ? 'Keyboard Left' : 'Keyboard Right';
      if (ctrl) {
        ctrl.active = true;
      } else {
        controllers[i] = createInputController('keyboard', i, label, emit);
      }
      emit('controller_added', controllers[i]);
      ctrl = controllers[i]; // Update reference
    }

    // Update controller state
    updateKeyboardController(ctrl, i);
    e.preventDefault();
  }

  /**
   * Update keyboard controller state
   * @param {InputController} ctrl - Controller to update
   * @param {number} index - Keyboard controller index (0 or 1)
   */
  function updateKeyboardController(ctrl, index) {
    const keys = keyboardStates[index];

    // Calculate movement vector and normalize to unit circle
    let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    // Normalize diagonal movement to unit circle
    const length = Math.sqrt(x * x + y * y);
    if (length > 1) {
      x /= length;
      y /= length;
    }

    ctrl.updateState({
      x, y,
      left: !!keys.left, right: !!keys.right,
      up: !!keys.up, down: !!keys.down,
      primary: !!keys.primary, secondary: !!keys.secondary,
    });
  }

  /**
   * Setup gamepad event listeners
   */
  function initGamepads() {
    window.addEventListener("gamepadconnected", e => {
      const index = e.gamepad.index + GAMEPAD_OFFSET;
      if (index >= MAX_CONTROLLERS) return;

      let ctrl = controllers[index];
      if (!ctrl) {
        const label = `Gamepad ${index - GAMEPAD_OFFSET + 1}`;
        controllers[index] = createInputController('gamepad', index, label, emit);
        emit('controller_added', controllers[index]);
      }
    });

    window.addEventListener("gamepaddisconnected", e => {
      const index = e.gamepad.index + GAMEPAD_OFFSET;
      if (index >= MAX_CONTROLLERS) return;

      let ctrl = controllers[index];
      if (ctrl) {
        ctrl.active = false;
        emit('controller_removed', ctrl);
      }
    });
  }

  /**
   * Poll gamepads and update their states
   */
  function pollGamepads() {
    if (!navigator.getGamepads) return;

    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length && i < 4; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) continue;

      const index = i + GAMEPAD_OFFSET;
      let ctrl = controllers[index];

      if (ctrl) {
        if (ctrl.active) {
          updateGamepadController(ctrl, gamepad);
        } else {
          // Check if inactive controller has new input to reactivate it
          const hasInput = gamepad.buttons.some(button => button.pressed) ||
            Math.abs(gamepad.axes[0]) > 0.1 ||
            Math.abs(gamepad.axes[1]) > 0.1;

          if (hasInput) {
            ctrl.active = true;
            emit('controller_added', ctrl);
            updateGamepadController(ctrl, gamepad);
          }
        }
      }
    }
  }

  /**
   * Update gamepad controller state
   * @param {InputController} ctrl - Controller to update
   * @param {Gamepad} gamepad - Browser gamepad object
   */
  function updateGamepadController(ctrl, gamepad) {
    // Get stick values with deadzone applied
    let x = Math.abs(gamepad.axes[0]) > 0.1 ? gamepad.axes[0] : 0;
    let y = Math.abs(gamepad.axes[1]) > 0.1 ? gamepad.axes[1] : 0;

    // D-pad overrides stick input
    const dpadLeft = gamepad.buttons[GAMEPAD_BUTTONS.dpad_left]?.pressed;
    const dpadRight = gamepad.buttons[GAMEPAD_BUTTONS.dpad_right]?.pressed;
    const dpadUp = gamepad.buttons[GAMEPAD_BUTTONS.dpad_up]?.pressed;
    const dpadDown = gamepad.buttons[GAMEPAD_BUTTONS.dpad_down]?.pressed;

    if (dpadLeft || dpadRight || dpadUp || dpadDown) {
      x = (dpadRight ? 1 : 0) - (dpadLeft ? 1 : 0);
      y = (dpadDown ? 1 : 0) - (dpadUp ? 1 : 0);
    }

    // Clamp vector to unit circle
    const length = Math.sqrt(x * x + y * y);
    if (length > 1) {
      x /= length;
      y /= length;
    }

    // Get button states
    const primary = gamepad.buttons[GAMEPAD_BUTTONS.primary]?.pressed || false;
    const secondary = gamepad.buttons[GAMEPAD_BUTTONS.secondary]?.pressed || false;

    ctrl.updateState({
      x, y, primary, secondary,
      left: x < -0.5, right: x > 0.5,
      up: y < -0.5, down: y > 0.5,
    });
  }

  // Initialize on creation
  initKeyboard();
  initGamepads();

  // Public API
  return {
    controllers,
    on,
    off: (event, cb) => {
      if (!globalListeners[event]) return;
      if (cb) {
        globalListeners[event] = globalListeners[event].filter(f => f !== cb);
      } else {
        delete globalListeners[event];
      }
    },
    stop: () => {
      // Note: Cannot remove keyboard listeners in this implementation
      emit('stop');
    },
    getStatus: () => {
      const status = {};
      controllers.forEach((ctrl, i) => {
        if (ctrl && ctrl.active) {
          status[i] = ctrl.getStatus();
        }
      });
      return status;
    },
    vibrate: (index, duration) => {
      if (index < GAMEPAD_OFFSET) return;
      const ctrl = controllers[index];
      if (ctrl && ctrl.type === 'gamepad') {
        const gamepad = navigator.getGamepads()[index - GAMEPAD_OFFSET];
        if (gamepad?.vibrationActuator) {
          gamepad.vibrationActuator.playEffect('dual-rumble', {
            duration: duration,
            strongMagnitude: 1.0,
            weakMagnitude: 1.0
          });
        }
      }
    },
    getControllers: () => controllers.filter(c => c && c.active),
    poll: () => {
      pollGamepads();
    },
  };
}

// Default instance for backward compatibility
export const inputManager = createInputManager();

