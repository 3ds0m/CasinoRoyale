import React from 'react';
import { useBlackjackEngine, calculateBlackjackHandValue } from '../hooks/useBlackjackEngine';
import { Card3D } from './Card3D';
import { ShieldCheck } from 'lucide-react';
import { HowToPlayGuide } from './HowToPlayGuide';

interface BlackjackGameProps {
  onBackToLobby: () => void;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ onBackToLobby }) => {
  const {
    stage,
    dealerCards,
    hands,
    activeHandIndex,
    betInput,
    insuranceOffered,
    resultMessage,
    totalPayout,
    setBetInput,
    startRound,
    buyInsurance,
    hit,
    stand,
    doubleDown,
    split,
    resetGame,
  } = useBlackjackEngine();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (betInput <= 0) return;
    startRound(betInput);
  };

  const dealerVal = dealerCards.length > 0 ? calculateBlackjackHandValue(dealerCards) : { total: 0 };
  const visibleDealerVal = (stage === 'finished' || stage === 'dealer-turn') 
    ? dealerVal.total 
    : dealerCards.length > 0 ? calculateBlackjackHandValue([dealerCards[0]]).total : 0;

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Blackjack 21</h2>
          <span className="section-label">Pago Blackjack 3:2 · Crupier se planta en 17</span>
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
            {resultMessage || 'Pide, plántate, dobla o divide para acercarte a 21 sin pasarte.'}
          </p>

          {stage === 'finished' && (
            <p style={{ marginTop: 4, color: totalPayout > 0 ? 'var(--camel-light)' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
              {totalPayout > 0 ? `Pagado Total: +${totalPayout.toLocaleString()} fichas` : 'Apuesta perdida'}
            </p>
          )}
        </div>

        {/* Dealer Hand Section */}
        <div className="game-hand-section" style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 'var(--radius-md)', margin: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="game-hand-title" style={{ fontSize: '0.95rem' }}>CRUPIER</span>
            {dealerCards.length > 0 && (
              <span className="result-badge win" style={{ fontSize: '0.95rem', padding: '4px 12px', background: 'var(--bordeaux)' }}>
                Puntos: {visibleDealerVal}
              </span>
            )}
          </div>

          <div className="game-cards-container" style={{ justifyContent: 'center', minHeight: 110 }}>
            {dealerCards.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>Esperando reparto...</div>
            ) : (
              dealerCards.map((card, i) => (
                <Card3D 
                  key={i} 
                  card={card} 
                  flipped={i === 0 || stage === 'finished' || stage === 'dealer-turn'} 
                />
              ))
            )}
          </div>
        </div>

        {/* Insurance Banner */}
        {insuranceOffered && stage === 'player-turn' && (
          <div style={{ background: 'rgba(240,200,80,0.15)', border: '1px solid var(--camel)', padding: 12, borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--camel-light)' }}>
              <ShieldCheck size={18} />
              <span>El crupier muestra un As. ¿Deseas comprar Seguro por la mitad de tu apuesta?</span>
            </div>
            <button className="btn btn-primary" onClick={buyInsurance} style={{ background: 'var(--camel)', borderColor: 'var(--camel)', color: '#1a1a1a' }}>
              Comprar Seguro
            </button>
          </div>
        )}

        {/* Player Hands Section */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', margin: '20px 0' }}>
          {hands.map((hand, idx) => {
            const hVal = calculateBlackjackHandValue(hand.cards);
            const isActive = idx === activeHandIndex && stage === 'player-turn';

            return (
              <div 
                key={idx}
                className="game-hand-section"
                style={{
                  background: isActive ? 'rgba(40,100,220,0.25)' : 'rgba(0,0,0,0.25)',
                  border: isActive ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.15)',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  width: '100%',
                  maxWidth: 320,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="game-hand-title" style={{ fontSize: '0.9rem', color: isActive ? '#60a5fa' : 'var(--ivory)' }}>
                    {hands.length > 1 ? `TU MANO ${idx + 1}` : 'TU MANO'}
                  </span>
                  <span className={`result-badge ${hand.isBust ? 'loss' : 'win'}`} style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                    {hand.isBust ? '¡Se pasó!' : hand.isBlackjack ? 'Blackjack' : `${hVal.total}`}
                  </span>
                </div>

                <div className="game-cards-container" style={{ justifyContent: 'center', minHeight: 110 }}>
                  {hand.cards.map((card, cIdx) => (
                    <Card3D key={cIdx} card={card} flipped={true} />
                  ))}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 10, textAlign: 'center' }}>
                  Apuesta: <strong style={{ color: '#fff' }}>{hand.bet} fichas</strong> {hand.isDoubled && '(Dobada)'}
                </div>
              </div>
            );
          })}
        </div>

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
                  value={betInput}
                  onChange={(e) => setBetInput(Math.max(10, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }}>
                Repartir
              </button>
            </form>
          )}

          {stage === 'player-turn' && hands.length > 0 && (() => {
            const activeHand = hands[activeHandIndex];
            const canDouble = activeHand?.cards.length === 2;
            const canSplit = activeHand?.cards.length === 2 && 
              calculateBlackjackHandValue([activeHand.cards[0]]).total === calculateBlackjackHandValue([activeHand.cards[1]]).total;

            return (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={hit} style={{ minWidth: 110, height: 44 }}>
                  Pedir (Hit)
                </button>
                <button className="btn btn-secondary" onClick={stand} style={{ minWidth: 110, height: 44 }}>
                  Plantarse (Stand)
                </button>
                <button className="btn btn-felt" onClick={doubleDown} disabled={!canDouble} style={{ height: 44 }}>
                  Doblar (Double)
                </button>
                <button className="btn btn-secondary" onClick={split} disabled={!canSplit} style={{ height: 44 }}>
                  Dividir (Split)
                </button>
              </div>
            );
          })()}

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
          title="Blackjack 21"
          steps={[
            "Elige tu apuesta inicial y presiona Repartir.",
            "Tu objetivo es sumar 21 o acercarte lo más posible sin pasarte.",
            "Usa Pedir (Hit) para recibir otra carta, o Plantarse (Stand) para terminar tu turno.",
            "Si tus primeras 2 cartas suman 21, ¡tienes Blackjack y cobras 3:2!",
            "Puedes Doblar (Double) duplicando tu apuesta a cambio de recibir exactamente 1 carta más."
          ]}
          tips="El crupier está obligado a pedir cartas hasta sumar 17 o más."
        />
      </div>
    </div>
  );
};
