import { SIGN_LESSONS } from './curriculum.js';

const STORAGE_KEY = 'sign-language-tutor-progress-v1';
const NOTICE_VISIBLE_MS = 1700;

export class SignTutor {
  constructor(elements, lessons = SIGN_LESSONS) {
    this.elements = elements;
    this.lessons = lessons;
    this.currentLessonIndex = 0;
    this.currentStepIndex = 0;
    this.holdStartedAt = 0;
    this.holdKey = undefined;
    this.holdProgress = 0;
    this.notice = undefined;
    this.allComplete = false;
    this.lastEvaluation = {
      matched: false,
      hasHands: false,
      detail: '启动摄像头后，把手放入画面开始学习。',
    };

    this.restoreProgress();
    this.bindEvents();
    this.render();
  }

  update(hands, now = performance.now()) {
    if (this.allComplete || this.lessons.length === 0) {
      this.render(now);
      return;
    }

    const lesson = this.getCurrentLesson();
    const step = this.getCurrentStep();
    const stepKey = `${lesson.id}:${this.currentStepIndex}:${step.id}`;
    const evaluation = evaluateStep(step, hands);
    this.lastEvaluation = evaluation;

    if (!evaluation.matched) {
      this.resetHold();
      this.render(now);
      return;
    }

    if (this.holdKey !== stepKey) {
      this.holdKey = stepKey;
      this.holdStartedAt = now;
    }

    this.holdProgress = clamp((now - this.holdStartedAt) / step.holdMs, 0, 1);

    if (this.holdProgress >= 1) {
      this.completeCurrentStep(now);
    }

    this.render(now);
  }

  resetFrame() {
    this.resetHold();
    this.lastEvaluation = {
      matched: false,
      hasHands: false,
      detail: '摄像头已停止。重新启动后会继续当前课程。',
    };
    this.render();
  }

  bindEvents() {
    this.elements.lesson.restartButton.addEventListener('click', () => {
      this.currentStepIndex = 0;
      this.allComplete = false;
      this.resetHold();
      this.notice = {
        text: `已重新开始「${this.getCurrentLesson().title}」。`,
        until: performance.now() + NOTICE_VISIBLE_MS,
      };
      this.saveProgress();
      this.render();
    });

    this.elements.lesson.skipButton.addEventListener('click', () => {
      const now = performance.now();
      const lesson = this.getCurrentLesson();

      if (this.currentLessonIndex < this.lessons.length - 1) {
        this.currentLessonIndex += 1;
        this.currentStepIndex = 0;
        this.notice = {
          text: `已跳过「${lesson.title}」，进入「${this.getCurrentLesson().title}」。`,
          until: now + NOTICE_VISIBLE_MS,
        };
      } else {
        this.allComplete = true;
        this.notice = {
          text: '已完成全部课程，可以重新开始或自由练习。',
          until: now + NOTICE_VISIBLE_MS,
        };
      }

      this.resetHold();
      this.saveProgress();
      this.render(now);
    });

    this.elements.lesson.resetButton.addEventListener('click', () => {
      this.currentLessonIndex = 0;
      this.currentStepIndex = 0;
      this.allComplete = false;
      this.resetHold();
      this.notice = {
        text: '学习进度已清空，从第一个词语重新开始。',
        until: performance.now() + NOTICE_VISIBLE_MS,
      };
      this.saveProgress();
      this.render();
    });
  }

  completeCurrentStep(now) {
    const lesson = this.getCurrentLesson();
    this.currentStepIndex += 1;
    this.resetHold();

    if (this.currentStepIndex < lesson.steps.length) {
      this.notice = {
        text: `第 ${this.currentStepIndex} 步正确，继续下一步。`,
        until: now + 900,
      };
      return;
    }

    if (this.currentLessonIndex < this.lessons.length - 1) {
      const completedTitle = lesson.title;
      this.currentLessonIndex += 1;
      this.currentStepIndex = 0;
      this.notice = {
        text: `「${completedTitle}」学习正确，已自动进入「${this.getCurrentLesson().title}」。`,
        until: now + NOTICE_VISIBLE_MS,
      };
    } else {
      this.allComplete = true;
      this.notice = {
        text: '恭喜！你已经完成从词语到完整句的全部练习。',
        until: now + NOTICE_VISIBLE_MS,
      };
    }

    this.saveProgress();
  }

  getCurrentLesson() {
    return this.lessons[this.currentLessonIndex] ?? this.lessons.at(-1);
  }

  getCurrentStep() {
    const lesson = this.getCurrentLesson();
    return lesson.steps[this.currentStepIndex] ?? lesson.steps.at(-1);
  }

  resetHold() {
    this.holdStartedAt = 0;
    this.holdKey = undefined;
    this.holdProgress = 0;
  }

  restoreProgress() {
    const savedIndex = readSavedIndex();

    if (savedIndex >= this.lessons.length) {
      this.currentLessonIndex = Math.max(0, this.lessons.length - 1);
      this.allComplete = true;
      return;
    }

    this.currentLessonIndex = clamp(savedIndex, 0, Math.max(0, this.lessons.length - 1));
  }

  saveProgress() {
    const indexToSave = this.allComplete ? this.lessons.length : this.currentLessonIndex;

    try {
      localStorage.setItem(STORAGE_KEY, String(indexToSave));
    } catch (error) {
      void error;
    }
  }

  render(now = performance.now()) {
    if (this.lessons.length === 0) {
      return;
    }

    if (this.allComplete) {
      this.renderComplete(now);
      return;
    }

    const lesson = this.getCurrentLesson();
    const step = this.getCurrentStep();
    const lessonProgress = getOverallProgress(
      this.currentLessonIndex,
      this.currentStepIndex,
      this.holdProgress,
      lesson.steps.length,
      this.lessons.length,
    );

    this.elements.lesson.level.textContent = `${lesson.level} · ${lesson.difficulty}`;
    this.elements.lesson.progressLabel.textContent = `${this.currentLessonIndex + 1}/${
      this.lessons.length
    }`;
    this.elements.lesson.type.textContent = lesson.type;
    this.elements.lesson.title.textContent = lesson.title;
    this.elements.lesson.instruction.textContent = lesson.description;
    this.elements.lesson.currentStep.textContent = step.cue;
    this.elements.lesson.stepHint.textContent = step.hint;
    this.elements.lesson.progressFill.style.width = `${Math.round(lessonProgress * 100)}%`;
    this.elements.lesson.stepList.innerHTML = renderStepList(lesson.steps, this.currentStepIndex);
    this.renderFeedback(now);
  }

  renderComplete(now) {
    this.elements.lesson.level.textContent = '全部完成 · 自由表达';
    this.elements.lesson.progressLabel.textContent = `${this.lessons.length}/${this.lessons.length}`;
    this.elements.lesson.type.textContent = '完成';
    this.elements.lesson.title.textContent = '你已经完成全部课程';
    this.elements.lesson.instruction.textContent =
      '现在可以按自己的节奏复习任意词语，或重新开始课程提高稳定度。';
    this.elements.lesson.currentStep.textContent = '自由练习：尝试连贯表达一句完整的话';
    this.elements.lesson.stepHint.textContent = '建议复习“你好”“谢谢你”“我想学习手语”等短句。';
    this.elements.lesson.progressFill.style.width = '100%';
    this.elements.lesson.stepList.innerHTML = this.lessons
      .map((lesson) => `<li class="completed"><span>✓</span><b>${escapeHtml(lesson.title)}</b></li>`)
      .join('');
    this.elements.lesson.feedback.textContent =
      getVisibleNotice(this.notice, now) ?? '课程完成。点击“清空进度”可从头开始。';
    this.elements.lesson.feedback.classList.add('is-ok');
  }

  renderFeedback(now) {
    const visibleNotice = getVisibleNotice(this.notice, now);
    const feedback = this.elements.lesson.feedback;

    feedback.classList.toggle('is-ok', this.lastEvaluation.matched || Boolean(visibleNotice));
    feedback.textContent =
      visibleNotice ?? getEvaluationFeedback(this.lastEvaluation, this.holdProgress);
  }
}

function evaluateStep(step, hands) {
  if (hands.length === 0) {
    return {
      matched: false,
      hasHands: false,
      detail: '未检测到手部，请把手放入画面中央。',
    };
  }

  if (step.target.kind === 'number') {
    return evaluateNumberTarget(step.target.number, hands);
  }

  if (step.target.kind === 'twoHandNumbers') {
    return evaluateTwoHandTarget(step.target, hands);
  }

  return {
    matched: false,
    hasHands: true,
    detail: '当前课程目标暂不支持。',
  };
}

function evaluateNumberTarget(targetNumber, hands) {
  const matchedHand = hands.find((hand) => hand.gestureNumber === targetNumber);

  return {
    matched: Boolean(matchedHand),
    hasHands: true,
    detail: matchedHand
      ? `${matchedHand.handedness} 已识别为数字 ${targetNumber}。`
      : `当前识别：${describeHands(hands)}；目标：数字 ${targetNumber}。`,
  };
}

function evaluateTwoHandTarget(target, hands) {
  const leftHand = getHandBySide(hands, 'Left');
  const rightHand = getHandBySide(hands, 'Right');
  const leftMatched = leftHand?.gestureNumber === target.leftNumber;
  const rightMatched = rightHand?.gestureNumber === target.rightNumber;

  return {
    matched: Boolean(leftMatched && rightMatched),
    hasHands: true,
    detail:
      leftMatched && rightMatched
        ? `双手匹配：左侧 ${target.leftNumber}，右侧 ${target.rightNumber}。`
        : `目标：左侧 ${target.leftNumber} / 右侧 ${target.rightNumber}；当前：左侧 ${formatHandNumber(
            leftHand,
          )} / 右侧 ${formatHandNumber(rightHand)}。`,
  };
}

function getHandBySide(hands, side) {
  return hands
    .filter((hand) => (hand.stableSide ?? hand.rawHandedness) === side)
    .sort((firstHand, secondHand) => secondHand.confidence - firstHand.confidence)[0];
}

function describeHands(hands) {
  return hands
    .map((hand) => `${hand.handedness} 数字 ${formatNumber(hand.gestureNumber)}`)
    .join('，');
}

function formatHandNumber(hand) {
  return hand ? formatNumber(hand.gestureNumber) : '未检测';
}

function formatNumber(number) {
  return number === null || number === undefined ? '--' : String(number);
}

function getEvaluationFeedback(evaluation, holdProgress) {
  if (!evaluation.hasHands) {
    return evaluation.detail;
  }

  if (evaluation.matched) {
    return `识别正确，保持当前手型：${Math.round(holdProgress * 100)}%。`;
  }

  return evaluation.detail;
}

function renderStepList(steps, currentStepIndex) {
  return steps
    .map((step, index) => {
      const className =
        index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'current' : '';

      return `
        <li class="${className}">
          <span>${index + 1}</span>
          <b>${escapeHtml(step.cue)}</b>
          <small>${escapeHtml(step.hint)}</small>
        </li>
      `;
    })
    .join('');
}

function getOverallProgress(
  currentLessonIndex,
  currentStepIndex,
  holdProgress,
  currentLessonStepCount,
  lessonCount,
) {
  const currentLessonProgress = (currentStepIndex + holdProgress) / currentLessonStepCount;
  return clamp((currentLessonIndex + currentLessonProgress) / lessonCount, 0, 1);
}

function getVisibleNotice(notice, now) {
  return notice && now < notice.until ? notice.text : undefined;
}

function readSavedIndex() {
  try {
    return Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0;
  } catch (error) {
    void error;
    return 0;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}
