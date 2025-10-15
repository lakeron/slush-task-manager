'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface StoreStats {
  taskCount: number;
  fetchedAt: number | null;
  ageSeconds: number | null;
  isRefreshing: boolean;
  isInCooldown: boolean;
  cooldownSeconds: number;
  lastError: string | null;
  refreshInterval: number;
  useRedis?: boolean;
  cacheExists?: boolean;
  cacheTTL?: number | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch store stats');
  return res.json();
};

export default function StoreStatusIndicator() {
  const { data: stats, error, mutate } = useSWR<StoreStats>('/api/store-stats', fetcher, {
    refreshInterval: 5000, // Update every 5 seconds
    revalidateOnFocus: false,
  });

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);

  // Update current time every second for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle force refresh
  const handleForceRefresh = async () => {
    if (isForceRefreshing) return; // Prevent double-clicks
    
    setIsForceRefreshing(true);
    try {
      const response = await fetch('/api/refresh', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to refresh');
      }
      
      // Refresh stats and task list
      await mutate();
      // Also trigger a reload of the tasks list
      window.dispatchEvent(new CustomEvent('force-refresh-tasks'));
    } catch (error) {
      console.error('Force refresh failed:', error);
    } finally {
      setIsForceRefreshing(false);
    }
  };

  if (error || !stats) {
    return null; // Don't show if there's an error or no data
  }

  const { ageSeconds, refreshInterval, isRefreshing, isInCooldown, cooldownSeconds, lastError, useRedis, cacheExists, cacheTTL } = stats;
  const showSpinner = isRefreshing || isForceRefreshing;

  // Helper function to format time ago
  const formatTimeAgo = (seconds: number | null): string => {
    if (!seconds) return 'Never';
    if (seconds < 60) return `${Math.floor(seconds)}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // In Redis mode: Show Upstash cache status
  if (useRedis) {
    if (!cacheExists) {
      return (
        <button
          onClick={handleForceRefresh}
          disabled={isForceRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Click to refresh from Notion"
        >
          {showSpinner ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Clock className="w-3 h-3" />
          )}
          <span>{showSpinner ? 'Refreshing...' : 'Cache empty'}</span>
        </button>
      );
    }

    // Show cache age and TTL
    const ttlDisplay = cacheTTL ? `${cacheTTL}s TTL` : 'expired';
    const ageDisplay = ageSeconds ? formatTimeAgo(ageSeconds) : 'just now';
    
    return (
      <button
        onClick={handleForceRefresh}
        disabled={isForceRefreshing}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Click to refresh from Notion"
      >
        {showSpinner ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <CheckCircle className="w-3 h-3" />
        )}
        <span>
          {showSpinner ? 'Refreshing...' : `Cached ${ageDisplay} • ${ttlDisplay}`}
        </span>
      </button>
    );
  }

  // Calculate status color based on age relative to refresh interval
  const getStatusColor = (): { bg: string; text: string; icon: JSX.Element } => {
    if (!ageSeconds) {
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        icon: <Clock className="w-3 h-3" />,
      };
    }

    if (isInCooldown) {
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    }

    const threshold2x = refreshInterval * 2;
    const threshold4x = refreshInterval * 4;

    if (ageSeconds < threshold2x) {
      // Green: Fresh data
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <CheckCircle className="w-3 h-3" />,
      };
    } else if (ageSeconds < threshold4x) {
      // Yellow: Somewhat stale
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <Clock className="w-3 h-3" />,
      };
    } else {
      // Red: Very stale
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    }
  };

  const statusColor = getStatusColor();

  return (
    <button
      onClick={handleForceRefresh}
      disabled={isForceRefreshing || isInCooldown}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
        statusColor.bg,
        statusColor.text,
        'hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      title="Click to refresh from Notion"
    >
      {showSpinner ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        statusColor.icon
      )}
      
      <span>
        {showSpinner ? (
          'Refreshing...'
        ) : isInCooldown ? (
          `Cooldown (${cooldownSeconds}s)`
        ) : (
          <>
            Last update: {formatTimeAgo(ageSeconds)}
            {lastError && (
              <span className="ml-1 text-xs opacity-75">({lastError})</span>
            )}
          </>
        )}
      </span>

      {/* Optional: Show task count */}
      {stats.taskCount > 0 && !showSpinner && !isInCooldown && (
        <span className="opacity-60">• {stats.taskCount} tasks</span>
      )}
    </button>
  );
}

