import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelName, uid } = req.body;

  if (!channelName || !uid) {
    return res.status(400).json({ error: 'Channel name and uid are required' });
  }

  // Get Agora App ID and Certificate from environment variables
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    return res.status(500).json({ error: 'Agora credentials not configured' });
  }

  // Set token expiration time (e.g., 1 hour from now)
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Build token with channel name
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );

  // Return token
  res.status(200).json({ token });
} 