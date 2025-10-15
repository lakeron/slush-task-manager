import { NextRequest, NextResponse } from 'next/server';
import { getAssignees, NOTION_DATABASE_ID } from '../../../lib/notion';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.' },
        { status: 500 }
      );
    }
    const assignees = await getAssignees();
    return NextResponse.json({ assignees });
  } catch (error) {
    console.error('Error in assignees API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignees' },
      { status: 500 }
    );
  }
}


