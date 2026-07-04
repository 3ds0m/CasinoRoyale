import { useState } from 'react';
import { useGameSession } from '../context/GameSessionContext';
import type { RouletteBet } from '../types/schema';

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const getNumberColor = (num: number): 'green' | 'red' | 'black' => {
  if (num === 0) return 'green';
  return RED_NUMBERS.includes(num) ? 'red' : 'black';
};

export const useRouletteEngine = () => {
  const { user, addGameHistory, updateBalance } = useGameSession();

  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('Realice sus apuestas en el tapete.');
  const [payout, setPayout] = useState<number>(0);

  const placeBet = async (type: RouletteBet['type'], value: string, amount: number) => {
    if (!user) return;
    if (spinning) return;

    if (user.balance < amount) {
      setMessage('Saldo insuficiente.');
      return;
    }

    try {
      await updateBalance(-amount);

      setBets((prev) => {
        const existingIndex = prev.findIndex((b) => b.type === type && b.value === value);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            amount: updated[existingIndex].amount + amount,
          };
          return updated;
        }
        return [...prev, { type, value, amount }];
      });
      setMessage('Apuesta colocada con éxito.');
    } catch (err: any) {
      console.error(err);
      setMessage('Error de comunicación.');
    }
  };

  const clearBets = async () => {
    if (spinning || bets.length === 0) return;

    try {
      const totalRefund = bets.reduce((sum, b) => sum + b.amount, 0);
      await updateBalance(totalRefund);
      setBets([]);
      setMessage('Apuestas retiradas.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const spin = async (onSpinComplete: (winningNum: number) => void) => {
    if (bets.length === 0 || spinning) return;

    setSpinning(true);
    setWinningNumber(null);
    setPayout(0);
    setMessage('La ruleta está girando...');

    // Choose winning number securely
    const winner = Math.floor(Math.random() * 37);

    // Simulate physics wheel spinning delay (e.g. 4 seconds)
    setTimeout(async () => {
      try {
        setWinningNumber(winner);
        setSpinning(false);

        let roundPayout = 0;
        const color = getNumberColor(winner);
        const isEven = winner !== 0 && winner % 2 === 0;

        for (const bet of bets) {
          let betWon = false;
          let multiplier = 0;

          if (bet.type === 'number') {
            if (parseInt(bet.value, 10) === winner) {
              betWon = true;
              multiplier = 35;
            }
          } else if (bet.type === 'color') {
            if (bet.value === color) {
              betWon = true;
              multiplier = 1;
            }
          } else if (bet.type === 'parity') {
            if (winner !== 0) {
              if (bet.value === 'even' && isEven) betWon = true;
              if (bet.value === 'odd' && !isEven) betWon = true;
              multiplier = 1;
            }
          } else if (bet.type === 'dozen') {
            if (winner !== 0) {
              if (bet.value === '1st' && winner >= 1 && winner <= 12) betWon = true;
              if (bet.value === '2nd' && winner >= 13 && winner <= 24) betWon = true;
              if (bet.value === '3rd' && winner >= 25 && winner <= 36) betWon = true;
              multiplier = 2;
            }
          } else if (bet.type === 'highlow') {
            if (winner !== 0) {
              if (bet.value === 'low' && winner >= 1 && winner <= 18) betWon = true;
              if (bet.value === 'high' && winner >= 19 && winner <= 36) betWon = true;
              multiplier = 1;
            }
          }

          if (betWon) {
            roundPayout += bet.amount * (multiplier + 1); // Returns bet + wins payout
          }
        }

        if (roundPayout > 0) {
          await updateBalance(roundPayout);
          setMessage(`¡Salió el ${winner} (${color === 'red' ? 'Rojo' : color === 'black' ? 'Negro' : 'Cero'})! Ganaste ${roundPayout.toLocaleString()} fichas.`);
        } else {
          setMessage(`Salió el ${winner} (${color === 'red' ? 'Rojo' : color === 'black' ? 'Negro' : 'Cero'}). Mejor suerte la próxima.`);
        }

        setPayout(roundPayout);

        // Save round history
        const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
        await addGameHistory({
          gameId: '',
          gameType: 'roulette',
          bet: totalBet,
          payout: roundPayout,
          status: 'completed',
          gameState: {
            stage: 'FINISHED',
            playerCards: [], // No cards for roulette
            dealerCards: [],
            additionalData: {
              winningNumber: winner,
              color,
              bets: bets.map(b => ({ type: b.type, value: b.value, amount: b.amount }))
            }
          }
        });

        // Trigger visual animations callback
        onSpinComplete(winner);
      } catch (err) {
        console.error("Error resolving roulette round:", err);
      }
    }, 4000);
  };

  const resetBetsOnly = () => {
    setBets([]);
  };

  return {
    bets,
    spinning,
    winningNumber,
    message,
    payout,
    placeBet,
    clearBets,
    spin,
    resetBetsOnly,
  };
};
