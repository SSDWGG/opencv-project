import { clamp, distance, lerp, localDistance, sortByX } from '../utils/math.js';

export function getHairPose(landmarks, canvas) {
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
  const nose = points[1] || forehead;
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
  const noseOffset = (nose.x - centerX) / Math.max(faceWidth, 1);
  const templeDepthDelta = (screenRightTemple.z || 0) - (screenLeftTemple.z || 0);
  const yaw = clamp(noseOffset * 1.35 + templeDepthDelta * 4.2, -0.85, 0.85);

  return {
    points,
    centerX,
    foreheadY,
    faceWidth: clamp(faceWidth, canvas.width * 0.14, canvas.width * 0.68),
    faceHeight: clamp(faceHeight, canvas.height * 0.16, canvas.height * 0.78),
    angle,
    yaw
  };
}

export function smoothPose(previous, next) {
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
    angle: previous.angle + angleDelta * alpha,
    yaw: lerp(previous.yaw ?? 0, next.yaw ?? 0, alpha)
  };
}

export function getLocalPoint(point, pose) {
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

export function averageLocalPoints(points) {
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

export function sortLocalByX(pointA, pointB) {
  return pointA.centerX < pointB.centerX ? [pointA, pointB] : [pointB, pointA];
}

export { localDistance };
