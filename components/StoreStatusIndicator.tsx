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
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch store stats');
  return res.json();
};

export default function StoreStatusIndicator() {
  const { data: stats, error } = useSWR<StoreStats>('/api/store-stats', fetcher, {
    refreshInterval: 5000, // Update every 5 seconds
    revalidateOnFocus: false,
  });

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (error || !stats) {
    return null; // Don't show if there's an error or no data
  }

  const { ageSeconds, refreshInterval, isRefreshing, isInCooldown, cooldownSeconds, lastError } = stats;

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

  const formatTimeAgo = (seconds: number | null): string => {
    if (!seconds) return 'Never';
    if (seconds < 60) return `${Math.floor(seconds)}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const statusColor = getStatusColor();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        statusColor.bg,
        statusColor.text
      )}
    >
      {isRefreshing ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        statusColor.icon
      )}
      
      <span>
        {isRefreshing ? (
          'Updating...'
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
      {stats.taskCount > 0 && !isRefreshing && !isInCooldown && (
        <span className="opacity-60">• {stats.taskCount} tasks</span>
      )}
    </div>
  );
}

