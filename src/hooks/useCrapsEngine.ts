import { useState, useEffect } from 'react';
import { useGameSession } from '../context/GameSessionContext';

export type CrapsStage = 'COME_OUT' | 'POINT';

export const useCrapsEngine = () => {
  const { user, activeGame, saveActiveGame, clearActiveGame, addGameHistory, updateBalance } = useGameSession();

  const [stage, setStage] = useState<CrapsStage>('COME_OUT');
  const [point, setPoint] = useState<number | null>(null);
  
  const [passLineBet, setPassLineBet] = useState<number>(0);
  const [dontPassBet, setDontPassBet] = useState<number>(0);
  const [fieldBet, setFieldBet] = useState<number>(0);

  const [rolling, setRolling] = useState<boolean>(false);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState<string>('Realice sus apuestas. Come Out Roll inicial.');
  const [payout, setPayout] = useState<number>(0);

  // Resume game state if it exists
  useEffect(() => {
    if (activeGame && activeGame.gameType === 'craps' && activeGame.gameState) {
      const state = activeGame.gameState;
      setStage(state.stage as CrapsStage);
      setPassLineBet(activeGame.bet);
      
      const extra = state.additionalData;
      if (extra) {
        setPoint(extra.point || null);
        setDontPassBet(extra.dontPassBet || 0);
        setFieldBet(extra.fieldBet || 0);
        if (extra.message) setMessage(extra.message);
      }
    }
  }, [activeGame]);

  const placeBet = async (type: 'pass' | 'dontpass' | 'field', amount: number) => {
    if (!user || rolling) return;

    // Pass Line and Don't Pass can only be placed on Come Out phase
    if (stage === 'POINT' && (type === 'pass' || type === 'dontpass')) {
      setMessage('Las apuestas Pass Line y Don\'t Pass sólo se permiten en el tiro de Come Out.');
      return;
    }

    if (user.balance < amount) {
      setMessage('Saldo insuficiente.');
      return;
    }

    try {
      await updateBalance(-amount);

      if (type === 'pass') setPassLineBet((prev) => prev + amount);
      if (type === 'dontpass') setDontPassBet((prev) => prev + amount);
      if (type === 'field') setFieldBet((prev) => prev + amount);

      setMessage('Apuesta colocada con éxito.');
    } catch (err: any) {
      console.error(err);
      setMessage('Error de comunicación.');
    }
  };

  const clearBets = async () => {
    if (rolling) return;

    // In Point phase, Pass and Don't Pass bets are contract bets and cannot be refunded
    if (stage === 'POINT') {
      const totalRefund = fieldBet;
      if (totalRefund > 0) {
        await updateBalance(totalRefund);
        setFieldBet(0);
        setMessage('Apuesta de Campo devuelta. Apuestas de Pase/No Pase están bloqueadas en esta fase.');
      }
      return;
    }

    try {
      const totalRefund = passLineBet + dontPassBet + fieldBet;
      if (totalRefund > 0) {
        await updateBalance(totalRefund);
        setPassLineBet(0);
        setDontPassBet(0);
        setFieldBet(0);
        setMessage('Apuestas retiradas.');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const rollDice = async (onRollComplete: (d1: number, d2: number) => void) => {
    const totalBet = passLineBet + dontPassBet + fieldBet;
    if (totalBet === 0 || rolling) return;

    setRolling(true);
    setDice(null);
    setPayout(0);
    setMessage('Los dados están rodando...');

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    // Simulate 3D roll physics duration (e.g., 2.5 seconds)
    setTimeout(async () => {
      try {
        setDice([d1, d2]);
        setRolling(false);

        let roundPayout = 0;
        let roundFinished = false;
        let logMsg = `Lanzamiento: ${d1} + ${d2} = ${total}.`;

        // 1. Resolve Field Bet (checked on every single roll)
        let fieldPayout = 0;
        if (fieldBet > 0) {
          if (total === 2) {
            fieldPayout = fieldBet * 3; // 2:1 payout + returns bet (total 3x)
            roundPayout += fieldPayout;
            logMsg += ' ¡Ganaste Campo (2 paga Doble)!';
          } else if (total === 12) {
            fieldPayout = fieldBet * 4; // 3:1 payout + returns bet (total 4x)
            roundPayout += fieldPayout;
            logMsg += ' ¡Ganaste Campo (12 paga Triple)!';
          } else if ([3, 4, 9, 10, 11].includes(total)) {
            fieldPayout = fieldBet * 2; // 1:1 payout + returns bet (total 2x)
            roundPayout += fieldPayout;
            logMsg += ' ¡Ganaste Campo (1:1)!';
          } else {
            logMsg += ' Perdiste apuesta de Campo.';
          }
          setFieldBet(0); // Field bet is resolved and cleared on every roll
        }

        // 2. Resolve Main Stage Line Bets
        if (stage === 'COME_OUT') {
          if (total === 7 || total === 11) {
            // Natural
            roundPayout += passLineBet * 2; // 1:1 payout
            setPassLineBet(0);
            setDontPassBet(0);
            roundFinished = true;
            logMsg += ' ¡Natural! Pass Line gana. Ronda completada.';
          } else if (total === 2 || total === 3 || total === 12) {
            // Craps
            if (total === 12) {
              roundPayout += dontPassBet; // Push (bar 12)
            } else {
              roundPayout += dontPassBet * 2; // 1:1 payout
            }
            setPassLineBet(0);
            setDontPassBet(0);
            roundFinished = true;
            logMsg += ` ¡Craps! (${total}). Don't Pass gana (12 empata). Ronda completada.`;
          } else {
            // Establish Point
            setPoint(total);
            setStage('POINT');
            logMsg += ` El Punto se establece en ${total}. Fase del Punto iniciada.`;
            
            // Save point status to Firestore active game (to prevent cheats if closing browser)
            await saveActiveGame({
              gameId: '',
              gameType: 'craps',
              bet: passLineBet,
              payout: 0,
              status: 'active',
              gameState: {
                stage: 'POINT',
                playerCards: [],
                dealerCards: [],
                additionalData: {
                  point: total,
                  dontPassBet,
                  fieldBet: 0,
                  message: logMsg
                }
              }
            });
          }
        } else if (stage === 'POINT') {
          if (total === point) {
            // Player rolls point again: Pass Line wins
            roundPayout += passLineBet * 2;
            setPassLineBet(0);
            setDontPassBet(0);
            setPoint(null);
            setStage('COME_OUT');
            roundFinished = true;
            logMsg += ` ¡Punto completado! Pass Line gana. Ronda completada.`;
          } else if (total === 7) {
            // Seven out: Don't Pass wins
            roundPayout += dontPassBet * 2;
            setPassLineBet(0);
            setDontPassBet(0);
            setPoint(null);
            setStage('COME_OUT');
            roundFinished = true;
            logMsg += ` ¡Seven Out! Don't Pass gana. Ronda completada.`;
          } else {
            // Keep rolling
            logMsg += ` El punto es ${point}. Sigue lanzando.`;
            
            // Re-save active point state
            await saveActiveGame({
              gameId: '',
              gameType: 'craps',
              bet: passLineBet,
              payout: 0,
              status: 'active',
              gameState: {
                stage: 'POINT',
                playerCards: [],
                dealerCards: [],
                additionalData: {
                  point,
                  dontPassBet,
                  fieldBet: 0,
                  message: logMsg
                }
              }
            });
          }
        }

        // Apply payouts to balance
        if (roundPayout > 0) {
          await updateBalance(roundPayout);
        }

        setMessage(logMsg);
        setPayout(roundPayout);

        // If the round has officially ended, clear active game and log in history
        if (roundFinished) {
          await clearActiveGame();
          await addGameHistory({
            gameId: '',
            gameType: 'craps',
            bet: totalBet,
            payout: roundPayout,
            status: 'completed',
            gameState: {
              stage: 'FINISHED',
              playerCards: [],
              dealerCards: [],
              additionalData: {
                d1,
                d2,
                total,
                logMsg
              }
            }
          });
        }

        onRollComplete(d1, d2);
      } catch (err) {
        console.error("Error resolving craps round:", err);
      }
    }, 2500);
  };

  const resetGame = () => {
    setStage('COME_OUT');
    setPoint(null);
    setPassLineBet(0);
    setDontPassBet(0);
    setFieldBet(0);
    setDice(null);
    setPayout(0);
    setMessage('Realice sus apuestas. Come Out Roll inicial.');
  };

  return {
    stage,
    point,
    passLineBet,
    dontPassBet,
    fieldBet,
    rolling,
    dice,
    message,
    payout,
    placeBet,
    clearBets,
    rollDice,
    resetGame,
  };
};
