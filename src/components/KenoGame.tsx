import React from 'react';
import { useKenoEngine, KENO_MULTIPLIERS } from '../hooks/useKenoEngine';
import { Sparkles, Trash2, Dices } from 'lucide-react';
import { HowToPlayGuide } from './HowToPlayGuide';

interface KenoGameProps {
  onBackToLobby: () => void;
}

export const KenoGame: React.FC<KenoGameProps> = ({ onBackToLobby }) => {
  const {
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
  } = useKenoEngine();

  const spotsCount = selectedNumbers.length;
  const currentMultTable = KENO_MULTIPLIERS[spotsCount] || {};

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Keno Lotería</h2>
          <span className="section-label">Elige de 1 a 10 números · Sorteo de 20 esferas</span>
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
            {resultMessage || `Seleccionados: ${spotsCount}/10 números`}
          </p>

          {stage === 'finished' && (
            <p style={{ marginTop: 4, color: totalPayout > 0 ? 'var(--camel-light)' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
              {totalPayout > 0 ? `Premio: +${totalPayout.toLocaleString()} fichas` : 'Sin premio'}
            </p>
          )}
        </div>

        {/* Layout with 80 Grid and Multipliers Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24, margin: '20px 0' }}>
          {/* 80-Cell Grid */}
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
              {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num);
                const isDrawn = drawnNumbers.includes(num);
                const isHit = hits.includes(num);

                let bg = 'rgba(255,255,255,0.05)';
                let border = '1px solid rgba(255,255,255,0.1)';
                let color = 'var(--ivory)';

                if (isHit) {
                  bg = 'var(--camel)';
                  border = '2px solid var(--gold)';
                  color = '#1a1a1a';
                } else if (isDrawn) {
                  bg = 'rgba(220,50,50,0.4)';
                  border = '1px solid #ef4444';
                  color = '#fff';
                } else if (isSelected) {
                  bg = 'rgba(40,120,240,0.4)';
                  border = '2px solid #3b82f6';
                  color = '#60a5fa';
                }

                return (
                  <div
                    key={num}
                    onClick={() => toggleNumber(num)}
                    style={{
                      background: bg,
                      border,
                      color,
                      height: 48,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1rem',
                      cursor: stage === 'selecting' ? 'pointer' : 'default',
                      userSelect: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multipliers & Stats Panel */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ color: 'var(--camel)', fontSize: '0.95rem', margin: 0 }}>Tabla de Premios</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: 0 }}>
              Multiplicadores para {spotsCount} {spotsCount === 1 ? 'número' : 'números'}:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
              {Object.keys(currentMultTable).length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                  Selecciona al menos 1 número para ver los multiplicadores.
                </div>
              ) : (
                Object.entries(currentMultTable).map(([hitCount, mult]) => (
                  <div 
                    key={hitCount}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '8px 12px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>{hitCount} aciertos</span>
                    <strong style={{ color: 'var(--camel-light)' }}>x{mult}</strong>
                  </div>
                ))
              )}
            </div>

            {/* Selection Quick Buttons */}
            {stage === 'selecting' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-felt" onClick={quickPick} style={{ justifyContent: 'center' }}>
                  <Sparkles size={14} style={{ marginRight: 6 }} /> Pick Rápido (5)
                </button>
                <button className="btn btn-secondary" onClick={clearSelection} style={{ justifyContent: 'center' }}>
                  <Trash2 size={14} style={{ marginRight: 6 }} /> Limpiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          {stage === 'selecting' && (
            <div className="betting-area">
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
              <button 
                className="btn btn-primary" 
                onClick={startDraw} 
                disabled={spotsCount === 0}
                style={{ alignSelf: 'flex-end', height: 42, minWidth: 160 }}
              >
                <Dices size={16} style={{ marginRight: 6 }} />
                Jugar Sorteo
              </button>
            </div>
          )}

          {stage === 'finished' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-primary" onClick={resetGame} style={{ minWidth: 160, height: 46 }}>
                Nueva Ronda
              </button>
              <button className="btn btn-secondary" onClick={onBackToLobby}>
                Volver al Lobby
              </button>
            </div>
          )}
        </div>

        <HowToPlayGuide
          title="Keno Lotería"
          steps={[
            "Haz clic en el panel para elegir entre 1 y 10 números de la suerte (o presiona Pick Rápido).",
            "Establece tu cantidad a apostar y presiona Jugar Sorteo.",
            "El bombo extraerá 20 números ganadores al azar.",
            "Cuantos más números aciertes, mayor será el multiplicador de tu premio según la tabla de recompensas."
          ]}
          tips="Jugar 5 o 6 números ofrece un equilibrio ideal entre probabilidad de acertar y grandes multiplicadores."
        />
      </div>
    </div>
  );
};
