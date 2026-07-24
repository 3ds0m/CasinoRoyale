import { useState } from 'react';
import { useGameSession } from '../context/GameSessionContext';

export type KenoStage = 'selecting' | 'drawing' | 'finished';

// Multipliers matrix: MULTIPLIERS[selectedSpots][hitsCount] = payout multiplier
export const KENO_MULTIPLIERS: Record<number, Record<number, number>> = {
  1: { 1: 3 },
  2: { 2: 12 },
  3: { 2: 2, 3: 42 },
  4: { 2: 1, 3: 5, 4: 130 },
  5: { 3: 3, 4: 15, 5: 800 },
  6: { 3: 1, 4: 7, 5: 90, 6: 1600 },
  7: { 3: 1, 4: 4, 5: 20, 6: 400, 7: 5000 },
  8: { 4: 2, 5: 12, 6: 100, 7: 1650, 8: 10000 },
  9: { 4: 1, 5: 6, 6: 44, 7: 335, 8: 4700, 9: 15000 },
  10: { 5: 5, 6: 24, 7: 140, 8: 1000, 9: 4500, 10: 25000 },
};

export const useKenoEngine = () => {
  const { user, updateBalance, addGameHistory } = useGameSession();

  const [stage, setStage] = useState<KenoStage>('selecting');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [hits, setHits] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState<number>(50);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [totalPayout, setTotalPayout] = useState<number>(0);

  const toggleNumber = (num: number) => {
    if (stage !== 'selecting') return;
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else {
      if (selectedNumbers.length >= 10) return;
      setSelectedNumbers(prev => [...prev, num].sort((a, b) => a - b));
    }
  };

  const quickPick = () => {
    if (stage !== 'selecting') return;
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    const picks: number[] = [];
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    setSelectedNumbers(picks.sort((a, b) => a - b));
  };

  const clearSelection = () => {
    if (stage !== 'selecting') return;
    setSelectedNumbers([]);
  };

  const startDraw = async () => {
    if (selectedNumbers.length === 0 || !user || user.balance < betAmount || betAmount <= 0) return;

    await updateBalance(-betAmount);
    setStage('drawing');
    setDrawnNumbers([]);
    setHits([]);
    setResultMessage('');
    setTotalPayout(0);

    // Draw 20 numbers
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    const drawn: number[] = [];
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      drawn.push(pool.splice(idx, 1)[0]);
    }

    setDrawnNumbers(drawn);

    const hitNums = drawn.filter(n => selectedNumbers.includes(n));
    setHits(hitNums);

    const spotsCount = selectedNumbers.length;
    const hitsCount = hitNums.length;
    const mult = KENO_MULTIPLIERS[spotsCount]?.[hitsCount] || 0;
    const winSum = mult * betAmount;

    if (winSum > 0) {
      await updateBalance(winSum);
    }

    setTotalPayout(winSum);
    setResultMessage(
      winSum > 0 
        ? `¡Acertaste ${hitsCount} de ${spotsCount} números! Ganaste x${mult} (+${winSum} fichas).`
        : `Acertaste ${hitsCount} de ${spotsCount} números. Sin premio en esta ronda.`
    );
    setStage('finished');

    await addGameHistory({
      gameId: `keno_${Date.now()}`,
      gameType: 'keno-bingo',
      bet: betAmount,
      payout: winSum,
      status: 'completed',
      gameState: {
        stage: 'finished',
        playerCards: selectedNumbers.map(n => n.toString()),
        dealerCards: drawn.map(n => n.toString()),
      },
    });
  };

  const resetGame = () => {
    setStage('selecting');
    setDrawnNumbers([]);
    setHits([]);
    setResultMessage('');
    setTotalPayout(0);
  };

  return {
    stage,
    selectedNumbers,
    drawnNumbers,
    hits,
    betAmount,
    resultMessage,
    totalPayout,
    setBetAmount,
    toggleNumber,
    quickPick,
    clearSelection,
    startDraw,
    resetGame,
  };
};
