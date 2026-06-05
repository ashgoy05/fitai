import React, { useState } from 'react';

export default function WorkoutPlan({ workout, compact }) {
  const [expanded, setExpanded] = useState(null);
  if (!workout) return null;

  const intensityColor = workout.intensity === 'High' ? 'var(--red)' : workout.intensity === 'Medium' ? 'var(--yellow)' : 'var(--green)';
  const intensityBg = workout.intensity === 'High' ? 'var(--red-bg)' : workout.intensity === 'Medium' ? 'var(--yellow-bg)' : 'var(--green-bg)';

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>TODAY'S WORKOUT</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: compact ? '22px' : '30px', letterSpacing: '2px', color: 'var(--text)' }}>{workout.type}</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 12px', borderRadius: '20px', background: intensityBg, border: `1px solid ${intensityColor}`, fontSize: '11px', color: intensityColor, fontWeight: '600' }}>{workout.intensity}</span>
          <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>⏱ {workout.duration_minutes} min</span>
        </div>
      </div>

      {workout.rationale && (
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.6, borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>
          {workout.rationale}
        </p>
      )}

      {!compact && workout.warmup && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', letterSpacing: '1px', marginBottom: '4px' }}>WARM-UP</div>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{workout.warmup}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(compact ? workout.exercises?.slice(0, 3) : workout.exercises)?.map((ex, i) => (
          <div key={i}>
            <div
              onClick={() => !compact && setExpanded(expanded === i ? null : i)}
              style={{ background: 'var(--bg)', borderRadius: expanded === i && !compact ? '10px 10px 0 0' : '10px', border: '1px solid var(--border)', cursor: compact ? 'default' : 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => !compact && (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => !compact && (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--accent)', minWidth: '28px' }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>{ex.name}</div>
                  {!compact && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{ex.sets} sets × {ex.reps} reps · {ex.rest_seconds}s rest</div>}
                </div>
                {compact
                  ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>{ex.sets}×{ex.reps}</span>
                  : <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{expanded === i ? '▲' : '▼'}</span>
                }
              </div>
            </div>

            {!compact && expanded === i && (
              <div style={{ background: '#fafaf8', borderRadius: '0 0 10px 10px', border: '1px solid var(--border)', borderTop: 'none', padding: '14px 16px' }}>
                {ex.notes && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', letterSpacing: '1px', marginBottom: '4px' }}>FORM TIP</div>
                    <p style={{ fontSize: '13px', color: 'var(--text)' }}>{ex.notes}</p>
                  </div>
                )}
                {ex.youtube_url && (
                  <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '8px 16px', borderRadius: '8px',
                    background: '#fff0f0', border: '1px solid #ffcccc',
                    color: '#cc0000', textDecoration: 'none',
                    fontSize: '12px', fontWeight: '600',
                    transition: 'all 0.15s',
                  }}>
                    ▶ Watch Tutorial on YouTube
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
        {compact && workout.exercises?.length > 3 && (
          <div style={{ textAlign: 'center', padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>
            +{workout.exercises.length - 3} more exercises →
          </div>
        )}
      </div>

      {!compact && workout.cooldown && (
        <div style={{ background: '#f0f0ff', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginTop: '14px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#5b4fcf', letterSpacing: '1px', marginBottom: '4px' }}>COOL-DOWN</div>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{workout.cooldown}</p>
        </div>
      )}
    </div>
  );
}
