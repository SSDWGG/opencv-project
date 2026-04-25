import { formatGestureNumber, getGestureName } from '../vision/handAnalyzer.js';

export function renderHandResults(elements, hands) {
  const summary = getSummary(hands);
  elements.summaryLabel.textContent = summary.label;
  elements.totalCount.textContent = summary.value;
  elements.globalState.textContent = summary.detail;
  renderSideSlots(elements.sideSlots, hands);

  if (hands.length === 0) {
    elements.handResults.innerHTML = `
      <div class="placeholder">
        未检测到手部，请把手掌放入画面。
      </div>
    `;
    return;
  }

  elements.handResults.innerHTML = sortHandsForDisplay(hands)
    .map(
      (hand, index) => `
        <article class="hand-card">
          <div class="hand-card__head">
            <div>
              <span class="hand-card__label">第 ${index + 1} 只手</span>
              <h3>${hand.handedness}</h3>
            </div>
            <strong>${formatGestureNumber(hand.gestureNumber)}</strong>
          </div>
          <div class="metric-grid">
            <span>
              <small>单手数字</small>
              <b>${formatGestureNumber(hand.gestureNumber)}</b>
            </span>
            <span>
              <small>伸出手指</small>
              <b>${hand.count} 指</b>
            </span>
          </div>
          <div class="state-row">
            <span class="state-pill">${hand.state}</span>
            <span class="gesture-pill">${getGestureName(hand.gestureNumber)}</span>
          </div>
          <div class="finger-list">
            ${hand.fingerStates
              .map(
                (finger) => `
                  <span class="${finger.extended ? 'active' : ''}" title="${finger.name}">
                    ${finger.shortName}
                  </span>
                `,
              )
              .join('')}
          </div>
          <small>置信度：${Math.round(hand.confidence * 100)}%</small>
        </article>
      `,
    )
    .join('');
}

function getSummary(hands) {
  if (hands.length === 0) {
    return {
      label: '实时识别',
      value: '--',
      detail: '等待检测',
    };
  }

  if (hands.length === 1) {
    const hand = hands[0];
    const value = hand.gestureNumber ?? hand.count;

    return {
      label: '当前手势',
      value: String(value),
      detail: `${hand.handedness} · ${
        hand.gestureNumber === null ? '按伸出手指数显示' : '单手数字手势'
      }`,
    };
  }

  const total = hands.reduce((sum, hand) => sum + hand.count, 0);
  const leftHand = getBestHandBySide(hands, 'Left');
  const rightHand = getBestHandBySide(hands, 'Right');
  const detail = [
    leftHand ? `左侧 ${leftHand.count}` : '左侧未检出',
    rightHand ? `右侧 ${rightHand.count}` : '右侧未检出',
  ].join(' + ');

  return {
    label: '双手合计',
    value: String(total),
    detail,
  };
}

function renderSideSlots(sideSlots, hands) {
  renderSideSlot(sideSlots.Left, getBestHandBySide(hands, 'Left'));
  renderSideSlot(sideSlots.Right, getBestHandBySide(hands, 'Right'));
}

function renderSideSlot(slot, hand) {
  if (!hand) {
    slot.value.textContent = '未检测';
    slot.detail.textContent = '--';
    return;
  }

  slot.value.textContent = `数字 ${formatGestureNumber(hand.gestureNumber)}`;
  const trackingText = hand.isTemporarilyHeld ? ' · 短暂保持' : '';
  slot.detail.textContent = `${hand.count} 指 · ${hand.state} · ${Math.round(
    hand.confidence * 100,
  )}%${trackingText}`;
}

function getBestHandBySide(hands, side) {
  return hands
    .filter((hand) => (hand.stableSide ?? hand.rawHandedness) === side)
    .sort((firstHand, secondHand) => secondHand.confidence - firstHand.confidence)[0];
}

function sortHandsForDisplay(hands) {
  const sideOrder = {
    Left: 0,
    Right: 1,
  };

  return [...hands].sort(
    (firstHand, secondHand) =>
      (sideOrder[firstHand.stableSide ?? firstHand.rawHandedness] ?? 2) -
        (sideOrder[secondHand.stableSide ?? secondHand.rawHandedness] ?? 2) ||
      secondHand.confidence - firstHand.confidence,
  );
}
