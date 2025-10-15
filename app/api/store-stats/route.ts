import { NextRequest, NextResponse } from 'next/server';
import { getStoreStats } from '../../../lib/memory-store';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const stats = await getStoreStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting store stats:', error);
    return NextResponse.json(
      { error: 'Failed to get store stats' },
      { status: 500 }
    );
  }
}

