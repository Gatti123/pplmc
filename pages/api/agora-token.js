import { RtcTokenBuilder, RtcRole } from 'agora-token';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelName, uid } = req.body;

  if (!channelName) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  // Set the expiry time for the token (e.g., 24 hours)
  const expirationTimeInSeconds = 24 * 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Build token with uid
  const token = RtcTokenBuilder.buildTokenWithUid(
    process.env.NEXT_PUBLIC_AGORA_APP_ID,
    process.env.AGORA_APP_CERTIFICATE,
    channelName,
    uid || 0,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );

  return res.status(200).json({ token });
} 