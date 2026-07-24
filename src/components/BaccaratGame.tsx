import React from 'react';
import { useBaccaratEngine } from '../hooks/useBaccaratEngine';
import { Card3D } from './Card3D';
import { Coins, RefreshCw } from 'lucide-react';

interface BaccaratGameProps {
  onBackToLobby: () => void;
}

export const BaccaratGame: React.FC<BaccaratGameProps> = ({ onBackToLobby }) => {
  const {
    stage,
    playerCards,
    bankerCards,
    bets,
    chipDenomination,
    resultMessage,
    totalPayout,
    isNatural,
    playerValue,
    bankerValue,
    setChipDenomination,
    placeBet,
    clearBets,
    deal,
    resetGame,
  } = useBaccaratEngine();

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Baccarat</h2>
          <span className="section-label">Punto & Banca · Punto clave 9</span>
        </div>
        <button className="btn btn-secondary" onClick={onBackToLobby}>
          Volver a las Mesas
        </button>
      </div>

      {/* Tapete de Juego */}
      <div className="game-table">
        <div className="game-table-felt-overlay" />

        {/* Message board */}
        <div className="game-info-overlay">
          <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--ivory)' }}>
            {resultMessage || 'Coloca tus apuestas en Jugador, Banca o Empate'}
          </p>
          {isNatural && <p style={{ color: 'var(--camel)', fontSize: '0.85rem', marginTop: 4 }}>¡NATURAL (8/9)!</p>}
          {stage === 'finished' && (
            <p style={{ marginTop: 4, color: totalPayout > 0 ? 'var(--camel-light)' : 'rgba(255,255,255,0.5)' }}>
              {totalPayout > 0 ? `Pagado: +${totalPayout.toLocaleString()} fichas` : 'Apuesta no ganadora'}
            </p>
          )}
        </div>

        {/* Hands Container */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, margin: '20px 0' }}>
          {/* Player Hand */}
          <div className="game-hand-section" style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="game-hand-title" style={{ fontSize: '1rem', color: 'var(--ivory)' }}>JUGADOR (PLAYER)</span>
              {playerCards.length > 0 && (
                <span className="result-badge win" style={{ fontSize: '1rem', padding: '4px 12px' }}>
                  Puntos: {playerValue}
                </span>
              )}
            </div>
            <div className="game-cards-container" style={{ justifyContent: 'center' }}>
              {playerCards.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>Esperando reparto...</div>
              ) : (
                playerCards.map((card, i) => (
                  <Card3D key={i} card={card} flipped={true} />
                ))
              )}
            </div>
          </div>

          {/* Banker Hand */}
          <div className="game-hand-section" style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="game-hand-title" style={{ fontSize: '1rem', color: 'var(--ivory)' }}>BANCA (BANKER)</span>
              {bankerCards.length > 0 && (
                <span className="result-badge win" style={{ fontSize: '1rem', padding: '4px 12px', background: 'var(--bordeaux)' }}>
                  Puntos: {bankerValue}
                </span>
              )}
            </div>
            <div className="game-cards-container" style={{ justifyContent: 'center' }}>
              {bankerCards.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>Esperando reparto...</div>
              ) : (
                bankerCards.map((card, i) => (
                  <Card3D key={i} card={card} flipped={true} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Betting Board */}
        {stage === 'betting' && (
          <div style={{ marginTop: 24 }}>
            {/* Chip selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  className={`btn ${chipDenomination === val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChipDenomination(val)}
                  style={{ borderRadius: '50px', padding: '8px 16px' }}
                >
                  <Coins size={14} style={{ marginRight: 6 }} />
                  {val}
                </button>
              ))}
            </div>

            {/* Betting spots */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 800, margin: '0 auto' }}>
              {/* Player Pair */}
              <div 
                onClick={() => placeBet('playerPair')}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Par Jugador (11:1)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 4 }}>{bets.playerPair}</div>
              </div>

              {/* Tie */}
              <div 
                onClick={() => placeBet('tie')}
                style={{
                  background: 'rgba(240, 200, 80, 0.1)',
                  border: '1px dashed var(--camel)',
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--camel)' }}>EMPATE / TIE (8:1)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4 }}>{bets.tie}</div>
              </div>

              {/* Banker Pair */}
              <div 
                onClick={() => placeBet('bankerPair')}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Par Banca (11:1)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 4 }}>{bets.bankerPair}</div>
              </div>

              {/* Main Player Bet */}
              <div 
                onClick={() => placeBet('player')}
                style={{
                  gridColumn: 'span 1',
                  background: 'rgba(40, 100, 220, 0.2)',
                  border: '2px solid #3b82f6',
                  padding: 24,
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>JUGADOR (1:1)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6, color: '#fff' }}>{bets.player}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Total Apuesto</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--camel-light)' }}>{totalBet}</span>
              </div>

              {/* Main Banker Bet */}
              <div 
                onClick={() => placeBet('banker')}
                style={{
                  gridColumn: 'span 1',
                  background: 'rgba(220, 40, 40, 0.2)',
                  border: '2px solid #ef4444',
                  padding: 24,
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>BANCA (0.95:1)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6, color: '#fff' }}>{bets.banker}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
              <button 
                className="btn btn-primary" 
                onClick={deal} 
                disabled={totalBet === 0}
                style={{ minWidth: 160, height: 48, fontSize: '1rem' }}
              >
                Repartir
              </button>
              <button className="btn btn-secondary" onClick={clearBets} disabled={totalBet === 0}>
                <RefreshCw size={14} style={{ marginRight: 6 }} />
                Limpiar
              </button>
            </div>
          </div>
        )}

        {/* Action Controls for finished stage */}
        {stage === 'finished' && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <button className="btn btn-primary" onClick={resetGame} style={{ minWidth: 180, height: 48, fontSize: '1rem' }}>
              Nueva Ronda
            </button>
            <button className="btn btn-secondary" onClick={onBackToLobby}>
              Volver al Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
