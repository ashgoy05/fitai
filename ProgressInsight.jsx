import React from 'react';

export default function ProgressInsight({ insight, daysOnProgram, weekNumber }) {
  const milestones = [
    { day: 0,   label: 'Start',    desc: 'Baseline' },
    { day: 14,  label: 'Week 2',   desc: 'Building habits' },
    { day: 30,  label: 'Month 1',  desc: 'First changes' },
    { day: 60,  label: 'Month 2',  desc: 'Fat loss visible' },
    { day: 90,  label: 'Month 3',  desc: 'Definition' },
    { day: 180, label: '6 Months', desc: 'Six-pack!' },
  ];
  const progress = Math.min((daysOnProgram / 180) * 100, 100);

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>PROGRESS TOWARD GOAL</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', letterSpacing: '2px', marginBottom: '20px', color: 'var(--text)' }}>SIX-PACK JOURNEY 🎯</h2>

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--green), #27ae60)', borderRadius: '4px', transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          {milestones.map((m, i) => {
            const reached = daysOnProgram >= m.day;
            return (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: reached ? 'var(--green)' : 'var(--border2)', margin: '0 auto 4px', border: reached ? '2px solid var(--green)' : '2px solid var(--border2)' }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: reached ? 'var(--green)' : 'var(--muted)', letterSpacing: '0.5px' }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {insight && (
        <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', letterSpacing: '1px', marginBottom: '8px' }}>AI COACH INSIGHT</div>
          <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7 }}>{insight}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
        {[
          { label: 'Current Weight', value: '70 kg', icon: '⚖️' },
          { label: 'Target', value: '~62 kg', icon: '🎯' },
          { label: 'To Lose', value: '~8 kg', icon: '🔥' },
          { label: 'Est. Timeline', value: '4–6 months', icon: '📅' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text)' }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
