import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const score = payload[0].value;
    const color = score >= 67 ? '#2d7a4f' : score >= 34 ? '#b5820a' : '#c0392b';
    return (
      <div style={{ background: 'white', border: `1px solid ${color}`, borderRadius: '8px', padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#888', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '28px', color, letterSpacing: '2px' }}>{score}%</div>
      </div>
    );
  }
  return null;
};

export default function RecoveryTrend({ trend, plan }) {
  const chartData = trend?.length > 0
    ? trend.map(r => ({ date: r.date ? new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '', score: r.score })).filter(r => r.score).reverse()
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Weekly & Monthly insights */}
      {(plan.weekly_insight || plan.monthly_insight) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {plan.weekly_insight && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--yellow)', letterSpacing: '2px', marginBottom: '8px' }}>📊 THIS WEEK</div>
              <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7 }}>{plan.weekly_insight}</p>
            </div>
          )}
          {plan.monthly_insight && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)', letterSpacing: '2px', marginBottom: '8px' }}>📈 THIS MONTH</div>
              <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7 }}>{plan.monthly_insight}</p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', marginBottom: '4px' }}>7-DAY RECOVERY TREND</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '2px', marginBottom: '24px', color: 'var(--text)' }}>RECOVERY HISTORY</h2>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2d7a4f" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2d7a4f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={67} stroke="#2d7a4f" strokeDasharray="4 4" opacity={0.4} />
              <ReferenceLine y={34} stroke="#b5820a" strokeDasharray="4 4" opacity={0.4} />
              <Area type="monotone" dataKey="score" stroke="#2d7a4f" strokeWidth={2} fill="url(#rg)" dot={{ fill: '#2d7a4f', r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '10px', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '32px' }}>📊</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>Trend data appears after first sync</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[{ color: '#2d7a4f', desc: '67–100% — Train hard' }, { color: '#b5820a', desc: '34–66% — Moderate' }, { color: '#c0392b', desc: '0–33% — Rest' }].map((z, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: z.color }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>{z.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'DAYS ON PROGRAM', value: plan.days_on_program || 0, icon: '📅' },
          { label: 'CURRENT WEEK', value: `W${plan.week_number || 1}`, icon: '📆' },
          { label: 'AVG RECOVERY', value: chartData.length > 0 ? Math.round(chartData.reduce((a, b) => a + (b.score || 0), 0) / chartData.length) + '%' : '—', icon: '💚' },
          { label: 'DATA POINTS', value: chartData.length, icon: '📊' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: 'var(--accent)', letterSpacing: '2px' }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', letterSpacing: '2px', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
