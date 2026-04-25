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
    lesson: {
      level: document.querySelector('#lessonLevel'),
      progressLabel: document.querySelector('#lessonProgressLabel'),
      type: document.querySelector('#lessonType'),
      title: document.querySelector('#lessonTitle'),
      instruction: document.querySelector('#lessonInstruction'),
      currentStep: document.querySelector('#lessonCurrentStep'),
      stepHint: document.querySelector('#lessonStepHint'),
      stepList: document.querySelector('#lessonStepList'),
      progressFill: document.querySelector('#lessonProgressFill'),
      feedback: document.querySelector('#lessonFeedback'),
      restartButton: document.querySelector('#restartLesson'),
      skipButton: document.querySelector('#skipLesson'),
      resetButton: document.querySelector('#resetLessons'),
    },
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
