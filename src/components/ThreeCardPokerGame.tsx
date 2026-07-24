import React, { useState } from 'react';
import { useThreeCardPokerEngine } from '../hooks/useThreeCardPokerEngine';
import { Card3D } from './Card3D';
import { HowToPlayGuide } from './HowToPlayGuide';

interface ThreeCardPokerGameProps {
  onBackToLobby: () => void;
}

export const ThreeCardPokerGame: React.FC<ThreeCardPokerGameProps> = ({ onBackToLobby }) => {
  const {
    stage,
    anteBet,
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
    resetGame,
  } = useThreeCardPokerEngine();

  const [anteInput, setAnteInput] = useState<number>(100);
  const [pairPlusInput, setPairPlusInput] = useState<number>(0);

  const handleDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (anteInput <= 0) return;
    dealHand(anteInput, pairPlusInput);
  };

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">Three Card Poker</h2>
        <button className="btn btn-secondary" onClick={onBackToLobby}>
          Volver a las Mesas
        </button>
      </div>

      {/* Tapete de Juego */}
      <div className="game-table">
        <div className="game-table-felt-overlay" />

        {/* Message board */}
        <div className="game-info-overlay">
          <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ivory)' }}>{message}</p>
          {stage === 'FINISHED' && (
            <p style={{ marginTop: 4, color: payout > 0 ? 'var(--camel-light)' : 'rgba(255,255,255,0.5)' }}>
              {payout > 0 ? `Pagado: +${payout.toLocaleString()} fichas` : 'Apuesta perdida'}
            </p>
          )}
        </div>

        {/* Dealer Hand (Visible only inFINISHED stage) */}
        <div className="game-hand-section">
          <span className="game-hand-title">
            Crupier {dealerEval && `(${dealerQualified ? dealerEval.description : 'No Califica'})`}
          </span>
          <div className="game-cards-container">
            {dealerCards.length === 3 ? (
              dealerCards.map((c, i) => (
                <Card3D key={i} card={c} flipped={stage === 'FINISHED'} />
              ))
            ) : (
              <>
                <Card3D card={null} />
                <Card3D card={null} />
                <Card3D card={null} />
              </>
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="game-hand-section">
          <span className="game-hand-title">
            Tu Mano {playerEval && `(${playerEval.description})`}
          </span>
          <div className="game-cards-container">
            {playerCards.length === 3 ? (
              playerCards.map((c, i) => (
                <Card3D key={i} card={c} flipped={stage !== 'BETTING'} />
              ))
            ) : (
              <>
                <Card3D card={null} />
                <Card3D card={null} />
                <Card3D card={null} />
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          {stage === 'BETTING' && (
            <form onSubmit={handleDeal} className="betting-area" style={{ flexWrap: 'wrap' }}>
              <div className="bet-input-box">
                <label>Apuesta Ante</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={anteInput}
                  onChange={(e) => setAnteInput(Math.max(10, parseInt(e.target.value, 10) || 0))}
                />
              </div>

              <div className="bet-input-box">
                <label>Pair Plus (Opcional)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={pairPlusInput}
                  onChange={(e) => setPairPlusInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }}>
                Repartir
              </button>
            </form>
          )}

          {stage === 'DECISION' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-primary" onClick={play}>
                Jugar (Igualar Ante: {anteBet})
              </button>
              <button className="btn btn-secondary" onClick={fold} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                Retirarse (Fold)
              </button>
            </div>
          )}

          {stage === 'FINISHED' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-primary" onClick={resetGame}>
                Volver a Jugar
              </button>
              <button className="btn btn-secondary" onClick={onBackToLobby} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                Volver al Lobby
              </button>
            </div>
          )}
        </div>

        <HowToPlayGuide
          title="Three Card Poker"
          steps={[
            "Coloca tu apuesta Ante (y opcionalmente Pair Plus) y presiona Repartir.",
            "Recibirás 3 cartas. Revisa tu mano e iguala la apuesta Ante con la opción Jugar (Play) o Retírate (Fold).",
            "La mano del crupier debe clasificar con al menos Reina alta (Q) para calificar.",
            "En Three Card Poker, las tercias pagan más que las escaleras y colores."
          ]}
          tips="La estrategia óptima en Three Card Poker es jugar siempre con mano Q-6-4 o superior."
        />
      </div>
    </div>
  );
};
