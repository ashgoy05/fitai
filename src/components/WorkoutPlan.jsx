import React, { useState } from 'react';

export default function WorkoutPlan({ workout, compact }) {
  const [expanded, setExpanded] = useState(null);

  if (!workout) return null;

  const intensityColor = workout.intensity === 'High' ? 'var(--red)'
    : workout.intensity === 'Medium' ? 'var(--yellow)'
    : 'var(--green)';

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '6px' }}>
            TODAY'S WORKOUT
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: compact ? '24px' : '32px', letterSpacing: '2px', lineHeight: 1 }}>
            {workout.type}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 12px', borderRadius: '20px',
            background: intensityColor + '22', border: `1px solid ${intensityColor}`,
            fontFamily: 'var(--font-mono)', fontSize: '10px', color: intensityColor, letterSpacing: '1px',
          }}>
            {workout.intensity}
          </span>
          <span style={{
            padding: '4px 12px', borderRadius: '20px',
            background: 'var(--card2)', border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px',
          }}>
            ⏱ {workout.duration_minutes} MIN
          </span>
          {!workout.recommended && (
            <span style={{
              padding: '4px 12px', borderRadius: '20px',
              background: 'var(--red-dim)', border: '1px solid var(--red)',
              fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--red)', letterSpacing: '1px',
            }}>
              REST DAY ADVISED
            </span>
          )}
        </div>
      </div>

      {workout.rationale && (
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: 1.6, borderLeft: '2px solid var(--accent)', paddingLeft: '12px' }}>
          {workout.rationale}
        </p>
      )}

      {!compact && workout.warmup && (
        <div style={{
          background: 'var(--card2)', borderRadius: '10px', padding: '14px 16px',
          marginBottom: '16px', border: '1px solid var(--border)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', letterSpacing: '2px', marginBottom: '6px' }}>
            WARM-UP
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>{workout.warmup}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(compact ? workout.exercises?.slice(0, 3) : workout.exercises)?.map((ex, i) => (
          <div key={i}>
            <div
              onClick={() => !compact && setExpanded(expanded === i ? null : i)}
              style={{
                background: 'var(--card2)', borderRadius: expanded === i ? '10px 10px 0 0' : '10px',
                border: '1px solid var(--border)',
                borderBottom: expanded === i ? 'none' : '1px solid var(--border)',
                cursor: compact ? 'default' : 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => !compact && (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => !compact && (e.currentTarget.style.borderColor = expanded === i ? 'transparent' : 'var(--border)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--accent)', minWidth: '28px' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{ex.name}</div>
                  {!compact && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {ex.sets} sets × {ex.reps} reps • {ex.rest_seconds}s rest
                    </div>
                  )}
                </div>
                {compact ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>
                    {ex.sets}×{ex.reps}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{expanded === i ? '▲' : '▼'}</span>
                )}
              </div>
            </div>

            {!compact && expanded === i && (
              <div style={{
                background: 'var(--card2)', borderRadius: '0 0 10px 10px',
                border: '1px solid var(--border)', borderTop: '1px solid var(--border)',
                padding: '14px 16px',
              }}>
                {ex.notes && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', letterSpacing: '1px', marginBottom: '4px' }}>
                      FORM TIP
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{ex.notes}</p>
                  </div>
                )}
                {ex.youtube_url && (
                  <a
                    href={ex.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px', borderRadius: '8px',
                      background: '#ff000022', border: '1px solid #ff0000aa',
                      color: '#ff4444', textDecoration: 'none',
                      fontFamily: 'var(--font-mono)', fontSize: '11px',
                      letterSpacing: '1px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ff000044'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ff000022'}
                  >
                    ▶ WATCH TUTORIAL ON YOUTUBE
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
        <div style={{
          background: 'var(--card2)', borderRadius: '10px', padding: '14px 16px',
          marginTop: '16px', border: '1px solid var(--border)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7c6ef9', letterSpacing: '2px', marginBottom: '6px' }}>
            COOL-DOWN
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>{workout.cooldown}</p>
        </div>
      )}
    </div>
  );
}
