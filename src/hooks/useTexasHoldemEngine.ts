import { useState } from 'react';
import type { Card } from '../utils/deck';
import { createDeck, shuffleDeck } from '../utils/deck';
import { useGameSession } from '../context/GameSessionContext';
import { evaluateTexas7Cards } from '../utils/texasEvaluator';
import type { TexasEvaluation } from '../utils/texasEvaluator';

export type TexasStage = 'betting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

export interface TexasPlayer {
  id: number;
  name: string;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalContributed: number;
  isFolded: boolean;
  isAllIn: boolean;
  isHuman: boolean;
  profile: 'human' | 'tight' | 'aggressive' | 'bluffer';
}

const INITIAL_BOTS: Omit<TexasPlayer, 'holeCards' | 'currentBet' | 'totalContributed' | 'isFolded' | 'isAllIn'>[] = [
  { id: 0, name: 'Tú', chips: 1000, isHuman: true, profile: 'human' },
  { id: 1, name: 'Bot Conservador', chips: 1000, isHuman: false, profile: 'tight' },
  { id: 2, name: 'Bot Agresivo', chips: 1000, isHuman: false, profile: 'aggressive' },
  { id: 3, name: 'Bot Farolero', chips: 1000, isHuman: false, profile: 'bluffer' },
];

export const useTexasHoldemEngine = () => {
  const { user, updateBalance, addGameHistory } = useGameSession();

  const [stage, setStage] = useState<TexasStage>('betting');
  const [deck, setDeck] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [players, setPlayers] = useState<TexasPlayer[]>([]);
  const [pot, setPot] = useState<number>(0);
  const [currentHighBet, setCurrentHighBet] = useState<number>(0);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [dealerButtonIndex, setDealerButtonIndex] = useState<number>(0);
  const [buyInAmount, setBuyInAmount] = useState<number>(100);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [showdownEvals, setShowdownEvals] = useState<Record<number, TexasEvaluation>>({});

  const SMALL_BLIND = 10;
  const BIG_BLIND = 20;

  const startRound = async (bet: number) => {
    if (!user || user.balance < bet || bet <= 0) return;

    await updateBalance(-bet);
    setBuyInAmount(bet);

    const currentDeck = shuffleDeck(createDeck());

    // Initialize 4 players
    const pList: TexasPlayer[] = INITIAL_BOTS.map(b => ({
      ...b,
      chips: b.isHuman ? bet : 1000,
      holeCards: [currentDeck.pop()!, currentDeck.pop()!],
      currentBet: 0,
      totalContributed: 0,
      isFolded: false,
      isAllIn: false,
    }));

    // Post Blinds
    const sbIdx = (dealerButtonIndex + 1) % 4;
    const bbIdx = (dealerButtonIndex + 2) % 4;

    pList[sbIdx].currentBet = SMALL_BLIND;
    pList[sbIdx].chips -= SMALL_BLIND;
    pList[sbIdx].totalContributed = SMALL_BLIND;

    pList[bbIdx].currentBet = BIG_BLIND;
    pList[bbIdx].chips -= BIG_BLIND;
    pList[bbIdx].totalContributed = BIG_BLIND;

    const initialPot = SMALL_BLIND + BIG_BLIND;
    let firstTurnIdx = (bbIdx + 1) % 4;

    setDeck(currentDeck);
    setCommunityCards([]);
    setPlayers(pList);
    setPot(initialPot);
    setCurrentHighBet(BIG_BLIND);
    setActivePlayerIndex(firstTurnIdx);
    setStage('pre-flop');
    setResultMessage('Fase Pre-Flop: Ciegas colocadas (10/20).');
    setShowdownEvals({});

    // If first turn belongs to a bot, trigger bot decision
    if (!pList[firstTurnIdx].isHuman) {
      setTimeout(() => triggerBotTurn(firstTurnIdx, pList, BIG_BLIND, initialPot, 'pre-flop', currentDeck, []), 700);
    }
  };

  const humanFold = () => {
    if (stage === 'betting' || stage === 'finished') return;
    executePlayerAction(0, 'fold');
  };

  const humanCheckCall = () => {
    if (stage === 'betting' || stage === 'finished') return;
    const human = players[0];
    const callAmount = currentHighBet - human.currentBet;

    if (callAmount === 0) {
      executePlayerAction(0, 'check');
    } else {
      executePlayerAction(0, 'call');
    }
  };

  const humanRaise = (raiseTotal: number) => {
    if (stage === 'betting' || stage === 'finished') return;
    executePlayerAction(0, 'raise', raiseTotal);
  };

  const executePlayerAction = (
    playerIdx: number,
    action: 'fold' | 'check' | 'call' | 'raise',
    raiseTotalAmount?: number,
    overridePlayers?: TexasPlayer[],
    overridePot?: number,
    overrideHighBet?: number,
    overrideStage?: TexasStage,
    overrideDeck?: Card[],
    overrideCommCards?: Card[]
  ) => {
    const currentStage = overrideStage || stage;
    const currentPList = overridePlayers || players;
    const currentPotVal = overridePot !== undefined ? overridePot : pot;
    const currentHighBetVal = overrideHighBet !== undefined ? overrideHighBet : currentHighBet;
    const currentDeckVal = overrideDeck || deck;
    const currentCommCardsVal = overrideCommCards || communityCards;

    const pList = [...currentPList];
    const p = { ...pList[playerIdx] };
    let newPot = currentPotVal;
    let newHighBet = currentHighBetVal;

    if (action === 'fold') {
      p.isFolded = true;
      setResultMessage(`${p.name} se retiró (Fold).`);
    } else if (action === 'call') {
      const callCost = newHighBet - p.currentBet;
      const actualCost = Math.min(callCost, p.chips);
      p.chips -= actualCost;
      p.currentBet += actualCost;
      p.totalContributed += actualCost;
      newPot += actualCost;
      if (p.chips === 0) p.isAllIn = true;
      setResultMessage(`${p.name} igualó la apuesta (${p.currentBet} fichas).`);
    } else if (action === 'check') {
      setResultMessage(`${p.name} pasó (Check).`);
    } else if (action === 'raise' && raiseTotalAmount) {
      const addedChips = raiseTotalAmount - p.currentBet;
      const actualAdded = Math.min(addedChips, p.chips);
      p.chips -= actualAdded;
      p.currentBet += actualAdded;
      p.totalContributed += actualAdded;
      newPot += actualAdded;
      newHighBet = p.currentBet;
      if (p.chips === 0) p.isAllIn = true;
      setResultMessage(`${p.name} subió la apuesta a ${newHighBet} fichas.`);
    }

    pList[playerIdx] = p;
    setPlayers(pList);
    setPot(newPot);
    setCurrentHighBet(newHighBet);

    // Check if only 1 player remains unfolded
    const activePlayers = pList.filter(pl => !pl.isFolded);
    if (activePlayers.length === 1) {
      awardWinnerByFold(activePlayers[0], newPot);
      return;
    }

    // Check if betting round is completed
    const activeNonAllIn = pList.filter(pl => !pl.isFolded && !pl.isAllIn);
    const allMatched = activeNonAllIn.every(pl => pl.currentBet === newHighBet);

    let nextIdx = (playerIdx + 1) % 4;

    // Skip folded / all-in players
    let checkCount = 0;
    while ((pList[nextIdx].isFolded || pList[nextIdx].isAllIn) && checkCount < 4) {
      nextIdx = (nextIdx + 1) % 4;
      checkCount++;
    }

    if (allMatched && (checkCount >= 4 || pList[nextIdx].currentBet === newHighBet)) {
      advanceStage(pList, newPot, currentStage, currentDeckVal, currentCommCardsVal);
    } else {
      setActivePlayerIndex(nextIdx);
      if (!pList[nextIdx].isHuman && !pList[nextIdx].isFolded && !pList[nextIdx].isAllIn) {
        setTimeout(() => triggerBotTurn(nextIdx, pList, newHighBet, newPot, currentStage, currentDeckVal, currentCommCardsVal), 700);
      }
    }
  };

  const triggerBotTurn = (
    botIdx: number,
    currentPlayers: TexasPlayer[],
    highBet: number,
    currentPot: number,
    currentStage: TexasStage,
    currentDeck: Card[],
    currentCommCards: Card[]
  ) => {
    const bot = currentPlayers[botIdx];
    if (bot.isFolded || bot.isAllIn) return;

    const callCost = highBet - bot.currentBet;

    if (callCost === 0) {
      if (bot.profile === 'aggressive' && Math.random() > 0.4) {
        executePlayerAction(botIdx, 'raise', highBet + 40, currentPlayers, currentPot, highBet, currentStage, currentDeck, currentCommCards);
      } else if (bot.profile === 'bluffer' && Math.random() > 0.5) {
        executePlayerAction(botIdx, 'raise', highBet + 60, currentPlayers, currentPot, highBet, currentStage, currentDeck, currentCommCards);
      } else {
        executePlayerAction(botIdx, 'check', undefined, currentPlayers, currentPot, highBet, currentStage, currentDeck, currentCommCards);
      }
    } else {
      if (bot.profile === 'tight' && callCost > 80 && Math.random() > 0.3) {
        executePlayerAction(botIdx, 'fold', undefined, currentPlayers, currentPot, highBet, currentStage, currentDeck, currentCommCards);
      } else if (bot.profile === 'bluffer' && Math.random() > 0.6) {
        executePlayerAction(botIdx, 'raise', highBet + 50, currentPlayers, currentPot, highBet, currentStage, currentDeck, currentCommCards);
      } else {
        executePlayerAction(botIdx, 'call', undefined, currentPlayers, currentPot, highBet, currentStage, currentDeck, currentCommCards);
      }
    }
  };

  const advanceStage = (
    pList: TexasPlayer[],
    currentPot: number,
    currentStage: TexasStage,
    currentDeck: Card[],
    currentCommCards: Card[]
  ) => {
    const resetPlayers = pList.map(pl => ({ ...pl, currentBet: 0 }));
    setPlayers(resetPlayers);
    setCurrentHighBet(0);

    const deckCopy = [...currentDeck];
    let nextCommCards = [...currentCommCards];
    let nextStage: TexasStage = currentStage;

    if (currentStage === 'pre-flop') {
      nextCommCards = [deckCopy.pop()!, deckCopy.pop()!, deckCopy.pop()!];
      nextStage = 'flop';
      setResultMessage('Flop revelado (3 cartas comunitarias).');
    } else if (currentStage === 'flop') {
      nextCommCards.push(deckCopy.pop()!);
      nextStage = 'turn';
      setResultMessage('Turn revelado (4ª carta comunitaria).');
    } else if (currentStage === 'turn') {
      nextCommCards.push(deckCopy.pop()!);
      nextStage = 'river';
      setResultMessage('River revelado (5ª carta comunitaria).');
    } else if (currentStage === 'river') {
      resolveShowdown(resetPlayers, nextCommCards, currentPot);
      return;
    }

    setCommunityCards(nextCommCards);
    setDeck(deckCopy);
    setStage(nextStage);

    let firstActive = (dealerButtonIndex + 1) % 4;
    while ((resetPlayers[firstActive].isFolded || resetPlayers[firstActive].isAllIn) && firstActive !== dealerButtonIndex) {
      firstActive = (firstActive + 1) % 4;
    }

    setActivePlayerIndex(firstActive);

    if (!resetPlayers[firstActive].isHuman && !resetPlayers[firstActive].isFolded && !resetPlayers[firstActive].isAllIn) {
      setTimeout(() => triggerBotTurn(firstActive, resetPlayers, 0, currentPot, nextStage, deckCopy, nextCommCards), 700);
    }
  };

  const resolveShowdown = async (pList: TexasPlayer[], commCards: Card[], finalPot: number) => {
    setStage('showdown');

    const evals: Record<number, TexasEvaluation> = {};
    let bestScore = -1;
    let winnerId = 0;

    pList.forEach(pl => {
      if (!pl.isFolded) {
        const ev = evaluateTexas7Cards([...pl.holeCards, ...commCards]);
        evals[pl.id] = ev;
        if (ev.score > bestScore) {
          bestScore = ev.score;
          winnerId = pl.id;
        }
      }
    });

    setShowdownEvals(evals);

    const winner = pList.find(pl => pl.id === winnerId)!;
    const winnerEval = evals[winnerId];

    let finalMsg = `¡Gana ${winner.name} con ${winnerEval.description}! (+${finalPot} fichas)`;
    setResultMessage(finalMsg);
    setStage('finished');

    if (winner.isHuman) {
      await updateBalance(finalPot);
    }

    await addGameHistory({
      gameId: `tex_${Date.now()}`,
      gameType: 'texas-holdem',
      bet: buyInAmount,
      payout: winner.isHuman ? finalPot : 0,
      status: 'completed',
      gameState: {
        stage: 'finished',
        playerCards: pList[0].holeCards.map(c => c.code),
        dealerCards: commCards.map(c => c.code),
      },
    });
  };

  const awardWinnerByFold = async (winner: TexasPlayer, finalPot: number) => {
    setStage('finished');
    const msg = `Todos los demás se retiraron. ¡Gana ${winner.name}! (+${finalPot} fichas)`;
    setResultMessage(msg);

    if (winner.isHuman) {
      await updateBalance(finalPot);
    }

    await addGameHistory({
      gameId: `tex_${Date.now()}`,
      gameType: 'texas-holdem',
      bet: buyInAmount,
      payout: winner.isHuman ? finalPot : 0,
      status: 'completed',
    });
  };

  const resetGame = () => {
    setStage('betting');
    setCommunityCards([]);
    setPlayers([]);
    setPot(0);
    setCurrentHighBet(0);
    setResultMessage('');
    setShowdownEvals({});
    setDealerButtonIndex(prev => (prev + 1) % 4);
  };

  return {
    stage,
    communityCards,
    players,
    pot,
    currentHighBet,
    activePlayerIndex,
    buyInAmount,
    resultMessage,
    showdownEvals,
    setBuyInAmount,
    startRound,
    humanFold,
    humanCheckCall,
    humanRaise,
    resetGame,
  };
};
