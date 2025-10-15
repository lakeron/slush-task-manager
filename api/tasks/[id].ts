import '../../lib/loadEnv.js';
import { updateTaskStatus, updateTaskTeam, updateTaskAssignee, updateTaskAssign } from '../../lib/notion.js';
import { updateTask } from '../../lib/memory-store.js';

export default async function handler(req: any, res: any) {
  try {
    if (!process.env.NOTION_API_KEY) {
      res.status(500).json({ error: 'Notion credentials missing. Set NOTION_API_KEY.' });
      return;
    }

    const { id } = req.query as { id: string };

    if (req.method !== 'PATCH') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const { status, team, assigneeId, assign } = req.body || {};

    // Prepare updates for memory store
    const memoryUpdates: any = {};

    // Update Notion API first
    if (typeof status !== 'undefined') {
      await updateTaskStatus(id, status);
      memoryUpdates.status = status;
    }
    if (typeof team !== 'undefined') {
      await updateTaskTeam(id, team || null);
      memoryUpdates.team = team || undefined;
    }
    if (typeof assigneeId !== 'undefined') {
      await updateTaskAssignee(id, assigneeId || null);
      memoryUpdates.assigneeId = assigneeId || undefined;
    }
    if (typeof assign !== 'undefined') {
      await updateTaskAssign(id, assign || null);
      memoryUpdates.assign = assign || undefined;
    }

    // Update memory store immediately after successful Notion update
    if (Object.keys(memoryUpdates).length > 0) {
      updateTask(id, memoryUpdates);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
}


