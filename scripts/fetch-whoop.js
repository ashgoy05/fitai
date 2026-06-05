import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Credentials ─────────────────────────────────────────────────────────────
const WHOOP_CLIENT_ID = '5481da9c-04ff-4227-be33-a72b148f2098';

const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const WHOOP_REFRESH_TOKEN = process.env.WHOOP_REFRESH_TOKEN;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v1';


// ─── Validate Secrets ────────────────────────────────────────────────────────
function validateSecrets() {

  console.log('Checking environment variables...');

  if (!WHOOP_CLIENT_SECRET) {
    throw new Error(
      '❌ WHOOP_CLIENT_SECRET missing. Add it in GitHub Actions Secrets.'
    );
  }

  if (!WHOOP_REFRESH_TOKEN) {
    throw new Error(
      '❌ WHOOP_REFRESH_TOKEN missing. Add it in GitHub Actions Secrets.'
    );
  }

  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      '❌ ANTHROPIC_API_KEY missing. Add it in GitHub Actions Secrets.'
    );
  }

  console.log('✅ All secrets loaded successfully');
  console.log('WHOOP Client Secret length:', WHOOP_CLIENT_SECRET.length);
  console.log('WHOOP Refresh Token length:', WHOOP_REFRESH_TOKEN.length);
}


// Run validation before API calls
validateSecrets();


// ─── User Profile ────────────────────────────────────────────────────────────
const USER_PROFILE = {
  name: 'Ash',
  height_cm: 163,
  weight_kg: 70,
  goal: 'Fat loss, build six-pack, get lean and attractive',
  diet: 'Non-vegetarian',
  gym_schedule:
    'Tue & Thu at office gym (7am-5pm), Mon/Wed/Fri gym after 6pm, Sat/Sun free',
  fitness_level: 'Complete beginner',
  breakfast: 'Overnight oats + milk every morning',
  must_haves: 'Activia yogurt and fruit daily',
};

// ─── OAuth refresh ────────────────────────────────────────────────────────────
async function refreshAccessToken() {
  console.log('Refreshing WHOOP access token...');
  console.log('Client ID:', WHOOP_CLIENT_ID);
  console.log('Client Secret length:', WHOOP_CLIENT_SECRET?.length);
  console.log('Refresh Token length:', WHOOP_REFRESH_TOKEN?.length);

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', WHOOP_REFRESH_TOKEN);
  params.append('client_id', WHOOP_CLIENT_ID);
  params.append('client_secret', WHOOP_CLIENT_SECRET);
  params.append('scope', 'offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement');

  console.log('Request body:', params.toString().replace(WHOOP_CLIENT_SECRET, '***').replace(WHOOP_REFRESH_TOKEN, '***'));

  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const text = await res.text();
  console.log('Response status:', res.status);
  console.log('Response:', text.replace(WHOOP_CLIENT_SECRET, '***'));

  if (!res.ok) {
    throw new Error(`Token refresh failed ${res.status}: ${text}`);
  }

  const data = JSON.parse(text);
  return { accessToken: data.access_token, newRefreshToken: data.refresh_token };
}

// ─── Save new refresh token back to GitHub Secrets ────────────────────────────
async function updateGitHubSecret(secretName, secretValue) {
  try {
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    const keyRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    const { key, key_id } = await keyRes.json();
    const sodium = await import('libsodium-wrappers');
    await sodium.ready;
    const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    const binSecret = sodium.from_string(secretValue);
    const encBytes = sodium.crypto_box_seal(binSecret, binKey);
    const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
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
  } catch (err) {
    console.log(`⚠️ Could not update secret: ${err.message}`);
  }
}

// ─── WHOOP API ────────────────────────────────────────────────────────────────
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

// ─── History ──────────────────────────────────────────────────────────────────
function loadHistory() {
  const p = path.join(__dirname, '../src/data/history.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
  }
  return [];
}

function saveHistory(history) {
  const p = path.join(__dirname, '../src/data/history.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(history.slice(-90), null, 2));
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
  };
}

// ─── History entry ────────────────────────────────────────────────────────────
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
    workout_count: whoopData.recentWorkouts.filter(w => w.start?.split('T')[0] === today).length,
  };
}

// ─── Analytics ───────────────────────────────────────────────────────────────
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
      total_workouts: last30.reduce((a, d) => a + (d.workout_count || 0), 0),
      best_recovery: last30.length ? Math.max(...last30.map(d => d.recovery_score).filter(Boolean), 0) : null,
    },
    days_on_program: history.length,
  };
}

// ─── AI Plan ─────────────────────────────────────────────────────────────────
async function generateAIPlan(whoopData, analytics) {
  console.log('Generating AI plan...');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const r = whoopData.latestRecovery?.score;
  const s = whoopData.latestSleep?.score;
  const c = whoopData.latestCycle?.score;
  const recoveryScore = r?.recovery_score ?? null;
  const hrv = r?.hrv_rmssd_milli ?? null;
  const restingHR = r?.resting_heart_rate ?? null;
  const sleepPerf = s?.sleep_performance_percentage ?? null;
  const sleepHours = s?.total_in_bed_time_milli ? +(s.total_in_bed_time_milli / 3600000).toFixed(1) : null;
  const strain = c?.strain ?? null;
  const calories = c?.kilojoule ? +(c.kilojoule / 4.184).toFixed(0) : null;

  const prompt = `You are FitAI, a world-class personal trainer and nutritionist. Today is ${today}.

USER PROFILE:
- Name: Ash, Height: 163cm, Weight: 70kg
- Goal: Fat loss, build six-pack, get lean and attractive
- Diet: Non-vegetarian
- Gym schedule: Tue & Thu at office gym, Mon/Wed/Fri gym after 6pm, Sat/Sun free
- Fitness level: Complete beginner
- Fixed breakfast: Overnight oats + milk
- Daily must-haves: Activia yogurt and fruit

TODAY'S WHOOP DATA:
- Recovery Score: ${recoveryScore ?? 'N/A'}%
- HRV: ${hrv ?? 'N/A'} ms
- Resting HR: ${restingHR ?? 'N/A'} bpm
- Sleep Performance: ${sleepPerf ?? 'N/A'}%
- Sleep Hours: ${sleepHours ?? 'N/A'}
- Strain: ${strain ?? 'N/A'}/21
- Calories Burned: ${calories ?? 'N/A'} kcal

WEEKLY AVERAGES:
- Avg Recovery: ${analytics.week.avg_recovery ?? 'N/A'}%
- Avg HRV: ${analytics.week.avg_hrv ?? 'N/A'} ms
- Avg Sleep: ${analytics.week.avg_sleep_hours ?? 'N/A'} hrs
- Workouts this week: ${analytics.week.total_workouts}

Days on program: ${analytics.days_on_program}

Respond ONLY with valid JSON, no markdown:
{
  "date": "${today}",
  "recovery_score": ${recoveryScore},
  "hrv": ${hrv},
  "resting_hr": ${restingHR},
  "sleep_performance": ${sleepPerf},
  "sleep_hours": ${sleepHours},
  "strain": ${strain},
  "calories_burned": ${calories},
  "recovery_trend": ${JSON.stringify(analytics.week.recovery_trend)},
  "daily_status": "Green or Yellow or Red",
  "status_message": "motivational sentence",
  "weekly_insight": "2-3 sentences on weekly trend",
  "monthly_insight": "2-3 sentences on monthly progress",
  "workout": {
    "recommended": true,
    "type": "workout type",
    "duration_minutes": 45,
    "intensity": "Low/Medium/High",
    "exercises": [
      { "name": "Exercise", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "form tip", "youtube_search": "exercise tutorial" }
    ],
    "warmup": "warmup instructions",
    "cooldown": "cooldown instructions",
    "rationale": "why this workout"
  },
  "meal_plan": {
    "total_calories_target": 1800,
    "protein_g": 140,
    "carbs_g": 160,
    "fat_g": 60,
    "meals": [
      { "time": "7:00 AM", "name": "Breakfast", "description": "Overnight oats + milk, Activia yogurt, fruit", "calories": 450, "protein_g": 25 },
      { "time": "10:30 AM", "name": "Snack", "description": "snack description", "calories": 200, "protein_g": 15 },
      { "time": "1:00 PM", "name": "Lunch", "description": "non-veg lunch", "calories": 550, "protein_g": 40 },
      { "time": "4:00 PM", "name": "Pre-workout", "description": "pre workout snack", "calories": 200, "protein_g": 10 },
      { "time": "7:30 PM", "name": "Dinner", "description": "non-veg dinner", "calories": 500, "protein_g": 45 }
    ]
  },
  "daily_tips": ["tip 1", "tip 2", "tip 3"],
  "progress_insight": "detailed progress paragraph",
  "week_number": ${Math.ceil(analytics.days_on_program / 7) || 1},
  "days_on_program": ${analytics.days_on_program}
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

// ─── Add YouTube links ────────────────────────────────────────────────────────
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
    const { accessToken, newRefreshToken } = await refreshAccessToken();
    if (newRefreshToken && GITHUB_TOKEN && GITHUB_REPOSITORY) {
      await updateGitHubSecret('WHOOP_REFRESH_TOKEN', newRefreshToken);
    }
    const whoopData = await fetchWhoopData(accessToken);
    const history = loadHistory();
    const todayEntry = buildHistoryEntry(whoopData);
    const idx = history.findIndex(h => h.date === todayEntry.date);
    if (idx >= 0) history[idx] = todayEntry; else history.push(todayEntry);
    saveHistory(history);
    const analytics = computeAnalytics(history);
    let plan = await generateAIPlan(whoopData, analytics);
    plan = addYouTubeLinks(plan);
    const outputPath = path.join(__dirname, '../src/data/daily-plan.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
    console.log(`✅ Done! Recovery: ${plan.recovery_score}% | Sleep: ${plan.sleep_hours}h`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
