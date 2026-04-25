export function resizeCanvasToVideo(canvas, video) {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}

export function renderHandLandmarks({
  canvasContext,
  drawingUtils,
  handConnections,
  results,
}) {
  canvasContext.save();
  canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);

  for (const landmarks of results.landmarks ?? []) {
    drawingUtils.drawConnectors(landmarks, handConnections, {
      color: '#22c55e',
      lineWidth: 4,
    });
    drawingUtils.drawLandmarks(landmarks, {
      color: '#f97316',
      radius: 4,
    });
  }

  canvasContext.restore();
}

export function clearCanvas(canvasContext) {
  canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
}
