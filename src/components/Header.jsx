import React from 'react';

export default function Header({ plan }) {
  const statusColor = plan.daily_status === 'Green' ? 'var(--green)' : plan.daily_status === 'Yellow' ? 'var(--yellow)' : 'var(--red)';
  const statusBg = plan.daily_status === 'Green' ? 'var(--green-bg)' : plan.daily_status === 'Yellow' ? 'var(--yellow-bg)' : 'var(--red-bg)';

  return (
    <header style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px' }}>
              LIVE · WHOOP SYNCED
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 72px)', letterSpacing: '3px', lineHeight: 1, color: 'var(--text)' }}>
            FIT<span style={{ color: 'var(--accent)' }}>AI</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>Ash's Personal Six-Pack Journey</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>TODAY</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '1px', color: 'var(--text)' }}>
            {plan.date !== 'Waiting for first sync...' ? plan.date : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {plan.days_on_program > 0 && (
            <div style={{ marginTop: '6px', display: 'inline-block', background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: '20px', padding: '3px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)' }}>
              DAY {plan.days_on_program} · WEEK {plan.week_number}
            </div>
          )}
        </div>
      </div>
      {plan.status_message && (
        <div style={{ marginTop: '20px', padding: '14px 18px', background: statusBg, border: `1px solid ${statusColor}`, borderRadius: '10px', color: 'var(--text)', fontSize: '14px', fontStyle: 'italic' }}>
          "{plan.status_message}"
        </div>
      )}
    </header>
  );
}
