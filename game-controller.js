import { ShipRenderer } from './ship-renderer.js';
import { domBuilder } from './dombuilder.js';

/**
 * Game controller for the flying phase
 */

// Game constants
const SHIP_ROTATION_SPEED = 3; // radians per second
const THRUST_POWER = 200; // pixels per second squared
const REVERSE_THRUST_POWER = 100; // half speed for reverse
const FRICTION = 0.98; // velocity damping
const POWER_GENERATION = 100; // power units per second
const THRUST_POWER_COST = 20; // power units per second when thrusting
const MAX_POWER = 1000; // maximum power capacity
const MAX_HEALTH = 100; // maximum health

export class GameController {
  constructor(inputManager, players) {
    this.inputManager = inputManager;
    this.players = new Map();
    this.canvas = null;
    this.ctx = null;
    this.statusElements = new Map();
    
    this.initializeCanvas();
    this.initializePlayers(players);
    this.createStatusDisplay();
  }
  
  initializeCanvas() {
    // Create main game canvas
    this.canvas = domBuilder(['canvas', {
      width: window.innerWidth,
      height: window.innerHeight,
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        background: 'black',
        zIndex: '1'
      }
    }]);
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }
  
  initializePlayers(menuPlayers) {
    // Convert menu players to game players
    menuPlayers.forEach(menuPlayer => {
      const gamePlayer = {
        id: menuPlayer.controllerId,
        name: menuPlayer.name,
        ship: menuPlayer.currentShip,
        
        // Position and movement
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: 0, // velocity x
        vy: 0, // velocity y
        angle: 0, // ship rotation in radians
        
        // Game state
        power: MAX_POWER,
        health: MAX_HEALTH,
        score: 0,
        
        // Input state
        isThrusting: false,
        isReversing: false,
        isRotatingLeft: false,
        isRotatingRight: false,
        
        // Renderer
        renderer: new ShipRenderer(menuPlayer.currentShip.ship, menuPlayer.currentShip.hue)
      };
      
      this.players.set(menuPlayer.controllerId, gamePlayer);
    });
  }
  
  createStatusDisplay() {
    // Create status container
    const statusContainer = domBuilder(['.status-container', {
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '2',
        fontFamily: 'Arial, sans-serif',
        color: 'white'
      }
    }]);
    document.body.appendChild(statusContainer);
    
    // Create status display for each player
    let playerIndex = 0;
    for (const [playerId, player] of this.players) {
      const statusElement = this.createPlayerStatus(player, playerIndex);
      statusContainer.appendChild(statusElement);
      this.statusElements.set(playerId, statusElement);
      playerIndex++;
    }
  }
  
  createPlayerStatus(player, index) {
    // Position status displays around the edges
    const isLeft = index % 2 === 0;
    const verticalIndex = Math.floor(index / 2);
    
    const statusElement = domBuilder(['.player-status', {
      style: {
        position: 'absolute',
        [isLeft ? 'left' : 'right']: '20px',
        top: `${20 + verticalIndex * 120}px`,
        width: '200px',
        height: '100px',
        background: 'rgba(0, 0, 0, 0.7)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '14px'
      }
    }, [
      ['.player-name', {
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '5px',
          color: `hsl(${player.ship.hue}, 70%, 60%)`
        }
      }, player.name],
      
      ['.health-bar', {
        style: {
          marginBottom: '5px'
        }
      }, [
        ['.health-label', 'Health: '],
        ['.health-value', {
          style: {
            display: 'inline-block',
            width: '100px',
            height: '10px',
            background: 'rgba(255, 0, 0, 0.3)',
            border: '1px solid white',
            position: 'relative'
          }
        }, [
          ['.health-fill', {
            style: {
              position: 'absolute',
              left: '0',
              top: '0',
              height: '100%',
              background: 'red',
              width: '100%',
              transition: 'width 0.2s'
            }
          }]
        ]]
      ]],
      
      ['.power-bar', {
        style: {
          marginBottom: '5px'
        }
      }, [
        ['.power-label', 'Power: '],
        ['.power-value', {
          style: {
            display: 'inline-block',
            width: '100px',
            height: '10px',
            background: 'rgba(0, 0, 255, 0.3)',
            border: '1px solid white',
            position: 'relative'
          }
        }, [
          ['.power-fill', {
            style: {
              position: 'absolute',
              left: '0',
              top: '0',
              height: '100%',
              background: 'blue',
              width: '100%',
              transition: 'width 0.2s'
            }
          }]
        ]]
      ]],
      
      ['.score', {
        style: {
          fontSize: '14px'
        }
      }, `Score: ${player.score}`]
    ]]);
    
    return statusElement;
  }
  
  update(time, delta) {
    this.handleInput();
    this.updatePhysics(delta);
    this.updatePower(delta);
    this.render(time);
    this.updateStatusDisplay();
  }
  
  handleInput() {
    for (const [playerId, player] of this.players) {
      const controller = this.inputManager.getController(playerId);
      if (!controller) continue;
      
      // Get input states
      const input = this.inputManager.getInput(playerId);
      
      // Rotation
      player.isRotatingLeft = input.left;
      player.isRotatingRight = input.right;
      
      // Thrust
      player.isThrusting = input.up;
      player.isReversing = input.down;
      
      // TODO: Handle primary/secondary buttons for blasters/shields
    }
  }
  
  updatePhysics(delta) {
    for (const [playerId, player] of this.players) {
      // Rotation
      if (player.isRotatingLeft) {
        player.angle -= SHIP_ROTATION_SPEED * delta;
      }
      if (player.isRotatingRight) {
        player.angle += SHIP_ROTATION_SPEED * delta;
      }
      
      // Thrust
      if (player.isThrusting && player.power > 0) {
        const thrustX = Math.cos(player.angle - Math.PI / 2) * THRUST_POWER * delta;
        const thrustY = Math.sin(player.angle - Math.PI / 2) * THRUST_POWER * delta;
        player.vx += thrustX;
        player.vy += thrustY;
      }
      
      if (player.isReversing && player.power > 0) {
        const thrustX = Math.cos(player.angle - Math.PI / 2) * -REVERSE_THRUST_POWER * delta;
        const thrustY = Math.sin(player.angle - Math.PI / 2) * -REVERSE_THRUST_POWER * delta;
        player.vx += thrustX;
        player.vy += thrustY;
      }
      
      // Apply friction
      player.vx *= FRICTION;
      player.vy *= FRICTION;
      
      // Update position
      player.x += player.vx * delta;
      player.y += player.vy * delta;
      
      // Wrap around screen edges
      if (player.x < 0) player.x = window.innerWidth;
      if (player.x > window.innerWidth) player.x = 0;
      if (player.y < 0) player.y = window.innerHeight;
      if (player.y > window.innerHeight) player.y = 0;
    }
  }
  
  updatePower(delta) {
    for (const [playerId, player] of this.players) {
      // Regenerate power
      player.power = Math.min(MAX_POWER, player.power + POWER_GENERATION * delta);
      
      // Consume power for thrust
      if ((player.isThrusting || player.isReversing) && player.power > 0) {
        player.power = Math.max(0, player.power - THRUST_POWER_COST * delta);
      }
    }
  }
  
  render(time) {
    // Clear canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render each player's ship
    for (const [playerId, player] of this.players) {
      this.renderShip(player, time);
    }
  }
  
  renderShip(player, time) {
    this.ctx.save();
    
    // Move to ship position
    this.ctx.translate(player.x, player.y);
    this.ctx.rotate(player.angle);
    
    // Render ship sprite
    player.renderer.renderShip(this.ctx, 0, 0, 1);
    
    // Render thrust particles if thrusting
    if ((player.isThrusting || player.isReversing) && player.power > 0) {
      this.renderThrustParticles(player, time);
    }
    
    this.ctx.restore();
  }
  
  renderThrustParticles(player, time) {
    const particleCount = 5;
    const thrustLength = player.isThrusting ? 30 : 15;
    
    for (let i = 0; i < particleCount; i++) {
      const offset = (Math.sin(time * 10 + i) * 0.5 + 0.5) * thrustLength;
      const spread = (Math.sin(time * 8 + i * 2) * 0.5 + 0.5) * 10 - 5;
      
      this.ctx.fillStyle = `hsl(${30 + Math.sin(time * 15 + i) * 30}, 100%, ${50 + offset}%)`;
      this.ctx.beginPath();
      this.ctx.arc(spread, 20 + offset, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  updateStatusDisplay() {
    for (const [playerId, player] of this.players) {
      const statusElement = this.statusElements.get(playerId);
      if (!statusElement) continue;
      
      // Update health bar
      const healthFill = statusElement.querySelector('.health-fill');
      if (healthFill) {
        healthFill.style.width = `${(player.health / MAX_HEALTH) * 100}%`;
      }
      
      // Update power bar
      const powerFill = statusElement.querySelector('.power-fill');
      if (powerFill) {
        powerFill.style.width = `${(player.power / MAX_POWER) * 100}%`;
      }
      
      // Update score
      const scoreElement = statusElement.querySelector('.score');
      if (scoreElement) {
        scoreElement.textContent = `Score: ${player.score}`;
      }
    }
  }
  
  cleanup() {
    // Remove canvas and status elements
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    const statusContainer = document.querySelector('.status-container');
    if (statusContainer && statusContainer.parentNode) {
      statusContainer.parentNode.removeChild(statusContainer);
    }
    
    // Stop all player renderers
    for (const [playerId, player] of this.players) {
      if (player.renderer) {
        player.renderer.stop();
      }
    }
  }
}