'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { NotionTask, FilterOptions } from '../types/notion';
import { formatDate, sortTasks, getStatusColor, getPriorityColor, cn } from '../lib/utils';
import { ChevronDown, Filter, Calendar, User, Users, CheckCircle, Clock, ExternalLink, Loader2, Play, Check, RotateCcw, Search } from 'lucide-react';
import StoreStatusIndicator from './StoreStatusIndicator';
// Next.js navigation removed; using window.history and URLSearchParams instead

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed with ${res.status}`);
  }
  return res.json();
};

export default function TaskDashboard() {
  // Hydrate filters from URL (CSR)
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'dueDate',
    sortOrder: 'desc',
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [statusActionById, setStatusActionById] = useState<Record<string, 'start' | 'done' | 'reopen'>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const assignee = url.searchParams.get('assignee') || '';
    if (assignee !== assigneeFilter) setAssigneeFilter(assignee);
    // status left out intentionally unless needed later
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters to URL (CSR)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (assigneeFilter) url.searchParams.set('assignee', assigneeFilter); else url.searchParams.delete('assignee');
    const q = url.searchParams.toString();
    const newUrl = q ? `${url.pathname}?${q}` : url.pathname;
    window.history.replaceState({}, '', newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeFilter, filters.sortBy, filters.sortOrder]);

  // Always fetch full dataset; apply filters client-side so dropdowns include all options
  const queryParams = new URLSearchParams();
  const swrKey = queryParams.toString() ? `/api/tasks?${queryParams.toString()}` : '/api/tasks';

  const { data, error, isLoading, mutate: mutateTasks } = useSWR(swrKey, fetcher);
  const { data: assignOptionsData } = useSWR('/api/assign-options', fetcher, { revalidateOnFocus: false });

  // Listen for force refresh events from StoreStatusIndicator
  useEffect(() => {
    const handleForceRefresh = () => {
      console.log('[TaskDashboard] Force refresh triggered');
      mutateTasks();
    };

    window.addEventListener('force-refresh-tasks', handleForceRefresh);
    return () => window.removeEventListener('force-refresh-tasks', handleForceRefresh);
  }, [mutateTasks]);

  const tasks: NotionTask[] = data?.tasks || [];

  // Apply client-side filters for assignee to ensure correctness
  const selectionFiltered = tasks.filter((task) => {
    const assigneeOk = assigneeFilter ? (task.assign === assigneeFilter) : true;
    const q = searchQuery.trim().toLowerCase();
    const searchOk = q
      ? ((task.title || '').toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q))
      : true;
    return assigneeOk && searchOk;
  });

  // Filter tasks based on completion status
  const normalize = (s: string | undefined) => (s || '').trim().toLowerCase();
  const filteredTasks = selectionFiltered.filter((task) => {
    if (showCompleted) {
      return normalize(task.status) === 'done';
    } else {
      const isActive = normalize(task.status) !== 'done';
      const statusOk = statusFilter ? normalize(task.status) === normalize(statusFilter) : true;
      return isActive && statusOk;
    }
  });

  // Sort tasks: when active, prioritize In Progress over Not Started, then apply selected sort
  const getStatusWeight = (status: string) => {
    const s = (status || '').trim().toLowerCase();
    return s === 'in progress' ? 0 : s === 'not started' ? 1 : 2;
  };
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (!showCompleted) {
      const weightDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
      if (weightDiff !== 0) return weightDiff;
    }
    const sortBy = filters.sortBy || 'dueDate';
    const sortOrder = filters.sortOrder || 'desc';
    const getVal = (t: NotionTask): string => {
      switch (sortBy) {
        case 'dueDate':
          return t.dueDate || '';
        case 'createdDate':
          return t.createdDate || '';
        case 'lastModified':
          return t.lastModified || '';
        case 'title':
          return t.title || '';
        default:
          return t.createdDate || '';
      }
    };
    const aValue = getVal(a);
    const bValue = getVal(b);
    const cmp = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  // Get unique assignees for filter dropdown
  const uniqueAssignOptions = (assignOptionsData?.options as string[] | undefined) || Array.from(new Set(tasks.map(t => t.assign).filter(Boolean) as string[]));

  const handleStatusChange = async (taskId: string, newStatus: string, action?: 'start' | 'done' | 'reopen') => {
    try {
      if (action) {
        setStatusActionById(prev => ({ ...prev, [taskId]: action }));
      }
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Refresh data
        mutate(swrKey);
      } else {
        console.error('Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setStatusActionById(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  };

  // Sort controls handled via dropdowns below

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading tasks. Please check your Notion configuration.</p>
        <p className="text-sm text-gray-600 mt-2">{String(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full">
          <h2 className="text-2xl font-bold text-gray-900">
            {showCompleted ? 'Completed Tasks' : 'Active Tasks'}
          </h2>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showCompleted
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            )}
          >
            {showCompleted ? (
              <>
                <CheckCircle className="w-4 h-4 inline mr-2" />
                View Active
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 inline mr-2" />
                View Completed
              </>
            )}
          </button>
          <StoreStatusIndicator />
        </div>

        {/* Filters + Sort (desktop inline) */}
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-full sm:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Assign</option>
            {uniqueAssignOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {!showCompleted && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Active</option>
              <option value="In Progress">In Progress</option>
              <option value="Not Started">Not Started</option>
            </select>
          )}

          {/* Sorting fixed to due date desc; controls removed per request */}
        </div>
      </div>

      {/* Sorting controls merged above */}

      {/* Tasks Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            {showCompleted ? 'No completed tasks found.' : 'No active tasks found.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative group"
            >
              {/* Notion link visible on hover */}
              <a
                href={`https://www.notion.so/${task.id.replace(/-/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                aria-label="Open in Notion"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="space-y-4">
                {/* Task Title */}
                <div>
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Task Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getStatusColor(task.status)
                      )}
                    >
                      {task.status}
                    </span>
                    {task.priority && (
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          getPriorityColor(task.priority)
                        )}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>

                  {task.team && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="text-gray-700">{task.team}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="text-gray-700">{task.assign || 'Unassigned'}</span>
                  </div>

                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Due: {formatDate(task.dueDate)}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {normalize(task.status) === 'done' ? (
                    <button
                      onClick={() => handleStatusChange(task.id, 'In Progress', 'reopen')}
                      disabled={updatingIds.has(task.id)}
                      className={cn(
                        'flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2',
                        updatingIds.has(task.id)
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      )}
                    >
                      {updatingIds.has(task.id) && statusActionById[task.id] === 'reopen' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          Reopen Task
                        </>
                      )}
                    </button>
                  ) : normalize(task.status) === 'not started' ? (
                    <>
                      <button
                        onClick={() => handleStatusChange(task.id, 'In Progress', 'start')}
                        disabled={updatingIds.has(task.id)}
                        className={cn(
                          'flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2',
                          updatingIds.has(task.id)
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        )}
                      >
                        {updatingIds.has(task.id) && statusActionById[task.id] === 'start' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Start Task
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, 'Done', 'done')}
                        disabled={updatingIds.has(task.id)}
                        className={cn(
                          'flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2',
                          updatingIds.has(task.id)
                            ? 'bg-green-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        )}
                      >
                        {updatingIds.has(task.id) && statusActionById[task.id] === 'done' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Mark Done
                            </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(task.id, 'Done', 'done')}
                      disabled={updatingIds.has(task.id)}
                      className={cn(
                        'flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2',
                        updatingIds.has(task.id)
                          ? 'bg-green-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      )}
                    >
                      {updatingIds.has(task.id) && statusActionById[task.id] === 'done' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Mark Done
                          </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Count */}
      <div className="text-center text-sm text-gray-600">
        Showing {sortedTasks.length} of {tasks.length} total tasks
      </div>
    </div>
  );
}