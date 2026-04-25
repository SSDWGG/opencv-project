import {
  DrawingUtils,
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
} from '@mediapipe/tasks-vision';

import { FACE_MODEL_URL, HAND_MODEL_URL, WASM_URL } from '../config.js';

export function createVisionRuntime() {
  return FilesetResolver.forVisionTasks(WASM_URL);
}

export function initializeHandLandmarker(vision) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: HAND_MODEL_URL,
      delegate: 'GPU',
    },
    numHands: 2,
    runningMode: 'VIDEO',
    minHandDetectionConfidence: 0.45,
    minHandPresenceConfidence: 0.45,
    minTrackingConfidence: 0.45,
  });
}

export function initializeFaceLandmarker(vision) {
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_MODEL_URL,
      delegate: 'GPU',
    },
    numFaces: 1,
    runningMode: 'VIDEO',
    outputFaceBlendshapes: true,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
}

export async function initializeHandModels(canvasContext, vision) {
  const handLandmarker = await initializeHandLandmarker(vision);

  return {
    handLandmarker,
    faceLandmarker: null,
    drawingUtils: new DrawingUtils(canvasContext),
    handConnections: HandLandmarker.HAND_CONNECTIONS,
  };
}

export async function initializeVisionModels(canvasContext) {
  const vision = await createVisionRuntime();
  const [handLandmarker, faceLandmarker] = await Promise.all([
    initializeHandLandmarker(vision),
    initializeFaceLandmarker(vision),
  ]);

  return {
    handLandmarker,
    faceLandmarker,
    drawingUtils: new DrawingUtils(canvasContext),
    handConnections: HandLandmarker.HAND_CONNECTIONS,
  };
}
