// lib/auth.js - Authentication utilities for serverless functions
import { serialize, parse } from 'cookie';

// Create JWT-like token (simple implementation)
export function createToken(user) {
  const payload = JSON.stringify({
    id: user.id,
    username: user.username,
    hasRequiredRole: user.hasRequiredRole,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });
  
  // In production, use proper JWT signing
  const token = Buffer.from(payload).toString('base64');
  return token;
}

// Verify and decode token
export function verifyToken(token) {
  try {
    const payload = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(payload);
    
    // Check expiration
    if (data.exp < Date.now()) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

// Set auth cookie
export function setAuthCookie(res, token) {
  const cookie = serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

// Clear auth cookie
export function clearAuthCookie(res) {
  const cookie = serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

// Get user from request
export function getUserFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}

// Middleware to require authentication
export function requireAuth(handler) {
  return async (req, res) => {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Attach user to request
    req.user = user;
    
    return handler(req, res);
  };
}

// Middleware to require admin
export function requireAdmin(handler) {
  return requireAuth(async (req, res) => {
    const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',');
    
    if (!adminIds.includes(req.user.id)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    return handler(req, res);
  });
}

// CORS headers helper
export function setCorsHeaders(res, req) {
  const origin = req.headers.origin || process.env.CLIENT_URL || '*';
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
}
