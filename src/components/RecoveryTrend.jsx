import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const score = payload[0].value;
    const color = score >= 67 ? '#00ff87' : score >= 34 ? '#ffd60a' : '#ff3b3b';
    return (
      <div style={{
        background: '#141414', border: `1px solid ${color}`,
        borderRadius: '8px', padding: '10px 14px',
      }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#888', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '28px', color, letterSpacing: '2px' }}>{score}%</div>
      </div>
    );
  }
  return null;
};

export default function RecoveryTrend({ trend, plan }) {
  const chartData = trend?.length > 0
    ? trend.map(r => ({
        date: r.date ? new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '',
        score: r.score,
      })).reverse()
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '14px', padding: '24px',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '6px' }}>
          7-DAY RECOVERY TREND
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', letterSpacing: '2px', marginBottom: '24px' }}>
          RECOVERY HISTORY
        </h2>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="recoveryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff87" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={67} stroke="#00ff87" strokeDasharray="4 4" opacity={0.3} />
              <ReferenceLine y={34} stroke="#ffd60a" strokeDasharray="4 4" opacity={0.3} />
              <Area type="monotone" dataKey="score" stroke="#00ff87" strokeWidth={2} fill="url(#recoveryGrad)" dot={{ fill: '#00ff87', r: 4 }} activeDot={{ r: 6, fill: '#00ff87' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px dashed var(--border)', borderRadius: '10px',
            flexDirection: 'column', gap: '8px',
          }}>
            <span style={{ fontSize: '32px' }}>📊</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>TREND DATA AFTER FIRST SYNC</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'GREEN ZONE', color: 'var(--green)', desc: '67-100% — Train hard' },
            { label: 'YELLOW ZONE', color: 'var(--yellow)', desc: '34-66% — Moderate' },
            { label: 'RED ZONE', color: 'var(--red)', desc: '0-33% — Rest' },
          ].map(z => (
            <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: z.color }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>{z.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'PROGRAM DAYS', value: plan.days_on_program || 0, icon: '📅' },
          { label: 'CURRENT WEEK', value: plan.week_number || 1, icon: '📆' },
          { label: 'AVG RECOVERY', value: chartData.length > 0 ? Math.round(chartData.reduce((a, b) => a + (b.score || 0), 0) / chartData.length) + '%' : '—', icon: '💚' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', color: 'var(--accent)', letterSpacing: '2px' }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
