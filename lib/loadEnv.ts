import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local for local development/testing.
// In Vercel/v0 production, vars are provided by the platform and this no-ops.
try {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  if (!isProd) {
    const localPath = path.resolve(process.cwd(), '.env.local');
    dotenv.config({ path: localPath });
    // Also load from default .env as a fallback if present
    dotenv.config();
  }
} catch {
  // Ignore errors to avoid crashing on serverless
}


