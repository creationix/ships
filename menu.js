/**
 * Ship selection menu with player state management and countdown system.
 */

import { inputManager } from './input.js';
import { ShipRenderer } from './ship.js';

// Available ship indices (skipping empty slots)
const AVAILABLE_SHIPS = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];

// Simple helper functions
function randomShip(excludeShips = []) {
    const available = AVAILABLE_SHIPS.filter(ship => !excludeShips.includes(ship));
    return available[Math.floor(Math.random() * available.length)];
}

function createPlayer(controller) {
    return {
        controller,
        state: 'cycling',
        shipIndex: randomShip(),
        readyOffset: Math.random() * Math.PI * 2
    };
}

export class MenuManager {
    constructor() {
        this.players = new Map();
        this.container = null;
        this.countdownTimer = null;
        this.countdownStartTime = null;
        this.ships = new Map();
        this.elements = new Map();
        this.lastStructureHash = '';

        this.setupInputListeners();
        this.startAnimationLoop();
    }

    init(container) {
        this.container = container;
        this.renderAll();
    }

    // Check if we need to rebuild everything or just update animations
    needsRebuild() {
        const players = Array.from(this.players.values());
        const currentHash = JSON.stringify({
            playerCount: players.length,
            ships: players.map(p => ({ id: p.controller.index, ship: p.shipIndex })),
            showCountdown: this.shouldShowCountdown()
        });

        if (currentHash !== this.lastStructureHash) {
            this.lastStructureHash = currentHash;
            return true;
        }
        return false;
    }

    // Rebuild the entire menu from scratch
    renderAll() {
        // Clean up old ships
        this.ships.forEach(ship => ship.detach());
        this.ships.clear();
        this.elements.clear();
        this.container.innerHTML = '';

        const players = Array.from(this.players.values());

        if (players.length === 0) {
            this.showWelcomeMessage();
        } else {
            this.showPlayers(players);
            if (this.shouldShowCountdown()) {
                this.showCountdown();
            }
        }
    }

    showWelcomeMessage() {
        const welcome = document.createElement('div');
        welcome.className = 'welcome-message';
        welcome.innerHTML = `
            <h1>Ship Joy</h1>
            <p>Press WASD+C/V or Arrow Keys+&lt;/&gt; to join as keyboard players</p>
            <p>Press any button on a gamepad to join as gamepad players</p>
        `;
        this.container.appendChild(welcome);
        this.elements.set('welcome', welcome);
    }

    showPlayers(players) {
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        const spacing = 200;
        const totalWidth = (players.length - 1) * spacing;
        const startX = (containerWidth - totalWidth) / 2;
        const centerY = containerHeight / 2;

        players.forEach((player, index) => {
            const x = startX + index * spacing;

            // Create label
            const label = document.createElement('div');
            label.className = 'player-label';
            label.textContent = player.controller.label;
            label.style.position = 'absolute';
            label.style.left = `${x - 64}px`;
            label.style.top = `${centerY - 150}px`;
            label.style.width = '128px';
            label.style.textAlign = 'center';

            this.container.appendChild(label);
            this.elements.set(`label-${player.controller.index}`, label);

            // Create ship
            const ship = new ShipRenderer(player.shipIndex);
            ship.attach(this.container);
            this.ships.set(player.controller.index, ship);

            // Store position for animation
            player.x = x;
            player.y = centerY;
        });
    }

    showCountdown() {
        const countdown = document.createElement('div');
        countdown.className = 'countdown';
        countdown.textContent = this.getCountdownSeconds().toString();
        this.container.appendChild(countdown);
        this.elements.set('countdown', countdown);
    }

    // Simple animation update - just move ships
    updateAnimations() {
        if (this.needsRebuild()) {
            this.renderAll();
            return;
        }

        // Update countdown if showing
        if (this.shouldShowCountdown()) {
            const countdownEl = this.elements.get('countdown');
            if (countdownEl) {
                countdownEl.textContent = this.getCountdownSeconds().toString();
            }
        }

        // Update ship animations
        const time = performance.now() / 1000;
        this.players.forEach(player => {
            const ship = this.ships.get(player.controller.index);
            if (!ship || !player.x) return;

            let angle = 0;
            let mode = 'cloud';

            if (player.state === 'cycling') {
                angle = (time * 30) % 360; // rotate 30 degrees per second
            } else if (player.state === 'ready') {
                angle = Math.sin(time * 2 + player.readyOffset) * 15; // oscillate ±15 degrees
                mode = 'follow';
            }

            ship.update({ x: player.x, y: player.y, angle, mode, time, delta: 0 });
        });
    }

    shouldShowCountdown() {
        const players = Array.from(this.players.values());
        return players.length > 0 && players.every(p => p.state === 'ready');
    }

    getCountdownSeconds() {
        if (!this.countdownStartTime) return 5;
        const elapsed = Date.now() - this.countdownStartTime;
        const remaining = Math.max(0, 5000 - elapsed);
        return Math.ceil(remaining / 1000);
    }

    setupInputListeners() {
        inputManager.on('controller_added', (controller) => {
            this.addPlayer(controller);
        });

        inputManager.on('controller_removed', (controller) => {
            this.removePlayer(controller.index);
        });

        // Poll gamepad input
        const poll = () => {
            inputManager.poll();
            requestAnimationFrame(poll);
        };
        poll();
    }

    addPlayer(controller) {
        if (this.players.has(controller.index)) {
            const player = this.players.get(controller.index);
            player.state = 'cycling';
            this.setupPlayerControls(player);
            return;
        }

        const player = createPlayer(controller);
        this.players.set(controller.index, player);
        this.setupPlayerControls(player);
    }

    removePlayer(controllerIndex) {
        this.players.delete(controllerIndex);
        this.checkCountdown();
    }

    setupPlayerControls(player) {
        const controller = player.controller;

        // Remove old listeners
        controller.off('left', player.onLeft);
        controller.off('right', player.onRight);
        controller.off('primary', player.onPrimary);
        controller.off('secondary', player.onSecondary);

        // Add new listeners
        player.onLeft = () => this.cycleShip(player, -1);
        player.onRight = () => this.cycleShip(player, 1);
        player.onPrimary = () => this.handlePrimary(player);
        player.onSecondary = () => this.handleSecondary(player);

        controller.on('left', player.onLeft);
        controller.on('right', player.onRight);
        controller.on('primary', player.onPrimary);
        controller.on('secondary', player.onSecondary);
    }

    // Cycle through available ships (direction: -1 for left, 1 for right)
    cycleShip(player, direction) {
        if (player.state !== 'cycling') return;

        const currentIndex = AVAILABLE_SHIPS.indexOf(player.shipIndex);
        let newIndex = (currentIndex + direction + AVAILABLE_SHIPS.length) % AVAILABLE_SHIPS.length;

        // Skip ships selected by other players
        const selectedShips = Array.from(this.players.values())
            .filter(p => p !== player && (p.state === 'selected' || p.state === 'ready'))
            .map(p => p.shipIndex);

        while (selectedShips.includes(AVAILABLE_SHIPS[newIndex])) {
            newIndex = (newIndex + direction + AVAILABLE_SHIPS.length) % AVAILABLE_SHIPS.length;
        }

        this.changeShip(player, AVAILABLE_SHIPS[newIndex]);
    }

    changeShip(player, newShipIndex) {
        // Handle ship conflicts - bump other player if needed
        const conflictPlayer = Array.from(this.players.values())
            .find(p => p !== player && p.shipIndex === newShipIndex &&
                (p.state === 'selected' || p.state === 'ready'));

        if (conflictPlayer) {
            const excludeShips = Array.from(this.players.values())
                .filter(p => p !== conflictPlayer && (p.state === 'selected' || p.state === 'ready'))
                .map(p => p.shipIndex);
            excludeShips.push(newShipIndex);

            conflictPlayer.shipIndex = randomShip(excludeShips);
            conflictPlayer.state = 'cycling';
        }

        player.shipIndex = newShipIndex;
    }

    handlePrimary(player) {
        if (player.state === 'cycling') {
            this.changeShip(player, player.shipIndex); // Handle conflicts
            player.state = 'selected';
        } else if (player.state === 'selected') {
            player.state = 'ready';
            this.checkCountdown();
        }
    }

    handleSecondary(player) {
        if (player.state === 'cycling') {
            player.controller.deactivate();
        } else if (player.state === 'selected') {
            player.state = 'cycling';
            this.checkCountdown();
        } else if (player.state === 'ready') {
            player.state = 'selected';
            this.checkCountdown();
        }
    }

    checkCountdown() {
        if (this.shouldShowCountdown()) {
            this.startCountdown();
        } else {
            this.stopCountdown();
        }
    }

    startCountdown() {
        if (this.countdownTimer) return;

        this.countdownStartTime = Date.now();

        const update = () => {
            const elapsed = Date.now() - this.countdownStartTime;
            if (elapsed >= 5000) {
                this.startGame();
            } else {
                this.countdownTimer = setTimeout(update, 100);
            }
        };
        update();
    }

    stopCountdown() {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
        this.countdownStartTime = null;
    }

    startGame() {
        console.log('Starting game with players:', Array.from(this.players.values()));
        this.stopCountdown();
    }

    startAnimationLoop() {
        const animate = () => {
            this.updateAnimations();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    destroy() {
        this.stopCountdown();
        this.ships.forEach(ship => ship.detach());
        this.players.clear();
        this.ships.clear();
        this.elements.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
