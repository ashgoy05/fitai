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

    if (!WHOOP_CLIENT_SECRET)
        throw new Error("Missing WHOOP_CLIENT_SECRET");

    if (!ANTHROPIC_API_KEY)
        throw new Error("Missing ANTHROPIC_API_KEY");
}


// -----------------------------------------------------
// LOAD REFRESH TOKEN
// -----------------------------------------------------
function getRefreshToken() {

    try {

        const data = JSON.parse(
            fs.readFileSync(TOKENS_PATH, 'utf8')
        );

        if(data.refresh_token){

            console.log(
                "✅ Refresh token loaded from file"
            );

            return data.refresh_token;
        }

    } catch {

        console.log(
          "tokens.json missing, using ENV token"
        );
    }


    if(!WHOOP_REFRESH_TOKEN)
        throw new Error(
          "No WHOOP refresh token available"
        );


    return WHOOP_REFRESH_TOKEN;
}


// -----------------------------------------------------
// REFRESH WHOOP TOKEN
// -----------------------------------------------------
async function getTokens(refreshToken){

    console.log(
      "Refreshing WHOOP access token..."
    );


    const body = new URLSearchParams();

    body.append(
        'grant_type',
        'refresh_token'
    );

    body.append(
        'refresh_token',
        refreshToken
    );

    body.append(
        'client_id',
        WHOOP_CLIENT_ID
    );

    body.append(
        'client_secret',
        WHOOP_CLIENT_SECRET
    );


    const res = await fetch(

      'https://api.prod.whoop.com/oauth/oauth2/token',

      {
        method:'POST',

        headers:{
          'Content-Type':
          'application/x-www-form-urlencoded'
        },

        body
      }
    );


    const text = await res.text();


    if(!res.ok){

        throw new Error(
          `WHOOP token failed ${res.status}: ${text}`
        );
    }


    const json = JSON.parse(text);


    console.log(
      "✅ WHOOP token refreshed"
    );


    return {

        accessToken:
          json.access_token,

        refreshToken:
          json.refresh_token
    };

}


// -----------------------------------------------------
// SAVE REFRESH TOKEN
// -----------------------------------------------------
function saveRefreshToken(token){


    fs.mkdirSync(
        DATA_DIR,
        {recursive:true}
    );


    fs.writeFileSync(

        TOKENS_PATH,

        JSON.stringify({

            refresh_token:token,

            updated_at:
            new Date().toISOString()

        },null,2)
    );


    console.log(
      "✅ Refresh token saved"
    );
}


// -----------------------------------------------------
// FETCH WHOOP DATA
// -----------------------------------------------------
async function fetchWhoopData(accessToken){


    const call = async(endpoint)=>{


        const res = await fetch(

            `${WHOOP_BASE}${endpoint}`,

            {
              headers:{
                Authorization:
                `Bearer ${accessToken}`
              }
            }
        );


        if(!res.ok){

            throw new Error(
              await res.text()
            );
        }


        return res.json();

    };



    const [
        recovery,
        sleep,
        cycle,
        workouts

    ] = await Promise.all([

        call('/recovery?limit=7'),

        call('/activity/sleep?limit=7'),

        call('/cycle?limit=7'),

        call('/activity/workout?limit=10')
    ]);



    return {

        recovery:
        recovery.records?.[0] ?? null,


        sleep:
        sleep.records?.[0] ?? null,


        cycle:
        cycle.records?.[0] ?? null,


        workouts:
        workouts.records ?? []

    };

}

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
// HISTORY
// -----------------------------------------------------
function loadHistory(){

    try{

        return JSON.parse(
            fs.readFileSync(
              HISTORY_PATH,
              'utf8'
            )
        );

    }catch{

        return [];
    }

}



function saveHistory(history){


    fs.mkdirSync(
      DATA_DIR,
      {recursive:true}
    );


    fs.writeFileSync(

        HISTORY_PATH,

        JSON.stringify(
            history.slice(-90),
            null,
            2
        )
    );

}



// -----------------------------------------------------
// ANALYTICS
// -----------------------------------------------------
function computeAnalytics(history){


    const avg=(arr,key)=>{


        const values =
        arr.map(x=>x[key])
        .filter(Boolean);


        if(values.length===0)
            return null;


        return +(
            values.reduce(
                (a,b)=>a+b,0
            )
            /values.length

        ).toFixed(1);
    };



    const week =
      history.slice(-7);


    const month =
      history.slice(-30);



    return {


        week:{

            avg_recovery:
            avg(week,'recovery_score'),

            avg_hrv:
            avg(week,'hrv'),

            avg_sleep:
            avg(week,'sleep_hours'),

            total_workouts:
            week.reduce(
              (a,b)=>
              a+(b.workout_count||0),
              0
            ),

            trend:
            week.map(x=>({
              date:x.date,
              score:x.recovery_score
            }))

        },


        month:{


            avg_recovery:
            avg(month,'recovery_score'),


            total_workouts:
            month.reduce(
              (a,b)=>
              a+(b.workout_count||0),
              0
            )
        },


        days_on_program:
        history.length

    };

}
// -----------------------------------------------------
// GENERATE AI PLAN
// -----------------------------------------------------
async function generateAIPlan(whoopData, analytics) {
    console.log("Generating AI plan...");

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

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
    const calories = c?.kilojoule ? +(c.kilojoule / 4.184).toFixed(0) : null;

    const prompt = `You are FitAI, Ash's personal Indian fitness coach and nutritionist. Today is ${today} (${dayOfWeek}).

═══ ASH'S PROFILE ═══
Height: 163cm | Weight: 70kg | Goal: Fat loss + visible six-pack + lean attractive body
Fitness level: Complete beginner | Day ${analytics.days_on_program} on program
Background: Indian living in USA — prefers Indian home-style cooking

⚠️ CRITICAL DIET RULES — FOLLOW STRICTLY ⚠️

NON-VEGETARIAN ALLOWED:
✅ Chicken (max ONCE per day — Costco Chipotle pre-cooked packets available)
✅ Eggs (can be used multiple times)

STRICTLY FORBIDDEN NON-VEG:
❌ Beef ❌ Pork ❌ Fish ❌ Seafood ❌ Shrimp ❌ Lamb ❌ Turkey

VEGETARIAN PROTEINS (all allowed, use variety daily):
✅ Dal (moong, masoor, toor, chana dal)
✅ Rajma ✅ Chole ✅ Paneer ✅ Tofu
✅ Greek yogurt / curd / dahi
✅ Sprouts (moong sprouts, mixed sprouts)
✅ Lentils ✅ Beans ✅ Soya chunks
✅ Besan (gram flour) dishes

CARBS — PREFERRED:
✅ Rice (white or brown)
✅ Poha ✅ Upma ✅ Idli ✅ Dosa ✅ Oats
✅ Bread (occasional, not every meal)
❌ Junk food ❌ Fried snacks ❌ Sugary foods
Do NOT force rice every single meal — use Indian variety.

FRUITS ALLOWED:
✅ Apple ✅ Orange ✅ Strawberry ✅ Banana ✅ Kiwi ✅ Papaya ✅ Mango (seasonal)
❌ Blueberries (causes stomach burning — NEVER suggest)

NUTS AVAILABLE: Almonds, Walnuts

FIXED DAILY ANCHORS (NON-NEGOTIABLE):
- Breakfast: ALWAYS overnight oats + milk as base + add fruits/nuts
- Daily: Activia yogurt (125g) must appear somewhere in the day
- Post-workout: Protein powder shake (1 scoop) ALWAYS on workout days
- Chicken appears MAX once per day

SUPPLEMENT SCHEDULE (include in meal descriptions):
- Morning with breakfast: Multivitamin, Vitamin D3, Omega-3, Vitamin E, Zinc
- 30 min before gym: Pre-workout + Fiber
- Within 30 min after gym: Protein powder shake
- 30 min before bed: Magnesium

GYM SCHEDULE:
- Tuesday & Thursday: Office gym ~5:30pm
- Monday, Wednesday, Friday: Local gym after 6pm
- Saturday & Sunday: Rest or light walk

TODAY'S WHOOP DATA:
- Recovery: ${recoveryScore ?? 'N/A'}%
- HRV: ${hrv ?? 'N/A'} ms
- Resting HR: ${restingHR ?? 'N/A'} bpm
- Sleep: ${sleepHours ?? 'N/A'} hrs (${sleepPerf ?? 'N/A'}% performance)
- Strain: ${strain ?? 'N/A'}/21
- Calories burned: ${calories ?? 'N/A'} kcal

7-DAY AVERAGES: Recovery ${analytics.week.avg_recovery}% | HRV ${analytics.week.avg_hrv}ms | Sleep ${analytics.week.avg_sleep}hrs | Workouts ${analytics.week.total_workouts}
30-DAY: Recovery ${analytics.month.avg_recovery}% | Workouts ${analytics.month.total_workouts}

MEAL GENERATION RULES:
1. Breakfast: Overnight oats + milk + fruit + optional nuts. Include morning supplements.
2. Mid-morning: Light snack — nuts, fruit, or curd
3. Lunch: Rotate daily between — chicken rice bowl / dal rice / rajma rice / chole rice / paneer rice / egg curry rice / tofu bowl / idli sambar / poha
4. Pre-workout: Light energy snack + pre-workout supplement
5. Post-workout: Protein powder shake (workout days) OR high protein snack (rest days)
6. Dinner: Rotate daily between — egg bhurji / paneer bhurji / dal tadka / moong dal / sprouts bowl / chole / rajma / vegetable + protein bowl. Include Magnesium reminder.
7. DO NOT repeat same meal on consecutive days
8. Make meals realistic for someone cooking in USA with Indian pantry staples

WORKOUT RULES:
- Recovery >= 67% (Green): Full workout, high intensity, progressive overload
- Recovery 34-66% (Yellow): Moderate workout, medium intensity
- Recovery < 34% (Red): Rest day or 20 min light walk only
- Today is ${dayOfWeek} — recommend workout based on gym schedule
- Always 5 beginner-friendly exercises with clear form tips

TARGET: 1700-1900 kcal/day | Protein 120-140g | Fat loss while building muscle

Return ONLY valid JSON, no markdown, start { end }:
{
  "date": "${today}",
  "recovery_score": ${recoveryScore},
  "hrv": ${hrv},
  "resting_hr": ${restingHR},
  "sleep_hours": ${sleepHours},
  "sleep_performance": ${sleepPerf},
  "strain": ${strain},
  "calories_burned": ${calories},
  "recovery_trend": ${JSON.stringify(analytics.week.trend)},
  "daily_status": "Green or Yellow or Red",
  "status_message": "personal motivational message for Ash based on today's WHOOP data",
  "weekly_insight": "2-3 sentences analyzing this week's recovery, HRV and sleep trend",
  "monthly_insight": "2-3 sentences on monthly progress toward six-pack goal",
  "workout": {
    "recommended": true,
    "type": "specific workout name based on day and recovery",
    "duration_minutes": 45,
    "intensity": "Low or Medium or High",
    "rationale": "why this specific workout based on today's WHOOP recovery and day of week",
    "warmup": "specific 5 minute warmup routine",
    "cooldown": "specific 5 minute cooldown and stretch routine",
    "exercises": [
      { "name": "Exercise 1", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "specific beginner form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise 2", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "specific beginner form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise 3", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "specific beginner form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise 4", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "specific beginner form tip", "youtube_search": "exercise name proper form beginner" },
      { "name": "Exercise 5", "sets": 3, "reps": "10-12", "rest_seconds": 60, "notes": "specific beginner form tip", "youtube_search": "exercise name proper form beginner" }
    ]
  },
  "meal_plan": {
    "total_calories_target": 1800,
    "protein_g": 130,
    "carbs_g": 160,
    "fat_g": 55,
    "meals": [
      {
        "time": "7:00 AM",
        "name": "Breakfast",
        "description": "generate a creative overnight oats breakfast with fruit and optional nuts. Include: take Multivitamin, D3, Omega-3, Vitamin E, Zinc with this meal.",
        "calories": 450,
        "protein_g": 20
      },
      {
        "time": "10:30 AM",
        "name": "Mid-Morning Snack",
        "description": "generate a light Indian snack — nuts, fruit, curd, or sprouts",
        "calories": 150,
        "protein_g": 8
      },
      {
        "time": "1:00 PM",
        "name": "Lunch",
        "description": "generate a proper Indian lunch — rotate between chicken meals and vegetarian options. Specify quantities.",
        "calories": 550,
        "protein_g": 40
      },
      {
        "time": "4:30 PM",
        "name": "Pre-Workout Snack",
        "description": "generate a light pre-workout snack with energy. Include: take Pre-workout + Fiber 30 min before gym.",
        "calories": 200,
        "protein_g": 10
      },
      {
        "time": "After Gym",
        "name": "Post-Workout",
        "description": "1 scoop protein powder in 300ml milk or water. Drink within 30 minutes of finishing workout.",
        "calories": 150,
        "protein_g": 28
      },
      {
        "time": "7:30 PM",
        "name": "Dinner",
        "description": "generate a proper Indian dinner — rotate between egg dishes and vegetarian options. Specify quantities. Include: take Magnesium 30 min before bed.",
        "calories": 400,
        "protein_g": 28
      }
    ]
  },
  "daily_tips": [
    "specific tip based on today's recovery score and what it means for training",
    "specific Indian nutrition tip relevant to today's meals",
    "specific sleep or recovery tip based on last night's WHOOP data"
  ],
  "progress_insight": "3-4 sentences giving Ash an honest, specific assessment of his six-pack progress using all available WHOOP data. Mention what's improving, what needs work, and one actionable focus for this week.",
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

        // Step 1: Get refresh token from tokens.json
        const refreshToken = getRefreshToken();

        // Step 2: Get new access + refresh tokens from WHOOP
        const { accessToken, refreshToken: newRefreshToken } = await getTokens(refreshToken);

        // Step 3: Save new refresh token to tokens.json
        saveRefreshToken(newRefreshToken);

        // Step 4: Fetch WHOOP data using access token
        console.log("Fetching WHOOP data...");
        const whoopData = await fetchWhoopData(accessToken);
        console.log("✅ WHOOP data fetched");

        // Step 5: Update history
        const history = loadHistory();
        const today = new Date().toISOString().split('T')[0];
        const entry = buildHistoryEntry(whoopData, today);
        const idx = history.findIndex(h => h.date === today);
        if (idx >= 0) history[idx] = entry;
        else history.push(entry);
        saveHistory(history);

        // Step 6: Compute analytics
        const analytics = computeAnalytics(history);

        // Step 7: Generate AI plan
        let plan = await generateAIPlan(whoopData, analytics);

        // Step 8: Add YouTube links
        plan = addYouTubeLinks(plan);

        // Step 9: Save daily plan
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DAILY_PLAN_PATH, JSON.stringify(plan, null, 2));
        console.log(`✅ Done! Recovery: ${plan.recovery_score}% | Sleep: ${plan.sleep_hours}h | Strain: ${plan.strain}`);

    } catch (err) {
        console.error('❌', err.message);
        process.exit(1);
    }
}

main();
