import { NextRequest, NextResponse } from 'next/server';
import { updateTaskStatus, updateTaskTeam, updateTaskAssignee, updateTaskAssign } from '../../../../lib/notion';
import { deleteByPrefix } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json(
        { error: 'Notion credentials missing. Set NOTION_API_KEY.' },
        { status: 500 }
      );
    }
    const { status, team, assigneeId, assign } = await request.json();
    const taskId = params.id;

    if (typeof status !== 'undefined') {
      await updateTaskStatus(taskId, status);
    }
    if (typeof team !== 'undefined') {
      await updateTaskTeam(taskId, team || null);
    }
    if (typeof assigneeId !== 'undefined') {
      await updateTaskAssignee(taskId, assigneeId || null);
    }
    if (typeof assign !== 'undefined') {
      await updateTaskAssign(taskId, assign || null);
    }

    // Invalidate caches related to tasks so subsequent GET returns fresh
    try {
      await deleteByPrefix('notion:tasks:');
    } catch (e) {
      // avoid failing the request if invalidation fails
      console.error('Cache invalidation error:', e);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}