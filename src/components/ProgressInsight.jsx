import React from 'react';

export default function ProgressInsight({ insight, daysOnProgram, weekNumber }) {
  // Six-pack milestones
  const milestones = [
    { day: 0, label: 'START', desc: 'Baseline' },
    { day: 14, label: 'WEEK 2', desc: 'Building habits' },
    { day: 30, label: 'MONTH 1', desc: 'First visible changes' },
    { day: 60, label: 'MONTH 2', desc: 'Significant fat loss' },
    { day: 90, label: 'MONTH 3', desc: 'Muscle definition' },
    { day: 180, label: '6 MONTHS', desc: 'Six-pack visible' },
  ];

  const progress = Math.min((daysOnProgram / 180) * 100, 100);

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '24px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '6px' }}>
        PROGRESS TOWARD GOAL
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '2px', marginBottom: '20px' }}>
        SIX-PACK JOURNEY 🎯
      </h2>

      {/* Progress bar with milestones */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'visible', position: 'relative' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--green), var(--yellow))',
            borderRadius: '3px', transition: 'width 1s ease',
          }} />
        </div>
        {/* Milestone markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          {milestones.map((m, i) => {
            const pos = (m.day / 180) * 100;
            const reached = daysOnProgram >= m.day;
            return (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: reached ? 'var(--green)' : 'var(--border)',
                  margin: '0 auto 4px',
                  boxShadow: reached ? '0 0 8px var(--green)' : 'none',
                }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: reached ? 'var(--green)' : 'var(--muted)', letterSpacing: '1px' }}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {insight && (
        <div style={{
          background: 'var(--card2)', borderRadius: '10px', padding: '16px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', letterSpacing: '2px', marginBottom: '8px' }}>
            AI COACH INSIGHT
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7 }}>{insight}</p>
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { label: 'Current Weight', value: '70 kg', icon: '⚖️' },
          { label: 'Target', value: '~62 kg', icon: '🎯' },
          { label: 'To Lose', value: '~8 kg fat', icon: '🔥' },
          { label: 'Est. Timeline', value: '4-6 months', icon: '📅' },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1', minWidth: '120px',
            background: 'var(--card2)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', fontWeight: '700' }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
