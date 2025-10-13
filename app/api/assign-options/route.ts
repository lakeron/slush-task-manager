import { NextRequest, NextResponse } from 'next/server';
import { getAssignOptions, NOTION_DATABASE_ID } from '@/lib/notion';
import { withSWRCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.' },
        { status: 500 }
      );
    }
    const key = 'notion:assign:options';
    const result = await withSWRCache(key, () => getAssignOptions(), { freshTtl: 60, staleMaxAge: 300 });
    const headers = new Headers(result.headers);
    return new NextResponse(JSON.stringify({ options: result.data }), { status: 200, headers });
  } catch (error) {
    console.error('Error in assign-options API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assign options' },
      { status: 500 }
    );
  }
}


