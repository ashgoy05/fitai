import React, { useState } from 'react';
import planData from './data/daily-plan.json';
import Header from './components/Header.jsx';
import HeroMetrics from './components/HeroMetrics.jsx';
import WorkoutPlan from './components/WorkoutPlan.jsx';
import MealPlan from './components/MealPlan.jsx';
import RecoveryTrend from './components/RecoveryTrend.jsx';
import DailyTips from './components/DailyTips.jsx';
import ProgressInsight from './components/ProgressInsight.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const plan = planData;

  const statusColor = plan.daily_status === 'Green'
    ? 'var(--green)' : plan.daily_status === 'Yellow'
    ? 'var(--yellow)' : 'var(--red)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', position: 'relative', overflowX: 'hidden' }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        opacity: 0.15,
        pointerEvents: 'none',
      }} />

      {/* Glow orb */}
      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,255,135,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '0 20px 60px' }}>
        <Header plan={plan} statusColor={statusColor} />

        {/* Nav tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '32px',
          background: 'var(--card)', borderRadius: '12px', padding: '4px',
          border: '1px solid var(--border)', width: 'fit-content',
        }}>
          {[
            { id: 'today', label: "TODAY'S PLAN" },
            { id: 'workout', label: 'WORKOUT' },
            { id: 'nutrition', label: 'NUTRITION' },
            { id: 'trends', label: 'TRENDS' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1px',
                transition: 'all 0.2s',
                background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? 'var(--black)' : 'var(--muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'today' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <HeroMetrics plan={plan} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <WorkoutPlan workout={plan.workout} compact />
              <MealPlan mealPlan={plan.meal_plan} compact />
            </div>
            <DailyTips tips={plan.daily_tips} />
            <ProgressInsight insight={plan.progress_insight} daysOnProgram={plan.days_on_program} weekNumber={plan.week_number} />
          </div>
        )}

        {activeTab === 'workout' && (
          <WorkoutPlan workout={plan.workout} compact={false} />
        )}

        {activeTab === 'nutrition' && (
          <MealPlan mealPlan={plan.meal_plan} compact={false} />
        )}

        {activeTab === 'trends' && (
          <RecoveryTrend trend={plan.recovery_trend} plan={plan} />
        )}
      </div>
    </div>
  );
}
