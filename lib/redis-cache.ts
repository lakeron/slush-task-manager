import { Redis } from '@upstash/redis';
import { NotionTask } from '../types/notion';

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 300); // Default 5 minutes
const IS_PRODUCTION = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

/**
 * Parse Redis connection URL to extract REST API credentials
 * Supports multiple environment variable formats for maximum compatibility
 */
function getRedisCredentials(): { url: string; token: string } | null {
  // Option 1: Upstash REST API credentials
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    };
  }

  // Option 2: Vercel KV REST API credentials
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    };
  }

  // Option 3: Parse from KV_URL or REDIS_URL (traditional Redis connection string)
  const redisUrl = process.env.KV_URL || process.env.REDIS_URL;
  if (redisUrl) {
    try {
      // Parse: rediss://default:PASSWORD@HOST:PORT
      const match = redisUrl.match(/rediss?:\/\/[^:]*:([^@]+)@([^:]+)/);
      if (match) {
        const token = match[1];
        const host = match[2];
        return {
          url: `https://${host}`,
          token: token,
        };
      }
    } catch (error) {
      console.error('[redis-cache] Failed to parse Redis URL:', error);
    }
  }

  return null;
}

// Only initialize Redis in production with credentials
const credentials = IS_PRODUCTION ? getRedisCredentials() : null;
const redis = credentials
  ? new Redis({
      url: credentials.url,
      token: credentials.token,
    })
  : null;

if (redis) {
  console.log('[redis-cache] Redis initialized with URL:', credentials!.url);
} else if (IS_PRODUCTION) {
  console.warn('[redis-cache] Redis not initialized - missing credentials');
}

interface CachedData {
  tasks: NotionTask[];
  fetchedAt: number;
}

/**
 * Get tasks from Upstash Redis cache
 */
export async function getCachedTasks(): Promise<CachedData | null> {
  if (!redis) {
    return null; // No Redis in local dev
  }

  try {
    const cached = await redis.get<CachedData>('notion:tasks:all');
    return cached;
  } catch (error) {
    console.error('[redis-cache] Error reading from cache:', error);
    return null;
  }
}

/**
 * Store tasks in Upstash Redis cache with TTL
 */
export async function setCachedTasks(tasks: NotionTask[]): Promise<void> {
  if (!redis) {
    return; // No Redis in local dev
  }

  try {
    const data: CachedData = {
      tasks,
      fetchedAt: Date.now(),
    };
    
    // Set with TTL
    await redis.set('notion:tasks:all', data, {
      ex: CACHE_TTL_SECONDS,
    });
    
    console.log(`[redis-cache] Cached ${tasks.length} tasks with TTL ${CACHE_TTL_SECONDS}s`);
  } catch (error) {
    console.error('[redis-cache] Error writing to cache:', error);
  }
}

/**
 * Invalidate the cache (called after updates)
 */
export async function invalidateCache(): Promise<void> {
  if (!redis) {
    return; // No Redis in local dev
  }

  try {
    await redis.del('notion:tasks:all');
    console.log('[redis-cache] Cache invalidated');
  } catch (error) {
    console.error('[redis-cache] Error invalidating cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  exists: boolean;
  ageSeconds: number | null;
  ttl: number | null;
}> {
  if (!redis) {
    return { exists: false, ageSeconds: null, ttl: null };
  }

  try {
    const cached = await redis.get<CachedData>('notion:tasks:all');
    const ttl = await redis.ttl('notion:tasks:all');
    
    if (!cached) {
      return { exists: false, ageSeconds: null, ttl: null };
    }

    const ageSeconds = Math.floor((Date.now() - cached.fetchedAt) / 1000);
    
    return {
      exists: true,
      ageSeconds,
      ttl: ttl > 0 ? ttl : null,
    };
  } catch (error) {
    console.error('[redis-cache] Error getting cache stats:', error);
    return { exists: false, ageSeconds: null, ttl: null };
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null;
}

