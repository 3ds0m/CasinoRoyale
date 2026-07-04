import { useState } from 'react';
import { useGameSession } from './context/GameSessionContext';
import { Coins, History, Clock, ArrowRight } from 'lucide-react';
import { auth } from './firebase/config';
import type { GameType } from './types/schema';
import { CasinoWarGame } from './components/CasinoWarGame';
import { ThreeCardPokerGame } from './components/ThreeCardPokerGame';
import { RouletteGame } from './components/RouletteGame';
import { CrapsGame } from './components/CrapsGame';

const PIP: Record<string, string> = {
  Cartas: '♦',
  Mesa: '♣',
  Lotería: '♥',
  Estrategia: '♠',
};

const GAMES = [
  { id: 'war' as GameType, title: 'Casino War', cat: 'Cartas', desc: 'El duelo de cartas más directo del casino. Jugador contra crupier, una carta cada uno.', phase: 'next' as const, diff: 'Fácil', edge: '2.8%' },
  { id: 'three-card-poker' as GameType, title: 'Three Card Poker', cat: 'Cartas', desc: 'Supera a la banca con tres naipes. Estrategia de Ante y Play.', phase: 'next' as const, diff: 'Medio', edge: '3.4%' },
  { id: 'roulette' as GameType, title: 'Ruleta Europea', cat: 'Mesa', desc: 'Rojo, negro o tu número. El giro clásico con un solo cero.', phase: 'next' as const, diff: 'Fácil', edge: '2.7%' },
  { id: 'craps' as GameType, title: 'Dados', cat: 'Mesa', desc: 'Lanza los dados y navega las fases de juego. Múltiples apuestas tácticas.', phase: 'next' as const, diff: 'Difícil', edge: '1.4%' },
  { id: 'baccarat' as GameType, title: 'Baccarat', cat: 'Cartas', desc: 'Punto, banca o empate. El juego de los grandes apostadores.', phase: 'later' as const, diff: 'Fácil', edge: '1.06%' },
  { id: 'pai-gow' as GameType, title: 'Pai Gow Poker', cat: 'Cartas', desc: 'Divide siete cartas en dos manos y vence a la casa en ambas.', phase: 'later' as const, diff: 'Difícil', edge: '2.5%' },
  { id: 'blackjack' as GameType, title: 'Blackjack', cat: 'Cartas', desc: 'Pide, plántate, dobla o divide. Acércate a 21 sin pasarte.', phase: 'later' as const, diff: 'Medio', edge: '0.5%' },
  { id: 'keno-bingo' as GameType, title: 'Keno', cat: 'Lotería', desc: 'Elige tus números y espera el sorteo. Juego casual de velocidad.', phase: 'later' as const, diff: 'Fácil', edge: '4.5%' },
  { id: 'texas-holdem' as GameType, title: "Texas Hold'em", cat: 'Estrategia', desc: 'Mesa completa contra tres bots con perfiles distintos de juego.', phase: 'later' as const, diff: 'Especialista', edge: '—' },
];

const FEATURED = GAMES.slice(0, 2);
const REST = GAMES.slice(2);

function App() {
  const { 
    user, 
    history, 
    activeGame, 
    updateUsername, 
    loginWithEmail, 
    registerWithEmail, 
    logout 
  } = useGameSession();

  const [tab, setTab] = useState<'lobby' | 'history' | 'fairplay'>('lobby');
  const [activeGameView, setActiveGameView] = useState<'lobby' | 'war' | 'three-card-poker' | 'roulette' | 'craps'>('lobby');
  const [nameInput, setNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [detail, setDetail] = useState<typeof GAMES[0] | null>(null);

  // Authentication modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && nameInput.trim()) {
      await updateUsername(nameInput.trim());
      setEditingName(false);
    }
  };

  const buyChips = async (coinAmount: number, _label: string) => {
    if (!user) {
      alert("Debes iniciar sesión para comprar fichas.");
      return;
    }

    try {
      const price = coinAmount === 500 ? 500 : coinAmount === 1200 ? 1000 : 2000;
      
      const response = await fetch('http://127.0.0.1:5001/mock-project-id/us-central1/createStripeCheckout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          packageId: `package_${coinAmount}`,
          coinAmount,
          price
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No se devolvió la URL de Checkout");
      }
    } catch (err: any) {
      console.error("Error creating Stripe session:", err);
      alert(`Error al generar el pago de Stripe: ${err.message}`);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      setAuthModalOpen(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Error de autenticación');
    }
  };

  /* Shared card renderer */
  const renderCard = (g: typeof GAMES[0], cls: string) => (
    <div key={g.id} className={cls} onClick={() => setDetail(g)}>
      <span className="game-card-pip">{PIP[g.cat]}</span>
      <div className="game-card-header">
        <span className="game-card-category">{g.cat}</span>
        {g.phase === 'next' && <span className="game-card-status">Próxima fase</span>}
      </div>
      <h3 className="game-card-title">{g.title}</h3>
      <p className="game-card-desc">{g.desc}</p>
      <div className="game-card-footer">
        <div className="game-card-meta">
          <span>{g.diff}</span>
          <span>Ventaja <strong>{g.edge}</strong></span>
        </div>
        <button className="btn btn-secondary">Ver</button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Nav ── */}
      <nav className="topnav">
        <div className="topnav-logo">Casino <span>Royale</span></div>

        <ul className="topnav-tabs">
          {(['lobby', 'history', 'fairplay'] as const).map((t) => (
            <li key={t}>
              <button
                className={`topnav-tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'lobby' ? 'Juegos' : t === 'history' ? 'Historial' : 'Juego seguro'}
              </button>
            </li>
          ))}
        </ul>

        <div className="topnav-right">
          <div className="topnav-user" onClick={() => {
            setEditingName(!editingName);
            setNameInput(user?.username || '');
          }}>
            <img src={user?.avatarUrl} alt="" />
            <span className="topnav-user-name">{user?.username}</span>
          </div>

          {auth.currentUser?.isAnonymous ? (
            <button className="btn btn-secondary" onClick={() => { setAuthModalOpen(true); setAuthMode('login'); }}>
              Acceder
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => logout()}>
              Salir
            </button>
          )}

          <div className="balance-chip">
            <Coins size={14} />
            {user?.balance.toLocaleString()}
          </div>
          <button className="btn btn-primary" onClick={() => setStoreOpen(true)}>
            Comprar fichas
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="page-container">
        {editingName && (
          <form className="inline-form" onSubmit={saveName} style={{ marginBottom: 24 }}>
            <div className="field">
              <label>Cambiar nombre de jugador</label>
              <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder={user?.username} />
            </div>
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditingName(false)}>Cancelar</button>
          </form>
        )}

        {activeGame && (
          <div className="active-game-notice">
            <p>
              <Clock size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Ronda activa en <strong>{GAMES.find(g => g.id === activeGame.gameType)?.title}</strong>.
            </p>
            <button className="btn btn-primary" onClick={() => {
              if (activeGame.gameType === 'war') setActiveGameView('war');
              if (activeGame.gameType === 'three-card-poker') setActiveGameView('three-card-poker');
              if (activeGame.gameType === 'roulette') setActiveGameView('roulette');
              if (activeGame.gameType === 'craps') setActiveGameView('craps');
            }}>
              Reanudar
            </button>
          </div>
        )}

        {/* ── LOBBY ── */}
        {tab === 'lobby' && (
          <div className="tab-content" key="lobby">
            {activeGameView === 'war' && (
              <CasinoWarGame onBackToLobby={() => setActiveGameView('lobby')} />
            )}

            {activeGameView === 'three-card-poker' && (
              <ThreeCardPokerGame onBackToLobby={() => setActiveGameView('lobby')} />
            )}

            {activeGameView === 'roulette' && (
              <RouletteGame onBackToLobby={() => setActiveGameView('lobby')} />
            )}

            {activeGameView === 'craps' && (
              <CrapsGame onBackToLobby={() => setActiveGameView('lobby')} />
            )}

            {activeGameView === 'lobby' && (
              <>
                {/* Hero */}
                <section className="hero">
                  <div className="hero-inner">
                    <div className="hero-content">
                      <p className="hero-eyebrow">Juego verificable · SHA-256</p>
                      <h2>Cada resultado se&nbsp;puede auditar</h2>
                      <p>
                        Utilizamos hashes criptográficos para que ninguna ronda pueda manipularse. Tu confianza es la mesa sobre la que jugamos.
                      </p>
                      <button className="btn btn-felt" onClick={() => setTab('fairplay')}>
                        Cómo funciona <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Decorative card fan — the signature */}
                    <div className="hero-cards">
                      <div className="hero-card-shape">♠</div>
                      <div className="hero-card-shape">♦</div>
                      <div className="hero-card-shape">♣</div>
                    </div>
                  </div>
                </section>

                {/* Featured games */}
                <div className="section-header">
                  <h2 className="section-title">Mesa</h2>
                  <span className="section-label">{GAMES.length} juegos en desarrollo</span>
                </div>

                <div className="featured-row">
                  {FEATURED.map(g => renderCard(g, 'featured-card game-card'))}
                </div>

                {/* Rest of the grid */}
                <div className="games-grid">
                  {REST.map(g => renderCard(g, 'game-card'))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          <div className="tab-content" key="history">
            <div className="page-header">
              <h1 className="page-title">Historial</h1>
              <p className="page-subtitle">Las últimas 50 rondas jugadas en esta sesión.</p>
            </div>
            <div className="history-panel">
              {history.length === 0 ? (
                <div className="empty-state">
                  <History size={40} className="empty-state-icon" />
                  <p>No hay partidas registradas todavía.</p>
                  <p className="hint">Juega una ronda y aquí aparecerán los detalles.</p>
                </div>
              ) : (
                <table className="history-table">
                  <thead><tr><th>Partida</th><th>Juego</th><th>Apuesta</th><th>Ganancia</th><th>Resultado</th><th>Hora</th></tr></thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{h.gameId.substring(0, 8)}</td>
                        <td>{GAMES.find(g => g.id === h.gameType)?.title || h.gameType}</td>
                        <td>{h.bet}</td>
                        <td>{h.payout > 0 ? `+${h.payout}` : '0'}</td>
                        <td><span className={`result-badge ${h.payout > 0 ? 'win' : 'loss'}`}>{h.payout > 0 ? 'Ganada' : 'Perdida'}</span></td>
                        <td>{new Date(h.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── FAIRPLAY ── */}
        {tab === 'fairplay' && (
          <div className="tab-content" key="fairplay">
            <div className="page-header">
              <h1 className="page-title">Juego verificable</h1>
              <p className="page-subtitle">Cada resultado se genera con criptografía SHA-256. Puedes auditarlo después de cada ronda.</p>
            </div>
            <div className="fairplay-panel">
              <div className="fairplay-grid">
                <div className="fairplay-card">
                  <h4>Cómo funciona</h4>
                  <ol>
                    <li>El servidor genera un <strong>Server Seed</strong> y te entrega su hash SHA-256 antes de la ronda.</li>
                    <li>Tu navegador usa un <strong>Client Seed</strong> aleatorio que tú controlas.</li>
                    <li>Ambos seeds y un <strong>nonce</strong> secuencial se combinan para derivar el resultado.</li>
                    <li>Al terminar, el Server Seed se revela para que verifiques el hash.</li>
                  </ol>
                </div>
                <div className="fairplay-card">
                  <h4>Tus semillas actuales</h4>
                  <div className="seed-field">
                    <label>Client seed (tu navegador)</label>
                    <input type="text" readOnly value="client-seed-royale-default-777" />
                  </div>
                  <div className="seed-field">
                    <label>Próximo server hash</label>
                    <input type="text" readOnly value="4a2b6e8a8c9e7f6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Store Modal ── */}
      {storeOpen && (
        <div className="modal-overlay" onClick={() => setStoreOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Comprar fichas</h3>
              <button className="modal-close" onClick={() => setStoreOpen(false)}>×</button>
            </div>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: 24 }}>Pago seguro con Stripe. Selecciona un paquete.</p>
            <div className="store-option" onClick={() => buyChips(500, '$5 USD')}><div><h4>500 fichas</h4><p className="sub">Paquete inicial</p></div><span className="store-price">$5.00</span></div>
            <div className="store-option featured" onClick={() => buyChips(1200, '$10 USD')}><div><h4>1,200 fichas</h4><p className="sub">Más popular</p></div><span className="store-price">$10.00</span></div>
            <div className="store-option" onClick={() => buyChips(3000, '$20 USD')}><div><h4>3,000 fichas</h4><p className="sub">Mejor valor</p></div><span className="store-price">$20.00</span></div>
            <button className="btn btn-ghost" onClick={() => setStoreOpen(false)} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Game Detail Modal ── */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="section-label">{detail.cat}</span>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 12 }}>{detail.title}</h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 }}>{detail.desc}</p>
             <div className="game-detail-meta">
              <div><span className="meta-label">Dificultad</span><span className="meta-value">{detail.diff}</span></div>
              <div><span className="meta-label">Ventaja de la casa</span><span className="meta-value">{detail.edge}</span></div>
              <div style={{ gridColumn: 'span 2' }}><span className="meta-label">Estado</span><span className="meta-value">{detail.phase === 'next' ? 'Disponible para Jugar' : 'Planificado para fases posteriores'}</span></div>
            </div>
            {detail.phase === 'next' && (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (detail.id === 'war') setActiveGameView('war');
                  if (detail.id === 'three-card-poker') setActiveGameView('three-card-poker');
                  if (detail.id === 'roulette') setActiveGameView('roulette');
                  if (detail.id === 'craps') setActiveGameView('craps');
                  setDetail(null);
                }} 
                style={{ width: '100%', marginTop: 16 }}
              >
                Comenzar Juego
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setDetail(null)} style={{ width: '100%', marginTop: 12 }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Auth Modal ── */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{authMode === 'login' ? 'Iniciar sesión' : 'Registrar cuenta'}</h3>
              <button className="modal-close" onClick={() => setAuthModalOpen(false)}>×</button>
            </div>
            
            {authError && (
              <p style={{ color: 'var(--signal-red)', fontSize: '0.8rem', marginBottom: 12 }}>
                {authError}
              </p>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="seed-field" style={{ marginBottom: 0 }}>
                <label>Email</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="nombre@ejemplo.com"
                  style={{ width: '100%', background: 'var(--ivory)', border: '1px solid var(--sand)', padding: 10, borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="seed-field" style={{ marginBottom: 0 }}>
                <label>Contraseña</label>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  style={{ width: '100%', background: 'var(--ivory)', border: '1px solid var(--sand)', padding: 10, borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                {authMode === 'login' ? 'Ingresar' : 'Registrar'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                >
                  {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
