export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function distance(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function localDistance(pointA, pointB) {
  if (!pointA || !pointB) return 0;
  return Math.hypot(pointA.localX - pointB.localX, pointA.localY - pointB.localY);
}

export function sortByX(pointA, pointB) {
  return pointA.x < pointB.x ? [pointA, pointB] : [pointB, pointA];
}
