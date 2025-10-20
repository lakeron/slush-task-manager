import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

console.log('Environment check:');
console.log('NOTION_API_KEY:', NOTION_API_KEY ? `${NOTION_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('NOTION_DATABASE_ID:', NOTION_DATABASE_ID || 'NOT SET');

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

async function investigateNotionDatabase() {
  try {
    console.log('\n🔍 Investigating Notion database...');

    // 1. Get database metadata
    console.log('\n1️⃣ Fetching database schema...');
    const meta = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
    const properties = meta.properties;

    console.log('📋 Available properties:');
    Object.entries(properties).forEach(([name, prop]) => {
      console.log(`  - ${name}: ${prop.type}`);
    });

    // 2. Get sample tasks to see actual data
    console.log('\n2️⃣ Fetching sample tasks...');
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      page_size: 3,
    });

    console.log(`\n📄 Found ${response.results.length} sample tasks:`);

    response.results.forEach((page, index) => {
      const taskProps = page.properties;
      const title = taskProps.Name?.title?.[0]?.plain_text || 'Untitled';

      console.log(`\nTask ${index + 1}: "${title}"`);
      console.log('Assignment-related properties:');

      // Check all possible assignment fields
      const assignmentFields = {
        'Assign': taskProps.Assign,
        'Assignee': taskProps.Assignee,
        'Assigned to': taskProps['Assigned to'],
        'Assigned To': taskProps['Assigned To'],
        'assignedTo': taskProps.assignedTo,
        'assigned': taskProps.assigned,
      };

      Object.entries(assignmentFields).forEach(([fieldName, fieldValue]) => {
        if (fieldValue) {
          console.log(`  ✅ ${fieldName}:`, JSON.stringify(fieldValue, null, 2));
        } else {
          console.log(`  ❌ ${fieldName}: not found/empty`);
        }
      });
    });

    // 3. Check what our UPDATED code would extract
    console.log('\n3️⃣ Testing UPDATED code extraction...');
    response.results.forEach((page, index) => {
      const taskProps = page.properties;
      const title = taskProps.Name?.title?.[0]?.plain_text || 'Untitled';

      // This is what our UPDATED code tries to extract
      const updatedAssign = taskProps.Assign?.multi_select?.[0]?.name ||
                           taskProps.Assign?.select?.name ||
                           taskProps['Assigned to']?.select?.name ||
                           taskProps['Assigned To']?.select?.name ||
                           taskProps.assignedTo?.select?.name ||
                           taskProps.assigned?.select?.name ||
                           taskProps.Assignee?.people?.[0]?.name ||
                           undefined;

      console.log(`Task ${index + 1} "${title}" -> assign: ${updatedAssign || 'NULL'}`);
    });

    // 4. Check assign options
    console.log('\n4️⃣ Testing assign options extraction...');
    const assignProp = properties.Assign;
    const options = (assignProp?.multi_select?.options || assignProp?.select?.options || []).map((o) => o?.name).filter(Boolean);
    console.log('Available assign options:', options);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status === 401) {
      console.error('This looks like an authentication issue. Check your NOTION_API_KEY.');
    } else if (error.status === 404) {
      console.error('Database not found. Check your NOTION_DATABASE_ID and integration permissions.');
    }
  }
}

investigateNotionDatabase();