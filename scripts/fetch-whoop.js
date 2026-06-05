import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHOOP_TOKEN = process.env.WHOOP_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v1';

// User profile (Ash's stats)
const USER_PROFILE = {
  name: 'Ash',
  height_cm: 163,
  weight_kg: 70,
  goal: 'Fat loss, build six-pack, get lean and attractive',
  diet: 'Non-vegetarian',
  gym_schedule: 'Tue & Thu at office gym (7am-5pm), Mon/Wed/Fri gym after 6pm, Sat/Sun free',
  fitness_level: 'Complete beginner',
  breakfast: 'Overnight oats + milk every morning',
  must_haves: 'Activia yogurt and fruit daily',
};

async function whoopGet(endpoint) {
  const res = await fetch(`${WHOOP_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${WHOOP_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WHOOP API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchWhoopData() {
  console.log('Fetching WHOOP data...');

  const [profile, bodyMeasurement] = await Promise.all([
    whoopGet('/user/profile/basic'),
    whoopGet('/user/measurement/body'),
  ]);

  // Get latest recovery
  const recoveryData = await whoopGet('/recovery?limit=1');
  const latestRecovery = recoveryData.records?.[0] || null;

  // Get latest sleep
  const sleepData = await whoopGet('/activity/sleep?limit=1');
  const latestSleep = sleepData.records?.[0] || null;

  // Get latest cycle
  const cycleData = await whoopGet('/cycle?limit=1');
  const latestCycle = cycleData.records?.[0] || null;

  // Get recent workout
  const workoutData = await whoopGet('/activity/workout?limit=3');
  const recentWorkouts = workoutData.records || [];

  // Get 7-day recovery trend
  const trendData = await whoopGet('/recovery?limit=7');
  const recoveryTrend = trendData.records || [];

  return {
    profile,
    bodyMeasurement,
    latestRecovery,
    latestSleep,
    latestCycle,
    recentWorkouts,
    recoveryTrend,
  };
}

async function generateAIPlan(whoopData) {
  console.log('Generating AI plan with Claude...');

  const recoveryScore = whoopData.latestRecovery?.score?.recovery_score ?? 'N/A';
  const hrv = whoopData.latestRecovery?.score?.hrv_rmssd_milli ?? 'N/A';
  const restingHR = whoopData.latestRecovery?.score?.resting_heart_rate ?? 'N/A';
  const sleepPerf = whoopData.latestSleep?.score?.sleep_performance_percentage ?? 'N/A';
  const sleepHours = whoopData.latestSleep?.score?.total_in_bed_time_milli
    ? (whoopData.latestSleep.score.total_in_bed_time_milli / 3600000).toFixed(1)
    : 'N/A';
  const strain = whoopData.latestCycle?.score?.strain ?? 'N/A';
  const calories = whoopData.latestCycle?.score?.kilojoule
    ? (whoopData.latestCycle.score.kilojoule / 4.184).toFixed(0)
    : 'N/A';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `You are FitAI, a world-class personal trainer and nutritionist. Today is ${today}.

USER PROFILE:
- Name: ${USER_PROFILE.name}
- Height: ${USER_PROFILE.height_cm}cm, Weight: ${USER_PROFILE.weight_kg}kg
- Goal: ${USER_PROFILE.goal}
- Diet: ${USER_PROFILE.diet}
- Fitness level: ${USER_PROFILE.fitness_level}
- Gym schedule: ${USER_PROFILE.gym_schedule}
- Fixed breakfast: ${USER_PROFILE.breakfast}
- Daily must-haves: ${USER_PROFILE.must_haves}

TODAY'S WHOOP DATA:
- Recovery Score: ${recoveryScore}%
- HRV: ${hrv} ms
- Resting Heart Rate: ${restingHR} bpm
- Sleep Performance: ${sleepPerf}%
- Sleep Duration: ${sleepHours} hours
- Today's Strain So Far: ${strain}
- Calories Burned: ${calories} kcal

RECENT WORKOUTS: ${whoopData.recentWorkouts.length > 0 ? whoopData.recentWorkouts.map(w => w.sport_id).join(', ') : 'None logged'}

Based on this data, generate a highly personalized daily plan. Respond ONLY with a valid JSON object, no markdown, no explanation:

{
  "date": "${today}",
  "recovery_score": ${recoveryScore === 'N/A' ? null : recoveryScore},
  "hrv": ${hrv === 'N/A' ? null : hrv},
  "resting_hr": ${restingHR === 'N/A' ? null : restingHR},
  "sleep_performance": ${sleepPerf === 'N/A' ? null : sleepPerf},
  "sleep_hours": ${sleepHours === 'N/A' ? null : sleepHours},
  "strain": ${strain === 'N/A' ? null : strain},
  "calories_burned": ${calories === 'N/A' ? null : calories},
  "recovery_trend": ${JSON.stringify(whoopData.recoveryTrend.map(r => ({ date: r.created_at?.split('T')[0], score: r.score?.recovery_score })).filter(r => r.score))},
  "daily_status": "Green/Yellow/Red based on recovery",
  "status_message": "One motivational sentence based on today's data",
  "workout": {
    "recommended": true/false based on recovery,
    "type": "e.g. Strength - Upper Body",
    "duration_minutes": 45,
    "intensity": "Low/Medium/High",
    "exercises": [
      { "name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "Form tip" }
    ],
    "warmup": "2-3 sentence warmup description",
    "cooldown": "2-3 sentence cooldown description",
    "rationale": "Why this workout based on WHOOP data"
  },
  "meal_plan": {
    "total_calories_target": 1800,
    "protein_g": 140,
    "carbs_g": 160,
    "fat_g": 60,
    "meals": [
      { "time": "7:00 AM", "name": "Breakfast", "description": "Overnight oats with milk, Activia yogurt, seasonal fruit", "calories": 450, "protein_g": 25 },
      { "time": "10:30 AM", "name": "Mid-morning snack", "description": "...", "calories": 200, "protein_g": 15 },
      { "time": "1:00 PM", "name": "Lunch", "description": "Non-veg meal with rice/roti", "calories": 550, "protein_g": 40 },
      { "time": "4:00 PM", "name": "Pre-workout snack", "description": "...", "calories": 200, "protein_g": 10 },
      { "time": "7:30 PM", "name": "Dinner", "description": "Non-veg protein with vegetables", "calories": 500, "protein_g": 45 }
    ]
  },
  "daily_tips": ["Tip 1 specific to today's data", "Tip 2", "Tip 3"],
  "progress_insight": "One paragraph insight on progress toward six-pack goal based on trends",
  "week_number": 1,
  "days_on_program": 1
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Strip markdown fences if present
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

async function main() {
  try {
    const whoopData = await fetchWhoopData();
    const plan = await generateAIPlan(whoopData);

    const outputPath = path.join(__dirname, '../src/data/daily-plan.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));

    console.log(`✅ Daily plan generated for ${plan.date}`);
    console.log(`   Recovery: ${plan.recovery_score}% | Sleep: ${plan.sleep_hours}h | Strain: ${plan.strain}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
