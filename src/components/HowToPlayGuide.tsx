import React from 'react';
import { HelpCircle } from 'lucide-react';

interface HowToPlayGuideProps {
  title: string;
  steps: string[];
  tips?: string;
}

export const HowToPlayGuide: React.FC<HowToPlayGuideProps> = ({ title, steps, tips }) => {
  return (
    <div style={{
      marginTop: 32,
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      color: 'var(--ivory)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <HelpCircle size={20} style={{ color: 'var(--camel-light)' }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--camel-light)' }}>
          Cómo Jugar a {title}
        </h3>
      </div>
      <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.7, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
        {steps.map((step, idx) => (
          <li key={idx} style={{ marginBottom: 6 }}>{step}</li>
        ))}
      </ol>
      {tips && (
        <div style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--ink-muted)', fontStyle: 'italic', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 10 }}>
          💡 <strong>Consejo del Casino:</strong> {tips}
        </div>
      )}
    </div>
  );
};
