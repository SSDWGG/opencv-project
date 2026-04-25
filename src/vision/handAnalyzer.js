import { angleBetween, distance } from '../utils/math.js';

export const fingerDefinitions = [
  { key: 'thumb', name: '拇指', shortName: '拇', points: [1, 2, 3, 4], type: 'thumb' },
  { key: 'index', name: '食指', shortName: '食', points: [5, 6, 7, 8], type: 'finger' },
  { key: 'middle', name: '中指', shortName: '中', points: [9, 10, 11, 12], type: 'finger' },
  { key: 'ring', name: '无名指', shortName: '无', points: [13, 14, 15, 16], type: 'finger' },
  { key: 'pinky', name: '小指', shortName: '小', points: [17, 18, 19, 20], type: 'finger' },
];

export function analyzeHands(results, canvas) {
  return (results.landmarks ?? []).map((landmarks, index) => {
    const handedness = results.handedness?.[index]?.[0]?.categoryName ?? 'Hand';
    const confidence = results.handedness?.[index]?.[0]?.score ?? 0;
    const fingerStates = analyzeFingerStates(landmarks);
    const count = fingerStates.filter((finger) => finger.extended).length;
    const gestureNumber = detectSingleHandNumber(landmarks, fingerStates);

    return {
      rawHandedness: handedness,
      handedness: translateHandedness(handedness),
      confidence,
      count,
      gestureNumber,
      screenPosition: getHandScreenPosition(landmarks, canvas),
      state: getHandState(count),
      fingerStates,
    };
  });
}

export function formatGestureNumber(gestureNumber) {
  return gestureNumber === null ? '--' : String(gestureNumber);
}

export function getGestureName(gestureNumber) {
  const names = {
    1: '数字一',
    2: '数字二',
    3: '数字三',
    4: '数字四',
    5: '数字五',
    6: '数字六',
    7: '数字七',
    8: '数字八',
    9: '数字九',
    10: '数字十',
  };

  return names[gestureNumber] ?? '未匹配数字手势';
}

function getHandScreenPosition(landmarks, canvas) {
  const bounds = canvas.getBoundingClientRect();
  const palmLandmarks = [0, 5, 9, 13, 17].map((landmarkIndex) => landmarks[landmarkIndex]);
  const averageX =
    palmLandmarks.reduce((sum, landmark) => sum + landmark.x, 0) / palmLandmarks.length;
  const averageY =
    palmLandmarks.reduce((sum, landmark) => sum + landmark.y, 0) / palmLandmarks.length;

  return {
    x: bounds.left + (1 - averageX) * bounds.width,
    y: bounds.top + averageY * bounds.height,
  };
}

function analyzeFingerStates(landmarks) {
  const palmSize = distance(landmarks[0], landmarks[9]);

  return fingerDefinitions.map((finger) => {
    const extended =
      finger.type === 'thumb'
        ? isThumbExtended(landmarks, finger.points, palmSize)
        : isFingerExtended(landmarks, finger.points, palmSize);

    return {
      ...finger,
      extended,
    };
  });
}

function isFingerExtended(landmarks, points, palmSize) {
  const [mcpIndex, pipIndex, dipIndex, tipIndex] = points;
  const wrist = landmarks[0];
  const mcp = landmarks[mcpIndex];
  const pip = landmarks[pipIndex];
  const dip = landmarks[dipIndex];
  const tip = landmarks[tipIndex];

  const pipAngle = angleBetween(mcp, pip, tip);
  const dipAngle = angleBetween(pip, dip, tip);
  const reachesAwayFromPalm =
    distance(wrist, tip) > distance(wrist, pip) + palmSize * 0.05;
  const tipPastDip = distance(wrist, tip) > distance(wrist, dip) + palmSize * 0.015;

  return pipAngle > 145 && dipAngle > 135 && reachesAwayFromPalm && tipPastDip;
}

function isThumbExtended(landmarks, points, palmSize) {
  const [, mcpIndex, ipIndex, tipIndex] = points;
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const indexMcp = landmarks[5];
  const mcp = landmarks[mcpIndex];
  const ip = landmarks[ipIndex];
  const tip = landmarks[tipIndex];

  const thumbAngle = angleBetween(mcp, ip, tip);
  const awayFromPalm =
    distance(tip, middleMcp) > distance(ip, middleMcp) + palmSize * 0.1 ||
    distance(tip, indexMcp) > distance(ip, indexMcp) + palmSize * 0.06;
  const reachesOut = distance(wrist, tip) > distance(wrist, mcp) + palmSize * 0.14;

  return thumbAngle > 138 && awayFromPalm && reachesOut;
}

function detectSingleHandNumber(landmarks, fingerStates) {
  const fingers = getFingerFlags(fingerStates);
  const palmSize = distance(landmarks[0], landmarks[9]);

  if (isChineseSevenGesture(landmarks, fingers, palmSize)) {
    return 7;
  }
  if (isChineseNineGesture(landmarks, fingers, palmSize)) {
    return 9;
  }
  if (matchesFingerPattern(fingers, [])) {
    return 10;
  }
  if (matchesFingerPattern(fingers, ['index'])) {
    return 1;
  }
  if (matchesFingerPattern(fingers, ['index', 'middle'])) {
    return 2;
  }
  if (
    matchesFingerPattern(fingers, ['thumb', 'index', 'middle']) ||
    matchesFingerPattern(fingers, ['index', 'middle', 'ring'])
  ) {
    return 3;
  }
  if (matchesFingerPattern(fingers, ['index', 'middle', 'ring', 'pinky'])) {
    return 4;
  }
  if (matchesFingerPattern(fingers, ['thumb', 'index', 'middle', 'ring', 'pinky'])) {
    return 5;
  }
  if (matchesFingerPattern(fingers, ['thumb', 'pinky'])) {
    return 6;
  }
  if (matchesFingerPattern(fingers, ['thumb', 'index'])) {
    return 8;
  }

  return null;
}

function getFingerFlags(fingerStates) {
  return Object.fromEntries(
    fingerStates.map((finger) => [finger.key, finger.extended]),
  );
}

function matchesFingerPattern(fingers, openFingerKeys) {
  const openFingers = new Set(openFingerKeys);

  return fingerDefinitions.every(
    (finger) => fingers[finger.key] === openFingers.has(finger.key),
  );
}

function isChineseSevenGesture(landmarks, fingers, palmSize) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const wrist = landmarks[0];
  const tipsClustered =
    distance(thumbTip, indexTip) < palmSize * 0.55 &&
    distance(thumbTip, middleTip) < palmSize * 0.68 &&
    distance(indexTip, middleTip) < palmSize * 0.48;
  const activeTipsAwayFromPalm =
    distance(wrist, indexTip) > palmSize * 1.08 &&
    distance(wrist, middleTip) > palmSize * 1.08;

  return tipsClustered && activeTipsAwayFromPalm && !fingers.ring && !fingers.pinky;
}

function isChineseNineGesture(landmarks, fingers, palmSize) {
  return (
    !fingers.thumb &&
    !fingers.middle &&
    !fingers.ring &&
    !fingers.pinky &&
    isHookedIndexFinger(landmarks, palmSize)
  );
}

function isHookedIndexFinger(landmarks, palmSize) {
  const wrist = landmarks[0];
  const mcp = landmarks[5];
  const pip = landmarks[6];
  const dip = landmarks[7];
  const tip = landmarks[8];
  const pipAngle = angleBetween(mcp, pip, tip);
  const dipAngle = angleBetween(pip, dip, tip);
  const bentButVisible = pipAngle > 65 && pipAngle < 155 && dipAngle > 65;
  const reachesOutFromPalm =
    distance(wrist, tip) > distance(wrist, mcp) + palmSize * 0.28;
  const tipStillNearHook = distance(mcp, tip) > distance(mcp, pip) * 0.65;

  return bentButVisible && reachesOutFromPalm && tipStillNearHook;
}

export function getHandState(count) {
  if (count >= 4) {
    return '张开';
  }
  if (count <= 1) {
    return '收起 / 握拳';
  }
  return '半张开';
}

function translateHandedness(handedness) {
  if (handedness === 'Left') {
    return '左手';
  }
  if (handedness === 'Right') {
    return '右手';
  }
  return '手部';
}
