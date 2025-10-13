# V0 Deployment Guide for Izipizi Task Manager

This guide provides specific instructions for deploying the Izipizi Task Manager on v0.dev.

## Quick V0 Setup

### Method 1: Upload Project Files

1. **Go to [v0.dev](https://v0.dev)**
2. **Create a new project**
3. **Upload these key files:**
   ```
   ├── package.json
   ├── next.config.js
   ├── tailwind.config.js
   ├── tsconfig.json
   ├── postcss.config.js
   ├── app/
   │   ├── layout.tsx
   │   ├── page.tsx
   │   ├── globals.css
   │   └── api/
   │       └── tasks/
   │           ├── route.ts
   │           └── [id]/route.ts
   ├── components/
   │   └── TaskDashboard.tsx
   ├── lib/
   │   ├── notion.ts
   │   └── utils.ts
   └── types/
       └── notion.ts
   ```

### Method 2: Use V0 Prompt

Use this prompt in v0.dev to recreate the application:

```
Create a modern task management web application with the following specifications:

CORE FEATURES:
- Connect to Notion database for task management
- Filter tasks by team and assignee using dropdown selects
- Sort tasks by date (created date, due date, last modified date, title)
- Toggle task status between "Done" and "In Progress"
- View completed tasks separately from active tasks
- Responsive design with Tailwind CSS

TECHNICAL REQUIREMENTS:
- Next.js 14 with App Router
- TypeScript for type safety
- SWR for data fetching and caching
- Lucide React for icons
- Notion SDK for API integration

UI COMPONENTS:
- Header with app title and Notion connection status
- Filter dropdowns for team and assignee
- Sort buttons with active state indicators
- Task cards in responsive grid layout
- Status badges with color coding
- Action buttons (Mark Done/Reopen Task)
- Toggle between active and completed task views

DESIGN:
- Clean, modern interface with subtle shadows
- Color-coded status indicators (green=done, blue=in progress, gray=not started)
- Priority badges (red=high, yellow=medium, green=low)
- Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
- Hover effects and smooth transitions

NOTION INTEGRATION:
- Environment variables: NOTION_API_KEY, NOTION_DATABASE_ID
- Database properties: Name (title), Status (select), Team (select), Assignee (people), Due Date (date), Priority (select), Description (rich text)
- Real-time updates with optimistic UI
- Error handling for API failures

Please create all necessary files including API routes, components, types, and configuration files.
```

### Method 3: Git Repository Import

1. **Push your code to GitHub**
2. **In v0.dev, import from GitHub repository**
3. **Select this repository**

## Environment Variables for V0

In your v0 project settings, add these environment variables:

```env
NOTION_API_KEY=your_notion_integration_secret_here
NOTION_DATABASE_ID=your_32_character_database_id_here
```

### Getting Your Credentials

**Notion API Key:**
1. Visit [https://www.notion.com/my-integrations](https://www.notion.com/my-integrations)
2. Click "New integration"
3. Name: "Izipizi Task Manager"
4. Select your workspace
5. Copy the "Internal Integration Secret"

**Database ID:**
1. Open your Notion database in browser
2. Copy the URL
3. Extract the 32-character ID from URL
   - Example: `https://notion.so/workspace/a8aec43384f447ed84390e8e42c2e089?v=...`
   - Database ID: `a8aec43384f447ed84390e8e42c2e089`

**Connect Integration:**
1. In your Notion database, click "..." menu
2. Select "Add connections"
3. Choose your integration

## Required Notion Database Structure

Your Notion database must have these exact property names:

| Property Name | Type | Options | Required |
|---------------|------|---------|----------|
| Name | Title | - | ✅ Yes |
| Status | Select | "Not Started", "In Progress", "Done" | ✅ Yes |
| Team | Select | Your team names | ❌ No |
| Assignee | People | - | ❌ No |
| Due Date | Date | - | ❌ No |
| Priority | Select | "Low", "Medium", "High" | ❌ No |
| Description | Rich Text | - | ❌ No |

## V0-Specific Configuration

The application is already configured for v0 with:

- ✅ Next.js 14 App Router
- ✅ Tailwind CSS with PostCSS
- ✅ TypeScript configuration
- ✅ Dynamic API routes properly configured
- ✅ No custom server requirements
- ✅ All dependencies from npm registry
- ✅ Responsive design
- ✅ No file system dependencies

## Testing Your Deployment

1. **Deploy to v0**
2. **Add environment variables**
3. **Test these features:**
   - [ ] Tasks load from Notion database
   - [ ] Team and assignee filters work
   - [ ] Date sorting functions correctly
   - [ ] Can mark tasks as Done
   - [ ] Can reopen completed tasks
   - [ ] Toggle between active/completed views works
   - [ ] Responsive design on mobile

## Troubleshooting on V0

### Common Issues:

1. **"Failed to fetch tasks" error**
   - Verify environment variables are set correctly in v0
   - Check Notion integration has database access
   - Ensure database property names match exactly

2. **Build failures**
   - Check all dependencies are in package.json
   - Verify TypeScript configuration
   - Ensure no file system imports

3. **Styling issues**
   - Verify Tailwind config is included
   - Check PostCSS configuration
   - Ensure all CSS classes are valid

4. **API route errors**
   - Check v0 logs for detailed error messages
   - Verify Notion API credentials
   - Test database connection

### Debug Steps:

1. **Check v0 build logs** for detailed error messages
2. **Test API endpoints** directly in browser:
   - `/api/tasks` - should return task data
   - `/api/tasks/[task-id]` - for status updates
3. **Verify Notion setup** by testing API calls manually
4. **Check browser console** for client-side errors

## Support

If you encounter issues specific to v0 deployment:
1. Check v0.dev documentation
2. Review build logs in v0 dashboard
3. Test locally first with `npm run dev`
4. Verify environment variables are properly set

The application is fully compatible with v0.dev's hosting environment and should deploy without modifications.