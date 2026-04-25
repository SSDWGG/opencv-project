export function angleBetween(pointA, pointB, pointC) {
  const vectorBA = {
    x: pointA.x - pointB.x,
    y: pointA.y - pointB.y,
    z: (pointA.z ?? 0) - (pointB.z ?? 0),
  };
  const vectorBC = {
    x: pointC.x - pointB.x,
    y: pointC.y - pointB.y,
    z: (pointC.z ?? 0) - (pointB.z ?? 0),
  };
  const dot =
    vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y + vectorBA.z * vectorBC.z;
  const magnitudeBA = Math.hypot(vectorBA.x, vectorBA.y, vectorBA.z);
  const magnitudeBC = Math.hypot(vectorBC.x, vectorBC.y, vectorBC.z);
  const cosine = dot / (magnitudeBA * magnitudeBC);

  return Math.acos(clamp(cosine, -1, 1)) * (180 / Math.PI);
}

export function distance(pointA, pointB) {
  return Math.hypot(
    pointA.x - pointB.x,
    pointA.y - pointB.y,
    (pointA.z ?? 0) - (pointB.z ?? 0),
  );
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function averageScores(scores, keys) {
  return keys.reduce((sum, key) => sum + scoreOf(scores, key), 0) / keys.length;
}

export function scoreOf(scores, key) {
  return scores[key] ?? 0;
}
