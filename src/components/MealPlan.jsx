import React, { useState } from 'react';

export default function MealPlan({ mealPlan, compact }) {
  const [expanded, setExpanded] = useState(null);
  if (!mealPlan) return null;

  const macros = [
    { label: 'PROTEIN', value: mealPlan.protein_g, unit: 'g', color: 'var(--green)', pct: `${Math.round((mealPlan.protein_g * 4 / mealPlan.total_calories_target) * 100)}%` },
    { label: 'CARBS', value: mealPlan.carbs_g, unit: 'g', color: '#5b4fcf', pct: `${Math.round((mealPlan.carbs_g * 4 / mealPlan.total_calories_target) * 100)}%` },
    { label: 'FAT', value: mealPlan.fat_g, unit: 'g', color: '#c0392b', pct: `${Math.round((mealPlan.fat_g * 9 / mealPlan.total_calories_target) * 100)}%` },
  ];

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>TODAY'S NUTRITION</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: compact ? '22px' : '30px', letterSpacing: '2px', marginBottom: '16px', color: 'var(--text)' }}>MEAL PLAN</h2>

      {/* Calories target */}
      <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', letterSpacing: '1px' }}>DAILY TARGET</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--green)', letterSpacing: '2px' }}>{mealPlan.total_calories_target} <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>kcal</span></span>
      </div>

      {/* Macros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {macros.map(m => (
          <div key={m.label} style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '4px' }}>{m.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: m.color, letterSpacing: '1px' }}>{m.value}<span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{m.unit}</span></div>
            <div style={{ height: '3px', background: 'var(--border2)', borderRadius: '2px', marginTop: '6px' }}>
              <div style={{ height: '100%', width: m.pct, background: m.color, borderRadius: '2px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Meals - ALL shown, expandable */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mealPlan.meals?.map((meal, i) => (
          <div key={i}>
            <div
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ background: 'var(--bg)', borderRadius: expanded === i ? '10px 10px 0 0' : '10px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', minWidth: '52px' }}>{meal.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text)' }}>{meal.name}</div>
                  {compact && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{meal.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--yellow)', background: 'var(--yellow-bg)', padding: '2px 8px', borderRadius: '10px' }}>{meal.calories} kcal</span>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{expanded === i ? '▲' : '▼'}</span>
                </div>
              </div>
            </div>

            {expanded === i && (
              <div style={{ background: '#fafaf8', borderRadius: '0 0 10px 10px', border: '1px solid var(--border)', borderTop: 'none', padding: '12px 16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '8px' }}>{meal.description}</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--yellow)' }}>🔥 {meal.calories} kcal</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)' }}>💪 {meal.protein_g}g protein</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
