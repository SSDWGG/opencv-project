import * as THREE from 'three';

const TWO_PI = Math.PI * 2;
const EFFECT_NAMES = {
  1: '光柱升起',
  2: '双星弧线',
  3: '三角旋涡',
  4: '方阵脉冲',
  5: '五芒星绽放',
  6: '六边光环',
  7: '闪电裂变',
  8: '无限轨迹',
  9: '螺旋星云',
  10: '满屏烟花',
};

export class GestureEffects {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera();
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.effects = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'gesture-effect-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.renderer.setAnimationLoop(this.render);
  }

  trigger(number, sourcePosition) {
    if (!EFFECT_NAMES[number]) {
      return;
    }

    const origin = this.toWorldPosition(sourcePosition);
    this.showLabel(number, origin);

    if (number === 10) {
      this.createFireworks(origin);
      return;
    }

    const effectFactories = {
      1: () => this.createBeam(origin),
      2: () => this.createTwinComets(origin),
      3: () => this.createTriangleSwirl(origin),
      4: () => this.createSquarePulse(origin),
      5: () => this.createStarBloom(origin),
      6: () => this.createHexRings(origin),
      7: () => this.createLightning(origin),
      8: () => this.createInfinityTrail(origin),
      9: () => this.createSpiralNebula(origin),
    };

    this.addEffect(effectFactories[number]());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.near = -1000;
    this.camera.far = 1000;
    this.camera.position.z = 10;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render() {
    const now = performance.now();
    this.effects = this.effects.filter((effect) => {
      const alive = effect.update(now);

      if (!alive) {
        effect.dispose();
      }

      return alive;
    });
    this.renderer.render(this.scene, this.camera);
  }

  addEffect(effect) {
    if (!effect) {
      return;
    }

    while (this.effects.length > 18) {
      this.effects.shift().dispose();
    }

    this.effects.push(effect);
  }

  toWorldPosition(sourcePosition) {
    const screenPosition = sourcePosition ?? {
      x: this.width / 2,
      y: this.height * 0.46,
    };

    return {
      x: clamp(screenPosition.x, 0, this.width) - this.width / 2,
      y: this.height / 2 - clamp(screenPosition.y, 0, this.height),
      z: 0,
    };
  }

  toScreenPosition(worldPosition) {
    return {
      x: worldPosition.x + this.width / 2,
      y: this.height / 2 - worldPosition.y,
    };
  }

  showLabel(number, origin) {
    const label = document.createElement('div');
    const screenPosition = this.toScreenPosition(origin);
    label.className = `gesture-effect-label gesture-effect-label--${number}`;
    label.textContent = `数字 ${number} · ${EFFECT_NAMES[number]}`;
    label.style.left = `${screenPosition.x}px`;
    label.style.top = `${screenPosition.y}px`;
    this.container.appendChild(label);
    window.setTimeout(() => label.remove(), 1400);
  }

  createBeam(origin) {
    return this.createParticleEffect({
      count: 120,
      duration: 950,
      size: 7,
      palette: ['#67e8f9', '#a7f3d0', '#e0f2fe'],
      initializer: () => ({
        baseX: randomBetween(-22, 22),
        baseY: randomBetween(-22, 18),
        depth: randomBetween(-20, 20),
        phase: randomBetween(0, TWO_PI),
        speed: randomBetween(180, 360),
      }),
      updater: ({ particle, progress, positions, offset }) => {
        const eased = easeOutCubic(progress);
        positions[offset] =
          origin.x +
          particle.baseX * (1 - eased) +
          Math.sin(progress * 9 + particle.phase) * 16;
        positions[offset + 1] = origin.y + particle.baseY + eased * particle.speed;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createTwinComets(origin) {
    return this.createParticleEffect({
      count: 150,
      duration: 1050,
      size: 7,
      palette: ['#38bdf8', '#c084fc', '#f0abfc'],
      initializer: (particleIndex) => ({
        side: particleIndex % 2 === 0 ? -1 : 1,
        spread: randomBetween(60, 310),
        height: randomBetween(80, 210),
        trail: randomBetween(0, 0.22),
        wobble: randomBetween(-18, 18),
        depth: randomBetween(-25, 25),
      }),
      updater: ({ particle, progress, positions, offset }) => {
        const delayedProgress = clamp(progress - particle.trail, 0, 1);
        const eased = easeOutCubic(delayedProgress);
        positions[offset] =
          origin.x + particle.side * (28 + particle.spread * eased) + particle.wobble;
        positions[offset + 1] =
          origin.y + Math.sin(eased * Math.PI) * particle.height - progress * 42;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createTriangleSwirl(origin) {
    return this.createParticleEffect({
      count: 156,
      duration: 1100,
      size: 6,
      palette: ['#f97316', '#facc15', '#fb7185'],
      initializer: (particleIndex, count) => ({
        baseAngle: ((particleIndex % 3) / 3) * TWO_PI + randomBetween(-0.12, 0.12),
        radius: randomBetween(42, 230),
        order: particleIndex / count,
        depth: randomBetween(-15, 20),
      }),
      updater: ({ particle, progress, positions, offset }) => {
        const eased = easeOutCubic(progress);
        const angle = particle.baseAngle + eased * 3.8 + particle.order * 0.8;
        const radius = particle.radius * eased;
        positions[offset] = origin.x + Math.cos(angle) * radius;
        positions[offset + 1] = origin.y + Math.sin(angle) * radius;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createSquarePulse(origin) {
    return this.createParticleEffect({
      count: 160,
      duration: 1000,
      size: 6,
      palette: ['#22c55e', '#86efac', '#14b8a6'],
      initializer: (particleIndex, count) => {
        const perimeterProgress = particleIndex / count;
        const edgeProgress = (perimeterProgress * 4) % 1;
        const side = Math.floor(perimeterProgress * 4);
        const squareSize = randomBetween(135, 250);
        const halfSquare = squareSize / 2;
        const target = getSquareTarget(side, edgeProgress, halfSquare);

        return {
          targetX: target.x,
          targetY: target.y,
          depth: randomBetween(-20, 20),
          pulse: randomBetween(0.9, 1.16),
        };
      },
      updater: ({ particle, progress, positions, offset }) => {
        const eased = easeOutBack(progress);
        const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.08 * particle.pulse;
        positions[offset] = origin.x + particle.targetX * eased * pulseScale;
        positions[offset + 1] = origin.y + particle.targetY * eased * pulseScale;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createStarBloom(origin) {
    return this.createParticleEffect({
      count: 180,
      duration: 1150,
      size: 7,
      palette: ['#fde047', '#fb923c', '#f43f5e', '#fff7ed'],
      initializer: (particleIndex) => {
        const starPoint = particleIndex % 5;
        const innerPoint = particleIndex % 2 === 0 ? 1 : 0.48;

        return {
          angle: (starPoint / 5) * TWO_PI - Math.PI / 2 + randomBetween(-0.22, 0.22),
          radius: randomBetween(120, 285) * innerPoint,
          depth: randomBetween(-25, 25),
          spin: randomBetween(-0.55, 0.55),
        };
      },
      updater: ({ particle, progress, positions, offset }) => {
        const eased = easeOutCubic(progress);
        const angle = particle.angle + particle.spin * progress;
        positions[offset] = origin.x + Math.cos(angle) * particle.radius * eased;
        positions[offset + 1] = origin.y + Math.sin(angle) * particle.radius * eased;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createHexRings(origin) {
    return this.createParticleEffect({
      count: 180,
      duration: 1100,
      size: 6,
      palette: ['#34d399', '#5eead4', '#93c5fd'],
      initializer: (particleIndex, count) => ({
        ring: particleIndex % 3,
        angle: (particleIndex / count) * TWO_PI * 6,
        depth: randomBetween(-20, 18),
        jitter: randomBetween(-10, 10),
      }),
      updater: ({ particle, progress, positions, offset }) => {
        const eased = easeOutCubic(progress);
        const ringRadius = (85 + particle.ring * 62) * eased;
        const snappedAngle =
          Math.round((particle.angle + progress * 1.7) / (Math.PI / 3)) *
          (Math.PI / 3);
        const mixedAngle = particle.angle * 0.28 + snappedAngle * 0.72;
        positions[offset] = origin.x + Math.cos(mixedAngle) * (ringRadius + particle.jitter);
        positions[offset + 1] =
          origin.y + Math.sin(mixedAngle) * (ringRadius + particle.jitter);
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createLightning(origin) {
    return this.createParticleEffect({
      count: 170,
      duration: 850,
      size: 7,
      palette: ['#fef08a', '#facc15', '#38bdf8', '#ffffff'],
      initializer: (particleIndex, count) => {
        const isSpark = particleIndex > count * 0.46;
        const segment = isSpark ? randomBetween(0, 1) : particleIndex / (count * 0.46);
        const sparkAngle = randomBetween(0, TWO_PI);

        return {
          isSpark,
          segment,
          sparkAngle,
          sparkSpeed: randomBetween(85, 280),
          boltOffset: randomBetween(-28, 28),
          depth: randomBetween(-20, 20),
        };
      },
      updater: ({ particle, progress, positions, offset }) => {
        if (particle.isSpark) {
          const eased = easeOutCubic(progress);
          positions[offset] =
            origin.x + Math.cos(particle.sparkAngle) * particle.sparkSpeed * eased;
          positions[offset + 1] =
            origin.y + Math.sin(particle.sparkAngle) * particle.sparkSpeed * eased;
          positions[offset + 2] = particle.depth;
          return;
        }

        const boltWave = Math.sin(particle.segment * 34 + progress * 18) * 42;
        positions[offset] = origin.x + boltWave + particle.boltOffset;
        positions[offset + 1] = origin.y + 240 - particle.segment * 480;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createInfinityTrail(origin) {
    return this.createParticleEffect({
      count: 190,
      duration: 1200,
      size: 6,
      palette: ['#818cf8', '#c084fc', '#f0abfc', '#67e8f9'],
      initializer: (particleIndex, count) => ({
        angle: (particleIndex / count) * TWO_PI,
        scale: randomBetween(120, 230),
        depth: randomBetween(-20, 20),
        delay: randomBetween(0, 0.18),
      }),
      updater: ({ particle, progress, positions, offset }) => {
        const delayedProgress = clamp(progress - particle.delay, 0, 1);
        const angle = particle.angle + delayedProgress * TWO_PI * 1.25;
        const scale = particle.scale * easeOutCubic(delayedProgress);
        positions[offset] = origin.x + Math.sin(angle) * scale;
        positions[offset + 1] =
          origin.y + Math.sin(angle) * Math.cos(angle) * scale * 0.7;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createSpiralNebula(origin) {
    return this.createParticleEffect({
      count: 210,
      duration: 1250,
      size: 6,
      palette: ['#38bdf8', '#2563eb', '#a855f7', '#f472b6'],
      initializer: () => ({
        angle: randomBetween(0, TWO_PI),
        radius: randomBetween(25, 290),
        spin: randomBetween(4.2, 8.4),
        depth: randomBetween(-24, 22),
      }),
      updater: ({ particle, progress, positions, offset }) => {
        const eased = easeOutCubic(progress);
        const angle = particle.angle + particle.spin * eased;
        const radius = particle.radius * eased;
        positions[offset] = origin.x + Math.cos(angle) * radius;
        positions[offset + 1] = origin.y + Math.sin(angle) * radius;
        positions[offset + 2] = particle.depth;
      },
    });
  }

  createFireworks(origin) {
    const burstOrigins = [
      origin,
      this.randomWorldPosition(0.22, 0.34),
      this.randomWorldPosition(0.72, 0.28),
      this.randomWorldPosition(0.36, 0.58),
      this.randomWorldPosition(0.68, 0.62),
    ];

    burstOrigins.forEach((burstOrigin, burstIndex) => {
      window.setTimeout(() => {
        this.addEffect(this.createFireworkBurst(burstOrigin, burstIndex));
      }, burstIndex * 180);
    });
  }

  createFireworkBurst(origin, burstIndex) {
    const palettes = [
      ['#fef08a', '#fb7185', '#f97316', '#ffffff'],
      ['#67e8f9', '#60a5fa', '#c084fc', '#ffffff'],
      ['#86efac', '#22c55e', '#facc15', '#ffffff'],
      ['#f0abfc', '#e879f9', '#fb7185', '#ffffff'],
    ];

    return this.createParticleEffect({
      count: 220,
      duration: 1750,
      size: 7,
      palette: palettes[burstIndex % palettes.length],
      initializer: () => {
        const angle = randomBetween(0, TWO_PI);
        const speed = randomBetween(130, 430);

        return {
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          depth: randomBetween(-30, 30),
          shimmer: randomBetween(0.75, 1.25),
        };
      },
      opacity: (progress) =>
        Math.max(0, 1 - progress) * (0.75 + Math.sin(progress * 40) * 0.25),
      updater: ({ particle, elapsedSeconds, positions, offset }) => {
        positions[offset] = origin.x + particle.velocityX * elapsedSeconds;
        positions[offset + 1] =
          origin.y +
          particle.velocityY * elapsedSeconds -
          210 * elapsedSeconds * elapsedSeconds;
        positions[offset + 2] = particle.depth * particle.shimmer;
      },
    });
  }

  randomWorldPosition(widthRatio, heightRatio) {
    const screenX = this.width * clamp(widthRatio + randomBetween(-0.09, 0.09), 0.12, 0.88);
    const screenY = this.height * clamp(heightRatio + randomBetween(-0.08, 0.08), 0.16, 0.76);
    return this.toWorldPosition({ x: screenX, y: screenY });
  }

  createParticleEffect({
    count,
    duration,
    size,
    palette,
    initializer,
    updater,
    opacity = (progress) => 1 - progress * progress,
  }) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vertexColors = new Float32Array(count * 3);
    const particles = [];
    const startTime = performance.now();

    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const particle = initializer(particleIndex, count);
      const color = new THREE.Color(palette[particleIndex % palette.length]);
      const offset = particleIndex * 3;
      particles.push(particle);
      positions[offset] = 0;
      positions[offset + 1] = 0;
      positions[offset + 2] = 0;
      vertexColors[offset] = color.r;
      vertexColors[offset + 1] = color.g;
      vertexColors[offset + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
    });
    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    return {
      update: (now) => {
        const elapsed = now - startTime;
        const progress = clamp(elapsed / duration, 0, 1);
        const elapsedSeconds = elapsed / 1000;

        particles.forEach((particle, particleIndex) => {
          updater({
            particle,
            particleIndex,
            progress,
            elapsedSeconds,
            positions,
            offset: particleIndex * 3,
          });
        });

        material.opacity = opacity(progress);
        geometry.attributes.position.needsUpdate = true;

        return progress < 1;
      },
      dispose: () => {
        this.scene.remove(mesh);
        geometry.dispose();
        material.dispose();
      },
    };
  }
}

function getSquareTarget(side, edgeProgress, halfSquare) {
  if (side === 0) {
    return { x: -halfSquare + edgeProgress * halfSquare * 2, y: halfSquare };
  }
  if (side === 1) {
    return { x: halfSquare, y: halfSquare - edgeProgress * halfSquare * 2 };
  }
  if (side === 2) {
    return { x: halfSquare - edgeProgress * halfSquare * 2, y: -halfSquare };
  }

  return { x: -halfSquare, y: -halfSquare + edgeProgress * halfSquare * 2 };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function easeOutBack(progress) {
  const overshoot = 1.70158;
  const shiftedProgress = progress - 1;
  return (
    1 +
    (overshoot + 1) * Math.pow(shiftedProgress, 3) +
    overshoot * Math.pow(shiftedProgress, 2)
  );
}
