import { NextRequest, NextResponse } from 'next/server';
import { updateTaskStatus, updateTaskTeam, updateTaskAssignee, updateTaskAssign } from '../../../../lib/notion';
import { updateTask } from '../../../../lib/memory-store';

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

    // Prepare updates for memory store
    const memoryUpdates: any = {};

    // Update Notion API first
    if (typeof status !== 'undefined') {
      await updateTaskStatus(taskId, status);
      memoryUpdates.status = status;
    }
    if (typeof team !== 'undefined') {
      await updateTaskTeam(taskId, team || null);
      memoryUpdates.team = team || undefined;
    }
    if (typeof assigneeId !== 'undefined') {
      await updateTaskAssignee(taskId, assigneeId || null);
      memoryUpdates.assigneeId = assigneeId || undefined;
    }
    if (typeof assign !== 'undefined') {
      await updateTaskAssign(taskId, assign || null);
      memoryUpdates.assign = assign || undefined;
    }

    // Update memory store immediately after successful Notion update
    if (Object.keys(memoryUpdates).length > 0) {
      updateTask(taskId, memoryUpdates);
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