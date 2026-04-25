import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import './styles.css';

const video = document.querySelector('#camera');
const canvas = document.querySelector('#stage');
const context = canvas.getContext('2d');
const startButton = document.querySelector('#startButton');
const statusEl = document.querySelector('#status');
const emptyState = document.querySelector('#emptyState');
const styleButtonsEl = document.querySelector('#styleButtons');
const colorInput = document.querySelector('#hairColor');
const opacityInput = document.querySelector('#opacity');
const debugToggle = document.querySelector('#debugToggle');

const TASKS_VERSION = '0.10.34';
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

const hairStyles = [
  {
    id: 'layered-waves',
    name: '空气感短卷',
    desc: '棕色真实发丝纹理，蓬松刘海和自然鬓角',
    src: '/hair/layered-waves.png',
    width: 1.54,
    anchorX: 0.5,
    anchorY: 0.56,
    offsetX: -0.02,
    offsetY: -0.01,
    matteOpacity: 0.28,
    colorMix: 0.16,
    hairlineShadow: 0.2
  },
  {
    id: 'side-swept',
    name: '侧扫层次刘海',
    desc: '高光分束明显，适合短发前额覆盖',
    src: '/hair/side-swept.png',
    width: 1.52,
    anchorX: 0.5,
    anchorY: 0.66,
    offsetX: 0.02,
    offsetY: -0.02,
    matteOpacity: 0.22,
    colorMix: 0.28,
    hairlineShadow: 0.18
  },
  {
    id: 'soft-bob',
    name: '顺直齐刘海',
    desc: '细密黑发纹理，边缘比手绘造型更真实',
    src: '/hair/soft-bob.png',
    width: 1.38,
    anchorX: 0.5,
    anchorY: 0.78,
    offsetX: 0,
    offsetY: -0.02,
    matteOpacity: 0.2,
    colorMix: 0.2,
    hairlineShadow: 0.15
  },
  {
    id: 'voluminous-curls',
    name: '长卷披肩',
    desc: '真实卷发束和透明发梢，适合长发轮廓',
    src: '/hair/voluminous-curls.png',
    width: 1.76,
    anchorX: 0.5,
    anchorY: 0.42,
    offsetX: 0.01,
    offsetY: -0.06,
    matteOpacity: 0.26,
    colorMix: 0.22,
    hairlineShadow: 0.22
  }
];

let currentStyle = hairStyles[0];
let faceLandmarker;
let running = false;
let lastVideoTime = -1;
let smoothedPose = null;
let lastPoseTime = 0;
let hairAssetsPromise;
const tintedHairCache = new Map();

styleButtonsEl.innerHTML = hairStyles
  .map(
    (style, index) => `
      <button class="style-button ${index === 0 ? 'is-active' : ''}" data-style="${style.id}">
        <span class="style-thumb">
          <img src="${style.src}" alt="" loading="lazy" />
        </span>
        <span class="style-copy">
          <strong>${style.name}</strong>
          <span>${style.desc}</span>
        </span>
      </button>
    `
  )
  .join('');

styleButtonsEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-style]');
  if (!button) return;
  const nextStyle = hairStyles.find((style) => style.id === button.dataset.style);
  if (!nextStyle) return;
  currentStyle = nextStyle;
  document.querySelectorAll('.style-button').forEach((item) => {
    item.classList.toggle('is-active', item === button);
  });
});

startButton.addEventListener('click', async () => {
  if (running) return;
  startButton.disabled = true;
  try {
    setStatus('正在加载真实发型素材...');
    await loadHairAssets();
    setStatus('正在加载人脸检测模型...');
    faceLandmarker = faceLandmarker || (await createFaceLandmarker());
    setStatus('正在请求摄像头权限...');
    await startCamera();
    running = true;
    emptyState.classList.add('is-hidden');
    startButton.textContent = '摄像头运行中';
    setStatus('检测中：请把脸放在画面中央');
    requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error(error);
    startButton.disabled = false;
    startButton.textContent = '重新开启摄像头';
    setStatus(`启动失败：${error.message || '请检查浏览器摄像头权限或素材加载状态'}`);
  }
});

async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_MODEL_URL,
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55
  });
}

function loadHairAssets() {
  if (!hairAssetsPromise) {
    hairAssetsPromise = Promise.all(hairStyles.map(loadHairStyle));
  }
  return hairAssetsPromise;
}

function loadHairStyle(style) {
  if (style.image?.complete && style.image.naturalWidth > 0) {
    return Promise.resolve(style.image);
  }

  const image = new Image();
  image.decoding = 'async';
  style.image = image;

  return new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener(
      'error',
      () => reject(new Error(`发型素材加载失败：${style.name}`)),
      { once: true }
    );
    image.src = style.src;
  });
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
}

function renderLoop(now) {
  if (!running) return;
  drawMirroredVideo();

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = faceLandmarker.detectForVideo(video, now);
    const landmarks = result.faceLandmarks?.[0];
    if (landmarks) {
      const nextPose = getHairPose(landmarks);
      smoothedPose = smoothPose(smoothedPose, nextPose);
      lastPoseTime = now;
      setStatus(`已锁定人脸：正在预览「${currentStyle.name}」`);
    }
  }

  if (smoothedPose && now - lastPoseTime < 450) {
    const fade = Math.min(1, Math.max(0, 1 - (now - lastPoseTime - 260) / 190));
    drawHair(smoothedPose, fade);
    if (debugToggle.checked) drawDebug(smoothedPose);
  } else {
    setStatus('未检测到人脸：请正脸看向摄像头');
  }

  requestAnimationFrame(renderLoop);
}

function drawMirroredVideo() {
  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.restore();
}

function getHairPose(landmarks) {
  const points = landmarks.map((point) => ({
    x: canvas.width - point.x * canvas.width,
    y: point.y * canvas.height,
    z: point.z
  }));
  const forehead = points[10];
  const chin = points[152];
  const templeA = points[127] || points[234];
  const templeB = points[356] || points[454];
  const eyeA = points[33];
  const eyeB = points[263];
  const [screenLeftEye, screenRightEye] = sortByX(eyeA, eyeB);
  const [screenLeftTemple, screenRightTemple] = sortByX(templeA, templeB);
  const faceWidth = distance(screenLeftTemple, screenRightTemple) * 1.34;
  const faceHeight = distance(forehead, chin);
  const centerX = (screenLeftTemple.x + screenRightTemple.x + forehead.x) / 3;
  const foreheadY = forehead.y + faceHeight * 0.04;
  const angle = Math.atan2(
    screenRightEye.y - screenLeftEye.y,
    screenRightEye.x - screenLeftEye.x
  );

  return {
    points,
    centerX,
    foreheadY,
    faceWidth: clamp(faceWidth, canvas.width * 0.14, canvas.width * 0.68),
    faceHeight: clamp(faceHeight, canvas.height * 0.16, canvas.height * 0.78),
    angle
  };
}

function smoothPose(previous, next) {
  if (!previous) return next;
  const alpha = 0.26;
  const angleDelta = Math.atan2(
    Math.sin(next.angle - previous.angle),
    Math.cos(next.angle - previous.angle)
  );
  return {
    points: next.points,
    centerX: lerp(previous.centerX, next.centerX, alpha),
    foreheadY: lerp(previous.foreheadY, next.foreheadY, alpha),
    faceWidth: lerp(previous.faceWidth, next.faceWidth, alpha),
    faceHeight: lerp(previous.faceHeight, next.faceHeight, alpha),
    angle: previous.angle + angleDelta * alpha
  };
}

function drawHair(pose, fade) {
  context.save();
  context.translate(pose.centerX, pose.foreheadY);
  context.rotate(pose.angle);
  context.scale(pose.faceWidth, pose.faceWidth);
  context.globalAlpha = Number(opacityInput.value) * fade;
  drawRealisticHair(context, currentStyle, colorInput.value);
  context.restore();
}

function drawRealisticHair(ctx, style, color) {
  const image = style.image;
  if (!image?.naturalWidth) return;

  const width = style.width;
  const height = width * (image.naturalHeight / image.naturalWidth);
  const x = style.offsetX - width * style.anchorX;
  const y = style.offsetY - height * style.anchorY;
  const tintedImage = getTintedHairImage(style, color);

  drawOriginalHairMatte(ctx, tintedImage, x, y, width, height, style);
  drawForeheadContactShadow(ctx, style);

  ctx.save();
  ctx.filter = 'drop-shadow(0 12px 18px rgba(0, 0, 0, 0.38))';
  ctx.drawImage(tintedImage, x, y, width, height);
  ctx.restore();

  drawHairlineBlend(ctx, style);
}

function drawOriginalHairMatte(ctx, image, x, y, width, height, style) {
  ctx.save();
  ctx.globalAlpha *= style.matteOpacity;
  ctx.filter = 'blur(8px)';
  ctx.drawImage(image, x - 0.015, y + 0.02, width * 1.03, height * 1.03);
  ctx.restore();
}

function drawForeheadContactShadow(ctx, style) {
  const gradient = ctx.createRadialGradient(0, 0.04, 0.02, 0, 0.04, 0.52);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${style.hairlineShadow})`);
  gradient.addColorStop(0.62, `rgba(0, 0, 0, ${style.hairlineShadow * 0.42})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0.035, 0.54, 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHairlineBlend(ctx, style) {
  ctx.save();
  ctx.strokeStyle = `rgba(255, 238, 218, ${style.hairlineShadow * 0.28})`;
  ctx.lineWidth = 0.008;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.34, 0.03);
  ctx.bezierCurveTo(-0.16, -0.015, 0.12, -0.015, 0.34, 0.03);
  ctx.stroke();
  ctx.restore();
}

function getTintedHairImage(style, color) {
  const key = `${style.id}:${color}`;
  const cachedImage = tintedHairCache.get(key);
  if (cachedImage) return cachedImage;

  const sourceImage = style.image;
  const tintedCanvas = document.createElement('canvas');
  tintedCanvas.width = sourceImage.naturalWidth;
  tintedCanvas.height = sourceImage.naturalHeight;

  const tintedContext = tintedCanvas.getContext('2d');
  tintedContext.drawImage(sourceImage, 0, 0);
  tintedContext.globalCompositeOperation = 'multiply';
  tintedContext.globalAlpha = style.colorMix;
  tintedContext.fillStyle = color;
  tintedContext.fillRect(0, 0, tintedCanvas.width, tintedCanvas.height);
  tintedContext.globalAlpha = 1;
  tintedContext.globalCompositeOperation = 'destination-in';
  tintedContext.drawImage(sourceImage, 0, 0);

  tintedHairCache.set(key, tintedCanvas);
  return tintedCanvas;
}

function drawDebug(pose) {
  context.save();
  context.fillStyle = '#49f2ff';
  for (const index of [10, 33, 127, 152, 263, 356]) {
    const point = pose.points[index];
    if (!point) continue;
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(pose.centerX, pose.foreheadY, 7, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function sortByX(pointA, pointB) {
  return pointA.x < pointB.x ? [pointA, pointB] : [pointB, pointA];
}

function distance(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message) {
  statusEl.textContent = message;
}
