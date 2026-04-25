import { GestureEffects } from './effects.js';

export class GestureEffectController {
  constructor(effectLayer) {
    this.pendingGestureEffect = undefined;
    this.lastEffectSignature = undefined;
    this.lastEffectTime = 0;

    try {
      this.gestureEffects = new GestureEffects(effectLayer);
    } catch (error) {
      console.warn('Three.js gesture effects disabled:', error);
      this.gestureEffects = undefined;
    }
  }

  update(hands) {
    if (!this.gestureEffects) {
      return;
    }

    const candidate = getGestureEffectCandidate(hands);
    const now = performance.now();

    if (!candidate) {
      this.pendingGestureEffect = undefined;
      return;
    }

    if (candidate.signature !== this.pendingGestureEffect?.signature) {
      this.pendingGestureEffect = {
        ...candidate,
        startedAt: now,
      };
      return;
    }

    const stableEnough = now - this.pendingGestureEffect.startedAt > 320;
    const cooldownFinished =
      candidate.signature !== this.lastEffectSignature || now - this.lastEffectTime > 2200;

    if (stableEnough && cooldownFinished) {
      this.gestureEffects.trigger(candidate.number, candidate.screenPosition);
      this.lastEffectSignature = candidate.signature;
      this.lastEffectTime = now;
    }
  }

  reset() {
    this.pendingGestureEffect = undefined;
    this.lastEffectSignature = undefined;
    this.lastEffectTime = 0;
  }
}

function getGestureEffectCandidate(hands) {
  const numberedHands = hands
    .filter((hand) => hand.gestureNumber !== null)
    .sort((firstHand, secondHand) => {
      if (firstHand.gestureNumber === 10 && secondHand.gestureNumber !== 10) {
        return -1;
      }
      if (firstHand.gestureNumber !== 10 && secondHand.gestureNumber === 10) {
        return 1;
      }

      return secondHand.confidence - firstHand.confidence;
    });

  const hand = numberedHands[0];

  if (!hand) {
    return null;
  }

  return {
    number: hand.gestureNumber,
    screenPosition: hand.screenPosition,
    signature: `${hand.rawHandedness}-${hand.gestureNumber}`,
  };
}
