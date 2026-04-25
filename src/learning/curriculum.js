const HOLD_SHORT_MS = 950;
const HOLD_MEDIUM_MS = 1150;
const HOLD_LONG_MS = 1350;

function numberStep(number, cue, hint, holdMs = HOLD_MEDIUM_MS) {
  const gestureNumber = Number(number);

  return {
    id: `number-${gestureNumber}`,
    cue,
    hint,
    holdMs,
    target: {
      kind: 'number',
      number: gestureNumber,
    },
  };
}

function twoHandStep(leftNumber, rightNumber, cue, hint, holdMs = HOLD_LONG_MS) {
  const leftGestureNumber = Number(leftNumber);
  const rightGestureNumber = Number(rightNumber);

  return {
    id: `two-hand-${leftGestureNumber}-${rightGestureNumber}`,
    cue,
    hint,
    holdMs,
    target: {
      kind: 'twoHandNumbers',
      leftNumber: leftGestureNumber,
      rightNumber: rightGestureNumber,
    },
  };
}

export const SIGN_LESSONS = [
  {
    id: 'word-me',
    level: '入门 1',
    type: '词语',
    title: '我',
    difficulty: '单手 · 1 步',
    description: '先练一个稳定手型：伸出食指，其余手指自然收起，保持到进度条走满。',
    steps: [
      numberStep('1', '伸出食指，做出数字 1 手型', '目标：单手数字 1，稳定保持约 1 秒。', HOLD_SHORT_MS),
    ],
  },
  {
    id: 'word-you',
    level: '入门 2',
    type: '词语',
    title: '你',
    difficulty: '单手 · 1 步',
    description: '练习双指手型：食指和中指伸直，其余手指收起。',
    steps: [
      numberStep('2', '伸出食指和中指，做出数字 2 手型', '目标：单手数字 2。', HOLD_SHORT_MS),
    ],
  },
  {
    id: 'word-good',
    level: '入门 3',
    type: '词语',
    title: '好',
    difficulty: '单手 · 1 步',
    description: '练习张开手掌：五指尽量伸直，让摄像头看清每个指尖。',
    steps: [
      numberStep('5', '张开手掌，做出数字 5 手型', '目标：单手数字 5。', HOLD_SHORT_MS),
    ],
  },
  {
    id: 'word-thanks',
    level: '入门 4',
    type: '词语',
    title: '谢谢',
    difficulty: '单手 · 1 步',
    description: '练习收拢手型：从张开手掌过渡到握拳，让系统识别到数字 10。',
    steps: [
      numberStep('10', '收起五指，做出握拳 / 数字 10 手型', '目标：单手数字 10。', HOLD_SHORT_MS),
    ],
  },
  {
    id: 'phrase-i-good',
    level: '基础组合 1',
    type: '词组',
    title: '我好',
    difficulty: '单手 · 2 步',
    description: '把两个已学词语串起来：先“我”，再“好”。完成第一步后会自动进入第二步。',
    steps: [
      numberStep('1', '第 1 步：数字 1，表示“我”', '先稳定识别数字 1。'),
      numberStep('5', '第 2 步：数字 5，表示“好”', '切换到张开手掌，稳定识别数字 5。'),
    ],
  },
  {
    id: 'phrase-you-good',
    level: '基础组合 2',
    type: '词组',
    title: '你好',
    difficulty: '单手 · 2 步',
    description: '练习从“你”过渡到“好”，重点是切换手型时不要离开画面。',
    steps: [
      numberStep('2', '第 1 步：数字 2，表示“你”', '先稳定识别数字 2。'),
      numberStep('5', '第 2 步：数字 5，表示“好”', '再张开手掌，稳定识别数字 5。'),
    ],
  },
  {
    id: 'phrase-thanks-you',
    level: '基础组合 3',
    type: '词组',
    title: '谢谢你',
    difficulty: '单手 · 2 步',
    description: '练习一个常用表达：先做“谢谢”的收拢手型，再切换到“你”的双指手型。',
    steps: [
      numberStep('10', '第 1 步：数字 10，表示“谢谢”的收势', '握拳并保持。'),
      numberStep('2', '第 2 步：数字 2，表示“你”', '切换成双指手型。'),
    ],
  },
  {
    id: 'sentence-i-can-sign',
    level: '进阶短句 1',
    type: '短句',
    title: '我会手语',
    difficulty: '单手到双手 · 3 步',
    description: '短句开始加入双手同步：先完成两个单手词，再用双手张开表示“手语”。',
    steps: [
      numberStep('1', '第 1 步：数字 1，表示“我”', '单手数字 1。'),
      numberStep('5', '第 2 步：数字 5，表示“会 / 可以”', '单手张开。'),
      twoHandStep('5', '5', '第 3 步：双手都张开，表示“手语”', '画面左侧和右侧都识别到数字 5。'),
    ],
  },
  {
    id: 'sentence-i-learn-sign',
    level: '进阶短句 2',
    type: '短句',
    title: '我想学习手语',
    difficulty: '节奏切换 · 4 步',
    description: '练习更长的表达：保持每个词语的节奏，系统会按顺序校验每一步。',
    steps: [
      numberStep('1', '第 1 步：数字 1，表示“我”', '保持数字 1。'),
      numberStep('10', '第 2 步：数字 10，表示“想”的收拢动作', '握拳并保持。'),
      numberStep('3', '第 3 步：数字 3，表示“学习”的手型训练', '伸出三指。'),
      twoHandStep('5', '5', '第 4 步：双手数字 5，表示“手语”', '双手张开，左右两侧都要被识别。'),
    ],
  },
  {
    id: 'sentence-help-me',
    level: '完整表达',
    type: '句子',
    title: '你可以帮我吗',
    difficulty: '完整句 · 5 步',
    description: '最终关卡：单手词语、双手组合和收尾动作连续完成，训练完整句表达。',
    steps: [
      numberStep('2', '第 1 步：数字 2，表示“你”', '双指手型。'),
      numberStep('5', '第 2 步：数字 5，表示“可以”', '张开手掌。'),
      twoHandStep('5', '10', '第 3 步：左侧张开、右侧握拳，表示“帮”', '画面左侧数字 5，画面右侧数字 10。'),
      numberStep('1', '第 4 步：数字 1，表示“我”', '伸出食指。'),
      numberStep('10', '第 5 步：数字 10，表示疑问收尾', '握拳保持，完成整句话。'),
    ],
  },
];
