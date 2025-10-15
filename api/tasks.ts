import '../lib/loadEnv.js';
import { NOTION_DATABASE_ID } from '../lib/notion.js';
import { getTasks } from '../lib/memory-store.js';

export default async function handler(req: any, res: any) {
  try {
    if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
      res.status(500).json({ error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.' });
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Get all tasks from memory store
    const allTasks = await getTasks();

    // Apply client-side filtering if needed
    const team = (req.query.team as string) || undefined;
    const assignee = (req.query.assignee as string) || undefined;
    const status = (req.query.status as string) || undefined;

    let filteredTasks = allTasks;

    if (team || assignee || status) {
      filteredTasks = allTasks.filter(task => {
        if (team && task.team !== team) return false;
        if (assignee && task.assign !== assignee) return false;
        if (status && task.status !== status) return false;
        return true;
      });
    }

    res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error('Error in tasks API:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}


