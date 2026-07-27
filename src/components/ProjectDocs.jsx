import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useApp } from '../context/AppContext.jsx'; 
import API from '../services/api.js';

// ==========================================
// 🛠 PURE HELPERS & CONFIG
// ==========================================

const SafeIcon = ({ name, fallback = 'Circle', ...props }) => {
    const IconComponent = Icons[name] || Icons[fallback] || Icons.Circle;
    return <IconComponent {...props} />;
};

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimetype) => {
    if (!mimetype) return <SafeIcon name="File" className="text-slate-500" />;
    if (mimetype.includes('pdf')) return <SafeIcon name="FileText" className="text-rose-400" />;
    if (mimetype.includes('image')) return <SafeIcon name="Image" className="text-sky-400" />;
    if (mimetype.includes('word') || mimetype.includes('document')) return <SafeIcon name="FileSignature" className="text-blue-400" />;
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return <SafeIcon name="Presentation" className="text-orange-400" />;
    if (mimetype.includes('json') || mimetype.includes('javascript')) return <SafeIcon name="FileJson" className="text-amber-400" />;
    return <SafeIcon name="File" className="text-slate-400" />;
};

// Data extractor prevents empty arrays/undefined crashes
const parseKnowledgeItems = (primary, secondary, fallback) => {
    const process = (data) => {
        if (Array.isArray(data) && data.length > 0 && data.some(item => item?.trim?.())) return data;
        if (typeof data === 'string' && data.trim()) {
            return data.split('\n')
                .map(s => s.replace(/^[•*-]\s*/, '').trim())
                .filter(Boolean);
        }
        return null;
    };
    return process(primary) || process(secondary) || [fallback];
};

// Tailwind Purge-Safe Color Maps
const COLOR_MAP = {
    sky: { text: 'text-sky-400', border: 'border-sky-500/20', bg: 'bg-sky-500/5', shadow: 'hover:shadow-[0_5px_20px_rgba(14,165,233,0.15)]', bullet: 'text-sky-500' },
    emerald: { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', shadow: 'hover:shadow-[0_5px_20px_rgba(16,185,129,0.15)]', bullet: 'text-emerald-500' },
    rose: { text: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/5', shadow: 'hover:shadow-[0_5px_20px_rgba(225,29,72,0.15)]', bullet: 'text-rose-500' },
    indigo: { text: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', shadow: 'hover:shadow-[0_5px_20px_rgba(99,102,241,0.15)]', bullet: 'text-indigo-500' },
    amber: { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5', shadow: 'hover:shadow-[0_5px_20px_rgba(245,158,11,0.15)]', bullet: 'text-amber-500' },
    orange: { text: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5', shadow: 'hover:shadow-[0_5px_20px_rgba(249,115,22,0.15)]', bullet: 'text-orange-500' },
};

export default function ProjectDocs() {
    const { user } = useApp();
    const [projects, setProjects] = useState([]);
    
    const [activeProjectId, setActiveProjectId] = useState(null);
    const activeProject = useMemo(() => projects.find(p => p._id === activeProjectId) || null, [projects, activeProjectId]);

    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loading, setLoading] = useState(true);

    const isManager = user?.role === 'Manager' || user?.role === 'Admin';

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const { data } = await API.get('/projects');
            if (data?.success) {
                setProjects(data.projects || []);
                if (data.projects?.length > 0) setActiveProjectId(data.projects[0]._id);
            }
        } catch (error) {
            console.error("Failed to load projects:", error);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 📂 FILE UPLOAD & DELETE HANDLERS
    // ==========================================
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploaderName', user?.name || 'Authorized Personnel');

        try {
            const { data } = await API.post(`/projects/${activeProject._id}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data?.success) {
                setProjects(prev => prev.map(p => 
                    p._id === activeProject._id ? { ...p, files: [...(p.files || []), data.file] } : p
                ));
            }
        } catch (error) {
            alert('File upload failed. Please check backend connection.');
        } finally {
            setIsUploading(false);
            e.target.value = ''; 
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (!window.confirm("Permanently delete this file from the Vault? This action cannot be undone.")) return;
        
        try {
            const { data } = await API.delete(`/projects/${activeProject._id}/files/${fileId}`);
            if (data?.success) {
                setProjects(prev => prev.map(p => {
                    if (p._id !== activeProject._id) return p;
                    return { ...p, files: p.files.filter(f => String(f._id || f.id) !== String(fileId)) };
                }));
            }
        } catch (error) {
            alert("Failed to delete file. Check backend logs.");
        }
    };

    // ==========================================
    // 🧠 AI VAULT ANALYSIS HANDLERS
    // ==========================================
    const runVaultAnalysis = async () => {
        if (!activeProject) return;
        setIsAnalyzing(true);
        
        try {
            const { data } = await API.post(`/projects/${activeProject._id}/vault-analysis`, { 
                requesterName: user?.name 
            });
            
            if (data?.success) {
                setProjects(prev => prev.map(p => 
                    p._id === activeProject._id ? { ...p, vaultAnalyses: [data.analysis, ...(p.vaultAnalyses || [])] } : p
                ));
            }
        } catch (error) {
            alert("Failed to run AI Analysis.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const deleteAnalysis = async (analysisId) => {
        if (!window.confirm("Permanently delete this AI Insight?")) return;
        
        try {
            const { data } = await API.delete(`/projects/${activeProject._id}/vault-analysis/${analysisId}`);
            if (data?.success) {
                setProjects(prev => prev.map(p => {
                    if (p._id !== activeProject._id) return p;
                    return { ...p, vaultAnalyses: p.vaultAnalyses.filter(a => String(a._id || a.id) !== String(analysisId)) };
                }));
            }
        } catch (error) {
            alert("Failed to delete analysis.");
        }
    };

    // ==========================================
    // UI HELPERS
    // ==========================================
    const renderParsedAnalysis = (content) => {
        try {
            const data = typeof content === 'string' ? JSON.parse(content) : content;
            return (
                <div className="space-y-5 mt-4">
                    {data.projectSummary && (
                        <div className="bg-sky-500/10 border border-sky-500/30 p-5 rounded-2xl text-sky-50 text-sm leading-relaxed shadow-inner">
                            <span className="font-black text-sky-400 uppercase tracking-widest text-[10px] block mb-2">Executive Summary</span>
                            {data.projectSummary}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MiniList title="Business & Goals" items={data.businessRequirements} color="sky" />
                        <MiniList title="Functional Features" items={data.functionalReqs} color="emerald" />
                        <MiniList title="Security Measures" items={data.securityMeasures} color="rose" />
                        <MiniList title="Tech Environment" items={data.technicalEnv} color="indigo" />
                        <MiniList title="Non-Functional Reqs" items={data.nonFunctionalReqs} color="amber" />
                        <MiniList title="Constraints" items={data.constraints} color="orange" />
                    </div>
                </div>
            );
        } catch {
            return <div className="text-sm text-slate-300 whitespace-pre-wrap mt-4 bg-slate-900 p-4 rounded-xl border border-slate-700">{content}</div>;
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 font-sans text-slate-200">
            <SafeIcon name="Loader2" className="w-12 h-12 animate-spin text-sky-500" />
            <p className="text-sky-400 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Enterprise Vault...</p>
        </div>
    );

    if (projects.length === 0) return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500 font-sans text-center">
            <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                <SafeIcon name="FolderSearch" size={40} className="text-slate-600" />
            </div>
            <h3 className="text-2xl font-black text-white">No active projects found</h3>
            <p className="mt-2 text-sm max-w-md mx-auto">Orchestrate a new initiative via the AI Dashboard to establish an immutable document vault.</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16 font-sans text-slate-200 relative z-10">
            
            {/* 🌌 AMBIENT BACKGROUND GLOWS */}
            <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-900/20 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>

            {/* 🚀 HEADER & PROJECT SWITCHER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800/80 pb-6 gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center tracking-tight gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
                            <SafeIcon name="BookOpen" className="w-5 h-5 text-white" />
                        </div>
                        Enterprise Architecture & Vault
                    </h2>
                    <p className="text-slate-400 font-medium mt-2 text-sm ml-1">Immutable AI Knowledge Base and Secure File Storage.</p>
                </div>
                
                <div className="bg-[#0B101A]/80 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl flex items-center shadow-inner overflow-x-auto max-w-full hide-scrollbar">
                    {projects.map(p => (
                        <button 
                            key={p._id}
                            onClick={() => setActiveProjectId(p._id)}
                            className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                activeProjectId === p._id 
                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
                            }`}
                        >
                            {p.title}
                        </button>
                    ))}
                </div>
            </div>

            {activeProject && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
                    
                    {/* ==========================================
                        LEFT COLUMN: AI KNOWLEDGE BASE & ANALYSES 
                        ========================================== */}
                    <div className="xl:col-span-8 space-y-8">
                        
                        {/* Blueprint Container */}
                        <div className="bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-700"></div>
                            
                            <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-5">
                                <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                                    <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <SafeIcon name="BrainCircuit" className="w-4 h-4 text-emerald-400"/> 
                                    </span>
                                    Primary Architectural Blueprint
                                </h3>
                                <span className="px-3 py-1.5 bg-[#131B2B] text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner">
                                    <SafeIcon name="Lock" size={10}/> Immutable Core
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <BlueprintCard title="Business Goals" icon="Target" color="sky" items={parseKnowledgeItems(activeProject.analysis?.businessRequirements?.goals, activeProject.projectKnowledgeBase?.systemArchitecture, "Strategic objectives pending definition.")} />
                                <BlueprintCard title="Functional Reqs" icon="ListChecks" color="emerald" items={parseKnowledgeItems(activeProject.analysis?.functionalRequirements?.featureList, activeProject.projectKnowledgeBase?.coreFeatures, "Core features pending allocation.")} />
                                <BlueprintCard title="Security Protocols" icon="ShieldCheck" color="rose" items={parseKnowledgeItems(activeProject.analysis?.nonFunctionalRequirements?.securityAndCompliance, activeProject.projectKnowledgeBase?.qaTestingStrategy, "Zero-trust protocols standing by.")} />
                                <BlueprintCard title="Tech Environment" icon="Cpu" color="indigo" items={parseKnowledgeItems(activeProject.analysis?.technicalRequirements?.techStack, activeProject.projectKnowledgeBase?.databaseDesign, "Architecture environment unset.")} />
                                <BlueprintCard title="Performance Reqs" icon="Activity" color="amber" items={parseKnowledgeItems(activeProject.analysis?.nonFunctionalRequirements?.performance, null, "Uptime and performance baselines pending.")} />
                                <BlueprintCard title="Project Constraints" icon="AlertTriangle" color="orange" items={parseKnowledgeItems(activeProject.analysis?.constraintsAndDependencies?.budgetAndTimeline, null, "No timeline boundaries detected.")} />
                            </div>
                        </div>

                        {/* AI Vault Analyzer Container */}
                        <div className="bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-700/50 pb-5 mb-6 gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                                        <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                            <SafeIcon name="Sparkles" className="w-4 h-4 text-amber-400"/> 
                                        </span>
                                        Vault Intelligence & Insights
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Cross-reference master blueprints with newly uploaded vault data.</p>
                                </div>
                                <button 
                                    onClick={runVaultAnalysis}
                                    disabled={isAnalyzing || !activeProject.files?.length}
                                    className="px-6 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all disabled:opacity-50 disabled:grayscale shrink-0 btn-press"
                                >
                                    {isAnalyzing ? <><SafeIcon name="Loader2" size={14} className="animate-spin" /> Scanning Vault...</> : <><SafeIcon name="Radar" size={14} /> Scan Uploaded Data</>}
                                </button>
                            </div>

                            <div className="space-y-6">
                                {(!activeProject.vaultAnalyses?.length) ? (
                                    <div className="p-10 text-center bg-[#131B2B]/50 rounded-2xl border-2 border-slate-800 border-dashed animate-fadeIn">
                                        <SafeIcon name="Bot" size={40} className="mx-auto text-slate-600 mb-4 opacity-40" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Intelligence Scans Executed</p>
                                        <p className="text-xs text-slate-500 mt-2 font-medium">Upload files to the vault and run a scan to extract intelligence.</p>
                                    </div>
                                ) : (
                                    activeProject.vaultAnalyses.map((analysis) => (
                                        <div key={analysis._id} className="bg-[#131B2B]/80 border border-slate-700/80 rounded-3xl p-8 shadow-lg relative group animate-fadeIn hover:border-amber-500/30 transition-colors">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                                            
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div>
                                                    <h4 className="text-lg font-black text-white">{analysis.title || 'Vault Analysis Report'}</h4>
                                                    <p className="text-[10px] font-mono font-bold text-slate-500 mt-2 tracking-wide uppercase">
                                                        Req By: <span className="text-sky-400">{analysis.generatedBy || 'System'}</span> • {new Date(analysis.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                {isManager && (
                                                    <button 
                                                        onClick={() => deleteAnalysis(analysis._id)} 
                                                        className="w-8 h-8 rounded-lg bg-[#0D1117] text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 flex items-center justify-center transition-all shadow-sm"
                                                        title="Delete Insight"
                                                    >
                                                        <SafeIcon name="Trash2" size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <div className="relative z-10">
                                                {renderParsedAnalysis(analysis.content)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ==========================================
                        RIGHT COLUMN: ENTERPRISE FILE VAULT 
                        ========================================== */}
                    <div className="xl:col-span-4 space-y-6">
                        <div className="bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col h-[850px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                            
                            <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-5 shrink-0 relative z-10">
                                <h3 className="text-lg font-black text-white flex items-center gap-3 tracking-tight">
                                    <SafeIcon name="HardDrive" className="text-sky-400"/> Enterprise File Vault
                                </h3>
                                <span className="bg-[#131B2B] text-sky-400 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border border-slate-700 shadow-inner">
                                    {activeProject.files?.length || 0} Files
                                </span>
                            </div>

                            {/* Dynamic Upload Dropzone */}
                            <div className="relative group/dropzone shrink-0 mb-6 z-10">
                                <div className="absolute inset-0 bg-sky-500/5 rounded-3xl blur-xl group-hover/dropzone:bg-sky-500/15 transition-colors pointer-events-none"></div>
                                <div className="border-2 border-dashed border-slate-700/70 hover:border-sky-500/60 bg-[#131B2B]/40 rounded-3xl p-8 text-center transition-all relative z-10 flex flex-col items-center justify-center min-h-[160px]">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center animate-fadeIn">
                                            <SafeIcon name="Loader2" size={36} className="text-sky-400 animate-spin mb-4" />
                                            <p className="text-[10px] uppercase font-black tracking-widest text-sky-400 animate-pulse">Vaulting File Securely...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center animate-fadeIn">
                                            <div className="w-14 h-14 bg-[#0D1117] rounded-full flex items-center justify-center mb-4 group-hover/dropzone:scale-110 transition-transform duration-300 border border-slate-800 shadow-inner">
                                                <SafeIcon name="UploadCloud" size={24} className="text-slate-500 group-hover/dropzone:text-sky-400 transition-colors" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 mb-5">Drag & Drop Documents Here</p>
                                            <label className="cursor-pointer bg-[#0D1117] hover:bg-sky-600 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg border border-slate-700 hover:border-sky-500 inline-block">
                                                Select File
                                                <input type="file" className="hidden" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Files List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 z-10 relative">
                                {(!activeProject.files?.length) ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50 animate-fadeIn mt-[-10%]">
                                        <SafeIcon name="FolderOpen" size={56} className="mb-4" />
                                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Vault is Empty</p>
                                    </div>
                                ) : (
                                    activeProject.files.map((file, idx) => (
                                        <div key={file._id || idx} className="bg-[#131B2B]/80 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group hover:border-sky-500/40 transition-all shadow-sm hover:shadow-[0_0_15px_rgba(14,165,233,0.05)]">
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="w-11 h-11 rounded-xl bg-[#0D1117] border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-sky-900/20 transition-colors">
                                                    {getFileIcon(file.mimetype)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors" title={file.originalName}>{file.originalName}</p>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[9px] font-mono font-bold text-slate-500">{formatBytes(file.size)}</span>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 border-l border-slate-700 pl-3">
                                                            By {file.uploadedBy?.split(' ')[0] || 'System'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a 
                                                    href={`https://worksphere-backend-production-e720.up.railway.app/api/projects/download/${file.filename}`} 
                                                    download={file.originalName} 
                                                    className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white flex items-center justify-center transition-colors border border-sky-500/30" 
                                                    title="Download"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <SafeIcon name="Download" size={14} />
                                                </a>
                                                {isManager && (
                                                    <button 
                                                        onClick={() => handleDeleteFile(file._id)} 
                                                        className="w-8 h-8 rounded-lg bg-slate-800/80 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-colors border border-slate-700 hover:border-rose-500/30" 
                                                        title="Delete File"
                                                    >
                                                        <SafeIcon name="Trash2" size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🚀 REUSABLE UI CARDS
// ==========================================
function BlueprintCard({ title, icon, color = 'sky', items }) {
    if (!items || items.length === 0) return null;
    const styles = COLOR_MAP[color] || COLOR_MAP.sky;

    return (
        <div className={`bg-[#131B2B]/60 p-6 rounded-3xl border border-slate-700/50 shadow-sm hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group ${styles.shadow}`}>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-4">
                <div className={`w-8 h-8 rounded-lg ${styles.bg} ${styles.border} border flex items-center justify-center shadow-inner`}>
                    <SafeIcon name={icon} size={14} className={`${styles.text}`} />
                </div>
                <h4 className={`text-[10px] font-black uppercase tracking-widest ${styles.text}`}>
                    {title}
                </h4>
            </div>
            <ul className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-48">
                {items.map((item, i) => {
                    const parts = item.split(':');
                    return (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-3 leading-relaxed">
                            <SafeIcon name="ChevronRight" size={12} className={`${styles.bullet} shrink-0 mt-0.5 opacity-60`} /> 
                            <span>
                                {parts.length > 1 ? <><strong className="text-white">{parts[0]}:</strong>{parts.slice(1).join(':')}</> : item}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function MiniList({ title, items, color = 'sky' }) {
    if (!items || !Array.isArray(items) || items.length === 0) return null;
    const styles = COLOR_MAP[color] || COLOR_MAP.sky;

    return (
        <div className="bg-[#131B2B] p-5 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-colors">
            <h5 className={`text-[10px] font-black uppercase tracking-widest ${styles.text} mb-3 border-b border-slate-700 pb-2`}>{title}</h5>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2.5 leading-snug">
                        <span className={`${styles.bullet} opacity-60 font-black`}>›</span> {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}