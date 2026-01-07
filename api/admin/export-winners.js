// api/admin/export-winners.js - Export winners data (admin only)
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
        w.rank,
        s.name as collection_name,
        s.contract_address,
        w.final_vote_count,
        s.floor_price,
        s.volume_24h,
        s.total_items,
        w.created_at
      FROM winners w
      JOIN submissions s ON w.submission_id = s.id
      WHERE w.period_id = $1
      ORDER BY w.rank ASC
    `, [currentPeriod.id]);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="winners-${currentPeriod.month}.json"`);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Export winners error:', error);
    return res.status(500).json({ error: error.message });
  }
}
