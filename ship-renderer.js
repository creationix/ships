import { domBuilder } from "./dombuilder.js"

/**
 * Ship renderer class for handling ship graphics and animations
 */
// Load ship sprite sheet
let shipImage = null;
const loadShipImage = () => {
  if (!shipImage) {
    shipImage = new Image();
    shipImage.src = './ships2.png';
  }
  return shipImage;
};

export function ShipRenderer(index, hue) {
  const ix = index % 4
  const iy = Math.floor(index / 4);
  const style = {
    backgroundPosition: `${-ix * 128}px ${-iy * 128}px`,
  }
  const shipElement = domBuilder(['.ship', { style }])
  
  // Position of the center of the ship
  let posX = 0;
  let posY = 0;
  // Angle of rotation
  let angle = 0;
  let offset = Math.random() * 100
  
  // Particle trail system
  const trail = []
  for (let i = 0; i < 100; i++) {
    const t = trail[i] = domBuilder(['.trail'])
    t.x = -10
    t.y = -10
  }
  
  // Load sprite image
  const spriteImage = loadShipImage();

  return {
    start() {
      for (const t of trail) {
        document.body.appendChild(t);
      }
      trail[-1] = {}
      document.body.appendChild(shipElement);
    },
    
    stop() {
      if (shipElement.parentNode) {
        shipElement.parentNode.removeChild(shipElement);
      }
      for (const t of trail) {
        if (t.parentNode) {
          t.parentNode.removeChild(t);
        }
      }
    },
    
    moveTo(x, y, rotationAngle) {
      posX = x;
      posY = y;
      angle = rotationAngle;
      shipElement.style.transform = `translate(${x - 64}px, ${y - 64}px) rotate(${rotationAngle + 90}deg)`;
    },
    
    // Render ship in cycling/selecting state (slowly rotating)
    renderCycling(x, y, time) {
      const rotationAngle = time * 30; // slow rotation
      this.moveTo(x, y, rotationAngle);
      
      // Hide particles in cycling mode
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        t.style.boxShadow = `0px 0px 0px 0px transparent`;
        t.style.transform = `translate(-10px, -10px)`;
      }
    },
    
    // Render ship in selected state (static with halo particles)
    renderSelected(x, y, time) {
      this.moveTo(x, y, -90); // pointing straight up
      
      // Create halo of colored particles floating around randomly
      const radius = 100;
      const angleOffset = time / 2 + offset; // slow rotation
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        const particleAngle = angleOffset + (i / trail.length) * Math.PI * 2;
        const randomRadius = radius * (0.5 + Math.sin(time + i) * 0.3);
        t.x = x + Math.cos(particleAngle * 6) * (Math.sin(i + offset) + 1) * randomRadius * i / trail.length;
        t.y = y + Math.sin(particleAngle * 6) * (Math.cos(i + offset) + 1) * randomRadius * i / trail.length;
        const alpha = (1 - i / trail.length) * 0.5;
        const sat = i < trail.length * 0.8 ? 100 : 20
        t.style.boxShadow = `0px 0px 6px 6px hsla(${hue}deg, ${sat}%, 50%, ${alpha})`;
        t.style.transform = `translate(${t.x}px, ${t.y}px)`;
      }
    },
    
    // Render ship in ready state (oscillating left/right with thrust particles)
    renderReady(x, y, time) {
      const oscillation = Math.sin(time * 3) * 15; // oscillate ±15 degrees
      this.moveTo(x, y, -90 + oscillation); // oscillate around upward direction
      
      // Particles flow out the bottom as if pushing forward
      const thrustAngle = (-90 + oscillation) + 180; // opposite direction of ship facing
      trail[-1] = {
        x: x + Math.cos(thrustAngle * Math.PI / 180) * 50,
        y: y + Math.sin(thrustAngle * Math.PI / 180) * 50
      };
      
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i];
        let prev = trail[i - 1] || trail[-1];
        t.x = prev.x;
        t.y = prev.y;
        const alpha = (1 - i / trail.length) * 0.8;
        const sat = 100;
        t.style.boxShadow = `0px 0px 6px 6px hsla(${hue}deg, ${sat}%, 50%, ${alpha})`;
        t.style.transform = `translate(${t.x - 3}px, ${t.y - 3}px)`;
      }
    },
    
    // Get ship index for identification
    getIndex() {
      return index;
    },
    
    // Get ship hue for identification
    getHue() {
      return hue;
    },
    
    // Render ship on canvas (for game mode)
    renderShip(ctx, x, y, scale = 1) {
      if (!spriteImage.complete) return; // Wait for image to load
      
      const size = 128 * scale;
      const halfSize = size / 2;
      
      // Draw ship sprite from sprite sheet
      ctx.drawImage(
        spriteImage,
        ix * 128, iy * 128, 128, 128, // source rectangle
        -halfSize, -halfSize, size, size // destination rectangle
      );
    }
  }
}

// Available ship configurations
export const SHIP_CONFIGS = [
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