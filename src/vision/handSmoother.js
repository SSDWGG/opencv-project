import { fingerDefinitions, getHandState } from './handAnalyzer.js';

const SIDE_ORDER = ['Left', 'Right'];

export class HandSmoother {
  constructor({ maxHistory = 6, maxMissingMs = 260 } = {}) {
    this.maxHistory = maxHistory;
    this.maxMissingMs = maxMissingMs;
    this.tracks = new Map();
  }

  update(hands) {
    const now = performance.now();

    if (hands.length === 0) {
      this.reset();
      return [];
    }

    const assignedHands = assignHandsToScreenSides(hands);

    for (const hand of assignedHands) {
      const track = this.getTrack(hand.stableSide);
      track.history.push(hand);
      track.history = track.history.slice(-this.maxHistory);
      track.lastSeen = now;
    }

    return SIDE_ORDER.map((side) => this.getSmoothedHand(side, now))
      .filter(Boolean)
      .sort((firstHand, secondHand) => firstHand.screenPosition.x - secondHand.screenPosition.x);
  }

  reset() {
    this.tracks.clear();
  }

  getTrack(side) {
    if (!this.tracks.has(side)) {
      this.tracks.set(side, {
        history: [],
        lastSeen: 0,
      });
    }

    return this.tracks.get(side);
  }

  getSmoothedHand(side, now) {
    const track = this.tracks.get(side);

    if (!track || track.history.length === 0 || now - track.lastSeen > this.maxMissingMs) {
      return null;
    }

    const latestHand = track.history.at(-1);
    const stableCount = mode(track.history.map((hand) => hand.count)) ?? latestHand.count;
    const stableGestureNumber =
      mode(track.history.map((hand) => hand.gestureNumber).filter((number) => number !== null)) ??
      latestHand.gestureNumber;
    const fingerStates = smoothFingerStates(track.history);
    const isTemporarilyHeld = now - track.lastSeen > 80;

    return {
      ...latestHand,
      stableSide: side,
      rawHandedness: side,
      handedness: side === 'Left' ? '左侧手' : '右侧手',
      count: stableCount,
      gestureNumber: stableGestureNumber,
      state: getHandState(stableCount),
      fingerStates,
      isTemporarilyHeld,
    };
  }
}

function assignHandsToScreenSides(hands) {
  if (hands.length >= 2) {
    return [...hands]
      .sort((firstHand, secondHand) => firstHand.screenPosition.x - secondHand.screenPosition.x)
      .slice(0, 2)
      .map((hand, index) => ({
        ...hand,
        stableSide: SIDE_ORDER[index],
        handedness: index === 0 ? '左侧手' : '右侧手',
      }));
  }

  const hand = hands[0];
  const detectedSide = SIDE_ORDER.includes(hand.rawHandedness) ? hand.rawHandedness : null;
  const stableSide =
    hand.stableSide ??
    detectedSide ??
    (hand.screenPosition.x < window.innerWidth / 2 ? 'Left' : 'Right');

  return [
    {
      ...hand,
      stableSide,
    },
  ];
}

function smoothFingerStates(history) {
  return fingerDefinitions.map((definition) => {
    const latestFinger =
      history.at(-1).fingerStates.find((finger) => finger.key === definition.key) ?? definition;
    const extendedVotes = history.filter((hand) =>
      hand.fingerStates.find((finger) => finger.key === definition.key)?.extended,
    ).length;

    return {
      ...latestFinger,
      extended: extendedVotes >= Math.ceil(history.length / 2),
    };
  });
}

function mode(values) {
  if (values.length === 0) {
    return null;
  }

  const counts = new Map();
  let bestValue = values.at(-1);
  let bestCount = 0;

  for (const value of values) {
    const nextCount = (counts.get(value) ?? 0) + 1;
    counts.set(value, nextCount);

    if (nextCount >= bestCount) {
      bestValue = value;
      bestCount = nextCount;
    }
  }

  return bestValue;
}
