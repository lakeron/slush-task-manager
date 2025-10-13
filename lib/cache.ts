import { Redis } from '@upstash/redis';

type CacheRecord<T> = {
  data: T;
  fetchedAt: number; // epoch ms
};

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const DEFAULT_FRESH_TTL_SECONDS = Number(process.env.CACHE_FRESH_TTL_SECONDS || 60);
const DEFAULT_STALE_MAX_AGE_SECONDS = Number(process.env.CACHE_STALE_MAX_AGE_SECONDS || 300);

const redis = UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
  : null;

// In-memory fallback for local dev when Redis is not configured
const memoryStore = new Map<string, { value: string; expiresAt: number }>();
const memoryLocks = new Map<string, number>();

function nowMs(): number {
  return Date.now();
}

async function getJson<T>(key: string): Promise<CacheRecord<T> | null> {
  if (redis) {
    const raw = await redis.get<string>(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CacheRecord<T>;
    } catch {
      return null;
    }
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    memoryStore.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.value) as CacheRecord<T>;
  } catch {
    return null;
  }
}

async function setJson<T>(key: string, value: CacheRecord<T>, ttlSeconds: number): Promise<void> {
  const serialized = JSON.stringify(value);
  if (redis) {
    // upstash supports EX via set with px for ms is not necessary; use EX seconds
    await redis.set(key, serialized, { ex: ttlSeconds });
    return;
  }
  memoryStore.set(key, { value: serialized, expiresAt: nowMs() + ttlSeconds * 1000 });
}

async function ttlSeconds(key: string): Promise<number> {
  if (redis) {
    const t = await redis.ttl(key);
    return typeof t === 'number' ? t : -1;
  }
  const entry = memoryStore.get(key);
  if (!entry) return -2; // key not found
  return Math.max(0, Math.floor((entry.expiresAt - nowMs()) / 1000));
}

async function setCooldown(seconds: number): Promise<void> {
  const key = 'cooldown:notion';
  if (redis) {
    await redis.set(key, '1', { ex: seconds });
    return;
  }
  memoryStore.set(key, { value: JSON.stringify({ v: 1 }), expiresAt: nowMs() + seconds * 1000 });
}

async function getCooldownTtl(): Promise<number> {
  return ttlSeconds('cooldown:notion');
}

async function acquireLock(lockKey: string, ttlSecondsParam: number): Promise<boolean> {
  if (redis) {
    const ok = await redis.set(lockKey, '1', { nx: true, ex: ttlSecondsParam });
    return ok === 'OK';
  }
  const expiresAt = memoryLocks.get(lockKey);
  const now = nowMs();
  if (!expiresAt || expiresAt <= now) {
    memoryLocks.set(lockKey, now + ttlSecondsParam * 1000);
    return true;
  }
  return false;
}

async function releaseLock(lockKey: string): Promise<void> {
  if (redis) {
    await redis.del(lockKey);
    return;
  }
  memoryLocks.delete(lockKey);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withSWRCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { freshTtl?: number; staleMaxAge?: number; lockTtl?: number }
): Promise<{ data: T; headers: Record<string, string> }>
{
  const freshTtl = opts?.freshTtl ?? DEFAULT_FRESH_TTL_SECONDS;
  const staleMaxAge = opts?.staleMaxAge ?? DEFAULT_STALE_MAX_AGE_SECONDS;
  const lockTtl = opts?.lockTtl ?? 10;

  const cooldownTtl = await getCooldownTtl();
  const now = nowMs();
  const cached = await getJson<T>(key);
  const ageSeconds = cached ? (now - cached.fetchedAt) / 1000 : Infinity;

  if (cached && ageSeconds <= freshTtl) {
    return { data: cached.data, headers: { 'X-Cache': 'hit', 'X-Cache-Fresh': 'true' } };
  }

  if (cooldownTtl > 0 && cached && ageSeconds <= staleMaxAge) {
    return { data: cached.data, headers: { 'X-Cache': 'stale', 'X-Cooldown': String(cooldownTtl) } };
  }

  const lockKey = `lock:${key}`;
  const gotLock = await acquireLock(lockKey, lockTtl);
  if (gotLock) {
    try {
      const data = await fetcher();
      await setJson<T>(key, { data, fetchedAt: now }, staleMaxAge);
      return { data, headers: { 'X-Cache': cached ? 'refresh' : 'miss' } };
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      const retryAfter = Number(e?.retryAfter ?? e?.response?.headers?.['retry-after'] ?? e?.response?.headers?.['Retry-After'] ?? 1);
      if (status === 429) {
        await setCooldown(isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1);
        if (cached && ageSeconds <= staleMaxAge) {
          return { data: cached.data, headers: { 'X-Cache': 'stale', 'Retry-After': String(retryAfter || 1) } };
        }
      }
      if (cached && ageSeconds <= staleMaxAge) {
        return { data: cached.data, headers: { 'X-Cache': 'stale' } };
      }
      throw e;
    } finally {
      await releaseLock(lockKey);
    }
  }

  if (cached && ageSeconds <= staleMaxAge) {
    return { data: cached.data, headers: { 'X-Cache': ageSeconds <= freshTtl ? 'hit' : 'stale' } };
  }

  await delay(400);
  const warmed = await getJson<T>(key);
  if (warmed) {
    return { data: warmed.data, headers: { 'X-Cache': 'warm' } };
  }

  throw Object.assign(new Error('Service Unavailable'), { status: 503, retryAfter: 1 });
}

export const cacheUtils = {
  DEFAULT_FRESH_TTL_SECONDS,
  DEFAULT_STALE_MAX_AGE_SECONDS,
};

export async function deleteCacheKey(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryStore.delete(key);
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  if (redis) {
    // Use KEYS for simplicity; acceptable at small scale
    // If KEYS is disabled, replace with SCAN in future
    const keys = (await (redis as any).keys?.(`${prefix}*`)) as string[] | undefined;
    if (keys && keys.length) {
      await redis.del(...keys);
    }
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) memoryStore.delete(key);
  }
}


