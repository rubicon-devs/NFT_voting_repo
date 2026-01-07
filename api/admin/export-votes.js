// api/admin/export-votes.js - Export voting records (admin only)
import { query, getCurrentPeriod, isAdmin } from '../../lib/db.js';
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
    const currentPeriod = await getCurrentPeriod();
    
    if (!currentPeriod) {
      return res.status(500).json({ error: 'No active period' });
    }
    
    const result = await query(`
      SELECT 
        v.user_id,
        u.username,
        u.discriminator,
        s.name as collection_name,
        s.contract_address,
        v.voted_at
      FROM votes v
      JOIN users u ON v.user_id = u.discord_id
      JOIN submissions s ON v.submission_id = s.id
      WHERE v.period_id = $1
      ORDER BY v.voted_at DESC
    `, [currentPeriod.id]);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="votes-${currentPeriod.month}.json"`);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Export votes error:', error);
    return res.status(500).json({ error: error.message });
  }
}
