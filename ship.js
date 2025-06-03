import { domBuilder } from "./dombuilder.js"

// Ship factory function
export function Ship(index, hue) {
  const ix = index % 4
  const iy = Math.floor(index / 4);
  const style = {
    backgroundPosition: `${-ix * 128}px ${-iy * 128}px`,
  }
  const s1 = domBuilder(['.ship', { style }])
  
  // Position of the center of the ship
  let posX = Math.random() * window.innerWidth;
  let posY = Math.random() * window.innerHeight;
  // velocity of the ship
  let velocityX = 0;
  let velocityY = 0;
  // Angle of rotation
  let offset = Math.random() * 100
  let angle = 0;
  // Acceleration in pixels per second squared
  let thrust = 200;
  const maxVelocity = 300;
  const trail = []
  
  // Player control variables
  let controlledByPlayer = null;
  let isSelected = false;
  let isHighlighted = false;
  
  for (let i = 0; i < 100; i++) {
    const t = trail[i] = domBuilder(['.trail'])
    t.x = -10
    t.y = -10
  }

  return {
    index,
    start() {
      for (const t of trail) {
        document.body.appendChild(t);
      }
      trail[-1] = {}
      document.body.appendChild(s1);
    },
    stop() {
      if (s1.parentNode) {
        s1.parentNode.removeChild(s1);
      }
      for (const t of trail) {
        if (t.parentNode) {
          t.parentNode.removeChild(t);
        }
      }
    },
    moveTo(x, y, angle) {
      s1.style.transform = `translate(${x - 64}px, ${y - 64}px) rotate(${angle + 90}deg)`;
    },
    setControlledByPlayer(playerIndex) {
      controlledByPlayer = playerIndex;
    },
    setSelected(selected) {
      isSelected = selected;
      this.updateVisualState();
    },
    setHighlighted(highlighted) {
      isHighlighted = highlighted;
      this.updateVisualState();
    },
    updateVisualState() {
      let borderColor = '';
      let borderWidth = '0px';
      
      if (isSelected) {
        borderColor = `hsl(${hue}deg, 100%, 50%)`;
        borderWidth = '4px';
      } else if (isHighlighted) {
        borderColor = 'white';
        borderWidth = '2px';
      }
      
      s1.style.border = borderWidth ? `${borderWidth} solid ${borderColor}` : '';
      s1.style.boxShadow = isSelected ? `0 0 20px hsl(${hue}deg, 100%, 50%)` : '';
    },
    updateMenu(time, delta) {
      const mx = Math.round(window.innerWidth / 4 * (iy + 0.5));
      const my = Math.round(window.innerHeight / 3 * (ix - 0.5));
      const targetX = window.innerWidth / 2 + Math.sin(time / 2) * 400;
      const targetY = window.innerHeight / 2 + Math.cos(time / 2) * 400;

      const angle = Math.atan2(targetY - my, targetX - mx) * 180 / Math.PI;
      this.moveTo(mx, my, angle);
      
      // Make the particles spin around the spaceship
      const radius = 100;
      const angleOffset = (Math.sin(time / 2 + offset)); // slow rotation
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        const angle = angleOffset + (i / trail.length) * Math.PI * 2; // spread particles around
        t.x = mx + Math.cos(angle * (6)) * (Math.sin(i + offset) + 1) * radius * i / trail.length;
        t.y = my + Math.sin(angle * (6)) * (Math.cos(i + offset) + 1) * radius * i / trail.length;
        const alpha = (1 - i / trail.length) * 0.5;
        const sat = i < trail.length * 0.8 ? 100 : 20
        t.style.boxShadow = `0px 0px 6px 6px hsla(${hue}deg, ${sat}%, 50%, ${alpha})`;
        t.style.transform = `translate(${t.x}px, ${t.y}px)`;
      }
    },
    updateGame(time, delta, gamepadManager, keyboardFallback, mode) {
      if (controlledByPlayer !== null) {
        // Player-controlled ship
        let upInput, downInput, leftInput, rightInput;
        
        if (controlledByPlayer === 99) {
          // Keyboard control
          const kb = keyboardFallback.simulateGamepad(time);
          upInput = kb.getAxis(1) < -0.5 ? 1 : 0;      // W key
          downInput = kb.getAxis(1) > 0.5 ? 1 : 0;     // S key  
          leftInput = kb.getAxis(0) < -0.5 ? 1 : 0;    // A key
          rightInput = kb.getAxis(0) > 0.5 ? 1 : 0;    // D key
        } else {
          // Gamepad control - use left stick or D-pad
          const stickX = gamepadManager.getAxis(controlledByPlayer, 0);
          const stickY = gamepadManager.getAxis(controlledByPlayer, 1);
          
          upInput = stickY < -0.5 ? 1 : 0;
          downInput = stickY > 0.5 ? 1 : 0;
          leftInput = stickX < -0.5 ? 1 : 0;
          rightInput = stickX > 0.5 ? 1 : 0;
        }
        
        // Rotation controls
        if (leftInput) {
          angle -= 180 * delta; // Rotate left
        }
        if (rightInput) {
          angle += 180 * delta; // Rotate right
        }
        
        // Thrust controls
        if (upInput) {
          // Forward thrust
          velocityX += thrust * Math.cos(angle * Math.PI / 180) * delta;
          velocityY += thrust * Math.sin(angle * Math.PI / 180) * delta;
        }
        if (downInput) {
          // Backward thrust/brake
          velocityX -= thrust * Math.cos(angle * Math.PI / 180) * delta * 0.7;
          velocityY -= thrust * Math.sin(angle * Math.PI / 180) * delta * 0.7;
        }
        
        // Apply drag
        velocityX *= 0.98;
        velocityY *= 0.98;
      } else {
        // AI-controlled ship (original behavior)
        const t = time + offset;
        angle = Math.sin(t / 1.6) * 30 + Math.sin(t / 2) * 18 + Math.cos(t / 3) * 180 + Math.cos(t / 4) * 180 + Math.cos(t / 5) * 180;

        velocityX += thrust * Math.cos(angle * Math.PI / 180) * delta * 0.3;
        velocityY += thrust * Math.sin(angle * Math.PI / 180) * delta * 0.3;
      }

      posX += velocityX * delta;
      posY += velocityY * delta;

      // Limit max velocity
      const currentVelocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      if (currentVelocity > maxVelocity) {
        const scale = maxVelocity / currentVelocity;
        velocityX *= scale;
        velocityY *= scale;
      }

      // Wrap around the screen
      if (posX < 0) posX += window.innerWidth;
      if (posX > window.innerWidth) posX -= window.innerWidth;
      if (posY < 0) posY += window.innerHeight;
      if (posY > window.innerHeight) posY -= window.innerHeight;

      const life = controlledByPlayer !== null ? 1 : Math.sin((time + offset) / 5) * 0.5 + 0.5;

      // Update the ship's position and rotation using CSS transforms
      this.moveTo(posX, posY, angle);
      trail[-1].x = posX + Math.cos((angle + 180) * Math.PI / 180) * 50;
      trail[-1].y = posY + Math.sin((angle + 180) * Math.PI / 180) * 50;
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i];
        let prev = trail[i - 1]
        t.x = prev.x;
        t.y = prev.y;
        const alpha = (1 - i / trail.length) * .5;
        const sat = i < trail.length * life ? 100 : 20;
        t.style.boxShadow = `0px 0px 6px 6px hsla(${hue}deg, ${sat}%, 50%, ${alpha})`;

        t.style.transform = `translate(${t.x - 3}px, ${t.y - 3}px)`;
      }
    },
    update(time, delta, mode, gamepadManager, keyboardFallback) {
      if (mode === 'MENU') {
        // Show all ships in menu mode
        element.style.display = 'block';
        return this.updateMenu(time, delta);
      } else {
        // In game mode, only show player-controlled ships
        if (controlledByPlayer !== null) {
          element.style.display = 'block';
          return this.updateGame(time, delta, gamepadManager, keyboardFallback, mode);
        } else {
          element.style.display = 'none';
          return;
        }
      }
    }
  }
}

// Ship configuration data
export const colorPairs = [
  { ship: 1, hue: 150 }, // green-blue
  { ship: 2, hue: 0 }, // red
  { ship: 3, hue: 270 }, // purple

  { ship: 5, hue: 180 }, // teal
  { ship: 6, hue: 120 }, // green
  { ship: 7, hue: 30 }, // yellow-orange

  { ship: 9, hue: 190 }, // blue-green
  { ship: 10, hue: 330 }, // pink
  { ship: 11, hue: 210 }, // blue

  { ship: 13, hue: 90 }, // lime
  { ship: 14, hue: 20 }, // orange
  { ship: 15, hue: 50 }, // yellow
]