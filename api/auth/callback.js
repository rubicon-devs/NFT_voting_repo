// api/auth/callback.js - Handle Discord OAuth callback
import axios from 'axios';
import { query } from '../../lib/db.js';
import { createToken, setAuthCookie, setCorsHeaders } from '../../lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { code } = req.query;
  
  if (!code) {
    return res.redirect(302, `${process.env.CLIENT_URL}?error=no_code`);
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token } = tokenResponse.data;
    
    // Get user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const discordUser = userResponse.data;
    
    // Check guild membership and roles
    let hasRequiredRole = false;
    try {
      const memberResponse = await axios.get(
        `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
        {
          headers: { Authorization: `Bearer ${access_token}` }
        }
      );
      
      const requiredRoleIds = process.env.DISCORD_REQUIRED_ROLE_IDS.split(',');
      hasRequiredRole = memberResponse.data.roles.some(roleId =>
        requiredRoleIds.includes(roleId)
      );
    } catch (error) {
      console.error('Failed to check guild membership:', error);
      // User not in guild or other error
      hasRequiredRole = false;
    }
    
    // Upsert user in database
    await query(`
      INSERT INTO users (discord_id, username, discriminator, avatar, has_required_role, last_login)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (discord_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        discriminator = EXCLUDED.discriminator,
        avatar = EXCLUDED.avatar,
        has_required_role = EXCLUDED.has_required_role,
        last_login = CURRENT_TIMESTAMP
    `, [
      discordUser.id,
      discordUser.username,
      discordUser.discriminator || '0',
      discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png',
      hasRequiredRole
    ]);
    
    // Record login
    await query(
      'INSERT INTO login_records (user_id, ip_address) VALUES ($1, $2)',
      [discordUser.id, req.headers['x-forwarded-for'] || 'unknown']
    );
    
    // Create auth token
    const token = createToken({
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator || '0',
      avatar: discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png',
      hasRequiredRole
    });
    
    // Set cookie
    setAuthCookie(res, token);
    
    // Redirect to frontend
    return res.redirect(302, process.env.CLIENT_URL);
  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    return res.redirect(302, `${process.env.CLIENT_URL}?error=auth_failed`);
  }
}
