import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Briefcase, CheckCircle2, ChevronLeft, ChevronRight, FolderKanban, ListTodo, Plus, RefreshCw, Search, Sparkles, Users, X } from 'lucide-react';
import API from '../services/api';
import { useApp } from '../context/AppContext';
import { Badge, Button, Card, EmptyState, LoadingState, Notice, PageHeader, Stat } from './ui';

const isComplete = task => ['Completed', 'Approved'].includes(task.status);
const isDelivered = project => ['Completed', 'Deployed'].includes(project.status);
const tasksOf = project => Array.isArray(project.allocatedTasks) ? project.allocatedTasks : [];
const initials = name => (name || '?').split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
const statusTone = status => ['Completed', 'Deployed'].includes(status) ? 'green' : status === 'QA Review' ? 'amber' : ['In Progress', 'Development'].includes(status) ? 'blue' : 'neutral';
const teamOf = project => [...new Set([
  ...(Array.isArray(project.aiShortlistedTeam) ? project.aiShortlistedTeam.map(member => member.name) : []),
  ...tasksOf(project).map(task => task.assignedTo?.name),
].filter(Boolean))];
const formatDate = value => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
};

export default function Overview({ onNavigate, onOpenProject }) {
  const { user } = useApp();
  const isManager = user?.role === 'Manager';
  const [projects, setProjects] = useState(null);
  const [people, setPeople] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const request = useRef(0);

  const fetchOverview = useCallback(async () => {
    const sequence = ++request.current;
    setRefreshing(true);
    const results = await Promise.allSettled([API.get('/projects'), API.get('/talent')]);
    if (sequence !== request.current) return;
    const failures = [];
    const [projectResult, peopleResult] = results;
    if (projectResult.status === 'fulfilled' && Array.isArray(projectResult.value.data.projects)) setProjects(projectResult.value.data.projects);
    else failures.push(projectResult.reason?.response?.data?.error || 'Project information is unavailable.');
    if (peopleResult.status === 'fulfilled') {
      const data = peopleResult.value.data;
      const directory = data.talent || data.employees || data;
      if (Array.isArray(directory)) setPeople(directory);
      else failures.push('Workforce information is unavailable.');
    } else failures.push(peopleResult.reason?.response?.data?.error || 'Workforce information is unavailable.');
    setErrors([...new Set(failures)]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchOverview();
    return () => { request.current += 1; };
  }, [fetchOverview]);

  const allTasks = (projects || []).flatMap(tasksOf);
  const activeProjects = (projects || []).filter(project => !isDelivered(project));
  const completedTasks = allTasks.filter(isComplete).length;
  const filtered = useMemo(() => (projects || []).filter(project => (!statusFilter || project.status === statusFilter) && [project.title, ...teamOf(project)].join(' ').toLowerCase().includes(query.trim().toLowerCase())), [projects, query, statusFilter]);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleProjects = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = !!(query || statusFilter);
  const clearFilters = () => { setQuery(''); setStatusFilter(''); setPage(1); };

  return (
    <div className="ws-page space-y-6">
      <PageHeader eyebrow="Your workspace" title="Workspace overview" description="A clear view of your projects, team capacity, and the work that needs attention."
        actions={<><Button variant="secondary" icon={RefreshCw} onClick={fetchOverview} disabled={refreshing} aria-label="Refresh workspace overview">{refreshing ? 'Refreshing…' : 'Refresh'}</Button>{isManager && <Button icon={Plus} onClick={() => onNavigate('Dashboard')}>Create project</Button>}</>} />
      {errors.map(message => <Notice key={message} tone="error">{message}</Notice>)}
      <div className="ws-grid-4">
        <Stat label="Total projects" value={projects ? projects.length : '—'} description={projects ? `${projects.filter(isDelivered).length} delivered across the workspace` : 'Waiting for project data'} icon={FolderKanban} />
        <Stat label="Active projects" value={projects ? activeProjects.length : '—'} description="Planning, development, and review" icon={Briefcase} />
        <Stat label="Open tasks" value={projects ? allTasks.length - completedTasks : '—'} description={projects ? `${completedTasks} of ${allTasks.length} tasks completed` : 'Waiting for task data'} icon={ListTodo} />
        <Stat label="Available members" value={people ? people.filter(person => person.availability === 'Available').length : '—'} description={people ? `${people.length} people in your workforce` : 'Waiting for workforce data'} icon={Users} />
      </div>

      <div className="ws-overview-grid">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Projects</h2><p className="mt-1 text-xs text-slate-500">Track delivery and open a project to continue working.</p></div><Badge>{projects ? `${projects.length} projects` : loading ? 'Loading' : 'Unavailable'}</Badge></div>
          <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
            <div className="relative min-w-[180px] flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" aria-label="Search projects" className="w-full pl-9" placeholder="Search projects or team members" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
            <select aria-label="Filter projects by status" className="w-full sm:w-40" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{['Planning', 'In Progress', 'Development', 'QA Review', 'Completed', 'Deployed'].map(status => <option key={status}>{status}</option>)}</select>
            {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
          </div>
          {loading ? <LoadingState label="Loading your projects…" /> : visibleProjects.length ? <>
            <div className="ws-table-wrap">
              <table className="ws-table">
                <thead><tr><th>Project name</th><th>Status</th><th>Progress</th><th>Team</th><th aria-label="Project actions" /></tr></thead>
                <tbody>{visibleProjects.map(project => {
                  const tasks = tasksOf(project);
                  const completed = tasks.filter(isComplete).length;
                  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
                  const team = teamOf(project);
                  return <tr key={project._id}>
                    <td><div className="ws-project-name"><span className="ws-project-icon"><FolderKanban size={18} strokeWidth={1.5} /></span><div><button className="text-left text-xs font-semibold text-slate-800 hover:text-[#00684a] hover:underline" onClick={() => onOpenProject(project)}>{project.title}</button><p className="mt-1 text-[10px] text-slate-400">Created {formatDate(project.createdAt)}</p></div></div></td>
                    <td><Badge tone={statusTone(project.status)} dot>{project.status || 'Planning'}</Badge></td>
                    <td className="min-w-[115px]"><div className="mb-2 flex items-center justify-between gap-3 text-[10px]"><span className="text-slate-500">{completed}/{tasks.length} tasks</span><span className="font-medium text-slate-600">{progress}%</span></div><div className="ws-progress" role="progressbar" aria-label={`${project.title} task completion`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div></td>
                    <td><div className="flex items-center -space-x-1.5" title={team.join(', ')}>{team.slice(0, 3).map((name, index) => <span key={name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-50 text-[9px] font-semibold text-[#00684a]" style={index % 2 ? { background: '#eef0f8', color: '#697399' } : undefined}>{initials(name)}</span>)}{team.length > 3 && <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-medium text-slate-500">+{team.length - 3}</span>}{!team.length && <span className="whitespace-nowrap text-[10px] text-slate-400">No team assigned</span>}</div></td>
                    <td><Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => onOpenProject(project)} aria-label={`Open ${project.title}`} /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4"><p className="text-[11px] text-slate-500">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} projects</p><div className="flex items-center gap-2"><Button variant="secondary" size="sm" icon={ChevronLeft} aria-label="Previous project page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} /><span className="text-[10px] text-slate-500">{currentPage} / {pageCount}</span><Button variant="secondary" size="sm" icon={ChevronRight} aria-label="Next project page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} /></div></div>
          </> : <EmptyState icon={FolderKanban} title={hasFilters ? 'No matching projects' : projects ? 'Your next project starts here' : 'Projects are unavailable'} description={hasFilters ? 'Try another project name, team member, or status.' : projects ? 'Add a project brief, review the suggested plan, and bring your team together.' : 'Try refreshing when the server connection is available.'} action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : projects && isManager ? <Button icon={Plus} onClick={() => onNavigate('Dashboard')}>Create your first project</Button> : !projects ? <Button variant="secondary" icon={RefreshCw} onClick={fetchOverview}>Try again</Button> : null} />}
        </Card>

        <aside className="ws-overview-aside">
          <Card>
            <div className="px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Explore your workspace</h2><p className="mt-1 text-xs text-slate-500">Everything your team needs, together.</p></div>
            {[
              { title: 'Project documents', description: 'Files, requirements, and project knowledge.', Icon: BookOpen, view: 'ProjectDocs' },
              { title: 'Workforce registry', description: 'People, availability, and skills.', Icon: Users, view: 'TalentMatrix' },
              { title: 'Knowledge assistant', description: 'Ask a question and find useful context.', Icon: Sparkles, view: 'KnowledgeCopilot' },
            ].map(({ title, description, Icon, view }) => <button key={view} className="ws-guide-item" onClick={() => onNavigate(view)}><Icon size={19} strokeWidth={1.5} /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={14} /></button>)}
          </Card>
          <div className="ws-quick-note"><span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#00825a]"><CheckCircle2 size={18} /></span><h3>{isManager ? 'From a brief to a working plan' : 'Keep your work moving'}</h3><p>{isManager ? 'Start with a whiteboard or a project document. Review every task and choose the right owners before creating your project.' : 'Open a project to see assigned tasks, review documents, and collaborate with your team.'}</p><Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => onNavigate(isManager ? 'Dashboard' : 'UnifiedWorkspace')}>{isManager ? 'Plan a new project' : 'Open workspace'}</Button></div>
        </aside>
      </div>
    </div>
  );
}
