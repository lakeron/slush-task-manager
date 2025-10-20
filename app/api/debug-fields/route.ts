import { NextRequest, NextResponse } from 'next/server';
import { NOTION_DATABASE_ID } from '../../../lib/notion';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY || !NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: 'Notion credentials missing. Set NOTION_API_KEY and NOTION_DATABASE_ID.' },
        { status: 500 }
      );
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

    return NextResponse.json({
      databaseProperties: Object.keys(properties),
      propertyTypes: Object.fromEntries(
        Object.entries(properties).map(([key, prop]: [string, any]) => [key, prop.type])
      ),
      sampleTasks,
    });
  } catch (error) {
    console.error('Error in debug-fields API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info', details: String(error) },
      { status: 500 }
    );
  }
}