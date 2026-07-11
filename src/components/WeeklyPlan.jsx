import React, { useState } from 'react';

const WEEKLY_PLAN = {
  Monday: {
    isGym: true, isOffice: false, gymTime: '6:00 PM',
    breakfast: { name: '🫘 Chickpea Salad Bowl', cal: 450, protein: 38, prep: 'Use batch-cooked chickpeas' },
    snack: { name: '🥜 Almonds + Walnuts', cal: 180, protein: 5 },
    lunch: { name: '🫘 Rajma + Rice', cal: 520, protein: 22, prep: 'Cook rajma Sunday night' },
    preGym: { name: '🍵 Green Tea + Banana', cal: 80, protein: 1 },
    postGym: { name: '🥤 Protein Shake', cal: 150, protein: 28 },
    dinner: { name: '🍝 Chicken Pasta', cal: 480, protein: 42, prep: 'Cook double — use Tue too' },
    totalCal: 1860, totalProtein: 136,
    supplements: ['Multivitamin + D3 + Omega-3 + Collagen (breakfast)', 'Vitamin E + Zinc (lunch)', 'Pre-workout + Fiber (5:30 PM)', 'Protein shake (post gym)', 'Magnesium (bedtime)'],
    groceryNeeds: ['Chickpeas (150g)', 'Rajma (200g cooked)', 'Chicken breast (240g for pasta x2)', 'Pasta (160g)', 'Marinara sauce', 'Almonds + walnuts'],
  },
  Tuesday: {
    isGym: true, isOffice: true, gymTime: '5:30 PM',
    breakfast: { name: '🥣 Overnight Oats', cal: 520, protein: 40, prep: 'Prep Monday night' },
    snack: { name: '☕ Black Coffee + Fruit', cal: 80, protein: 1 },
    lunch: { name: '🍗 Chipotle Chicken Rice', cal: 530, protein: 45, prep: 'Pack from home' },
    preGym: { name: '🍵 Mint Tea + Banana', cal: 80, protein: 1 },
    postGym: { name: '🥤 Protein Shake', cal: 150, protein: 28 },
    dinner: { name: '🍝 Chicken Pasta', cal: 480, protein: 42, prep: 'Leftover from Monday' },
    totalCal: 1840, totalProtein: 157,
    supplements: ['Multivitamin + D3 + Omega-3 + Collagen (breakfast)', 'Vitamin E + Zinc (lunch)', 'Pre-workout + Fiber (5:00 PM)', 'Protein shake (post gym)', 'Magnesium (bedtime)'],
    groceryNeeds: ['Rolled oats (50g)', 'Costco Chipotle chicken (150g)', 'Banana x2'],
  },
  Wednesday: {
    isGym: true, isOffice: true, gymTime: '5:30 PM',
    breakfast: { name: '🥣 Overnight Oats', cal: 520, protein: 40, prep: 'Prep Tuesday night' },
    snack: { name: '☕ Black Coffee + Fruit', cal: 80, protein: 1 },
    lunch: { name: '🍗 Chipotle Chicken Rice', cal: 530, protein: 45, prep: 'Pack from home' },
    preGym: { name: '🍵 Green Tea + Banana', cal: 80, protein: 1 },
    postGym: { name: '🥤 Protein Shake', cal: 150, protein: 28 },
    dinner: { name: '🍳 Veggie Omelette', cal: 340, protein: 24, prep: '10 min — super quick' },
    totalCal: 1700, totalProtein: 139,
    supplements: ['Multivitamin + D3 + Omega-3 + Collagen (breakfast)', 'Vitamin E + Zinc (lunch)', 'Pre-workout + Fiber (5:00 PM)', 'Protein shake (post gym)', 'Magnesium (bedtime)'],
    groceryNeeds: ['Rolled oats (50g)', 'Costco Chipotle chicken (150g)', 'Eggs x3', 'Batch cook chickpeas tonight for Fri breakfast'],
  },
  Thursday: {
    isGym: true, isOffice: true, gymTime: '5:30 PM',
    breakfast: { name: '🥣 Overnight Oats', cal: 520, protein: 40, prep: 'Prep Wednesday night' },
    snack: { name: '☕ Black Coffee + Fruit', cal: 80, protein: 1 },
    lunch: { name: '🍲 Dal Tadka + Rice', cal: 490, protein: 22, prep: 'Cook Wed night, pack' },
    preGym: { name: '🍵 Mint Tea + Banana', cal: 80, protein: 1 },
    postGym: { name: '🥤 Protein Shake', cal: 150, protein: 28 },
    dinner: { name: '🍳 Veggie Omelette', cal: 380, protein: 26, prep: '10 min quick dinner' },
    totalCal: 1700, totalProtein: 118,
    supplements: ['Multivitamin + D3 + Omega-3 + Collagen (breakfast)', 'Vitamin E + Zinc (lunch)', 'Pre-workout + Fiber (5:00 PM)', 'Protein shake (post gym)', 'Magnesium (bedtime)'],
    groceryNeeds: ['Rolled oats (50g)', 'Dal moong/masoor (80g dry)', 'Eggs x3', 'Banana'],
  },
  Friday: {
    isGym: true, isOffice: false, gymTime: '6:00 PM',
    breakfast: { name: '🫘 Chickpea Salad Bowl', cal: 450, protein: 38, prep: 'Use batch chickpeas from Wed' },
    snack: { name: '🥜 Almonds + Walnuts', cal: 180, protein: 5 },
    lunch: { name: '🧀 Paneer Bhurji + Rice', cal: 545, protein: 32, prep: '20 min fresh' },
    preGym: { name: '🍵 Green Tea + Banana', cal: 80, protein: 1 },
    postGym: { name: '🥤 Protein Shake', cal: 150, protein: 28 },
    dinner: { name: '🍗 Chicken Tikka + Salad', cal: 320, protein: 42, prep: 'Marinate Thu night' },
    totalCal: 1725, totalProtein: 146,
    supplements: ['Multivitamin + D3 + Omega-3 + Collagen (breakfast)', 'Vitamin E + Zinc (lunch)', 'Pre-workout + Fiber (5:30 PM)', 'Protein shake (post gym)', 'Magnesium (bedtime)'],
    groceryNeeds: ['Chickpeas (batch from Wed)', 'Paneer (150g)', 'Chicken breast (150g tikka)', 'Almonds + walnuts'],
  },
  Saturday: {
    isGym: false, isOffice: false, gymTime: null,
    breakfast: { name: '🌱 Sprout Masala Bowl', cal: 390, protein: 36, prep: '5 min — just mix' },
    snack: { name: '🥜 Almonds + Walnuts', cal: 180, protein: 5 },
    lunch: { name: '🍗 Chicken Breast + Veg Rice', cal: 520, protein: 48, prep: '20 min fresh cook' },
    preGym: { name: '🥤 Protein Shake (2 PM)', cal: 150, protein: 28 },
    postGym: null,
    dinner: { name: '🍚 Curd Rice', cal: 320, protein: 12, prep: '5 min — light dinner' },
    totalCal: 1560, totalProtein: 129,
    supplements: ['Multivitamin + D3 + Omega-3 + Collagen (breakfast)', 'Vitamin E + Zinc (lunch)', 'Protein shake (after lunch 2 PM)', 'Magnesium (bedtime)'],
    groceryNeeds: ['Mixed sprouts (150g)', 'Chicken breast (150g)', 'Curd (250g total)', 'Almonds + walnuts'],
  },
  Sunday: {
    isGym: false, isOffice: false, gymTime: null,
    breakfast: { name: '🌱 Sprout Masala Bowl', cal: 390, protein: 36, prep: '5 min — just mix' },
    snack: { name: '🥜 Almonds + Walnuts', cal: 180, protein: 5 },
    lunch: { name: '🫘 Chole + Rice', cal: 530, protein: 22, prep: 'Use batch chickpeas' },
    preGym: { name: '🥤 Protein Shake (2 PM)', cal: 150, protein: 28 },
    postGym: null,
    dinner: { name: '🥗 Caesar Salad', cal: 380, protein: 28, prep: '5 min — no cooking' },
    totalCal: 1630, totalProtein: 119,
    supplements: ['Multivitamin + D3 + Omega-3 + Collagen (breakfast)', 'Vitamin E + Zinc (lunch)', 'Protein shake (after lunch 2 PM)', 'Magnesium (bedtime)', '📋 PREP FOR WEEK: Cook rajma + chickpeas in bulk tonight!'],
    groceryNeeds: ['Mixed sprouts (150g)', 'Chickpeas (200g + extra for Mon/Wed/Fri)', 'Eggs x2', 'Paneer for Caesar', 'Romaine lettuce/spinach'],
  }
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WeeklyPlan() {
  const [activeDay, setActiveDay] = useState('Monday');
  const [activeSection, setActiveSection] = useState('meals');
  const day = WEEKLY_PLAN[activeDay];

  const meals = [
    { time: '7:00 AM', ...day.breakfast },
    { time: '10:30 AM', ...day.snack },
    { time: '1:00 PM', ...day.lunch },
    { time: '4:00 PM', ...day.preGym },
    ...(day.postGym ? [{ time: 'Post Gym', ...day.postGym }] : []),
    { time: '7:30 PM', ...day.dinner },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Day selector */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '12px' }}>SELECT DAY</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {DAYS.map(d => {
            const dp = WEEKLY_PLAN[d];
            return (
              <button key={d} onClick={() => setActiveDay(d)} style={{
                padding: '8px 14px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px',
                fontWeight: '500', transition: 'all 0.15s',
                background: activeDay === d ? 'var(--accent)' : 'var(--bg)',
                color: activeDay === d ? 'white' : 'var(--text)',
                outline: activeDay === d ? 'none' : '1px solid var(--border)',
              }}>
                <div>{d.slice(0, 3)}</div>
                <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.8 }}>
                  {dp.isGym ? '🏋️' : '😴'}{dp.isOffice ? '🏢' : '🏠'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day summary */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '2px', color: 'var(--text)' }}>{activeDay.toUpperCase()}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              {day.isOffice && <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>🏢 Office day</span>}
              {day.isGym ? <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', background: 'var(--green-bg)', color: 'var(--green)' }}>🏋️ Gym {day.gymTime}</span>
                : <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', background: '#EEEDFE', color: '#3C3489' }}>😴 Rest day</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--accent)', letterSpacing: '1px' }}>{day.totalCal}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)' }}>KCAL</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: '#185FA5', letterSpacing: '1px' }}>{day.totalProtein}g</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)' }}>PROTEIN</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--card)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)', width: 'fit-content' }}>
        {['meals', 'supplements', 'grocery'].map(s => (
          <button key={s} onClick={() => setActiveSection(s)} style={{
            padding: '7px 16px', borderRadius: '7px', border: 'none',
            cursor: 'pointer', fontSize: '12px', fontWeight: '500',
            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
            background: activeSection === s ? 'var(--accent)' : 'transparent',
            color: activeSection === s ? 'white' : 'var(--muted)',
          }}>
            {s === 'meals' ? '🍽️ Meals' : s === 'supplements' ? '💊 Supplements' : '🛒 Grocery'}
          </button>
        ))}
      </div>

      {/* Meals section */}
      {activeSection === 'meals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {meals.map((meal, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', minWidth: '60px' }}>{meal.time}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>{meal.name}</div>
                {meal.prep && <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>💡 {meal.prep}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--yellow)' }}>{meal.cal} kcal</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--green)' }}>{meal.protein}g protein</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplements section */}
      {activeSection === 'supplements' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '16px' }}>SUPPLEMENT SCHEDULE — {activeDay.toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {day.supplements.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--bg)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--accent)', opacity: 0.5, minWidth: '24px' }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grocery section */}
      {activeSection === 'grocery' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '16px' }}>WHAT YOU NEED — {activeDay.toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {day.groceryNeeds.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '16px' }}>🛒</span>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>{item}</span>
              </div>
            ))}
          </div>

          {activeDay === 'Sunday' && (
            <div style={{ marginTop: '16px', background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', letterSpacing: '1px', marginBottom: '8px' }}>📋 SUNDAY BATCH COOK CHECKLIST</div>
              {['Cook rajma (for Monday lunch)', 'Boil chickpeas in bulk (Mon/Wed/Fri breakfast + Sun lunch)', 'Cook extra rice (store for 3-4 days)', 'Marinate chicken tikka for Friday dinner', 'Prep overnight oats for Monday breakfast'].map((t, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--text)', padding: '4px 0', display: 'flex', gap: '8px' }}>
                  <span>☐</span><span>{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly overview strip */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '14px' }}>FULL WEEK OVERVIEW</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '600px' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>Day</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>Breakfast</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>Lunch</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>Dinner</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--muted)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>Kcal</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--muted)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>Protein</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(d => {
                const dp = WEEKLY_PLAN[d];
                return (
                  <tr key={d} onClick={() => setActiveDay(d)} style={{ cursor: 'pointer', background: activeDay === d ? 'var(--green-bg)' : 'transparent' }}>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', fontWeight: '500', color: activeDay === d ? 'var(--green)' : 'var(--text)' }}>
                      {d.slice(0, 3)} {dp.isGym ? '🏋️' : '😴'}
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{dp.breakfast.name}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{dp.lunch.name}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{dp.dinner.name}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--yellow)', fontFamily: 'var(--font-mono)' }}>{dp.totalCal}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{dp.totalProtein}g</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
