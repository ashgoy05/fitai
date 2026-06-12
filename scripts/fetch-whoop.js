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
