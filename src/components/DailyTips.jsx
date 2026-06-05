import React from 'react';

export default function DailyTips({ tips }) {
  if (!tips?.length) return null;

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '24px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '16px' }}>
        TODAY'S TIPS FROM YOUR AI COACH
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {tips.map((tip, i) => (
          <div key={i} style={{
            display: 'flex', gap: '14px', alignItems: 'flex-start',
            background: 'var(--card2)', borderRadius: '10px', padding: '14px 16px',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '32px',
              color: 'var(--accent)', opacity: 0.4, lineHeight: 1, minWidth: '28px',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, paddingTop: '2px' }}>{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
