import { updateTaskStatus, updateTaskTeam, updateTaskAssignee, updateTaskAssign } from '@/lib/notion';
import { deleteByPrefix } from '@/lib/cache';
export default async function handler(req, res) {
    try {
        if (!process.env.NOTION_API_KEY) {
            res.status(500).json({ error: 'Notion credentials missing. Set NOTION_API_KEY.' });
            return;
        }
        const { id } = req.query;
        if (req.method !== 'PATCH') {
            res.status(405).json({ error: 'Method Not Allowed' });
            return;
        }
        const { status, team, assigneeId, assign } = req.body || {};
        if (typeof status !== 'undefined') {
            await updateTaskStatus(id, status);
        }
        if (typeof team !== 'undefined') {
            await updateTaskTeam(id, team || null);
        }
        if (typeof assigneeId !== 'undefined') {
            await updateTaskAssignee(id, assigneeId || null);
        }
        if (typeof assign !== 'undefined') {
            await updateTaskAssign(id, assign || null);
        }
        try {
            await deleteByPrefix('notion:tasks:');
        }
        catch (e) {
            console.error('Cache invalidation error:', e);
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
}
