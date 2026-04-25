export function drawMirroredVideo(context, video, canvas) {
  context.setTransform(-1, 0, 0, 1, canvas.width, 0);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.setTransform(1, 0, 0, 1, 0, 0);
}

export function drawDebug(context, pose) {
  context.save();
  context.fillStyle = '#49f2ff';

  for (const landmarkIndex of [10, 33, 127, 152, 263, 356]) {
    const point = pose.points[landmarkIndex];
    if (!point) continue;

    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(pose.centerX, pose.foreheadY, 7, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
