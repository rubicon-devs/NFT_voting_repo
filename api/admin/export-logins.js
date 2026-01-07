// api/admin/export-logins.js - Export login records (admin only)
import { query, isAdmin } from '../../lib/db.js';
import { setCorsHeaders, getUserFromRequest } from '../../lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const user = getUserFromRequest(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!isAdmin(user.id)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const limit = parseInt(req.query.limit) || 1000;
    
    const result = await query(`
      SELECT 
        lr.id,
        lr.user_id,
        u.username,
        u.discriminator,
        u.has_required_role,
        lr.ip_address,
        lr.logged_in_at
      FROM login_records lr
      JOIN users u ON lr.user_id = u.discord_id
      ORDER BY lr.logged_in_at DESC
      LIMIT $1
    `, [limit]);
    
    // Set headers for file download
    const now = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="logins-${now}.json"`);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Export logins error:', error);
    return res.status(500).json({ error: error.message });
  }
}
