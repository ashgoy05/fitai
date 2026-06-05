import React from 'react';

function MetricCard({ label, value, unit, color, icon, sublabel }) {
  const displayColor = color || 'var(--accent)';
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '20px',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = displayColor}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
        background: `radial-gradient(circle at top right, ${displayColor}15, transparent 70%)`,
      }} />
      <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '42px', color: displayColor, letterSpacing: '2px', lineHeight: 1 }}>
          {value ?? '—'}
        </span>
        {unit && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>{unit}</span>}
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
  const recoveryColor = getRecoveryColor(plan.recovery_score);

  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)',
        letterSpacing: '2px', marginBottom: '16px',
      }}>
        TODAY'S WHOOP METRICS
      </div>

      {/* Recovery score big display */}
      {plan.recovery_score !== null && (
        <div style={{
          background: 'var(--card)', border: `1px solid ${recoveryColor}`,
          borderRadius: '14px', padding: '24px 28px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '6px' }}>
              RECOVERY SCORE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '88px', color: recoveryColor, letterSpacing: '4px', lineHeight: 1 }}>
                {plan.recovery_score}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--muted)' }}>%</span>
            </div>
          </div>
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%',
            background: `conic-gradient(${recoveryColor} ${plan.recovery_score * 3.6}deg, var(--border) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <span style={{ fontSize: '28px' }}>
                {plan.recovery_score >= 67 ? '💚' : plan.recovery_score >= 34 ? '💛' : '🔴'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                {plan.daily_status}
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <MetricCard
          label="HRV"
          value={plan.hrv ? Math.round(plan.hrv) : null}
          unit="ms"
          icon="⚡"
          color="var(--green)"
          sublabel="Heart Rate Variability"
        />
        <MetricCard
          label="RESTING HR"
          value={plan.resting_hr ? Math.round(plan.resting_hr) : null}
          unit="bpm"
          icon="❤️"
          color="#ff6b9d"
          sublabel="Beats per minute"
        />
        <MetricCard
          label="SLEEP"
          value={plan.sleep_hours}
          unit="hrs"
          icon="🌙"
          color="#7c6ef9"
          sublabel={plan.sleep_performance ? `${plan.sleep_performance}% performance` : 'Sleep duration'}
        />
        <MetricCard
          label="STRAIN"
          value={plan.strain ? plan.strain.toFixed(1) : null}
          unit="/21"
          icon="🔥"
          color="var(--yellow)"
          sublabel={plan.calories_burned ? `${plan.calories_burned} kcal burned` : 'Daily strain score'}
        />
      </div>
    </div>
  );
}
