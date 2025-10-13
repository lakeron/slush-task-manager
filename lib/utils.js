import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
export function sortTasks(tasks, sortBy, sortOrder = 'desc') {
    const sortedTasks = [...tasks].sort((a, b) => {
        let aValue;
        let bValue;
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
        if (!aValue && !bValue)
            return 0;
        if (!aValue)
            return 1;
        if (!bValue)
            return -1;
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sortedTasks;
}
export function getStatusColor(status) {
    const normalized = (status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (normalized === 'done')
        return 'bg-green-100 text-green-800';
    if (normalized === 'in progress')
        return 'bg-blue-100 text-blue-800';
    if (normalized === 'not started')
        return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
}
export function getPriorityColor(priority) {
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
