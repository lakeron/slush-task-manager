import { NOTION_DATABASE_ID } from '../lib/notion.js';
import { Client } from '@notionhq/client';

export default async function handler(req: any, res: any) {
  try {
    if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
      res.status(500).json({
        error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.'
      });
      return;
    }

    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    // Get database metadata
    const meta = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
    const properties = (meta as any)?.properties || {};

    // Get first few tasks to check their actual assignment data
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      page_size: 3,
    });

    const sampleTasks = response.results.map((page: any) => {
      const taskProps = page.properties;
      return {
        id: page.id,
        title: taskProps.Name?.title?.[0]?.plain_text || 'Untitled',
        allPropertyNames: Object.keys(taskProps),
        assignProperty: taskProps.Assign,
        assigneeProperty: taskProps.Assignee,
        // Check all possible assignment-related fields
        assignmentFields: {
          'Assign': taskProps.Assign,
          'Assignee': taskProps.Assignee,
          'Assigned to': taskProps['Assigned to'],
          'Assigned To': taskProps['Assigned To'],
          'assignedTo': taskProps.assignedTo,
          'assigned': taskProps.assigned,
        }
      };
    });

    res.status(200).json({
      databaseProperties: Object.keys(properties),
      propertyTypes: Object.fromEntries(
        Object.entries(properties).map(([key, prop]: [string, any]) => [key, prop.type])
      ),
      sampleTasks,
    });
  } catch (error) {
    console.error('Error in debug-fields API:', error);
    res.status(500).json({
      error: 'Failed to fetch debug info',
      details: String(error)
    });
  }
}