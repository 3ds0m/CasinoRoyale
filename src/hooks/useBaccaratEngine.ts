import { useState } from 'react';
import type { Card } from '../utils/deck';
import { createDeck, shuffleDeck } from '../utils/deck';
import { useGameSession } from '../context/GameSessionContext';

export type BaccaratBetType = 'player' | 'banker' | 'tie' | 'playerPair' | 'bankerPair';

export interface BaccaratBets {
  player: number;
  banker: number;
  tie: number;
  playerPair: number;
  bankerPair: number;
}

export type BaccaratStage = 'betting' | 'dealing' | 'finished';

export const getBaccaratCardValue = (card: Card): number => {
  if (['10', 'J', 'Q', 'K'].includes(card.value)) return 0;
  if (card.value === 'A') return 1;
  return parseInt(card.value, 10);
};

export const calculateBaccaratHandValue = (cards: Card[]): number => {
  const sum = cards.reduce((acc, card) => acc + getBaccaratCardValue(card), 0);
  return sum % 10;
};

export const useBaccaratEngine = () => {
  const { user, updateBalance, addGameHistory } = useGameSession();

  const [stage, setStage] = useState<BaccaratStage>('betting');
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [bets, setBets] = useState<BaccaratBets>({
    player: 0,
    banker: 0,
    tie: 0,
    playerPair: 0,
    bankerPair: 0,
  });
  const [chipDenomination, setChipDenomination] = useState<number>(10);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [totalPayout, setTotalPayout] = useState<number>(0);
  const [isNatural, setIsNatural] = useState<boolean>(false);

  const placeBet = (type: BaccaratBetType) => {
    if (stage !== 'betting') return;
    const currentTotal = Object.values(bets).reduce((a, b) => a + b, 0);
    if (user && currentTotal + chipDenomination > user.balance) return;

    setBets(prev => ({
      ...prev,
      [type]: prev[type] + chipDenomination,
    }));
  };

  const clearBets = () => {
    if (stage !== 'betting') return;
    setBets({
      player: 0,
      banker: 0,
      tie: 0,
      playerPair: 0,
      bankerPair: 0,
    });
  };

  const deal = async () => {
    const totalBetAmount = Object.values(bets).reduce((a, b) => a + b, 0);
    if (totalBetAmount === 0 || !user || user.balance < totalBetAmount) return;

    // Deduct bet from balance
    await updateBalance(-totalBetAmount);

    const currentDeck = shuffleDeck(createDeck());
    const pCards: Card[] = [currentDeck.pop()!, currentDeck.pop()!];
    const bCards: Card[] = [currentDeck.pop()!, currentDeck.pop()!];

    setPlayerCards(pCards);
    setBankerCards(bCards);
    setStage('dealing');

    let pVal = calculateBaccaratHandValue(pCards);
    let bVal = calculateBaccaratHandValue(bCards);

    const playerHasPair = pCards[0].value === pCards[1].value;
    const bankerHasPair = bCards[0].value === bCards[1].value;

    // Check Natural (8 or 9)
    if (pVal >= 8 || bVal >= 8) {
      setIsNatural(true);
      resolveGame(pCards, bCards, pVal, bVal, totalBetAmount, playerHasPair, bankerHasPair);
      return;
    }

    setIsNatural(false);

    // Drawing 3rd card rules
    let p3rdCard: Card | null = null;

    // Player draws if total is 0-5
    if (pVal <= 5) {
      p3rdCard = currentDeck.pop()!;
      pCards.push(p3rdCard);
      pVal = calculateBaccaratHandValue(pCards);
    }

    // Banker drawing rule
    let bankerDraws = false;
    if (!p3rdCard) {
      // Player stood: Banker draws on 0-5
      if (bVal <= 5) bankerDraws = true;
    } else {
      // Player drew 3rd card
      const p3rdVal = getBaccaratCardValue(p3rdCard);
      if (bVal <= 2) bankerDraws = true;
      else if (bVal === 3 && p3rdVal !== 8) bankerDraws = true;
      else if (bVal === 4 && p3rdVal >= 2 && p3rdVal <= 7) bankerDraws = true;
      else if (bVal === 5 && p3rdVal >= 4 && p3rdVal <= 7) bankerDraws = true;
      else if (bVal === 6 && (p3rdVal === 6 || p3rdVal === 7)) bankerDraws = true;
    }

    if (bankerDraws) {
      const b3rdCard = currentDeck.pop()!;
      bCards.push(b3rdCard);
      bVal = calculateBaccaratHandValue(bCards);
    }

    setPlayerCards([...pCards]);
    setBankerCards([...bCards]);

    resolveGame(pCards, bCards, pVal, bVal, totalBetAmount, playerHasPair, bankerHasPair);
  };

  const resolveGame = async (
    pCards: Card[],
    bCards: Card[],
    pVal: number,
    bVal: number,
    totalBet: number,
    pPair: boolean,
    bPair: boolean
  ) => {
    let winAmount = 0;
    let msg = '';

    const winner = pVal > bVal ? 'player' : bVal > pVal ? 'banker' : 'tie';

    if (winner === 'player') {
      msg = `¡Gana el JUGADOR! (${pVal} a ${bVal})`;
      if (bets.player > 0) winAmount += bets.player * 2; // bet returned + 1:1 payout
    } else if (winner === 'banker') {
      msg = `¡Gana la BANCA! (${bVal} a ${pVal})`;
      if (bets.banker > 0) winAmount += bets.banker + Math.floor(bets.banker * 0.95); // 0.95:1 payout
    } else {
      msg = `¡EMPATE! (${pVal} a ${pVal})`;
      if (bets.tie > 0) winAmount += bets.tie * 9; // bet returned + 8:1 payout
      // Push for player and banker main bets in case of tie
      winAmount += bets.player;
      winAmount += bets.banker;
    }

    // Side bets
    if (pPair && bets.playerPair > 0) {
      winAmount += bets.playerPair * 12; // 11:1 payout
      msg += ' | Par del Jugador!';
    }
    if (bPair && bets.bankerPair > 0) {
      winAmount += bets.bankerPair * 12; // 11:1 payout
      msg += ' | Par de la Banca!';
    }

    if (winAmount > 0) {
      await updateBalance(winAmount);
    }

    setTotalPayout(winAmount);
    setResultMessage(msg);
    setStage('finished');

    await addGameHistory({
      gameId: `bac_${Date.now()}`,
      gameType: 'baccarat',
      bet: totalBet,
      payout: winAmount,
      status: 'completed',
      gameState: {
        stage: 'finished',
        playerCards: pCards.map(c => c.code),
        dealerCards: bCards.map(c => c.code),
        playerHandValue: pVal,
        dealerHandValue: bVal,
      },
    });
  };

  const resetGame = () => {
    setStage('betting');
    setPlayerCards([]);
    setBankerCards([]);
    setResultMessage('');
    setTotalPayout(0);
    clearBets();
  };

  return {
    stage,
    playerCards,
    bankerCards,
    bets,
    chipDenomination,
    resultMessage,
    totalPayout,
    isNatural,
    playerValue: calculateBaccaratHandValue(playerCards),
    bankerValue: calculateBaccaratHandValue(bankerCards),
    setChipDenomination,
    placeBet,
    clearBets,
    deal,
    resetGame,
  };
};
