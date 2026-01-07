// api/winners.js - Get current winners
import { query, getCurrentPeriod } from '../lib/db.js';
import { setCorsHeaders } from '../lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const currentPeriod = await getCurrentPeriod();
    
    if (!currentPeriod) {
      return res.status(500).json({ error: 'No active period' });
    }
    
    if (currentPeriod.current_phase !== 'winner') {
      return res.status(200).json([]);
    }
    
    const result = await query(`
      SELECT 
        w.*,
        s.contract_address,
        s.name,
        s.thumbnail,
        s.floor_price,
        s.volume_24h,
        s.total_items
      FROM winners w
      JOIN submissions s ON w.submission_id = s.id
      WHERE w.period_id = $1
      ORDER BY w.rank ASC
    `, [currentPeriod.id]);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('GET winners error:', error);
    return res.status(500).json({ error: error.message });
  }
}
