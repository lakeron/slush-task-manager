import { NextRequest, NextResponse } from 'next/server';
import { getNotionTasks, getFilteredTasks, NOTION_DATABASE_ID } from '../../../lib/notion';
import { withSWRCache } from '../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.' },
        { status: 500 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams.get('team');
    const assignee = searchParams.get('assignee');
    const status = searchParams.get('status');

    let tasks;

    if (team || assignee || status) {
      const filters: any = {};
      if (team) filters.team = team;
      if (assignee) filters.assignee = assignee;
      if (status) filters.status = status;

      const key = `notion:tasks:filtered:${team || 'any'}:${assignee || 'any'}:${status || 'any'}`;
      const result = await withSWRCache(key, () => getFilteredTasks(filters));
      const headers = new Headers(result.headers);
      return new NextResponse(JSON.stringify({ tasks: result.data }), { status: 200, headers });
    } else {
      const key = 'notion:tasks:all';
      const result = await withSWRCache(key, () => getNotionTasks());
      const headers = new Headers(result.headers);
      return new NextResponse(JSON.stringify({ tasks: result.data }), { status: 200, headers });
    }
  } catch (error) {
    console.error('Error in tasks API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}