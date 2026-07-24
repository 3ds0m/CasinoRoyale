import React, { useState } from 'react';
import { useCrapsEngine } from '../hooks/useCrapsEngine';
import { Dice3D } from './Dice3D';
import { HowToPlayGuide } from './HowToPlayGuide';

interface CrapsGameProps {
  onBackToLobby: () => void;
}

export const CrapsGame: React.FC<CrapsGameProps> = ({ onBackToLobby }) => {
  const {
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
  } = useCrapsEngine();

  const [activeChip, setActiveChip] = useState<number>(100);

  const handleRoll = () => {
    if (rolling) return;
    rollDice((_d1, _d2) => {
      // Roll complete actions if needed
    });
  };

  const totalBetAmount = passLineBet + dontPassBet + fieldBet;

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">Dados / Craps</h2>
        <button className="btn btn-secondary" onClick={onBackToLobby}>
          Volver a las Mesas
        </button>
      </div>

      {/* Tapete de Juego */}
      <div className="game-table" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="game-table-felt-overlay" />

        {/* Top: Status Message & Point Marker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ivory)' }}>{message}</p>
            {payout > 0 && (
              <p style={{ marginTop: 4, color: 'var(--camel-light)', fontWeight: 700 }}>
                ¡Pagado: +{payout.toLocaleString()} fichas!
              </p>
            )}
          </div>

          {/* Point puck indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
              Marcador de Punto:
            </span>
            <div className={`craps-puck ${point ? 'puck-on' : 'puck-off'}`}>
              {point ? `ON (${point})` : 'OFF'}
            </div>
          </div>
        </div>

        {/* Middle: Dice Rolling Box */}
        <div className="craps-dice-box" style={{ zIndex: 5 }}>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            <Dice3D value={dice ? dice[0] : 3} rolling={rolling} />
            <Dice3D value={dice ? dice[1] : 4} rolling={rolling} />
          </div>
        </div>

        {/* Bottom: Betting Board */}
        <div className="craps-board-layout" style={{ zIndex: 5 }}>
          {/* Pass Line Slot */}
          <div
            className={`craps-board-slot pass-line-slot ${passLineBet > 0 ? 'has-bet' : ''}`}
            onClick={() => placeBet('pass', activeChip)}
          >
            <div className="slot-title">LÍNEA DE PASE (PASS LINE)</div>
            <div className="slot-payout">Gana con 7 u 11 · Establece Punto</div>
            {passLineBet > 0 && <div className="craps-chip-indicator">{passLineBet}</div>}
          </div>

          {/* Don't Pass Bar Slot */}
          <div
            className={`craps-board-slot dont-pass-slot ${dontPassBet > 0 ? 'has-bet' : ''}`}
            onClick={() => placeBet('dontpass', activeChip)}
          >
            <div className="slot-title">LÍNEA DE NO PASE (DON'T PASS)</div>
            <div className="slot-payout">Gana con 2 o 3 · Empata con 12</div>
            {dontPassBet > 0 && <div className="craps-chip-indicator">{dontPassBet}</div>}
          </div>

          {/* Field Bet Box */}
          <div
            className={`craps-board-slot field-bet-slot ${fieldBet > 0 ? 'has-bet' : ''}`}
            onClick={() => placeBet('field', activeChip)}
          >
            <div className="slot-title">CAMPO (FIELD APUESTA ÚNICA)</div>
            <div className="field-numbers-row">
              <span className="special-multiplier">2 <span className="sub">×2</span></span>
              <span>3</span>
              <span>4</span>
              <span>9</span>
              <span>10</span>
              <span>11</span>
              <span className="special-multiplier">12 <span className="sub">×3</span></span>
            </div>
            {fieldBet > 0 && <div className="craps-chip-indicator">{fieldBet}</div>}
          </div>
        </div>

        {/* Controls Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', zIndex: 5 }}>
          {/* Chip Value select */}
          <div className="chips-selector-row">
            {[10, 50, 100, 500].map((val) => (
              <button
                key={val}
                className={`chip-button chip-${val} ${activeChip === val ? 'active' : ''}`}
                onClick={() => setActiveChip(val)}
              >
                {val}
              </button>
            ))}
          </div>

          {/* Summary info */}
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
            Mesa: <strong style={{ color: 'var(--ivory)' }}>{totalBetAmount.toLocaleString()}</strong> fichas apostadas
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-secondary"
              disabled={rolling || totalBetAmount === 0}
              onClick={clearBets}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              Limpiar Apuestas
            </button>

            <button
              className="btn btn-primary"
              disabled={rolling || totalBetAmount === 0}
              onClick={handleRoll}
              style={{ background: 'var(--camel)', borderColor: 'var(--camel)' }}
            >
              Lanzar Dados
            </button>

            {stage === 'COME_OUT' && dice !== null && !rolling && (
              <button className="btn btn-secondary" onClick={resetGame} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                Nueva Mesa
              </button>
            )}
          </div>
        </div>

        <HowToPlayGuide
          title="Dados (Craps)"
          steps={[
            "Selecciona el valor de tus fichas y coloca tu apuesta en Pass Line (Pase) o Don't Pass (No Pase).",
            "Presiona Lanzar Dados para hacer el tiro inicial (Come Out Roll).",
            "Si sale 7 u 11 en el tiro Come Out, ¡ganas inmediatamente en Pass Line! Si sale 2, 3 o 12 (Craps), pierdes.",
            "Si sale cualquier otro número (4, 5, 6, 8, 9, 10), ese número se convierte en el Punto (POINT ON). Debe volver a salir dicho número antes que un 7 para ganar."
          ]}
          tips="Puedes hacer apuestas de Campo (Field) en cualquier tiro para intentar adivinar números rápidos."
        />
      </div>
    </div>
  );
};
