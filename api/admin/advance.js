// api/admin/advance.js - Advance to next period (admin only)
import { query, getCurrentPeriod, isAdmin } from '../../lib/db.js';
import { setCorsHeaders, getUserFromRequest } from '../../lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
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
    
    if (currentPeriod.current_phase === 'submission') {
      // Move to voting
      await query(
        'UPDATE periods SET current_phase = $1 WHERE id = $2',
        ['voting', currentPeriod.id]
      );
      
      return res.status(200).json({
        message: 'Advanced to voting period',
        period: { ...currentPeriod, current_phase: 'voting' }
      });
    } else if (currentPeriod.current_phase === 'voting') {
      // Calculate winners and move to winner display
      await query('SELECT * FROM calculate_winners($1)', [currentPeriod.id]);
      
      await query(
        'UPDATE periods SET current_phase = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['winner', currentPeriod.id]
      );
      
      return res.status(200).json({
        message: 'Advanced to winner display period',
        period: { ...currentPeriod, current_phase: 'winner' }
      });
    } else if (currentPeriod.current_phase === 'winner') {
      // Create new period
      const newMonth = new Date();
      newMonth.setMonth(newMonth.getMonth() + 1);
      const monthStr = newMonth.toISOString().slice(0, 7);
      
      const newPeriodResult = await query(
        'INSERT INTO periods (month, current_phase, started_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
        [monthStr, 'submission']
      );
      
      return res.status(200).json({
        message: 'Created new submission period',
        period: newPeriodResult.rows[0]
      });
    }
    
    return res.status(400).json({ error: 'Invalid period state' });
  } catch (error) {
    console.error('Advance period error:', error);
    return res.status(500).json({ error: error.message });
  }
}
