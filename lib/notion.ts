import { Client } from '@notionhq/client';
import { NotionTask, NotionPage } from '../types/notion';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '';

if (!NOTION_API_KEY) {
  console.error('Missing NOTION_API_KEY environment variable');
}
if (!NOTION_DATABASE_ID) {
  console.error('Missing NOTION_DATABASE_ID environment variable');
}

const notion = new Client({
  auth: NOTION_API_KEY,
});

export async function getNotionTasks(): Promise<NotionTask[]> {
  try {
    const allResults: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    // Paginate through all results
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: NOTION_DATABASE_ID,
        start_cursor: startCursor,
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'descending',
          },
        ],
      });

      allResults.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;

      // Log pagination progress
      if (hasMore) {
        console.log(`[notion] Fetched ${allResults.length} tasks so far, fetching more...`);
      }
    }

    console.log(`[notion] Total tasks fetched: ${allResults.length}`);

    return allResults.map((page: any, index: number) => {
      const properties = page.properties;

      // Debug: Log properties of first few tasks to understand structure
      if (index < 3) {
        console.log(`[getNotionTasks] Task ${index} properties:`, Object.keys(properties));
        console.log(`[getNotionTasks] Task ${index} Assign property:`, properties.Assign);
        console.log(`[getNotionTasks] Task ${index} Assignee property:`, properties.Assignee);
      }

      return {
        id: page.id,
        title: properties.Name?.title?.[0]?.plain_text || 'Untitled',
        status: properties.Status?.select?.name || 'Not Started',
        assignee: properties.Assignee?.people?.[0]?.name || undefined,
        assigneeId: properties.Assignee?.people?.[0]?.id || undefined,
        assign: properties.Assign?.multi_select?.[0]?.name ||
                properties.Assign?.select?.name ||
                properties['Assigned to']?.select?.name ||
                properties['Assigned To']?.select?.name ||
                properties.assignedTo?.select?.name ||
                properties.assigned?.select?.name ||
                properties.Assignee?.people?.[0]?.name ||
                undefined,
        team: properties.Team?.select?.name || undefined,
        dueDate: properties['Due Date']?.date?.start || undefined,
        createdDate: page.created_time,
        lastModified: page.last_edited_time,
        priority: properties.Priority?.select?.name || undefined,
        description: properties.Description?.rich_text?.[0]?.plain_text || undefined,
      };
    });
  } catch (error: any) {
    const status = error?.status ?? error?.code;
    const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
    if (status === 429) {
      const e = new Error('Rate limited by Notion');
      (e as any).status = 429;
      (e as any).retryAfter = Number(retryAfter ?? 1);
      throw e;
    }
    console.error('Error fetching Notion tasks:', error);
    throw error;
  }
}

export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  try {
    await notion.pages.update({
      page_id: taskId,
      properties: {
        Status: {
          select: {
            name: status,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    throw new Error('Failed to update task status');
  }
}

export async function updateTaskTeam(taskId: string, teamName: string | null): Promise<void> {
  try {
    await notion.pages.update({
      page_id: taskId,
      properties: {
        Team: {
          select: teamName ? { name: teamName } : null,
        },
      },
    });
  } catch (error) {
    console.error('Error updating task team:', error);
    throw new Error('Failed to update task team');
  }
}

export async function updateTaskAssignee(taskId: string, assigneeId: string | null): Promise<void> {
  try {
    await notion.pages.update({
      page_id: taskId,
      properties: {
        Assignee: {
          people: assigneeId ? [{ id: assigneeId }] : [],
        },
      },
    });
  } catch (error) {
    console.error('Error updating task assignee:', error);
    throw new Error('Failed to update task assignee');
  }
}

export async function updateTaskAssign(taskId: string, assignName: string | null): Promise<void> {
  try {
    await notion.pages.update({
      page_id: taskId,
      properties: {
        Assign: {
          multi_select: assignName ? [{ name: assignName }] : [],
        },
      },
    });
  } catch (error) {
    console.error('Error updating task assign:', error);
    throw new Error('Failed to update task assign');
  }
}

export async function getAssignOptions(): Promise<string[]> {
  try {
    const meta = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });

    // Debug: Log all available properties
    console.log('[getAssignOptions] Available database properties:', Object.keys((meta as any)?.properties || {}));

    // Check for different possible field names
    const properties = (meta as any)?.properties || {};
    let assignProp = properties.Assign ||
                    properties['Assigned to'] ||
                    properties['Assigned To'] ||
                    properties.assignedTo ||
                    properties.assigned ||
                    properties.Assignee ||
                    properties.assignee;

    // Debug: Log the found assign property
    console.log('[getAssignOptions] Found assign property:', assignProp ? assignProp.type : 'none', assignProp);

    const options: string[] = (assignProp?.multi_select?.options || assignProp?.select?.options || []).map((o: any) => o?.name).filter(Boolean);
    console.log('[getAssignOptions] Extracted options:', options);

    options.sort((a, b) => a.localeCompare(b));
    return options;
  } catch (error: any) {
    const status = error?.status ?? error?.code;
    const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
    if (status === 429) {
      const e = new Error('Rate limited by Notion');
      (e as any).status = 429;
      (e as any).retryAfter = Number(retryAfter ?? 1);
      throw e;
    }
    console.error('Error fetching Assign options:', error);
    throw error;
  }
}

export async function getFilteredTasks(filters: {
  team?: string;
  assignee?: string;
  status?: string;
}): Promise<NotionTask[]> {
  try {
    const filter: any = {
      and: [],
    };

    if (filters.team) {
      filter.and.push({
        property: 'Team',
        select: {
          equals: filters.team,
        },
      });
    }

    if (filters.assignee) {
      filter.and.push({
        property: 'Assignee',
        people: {
          contains: filters.assignee,
        },
      });
    }

    if (filters.status) {
      filter.and.push({
        property: 'Status',
        select: {
          equals: filters.status,
        },
      });
    }

    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: filter.and.length > 0 ? filter : undefined,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
    });

    return response.results.map((page: any) => {
      const properties = page.properties;

      return {
        id: page.id,
        title: properties.Name?.title?.[0]?.plain_text || 'Untitled',
        status: properties.Status?.select?.name || 'Not Started',
        assignee: properties.Assignee?.people?.[0]?.name || undefined,
        assigneeId: properties.Assignee?.people?.[0]?.id || undefined,
          assign: properties.Assign?.multi_select?.[0]?.name ||
                properties.Assign?.select?.name ||
                properties['Assigned to']?.select?.name ||
                properties['Assigned To']?.select?.name ||
                properties.assignedTo?.select?.name ||
                properties.assigned?.select?.name ||
                properties.Assignee?.people?.[0]?.name ||
                undefined,
        team: properties.Team?.select?.name || undefined,
        dueDate: properties['Due Date']?.date?.start || undefined,
        createdDate: page.created_time,
        lastModified: page.last_edited_time,
        priority: properties.Priority?.select?.name || undefined,
        description: properties.Description?.rich_text?.[0]?.plain_text || undefined,
      };
    });
  } catch (error: any) {
    const status = error?.status ?? error?.code;
    const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
    if (status === 429) {
      const e = new Error('Rate limited by Notion');
      (e as any).status = 429;
      (e as any).retryAfter = Number(retryAfter ?? 1);
      throw e;
    }
    console.error('Error fetching filtered tasks:', error);
    throw error;
  }
}

export async function getAssignees(): Promise<{ id: string; name: string }[]> {
  try {
    const assignees: { id: string; name: string }[] = [];
    let cursor: string | undefined = undefined;
    // Iterate through users; Notion returns people and bots, we keep people with a name
    // Cap to reasonable upper bound to avoid excessive loops
    for (let i = 0; i < 20; i++) {
      const resp: any = await (notion as any).users.list({ start_cursor: cursor });
      const results = resp?.results || [];
      for (const u of results) {
        if (u?.type === 'person' && u?.id && u?.name) {
          assignees.push({ id: u.id, name: u.name });
        }
      }
      if (!resp?.has_more) break;
      cursor = resp?.next_cursor;
      if (!cursor) break;
    }
    // De-duplicate by id
    const unique = Array.from(new Map(assignees.map(a => [a.id, a])).values());
    // Sort by name asc
    unique.sort((a, b) => a.name.localeCompare(b.name));
    return unique;
  } catch (error: any) {
    const status = error?.status ?? error?.code;
    const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
    if (status === 429) {
      const e = new Error('Rate limited by Notion');
      (e as any).status = 429;
      (e as any).retryAfter = Number(retryAfter ?? 1);
      throw e;
    }
    console.error('Error fetching Notion assignees:', error);
    throw error;
  }
}