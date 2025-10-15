# Slush Task Manager

A task management web app that syncs with your Notion database. Built with Vite + React + TypeScript.

## Prerequisites

- Node.js 18.17 or higher
- A Notion account with API access
- A Notion database with tasks

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Notion Credentials

**Create Notion Integration:**
1. Go to https://www.notion.com/my-integrations
2. Click "New integration"
3. Name it (e.g., "Task Manager Dev")
4. Copy the "Internal Integration Secret" (this is your `NOTION_API_KEY`)

**Get Database ID:**
1. Open your Notion database in a browser
2. Copy the URL
3. Extract the 32-character ID:
   ```
   https://notion.so/workspace/a8aec43384f447ed84390e8e42c2e089?v=...
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                              This is your NOTION_DATABASE_ID
   ```

**Connect Integration to Database:**
1. In your Notion database, click the "⋯" menu (top right)
2. Click "Add connections"
3. Select your integration

### 3. Configure Environment

Create `.env.local` in the project root:

```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=a8aec43384f447ed84390e8e42c2e089
```

Optional Redis cache (for production):
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
CACHE_FRESH_TTL_SECONDS=60
CACHE_STALE_MAX_AGE_SECONDS=300
```

### 4. Notion Database Structure

Your database must have these properties:

| Property   | Type       | Required | Notes                                    |
|------------|------------|----------|------------------------------------------|
| Name       | Title      | ✅ Yes   | Task title                               |
| Status     | Select     | ✅ Yes   | Options: "Not Started", "In Progress", "Done" |
| Team       | Select     | ❌ No    | Your team names                          |
| Assignee   | People     | ❌ No    | Task assignee                            |
| Due Date   | Date       | ❌ No    | Task deadline                            |
| Priority   | Select     | ❌ No    | Options: "Low", "Medium", "High"         |
| Description| Rich Text  | ❌ No    | Task details                             |

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- **Vite dev server** on http://localhost:5173 (UI)
- **Express API server** on http://localhost:3000 (API endpoints)

Open http://localhost:5173 in your browser.

### Development Commands

```bash
npm run dev        # Start both UI and API servers
npm run dev:vite   # Start only UI server
npm run dev:api    # Start only API server
npm run build      # Build for production
npm run preview    # Preview production build
```

## Vercel Deployment

### 1. Connect to Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy
vercel
```

Or connect via GitHub:
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository

### 2. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=a8aec43384f447ed84390e8e42c2e089
```

**Important:** Add these for all environments (Production, Preview, Development)

### 3. Deploy

Vercel auto-deploys on push to main branch.

Or manually:
```bash
vercel --prod
```

### 4. Verify Deployment

Check these endpoints:
- `https://your-app.vercel.app/` - UI should load
- `https://your-app.vercel.app/api/health` - Should return `{"ok":true,"notion":{"ok":true}}`
- `https://your-app.vercel.app/api/tasks` - Should return tasks JSON

If `/api/health` shows `"notion":{"ok":false}`, check:
- Environment variables are set correctly
- Notion integration has database access
- Database ID is correct

## Troubleshooting

### "Error loading tasks" in UI

**Check 1: Environment Variables**
```bash
# Local: Ensure .env.local exists with correct values
cat .env.local

# Vercel: Check Settings → Environment Variables
```

**Check 2: Notion Integration Access**
```
1. Open your database in Notion
2. Click "⋯" → "Connections"
3. Your integration should be listed
4. If not, click "Add connections" and select it
```

**Check 3: Database Property Names**
```
Property names are case-sensitive and must match exactly:
- "Name" (not "name" or "Title")
- "Status" (not "status")
- etc.
```

### API Errors (500, Module Not Found)

**Local Development:**
```bash
# Restart servers
pkill -f vite; pkill -f dev-api
npm run dev
```

**Vercel:**
- Check build logs in Vercel Dashboard
- Verify all `.ts` files use `.js` extensions in imports:
  ```typescript
  // ✅ Correct
  import { something } from '../lib/notion.js';
  
  // ❌ Wrong
  import { something } from '../lib/notion';
  ```

### Build Failures

**"Cannot use import statement outside a module"**
- Check `package.json` has `"type": "module"`
- CommonJS config files must use `.cjs` extension

**"Failed to load PostCSS config"**
- Ensure `postcss.config.cjs` and `tailwind.config.cjs` have `.cjs` extension

## Project Structure

```
notion-web/
├── api/                    # Serverless functions (Vercel)
│   ├── tasks.ts           # GET /api/tasks
│   ├── tasks/[id].ts      # PATCH /api/tasks/:id
│   ├── assignees.ts       # GET /api/assignees
│   ├── assign-options.ts  # GET /api/assign-options
│   └── health.ts          # GET /api/health
├── server/
│   └── dev-api.ts         # Local Express API (dev only)
├── src/
│   ├── App.tsx            # Root React component
│   ├── main.tsx           # Vite entry point
│   └── index.css          # Base styles
├── components/
│   └── TaskDashboard.tsx  # Main UI component
├── lib/
│   ├── notion.ts          # Notion API client
│   ├── cache.ts           # SWR cache headers
│   ├── utils.ts           # Utility functions
│   └── loadEnv.ts         # Env loader
├── types/
│   └── notion.ts          # TypeScript types
├── .env.local             # Local environment (not committed)
├── package.json           # Dependencies & scripts
├── vite.config.ts         # Vite configuration
├── vercel.json            # Vercel build config
└── tsconfig.json          # TypeScript config
```

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **API:** Notion SDK + Vercel Serverless Functions
- **Data Fetching:** SWR (stale-while-revalidate)
- **Local Dev:** Express + tsx
- **Deployment:** Vercel

## License

MIT
