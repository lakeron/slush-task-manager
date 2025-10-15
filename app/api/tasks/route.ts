import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DATABASE_ID } from '../../../lib/notion';
import { getTasks } from '../../../lib/memory-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.' },
        { status: 500 }
      );
    }
    
    // Get all tasks from memory store
    const allTasks = await getTasks();
    
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams.get('team');
    const assignee = searchParams.get('assignee');
    const status = searchParams.get('status');

    // Apply client-side filtering if needed
    let filteredTasks = allTasks;

    if (team || assignee || status) {
      filteredTasks = allTasks.filter(task => {
        if (team && task.team !== team) return false;
        if (assignee && task.assign !== assignee) return false;
        if (status && task.status !== status) return false;
        return true;
      });
    }

    return NextResponse.json({ tasks: filteredTasks });
  } catch (error) {
    console.error('Error in tasks API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}