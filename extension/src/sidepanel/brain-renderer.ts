import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Region color map — each region lights up in its own color
const REGION_COLORS: Record<string, THREE.Color> = {
  visual_processing:    new THREE.Color(0x4fc3f7),
  face_recognition:     new THREE.Color(0xba68c8),
  scene_processing:     new THREE.Color(0x81c784),
  social_cognition:     new THREE.Color(0xff8a65),
  reward_motivation:    new THREE.Color(0xffd54f),
  language_semantic:    new THREE.Color(0x90caf9),
  attention:            new THREE.Color(0xef5350),
  memory:               new THREE.Color(0xffab40),
  emotional_regulation: new THREE.Color(0xf48fb1),
  body_motion:          new THREE.Color(0x80cbc4),
};

const COLOR_DARK = new THREE.Color(0x0a0a14);

// Approximate 3D positions for each brain region (for camera focusing)
const REGION_POSITIONS: Record<string, THREE.Vector3> = {
  visual_processing:    new THREE.Vector3(0, -20, -45),
  scene_processing:     new THREE.Vector3(0, 5, -40),
  attention:            new THREE.Vector3(0, 25, 40),
  emotional_regulation: new THREE.Vector3(0, -15, 40),
  reward_motivation:    new THREE.Vector3(0, 5, 42),
  face_recognition:     new THREE.Vector3(22, -22, 5),
  language_semantic:    new THREE.Vector3(-22, -22, 5),
  memory:               new THREE.Vector3(0, -22, -10),
  social_cognition:     new THREE.Vector3(-5, 22, 5),
  body_motion:          new THREE.Vector3(22, 22, 5),
};

// Map category display labels → internal region keys
export const LABEL_TO_REGION_KEY: Record<string, string> = {
  'Visual Processing': 'visual_processing',
  'Face Recognition': 'face_recognition',
  'Scene & Place Processing': 'scene_processing',
  'Social & Emotional Processing': 'social_cognition',
  'Reward & Motivation': 'reward_motivation',
  'Language & Semantics': 'language_semantic',
  'Attention & Spatial Awareness': 'attention',
  'Memory Encoding': 'memory',
  'Emotional Regulation': 'emotional_regulation',
  'Body & Motion Processing': 'body_motion',
};

export class BrainRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  // Per-mesh data from the GLB
  private meshes: THREE.Mesh[] = [];
  private meshRegions: string[][] = [];    // region key per vertex, per mesh
  private meshVertexCounts: number[] = [];
  private currentActs: Float32Array[] = [];
  private targetActs: Float32Array[] = [];
  private transitionProgress = 1.0;
  private modelLoaded = false;

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Highlight mode
  private highlightActive = false;
  private highlightedRegions: Set<string> = new Set();
  private highlightColor = new THREE.Color(0xffffff);
  private savedTargetActs: Float32Array[] = [];

  // Camera animation
  private cameraTargetPos: THREE.Vector3 | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    const w = container.clientWidth || 400;
    const h = container.clientHeight || 300;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    this.camera.position.set(0, 40, 200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.6;

    this.setupLighting();
    this.handleResize();
    this.animate();
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0x404060, 0.8));

    const dir1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dir1.position.set(150, 150, 150);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x6666cc, 0.4);
    dir2.position.set(-150, -80, -150);
    this.scene.add(dir2);

    const rim = new THREE.DirectionalLight(0xff6f00, 0.2);
    rim.position.set(0, -100, -200);
    this.scene.add(rim);

    // Fill light from below to illuminate underside
    const bottom = new THREE.DirectionalLight(0xffffff, 0.6);
    bottom.position.set(0, -200, 0);
    this.scene.add(bottom);
  }

  private handleResize(): void {
    const observer = new ResizeObserver(() => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    observer.observe(this.container);
  }

  /**
   * Load the bundled GLB brain model and set up per-vertex region mapping.
   */
  async loadModel(glbUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        glbUrl,
        (gltf) => {
          const model = gltf.scene;

          // Center and scale
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 120 / maxDim;

          model.position.sub(center).multiplyScalar(scale);
          model.scale.setScalar(scale);

          // Process each mesh in the model
          model.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;
            const mesh = child as THREE.Mesh;
            const geo = mesh.geometry;
            const vCount = geo.attributes.position.count;

            // Create vertex color attribute
            const colors = new Float32Array(vCount * 3);
            for (let i = 0; i < vCount * 3; i++) colors[i] = 0.04;
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            // Replace material with vertex-colored one
            mesh.material = new THREE.MeshPhongMaterial({
              vertexColors: true,
              shininess: 40,
              specular: new THREE.Color(0x333333),
              transparent: true,
              opacity: 0.95,
            });

            // Assign brain regions by vertex position
            const posAttr = geo.attributes.position;
            const regions: string[] = new Array(vCount);
            const worldPos = new THREE.Vector3();

            for (let i = 0; i < vCount; i++) {
              worldPos.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
              worldPos.applyMatrix4(mesh.matrixWorld);
              worldPos.multiplyScalar(scale);
              regions[i] = this.assignRegion(worldPos.x, worldPos.y, worldPos.z);
            }

            this.meshes.push(mesh);
            this.meshRegions.push(regions);
            this.meshVertexCounts.push(vCount);
            this.currentActs.push(new Float32Array(vCount).fill(0));
            this.targetActs.push(new Float32Array(vCount).fill(0));
          });

          this.scene.add(model);
          this.controls.target.set(0, 0, 0);
          this.camera.position.set(0, 40, 200);
          this.modelLoaded = true;

          console.log(
            `[KnowMe] Brain model loaded: ${this.meshes.length} meshes, ` +
            `${this.meshVertexCounts.reduce((a, b) => a + b, 0)} vertices`
          );
          resolve();
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  /**
   * Assign a brain region based on approximate neuroanatomical position.
   * Occipital (back) = visual, Temporal (sides/lower) = language/memory,
   * Frontal (front) = attention/reward, Parietal (top) = social/body.
   */
  private assignRegion(x: number, y: number, z: number): string {
    const nx = x / 60;
    const ny = y / 60;
    const nz = z / 60;

    // Occipital (back)
    if (nz < -0.5) {
      return ny < -0.2 ? 'visual_processing' : 'scene_processing';
    }
    // Frontal (front)
    if (nz > 0.5) {
      if (ny > 0.3) return 'attention';
      if (ny < -0.2) return 'emotional_regulation';
      return 'reward_motivation';
    }
    // Temporal (sides, lower)
    if (ny < -0.3) {
      if (nx > 0.3) return 'face_recognition';
      if (nx < -0.3) return 'language_semantic';
      return 'memory';
    }
    // Parietal (top)
    if (ny > 0.3) {
      return Math.abs(nx) > 0.3 ? 'body_motion' : 'social_cognition';
    }
    // Central
    if (nx > 0.2) return 'face_recognition';
    if (nx < -0.2) return 'social_cognition';
    return 'visual_processing';
  }

  /**
   * Update brain activations from TRIBE v2 analysis results.
   * Accepts engagement_scores keyed by category label — maps to region keys.
   */
  updateFromEngagement(engagementScores: Record<string, number>): void {
    this.highlightActive = false;
    this.highlightedRegions.clear();

    const scores: Record<string, number> = {};
    for (const [label, value] of Object.entries(engagementScores)) {
      const key = LABEL_TO_REGION_KEY[label];
      if (key) scores[key] = value;
    }

    for (let m = 0; m < this.meshes.length; m++) {
      const count = this.meshVertexCounts[m];
      const regions = this.meshRegions[m];
      for (let i = 0; i < count; i++) {
        const base = scores[regions[i]] || 0;
        const variation = (Math.random() - 0.5) * 0.12;
        this.targetActs[m][i] = Math.max(0, Math.min(1, base + variation));
      }
    }
    this.transitionProgress = 0;
    this.controls.autoRotate = false;
  }

  /**
   * Update brain activations from raw per-vertex data (from TRIBE v2 server).
   * Falls back to this when the server provides full vertex maps.
   */
  updateActivations(vertexActivations: number[]): void {
    // Distribute across meshes sequentially
    let offset = 0;
    for (let m = 0; m < this.meshes.length; m++) {
      const count = this.meshVertexCounts[m];
      for (let i = 0; i < count && offset + i < vertexActivations.length; i++) {
        this.targetActs[m][i] = vertexActivations[offset + i];
      }
      offset += count;
    }
    this.transitionProgress = 0;
    this.controls.autoRotate = false;
  }

  resetActivations(): void {
    for (let m = 0; m < this.meshes.length; m++) {
      this.targetActs[m].fill(0);
    }
    this.transitionProgress = 0;
    this.controls.autoRotate = true;
  }

  /**
   * Highlight specific brain regions with a given color.
   * Non-highlighted regions are dimmed to near-black.
   */
  highlightCategory(regionKeys: string[], colorHex: number): void {
    this.savedTargetActs = this.currentActs.map(a => new Float32Array(a));
    this.highlightActive = true;
    this.highlightedRegions = new Set(regionKeys);
    this.highlightColor.setHex(colorHex);

    for (let m = 0; m < this.meshes.length; m++) {
      const count = this.meshVertexCounts[m];
      const regions = this.meshRegions[m];
      for (let i = 0; i < count; i++) {
        this.targetActs[m][i] = this.highlightedRegions.has(regions[i]) ? 0.85 : 0.03;
      }
    }
    this.transitionProgress = 0;
    this.controls.autoRotate = false;
  }

  /**
   * Clear highlight and restore normal activation coloring.
   */
  clearHighlight(): void {
    if (!this.highlightActive) return;
    this.highlightActive = false;
    this.highlightedRegions.clear();

    for (let m = 0; m < this.meshes.length; m++) {
      if (this.savedTargetActs[m]) {
        this.targetActs[m].set(this.savedTargetActs[m]);
      }
    }
    this.savedTargetActs = [];
    this.transitionProgress = 0;
  }

  /**
   * Smoothly rotate camera to focus on a brain region.
   */
  focusOnRegion(regionKey: string): void {
    const pos = REGION_POSITIONS[regionKey];
    if (!pos) return;
    this.cameraTargetPos = pos.clone().normalize().multiplyScalar(200);
    this.controls.autoRotate = false;
  }

  setupHoverDetection(
    tooltipEl: HTMLElement,
    onHover?: (regionName: string, activation: number) => void
  ): void {
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (!this.modelLoaded) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.meshes);

      if (hits.length > 0 && hits[0].face) {
        const mesh = hits[0].object;
        const meshIdx = this.meshes.indexOf(mesh as THREE.Mesh);
        if (meshIdx >= 0) {
          const vi = hits[0].face.a;
          const regionKey = this.meshRegions[meshIdx][vi];
          const act = this.currentActs[meshIdx][vi];
          const label = REGION_LABELS[regionKey] || regionKey;

          tooltipEl.textContent = `${label}: ${Math.round(act * 100)}%`;
          tooltipEl.style.left = `${event.clientX + 12}px`;
          tooltipEl.style.top = `${event.clientY - 24}px`;
          tooltipEl.classList.remove('hidden');

          onHover?.(regionKey, act);
          return;
        }
      }
      tooltipEl.classList.add('hidden');
    });

    this.renderer.domElement.addEventListener('mouseleave', () => {
      tooltipEl.classList.add('hidden');
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + 0.012);
      const t = this.easeInOutCubic(this.transitionProgress);

      for (let m = 0; m < this.meshes.length; m++) {
        const colArr = this.meshes[m].geometry.attributes.color.array as Float32Array;
        const count = this.meshVertexCounts[m];
        const regions = this.meshRegions[m];

        for (let i = 0; i < count; i++) {
          const val = this.currentActs[m][i] + (this.targetActs[m][i] - this.currentActs[m][i]) * t;
          this.activationToColor(val, regions[i], tmpColor);
          colArr[i * 3] = tmpColor.r;
          colArr[i * 3 + 1] = tmpColor.g;
          colArr[i * 3 + 2] = tmpColor.b;
        }

        this.meshes[m].geometry.attributes.color.needsUpdate = true;
      }

      if (this.transitionProgress >= 1.0) {
        for (let m = 0; m < this.meshes.length; m++) {
          this.currentActs[m].set(this.targetActs[m]);
        }
      }
    }

    // Smooth camera focus animation
    if (this.cameraTargetPos) {
      this.camera.position.lerp(this.cameraTargetPos, 0.04);
      if (this.camera.position.distanceTo(this.cameraTargetPos) < 1) {
        this.cameraTargetPos = null;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private activationToColor(value: number, regionKey: string, out: THREE.Color): void {
    const regionCol = REGION_COLORS[regionKey] || REGION_COLORS.visual_processing;

    if (this.highlightActive) {
      if (this.highlightedRegions.has(regionKey)) {
        // Highlighted: bright and vivid
        const t = 0.5 + Math.min(value / 0.85, 1) * 0.5;
        out.lerpColors(COLOR_DARK, this.highlightColor, t);
      } else {
        // Non-highlighted: very dim tint of their own color (not grey)
        out.lerpColors(COLOR_DARK, regionCol, 0.12);
      }
      return;
    }

    // Normal mode — floor of 0.3 so every region always shows its color
    const effective = 0.3 + value * 0.7;
    if (effective < 0.7) {
      out.lerpColors(COLOR_DARK, regionCol, effective / 0.7);
    } else {
      const t = (effective - 0.7) / 0.3;
      out.copy(regionCol).lerp(new THREE.Color(0xffffff), t * 0.4);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// Reusable temp color (outside class to avoid allocation per frame)
const tmpColor = new THREE.Color();

const REGION_LABELS: Record<string, string> = {
  visual_processing: 'Visual Processing',
  face_recognition: 'Face Recognition',
  scene_processing: 'Scene & Place Processing',
  social_cognition: 'Social & Emotional',
  reward_motivation: 'Reward & Motivation',
  language_semantic: 'Language & Semantics',
  attention: 'Attention',
  memory: 'Memory Encoding',
  emotional_regulation: 'Emotional Regulation',
  body_motion: 'Body & Motion',
};
