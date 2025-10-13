# Slush Task Manager

A modern web application that connects to your Notion database for task management with sorting, filtering, and status management capabilities.

## Features

- 🔗 **Notion Integration**: Connect directly to your Notion database
- 🎯 **Smart Filtering**: Filter tasks by team and assignee
- 📅 **Date Sorting**: Sort tasks by creation date, due date, or last modified
- ✅ **Status Management**: Toggle tasks between "Done" and "In Progress"
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- ⚡ **Real-time Updates**: Changes sync immediately with Notion

## Prerequisites

Before running this application, you need:

1. A Notion account with a database containing tasks
2. A Notion integration with API access
3. Node.js 18+ installed on your system

## Notion Database Setup

Your Notion database should have these properties:

- **Name** (Title): Task title
- **Status** (Select): Options should include "Not Started", "In Progress", "Done"
- **Team** (Select): Team names
- **Assignee** (People): Person assigned to the task
- **Due Date** (Date): Optional due date
- **Priority** (Select): Optional priority levels (Low, Medium, High)
- **Description** (Rich Text): Optional task description

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd slush-task-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Notion credentials and optional Redis cache settings:
   ```
   NOTION_API_KEY=your_notion_integration_secret
   NOTION_DATABASE_ID=your_database_id
   # Optional: Upstash Redis for shared cache (recommended for serverless)
   UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
   # Optional: Cache tuning
   CACHE_FRESH_TTL_SECONDS=60
   CACHE_STALE_MAX_AGE_SECONDS=300
   ```

4. **Get your Notion API key**
   - Go to https://www.notion.com/my-integrations
   - Click "New integration"
   - Name your integration and select your workspace
   - Copy the "Internal Integration Secret"

5. **Get your Database ID**
   - Open your Notion database
   - Copy the URL - the database ID is the 32-character string after the last slash
   - Example: `https://notion.so/myworkspace/a8aec43384f447ed84390e8e42c2e089?v=...`
   - Database ID: `a8aec43384f447ed84390e8e42c2e089`

6. **Connect your integration to the database**
   - In your Notion database, click the "..." menu
   - Select "Add connections"
   - Choose your integration

7. **Run the development server**
   ```bash
   npm run dev
   ```

   Open http://localhost:5173 to see the application.

## Deployment on v0

This application is optimized for deployment on v0 (Vercel's AI-powered development platform):

### Method 1: Direct v0 Creation

1. Go to [v0.dev](https://v0.dev)
2. Use this prompt:

```
Create a task management web app with the following features:
- Connects to Notion database for tasks
- Filter tasks by team and assignee
- Sort tasks by date (created, modified, due date)
- Toggle task status between "Done" and "In Progress"
- View completed tasks separately
- Responsive design with Tailwind CSS

Use the code structure from this GitHub repository: [paste your repo URL]
```

### Method 2: Manual Setup on v0

1. Upload the project files to v0
2. Ensure these key files are included:
   - `package.json`
   - `vite.config.ts`
   - `tailwind.config.js`
   - `index.html`
   - All files in `/src`, `/components`, `/lib`, `/api`, and `/types` directories

3. Set environment variables in v0:
   - `NOTION_API_KEY`
   - `NOTION_DATABASE_ID`

### Method 3: Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with one click

## Usage

### Main Dashboard

- **View Active Tasks**: See all tasks that are not marked as "Done"
- **View Completed Tasks**: Toggle to see all completed tasks
- **Filter by Team**: Use dropdown to filter tasks by team
- **Filter by Assignee**: Use dropdown to filter tasks by assignee
- **Sort Options**: Click sort buttons to sort by creation date, due date, last modified, or title

### Task Management

- **Mark as Done**: Click "Mark Done" button on any active task
- **Reopen Task**: Click "Reopen Task" button on completed tasks to move back to "In Progress"
- **Real-time Sync**: All changes are immediately synced with your Notion database

## API Endpoints

- `GET /api/tasks` - Fetch all tasks with optional filters
- `PATCH /api/tasks/[id]` - Update task status

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom design system
- **Data Fetching**: SWR for real-time data synchronization
- **API Integration**: Notion SDK
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Customization

### Adding New Task Properties

1. Update the `NotionTask` interface in `/types/notion.ts`
2. Modify the data mapping in `/lib/notion.ts`
3. Update the UI components in `/components/TaskDashboard.tsx`

### Styling

The application uses Tailwind CSS with a custom design system. You can modify:
- Colors and themes in `tailwind.config.js`
- Global styles in `app/globals.css`
- Component styles directly in the React components

## Troubleshooting

### Common Issues

1. **"Failed to fetch tasks" error**
   - Check your Notion API key and database ID
   - Ensure the integration has access to your database
   - Verify database property names match the code
   - If using Redis cache, verify Upstash env vars are set correctly

2. **Tasks not updating**
   - Check browser console for errors
   - Verify network connectivity
   - Ensure proper API endpoint configuration

3. **Styling issues on v0**
   - Make sure all Tailwind classes are properly configured
   - Check that PostCSS configuration is included

### Debug Mode

Add `console.log` statements in `/lib/notion.ts` to debug API responses. You can also inspect cache behavior via response headers (`X-Cache`, `X-Cache-Fresh`, `X-Cooldown`):

```javascript
console.log('Notion API Response:', response);
console.log('Parsed Tasks:', tasks);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.