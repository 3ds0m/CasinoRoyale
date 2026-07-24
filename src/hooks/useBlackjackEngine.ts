import { useState } from 'react';
import type { Card } from '../utils/deck';
import { createDeck, shuffleDeck } from '../utils/deck';
import { useGameSession } from '../context/GameSessionContext';

export type BlackjackStage = 'betting' | 'player-turn' | 'dealer-turn' | 'finished';

export interface BlackjackHand {
  cards: Card[];
  bet: number;
  isFinished: boolean;
  isBust: boolean;
  isBlackjack: boolean;
  isDoubled: boolean;
}

export const getBlackjackCardValue = (card: Card): number => {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value, 10);
};

export const calculateBlackjackHandValue = (cards: Card[]): { total: number; isSoft: boolean } => {
  let total = 0;
  let aces = 0;

  for (const c of cards) {
    const val = getBlackjackCardValue(c);
    if (c.value === 'A') aces++;
    total += val;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return { total, isSoft: aces > 0 };
};

export const useBlackjackEngine = () => {
  const { user, updateBalance, addGameHistory } = useGameSession();

  const [stage, setStage] = useState<BlackjackStage>('betting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [hands, setHands] = useState<BlackjackHand[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState<number>(0);
  const [betInput, setBetInput] = useState<number>(50);
  const [insuranceBet, setInsuranceBet] = useState<number>(0);
  const [insuranceOffered, setInsuranceOffered] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [totalPayout, setTotalPayout] = useState<number>(0);

  const startRound = async (bet: number) => {
    if (!user || user.balance < bet || bet <= 0) return;

    await updateBalance(-bet);

    const currentDeck = shuffleDeck(createDeck());
    const pCard1 = currentDeck.pop()!;
    const dCard1 = currentDeck.pop()!;
    const pCard2 = currentDeck.pop()!;
    const dCard2 = currentDeck.pop()!;

    const pHandCards = [pCard1, pCard2];
    const dHandCards = [dCard1, dCard2];

    const pVal = calculateBlackjackHandValue(pHandCards);
    const dVal = calculateBlackjackHandValue(dHandCards);

    const isPlayerBJ = pVal.total === 21 && pHandCards.length === 2;
    const isDealerBJ = dVal.total === 21 && dHandCards.length === 2;

    const initialHand: BlackjackHand = {
      cards: pHandCards,
      bet,
      isFinished: false,
      isBust: false,
      isBlackjack: isPlayerBJ,
      isDoubled: false,
    };

    setDeck(currentDeck);
    setDealerCards(dHandCards);
    setHands([initialHand]);
    setActiveHandIndex(0);
    setTotalPayout(0);
    setResultMessage('');

    // Offer insurance if dealer shows Ace
    if (dCard1.value === 'A' && !isPlayerBJ) {
      setInsuranceOffered(true);
    } else {
      setInsuranceOffered(false);
    }

    if (isPlayerBJ || isDealerBJ) {
      setStage('finished');
      resolveRound([initialHand], dHandCards, 0);
    } else {
      setStage('player-turn');
    }
  };

  const buyInsurance = async () => {
    if (!insuranceOffered || stage !== 'player-turn' || !user) return;
    const currentBet = hands[0].bet;
    const insCost = Math.floor(currentBet / 2);
    if (user.balance < insCost) return;

    await updateBalance(-insCost);
    setInsuranceBet(insCost);
    setInsuranceOffered(false);
  };

  const hit = () => {
    if (stage !== 'player-turn' || hands.length === 0) return;

    const currentDeck = [...deck];
    const newCard = currentDeck.pop()!;
    setDeck(currentDeck);

    const currentHand = { ...hands[activeHandIndex] };
    currentHand.cards = [...currentHand.cards, newCard];

    const { total } = calculateBlackjackHandValue(currentHand.cards);
    if (total > 21) {
      currentHand.isBust = true;
      currentHand.isFinished = true;
    } else if (total === 21) {
      currentHand.isFinished = true;
    }

    const updatedHands = [...hands];
    updatedHands[activeHandIndex] = currentHand;
    setHands(updatedHands);

    if (currentHand.isFinished) {
      advanceOrDealerTurn(updatedHands, activeHandIndex);
    }
  };

  const stand = () => {
    if (stage !== 'player-turn' || hands.length === 0) return;

    const currentHand = { ...hands[activeHandIndex], isFinished: true };
    const updatedHands = [...hands];
    updatedHands[activeHandIndex] = currentHand;
    setHands(updatedHands);

    advanceOrDealerTurn(updatedHands, activeHandIndex);
  };

  const doubleDown = async () => {
    if (stage !== 'player-turn' || !user) return;
    const currentHand = hands[activeHandIndex];

    if (currentHand.cards.length !== 2 || user.balance < currentHand.bet) return;

    await updateBalance(-currentHand.bet);

    const currentDeck = [...deck];
    const newCard = currentDeck.pop()!;
    setDeck(currentDeck);

    const updatedHand: BlackjackHand = {
      ...currentHand,
      cards: [...currentHand.cards, newCard],
      bet: currentHand.bet * 2,
      isDoubled: true,
      isFinished: true,
    };

    const { total } = calculateBlackjackHandValue(updatedHand.cards);
    if (total > 21) updatedHand.isBust = true;

    const updatedHands = [...hands];
    updatedHands[activeHandIndex] = updatedHand;
    setHands(updatedHands);

    advanceOrDealerTurn(updatedHands, activeHandIndex);
  };

  const split = async () => {
    if (stage !== 'player-turn' || !user) return;
    const currentHand = hands[activeHandIndex];

    if (currentHand.cards.length !== 2) return;
    const card1Val = getBlackjackCardValue(currentHand.cards[0]);
    const card2Val = getBlackjackCardValue(currentHand.cards[1]);

    if (card1Val !== card2Val || user.balance < currentHand.bet) return;

    await updateBalance(-currentHand.bet);

    const currentDeck = [...deck];
    const extraCard1 = currentDeck.pop()!;
    const extraCard2 = currentDeck.pop()!;
    setDeck(currentDeck);

    const hand1: BlackjackHand = {
      cards: [currentHand.cards[0], extraCard1],
      bet: currentHand.bet,
      isFinished: false,
      isBust: false,
      isBlackjack: false,
      isDoubled: false,
    };

    const hand2: BlackjackHand = {
      cards: [currentHand.cards[1], extraCard2],
      bet: currentHand.bet,
      isFinished: false,
      isBust: false,
      isBlackjack: false,
      isDoubled: false,
    };

    const updatedHands = [...hands];
    updatedHands.splice(activeHandIndex, 1, hand1, hand2);
    setHands(updatedHands);
  };

  const advanceOrDealerTurn = (currentHands: BlackjackHand[], currentIndex: number) => {
    if (currentIndex + 1 < currentHands.length) {
      setActiveHandIndex(currentIndex + 1);
    } else {
      // All player hands finished -> play Dealer
      playDealerTurn(currentHands);
    }
  };

  const playDealerTurn = async (playerHands: BlackjackHand[]) => {
    setStage('dealer-turn');

    const allBust = playerHands.every(h => h.isBust);
    let dCards = [...dealerCards];
    let currentDeck = [...deck];

    if (!allBust) {
      let dVal = calculateBlackjackHandValue(dCards);
      while (dVal.total < 17) {
        const c = currentDeck.pop()!;
        dCards.push(c);
        dVal = calculateBlackjackHandValue(dCards);
      }
    }

    setDealerCards(dCards);
    setDeck(currentDeck);
    setStage('finished');

    resolveRound(playerHands, dCards, insuranceBet);
  };

  const resolveRound = async (playerHands: BlackjackHand[], dCards: Card[], insBet: number) => {
    const dVal = calculateBlackjackHandValue(dCards);
    const isDealerBJ = dVal.total === 21 && dCards.length === 2;

    let winSum = 0;
    let totalBetSum = 0;
    let msgs: string[] = [];

    // Check Insurance payout
    if (insBet > 0) {
      if (isDealerBJ) {
        winSum += insBet * 3; // 2:1 payout + original insurance bet
        msgs.push('¡Seguro pagado (+3:1)!');
      }
    }

    for (let i = 0; i < playerHands.length; i++) {
      const h = playerHands[i];
      totalBetSum += h.bet;
      const pVal = calculateBlackjackHandValue(h.cards);
      const handLabel = playerHands.length > 1 ? `Mano ${i + 1}` : 'Mano';

      if (h.isBlackjack) {
        if (isDealerBJ) {
          winSum += h.bet; // Push
          msgs.push(`${handLabel}: Empate de Blackjack (Push).`);
        } else {
          winSum += Math.floor(h.bet * 2.5); // 3:2 payout (bet returned + 1.5)
          msgs.push(`${handLabel}: ¡BLACKJACK (+3:2)!`);
        }
      } else if (h.isBust) {
        msgs.push(`${handLabel}: Te pasaste (${pVal.total}). Apuesta perdida.`);
      } else if (isDealerBJ) {
        msgs.push(`${handLabel}: La banca tiene Blackjack.`);
      } else if (dVal.total > 21) {
        winSum += h.bet * 2; // Dealer busts -> 1:1 payout
        msgs.push(`${handLabel}: ¡La banca se pasó! Ganaste (+1:1).`);
      } else if (pVal.total > dVal.total) {
        winSum += h.bet * 2; // 1:1 payout
        msgs.push(`${handLabel}: ¡Ganaste (${pVal.total} a ${dVal.total})!`);
      } else if (pVal.total < dVal.total) {
        msgs.push(`${handLabel}: La banca gana (${dVal.total} a ${pVal.total}).`);
      } else {
        winSum += h.bet; // Push
        msgs.push(`${handLabel}: Empate (${pVal.total}). Apuesta devuelta.`);
      }
    }

    if (winSum > 0) {
      await updateBalance(winSum);
    }

    setTotalPayout(winSum);
    setResultMessage(msgs.join(' '));

    await addGameHistory({
      gameId: `bj_${Date.now()}`,
      gameType: 'blackjack',
      bet: totalBetSum,
      payout: winSum,
      status: 'completed',
      gameState: {
        stage: 'finished',
        playerCards: playerHands.flatMap(h => h.cards.map(c => c.code)),
        dealerCards: dCards.map(c => c.code),
        playerHandValue: calculateBlackjackHandValue(playerHands[0].cards).total,
        dealerHandValue: dVal.total,
      },
    });
  };

  const resetGame = () => {
    setStage('betting');
    setDealerCards([]);
    setHands([]);
    setActiveHandIndex(0);
    setInsuranceBet(0);
    setInsuranceOffered(false);
    setResultMessage('');
    setTotalPayout(0);
  };

  return {
    stage,
    dealerCards,
    hands,
    activeHandIndex,
    betInput,
    insuranceBet,
    insuranceOffered,
    resultMessage,
    totalPayout,
    setBetInput,
    startRound,
    buyInsurance,
    hit,
    stand,
    doubleDown,
    split,
    resetGame,
  };
};
