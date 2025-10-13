import { getAssignees, NOTION_DATABASE_ID } from '@/lib/notion';
import { withSWRCache } from '@/lib/cache';
export default async function handler(req, res) {
    try {
        if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
            res.status(500).json({ error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.' });
            return;
        }
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method Not Allowed' });
            return;
        }
        const key = 'notion:assignees:list';
        const result = await withSWRCache(key, () => getAssignees(), { freshTtl: 60, staleMaxAge: 300 });
        Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
        res.status(200).json({ assignees: result.data });
    }
    catch (error) {
        console.error('Error in assignees API:', error);
        res.status(500).json({ error: 'Failed to fetch assignees' });
    }
}
