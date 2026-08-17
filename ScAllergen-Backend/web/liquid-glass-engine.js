/**
 * NutriViet ScAllergen / Sadie's Link - Subtle Ambient 3D WebGL Background Engine
 * Renders high-performance 3D ambient floating glass shapes strictly in background (z-index: -1).
 */

class Pure3DEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.mouse = { x: 0, y: 0, rawX: window.innerWidth / 2, rawY: window.innerHeight / 2 };
    this.targetMouse = { x: 0, y: 0 };
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.lastTime = performance.now();
    this.impulse = 0;

    this.cubes = [];
    this.particles = [];

    this.initCanvas();
    this.init3DObjects();
    this.bindEvents();
    
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pure3dCanvas';
    this.canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: -1;
    `;
    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * Math.min(window.devicePixelRatio, 2);
    this.canvas.height = this.height * Math.min(window.devicePixelRatio, 2);
    if (this.ctx) {
      this.ctx.scale(Math.min(window.devicePixelRatio, 2), Math.min(window.devicePixelRatio, 2));
    }
  }

  init3DObjects() {
    // Generate 10 subtle background 3D Cubes
    this.cubes = [];
    for (let i = 0; i < 10; i++) {
      this.cubes.push({
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.5) * 700,
        z: Math.random() * 300 - 100,
        size: 25 + Math.random() * 30,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.3,
        rotSpeedX: (Math.random() - 0.5) * 0.015,
        rotSpeedY: (Math.random() - 0.5) * 0.015,
        scale: 1
      });
    }

    // Generate 180 subtle 3D background particles
    this.particles = [];
    for (let i = 0; i < 180; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * 600 - 300,
        size: 1.2 + Math.random() * 2.0,
        alpha: 0.2 + Math.random() * 0.4
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('mousemove', (e) => {
      this.mouse.rawX = e.clientX;
      this.mouse.rawY = e.clientY;
      this.mouse.x = e.clientX - this.width / 2;
      this.mouse.y = e.clientY - this.height / 2;
      this.targetMouse.x = (e.clientX / this.width - 0.5) * 1.5;
      this.targetMouse.y = (e.clientY / this.height - 0.5) * 1.5;
    });

    window.addEventListener('scroll', () => {
      this.targetScrollY = window.scrollY;
    }, { passive: true });
  }

  project3D(x, y, z, fov = 500) {
    const scale = fov / (fov + z);
    return {
      x: this.width / 2 + x * scale,
      y: this.height / 2 + y * scale,
      scale: scale
    };
  }

  getCubeVertices(size) {
    const s = size / 2;
    return [
      { x: -s, y: -s, z: -s },
      { x: s, y: -s, z: -s },
      { x: s, y: s, z: -s },
      { x: -s, y: s, z: -s },
      { x: -s, y: -s, z: s },
      { x: s, y: -s, z: s },
      { x: s, y: s, z: s },
      { x: -s, y: s, z: s }
    ];
  }

  rotate3D(v, rx, ry, rz) {
    let y1 = v.y * Math.cos(rx) - v.z * Math.sin(rx);
    let z1 = v.y * Math.sin(rx) + v.z * Math.cos(rx);
    let x1 = v.x;

    let x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
    let z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
    let y2 = y1;

    let x3 = x2 * Math.cos(rz) - y2 * Math.sin(rz);
    let y3 = x2 * Math.sin(rz) + y2 * Math.cos(rz);
    let z3 = z2;

    return { x: x3, y: y3, z: z3 };
  }

  animate(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.scrollY += (this.targetScrollY - this.scrollY) * 0.1;

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Render 3D Background Particles
      this.ctx.fillStyle = '#00f2fe';
      this.particles.forEach(p => {
        p.z -= 0.2;
        if (p.z < -300) p.z = 300;

        const proj = this.project3D(p.x + this.targetMouse.x * 30, p.y + this.targetMouse.y * 30 - this.scrollY * 0.2, p.z);
        if (proj.x >= 0 && proj.x <= this.width && proj.y >= 0 && proj.y <= this.height) {
          this.ctx.globalAlpha = p.alpha * Math.min(proj.scale, 0.6);
          this.ctx.beginPath();
          this.ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
      this.ctx.globalAlpha = 1.0;

      // 2. Render 3D Background Glass Cubes (Subtle & Elegant)
      const cubeEdges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      this.cubes.forEach((cube, idx) => {
        cube.rotX += cube.rotSpeedX;
        cube.rotY += cube.rotSpeedY;

        const rawVerts = this.getCubeVertices(cube.size);
        const transformedVerts = rawVerts.map(v => {
          const r = this.rotate3D(v, cube.rotX, cube.rotY, cube.rotZ);
          return this.project3D(
            cube.x + r.x + this.targetMouse.x * 40,
            cube.y + r.y + this.targetMouse.y * 40 - this.scrollY * 0.25,
            cube.z + r.z
          );
        });

        // Draw Subtle 3D Wireframe Edges
        this.ctx.lineWidth = 0.9;
        this.ctx.strokeStyle = (idx % 2 === 0) ? 'rgba(0, 242, 254, 0.25)' : 'rgba(157, 78, 221, 0.25)';

        this.ctx.beginPath();
        cubeEdges.forEach(edge => {
          const p1 = transformedVerts[edge[0]];
          const p2 = transformedVerts[edge[1]];
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
        });
        this.ctx.stroke();

        // Subtle Glass Surface Fill
        this.ctx.fillStyle = 'rgba(0, 242, 254, 0.02)';
        this.ctx.beginPath();
        this.ctx.moveTo(transformedVerts[4].x, transformedVerts[4].y);
        this.ctx.lineTo(transformedVerts[5].x, transformedVerts[5].y);
        this.ctx.lineTo(transformedVerts[6].x, transformedVerts[6].y);
        this.ctx.lineTo(transformedVerts[7].x, transformedVerts[7].y);
        this.ctx.closePath();
        this.ctx.fill();
      });
    }

    requestAnimationFrame(this.animate);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pure3DEngine = new Pure3DEngine();
});
