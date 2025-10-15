# Upstash Redis Setup Guide

## Overview

The app uses a **hybrid caching strategy**:
- **Local Development**: In-memory store with background refresh (60s intervals)
- **Production (Vercel)**: Upstash Redis with TTL-based caching

This provides fast local development and fast production responses with shared cache across all serverless instances.

## How It Works

### Local Development (Memory Store)
```
Request → In-memory store → Background refresh (60s) → Notion API
Update → Notion API + Update memory store → Immediate consistency
```

### Production (Upstash Redis)
```
Request → Check Redis cache → Hit? Return cached | Miss? Fetch from Notion + Cache
Update → Notion API + Invalidate Redis cache → Next request fetches fresh data
```

## Setting Up Upstash Redis

### 1. Create Upstash Account

1. Go to [upstash.com](https://upstash.com)
2. Sign up or log in
3. Click "Create Database"

### 2. Create Redis Database

1. Choose a name (e.g., "slush-task-cache")
2. Select a region close to your Vercel deployment
   - Recommended: Same region as Vercel for lowest latency
   - US East (N. Virginia) for US deployments
   - EU West (Ireland) for EU deployments
3. Select **Global** type for multi-region (or Regional for single region)
4. Click "Create"

### 3. Get Credentials

After creating, you'll see multiple connection options. You can use **either**:

**Option A: Traditional Redis URL (Simplest)**
- **REDIS_URL** or **KV_URL** - e.g., `rediss://default:TOKEN@host.upstash.io:6379`

**Option B: REST API (Also works)**
- **UPSTASH_REDIS_REST_URL** - e.g., `https://your-db.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN** - Your access token

The app automatically parses either format!

### 4. Add to Vercel

#### Option A: Vercel Dashboard (Simplest)
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add ONE of these formats:

**Format 1: Single Redis URL (Recommended)**
   ```
   KV_URL=rediss://default:YOUR_TOKEN@your-db.upstash.io:6379
   CACHE_TTL_SECONDS=60
   ```

**Format 2: Separate REST Credentials**
   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   CACHE_TTL_SECONDS=60
   ```

4. Select environments: Production, Preview, Development
5. Deploy

#### Option B: Vercel CLI
```bash
# Using Redis URL format
vercel env add KV_URL
# Paste your rediss:// URL when prompted

# OR using REST format
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

### 5. Deploy

```bash
git push
# Or
vercel deploy --prod
```

## Local Development

For local development, the app uses in-memory store automatically (no Redis needed).

If you want to test Redis locally:
```bash
# Add to .env.local (either format works)

# Format 1: Redis URL (from Vercel KV or Upstash)
KV_URL=rediss://default:YOUR_TOKEN@your-db.upstash.io:6379

# Format 2: REST API credentials
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

The app will automatically detect and use Redis when these are set.

## Configuration

### Cache TTL (Time To Live)

```bash
# How long data is cached before expiring (in seconds)
CACHE_TTL_SECONDS=60  # Default: 60 seconds
```

**Recommendations:**
- **60s** - Good balance (default)
- **120s** - Fewer API calls, slightly staler data
- **30s** - More API calls, fresher data

### Refresh Interval (Local Dev Only)

```bash
# How often to refresh in-memory store (in seconds)
REFRESH_INTERVAL_SECONDS=60  # Default: 60 seconds
```

## Monitoring

### Status Indicator

The UI shows cache status:

**Local Development:**
- 🟢 Green: < 2× refresh interval (fresh data)
- 🟡 Yellow: 2-4× refresh interval (somewhat stale)
- 🔴 Red: > 4× refresh interval (very stale)
- 🔄 Updating: Background refresh in progress

**Production (Upstash):**
- 🟢 Green: "Cached 5s ago • 55s TTL"
- ⚪ Gray: "Cache empty" (will fetch on next request)

### API Endpoint

Check cache status:
```bash
# Local
curl http://localhost:3000/api/store-stats | jq .

# Production
curl https://your-app.vercel.app/api/store-stats | jq .
```

**Response (Local):**
```json
{
  "taskCount": 80,
  "ageSeconds": 15,
  "isRefreshing": false,
  "useRedis": false,
  "cacheExists": true
}
```

**Response (Production with Upstash):**
```json
{
  "taskCount": 0,
  "ageSeconds": 15,
  "isRefreshing": false,
  "useRedis": true,
  "cacheExists": true,
  "cacheTTL": 45
}
```

## How Updates Work

When you update a task (e.g., mark as done):

1. **Update Notion API** (source of truth)
2. **Invalidate Redis cache** (production) or **update memory** (local)
3. **Next request fetches fresh** data from Notion

**Result:** Immediate consistency - you always see your latest changes!

## Benefits

### ✅ Fast Response Times
- Redis cache hit: ~10-50ms
- Notion API direct: ~500-2000ms

### ✅ Shared Cache
All Vercel serverless instances share the same Redis cache - consistent experience.

### ✅ Reduced Notion API Calls
- Without cache: Every request hits Notion = slow + rate limit risk
- With cache: One Notion call per 60s = fast + safe

### ✅ Immediate Updates
Cache invalidation ensures updates are visible immediately.

### ✅ Auto-scaling
Upstash Redis scales automatically with your traffic.

### ✅ Works Locally
Local dev uses in-memory store - no Redis setup needed for development.

## Cost

Upstash Pricing (2025):
- **Free tier**: 10,000 commands/day, Max 256MB
- **Pay as you go**: $0.2 per 100K commands

### Typical Usage
- Cache read: 1 command
- Cache write: 1 command  
- Cache invalidation: 1 command
- TTL check: 1 command

**Example for 1000 users/day:**
- ~3000 requests/day
- ~6000-9000 commands/day
- **Cost: FREE** (well within free tier)

## Troubleshooting

### Redis Not Working

**Verify environment variables:**
```bash
# In Vercel Dashboard
vercel env ls

# Should show:
# UPSTASH_REDIS_REST_URL
# UPSTASH_REDIS_REST_TOKEN
```

**Check logs:**
```bash
# Vercel dashboard → Functions → Logs
# Look for: "[redis-cache]" messages
```

### Slow Responses

**Solution 1:** Check Redis region
- Ensure Redis is in same region as Vercel

**Solution 2:** Increase TTL
```bash
CACHE_TTL_SECONDS=120
```

### Stale Data After Updates

This shouldn't happen (cache invalidation). If it does:

1. Check update endpoint logs for errors
2. Manually check Redis:
```bash
# Upstash Console → Data Browser
# Key: notion:tasks:all
# Delete it if stale
```

### "Redis connection failed"

**Possible causes:**
1. Wrong credentials
2. Database paused (Upstash auto-pauses inactive DBs after 28 days)
3. Region firewall issues

**Solution:**
- Verify credentials in Upstash console
- Wake up database by visiting Upstash dashboard
- Try recreating database

## Upstash Dashboard

View cache activity:
1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your database
3. View:
   - **Metrics**: Requests, latency, errors
   - **Data Browser**: Current cached data
   - **Logs**: Recent operations

## Migration from Old Cache

The old `lib/cache.ts` has been replaced with:
- `lib/redis-cache.ts` - Simple Redis wrapper
- `lib/memory-store.ts` - Hybrid store (memory + Redis)

Old SWR cache issues:
- ❌ Complex stale-while-revalidate logic
- ❌ Returned stale data after updates
- ❌ Rate limit complications

New Redis cache benefits:
- ✅ Simple TTL-based caching
- ✅ Immediate consistency after updates
- ✅ Clean cache invalidation
- ✅ Works in both local and production

## Files

- `lib/redis-cache.ts` - Upstash Redis wrapper
- `lib/memory-store.ts` - Hybrid store (memory + Redis)
- `components/StoreStatusIndicator.tsx` - Shows cache status
- `api/tasks.ts` - Uses hybrid store
- `api/tasks/[id].ts` - Invalidates cache on updates

## Environment Variables Summary

```bash
# Required for Production (Vercel) - Choose ONE format:

# Format 1: Redis URL (Simplest)
KV_URL=rediss://default:TOKEN@host.upstash.io:6379

# Format 2: REST API (Alternative)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Optional (both environments)
CACHE_TTL_SECONDS=60  # Cache expiration time
REFRESH_INTERVAL_SECONDS=60  # Local dev only

# Already configured
NOTION_API_KEY=your_notion_key
NOTION_DATABASE_ID=your_database_id
```

## Quick Start Checklist

- [ ] Create Upstash account
- [ ] Create Redis database
- [ ] Copy URL and token
- [ ] Add to Vercel environment variables
- [ ] Deploy to Vercel
- [ ] Test at your-app.vercel.app
- [ ] Check status indicator (should show "Cached X ago")
- [ ] Update a task (should see immediate change)

Your app is now production-ready with fast, consistent caching! 🚀

