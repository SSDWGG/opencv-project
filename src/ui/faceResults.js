export function renderFaceExpression(elements, expression) {
  elements.faceEmoji.textContent = expression.emoji;
  elements.faceExpressionName.textContent = expression.label;
  elements.faceExpressionDetail.textContent = expression.detected
    ? `表情置信度：${Math.round(expression.confidence * 100)}%`
    : '请将人脸放入画面';

  if (!expression.detected || !expression.overlayPosition) {
    elements.faceOverlay.hidden = true;
    return;
  }

  elements.faceOverlay.hidden = false;
  elements.faceOverlay.textContent = expression.emoji;
  elements.faceOverlay.style.left = `${expression.overlayPosition.xPercent}%`;
  elements.faceOverlay.style.top = `${expression.overlayPosition.yPercent}%`;
  elements.faceOverlay.style.fontSize = `${expression.overlayPosition.size}px`;
}
