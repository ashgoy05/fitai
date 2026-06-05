import React from 'react';

export default function MealPlan({ mealPlan, compact }) {
  if (!mealPlan) return null;

  const macros = [
    { label: 'CALORIES', value: mealPlan.total_calories_target, unit: 'kcal', color: 'var(--yellow)', width: '100%' },
    { label: 'PROTEIN', value: mealPlan.protein_g, unit: 'g', color: 'var(--green)', width: `${(mealPlan.protein_g * 4 / mealPlan.total_calories_target) * 100}%` },
    { label: 'CARBS', value: mealPlan.carbs_g, unit: 'g', color: '#7c6ef9', width: `${(mealPlan.carbs_g * 4 / mealPlan.total_calories_target) * 100}%` },
    { label: 'FAT', value: mealPlan.fat_g, unit: 'g', color: '#ff6b9d', width: `${(mealPlan.fat_g * 9 / mealPlan.total_calories_target) * 100}%` },
  ];

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '24px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '6px' }}>
        TODAY'S NUTRITION
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: compact ? '24px' : '32px', letterSpacing: '2px', marginBottom: '20px', lineHeight: 1 }}>
        MEAL PLAN
      </h2>

      {/* Macro bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {macros.slice(1).map(m => (
          <div key={m.label} style={{
            background: 'var(--card2)', borderRadius: '10px', padding: '12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', letterSpacing: '1px' }}>{m.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: m.color, fontWeight: '700' }}>{m.value}{m.unit}</span>
            </div>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: m.width, background: m.color, borderRadius: '2px', transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(compact ? mealPlan.meals?.slice(0, 3) : mealPlan.meals)?.map((meal, i) => (
          <div key={i} style={{
            background: 'var(--card2)', borderRadius: '10px', padding: '12px 16px',
            border: '1px solid var(--border)',
            display: 'flex', gap: '12px', alignItems: 'flex-start',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)',
              minWidth: '52px', paddingTop: '2px',
            }}>
              {meal.time}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{meal.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>{meal.description}</div>
              {!compact && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--yellow)' }}>{meal.calories} kcal</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)' }}>{meal.protein_g}g protein</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {compact && mealPlan.meals?.length > 3 && (
          <div style={{ textAlign: 'center', padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>
            +{mealPlan.meals.length - 3} more meals →
          </div>
        )}
      </div>

      {!compact && (
        <div style={{
          marginTop: '16px', padding: '12px 16px',
          background: 'var(--green-dim)', border: '1px solid var(--green)',
          borderRadius: '10px',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', letterSpacing: '2px', marginBottom: '4px' }}>
            DAILY TARGET
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--green)', letterSpacing: '2px' }}>
            {mealPlan.total_calories_target} <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>CALORIES</span>
          </div>
        </div>
      )}
    </div>
  );
}
