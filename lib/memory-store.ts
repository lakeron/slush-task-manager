import { NotionTask } from '../types/notion';
import { getNotionTasks } from './notion.js';

// Configuration from environment variables
const REFRESH_INTERVAL_SECONDS = Number(process.env.REFRESH_INTERVAL_SECONDS || 60);
const RATE_LIMIT_COOLDOWN_SECONDS = Number(process.env.RATE_LIMIT_COOLDOWN_SECONDS || 60);

// In-memory store state
interface StoreState {
  tasks: NotionTask[];
  fetchedAt: number | null;
  isRefreshing: boolean;
  cooldownUntil: number | null;
  lastError: string | null;
}

const store: StoreState = {
  tasks: [],
  fetchedAt: null,
  isRefreshing: false,
  cooldownUntil: null,
  lastError: null,
};

let refreshIntervalId: NodeJS.Timeout | null = null;

/**
 * Get current timestamp in milliseconds
 */
function nowMs(): number {
  return Date.now();
}

/**
 * Check if we're currently in a rate limit cooldown period
 */
function isInCooldown(): boolean {
  if (!store.cooldownUntil) return false;
  return nowMs() < store.cooldownUntil;
}

/**
 * Set a cooldown period after rate limiting
 */
function setCooldown(seconds: number): void {
  store.cooldownUntil = nowMs() + seconds * 1000;
  console.log(`[memory-store] Rate limit cooldown set for ${seconds}s`);
}

/**
 * Check if a refresh is needed based on time elapsed
 */
function shouldRefresh(): boolean {
  if (isInCooldown()) {
    return false;
  }
  if (!store.fetchedAt) {
    return true; // Never fetched
  }
  const ageSeconds = (nowMs() - store.fetchedAt) / 1000;
  return ageSeconds > REFRESH_INTERVAL_SECONDS;
}

/**
 * Fetch tasks from Notion API and update the store
 */
async function refreshFromNotion(): Promise<void> {
  if (store.isRefreshing) {
    console.log('[memory-store] Refresh already in progress, skipping');
    return;
  }

  if (isInCooldown()) {
    const remainingSeconds = Math.ceil((store.cooldownUntil! - nowMs()) / 1000);
    console.log(`[memory-store] In cooldown, skipping refresh (${remainingSeconds}s remaining)`);
    return;
  }

  store.isRefreshing = true;
  store.lastError = null;

  try {
    console.log('[memory-store] Fetching tasks from Notion...');
    const tasks = await getNotionTasks();
    store.tasks = tasks;
    store.fetchedAt = nowMs();
    console.log(`[memory-store] Successfully fetched ${tasks.length} tasks`);
  } catch (error: any) {
    const status = error?.status ?? error?.code;
    const retryAfter = error?.retryAfter ?? Number(error?.headers?.['retry-after'] ?? RATE_LIMIT_COOLDOWN_SECONDS);
    
    if (status === 429) {
      console.error('[memory-store] Rate limited by Notion API');
      setCooldown(retryAfter);
      store.lastError = 'Rate limited';
    } else {
      console.error('[memory-store] Error fetching tasks:', error.message || error);
      store.lastError = error.message || 'Unknown error';
      // Set a shorter cooldown on other errors to avoid hammering the API
      setCooldown(10);
    }
  } finally {
    store.isRefreshing = false;
  }
}

/**
 * Start background refresh interval
 */
export function startBackgroundRefresh(): void {
  if (refreshIntervalId) {
    return; // Already started
  }

  console.log(`[memory-store] Starting background refresh (interval: ${REFRESH_INTERVAL_SECONDS}s)`);
  
  // Check every 10 seconds if we need to refresh
  refreshIntervalId = setInterval(() => {
    if (shouldRefresh()) {
      refreshFromNotion().catch(err => {
        console.error('[memory-store] Background refresh failed:', err);
      });
    }
  }, 10000);

  // Don't prevent Node from exiting
  if (refreshIntervalId.unref) {
    refreshIntervalId.unref();
  }
}

/**
 * Get tasks from memory store
 * Triggers initial fetch if store is empty
 */
export async function getTasks(): Promise<NotionTask[]> {
  // Start background refresh on first call
  startBackgroundRefresh();

  // If store is empty, do an initial fetch
  if (store.tasks.length === 0 && !store.isRefreshing) {
    await refreshFromNotion();
  }

  return store.tasks;
}

/**
 * Replace all tasks in the store
 */
export function setTasks(tasks: NotionTask[]): void {
  store.tasks = tasks;
  store.fetchedAt = nowMs();
  console.log(`[memory-store] Store updated with ${tasks.length} tasks`);
}

/**
 * Update a single task in the store
 */
export function updateTask(taskId: string, updates: Partial<NotionTask>): boolean {
  const index = store.tasks.findIndex(task => task.id === taskId);
  
  if (index === -1) {
    console.warn(`[memory-store] Task ${taskId} not found in store`);
    return false;
  }

  store.tasks[index] = {
    ...store.tasks[index],
    ...updates,
    lastModified: new Date().toISOString(),
  };

  console.log(`[memory-store] Task ${taskId} updated in store`);
  return true;
}

/**
 * Get store statistics for debugging
 */
export function getStoreStats() {
  const ageSeconds = store.fetchedAt ? Math.floor((nowMs() - store.fetchedAt) / 1000) : null;
  const cooldownSeconds = store.cooldownUntil ? Math.ceil((store.cooldownUntil - nowMs()) / 1000) : 0;

  return {
    taskCount: store.tasks.length,
    fetchedAt: store.fetchedAt,
    ageSeconds,
    isRefreshing: store.isRefreshing,
    isInCooldown: isInCooldown(),
    cooldownSeconds: cooldownSeconds > 0 ? cooldownSeconds : 0,
    lastError: store.lastError,
    refreshInterval: REFRESH_INTERVAL_SECONDS,
  };
}

/**
 * Force an immediate refresh (for testing/debugging)
 */
export async function forceRefresh(): Promise<void> {
  store.cooldownUntil = null; // Clear cooldown
  await refreshFromNotion();
}

/**
 * Clear the store (for testing)
 */
export function clearStore(): void {
  store.tasks = [];
  store.fetchedAt = null;
  store.isRefreshing = false;
  store.cooldownUntil = null;
  store.lastError = null;
  console.log('[memory-store] Store cleared');
}

