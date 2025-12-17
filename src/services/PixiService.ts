import { Application, Container, Text } from "pixi.js";
import { Shape } from "../shapes/Shape";
import Matter from "matter-js";

/**
 * Service for managing Pixi.js rendering - Singleton pattern
 */
export class PixiService {
  private static instance: PixiService;
  private app: Application | null = null;
  private shapeContainer: Container | null = null;
  private startText: Text | null = null;
  private instructionsText: Text | null = null;
  // Cache HTML stats nodes for fewer lookups
  private matterEngine: Matter.Engine | null = null;
  private matterWorld: Matter.World | null = null;
  private shapeBodies: { shape: Shape; graphics: any; body: Matter.Body }[] =
    [];
  private animationLoopStarted: boolean = false;
  private visibleWidth: number = 800;
  private visibleHeight: number = 600;
  // Push bottom boundary slightly below canvas so shapes are half hidden
  private boundaryBottomOffset: number = 0;
  private boundaries: {
    left?: Matter.Body;
    right?: Matter.Body;
    top?: Matter.Body;
    bottom?: Matter.Body;
  } = {};
  private lastStatsUpdate = 0;
  private boundCanvasClick?: (e: MouseEvent) => void;
  private boundKeydown?: (e: KeyboardEvent) => void;
  private statsInputsContainer: HTMLElement | null = null;
  private statsCountInput: HTMLInputElement | null = null;
  private statsAreaInput: HTMLInputElement | null = null;

  private constructor() {}

  static getInstance(): PixiService {
    if (!PixiService.instance) {
      PixiService.instance = new PixiService();
    }
    return PixiService.instance;
  }

  async initialize(elementId: string): Promise<void> {
    this.app = new Application({
      width: this.visibleWidth,
      height: this.visibleHeight,
      backgroundColor: 0x0a0a0a,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      powerPreference: "high-performance",
    });

    // Wait for the app to be ready
    await this.app.init();

    const container = document.getElementById(elementId);
    if (!container) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Get the canvas element
    const canvas = this.app.canvas as HTMLCanvasElement;
    if (!canvas) {
      throw new Error("Failed to get canvas from Pixi Application");
    }

    // Make canvas responsive in CSS; renderer size will follow below
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";

    container.appendChild(canvas);

    // Initialize containers and text
    this.shapeContainer = new Container();
    this.app.stage.addChild(this.shapeContainer);

    // Initialize Matter.js engine and world
    this.matterEngine = Matter.Engine.create({ enableSleeping: false });
    this.matterWorld = this.matterEngine.world;
    this.matterWorld.gravity.y = 1;

    // Set initial size from container and create boundaries
    this.updateRendererSize(container);
    this.createOrUpdateBoundaries();

    this.createStartScreen();
    this.createStatsDisplay();
    this.startAnimationLoop();
  }

  private startAnimationLoop(): void {
    if (this.animationLoopStarted || !this.app || !this.matterEngine) return;

    this.animationLoopStarted = true;

    this.app.ticker.add(() => {
      // Step Matter.js engine
      Matter.Engine.update(this.matterEngine!, 1000 / 60);

      // Sync Pixi graphics to Matter bodies
      for (const { graphics, body } of this.shapeBodies) {
        graphics.x = body.position.x;
        graphics.y = body.position.y;
        graphics.rotation = body.angle;
      }

      // Update stats at most 5 times per second
      const now = performance.now();
      if (now - this.lastStatsUpdate > 200) {
        this.updateStatsDisplay();
        this.lastStatsUpdate = now;
      }
    });
  }

  private createStartScreen(): void {
    if (!this.app) return;

    this.startText = new Text("CLICK OR ENTER TO START", {
      fontFamily: "Arial",
      fontSize: 48,
      fill: 0xffffff,
      align: "center",
    });
    this.startText.anchor.set(0.5);
    this.startText.x = this.app.screen.width / 2;
    this.startText.y = this.app.screen.height / 2;
    this.app.stage.addChild(this.startText);

    this.instructionsText = new Text("Create geometric shapes", {
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xaaaaaa,
      align: "right",
    });
    // Position at the top-right corner inside the canvas
    this.instructionsText.anchor.set(1, 0); // right-top
    this.instructionsText.x = this.app.screen.width - 10;
    this.instructionsText.y = 10;
    this.app.stage.addChild(this.instructionsText);
  }

  hideStartScreen(): void {
    if (!this.app || !this.startText || !this.instructionsText) return;

    this.app.stage.removeChild(this.startText);
    this.app.stage.removeChild(this.instructionsText);
    this.startText.destroy();
    this.instructionsText.destroy();
    this.startText = null;
    this.instructionsText = null;
  }

  private createStatsDisplay(): void {
    if (!this.app) return;

    const canvas = this.getCanvas();
    const container = canvas?.parentElement || null;
    if (container) {
      this.statsInputsContainer = container.querySelector(
        ".stats-inputs-container"
      ) as HTMLElement | null;
      // If container exists, try to fetch inputs
      if (this.statsInputsContainer) {
        {
          this.statsCountInput = this.statsInputsContainer.querySelector(
            "#shape-count-input"
          ) as HTMLInputElement | null;
          this.statsAreaInput = this.statsInputsContainer.querySelector(
            "#surface-area-input"
          ) as HTMLInputElement | null;
        }
      }
    }
  }

  private updateStatsDisplay(): void {
    // Calculate total surface area
    let totalArea = 0;
    for (const entry of this.shapeBodies) {
      totalArea += entry.shape.getArea();
    }

    // Update inputs outside canvas if present
    if (this.statsCountInput)
      this.statsCountInput.value = String(this.shapeBodies.length);
    if (this.statsAreaInput)
      this.statsAreaInput.value = `${Math.round(totalArea)} px²`;
  }

  addShape(shape: Shape): void {
    if (!this.shapeContainer || !this.app || !this.matterWorld) return;

    const graphics = shape.getGraphics();
    // Always draw centered at (0,0)
    graphics.x = 0;
    graphics.y = 0;
    this.shapeContainer.addChild(graphics);

    // Create Matter.js body based on shape type
    let body: Matter.Body;
    const x = shape.getX();
    const y = shape.getY();
    const size = shape.getSize();
    const type = shape.constructor.name.toLowerCase();
    switch (type) {
      case "circle":
        body = Matter.Bodies.circle(x, y, size / 2, {
          restitution: 0.5,
          friction: 0.2,
        });
        break;
      case "rectangle":
        // 2:1 rectangle — width = size, height = size/2
        body = Matter.Bodies.rectangle(x, y, size, size / 2, {
          restitution: 0.8, // increase bounciness
          friction: 0.2,
        });
        break;
      case "triangle":
        body = Matter.Bodies.polygon(x, y, 3, size / 2, {
          restitution: 0.5,
          friction: 0.2,
        });
        break;
      case "pentagon":
        body = Matter.Bodies.polygon(x, y, 5, size / 2, {
          restitution: 0.5,
          friction: 0.2,
        });
        break;
      case "hexagon":
        body = Matter.Bodies.polygon(x, y, 6, size / 2, {
          restitution: 0.5,
          friction: 0.2,
        });
        // Set initial angle so hexagon drops flat-side down
        Matter.Body.setAngle(body, Math.PI / 4);
        break;
      case "star":
        // Approximate star as a polygon for physics
        body = Matter.Bodies.polygon(x, y, 5, size / 2, {
          restitution: 0.5,
          friction: 0.2,
        });
        break;
      case "ellipse": {
        // Approximate an ellipse with fewer vertices on small screens
        const rx = size / 2;
        const ry = rx * 0.6;
        const segments = (this.app?.screen.width || 800) < 480 ? 12 : 20;
        const verts = Array.from({ length: segments }, (_, i) => {
          const t = (i / segments) * Math.PI * 2;
          return { x: Math.cos(t) * rx, y: Math.sin(t) * ry };
        });
        body = Matter.Bodies.fromVertices(x, y, [verts], {
          restitution: 0.5,
          friction: 0.2,
        }) as Matter.Body;
        break;
      }
      case "irregular": {
        const verts = shape.getPhysicsVertices?.() || [];
        const validVerts =
          Array.isArray(verts) && verts.length >= 3
            ? verts
            : [
                { x: -size / 2, y: -size / 2 },
                { x: size / 2, y: -size / 2 },
                { x: 0, y: size / 2 },
              ];
        body = Matter.Bodies.fromVertices(x, y, [validVerts], {
          restitution: 0.5,
          friction: 0.2,
        }) as Matter.Body;
        break;
      }
      default:
        body = Matter.Bodies.rectangle(x, y, size, size, {
          restitution: 0.5,
          friction: 0.2,
        });
    }
    Matter.World.add(this.matterWorld, body);
    this.shapeBodies.push({ shape, graphics, body });
  }

  clearShapes(): void {
    if (!this.shapeContainer || !this.matterWorld) return;

    // Destroy all graphics and remove physics bodies
    for (const entry of this.shapeBodies) {
      this.shapeContainer.removeChild(entry.graphics);
      entry.graphics.destroy?.();
      Matter.World.remove(this.matterWorld, entry.body);
    }
    this.shapeBodies = [];
    this.shapeContainer.removeChildren();
  }

  addCanvasClickListener(callback: (x: number, y: number) => void): void {
    if (!this.app) return;

    const canvas = this.app.canvas as HTMLCanvasElement;
    this.boundCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Try to find and delete a shape at this point
      if (this.shapeContainer && this.app) {
        // Traverse in reverse to prioritize topmost shape
        for (let i = this.shapeBodies.length - 1; i >= 0; i--) {
          const entry = this.shapeBodies[i];
          // Convert global click to local shape coordinates
          const local = entry.graphics.toLocal({ x, y }, this.app.stage);
          if (entry.graphics.containsPoint(local)) {
            // Remove from Pixi
            this.shapeContainer.removeChild(entry.graphics);
            entry.graphics.destroy?.();
            // Remove from Matter.js
            if (this.matterWorld) {
              Matter.World.remove(this.matterWorld, entry.body);
            }
            // Remove from array
            this.shapeBodies.splice(i, 1);
            // Update stats
            this.updateStatsDisplay();
            return; // Only delete one shape per click
          }
        }
      }
      // If no shape was clicked, call the original callback (to add a shape)
      callback(x, y);
    };
    canvas.addEventListener("click", this.boundCanvasClick);
  }

  addKeyboardListener(callback: (code: string) => void): void {
    this.boundKeydown = (event: KeyboardEvent) => {
      callback(event.code);
    };
    window.addEventListener("keydown", this.boundKeydown);
  }

  getCanvas(): HTMLCanvasElement | null {
    return (this.app?.canvas as HTMLCanvasElement) || null;
  }

  getVisibleSize(): { width: number; height: number } {
    return { width: this.visibleWidth, height: this.visibleHeight };
  }

  setGravity(value: number): void {
    if (!this.matterWorld) return;
    this.matterWorld.gravity.y = value;
  }

  getGravity(): number {
    return this.matterWorld?.gravity.y ?? 1;
  }

  private updateRendererSize(container: HTMLElement): void {
    if (!this.app) return;
    const rect = container.getBoundingClientRect();
    const padding = 16;
    const width = Math.max(
      280,
      Math.floor(rect.width || window.innerWidth) - padding
    );
    const height = Math.max(
      220,
      Math.floor(Math.min(window.innerHeight * 0.7, width * 0.75))
    );
    this.visibleWidth = width;
    this.visibleHeight = height;
    this.app.renderer.resize(width, height);
    this.createOrUpdateBoundaries();
  }

  private createOrUpdateBoundaries(): void {
    if (!this.matterWorld) return;
    // Remove old
    const current = [
      this.boundaries.left,
      this.boundaries.right,
      this.boundaries.top,
      this.boundaries.bottom,
    ].filter(Boolean) as Matter.Body[];
    if (current.length) Matter.World.remove(this.matterWorld, current);

    const thickness = 50;
    // Choose an offset so most shapes are ~half hidden when resting
    const isPhone = (window.innerWidth || 800) < 480;
    this.boundaryBottomOffset = isPhone ? 16 : 38; // approx half of typical radius
    const left = Matter.Bodies.rectangle(
      -thickness / 2,
      this.visibleHeight / 2,
      thickness,
      this.visibleHeight,
      { isStatic: true }
    );
    const right = Matter.Bodies.rectangle(
      this.visibleWidth + thickness / 2,
      this.visibleHeight / 2,
      thickness,
      this.visibleHeight,
      { isStatic: true }
    );

    const topOffset = isPhone ? 80 : 140; // must be > max spawn offset
    const top = Matter.Bodies.rectangle(
      this.visibleWidth / 2,
      -topOffset - thickness / 2,
      this.visibleWidth,
      thickness,
      { isStatic: true }
    );
    const bottom = Matter.Bodies.rectangle(
      this.visibleWidth / 2,
      this.visibleHeight + this.boundaryBottomOffset + thickness / 2,
      this.visibleWidth,
      thickness,
      { isStatic: true }
    );
    Matter.World.add(this.matterWorld, [left, right, top, bottom]);
    this.boundaries = { left, right, top, bottom };
  }
}
