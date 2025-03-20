import twilio from 'twilio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { identity, room } = req.body;

  if (!identity || !room) {
    return res.status(400).json({ error: 'Identity and room are required' });
  }

  try {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioApiKey = process.env.TWILIO_API_KEY;
    const twilioApiSecret = process.env.TWILIO_API_SECRET;

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    // Create an access token
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity }
    );

    // Grant access to Video
    const videoGrant = new VideoGrant({
      room,
    });

    token.addGrant(videoGrant);

    // Serialize the token as a JWT
    const jwt = token.toJwt();

    return res.status(200).json({ token: jwt });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
} 