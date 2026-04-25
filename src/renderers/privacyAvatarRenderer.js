import {
  averageLocalPoints,
  getLocalPoint,
  localDistance,
  sortLocalByX
} from '../core/pose.js';
import { clamp } from '../utils/math.js';

export function drawPrivacyAvatar(context, pose, options) {
  const scale = options.scale ?? 1;
  const avatarMetrics = getAvatarMetrics(pose);

  context.save();
  context.translate(pose.centerX, pose.foreheadY);
  context.rotate(pose.angle);
  context.scale(pose.faceWidth * scale, pose.faceWidth * scale);
  context.globalAlpha = options.fade;

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

function drawAvatarDropShadow(context, metrics) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.18)';
  context.beginPath();
  context.ellipse(
    0,
    metrics.headCenterY + metrics.headRadiusY * 0.08,
    metrics.headRadiusX * 1.02,
    metrics.headRadiusY * 0.98,
    0,
    0,
    Math.PI * 2
  );
  context.fill();

  context.fillStyle = 'rgba(0, 0, 0, 0.16)';
  context.beginPath();
  context.ellipse(
    0,
    metrics.headCenterY + metrics.headRadiusY * 0.16,
    metrics.headRadiusX * 0.88,
    metrics.headRadiusY * 0.82,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();
}

function drawAvatarEars(context, metrics) {
  const earTopY = metrics.headCenterY - metrics.headRadiusY * 0.95;
  const earBaseY = metrics.headCenterY - metrics.headRadiusY * 0.42;
  const earOuterColor = '#ef8f36';
  const earInnerColor = '#ffd5c1';

  context.save();
  context.fillStyle = earOuterColor;
  drawRoundedEar(context, -0.38, earBaseY, -0.52, earTopY, -0.16, earBaseY + 0.02);
  context.fill();
  drawRoundedEar(context, 0.38, earBaseY, 0.52, earTopY, 0.16, earBaseY + 0.02);
  context.fill();

  context.fillStyle = earInnerColor;
  drawRoundedEar(context, -0.36, earBaseY - 0.02, -0.46, earTopY + 0.13, -0.22, earBaseY - 0.01);
  context.fill();
  drawRoundedEar(context, 0.36, earBaseY - 0.02, 0.46, earTopY + 0.13, 0.22, earBaseY - 0.01);
  context.fill();
  context.restore();
}

function drawRoundedEar(context, baseOuterX, baseOuterY, tipX, tipY, baseInnerX, baseInnerY) {
  context.beginPath();
  context.moveTo(baseOuterX, baseOuterY);
  context.quadraticCurveTo(tipX * 0.96, tipY + 0.05, tipX, tipY);
  context.quadraticCurveTo(baseInnerX * 1.04, baseInnerY - 0.1, baseInnerX, baseInnerY);
  context.quadraticCurveTo(
    (baseOuterX + baseInnerX) / 2,
    baseInnerY + 0.09,
    baseOuterX,
    baseOuterY
  );
  context.closePath();
}

function drawAvatarHead(context, metrics) {
  const headTop = metrics.headCenterY - metrics.headRadiusY;
  const headBottom = metrics.headCenterY + metrics.headRadiusY;
  const headGradient = context.createLinearGradient(0, headTop, 0, headBottom);
  headGradient.addColorStop(0, '#ffb056');
  headGradient.addColorStop(0.52, '#f58d35');
  headGradient.addColorStop(1, '#c96525');

  context.save();
  context.fillStyle = headGradient;
  context.beginPath();
  context.ellipse(
    0,
    metrics.headCenterY,
    metrics.headRadiusX,
    metrics.headRadiusY,
    0,
    0,
    Math.PI * 2
  );
  context.fill();

  context.globalAlpha *= 0.24;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.ellipse(
    -0.22,
    metrics.headCenterY - metrics.headRadiusY * 0.42,
    0.24,
    metrics.headRadiusY * 0.22,
    -0.25,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();
}

function drawAvatarMuzzle(context, metrics) {
  const muzzleY = metrics.faceRatio * 0.62;
  const cheekGradient = context.createRadialGradient(0, muzzleY, 0.08, 0, muzzleY, 0.42);
  cheekGradient.addColorStop(0, '#fff8ec');
  cheekGradient.addColorStop(1, '#ffe1bf');

  context.save();
  context.fillStyle = cheekGradient;
  context.beginPath();
  context.ellipse(-0.17, muzzleY, 0.28, metrics.faceRatio * 0.22, -0.18, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(0.17, muzzleY, 0.28, metrics.faceRatio * 0.22, 0.18, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(
    0,
    muzzleY + metrics.faceRatio * 0.06,
    0.3,
    metrics.faceRatio * 0.18,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();
}

function drawAvatarEyes(context, metrics) {
  drawAvatarEye(context, metrics.leftEye.centerX, metrics.leftEye.centerY, metrics.leftEye.openness);
  drawAvatarEye(context, metrics.rightEye.centerX, metrics.rightEye.centerY, metrics.rightEye.openness);
}

function drawAvatarEye(context, centerX, centerY, openness) {
  context.save();
  context.strokeStyle = '#2d1a15';
  context.fillStyle = '#1b1110';
  context.lineWidth = 0.018;
  context.lineCap = 'round';

  if (openness < 0.035) {
    context.beginPath();
    context.moveTo(centerX - 0.07, centerY);
    context.quadraticCurveTo(centerX, centerY + 0.025, centerX + 0.07, centerY);
    context.stroke();
  } else {
    context.beginPath();
    context.ellipse(centerX, centerY, 0.06, 0.048 + openness * 0.42, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.82)';
    context.beginPath();
    context.arc(centerX - 0.02, centerY - 0.02, 0.014, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawAvatarNoseAndMouth(context, metrics) {
  const noseCenterX = metrics.nose.centerX;
  const noseCenterY = metrics.nose.centerY;
  const mouthCenterX = metrics.mouth.centerX;
  const mouthCenterY = Math.max(metrics.mouth.centerY, noseCenterY + metrics.faceRatio * 0.1);
  const mouthOpenHeight = 0.035 + metrics.mouth.openness * 0.14;

  context.save();
  context.fillStyle = '#231312';
  context.beginPath();
  context.moveTo(noseCenterX - 0.055, noseCenterY);
  context.quadraticCurveTo(noseCenterX, noseCenterY - 0.045, noseCenterX + 0.055, noseCenterY);
  context.quadraticCurveTo(
    noseCenterX + 0.035,
    noseCenterY + 0.055,
    noseCenterX,
    noseCenterY + 0.06
  );
  context.quadraticCurveTo(
    noseCenterX - 0.035,
    noseCenterY + 0.055,
    noseCenterX - 0.055,
    noseCenterY
  );
  context.fill();

  context.strokeStyle = '#2c1715';
  context.lineWidth = 0.018;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(noseCenterX, noseCenterY + 0.055);
  context.quadraticCurveTo(noseCenterX, mouthCenterY - 0.06, mouthCenterX, mouthCenterY - 0.02);
  context.stroke();

  if (metrics.mouth.openness > 0.22) {
    drawOpenMouth(context, mouthCenterX, mouthCenterY, mouthOpenHeight);
  } else {
    drawClosedMouth(context, mouthCenterX, mouthCenterY);
  }

  context.restore();
}

function drawOpenMouth(context, mouthCenterX, mouthCenterY, mouthOpenHeight) {
  context.fillStyle = '#241111';
  context.beginPath();
  context.ellipse(mouthCenterX, mouthCenterY, 0.095, mouthOpenHeight, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#ff8f8f';
  context.beginPath();
  context.ellipse(
    mouthCenterX,
    mouthCenterY + mouthOpenHeight * 0.34,
    0.052,
    mouthOpenHeight * 0.36,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
}

function drawClosedMouth(context, mouthCenterX, mouthCenterY) {
  context.beginPath();
  context.moveTo(mouthCenterX, mouthCenterY - 0.03);
  context.quadraticCurveTo(
    mouthCenterX - 0.08,
    mouthCenterY + 0.05,
    mouthCenterX - 0.16,
    mouthCenterY
  );
  context.moveTo(mouthCenterX, mouthCenterY - 0.03);
  context.quadraticCurveTo(
    mouthCenterX + 0.08,
    mouthCenterY + 0.05,
    mouthCenterX + 0.16,
    mouthCenterY
  );
  context.stroke();
}

function drawAvatarWhiskers(context, metrics) {
  const whiskerY = metrics.faceRatio * 0.62;
  const whiskerRows = [-0.05, 0.02, 0.09];

  context.save();
  context.strokeStyle = 'rgba(73, 39, 28, 0.54)';
  context.lineWidth = 0.012;
  context.lineCap = 'round';

  for (const rowOffset of whiskerRows) {
    drawWhisker(context, -0.12, whiskerY + rowOffset, -0.55, whiskerY + rowOffset - 0.08);
    drawWhisker(context, 0.12, whiskerY + rowOffset, 0.55, whiskerY + rowOffset - 0.08);
  }

  context.restore();
}

function drawWhisker(context, startX, startY, endX, endY) {
  const controlX = (startX + endX) / 2;
  const controlY = startY - 0.04;

  context.beginPath();
  context.moveTo(startX, startY);
  context.bezierCurveTo(controlX, controlY, controlX, controlY + 0.01, endX, endY);
  context.stroke();
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
