export async function startCamera(video, canvas) {
  const stream = await getCameraStream();

  video.srcObject = stream;
  await video.play();
  resizeCanvasToVideo(canvas, video);
}

async function getCameraStream() {
  const performanceConstraints = {
    facingMode: 'user',
    width: { ideal: 960, max: 960 },
    height: { ideal: 540, max: 540 },
    frameRate: { ideal: 24, max: 30 }
  };
  const fallbackConstraints = {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 360 },
    frameRate: { ideal: 24, max: 30 }
  };

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: performanceConstraints,
      audio: false
    });
  } catch (error) {
    if (error.name !== 'OverconstrainedError' && error.name !== 'ConstraintNotSatisfiedError') {
      throw error;
    }

    return navigator.mediaDevices.getUserMedia({
      video: fallbackConstraints,
      audio: false
    });
  }
}

function resizeCanvasToVideo(canvas, video) {
  const sourceWidth = video.videoWidth || 960;
  const sourceHeight = video.videoHeight || 540;
  const maxCanvasWidth = 960;
  const scale = Math.min(1, maxCanvasWidth / sourceWidth);

  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
}
