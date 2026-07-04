import { useState, useEffect } from 'react';
import { useGameSession } from '../context/GameSessionContext';
import { createDeck, shuffleDeck, drawCard } from '../utils/deck';
import type { Card } from '../utils/deck';

export type WarStage = 'BETTING' | 'DEAL' | 'TIE_DECISION' | 'WAR_DEAL' | 'FINISHED';

export const useCasinoWarEngine = () => {
  const { user, activeGame, saveActiveGame, addGameHistory, updateBalance } = useGameSession();

  const [stage, setStage] = useState<WarStage>('BETTING');
  const [bet, setBet] = useState<number>(0);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [dealerCard, setDealerCard] = useState<Card | null>(null);
  const [warCardPlayer, setWarCardPlayer] = useState<Card | null>(null);
  const [warCardDealer, setWarCardDealer] = useState<Card | null>(null);
  const [burnedCards, setBurnedCards] = useState<Card[]>([]);
  const [message, setMessage] = useState<string>('Coloque su apuesta para comenzar.');
  const [payout, setPayout] = useState<number>(0);

  // Resume active game if it exists
  useEffect(() => {
    if (activeGame && activeGame.gameType === 'war' && activeGame.gameState) {
      const state = activeGame.gameState;
      setBet(activeGame.bet);
      setStage(state.stage as WarStage);
      
      // Map cards back from codes if needed, or reconstruct
      if (state.playerCards && state.playerCards.length > 0) {
        setPlayerCard(parseCardCode(state.playerCards[0]));
      }
      if (state.dealerCards && state.dealerCards.length > 0) {
        setDealerCard(parseCardCode(state.dealerCards[0]));
      }
      
      const extra = state.additionalData;
      if (extra) {
        if (extra.warCardPlayer) setWarCardPlayer(parseCardCode(extra.warCardPlayer));
        if (extra.warCardDealer) setWarCardDealer(parseCardCode(extra.warCardDealer));
        if (extra.burnedCards) setBurnedCards(extra.burnedCards.map((c: string) => parseCardCode(c)));
        if (extra.message) setMessage(extra.message);
      }
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

  const startRound = async (betAmount: number) => {
    if (!user) return;
    if (user.balance < betAmount) {
      setMessage('Saldo insuficiente.');
      return;
    }

    try {
      await updateBalance(-betAmount);
      setBet(betAmount);
      
      let deck = shuffleDeck(createDeck());
      
      const draw1 = drawCard(deck);
      const pCard = draw1.card;
      deck = draw1.remainingDeck;

      const draw2 = drawCard(deck);
      const dCard = draw2.card;
      
      setPlayerCard(pCard);
      setDealerCard(dCard);
      setWarCardPlayer(null);
      setWarCardDealer(null);
      setBurnedCards([]);

      if (pCard.numericValue > dCard.numericValue) {
        // Player wins
        const winAmount = betAmount * 2;
        await updateBalance(winAmount);
        setStage('FINISHED');
        setPayout(winAmount);
        setMessage('¡Ganaste la ronda!');
        
        await addGameHistory({
          gameId: '',
          gameType: 'war',
          bet: betAmount,
          payout: winAmount,
          status: 'completed',
          gameState: {
            stage: 'FINISHED',
            playerCards: [pCard.code],
            dealerCards: [dCard.code]
          }
        });
      } else if (dCard.numericValue > pCard.numericValue) {
        // Dealer wins
        setStage('FINISHED');
        setPayout(0);
        setMessage('Crupier gana. Mejor suerte la próxima.');

        await addGameHistory({
          gameId: '',
          gameType: 'war',
          bet: betAmount,
          payout: 0,
          status: 'completed',
          gameState: {
            stage: 'FINISHED',
            playerCards: [pCard.code],
            dealerCards: [dCard.code]
          }
        });
      } else {
        // Tie: transition to TIE_DECISION and save active state to Firestore
        setStage('TIE_DECISION');
        setMessage('¡Empate! ¿Desea ir a la Guerra o Rendirse?');
        
        await saveActiveGame({
          gameId: '',
          gameType: 'war',
          bet: betAmount,
          payout: 0,
          status: 'active',
          gameState: {
            stage: 'TIE_DECISION',
            playerCards: [pCard.code],
            dealerCards: [dCard.code]
          }
        });
      }
    } catch (err: any) {
      console.error(err);
      setMessage('Error de comunicación.');
    }
  };

  const surrender = async () => {
    if (stage !== 'TIE_DECISION' || !playerCard || !dealerCard) return;
    
    // Player surrenders, loses half the bet
    const returnAmount = Math.floor(bet / 2);
    await updateBalance(returnAmount);
    setStage('FINISHED');
    setPayout(returnAmount);
    setMessage(`Te rendiste. Recuperas ${returnAmount} fichas.`);

    await addGameHistory({
      gameId: '',
      gameType: 'war',
      bet: bet,
      payout: returnAmount,
      status: 'completed',
      gameState: {
        stage: 'FINISHED',
        playerCards: [playerCard.code],
        dealerCards: [dealerCard.code],
        additionalData: { action: 'surrender' }
      }
    });
  };

  const goToWar = async () => {
    if (stage !== 'TIE_DECISION' || !user || !playerCard || !dealerCard) return;

    if (user.balance < bet) {
      setMessage('Saldo insuficiente para ir a la guerra.');
      return;
    }

    try {
      // Deduct war bet (equal to original bet)
      await updateBalance(-bet);
      
      let deck = shuffleDeck(createDeck());
      
      // Burn 3 cards
      const burns: Card[] = [];
      for (let i = 0; i < 3; i++) {
        const draw = drawCard(deck);
        burns.push(draw.card);
        deck = draw.remainingDeck;
      }
      setBurnedCards(burns);

      // Deal player war card
      const drawPlayer = drawCard(deck);
      const pWar = drawPlayer.card;
      deck = drawPlayer.remainingDeck;

      // Deal dealer war card
      const drawDealer = drawCard(deck);
      const dWar = drawDealer.card;
      
      setWarCardPlayer(pWar);
      setWarCardDealer(dWar);

      if (pWar.numericValue >= dWar.numericValue) {
        // Player wins the war (1:1 on war bet, Ante push, total payout = 3 * original bet)
        const winAmount = bet * 3;
        await updateBalance(winAmount);
        setStage('FINISHED');
        setPayout(winAmount);
        setMessage('¡Ganaste la Guerra! Cobras 1:1 en la apuesta de guerra.');

        await addGameHistory({
          gameId: '',
          gameType: 'war',
          bet: bet * 2, // Total bet is Ante + War
          payout: winAmount,
          status: 'completed',
          gameState: {
            stage: 'FINISHED',
            playerCards: [playerCard.code, pWar.code],
            dealerCards: [dealerCard.code, dWar.code],
            additionalData: {
              action: 'war',
              burnedCards: burns.map(c => c.code),
              result: 'win'
            }
          }
        });
      } else {
        // Dealer wins war, player loses both bets
        setStage('FINISHED');
        setPayout(0);
        setMessage('Perdiste la Guerra. El crupier gana ambas apuestas.');

        await addGameHistory({
          gameId: '',
          gameType: 'war',
          bet: bet * 2,
          payout: 0,
          status: 'completed',
          gameState: {
            stage: 'FINISHED',
            playerCards: [playerCard.code, pWar.code],
            dealerCards: [dealerCard.code, dWar.code],
            additionalData: {
              action: 'war',
              burnedCards: burns.map(c => c.code),
              result: 'loss'
            }
          }
        });
      }
    } catch (err: any) {
      console.error(err);
      setMessage('Error al resolver la Guerra.');
    }
  };

  const resetGame = () => {
    setStage('BETTING');
    setBet(0);
    setPlayerCard(null);
    setDealerCard(null);
    setWarCardPlayer(null);
    setWarCardDealer(null);
    setBurnedCards([]);
    setPayout(0);
    setMessage('Coloque su apuesta para comenzar.');
  };

  return {
    stage,
    bet,
    playerCard,
    dealerCard,
    warCardPlayer,
    warCardDealer,
    burnedCards,
    message,
    payout,
    startRound,
    surrender,
    goToWar,
    resetGame
  };
};
