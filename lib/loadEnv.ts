import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local for local development/testing.
// In Vercel/v0 production, vars are provided by the platform and this no-ops.
try {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  if (!isProd) {
    // Load .env.local first (higher priority)
    const localPath = path.resolve(process.cwd(), '.env.local');
    dotenv.config({ path: localPath });
    // Then load .env if it exists
    dotenv.config();
  }
} catch (error) {
  // Ignore errors to avoid crashing on serverless
  console.warn('Failed to load environment variables:', error);
}


