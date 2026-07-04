export interface Card {
  suit: 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
  value: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  code: string; // e.g., 'AH', '10D', 'KS'
  numericValue: number; // 2 to 14 (Aces high)
}

export const SUITS: ('H' | 'D' | 'C' | 'S')[] = ['H', 'D', 'C', 'S'];
export const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const getNumericValue = (value: string): number => {
  if (value === 'J') return 11;
  if (value === 'Q') return 12;
  if (value === 'K') return 13;
  if (value === 'A') return 14;
  return parseInt(value, 10);
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const val of VALUES) {
      deck.push({
        suit,
        value: val,
        code: `${val}${suit}`,
        numericValue: getNumericValue(val),
      });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const drawCard = (deck: Card[]): { card: Card; remainingDeck: Card[] } => {
  if (deck.length === 0) {
    throw new Error("Cannot draw from an empty deck.");
  }
  const nextDeck = [...deck];
  const card = nextDeck.shift()!;
  return { card, remainingDeck: nextDeck };
};
