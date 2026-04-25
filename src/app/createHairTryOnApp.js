import { createHairStyleSelector } from '../components/HairStyleSelector.js';
import { startCamera } from '../core/camera.js';
import { createFaceLandmarker } from '../core/faceLandmarker.js';
import { getHairPose, smoothPose } from '../core/pose.js';
import { hairStyles } from '../data/hairStyles.js';
import { eraseOriginalHair } from '../renderers/originalHairEraser.js';
import { createHairRenderer } from '../renderers/hairRenderer.js';
import { drawPrivacyAvatar } from '../renderers/privacyAvatarRenderer.js';
import { drawDebug, drawMirroredVideo } from '../renderers/videoRenderer.js';

const RENDER_INTERVAL_MS = 1000 / 30;
const DETECTION_INTERVAL_MS = 1000 / 18;

export function createHairTryOnApp(elements) {
  const context = elements.canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  });
  const hairRenderer = createHairRenderer(hairStyles);
  let currentStyle = hairStyles[0];
  let faceLandmarker;
  let running = false;
  let lastVideoTime = -1;
  let lastRenderTime = 0;
  let lastDetectionTime = 0;
  let smoothedPose = null;
  let lastPoseTime = 0;
  let currentStatus = '';

  createHairStyleSelector({
    container: elements.styleButtons,
    styles: hairStyles,
    selectedStyleId: currentStyle.id,
    onSelect: (nextStyle) => {
      currentStyle = nextStyle;
    }
  });

  return {
    mount() {
      elements.startButton.addEventListener('click', start);
    }
  };

  async function start() {
    if (running) return;

    elements.startButton.disabled = true;

    try {
      setStatus('正在初始化 3D 发束素材...');
      await hairRenderer.loadAssets();
      setStatus('正在加载人脸检测模型...');
      faceLandmarker = faceLandmarker || (await createFaceLandmarker());
      setStatus('正在请求摄像头权限...');
      await startCamera(elements.video, elements.canvas);
      running = true;
      elements.emptyState.classList.add('is-hidden');
      elements.startButton.textContent = '摄像头运行中';
      setStatus('检测中：请把脸放在画面中央');
      requestAnimationFrame(renderLoop);
    } catch (error) {
      console.error(error);
      elements.startButton.disabled = false;
      elements.startButton.textContent = '重新开启摄像头';
      setStatus(`启动失败：${error.message || '请检查浏览器摄像头权限或素材加载状态'}`);
    }
  }

  function renderLoop(now) {
    if (!running) return;
    requestAnimationFrame(renderLoop);

    if (lastRenderTime > 0 && now - lastRenderTime < RENDER_INTERVAL_MS) return;

    lastRenderTime = now;
    drawMirroredVideo(context, elements.video, elements.canvas);
    updatePose(now);
    drawEffects(now);
  }

  function updatePose(now) {
    if (now - lastDetectionTime < DETECTION_INTERVAL_MS) return;
    if (elements.video.currentTime === lastVideoTime) return;

    lastDetectionTime = now;
    lastVideoTime = elements.video.currentTime;
    const result = faceLandmarker.detectForVideo(elements.video, now);
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks) return;

    const nextPose = getHairPose(landmarks, elements.canvas);
    smoothedPose = smoothPose(smoothedPose, nextPose);
    lastPoseTime = now;
    const privacyStatus = elements.privacyToggle.checked ? '隐私贴图开启，' : '';
    setStatus(`已锁定人脸：${privacyStatus}正在预览「${currentStyle.name}」`);
  }

  function drawEffects(now) {
    if (!smoothedPose || now - lastPoseTime >= 450) {
      setStatus('未检测到人脸：请正脸看向摄像头');
      return;
    }

    const fade = Math.min(1, Math.max(0, 1 - (now - lastPoseTime - 260) / 190));

    if (elements.eraseHairToggle.checked) {
      eraseOriginalHair(context, smoothedPose, {
        fade,
        strength: Number(elements.eraseHairStrengthInput.value),
        now
      });
    }

    if (elements.privacyToggle.checked) {
      drawPrivacyAvatar(context, smoothedPose, {
        fade,
        scale: Number(elements.privacyScaleInput.value)
      });
    }

    hairRenderer.draw(context, smoothedPose, currentStyle, {
      color: elements.colorInput.value,
      opacity: Number(elements.opacityInput.value),
      fade,
      depthEnabled: elements.depthToggle.checked
    });

    if (elements.debugToggle.checked) {
      drawDebug(context, smoothedPose);
    }
  }

  function setStatus(message) {
    if (message === currentStatus) return;
    currentStatus = message;
    elements.status.textContent = message;
  }
}
