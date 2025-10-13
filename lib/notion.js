import { Client } from '@notionhq/client';
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
export async function getNotionTasks() {
    try {
        const response = await notion.databases.query({
            database_id: NOTION_DATABASE_ID,
            sorts: [
                {
                    timestamp: 'created_time',
                    direction: 'descending',
                },
            ],
        });
        return response.results.map((page) => {
            const properties = page.properties;
            return {
                id: page.id,
                title: properties.Name?.title?.[0]?.plain_text || 'Untitled',
                status: properties.Status?.select?.name || 'Not Started',
                assignee: properties.Assignee?.people?.[0]?.name || undefined,
                assigneeId: properties.Assignee?.people?.[0]?.id || undefined,
                assign: properties.Assign?.select?.name || undefined,
                team: properties.Team?.select?.name || undefined,
                dueDate: properties['Due Date']?.date?.start || undefined,
                createdDate: page.created_time,
                lastModified: page.last_edited_time,
                priority: properties.Priority?.select?.name || undefined,
                description: properties.Description?.rich_text?.[0]?.plain_text || undefined,
            };
        });
    }
    catch (error) {
        const status = error?.status ?? error?.code;
        const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
        if (status === 429) {
            const e = new Error('Rate limited by Notion');
            e.status = 429;
            e.retryAfter = Number(retryAfter ?? 1);
            throw e;
        }
        console.error('Error fetching Notion tasks:', error);
        throw error;
    }
}
export async function updateTaskStatus(taskId, status) {
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
    }
    catch (error) {
        console.error('Error updating task status:', error);
        throw new Error('Failed to update task status');
    }
}
export async function updateTaskTeam(taskId, teamName) {
    try {
        await notion.pages.update({
            page_id: taskId,
            properties: {
                Team: {
                    select: teamName ? { name: teamName } : null,
                },
            },
        });
    }
    catch (error) {
        console.error('Error updating task team:', error);
        throw new Error('Failed to update task team');
    }
}
export async function updateTaskAssignee(taskId, assigneeId) {
    try {
        await notion.pages.update({
            page_id: taskId,
            properties: {
                Assignee: {
                    people: assigneeId ? [{ id: assigneeId }] : [],
                },
            },
        });
    }
    catch (error) {
        console.error('Error updating task assignee:', error);
        throw new Error('Failed to update task assignee');
    }
}
export async function updateTaskAssign(taskId, assignName) {
    try {
        await notion.pages.update({
            page_id: taskId,
            properties: {
                Assign: {
                    select: assignName ? { name: assignName } : null,
                },
            },
        });
    }
    catch (error) {
        console.error('Error updating task assign:', error);
        throw new Error('Failed to update task assign');
    }
}
export async function getAssignOptions() {
    try {
        const meta = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
        const assignProp = meta?.properties?.Assign;
        const options = (assignProp?.select?.options || []).map((o) => o?.name).filter(Boolean);
        options.sort((a, b) => a.localeCompare(b));
        return options;
    }
    catch (error) {
        const status = error?.status ?? error?.code;
        const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
        if (status === 429) {
            const e = new Error('Rate limited by Notion');
            e.status = 429;
            e.retryAfter = Number(retryAfter ?? 1);
            throw e;
        }
        console.error('Error fetching Assign options:', error);
        throw error;
    }
}
export async function getFilteredTasks(filters) {
    try {
        const filter = {
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
        return response.results.map((page) => {
            const properties = page.properties;
            return {
                id: page.id,
                title: properties.Name?.title?.[0]?.plain_text || 'Untitled',
                status: properties.Status?.select?.name || 'Not Started',
                assignee: properties.Assignee?.people?.[0]?.name || undefined,
                assigneeId: properties.Assignee?.people?.[0]?.id || undefined,
                assign: properties.Assign?.select?.name || undefined,
                team: properties.Team?.select?.name || undefined,
                dueDate: properties['Due Date']?.date?.start || undefined,
                createdDate: page.created_time,
                lastModified: page.last_edited_time,
                priority: properties.Priority?.select?.name || undefined,
                description: properties.Description?.rich_text?.[0]?.plain_text || undefined,
            };
        });
    }
    catch (error) {
        const status = error?.status ?? error?.code;
        const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
        if (status === 429) {
            const e = new Error('Rate limited by Notion');
            e.status = 429;
            e.retryAfter = Number(retryAfter ?? 1);
            throw e;
        }
        console.error('Error fetching filtered tasks:', error);
        throw error;
    }
}
export async function getAssignees() {
    try {
        const assignees = [];
        let cursor = undefined;
        // Iterate through users; Notion returns people and bots, we keep people with a name
        // Cap to reasonable upper bound to avoid excessive loops
        for (let i = 0; i < 20; i++) {
            const resp = await notion.users.list({ start_cursor: cursor });
            const results = resp?.results || [];
            for (const u of results) {
                if (u?.type === 'person' && u?.id && u?.name) {
                    assignees.push({ id: u.id, name: u.name });
                }
            }
            if (!resp?.has_more)
                break;
            cursor = resp?.next_cursor;
            if (!cursor)
                break;
        }
        // De-duplicate by id
        const unique = Array.from(new Map(assignees.map(a => [a.id, a])).values());
        // Sort by name asc
        unique.sort((a, b) => a.name.localeCompare(b.name));
        return unique;
    }
    catch (error) {
        const status = error?.status ?? error?.code;
        const retryAfter = error?.headers?.['retry-after'] ?? error?.headers?.['Retry-After'];
        if (status === 429) {
            const e = new Error('Rate limited by Notion');
            e.status = 429;
            e.retryAfter = Number(retryAfter ?? 1);
            throw e;
        }
        console.error('Error fetching Notion assignees:', error);
        throw error;
    }
}
