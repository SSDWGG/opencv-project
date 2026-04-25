import { CAMERA_CONSTRAINTS } from './config.js';
import { getDomElements } from './dom.js';
import { GestureEffectController } from './gestureEffectController.js';
import { SignTutor } from './learning/signTutor.js';
import { clearCanvas, renderHandLandmarks, resizeCanvasToVideo } from './ui/canvasOverlay.js';
import { renderFaceExpression } from './ui/faceResults.js';
import { renderHandResults } from './ui/handResults.js';
import { getEmptyFaceExpression, analyzeFaceExpression } from './vision/faceAnalyzer.js';
import { analyzeHands } from './vision/handAnalyzer.js';
import { HandSmoother } from './vision/handSmoother.js';
import './styles.css';

const elements = getDomElements();
const gestureEffectController = new GestureEffectController(elements.effectLayer);
const handSmoother = new HandSmoother();
const signTutor = new SignTutor(elements);

let visionModels;
let visionModelsPromise;
let visionModulePromise;
let stream;
let cameraRunning = false;
let animationFrameId;
let lastVideoTime = -1;
let lastFrameTime = performance.now();
let fps = 0;

async function boot() {
  if (!navigator.mediaDevices?.getUserMedia) {
    elements.modelStatus.textContent = '浏览器不支持';
    elements.cameraStatus.textContent = '请使用新版 Chrome、Edge 或 Safari';
    return;
  }

  elements.modelStatus.textContent = '等待启动';
  elements.cameraStatus.textContent = '点击启动后加载本地模型';
  elements.toggleCameraButton.disabled = false;
}

function loadVisionModule() {
  visionModulePromise ??= import('./vision/models.js');
  return visionModulePromise;
}

function ensureVisionModels() {
  if (visionModels) {
    return Promise.resolve(visionModels);
  }

  visionModelsPromise ??= (async () => {
    elements.modelStatus.textContent = '加载识别核心...';
    const { createVisionRuntime, initializeFaceLandmarker, initializeHandModels } =
      await loadVisionModule();

    const vision = await createVisionRuntime();
    elements.modelStatus.textContent = '初始化手势识别...';
    visionModels = await initializeHandModels(elements.canvasContext, vision);
    elements.modelStatus.textContent = '手势已就绪，表情加载中...';

    initializeFaceLandmarker(vision)
      .then((faceLandmarker) => {
        visionModels.faceLandmarker = faceLandmarker;
        elements.modelStatus.textContent = '手势 + 表情已就绪';
      })
      .catch((error) => {
        console.error(error);
        elements.modelStatus.textContent = '手势已就绪，表情加载失败';
      });

    return visionModels;
  })().catch((error) => {
    visionModelsPromise = undefined;
    throw error;
  });

  return visionModelsPromise;
}

async function toggleCamera() {
  if (cameraRunning) {
    stopCamera();
    return;
  }

  let nextStream;
  elements.toggleCameraButton.disabled = true;
  elements.cameraStatus.textContent = '正在启动摄像头与识别模型...';

  try {
    const cameraPromise = navigator.mediaDevices
      .getUserMedia(CAMERA_CONSTRAINTS)
      .then((mediaStream) => {
        nextStream = mediaStream;
        return mediaStream;
      });

    const [modelResult, cameraResult] = await Promise.allSettled([
      ensureVisionModels(),
      cameraPromise,
    ]);

    if (modelResult.status === 'rejected') {
      throw modelResult.reason;
    }

    if (cameraResult.status === 'rejected') {
      throw cameraResult.reason;
    }

    stream = cameraResult.value;
    elements.video.srcObject = stream;
    await elements.video.play();

    cameraRunning = true;
    elements.emptyHint.hidden = true;
    elements.toggleCameraButton.textContent = '停止摄像头';
    elements.cameraStatus.textContent = '摄像头运行中';
    predictWebcam();
  } catch (error) {
    console.error(error);
    nextStream?.getTracks().forEach((track) => track.stop());
    elements.modelStatus.textContent = visionModels ? elements.modelStatus.textContent : '加载失败';
    elements.cameraStatus.textContent = '启动失败，请检查摄像头权限或模型资源';
  } finally {
    elements.toggleCameraButton.disabled = false;
  }
}

function stopCamera() {
  cameraRunning = false;
  cancelAnimationFrame(animationFrameId);
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  elements.video.srcObject = null;
  clearCanvas(elements.canvasContext);

  elements.emptyHint.hidden = false;
  elements.toggleCameraButton.textContent = '启动摄像头';
  elements.cameraStatus.textContent = '摄像头已停止';
  elements.fpsStatus.textContent = 'FPS: --';
  handSmoother.reset();
  gestureEffectController.reset();
  signTutor.resetFrame();
  renderHandResults(elements, []);
  renderFaceExpression(elements, getEmptyFaceExpression());
}

function predictWebcam() {
  if (!cameraRunning || !visionModels) {
    return;
  }

  resizeCanvasToVideo(elements.canvas, elements.video);

  if (elements.video.currentTime !== lastVideoTime) {
    lastVideoTime = elements.video.currentTime;
    processVideoFrame();
  }

  animationFrameId = requestAnimationFrame(predictWebcam);
}

function processVideoFrame() {
  const frameTime = performance.now();
  const handResults = visionModels.handLandmarker.detectForVideo(elements.video, frameTime);
  const faceResults = visionModels.faceLandmarker?.detectForVideo(elements.video, frameTime);
  const hands = handSmoother.update(analyzeHands(handResults, elements.canvas));
  const faceExpression = faceResults ? analyzeFaceExpression(faceResults) : getEmptyFaceExpression();

  renderHandLandmarks({
    canvasContext: elements.canvasContext,
    drawingUtils: visionModels.drawingUtils,
    handConnections: visionModels.handConnections,
    results: handResults,
  });
  renderHandResults(elements, hands);
  renderFaceExpression(elements, faceExpression);
  signTutor.update(hands, frameTime);
  gestureEffectController.update(hands);
  updateFps();
}

function updateFps() {
  const now = performance.now();
  fps = fps * 0.85 + (1000 / (now - lastFrameTime)) * 0.15;
  lastFrameTime = now;
  elements.fpsStatus.textContent = `FPS: ${Math.round(fps)}`;
}

elements.toggleCameraButton.addEventListener('click', toggleCamera);
boot();
