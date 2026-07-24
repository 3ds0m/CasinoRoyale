import { useState } from 'react';
import type { Card } from '../utils/deck';
import { createDeck, shuffleDeck } from '../utils/deck';
import { useGameSession } from '../context/GameSessionContext';
import {
  evaluate5CardHand,
  evaluate2CardHand,
  houseWaySplit,
} from '../utils/paiGowEvaluator';
import type {
  PaiGow5CardEvaluation,
  PaiGow2CardEvaluation,
} from '../utils/paiGowEvaluator';

export type PaiGowStage = 'betting' | 'setting-hand' | 'finished';

export const create53CardDeck = (): Card[] => {
  const baseDeck = createDeck();
  const jokerCard: Card = {
    suit: 'S',
    value: 'JOKER',
    code: 'JKR',
    numericValue: 15,
  };
  return [...baseDeck, jokerCard];
};

export const usePaiGowEngine = () => {
  const { user, updateBalance, addGameHistory } = useGameSession();

  const [stage, setStage] = useState<PaiGowStage>('betting');
  const [player7Cards, setPlayer7Cards] = useState<Card[]>([]);
  const [dealer7Cards, setDealer7Cards] = useState<Card[]>([]);

  const [playerHigh5, setPlayerHigh5] = useState<Card[]>([]);
  const [playerLow2, setPlayerLow2] = useState<Card[]>([]);

  const [dealerHigh5, setDealerHigh5] = useState<Card[]>([]);
  const [dealerLow2, setDealerLow2] = useState<Card[]>([]);

  const [betAmount, setBetAmount] = useState<number>(50);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [payout, setPayout] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [evaluations, setEvaluations] = useState<{
    playerHigh?: PaiGow5CardEvaluation;
    playerLow?: PaiGow2CardEvaluation;
    dealerHigh?: PaiGow5CardEvaluation;
    dealerLow?: PaiGow2CardEvaluation;
  }>({});

  const startRound = async (bet: number) => {
    if (!user || user.balance < bet || bet <= 0) return;

    await updateBalance(-bet);
    setBetAmount(bet);

    const deck = shuffleDeck(create53CardDeck());
    const pCards = deck.slice(0, 7);
    const dCards = deck.slice(7, 14);

    setPlayer7Cards(pCards);
    setDealer7Cards(dCards);

    // Default player split: 5 high, 2 low using houseWay
    const pSplit = houseWaySplit(pCards);
    setPlayerHigh5(pSplit.high5);
    setPlayerLow2(pSplit.low2);

    // Dealer split using House Way
    const dSplit = houseWaySplit(dCards);
    setDealerHigh5(dSplit.high5);
    setDealerLow2(dSplit.low2);

    setStage('setting-hand');
    setResultMessage('');
    setErrorMsg('');
    setPayout(0);
    setEvaluations({});
  };

  const toggleCardSelection = (card: Card) => {
    if (stage !== 'setting-hand') return;
    setErrorMsg('');

    const inLow = playerLow2.some(c => c.code === card.code);
    if (inLow) {
      // Move from low2 to high5
      setPlayerLow2(prev => prev.filter(c => c.code !== card.code));
      setPlayerHigh5(prev => [...prev, card]);
    } else {
      if (playerLow2.length >= 2) {
        setErrorMsg("La mano frontal solo puede tener 2 cartas.");
        return;
      }
      // Move from high5 to low2
      setPlayerHigh5(prev => prev.filter(c => c.code !== card.code));
      setPlayerLow2(prev => [...prev, card]);
    }
  };

  const autoSetPlayerHouseWay = () => {
    if (stage !== 'setting-hand') return;
    const split = houseWaySplit(player7Cards);
    setPlayerHigh5(split.high5);
    setPlayerLow2(split.low2);
    setErrorMsg('');
  };

  const confirmHands = async () => {
    if (stage !== 'setting-hand') return;

    if (playerLow2.length !== 2 || playerHigh5.length !== 5) {
      setErrorMsg("Debes seleccionar exactamente 2 cartas para la mano frontal y 5 para la mano alta.");
      return;
    }

    // Evaluate player hands
    const pHighEval = evaluate5CardHand(playerHigh5);
    const pLowEval = evaluate2CardHand(playerLow2);

    // Constraint: High hand MUST beat or equal low hand
    if (pLowEval.rankScore > pHighEval.rankScore) {
      setErrorMsg("¡Foul! La mano de 5 cartas debe ser de mayor jerarquía que la mano de 2 cartas.");
      return;
    }

    // Evaluate dealer hands
    const dHighEval = evaluate5CardHand(dealerHigh5);
    const dLowEval = evaluate2CardHand(dealerLow2);

    // Compare High vs High and Low vs Low
    // Dealer wins ties! (copies go to dealer)
    const playerWinsHigh = pHighEval.rankScore > dHighEval.rankScore;
    const playerWinsLow = pLowEval.rankScore > dLowEval.rankScore;

    const dealerWinsHigh = dHighEval.rankScore >= pHighEval.rankScore;
    const dealerWinsLow = dLowEval.rankScore >= pLowEval.rankScore;

    let finalPayout = 0;
    let msg = '';

    if (playerWinsHigh && playerWinsLow) {
      // Player wins both hands -> 1:1 payout minus 5% commission
      const winCommission = Math.floor(betAmount * 0.95);
      finalPayout = betAmount + winCommission;
      msg = `¡GANASTE AMBAS MANOS! (+${finalPayout} fichas)`;
    } else if (dealerWinsHigh && dealerWinsLow) {
      // Dealer wins both hands -> Loss
      finalPayout = 0;
      msg = 'La banca ganó ambas manos. Apuesta perdida.';
    } else {
      // Push (1 win, 1 loss) -> Bet returned
      finalPayout = betAmount;
      msg = '¡EMPATE (PUSH)! Ganaste 1 mano y la banca ganó 1 mano. Apuesta devuelta.';
    }

    if (finalPayout > 0) {
      await updateBalance(finalPayout);
    }

    setEvaluations({
      playerHigh: pHighEval,
      playerLow: pLowEval,
      dealerHigh: dHighEval,
      dealerLow: dLowEval,
    });

    setPayout(finalPayout);
    setResultMessage(msg);
    setStage('finished');

    await addGameHistory({
      gameId: `pg_${Date.now()}`,
      gameType: 'pai-gow',
      bet: betAmount,
      payout: finalPayout,
      status: 'completed',
      gameState: {
        stage: 'finished',
        playerCards: player7Cards.map(c => c.code),
        dealerCards: dealer7Cards.map(c => c.code),
      },
    });
  };

  const resetGame = () => {
    setStage('betting');
    setPlayer7Cards([]);
    setDealer7Cards([]);
    setPlayerHigh5([]);
    setPlayerLow2([]);
    setDealerHigh5([]);
    setDealerLow2([]);
    setResultMessage('');
    setErrorMsg('');
    setPayout(0);
    setEvaluations({});
  };

  return {
    stage,
    player7Cards,
    dealer7Cards,
    playerHigh5,
    playerLow2,
    dealerHigh5,
    dealerLow2,
    betAmount,
    resultMessage,
    errorMsg,
    payout,
    evaluations,
    setBetAmount,
    startRound,
    toggleCardSelection,
    autoSetPlayerHouseWay,
    confirmHands,
    resetGame,
  };
};
