import React, { useState } from 'react';
import { usePaiGowEngine } from '../hooks/usePaiGowEngine';
import { Card3D } from './Card3D';
import { Sparkles, CheckCircle, ShieldAlert } from 'lucide-react';
import { HowToPlayGuide } from './HowToPlayGuide';

interface PaiGowGameProps {
  onBackToLobby: () => void;
}

export const PaiGowGame: React.FC<PaiGowGameProps> = ({ onBackToLobby }) => {
  const {
    stage,
    playerHigh5,
    playerLow2,
    dealerHigh5,
    dealerLow2,
    resultMessage,
    errorMsg,
    payout,
    evaluations,
    startRound,
    toggleCardSelection,
    autoSetPlayerHouseWay,
    confirmHands,
    resetGame,
  } = usePaiGowEngine();

  const [inputBet, setInputBet] = useState<number>(100);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputBet <= 0) return;
    startRound(inputBet);
  };

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Pai Gow Poker</h2>
          <span className="section-label">7 Cartas · Mano Alta (5) + Mano Frontal (2)</span>
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
          <p style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--ivory)' }}>
            {resultMessage || 'Divide tus 7 cartas en una mano de 5 cartas y una de 2 cartas.'}
          </p>

          {errorMsg && (
            <p style={{ color: 'var(--signal-red)', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ShieldAlert size={16} /> {errorMsg}
            </p>
          )}

          {stage === 'finished' && (
            <p style={{ marginTop: 6, color: payout > 0 ? 'var(--camel-light)' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
              {payout > 0 ? `Pagado: +${payout.toLocaleString()} fichas` : 'Sin ganancias en esta ronda'}
            </p>
          )}
        </div>

        {/* Dealer Area */}
        <div className="game-hand-section" style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 'var(--radius-md)', margin: '16px 0' }}>
          <span className="game-hand-title" style={{ fontSize: '0.9rem' }}>BANCA (CRUPIER)</span>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 12 }}>
            {/* Dealer Low 2 */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 6 }}>
                Mano Frontal (2 Cartas) {evaluations.dealerLow && `· ${evaluations.dealerLow.rankName}`}
              </div>
              <div className="game-cards-container" style={{ justifyContent: 'center', minHeight: 90 }}>
                {dealerLow2.map((card, i) => (
                  <Card3D key={i} card={card} flipped={stage === 'finished'} scale={0.8} />
                ))}
              </div>
            </div>

            {/* Dealer High 5 */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 6 }}>
                Mano Alta (5 Cartas) {evaluations.dealerHigh && `· ${evaluations.dealerHigh.rankName}`}
              </div>
              <div className="game-cards-container" style={{ justifyContent: 'center', minHeight: 90 }}>
                {dealerHigh5.map((card, i) => (
                  <Card3D key={i} card={card} flipped={stage === 'finished'} scale={0.8} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Player Area */}
        {(stage === 'setting-hand' || stage === 'finished') && (
          <div className="game-hand-section" style={{ background: 'rgba(0,0,0,0.25)', padding: 16, borderRadius: 'var(--radius-md)', margin: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="game-hand-title" style={{ fontSize: '0.9rem', color: 'var(--ivory)' }}>TU MANO</span>
              {stage === 'setting-hand' && (
                <button className="btn btn-felt" onClick={autoSetPlayerHouseWay} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Sparkles size={14} style={{ marginRight: 4 }} />
                  Ordenar por House Way
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              {/* Player Low 2 */}
              <div style={{ border: '1px dashed var(--camel)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--camel-light)', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  Mano Frontal (2 Cartas) {evaluations.playerLow && `· ${evaluations.playerLow.rankName}`}
                </div>
                <div className="game-cards-container" style={{ justifyContent: 'center', minHeight: 100 }}>
                  {playerLow2.map((card) => (
                    <div key={card.code} onClick={() => toggleCardSelection(card)} style={{ cursor: stage === 'setting-hand' ? 'pointer' : 'default' }}>
                      <Card3D card={card} flipped={true} scale={0.85} />
                    </div>
                  ))}
                  {playerLow2.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', padding: 20, textAlign: 'center' }}>
                      Haz clic en cartas para enviarlas aquí
                    </div>
                  )}
                </div>
              </div>

              {/* Player High 5 */}
              <div style={{ border: '1px solid rgba(255,255,255,0.2)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--ivory)', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  Mano Alta (5 Cartas) {evaluations.playerHigh && `· ${evaluations.playerHigh.rankName}`}
                </div>
                <div className="game-cards-container" style={{ justifyContent: 'center', minHeight: 100 }}>
                  {playerHigh5.map((card) => (
                    <div key={card.code} onClick={() => toggleCardSelection(card)} style={{ cursor: stage === 'setting-hand' ? 'pointer' : 'default' }}>
                      <Card3D card={card} flipped={true} scale={0.85} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          {stage === 'betting' && (
            <form onSubmit={handleStart} className="betting-area">
              <div className="bet-input-box">
                <label>Tu Apuesta</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={inputBet}
                  onChange={(e) => setInputBet(Math.max(10, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }}>
                Repartir 7 Cartas
              </button>
            </form>
          )}

          {stage === 'setting-hand' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-primary" onClick={confirmHands} style={{ minWidth: 180, height: 44 }}>
                <CheckCircle size={16} style={{ marginRight: 6 }} />
                Confirmar Manos
              </button>
            </div>
          )}

          {stage === 'finished' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-primary" onClick={resetGame} style={{ minWidth: 160 }}>
                Nueva Ronda
              </button>
              <button className="btn btn-secondary" onClick={onBackToLobby}>
                Volver al Lobby
              </button>
            </div>
          )}
        </div>

        <HowToPlayGuide
          title="Pai Gow Poker"
          steps={[
            "Ingresa tu apuesta y presiona Repartir 7 Cartas.",
            "Separa tus 7 cartas en una Mano Alta (5 cartas) y una Mano Frontal (2 cartas).",
            "REGLA OBLIGATORIA: La Mano Alta de 5 cartas DEBE ser de mayor categoría que la Mano Frontal de 2 cartas.",
            "Para ganar, tus dos manos deben superar a las dos manos del crupier. Si ganas 1 y pierdes 1, hay un Empate (Push)."
          ]}
          tips="Usa el botón 'Ordenar por House Way' para que el juego acomode tus cartas con la estrategia óptima de la banca."
        />
      </div>
    </div>
  );
};
