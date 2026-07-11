import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHOOP_CLIENT_ID = '5481da9c-04ff-4227-be33-a72b148f2098';
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const WHOOP_REFRESH_TOKEN = process.env.WHOOP_REFRESH_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v2';
const DATA_DIR = path.join(__dirname, '../src/data');
const TOKENS_PATH = path.join(DATA_DIR, 'tokens.json');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');
const DAILY_PLAN_PATH = path.join(DATA_DIR, 'daily-plan.json');

// -----------------------------------------------------
// ENV VALIDATION
// -----------------------------------------------------
function validateEnv() {
    if (!WHOOP_CLIENT_SECRET) throw new Error("Missing WHOOP_CLIENT_SECRET");
    if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
}

// -----------------------------------------------------
// LOAD REFRESH TOKEN
// -----------------------------------------------------
function getRefreshToken() {
    try {
        const data = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
        if (data.refresh_token) {
            console.log("✅ Refresh token loaded from file");
            return data.refresh_token;
        }
    } catch {
        console.log("tokens.json missing, using ENV token");
    }
    if (!WHOOP_REFRESH_TOKEN) throw new Error("No WHOOP refresh token available");
    return WHOOP_REFRESH_TOKEN;
}

// -----------------------------------------------------
// REFRESH WHOOP TOKEN
// -----------------------------------------------------
async function getTokens(refreshToken) {
    console.log("Refreshing WHOOP access token...");
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken);
    body.append('client_id', WHOOP_CLIENT_ID);
    body.append('client_secret', WHOOP_CLIENT_SECRET);
    const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`WHOOP token failed ${res.status}: ${text}`);
    const json = JSON.parse(text);
    console.log("✅ WHOOP token refreshed");
    return { accessToken: json.access_token, refreshToken: json.refresh_token };
}

// -----------------------------------------------------
// SAVE REFRESH TOKEN
// -----------------------------------------------------
function saveRefreshToken(token) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TOKENS_PATH, JSON.stringify({
        refresh_token: token,
        updated_at: new Date().toISOString()
    }, null, 2));
    console.log("✅ Refresh token saved");
}

// -----------------------------------------------------
// FETCH WHOOP DATA
// -----------------------------------------------------
async function fetchWhoopData(accessToken) {
    const call = async (endpoint) => {
        const res = await fetch(`${WHOOP_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    };
    const [recovery, sleep, cycle, workouts] = await Promise.all([
        call('/recovery?limit=7'),
        call('/activity/sleep?limit=7'),
        call('/cycle?limit=7'),
        call('/activity/workout?limit=10')
    ]);
    return {
        recovery: recovery.records?.[0] ?? null,
        sleep: sleep.records?.[0] ?? null,
        cycle: cycle.records?.[0] ?? null,
        workouts: workouts.records ?? []
    };
}

// -----------------------------------------------------
// HISTORY
// -----------------------------------------------------
function loadHistory() {
    try { return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); }
    catch { return []; }
}

function saveHistory(history) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history.slice(-90), null, 2));
}

// -----------------------------------------------------
// ANALYTICS
// -----------------------------------------------------
function computeAnalytics(history) {
    const avg = (arr, key) => {
        const values = arr.map(x => x[key]).filter(Boolean);
        if (values.length === 0) return null;
        return +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    };
    const week = history.slice(-7);
    const month = history.slice(-30);
    return {
        week: {
            avg_recovery: avg(week, 'recovery_score'),
            avg_hrv: avg(week, 'hrv'),
            avg_sleep: avg(week, 'sleep_hours'),
            total_workouts: week.reduce((a, b) => a + (b.workout_count || 0), 0),
            trend: week.map(x => ({ date: x.date, score: x.recovery_score }))
        },
        month: {
            avg_recovery: avg(month, 'recovery_score'),
            total_workouts: month.reduce((a, b) => a + (b.workout_count || 0), 0)
        },
        days_on_program: history.length
    };
}

// -----------------------------------------------------
// BUILD HISTORY ENTRY
// -----------------------------------------------------
function buildHistoryEntry(whoopData, today) {
    const r = whoopData.recovery?.score;
    const s = whoopData.sleep?.score;
    const c = whoopData.cycle?.score;
    return {
        date: today,
        recovery_score: r?.recovery_score ?? null,
        hrv: r?.hrv_rmssd_milli ?? null,
        resting_hr: r?.resting_heart_rate ?? null,
        sleep_hours: s?.total_in_bed_time_milli
            ? +(s.total_in_bed_time_milli / 3600000).toFixed(1) : null,
        sleep_performance: s?.sleep_performance_percentage ?? null,
        strain: c?.strain ?? null,
        calories: c?.kilojoule ? +(c.kilojoule / 4.184).toFixed(0) : null,
        workout_count: whoopData.workouts.filter(
            w => w.start?.split('T')[0] === today
        ).length,
    };
}

// -----------------------------------------------------
// MEAL & SUPPLEMENT PLAN BY DAY
// -----------------------------------------------------
function getDayPlan(dayOfWeek) {
    const plans = {
        Monday: {
            isOffice: false, isGym: true, gymTime: '6:00 PM',
            breakfast: { name: 'Chickpea Salad Bowl', description: '150g boiled chickpeas + 80g cucumber + 80g tomato + 30g red onion + 125g Activia yogurt as dressing + 15ml lemon juice + chaat masala. Mix 1 scoop Collagen Peptides into yogurt dressing. Take: Multivitamin, Vitamin D3, Omega-3 with this meal.', calories: 450, protein: 38 },
            snack: { name: 'Almonds + Walnuts', description: '15 almonds + 4 walnuts. Take Vitamin E + Zinc with lunch today.', calories: 180, protein: 5 },
            lunch: { name: 'Rajma Rice', description: '200g cooked rajma in onion-tomato masala + 150g cooked white rice + side salad. Take Vitamin E (400 IU) + Zinc (15mg) with this meal.', calories: 520, protein: 22 },
            preGym: { name: 'Green Tea + Banana', description: '1 cup green tea (no sugar) + 1 medium banana. Take Pre-workout + Fiber supplement 30 min before gym at 5:30 PM.', calories: 80, protein: 1 },
            postGym: { name: 'Protein Shake', description: '1 scoop protein powder in 300ml milk or water. Drink within 30 min of finishing gym.', calories: 150, protein: 28 },
            dinner: { name: 'Chicken Pasta', description: '80g pasta + 120g chicken breast (pan fried with Indian spices) + 80g Target marinara sauce + 80g spinach + 60g bell pepper + 40g onion + 8g garlic + 5ml olive oil.', calories: 480, protein: 42 },
            bedtime: 'Take Magnesium (300-400mg) 30 min before bed.'
        },
        Tuesday: {
            isOffice: true, isGym: true, gymTime: '5:30 PM',
            breakfast: { name: 'Overnight Oats', description: '50g rolled oats + 200ml low fat milk + 125g Activia yogurt + 1 apple or orange + 15 almonds. Mix 1 scoop Collagen Peptides into oats the night before. Take: Multivitamin, Vitamin D3, Omega-3 with this meal.', calories: 520, protein: 40 },
            snack: { name: 'Black Coffee + Fruit', description: '1 cup black coffee (no sugar, no milk) + 1 apple or orange. Take Vitamin E + Zinc with lunch.', calories: 80, protein: 1 },
            lunch: { name: 'Chipotle Chicken Rice Bowl', description: '150g Costco Chipotle chicken + 150g cooked white rice + 100g spinach sautéed + 80g bell pepper + 50g onion + 5ml olive oil + curd on side. Pack from home. Take Vitamin E (400 IU) + Zinc (15mg) with this meal.', calories: 530, protein: 45 },
            preGym: { name: 'Mint Tea + Banana', description: '1 cup mint tea + 1 banana. Take Pre-workout + Fiber 30 min before gym at 5:00 PM.', calories: 80, protein: 1 },
            postGym: { name: 'Protein Shake', description: '1 scoop protein powder in 300ml milk or water. Drink within 30 min of finishing gym.', calories: 150, protein: 28 },
            dinner: { name: 'Chicken Pasta', description: '80g pasta + 120g chicken breast + 80g Target marinara sauce + 80g spinach + 60g bell pepper + 40g onion + 8g garlic + 5ml olive oil. Cook double on Monday — reheat tonight.', calories: 480, protein: 42 },
            bedtime: 'Take Magnesium (300-400mg) 30 min before bed.'
        },
        Wednesday: {
            isOffice: true, isGym: true, gymTime: '5:30 PM',
            breakfast: { name: 'Overnight Oats', description: '50g rolled oats + 200ml low fat milk + 125g Activia yogurt + 1 banana + 4 walnuts. Mix 1 scoop Collagen Peptides into oats the night before. Take: Multivitamin, Vitamin D3, Omega-3 with this meal.', calories: 520, protein: 40 },
            snack: { name: 'Black Coffee + Fruit', description: '1 cup black coffee (no sugar, no milk) + 1 orange or apple. Take Vitamin E + Zinc with lunch.', calories: 80, protein: 1 },
            lunch: { name: 'Chipotle Chicken Rice Bowl', description: '150g Costco Chipotle chicken + 150g cooked white rice + 100g spinach + 80g bell pepper + 5ml olive oil. Pack from home. Take Vitamin E (400 IU) + Zinc (15mg) with this meal.', calories: 530, protein: 45 },
            preGym: { name: 'Green Tea + Banana', description: '1 cup green tea + 1 banana. Take Pre-workout + Fiber 30 min before gym at 5:00 PM.', calories: 80, protein: 1 },
            postGym: { name: 'Protein Shake', description: '1 scoop protein powder in 300ml milk or water. Drink within 30 min of finishing gym.', calories: 150, protein: 28 },
            dinner: { name: 'Veggie Omelette', description: '3 eggs beaten + 60g bell pepper + 80g spinach + 40g onion + 40g tomato + 5ml olive oil. Cook on medium-low, fold in half. Light and quick post-gym dinner.', calories: 340, protein: 24 },
            bedtime: 'Take Magnesium (300-400mg) 30 min before bed.'
        },
        Thursday: {
            isOffice: true, isGym: true, gymTime: '5:30 PM',
            breakfast: { name: 'Overnight Oats', description: '50g rolled oats + 200ml low fat milk + 125g Activia yogurt + 1 apple + 15 almonds. Mix 1 scoop Collagen Peptides into oats. Take: Multivitamin, Vitamin D3, Omega-3 with this meal.', calories: 520, protein: 40 },
            snack: { name: 'Black Coffee + Fruit', description: '1 cup black coffee (no sugar) + 1 banana. Take Vitamin E + Zinc with lunch.', calories: 80, protein: 1 },
            lunch: { name: 'Dal Tadka + Rice', description: '80g dry moong/masoor dal (pressure cooked) + 150g cooked white rice + onion-tomato-garlic tadka + 80g spinach + 5ml olive oil. Pack from home. Take Vitamin E (400 IU) + Zinc (15mg) with this meal.', calories: 490, protein: 22 },
            preGym: { name: 'Mint Tea + Banana', description: '1 cup mint tea + 1 banana. Take Pre-workout + Fiber 30 min before gym at 5:00 PM.', calories: 80, protein: 1 },
            postGym: { name: 'Protein Shake', description: '1 scoop protein powder in 300ml milk or water. Drink within 30 min of finishing gym.', calories: 150, protein: 28 },
            dinner: { name: 'Veggie Omelette', description: '3 eggs beaten + 60g bell pepper + 80g spinach + 40g onion + 40g tomato + 1 green chilli + 5ml olive oil. Serve with 60g cooked rice on side.', calories: 380, protein: 26 },
            bedtime: 'Take Magnesium (300-400mg) 30 min before bed.'
        },
        Friday: {
            isOffice: false, isGym: true, gymTime: '6:00 PM',
            breakfast: { name: 'Chickpea Salad Bowl', description: '150g boiled chickpeas + 80g cucumber + 80g tomato + 30g red onion + 125g Activia yogurt as dressing + 15ml lemon juice + chaat masala + 4 walnuts. Mix 1 scoop Collagen Peptides into yogurt. Take: Multivitamin, Vitamin D3, Omega-3 with this meal.', calories: 450, protein: 38 },
            snack: { name: 'Almonds + Walnuts', description: '15 almonds + 4 walnuts. Take Vitamin E + Zinc with lunch.', calories: 180, protein: 5 },
            lunch: { name: 'Paneer Bhurji + Rice', description: '150g paneer crumbled + 150g cooked white rice + 80g bell pepper + 60g onion + 80g tomato + 60g spinach + Indian spices + 8ml olive oil. Take Vitamin E (400 IU) + Zinc (15mg) with this meal.', calories: 545, protein: 32 },
            preGym: { name: 'Green Tea + Banana', description: '1 cup green tea + 1 banana. Take Pre-workout + Fiber at 5:30 PM, 30 min before gym.', calories: 80, protein: 1 },
            postGym: { name: 'Protein Shake', description: '1 scoop protein powder in 300ml milk or water. Drink within 30 min of finishing gym.', calories: 150, protein: 28 },
            dinner: { name: 'Chicken Tikka + Salad', description: '150g chicken breast marinated in 60g curd + lemon juice + garlic-ginger paste + turmeric + chilli powder + garam masala. Pan fry or bake at 200°C for 18-20 min. Serve with cucumber + tomato + onion salad.', calories: 320, protein: 42 },
            bedtime: 'Take Magnesium (300-400mg) 30 min before bed. Marinate chicken for Saturday if needed.'
        },
        Saturday: {
            isOffice: false, isGym: false, gymTime: null,
            breakfast: { name: 'Sprout Masala Bowl', description: '150g mixed sprouts + 80g tomato + 80g cucumber + 30g red onion + 125g Activia yogurt on side + 15ml lemon juice + chaat masala + cumin powder. Mix 1 scoop Collagen Peptides into yogurt. Take: Multivitamin, Vitamin D3, Omega-3 with this meal.', calories: 390, protein: 36 },
            snack: { name: 'Almonds + Walnuts', description: '15 almonds + 4 walnuts. Take Vitamin E + Zinc with lunch.', calories: 180, protein: 5 },
            lunch: { name: 'Chicken Breast + Veg Rice', description: '150g chicken breast seasoned with Indian spices + pan fried in 8ml olive oil 6-7 min each side + 150g cooked white rice + 100g spinach + 80g bell pepper stir fried. Take Vitamin E (400 IU) + Zinc (15mg) with this meal.', calories: 520, protein: 48 },
            preGym: { name: 'Protein Shake (rest day)', description: '1 scoop protein powder in 300ml water or milk. Take after lunch around 2:00 PM on rest day instead of post-gym.', calories: 150, protein: 28 },
            postGym: null,
            dinner: { name: 'Curd Rice', description: '100g cooked white rice + 150g curd + 30ml milk + 30g finely chopped onion + 1 green chilli + 10g coriander + mustard seeds tadka in 3ml olive oil + salt. Light and easy Saturday dinner.', calories: 320, protein: 12 },
            bedtime: 'Take Magnesium (300-400mg) 30 min before bed.'
        },
        Sunday: {
            isOffice: false, isGym: false, gymTime: null,
            breakfast: { name: 'Sprout Masala Bowl', description: '150g mixed sprouts + 80g tomato + 80g cucumber + 30g red onion + 125g Activia yogurt on side + 15ml lemon juice + chaat masala. Mix 1 scoop Collagen Peptides into yogurt. Take: Multivitamin, Vitamin D3, Omega-3 with this meal.', calories: 390, protein: 36 },
            snack: { name: 'Almonds + Walnuts', description: '15 almonds + 4 walnuts. Take Vitamin E + Zinc with lunch.', calories: 180, protein: 5 },
            lunch: { name: 'Chole + Rice', description: '200g boiled chickpeas in onion-tomato-chole masala + 150g cooked white rice + 100g curd on side. Use batch-cooked chickpeas from Wednesday. Take Vitamin E (400 IU) + Zinc (15mg) with this meal.', calories: 530, protein: 22 },
            preGym: { name: 'Protein Shake (rest day)', description: '1 scoop protein powder in 300ml water or milk. Take after lunch around 2:00 PM on rest day.', calories: 150, protein: 28 },
            postGym: null,
            dinner: { name: 'Caesar Salad', description: '150g romaine lettuce/spinach + 2 boiled eggs halved + 80g cucumber + 60g cherry tomatoes + 60g paneer cubed and pan fried + 15g parmesan. Dressing: 60g curd + 15ml lemon juice + 5g garlic + 5ml olive oil + 3g mustard + black pepper.', calories: 380, protein: 28 },
            bedtime: 'Take Magnesium (300-400mg) 30 min before bed.'
        }
    };
    return plans[dayOfWeek] || plans['Monday'];
}

// -----------------------------------------------------
// GENERATE AI PLAN
// -----------------------------------------------------
async function generateAIPlan(whoopData, analytics, dayPlan, dayOfWeek) {
    console.log("Generating AI plan...");

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const r = whoopData.recovery?.score;
    const s = whoopData.sleep?.score;
    const c = whoopData.cycle?.score;

    const recoveryScore = r?.recovery_score ?? null;
    const hrv = r?.hrv_rmssd_milli ?? null;
    const restingHR = r?.resting_heart_rate ?? null;
    const sleepHours = s?.total_in_bed_time_milli
        ? +(s.total_in_bed_time_milli / 3600000).toFixed(1) : null;
    const sleepPerf = s?.sleep_performance_percentage ?? null;
    const strain = c?.strain ?? null;
    const caloriesBurned = c?.kilojoule ? +(c.kilojoule / 4.184).toFixed(0) : null;

    const meals = [
        { time: "7:00 AM", name: dayPlan.breakfast.name, description: dayPlan.breakfast.description, calories: dayPlan.breakfast.calories, protein_g: dayPlan.breakfast.protein },
        { time: "10:30 AM", name: dayPlan.snack.name, description: dayPlan.snack.description, calories: dayPlan.snack.calories, protein_g: dayPlan.snack.protein },
        { time: "1:00 PM", name: dayPlan.lunch.name, description: dayPlan.lunch.description, calories: dayPlan.lunch.calories, protein_g: dayPlan.lunch.protein },
        { time: "4:00 PM", name: dayPlan.preGym.name, description: dayPlan.preGym.description, calories: dayPlan.preGym.calories, protein_g: dayPlan.preGym.protein },
    ];

    if (dayPlan.postGym) {
        meals.push({ time: "After Gym", name: dayPlan.postGym.name, description: dayPlan.postGym.description, calories: dayPlan.postGym.calories, protein_g: dayPlan.postGym.protein });
    } else {
        meals.push({ time: "2:00 PM", name: dayPlan.preGym.name, description: dayPlan.preGym.description, calories: dayPlan.preGym.calories, protein_g: dayPlan.preGym.protein });
    }

    meals.push({ time: "7:30 PM", name: dayPlan.dinner.name, description: dayPlan.dinner.description, calories: dayPlan.dinner.calories, protein_g: dayPlan.dinner.protein });

    const totalCalories = meals.reduce((a, m) => a + m.calories, 0);
    const totalProtein = meals.reduce((a, m) => a + m.protein_g, 0);

    const prompt = `You are FitAI, Ash's personal Indian fitness coach. Today is ${today}.

═══ ASH'S PROFILE ═══
Height: 163cm | Weight: 70kg | Goal: Fat loss + six-pack + lean attractive body
Fitness level: Complete beginner | Day ${analytics.days_on_program} on program
Background: Indian living in USA

TODAY: ${dayOfWeek} | Office: ${dayPlan.isOffice ? 'Yes' : 'No'} | Gym: ${dayPlan.isGym ? `Yes at ${dayPlan.gymTime}` : 'Rest day'}

TODAY'S WHOOP DATA:
- Recovery: ${recoveryScore ?? 'N/A'}%
- HRV: ${hrv ?? 'N/A'} ms
- Resting HR: ${restingHR ?? 'N/A'} bpm
- Sleep: ${sleepHours ?? 'N/A'} hrs (${sleepPerf ?? 'N/A'}% performance)
- Strain: ${strain ?? 'N/A'}/21
- Calories burned: ${caloriesBurned ?? 'N/A'} kcal

7-DAY AVERAGES: Recovery ${analytics.week.avg_recovery}% | HRV ${analytics.week.avg_hrv}ms | Sleep ${analytics.week.avg_sleep}hrs | Workouts ${analytics.week.total_workouts}
30-DAY: Recovery ${analytics.month.avg_recovery}% | Workouts ${analytics.month.total_workouts}
Days on program: ${analytics.days_on_program}

TODAY'S MEAL PLAN (FIXED — DO NOT CHANGE):
${JSON.stringify(meals, null, 2)}

Total: ${totalCalories} kcal | ${totalProtein}g protein

WORKOUT RULES:
${dayPlan.isGym ? `
- Today IS a gym day at ${dayPlan.gymTime}
- Recovery >= 67% (Green): Full workout, high intensity, progressive overload
- Recovery 34-66% (Yellow): Moderate workout, medium intensity
- Recovery < 34% (Red): Light workout or rest — do not push hard
- Always 5 beginner-friendly exercises with clear form tips
- Vary muscle groups based on day of week
` : `
- Today is a REST DAY — no gym
- Suggest light activity: 20-30 min walk, stretching, or yoga
- Focus on recovery and sleep tonight
`}

Your job: Generate the daily_status, status_message, weekly_insight, monthly_insight, workout plan, daily_tips, and progress_insight based on WHOOP data. The meal plan is already fixed above — just include it as-is in your response.

Return ONLY valid JSON, no markdown, start { end }:
{
  "date": "${today}",
  "recovery_score": ${recoveryScore},
  "hrv": ${hrv},
  "resting_hr": ${restingHR},
  "sleep_hours": ${sleepHours},
  "sleep_performance": ${sleepPerf},
  "strain": ${strain},
  "calories_burned": ${caloriesBurned},
  "recovery_trend": ${JSON.stringify(analytics.week.trend)},
  "daily_status": "Green or Yellow or Red based on recovery score",
  "status_message": "personal motivational message for Ash based on today WHOOP data and day of week",
  "weekly_insight": "2-3 sentences analyzing this week recovery HRV and sleep trend",
  "monthly_insight": "2-3 sentences on monthly progress toward six-pack goal",
  "workout": {
    "recommended": ${dayPlan.isGym},
    "type": "${dayPlan.isGym ? 'specific workout based on recovery and day' : 'Rest Day — Light Walk or Stretching'}",
    "duration_minutes": ${dayPlan.isGym ? 45 : 20},
    "intensity": "${dayPlan.isGym ? 'Low or Medium or High based on recovery' : 'Very Low'}",
    "rationale": "specific reason based on WHOOP recovery score and ${dayOfWeek} schedule",
    "warmup": "${dayPlan.isGym ? 'specific 5 min warmup' : 'gentle 5 min stretch'}",
    "cooldown": "${dayPlan.isGym ? 'specific 5 min cooldown' : 'foam roll or relax'}",
    "exercises": [
      { "name": "Exercise 1", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "beginner form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "Exercise 2", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "beginner form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "Exercise 3", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "beginner form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "Exercise 4", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "beginner form tip", "youtube_search": "exercise proper form beginner" },
      { "name": "Exercise 5", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "beginner form tip", "youtube_search": "exercise proper form beginner" }
    ]
  },
  "meal_plan": {
    "total_calories_target": ${totalCalories},
    "protein_g": ${totalProtein},
    "carbs_g": 160,
    "fat_g": 55,
    "meals": ${JSON.stringify(meals)}
  },
  "daily_tips": [
    "specific tip based on today recovery score and what it means for training",
    "specific nutrition or supplement tip for today",
    "specific sleep or recovery tip based on last night WHOOP data"
  ],
  "progress_insight": "3-4 sentences honest assessment of Ash six-pack progress using all available WHOOP data. Be specific and motivating.",
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
    if (!text) throw new Error('Empty Claude response');
    console.log('✅ AI plan generated');
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

// -----------------------------------------------------
// ADD YOUTUBE LINKS
// -----------------------------------------------------
function addYouTubeLinks(plan) {
    if (!plan.workout?.exercises) return plan;
    plan.workout.exercises = plan.workout.exercises.map(ex => ({
        ...ex,
        youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtube_search || ex.name + ' exercise tutorial beginner')}`,
    }));
    return plan;
}

// -----------------------------------------------------
// MAIN
// -----------------------------------------------------
async function main() {
    try {
        validateEnv();

        const refreshToken = getRefreshToken();
        const { accessToken, refreshToken: newRefreshToken } = await getTokens(refreshToken);
        saveRefreshToken(newRefreshToken);

        console.log("Fetching WHOOP data...");
        const whoopData = await fetchWhoopData(accessToken);
        console.log("✅ WHOOP data fetched");

        const history = loadHistory();
        const today = new Date().toISOString().split('T')[0];
        const entry = buildHistoryEntry(whoopData, today);
        const idx = history.findIndex(h => h.date === today);
        if (idx >= 0) history[idx] = entry;
        else history.push(entry);
        saveHistory(history);

        const analytics = computeAnalytics(history);
        const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const dayPlan = getDayPlan(dayOfWeek);

        let plan = await generateAIPlan(whoopData, analytics, dayPlan, dayOfWeek);
        plan = addYouTubeLinks(plan);

        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DAILY_PLAN_PATH, JSON.stringify(plan, null, 2));
        console.log(`✅ Done! Recovery: ${plan.recovery_score}% | Sleep: ${plan.sleep_hours}h | ${dayOfWeek} plan generated`);

    } catch (err) {
        console.error('❌', err.message);
        process.exit(1);
    }
}

main();
