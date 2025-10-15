import '../lib/loadEnv.js';
import { getAssignees, NOTION_DATABASE_ID } from '../lib/notion.js';

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
    const assignees = await getAssignees();
    res.status(200).json({ assignees });
  } catch (error) {
    console.error('Error in assignees API:', error);
    res.status(500).json({ error: 'Failed to fetch assignees' });
  }
}


