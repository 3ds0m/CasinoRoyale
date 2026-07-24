import React, { useState } from 'react';
import { useTexasHoldemEngine } from '../hooks/useTexasHoldemEngine';
import { Card3D } from './Card3D';
import { Coins, UserCheck, ShieldAlert, Award } from 'lucide-react';
import { HowToPlayGuide } from './HowToPlayGuide';

interface TexasHoldemGameProps {
  onBackToLobby: () => void;
}

export const TexasHoldemGame: React.FC<TexasHoldemGameProps> = ({ onBackToLobby }) => {
  const {
    stage,
    communityCards,
    players,
    pot,
    currentHighBet,
    activePlayerIndex,
    buyInAmount,
    resultMessage,
    showdownEvals,
    setBuyInAmount,
    startRound,
    humanFold,
    humanCheckCall,
    humanRaise,
    resetGame,
  } = useTexasHoldemEngine();

  const [raiseSlider, setRaiseSlider] = useState<number>(50);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (buyInAmount <= 0) return;
    startRound(buyInAmount);
  };

  const humanPlayer = players.find(p => p.isHuman);
  const callAmount = humanPlayer ? Math.max(0, currentHighBet - humanPlayer.currentBet) : 0;

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Texas Hold'em Poker</h2>
          <span className="section-label">Mesa Completa 4 Jugadores · Singleplayer vs Bots IA</span>
        </div>
        <button className="btn btn-secondary" onClick={onBackToLobby}>
          Volver a las Mesas
        </button>
      </div>

      {/* Tapete de Juego Ovalado */}
      <div className="game-table" style={{ borderRadius: '120px', padding: '40px 20px', minHeight: 620 }}>
        <div className="game-table-felt-overlay" />

        {/* Message board */}
        <div className="game-info-overlay">
          <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--ivory)' }}>
            {resultMessage || 'Bienvenido a la mesa de Texas Hold\'em. Ingresa para jugar.'}
          </p>
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
            <span className="balance-chip" style={{ background: 'rgba(240,200,80,0.2)', borderColor: 'var(--camel)', color: 'var(--camel-light)', fontSize: '1.05rem' }}>
              <Coins size={16} style={{ marginRight: 6 }} /> Bote: {pot} fichas
            </span>
          </div>
        </div>

        {/* Bot Seats Row (Top) */}
        {players.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0 30px 0' }}>
            {players.filter(p => !p.isHuman).map((bot) => {
              const isActive = activePlayerIndex === bot.id && stage !== 'finished' && stage !== 'showdown';
              const botEval = showdownEvals[bot.id];

              return (
                <div 
                  key={bot.id}
                  style={{
                    background: isActive ? 'rgba(240,200,80,0.2)' : 'rgba(0,0,0,0.3)',
                    border: isActive ? '2px solid var(--camel)' : '1px solid rgba(255,255,255,0.15)',
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    minWidth: 160,
                    opacity: bot.isFolded ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ivory)', marginBottom: 4 }}>
                    {bot.name} {bot.isFolded && '(Retirado)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 8 }}>
                    Fichas: {bot.chips}
                  </div>

                  {/* Cards */}
                  <div className="game-cards-container" style={{ justifyContent: 'center', gap: 6, minHeight: 80 }}>
                    {bot.holeCards.map((card, i) => (
                      <Card3D 
                        key={i} 
                        card={card} 
                        flipped={stage === 'showdown' || stage === 'finished'} 
                        scale={0.7} 
                      />
                    ))}
                  </div>

                  {botEval && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--camel-light)', marginTop: 4 }}>
                      <Award size={12} style={{ verticalAlign: '-2px', marginRight: 2 }} />
                      {botEval.rank}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Community Cards Area (Center) */}
        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px dashed rgba(255,255,255,0.2)', padding: 16, borderRadius: 'var(--radius-md)', margin: '0 auto', maxWidth: 600, textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Cartas Comunitarias ({stage.toUpperCase()})
          </span>
          <div className="game-cards-container" style={{ justifyContent: 'center', gap: 10, marginTop: 10, minHeight: 110 }}>
            {communityCards.length === 0 ? (
              <div style={{ padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Esperando el Flop...</div>
            ) : (
              communityCards.map((card, i) => (
                <Card3D key={i} card={card} flipped={true} scale={0.9} />
              ))
            )}
          </div>
        </div>

        {/* Human Player Seat (Bottom) */}
        {humanPlayer && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <div 
              style={{
                background: activePlayerIndex === 0 && stage !== 'finished' ? 'rgba(40,100,220,0.3)' : 'rgba(0,0,0,0.35)',
                border: activePlayerIndex === 0 && stage !== 'finished' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                padding: 16,
                borderRadius: 'var(--radius-md)',
                minWidth: 320,
                textAlign: 'center',
                opacity: humanPlayer.isFolded ? 0.4 : 1,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa', marginBottom: 4 }}>
                {humanPlayer.name} (TÚ) {humanPlayer.isFolded && '- RETIRADO'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: 10 }}>
                Tus Fichas: {humanPlayer.chips} | Tu Apuesta Actual: {humanPlayer.currentBet}
              </div>

              {/* Hole Cards */}
              <div className="game-cards-container" style={{ justifyContent: 'center', gap: 12, minHeight: 100 }}>
                {humanPlayer.holeCards.map((card, i) => (
                  <Card3D key={i} card={card} flipped={true} scale={0.95} />
                ))}
              </div>

              {showdownEvals[0] && (
                <div style={{ fontSize: '0.85rem', color: 'var(--camel-light)', marginTop: 8, fontWeight: 700 }}>
                  <Award size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  {showdownEvals[0].description}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          {stage === 'betting' && (
            <form onSubmit={handleStart} className="betting-area">
              <div className="bet-input-box">
                <label>Fichas de Entrada (Buy-In)</label>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(Math.max(50, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }}>
                Entrar a la Mesa
              </button>
            </form>
          )}

          {stage !== 'betting' && stage !== 'finished' && activePlayerIndex === 0 && !humanPlayer?.isFolded && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 'var(--radius-md)' }}>
              <button className="btn btn-secondary" onClick={humanFold} style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                <ShieldAlert size={14} style={{ marginRight: 4 }} /> Retirarse (Fold)
              </button>

              <button className="btn btn-primary" onClick={humanCheckCall}>
                <UserCheck size={14} style={{ marginRight: 4 }} />
                {callAmount === 0 ? 'Pasar (Check)' : `Igualar (Call ${callAmount})`}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Subir:</label>
                <input
                  type="number"
                  min={currentHighBet + 20}
                  step={10}
                  value={raiseSlider}
                  onChange={e => setRaiseSlider(parseInt(e.target.value, 10) || 0)}
                  style={{ width: 90, padding: 6, background: 'var(--ivory)', border: '1px solid var(--sand)', borderRadius: 'var(--radius-sm)' }}
                />
                <button className="btn btn-felt" onClick={() => humanRaise(raiseSlider)}>
                  Subir (Raise)
                </button>
              </div>
            </div>
          )}

          {stage === 'finished' && (
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-primary" onClick={resetGame} style={{ minWidth: 160, height: 46 }}>
                Nueva Mano
              </button>
              <button className="btn btn-secondary" onClick={onBackToLobby}>
                Volver al Lobby
              </button>
            </div>
          )}
        </div>

        <HowToPlayGuide
          title="Texas Hold'em Poker"
          steps={[
            "Ingresa tus fichas de entrada (Buy-In) y presiona Entrar a la Mesa.",
            "Recibirás 2 cartas secretas (Hole Cards). La mesa colocará automáticamente las ciegas iniciales (Small y Big Blind).",
            "Sigue la ronda de apuestas (Pre-Flop, Flop, Turn y River) decidiendo si Pasar (Check), Igualar (Call), Subir (Raise) o Retirarte (Fold).",
            "Los 3 bots realizarán sus turnos automáticamente evaluando sus perfiles de juego (Conservador, Agresivo y Farolero).",
            "Al llegar al Showdown, gana el jugador que logre la mejor combinación de 5 cartas usando sus 2 cartas propias y las 5 comunitarias del centro."
          ]}
          tips="Presta atención al estilo de cada bot: el Bot Farolero subirá con manos débiles mientras que el Bot Conservador sólo apostará fuerte con jugadas grandes."
        />
      </div>
    </div>
  );
};
