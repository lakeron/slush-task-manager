# Vercel Deployment Guide

Quick guide for deploying Slush Task Manager to Vercel.

## Quick Deploy

### Option 1: Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_URL)

### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Add environment variables (see below)
5. Click "Deploy"

### Option 3: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

## Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Required

```
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=a8aec43384f447ed84390e8e42c2e089
```

### Optional (Redis Cache)

```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
CACHE_FRESH_TTL_SECONDS=60
CACHE_STALE_MAX_AGE_SECONDS=300
```

**Important:**
- Set variables for ALL environments (Production, Preview, Development)
- Redeploy after adding/changing environment variables

## Getting Notion Credentials

### Step 1: Create Integration

1. Go to https://www.notion.com/my-integrations
2. Click "New integration"
3. Name: "Task Manager Production"
4. Select workspace
5. Copy "Internal Integration Secret" → This is `NOTION_API_KEY`

### Step 2: Get Database ID

1. Open your Notion database
2. Click "Share" → "Copy link"
3. Extract ID from URL:
   ```
   https://notion.so/workspace/a8aec43384f447ed84390e8e42c2e089?v=...
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                              This is NOTION_DATABASE_ID
   ```

### Step 3: Connect Integration

1. In Notion database, click "⋯" menu
2. Click "Add connections"
3. Select your integration

## Verify Deployment

After deployment, test these URLs:

### 1. Health Check
```
https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "ok": true,
  "env": {
    "hasNotionApiKey": true,
    "notionDatabaseIdLength": 32,
    "nodeEnv": "production",
    "vercel": "1"
  },
  "notion": {
    "ok": true
  }
}
```

### 2. Tasks API
```
https://your-app.vercel.app/api/tasks
```

Should return JSON with tasks array.

### 3. Main App
```
https://your-app.vercel.app/
```

Should display task dashboard.

## Common Deployment Issues

### Issue 1: "FUNCTION_INVOCATION_FAILED"

**Cause:** Environment variables not set or Notion access denied

**Fix:**
1. Check `/api/health` endpoint
2. If `hasNotionApiKey: false` → Set `NOTION_API_KEY` in Vercel
3. If `notion.ok: false` → Check error message and database access

### Issue 2: "Cannot use import statement outside a module"

**Cause:** Missing `"type": "module"` in package.json

**Fix:**
```json
{
  "type": "module"
}
```

Already configured in this project.

### Issue 3: "Failed to load PostCSS config"

**Cause:** Config files need `.cjs` extension when using ESM

**Fix:**
Rename:
- `postcss.config.js` → `postcss.config.cjs`
- `tailwind.config.js` → `tailwind.config.cjs`

Already configured in this project.

### Issue 4: Module Resolution Errors

**Cause:** Missing `.js` extensions in import statements

**Fix:**
All imports in `api/*` files must include `.js` extension:

```typescript
// ✅ Correct
import { notion } from '../lib/notion.js';

// ❌ Wrong
import { notion } from '../lib/notion';
```

Already configured in this project.

### Issue 5: Build Timeout or Failure

**Check Vercel Build Logs:**
1. Go to Vercel Dashboard
2. Click on failed deployment
3. View "Build Logs" tab
4. Look for specific error messages

**Common Fixes:**
- Ensure all dependencies are in `package.json`
- Check TypeScript errors: `npm run build` locally
- Verify no circular dependencies

## Environment-Specific Configs

### Production
- Full caching with Redis (if configured)
- Error tracking enabled
- Optimized builds

### Preview (PR Deploys)
- Same as production
- Separate environment variables supported
- Great for testing before merge

### Development
- Use local `.env.local` file
- Redis optional
- Hot reload enabled

## Notion Database Requirements

Your Notion database must have:

| Property | Type   | Required |
|----------|--------|----------|
| Name     | Title  | ✅       |
| Status   | Select | ✅       |
| Team     | Select | ❌       |
| Assignee | People | ❌       |
| Due Date | Date   | ❌       |
| Priority | Select | ❌       |

**Status Select Options:**
- "Not Started"
- "In Progress"
- "Done"

## Performance Optimization

### Enable Redis Caching

1. Create free account at https://upstash.com
2. Create Redis database
3. Copy REST URL and token
4. Add to Vercel environment variables

**Benefits:**
- Reduced Notion API calls
- Faster response times
- Lower rate limit usage
- Shared cache across serverless functions

### Monitor Usage

Check Vercel Analytics:
- Function execution time
- Error rates
- Cache hit rates (via headers: `X-Cache: HIT`)

## Troubleshooting Commands

### Check Deployment Status
```bash
vercel ls
```

### View Logs
```bash
vercel logs YOUR_DEPLOYMENT_URL
```

### Test Production Build Locally
```bash
npm run build
npm run preview
```

### Force Redeploy
```bash
vercel --prod --force
```

## Security Notes

- Never commit `.env.local` to git
- Rotate Notion API keys periodically
- Use separate integrations for dev/prod
- Enable Vercel deployment protection for staging
- Review Notion integration permissions

## Support

**Vercel Issues:**
- Check https://vercel.com/docs
- View build logs in dashboard
- Use `vercel logs` command

**Notion API Issues:**
- Check https://developers.notion.com
- Verify database property names
- Test with Notion API explorer

**Project Issues:**
- Check local build: `npm run build`
- Test endpoints: `npm run dev`
- Review `/api/health` response

