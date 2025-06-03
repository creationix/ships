// Standalone Input Manager Library for Ship Joy
// Supports up to 6 controllers: 2 keyboard (left/right), 4 gamepads
// Event-based (menu) and state-based (game) APIs

const KEYBOARD_LEFT = 0;
const KEYBOARD_RIGHT = 1;
const GAMEPAD_OFFSET = 2; // Gamepad 0 = controller 2, etc
const MAX_CONTROLLERS = 6;

// Keyboard mappings
const KEYMAPS = [
    // Keyboard Left
    {
        up: ['KeyW'],
        down: ['KeyS'],
        left: ['KeyA'],
        right: ['KeyD'],
        primary: ['KeyC'],
        secondary: ['KeyV'],
    },
    // Keyboard Right
    {
        up: ['ArrowUp'],
        down: ['ArrowDown'],
        left: ['ArrowLeft'],
        right: ['ArrowRight'],
        primary: ['Comma'], // <
        secondary: ['Period'], // >
    },
];

// Gamepad mappings (standard mapping)
const GAMEPAD_BUTTONS = {
    primary: 0, // A
    secondary: 1, // B
    dpad_up: 12,
    dpad_down: 13,
    dpad_left: 14,
    dpad_right: 15,
};

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

class InputController {
    constructor(type, index, label) {
        this.type = type; // 'keyboard' or 'gamepad'
        this.index = index; // 0/1 for keyboard, gamepad index for gamepad
        this.label = label;
        this.listeners = {};
        this.state = {
            x: 0, y: 0, primary: false, secondary: false,
            left: false, right: false, up: false, down: false,
        };
        this.prevState = { ...this.state };
        this.active = true;
    }
    on(event, cb) {
        (this.listeners[event] = this.listeners[event] || []).push(cb);
    }
    off(event, cb) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(f => f !== cb);
    }
    emit(event, data) {
        (this.listeners[event] || []).forEach(cb => cb(data));
    }
    updateState(newState) {
        // Fire events for transitions (for menu mode)
        for (const key of ['left', 'right', 'up', 'down', 'primary', 'secondary']) {
            if (newState[key] && !this.state[key]) this.emit(key); // Only emit on new press
        }
        this.prevState = { ...this.state };
        Object.assign(this.state, newState);
    }
    getStatus() {
        // For game mode polling
        return {
            x: this.state.x,
            y: this.state.y,
            primary: !!this.state.primary,
            secondary: !!this.state.secondary,
        };
    }
}

class InputManager {
    constructor() {
        this.controllers = [];
        this.globalListeners = {};
        this._initKeyboard();
        this._initGamepads();
    }
    on(event, cb) {
        (this.globalListeners[event] = this.globalListeners[event] || []).push(cb);
    }
    emit(event, data) {
        (this.globalListeners[event] || []).forEach(cb => cb(data));
    }
    _initKeyboard() {
        this.keyboardStates = [{}, {}];
        window.addEventListener('keydown', e => this._handleKey(e, true));
        window.addEventListener('keyup', e => this._handleKey(e, false));
    }
    _handleKey(e, pressed) {
        for (let i = 0; i < 2; ++i) {
            const map = KEYMAPS[i];
            for (const dir of ['up', 'down', 'left', 'right', 'primary', 'secondary']) {
                if (map[dir].includes(e.code)) {
                    this.keyboardStates[i][dir] = pressed;
                    if (!this.controllers[i]) {
                        // Activate controller
                        const label = i === 0 ? 'Keyboard Left' : 'Keyboard Right';
                        this.controllers[i] = new InputController('keyboard', i, label);
                        this.emit('controller_added', this.controllers[i]);
                    }
                    e.preventDefault();
                }
            }
        }
    }
    _initGamepads() {
        window.addEventListener('gamepadconnected', e => {
            const idx = e.gamepad.index;
            if (!this.controllers[GAMEPAD_OFFSET + idx]) {
                const label = `Gamepad ${idx + 1}`;
                this.controllers[GAMEPAD_OFFSET + idx] = new InputController('gamepad', idx, label);
                this.emit('controller_added', this.controllers[GAMEPAD_OFFSET + idx]);
            }
        });
        window.addEventListener('gamepaddisconnected', e => {
            const idx = e.gamepad.index;
            const ctrl = this.controllers[GAMEPAD_OFFSET + idx];
            if (ctrl) {
                ctrl.active = false;
                this.emit('controller_removed', ctrl);
                this.controllers[GAMEPAD_OFFSET + idx] = undefined;
            }
        });
    }
    poll() {
        // Keyboard
        for (let i = 0; i < 2; ++i) {
            const ctrl = this.controllers[i];
            if (!ctrl) continue;
            const s = this.keyboardStates[i];
            let x = (s.right ? 1 : 0) + (s.left ? -1 : 0);
            let y = (s.down ? 1 : 0) + (s.up ? -1 : 0);
            // Normalize if both x and y are nonzero
            if (x && y) {
                const dist = Math.sqrt(2);
                x /= dist
                y /= dist;
            }
            ctrl.updateState({
                x, y,
                left: !!s.left, right: !!s.right, up: !!s.up, down: !!s.down,
                primary: !!s.primary, secondary: !!s.secondary,
            });
        }
        // Gamepads
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < 4; ++i) {
            const ctrl = this.controllers[GAMEPAD_OFFSET + i];
            if (!ctrl) continue;
            const pad = pads[i];
            if (!pad) continue;
            // Prefer left stick, fallback to dpad
            let x = pad.axes[0] || 0;
            let y = pad.axes[1] || 0;
            // D-pad overrides if pressed
            if (pad.buttons[GAMEPAD_BUTTONS.dpad_left]?.pressed) x = -1;
            if (pad.buttons[GAMEPAD_BUTTONS.dpad_right]?.pressed) x = 1;
            if (pad.buttons[GAMEPAD_BUTTONS.dpad_up]?.pressed) y = -1;
            if (pad.buttons[GAMEPAD_BUTTONS.dpad_down]?.pressed) y = 1;
            const dist = Math.sqrt(x * x + y * y)
            if (dist > 1) {
                x /= dist;
                y /= dist;
            }
            ctrl.updateState({
                x, y,
                left: x < -0.5, right: x > 0.5, up: y < -0.5, down: y > 0.5,
                primary: !!pad.buttons[GAMEPAD_BUTTONS.primary]?.pressed,
                secondary: !!pad.buttons[GAMEPAD_BUTTONS.secondary]?.pressed,
            });
        }
    }
    getControllers() {
        // Returns array of active controllers
        return this.controllers.filter(c => c && c.active);
    }
}

// Singleton instance
export const inputManager = new InputManager();

// Usage:
// inputManager.on('controller_added', ctrl => ...)
// inputManager.on('controller_removed', ctrl => ...)
// ctrl.on('left', () => ...)
// ctrl.getStatus() // {x, y, primary, secondary}
// Call inputManager.poll() each frame to update states
