import React from 'react';

function MetricCard({ label, value, unit, color, bg, icon, sublabel }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '44px', color: color || 'var(--text)', letterSpacing: '2px', lineHeight: 1 }}>
          {value ?? '—'}
        </span>
        {unit && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{unit}</span>}
      </div>
      {sublabel && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  );
}

function getRecoveryColor(score) {
  if (!score) return 'var(--muted)';
  if (score >= 67) return 'var(--green)';
  if (score >= 34) return 'var(--yellow)';
  return 'var(--red)';
}

export default function HeroMetrics({ plan }) {
  const rc = getRecoveryColor(plan.recovery_score);
  const rcBg = plan.recovery_score >= 67 ? 'var(--green-bg)' : plan.recovery_score >= 34 ? 'var(--yellow-bg)' : 'var(--red-bg)';

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '16px' }}>TODAY'S WHOOP METRICS</div>

      {plan.recovery_score !== null && (
        <div style={{ background: 'var(--card)', border: `2px solid ${rc}`, borderRadius: '14px', padding: '24px 28px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>RECOVERY SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '96px', color: rc, letterSpacing: '4px', lineHeight: 1 }}>{plan.recovery_score}</span>
              <span style={{ fontSize: '24px', color: 'var(--muted)' }}>%</span>
            </div>
            <div style={{ marginTop: '8px', display: 'inline-block', background: rcBg, border: `1px solid ${rc}`, borderRadius: '20px', padding: '3px 14px', fontSize: '12px', color: rc, fontWeight: '600' }}>
              {plan.daily_status} DAY
            </div>
          </div>
          <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: `conic-gradient(${rc} ${plan.recovery_score * 3.6}deg, var(--border) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '82px', height: '82px', borderRadius: '50%', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              {plan.recovery_score >= 67 ? '💚' : plan.recovery_score >= 34 ? '💛' : '🔴'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <MetricCard label="HRV" value={plan.hrv ? Math.round(plan.hrv) : null} unit="ms" icon="⚡" color="var(--green)" sublabel="Heart Rate Variability" />
        <MetricCard label="RESTING HR" value={plan.resting_hr ? Math.round(plan.resting_hr) : null} unit="bpm" icon="❤️" color="#c0392b" sublabel="Beats per minute" />
        <MetricCard label="SLEEP" value={plan.sleep_hours} unit="hrs" icon="🌙" color="#5b4fcf" sublabel={plan.sleep_performance ? `${plan.sleep_performance}% performance` : 'Duration'} />
        <MetricCard label="STRAIN" value={plan.strain ? plan.strain.toFixed(1) : null} unit="/21" icon="🔥" color="var(--yellow)" sublabel={plan.calories_burned ? `${plan.calories_burned} kcal` : 'Daily strain'} />
      </div>
    </div>
  );
}
