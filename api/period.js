// api/period.js - Get current period information
import { getCurrentPeriod } from '../lib/db.js';
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
    const period = await getCurrentPeriod();
    
    if (!period) {
      return res.status(404).json({ error: 'No active period' });
    }
    
    return res.status(200).json(period);
  } catch (error) {
    console.error('GET period error:', error);
    return res.status(500).json({ error: error.message });
  }
}
