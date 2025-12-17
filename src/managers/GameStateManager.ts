/**
 * Game state manager - Singleton pattern
 */
export class GameStateManager {
  private static instance: GameStateManager;
  private isRunning: boolean = false;
  private shapeCount: number = 0;

  private constructor() {}

  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  startGame(): void {
    this.isRunning = true;
    this.shapeCount = 0;
  }

  stopGame(): void {
    this.isRunning = false;
  }

  isGameRunning(): boolean {
    return this.isRunning;
  }

  incrementShapeCount(): void {
    this.shapeCount++;
  }

  resetShapeCount(): void {
    this.shapeCount = 0;
  }

  getShapeCount(): number {
    return this.shapeCount;
  }
}
