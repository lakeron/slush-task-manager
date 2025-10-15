import type { Request, Response } from 'express';
import { forceRefresh } from '../lib/memory-store.js';

/**
 * Force refresh tasks from Notion
 * Bypasses cache and fetches fresh data
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[api/refresh] Force refresh requested');
    const tasks = await forceRefresh();
    
    return res.status(200).json({
      success: true,
      taskCount: tasks.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[api/refresh] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh',
    });
  }
}

