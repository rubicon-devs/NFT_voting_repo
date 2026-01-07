// api/auth/discord.js - Initiate Discord OAuth flow
import { setCorsHeaders } from '../../lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds.members.read'
    });
    
    const redirectUrl = `https://discord.com/api/oauth2/authorize?${params}`;
    
    return res.redirect(302, redirectUrl);
  } catch (error) {
    console.error('Discord OAuth initiation error:', error);
    return res.status(500).json({ error: 'Failed to initiate Discord login' });
  }
}
