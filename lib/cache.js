import { Redis } from '@upstash/redis';
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DEFAULT_FRESH_TTL_SECONDS = Number(process.env.CACHE_FRESH_TTL_SECONDS || 60);
const DEFAULT_STALE_MAX_AGE_SECONDS = Number(process.env.CACHE_STALE_MAX_AGE_SECONDS || 300);
const redis = UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
    : null;
// In-memory fallback for local dev when Redis is not configured
const memoryStore = new Map();
const memoryLocks = new Map();
function nowMs() {
    return Date.now();
}
async function getJson(key) {
    if (redis) {
        const raw = await redis.get(key);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    const entry = memoryStore.get(key);
    if (!entry)
        return null;
    if (entry.expiresAt <= nowMs()) {
        memoryStore.delete(key);
        return null;
    }
    try {
        return JSON.parse(entry.value);
    }
    catch {
        return null;
    }
}
async function setJson(key, value, ttlSeconds) {
    const serialized = JSON.stringify(value);
    if (redis) {
        // upstash supports EX via set with px for ms is not necessary; use EX seconds
        await redis.set(key, serialized, { ex: ttlSeconds });
        return;
    }
    memoryStore.set(key, { value: serialized, expiresAt: nowMs() + ttlSeconds * 1000 });
}
async function ttlSeconds(key) {
    if (redis) {
        const t = await redis.ttl(key);
        return typeof t === 'number' ? t : -1;
    }
    const entry = memoryStore.get(key);
    if (!entry)
        return -2; // key not found
    return Math.max(0, Math.floor((entry.expiresAt - nowMs()) / 1000));
}
async function setCooldown(seconds) {
    const key = 'cooldown:notion';
    if (redis) {
        await redis.set(key, '1', { ex: seconds });
        return;
    }
    memoryStore.set(key, { value: JSON.stringify({ v: 1 }), expiresAt: nowMs() + seconds * 1000 });
}
async function getCooldownTtl() {
    return ttlSeconds('cooldown:notion');
}
async function acquireLock(lockKey, ttlSecondsParam) {
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
async function releaseLock(lockKey) {
    if (redis) {
        await redis.del(lockKey);
        return;
    }
    memoryLocks.delete(lockKey);
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function withSWRCache(key, fetcher, opts) {
    const freshTtl = opts?.freshTtl ?? DEFAULT_FRESH_TTL_SECONDS;
    const staleMaxAge = opts?.staleMaxAge ?? DEFAULT_STALE_MAX_AGE_SECONDS;
    const lockTtl = opts?.lockTtl ?? 10;
    const cooldownTtl = await getCooldownTtl();
    const now = nowMs();
    const cached = await getJson(key);
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
            await setJson(key, { data, fetchedAt: now }, staleMaxAge);
            return { data, headers: { 'X-Cache': cached ? 'refresh' : 'miss' } };
        }
        catch (e) {
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
        }
        finally {
            await releaseLock(lockKey);
        }
    }
    if (cached && ageSeconds <= staleMaxAge) {
        return { data: cached.data, headers: { 'X-Cache': ageSeconds <= freshTtl ? 'hit' : 'stale' } };
    }
    await delay(400);
    const warmed = await getJson(key);
    if (warmed) {
        return { data: warmed.data, headers: { 'X-Cache': 'warm' } };
    }
    throw Object.assign(new Error('Service Unavailable'), { status: 503, retryAfter: 1 });
}
export const cacheUtils = {
    DEFAULT_FRESH_TTL_SECONDS,
    DEFAULT_STALE_MAX_AGE_SECONDS,
};
export async function deleteCacheKey(key) {
    if (redis) {
        await redis.del(key);
        return;
    }
    memoryStore.delete(key);
}
export async function deleteByPrefix(prefix) {
    if (redis) {
        // Use KEYS for simplicity; acceptable at small scale
        // If KEYS is disabled, replace with SCAN in future
        const keys = (await redis.keys?.(`${prefix}*`));
        if (keys && keys.length) {
            await redis.del(...keys);
        }
        return;
    }
    for (const key of memoryStore.keys()) {
        if (key.startsWith(prefix))
            memoryStore.delete(key);
    }
}
