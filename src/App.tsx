import React from 'react';
import '@/app/globals.css';
import TaskDashboard from '@/components/TaskDashboard';

export default function TaskApp() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Slush Task Manager</h1>
      </header>
      <TaskDashboard />
    </div>
  );
}


