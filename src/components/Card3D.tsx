import React from 'react';
import type { Card } from '../utils/deck';

interface Card3DProps {
  card: Card | null;
  flipped?: boolean; // If true, card front is shown. If false, card back is shown.
  scale?: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  H: '♥',
  D: '♦',
  C: '♣',
  S: '♠',
};

const SUIT_NAMES: Record<string, string> = {
  H: 'red',
  D: 'red',
  C: 'black',
  S: 'black',
};

export const Card3D: React.FC<Card3DProps> = ({ card, flipped = true, scale = 1 }) => {
  if (!card) {
    // Return empty card placeholder slot
    return (
      <div 
        className="card-3d-placeholder"
        style={{
          width: 100 * scale,
          height: 144 * scale,
          border: '1.5px dashed var(--sand)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(0,0,0,0.02)'
        }}
      />
    );
  }

  const isRed = SUIT_NAMES[card.suit] === 'red';
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div 
      className={`card-3d-container ${flipped ? 'is-flipped' : ''}`}
      style={{
        width: 100 * scale,
        height: 144 * scale,
      }}
    >
      <div className="card-3d-inner">
        {/* Card Back (Shown when not flipped) */}
        <div className="card-3d-back">
          <div className="card-back-pattern">
            <div className="card-back-logo">R</div>
          </div>
        </div>

        {/* Card Front (Shown when flipped) */}
        <div className={`card-3d-front ${isRed ? 'suit-red' : 'suit-black'}`}>
          {/* Top-left Index */}
          <div className="card-index-top">
            <span className="card-value">{card.value}</span>
            <span className="card-suit-symbol">{symbol}</span>
          </div>

          {/* Center Large Suit Icon */}
          <div className="card-center-suit">{symbol}</div>

          {/* Bottom-right Index */}
          <div className="card-index-bottom">
            <span className="card-value">{card.value}</span>
            <span className="card-suit-symbol">{symbol}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
