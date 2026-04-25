import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { FACE_LANDMARKER_OPTIONS, WASM_ROOT } from '../config/mediaPipe.js';

export async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  return FaceLandmarker.createFromOptions(vision, FACE_LANDMARKER_OPTIONS);
}
