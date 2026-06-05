import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


// =====================================================
// Credentials
// =====================================================

const WHOOP_CLIENT_ID =
  '5481da9c-04ff-4227-be33-a72b148f2098';

const WHOOP_CLIENT_SECRET =
  process.env.WHOOP_CLIENT_SECRET;

const WHOOP_REFRESH_TOKEN =
  process.env.WHOOP_REFRESH_TOKEN;

const ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY;

const GITHUB_TOKEN =
  process.env.GITHUB_TOKEN;

const GITHUB_REPOSITORY =
  process.env.GITHUB_REPOSITORY;


const WHOOP_BASE =
  'https://api.prod.whoop.com/developer/v1';


// =====================================================
// Validate Secrets
// =====================================================

function validateSecrets() {

  console.log('Checking secrets...');

  if (!WHOOP_CLIENT_SECRET)
    throw new Error('Missing WHOOP_CLIENT_SECRET');

  if (!WHOOP_REFRESH_TOKEN)
    throw new Error('Missing WHOOP_REFRESH_TOKEN');

  if (!ANTHROPIC_API_KEY)
    throw new Error('Missing ANTHROPIC_API_KEY');


  console.log('Secrets loaded');

  console.log(
    'Client Secret Length:',
    WHOOP_CLIENT_SECRET.length
  );

  console.log(
    'Refresh Token Length:',
    WHOOP_REFRESH_TOKEN.length
  );
}


validateSecrets();


// =====================================================
// USER PROFILE
// =====================================================

const USER_PROFILE = {

  name: 'Ash',

  height_cm: 163,

  weight_kg: 70,

  goal:
    'Fat loss, build six-pack, get lean',

  diet:
    'Non-vegetarian',

  gym_schedule:
    'Mon-Fri gym, weekend flexible',

  breakfast:
    'Overnight oats + milk',

  must_haves:
    'Activia yogurt and fruits daily'
};


// =====================================================
// WHOOP OAuth Refresh
// =====================================================

async function refreshAccessToken() {


  console.log(
    'Refreshing WHOOP token...'
  );


  const basicAuth =
    Buffer
      .from(
        `${WHOOP_CLIENT_ID}:${WHOOP_CLIENT_SECRET}`
      )
      .toString('base64');


  const body =
    new URLSearchParams();


  body.append(
    'grant_type',
    'refresh_token'
  );


  body.append(
    'refresh_token',
    WHOOP_REFRESH_TOKEN
  );



  const response =
    await fetch(
      'https://api.prod.whoop.com/oauth/oauth2/token',
      {

        method:'POST',

        headers:{

          'Content-Type':
            'application/x-www-form-urlencoded',

          Authorization:
            `Basic ${basicAuth}`
        },

        body
      }
    );



  const text =
    await response.text();


  console.log(
    'WHOOP Status:',
    response.status
  );



  if(!response.ok){

    console.log(text);

    throw new Error(
      `WHOOP token failed ${response.status}`
    );
  }



  const data =
    JSON.parse(text);


  console.log(
    'WHOOP connected'
  );


  return {

    accessToken:
      data.access_token,

    newRefreshToken:
      data.refresh_token
  };

}


// =====================================================
// WHOOP GET
// =====================================================


function makeWhoopGet(token){

 return async(endpoint)=>{


  const res =
    await fetch(
      `${WHOOP_BASE}${endpoint}`,
      {
        headers:{
          Authorization:`Bearer ${token}`
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

}


// =====================================================
// Fetch WHOOP Data
// =====================================================


async function fetchWhoopData(token){


 const get =
   makeWhoopGet(token);


 console.log(
   'Fetching WHOOP data...'
 );


 const [
   recovery,
   sleep,
   cycle,
   workout
 ] = await Promise.all([

    get('/recovery?limit=7'),

    get('/activity/sleep?limit=7'),

    get('/cycle?limit=7'),

    get('/activity/workout?limit=10')

 ]);


 return {

  recovery:
    recovery.records?.[0],

  sleep:
    sleep.records?.[0],

  cycle:
    cycle.records?.[0],

  workouts:
    workout.records || []

 };

}


// =====================================================
// Generate AI Plan
// =====================================================


async function generateAIPlan(data){


 console.log(
   'Generating AI plan...'
 );


 const prompt = `

You are my fitness coach.

Profile:
${JSON.stringify(USER_PROFILE)}

WHOOP DATA:
${JSON.stringify(data)}

Create today's workout and diet plan.

Return JSON only.

`;



 const res =
   await fetch(
    'https://api.anthropic.com/v1/messages',
    {

     method:'POST',

     headers:{

      'content-type':
       'application/json',

      'x-api-key':
       ANTHROPIC_API_KEY,

      'anthropic-version':
       '2023-06-01'

     },


     body:JSON.stringify({

      model:
       'claude-sonnet-4-20250514',

      max_tokens:3000,

      messages:[
        {
          role:'user',
          content:prompt
        }
      ]

     })
    }
   );


 const json =
   await res.json();


 return JSON.parse(
   json.content[0].text
 );

}


// =====================================================
// MAIN
// =====================================================


async function main(){


 try{


 const {
   accessToken
 } =
 await refreshAccessToken();



 const whoop =
   await fetchWhoopData(
     accessToken
   );



 const plan =
   await generateAIPlan(
     whoop
   );



 const output =
  path.join(
   __dirname,
   '../src/data/daily-plan.json'
  );



 fs.mkdirSync(
   path.dirname(output),
   {recursive:true}
 );


 fs.writeFileSync(
   output,
   JSON.stringify(plan,null,2)
 );


 console.log(
   'DONE - daily plan created'
 );


 }


 catch(error){

  console.error(
    'ERROR:',
    error.message
  );

  process.exit(1);

 }

}



main();
