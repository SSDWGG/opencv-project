export function createHairRenderer(styles) {
  let threeRenderer;
  const modelCache = new Map();
  let loadPromise;

  return {
    loadAssets() {
      if (!loadPromise) {
        loadPromise = loadThreeModules().then(async ({ THREE, GLTFLoader }) => {
          threeRenderer = createThreeHairRenderer(THREE);
          const loader = new GLTFLoader();
          await Promise.all(
            styles.map(async (style) => {
              const model = await loadGlbModel(loader, style, THREE);
              modelCache.set(style.id, model);
            })
          );
        });
      }
      return loadPromise;
    },

    draw(context, pose, style, options) {
      if (!threeRenderer) return;
      const model = modelCache.get(style.id);
      if (!model) return;

      threeRenderer.draw(context, pose, style, model, options);
    }
  };
}

async function loadThreeModules() {
  const [THREE, { GLTFLoader }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js')
  ]);

  return { THREE, GLTFLoader };
}

function createThreeHairRenderer(THREE) {
  const overlayCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas: overlayCanvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance'
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1000, 1000);
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  const rimLight = new THREE.DirectionalLight(0xffd4aa, 1.2);
  const modelRoot = new THREE.Group();

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);
  keyLight.position.set(-1.8, -2.4, 5);
  rimLight.position.set(2.8, -0.8, 3.2);
  scene.add(ambientLight, keyLight, rimLight, modelRoot);

  let activeModel = null;
  let renderWidth = 0;
  let renderHeight = 0;

  return {
    draw(context, pose, style, model, options) {
      resizeRenderer(renderer, camera, context.canvas, renderWidth, renderHeight);
      renderWidth = context.canvas.width;
      renderHeight = context.canvas.height;

      if (activeModel !== model) {
        modelRoot.clear();
        modelRoot.add(model);
        activeModel = model;
      }

      applyMaterialColors(THREE, model, style, options.color);
      positionModel(modelRoot, pose, options.depthEnabled);
      renderer.clear();
      renderer.render(scene, camera);
      context.save();
      context.globalAlpha = options.opacity * options.fade;
      context.drawImage(renderer.domElement, 0, 0, context.canvas.width, context.canvas.height);
      context.restore();
    }
  };
}

async function loadGlbModel(loader, style, THREE) {
  const gltf = await loader.loadAsync(style.glbUrl);
  const model = gltf.scene;
  model.name = style.id;
  model.traverse((object) => {
    object.frustumCulled = false;

    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.side = THREE.DoubleSide;
      material.depthWrite = true;
      material.needsUpdate = true;
    }
  });
  return model;
}

function resizeRenderer(renderer, camera, canvas, previousWidth, previousHeight) {
  if (canvas.width === previousWidth && canvas.height === previousHeight) return;

  renderer.setSize(canvas.width, canvas.height, false);
  camera.left = 0;
  camera.right = canvas.width;
  camera.top = 0;
  camera.bottom = canvas.height;
  camera.updateProjectionMatrix();
}

function positionModel(modelRoot, pose, depthEnabled) {
  const yaw = depthEnabled ? pose.yaw ?? 0 : 0;

  modelRoot.position.set(pose.centerX, pose.foreheadY, 0);
  modelRoot.rotation.set(0, -yaw * 0.72, pose.angle);
  modelRoot.scale.set(pose.faceWidth, pose.faceWidth, pose.faceWidth);
}

function applyMaterialColors(THREE, model, style, selectedColor) {
  const colorKey = `${style.id}:${selectedColor}`;
  if (model.userData.colorKey === colorKey) return;

  const colorRamp = createMaterialRamp(THREE, style, selectedColor);
  model.traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const materialName = material.name || '';
      if (materialName.includes('highlight')) {
        material.color.copy(colorRamp.highlight);
        material.roughness = 0.45;
      } else if (materialName.includes('cap')) {
        material.color.copy(colorRamp.cap);
        material.roughness = 0.74;
      } else {
        material.color.copy(colorRamp.base);
        material.roughness = 0.6;
      }
      material.metalness = 0;
      material.needsUpdate = true;
    }
  });
  model.userData.colorKey = colorKey;
}

function createMaterialRamp(THREE, style, selectedColor) {
  const selected = new THREE.Color(selectedColor);
  const cap = new THREE.Color(style.material.base).lerp(selected, 0.26);
  const base = new THREE.Color(style.material.base).lerp(selected, 0.36);
  const highlight = new THREE.Color(style.material.highlight).lerp(selected, 0.18);

  return { cap, base, highlight };
}
