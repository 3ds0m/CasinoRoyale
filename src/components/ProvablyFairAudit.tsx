import React, { useState } from 'react';
import { verifyServerSeed, calculateProvablyFairOutcome } from '../utils/provablyFair';
import { ShieldCheck, CheckCircle2, XCircle, Search } from 'lucide-react';

export const ProvablyFairAudit: React.FC = () => {
  const [inputServerSeed, setInputServerSeed] = useState<string>('');
  const [expectedHash, setExpectedHash] = useState<string>('');
  const [inputClientSeed, setInputClientSeed] = useState<string>('client-seed-royale-default-777');
  const [inputNonce, setInputNonce] = useState<number>(1);

  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    hashMatches: boolean;
    outcomeRoll: number;
  } | null>(null);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputServerSeed.trim()) return;

    const hashMatches = expectedHash.trim() 
      ? await verifyServerSeed(inputServerSeed.trim(), expectedHash.trim())
      : true;

    const outcomeRoll = await calculateProvablyFairOutcome(
      inputServerSeed.trim(), 
      inputClientSeed.trim(), 
      inputNonce
    );

    setVerificationResult({
      isValid: true,
      hashMatches,
      outcomeRoll,
    });
  };

  return (
    <div className="fairplay-panel">
      <div className="fairplay-grid">
        {/* Explanation Card */}
        <div className="fairplay-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={22} style={{ color: 'var(--camel)' }} />
            <h4 style={{ margin: 0 }}>Criptografía Transparente (SHA-256)</h4>
          </div>
          <ol style={{ paddingLeft: 18, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
            <li>Antes de cada partida, el servidor genera un <strong>Server Seed</strong> y publica únicamente su resumen SHA-256.</li>
            <li>Tu navegador aporta un <strong>Client Seed</strong> que garantiza que la casa no conoce el resultado final con antelación.</li>
            <li>Ambos datos se combinan determinísticamente mediante <code>SHA-256(ServerSeed:ClientSeed:Nonce)</code>.</li>
            <li>Al finalizar la ronda, el Server Seed se revela y puedes verificar su autenticidad en esta calculadora.</li>
          </ol>
        </div>

        {/* Audit Form & Calculator */}
        <div className="fairplay-card">
          <h4 style={{ marginBottom: 16 }}>Calculadora Auditadora de Rondes</h4>
          
          <form onSubmit={handleAudit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="seed-field" style={{ marginBottom: 0 }}>
              <label>Server Seed Revelado</label>
              <input 
                type="text" 
                required 
                value={inputServerSeed} 
                onChange={e => setInputServerSeed(e.target.value)} 
                placeholder="Ej. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                style={{ width: '100%', background: 'var(--ivory)', border: '1px solid var(--sand)', padding: 8, borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div className="seed-field" style={{ marginBottom: 0 }}>
              <label>Server Seed Hash Esperado (Opcional)</label>
              <input 
                type="text" 
                value={expectedHash} 
                onChange={e => setExpectedHash(e.target.value)} 
                placeholder="Hash entregado al inicio de la ronda"
                style={{ width: '100%', background: 'var(--ivory)', border: '1px solid var(--sand)', padding: 8, borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="seed-field" style={{ marginBottom: 0 }}>
                <label>Client Seed</label>
                <input 
                  type="text" 
                  value={inputClientSeed} 
                  onChange={e => setInputClientSeed(e.target.value)} 
                  style={{ width: '100%', background: 'var(--ivory)', border: '1px solid var(--sand)', padding: 8, borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="seed-field" style={{ marginBottom: 0 }}>
                <label>Nonce</label>
                <input 
                  type="number" 
                  min={1} 
                  value={inputNonce} 
                  onChange={e => setInputNonce(parseInt(e.target.value, 10) || 1)} 
                  style={{ width: '100%', background: 'var(--ivory)', border: '1px solid var(--sand)', padding: 8, borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
              <Search size={14} style={{ marginRight: 6 }} /> Verificar Resultado y Hash
            </button>
          </form>

          {/* Audit Verification Result */}
          {verificationResult && (
            <div style={{ marginTop: 20, padding: 16, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--sand)', borderRadius: 'var(--radius-md)' }}>
              {expectedHash.trim() && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: verificationResult.hashMatches ? 'var(--signal-green)' : 'var(--signal-red)' }}>
                  {verificationResult.hashMatches ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <strong style={{ fontSize: '0.9rem' }}>
                    {verificationResult.hashMatches ? '¡El Hash SHA-256 coincide correctamente!' : '¡El Hash no coincide con el Server Seed!'}
                  </strong>
                </div>
              )}

              <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                Número Determinista Derivado (Roll 0-99,999):
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--camel-light)', marginTop: 4 }}>
                {verificationResult.outcomeRoll.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
