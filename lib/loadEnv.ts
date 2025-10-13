import path from 'path';

// Load environment variables from .env.local for local development/testing.
// In Vercel/v0 production, vars are provided by the platform and this no-ops.
try {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  if (!isProd) {
    // Use require in local/dev environments; in production (Vercel) this branch is skipped
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    const localPath = path.resolve(process.cwd(), '.env.local');
    dotenv.config({ path: localPath });
    dotenv.config();
  }
} catch {
  // Ignore errors to avoid crashing on serverless
}


