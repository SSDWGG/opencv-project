export const TASKS_VERSION = '0.10.34';

export const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;

export const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

export const FACE_LANDMARKER_OPTIONS = {
  baseOptions: {
    modelAssetPath: FACE_MODEL_URL,
    delegate: 'GPU'
  },
  runningMode: 'VIDEO',
  numFaces: 1,
  minFaceDetectionConfidence: 0.55,
  minFacePresenceConfidence: 0.55,
  minTrackingConfidence: 0.55
};
