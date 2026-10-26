import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Briefcase, CheckCircle2, CircleDollarSign, ListTodo, RefreshCw, Users } from 'lucide-react';
import API from '../services/api';
import { Badge, Button, Card, EmptyState, LoadingState, Notice, PageHeader, Stat } from './ui';

const tasksOf = project => Array.isArray(project.allocatedTasks) ? project.allocatedTasks : [];
const isComplete = task => ['Completed', 'Approved'].includes(task.status);
const isDelivered = project => ['Completed', 'Deployed'].includes(project.status);
const percent = (value, total) => total ? Math.round(value / total * 100) : 0;

export default function ExecutiveROI() {
  const [projects, setProjects] = useState(null);
  const [people, setPeople] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);
  const request = useRef(0);

  const fetchMetrics = useCallback(async () => {
    const sequence = ++request.current;
    setRefreshing(true);
    const [projectResult, peopleResult] = await Promise.allSettled([API.get('/projects'), API.get('/talent')]);
    if (sequence !== request.current) return;
    const failures = [];
    if (projectResult.status === 'fulfilled' && Array.isArray(projectResult.value.data.projects)) setProjects(projectResult.value.data.projects);
    else failures.push(projectResult.reason?.response?.data?.error || 'Project metrics are unavailable.');
    if (peopleResult.status === 'fulfilled') {
      const data = peopleResult.value.data;
      const list = data.talent || data.employees || data;
      if (Array.isArray(list)) setPeople(list);
      else failures.push('Workforce metrics are unavailable.');
    } else failures.push(peopleResult.reason?.response?.data?.error || 'Workforce metrics are unavailable.');
    setErrors([...new Set(failures)]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
    return () => { request.current += 1; };
  }, [fetchMetrics]);

  const tasks = (projects || []).flatMap(tasksOf);
  const completed = tasks.filter(isComplete).length;
  const available = (people || []).filter(person => person.availability === 'Available').length;
  const projectStatuses = [
    { label: 'Planning', count: (projects || []).filter(project => project.status === 'Planning').length, color: '#b3cabb' },
    { label: 'In development', count: (projects || []).filter(project => ['In Progress', 'Development'].includes(project.status)).length, color: '#5889a6' },
    { label: 'In review', count: (projects || []).filter(project => project.status === 'QA Review').length, color: '#e1b76b' },
    { label: 'Delivered', count: (projects || []).filter(isDelivered).length, color: '#008a5e' },
  ];
  const taskStatuses = [
    { label: 'To do', count: tasks.filter(task => !task.status || task.status === 'To Do').length, color: '#b4c5ba' },
    { label: 'In progress', count: tasks.filter(task => task.status === 'In Progress').length, color: '#739db5' },
    { label: 'Awaiting review', count: tasks.filter(task => ['Awaiting QA', 'Done'].includes(task.status)).length, color: '#dfb764' },
    { label: 'Completed', count: completed, color: '#149669' },
  ];
  const workforce = [
    { label: 'Available', count: available, color: '#149669' },
    { label: 'Busy', count: (people || []).filter(person => person.availability === 'Busy').length, color: '#7598ab' },
    { label: 'On leave', count: (people || []).filter(person => person.availability === 'On Leave').length, color: '#cbd5ce' },
  ];

  return (
    <div className="ws-page space-y-6">
      <PageHeader eyebrow="Workspace insights" title="Delivery analytics" description="Understand project progress and workforce capacity using the data in your workspace."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={fetchMetrics} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh metrics'}</Button>} />
      {errors.map(message => <Notice tone="error" key={message}>{message}</Notice>)}
      <div className="ws-grid-4">
        <Stat label="Projects delivered" value={projects ? projects.filter(isDelivered).length : '—'} description={projects ? `Of ${projects.length} projects in the workspace` : 'Waiting for project data'} icon={Briefcase} />
        <Stat label="Task completion" value={projects && tasks.length ? `${percent(completed, tasks.length)}%` : '—'} description={projects ? `${completed} of ${tasks.length} tasks completed` : 'Waiting for task data'} icon={CheckCircle2} />
        <Stat label="Tasks remaining" value={projects ? tasks.length - completed : '—'} description="Across all tracked projects" icon={ListTodo} />
        <Stat label="Available workforce" value={people ? available : '—'} description={people ? `${available} of ${people.length} members available` : 'Waiting for workforce data'} icon={Users} />
      </div>

      {loading ? <Card><LoadingState label="Calculating delivery metrics…" /></Card> : <>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Project distribution</h2><p className="mt-1 text-xs text-slate-500">Current delivery stage across your projects.</p></div><Badge>{projects ? `${projects.length} projects` : 'Unavailable'}</Badge></div>
            {projects?.length ? <div className="space-y-5 p-6">{projectStatuses.map(item => <MetricBar key={item.label} {...item} total={projects.length} />)}<p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">Delivered projects have a status of Completed or Deployed.</p></div> : <EmptyState icon={BarChart3} title={projects ? 'No project data yet' : 'Project data unavailable'} description={projects ? 'Project distribution will appear as your team creates and delivers projects.' : 'Refresh when the server connection is restored.'} />}
          </Card>
          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Task delivery</h2><p className="mt-1 text-xs text-slate-500">See how work moves from allocation to completion.</p></div><Badge>{projects ? `${tasks.length} tasks` : 'Unavailable'}</Badge></div>
            {tasks.length ? <div className="space-y-5 p-6">{taskStatuses.map(item => <MetricBar key={item.label} {...item} total={tasks.length} />)}<p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">Completion is based on approved or completed task records.</p></div> : <EmptyState icon={ListTodo} title={projects ? 'No task data yet' : 'Task data unavailable'} description={projects ? 'Assign tasks to your projects to begin tracking delivery progress.' : 'Task metrics will appear when project data is available.'} />}
          </Card>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card>
            <div className="border-b border-slate-200 px-6 py-4"><h2 className="text-sm font-semibold text-slate-900">Team availability</h2><p className="mt-1 text-xs text-slate-500">Availability recorded in the workforce registry.</p></div>
            {people?.length ? <div className="space-y-5 p-6"><div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Workforce availability distribution">{workforce.filter(item => item.count).map(item => <div key={item.label} title={`${item.label}: ${item.count}`} style={{ width: `${item.count / people.length * 100}%`, background: item.color }} />)}</div>{workforce.map(item => <div key={item.label} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</span><span className="font-medium text-slate-700">{item.count} <span className="ml-2 font-normal text-slate-400">{percent(item.count, people.length)}%</span></span></div>)}<p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">Availability is a profile setting. It does not measure billable utilization.</p></div> : <EmptyState icon={Users} title={people ? 'No workforce records yet' : 'Workforce data unavailable'} description="Team availability appears when member records are available." />}
          </Card>
          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Business impact & ROI</h2><p className="mt-1 text-xs text-slate-500">Financial outcomes need a connected source of business data.</p></div><Badge tone="neutral">Not connected</Badge></div>
            <EmptyState icon={CircleDollarSign} title="Connect business data to measure ROI" description="Financial ROI, time savings, and productivity improvements cannot be calculated from task counts alone." />
            <div className="mx-6 mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-medium text-slate-700">Data needed for a meaningful calculation</p><ul className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">{['Baseline delivery costs', 'Actual project investment', 'Tracked time and labor rates', 'Measured business outcomes'].map(item => <li key={item} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-slate-400" />{item}</li>)}</ul><p className="mt-4 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-400">Business-data ingestion is not configured in this workspace. No financial estimates are shown.</p></div>
          </Card>
        </div>
      </>}
    </div>
  );
}

function MetricBar({ label, count, total, color }) {
  const value = percent(count, total);
  return <div><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-slate-600">{label}</span><span className="font-medium text-slate-700">{count}<span className="ml-3 inline-block w-8 text-right font-normal text-slate-400">{value}%</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} /></div></div>;
}
