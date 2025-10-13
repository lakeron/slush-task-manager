import '../lib/loadEnv.js';
import { getNotionTasks, getFilteredTasks, NOTION_DATABASE_ID } from '../lib/notion.js';
import { withSWRCache } from '../lib/cache.js';

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

    const team = (req.query.team as string) || undefined;
    const assignee = (req.query.assignee as string) || undefined;
    const status = (req.query.status as string) || undefined;

    if (team || assignee || status) {
      const filters: any = {};
      if (team) filters.team = team;
      if (assignee) filters.assignee = assignee;
      if (status) filters.status = status;

      const key = `notion:tasks:filtered:${team || 'any'}:${assignee || 'any'}:${status || 'any'}`;
      const result = await withSWRCache(key, () => getFilteredTasks(filters));
      Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
      res.status(200).json({ tasks: result.data });
      return;
    }

    const key = 'notion:tasks:all';
    const result = await withSWRCache(key, () => getNotionTasks());
    Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
    res.status(200).json({ tasks: result.data });
  } catch (error) {
    console.error('Error in tasks API:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}


