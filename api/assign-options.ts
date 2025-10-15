import '../lib/loadEnv.js';
import { getAssignOptions, NOTION_DATABASE_ID } from '../lib/notion.js';

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
    const options = await getAssignOptions();
    res.status(200).json({ options });
  } catch (error) {
    console.error('Error in assign-options API:', error);
    res.status(500).json({ error: 'Failed to fetch assign options' });
  }
}


