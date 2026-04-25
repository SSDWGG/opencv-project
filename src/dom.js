export function getDomElements() {
  const canvas = document.querySelector('#overlay');

  return {
    video: document.querySelector('#webcam'),
    canvas,
    canvasContext: canvas.getContext('2d'),
    toggleCameraButton: document.querySelector('#toggleCamera'),
    modelStatus: document.querySelector('#modelStatus'),
    cameraStatus: document.querySelector('#cameraStatus'),
    fpsStatus: document.querySelector('#fpsStatus'),
    summaryLabel: document.querySelector('#summaryLabel'),
    totalCount: document.querySelector('#totalCount'),
    globalState: document.querySelector('#globalState'),
    handResults: document.querySelector('#handResults'),
    emptyHint: document.querySelector('#emptyHint'),
    effectLayer: document.querySelector('#effectLayer'),
    faceOverlay: document.querySelector('#faceOverlay'),
    faceEmoji: document.querySelector('#faceEmoji'),
    faceExpressionName: document.querySelector('#faceExpressionName'),
    faceExpressionDetail: document.querySelector('#faceExpressionDetail'),
    sideSlots: {
      Left: {
        value: document.querySelector('#leftHandValue'),
        detail: document.querySelector('#leftHandDetail'),
      },
      Right: {
        value: document.querySelector('#rightHandValue'),
        detail: document.querySelector('#rightHandDetail'),
      },
    },
  };
}
