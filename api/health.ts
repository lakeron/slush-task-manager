import '../lib/loadEnv';

export default async function handler(_req: any, res: any) {
  try {
    const notionKey = process.env.NOTION_API_KEY;
    const notionDb = process.env.NOTION_DATABASE_ID;
    const region = process.env.VERCEL_REGION || process.env.AWS_REGION || process.env.REGION || 'unknown';

    res.status(200).json({
      ok: true,
      env: {
        hasNotionApiKey: Boolean(notionKey && notionKey.length > 10),
        notionDatabaseIdLength: notionDb ? notionDb.length : 0,
        nodeEnv: process.env.NODE_ENV || 'unknown',
        vercel: process.env.VERCEL || '0',
        region,
      },
      timestamp: Date.now(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'health failed' });
  }
}


