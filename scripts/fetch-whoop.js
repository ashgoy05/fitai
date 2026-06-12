import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHOOP_CLIENT_ID     = '5481da9c-04ff-4227-be33-a72b148f2098';
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const ANTHROPIC_API_KEY   = process.env.ANTHROPIC_API_KEY;
const WHOOP_BASE          = 'https://api.prod.whoop.com/developer/v1';
const TOKENS_PATH         = path.join(__dirname, '../src/data/tokens.json');

// ─── STEP 1: Get refresh token from tokens.json ───────────────────────────────
function getRefreshToken() {
  // Try tokens.json first
  try {
    const data = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    if (data.refresh_token) {
      console.log('✅ Loaded refresh token from tokens.json');
      return data.refresh_token;
    }
  } catch {
    console.log('tokens.json not found, using env secret');
  }
}

// ─── STEP 2: Hit token URL to get new access + refresh tokens ────────────────
async function getTokens(refreshToken) {
  console.log('Calling WHOOP token endpoint...');

  const body = new URLSearchParams();
  body.append('grant_type',    'refresh_token');
  body.append('refresh_token', refreshToken);
  body.append('client_id',     WHOOP_CLIENT_ID);
  body.append('client_secret', WHOOP_CLIENT_SECRET);
  body.append('scope',         'offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement');

  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  console.log('Token response status:', res.status);

  if (!res.ok) throw new Error(`Token failed ${res.status}: ${text}`);

  const data = JSON.parse(text);
  console.log('✅ Got new access token and refresh token');
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
  };
}

// ─── STEP 3: Save new refresh token to tokens.json ───────────────────────────
function saveRefreshToken(refreshToken) {
  fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
  fs.writeFileSync(TOKENS_PATH, JSON.stringify({
    refresh_token: refreshToken,
    updated_at: new Date().toISOString(),
  }, null, 2));
  console.log('✅ Saved new refresh token to tokens.json');
}

// ─── Use access token to fetch WHOOP data ────────────────────────────────────
async function fetchWhoopData(accessToken) {
  console.log('Fetching WHOOP data...');

  const get = async (endpoint) => {
    const res = await fetch(`${WHOOP_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`WHOOP API ${res.status}: ${await res.text()}`);
    return res.json();
  };

  const [recoveryData, sleepData, cycleData, workoutData] = await Promise.all([
    get('/recovery?limit=7'),
    get('/activity/sleep?limit=7'),
    get('/cycle?limit=7'),
    get('/activity/workout?limit=10'),
  ]);

  console.log('✅ WHOOP data fetched');
  return {
    recovery: recoveryData.records?.[0] || null,
    sleep:    sleepData.records?.[0]    || null,
    cycle:    cycleData.records?.[0]    || null,
    workouts: workoutData.records       || [],
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
      avg_recovery:   avg(last7, 'recovery_score'),
      avg_hrv:        avg(last7, 'hrv'),
      avg_sleep:      avg(last7, 'sleep_hours'),
      total_workouts: last7.reduce((a, d) => a + (d.workout_count || 0), 0),
      trend:          last7.map(d => ({ date: d.date, score: d.recovery_score })),
    },
    month: {
      avg_recovery:   avg(last30, 'recovery_score'),
      avg_hrv:        avg(last30, 'hrv'),
      avg_sleep:      avg(last30, 'sleep_hours'),
      total_workouts: last30.reduce((a, d) => a + (d.workout_count || 0), 0),
    },
    days_on_program: history.length,
  };
}

// ─── Generate AI plan ─────────────────────────────────────────────────────────
async function generateAIPlan(whoopData, analytics) {
  console.log('Generating AI plan...');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const r = whoopData.recovery?.score;
  const s = whoopData.sleep?.score;
  const c = whoopData.cycle?.score;

  const prompt = `You are FitAI, a world-class personal trainer and nutritionist. Today is ${today} (${dayOfWeek}).

═══════════════════════════════
ASH'S COMPLETE PROFILE
═══════════════════════════════
Height: 163cm | Weight: 70kg | Goal: Fat loss + six-pack + lean attractive body
Fitness level: Complete beginner | Program day: ${analytics.days_on_program}

DIET RULES (STRICT):
- Protein: Chicken ONLY and Eggs. NO beef, NO seafood, NO pork, NO lamb.
- Has Costco Chipotle pre-cooked chicken packets (easy, ready to eat)
- Chicken max ONCE per day — use eggs as second protein source
- Carbs: Rice ONLY (no roti, no bread, no chapati)
- NO blueberries (causes stomach burning)
- Safe fruits: apples, oranges, strawberries, bananas
- Nuts: almonds and walnuts at home

FIXED DAILY ANCHORS:
- Breakfast: Overnight oats + milk (ALWAYS)
- Daily must: Activia yogurt (125g) + fruit
- Post-workout: Protein powder shake

SUPPLEMENT SCHEDULE:
- Morning with breakfast: Multivitamin, Vitamin D3, Omega-3, Vitamin E, Zinc
- Pre-workout (30 min before): Pre-workout + Fiber
- Post-workout: Protein powder shake
- Before bed: Magnesium

GYM SCHEDULE:
- Tue & Thu: Office gym after work ~5:30pm
- Mon, Wed, Fri: Local gym after 6pm
- Sat & Sun: Rest or light activity

TODAY'S WHOOP DATA:
- Recovery: ${r?.recovery_score ?? 'N/A'}%
- HRV: ${r?.hrv_rmssd_milli ?? 'N/A'} ms
- Resting HR: ${r?.resting_heart_rate ?? 'N/A'} bpm
- Sleep: ${s?.total_in_bed_time_milli ? (s.total_in_bed_time_milli/3600000).toFixed(1) : 'N/A'} hrs (${s?.sleep_performance_percentage ?? 'N/A'}%)
- Strain: ${c?.strain ?? 'N/A'}/21
- Calories: ${c?.kilojoule ? (c.kilojoule/4.184).toFixed(0) : 'N/A'} kcal

WEEKLY: Recovery ${analytics.week.avg_recovery}%, HRV ${analytics.week.avg_hrv}ms, Sleep ${analytics.week.avg_sleep}hrs, Workouts ${analytics.week.total_workouts}
MONTHLY: Recovery ${analytics.month.avg_recovery}%, Workouts ${analytics.month.total_workouts}
Days on program: ${analytics.days_on_program}

Return ONLY valid JSON, no markdown, start { end }:
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
  "daily_status": "Green or Yellow or Red",
  "status_message": "personal motivational message for Ash",
  "weekly_insight": "2-3 sentences on weekly trend",
  "monthly_insight": "2-3 sentences on monthly progress",
  "workout": {
    "recommended": true,
    "type": "workout type based on day and recovery",
    "duration_minutes": 45,
    "intensity": "Low or Medium or High",
    "rationale": "why this workout based on WHOOP data",
    "warmup": "specific 5 min warmup",
    "cooldown": "specific 5 min cooldown",
    "exercises": [
      { "name": "name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "name", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "form tip", "youtube_search": "exercise proper form beginner" }
    ]
  },
  "meal_plan": {
    "total_calories_target": 1800,
    "protein_g": 140,
    "carbs_g": 160,
    "fat_g": 60,
    "meals": [
      { "time": "7:00 AM", "name": "Breakfast", "description": "Overnight oats (50g) + 200ml milk + Activia yogurt (125g) + 1 apple or orange. Take: Multivitamin, D3, Omega-3, Vitamin E, Zinc.", "calories": 480, "protein_g": 22 },
      { "time": "10:30 AM", "name": "Snack", "description": "15 almonds + 4 walnuts + 1 small fruit", "calories": 180, "protein_g": 5 },
      { "time": "1:00 PM", "name": "Lunch", "description": "Costco Chipotle chicken (150g) + steamed rice (100g) + mixed vegetables. This is your chicken meal for the day.", "calories": 520, "protein_g": 45 },
      { "time": "4:00 PM", "name": "Pre-Workout", "description": "1 banana + 2 boiled eggs. Take Pre-workout + Fiber 30 min before gym.", "calories": 220, "protein_g": 13 },
      { "time": "After Gym", "name": "Post-Workout Shake", "description": "1 scoop protein powder in water or milk. Have within 30 min of finishing workout.", "calories": 150, "protein_g": 30 },
      { "time": "7:30 PM", "name": "Dinner", "description": "3-egg omelette with spinach, onion, tomato + small rice (60g). Take Magnesium before bed.", "calories": 380, "protein_g": 25 }
    ]
  },
  "daily_tips": [
    "tip based on today recovery score",
    "nutrition tip referencing actual foods",
    "sleep or recovery tip"
  ],
  "progress_insight": "3-4 sentences honest assessment of six-pack progress",
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
  if (!res.ok) throw new Error(`Claude API failed: ${JSON.stringify(json)}`);
  const text = json.content?.[0]?.text;
  if (!text) throw new Error(`Empty Claude response`);
  console.log('✅ AI plan generated');
  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    // STEP 1: Get refresh token from tokens.json (or env secret first run)
    const refreshToken = getRefreshToken();

    // STEP 2: Hit WHOOP token endpoint to get access + new refresh token
    const { accessToken, refreshToken: newRefreshToken } = await getTokens(refreshToken);

    // STEP 3: Save new refresh token to tokens.json
    saveRefreshToken(newRefreshToken);

    // STEP 4: Use access token to fetch WHOOP data
    const whoopData = await fetchWhoopData(accessToken);

    // STEP 5: Update history
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

    // STEP 6: Generate AI plan
    const analytics = computeAnalytics(history);
    const plan = await generateAIPlan(whoopData, analytics);

    // STEP 7: Add YouTube links
    if (plan.workout?.exercises) {
      plan.workout.exercises = plan.workout.exercises.map(ex => ({
        ...ex,
        youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtube_search || ex.name + ' exercise tutorial beginner')}`,
      }));
    }

    // STEP 8: Save daily plan
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
