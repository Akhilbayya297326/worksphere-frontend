import React, { useState, useEffect, useRef, useCallback } from 'react';
import API from '../services/api';
import { Activity, Archive, Check, CheckCircle2, Circle, Code2, ExternalLink, FileText, FolderKanban, GitBranch, LayoutGrid, List, Loader2, Play, RefreshCw, Search, Server, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { PageHeader, Button, Badge, Card, EmptyState, LoadingState, Modal, Notice, Stat } from './ui';

const Icons = { Activity, Archive, Check, CheckCircle2, Circle, Code2, ExternalLink, FileText, FolderKanban, GitBranch, LayoutGrid, List, Loader2, Play, RefreshCw, Search, Server, ShieldCheck, Sparkles, Users, X };

// ==========================================
// 🛡️ CRASH PREVENTION: Safe Icon Wrapper
// ==========================================
const SafeIcon = ({ name, fallback = 'Circle', ...props }) => {
    const IconComponent = Icons[name] || Icons[fallback] || Icons.Circle;
    return IconComponent ? <IconComponent {...props} /> : <span className="inline-block w-4 h-4 bg-slate-500 rounded-full"></span>;
};

export default function UnifiedWorkspace({ project: projectProp, reviewOnly = false }) {
    const { user, socket, addChatMessage } = useApp();
    const isManager = user?.role === 'Manager' || user?.role === 'Admin';
    const canReview = isManager || user?.role === 'QA Tester';

    const [project, setProject] = useState(projectProp || null);
    const [availableProjects, setAvailableProjects] = useState(projectProp ? [projectProp] : []);
    const [taskQuery, setTaskQuery] = useState('');
    const [taskFilter, setTaskFilter] = useState(reviewOnly ? 'Awaiting QA' : 'all');
    const [taskView, setTaskView] = useState('list');
    const [activeTab, setActiveTab] = useState(reviewOnly || !isManager ? 'jira' : 'overview');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(!projectProp);
    const [refreshing, setRefreshing] = useState(false);
    const [savingTask, setSavingTask] = useState(null);
    const [isReleasing, setIsReleasing] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [isReleased, setIsReleased] = useState(false);
    const [workspaceError, setWorkspaceError] = useState('');
    const taskUpdates = useRef(new Set());
    const requestSequence = useRef(0);
    const pendingTimers = useRef(new Set());
    const mounted = useRef(true);
    const integrationRequest = useRef(false);

    const schedule = (callback, delay) => {
        if (!mounted.current) return;
        const timer = setTimeout(() => {
            pendingTimers.current.delete(timer);
            callback();
        }, delay);
        pendingTimers.current.add(timer);
    };

    useEffect(() => {
        mounted.current = true;
        const timers = pendingTimers.current;
        return () => {
            mounted.current = false;
            requestSequence.current += 1;
            timers.forEach(clearTimeout);
            timers.clear();
        };
    }, []);

    // INTEGRATION STATE (GitHub & Webex)
    const [integrationData, setIntegrationData] = useState(null);
    const [isFetchingIntegrations, setIsFetchingIntegrations] = useState(false);
    const [integrationError, setIntegrationError] = useState(null);

    // AI DIAGNOSTIC STATE (Manager QA)
    const [aiDiagnostic, setAiDiagnostic] = useState(null);
    const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

    // DEVOPS & TELEMETRY STATE
    const [telemetry, setTelemetry] = useState(null);
    const [telemetryError, setTelemetryError] = useState('');
    const [pipelineState, setPipelineState] = useState('idle');
    const [pipelineLogs, setPipelineLogs] = useState([]);
    const terminalEndRef = useRef(null);

    // 🐝 MERGED AGENT STATE (Swarm & Blast Radius)
    const [rawCodeInput, setRawCodeInput] = useState('');
    const [swarmContext, setSwarmContext] = useState('');

    // -> Swarm specific
    const [isSwarmActive, setIsSwarmActive] = useState(false);
    const [swarmData, setSwarmData] = useState(null);
    const [visibleSwarmLogs, setVisibleSwarmLogs] = useState([]);
    const [isPatching, setIsPatching] = useState(false);
    const [patchApplied, setPatchApplied] = useState(false);
    const swarmTerminalRef = useRef(null);

    // -> Blast Radius specific
    const [isAnalyzingCode, setIsRunningCodeAnalysis] = useState(false);
    const [codeAnalysisResult, setCodeAnalysisResult] = useState(null);

    // ==========================================
    // 🔄 DATA FETCHING & SYNCING
    // ==========================================
    const fetchProjectData = useCallback(async () => {
        const sequence = ++requestSequence.current;
        setRefreshing(true);
        try {
            const { data } = await API.get('/projects');
            if (sequence !== requestSequence.current) return;
            if (!data.success || !Array.isArray(data.projects)) throw new Error(data.error || 'Invalid project response.');
            setAvailableProjects(data.projects);
            setProject(previous => data.projects.find(item => item._id === previous?._id) || data.projects[0] || null);
            setWorkspaceError('');
        } catch (error) {
            if (sequence === requestSequence.current) setWorkspaceError(error.response?.data?.error || 'Failed to load workspace data.');
        } finally {
            if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false); }
        }
    }, []);

    useEffect(() => {
        if (projectProp) { setProject(projectProp); setLoading(false); }
        fetchProjectData();
    }, [projectProp, fetchProjectData]);

    useEffect(() => {
        if (project) {
            setIsReleased(project.status === 'Completed' || project.status === 'Deployed');
            if (Array.isArray(project.allocatedTasks)) {
                setTasks(project.allocatedTasks.map((task) => ({
                    id: task._id || task.id,
                    assignee: task.assignedTo?.name || "Unassigned",
                    role: task.assignedTo?.role || "Developer",
                    task: task.title || task.task || "No task title",
                    description: task.description || "",
                    status: task.status === 'Done' ? 'Awaiting QA' : task.status === 'Approved' ? 'Completed' : task.status || 'To Do',
                    complexity: task.complexity || 'Medium',
                })));
            } else setTasks([]);
        } else setTasks([]);
    }, [project]);

    // LISTEN TO BACKEND SOCKETS FOR CI/CD
    useEffect(() => {
        if (!socket) return;
        const handleTelemetry = data => {
            if (!data || typeof data !== 'object') return;
            setTelemetry({ cpu: data.cpu ?? data.cpuLoad, ram: data.ram ?? data.ramUsage,
                network: data.network ?? data.networkThroughput, networkAvailable: data.networkAvailable });
            setTelemetryError('');
        };
        const handleAlert = data => setWorkspaceError(data.message || 'A workspace alert was received.');
        socket.on('server_telemetry', handleTelemetry);
        socket.on('sev1_alert', handleAlert);
        socket.on('workspace_updated', fetchProjectData);
        socket.on('connect', fetchProjectData);

        const handlePipelineState = data => { if (typeof data?.state === 'string') setPipelineState(data.state); };
        const handlePipelineLog = log => { if (typeof log === 'string') setPipelineLogs(prev => [...prev, log].slice(-200)); };

        socket.on('pipelineState', handlePipelineState);
        socket.on('pipelineLog', handlePipelineLog);

        return () => {
            socket.off('server_telemetry', handleTelemetry);
            socket.off('sev1_alert', handleAlert);
            socket.off('workspace_updated', fetchProjectData);
            socket.off('connect', fetchProjectData);
            socket.off('pipelineState', handlePipelineState);
            socket.off('pipelineLog', handlePipelineLog);
        };
    }, [socket, fetchProjectData]);

    // FETCH REAL HARDWARE TELEMETRY
    useEffect(() => {
        if (activeTab !== 'devops') return;
        const controller = new AbortController();
        let inFlight = false;
        const fetchMetrics = async () => {
            if (inFlight) return;
            inFlight = true;
            try {
                const { data } = await API.get('/workspace/telemetry', { signal: controller.signal });
                if (!controller.signal.aborted && data.success) { setTelemetry(data.data); setTelemetryError(''); }
            } catch { if (!controller.signal.aborted) setTelemetryError('Server metrics could not be refreshed. Displaying the last received measurements, if available.'); }
            finally { inFlight = false; }
        };
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 3000);
        return () => { clearInterval(interval); controller.abort(); };
    }, [activeTab]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [pipelineLogs]);

    // ==========================================
    // 📌 KANBAN LOGIC & CHAT TRIGGERS
    // ==========================================
    const advanceTask = async (taskId, currentStatus, targetStatus = null, assigneeName = "", taskName = "") => {
        const newStatus = targetStatus || (currentStatus === 'To Do' ? 'In Progress' : 'Awaiting QA');
        if (!project?._id || !taskId || taskUpdates.current.has(taskId)) return;
        taskUpdates.current.add(taskId);
        setSavingTask(taskId);
        setWorkspaceError('');
        try {
            const { data } = await API.put(`/projects/${project._id}/tasks/${taskId}`, { status: newStatus });
            if (!data.success) throw new Error(data.error || 'Task update failed.');
            setTasks(previous => previous.map(task => task.id === taskId ? { ...task, status: newStatus } : task));
            const updateProject = item => item._id === project._id ? { ...item, allocatedTasks: item.allocatedTasks.map(task => (task._id || task.id) === taskId ? { ...task, status: newStatus } : task) } : item;
            setProject(previous => updateProject(previous));
            setAvailableProjects(previous => previous.map(updateProject));
        } catch (error) {
            setWorkspaceError(error.response?.data?.error || error.message || 'Task update failed.');
            return;
        } finally {
            taskUpdates.current.delete(taskId);
            setSavingTask(null);
        }

        if (addChatMessage) {
            if (newStatus === 'In Progress' && currentStatus === 'To Do') {
                addChatMessage({ author: user?.name || assigneeName || 'Developer', role: 'Engineering', isBot: false, text: `🚀 TASK STARTED: "${taskName}" is now in progress.`, channel: 'engineering' });
            }
            else if (newStatus === 'Awaiting QA') {
                addChatMessage({ author: user?.name || assigneeName || 'Developer', role: 'Engineering', isBot: false, urgent: true, text: `🔔 READY FOR REVIEW: "${taskName}" was marked done and is ready for QA review.`, channel: 'qa-alerts' });
            }
            else if (newStatus === 'Completed') {
                addChatMessage({ author: user?.name || 'Project Manager', role: 'Manager', isBot: false, text: `✅ TASK APPROVED: "${taskName}", assigned to ${assigneeName}, was approved by the manager.`, channel: 'global-orchestration' });
            }
            else if (newStatus === 'In Progress' && currentStatus === 'Awaiting QA') {
                addChatMessage({ author: user?.name || 'Project Manager', role: 'Manager', isBot: false, urgent: true, text: `❌ REVIEW CHANGES REQUESTED: ${assigneeName}, "${taskName}" was returned to In Progress for further work.`, channel: 'qa-alerts' });
            }
        }

    };

    const askAgent = (taskText) => {
        setActiveTab('agent');
        setSwarmContext(`Guidance required for task: ${taskText}`);
    };

    // ==========================================
    // 🐝 AUTONOMOUS AGENT SWARM DEBATE & PATCH
    // ==========================================
    const triggerAgentSwarm = async () => {
        if (!rawCodeInput.trim()) return setWorkspaceError('Add a code snippet to request a review.');
        setIsSwarmActive(true);
        setSwarmData(null);
        setVisibleSwarmLogs([]);
        setPatchApplied(false);

        try {
            const { data } = await API.post(`/projects/${project._id}/agent-swarm`, {
                codeSnippet: rawCodeInput, errorLogs: swarmContext
            });
            if (!mounted.current) return;

            if (!data.success || !Array.isArray(data.swarmData?.swarmDebate)) throw new Error(data.error || 'Invalid swarm response.');
            if (data.success) {
                setSwarmData(data.swarmData);
                const debate = data.swarmData.swarmDebate;
                setVisibleSwarmLogs(debate);
                setIsSwarmActive(false);
            }
        } catch (error) {
            setWorkspaceError(error.response?.data?.error || error.message || 'AI review is unavailable.');
            setIsSwarmActive(false);
        }
    };

    const handleApplyPatch = async () => {
        setIsPatching(true);
        try {
            const { data } = await API.post(`/projects/${project._id}/apply-patch`, {
                patchedCode: swarmData.finalPatchedCode,
                commitMessage: swarmData.consensusReached,
                uploaderName: user?.name
            });

            if (!data.success) throw new Error(data.error || 'Suggested patch could not be saved.');
            if (data.success) {
                setPatchApplied(true);
                socket?.emit('trigger_workspace_update');
                fetchProjectData();
            }
        } catch (error) {
            setWorkspaceError(error.response?.data?.error || error.message || 'Failed to save suggested patch.');
        } finally {
            setIsPatching(false);
        }
    };

    // ==========================================
    // 🕸️ BLAST RADIUS MODELER (ReactFlow)
    // ==========================================
    const analyzeCodeErrors = async () => {
        if (!rawCodeInput.trim()) return setWorkspaceError('Add a code snippet to explore an illustrative impact map.');
        setIsRunningCodeAnalysis(true);

        const inputLower = rawCodeInput.toLowerCase();
        let affectedFiles = ['UI component', 'Shared state', 'Related views'];
        let mentorName = "Lead Frontend Architect";

        if (inputLower.includes('route') || inputLower.includes('api')) {
            affectedFiles = ['API routes', 'Request middleware', 'Client data requests'];
            mentorName = "Senior Backend Security Engineer";
        }
        if (inputLower.includes('db') || inputLower.includes('schema') || inputLower.includes('mongoose')) {
            affectedFiles = ['Database schema', 'Data access layer', 'Request handlers'];
            mentorName = "Principal Database Architect";
        }

        schedule(() => {
            setCodeAnalysisResult({
                blastRadius: affectedFiles,
                mentorVector: `Illustrative dependency map based on keywords. Suggested reviewer: ${mentorName}. Repository dependencies and history have not been inspected.`,
                remediationSteps: ['Review actual dependencies and reproduce the error before applying a fix.', 'Run the relevant tests against the affected code.']
            });
            setIsRunningCodeAnalysis(false);
        }, 1800);
    };

    let graphNodes = [];
    let graphEdges = [];
    if (codeAnalysisResult?.blastRadius) {
        graphNodes.push({ id: 'root', position: { x: 250, y: 20 }, data: { label: 'Code snippet' }, style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px', fontWeight: 600 } });
        codeAnalysisResult.blastRadius.forEach((file, index) => {
            const xPos = 50 + (index * 200);
            graphNodes.push({ id: `node-${index}`, position: { x: xPos, y: 150 }, data: { label: file }, style: { background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '11px' } });
            graphEdges.push({ id: `edge-${index}`, source: 'root', target: `node-${index}`, style: { stroke: '#94a3b8', strokeWidth: 1.5 } });
        });
    }

    // ==========================================
    // ⚙️ DIAGNOSTICS & DEPLOYMENTS
    // ==========================================
    const executeAuthenticAiDiagnostic = async () => {
        setIsRunningDiagnostic(true);
        try {
            const payload = {
                repoName: integrationData?.backend?.repo || project?.title || "Enterprise Repo",
                tasks: tasks,
                commits: integrationData?.backend?.recentCommits || []
            };
            const { data } = await API.post('/workspace/ai-diagnostic', payload);
            if (!data.success) throw new Error(data.error || 'Diagnostic could not be completed.');
            setAiDiagnostic(data.data);
        } catch (err) {
            setAiDiagnostic({
                statusEvaluation: 'UNAVAILABLE',
                diagnosticSummary: err.response?.data?.error || err.message || 'Diagnostic service is unavailable. Repository health has not been verified.'
            });
        } finally {
            setIsRunningDiagnostic(false);
        }
    };

    const runLivePipeline = async () => {
        setPipelineState('requesting');
        setPipelineLogs([]);
        try {
            const { data } = await API.post('/workspace/deploy');
            if (!data.success) throw new Error(data.error || 'Deployment request was not accepted.');
            setPipelineState(data.state || 'requested');
            setPipelineLogs(previous => [...previous, data.message || 'Request accepted. Waiting for runner updates.']);
        } catch (error) {
            setPipelineLogs([`[ERROR] ${error.response?.data?.error || 'Connection to CI/CD orchestrator failed.'}`]);
            setPipelineState('failed');
        }
    };

    // ==========================================
    // 🔗 DYNAMIC INTEGRATIONS
    // ==========================================
    const fetchLiveIntegrations = useCallback(async () => {
        if (integrationRequest.current) return;
        integrationRequest.current = true;
        setIsFetchingIntegrations(true);
        setIntegrationError(null);
        try {
            const { data } = await API.get('/projects/workspace-integrations');
            if (!data.success) throw new Error(data.error || 'Workspace integration is unavailable.');
            setIntegrationData(data.data);
        } catch (error) {
            setIntegrationError(error.response?.data?.error || 'Failed to connect to Integration Gateway.');
        } finally {
            integrationRequest.current = false;
            setIsFetchingIntegrations(false);
        }
    }, []);

    useEffect(() => {
        if (!integrationData && !integrationError && activeTab === 'github') fetchLiveIntegrations();
    }, [activeTab, integrationData, integrationError, fetchLiveIntegrations]);

    const releaseTeam = async () => {
        if (isReleasing) return;
        setIsReleasing(true);
        try {
            const { data } = await API.put(`/projects/${project._id}/status`, { status: 'Completed', userId: user?._id });
            if (!data.success) throw new Error(data.error || 'Project status could not be updated.');
            setIsReleased(true);
            setCompleteOpen(false);
            setProject(previous => ({ ...previous, status: 'Completed' }));
            setAvailableProjects(previous => previous.map(item => item._id === project._id ? { ...item, status: 'Completed' } : item));
        } catch (error) {
            setWorkspaceError(error.response?.data?.error || error.message || 'Project status could not be updated.');
        } finally {
            setIsReleasing(false);
        }
    };

    // ==========================================
    // Workspace views share the same persisted project and task handlers.
    const completedTasks = tasks.filter(task => task.status === 'Completed').length;
    const reviewTasks = tasks.filter(task => task.status === 'Awaiting QA').length;
    const progress = tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0;
    const team = [...new Map(tasks.filter(task => task.assignee !== 'Unassigned').map(task => [task.assignee, task])).values()];
    const visibleTasks = tasks.filter(task => (taskFilter === 'all' || task.status === taskFilter) && `${task.task} ${task.assignee}`.toLowerCase().includes(taskQuery.toLowerCase()));
    const workflow = ['To Do', 'In Progress', 'Awaiting QA', 'Completed'];
    const tabs = [{ id: 'overview', label: 'Overview', icon: 'LayoutGrid' }, { id: 'jira', label: 'Tasks', icon: 'List' }, { id: 'blueprint', label: 'Project brief', icon: 'FileText' }, { id: 'agent', label: 'AI review', icon: 'Sparkles' }, { id: 'github', label: 'Integrations', icon: 'GitBranch' }, { id: 'devops', label: 'Telemetry', icon: 'Activity' }];
    const taskActions = task => {
        if (isReleased) return <span className="text-xs text-slate-400">Project complete</span>;
        if (savingTask) return <span className="text-xs text-slate-500">{savingTask === task.id ? 'Saving…' : 'Update in progress'}</span>;
        if (canReview && task.status === 'Awaiting QA') return <div className="flex flex-wrap gap-2"><Button size="sm" icon={Icons.Check} onClick={() => advanceTask(task.id, task.status, 'Completed', task.assignee, task.task)}>Approve task</Button><Button size="sm" variant="secondary" onClick={() => advanceTask(task.id, task.status, 'In Progress', task.assignee, task.task)}>Request changes</Button></div>;
        const canWork = isManager || task.assignee === user?.name;
        if (canWork && task.status === 'To Do') return <Button size="sm" variant="secondary" icon={Icons.Play} onClick={() => advanceTask(task.id, task.status, 'In Progress', task.assignee, task.task)}>Start task</Button>;
        if (canWork && task.status === 'In Progress') return <Button size="sm" variant="secondary" icon={Icons.CheckCircle2} onClick={() => advanceTask(task.id, task.status, 'Awaiting QA', task.assignee, task.task)}>Submit for review</Button>;
        return <span className="text-xs text-slate-400">{task.status === 'Completed' ? 'Approved' : task.status === 'Awaiting QA' ? 'Awaiting review' : 'Assigned work'}</span>;
    };
    const briefSections = [
        ['Business goals', project?.analysis?.businessRequirements?.goals], ['Features', project?.analysis?.functionalRequirements?.featureList],
        ['Security requirements', project?.analysis?.nonFunctionalRequirements?.securityAndCompliance], ['Performance requirements', project?.analysis?.nonFunctionalRequirements?.performance],
        ['Technology stack', project?.analysis?.technicalRequirements?.techStack], ['System architecture', project?.projectKnowledgeBase?.systemArchitecture],
        ['Setup instructions', project?.projectKnowledgeBase?.setupInstructions], ['QA strategy', project?.projectKnowledgeBase?.qaTestingStrategy],
    ].filter(([, items]) => asItems(items).length);

    if (loading) return <LoadingState label="Loading your project workspace…" />;
    return (
        <div className="space-y-6 pb-8">
            <PageHeader eyebrow="Workspace" title="Project workspace" description="A shared view of delivery, ownership, and the work ahead." actions={<Button variant="secondary" icon={Icons.RefreshCw} onClick={fetchProjectData} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</Button>} />
            {workspaceError && <Notice tone="error"><div className="flex flex-wrap items-center justify-between gap-3"><span>{workspaceError}</span><div className="flex items-center gap-2"><Button variant="secondary" size="sm" onClick={fetchProjectData}>Retry</Button><button type="button" aria-label="Dismiss notice" onClick={() => setWorkspaceError('')}><SafeIcon name="X" size={16} /></button></div></div></Notice>}
            {!project ? <Card><EmptyState icon={Icons.FolderKanban} title="Your projects will appear here" description="Create and dispatch a project from the overview to bring the team’s work together." action={<Button variant="secondary" onClick={fetchProjectData}>Refresh projects</Button>} /></Card> : <>
                <Card className="overflow-hidden">
                    <div className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
                        <div className="min-w-0 flex-1"><label htmlFor="workspace-project" className="mb-2 block text-xs font-medium text-slate-500">Current project</label><div className="flex flex-wrap items-center gap-3"><select id="workspace-project" value={project._id} onChange={event => { const nextProject = availableProjects.find(item => item._id === event.target.value); if (nextProject) { setProject(nextProject); setWorkspaceError(''); setSwarmData(null); setCodeAnalysisResult(null); setAiDiagnostic(null); setRawCodeInput(''); setSwarmContext(''); setTaskQuery(''); setTaskFilter('all'); } }} disabled={isSwarmActive || isPatching || isRunningDiagnostic || isAnalyzingCode || Boolean(savingTask) || isReleasing} className="max-w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-base font-semibold text-slate-900 sm:min-w-64">{(availableProjects.length ? availableProjects : [project]).map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select><Badge tone={toneFor(project.status)} dot>{project.status || 'Planning'}</Badge></div><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{project.analysis?.businessRequirements?.vision || 'Keep assignments, reviews, and project context in one place.'}</p></div>
                        {isManager && !isReleased && <Button variant="secondary" icon={Icons.Archive} onClick={() => { setWorkspaceError(''); setCompleteOpen(true); }} disabled={isReleasing}>{isReleasing ? 'Saving…' : 'Complete project'}</Button>}
                    </div>
                    <nav aria-label="Project sections" className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4">{tabs.map(tab => <button key={tab.id} type="button" aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><SafeIcon name={tab.icon} size={16} />{tab.label}{tab.id === 'jira' && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{tasks.length}</span>}</button>)}</nav>
                </Card>

                {activeTab === 'overview' && <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Total tasks" value={tasks.length} description="Allocated to this project" icon={Icons.List} /><Stat label="In progress" value={tasks.filter(task => task.status === 'In Progress').length} description="Work currently underway" icon={Icons.Activity} /><Stat label="Awaiting review" value={reviewTasks} description="Ready for a quality check" icon={Icons.ShieldCheck} /><Stat label="Completed" value={completedTasks} description={`${progress}% of allocated tasks`} icon={Icons.CheckCircle2} /></div>
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
                        <Card className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Delivery progress</h2><p className="mt-1 text-sm text-slate-500">{completedTasks} of {tasks.length} tasks approved</p></div><span className="text-2xl font-semibold text-slate-900">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} /></div><div className="my-5 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">Next up</h3><Button variant="ghost" size="sm" onClick={() => setActiveTab('jira')}>View all tasks</Button></div>{tasks.filter(task => task.status !== 'Completed').slice(0, 4).map(task => <div key={task.id} className="flex items-center justify-between gap-4 border-t border-slate-100 py-3.5"><div className="min-w-0"><p className="text-sm font-medium text-slate-800">{task.task}</p><p className="mt-1 text-xs text-slate-500">{task.assignee}</p></div><Badge tone={toneFor(task.status)}>{task.status}</Badge></div>)}{!tasks.some(task => task.status !== 'Completed') && <p className="py-5 text-sm text-slate-500">{tasks.length ? 'All allocated tasks have been approved.' : 'No tasks have been allocated yet.'}</p>}</Card>
                        <Card className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><SafeIcon name="Users" size={17} className="text-slate-400" /><h2 className="text-base font-semibold text-slate-900">Project team</h2><span className="ml-auto text-xs text-slate-400">{team.length} members</span></div><div className="space-y-4">{team.map(member => <div key={member.assignee} className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">{member.assignee.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{member.assignee}</p><p className="text-xs text-slate-500">{member.role}</p></div></div>)}{!team.length && <p className="text-sm leading-6 text-slate-500">Team members appear when tasks are assigned.</p>}</div></Card>
                    </div>
                </>}

                {activeTab === 'jira' && <Card className="overflow-hidden">
                    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center"><div><h2 className="text-base font-semibold text-slate-900">Project tasks</h2><p className="mt-1 text-sm text-slate-500">{visibleTasks.length} of {tasks.length} tasks{isReleased ? ' · Project complete' : ''}</p></div><div className="flex rounded-lg border border-slate-200 p-1"><button type="button" aria-label="List view" aria-pressed={taskView === 'list'} onClick={() => setTaskView('list')} className={`rounded p-1.5 ${taskView === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><SafeIcon name="List" size={17} /></button><button type="button" aria-label="Board view" aria-pressed={taskView === 'board'} onClick={() => setTaskView('board')} className={`rounded p-1.5 ${taskView === 'board' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><SafeIcon name="LayoutGrid" size={17} /></button></div></div>
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><SafeIcon name="Search" size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input aria-label="Search tasks" value={taskQuery} onChange={event => setTaskQuery(event.target.value)} placeholder="Search tasks or people…" className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm" /></div><select aria-label="Filter tasks by status" value={taskFilter} onChange={event => setTaskFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option>{workflow.map(status => <option key={status}>{status}</option>)}</select></div>
                    {!visibleTasks.length ? <EmptyState icon={Icons.List} title={tasks.length ? 'No tasks match your filters' : 'No tasks allocated yet'} description={tasks.length ? 'Try another search or select a different status.' : 'Assignments will appear here when the project is dispatched.'} action={tasks.length ? <Button variant="secondary" onClick={() => { setTaskQuery(''); setTaskFilter('all'); }}>Clear filters</Button> : null} /> : taskView === 'list' ? <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-500"><tr><th className="px-5 py-3">Task</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Complexity</th><th className="px-5 py-3">Next step</th></tr></thead><tbody>{visibleTasks.map(task => <tr key={task.id} className="border-b border-slate-100 last:border-0"><td className="max-w-xs px-5 py-4"><p className="font-medium leading-5 text-slate-900">{task.task}</p>{task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>}<button type="button" onClick={() => askAgent(task.task)} className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700"><SafeIcon name="Sparkles" size={12} />Get AI guidance</button></td><td className="px-4 py-4 text-slate-600">{task.assignee}</td><td className="whitespace-nowrap px-4 py-4"><Badge tone={toneFor(task.status)} dot>{task.status}</Badge></td><td className="px-4 py-4 text-slate-500">{task.complexity}</td><td className="px-5 py-4">{taskActions(task)}</td></tr>)}</tbody></table></div> : <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-4">{workflow.map(status => <div key={status} className="min-w-0 rounded-xl bg-slate-50 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-600">{status}</span><span className="text-xs text-slate-400">{visibleTasks.filter(task => task.status === status).length}</span></div><div className="space-y-3">{visibleTasks.filter(task => task.status === status).map(task => <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm font-medium leading-6 text-slate-900">{task.task}</p><p className="mb-4 mt-3 text-xs text-slate-500">{task.assignee} · {task.complexity}</p>{taskActions(task)}<button type="button" onClick={() => askAgent(task.task)} className="mt-3 block text-xs font-medium text-emerald-700">Get AI guidance</button></div>)}{!visibleTasks.some(task => task.status === status) && <p className="py-8 text-center text-xs text-slate-400">No tasks</p>}</div></div>)}</div>}
                </Card>}

                {activeTab === 'blueprint' && (briefSections.length ? <div className="grid gap-5 lg:grid-cols-2">{briefSections.map(([title, items]) => <Card key={title} className="p-5 sm:p-6"><h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2><ul className="space-y-3">{asItems(items).map((item, index) => <li key={index} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /><span className="whitespace-pre-wrap">{item}</span></li>)}</ul></Card>)}</div> : <Card><EmptyState icon={Icons.FileText} title="No project brief available" description="Saved requirements, architecture notes, and setup instructions will appear here when they are added to this project." /></Card>)}

                {activeTab === 'agent' && <div className="space-y-5"><div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(0,1.5fr)]">
                    <Card className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><SafeIcon name="Code2" size={18} className="text-emerald-600" /><h2 className="text-base font-semibold text-slate-900">Review a code snippet</h2></div><p className="mb-5 text-sm leading-6 text-slate-500">Add the relevant code and context to request AI suggestions. Review and test suggested changes before using them.</p><label htmlFor="workspace-code" className="mb-2 block text-xs font-medium text-slate-700">Code snippet</label><textarea id="workspace-code" value={rawCodeInput} disabled={isSwarmActive || isPatching} onChange={event => { setRawCodeInput(event.target.value); setSwarmData(null); setVisibleSwarmLogs([]); setPatchApplied(false); setCodeAnalysisResult(null); }} rows={12} placeholder="Paste the code you want to review…" className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/60 p-3 font-mono text-xs leading-6 text-slate-700" /><label htmlFor="workspace-context" className="mb-2 mt-4 block text-xs font-medium text-slate-700">Context or error logs</label><textarea id="workspace-context" rows={3} value={swarmContext} disabled={isSwarmActive || isPatching} onChange={event => { setSwarmContext(event.target.value); setSwarmData(null); setPatchApplied(false); }} placeholder="What are you trying to resolve?" className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm" /><div className="mt-4 flex flex-wrap gap-2"><Button icon={isSwarmActive ? Icons.Loader2 : Icons.Sparkles} disabled={isSwarmActive || isPatching || isAnalyzingCode || !rawCodeInput.trim()} onClick={triggerAgentSwarm}>{isSwarmActive ? 'Reviewing…' : 'Request AI review'}</Button><Button variant="secondary" icon={Icons.GitBranch} disabled={isSwarmActive || isAnalyzingCode || !rawCodeInput.trim()} onClick={analyzeCodeErrors}>{isAnalyzingCode ? 'Preparing…' : 'Explore impact'}</Button></div></Card>
                    <div className="min-w-0 space-y-5">{isSwarmActive ? <Card><LoadingState label="Reviewing the supplied code…" /></Card> : swarmData ? <Card className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Review suggestions</h2><Badge tone="blue">AI generated</Badge></div><div className="space-y-4">{visibleSwarmLogs.map((turn, index) => <div key={index} className="border-l-2 border-slate-200 pl-4"><p className="text-xs font-semibold text-slate-700">{turn.agent}</p><p className="mt-1 text-sm leading-6 text-slate-500">{turn.message}</p></div>)}</div>{swarmData.consensusReached && <div className="my-5 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{swarmData.consensusReached}</div>}{swarmData.finalPatchedCode && <><h3 className="mb-3 text-sm font-semibold text-slate-800">Suggested patch</h3><pre className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-700"><code>{swarmData.finalPatchedCode}</code></pre><div className="mt-4">{patchApplied ? <Notice tone="success">Suggested patch saved to the project vault for review.</Notice> : <Button variant="secondary" disabled={isPatching || isReleased} icon={Icons.FileText} onClick={handleApplyPatch}>{isPatching ? 'Saving…' : 'Save suggestion to vault'}</Button>}</div></>}<div ref={swarmTerminalRef} /></Card> : !codeAnalysisResult && <Card><EmptyState icon={Icons.Sparkles} title="A second perspective on your code" description="Your review will appear here. Suggestions are based on the snippet and context you provide." /></Card>}
                    {codeAnalysisResult && <Card className="overflow-hidden p-5 sm:p-6"><h2 className="text-base font-semibold text-slate-900">Illustrative impact map</h2><p className="mt-2 text-sm leading-6 text-slate-500">{codeAnalysisResult.mentorVector}</p><div className="mt-5 h-64 rounded-lg border border-slate-200 bg-slate-50"><ReactFlow nodes={graphNodes} edges={graphEdges} fitView><Background color="#e2e8f0" gap={20} /><Controls /></ReactFlow></div><ul className="mt-4 space-y-2 text-xs leading-5 text-slate-500">{codeAnalysisResult.remediationSteps.map(step => <li key={step}>{step}</li>)}</ul></Card>}</div>
                </div>{isManager && <Card className="p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-base font-semibold text-slate-900">Repository diagnostics</h2><p className="mt-1 text-sm text-slate-500">Requires a connected repository checkout and test runner.</p></div><Button variant="secondary" icon={Icons.ShieldCheck} disabled={isRunningDiagnostic} onClick={executeAuthenticAiDiagnostic}>{isRunningDiagnostic ? 'Checking…' : 'Check availability'}</Button></div>{aiDiagnostic && <div className="mt-4"><Notice tone={aiDiagnostic.statusEvaluation === 'UNAVAILABLE' ? 'warning' : 'info'}>{aiDiagnostic.diagnosticSummary || 'The diagnostic returned no summary.'}</Notice></div>}</Card>}</div>}

                {activeTab === 'github' && <div className="space-y-5"><Card className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Project repositories</h2><p className="mt-1 text-sm text-slate-500">Links saved with this project.</p></div><Badge tone="neutral">{project.repositories?.length || 0} linked</Badge></div>{project.repositories?.length ? <div className="divide-y divide-slate-100">{project.repositories.map((repository, index) => <div key={index} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex min-w-0 items-center gap-3"><SafeIcon name="GitBranch" size={19} className="shrink-0 text-slate-400" /><div className="min-w-0"><p className="text-sm font-medium text-slate-800">{repository.repoType || 'Repository'}</p><p className="break-all text-xs text-slate-500">{repository.url}</p></div></div>{safeLink(repository.url) && <a href={safeLink(repository.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">Open repository<SafeIcon name="ExternalLink" size={13} /></a>}</div>)}</div> : <EmptyState icon={Icons.GitBranch} title="No repositories linked" description="Repositories added during project setup will appear here." />}</Card>
                    <Card className="p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Workspace integrations</h2><p className="mt-1 text-sm text-slate-500">Repository activity and configured meeting links.</p></div><Button variant="secondary" icon={Icons.RefreshCw} disabled={isFetchingIntegrations} onClick={fetchLiveIntegrations}>{isFetchingIntegrations ? 'Checking…' : 'Refresh integrations'}</Button></div>{isFetchingIntegrations ? <LoadingState label="Checking connected services…" /> : integrationError ? <Notice tone="warning">{integrationError}</Notice> : !integrationData ? <EmptyState icon={Icons.GitBranch} title="No integration data available" description="Refresh to check which services are configured." /> : <div className="grid gap-4 lg:grid-cols-2">{['frontend', 'backend'].filter(type => integrationData[type]).map(type => <div key={type} className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-medium capitalize text-slate-500">{type} repository</p><h3 className="mt-1 break-all text-sm font-semibold text-slate-800">{integrationData[type].repo || 'Repository'}</h3><p className="mt-2 text-xs text-slate-500">{Number.isFinite(integrationData[type].activePullRequests) ? `${integrationData[type].activePullRequests} open pull requests` : 'Pull request count unavailable'}</p><div className="mt-4 space-y-3">{integrationData[type].recentCommits?.map((commit, index) => <div key={index} className="border-t border-slate-100 pt-3"><p className="text-sm text-slate-700">{commit.message}</p><p className="mt-1 text-xs text-slate-400">{commit.author}{commit.time ? ` · ${commit.time}` : ''}</p></div>)}</div></div>)}{safeLink(integrationData.webex?.joinLink) && <a href={safeLink(integrationData.webex.joinLink)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-emerald-700">Open configured meeting<SafeIcon name="ExternalLink" size={14} /></a>}</div>}</Card>
                </div>}

                {activeTab === 'devops' && <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Backend server</h2><p className="mt-1 text-sm text-slate-500">Measurements reported by the backend, refreshed every three seconds.</p></div><Badge tone={socket?.connected ? 'green' : 'amber'} dot>{socket?.connected ? 'Socket connected' : 'Socket reconnecting'}</Badge></div>{telemetryError && <Notice tone="warning">{telemetryError}</Notice>}<div className="grid gap-4 lg:grid-cols-3"><Metric label="CPU load" value={telemetry?.cpu ?? telemetry?.cpuLoad} /><Metric label="Memory in use" value={telemetry?.ram ?? telemetry?.ramUsage} /><Card className="p-5"><p className="text-sm text-slate-500">Network throughput</p><p className="mt-3 text-2xl font-semibold text-slate-900">{telemetry?.networkAvailable === true ? `${telemetry.network ?? telemetry.networkThroughput} Mbps` : 'Unavailable'}</p><p className="mt-3 text-xs leading-5 text-slate-400">{telemetry?.networkAvailable === true ? 'Reported by the backend server.' : 'This server does not report a network measurement.'}</p></Card></div><Card className="p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="text-base font-semibold text-slate-900">Deployment runner</h2><p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">Request a deployment through the backend. A configured CI/CD runner is required.</p></div><Button variant="secondary" icon={Icons.Server} onClick={runLivePipeline} disabled={!['idle', 'failed', 'success'].includes(pipelineState)}>{['idle', 'failed', 'success'].includes(pipelineState) ? 'Request deployment' : 'Request pending…'}</Button></div><div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><span>Status</span><Badge tone={pipelineState === 'failed' ? 'red' : pipelineState === 'success' ? 'green' : 'neutral'}>{pipelineState === 'idle' ? 'No request made' : pipelineState}</Badge></div>{pipelineLogs.length ? <div role={pipelineState === 'failed' ? 'alert' : 'log'} className="mt-4 max-h-64 space-y-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-600">{pipelineLogs.map((log, index) => <p key={index} className="whitespace-pre-wrap break-words">{log}</p>)}<div ref={terminalEndRef} /></div> : <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-400">Runner updates will appear here after a request.</p>}</Card></div>}
            </>}
            <Modal open={completeOpen} title="Complete this project?" description="The project will be marked complete and task actions will be closed." onClose={() => { if (!isReleasing) setCompleteOpen(false); }} footer={<><Button variant="secondary" disabled={isReleasing} onClick={() => setCompleteOpen(false)}>Keep working</Button><Button icon={Icons.CheckCircle2} disabled={isReleasing} onClick={releaseTeam}>{isReleasing ? 'Saving…' : 'Complete project'}</Button></>}>
                <p className="text-sm leading-6 text-slate-600">Confirm that the team has finished the work in <strong>{project?.title}</strong> before completing it.</p>
                {workspaceError && <Notice tone="error">{workspaceError}</Notice>}
            </Modal>
        </div>
    );
}

const toneFor = status => ({ 'In Progress': 'blue', 'Awaiting QA': 'amber', Completed: 'green', Deployed: 'green' }[status] || 'neutral');
const asItems = value => Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : typeof value === 'string' && value.trim() ? value.split('\n').filter(Boolean) : [];
const safeLink = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; } };
function Metric({ label, value }) {
    const available = typeof value === 'number' && Number.isFinite(value);
    return <Card className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{available ? `${value.toFixed(1)}%` : '—'}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${available ? Math.min(100, Math.max(0, value)) : 0}%` }} /></div><p className="mt-2 text-xs text-slate-400">{available ? 'Reported by the backend server' : 'No measurement received'}</p></Card>;
}
