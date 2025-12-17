import { Graphics } from "pixi.js";

/**
 * Abstract base class for all geometric shapes
 */
export abstract class Shape {
  protected graphics: Graphics;
  protected color: number;
  protected x: number;
  protected y: number;
  protected size: number;

  constructor(x: number, y: number, size: number, color: number) {
    this.graphics = new Graphics();
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
  }

  abstract draw(): void;
  abstract getBoundingRadius(): number;
  abstract getArea(): number;

  getGraphics(): Graphics {
    return this.graphics;
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  getSize(): number {
    return this.size;
  }

  getMass(): number {
    return this.size * this.size;
  }

  convertToFilled(): void {
    this.graphics.clear();
    this.draw();
  }

  // Optional physics vertices for irregular polygons; default none
  getPhysicsVertices(): { x: number; y: number }[] | null {
    return null;
  }
}

/**
 * Circle shape implementation
 */
export class Circle extends Shape {
  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    this.graphics.drawCircle(0, 0, this.size / 2);
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    // Matter.js uses this as the collision radius
    return this.size / 2;
  }

  getArea(): number {
    const r = this.size / 2;
    return Math.PI * r * r;
  }
}

/**
 * Square shape implementation
 */
export class Square extends Shape {
  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    this.graphics.drawRect(
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size
    );
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    // Matter.js rectangle: half the diagonal
    return Math.sqrt(2 * Math.pow(this.size / 2, 2));
  }

  getArea(): number {
    return this.size * this.size;
  }
}

/**
 * Rectangle shape implementation
 */
export class Rectangle extends Shape {
  private getWidth(): number {
    // Width equals size per request
    return this.size;
  }
  private getHeight(): number {
    // Height is half of width
    return this.size * 0.5;
  }

  draw(): void {
    const w = this.getWidth();
    const h = this.getHeight();
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    this.graphics.drawRect(-w / 2, -h / 2, w, h);
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    const w = this.getWidth();
    const h = this.getHeight();
    // Half the diagonal of the rectangle
    return Math.sqrt(w * w + h * h) / 2;
  }

  getArea(): number {
    return this.getWidth() * this.getHeight();
  }
}

/**
 * Triangle shape implementation
 */
export class Triangle extends Shape {
  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    // Rotate so a flat side is at the bottom
    const r = this.size / 2;
    const sides = 3;
    const rotation = -Math.PI / sides;
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides + rotation;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        this.graphics.moveTo(x, y);
      } else {
        this.graphics.lineTo(x, y);
      }
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    // Matter.js polygon: radius is the distance from center to vertex
    return this.size / 2;
  }

  getArea(): number {
    return (Math.sqrt(3) / 4) * this.size * this.size;
  }
}

/**
 * Star shape implementation
 */
export class Star extends Shape {
  private points: number = 5;

  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    // Draw the star visually
    const outerRadius = this.size / 2;
    const innerRadius = this.size / 4;
    const points = this.points * 2;
    // Rotate so a flat side of the pentagon (physics body) is at the bottom
    const rotation = -Math.PI / 5;
    for (let i = 0; i < points; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / this.points + rotation;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        this.graphics.moveTo(x, y);
      } else {
        this.graphics.lineTo(x, y);
      }
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    // Physics body is a pentagon with radius size/2
    return this.size / 2;
  }

  getArea(): number {
    const r = this.size / 2;
    return Math.PI * r * r * 0.7; // adjust factor to match your star drawing
  }
}

/**
 * Pentagon shape implementation
 */
export class Pentagon extends Shape {
  private sides: number = 5;

  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    // Rotate so a flat side is at the bottom
    const rotation = -Math.PI / this.sides;
    for (let i = 0; i < this.sides; i++) {
      const angle = (i * Math.PI * 2) / this.sides + rotation;
      const x = (Math.cos(angle) * this.size) / 2;
      const y = (Math.sin(angle) * this.size) / 2;
      if (i === 0) {
        this.graphics.moveTo(x, y);
      } else {
        this.graphics.lineTo(x, y);
      }
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    // Matter.js polygon: radius is the distance from center to vertex
    return this.size / 2;
  }

  getArea(): number {
    return (
      (1 / 4) * Math.sqrt(5 * (5 + 2 * Math.sqrt(5))) * this.size * this.size
    );
  }
}

/**
 * Hexagon shape implementation
 */
export class Hexagon extends Shape {
  private sides: number = 6;

  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    // Rotate by Math.PI/6 so flat side is at the bottom (no scaling)
    const r = this.size / 2;
    const rotation = Math.PI / 6;
    for (let i = 0; i < this.sides; i++) {
      const angle = (i * Math.PI * 2) / this.sides + rotation;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        this.graphics.moveTo(x, y);
      } else {
        this.graphics.lineTo(x, y);
      }
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    // Matter.js polygon: radius is the distance from center to vertex
    return this.size / 2;
  }

  getArea(): number {
    return ((3 * Math.sqrt(3)) / 2) * this.size * this.size;
  }
}

/**
 * Ellipse shape implementation
 */
export class Ellipse extends Shape {
  // ry is a ratio of rx; keep ellipse visibly distinct
  private ryRatio: number = 0.6;

  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    const rx = this.size / 2;
    const ry = rx * this.ryRatio;
    this.graphics.drawEllipse(0, 0, rx, ry);
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    const rx = this.size / 2;
    const ry = rx * this.ryRatio;
    return Math.max(rx, ry);
  }

  getArea(): number {
    const rx = this.size / 2;
    const ry = rx * this.ryRatio;
    return Math.PI * rx * ry;
  }
}

/**
 * Irregular random polygon shape implementation
 */
export class Irregular extends Shape {
  private vertices: { x: number; y: number }[];
  private static readonly BASE_VERTICES: { x: number; y: number }[] = [
    // Fixed irregular pentagon (counter-clockwise order)
    { x: 0.0, y: -1.0 },
    { x: 0.95, y: -0.2 },
    { x: 0.45, y: 1.0 },
    { x: -0.3, y: 0.9 },
    { x: -0.9, y: 0.1 },
  ];

  constructor(x: number, y: number, size: number, color: number) {
    super(x, y, size, color);
    const scale = (this.size / 2) * 1.15; // slightly bigger than other shapes
    this.vertices = Irregular.BASE_VERTICES.map((v) => ({
      x: v.x * scale,
      y: v.y * scale,
    }));
  }

  draw(): void {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    for (let i = 0; i < this.vertices.length; i++) {
      const { x, y } = this.vertices[i];
      if (i === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }

  getBoundingRadius(): number {
    let maxR = 0;
    for (const v of this.vertices) {
      const d = Math.hypot(v.x, v.y);
      if (d > maxR) maxR = d;
    }
    return maxR;
  }

  getArea(): number {
    // Shoelace formula
    let area = 0;
    const n = this.vertices.length;
    for (let i = 0; i < n; i++) {
      const { x: x1, y: y1 } = this.vertices[i];
      const { x: x2, y: y2 } = this.vertices[(i + 1) % n];
      area += x1 * y2 - x2 * y1;
    }
    return Math.abs(area) / 2;
  }

  getPhysicsVertices(): { x: number; y: number }[] | null {
    return this.vertices;
  }
}
