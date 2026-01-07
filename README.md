# Movement Vote - Complete Vercel Serverless Setup

## 🚀 Quick Start

```bash
# Clone or extract the project
cd movement-vote-serverless

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run locally with Vercel CLI (recommended)
vercel dev

# Or run with Vite (without serverless functions)
npm run dev

# Deploy to Vercel
vercel --prod
```

## 📁 Project Structure

```
movement-vote-serverless/
├── api/                          # Serverless API Functions
│   ├── auth/
│   │   ├── discord.js           # Initiate Discord OAuth
│   │   ├── callback.js          # Handle OAuth callback
│   │   ├── user.js              # Get current user
│   │   └── logout.js            # Logout endpoint
│   ├── admin/
│   │   ├── advance.js           # Advance period (admin only)
│   │   ├── export-winners.js    # Export winners data
│   │   ├── export-votes.js      # Export voting records
│   │   └── export-logins.js     # Export login records
│   ├── submissions.js            # GET/POST submissions
│   ├── votes.js                 # GET/POST votes
│   ├── winners.js               # GET winners
│   └── period.js                # GET current period
│
├── lib/                          # Shared utilities
│   ├── db.js                    # Database connection & helpers
│   └── auth.js                  # Authentication & JWT utilities
│
├── src/                          # React Frontend
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # React entry point
│   └── index.css                # Tailwind CSS
│
├── database/
│   └── schema.sql               # PostgreSQL schema
│
├── public/                       # Static assets
├── index.html                    # HTML entry point
├── package.json                  # Dependencies
├── vercel.json                   # Vercel configuration
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
└── .env.example                 # Environment variables template
```

## 🔧 Setup Instructions

### 1. Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 2. Set Up Database

**Option A: Vercel Postgres (Easiest)**

```bash
# Create Vercel Postgres database
vercel postgres create

# Get connection string
vercel env pull .env.local
```

**Option B: External PostgreSQL**

Use Railway, Supabase, or any PostgreSQL provider:

1. Create database
2. Get connection string
3. Add to `.env.local`

### 3. Load Database Schema

```bash
# Install PostgreSQL client if needed
npm install -g pg

# Load schema (replace with your DATABASE_URL)
psql $DATABASE_URL < database/schema.sql
```

Or create a migration script:

```javascript
// scripts/migrate.js
import { readFileSync } from 'fs';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await client.connect();
  const schema = readFileSync('./database/schema.sql', 'utf-8');
  await client.query(schema);
  console.log('✅ Database schema loaded');
  await client.end();
}

migrate().catch(console.error);
```

Run with: `node scripts/migrate.js`

### 4. Configure Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. OAuth2 → Add redirect URL:
   - Local: `http://localhost:3000/api/auth/callback`
   - Production: `https://your-app.vercel.app/api/auth/callback`
4. Copy Client ID and Client Secret
5. Get your Discord Server ID
6. Get required Role IDs

### 5. Configure Tradeport API

1. Get API key from Tradeport
2. Add to environment variables

### 6. Set Environment Variables

**Local (.env.local):**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback
DISCORD_GUILD_ID=your_server_id
DISCORD_REQUIRED_ROLE_IDS=role_id_1,role_id_2

# Tradeport
TRADEPORT_API_KEY=your_api_key
TRADEPORT_BASE_URL=https://api.tradeport.xyz

# Admin
ADMIN_DISCORD_IDS=admin_discord_id_1,admin_discord_id_2

# Session
SESSION_SECRET=generate_random_string_here

# Client
CLIENT_URL=http://localhost:3000
```

**Vercel (Production):**

```bash
# Add each variable
vercel env add DATABASE_URL
vercel env add DISCORD_CLIENT_ID
vercel env add DISCORD_CLIENT_SECRET
vercel env add DISCORD_REDIRECT_URI
vercel env add DISCORD_GUILD_ID
vercel env add DISCORD_REQUIRED_ROLE_IDS
vercel env add TRADEPORT_API_KEY
vercel env add TRADEPORT_BASE_URL
vercel env add ADMIN_DISCORD_IDS
vercel env add SESSION_SECRET
vercel env add CLIENT_URL
```

### 7. Run Locally

```bash
# Option 1: Vercel Dev (includes serverless functions)
vercel dev
# Access at http://localhost:3000

# Option 2: Vite Dev (frontend only, mock APIs)
npm run dev
# Access at http://localhost:5173
```

### 8. Deploy to Vercel

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## 🌐 API Endpoints

### Public Endpoints

```
GET  /api/period              - Get current period info
GET  /api/submissions         - Get all submissions
GET  /api/winners            - Get winners (if in winner period)
```

### Authentication Endpoints

```
GET  /api/auth/discord       - Initiate Discord OAuth
GET  /api/auth/callback      - OAuth callback handler
GET  /api/auth/user          - Get current authenticated user
POST /api/auth/logout        - Logout user
```

### Protected Endpoints (Requires Auth + Role)

```
POST /api/submissions        - Submit collection
GET  /api/votes              - Get user's votes
POST /api/votes              - Cast/remove vote
```

### Admin Endpoints (Requires Admin)

```
POST /api/admin/advance         - Advance to next period
GET  /api/admin/export-winners  - Download winners JSON
GET  /api/admin/export-votes    - Download votes JSON
GET  /api/admin/export-logins   - Download logins JSON
```

## 🔐 Authentication Flow

1. User clicks "Connect Discord"
2. Frontend redirects to `/api/auth/discord`
3. Serverless function redirects to Discord OAuth
4. User authorizes on Discord
5. Discord redirects to `/api/auth/callback`
6. Callback function:
   - Exchanges code for access token
   - Gets user info from Discord
   - Checks guild membership and roles
   - Creates user in database
   - Sets HTTP-only cookie with auth token
   - Redirects to frontend
7. Frontend reads auth status from `/api/auth/user`

## 📊 Database Schema

The project uses PostgreSQL with the following main tables:

- **users** - Discord user information
- **periods** - Monthly voting periods
- **submissions** - NFT collection submissions
- **votes** - User votes
- **winners** - Top 15 winners per period
- **login_records** - Audit log of logins

See `database/schema.sql` for complete schema.

## 🐛 Troubleshooting

### Issue: "Database connection failed"

**Solution:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Verify SSL settings
# URL should include: ?sslmode=require
```

### Issue: "Discord OAuth fails"

**Solution:**
1. Check DISCORD_REDIRECT_URI matches Discord Developer Portal
2. Verify it's the full URL: `https://your-app.vercel.app/api/auth/callback`
3. Ensure CLIENT_URL is set correctly
4. Check browser console for errors

### Issue: "Function timeout"

**Solution:**
```javascript
// Optimize database queries
// Use connection pooling with max: 1
// Add indexes to frequently queried columns
```

In `vercel.json`:
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 10
    }
  }
}
```

### Issue: "CORS errors"

**Solution:**
All API functions include CORS headers. Check:
1. CLIENT_URL environment variable is set
2. Browser allows credentials in requests
3. Cookies are being sent with requests

## 📈 Monitoring

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Specific function
vercel logs --function api/submissions

# Last 100 logs
vercel logs --limit 100
```

### Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. View:
   - Deployments
   - Functions (invocations, errors, duration)
   - Analytics
   - Environment variables

### Database Monitoring

```bash
# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()))"

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# View table sizes
psql $DATABASE_URL -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC"
```

## 🚀 Performance Tips

### 1. Database Connection Pooling

Already implemented in `lib/db.js` with `max: 1` for serverless.

### 2. Caching

Add caching headers to GET requests:

```javascript
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
```

### 3. Optimize Bundle Size

```bash
# Analyze bundle
npm run build
```

Check the output for large dependencies.

### 4. Edge Functions

For frequently accessed endpoints, consider Edge Functions:

```javascript
export const config = {
  runtime: 'edge',
};
```

## 💰 Cost Estimates

### Vercel Free Tier
- ✅ 100 GB bandwidth
- ✅ 100 GB-hours compute
- ✅ Unlimited requests
- ✅ Free SSL

### Vercel Pro ($20/month)
- 1 TB bandwidth
- 1000 GB-hours compute
- Advanced analytics

### Database Costs
- **Vercel Postgres**: ~$0.25/GB storage + compute
- **Railway**: $5/month (includes 500 hours)
- **Supabase**: Free tier available (500MB)

**Estimated Total:** $0-5/month for small-medium usage

## 🎯 Next Steps

1. **Test All Features**
   - Discord login
   - Submit collections
   - Vote functionality
   - Admin controls

2. **Add Monitoring**
   - Set up error tracking (Sentry)
   - Enable Vercel Analytics
   - Monitor database performance

3. **Optimize**
   - Add request caching
   - Optimize database queries
   - Reduce bundle size

4. **Enhance**
   - Add email notifications
   - Social media sharing
   - Collection analytics
   - Mobile app

## 📚 Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Discord OAuth](https://discord.com/developers/docs/topics/oauth2)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section
2. View Vercel logs: `vercel logs`
3. Check database connectivity
4. Verify environment variables

## 📝 License

MIT License - See LICENSE file for details
