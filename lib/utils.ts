import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { NotionTask } from "../types/notion";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  // Check if the time component is meaningful (not midnight UTC)
  const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0;
  
  if (hasTime) {
    // Format with date and time
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else {
    // Format date only
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export function sortTasks(tasks: NotionTask[], sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): NotionTask[] {
  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue: string | undefined;
    let bValue: string | undefined;

    switch (sortBy) {
      case 'dueDate':
        aValue = a.dueDate;
        bValue = b.dueDate;
        break;
      case 'createdDate':
        aValue = a.createdDate;
        bValue = b.createdDate;
        break;
      case 'lastModified':
        aValue = a.lastModified;
        bValue = b.lastModified;
        break;
      case 'title':
        aValue = a.title;
        bValue = b.title;
        break;
      default:
        aValue = a.createdDate;
        bValue = b.createdDate;
    }

    // Special handling for dueDate DESC: tasks without due date come first
    if (sortBy === 'dueDate' && sortOrder === 'desc') {
      if (!aValue && !bValue) return 0;
      if (!aValue) return -1; // Tasks without due date go first
      if (!bValue) return 1;  // Tasks without due date go first
    } else {
      // Default behavior: tasks without values go last
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
    }

    const comparison = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sortedTasks;
}

export function getStatusColor(status: string): string {
  const normalized = (status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized === 'done') return 'bg-green-100 text-green-800';
  if (normalized === 'in progress') return 'bg-blue-100 text-blue-800';
  if (normalized === 'not started') return 'bg-gray-100 text-gray-800';
  return 'bg-gray-100 text-gray-800';
}

export function getPriorityColor(priority?: string): string {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-800';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'Low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}