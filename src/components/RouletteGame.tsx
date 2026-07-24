import React, { useState, useEffect, useRef } from 'react';
import { useRouletteEngine, RED_NUMBERS, getNumberColor } from '../hooks/useRouletteEngine';
import { HowToPlayGuide } from './HowToPlayGuide';
import type { RouletteBet } from '../types/schema';

// European roulette layout number sequence on the actual wheel
const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

interface RouletteGameProps {
  onBackToLobby: () => void;
}

export const RouletteGame: React.FC<RouletteGameProps> = ({ onBackToLobby }) => {
  const {
    bets,
    spinning,
    winningNumber,
    message,
    payout,
    placeBet,
    clearBets,
    spin,
    resetBetsOnly,
  } = useRouletteEngine();

  const [activeChip, setActiveChip] = useState<number>(100);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Wheel rotation angle state
  const rotationRef = useRef<number>(0);

  // Draw static/spinning wheel inside Canvas
  const drawWheel = (winnerIndexHighlight: number | null = null, currentRotationAngle = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const outerRadius = center - 10;
    const innerRadius = outerRadius - 32;

    ctx.clearRect(0, 0, size, size);

    // Draw outer wooden rim
    ctx.beginPath();
    ctx.arc(center, center, outerRadius + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#8B5A2B'; // Wood color
    ctx.lineWidth = 12;
    ctx.stroke();

    // Draw gold inner divider
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'var(--camel)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const segmentAngle = (2 * Math.PI) / 37;

    for (let i = 0; i < 37; i++) {
      const num = WHEEL_NUMBERS[i];
      const startAngle = i * segmentAngle + currentRotationAngle;
      const endAngle = startAngle + segmentAngle;

      // Color matching segment
      const color = getNumberColor(num);
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, outerRadius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = color === 'green' ? '#2A6335' : color === 'red' ? '#9A2A2A' : '#1F1F1F';
      ctx.fill();

      // Golden separators
      ctx.strokeStyle = 'rgba(196, 162, 101, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Write numbers inside segments
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'var(--ivory)';
      ctx.font = 'bold 0.65rem var(--font-mono)';
      ctx.fillText(num.toString(), outerRadius - 16, 0);
      ctx.restore();
    }

    // Inner gold core and spindle
    ctx.beginPath();
    ctx.arc(center, center, innerRadius - 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#2A2A2A';
    ctx.fill();
    ctx.strokeStyle = 'var(--camel)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Spindle center cone
    ctx.beginPath();
    ctx.arc(center, center, 14, 0, 2 * Math.PI);
    ctx.fillStyle = 'var(--camel)';
    ctx.fill();
    ctx.strokeStyle = 'var(--ivory-warm)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Golden spindle handles (classic star shape)
    for (let h = 0; h < 4; h++) {
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate((h * Math.PI) / 2 + currentRotationAngle * 1.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(30, 0);
      ctx.strokeStyle = 'var(--camel)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(30, 0, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'var(--ivory-warm)';
      ctx.fill();
      ctx.restore();
    }

    // Draw little silver pointer/ball if round finished
    if (winnerIndexHighlight !== null) {
      const idx = WHEEL_NUMBERS.indexOf(winnerIndexHighlight);
      const angle = idx * segmentAngle + currentRotationAngle + segmentAngle / 2;
      const bx = center + (outerRadius - 24) * Math.cos(angle);
      const by = center + (outerRadius - 24) * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
      ctx.strokeStyle = 'var(--sand)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Animate the wheel when spinning is triggered
  const handleSpinClick = () => {
    if (spinning || bets.length === 0) return;

    let speed = 0.35 + Math.random() * 0.15; // Initial spin speed in radians per frame
    const friction = 0.0035; // Friction coefficient

    const runAnimation = () => {
      rotationRef.current = (rotationRef.current + speed) % (2 * Math.PI);
      drawWheel(null, rotationRef.current);

      speed -= friction;
      if (speed > 0.005) {
        animationRef.current = requestAnimationFrame(runAnimation);
      } else {
        // Stopped, the engine resolver will set winningNumber and we will redraw
      }
    };

    animationRef.current = requestAnimationFrame(runAnimation);

    // Call hook spin
    spin((winningNum) => {
      // Redraw wheel showing the ball landing on winning number
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      drawWheel(winningNum, rotationRef.current);
    });
  };

  useEffect(() => {
    drawWheel(winningNumber, rotationRef.current);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [winningNumber]);

  // Total bet amount in chips
  const totalBetValue = bets.reduce((sum, b) => sum + b.amount, 0);

  // Helper render to check placed bet amount for a slot
  const getPlacedAmount = (type: RouletteBet['type'], value: string) => {
    const found = bets.find((b) => b.type === type && b.value === value);
    return found ? found.amount : 0;
  };

  // Clean layout grid setup (European Roulette numbers 1-36 mapped in 3 rows)
  const layoutRows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">Ruleta Europea</h2>
        <button className="btn btn-secondary" onClick={onBackToLobby}>
          Volver a las Mesas
        </button>
      </div>

      {/* Main layout */}
      <div className="game-table" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', alignItems: 'center' }}>
        <div className="game-table-felt-overlay" />

        {/* Left Side: Animated canvas wheel */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="roulette-canvas"
            style={{ background: 'transparent', borderRadius: '50%' }}
          />

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ivory)' }}>{message}</p>
            {payout > 0 && (
              <p style={{ marginTop: 4, color: 'var(--camel-light)', fontWeight: 700 }}>
                ¡Pagado: +{payout.toLocaleString()} fichas!
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Mat */}
        <div style={{ flex: '1 1 500px', zIndex: 5, maxWidth: '100%' }}>
          {/* Mat Table */}
          <div className="roulette-mat-container">
            {/* Zero slot on the left */}
            <div
              className={`roulette-mat-zero ${getPlacedAmount('number', '0') > 0 ? 'has-bet' : ''}`}
              onClick={() => placeBet('number', '0', activeChip)}
            >
              <span>0</span>
              {getPlacedAmount('number', '0') > 0 && (
                <div className="mat-bet-chip">{getPlacedAmount('number', '0')}</div>
              )}
            </div>

            {/* Numbers Grid */}
            <div className="roulette-mat-numbers-grid">
              {layoutRows.map((row, rIdx) => (
                <div key={rIdx} className="roulette-mat-row">
                  {row.map((num) => {
                    const color = RED_NUMBERS.includes(num) ? 'red' : 'black';
                    const numStr = num.toString();
                    const betAmount = getPlacedAmount('number', numStr);

                    return (
                      <div
                        key={num}
                        className={`roulette-mat-num-slot slot-${color} ${betAmount > 0 ? 'has-bet' : ''}`}
                        onClick={() => placeBet('number', numStr, activeChip)}
                      >
                        <span>{num}</span>
                        {betAmount > 0 && (
                          <div className="mat-bet-chip">{betAmount}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Dozen bets */}
            <div className="roulette-mat-dozens-row">
              {['1st', '2nd', '3rd'].map((doz) => {
                const label = doz === '1st' ? '1st 12' : doz === '2nd' ? '2nd 12' : '3rd 12';
                const betAmount = getPlacedAmount('dozen', doz);
                return (
                  <div
                    key={doz}
                    className={`roulette-mat-dozen-slot ${betAmount > 0 ? 'has-bet' : ''}`}
                    onClick={() => placeBet('dozen', doz, activeChip)}
                  >
                    <span>{label}</span>
                    {betAmount > 0 && <div className="mat-bet-chip">{betAmount}</div>}
                  </div>
                );
              })}
            </div>

            {/* Even / Odd / Colors / High-Low */}
            <div className="roulette-mat-outer-row">
              <div
                className={`roulette-mat-outer-slot ${getPlacedAmount('highlow', 'low') > 0 ? 'has-bet' : ''}`}
                onClick={() => placeBet('highlow', 'low', activeChip)}
              >
                <span>1-18</span>
                {getPlacedAmount('highlow', 'low') > 0 && (
                  <div className="mat-bet-chip">{getPlacedAmount('highlow', 'low')}</div>
                )}
              </div>

              <div
                className={`roulette-mat-outer-slot ${getPlacedAmount('parity', 'even') > 0 ? 'has-bet' : ''}`}
                onClick={() => placeBet('parity', 'even', activeChip)}
              >
                <span>Par</span>
                {getPlacedAmount('parity', 'even') > 0 && (
                  <div className="mat-bet-chip">{getPlacedAmount('parity', 'even')}</div>
                )}
              </div>

              {/* Red Color Box */}
              <div
                className={`roulette-mat-outer-slot bg-red-color ${getPlacedAmount('color', 'red') > 0 ? 'has-bet' : ''}`}
                onClick={() => placeBet('color', 'red', activeChip)}
              >
                <div className="diamond-shape red" />
                {getPlacedAmount('color', 'red') > 0 && (
                  <div className="mat-bet-chip">{getPlacedAmount('color', 'red')}</div>
                )}
              </div>

              {/* Black Color Box */}
              <div
                className={`roulette-mat-outer-slot bg-black-color ${getPlacedAmount('color', 'black') > 0 ? 'has-bet' : ''}`}
                onClick={() => placeBet('color', 'black', activeChip)}
              >
                <div className="diamond-shape black" />
                {getPlacedAmount('color', 'black') > 0 && (
                  <div className="mat-bet-chip">{getPlacedAmount('color', 'black')}</div>
                )}
              </div>

              <div
                className={`roulette-mat-outer-slot ${getPlacedAmount('parity', 'odd') > 0 ? 'has-bet' : ''}`}
                onClick={() => placeBet('parity', 'odd', activeChip)}
              >
                <span>Impar</span>
                {getPlacedAmount('parity', 'odd') > 0 && (
                  <div className="mat-bet-chip">{getPlacedAmount('parity', 'odd')}</div>
                )}
              </div>

              <div
                className={`roulette-mat-outer-slot ${getPlacedAmount('highlow', 'high') > 0 ? 'has-bet' : ''}`}
                onClick={() => placeBet('highlow', 'high', activeChip)}
              >
                <span>19-36</span>
                {getPlacedAmount('highlow', 'high') > 0 && (
                  <div className="mat-bet-chip">{getPlacedAmount('highlow', 'high')}</div>
                )}
              </div>
            </div>
          </div>

          {/* Chip Value Selectors & Controls */}
          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Chips */}
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

            {/* Summary */}
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              Apuesta Total: <strong style={{ color: 'var(--ivory)' }}>{totalBetValue.toLocaleString()}</strong> fichas
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-secondary"
                disabled={spinning || bets.length === 0}
                onClick={clearBets}
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                Limpiar
              </button>
              <button
                className="btn btn-primary"
                disabled={spinning || bets.length === 0}
                onClick={handleSpinClick}
                style={{ background: 'var(--camel)', borderColor: 'var(--camel)' }}
              >
                Girar
              </button>
              {winningNumber !== null && !spinning && (
                <button className="btn btn-secondary" onClick={resetBetsOnly} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                  Nueva Ronda
                </button>
              )}
            </div>
          </div>
        </div>

        <HowToPlayGuide
          title="Ruleta Europea"
          steps={[
            "Selecciona el valor de tus fichas (10, 50, 100, 500) y colócalas en el tapete.",
            "Puedes hacer apuestas sencillas (Rojo/Negro, Par/Impar, 1-18/19-36), Docenas o números individuales (Pleno 35:1).",
            "Presiona Girar para lanzar la bola en la ruleta 2D.",
            "Si la bola cae en una de tus casillas apostadas, recibirás las ganancias correspondientes automáticamente."
          ]}
          tips="Las apuestas externas (Rojo/Negro, Par/Impar) ofrecen casi 50% de probabilidad de acierto con pago 1:1."
        />
      </div>
    </div>
  );
};
