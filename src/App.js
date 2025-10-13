import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import '@/app/globals.css';
import TaskDashboard from '@/components/TaskDashboard';
export default function TaskApp() {
    return (_jsxs("div", { className: "max-w-7xl mx-auto p-6", children: [_jsx("header", { className: "mb-6", children: _jsx("h1", { className: "text-3xl font-bold", children: "Slush Task Manager" }) }), _jsx(TaskDashboard, {})] }));
}
