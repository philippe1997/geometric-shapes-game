import { PixiService } from "./services/PixiService";
import { GameStateManager } from "./managers/GameStateManager";
import { ShapeFactory } from "./factories/ShapeFactory";

/**
 * Main Game class - Facade pattern
 * Orchestrates all services and manages game flow
 */
export class Game {
  private pixiService: PixiService;
  private gameStateManager: GameStateManager;
  private shapeFactory: ShapeFactory;
  private shapesPerAction: number = 1;

  constructor() {
    this.pixiService = PixiService.getInstance();
    this.gameStateManager = GameStateManager.getInstance();
    this.shapeFactory = new ShapeFactory();
  }

  async initialize(elementId: string): Promise<void> {
    try {
      await this.pixiService.initialize(elementId);
      this.setupEventListeners();
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.pixiService.addCanvasClickListener((x: number, y: number) => {
      this.handleCanvasClick(x, y);
    });

    this.pixiService.addKeyboardListener((code: string) => {
      this.handleKeyPress(code);
    });
  }

  private handleCanvasClick(x: number, y: number): void {
    if (!this.gameStateManager.isGameRunning()) {
      this.startGame();
    }
    this.spawnAt(x, y);
  }

  private handleKeyPress(code: string): void {
    const isEnter = code === "Enter" || code === "NumpadEnter";
    if (code === "Escape" && this.gameStateManager.isGameRunning()) {
      this.clearCanvas();
    } else if (isEnter && !this.gameStateManager.isGameRunning()) {
      this.startGame();
    }
  }

  private startGame(): void {
    this.gameStateManager.startGame();
    this.pixiService.hideStartScreen();
    // Notify UI that the game has started
    window.dispatchEvent(new CustomEvent("game-started"));
  }

  createShape(x: number, y: number, shapeType?: string | null): void {
    const shape = this.shapeFactory.createShape(x, y, shapeType);
    if (shape) {
      this.pixiService.addShape(shape);
      this.gameStateManager.incrementShapeCount();
    }
  }

  // Spawn using current shapes-per-action setting
  spawnAt(x: number, y: number, shapeType?: string | null): void {
    const count = Math.max(1, Math.floor(this.shapesPerAction));
    for (let i = 0; i < count; i++) {
      this.createShape(x, y, shapeType);
    }
  }

  clearCanvas(): void {
    this.pixiService.clearShapes();
    this.gameStateManager.resetShapeCount();
  }

  getShapesPerAction(): number {
    return this.shapesPerAction;
  }

  setShapesPerAction(value: number): void {
    this.shapesPerAction = Math.max(1, Math.floor(value));
  }

  setGravity(value: number): void {
    this.pixiService.setGravity(value);
  }

  getGravity(): number {
    return this.pixiService.getGravity();
  }

  isRunning(): boolean {
    return this.gameStateManager.isGameRunning();
  }

  destroy(): void {
    this.pixiService.destroy();
  }
}
