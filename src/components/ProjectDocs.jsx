// File: frontend/src/components/ProjectDocs.jsx
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
    if (!mimetype) return <SafeIcon name="File" className="text-slate-400" />;
    if (mimetype.includes('pdf')) return <SafeIcon name="FileText" className="text-rose-400" />;
    if (mimetype.includes('image')) return <SafeIcon name="Image" className="text-sky-400" />;
    if (mimetype.includes('word') || mimetype.includes('document')) return <SafeIcon name="FileSignature" className="text-blue-500" />;
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return <SafeIcon name="Presentation" className="text-orange-500" />;
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
    sky: { text: 'text-sky-400', hover: 'group-hover:text-sky-300', bullet: 'text-sky-500' },
    emerald: { text: 'text-emerald-400', hover: 'group-hover:text-emerald-300', bullet: 'text-emerald-500' },
    rose: { text: 'text-rose-400', hover: 'group-hover:text-rose-300', bullet: 'text-rose-500' },
    indigo: { text: 'text-indigo-400', hover: 'group-hover:text-indigo-300', bullet: 'text-indigo-500' },
    amber: { text: 'text-amber-400', hover: 'group-hover:text-amber-300', bullet: 'text-amber-500' },
    orange: { text: 'text-orange-400', hover: 'group-hover:text-orange-300', bullet: 'text-orange-500' },
};

export default function ProjectDocs() {
    const { user } = useApp();
    const [projects, setProjects] = useState([]);
    
    // Using an ID as a single source of truth prevents out-of-sync state bugs
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
                    p._id === activeProject._id 
                        ? { ...p, files: [...(p.files || []), data.file] } 
                        : p
                ));
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert('File upload failed. Please check backend connection.');
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset input so same file can be uploaded again if needed
        }
    };

    // ==========================================
    // 📂 ROBUST FIXED FILE DELETE HANDLER
    // ==========================================
    const handleDeleteFile = async (fileId) => {
        if (!window.confirm("Permanently delete this file from the Vault? This action cannot be undone.")) return;
        
        try {
            const { data } = await API.delete(`/projects/${activeProject._id}/files/${fileId}`);
            if (data?.success) {
                setProjects(prev => prev.map(p => {
                    if (p._id !== activeProject._id) return p;
                    return {
                        ...p,
                        // Convert both to strings to ensure reliable comparison regardless of type mismatches (ObjectId vs String)
                        files: p.files.filter(f => String(f._id || f.id) !== String(fileId))
                    };
                }));
            }
        } catch (error) {
            console.error("Delete file error:", error);
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
                    p._id === activeProject._id 
                        ? { ...p, vaultAnalyses: [data.analysis, ...(p.vaultAnalyses || [])] } 
                        : p
                ));
            }
        } catch (error) {
            console.error("AI Analysis error:", error);
            alert("Failed to run AI Analysis.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ==========================================
    // 🧠 ROBUST FIXED AI ANALYSIS DELETE HANDLER
    // ==========================================
    const deleteAnalysis = async (analysisId) => {
        if (!window.confirm("Permanently delete this AI Insight?")) return;
        
        try {
            const { data } = await API.delete(`/projects/${activeProject._id}/vault-analysis/${analysisId}`);
            if (data?.success) {
                setProjects(prev => prev.map(p => {
                    if (p._id !== activeProject._id) return p;
                    return {
                        ...p,
                        // Convert both to strings to prevent ObjectId mismatch bugs during state update filtering
                        vaultAnalyses: p.vaultAnalyses.filter(a => String(a._id || a.id) !== String(analysisId))
                    };
                }));
            }
        } catch (error) {
            console.error("Delete analysis error:", error);
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
                <div className="space-y-4">
                    {data.projectSummary && (
                        <div className="bg-sky-500/10 border border-sky-500/30 p-4 rounded-xl text-sky-100 text-sm leading-relaxed shadow-inner">
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
            return <div className="text-sm text-slate-300 whitespace-pre-wrap">{content}</div>;
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 min-h-[50vh]">
            <SafeIcon name="Loader2" className="w-10 h-10 animate-spin text-sky-500" />
            <p className="text-sky-400 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Vault...</p>
        </div>
    );

    if (projects.length === 0) return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 font-sans">
            <SafeIcon name="FolderSearch" size={64} className="mb-4 opacity-20" />
            <h3 className="text-2xl font-black text-white">No active projects found.</h3>
            <p className="mt-2 text-sm">Orchestrate a new initiative via the AI Dashboard to access documentation.</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12 font-sans text-slate-200">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-blue-900/50 pb-5 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center tracking-tight">
                        <SafeIcon name="BookOpen" className="w-8 h-8 mr-3 text-blue-500" /> Persistent Project Documentation
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 text-sm">AI Knowledge Base and secure Enterprise File Vault.</p>
                </div>
                
                <div className="bg-[#0D1117] border border-slate-700 p-2 rounded-xl flex items-center shadow-inner overflow-x-auto max-w-full hide-scrollbar">
                    {projects.map(p => (
                        <button 
                            key={p._id}
                            onClick={() => setActiveProjectId(p._id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                activeProjectId === p._id 
                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-md' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            {p.title}
                        </button>
                    ))}
                </div>
            </div>

            {activeProject && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* LEFT COLUMN: Immutable AI Knowledge Base + Saved Analyses */}
                    <div className="xl:col-span-8 space-y-8">
                        <div className="bg-[#131B2B]/80 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 opacity-50"></div>
                            <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-6">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <SafeIcon name="BrainCircuit" className="text-emerald-400"/> Primary Architectural Blueprint
                                </h3>
                                <span className="px-3 py-1.5 bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <SafeIcon name="Lock" size={12}/> Immutable Core
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <BlueprintCard title="Business Goals" icon="Target" color="sky" items={parseKnowledgeItems(activeProject.analysis?.businessRequirements?.goals, activeProject.projectKnowledgeBase?.systemArchitecture, "Strategic objectives pending definition.")} />
                                <BlueprintCard title="Functional Reqs" icon="ListChecks" color="emerald" items={parseKnowledgeItems(activeProject.analysis?.functionalRequirements?.featureList, activeProject.projectKnowledgeBase?.coreFeatures, "Core features pending allocation.")} />
                                <BlueprintCard title="Security Protocols" icon="ShieldCheck" color="rose" items={parseKnowledgeItems(activeProject.analysis?.nonFunctionalRequirements?.securityAndCompliance, activeProject.projectKnowledgeBase?.qaTestingStrategy, "Zero-trust protocols standing by.")} />
                                <BlueprintCard title="Tech Environment" icon="Cpu" color="indigo" items={parseKnowledgeItems(activeProject.analysis?.technicalRequirements?.techStack, activeProject.projectKnowledgeBase?.databaseDesign, "Architecture environment unset.")} />
                                <BlueprintCard title="Non-Functional Reqs" icon="Activity" color="amber" items={parseKnowledgeItems(activeProject.analysis?.nonFunctionalRequirements?.performance, null, "Uptime and performance baselines pending.")} />
                                <BlueprintCard title="Project Constraints" icon="AlertTriangle" color="orange" items={parseKnowledgeItems(activeProject.analysis?.constraintsAndDependencies?.budgetAndTimeline, null, "No timeline boundaries detected.")} />
                            </div>
                        </div>

                        {/* Persistent AI Vault Analyzer */}
                        <div className="bg-[#0D1117] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-800 pb-5 mb-6 gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-3"><SafeIcon name="Sparkles" className="text-amber-400"/> Vault Intelligence & Insights</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-bold">Cross-reference project blueprints with newly uploaded files.</p>
                                </div>
                                <button 
                                    onClick={runVaultAnalysis}
                                    disabled={isAnalyzing || !activeProject.files?.length}
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                                >
                                    {isAnalyzing ? <><SafeIcon name="Loader2" size={14} className="animate-spin" /> Scanning Vault...</> : <><SafeIcon name="Radar" size={14} /> Scan Uploaded Data</>}
                                </button>
                            </div>

                            <div className="space-y-6">
                                {(!activeProject.vaultAnalyses?.length) ? (
                                    <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                                        <SafeIcon name="Bot" size={32} className="mx-auto text-slate-600 mb-3 opacity-50" />
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No Analyses Generated Yet</p>
                                        <p className="text-[10px] text-slate-600 mt-2">Upload files to the vault and run a scan to extract intelligence.</p>
                                    </div>
                                ) : (
                                    activeProject.vaultAnalyses.map((analysis) => (
                                        <div key={analysis._id} className="bg-[#131B2B]/60 border border-slate-700/50 rounded-2xl p-6 shadow-md relative group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[50px] pointer-events-none"></div>
                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <div>
                                                    <h4 className="text-sm font-black text-white">{analysis.title || 'Vault Analysis Report'}</h4>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                                                        Requested by: {analysis.generatedBy || 'System'} • {new Date(analysis.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                {isManager && (
                                                    <button 
                                                        onClick={() => deleteAnalysis(analysis._id)} 
                                                        className="text-slate-500 hover:text-rose-500 bg-slate-900/80 hover:bg-rose-500/10 p-2 rounded-lg border border-slate-700 hover:border-rose-500/30 transition-all flex items-center justify-center shrink-0 shadow-sm"
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

                    {/* RIGHT COLUMN: Enterprise File Vault */}
                    <div className="xl:col-span-4 space-y-6">
                        <div className="bg-[#0D1117] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-[850px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                            
                            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 shrink-0 relative z-10">
                                <h3 className="text-lg font-black text-white flex items-center gap-3"><SafeIcon name="HardDrive" className="text-sky-400"/> Enterprise File Vault</h3>
                                <span className="bg-sky-500/10 text-sky-400 px-2 py-1 rounded text-[10px] font-black border border-sky-500/20">{activeProject.files?.length || 0} Files</span>
                            </div>

                            {/* Upload Area */}
                            <div className="relative group shrink-0 mb-6 z-10">
                                <div className="absolute inset-0 bg-sky-500/5 rounded-2xl blur-xl group-hover:bg-sky-500/10 transition-colors pointer-events-none"></div>
                                <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 bg-[#131B2B]/50 rounded-2xl p-8 text-center transition-all relative z-10">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center">
                                            <SafeIcon name="Loader2" size={32} className="text-sky-400 animate-spin mb-3" />
                                            <p className="text-[10px] uppercase font-black tracking-widest text-sky-400">Vaulting File Securely...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <SafeIcon name="UploadCloud" size={32} className="text-slate-500 group-hover:text-sky-400 mx-auto mb-3 transition-colors" />
                                            <p className="text-xs font-bold text-slate-400 mb-4">Drag & Drop or Click to Upload Documents</p>
                                            <label className="cursor-pointer bg-slate-800 hover:bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors shadow-lg border border-slate-700 hover:border-sky-500 inline-block">
                                                Select File
                                                <input type="file" className="hidden" onChange={handleFileUpload} />
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Files List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 z-10 relative">
                                {(!activeProject.files?.length) ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                                        <SafeIcon name="FolderOpen" size={48} className="mb-3" />
                                        <p className="text-xs font-black uppercase tracking-widest">Vault is Empty</p>
                                    </div>
                                ) : (
                                    activeProject.files.map((file, idx) => (
                                        <div key={file._id || idx} className="bg-[#1A2333]/90 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between group hover:border-sky-500/30 transition-all shadow-sm">
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="w-10 h-10 rounded-lg bg-[#0D1117] border border-slate-800 flex items-center justify-center shrink-0">
                                                    {getFileIcon(file.mimetype)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-white truncate" title={file.originalName}>{file.originalName}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[9px] font-mono text-slate-500">{formatBytes(file.size)}</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 border-l border-slate-700 pl-3">
                                                            By {file.uploadedBy?.split(' ')[0] || 'System'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <a 
                                                    href={`${API.defaults.baseURL}/projects/download/${file.filename}`} 
                                                    download={file.originalName} 
                                                    className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white flex items-center justify-center transition-colors border border-sky-500/20" 
                                                    title="Download"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <SafeIcon name="Download" size={14} />
                                                </a>
                                                {isManager && (
                                                    <button 
                                                        onClick={() => handleDeleteFile(file._id)} 
                                                        className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-colors border border-slate-700 hover:border-rose-500/30" 
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
        <div className="bg-[#0D1117] p-5 rounded-2xl border border-slate-800 shadow-inner hover:border-slate-600 transition-colors duration-300 flex flex-col h-full group">
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${styles.text} mb-3 flex items-center gap-2 border-b border-slate-800 pb-3`}>
                <SafeIcon name={icon} size={14} className={`${styles.hover} transition-colors`} /> {title}
            </h4>
            <ul className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-40">
                {items.map((item, i) => {
                    const parts = item.split(':');
                    return (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                            <SafeIcon name="ChevronRight" size={12} className={`${styles.bullet} shrink-0 mt-0.5 opacity-70`} /> 
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
    if (!items || items.length === 0) return null;
    const styles = COLOR_MAP[color] || COLOR_MAP.sky;

    return (
        <div className="bg-[#0D1117] p-4 rounded-xl border border-slate-800">
            <h5 className={`text-[10px] font-black uppercase tracking-widest ${styles.text} mb-2 border-b border-slate-800 pb-2`}>{title}</h5>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className={`${styles.bullet} opacity-50`}>•</span> {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}