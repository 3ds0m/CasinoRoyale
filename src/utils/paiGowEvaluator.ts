import type { Card } from './deck';

export interface PaiGow5CardEvaluation {
  rankScore: number; // Higher is better
  rankName: string;
}

export interface PaiGow2CardEvaluation {
  rankScore: number;
  rankName: string;
}

// Get value of card for 2-card hand evaluation
export const get2CardValue = (card: Card): number => {
  if (card.code === 'JKR') return 14; // Joker acts as Ace
  return card.numericValue;
};

// Evaluate 2-card hand
export const evaluate2CardHand = (cards: Card[]): PaiGow2CardEvaluation => {
  if (cards.length !== 2) throw new Error("2-card hand must contain exactly 2 cards.");

  const v0 = get2CardValue(cards[0]);
  const v1 = get2CardValue(cards[1]);

  const high = Math.max(v0, v1);
  const low = Math.min(v0, v1);

  if (v0 === v1) {
    return {
      rankScore: 1000 + v0,
      rankName: `Par de ${v0 === 14 ? 'Ases' : v0}`,
    };
  }

  return {
    rankScore: high * 20 + low,
    rankName: `Carta Alta ${high === 14 ? 'As' : high}`,
  };
};

// Evaluate 5-card hand
export const evaluate5CardHand = (cards: Card[]): PaiGow5CardEvaluation => {
  if (cards.length !== 5) throw new Error("5-card hand must contain exactly 5 cards.");

  // Check Joker
  const hasJoker = cards.some(c => c.code === 'JKR');
  const normalCards = cards.filter(c => c.code !== 'JKR');
  
  // Sort descending
  const sorted = [...cards].sort((a, b) => get2CardValue(b) - get2CardValue(a));
  const values = sorted.map(c => get2CardValue(c));

  // Count frequencies
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }

  const freqEntries = Object.entries(counts).map(([v, count]) => ({
    val: parseInt(v, 10),
    count,
  })).sort((a, b) => b.count - a.count || b.val - a.val);

  // Five Aces (4 Aces + Joker)
  if (hasJoker && counts[14] === 4) {
    return { rankScore: 9000000, rankName: 'Cinco Ases' };
  }

  // Check Flush
  let isFlush = false;
  if (!hasJoker) {
    isFlush = cards.every(c => c.suit === cards[0].suit);
  } else {
    // With joker, check if all 4 normal cards have same suit
    const suit = normalCards[0].suit;
    isFlush = normalCards.every(c => c.suit === suit);
  }

  // Check Straight
  let isStraight = false;
  let straightHigh = 0;

  // Distinct values
  const uniqueVals = Array.from(new Set(values)).sort((a, b) => b - a);

  if (uniqueVals.length === 5) {
    if (uniqueVals[0] - uniqueVals[4] === 4) {
      isStraight = true;
      straightHigh = uniqueVals[0];
    } else if (uniqueVals[0] === 14 && uniqueVals[1] === 5 && uniqueVals[2] === 4 && uniqueVals[3] === 3 && uniqueVals[4] === 2) {
      // Ace-2-3-4-5 straight
      isStraight = true;
      straightHigh = 5;
    }
  } else if (hasJoker && uniqueVals.length === 4) {
    // Joker can complete straight
    const diff = uniqueVals[0] - uniqueVals[3];
    if (diff <= 4) {
      isStraight = true;
      straightHigh = uniqueVals[0];
    }
  }

  // Royal Flush / Straight Flush
  if (isStraight && isFlush) {
    if (straightHigh === 14) return { rankScore: 8000000, rankName: 'Flor Imperial (Royal Flush)' };
    return { rankScore: 7000000 + straightHigh, rankName: 'Escalera de Color (Straight Flush)' };
  }

  // Four of a Kind
  if (freqEntries[0].count === 4 || (hasJoker && freqEntries[0].count === 3 && freqEntries[0].val === 14)) {
    return { rankScore: 6000000 + freqEntries[0].val, rankName: `Póquer de ${freqEntries[0].val}` };
  }

  // Full House
  if (
    (freqEntries[0].count === 3 && freqEntries[1]?.count >= 2) ||
    (hasJoker && freqEntries[0].count === 2 && freqEntries[1]?.count === 2)
  ) {
    return { rankScore: 5000000 + freqEntries[0].val * 20 + (freqEntries[1]?.val || 0), rankName: 'Full House' };
  }

  // Flush
  if (isFlush) {
    return { rankScore: 4000000 + values[0], rankName: 'Color (Flush)' };
  }

  // Straight
  if (isStraight) {
    return { rankScore: 3000000 + straightHigh, rankName: 'Escalera (Straight)' };
  }

  // Three of a Kind
  if (freqEntries[0].count === 3 || (hasJoker && freqEntries[0].count === 2)) {
    return { rankScore: 2000000 + freqEntries[0].val, rankName: `Tercia de ${freqEntries[0].val}` };
  }

  // Two Pair
  if (freqEntries[0].count === 2 && freqEntries[1]?.count === 2) {
    return { rankScore: 1000000 + freqEntries[0].val * 400 + freqEntries[1].val * 20, rankName: 'Doble Pareja' };
  }

  // One Pair
  if (freqEntries[0].count === 2 || hasJoker) {
    const pairVal = freqEntries[0].count === 2 ? freqEntries[0].val : 14;
    return { rankScore: 500000 + pairVal * 20, rankName: `Par de ${pairVal}` };
  }

  // High Card
  return { rankScore: values[0] * 400 + values[1] * 20 + values[2], rankName: `Carta Alta ${values[0]}` };
};

/**
 * House Way Auto-split algorithm for 7 cards
 */
export const houseWaySplit = (cards7: Card[]): { high5: Card[]; low2: Card[] } => {
  if (cards7.length !== 7) throw new Error("House Way requires exactly 7 cards.");

  // Sort descending by 2-card value
  const sorted = [...cards7].sort((a, b) => get2CardValue(b) - get2CardValue(a));

  // Find all pairs
  const valGroups: Record<number, Card[]> = {};
  for (const c of sorted) {
    const v = get2CardValue(c);
    valGroups[v] = valGroups[v] || [];
    valGroups[v].push(c);
  }

  const pairs: Card[][] = [];
  const singles: Card[] = [];

  for (const [_, group] of Object.entries(valGroups)) {
    if (group.length >= 2) {
      pairs.push([group[0], group[1]]);
      if (group.length === 3) singles.push(group[2]);
      if (group.length === 4) pairs.push([group[2], group[3]]);
    } else {
      singles.push(group[0]);
    }
  }

  // Case 1: 3 pairs -> put highest pair in low2
  if (pairs.length >= 3) {
    pairs.sort((a, b) => get2CardValue(b[0]) - get2CardValue(a[0]));
    const low2 = pairs[0];
    const high5 = [...pairs[1], ...pairs[2], ...singles];
    return { high5, low2 };
  }

  // Case 2: 2 pairs -> split high pair in 5-card, low pair in 2-card unless low pairs (6s or lower) with Ace kicker
  if (pairs.length === 2) {
    pairs.sort((a, b) => get2CardValue(b[0]) - get2CardValue(a[0]));
    const low2 = pairs[1];
    const high5 = [...pairs[0], ...singles];
    return { high5, low2 };
  }

  // Default: put 2 highest remaining singles in low2, rest in high5
  const low2 = [sorted[1], sorted[2]];
  const high5 = [sorted[0], ...sorted.slice(3)];
  return { high5, low2 };
};
