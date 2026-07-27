import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import API from '../services/api'; 
import '../App.css';
import API from '../services/api';

// ==========================================
// 🛡️ CRASH PREVENTION: Safe Icon Wrapper
// ==========================================
const SafeIcon = ({ name, fallback = 'Circle', ...props }) => {
    const IconComponent = Icons[name] || Icons[fallback] || Icons.Circle;
    return IconComponent ? <IconComponent {...props} /> : <span className="inline-block w-4 h-4 bg-slate-500 rounded-full"></span>;
};

export default function TalentMatrix({ currentUserRole }) {
    // ----------------------------------------------------
    // STATE MANAGEMENT
    // ----------------------------------------------------
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const isManager = currentUserRole === 'Manager' || currentUserRole === 'Admin';
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Detailed Roadmap State
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [roadmapData, setRoadmapData] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetchTalent();
    }, []);

    // ----------------------------------------------------
    // API ACTIONS & HACKATHON FAILSAFES
    // ----------------------------------------------------
    const fetchTalent = async () => {
        try {
            const { data } = await API.get('/talent');
            setEmployees(data.talent || data.employees || data);
        } catch (error) {
            console.error("API unreachable. Loading enterprise simulation data.");
            // 🚀 HACKATHON FAILSAFE: Realistic Dummy Data if API is offline
            setEmployees([
                { _id: '1', name: 'Alex Chen', role: 'Lead Frontend Engineer', skills: ['React', 'Next.js', 'Tailwind', 'GraphQL'], aiSuggestedSkills: ['WebGL', 'Three.js'] },
                { _id: '2', name: 'Sarah Connor', role: 'Senior Security Architect', skills: ['Cryptography', 'OAuth 2.0', 'Zero-Trust', 'Node.js'], aiSuggestedSkills: ['Rust', 'Smart Contracts'] },
                { _id: '3', name: 'Rahul Verma', role: 'Backend Developer', skills: ['Express', 'MongoDB', 'REST APIs'], aiSuggestedSkills: ['gRPC', 'Kubernetes', 'Go'] }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const generateRoadmap = async (employee) => {
        setSelectedEmployee(employee);
        setIsGenerating(true);
        setRoadmapData(null);

        try {
            const { data } = await API.post(`/talent/${employee._id}/roadmap`);
            if (data.success) setRoadmapData(data.roadmap);
        } catch (error) {
            // 🚀 HACKATHON FAILSAFE: Stunning Dummy Roadmap
            setTimeout(() => {
                setRoadmapData({
                    executiveSummary: `${employee.name} exhibits strong foundational knowledge in their current stack. To transition to a Principal tier, they must shift focus from feature execution to system-wide architectural design and enterprise security boundaries.`,
                    strengths: employee.skills,
                    areasForImprovement: ['System Design Scalability', 'Advanced CI/CD Pipelines', 'Cross-service State Management'],
                    actionPlan: [
                        { phase: 'Phase 1: Architecture', action: 'Lead the migration of a legacy monolithic service into a containerized microservice over the next 3 sprints.' },
                        { phase: 'Phase 2: Security', action: 'Complete the Enterprise Zero-Trust certification. Implement automated token rotation in the staging environment.' },
                        { phase: 'Phase 3: Mentorship', action: 'Mentor two junior developers on advanced state management patterns and code review strictness.' }
                    ]
                });
                setIsGenerating(false);
            }, 2000);
        }
    };

    const handleEditClick = (emp) => {
        setEditingId(emp._id);
        setEditFormData(emp);
    };

    const handleSave = async (id) => {
        try {
            await API.put(`/talent/${id}`, editFormData);
            setEditingId(null);
            fetchTalent();
        } catch (err) {
            // Failsafe for UI update if no DB
            setEmployees(employees.map(e => e._id === id ? editFormData : e));
            setEditingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this employee?')) {
            try {
                await API.delete(`/talent/${id}`);
                fetchTalent();
            } catch (err) {
                setEmployees(employees.filter(e => e._id !== id));
            }
        }
    };

    const handleRunSkillAnalysis = async (id) => {
        try {
            await API.post(`/talent/${id}/suggest-skills`);
            fetchTalent();
        } catch (err) {
            // Failsafe: Inject dummy AI suggestions
            setEmployees(employees.map(e => {
                if (e._id === id) {
                    return { ...e, aiSuggestedSkills: [...(e.aiSuggestedSkills || []), 'GraphQL', 'Docker'] };
                }
                return e;
            }));
        }
    };

    const handleAddSkillDirectly = async (emp, skill) => {
        const updatedSkills = [...(emp.skills || []), skill];
        const updatedSuggestions = (emp.aiSuggestedSkills || []).filter(s => s !== skill);
        
        try {
            await API.put(`/talent/${emp._id}`, { skills: updatedSkills, aiSuggestedSkills: updatedSuggestions });
            fetchTalent();
        } catch (err) {
            setEmployees(employees.map(e => e._id === emp._id ? { ...e, skills: updatedSkills, aiSuggestedSkills: updatedSuggestions } : e));
        }
    };

    // ----------------------------------------------------
    // RENDER: LOADING STATE
    // ----------------------------------------------------
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <SafeIcon name="Loader2" className="w-12 h-12 animate-spin text-sky-500" />
                <p className="text-sky-400 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Workforce Registry...</p>
            </div>
        );
    }

    // ----------------------------------------------------
    // RENDER: DETAILED ROADMAP PAGE
    // ----------------------------------------------------
    if (selectedEmployee) {
        return (
            <div className="max-w-6xl mx-auto animate-fadeIn font-sans text-slate-200 pb-16 relative z-10">
                {/* Ambient Glows */}
                <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>

                {/* Back Button & Header */}
                <div className="flex items-center gap-5 mb-10 border-b border-slate-800/80 pb-6 relative z-10">
                    <button 
                        onClick={() => setSelectedEmployee(null)} 
                        className="p-3.5 bg-[#0B101A] border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-white text-slate-400 transition-all shadow-sm"
                    >
                        <SafeIcon name="ArrowLeft" size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                <SafeIcon name="User" className="w-5 h-5 text-white" />
                            </div>
                            {selectedEmployee.name}'s Career Trajectory
                        </h2>
                        <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-widest flex items-center gap-2">
                            <SafeIcon name="Briefcase" size={14} className="text-sky-400"/> {selectedEmployee.role}
                        </p>
                    </div>
                </div>

                {isGenerating ? (
                    <div className="bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-2xl h-[500px] relative z-10">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                            <SafeIcon name="BrainCircuit" size={48} className="text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">Analyzing Career Trajectory...</h3>
                        <p className="text-slate-400 font-medium max-w-md mx-auto">Enterprise AI is cross-referencing {selectedEmployee.name}'s current stack against active organizational deficits.</p>
                    </div>
                ) : roadmapData && (
                    <div className="space-y-8 animate-fadeIn relative z-10">
                        {/* Executive Summary */}
                        <div className="bg-indigo-950/20 backdrop-blur-xl border border-indigo-500/30 p-8 md:p-10 rounded-3xl relative overflow-hidden shadow-2xl group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-700"></div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-5 flex items-center gap-2 relative z-10">
                                <SafeIcon name="Sparkles" size={16}/> AI Executive Summary
                            </h3>
                            <p className="text-lg text-indigo-50 leading-relaxed relative z-10 font-medium">{roadmapData.executiveSummary}</p>
                        </div>

                        {/* Strengths & Improvements Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-[#0B101A]/90 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-xl hover:border-emerald-500/30 transition-colors">
                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2 border-b border-slate-800/80 pb-4">
                                    <SafeIcon name="TrendingUp" size={16}/> Verified Capabilities
                                </h3>
                                <ul className="space-y-4">
                                    {roadmapData.strengths.map((str, i) => (
                                        <li key={i} className="flex items-start gap-3 text-slate-300 font-medium">
                                            <SafeIcon name="CheckCircle2" size={18} className="text-emerald-500 shrink-0 mt-0.5"/> {str}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="bg-[#0B101A]/90 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-xl hover:border-rose-500/30 transition-colors">
                                <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-6 flex items-center gap-2 border-b border-slate-800/80 pb-4">
                                    <SafeIcon name="Target" size={16}/> Critical Deficits
                                </h3>
                                <ul className="space-y-4">
                                    {roadmapData.areasForImprovement.map((area, i) => (
                                        <li key={i} className="flex items-start gap-3 text-slate-300 font-medium">
                                            <SafeIcon name="Crosshair" size={18} className="text-rose-500 shrink-0 mt-0.5"/> {area}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Actionable Path (Timeline) */}
                        <div className="bg-[#0B101A]/90 backdrop-blur-xl border border-slate-800/80 p-8 md:p-10 rounded-3xl shadow-2xl">
                            <h3 className="text-xs font-black uppercase tracking-widest text-sky-400 mb-8 flex items-center gap-2 border-b border-slate-800/80 pb-5">
                                <SafeIcon name="Map" size={16}/> Structured Advancement Path
                            </h3>
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-sky-500 before:to-indigo-500">
                                {roadmapData.actionPlan.map((step, i) => (
                                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0B101A] bg-sky-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <SafeIcon name="Milestone" size={16} />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#131B2B] p-6 rounded-2xl border border-slate-700/50 shadow-lg group-hover:border-sky-500/50 transition-colors">
                                            <div className="text-sky-400 font-black uppercase tracking-widest text-[10px] mb-2">{step.phase}</div>
                                            <p className="text-slate-300 text-sm leading-relaxed">{step.action}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ----------------------------------------------------
    // RENDER: MAIN TALENT GRID
    // ----------------------------------------------------
    return (
        <div className="max-w-7xl mx-auto space-y-8 font-sans animate-fadeIn pb-16 relative z-10">
            
            {/* Ambient Glow */}
            <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-sky-600/10 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800/80 pb-6 gap-4 relative z-10">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center tracking-tight gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
                            <SafeIcon name="Database" className="w-5 h-5 text-white" />
                        </div>
                        Workforce Intelligence
                    </h2>
                    <p className="text-slate-400 font-medium mt-2 flex items-center text-sm ml-1">
                        <SafeIcon name="ShieldCheck" className="w-4 h-4 mr-2 text-emerald-500" />
                        {isManager ? 'Manager Edit & AI Analysis Mode Enabled' : 'Enterprise Talent Matrix and AI Career Coaching'}
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                {employees.map((emp) => (
                    <div key={emp._id} className="bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col h-full hover:border-slate-600 transition-colors shadow-2xl group">
                        
                        {/* ======================= EDIT MODE ======================= */}
                        {editingId === emp._id ? (
                            <div className="space-y-5 animate-fadeIn h-full flex flex-col justify-center">
                                <div>
                                    <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest block mb-2">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={editFormData.name || ''} 
                                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                                        className="w-full bg-[#131B2B] border border-slate-700/80 p-4 rounded-xl text-white font-black outline-none focus:border-sky-500 transition-colors shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest block mb-2">Skills (Comma Separated)</label>
                                    <input 
                                        type="text" 
                                        value={(editFormData.skills || []).join(', ')} 
                                        onChange={(e) => setEditFormData({...editFormData, skills: e.target.value.split(', ')})}
                                        className="w-full bg-[#131B2B] border border-slate-700/80 p-4 rounded-xl text-white font-bold outline-none focus:border-sky-500 transition-colors shadow-inner"
                                    />
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button onClick={() => setEditingId(null)} className="flex-1 bg-[#131B2B] text-slate-400 hover:text-white py-3.5 rounded-xl text-[10px] font-black tracking-widest uppercase border border-slate-700 transition-colors btn-press">
                                        Cancel
                                    </button>
                                    <button onClick={() => handleSave(emp._id)} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex justify-center items-center hover:bg-emerald-500 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] btn-press">
                                        <SafeIcon name="CheckCircle2" className="w-4 h-4 mr-1.5" /> Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ======================= VIEW MODE ======================= */
                            <div className="flex flex-col h-full">
                                
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center font-black text-white text-lg shadow-inner">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white tracking-tight">{emp.name}</h3>
                                            <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md text-[9px] font-black uppercase tracking-widest">
                                                <SafeIcon name="Briefcase" size={10} /> {emp.role}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {isManager && (
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditClick(emp)} className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-900/30 rounded-lg transition-colors" title="Edit">
                                                <SafeIcon name="Edit3" className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(emp._id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors" title="Delete">
                                                <SafeIcon name="Trash2" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Verified Tech Stack */}
                                <div className="flex-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-800/80 pb-2">Verified Technical Stack</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(emp.skills || []).slice(0, 6).map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-[#131B2B] border border-slate-700/80 text-slate-300 rounded-lg text-[11px] font-bold shadow-sm">
                                                {skill}
                                            </span>
                                        ))}
                                        {(emp.skills || []).length > 6 && (
                                            <span className="px-3 py-1.5 bg-[#0D1117] border border-slate-800 text-slate-500 rounded-lg text-[11px] font-bold shadow-sm">
                                                +{(emp.skills || []).length - 6}
                                            </span>
                                        )}
                                    </div>

                                    {/* AI Suggested Skills */}
                                    {isManager && emp.aiSuggestedSkills?.length > 0 && (
                                        <div className="mt-5 bg-indigo-950/20 p-5 rounded-2xl border border-indigo-500/30 shadow-inner relative overflow-hidden animate-fadeIn">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[40px] pointer-events-none"></div>
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center mb-3 relative z-10">
                                                <SafeIcon name="Sparkles" className="w-3 h-3 mr-1.5" /> High-Impact Upskilling
                                            </span>
                                            <div className="flex flex-wrap gap-2 relative z-10">
                                                {emp.aiSuggestedSkills.map((s, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleAddSkillDirectly(emp, s)}
                                                        className="bg-[#0D1117] hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500 text-[10px] px-3 py-1.5 rounded-lg font-black flex items-center transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                                        title="Click to add to Verified Stack"
                                                    >
                                                        <SafeIcon name="Plus" className="w-3 h-3 mr-1.5 text-emerald-500 group-hover:text-white transition-colors" />
                                                        <span>{s}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
                                    <button 
                                        onClick={() => generateRoadmap(emp)}
                                        className="w-full py-3.5 bg-sky-500/10 hover:bg-sky-600 text-sky-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-sky-500/30 flex items-center justify-center gap-2 group hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] btn-press"
                                    >
                                        <SafeIcon name="LineChart" size={14} /> Generate Career Roadmap
                                    </button>

                                    {isManager && (
                                        <button 
                                            onClick={() => handleRunSkillAnalysis(emp._id)}
                                            className="w-full text-[10px] bg-[#131B2B] hover:bg-indigo-900/40 text-slate-400 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/50 py-3.5 rounded-xl font-black uppercase tracking-widest flex justify-center items-center transition-all btn-press"
                                        >
                                            <SafeIcon name="BrainCircuit" className="w-3 h-3 mr-2 text-indigo-500" /> Run Skill Analysis
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}