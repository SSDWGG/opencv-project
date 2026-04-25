import { averageScores, clamp, scoreOf } from '../utils/math.js';

export function analyzeFaceExpression(results) {
  const landmarks = results.faceLandmarks?.[0];
  const categories = results.faceBlendshapes?.[0]?.categories ?? [];

  if (!landmarks || categories.length === 0) {
    return getEmptyFaceExpression();
  }

  const scores = Object.fromEntries(
    categories.map((category) => [category.categoryName, category.score]),
  );
  const smile = averageScores(scores, ['mouthSmileLeft', 'mouthSmileRight']);
  const frown = averageScores(scores, ['mouthFrownLeft', 'mouthFrownRight']);
  const eyeWide = averageScores(scores, ['eyeWideLeft', 'eyeWideRight']);
  const eyeBlinkLeft = scoreOf(scores, 'eyeBlinkLeft');
  const eyeBlinkRight = scoreOf(scores, 'eyeBlinkRight');
  const eyeBlink = averageScores(scores, ['eyeBlinkLeft', 'eyeBlinkRight']);
  const eyeBlinkDifference = Math.abs(eyeBlinkLeft - eyeBlinkRight);
  const eyeSquint = averageScores(scores, ['eyeSquintLeft', 'eyeSquintRight']);
  const browDown = averageScores(scores, ['browDownLeft', 'browDownRight']);
  const noseSneer = averageScores(scores, ['noseSneerLeft', 'noseSneerRight']);
  const jawOpen = scoreOf(scores, 'jawOpen');
  const browInnerUp = scoreOf(scores, 'browInnerUp');
  const mouthPucker = scoreOf(scores, 'mouthPucker');
  const cheekPuff = scoreOf(scores, 'cheekPuff');

  const candidates = [
    {
      label: '大笑',
      emoji: '😂',
      score: smile * 0.68 + jawOpen * 0.32,
      threshold: 0.38,
    },
    {
      label: '惊讶',
      emoji: '😮',
      score: jawOpen * 0.58 + eyeWide * 0.28 + browInnerUp * 0.14,
      threshold: 0.32,
    },
    {
      label: '眨眼',
      emoji: '😉',
      score: Math.max(eyeBlinkLeft, eyeBlinkRight) * eyeBlinkDifference,
      threshold: 0.25,
    },
    {
      label: '开心',
      emoji: '😄',
      score: smile,
      threshold: 0.28,
    },
    {
      label: '生气',
      emoji: '😠',
      score: browDown * 0.72 + eyeSquint * 0.18 + noseSneer * 0.1,
      threshold: 0.3,
    },
    {
      label: '难过',
      emoji: '😢',
      score: frown * 0.62 + browInnerUp * 0.28 + (1 - smile) * 0.1,
      threshold: 0.28,
    },
    {
      label: '亲亲',
      emoji: '😗',
      score: mouthPucker,
      threshold: 0.34,
    },
    {
      label: '鼓腮',
      emoji: '😤',
      score: cheekPuff,
      threshold: 0.28,
    },
    {
      label: '闭眼',
      emoji: '😌',
      score: eyeBlink,
      threshold: 0.58,
    },
  ].map((candidate) => ({
    ...candidate,
    confidence: clamp(
      (candidate.score - candidate.threshold) / (1 - candidate.threshold),
      0,
      1,
    ),
  }));

  const bestExpression = candidates.sort(
    (firstExpression, secondExpression) =>
      secondExpression.confidence - firstExpression.confidence,
  )[0];
  const expression =
    bestExpression && bestExpression.confidence > 0
      ? bestExpression
      : {
          label: '平静',
          emoji: '🙂',
          score: scoreOf(scores, '_neutral'),
          confidence: Math.max(0.35, scoreOf(scores, '_neutral')),
        };

  return {
    detected: true,
    label: expression.label,
    emoji: expression.emoji,
    confidence: expression.confidence,
    overlayPosition: getFaceOverlayPosition(landmarks),
  };
}

export function getEmptyFaceExpression() {
  return {
    detected: false,
    label: '未检测到人脸',
    emoji: '🙂',
    confidence: 0,
  };
}

function getFaceOverlayPosition(landmarks) {
  const xs = landmarks.map((landmark) => landmark.x);
  const ys = landmarks.map((landmark) => landmark.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;

  return {
    xPercent: clamp((1 - (minX + faceWidth / 2)) * 100, 10, 90),
    yPercent: clamp((minY - faceHeight * 0.22) * 100, 8, 88),
    size: clamp(faceWidth * 130, 42, 86),
  };
}
