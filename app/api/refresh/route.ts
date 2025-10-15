import { NextRequest, NextResponse } from 'next/server';
import { forceRefresh } from '../../../lib/memory-store.js';

/**
 * Force refresh tasks from Notion
 * Bypasses cache and fetches fresh data
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[api/refresh] Force refresh requested');
    const tasks = await forceRefresh();
    
    return NextResponse.json({
      success: true,
      taskCount: tasks.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[api/refresh] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to refresh',
      },
      { status: 500 }
    );
  }
}

