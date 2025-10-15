# Quick Setup Guide

Get up and running in 5 minutes.

## Local Development

### 1. Install
```bash
npm install
```

### 2. Create `.env.local`
```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=a8aec43384f447ed84390e8e42c2e089
```

### 3. Start
```bash
npm run dev
```

Open http://localhost:5173

---

## Get Notion Credentials

### API Key
1. Go to https://www.notion.com/my-integrations
2. Click "New integration"
3. Copy "Internal Integration Secret"

### Database ID
1. Open database in browser
2. Copy URL, extract 32-character ID:
   ```
   https://notion.so/.../a8aec43384f447ed84390e8e42c2e089?v=...
                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ```

### Connect Integration
1. In database, click "⋯" → "Add connections"
2. Select your integration

---

## Deploy to Vercel

### One-Time Setup
```bash
# Install CLI
npm i -g vercel

# Login
vercel login
```

### Deploy
```bash
vercel
```

### Set Environment Variables
Vercel Dashboard → Settings → Environment Variables:
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`

**Important:** Add for all environments, then redeploy.

---

## Verify

### Local
- UI: http://localhost:5173
- API: http://localhost:5173/api/tasks
- Health: http://localhost:5173/api/health

### Vercel
- UI: https://your-app.vercel.app/
- API: https://your-app.vercel.app/api/tasks
- Health: https://your-app.vercel.app/api/health

Health should return:
```json
{
  "ok": true,
  "notion": { "ok": true }
}
```

If `notion.ok` is `false`, check:
1. Environment variables set correctly
2. Integration has database access
3. Database ID is correct

---

## Database Structure

Required properties:

| Property | Type   |
|----------|--------|
| Name     | Title  |
| Status   | Select |

Status options: "Not Started", "In Progress", "Done"

Optional: Team (Select), Assignee (People), Due Date (Date), Priority (Select)

---

## Troubleshooting

### "Error loading tasks"
- Check `.env.local` exists with correct values
- Verify integration connected to database
- Check console for API errors

### Build errors
- Run `npm run build` locally first
- Check Vercel build logs
- Verify all imports use `.js` extensions

### API 500 errors
- Check `/api/health` for detailed error
- Verify Notion credentials
- Check database property names match exactly

---

For detailed documentation:
- **Local Development:** See [README.md](README.md)
- **Vercel Deployment:** See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

