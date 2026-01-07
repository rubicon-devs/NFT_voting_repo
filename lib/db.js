// lib/db.js - Shared database connection for serverless functions
import { Pool } from 'pg';

let pool;

// Get or create connection pool (singleton pattern for serverless)
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      // Important: Limit connections in serverless environment
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }
  return pool;
}

// Helper to execute queries
export async function query(text, params) {
  const pool = getPool();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get current period
export async function getCurrentPeriod() {
  const result = await query(
    'SELECT * FROM periods ORDER BY started_at DESC LIMIT 1'
  );
  return result.rows[0];
}

// Check if user has required role
export async function checkUserRole(userId) {
  const result = await query(
    'SELECT has_required_role FROM users WHERE discord_id = $1',
    [userId]
  );
  return result.rows[0]?.has_required_role || false;
}

// Check if user is admin
export function isAdmin(userId) {
  const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',');
  return adminIds.includes(userId);
}
