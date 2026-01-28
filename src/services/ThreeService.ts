import * as THREE from "three";
import * as CANNON from "cannon-es";

export type MeshBody = { mesh: THREE.Mesh; body: CANNON.Body; area: number };

/**
 * Three.js + cannon-es service for 3D rendering/physics (singleton)
 */
export class ThreeService {
  private static instance: ThreeService;
  static getInstance(): ThreeService {
    if (!ThreeService.instance) ThreeService.instance = new ThreeService();
    return ThreeService.instance;
  }

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private world: CANNON.World | null = null;
  private entries: Array<MeshBody> = [];
  private animationRunning = false;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private clickHandler?: (e: MouseEvent) => void;
  private keyHandler?: (e: KeyboardEvent) => void;
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private statsCountInput: HTMLInputElement | null = null;
  private statsAreaInput: HTMLInputElement | null = null;

  private constructor() {}

  async initialize(elementId: string): Promise<void> {
    const container = document.getElementById(elementId);
    if (!container) throw new Error(`Element with id "${elementId}" not found`);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "auto";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(0, 9, 16);
    this.camera.lookAt(0, 2, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 1);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 5);
    this.scene.add(hemi, dir);

    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -1, 0) });

    this.resizeToContainer(container);
    this.addBounds();
    this.hookStatsInputs(container);

    this.startLoop();
    window.addEventListener("resize", () => this.resizeToContainer(container));
  }

  private hookStatsInputs(container: HTMLElement) {
    const host = container.querySelector(".stats-inputs-container")?.parentElement || container;
    this.statsCountInput = host.querySelector("#shape-count-input") as HTMLInputElement | null;
    this.statsAreaInput = host.querySelector("#surface-area-input") as HTMLInputElement | null;
  }

  private resizeToContainer(container: HTMLElement) {
    if (!this.renderer || !this.camera) return;
    const padding = 16;
    const width = Math.max(280, Math.floor(container.clientWidth || window.innerWidth) - padding);
    const height = Math.max(220, Math.floor(Math.min(window.innerHeight * 0.7, width * 0.75)));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private addBounds() {
    if (!this.scene || !this.world) return;
    // Ground
    const w = 14, d = 10, h = 0.5;
    const groundGeo = new THREE.PlaneGeometry(w, d);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x151515, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotateX(-Math.PI / 2);
    this.scene.add(ground);

    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    // Simple walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x202020 });
    const wallGeoX = new THREE.BoxGeometry(h, 4, d);
    const wallGeoZ = new THREE.BoxGeometry(w, 4, h);

    const walls: Array<{ mesh: THREE.Mesh; body: CANNON.Body; pos: THREE.Vector3 }> = [
      { mesh: new THREE.Mesh(wallGeoX, wallMat), body: new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(h/2, 2, d/2)) }), pos: new THREE.Vector3(-w/2, 2, 0) },
      { mesh: new THREE.Mesh(wallGeoX, wallMat), body: new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(h/2, 2, d/2)) }), pos: new THREE.Vector3( w/2, 2, 0) },
      { mesh: new THREE.Mesh(wallGeoZ, wallMat), body: new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(w/2, 2, h/2)) }), pos: new THREE.Vector3(0, 2, -d/2) },
      { mesh: new THREE.Mesh(wallGeoZ, wallMat), body: new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(w/2, 2, h/2)) }), pos: new THREE.Vector3(0, 2,  d/2) },
    ];
    walls.forEach(({ mesh, body, pos }) => {
      mesh.position.copy(pos);
      this.scene!.add(mesh);
      body.position.set(pos.x, pos.y, pos.z);
      this.world!.addBody(body);
    });
  }

  private startLoop() {
    if (this.animationRunning || !this.renderer || !this.scene || !this.camera || !this.world) return;
    this.animationRunning = true;
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(0.033, this.clock.getDelta());
      this.world!.step(1 / 60, dt, 3);

      for (const e of this.entries) {
        e.mesh.position.set(e.body.position.x, e.body.position.y, e.body.position.z);
        e.mesh.quaternion.set(e.body.quaternion.x, e.body.quaternion.y, e.body.quaternion.z, e.body.quaternion.w);
      }

      if (this.statsCountInput) this.statsCountInput.value = String(this.entries.length);
      if (this.statsAreaInput) {
        const total = this.entries.reduce((s, e) => s + e.area, 0);
        this.statsAreaInput.value = `${Math.round(total)} px²`;
      }

      this.renderer!.render(this.scene!, this.camera!);
    });
  }

  addCanvasClickListener(callback: (xPx: number, yPx: number) => void): void {
    if (!this.renderer || !this.camera || !this.scene) return;
    const canvas = this.renderer.domElement;
    this.clickHandler = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      );
      this.raycaster.setFromCamera(ndc, this.camera!);

      // Try delete first
      const intersects = this.raycaster.intersectObjects(this.scene!.children, false);
      const hit = intersects.find((i: THREE.Intersection) => (i.object as THREE.Mesh).isMesh);
      if (hit) {
        const idx = this.entries.findIndex(e => e.mesh === hit.object);
        if (idx >= 0) {
          this.scene!.remove(this.entries[idx].mesh);
          this.world!.removeBody(this.entries[idx].body);
          this.entries.splice(idx, 1);
          return;
        }
      }
      // Otherwise, delegate spawn using pixel coords
      callback(event.clientX - rect.left, event.clientY - rect.top);
    };
    canvas.addEventListener("click", this.clickHandler);
  }

  addKeyboardListener(callback: (code: string) => void): void {
    this.keyHandler = (e: KeyboardEvent) => callback(e.code);
    window.addEventListener("keydown", this.keyHandler);
  }

  screenToWorldOnGround(xPx: number, yPx: number): THREE.Vector3 | null {
    if (!this.renderer || !this.camera) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((xPx / rect.width) * 2 - 1, -(yPx / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const pt = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, pt);
    return pt;
  }

  addShape(type: string, worldX: number, worldZ: number, size: number): void {
    if (!this.scene || !this.world) return;
    const ySpawn = 6;
    const t = type.trim().toLowerCase();

    const isSphere = ["circle", "ellipse"].includes(t);
    // Use box for all other shapes for a simple MVP
    if (isSphere) {
      const r = size / 160; // px -> world units
      const geom = new THREE.SphereGeometry(r, 24, 16);
      const mat = new THREE.MeshStandardMaterial({ color: this.randColor() });
      const mesh = new THREE.Mesh(geom, mat);
      const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(r), linearDamping: 0.01 });
      mesh.position.set(worldX, ySpawn, worldZ);
      body.position.set(worldX, ySpawn, worldZ);
      const area = Math.PI * (size/2) * (size/2);
      this.scene.add(mesh);
      this.world.addBody(body);
      this.entries.push({ mesh, body, area });
    } else {
      const w = size / 100, h = (t === "rectangle" ? size * 0.5 : size) / 100, depth = size / 140;
      const geom = new THREE.BoxGeometry(w, h, depth);
      const mat = new THREE.MeshStandardMaterial({ color: this.randColor() });
      const mesh = new THREE.Mesh(geom, mat);
      const body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(w/2, h/2, depth/2)), linearDamping: 0.01 });
      mesh.position.set(worldX, ySpawn, worldZ);
      body.position.set(worldX, ySpawn, worldZ);
      const area = (t === "rectangle") ? size * (size * 0.5) : size * size;
      this.scene.add(mesh);
      this.world.addBody(body);
      this.entries.push({ mesh, body, area });
    }
  }

  clearShapes(): void {
    if (!this.scene || !this.world) return;
    for (const e of this.entries) {
      this.scene.remove(e.mesh);
      this.world.removeBody(e.body);
    }
    this.entries = [];
  }

  setGravity(value: number): void {
    if (!this.world) return;
    this.world.gravity.set(0, -Math.max(0, Math.min(5, value)), 0);
  }
  getGravity(): number {
    return this.world ? Math.abs(this.world.gravity.y) : 1;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }

  destroy(): void {
    this.clearShapes();
    if (this.renderer?.domElement && this.clickHandler) {
      this.renderer.domElement.removeEventListener("click", this.clickHandler);
      this.clickHandler = undefined;
    }
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = undefined;
    }
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      const canvas = this.renderer.domElement;
      canvas.parentElement?.removeChild(canvas);
      this.renderer.dispose();
    }
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
    this.animationRunning = false;
  }

  private randColor(): number {
    const colors = [0xff0000,0x00ff00,0x0000ff,0xffff00,0xff00ff,0x00ffff,0xff6600,0xff0099];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
