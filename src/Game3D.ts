import { ThreeService } from "./services/ThreeService";

/**
 * 3D Game facade mirroring the 2D Game API
 */
export class Game3D {
  private three = ThreeService.getInstance();
  private shapesPerAction = 1;
  private running = false;

  async initialize(elementId: string): Promise<void> {
    await this.three.initialize(elementId);

    this.three.addCanvasClickListener((xPx, yPx) => {
      if (!this.running) this.startGame();
      this.spawnAt(xPx, yPx, "random");
    });

    this.three.addKeyboardListener((code: string) => {
      if ((code === "Escape" || code === "Esc") && this.running) {
        this.clearCanvas();
      } else if (
        (code === "Enter" || code === "NumpadEnter") &&
        !this.running
      ) {
        this.startGame();
      }
    });
  }

  private startGame(): void {
    this.running = true;
    window.dispatchEvent(new CustomEvent("game-started"));
  }

  createShape(xPx: number, yPx: number, shapeType?: string | null): void {
    const pt = this.three.screenToWorldOnGround(xPx, yPx);
    if (!pt) return;
    const isPhone = (window.innerWidth || 800) < 480;
    const size = isPhone ? 33 : 75;
    const type = (shapeType || "random").toLowerCase();
    const pool = [
      "circle",
      "square",
      "rectangle",
      "triangle",
      "pentagon",
      "hexagon",
      "ellipse",
      "star",
      "irregular",
    ];
    const finalType =
      type === "random" ? pool[Math.floor(Math.random() * pool.length)] : type;
    this.three.addShape(finalType, pt.x, pt.z, size);
  }

  // Spawn using current shapes-per-action setting
  spawnAt(xPx: number, yPx: number, shapeType?: string | null): void {
    const count = Math.max(1, Math.floor(this.shapesPerAction));
    for (let i = 0; i < count; i++) this.createShape(xPx, yPx, shapeType);
  }

  clearCanvas(): void {
    this.three.clearShapes();
  }

  getShapesPerAction(): number {
    return this.shapesPerAction;
  }
  setShapesPerAction(v: number): void {
    this.shapesPerAction = Math.max(1, Math.floor(v));
  }

  setGravity(value: number): void {
    this.three.setGravity(value);
  }
  getGravity(): number {
    return this.three.getGravity();
  }

  isRunning(): boolean {
    return this.running;
  }

  destroy(): void {
    this.three.destroy();
  }
}
