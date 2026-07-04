import type { Card } from './deck';

export type HandRank = 
  | 'High Card'
  | 'Pair'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Straight Flush';

export interface HandEvaluation {
  rank: HandRank;
  score: number; // For easy direct comparison (higher wins)
  description: string;
}

export const evaluateThreeCardHand = (cards: Card[]): HandEvaluation => {
  if (cards.length !== 3) {
    throw new Error("Three Card Poker evaluation requires exactly 3 cards.");
  }

  // Sort descending by numeric value (Aces are 14)
  const sorted = [...cards].sort((a, b) => b.numericValue - a.numericValue);
  
  const v0 = sorted[0].numericValue;
  const v1 = sorted[1].numericValue;
  const v2 = sorted[2].numericValue;

  const isFlush = sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit;
  
  // Straight checks (including Ace-2-3 low straight)
  let isStraight = false;
  let straightHighCard = 0;

  if (v0 === v1 + 1 && v1 === v2 + 1) {
    isStraight = true;
    straightHighCard = v0;
  } else if (v0 === 14 && v1 === 3 && v2 === 2) {
    // Ace-2-3 is a valid straight (Ace acts as 1, high card is 3)
    isStraight = true;
    straightHighCard = 3;
  }

  const isThreeOfAKind = v0 === v1 && v1 === v2;
  const isPair = v0 === v1 || v1 === v2 || v0 === v2;

  // 1. Straight Flush
  if (isStraight && isFlush) {
    return {
      rank: 'Straight Flush',
      score: 5000000 + straightHighCard,
      description: `Flor Imperial / Escalera de Color (${sorted[0].suit})`,
    };
  }

  // 2. Three of a Kind
  if (isThreeOfAKind) {
    return {
      rank: 'Three of a Kind',
      score: 4000000 + v0,
      description: `Tercia de ${sorted[0].value}s`,
    };
  }

  // 3. Straight
  if (isStraight) {
    return {
      rank: 'Straight',
      score: 3000000 + straightHighCard,
      description: `Escalera al ${straightHighCard === 14 ? 'As' : straightHighCard}`,
    };
  }

  // 4. Flush
  if (isFlush) {
    // Tiebreaker: compare each card in descending order
    const score = 2000000 + (v0 * 400) + (v1 * 20) + v2;
    return {
      rank: 'Flush',
      score,
      description: `Color al ${sorted[0].value}`,
    };
  }

  // 5. Pair
  if (isPair) {
    let pairValue = 0;
    let kickerValue = 0;
    
    if (v0 === v1) {
      pairValue = v0;
      kickerValue = v2;
    } else if (v1 === v2) {
      pairValue = v1;
      kickerValue = v0;
    } else {
      pairValue = v0;
      kickerValue = v1;
    }

    const score = 1000000 + (pairValue * 20) + kickerValue;
    const valueLabel = pairValue === 11 ? 'J' : pairValue === 12 ? 'Q' : pairValue === 13 ? 'K' : pairValue === 14 ? 'A' : pairValue.toString();
    return {
      rank: 'Pair',
      score,
      description: `Par de ${valueLabel}s`,
    };
  }

  // 6. High Card
  const score = (v0 * 400) + (v1 * 20) + v2;
  return {
    rank: 'High Card',
    score,
    description: `Carta Alta ${sorted[0].value}`,
  };
};

/**
 * Checks if dealer's hand qualifies (requires Queen high or better)
 * Q is value 12, so check if score is greater than or equal to Queen high (12 * 400 + 3 * 20 + 2)
 */
export const doesDealerQualify = (evaluation: HandEvaluation): boolean => {
  if (evaluation.rank !== 'High Card') return true; // Pair or better always qualifies
  
  // Queen high is score: 12 * 400 = 4800 (minimum Q-3-2 is 12 * 400 + 3 * 20 + 2 = 4862)
  return evaluation.score >= 4800; 
};
