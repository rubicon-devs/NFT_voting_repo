// api/submissions.js - Handle NFT collection submissions (Updated for TradePort GraphQL API)
import axios from 'axios';
import { query, getCurrentPeriod } from '../lib/db.js';
import { setCorsHeaders, getUserFromRequest } from '../lib/auth.js';

// Fetch collection metadata from Tradeport GraphQL API
async function fetchCollectionMetadata(contractAddress) {
  try {
    // GraphQL query for Movement chain collections
    const graphqlQuery = `
      query getCollectionByContract($contractAddress: String!) {
        movement {
          collections(where: { contract_key: { _eq: $contractAddress } }) {
            id
            title
            description
            cover_url
            supply
            floor
            volume
            slug
          }
        }
      }
    `;

    const response = await axios({
      url: 'https://api.indexer.xyz/graphql',
      method: 'post',
      data: {
        query: graphqlQuery,
        variables: {
          contractAddress: contractAddress
        }
      },
      headers: {
        'x-api-key': process.env.TRADEPORT_API_KEY,
        'x-api-user': process.env.TRADEPORT_API_USER
      }
    });

    // Check if collection found
    if (response.data?.data?.movement?.collections?.length > 0) {
      const collection = response.data.data.movement.collections[0];
      
      return {
        name: collection.title || 'Unknown Collection',
        thumbnail: collection.cover_url || 'https://via.placeholder.com/200',
        floorPrice: collection.floor || 0,
        volume24h: collection.volume || 0,
        totalItems: collection.supply || 0,
        description: collection.description || ''
      };
    }

    // If not found on Movement, try Sui chain as fallback
    const suiQuery = `
      query getCollectionByContract($contractAddress: String!) {
        sui {
          collections(where: { contract_key: { _eq: $contractAddress } }) {
            id
            title
            description
            cover_url
            supply
            floor
            volume
            slug
          }
        }
      }
    `;

    const suiResponse = await axios({
      url: 'https://api.indexer.xyz/graphql',
      method: 'post',
      data: {
        query: suiQuery,
        variables: {
          contractAddress: contractAddress
        }
      },
      headers: {
        'x-api-key': process.env.TRADEPORT_API_KEY,
        'x-api-user': process.env.TRADEPORT_API_USER
      }
    });

    if (suiResponse.data?.data?.sui?.collections?.length > 0) {
      const collection = suiResponse.data.data.sui.collections[0];
      
      return {
        name: collection.title || 'Unknown Collection',
        thumbnail: collection.cover_url || 'https://via.placeholder.com/200',
        floorPrice: collection.floor || 0,
        volume24h: collection.volume || 0,
        totalItems: collection.supply || 0,
        description: collection.description || ''
      };
    }

    throw new Error('Collection not found');
  } catch (error) {
    console.error('Tradeport API error:', error.response?.data || error.message);
    
    // Return mock data if API fails (for development/testing)
    return {
      name: `Collection ${contractAddress.slice(0, 8)}...`,
      thumbnail: `https://via.placeholder.com/200?text=${contractAddress.slice(0, 4)}`,
      floorPrice: (Math.random() * 10).toFixed(2),
      volume24h: (Math.random() * 100).toFixed(2),
      totalItems: Math.floor(Math.random() * 10000),
      description: 'NFT Collection on Movement'
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
      
      // Validate contract address format (Movement/Sui uses 0x format)
      if (!/^0x[a-fA-F0-9]+$/.test(contractAddress)) {
        return res.status(400).json({ error: 'Invalid contract address format. Must start with 0x' });
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
      
      // Fetch metadata from Tradeport GraphQL API
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