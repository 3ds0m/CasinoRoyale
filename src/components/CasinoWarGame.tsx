import React, { useState } from 'react';
import { useCasinoWarEngine } from '../hooks/useCasinoWarEngine';
import { Card3D } from './Card3D';
import { HowToPlayGuide } from './HowToPlayGuide';

interface CasinoWarGameProps {
  onBackToLobby: () => void;
}

export const CasinoWarGame: React.FC<CasinoWarGameProps> = ({ onBackToLobby }) => {
  const {
    stage,
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
    resetGame,
  } = useCasinoWarEngine();

  const [betAmount, setBetAmount] = useState<number>(100);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (betAmount <= 0) return;
    startRound(betAmount);
  };

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">Casino War</h2>
        <button className="btn btn-secondary" onClick={onBackToLobby}>
          Volver a las Mesas
        </button>
      </div>

      {/* Tapete de Juego */}
      <div className="game-table">
        <div className="game-table-felt-overlay" />

        {/* Message board */}
        <div className="game-info-overlay">
          <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ivory)' }}>{message}</p>
          {stage === 'FINISHED' && (
            <p style={{ marginTop: 4, color: payout > 0 ? 'var(--camel-light)' : 'rgba(255,255,255,0.5)' }}>
              {payout > 0 ? `Pagado: +${payout.toLocaleString()} fichas` : 'Apuesta perdida'}
            </p>
          )}
        </div>

        {/* Dealer Hand */}
        <div className="game-hand-section">
          <span className="game-hand-title">Crupier</span>
          <div className="game-cards-container">
            <Card3D card={dealerCard} flipped={stage !== 'BETTING'} />
            {stage === 'WAR_DEAL' && warCardDealer && (
              <Card3D card={warCardDealer} flipped={true} />
            )}
          </div>
        </div>

        {/* Burned Cards indicator (for WAR stage) */}
        {stage === 'WAR_DEAL' && burnedCards.length > 0 && (
          <div className="game-hand-section" style={{ margin: '12px 0' }}>
            <span className="game-hand-title" style={{ fontSize: '0.6rem' }}>Cartas Quemadas (3)</span>
            <div className="game-cards-container" style={{ minHeight: 'auto', gap: 6 }}>
              {burnedCards.map((c, i) => (
                <Card3D key={i} card={c} flipped={false} scale={0.65} />
              ))}
            </div>
          </div>
        )}

        {/* Player Hand */}
        <div className="game-hand-section">
          <span className="game-hand-title">Tu Mano</span>
          <div className="game-cards-container">
            <Card3D card={playerCard} flipped={stage !== 'BETTING'} />
            {stage === 'WAR_DEAL' && warCardPlayer && (
              <Card3D card={warCardPlayer} flipped={true} />
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          {stage === 'BETTING' && (
            <form onSubmit={handleStart} className="betting-area">
              <div className="bet-input-box">
                <label>Tu Apuesta</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }}>
                Repartir
              </button>
            </form>
          )}

          {stage === 'TIE_DECISION' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-primary" onClick={goToWar} style={{ background: 'var(--camel)', borderColor: 'var(--camel)' }}>
                Ir a la Guerra (Igualar Apuesta)
              </button>
              <button className="btn btn-secondary" onClick={surrender} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                Rendirse (Perder 50%)
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

        {/* Guía de Juego */}
        <HowToPlayGuide
          title="Casino War"
          steps={[
            "Ingresa la cantidad de fichas a apostar y presiona Repartir.",
            "Recibirás 1 carta al igual que el crupier. Gana la carta con mayor valor numérico (As es la más alta).",
            "Si hay un Empate (Tie), puedes rendirte y recuperar el 50% de tu apuesta, o Ir a la Guerra duplicando tu apuesta.",
            "Si vas a la guerra, se queman 3 cartas y se reparte 1 carta extra para cada uno para definir el ganador."
          ]}
          tips="Ir a la guerra cuando hay empate mantiene una de las ventajas de la casa más bajas del casino."
        />
      </div>
    </div>
  );
};
