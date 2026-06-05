import React from 'react';

export default function Header({ plan, statusColor }) {
  return (
    <header style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 12px ${statusColor}`,
              animation: 'pulse-green 2s ease-in-out infinite',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px' }}>
              LIVE • WHOOP SYNCED
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 8vw, 80px)',
            letterSpacing: '4px',
            lineHeight: 1,
            color: 'var(--text)',
          }}>
            FIT<span style={{ color: 'var(--accent)' }}>AI</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px', fontWeight: '300' }}>
            Ash's Personal Six-Pack Journey
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--muted)', letterSpacing: '1px', marginBottom: '4px',
          }}>
            TODAY
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '2px', color: 'var(--text)' }}>
            {plan.date !== 'Waiting for first sync...' ? plan.date : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {plan.days_on_program > 0 && (
            <div style={{
              marginTop: '6px', display: 'inline-block',
              background: 'var(--green-dim)', border: '1px solid var(--green)',
              borderRadius: '20px', padding: '3px 12px',
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)',
            }}>
              DAY {plan.days_on_program} • WEEK {plan.week_number}
            </div>
          )}
        </div>
      </div>

      {plan.status_message && (
        <div style={{
          marginTop: '24px', padding: '14px 20px',
          background: plan.daily_status === 'Green' ? 'var(--green-dim)' : plan.daily_status === 'Yellow' ? 'var(--yellow-dim)' : 'var(--red-dim)',
          border: `1px solid ${plan.daily_status === 'Green' ? 'var(--green)' : plan.daily_status === 'Yellow' ? 'var(--yellow)' : 'var(--red)'}`,
          borderRadius: '10px',
          fontStyle: 'italic', color: 'var(--text)', fontSize: '15px',
        }}>
          "{plan.status_message}"
        </div>
      )}
    </header>
  );
}
