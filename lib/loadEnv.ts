import path from 'path';

// Load environment variables from .env.local for local development/testing.
// In Vercel/v0 production, vars are provided by the platform and this no-ops.
try {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  if (!isProd) {
    // Dynamically import dotenv only in non-production to avoid bundling/runtime dep in serverless
    // Top-level await is supported in Node 18 ESM
    const dotenv = await import('dotenv');
    const localPath = path.resolve(process.cwd(), '.env.local');
    dotenv.config({ path: localPath });
    // Also load from default .env as a fallback if present
    dotenv.config();
  }
} catch {
  // Ignore errors to avoid crashing on serverless
}


