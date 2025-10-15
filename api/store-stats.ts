import '../lib/loadEnv.js';
import { getStoreStats } from '../lib/memory-store.js';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const stats = getStoreStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting store stats:', error);
    res.status(500).json({ error: 'Failed to get store stats' });
  }
}

