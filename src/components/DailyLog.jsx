import React, { useState, useEffect } from 'react';

const today = new Date().toISOString().split('T')[0];

const QUESTIONS = [
  { id: 'workout_done',  label: 'Did you complete today\'s workout?', type: 'radio', options: ['Yes — full workout', 'Yes — partial', 'No — skipped', 'Rest day'] },
  { id: 'energy',        label: 'How was your energy today?',          type: 'radio', options: ['High ⚡', 'Medium 😐', 'Low 😴', 'Very low 😩'] },
  { id: 'stress',        label: 'Stress level today?',                 type: 'radio', options: ['Low 😊', 'Medium 😤', 'High 😰', 'Very high 🤯'] },
  { id: 'diet_followed', label: 'Did you follow the meal plan?',       type: 'radio', options: ['100% on plan', 'Mostly followed', 'Partially', 'Not at all'] },
  { id: 'water',         label: 'Water intake today?',                 type: 'radio', options: ['3+ liters 💧', '2-3 liters', '1-2 liters', 'Under 1 liter'] },
  { id: 'notes',         label: 'Anything else to tell your AI coach?', type: 'textarea', placeholder: 'e.g. My lower back hurt during squats... I ate pizza for dinner... I felt great today...' },
];

export default function DailyLog() {
  const [log, setLog] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fitai_logs') || '{}');
      return saved[today] || {};
    } catch { return {}; }
  });
  const [saved, setSaved] = useState(false);
  const [allLogs, setAllLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fitai_logs') || '{}'); } catch { return {}; }
  });

  const update = (id, val) => setLog(prev => ({ ...prev, [id]: val }));

  const saveLog = () => {
    const updated = { ...allLogs, [today]: { ...log, date: today, saved_at: new Date().toISOString() } };
    localStorage.setItem('fitai_logs', JSON.stringify(updated));
    setAllLogs(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const recentLogs = Object.entries(allLogs)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Today's log form */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>DAILY CHECK-IN</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '2px', marginBottom: '6px', color: 'var(--text)' }}>LOG TODAY</h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
          Your AI coach reads this every morning to personalize tomorrow's plan.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {QUESTIONS.map(q => (
            <div key={q.id} style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>{q.label}</div>

              {q.type === 'radio' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {q.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => update(q.id, opt)}
                      style={{
                        padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                        fontSize: '13px', fontFamily: 'var(--font-body)',
                        transition: 'all 0.15s',
                        background: log[q.id] === opt ? 'var(--accent)' : 'var(--card)',
                        color: log[q.id] === opt ? 'white' : 'var(--text)',
                        border: log[q.id] === opt ? '1px solid var(--accent)' : '1px solid var(--border2)',
                        fontWeight: log[q.id] === opt ? '600' : '400',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'textarea' && (
                <textarea
                  value={log[q.id] || ''}
                  onChange={e => update(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={3}
                  style={{
                    width: '100%', padding: '12px',
                    background: 'var(--card)', border: '1px solid var(--border2)',
                    borderRadius: '8px', fontSize: '13px', color: 'var(--text)',
                    fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveLog}
          style={{
            marginTop: '20px', width: '100%', padding: '14px',
            background: saved ? '#27ae60' : 'var(--accent)',
            color: 'white', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontSize: '15px', fontWeight: '600',
            fontFamily: 'var(--font-body)', transition: 'all 0.2s',
          }}
        >
          {saved ? '✅ Saved! AI will use this tomorrow.' : 'Save Daily Log'}
        </button>
      </div>

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '16px' }}>RECENT LOGS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentLogs.map(([date, entry]) => (
              <div key={date} style={{ background: 'var(--bg)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>{date}</span>
                  {date === today && <span style={{ fontSize: '10px', background: 'var(--green-bg)', color: 'var(--green)', padding: '2px 8px', borderRadius: '10px', fontFamily: 'var(--font-mono)' }}>TODAY</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {entry.workout_done  && <span style={{ fontSize: '12px', background: 'var(--card)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: '10px', color: 'var(--text)' }}>💪 {entry.workout_done}</span>}
                  {entry.energy        && <span style={{ fontSize: '12px', background: 'var(--card)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: '10px', color: 'var(--text)' }}>⚡ {entry.energy}</span>}
                  {entry.diet_followed && <span style={{ fontSize: '12px', background: 'var(--card)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: '10px', color: 'var(--text)' }}>🍽️ {entry.diet_followed}</span>}
                  {entry.water         && <span style={{ fontSize: '12px', background: 'var(--card)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: '10px', color: 'var(--text)' }}>💧 {entry.water}</span>}
                </div>
                {entry.notes && <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.5, fontStyle: 'italic' }}>"{entry.notes}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
