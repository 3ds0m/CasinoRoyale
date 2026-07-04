import { useState, useEffect } from 'react';
import { useGameSession } from '../context/GameSessionContext';
import { createDeck, shuffleDeck, drawCard } from '../utils/deck';
import type { Card } from '../utils/deck';
import { evaluateThreeCardHand, doesDealerQualify } from '../utils/pokerEvaluator';
import type { HandEvaluation } from '../utils/pokerEvaluator';

export type PokerStage = 'BETTING' | 'DEAL' | 'DECISION' | 'FINISHED';

export const useThreeCardPokerEngine = () => {
  const { user, activeGame, saveActiveGame, addGameHistory, updateBalance } = useGameSession();

  const [stage, setStage] = useState<PokerStage>('BETTING');
  const [anteBet, setAnteBet] = useState<number>(0);
  const [pairPlusBet, setPairPlusBet] = useState<number>(0);
  
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  
  const [playerEval, setPlayerEval] = useState<HandEvaluation | null>(null);
  const [dealerEval, setDealerEval] = useState<HandEvaluation | null>(null);
  const [dealerQualified, setDealerQualified] = useState<boolean>(false);
  
  const [message, setMessage] = useState<string>('Coloque su apuesta Ante (y opcionalmente Pair Plus) para comenzar.');
  const [payout, setPayout] = useState<number>(0);

  // Resume game state
  useEffect(() => {
    if (activeGame && activeGame.gameType === 'three-card-poker' && activeGame.gameState) {
      const state = activeGame.gameState;
      setStage(state.stage as PokerStage);
      setAnteBet(activeGame.bet);
      
      const extra = state.additionalData;
      if (extra) {
        setPairPlusBet(extra.pairPlusBet || 0);
      }

      if (state.playerCards) {
        const pCards = state.playerCards.map(c => parseCardCode(c));
        setPlayerCards(pCards);
        setPlayerEval(evaluateThreeCardHand(pCards));
      }

      if (state.dealerCards) {
        setDealerCards(state.dealerCards.map(c => parseCardCode(c)));
      }
      
      setMessage('Elige si jugar (igualar Ante) o retirarte (Fold).');
    }
  }, [activeGame]);

  const parseCardCode = (code: string): Card => {
    const value = code.slice(0, -1);
    const suit = code.slice(-1) as 'H' | 'D' | 'C' | 'S';
    let numericValue = parseInt(value, 10);
    if (value === 'J') numericValue = 11;
    if (value === 'Q') numericValue = 12;
    if (value === 'K') numericValue = 13;
    if (value === 'A') numericValue = 14;
    return { suit, value, code, numericValue };
  };

  const dealHand = async (anteAmount: number, pairPlusAmount: number) => {
    if (!user) return;
    const totalBet = anteAmount + pairPlusAmount;
    if (user.balance < totalBet) {
      setMessage('Saldo insuficiente.');
      return;
    }

    try {
      await updateBalance(-totalBet);
      setAnteBet(anteAmount);
      setPairPlusBet(pairPlusAmount);
      setDealerEval(null);
      setDealerQualified(false);

      let deck = shuffleDeck(createDeck());
      
      // Draw 3 cards for player, 3 for dealer
      const pCards: Card[] = [];
      const dCards: Card[] = [];
      
      for (let i = 0; i < 3; i++) {
        const pDraw = drawCard(deck);
        pCards.push(pDraw.card);
        deck = pDraw.remainingDeck;

        const dDraw = drawCard(deck);
        dCards.push(dDraw.card);
        deck = dDraw.remainingDeck;
      }

      setPlayerCards(pCards);
      setDealerCards(dCards);

      const pEval = evaluateThreeCardHand(pCards);
      setPlayerEval(pEval);
      setStage('DECISION');
      setMessage('Analiza tu mano y decide: jugar (Play) o retirarte (Fold).');

      // Save intermediate state in Firestore (before player decides to fold or play)
      await saveActiveGame({
        gameId: '',
        gameType: 'three-card-poker',
        bet: anteAmount,
        payout: 0,
        status: 'active',
        gameState: {
          stage: 'DECISION',
          playerCards: pCards.map(c => c.code),
          dealerCards: dCards.map(c => c.code),
          additionalData: { pairPlusBet: pairPlusAmount }
        }
      });
    } catch (err: any) {
      console.error(err);
      setMessage('Error de comunicación.');
    }
  };

  const fold = async () => {
    if (stage !== 'DECISION') return;

    setStage('FINISHED');
    setPayout(0);
    setMessage('Te retiraste. Perdiste tu apuesta Ante y Pair Plus.');

    await addGameHistory({
      gameId: '',
      gameType: 'three-card-poker',
      bet: anteBet + pairPlusBet,
      payout: 0,
      status: 'completed',
      gameState: {
        stage: 'FINISHED',
        playerCards: playerCards.map(c => c.code),
        dealerCards: dealerCards.map(c => c.code),
        additionalData: { action: 'fold', pairPlusBet }
      }
    });
  };

  const play = async () => {
    if (stage !== 'DECISION' || !user || playerCards.length !== 3 || dealerCards.length !== 3 || !playerEval) return;

    if (user.balance < anteBet) {
      setMessage('Saldo insuficiente para colocar la apuesta Play.');
      return;
    }

    try {
      // Deduct Play bet (equal to Ante)
      await updateBalance(-anteBet);
      const totalInitialBet = anteBet + pairPlusBet;
      const totalBetWithPlay = totalInitialBet + anteBet;

      const dEval = evaluateThreeCardHand(dealerCards);
      setDealerEval(dEval);

      const qualified = doesDealerQualify(dEval);
      setDealerQualified(qualified);

      let roundPayout = 0;
      let logMessage = '';

      // 1. Evaluate Ante & Play Bets
      if (!qualified) {
        // Dealer doesn't qualify: Ante pays 1:1, Play pushes (returns)
        roundPayout += anteBet * 2; // Returns Ante + pays Ante (1:1)
        roundPayout += anteBet; // Returns Play
        logMessage = 'El crupier no califica (necesita reina o superior). Apuesta Ante paga 1:1, apuesta Play se devuelve.';
      } else {
        // Dealer qualifies: compare hands
        if (playerEval.score > dEval.score) {
          // Player wins: Ante pays 1:1, Play pays 1:1
          roundPayout += anteBet * 2; // Ante pays 1:1 + returned
          roundPayout += anteBet * 2; // Play pays 1:1 + returned
          logMessage = `¡Ganaste a la casa! ${playerEval.description} supera a ${dEval.description}. Ambos pagan 1:1.`;
        } else if (dEval.score > playerEval.score) {
          // Dealer wins: player loses both Ante and Play
          roundPayout += 0;
          logMessage = `Perdiste la mano. El crupier califica con ${dEval.description} y supera a tu ${playerEval.description}.`;
        } else {
          // Tie: push on both
          roundPayout += anteBet; // returned Ante
          roundPayout += anteBet; // returned Play
          logMessage = 'Empate. Se devuelven las apuestas Ante y Play.';
        }
      }

      // 2. Evaluate Ante Bonus (paid regardless of dealer hand/qualification for Straight, Three of a Kind, Straight Flush)
      let anteBonusPayout = 0;
      if (playerEval.rank === 'Straight Flush') {
        anteBonusPayout = anteBet * 5; // Pays 5:1
        roundPayout += anteBonusPayout;
        logMessage += ' ¡Bono de Ante por Flor Imperial (5:1)!';
      } else if (playerEval.rank === 'Three of a Kind') {
        anteBonusPayout = anteBet * 4; // Pays 4:1
        roundPayout += anteBonusPayout;
        logMessage += ' ¡Bono de Ante por Tercia (4:1)!';
      } else if (playerEval.rank === 'Straight') {
        anteBonusPayout = anteBet * 1; // Pays 1:1
        roundPayout += anteBonusPayout;
        logMessage += ' ¡Bono de Ante por Escalera (1:1)!';
      }

      // 3. Evaluate Pair Plus Bet (if placed, based purely on player hand strength)
      let pairPlusPayout = 0;
      if (pairPlusBet > 0) {
        if (playerEval.rank === 'Straight Flush') {
          pairPlusPayout = pairPlusBet * 40; // 40:1
        } else if (playerEval.rank === 'Three of a Kind') {
          pairPlusPayout = pairPlusBet * 30; // 30:1
        } else if (playerEval.rank === 'Straight') {
          pairPlusPayout = pairPlusBet * 6; // 6:1
        } else if (playerEval.rank === 'Flush') {
          pairPlusPayout = pairPlusBet * 3; // 3:1
        } else if (playerEval.rank === 'Pair') {
          pairPlusPayout = pairPlusBet * 1; // 1:1
        }

        if (pairPlusPayout > 0) {
          const winPlusReturned = pairPlusPayout + pairPlusBet;
          roundPayout += winPlusReturned;
          logMessage += ` ¡Ganaste Pair Plus! ${playerEval.description} paga (${pairPlusPayout / pairPlusBet}:1).`;
        } else {
          logMessage += ' Perdiste la apuesta lateral Pair Plus.';
        }
      }

      // Credit total payout
      if (roundPayout > 0) {
        await updateBalance(roundPayout);
      }

      setStage('FINISHED');
      setPayout(roundPayout);
      setMessage(logMessage);

      await addGameHistory({
        gameId: '',
        gameType: 'three-card-poker',
        bet: totalBetWithPlay,
        payout: roundPayout,
        status: 'completed',
        gameState: {
          stage: 'FINISHED',
          playerCards: playerCards.map(c => c.code),
          dealerCards: dealerCards.map(c => c.code),
          additionalData: {
            action: 'play',
            anteBet,
            pairPlusBet,
            dealerQualified: qualified,
            playerRank: playerEval.rank,
            dealerRank: dEval.rank,
            payout: roundPayout
          }
        }
      });
    } catch (err: any) {
      console.error(err);
      setMessage('Error al resolver la ronda de poker.');
    }
  };

  const resetGame = () => {
    setStage('BETTING');
    setAnteBet(0);
    setPairPlusBet(0);
    setPlayerCards([]);
    setDealerCards([]);
    setPlayerEval(null);
    setDealerEval(null);
    setDealerQualified(false);
    setPayout(0);
    setMessage('Coloque su apuesta Ante (y opcionalmente Pair Plus) para comenzar.');
  };

  return {
    stage,
    anteBet,
    pairPlusBet,
    playerCards,
    dealerCards,
    playerEval,
    dealerEval,
    dealerQualified,
    message,
    payout,
    dealHand,
    fold,
    play,
    resetGame
  };
};
