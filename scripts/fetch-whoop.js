import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID;
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const WHOOP_REFRESH_TOKEN = process.env.WHOOP_REFRESH_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // e.g. ashgoy05/fitai
const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v1';

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

// ─── OAuth: exchange refresh token for new access + refresh tokens ───────────
async function refreshAccessToken() {
  console.log('Refreshing WHOOP access token...');
  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: WHOOP_REFRESH_TOKEN,
      client_id: WHOOP_CLIENT_ID,
      client_secret: WHOOP_CLIENT_SECRET,
      scope: 'read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement offline',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token, newRefreshToken: data.refresh_token };
}

// ─── Save new refresh token back to GitHub Secrets ───────────────────────────
async function updateGitHubSecret(secretName, secretValue) {
  const [owner, repo] = GITHUB_REPOSITORY.split('/');

  // Get repo public key for encryption
  const keyRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
  });
  const { key, key_id } = await keyRes.json();

  // Encrypt secret using libsodium
  const sodium = await import('libsodium-wrappers');
  await sodium.ready;
  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const binSecret = sodium.from_string(secretValue);
  const encBytes = sodium.crypto_box_seal(binSecret, binKey);
  const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  // Update secret
  await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ encrypted_value: encryptedValue, key_id }),
  });
  console.log(`✅ Updated ${secretName} in GitHub Secrets`);
}

// ─── WHOOP API helper ─────────────────────────────────────────────────────────
function makeWhoopGet(accessToken) {
  return async (endpoint) => {
    const res = await fetch(`${WHOOP_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WHOOP API error ${res.status}: ${text}`);
    }
    return res.json();
  };
}

// ─── Load/save history ────────────────────────────────────────────────────────
function loadHistory() {
  const p = path.join(__dirname, '../src/data/history.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
  }
  return [];
}

function saveHistory(history) {
  const p = path.join(__dirname, '../src/data/history.json');
  // Keep max 90 days
  const trimmed = history.slice(-90);
  fs.writeFileSync(p, JSON.stringify(trimmed, null, 2));
}

// ─── Fetch WHOOP data ─────────────────────────────────────────────────────────
async function fetchWhoopData(accessToken) {
  console.log('Fetching WHOOP data...');
  const whoopGet = makeWhoopGet(accessToken);

  const [recoveryData, sleepData, cycleData, workoutData] = await Promise.all([
    whoopGet('/recovery?limit=7'),
    whoopGet('/activity/sleep?limit=7'),
    whoopGet('/cycle?limit=7'),
    whoopGet('/activity/workout?limit=10'),
  ]);

  return {
    latestRecovery: recoveryData.records?.[0] || null,
    latestSleep: sleepData.records?.[0] || null,
    latestCycle: cycleData.records?.[0] || null,
    recentWorkouts: workoutData.records || [],
    recoveryTrend: recoveryData.records || [],
    sleepTrend: sleepData.records || [],
  };
}

// ─── Build history entry ──────────────────────────────────────────────────────
function buildHistoryEntry(whoopData) {
  const today = new Date().toISOString().split('T')[0];
  const r = whoopData.latestRecovery?.score;
  const s = whoopData.latestSleep?.score;
  const c = whoopData.latestCycle?.score;

  return {
    date: today,
    recovery_score: r?.recovery_score ?? null,
    hrv: r?.hrv_rmssd_milli ?? null,
    resting_hr: r?.resting_heart_rate ?? null,
    sleep_hours: s?.total_in_bed_time_milli ? +(s.total_in_bed_time_milli / 3600000).toFixed(1) : null,
    sleep_performance: s?.sleep_performance_percentage ?? null,
    strain: c?.strain ?? null,
    calories: c?.kilojoule ? +(c.kilojoule / 4.184).toFixed(0) : null,
    workout_count: whoopData.recentWorkouts.filter(w => {
      const d = w.start?.split('T')[0];
      return d === today;
    }).length,
  };
}

// ─── Compute weekly & monthly analytics ──────────────────────────────────────
function computeAnalytics(history) {
  const last7 = history.slice(-7);
  const last30 = history.slice(-30);

  const avg = (arr, key) => {
    const vals = arr.map(d => d[key]).filter(v => v !== null);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };

  return {
    week: {
      avg_recovery: avg(last7, 'recovery_score'),
      avg_hrv: avg(last7, 'hrv'),
      avg_sleep_hours: avg(last7, 'sleep_hours'),
      avg_strain: avg(last7, 'strain'),
      total_workouts: last7.reduce((a, d) => a + (d.workout_count || 0), 0),
      recovery_trend: last7.map(d => ({ date: d.date, score: d.recovery_score })),
    },
    month: {
      avg_recovery: avg(last30, 'recovery_score'),
      avg_hrv: avg(last30, 'hrv'),
      avg_sleep_hours: avg(last30, 'sleep_hours'),
      avg_strain: avg(last30, 'strain'),
      total_workouts: last30.reduce((a, d) => a + (d.workout_count || 0), 0),
      best_recovery: Math.max(...last30.map(d => d.recovery_score).filter(Boolean), 0),
      worst_recovery: Math.min(...last30.map(d => d.recovery_score).filter(Boolean), 100),
    },
    days_on_program: history.length,
  };
}

// ─── YouTube search for exercises ────────────────────────────────────────────
async function getExerciseVideo(exerciseName) {
  const query = encodeURIComponent(`${exerciseName} exercise tutorial proper form`);
  // Use YouTube's oEmbed / search suggestion — no API key needed
  const searchUrl = `https://www.youtube.com/results?search_query=${query}`;
  return `https://www.youtube.com/results?search_query=${query}`;
}

// ─── Generate AI plan ─────────────────────────────────────────────────────────
async function generateAIPlan(whoopData, history, analytics) {
  console.log('Generating AI plan with Claude...');

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const r = whoopData.latestRecovery?.score;
  const s = whoopData.latestSleep?.score;
  const c = whoopData.latestCycle?.score;

  const recoveryScore = r?.recovery_score ?? 'N/A';
  const hrv = r?.hrv_rmssd_milli ?? 'N/A';
  const restingHR = r?.resting_heart_rate ?? 'N/A';
  const sleepPerf = s?.sleep_performance_percentage ?? 'N/A';
  const sleepHours = s?.total_in_bed_time_milli ? (s.total_in_bed_time_milli / 3600000).toFixed(1) : 'N/A';
  const strain = c?.strain ?? 'N/A';
  const calories = c?.kilojoule ? (c.kilojoule / 4.184).toFixed(0) : 'N/A';

  const prompt = `You are FitAI, a world-class personal trainer and nutritionist. Today is ${today} (${dayOfWeek}).

USER PROFILE:
- Name: ${USER_PROFILE.name}
- Height: ${USER_PROFILE.height_cm}cm, Weight: ${USER_PROFILE.weight_kg}kg  
- Goal: ${USER_PROFILE.goal}
- Diet: ${USER_PROFILE.diet}
- Gym schedule: ${USER_PROFILE.gym_schedule}
- Fitness level: ${USER_PROFILE.fitness_level}
- Fixed breakfast: ${USER_PROFILE.breakfast}
- Daily must-haves: ${USER_PROFILE.must_haves}

TODAY'S WHOOP DATA:
- Recovery Score: ${recoveryScore}%
- HRV: ${hrv} ms
- Resting Heart Rate: ${restingHR} bpm
- Sleep Performance: ${sleepPerf}%
- Sleep Duration: ${sleepHours} hours
- Strain: ${strain}/21
- Calories Burned: ${calories} kcal

7-DAY AVERAGES:
- Avg Recovery: ${analytics.week.avg_recovery}%
- Avg HRV: ${analytics.week.avg_hrv} ms
- Avg Sleep: ${analytics.week.avg_sleep_hours} hrs
- Avg Strain: ${analytics.week.avg_strain}
- Workouts This Week: ${analytics.week.total_workouts}

30-DAY AVERAGES:
- Avg Recovery: ${analytics.month.avg_recovery}%
- Avg HRV: ${analytics.month.avg_hrv} ms
- Avg Sleep: ${analytics.month.avg_sleep_hours} hrs
- Total Workouts: ${analytics.month.total_workouts}
- Best Recovery: ${analytics.month.best_recovery}%

PROGRAM STATS:
- Days on program: ${analytics.days_on_program}
- Week number: ${Math.ceil(analytics.days_on_program / 7) || 1}

Use the weekly and monthly trends to make smarter decisions:
- If HRV has been dropping all week → prescribe deload
- If recovery trending up → increase intensity  
- If sleep consistently poor → prioritize sleep tips
- If workouts < 3 this week → push to train today

For each exercise, include a youtube_search string (3-5 words, best for finding a tutorial video).

Respond ONLY with valid JSON, no markdown, no explanation:

{
  "date": "${today}",
  "recovery_score": ${recoveryScore === 'N/A' ? null : recoveryScore},
  "hrv": ${hrv === 'N/A' ? null : hrv},
  "resting_hr": ${restingHR === 'N/A' ? null : restingHR},
  "sleep_performance": ${sleepPerf === 'N/A' ? null : sleepPerf},
  "sleep_hours": ${sleepHours === 'N/A' ? null : sleepHours},
  "strain": ${strain === 'N/A' ? null : strain},
  "calories_burned": ${calories === 'N/A' ? null : calories},
  "recovery_trend": ${JSON.stringify(analytics.week.recovery_trend)},
  "daily_status": "Green or Yellow or Red",
  "status_message": "Motivational sentence based on today + trend data",
  "weekly_insight": "2-3 sentences analyzing the week's trend and what it means",
  "monthly_insight": "2-3 sentences on monthly progress toward six-pack goal",
  "workout": {
    "recommended": true,
    "type": "e.g. Strength - Upper Body / Rest & Recovery / Cardio",
    "duration_minutes": 45,
    "intensity": "Low/Medium/High",
    "exercises": [
      {
        "name": "Exercise name",
        "sets": 3,
        "reps": "10-12",
        "rest_seconds": 60,
        "notes": "Key form tip",
        "youtube_search": "dumbbell row proper form"
      }
    ],
    "warmup": "Specific warmup instructions",
    "cooldown": "Specific cooldown instructions",
    "rationale": "Why this workout based on today's WHOOP data AND weekly trend"
  },
  "meal_plan": {
    "total_calories_target": 1800,
    "protein_g": 140,
    "carbs_g": 160,
    "fat_g": 60,
    "meals": [
      { "time": "7:00 AM", "name": "Breakfast", "description": "Overnight oats + milk, Activia yogurt, seasonal fruit", "calories": 450, "protein_g": 25 },
      { "time": "10:30 AM", "name": "Mid-morning snack", "description": "...", "calories": 200, "protein_g": 15 },
      { "time": "1:00 PM", "name": "Lunch", "description": "Non-veg with rice/roti", "calories": 550, "protein_g": 40 },
      { "time": "4:00 PM", "name": "Pre-workout", "description": "...", "calories": 200, "protein_g": 10 },
      { "time": "7:30 PM", "name": "Dinner", "description": "Non-veg protein + vegetables", "calories": 500, "protein_g": 45 }
    ]
  },
  "daily_tips": ["Tip based on today's data", "Tip based on weekly trend", "Tip based on monthly progress"],
  "progress_insight": "Detailed paragraph on six-pack progress using all available data",
  "week_number": ${Math.ceil(analytics.days_on_program / 7) || 1},
  "days_on_program": ${analytics.days_on_program}
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
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

// ─── Add YouTube links to exercises ──────────────────────────────────────────
function addYouTubeLinks(plan) {
  if (!plan.workout?.exercises) return plan;
  plan.workout.exercises = plan.workout.exercises.map(ex => ({
    ...ex,
    youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtube_search || ex.name + ' exercise tutorial')}`,
  }));
  return plan;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    // 1. Refresh access token
    const { accessToken, newRefreshToken } = await refreshAccessToken();

    // 2. Save new refresh token back to GitHub Secrets
    if (newRefreshToken && GITHUB_TOKEN && GITHUB_REPOSITORY) {
      await updateGitHubSecret('WHOOP_REFRESH_TOKEN', newRefreshToken);
    }

    // 3. Fetch WHOOP data
    const whoopData = await fetchWhoopData(accessToken);

    // 4. Load history & append today
    const history = loadHistory();
    const todayEntry = buildHistoryEntry(whoopData);
    const existingIdx = history.findIndex(h => h.date === todayEntry.date);
    if (existingIdx >= 0) history[existingIdx] = todayEntry;
    else history.push(todayEntry);
    saveHistory(history);

    // 5. Compute analytics
    const analytics = computeAnalytics(history);

    // 6. Generate AI plan
    let plan = await generateAIPlan(whoopData, history, analytics);

    // 7. Add YouTube links
    plan = addYouTubeLinks(plan);

    // 8. Save daily plan
    const outputPath = path.join(__dirname, '../src/data/daily-plan.json');
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));

    console.log(`✅ Daily plan generated for ${plan.date}`);
    console.log(`   Recovery: ${plan.recovery_score}% | Sleep: ${plan.sleep_hours}h | Strain: ${plan.strain}`);
    console.log(`   Days on program: ${analytics.days_on_program} | Week ${plan.week_number}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
