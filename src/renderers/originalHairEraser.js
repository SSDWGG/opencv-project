import { clamp } from '../utils/math.js';

const SKIN_SAMPLE_LANDMARKS = [4, 50, 205, 280, 425, 152];
const SKIN_SAMPLE_INTERVAL_MS = 650;

let cachedSkinColor = null;
let nextSkinSampleTime = 0;

export function eraseOriginalHair(context, pose, options) {
  const strength = clamp(options.strength ?? 0.45, 0, 0.8);
  const fade = options.fade ?? 1;
  if (strength <= 0 || fade <= 0) return;

  const skinColor = getCachedSkinColor(context, pose, options.now ?? performance.now());
  const faceRatio = clamp(pose.faceHeight / pose.faceWidth, 1.05, 1.52);
  const yaw = pose.yaw ?? 0;

  context.save();
  context.translate(pose.centerX, pose.foreheadY);
  context.rotate(pose.angle);
  context.scale(pose.faceWidth, pose.faceWidth);
  context.globalAlpha = strength * fade * 0.58;

  drawScalpBase(context, skinColor, faceRatio, yaw);
  drawScalpTexture(context, skinColor, faceRatio, yaw);
  drawScalpEdgeBlend(context, skinColor, faceRatio);

  context.restore();
}

function getCachedSkinColor(context, pose, now) {
  if (!cachedSkinColor || now >= nextSkinSampleTime) {
    cachedSkinColor = sampleSkinColor(context, pose);
    nextSkinSampleTime = now + SKIN_SAMPLE_INTERVAL_MS;
  }

  return cachedSkinColor;
}

function sampleSkinColor(context, pose) {
  const samples = [];

  for (const landmarkIndex of SKIN_SAMPLE_LANDMARKS) {
    const point = pose.points[landmarkIndex];
    if (!point) continue;

    const sample = sampleAverageColor(context, point.x, point.y, 3);
    if (!sample || sample.red < 35 || sample.green < 25 || sample.blue < 20) continue;
    samples.push(sample);
  }

  if (samples.length === 0) {
    return { red: 214, green: 163, blue: 128 };
  }

  return {
    red: median(samples.map((sample) => sample.red)),
    green: median(samples.map((sample) => sample.green)),
    blue: median(samples.map((sample) => sample.blue))
  };
}

function sampleAverageColor(context, centerX, centerY, radius) {
  const x = Math.round(clamp(centerX - radius, 0, context.canvas.width - 1));
  const y = Math.round(clamp(centerY - radius, 0, context.canvas.height - 1));
  const size = Math.max(1, radius * 2);
  const width = Math.min(size, context.canvas.width - x);
  const height = Math.min(size, context.canvas.height - y);
  if (width <= 0 || height <= 0) return null;

  const { data } = context.getImageData(x, y, width, height);
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    if (alpha < 0.5) continue;
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
    count += 1;
  }

  if (count === 0) return null;

  return {
    red: Math.round(red / count),
    green: Math.round(green / count),
    blue: Math.round(blue / count)
  };
}

function drawScalpBase(context, skinColor, faceRatio, yaw) {
  const topColor = mixColor(shiftColor(skinColor, 8), { red: 236, green: 198, blue: 168 }, 0.12);
  const baseColor = mixColor(shiftColor(skinColor, -2), { red: 220, green: 178, blue: 146 }, 0.08);
  const shadowColor = shiftColor(skinColor, -12);
  const gradient = context.createLinearGradient(0, -0.62, 0, faceRatio * 0.14);
  gradient.addColorStop(0, colorToRgb(topColor));
  gradient.addColorStop(0.64, colorToRgb(baseColor));
  gradient.addColorStop(1, colorToRgb(shadowColor));

  context.save();
  context.fillStyle = gradient;
  drawScalpPath(context, faceRatio, yaw);
  context.fill();
  context.restore();
}

function drawScalpTexture(context, skinColor, faceRatio, yaw) {
  context.save();
  context.globalAlpha *= 0.1;
  context.strokeStyle = colorToRgba(shiftColor(skinColor, -10), 0.32);
  context.lineWidth = 0.006;
  context.lineCap = 'round';

  for (let index = 0; index < 8; index += 1) {
    const progress = index / 7;
    const x = -0.32 + progress * 0.64 + yaw * 0.022 * Math.sin(progress * Math.PI);
    const y = -0.24 + Math.sin(progress * Math.PI) * -0.12;
    context.beginPath();
    context.moveTo(x - 0.025, y + faceRatio * 0.1);
    context.quadraticCurveTo(x, y - 0.045, x + 0.035, y + faceRatio * 0.05);
    context.stroke();
  }

  context.restore();
}

function drawScalpEdgeBlend(context, skinColor, faceRatio) {
  context.save();
  context.globalAlpha *= 0.34;
  context.strokeStyle = colorToRgba(shiftColor(skinColor, -18), 0.18);
  context.lineWidth = 0.011;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(-0.34, faceRatio * 0.075);
  context.bezierCurveTo(-0.18, 0.025, 0.18, 0.025, 0.34, faceRatio * 0.075);
  context.stroke();
  context.restore();
}

function drawScalpPath(context, faceRatio, yaw) {
  const sidePush = Math.abs(yaw) * 0.035;
  const nearSide = yaw >= 0 ? 1 : -1;
  const leftWidth = 0.43 + (nearSide < 0 ? sidePush : -sidePush * 0.45);
  const rightWidth = 0.43 + (nearSide > 0 ? sidePush : -sidePush * 0.45);
  const lowerY = Math.min(faceRatio * 0.1, 0.14);

  context.beginPath();
  context.moveTo(-leftWidth, lowerY);
  context.bezierCurveTo(-0.52, -0.12, -0.4, -0.5, -0.06, -0.58);
  context.bezierCurveTo(0.3, -0.55, 0.54, -0.14, rightWidth, lowerY);
  context.bezierCurveTo(0.27, 0.04, 0.13, 0.02, 0, 0.035);
  context.bezierCurveTo(-0.13, 0.02, -0.29, 0.04, -leftWidth, lowerY);
  context.closePath();
}

function mixColor(color, targetColor, amount) {
  return {
    red: Math.round(color.red + (targetColor.red - color.red) * amount),
    green: Math.round(color.green + (targetColor.green - color.green) * amount),
    blue: Math.round(color.blue + (targetColor.blue - color.blue) * amount)
  };
}

function shiftColor(color, amount) {
  return {
    red: clamp(color.red + amount, 0, 255),
    green: clamp(color.green + amount, 0, 255),
    blue: clamp(color.blue + amount, 0, 255)
  };
}

function colorToRgb(color) {
  return `rgb(${color.red}, ${color.green}, ${color.blue})`;
}

function colorToRgba(color, alpha) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`;
}

function median(values) {
  const sortedValues = [...values].sort((left, right) => left - right);
  return sortedValues[Math.floor(sortedValues.length / 2)];
}
