import { Redis } from '@upstash/redis';
import { NotionTask } from '../types/notion';

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);
const IS_PRODUCTION = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// Only initialize Redis in production with credentials
const redis = IS_PRODUCTION && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

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

