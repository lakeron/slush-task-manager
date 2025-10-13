'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { formatDate, getStatusColor, getPriorityColor, cn } from '@/lib/utils';
import { Calendar, User, Users, CheckCircle, Clock, ExternalLink, Loader2, Play, Check, RotateCcw, Search } from 'lucide-react';
// Next.js navigation removed; using window.history and URLSearchParams instead
const fetcher = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Request failed with ${res.status}`);
    }
    return res.json();
};
export default function TaskDashboard() {
    // Hydrate filters from URL (CSR)
    const [filters, setFilters] = useState({
        sortBy: 'dueDate',
        sortOrder: 'desc',
    });
    const [showCompleted, setShowCompleted] = useState(false);
    const [teamFilter, setTeamFilter] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingIds, setUpdatingIds] = useState(new Set());
    const [statusActionById, setStatusActionById] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
        const url = new URL(window.location.href);
        const team = url.searchParams.get('team') || '';
        const assignee = url.searchParams.get('assignee') || '';
        if (team !== teamFilter)
            setTeamFilter(team);
        if (assignee !== assigneeFilter)
            setAssigneeFilter(assignee);
        // status left out intentionally unless needed later
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Sync filters to URL (CSR)
    useEffect(() => {
        const url = new URL(window.location.href);
        if (teamFilter)
            url.searchParams.set('team', teamFilter);
        else
            url.searchParams.delete('team');
        if (assigneeFilter)
            url.searchParams.set('assignee', assigneeFilter);
        else
            url.searchParams.delete('assignee');
        const q = url.searchParams.toString();
        const newUrl = q ? `${url.pathname}?${q}` : url.pathname;
        window.history.replaceState({}, '', newUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teamFilter, assigneeFilter, filters.sortBy, filters.sortOrder]);
    // Always fetch full dataset; apply filters client-side so dropdowns include all options
    const queryParams = new URLSearchParams();
    const swrKey = queryParams.toString() ? `/api/tasks?${queryParams.toString()}` : '/api/tasks';
    const { data, error, isLoading } = useSWR(swrKey, fetcher);
    const { data: assignOptionsData } = useSWR('/api/assign-options', fetcher, { revalidateOnFocus: false });
    const tasks = data?.tasks || [];
    // Apply client-side filters for assignee/team to ensure correctness
    const selectionFiltered = tasks.filter((task) => {
        const teamOk = teamFilter ? task.team === teamFilter : true;
        const assigneeOk = assigneeFilter ? (task.assign === assigneeFilter) : true;
        const q = searchQuery.trim().toLowerCase();
        const searchOk = q
            ? ((task.title || '').toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q))
            : true;
        return teamOk && assigneeOk && searchOk;
    });
    // Filter tasks based on completion status
    const normalize = (s) => (s || '').trim().toLowerCase();
    const filteredTasks = selectionFiltered.filter((task) => {
        if (showCompleted) {
            return normalize(task.status) === 'done';
        }
        else {
            const isActive = normalize(task.status) !== 'done';
            const statusOk = statusFilter ? normalize(task.status) === normalize(statusFilter) : true;
            return isActive && statusOk;
        }
    });
    // Sort tasks: when active, prioritize In Progress over Not Started, then apply selected sort
    const getStatusWeight = (status) => {
        const s = (status || '').trim().toLowerCase();
        return s === 'in progress' ? 0 : s === 'not started' ? 1 : 2;
    };
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (!showCompleted) {
            const weightDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
            if (weightDiff !== 0)
                return weightDiff;
        }
        const sortBy = filters.sortBy || 'dueDate';
        const sortOrder = filters.sortOrder || 'desc';
        const getVal = (t) => {
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
    // Get unique teams and assignees for filter dropdowns
    const uniqueTeams = Array.from(new Set(tasks.map(task => task.team).filter(Boolean)));
    const uniqueAssignOptions = assignOptionsData?.options || Array.from(new Set(tasks.map(t => t.assign).filter(Boolean)));
    const handleStatusChange = async (taskId, newStatus, action) => {
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
            }
            else {
                console.error('Failed to update task status');
            }
        }
        catch (error) {
            console.error('Error updating task status:', error);
        }
        finally {
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
    const handleInlineUpdate = async (taskId, updates) => {
        try {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.add(taskId);
                return next;
            });
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (response.ok) {
                mutate(swrKey);
            }
            else {
                console.error('Failed to update task');
            }
        }
        catch (e) {
            console.error('Error updating task:', e);
        }
        finally {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(taskId);
                return next;
            });
        }
    };
    // Sort controls handled via dropdowns below
    if (error) {
        return (_jsxs("div", { className: "text-center py-12", children: [_jsx("p", { className: "text-red-600", children: "Error loading tasks. Please check your Notion configuration." }), _jsx("p", { className: "text-sm text-gray-600 mt-2", children: String(error) })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-4 w-full justify-between sm:justify-start", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: showCompleted ? 'Completed Tasks' : 'Active Tasks' }), _jsx("button", { onClick: () => setShowCompleted(!showCompleted), className: cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', showCompleted
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'), children: showCompleted ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle, { className: "w-4 h-4 inline mr-2" }), "View Active"] })) : (_jsxs(_Fragment, { children: [_jsx(Clock, { className: "w-4 h-4 inline mr-2" }), "View Completed"] })) })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("div", { className: "relative w-full sm:w-64", children: [_jsx(Search, { className: "w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search tasks", className: "w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("select", { value: teamFilter, onChange: (e) => setTeamFilter(e.target.value), className: "w-full sm:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "All Teams" }), uniqueTeams.map(team => (_jsx("option", { value: team, children: team }, team)))] }), _jsxs("select", { value: assigneeFilter, onChange: (e) => setAssigneeFilter(e.target.value), className: "w-full sm:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "All Assign" }), uniqueAssignOptions.map(name => (_jsx("option", { value: name, children: name }, name)))] }), !showCompleted && (_jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "w-full sm:w-auto pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "All Active" }), _jsx("option", { value: "In Progress", children: "In Progress" }), _jsx("option", { value: "Not Started", children: "Not Started" })] }))] })] }), isLoading ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-600", children: "Loading tasks..." }) })) : sortedTasks.length === 0 ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-600", children: showCompleted ? 'No completed tasks found.' : 'No active tasks found.' }) })) : (_jsx("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3", children: sortedTasks.map((task) => (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative group", children: [_jsx("a", { href: `https://www.notion.so/${task.id.replace(/-/g, '')}`, target: "_blank", rel: "noopener noreferrer", className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600", "aria-label": "Open in Notion", children: _jsx(ExternalLink, { className: "w-4 h-4" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 line-clamp-2", children: task.title }), task.description && (_jsx("p", { className: "text-sm text-gray-600 mt-1 line-clamp-2", children: task.description }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(task.status)), children: task.status }), task.priority && (_jsx("span", { className: cn('px-2 py-1 rounded-full text-xs font-medium', getPriorityColor(task.priority)), children: task.priority }))] }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-600 w-full", children: [_jsx(Users, { className: "w-4 h-4" }), _jsxs("select", { value: task.team || '', onChange: (e) => {
                                                        const value = e.target.value || '';
                                                        handleInlineUpdate(task.id, { team: value || null });
                                                    }, className: "flex-1 w-full pl-2 pr-6 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700", children: [_jsx("option", { value: "", children: "No Team" }), uniqueTeams.map(team => (_jsx("option", { value: team, children: team }, team)))] })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-600 w-full", children: [_jsx(User, { className: "w-4 h-4" }), _jsxs("select", { value: task.assign || '', onChange: (e) => {
                                                        const value = e.target.value || '';
                                                        handleInlineUpdate(task.id, {});
                                                        fetch(`/api/tasks/${task.id}`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ assign: value || null })
                                                        }).then(() => mutate(swrKey));
                                                    }, className: "flex-1 w-full pl-2 pr-6 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700", children: [_jsx("option", { value: "", children: "Unassigned" }), uniqueAssignOptions.map(name => (_jsx("option", { value: name, children: name }, name)))] })] }), _jsxs("div", { className: "flex items-center gap-1 text-sm text-gray-600", children: [_jsx(Calendar, { className: "w-4 h-4" }), task.dueDate ? `Due: ${formatDate(task.dueDate)}` : `Created: ${formatDate(task.createdDate)}`] })] }), _jsx("div", { className: "flex gap-2", children: normalize(task.status) === 'done' ? (_jsx("button", { onClick: () => handleStatusChange(task.id, 'In Progress', 'reopen'), disabled: updatingIds.has(task.id), className: cn('flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2', updatingIds.has(task.id)
                                            ? 'bg-blue-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700'), children: updatingIds.has(task.id) && statusActionById[task.id] === 'reopen' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Updating..."] })) : (_jsxs(_Fragment, { children: [_jsx(RotateCcw, { className: "w-4 h-4" }), "Reopen Task"] })) })) : normalize(task.status) === 'not started' ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleStatusChange(task.id, 'In Progress', 'start'), disabled: updatingIds.has(task.id), className: cn('flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2', updatingIds.has(task.id)
                                                    ? 'bg-blue-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'), children: updatingIds.has(task.id) && statusActionById[task.id] === 'start' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Updating..."] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { className: "w-4 h-4" }), "Start Task"] })) }), _jsx("button", { onClick: () => handleStatusChange(task.id, 'Done', 'done'), disabled: updatingIds.has(task.id), className: cn('flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2', updatingIds.has(task.id)
                                                    ? 'bg-green-400 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700'), children: updatingIds.has(task.id) && statusActionById[task.id] === 'done' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Updating..."] })) : (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4" }), "Mark Done"] })) })] })) : (_jsx("button", { onClick: () => handleStatusChange(task.id, 'Done', 'done'), disabled: updatingIds.has(task.id), className: cn('flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2', updatingIds.has(task.id)
                                            ? 'bg-green-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700'), children: updatingIds.has(task.id) && statusActionById[task.id] === 'done' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Updating..."] })) : (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4" }), "Mark Done"] })) })) })] })] }, task.id))) })), _jsxs("div", { className: "text-center text-sm text-gray-600", children: ["Showing ", sortedTasks.length, " of ", tasks.length, " total tasks"] })] }));
}
