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
const privacyToggle = document.querySelector('#privacyToggle');
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
      const privacyStatus = privacyToggle.checked ? '隐私贴图开启，' : '';
      setStatus(`已锁定人脸：${privacyStatus}正在预览「${currentStyle.name}」`);
    }
  }

  if (smoothedPose && now - lastPoseTime < 450) {
    const fade = Math.min(1, Math.max(0, 1 - (now - lastPoseTime - 260) / 190));
    if (privacyToggle.checked) drawPrivacyAvatar(smoothedPose, fade);
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

function drawPrivacyAvatar(pose, fade) {
  const avatarMetrics = getAvatarMetrics(pose);

  context.save();
  context.translate(pose.centerX, pose.foreheadY);
  context.rotate(pose.angle);
  context.scale(pose.faceWidth, pose.faceWidth);
  context.globalAlpha = fade;

  drawAvatarDropShadow(context, avatarMetrics);
  drawAvatarEars(context, avatarMetrics);
  drawAvatarHead(context, avatarMetrics);
  drawAvatarMuzzle(context, avatarMetrics);
  drawAvatarEyes(context, avatarMetrics);
  drawAvatarNoseAndMouth(context, avatarMetrics);
  drawAvatarWhiskers(context, avatarMetrics);

  context.restore();
}

function getAvatarMetrics(pose) {
  const faceRatio = clamp(pose.faceHeight / pose.faceWidth, 1.05, 1.52);
  const eyeA = getEyeMetrics(pose, 33, 133, 159, 145);
  const eyeB = getEyeMetrics(pose, 263, 362, 386, 374);
  const [leftEye, rightEye] = sortLocalByX(eyeA, eyeB);
  const mouthTop = getLocalPoint(pose.points[13], pose);
  const mouthBottom = getLocalPoint(pose.points[14], pose);
  const mouthLeft = getLocalPoint(pose.points[61], pose);
  const mouthRight = getLocalPoint(pose.points[291], pose);
  const nose = getLocalPoint(pose.points[1], pose) || {
    localX: 0,
    localY: faceRatio * 0.48
  };
  const mouthWidth = Math.max(localDistance(mouthLeft, mouthRight), 0.12);
  const mouthOpen = clamp(localDistance(mouthTop, mouthBottom) / mouthWidth, 0, 0.72);
  const mouthCenter = averageLocalPoints([mouthTop, mouthBottom, mouthLeft, mouthRight]) || {
    localX: 0,
    localY: faceRatio * 0.68
  };
  const eyeLineY = clamp(
    (leftEye.centerY + rightEye.centerY) / 2,
    faceRatio * 0.18,
    faceRatio * 0.47
  );

  return {
    faceRatio,
    headCenterY: faceRatio * 0.47,
    headRadiusX: 0.62,
    headRadiusY: faceRatio * 0.58,
    leftEye: {
      centerX: clamp(leftEye.centerX, -0.34, -0.14),
      centerY: eyeLineY,
      openness: leftEye.openness
    },
    rightEye: {
      centerX: clamp(rightEye.centerX, 0.14, 0.34),
      centerY: eyeLineY,
      openness: rightEye.openness
    },
    nose: {
      centerX: clamp(nose.localX * 0.55, -0.08, 0.08),
      centerY: clamp(nose.localY, faceRatio * 0.42, faceRatio * 0.62)
    },
    mouth: {
      centerX: clamp(mouthCenter.localX * 0.45, -0.1, 0.1),
      centerY: clamp(mouthCenter.localY, faceRatio * 0.58, faceRatio * 0.82),
      openness: mouthOpen
    }
  };
}

function drawAvatarDropShadow(ctx, metrics) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.filter = 'blur(10px)';
  ctx.beginPath();
  ctx.ellipse(
    0,
    metrics.headCenterY + metrics.headRadiusY * 0.08,
    metrics.headRadiusX * 0.96,
    metrics.headRadiusY * 0.92,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawAvatarEars(ctx, metrics) {
  const earTopY = metrics.headCenterY - metrics.headRadiusY * 0.95;
  const earBaseY = metrics.headCenterY - metrics.headRadiusY * 0.42;
  const earOuterColor = '#ef8f36';
  const earInnerColor = '#ffd5c1';

  ctx.save();
  ctx.fillStyle = earOuterColor;
  drawRoundedEar(ctx, -0.38, earBaseY, -0.52, earTopY, -0.16, earBaseY + 0.02);
  ctx.fill();
  drawRoundedEar(ctx, 0.38, earBaseY, 0.52, earTopY, 0.16, earBaseY + 0.02);
  ctx.fill();

  ctx.fillStyle = earInnerColor;
  drawRoundedEar(ctx, -0.36, earBaseY - 0.02, -0.46, earTopY + 0.13, -0.22, earBaseY - 0.01);
  ctx.fill();
  drawRoundedEar(ctx, 0.36, earBaseY - 0.02, 0.46, earTopY + 0.13, 0.22, earBaseY - 0.01);
  ctx.fill();
  ctx.restore();
}

function drawRoundedEar(ctx, baseOuterX, baseOuterY, tipX, tipY, baseInnerX, baseInnerY) {
  ctx.beginPath();
  ctx.moveTo(baseOuterX, baseOuterY);
  ctx.quadraticCurveTo(tipX * 0.96, tipY + 0.05, tipX, tipY);
  ctx.quadraticCurveTo(baseInnerX * 1.04, baseInnerY - 0.1, baseInnerX, baseInnerY);
  ctx.quadraticCurveTo((baseOuterX + baseInnerX) / 2, baseInnerY + 0.09, baseOuterX, baseOuterY);
  ctx.closePath();
}

function drawAvatarHead(ctx, metrics) {
  const headTop = metrics.headCenterY - metrics.headRadiusY;
  const headBottom = metrics.headCenterY + metrics.headRadiusY;
  const headGradient = ctx.createLinearGradient(0, headTop, 0, headBottom);
  headGradient.addColorStop(0, '#ffb056');
  headGradient.addColorStop(0.52, '#f58d35');
  headGradient.addColorStop(1, '#c96525');

  ctx.save();
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.ellipse(
    0,
    metrics.headCenterY,
    metrics.headRadiusX,
    metrics.headRadiusY,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.globalAlpha *= 0.24;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(
    -0.22,
    metrics.headCenterY - metrics.headRadiusY * 0.42,
    0.24,
    metrics.headRadiusY * 0.22,
    -0.25,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawAvatarMuzzle(ctx, metrics) {
  const muzzleY = metrics.faceRatio * 0.62;
  const cheekGradient = ctx.createRadialGradient(0, muzzleY, 0.08, 0, muzzleY, 0.42);
  cheekGradient.addColorStop(0, '#fff8ec');
  cheekGradient.addColorStop(1, '#ffe1bf');

  ctx.save();
  ctx.fillStyle = cheekGradient;
  ctx.beginPath();
  ctx.ellipse(-0.17, muzzleY, 0.28, metrics.faceRatio * 0.22, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.17, muzzleY, 0.28, metrics.faceRatio * 0.22, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, muzzleY + metrics.faceRatio * 0.06, 0.3, metrics.faceRatio * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAvatarEyes(ctx, metrics) {
  drawAvatarEye(ctx, metrics.leftEye.centerX, metrics.leftEye.centerY, metrics.leftEye.openness);
  drawAvatarEye(ctx, metrics.rightEye.centerX, metrics.rightEye.centerY, metrics.rightEye.openness);
}

function drawAvatarEye(ctx, centerX, centerY, openness) {
  ctx.save();
  ctx.strokeStyle = '#2d1a15';
  ctx.fillStyle = '#1b1110';
  ctx.lineWidth = 0.018;
  ctx.lineCap = 'round';

  if (openness < 0.035) {
    ctx.beginPath();
    ctx.moveTo(centerX - 0.07, centerY);
    ctx.quadraticCurveTo(centerX, centerY + 0.025, centerX + 0.07, centerY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 0.06, 0.048 + openness * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.beginPath();
    ctx.arc(centerX - 0.02, centerY - 0.02, 0.014, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawAvatarNoseAndMouth(ctx, metrics) {
  const noseCenterX = metrics.nose.centerX;
  const noseCenterY = metrics.nose.centerY;
  const mouthCenterX = metrics.mouth.centerX;
  const mouthCenterY = Math.max(metrics.mouth.centerY, noseCenterY + metrics.faceRatio * 0.1);
  const mouthOpenHeight = 0.035 + metrics.mouth.openness * 0.14;

  ctx.save();
  ctx.fillStyle = '#231312';
  ctx.beginPath();
  ctx.moveTo(noseCenterX - 0.055, noseCenterY);
  ctx.quadraticCurveTo(noseCenterX, noseCenterY - 0.045, noseCenterX + 0.055, noseCenterY);
  ctx.quadraticCurveTo(noseCenterX + 0.035, noseCenterY + 0.055, noseCenterX, noseCenterY + 0.06);
  ctx.quadraticCurveTo(noseCenterX - 0.035, noseCenterY + 0.055, noseCenterX - 0.055, noseCenterY);
  ctx.fill();

  ctx.strokeStyle = '#2c1715';
  ctx.lineWidth = 0.018;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(noseCenterX, noseCenterY + 0.055);
  ctx.quadraticCurveTo(noseCenterX, mouthCenterY - 0.06, mouthCenterX, mouthCenterY - 0.02);
  ctx.stroke();

  if (metrics.mouth.openness > 0.22) {
    ctx.fillStyle = '#241111';
    ctx.beginPath();
    ctx.ellipse(mouthCenterX, mouthCenterY, 0.095, mouthOpenHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8f8f';
    ctx.beginPath();
    ctx.ellipse(
      mouthCenterX,
      mouthCenterY + mouthOpenHeight * 0.34,
      0.052,
      mouthOpenHeight * 0.36,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(mouthCenterX, mouthCenterY - 0.03);
    ctx.quadraticCurveTo(mouthCenterX - 0.08, mouthCenterY + 0.05, mouthCenterX - 0.16, mouthCenterY);
    ctx.moveTo(mouthCenterX, mouthCenterY - 0.03);
    ctx.quadraticCurveTo(mouthCenterX + 0.08, mouthCenterY + 0.05, mouthCenterX + 0.16, mouthCenterY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAvatarWhiskers(ctx, metrics) {
  const whiskerY = metrics.faceRatio * 0.62;
  const whiskerRows = [-0.05, 0.02, 0.09];

  ctx.save();
  ctx.strokeStyle = 'rgba(73, 39, 28, 0.54)';
  ctx.lineWidth = 0.012;
  ctx.lineCap = 'round';

  for (const rowOffset of whiskerRows) {
    ctx.beginPath();
    ctx.moveTo(-0.12, whiskerY + rowOffset);
    ctx.bezierCurveTo(-0.28, whiskerY + rowOffset - 0.04, -0.45, whiskerY + rowOffset - 0.03, -0.55, whiskerY + rowOffset - 0.08);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0.12, whiskerY + rowOffset);
    ctx.bezierCurveTo(0.28, whiskerY + rowOffset - 0.04, 0.45, whiskerY + rowOffset - 0.03, 0.55, whiskerY + rowOffset - 0.08);
    ctx.stroke();
  }

  ctx.restore();
}

function getEyeMetrics(pose, outerIndex, innerIndex, upperIndex, lowerIndex) {
  const outerPoint = getLocalPoint(pose.points[outerIndex], pose);
  const innerPoint = getLocalPoint(pose.points[innerIndex], pose);
  const upperPoint = getLocalPoint(pose.points[upperIndex], pose);
  const lowerPoint = getLocalPoint(pose.points[lowerIndex], pose);
  const fallbackCenterX = outerIndex === 33 ? -0.24 : 0.24;
  const centerPoint = averageLocalPoints([outerPoint, innerPoint, upperPoint, lowerPoint]) || {
    localX: fallbackCenterX,
    localY: 0.34
  };
  const eyeWidth = Math.max(localDistance(outerPoint, innerPoint), 0.1);
  const eyeHeight = localDistance(upperPoint, lowerPoint);
  const openness = clamp((eyeHeight / eyeWidth - 0.08) * 0.34, 0.018, 0.12);

  return {
    centerX: centerPoint.localX,
    centerY: centerPoint.localY,
    openness
  };
}

function getLocalPoint(point, pose) {
  if (!point) return null;
  const deltaX = point.x - pose.centerX;
  const deltaY = point.y - pose.foreheadY;
  const cosAngle = Math.cos(-pose.angle);
  const sinAngle = Math.sin(-pose.angle);

  return {
    localX: (deltaX * cosAngle - deltaY * sinAngle) / pose.faceWidth,
    localY: (deltaX * sinAngle + deltaY * cosAngle) / pose.faceWidth
  };
}

function averageLocalPoints(points) {
  const validPoints = points.filter(Boolean);
  if (validPoints.length === 0) return null;
  const total = validPoints.reduce(
    (sum, point) => ({
      localX: sum.localX + point.localX,
      localY: sum.localY + point.localY
    }),
    { localX: 0, localY: 0 }
  );

  return {
    localX: total.localX / validPoints.length,
    localY: total.localY / validPoints.length
  };
}

function sortLocalByX(pointA, pointB) {
  return pointA.centerX < pointB.centerX ? [pointA, pointB] : [pointB, pointA];
}

function localDistance(pointA, pointB) {
  if (!pointA || !pointB) return 0;
  return Math.hypot(pointA.localX - pointB.localX, pointA.localY - pointB.localY);
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
