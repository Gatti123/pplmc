import { AccessToken } from 'twilio';
const VideoGrant = AccessToken.VideoGrant;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { identity, room } = req.body;

  if (!identity || !room) {
    return res.status(400).json({ error: 'Missing identity or room' });
  }

  try {
    // Load environment variables
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioApiKey = process.env.TWILIO_API_KEY;
    const twilioApiSecret = process.env.TWILIO_API_SECRET;

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
      throw new Error('Missing Twilio credentials');
    }

    // Create Video Grant
    const videoGrant = new VideoGrant({
      room: room
    });

    // Create an access token
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity: identity }
    );

    // Add the video grant to the token
    token.addGrant(videoGrant);

    // Serialize the token to a JWT string
    console.log('Generated token for room:', room, 'and identity:', identity);
    
    return res.status(200).json({ 
      token: token.toJwt(),
      identity: identity,
      room: room 
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: 'Could not generate token' });
  }
} 