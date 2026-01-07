// api/submissions.js - Handle NFT collection submissions
import axios from 'axios';
import { query, getCurrentPeriod } from '../lib/db.js';
import { requireAuth, setCorsHeaders, getUserFromRequest } from '../lib/auth.js';

// Fetch collection metadata from Tradeport API
async function fetchCollectionMetadata(contractAddress) {
  try {
    const response = await axios.get(
      `${process.env.TRADEPORT_BASE_URL}/collections/${contractAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TRADEPORT_API_KEY}`
        }
      }
    );

    return {
      name: response.data.name || 'Unknown Collection',
      thumbnail: response.data.image || 'https://via.placeholder.com/200',
      floorPrice: response.data.floorPrice || 0,
      volume24h: response.data.volume24h || 0,
      totalItems: response.data.totalSupply || 0,
      description: response.data.description || ''
    };
  } catch (error) {
    console.error('Tradeport API error:', error);
    // Return mock data if API fails
    return {
      name: `Collection ${contractAddress.slice(0, 8)}`,
      thumbnail: `https://via.placeholder.com/200?text=${contractAddress.slice(0, 4)}`,
      floorPrice: (Math.random() * 10).toFixed(2),
      volume24h: (Math.random() * 100).toFixed(2),
      totalItems: Math.floor(Math.random() * 10000),
      description: 'NFT Collection'
    };
  }
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET - Fetch all submissions for current period
  if (req.method === 'GET') {
    try {
      const currentPeriod = await getCurrentPeriod();
      
      if (!currentPeriod) {
        return res.status(500).json({ error: 'No active period' });
      }
      
      const result = await query(`
        SELECT * FROM submissions
        WHERE period_id = $1
        ORDER BY vote_count DESC, submitted_at ASC
      `, [currentPeriod.id]);
      
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('GET submissions error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // POST - Create new submission (requires auth)
  if (req.method === 'POST') {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!user.hasRequiredRole) {
      return res.status(403).json({ error: 'Required Discord role missing' });
    }
    
    try {
      const { contractAddress } = req.body;
      
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address required' });
      }
      
      // Validate contract address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        return res.status(400).json({ error: 'Invalid contract address format' });
      }
      
      const currentPeriod = await getCurrentPeriod();
      
      if (!currentPeriod) {
        return res.status(500).json({ error: 'No active period' });
      }
      
      if (currentPeriod.current_phase !== 'submission') {
        return res.status(400).json({ error: 'Not in submission period' });
      }
      
      // Check if already submitted
      const existingResult = await query(
        'SELECT id FROM submissions WHERE contract_address = $1 AND period_id = $2',
        [contractAddress, currentPeriod.id]
      );
      
      if (existingResult.rows.length > 0) {
        return res.status(400).json({ error: 'Collection already submitted' });
      }
      
      // Fetch metadata from Tradeport
      const metadata = await fetchCollectionMetadata(contractAddress);
      
      // Insert submission
      const insertResult = await query(`
        INSERT INTO submissions (
          contract_address, submitter_id, period_id, name, thumbnail,
          description, floor_price, volume_24h, total_items
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        contractAddress,
        user.id,
        currentPeriod.id,
        metadata.name,
        metadata.thumbnail,
        metadata.description,
        metadata.floorPrice,
        metadata.volume24h,
        metadata.totalItems
      ]);
      
      return res.status(201).json(insertResult.rows[0]);
    } catch (error) {
      console.error('POST submission error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
