import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const T = ({ active, payload, label, unit, color }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color, letterSpacing: '1px' }}>{payload[0].value}{unit}</div>
    </div>
  );
};

function Chart({ data, dataKey, color, unit, height = 160 }) {
  if (!data?.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '10px', color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
      No data yet
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
        <defs>
          <linearGradient id={`g${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'Space Mono', fill: '#aaa' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fontFamily: 'Space Mono', fill: '#aaa' }} axisLine={false} tickLine={false} />
        <Tooltip content={<T unit={unit} color={color} />} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#g${dataKey})`} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function WeightChart({ data, color }) {
  if (!data?.length) return (
    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '10px', color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
      Log your weight to see progress
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0eb" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'Space Mono', fill: '#aaa' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9, fontFamily: 'Space Mono', fill: '#aaa' }} axisLine={false} tickLine={false} />
        <Tooltip content={<T unit="kg" color={color} />} />
        <Line type="monotone" dataKey="weight" stroke={color} strokeWidth={2} dot={{ fill: color, r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function StatsTab({ history, plan }) {
  const [weightInput, setWeightInput] = useState('');
  const [weightLog, setWeightLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fitai_weight') || '[]'); } catch { return []; }
  });
  const [saved, setSaved] = useState(false);

  const logWeight = () => {
    const w = parseFloat(weightInput);
    if (!w || w < 30 || w > 200) return;
    const today = new Date().toISOString().split('T')[0];
    const updated = weightLog.filter(e => e.date !== today);
    updated.push({ date: today, weight: w });
    updated.sort((a, b) => a.date.localeCompare(b.date));
    setWeightLog(updated);
    localStorage.setItem('fitai_weight', JSON.stringify(updated));
    setWeightInput('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Prepare chart data from history
  const last30 = history.slice(-30).map(h => ({
    date: h.date?.slice(5),
    recovery: h.recovery_score,
    hrv: h.hrv ? Math.round(h.hrv) : null,
    sleep: h.sleep_hours,
    strain: h.strain ? +h.strain.toFixed(1) : null,
  })).filter(h => h.date);

  const weightData = weightLog.slice(-30).map(w => ({
    date: w.date?.slice(5),
    weight: w.weight,
  }));

  const latest = weightLog[weightLog.length - 1];
  const startWeight = weightLog[0]?.weight || 70;
  const currentWeight = latest?.weight || 70;
  const lost = +(startWeight - currentWeight).toFixed(1);
  const toGo = +(currentWeight - 62).toFixed(1);

  // Summary stats
  const avg = (key) => {
    const vals = last30.map(d => d[key]).filter(v => v != null);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  const summaryStats = [
    { label: 'Avg Recovery', value: avg('recovery'), unit: '%', color: 'var(--green)', icon: '💚' },
    { label: 'Avg HRV', value: avg('hrv'), unit: 'ms', color: '#5b4fcf', icon: '⚡' },
    { label: 'Avg Sleep', value: avg('sleep'), unit: 'hrs', color: '#2980b9', icon: '🌙' },
    { label: 'Avg Strain', value: avg('strain'), unit: '/21', color: 'var(--yellow)', icon: '🔥' },
    { label: 'Days Logged', value: last30.length, unit: '', color: 'var(--accent)', icon: '📅' },
    { label: 'Workouts', value: history.reduce((a, d) => a + (d.workout_count || 0), 0), unit: '', color: '#c0392b', icon: '💪' },
  ];

  const section = (title, children) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '14px' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {summaryStats.map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: s.color, letterSpacing: '1px', lineHeight: 1 }}>{s.value}<span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{s.unit}</span></div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '4px', letterSpacing: '1px' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Weight tracker */}
      {section('WEIGHT TRACKER — LOG DAILY TO TRACK PROGRESS',
        <div>
          {/* Weight progress */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Current', value: currentWeight + ' kg', color: 'var(--text)' },
              { label: 'Lost So Far', value: lost > 0 ? '-' + lost + ' kg' : '0 kg', color: lost > 0 ? 'var(--green)' : 'var(--muted)' },
              { label: 'To Goal (62kg)', value: toGo > 0 ? toGo + ' kg' : '🎯 Goal!', color: toGo > 0 ? 'var(--yellow)' : 'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: s.color, letterSpacing: '1px' }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', marginTop: '4px' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Progress bar to goal */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>Start: {startWeight}kg</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)' }}>Goal: 62kg</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(Math.max((lost / (startWeight - 62)) * 100, 0), 100)}%`,
                background: 'linear-gradient(90deg, var(--green), #27ae60)',
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Weight chart */}
          <WeightChart data={weightData} color="var(--green)" />

          {/* Log weight input */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', alignItems: 'center' }}>
            <input
              type="number"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="Enter today's weight (kg)"
              step="0.1"
              style={{
                flex: 1, padding: '10px 14px',
                background: 'var(--bg)', border: '1px solid var(--border2)',
                borderRadius: '8px', fontSize: '14px', color: 'var(--text)',
                fontFamily: 'var(--font-body)', outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && logWeight()}
            />
            <button onClick={logWeight} style={{
              padding: '10px 20px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600',
              transition: 'opacity 0.2s',
            }}>
              {saved ? '✅ Saved!' : 'Log Weight'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            💡 Log every morning after waking up, before eating, for accurate tracking
          </p>
        </div>
      )}

      {/* Recovery chart */}
      {section('RECOVERY SCORE — LAST 30 DAYS',
        <Chart data={last30} dataKey="recovery" color="var(--green)" unit="%" />
      )}

      {/* HRV chart */}
      {section('HRV (HEART RATE VARIABILITY) — LAST 30 DAYS',
        <div>
          <Chart data={last30} dataKey="hrv" color="#5b4fcf" unit="ms" />
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', lineHeight: 1.5 }}>
            Higher HRV = better recovery. As you get fitter, your HRV will increase. This is one of the best indicators of six-pack progress.
          </p>
        </div>
      )}

      {/* Sleep chart */}
      {section('SLEEP — LAST 30 DAYS',
        <Chart data={last30} dataKey="sleep" color="#2980b9" unit="hrs" />
      )}

      {/* Strain chart */}
      {section('DAILY STRAIN — LAST 30 DAYS',
        <Chart data={last30} dataKey="strain" color="var(--yellow)" unit="" />
      )}

    </div>
  );
}
