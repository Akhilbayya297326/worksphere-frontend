import React, { useState } from 'react';
import { CheckCircle2, XCircle, Code2, ShieldAlert } from 'lucide-react';

export default function QAWorkspace() {
  const [tasks, setTasks] = useState([
    { id: 'TSK-101', title: 'Implement OAuth JWT Handler', developer: 'Alex', status: 'Awaiting QA Review', codeSnippet: 'const token = jwt.sign({ id: user._id }, SECRET);' }
  ]);

  const handleStatusChange = (id, newStatus) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      <div className="border-b-2 border-slate-300 pb-4">
        <h2 className="text-2xl font-black text-slate-900">QA Tester Review Workspace</h2>
        <p className="text-slate-700 text-sm font-semibold">Validate Developer Pull Requests and Test System Integrity</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white p-5 rounded-xl border-2 border-slate-300 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">{task.id}</span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{task.title}</h3>
                <p className="text-xs text-slate-600 font-bold">Submitted by: {task.developer}</p>
              </div>
              <span className="text-xs font-black bg-blue-100 text-blue-900 px-2.5 py-1 rounded">{task.status}</span>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto">
              <code>{task.codeSnippet}</code>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => handleStatusChange(task.id, 'Passed & Merged')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1"
              >
                <CheckCircle2 className="w-4 h-4" /> <span>Pass & Merge</span>
              </button>
              <button 
                onClick={() => handleStatusChange(task.id, 'Reverted to Developer')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1"
              >
                <XCircle className="w-4 h-4" /> <span>Fail & Revert</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}