const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

export const HAND_MODEL_URL = publicAsset('models/hand_landmarker.task');
export const FACE_MODEL_URL = publicAsset('models/face_landmarker.task');
export const WASM_URL = publicAsset('vendor/mediapipe/wasm');

export const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};
