// =====================================================
// WHOOP Credentials
// =====================================================

const WHOOP_CLIENT_ID =
  '5481da9c-04ff-4227-be33-a72b148f2098';


const WHOOP_CLIENT_SECRET =
  '57866e7a02419d5be8658f0d18eb0b6f958681645c3fdca9e334592f4fc0b7c';


const WHOOP_REFRESH_TOKEN =
  process.env.WHOOP_REFRESH_TOKEN;


const WHOOP_BASE =
  'https://api.prod.whoop.com/developer/v1';


// =====================================================
// Validate WHOOP Config
// =====================================================

function validateWhoop() {

  if (!WHOOP_CLIENT_ID)
    throw new Error('Missing WHOOP CLIENT ID');


  if (!WHOOP_CLIENT_SECRET)
    throw new Error('Missing WHOOP CLIENT SECRET');


  if (!WHOOP_REFRESH_TOKEN)
    throw new Error('Missing WHOOP REFRESH TOKEN');


  console.log('WHOOP credentials loaded');

  console.log(
    'Client ID:',
    WHOOP_CLIENT_ID
  );

  console.log(
    'Secret length:',
    WHOOP_CLIENT_SECRET.length
  );

  console.log(
    'Refresh token length:',
    WHOOP_REFRESH_TOKEN.length
  );
}


validateWhoop();



// =====================================================
// Refresh WHOOP Access Token
// =====================================================

async function refreshAccessToken() {


  console.log(
    'Refreshing WHOOP token...'
  );


  // WHOOP requires Basic Authentication:
  // base64(client_id:client_secret)

  const basicAuth =
    Buffer
      .from(
        `${WHOOP_CLIENT_ID}:${WHOOP_CLIENT_SECRET}`
      )
      .toString('base64');



  const params =
    new URLSearchParams();


  params.append(
    'grant_type',
    'refresh_token'
  );


  params.append(
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

          'Authorization':
            `Basic ${basicAuth}`

        },


        body:
          params

      }
    );



  const result =
    await response.text();



  console.log(
    'WHOOP response:',
    response.status
  );



  if(!response.ok){


    console.log(
      result
    );


    throw new Error(
      'WHOOP authentication failed'
    );

  }



  const token =
    JSON.parse(result);



  console.log(
    'WHOOP Login Successful'
  );



  return {

    accessToken:
      token.access_token,


    newRefreshToken:
      token.refresh_token

  };

}
