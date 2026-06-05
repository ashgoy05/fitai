import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHOOP_CLIENT_ID     = '5481da9c-04ff-4227-be33-a72b148f2098';
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const ANTHROPIC_API_KEY   = process.env.ANTHROPIC_API_KEY;
const WHOOP_BASE          = 'https://api.prod.whoop.com/developer/v2';

const TOKENS_PATH = path.join(__dirname, '../src/data/tokens.json');

// ─── Load refresh token from file ────────────────────────────────────────────
function loadRefreshToken() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    console.log('Loaded refresh token from tokens.json');
    return data.refresh_token;
  } catch {
    // Fall back to env variable (first run)
    const envToken = process.env.WHOOP_REFRESH_TOKEN;
    if (envToken) {
      console.log('Using refresh token from env secret (first run)');
      return envToken;
    }
    throw new Error('No refresh token found in tokens.json or WHOOP_REFRESH_TOKEN secret');
  }
}

// ─── Save new refresh token to file in repo ───────────────────────────────────
function saveRefreshToken(refreshToken) {
  fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
  fs.writeFileSync(TOKENS_PATH, JSON.stringify({ refresh_token: refreshToken, updated_at: new Date().toISOString() }, null, 2));
  console.log('✅ Saved new refresh token to tokens.json');
}

// ─── Step 1: Get access token using refresh token ────────────────────────────
async function refreshAccessToken(refreshToken) {
  console.log('Getting access token...');
  const body = new URLSearchParams();
  body.append('grant_type',    'refresh_token');
  body.append('refresh_token', refreshToken);
  body.append('client_id',     WHOOP_CLIENT_ID);
  body.append('client_secret', WHOOP_CLIENT_SECRET);
  body.append('scope',         'offline');

  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  console.log('Token status:', res.status);
  if (!res.ok) throw new Error(`Token failed ${res.status}: ${text}`);
  const data = JSON.parse(text);
  console.log('✅ Got access token');
  return { accessToken: data.access_token, newRefreshToken: data.refresh_token };
}

// ─── Step 2: WHOOP API calls ──────────────────────────────────────────────────
function whoopGet(accessToken) {
  return async (endpoint) => {
    const res = await fetch(`${WHOOP_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`WHOOP API ${res.status}: ${await res.text()}`);
    return res.json();
  };
}

// ─── History ──────────────────────────────────────────────────────────────────
function loadHistory() {
  const p = path.join(__dirname, '../src/data/history.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

function saveHistory(history) {
  const p = path.join(__dirname, '../src/data/history.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(history.slice(-90), null, 2));
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function computeAnalytics(history) {
  const avg = (arr, key) => {
    const vals = arr.map(d => d[key]).filter(v => v != null);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };
  const last7  = history.slice(-7);
  const last30 = history.slice(-30);
  return {
    week: {
      avg_recovery: avg(last7, 'recovery_score'),
      avg_hrv: avg(last7, 'hrv'),
      avg_sleep: avg(last7, 'sleep_hours'),
      total_workouts: last7.reduce((a, d) => a + (d.workout_count || 0), 0),
      trend: last7.map(d => ({ date: d.date, score: d.recovery_score })),
    },
    month: {
      avg_recovery: avg(last30, 'recovery_score'),
      avg_hrv: avg(last30, 'hrv'),
      avg_sleep: avg(last30, 'sleep_hours'),
      total_workouts: last30.reduce((a, d) => a + (d.workout_count || 0), 0),
    },
    days_on_program: history.length,
  };
}

// ─── Generate AI plan ─────────────────────────────────────────────────────────
async function generateAIPlan(whoopData, analytics) {
  console.log('Generating AI plan...');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const r = whoopData.recovery?.score;
  const s = whoopData.sleep?.score;
  const c = whoopData.cycle?.score;

  const prompt = `You are FitAI, a world-class personal trainer. Today is ${today}.

USER: Ash, 163cm, 70kg, goal: fat loss + six-pack, non-veg diet, beginner.
Breakfast: overnight oats + milk. Must have: Activia yogurt + fruit daily.
Gym: Tue/Thu office gym, Mon/Wed/Fri after 6pm, weekends free.

WHOOP TODAY:
- Recovery: ${r?.recovery_score ?? 'N/A'}%
- HRV: ${r?.hrv_rmssd_milli ?? 'N/A'} ms
- Resting HR: ${r?.resting_heart_rate ?? 'N/A'} bpm
- Sleep: ${s?.total_in_bed_time_milli ? (s.total_in_bed_time_milli/3600000).toFixed(1) : 'N/A'} hrs (${s?.sleep_performance_percentage ?? 'N/A'}%)
- Strain: ${c?.strain ?? 'N/A'}/21
- Calories: ${c?.kilojoule ? (c.kilojoule/4.184).toFixed(0) : 'N/A'} kcal

WEEKLY: Recovery ${analytics.week.avg_recovery}%, HRV ${analytics.week.avg_hrv}ms, Sleep ${analytics.week.avg_sleep}hrs, Workouts ${analytics.week.total_workouts}
MONTHLY: Recovery ${analytics.month.avg_recovery}%, Workouts ${analytics.month.total_workouts}
Days on program: ${analytics.days_on_program}

Return ONLY a valid JSON object. No markdown, no explanation. Start with { end with }:
{
  "date": "${today}",
  "recovery_score": ${r?.recovery_score ?? null},
  "hrv": ${r?.hrv_rmssd_milli ?? null},
  "resting_hr": ${r?.resting_heart_rate ?? null},
  "sleep_hours": ${s?.total_in_bed_time_milli ? (s.total_in_bed_time_milli/3600000).toFixed(1) : null},
  "sleep_performance": ${s?.sleep_performance_percentage ?? null},
  "strain": ${c?.strain ?? null},
  "calories_burned": ${c?.kilojoule ? (c.kilojoule/4.184).toFixed(0) : null},
  "recovery_trend": ${JSON.stringify(analytics.week.trend)},
  "daily_status": "Green",
  "status_message": "motivational sentence based on WHOOP data",
  "weekly_insight": "2-3 sentences analyzing weekly trend",
  "monthly_insight": "2-3 sentences on monthly progress toward six-pack",
  "workout": {
    "recommended": true,
    "type": "e.g. Upper Body Strength",
    "duration_minutes": 45,
    "intensity": "Medium",
    "rationale": "why this workout based on recovery data",
    "warmup": "5 min warmup description",
    "cooldown": "5 min cooldown description",
    "exercises": [
      { "name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "key form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "key form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "key form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "key form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "key form tip", "youtube_search": "exercise name proper form beginner" }
    ]
  },
  "meal_plan": {
    "total_calories_target": 1800,
    "protein_g": 140,
    "carbs_g": 160,
    "fat_g": 60,
    "meals": [
      { "time": "7:00 AM",  "name": "Breakfast",   "description": "Overnight oats (50g) + 200ml milk, Activia yogurt (125g), mixed berries (100g)", "calories": 450, "protein_g": 25 },
      { "time": "10:30 AM", "name": "Snack",        "description": "specific snack with quantities", "calories": 200, "protein_g": 15 },
      { "time": "1:00 PM",  "name": "Lunch",        "description": "specific non-veg lunch with quantities", "calories": 550, "protein_g": 40 },
      { "time": "4:00 PM",  "name": "Pre-workout",  "description": "specific pre-workout snack", "calories": 200, "protein_g": 10 },
      { "time": "7:30 PM",  "name": "Dinner",       "description": "specific non-veg dinner with quantities", "calories": 500, "protein_g": 45 }
    ]
  },
  "daily_tips": [
    "specific tip based on today recovery score",
    "specific tip based on weekly sleep trend",
    "specific tip for six-pack progress"
  ],
  "progress_insight": "detailed 3-4 sentence paragraph on six-pack progress using all available data",
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const json = await res.json();
  console.log('Claude API status:', res.status);
  if (!res.ok) throw new Error(`Claude API failed: ${JSON.stringify(json)}`);

  const text = json.content?.[0]?.text;
  if (!text) throw new Error(`Empty Claude response: ${JSON.stringify(json)}`);
  console.log('Claude response length:', text.length);

  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    // 1. Load refresh token (from file or env secret on first run)
    const refreshToken = loadRefreshToken();

    // 2. Exchange for access token + new refresh token
    const { accessToken, newRefreshToken } = await refreshAccessToken(refreshToken);

    // 3. Save new refresh token to repo file (auto-committed by workflow)
    saveRefreshToken(newRefreshToken);

    // 4. Fetch WHOOP data
    const get = whoopGet(accessToken);
    const [recoveryData, sleepData, cycleData, workoutData] = await Promise.all([
      get('/recovery?limit=7'),
      get('/activity/sleep?limit=7'),
      get('/cycle?limit=7'),
      get('/activity/workout?limit=10'),
    ]);

    const whoopData = {
      recovery: recoveryData.records?.[0] || null,
      sleep:    sleepData.records?.[0]    || null,
      cycle:    cycleData.records?.[0]    || null,
      workouts: workoutData.records       || [],
    };
    console.log('✅ WHOOP data fetched');

    // 5. Update history
    const history = loadHistory();
    const today = new Date().toISOString().split('T')[0];
    const entry = {
      date:           today,
      recovery_score: whoopData.recovery?.score?.recovery_score ?? null,
      hrv:            whoopData.recovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr:     whoopData.recovery?.score?.resting_heart_rate ?? null,
      sleep_hours:    whoopData.sleep?.score?.total_in_bed_time_milli
                        ? +(whoopData.sleep.score.total_in_bed_time_milli / 3600000).toFixed(1) : null,
      strain:         whoopData.cycle?.score?.strain ?? null,
      workout_count:  whoopData.workouts.filter(w => w.start?.split('T')[0] === today).length,
    };
    const idx = history.findIndex(h => h.date === today);
    if (idx >= 0) history[idx] = entry; else history.push(entry);
    saveHistory(history);

    // 6. Compute analytics
    const analytics = computeAnalytics(history);

    // 7. Generate AI plan
    const plan = await generateAIPlan(whoopData, analytics);

    // 8. Add YouTube links
    if (plan.workout?.exercises) {
      plan.workout.exercises = plan.workout.exercises.map(ex => ({
        ...ex,
        youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtube_search || ex.name + ' exercise tutorial')}`,
      }));
    }

    // 9. Save daily plan
    const out = path.join(__dirname, '../src/data/daily-plan.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(plan, null, 2));
    console.log(`✅ Done! Recovery: ${plan.recovery_score}% | Sleep: ${plan.sleep_hours}h | Strain: ${plan.strain}`);

  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
