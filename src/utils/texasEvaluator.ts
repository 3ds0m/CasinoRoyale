import type { Card } from './deck';

export type TexasHandRank =
  | 'High Card'
  | 'One Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export interface TexasEvaluation {
  rank: TexasHandRank;
  score: number;
  description: string;
  best5Cards: Card[];
}

// Generate all 5-card combinations out of 7 cards (7 choose 5 = 21 combinations)
export const get5CardCombinations = (cards7: Card[]): Card[][] => {
  const result: Card[][] = [];
  const n = cards7.length;

  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            result.push([cards7[i], cards7[j], cards7[k], cards7[l], cards7[m]]);
          }
        }
      }
    }
  }
  return result;
};

// Evaluate exactly 5 cards
export const evaluateExact5Cards = (cards5: Card[]): TexasEvaluation => {
  // Sort descending by numericValue (Ace = 14)
  const sorted = [...cards5].sort((a, b) => b.numericValue - a.numericValue);
  const values = sorted.map(c => c.numericValue);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check Straight
  let isStraight = false;
  let straightHigh = 0;

  const uniqueVals = Array.from(new Set(values));

  if (uniqueVals.length === 5) {
    if (uniqueVals[0] - uniqueVals[4] === 4) {
      isStraight = true;
      straightHigh = uniqueVals[0];
    } else if (uniqueVals[0] === 14 && uniqueVals[1] === 5 && uniqueVals[2] === 4 && uniqueVals[3] === 3 && uniqueVals[4] === 2) {
      // Ace-2-3-4-5 straight
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Value frequencies
  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;

  const freqEntries = Object.entries(counts).map(([v, count]) => ({
    val: parseInt(v, 10),
    count,
  })).sort((a, b) => b.count - a.count || b.val - a.val);

  // 1. Royal Flush / Straight Flush
  if (isStraight && isFlush) {
    if (straightHigh === 14) {
      return { rank: 'Royal Flush', score: 10000000, description: 'Flor Imperial (Royal Flush)', best5Cards: sorted };
    }
    return { rank: 'Straight Flush', score: 9000000 + straightHigh, description: `Escalera de Color al ${straightHigh}`, best5Cards: sorted };
  }

  // 2. Four of a Kind
  if (freqEntries[0].count === 4) {
    const quadVal = freqEntries[0].val;
    const kicker = freqEntries[1].val;
    return { rank: 'Four of a Kind', score: 8000000 + quadVal * 20 + kicker, description: `Póquer de ${quadVal}s`, best5Cards: sorted };
  }

  // 3. Full House
  if (freqEntries[0].count === 3 && freqEntries[1]?.count >= 2) {
    const tripVal = freqEntries[0].val;
    const pairVal = freqEntries[1].val;
    return { rank: 'Full House', score: 7000000 + tripVal * 20 + pairVal, description: `Full House de ${tripVal}s y ${pairVal}s`, best5Cards: sorted };
  }

  // 4. Flush
  if (isFlush) {
    const score = 6000000 + values[0] * 8000 + values[1] * 400 + values[2] * 20 + values[3];
    return { rank: 'Flush', score, description: `Color al ${values[0]}`, best5Cards: sorted };
  }

  // 5. Straight
  if (isStraight) {
    return { rank: 'Straight', score: 5000000 + straightHigh, description: `Escalera al ${straightHigh}`, best5Cards: sorted };
  }

  // 6. Three of a Kind
  if (freqEntries[0].count === 3) {
    const tripVal = freqEntries[0].val;
    const k1 = freqEntries[1].val;
    const k2 = freqEntries[2].val;
    return { rank: 'Three of a Kind', score: 4000000 + tripVal * 400 + k1 * 20 + k2, description: `Tercia de ${tripVal}s`, best5Cards: sorted };
  }

  // 7. Two Pair
  if (freqEntries[0].count === 2 && freqEntries[1]?.count === 2) {
    const p1 = freqEntries[0].val;
    const p2 = freqEntries[1].val;
    const kicker = freqEntries[2].val;
    return { rank: 'Two Pair', score: 3000000 + p1 * 400 + p2 * 20 + kicker, description: `Doble Pareja de ${p1}s y ${p2}s`, best5Cards: sorted };
  }

  // 8. One Pair
  if (freqEntries[0].count === 2) {
    const pairVal = freqEntries[0].val;
    const k1 = freqEntries[1].val;
    const k2 = freqEntries[2].val;
    const k3 = freqEntries[3].val;
    return { rank: 'One Pair', score: 2000000 + pairVal * 8000 + k1 * 400 + k2 * 20 + k3, description: `Par de ${pairVal}s`, best5Cards: sorted };
  }

  // 9. High Card
  const score = values[0] * 8000 + values[1] * 400 + values[2] * 20 + values[3];
  return { rank: 'High Card', score, description: `Carta Alta ${values[0]}`, best5Cards: sorted };
};

/**
 * Evaluates best 5-card hand from up to 7 cards
 */
export const evaluateTexas7Cards = (cards: Card[]): TexasEvaluation => {
  if (cards.length < 5) throw new Error("At least 5 cards required for evaluation.");

  if (cards.length === 5) return evaluateExact5Cards(cards);

  const combos = get5CardCombinations(cards);
  let bestEval: TexasEvaluation = evaluateExact5Cards(combos[0]);

  for (let i = 1; i < combos.length; i++) {
    const ev = evaluateExact5Cards(combos[i]);
    if (ev.score > bestEval.score) {
      bestEval = ev;
    }
  }

  return bestEval;
};
