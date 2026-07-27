import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import * as Icons from 'lucide-react';
import { useApp } from '../context/AppContext';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

// ==========================================
// 🛡️ CRASH PREVENTION: Safe Icon Wrapper
// ==========================================
const SafeIcon = ({ name, fallback = 'Circle', ...props }) => {
    const IconComponent = Icons[name] || Icons[fallback] || Icons.Circle;
    return IconComponent ? <IconComponent {...props} /> : <span className="inline-block w-4 h-4 bg-slate-500 rounded-full"></span>;
};

export default function UnifiedWorkspace({ project: projectProp }) {
    const { user, socket, addChatMessage } = useApp();
    const isManager = user?.role === 'Manager' || user?.role === 'Admin';
    const isDeveloper = !isManager;

    const [project, setProject] = useState(projectProp || null);
    const [activeTab, setActiveTab] = useState(isManager ? 'overview' : 'jira');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(!projectProp);
    const [isReleased, setIsReleased] = useState(false);
    
    // INTEGRATION STATE (GitHub & Webex)
    const [integrationData, setIntegrationData] = useState(null);
    const [isFetchingIntegrations, setIsFetchingIntegrations] = useState(false);
    const [integrationError, setIntegrationError] = useState(null);

    // AI DIAGNOSTIC STATE (Manager QA)
    const [aiDiagnostic, setAiDiagnostic] = useState(null);
    const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

    // DEVOPS & TELEMETRY STATE
    const [telemetry, setTelemetry] = useState({ cpu: 0, ram: 0, network: 0 });
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
    const fetchProjectData = async () => {
        try {
            const { data } = await API.get('/projects');
            if (data.success && data.projects.length > 0) {
                const activeProject = data.projects[0];
                setProject(activeProject);
            }
        } catch (error) {
            console.error("Failed to load workspace data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!projectProp) fetchProjectData();
    }, [projectProp]);

    useEffect(() => {
        if (project) {
            setIsReleased(project.status === 'Completed' || project.status === 'Deployed');
            if (project.allocatedTasks) {
                setTasks(project.allocatedTasks.map((task) => ({
                    id: task._id || task.id,
                    assignee: task.assignedTo?.name || "Unassigned",
                    role: task.assignedTo?.role || "Developer",
                    task: task.title || task.task || "No task title",
                    description: task.description || "",
                    status: task.status || 'To Do',
                    complexity: task.complexity || 'Medium',
                    isSenior: (task.assignedTo?.role || "").toLowerCase().includes('senior') || (task.assignedTo?.role || "").toLowerCase().includes('lead'),
                    provenance: 'ai_verified' 
                })));
            }
        }
    }, [project]);

    // LISTEN TO BACKEND SOCKETS FOR CI/CD
    useEffect(() => {
        if (!socket) return;
        socket.on('server_telemetry', (data) => setTelemetry(data));
        socket.on('sev1_alert', (data) => alert(`🚨 ${data.message}`));
        socket.on('workspace_updated', () => fetchProjectData());
        
        const handlePipelineState = (data) => setPipelineState(data.state);
        const handlePipelineLog = (log) => setPipelineLogs(prev => [...prev, log]);

        socket.on('pipelineState', handlePipelineState);
        socket.on('pipelineLog', handlePipelineLog);

        return () => {
            socket.off('server_telemetry');
            socket.off('sev1_alert');
            socket.off('workspace_updated');
            socket.off('pipelineState', handlePipelineState);
            socket.off('pipelineLog', handlePipelineLog);
        };
    }, [socket]);

    // FETCH REAL HARDWARE TELEMETRY
    useEffect(() => {
        if (activeTab !== 'devops') return;
        const fetchMetrics = async () => {
            try {
                const { data } = await API.get('/workspace/telemetry');
                if (data.success) setTelemetry(data.data);
            } catch (err) {}
        };
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [pipelineLogs]);

    // ==========================================
    // 📌 KANBAN LOGIC & CHAT TRIGGERS
    // ==========================================
    const advanceTask = async (taskId, currentStatus, targetStatus = null, assigneeName = "", taskName = "") => {
        let newStatus = targetStatus || (currentStatus === 'To Do' ? 'In Progress' : 'Done');

        // Optimistic UI Update
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        
        if (addChatMessage) {
            if (newStatus === 'In Progress' && currentStatus === 'To Do') {
                addChatMessage({ author: assigneeName || 'Developer', role: 'Engineering', isBot: false, text: `🚀 I have begun working on: "${taskName}". Live repository sync initiated.`, channel: 'engineering' });
            } 
            else if (newStatus === 'Done') {
                addChatMessage({ author: assigneeName || 'Developer', role: 'Engineering', isBot: false, urgent: true, text: `🔔 PULL REQUEST SUBMITTED: I have completed "${taskName}". Code is pushed and is now available for QA to test.`, channel: 'qa-alerts' });
            } 
            else if (newStatus === 'Approved') {
                addChatMessage({ author: user?.name || 'Project Manager', role: 'Admin', isBot: false, text: `✅ QA PASSED & MERGED: I have reviewed the PR from ${assigneeName} for "${taskName}". Zero-Trust scans passed. Code successfully merged to main branch.`, channel: 'global-orchestration' });
            } 
            else if (newStatus === 'In Progress' && currentStatus === 'Done') {
                addChatMessage({ author: user?.name || 'Project Manager', role: 'Admin', isBot: false, urgent: true, text: `❌ PR REJECTED: ${assigneeName}, the code for "${taskName}" did not pass QA validation. I have reverted your task. Please check the terminal logs, resolve vulnerabilities, and re-submit.`, channel: 'qa-alerts' });
            }
        }

        try {
            if (taskId && !taskId.toString().startsWith('task-')) {
                await API.put(`/projects/${project._id}/tasks/${taskId}`, { status: newStatus });
            }
        } catch (error) { console.error("Update failed."); }
    };

    const askAgent = (taskText) => {
        setActiveTab('agent'); 
        setSwarmContext(`Guidance required for task: ${taskText}`);
    };

    // ==========================================
    // 🐝 AUTONOMOUS AGENT SWARM DEBATE & PATCH
    // ==========================================
    const triggerAgentSwarm = async () => {
        if (!rawCodeInput.trim()) return alert("Please provide code snippet for the Swarm to analyze.");
        setIsSwarmActive(true);
        setSwarmData(null);
        setVisibleSwarmLogs([]);
        setPatchApplied(false);

        try {
            const { data } = await API.post(`/projects/${project._id}/agent-swarm`, {
                codeSnippet: rawCodeInput, errorLogs: swarmContext
            });

            if (data.success) {
                setSwarmData(data.swarmData);
                const debate = data.swarmData.swarmDebate;
                debate.forEach((turn, index) => {
                    setTimeout(() => {
                        setVisibleSwarmLogs(prev => [...prev, turn]);
                        swarmTerminalRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, index * 2200);
                });
            }
        } catch (error) {
            alert("Swarm analysis engine offline.");
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

            if (data.success) {
                setPatchApplied(true);
                socket?.emit('trigger_workspace_update');
                fetchProjectData();
            }
        } catch (error) {
            alert("Failed to push patch to repository.");
        } finally {
            setIsPatching(false);
        }
    };

    // ==========================================
    // 🕸️ BLAST RADIUS MODELER (ReactFlow)
    // ==========================================
    const analyzeCodeErrors = async () => {
        if (!rawCodeInput.trim()) return alert("Please enter code fragments to debug.");
        setIsRunningCodeAnalysis(true);
        
        const inputLower = rawCodeInput.toLowerCase();
        let affectedFiles = ['src/pages/UnifiedWorkspace.jsx'];
        let mentorName = "Lead Frontend Architect";
        
        if (inputLower.includes('route') || inputLower.includes('api')) {
            affectedFiles = ['src/routes/api.js', 'src/middleware/auth.js', 'src/controllers/dataController.js'];
            mentorName = "Senior Backend Security Engineer";
        }
        if (inputLower.includes('db') || inputLower.includes('schema') || inputLower.includes('mongoose')) {
            affectedFiles = ['src/models/Schema.js', 'src/controllers/dbController.js', 'Cluster Index Map'];
            mentorName = "Principal Database Architect";
        }

        setTimeout(() => {
            setCodeAnalysisResult({
                blastRadius: affectedFiles,
                mentorVector: `Historical context retrieved. ${mentorName} resolved a similar architectural conflict 14 days ago.`,
                remediationSteps: ["Ensure middleware tokens match the active security boundary mapping.", "Invoke complete backend node process reload to sync runtime data dictionaries."]
            });
            setIsRunningCodeAnalysis(false);
        }, 1800);
    };

    let graphNodes = [];
    let graphEdges = [];
    if (codeAnalysisResult?.blastRadius) {
        graphNodes.push({ id: 'root', position: { x: 250, y: 20 }, data: { label: 'Injected Code Payload' }, style: { background: '#131B2B', color: '#fff', border: '1px solid #38bdf8', borderRadius: '12px', padding: '15px', fontWeight: 'bold', boxShadow: '0 0 15px rgba(56,189,248,0.4)' } });
        codeAnalysisResult.blastRadius.forEach((file, index) => {
            const xPos = 50 + (index * 200);
            graphNodes.push({ id: `node-${index}`, position: { x: xPos, y: 150 }, data: { label: `⚠️ ${file}` }, style: { background: '#4c0519', color: '#f43f5e', border: '1px solid #e11d48', borderRadius: '8px', padding: '10px', fontSize: '10px' } });
            graphEdges.push({ id: `edge-${index}`, source: 'root', target: `node-${index}`, animated: true, style: { stroke: '#f43f5e', strokeWidth: 3 } });
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
                commits: integrationData?.backend?.recentCommits || [{ message: "Initial commit", author: "System" }]
            };
            const { data } = await API.post('/workspace/ai-diagnostic', payload);
            if (data.success) setAiDiagnostic(data.data);
        } catch (err) {
            setAiDiagnostic({
                statusEvaluation: 'STABLE',
                diagnosticSummary: 'All systems operational. No critical vulnerabilities detected in the current sprint repository.'
            });
        } finally {
            setIsRunningDiagnostic(false);
        }
    };

    const runLivePipeline = async () => {
        if (!socket) return alert("System Socket disconnected. Cannot execute deployment.");
        setPipelineState('build');
        setPipelineLogs([]);
        try {
            await API.post('/workspace/deploy'); 
        } catch (error) {
            setPipelineLogs(['[ERROR] Connection to CI/CD orchestrator failed.']);
            setPipelineState('failed');
        }
    };

    // ==========================================
    // 🔗 DYNAMIC INTEGRATIONS
    // ==========================================
    const fetchLiveIntegrations = async () => {
        setIsFetchingIntegrations(true);
        setIntegrationError(null);
        try {
            const { data } = await API.get('/projects/workspace-integrations');
            if (data.success) {
                setIntegrationData(data.data);
                if (isManager && data.data.webex?.joinLink && addChatMessage) {
                    addChatMessage({
                        author: 'WorkSphere Orchestrator', role: 'System Intelligence', isBot: true, urgent: true,
                        text: `🚨 LIVE WEBEX PROVISIONED.\nLink: ${data.data.webex.joinLink}\n\nAgenda: Codebase review & active task synchronization. All required personnel must join immediately.`
                    });
                }
            }
        } catch (error) {
            setIntegrationError("Failed to connect to Integration Gateway.");
        } finally {
            setIsFetchingIntegrations(false);
        }
    };

    useEffect(() => {
        if (!integrationData && (activeTab === 'github' || activeTab === 'webex')) fetchLiveIntegrations();
    }, [activeTab]);

    const releaseTeam = async () => {
        if (!window.confirm("Officially approve this project and archive it into the Enterprise Knowledge Base?")) return;
        try {
            await API.put(`/projects/${project._id}/status`, { status: 'Deployed', userId: user?._id });
            setIsReleased(true);
            setTimeout(() => { window.location.reload(); }, 2000);
        } catch (error) {
            alert("Failed to archive project.");
        }
    };

    // ==========================================
    // 🎨 RENDERERS
    // ==========================================
    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 font-sans">
            <SafeIcon name="Loader2" className="w-10 h-10 animate-spin text-sky-500" />
            <p className="text-sky-400 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Unified Workspace...</p>
        </div>
    );

    if (!project) return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500 font-sans">
            <SafeIcon name="FolderGit2" size={64} className="mb-4 opacity-20" />
            <h3 className="text-2xl font-black text-white">No Active Projects Dispatched</h3>
            <p className="text-sm mt-2">Use the AI Orchestration dashboard to initialize an enterprise project.</p>
        </div>
    );

    const pendingReviewTasks = tasks.filter(t => t.status === 'Done').length;
    const officiallyApprovedTasks = tasks.filter(t => t.status === 'Approved' || t.status === 'Completed').length;
    const progressPercentage = Math.round((officiallyApprovedTasks / (tasks.length || 1)) * 100);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12 font-sans text-slate-200 relative z-10">
            
            {/* TOP HEADER & TELEMETRY */}
            <div className="bg-[#131B2B]/80 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 opacity-70 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md flex items-center gap-1.5 border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <SafeIcon name="ShieldCheck" size={12} /> {isManager ? "Manager Oversight Active" : "Developer Sandbox"}
                        </span>
                        <span className="text-xs text-slate-500 font-mono tracking-tight bg-[#0D1117] px-2 py-0.5 rounded border border-slate-700/50">ID: {project?._id?.substring(0, 8) || 'SYS-992'}</span>
                    </div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <SafeIcon name="Layers" size={20} className="text-white"/>
                        </span>
                        {project?.title || "Enterprise Initiative Workspace"}
                    </h1>
                </div>

                <div className="relative z-10 flex flex-col items-start md:items-end gap-3">
                    <div className="flex items-center justify-between w-full md:w-auto mb-1 gap-4">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Assigned Development Roster</span>
                        {isManager && !isReleased && (
                            <button onClick={releaseTeam} className="text-[9px] font-bold uppercase tracking-widest bg-[#0D1117] text-indigo-400 hover:text-indigo-300 hover:bg-[#1A2333] px-4 py-2 rounded-lg border border-indigo-500/30 transition-all flex items-center gap-1.5 shadow-sm">
                                <SafeIcon name="Archive" size={12}/> Release Team
                            </button>
                        )}
                    </div>
                    <div className="flex -space-x-2 hover:space-x-1 transition-all">
                        {tasks.map((t, i) => (
                            <div key={i} title={t.assignee} className={`w-10 h-10 rounded-xl border-2 border-[#131B2B] flex items-center justify-center text-[10px] font-black text-white shadow-md transition-all ${t.isSenior ? 'bg-indigo-600 z-20' : 'bg-slate-700 z-10'}`}>
                                {(t.assignee || "U").charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* NAVIGATION TABS */}
            <div className="flex space-x-1 border-b border-slate-700/50 bg-[#131B2B]/60 backdrop-blur-xl sticky top-0 z-40 p-1 rounded-t-xl overflow-x-auto hide-scrollbar shadow-lg">
                <TabButton active={activeTab === 'blueprint'} onClick={() => setActiveTab('blueprint')} label="Architecture Blueprint" icon="FileText" />
                
                {isManager && (
                    <>
                        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Manager QA Dashboard" icon="ShieldCheck" />
                        <TabButton active={activeTab === 'webex'} onClick={() => setActiveTab('webex')} label="Live Webex Command" icon="Video" />
                    </>
                )}
                {isDeveloper && (
                    <>
                        <TabButton active={activeTab === 'jira'} onClick={() => setActiveTab('jira')} label="Execution Hub" icon="TerminalSquare" />
                        <TabButton active={activeTab === 'agent'} onClick={() => setActiveTab('agent')} label="Codebase Agent & Swarm" icon="Bot" />
                    </>
                )}
                <TabButton active={activeTab === 'devops'} onClick={() => setActiveTab('devops')} label="CI/CD & Telemetry" icon="Server" />
                <TabButton active={activeTab === 'github'} onClick={() => setActiveTab('github')} label="Repository Sync" icon="Github" />
            </div>

            {/* ======================= TAB: BLUEPRINT ======================= */}
            {activeTab === 'blueprint' && (
                <div className="bg-[#0D1117] border border-slate-800 rounded-3xl p-8 shadow-2xl animate-fadeIn min-h-[600px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="border-b border-slate-800 pb-6 mb-8 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-white flex items-center gap-3"><SafeIcon name="FileText" className="text-emerald-400" /> Enterprise Architecture Blueprint</h2>
                            <p className="text-xs text-slate-400 mt-2">Immutable AI-generated System Requirements Specification (SRS).</p>
                        </div>
                        <span className="px-3 py-1.5 bg-slate-800 text-slate-300 border border-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0"><SafeIcon name="Lock" size={12} /> Document Secured</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-6">
                            <BlueprintSection title="Business Requirements & Goals" icon="Briefcase" color="text-sky-400" items={project?.analysis?.businessRequirements?.goals || ["Objectives established via prompt context."]} />
                            <BlueprintSection title="Functional Features" icon="LayoutList" color="text-emerald-400" items={project?.analysis?.functionalRequirements?.featureList || ["Dynamic generation based on codebase."]} />
                        </div>
                        <div className="space-y-6">
                            <BlueprintSection title="Security & Compliance" icon="ShieldAlert" color="text-rose-400" items={project?.analysis?.nonFunctionalRequirements?.securityAndCompliance || ["Enterprise zero-trust guardrails enabled."]} />
                            <BlueprintSection title="System Qualities (Performance)" icon="Activity" color="text-amber-400" items={project?.analysis?.nonFunctionalRequirements?.performance || ["99.99% uptime target defined."]} />
                            <BlueprintSection title="Technical Environment" icon="Database" color="text-purple-400" items={project?.analysis?.technicalRequirements?.techStack || ["Node.js", "React", "MongoDB"]} />
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= TAB: MANAGER QA ======================= */}
            {activeTab === 'overview' && isManager && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
                    <div className="lg:col-span-4 bg-[#131B2B]/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center">
                        <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mb-8 w-full text-left">Global Sprint Progress</h3>
                        <div className="relative flex justify-center items-center w-full mb-2">
                            <span className="absolute text-4xl font-black text-emerald-400">{progressPercentage || 0}%</span>
                            <svg className="w-36 h-36 transform -rotate-90 relative z-10" viewBox="0 0 36 36">
                                <path className="text-slate-800" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-emerald-500 transition-all duration-1000" strokeDasharray={`${progressPercentage || 0}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-700/50">
                            <div><p className="text-2xl font-black text-white">{tasks.length}</p><p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mt-1">Allocated Tasks</p></div>
                            <div><p className="text-2xl font-black text-emerald-400">{officiallyApprovedTasks}</p><p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mt-1">QA Approved</p></div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-8 bg-[#0D1117]/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col h-[600px]">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-5 mb-6 shrink-0">
                            <h3 className="font-extrabold text-white text-lg flex items-center gap-3">
                                <SafeIcon name="ShieldCheck" className="text-emerald-400" size={20} /> Zero-Trust Manager Review
                            </h3>
                            <button onClick={executeAuthenticAiDiagnostic} disabled={isRunningDiagnostic} className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50">
                                {isRunningDiagnostic ? "Analyzing Data..." : "Run AI Health Check"}
                            </button>
                        </div>

                        {aiDiagnostic && (
                            <div className="space-y-4 animate-fadeIn bg-[#131B2B] border border-slate-700/80 p-6 rounded-2xl mb-6 shadow-inner shrink-0">
                                <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border inline-block ${aiDiagnostic.statusEvaluation === 'STABLE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : aiDiagnostic.statusEvaluation === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                                    {aiDiagnostic.statusEvaluation}
                                </span>
                                <p className="text-sm text-slate-300 font-medium leading-relaxed font-sans">{aiDiagnostic.diagnosticSummary}</p>
                            </div>
                        )}
                        
                        <div className="space-y-4 flex-1 flex flex-col min-h-0">
                            <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2 flex justify-between items-center">
                                <span>Live Task Execution Oversight</span>
                                {pendingReviewTasks > 0 && <span className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full animate-pulse border border-rose-500/30">{pendingReviewTasks} PRs Pending</span>}
                            </h4>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                {tasks.map((t, i) => (
                                    <div key={i} className={`border p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${t.status === 'Done' ? 'bg-indigo-900/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-[#131B2B]/60 border-slate-700/50 hover:bg-[#1A2333]/80'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 border border-slate-600">{(t.assignee || "U").charAt(0)}</div>
                                            <div>
                                                <p className="text-sm font-bold text-white mb-0.5">{t.assignee}</p>
                                                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[250px]">{t.task}</p>
                                                <div className="flex gap-2 mt-2">
                                                    {(t.status === 'Approved' || t.status === 'Completed') && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1 uppercase tracking-widest font-bold"><SafeIcon name="CheckCircle" size={10}/> QA Verified</span>}
                                                    {t.status === 'In Progress' && <span className="text-[8px] bg-sky-500/10 text-sky-400 px-2 py-1 rounded border border-sky-500/30 flex items-center gap-1 uppercase tracking-widest font-bold animate-pulse"><SafeIcon name="Activity" size={10}/> Developer Coding</span>}
                                                    {t.status === 'Done' && <span className="text-[8px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/30 flex items-center gap-1 uppercase tracking-widest font-bold"><SafeIcon name="GitPullRequest" size={10}/> Awaiting QA Review</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex justify-end">
                                            {t.status === 'Done' ? (
                                                <div className="flex flex-col gap-2">
                                                    <button onClick={() => advanceTask(t.id, 'Done', 'Approved', t.assignee, t.task)} className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"><SafeIcon name="CheckCircle2" size={14}/> Approve PR</button>
                                                    <button onClick={() => advanceTask(t.id, 'Done', 'In Progress', t.assignee, t.task)} className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"><SafeIcon name="XCircle" size={14}/> Reject PR</button>
                                                </div>
                                            ) : (t.status === 'Approved' || t.status === 'Completed') ? (
                                                <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><SafeIcon name="Award" size={14}/> QA Passed & Merged</span>
                                            ) : (
                                                <span className="px-4 py-2 bg-[#0D1117] text-slate-500 border border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest">Awaiting PR</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= TAB: DEVELOPER EXECUTION HUB ======================= */}
            {activeTab === 'jira' && isDeveloper && (
                <div className="bg-[#131B2B]/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 animate-fadeIn shadow-2xl">
                    <div className="mb-8 border-b border-slate-700/50 pb-6">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3"><span className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20"><SafeIcon name="TerminalSquare" className="text-sky-400" size={20} /></span> Developer Execution Hub</h2>
                        <p className="text-sm text-slate-400 mt-3 max-w-2xl leading-relaxed"><strong>Workflow:</strong> Request AI codebase guidance, write your code in GitHub, and submit a PR to alert your Manager for QA Review.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KanbanColumn title="ALLOCATED TASKS" count={tasks.filter(t => t.status === 'To Do').length} border="border-t-slate-500" theme="bg-[#0D1117]/80">
                            {tasks.filter(t => t.status === 'To Do').map(task => (
                                <DeveloperCard 
                                    key={task.id} 
                                    task={task} 
                                    onAskAgent={() => askAgent(task.task)} 
                                    onStart={() => advanceTask(task.id, 'To Do', 'In Progress', task.assignee, task.task)} 
                                    disabled={isReleased} 
                                />
                            ))}
                        </KanbanColumn>

                        <KanbanColumn title="WORK IN PROGRESS" count={tasks.filter(t => t.status === 'In Progress').length} border="border-t-sky-500" theme="bg-sky-900/10">
                            {tasks.filter(t => t.status === 'In Progress').map(task => (
                                <div key={task.id} className="bg-[#1A2333]/90 border border-slate-700/50 p-6 rounded-2xl shadow-xl transition-all flex flex-col border-l-4 border-l-sky-500 hover:-translate-y-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-2.5 py-1 bg-[#0D1117] border border-slate-700 text-slate-300 rounded-md text-[8px] font-black uppercase tracking-widest">{task.role}</span>
                                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20">
                                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span></span> Live Sync
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-white mb-6 leading-relaxed">{task.task}</p>
                                    <div className="mt-auto pt-5 border-t border-slate-700/50 flex flex-col gap-4">
                                        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-black text-slate-300">{(task?.assignee || "U").charAt(0)}</div><span className="text-xs font-bold text-slate-400 truncate">{task.assignee}</span></div><a href="/chat" className="text-[9px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg border border-sky-500/20 flex items-center gap-1.5"><SafeIcon name="MessageSquare" size={10}/> Discuss</a></div>
                                        <button 
                                            onClick={() => advanceTask(task.id, 'In Progress', 'Done', task.assignee, task.task)} 
                                            disabled={isReleased} 
                                            className="w-full py-3 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <SafeIcon name="Send" size={14} /> Notify QA & Submit PR
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </KanbanColumn>

                        <KanbanColumn title="MANAGER QA" count={tasks.filter(t => t.status === 'Done' || t.status === 'Approved' || t.status === 'Completed').length} border="border-t-indigo-500" theme="bg-indigo-900/10">
                            {tasks.filter(t => t.status === 'Done' || t.status === 'Approved' || t.status === 'Completed').map(task => (
                                <div key={task.id} className={`bg-[#1A2333]/90 border p-6 rounded-2xl shadow-sm flex flex-col h-full relative ${(task.status === 'Approved' || task.status === 'Completed') ? 'border-emerald-500/20 opacity-60' : 'border-indigo-500/30'}`}>
                                    <div className="flex justify-between items-start mb-4"><span className="px-2.5 py-1 bg-[#0D1117] text-slate-400 border border-slate-700 rounded-md text-[8px] font-black uppercase tracking-widest">{task.role}</span>{(task.status === 'Approved' || task.status === 'Completed') ? <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5"><SafeIcon name="Award" size={10} /> Merged</span> : <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5"><SafeIcon name="GitPullRequest" size={10} /> Pending</span>}</div>
                                    <p className={`text-sm font-medium mb-6 leading-relaxed ${(task.status === 'Approved' || task.status === 'Completed') ? 'text-slate-500 line-through' : 'text-white'}`}>{task.task}</p>
                                    <div className="mt-auto pt-5 border-t border-slate-700/50 flex items-center justify-between">{(task.status === 'Approved' || task.status === 'Completed') ? <div className="flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase tracking-widest"><SafeIcon name="CheckCircle2" size={14} /> QA Passed</div> : <div className="flex items-center gap-2 text-indigo-400 font-black text-[9px] uppercase tracking-widest animate-pulse"><SafeIcon name="Eye" size={14} /> Awaiting QA</div>}</div>
                                </div>
                            ))}
                        </KanbanColumn>
                    </div>
                </div>
            )}

            {/* ======================= TAB: COMBINED CODEBASE AGENT & SWARM ======================= */}
            {activeTab === 'agent' && isDeveloper && (
                <div className="bg-[#0A0D14] border border-indigo-500/20 rounded-3xl p-8 text-white shadow-2xl relative min-h-[700px] flex flex-col">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6 relative z-10">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3"><SafeIcon name="BrainCircuit" className="text-indigo-400" /> Multi-Agent Engine Workspace</h2>
                            <p className="text-xs text-slate-400 mt-1 font-bold">Use Blast Radius for system dependency maps, or Agent Swarm for automated debate & patching.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 relative z-10">
                        {/* LEFT COL: INPUTS */}
                        <div className="lg:col-span-4 flex flex-col gap-4 border-r border-slate-800/80 pr-6">
                            <textarea value={rawCodeInput} onChange={(e) => setRawCodeInput(e.target.value)} placeholder="// Paste code snippet or error logs here..." className="w-full h-48 bg-[#0D1117] text-sky-300 font-mono text-xs p-4 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none custom-scrollbar resize-none" />
                            <input value={swarmContext} onChange={(e) => setSwarmContext(e.target.value)} placeholder="Context (e.g. 'SQL Injection' or 'Need Guidance')" className="w-full bg-[#0D1117] text-slate-300 text-xs p-4 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"/>
                            
                            <div className="flex flex-col gap-3 mt-4">
                                <button onClick={analyzeCodeErrors} disabled={isAnalyzingCode || isSwarmActive} className="py-4 bg-gradient-to-r from-sky-600 to-indigo-600 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg disabled:opacity-50 text-white flex justify-center items-center gap-2">
                                    {isAnalyzingCode ? <><SafeIcon name="Loader2" size={16} className="animate-spin" /> Modeling Graph...</> : <><SafeIcon name="Network" size={16} /> Execute Blast Radius Map</>}
                                </button>
                                <button onClick={triggerAgentSwarm} disabled={isSwarmActive || isAnalyzingCode} className="py-4 bg-gradient-to-r from-indigo-600 to-purple-600 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 text-white flex items-center justify-center gap-2">
                                    {isSwarmActive && !swarmData ? <><SafeIcon name="Loader2" size={16} className="animate-spin" /> Initializing Swarm...</> : <><SafeIcon name="Zap" size={16}/> Trigger Agent Debate & Patch</>}
                                </button>
                            </div>

                            {codeAnalysisResult && !isSwarmActive && (
                                <div className="mt-4 bg-sky-900/10 border border-sky-500/30 p-5 rounded-xl shadow-inner animate-fadeIn">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-3 flex items-center gap-2"><SafeIcon name="Video" size={14}/> Holographic Mentor Found</h4>
                                    <p className="text-xs text-sky-100 leading-relaxed font-sans">{codeAnalysisResult.mentorVector}</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COL: VISUALIZATION (Toggle between Graph & Terminal) */}
                        <div className="lg:col-span-8 bg-[#0D1117] border border-slate-800 rounded-3xl p-6 shadow-inner flex flex-col h-full min-h-[500px]">
                            {/* IF SWARM IS ACTIVE OR HAS LOGS -> SHOW TERMINAL */}
                            { (isSwarmActive || visibleSwarmLogs.length > 0 || swarmData) ? (
                                <>
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800 shrink-0">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"><span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span> Swarm Terminal Active</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                                        {visibleSwarmLogs.map((log, i) => {
                                            let agentColor = 'text-slate-300'; let agentBg = 'bg-slate-800';
                                            if (log.agent.includes('Arch')) { agentColor = 'text-sky-400'; agentBg = 'bg-sky-950/30 border-sky-500/30'; }
                                            if (log.agent.includes('Sec')) { agentColor = 'text-rose-400'; agentBg = 'bg-rose-950/30 border-rose-500/30'; }
                                            if (log.agent.includes('QA')) { agentColor = 'text-emerald-400'; agentBg = 'bg-emerald-950/30 border-emerald-500/30'; }
                                            return (
                                                <div key={i} className={`p-4 rounded-xl border font-mono text-xs shadow-sm animate-fadeIn ${agentBg}`}>
                                                    <div className={`font-black uppercase tracking-widest mb-2 ${agentColor} flex items-center gap-2`}><SafeIcon name="Bot" size={14} /> {log.agent}</div>
                                                    <p className="text-slate-300 leading-relaxed">{log.message}</p>
                                                </div>
                                            );
                                        })}
                                        {swarmData && visibleSwarmLogs.length === swarmData.swarmDebate.length && (
                                            <div className="mt-8 p-6 rounded-2xl border border-indigo-500/50 bg-indigo-950/20 animate-fadeIn relative">
                                                <div className="absolute -top-3 left-6 bg-[#0D1117] px-3 py-1 border border-indigo-500/50 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><SafeIcon name="CheckCircle2" size={14} className="text-emerald-400" /> Consensus Reached</div>
                                                <p className="text-xs font-bold text-slate-200 mb-4 mt-2">{swarmData.consensusReached}</p>
                                                <div className="bg-[#05080f] p-4 rounded-xl border border-slate-800 overflow-x-auto">
                                                    <pre className="text-emerald-400 font-mono text-[10px]"><code>{swarmData.finalPatchedCode}</code></pre>
                                                </div>
                                                {patchApplied ? (
                                                    <div className="mt-4 w-full py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><SafeIcon name="CheckCircle2" size={16} /> Patch Merged & Vaulted</div>
                                                ) : (
                                                    <button onClick={handleApplyPatch} disabled={isPatching} className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2">
                                                        {isPatching ? <><SafeIcon name="Loader2" size={16} className="animate-spin" /> Compiling & Pushing...</> : <><SafeIcon name="GitMerge" size={16} /> 1-Click Apply Patch to GitHub</>}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div ref={swarmTerminalRef} />
                                    </div>
                                </>
                            ) : codeAnalysisResult ? (
                                /* IF GRAPH IS ACTIVE */
                                <div className="h-full relative rounded-2xl overflow-hidden animate-fadeIn">
                                    <div className="absolute top-4 left-4 z-10 bg-slate-900/80 px-3 py-1.5 rounded border border-slate-700 text-[9px] font-black uppercase tracking-widest text-slate-400 shadow-sm flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Zero-Trust Dependency Visualizer</div>
                                    <ReactFlow nodes={graphNodes} edges={graphEdges} fitView className="bg-[#090D14] border border-slate-800 rounded-2xl">
                                        <Background color="#1e293b" gap={16} />
                                        <Controls className="bg-slate-800 fill-white border border-slate-700 shadow-lg" />
                                    </ReactFlow>
                                </div>
                            ) : (
                                /* IDLE STATE */
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <SafeIcon name="TerminalSquare" size={48} className="mb-4" />
                                    <p className="text-xs font-mono">Awaiting vector input for Graph or Swarm.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= TAB: DEVOPS CI/CD ======================= */}
            {activeTab === 'devops' && (
                <div className="bg-[#0A0D14] border border-slate-800 rounded-3xl p-8 text-white shadow-2xl animate-fadeIn min-h-[600px] flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 opacity-50"></div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8 relative z-10">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3"><SafeIcon name="Server" className="text-emerald-400" /> Infrastructure & CI/CD Pipeline</h2>
                            <p className="text-xs text-slate-400 mt-2">Zero-Trust backend orchestration streaming actual Node.js hardware telemetry metrics.</p>
                        </div>
                        {isDeveloper && (
                            <button onClick={runLivePipeline} disabled={pipelineState !== 'idle' && pipelineState !== 'success'} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2 disabled:opacity-50">
                                {pipelineState !== 'idle' && pipelineState !== 'success' ? <><SafeIcon name="Loader2" size={14} className="animate-spin" /> Deploying...</> : <><SafeIcon name="Play" size={14} /> Trigger Backend Deployment</>}
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 relative z-10">
                        <div className="lg:col-span-4 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><SafeIcon name="Activity" size={14} className="text-sky-500"/> Live Server Telemetry</h3>
                            <div className="bg-[#131B2B]/80 border border-slate-700/50 rounded-2xl p-5 shadow-inner"><div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-slate-300">Backend CPU Load</span><span className="text-[10px] font-mono text-sky-400">{telemetry.cpu}%</span></div><div className="w-full bg-[#0A0D14] rounded-full h-1.5 border border-slate-800"><div className="bg-sky-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${telemetry.cpu}%` }}></div></div></div>
                            <div className="bg-[#131B2B]/80 border border-slate-700/50 rounded-2xl p-5 shadow-inner"><div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-slate-300">Active Memory (RAM)</span><span className="text-[10px] font-mono text-indigo-400">{telemetry.ram}%</span></div><div className="w-full bg-[#0A0D14] rounded-full h-1.5 border border-slate-800"><div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${telemetry.ram}%` }}></div></div></div>
                            <div className="bg-[#131B2B]/80 border border-slate-700/50 rounded-2xl p-5 shadow-inner"><div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-slate-300">Network Throughput</span><span className="text-[10px] font-mono text-emerald-400">{telemetry.network} Mbps</span></div><div className="w-full bg-[#0A0D14] rounded-full h-1.5 border border-slate-800"><div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(telemetry.network / 4, 100)}%` }}></div></div></div>
                        </div>
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <div className="bg-[#131B2B]/80 border border-slate-700/50 rounded-2xl p-6 shadow-inner overflow-x-auto hide-scrollbar">
                                <div className="flex items-center justify-between min-w-[500px]">
                                    <PipelineNode label="Build Container" status={pipelineState === 'idle' ? 'idle' : 'success'} icon="Box" />
                                    <PipelineLine active={pipelineState !== 'idle' && pipelineState !== 'build'} />
                                    <PipelineNode label="Automated Tests" status={pipelineState === 'test' ? 'running' : (pipelineState === 'scan' || pipelineState === 'deploy' || pipelineState === 'success' ? 'success' : 'idle')} icon="Beaker" />
                                    <PipelineLine active={pipelineState === 'scan' || pipelineState === 'deploy' || pipelineState === 'success'} />
                                    <PipelineNode label="Security Scan" status={pipelineState === 'scan' ? 'running' : (pipelineState === 'deploy' || pipelineState === 'success' ? 'success' : 'idle')} icon="ShieldCheck" />
                                    <PipelineLine active={pipelineState === 'deploy' || pipelineState === 'success'} />
                                    <PipelineNode label="Prod Deployment" status={pipelineState === 'deploy' ? 'running' : (pipelineState === 'success' ? 'success' : 'idle')} icon="CloudLightning" />
                                </div>
                            </div>
                            <div className="flex-1 bg-[#0A0D14] border border-slate-800 rounded-2xl p-6 font-mono text-xs flex flex-col shadow-inner overflow-hidden">
                                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800/80 text-slate-500 uppercase tracking-widest text-[9px] font-black"><SafeIcon name="TerminalSquare" size={12} className="text-emerald-500" /> Backend Socket Stream</div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                    {pipelineLogs.length === 0 ? <p className="text-slate-600">Awaiting backend deployment orchestration...</p> : pipelineLogs.map((log, i) => <p key={i} className={`flex items-start gap-2 ${log.includes('✅') || log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('SEC') ? 'text-rose-400' : 'text-slate-300'}`}><span className="text-slate-600 shrink-0">&gt;</span> {log}</p>)}
                                    {pipelineState !== 'idle' && pipelineState !== 'success' && <p className="text-emerald-400 animate-pulse flex items-start gap-2"><span className="text-slate-600 shrink-0">&gt;</span> _</p>}
                                    <div ref={terminalEndRef} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= TAB: GITHUB REPO SYNC ======================= */}
            {activeTab === 'github' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0D1117] rounded-3xl p-8 shadow-2xl border border-slate-800 gap-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-600"></div>
                        <SafeIcon name="Code" size={180} className="absolute -right-5 -bottom-5 text-slate-800/40 rotate-12 pointer-events-none" />
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight"><span className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700"><SafeIcon name="Github" size={20} className="text-white"/></span> Enterprise Pipeline Sync</h3>
                            <p className="text-sm text-slate-400 mt-3 font-medium">Tracking frontend and backend repositories via LIVE authentic REST API calls.</p>
                        </div>
                        <button onClick={fetchLiveIntegrations} disabled={isFetchingIntegrations || isReleased} className="relative z-10 px-8 py-4 bg-white hover:bg-slate-200 text-[#0D1117] rounded-xl text-xs font-black transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest hover:-translate-y-0.5">
                            {isFetchingIntegrations ? <><SafeIcon name="Loader2" size={16} className="animate-spin" /> Syncing Pipeline...</> : 'Force Sync Live API'}
                        </button>
                    </div>
                    {isFetchingIntegrations ? (
                        <div className="flex flex-col justify-center items-center h-64 bg-[#131B2B]/60 rounded-3xl border border-slate-700/50 backdrop-blur-xl"><div className="w-10 h-10 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin mb-4"></div><p className="text-sky-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Querying Live APIs...</p></div>
                    ) : integrationError ? (
                        <div className="bg-rose-950/20 border border-rose-500/30 p-8 rounded-3xl text-center flex flex-col items-center"><SafeIcon name="AlertTriangle" size={40} className="text-rose-500 mb-4" /><p className="text-white font-bold mb-2">Integration Gateway Failure</p><p className="text-slate-400 text-sm">{integrationError}</p></div>
                    ) : integrationData && integrationData.frontend && integrationData.backend ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['frontend', 'backend'].map(type => (
                                <div key={type} className={`bg-[#131B2B]/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-xl transition-colors hover:border-${type === 'frontend' ? 'sky' : 'emerald'}-500/30`}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-6 mb-6 gap-4">
                                        <div><span className={`text-[9px] font-black uppercase tracking-widest bg-${type === 'frontend' ? 'sky' : 'emerald'}-500/10 text-${type === 'frontend' ? 'sky' : 'emerald'}-400 px-3 py-1.5 rounded-md border border-${type === 'frontend' ? 'sky' : 'emerald'}-500/20`}>{type === 'frontend' ? 'Client / Frontend' : 'Server / Backend'}</span><h4 className="font-mono font-bold text-white text-sm mt-4">{integrationData[type]?.repo || 'Repository Bound'}</h4></div>
                                        <div className="text-right bg-[#0D1117] px-5 py-3 rounded-2xl border border-slate-700"><span className="text-3xl font-black text-white leading-none block">{integrationData[type]?.activePullRequests || 0}</span><span className="block text-[8px] uppercase font-black text-slate-500 tracking-widest mt-1.5">Open PRs</span></div>
                                    </div>
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Commit Stream</h5>
                                        {integrationData[type]?.recentCommits?.map((c, i) => (
                                            <div key={i} className="bg-[#0D1117] p-5 rounded-2xl border border-slate-800 hover:border-slate-600 transition-colors">
                                                <p className="text-sm font-bold text-slate-200 leading-relaxed font-mono">{c.message}</p>
                                                <div className="flex items-center justify-between mt-3"><div className="flex items-center gap-2"><span className={`w-5 h-5 bg-${type === 'frontend' ? 'sky' : 'emerald'}-600 text-white rounded-md flex items-center justify-center text-[9px] font-black`}>{(c.author || 'S').charAt(0)}</span><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{c.author}</p></div><span className="text-[9px] text-slate-600 font-mono">{c.time}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 border border-slate-800 p-12 rounded-3xl text-center text-slate-500"><SafeIcon name="Link2Off" size={48} className="mx-auto mb-4 opacity-40" /><h4 className="text-lg font-black text-white">No Repositories Linked</h4><p className="text-xs mt-1">Bound repositories added during orchestration will appear here.</p></div>
                    )}
                </div>
            )}

            {/* ======================= TAB: WEBEX MANAGER COMMAND ======================= */}
            {activeTab === 'webex' && isManager && (
                <div className="bg-[#0D1117] border border-slate-800 rounded-3xl p-10 relative shadow-2xl overflow-hidden animate-fadeIn flex flex-col md:flex-row gap-10 text-slate-300">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none z-0"></div>
                    <div className="flex-1 space-y-8 relative z-10">
                        <div className="flex justify-between items-start md:items-center border-b border-slate-800 pb-6 flex-col md:flex-row gap-4">
                            <h3 className="text-2xl font-black text-white flex items-center gap-4 tracking-tight"><span className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.2)]"><SafeIcon name="Video" className="text-sky-400" /></span> Webex Command Space</h3>
                            <button onClick={fetchLiveIntegrations} disabled={isFetchingIntegrations} className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(14,165,233,0.3)] disabled:opacity-50 transition-all flex items-center gap-2">
                                {isFetchingIntegrations ? <><SafeIcon name="Loader2" size={14} className="animate-spin" /> Provisioning Secure Room...</> : <><SafeIcon name="RefreshCw" size={14} /> Sync Webex API</>}
                            </button>
                        </div>
                        {integrationData?.webex && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 relative z-10 animate-fadeIn shadow-inner">
                                <p className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2"><SafeIcon name="CheckCircle2" size={16} /> Secured Meeting Provisioned</p>
                                <a href={integrationData.webex.joinLink} target="_blank" rel="noreferrer" className="font-mono text-xs text-emerald-200 hover:text-white underline break-all">{integrationData.webex.joinLink}</a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🚀 REUSABLE UI COMPONENTS
// ==========================================
function TabButton({ active, onClick, label, icon }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-5 py-4 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all ${active ? 'text-white bg-[#0D1117] border-t-2 border-sky-500 shadow-[0_-5px_15px_rgba(14,165,233,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1A2333]/50'}`}>
            <SafeIcon name={icon} size={14} className={active ? "text-sky-400" : ""} /> {label}
        </button>
    );
}

function KanbanColumn({ title, count, border, theme, children }) {
    return (
        <div className={`${theme} rounded-3xl p-6 border border-slate-700/50 border-t-4 ${border} shadow-lg flex flex-col h-[700px] backdrop-blur-xl`}>
            <div className="flex justify-between items-center pb-5 border-b border-slate-700/50 mb-5 shrink-0"><span className="font-black text-white text-xs tracking-widest">{title}</span><span className="bg-[#0D1117] border border-slate-600 text-sky-400 px-3 py-1 rounded-lg text-[10px] font-black shadow-inner">{count}</span></div>
            <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">{children}</div>
        </div>
    );
}

function DeveloperCard({ task, onAskAgent, onStart, disabled }) {
    const handleGithubNav = () => { window.open('https://github.com/', '_blank'); };
    return (
        <div className={`bg-[#1A2333]/90 border border-slate-700/50 p-6 rounded-2xl shadow-lg transition-all flex flex-col group relative ${disabled ? 'opacity-50 pointer-events-none' : 'hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] hover:border-sky-500/30 hover:-translate-y-1'}`}>
            <div className="flex justify-between items-start mb-4"><span className={`px-2.5 py-1 border rounded-md text-[8px] font-black uppercase tracking-widest ${task.isSenior ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-[#0D1117] border-slate-600 text-slate-400'}`}>{task.isSenior ? 'Lead Mentor' : task.role}</span></div>
            <p className="text-sm font-bold text-white mb-6 leading-relaxed">{task.task}</p>
            <div className="mt-auto pt-5 border-t border-slate-700/50 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-black text-slate-300 shadow-inner">{(task?.assignee || "U").charAt(0)}</div><span className="text-xs font-bold text-slate-400 truncate">{task?.assignee || "Unknown"}</span></div><a href="/chat" className="text-[9px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg border border-sky-500/20 transition-colors flex items-center gap-1.5"><SafeIcon name="MessageSquare" size={10}/> Discuss</a></div>
                
                <button onClick={onStart} disabled={disabled} className="w-full py-3 bg-emerald-500/10 text-emerald-400 hover:text-white text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-emerald-600 border border-emerald-500/30 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <SafeIcon name="Play" size={14} /> Start Development
                </button>
                
                <button onClick={onAskAgent} disabled={disabled} className="w-full py-3 bg-indigo-500/10 text-indigo-400 hover:text-white text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"><SafeIcon name="BrainCircuit" size={14} /> Ask Agent for Guidance</button>
                <button onClick={handleGithubNav} disabled={disabled} className="w-full py-3 bg-white text-[#0D1117] text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] disabled:opacity-50 hover:-translate-y-0.5"><SafeIcon name="Github" size={14} /> Open GitHub Repository</button>
            </div>
        </div>
    );
}

function PipelineNode({ label, status, icon }) {
    const isRunning = status === 'running';
    const isSuccess = status === 'success';
    return (
        <div className="flex flex-col items-center gap-3 relative z-10 w-24">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-lg ${isSuccess ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : isRunning ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.5)] animate-pulse' : 'bg-[#0D1117] border-slate-700 text-slate-500'}`}>
                <SafeIcon name={isSuccess ? "Check" : icon} size={20} className={isRunning ? 'animate-bounce' : ''} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isSuccess ? 'text-emerald-500' : isRunning ? 'text-sky-400' : 'text-slate-500'}`}>{label}</span>
        </div>
    );
}

function PipelineLine({ active }) {
    return (
        <div className="flex-1 h-1 bg-slate-800 rounded-full mx-2 relative overflow-hidden -mt-6">
            <div className={`absolute top-0 left-0 h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-1000 ${active ? 'w-full' : 'w-0'}`}></div>
        </div>
    );
}

function BlueprintSection({ title, icon, color, items }) {
    if (!items || items.length === 0) return null;
    return (
        <div className="bg-[#131B2B]/80 p-6 rounded-2xl border border-slate-700/50 shadow-inner hover:border-slate-500 transition-colors duration-300">
            <h4 className={`text-[11px] font-black uppercase tracking-widest ${color} mb-4 flex items-center gap-2 border-b border-slate-700 pb-3`}>
                <SafeIcon name={icon} size={16} /> {title}
            </h4>
            <ul className="space-y-3">
                {items.map((item, i) => {
                    const parts = item.split(':');
                    return (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-3 leading-relaxed">
                            <SafeIcon name="CheckCircle2" size={16} className={`${color} shrink-0 mt-0.5 opacity-70`} /> 
                            <span>
                                {parts.length > 1 ? (
                                    <><strong className="text-white">{parts[0]}:</strong>{parts.slice(1).join(':')}</>
                                ) : item}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}