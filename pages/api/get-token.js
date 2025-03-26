import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await client.tokens.create();
    return res.status(200).json({ 
      iceServers: token.iceServers 
    });
  } catch (error) {
    console.error('Error generating Twilio token:', error);
    return res.status(500).json({ 
      error: 'Failed to generate ICE servers configuration' 
    });
  }
} 