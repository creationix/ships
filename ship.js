// Ship rendering library for Ship Joy
// Usage: const ship = new ShipRenderer(index, hue)
// ship.attach(parent)
// ship.update({x, y, angle, mode, time, delta})

const SHIP_SPRITES = [
    {}, // placeholder for index 0
    { hue: 150 }, // green-blue
    { hue: 0 }, // red
    { hue: 270 }, // purple
    {},
    { hue: 180 }, // teal
    { hue: 120 }, // green
    { hue: 30 }, // yellow-orange
    {},
    { hue: 190 }, // blue-green
    { hue: 330 }, // pink
    { hue: 210 }, // blue
    {},
    { hue: 90 }, // lime
    { hue: 20 }, // orange
    { hue: 50 }, // yellow

];

const TRAIL_LENGTH = 100;

export class ShipRenderer {
    constructor(shipIndex) {
        const config = SHIP_SPRITES[shipIndex];
        if (!config || typeof config.hue !== 'number') {
            throw new Error(`Invalid ship index: ${shipIndex}`);
        }
        this.hue = config.hue
        this.shipIndex = shipIndex
        const ix = this.shipIndex % 4;
        const iy = Math.floor(this.shipIndex / 4);
        this.spriteStyle = {
            backgroundPosition: `${-ix * 128}px ${-iy * 128}px`,
        };
        this.root = document.createElement('div');
        this.root.className = 'ship';
        Object.assign(this.root.style, this.spriteStyle);
        this.trail = [];
        for (let i = 0; i < TRAIL_LENGTH; i++) {
            const t = document.createElement('div');
            t.className = 'trail';
            t.x = -10;
            t.y = -10;
            this.trail.push(t);
        }
        this.offset = Math.random() * 100;
        this.mode = 'cloud';
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.time = 0;
        this.delta = 0;
    }
    attach(parent) {
        for (const t of this.trail) parent.appendChild(t);
        parent.appendChild(this.root);
    }
    detach() {
        for (const t of this.trail) if (t.parentNode) t.parentNode.removeChild(t);
        if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    }
    // Angle is in degrees, 0 is up, 90 is right, 180 is down, 270 is left
    update({ x, y, angle, mode, time, delta }) {
        this.x = x ?? this.x;
        this.y = y ?? this.y;
        this.angle = angle ?? this.angle;
        this.mode = mode ?? this.mode;
        this.time = time ?? this.time;
        this.delta = delta ?? this.delta;
        // Update ship position and rotation
        this.root.style.transform = `translate(${this.x - 64}px, ${this.y - 64}px) rotate(${this.angle}deg)`;
        if (this.mode === 'cloud') {
            // Cloud mode: particles spin around the ship
            const radius = 100;
            const angleOffset = Math.sin(this.time / 2 + this.offset);
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const a = angleOffset + (i / this.trail.length) * Math.PI * 2;
                t.x = this.x + Math.cos(a * 6) * (Math.sin(i + this.offset) + 1) * radius * i / this.trail.length;
                t.y = this.y + Math.sin(a * 6) * (Math.cos(i + this.offset) + 1) * radius * i / this.trail.length;
                const alpha = (1 - i / this.trail.length) * 0.5;
                const sat = i < this.trail.length * 0.8 ? 100 : 20;
                t.style.boxShadow = `0px 0px 6px 6px hsla(${this.hue}deg, ${sat}%, 50%, ${alpha})`;
                t.style.transform = `translate(${t.x}px, ${t.y}px)`;
            }
        } else if (this.mode === 'follow') {
            // Follow mode: trail follows ship's movement
            this.trail[-1] = { x: this.x + Math.cos((this.angle + 90) * Math.PI / 180) * 50, y: this.y + Math.sin((this.angle + 90) * Math.PI / 180) * 50 };
            for (let i = this.trail.length - 1; i >= 0; i--) {
                const t = this.trail[i];
                let prev = this.trail[i - 1] || this.trail[-1];
                t.x = prev.x;
                t.y = prev.y;
                const alpha = (1 - i / this.trail.length) * 0.5;
                const sat = i < this.trail.length * 0.8 ? 100 : 20;
                t.style.boxShadow = `0px 0px 6px 6px hsla(${this.hue}deg, ${sat}%, 50%, ${alpha})`;
                t.style.transform = `translate(${t.x - 3}px, ${t.y - 3}px)`;
            }
        }
    }
}
