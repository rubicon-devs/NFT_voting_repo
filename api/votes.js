// api/votes.js - Handle voting for collections
import { query, getCurrentPeriod } from '../lib/db.js';
import { setCorsHeaders, getUserFromRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const user = getUserFromRequest(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!user.hasRequiredRole) {
    return res.status(403).json({ error: 'Required Discord role missing' });
  }
  
  // GET - Get user's votes for current period
  if (req.method === 'GET') {
    try {
      const currentPeriod = await getCurrentPeriod();
      
      if (!currentPeriod) {
        return res.status(500).json({ error: 'No active period' });
      }
      
      const result = await query(`
        SELECT v.*, s.name as collection_name, s.contract_address
        FROM votes v
        JOIN submissions s ON v.submission_id = s.id
        WHERE v.user_id = $1 AND v.period_id = $2
        ORDER BY v.voted_at DESC
      `, [user.id, currentPeriod.id]);
      
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('GET votes error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // POST - Cast or remove a vote
  if (req.method === 'POST') {
    let client;
    try {
      const { submissionId } = req.body;
      
      if (!submissionId) {
        return res.status(400).json({ error: 'Submission ID required' });
      }
      
      const currentPeriod = await getCurrentPeriod();
      
      if (!currentPeriod) {
        return res.status(500).json({ error: 'No active period' });
      }
      
      if (currentPeriod.current_phase !== 'voting') {
        return res.status(400).json({ error: 'Not in voting period' });
      }
      
      // Get a client from the pool for transaction
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      client = await pool.connect();
      await client.query('BEGIN');
      
      // Check if vote exists
      const existingVote = await client.query(
        'SELECT id FROM votes WHERE user_id = $1 AND submission_id = $2 AND period_id = $3',
        [user.id, submissionId, currentPeriod.id]
      );
      
      if (existingVote.rows.length > 0) {
        // Remove vote
        await client.query(
          'DELETE FROM votes WHERE user_id = $1 AND submission_id = $2 AND period_id = $3',
          [user.id, submissionId, currentPeriod.id]
        );
        
        await client.query(
          'UPDATE submissions SET vote_count = vote_count - 1 WHERE id = $1',
          [submissionId]
        );
        
        const updatedSubmission = await client.query(
          'SELECT vote_count FROM submissions WHERE id = $1',
          [submissionId]
        );
        
        await client.query('COMMIT');
        
        return res.status(200).json({
          action: 'removed',
          voteCount: updatedSubmission.rows[0].vote_count
        });
      }
      
      // Check vote limit
      const voteCountResult = await client.query(
        'SELECT COUNT(*) as count FROM votes WHERE user_id = $1 AND period_id = $2',
        [user.id, currentPeriod.id]
      );
      
      if (parseInt(voteCountResult.rows[0].count) >= 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Maximum 5 votes allowed' });
      }
      
      // Add vote
      await client.query(
        'INSERT INTO votes (user_id, submission_id, period_id) VALUES ($1, $2, $3)',
        [user.id, submissionId, currentPeriod.id]
      );
      
      await client.query(
        'UPDATE submissions SET vote_count = vote_count + 1 WHERE id = $1',
        [submissionId]
      );
      
      const updatedSubmission = await client.query(
        'SELECT vote_count FROM submissions WHERE id = $1',
        [submissionId]
      );
      
      await client.query('COMMIT');
      
      return res.status(200).json({
        action: 'added',
        voteCount: updatedSubmission.rows[0].vote_count
      });
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('POST vote error:', error);
      return res.status(500).json({ error: error.message });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
