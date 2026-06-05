import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHOOP_CLIENT_ID     = '5481da9c-04ff-4227-be33-a72b148f2098';
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const WHOOP_REFRESH_TOKEN = process.env.WHOOP_REFRESH_TOKEN;
const ANTHROPIC_API_KEY   = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN        = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY   = process.env.GITHUB_REPOSITORY;
const WHOOP_BASE          = 'https://api.prod.whoop.com/developer/v2';

// ─── Step 1: Get access token using refresh token ────────────────────────────
// Matches exactly what works in Postman:
// POST x-www-form-urlencoded with grant_type, refresh_token, client_id, client_secret, scope
async function refreshAccessToken() {
  console.log('Getting access token...');

  const body = new URLSearchParams();
  body.append('grant_type',    'refresh_token');
  body.append('refresh_token', WHOOP_REFRESH_TOKEN);
  body.append('client_id',     WHOOP_CLIENT_ID);
  body.append('client_secret', WHOOP_CLIENT_SECRET);
  body.append('scope',         'offline');

  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  console.log('Token response status:', res.status);

  if (!res.ok) throw new Error(`Token failed ${res.status}: ${text}`);

  const data = JSON.parse(text);
  console.log('✅ Got access token');
  return { accessToken: data.access_token, newRefreshToken: data.refresh_token };
}

// ─── Step 2: Use access token as Bearer to call WHOOP API ────────────────────
function whoopGet(accessToken) {
  return async (endpoint) => {
    const res = await fetch(`${WHOOP_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`WHOOP API ${res.status}: ${await res.text()}`);
    return res.json();
  };
}

// ─── Save new refresh token to GitHub Secrets ────────────────────────────────
async function saveNewRefreshToken(newToken) {
  try {
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    const keyRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' } }
    );
    const { key, key_id } = await keyRes.json();
    const sodium = await import('libsodium-wrappers');
    await sodium.ready;
    const encrypted = sodium.to_base64(
      sodium.crypto_box_seal(sodium.from_string(newToken), sodium.from_base64(key, sodium.base64_variants.ORIGINAL)),
      sodium.base64_variants.ORIGINAL
    );
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/WHOOP_REFRESH_TOKEN`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
        body: JSON.stringify({ encrypted_value: encrypted, key_id }),
      }
    );
    console.log('✅ Saved new refresh token to GitHub Secrets');
  } catch (e) {
    console.log('⚠️ Could not save refresh token:', e.message);
  }
}

// ─── Load/save history ────────────────────────────────────────────────────────
function loadHistory() {
  const p = path.join(__dirname, '../src/data/history.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

function saveHistory(history) {
  const p = path.join(__dirname, '../src/data/history.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(history.slice(-90), null, 2));
}

// ─── Compute analytics ────────────────────────────────────────────────────────
function computeAnalytics(history) {
  const avg = (arr, key) => {
    const vals = arr.map(d => d[key]).filter(v => v != null);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };
  const last7  = history.slice(-7);
  const last30 = history.slice(-30);
  return {
    week:  { avg_recovery: avg(last7,  'recovery_score'), avg_hrv: avg(last7,  'hrv'), avg_sleep: avg(last7,  'sleep_hours'), total_workouts: last7.reduce((a,d)=>a+(d.workout_count||0),0), trend: last7.map(d=>({date:d.date,score:d.recovery_score})) },
    month: { avg_recovery: avg(last30, 'recovery_score'), avg_hrv: avg(last30, 'hrv'), avg_sleep: avg(last30, 'sleep_hours'), total_workouts: last30.reduce((a,d)=>a+(d.workout_count||0),0) },
    days_on_program: history.length,
  };
}

// ─── Generate AI plan ─────────────────────────────────────────────────────────
async function generateAIPlan(whoopData, analytics) {
  console.log('Generating AI plan...');
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const r = whoopData.recovery?.score;
  const s = whoopData.sleep?.score;
  const c = whoopData.cycle?.score;

  const prompt = `You are FitAI, a world-class personal trainer. Today is ${today}.

USER: Ash, 163cm, 70kg, goal: fat loss + six-pack, non-veg diet, beginner, breakfast: overnight oats+milk, must have Activia yogurt+fruit daily.
GYM: Tue/Thu office gym, Mon/Wed/Fri after 6pm, weekends free.

WHOOP TODAY:
- Recovery: ${r?.recovery_score ?? 'N/A'}%
- HRV: ${r?.hrv_rmssd_milli ?? 'N/A'} ms
- Resting HR: ${r?.resting_heart_rate ?? 'N/A'} bpm
- Sleep: ${s?.total_in_bed_time_milli ? (s.total_in_bed_time_milli/3600000).toFixed(1) : 'N/A'} hrs (${s?.sleep_performance_percentage ?? 'N/A'}% performance)
- Strain: ${c?.strain ?? 'N/A'}/21
- Calories burned: ${c?.kilojoule ? (c.kilojoule/4.184).toFixed(0) : 'N/A'} kcal

WEEKLY AVERAGES: Recovery ${analytics.week.avg_recovery}%, HRV ${analytics.week.avg_hrv}ms, Sleep ${analytics.week.avg_sleep}hrs, Workouts ${analytics.week.total_workouts}
MONTHLY AVERAGES: Recovery ${analytics.month.avg_recovery}%, Workouts ${analytics.month.total_workouts}
Days on program: ${analytics.days_on_program}

Return ONLY valid JSON (no markdown):
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
  "daily_status": "Green|Yellow|Red",
  "status_message": "one motivational sentence",
  "weekly_insight": "2-3 sentences on weekly trend",
  "monthly_insight": "2-3 sentences on monthly progress toward six-pack",
  "workout": {
    "recommended": true,
    "type": "e.g. Upper Body Strength",
    "duration_minutes": 45,
    "intensity": "Low|Medium|High",
    "rationale": "why this workout based on WHOOP data",
    "warmup": "warmup description",
    "cooldown": "cooldown description",
    "exercises": [
      { "name": "Exercise name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "form tip", "youtube_search": "exercise name proper form" }
    ]
  },
  "meal_plan": {
    "total_calories_target": 1800,
    "protein_g": 140,
    "carbs_g": 160,
    "fat_g": 60,
    "meals": [
      { "time": "7:00 AM",  "name": "Breakfast",       "description": "Overnight oats + milk, Activia yogurt, fruit", "calories": 450, "protein_g": 25 },
      { "time": "10:30 AM", "name": "Snack",            "description": "...", "calories": 200, "protein_g": 15 },
      { "time": "1:00 PM",  "name": "Lunch",            "description": "non-veg with rice/roti", "calories": 550, "protein_g": 40 },
      { "time": "4:00 PM",  "name": "Pre-workout",      "description": "...", "calories": 200, "protein_g": 10 },
      { "time": "7:30 PM",  "name": "Dinner",           "description": "non-veg protein + vegetables", "calories": 500, "protein_g": 45 }
    ]
  },
  "daily_tips": ["tip 1", "tip 2", "tip 3"],
  "progress_insight": "paragraph on six-pack progress",
  "week_number": ${Math.ceil(analytics.days_on_program/7)||1},
  "days_on_program": ${analytics.days_on_program}
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  });
  const json = await res.json();
  const text = json.content?.[0]?.text || '';
  return JSON.parse(text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    // 1. Get access token
    const { accessToken, newRefreshToken } = await refreshAccessToken();

    // 2. Save new refresh token
    if (newRefreshToken && GITHUB_TOKEN && GITHUB_REPOSITORY) {
      await saveNewRefreshToken(newRefreshToken);
    }

    // 3. Fetch WHOOP data using access token as Bearer
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

    // 4. Update history
    const history = loadHistory();
    const today = new Date().toISOString().split('T')[0];
    const entry = {
      date:           today,
      recovery_score: whoopData.recovery?.score?.recovery_score ?? null,
      hrv:            whoopData.recovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr:     whoopData.recovery?.score?.resting_heart_rate ?? null,
      sleep_hours:    whoopData.sleep?.score?.total_in_bed_time_milli ? +(whoopData.sleep.score.total_in_bed_time_milli/3600000).toFixed(1) : null,
      strain:         whoopData.cycle?.score?.strain ?? null,
      workout_count:  whoopData.workouts.filter(w => w.start?.split('T')[0] === today).length,
    };
    const idx = history.findIndex(h => h.date === today);
    if (idx >= 0) history[idx] = entry; else history.push(entry);
    saveHistory(history);

    // 5. Compute analytics
    const analytics = computeAnalytics(history);

    // 6. Generate AI plan
    const plan = await generateAIPlan(whoopData, analytics);

    // 7. Add YouTube links
    if (plan.workout?.exercises) {
      plan.workout.exercises = plan.workout.exercises.map(ex => ({
        ...ex,
        youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtube_search || ex.name + ' exercise tutorial')}`,
      }));
    }

    // 8. Save
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
