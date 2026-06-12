import React, { useState } from 'react';
import planData from './data/daily-plan.json';
import historyData from './data/history.json';
import Header from './components/Header.jsx';
import HeroMetrics from './components/HeroMetrics.jsx';
import WorkoutPlan from './components/WorkoutPlan.jsx';
import MealPlan from './components/MealPlan.jsx';
import RecoveryTrend from './components/RecoveryTrend.jsx';
import DailyTips from './components/DailyTips.jsx';
import ProgressInsight from './components/ProgressInsight.jsx';
import StatsTab from './components/StatsTab.jsx';
import DailyLog from './components/DailyLog.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const plan = planData;
  const history = historyData || [];

  const tabs = [
    { id: 'today',     label: "📋 Today" },
    { id: 'workout',   label: '💪 Workout' },
    { id: 'nutrition', label: '🥗 Nutrition' },
    { id: 'log',       label: '📝 Daily Log' },
    { id: 'stats',     label: '📊 Stats' },
    { id: 'trends',    label: '📈 Trends' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px 60px' }}>
        <Header plan={plan} />

        {/* Nav tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '32px',
          background: 'var(--card)', borderRadius: '12px', padding: '4px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexWrap: 'wrap',
        }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px',
              fontWeight: '500', transition: 'all 0.2s',
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--muted)',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Today — workout is fully expandable here too */}
        {activeTab === 'today' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <HeroMetrics plan={plan} />
            <WorkoutPlan workout={plan.workout} compact={false} />
            <MealPlan mealPlan={plan.meal_plan} compact={false} />
            <DailyTips tips={plan.daily_tips} />
            <ProgressInsight insight={plan.progress_insight} daysOnProgram={plan.days_on_program} weekNumber={plan.week_number} />
          </div>
        )}

        {activeTab === 'workout'   && <WorkoutPlan workout={plan.workout} compact={false} />}
        {activeTab === 'nutrition' && <MealPlan mealPlan={plan.meal_plan} compact={false} />}
        {activeTab === 'log'       && <DailyLog />}
        {activeTab === 'stats'     && <StatsTab history={history} plan={plan} />}
        {activeTab === 'trends'    && <RecoveryTrend trend={plan.recovery_trend} plan={plan} />}
      </div>
    </div>
  );
}
