import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import API from '../services/api'; // Ensure this points to your configured Axios instance (e.g., baseURL: 'http://localhost:5000/api')

// Bulletproof dynamic icon renderer
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
    
    // CRUD & Inline AI State (From V2)
    const isManager = currentUserRole === 'Manager';
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Detailed Roadmap State (From V1)
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [roadmapData, setRoadmapData] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetchTalent();
    }, []);

    // ----------------------------------------------------
    // API ACTIONS
    // ----------------------------------------------------
    const fetchTalent = async () => {
        try {
            const { data } = await API.get('/talent');
            // Safe fallback depending on how your backend wraps the response
            setEmployees(data.talent || data.employees || data);
        } catch (error) {
            console.error("Failed to fetch talent", error);
        } finally {
            setLoading(false);
        }
    };

    // Roadmap Generation (V1)
    const generateRoadmap = async (employee) => {
        setSelectedEmployee(employee);
        setIsGenerating(true);
        setRoadmapData(null);

        try {
            const { data } = await API.post(`/talent/${employee._id}/roadmap`);
            if (data.success) {
                setRoadmapData(data.roadmap);
            }
        } catch (error) {
            alert("Failed to generate AI Roadmap. Please try again.");
            setSelectedEmployee(null);
        } finally {
            setIsGenerating(false);
        }
    };

    // CRUD Operations (V2)
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
            alert("Failed to update employee.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this employee?')) {
            try {
                await API.delete(`/talent/${id}`);
                fetchTalent();
            } catch (err) {
                alert("Failed to delete employee.");
            }
        }
    };

    // Inline Skill Analysis (V2)
    const handleRunSkillAnalysis = async (id) => {
        try {
            await API.post(`/talent/${id}/suggest-skills`);
            fetchTalent();
        } catch (err) {
            alert("AI Analysis failed to run.");
        }
    };

    const handleAddSkillDirectly = async (emp, skill) => {
        const currentSkills = emp.skills || [];
        const currentSuggestions = emp.aiSuggestedSkills || [];
        
        const updatedSkills = [...currentSkills, skill];
        const updatedSuggestions = currentSuggestions.filter(s => s !== skill);
        
        try {
            await API.put(`/talent/${emp._id}`, {
                skills: updatedSkills,
                aiSuggestedSkills: updatedSuggestions
            });
            fetchTalent();
        } catch (err) {
            alert("Failed to add skill.");
        }
    };

    // ----------------------------------------------------
    // RENDER: LOADING STATE
    // ----------------------------------------------------
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <SafeIcon name="Loader2" className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-blue-400 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Workforce Registry...</p>
            </div>
        );
    }

    // ----------------------------------------------------
    // RENDER: DETAILED ROADMAP PAGE (V1)
    // ----------------------------------------------------
    if (selectedEmployee) {
        return (
            <div className="max-w-5xl mx-auto animate-fadeIn font-sans text-slate-200 pb-12">
                {/* Back Button & Header */}
                <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
                    <button 
                        onClick={() => setSelectedEmployee(null)} 
                        className="p-3 bg-[#0D1117] border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
                    >
                        <SafeIcon name="ArrowLeft" size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            {selectedEmployee.name}'s Career Roadmap
                        </h2>
                        <p className="text-slate-400 font-bold mt-1 text-sm uppercase tracking-widest flex items-center gap-2">
                            <SafeIcon name="Briefcase" size={14} className="text-blue-500"/> {selectedEmployee.role}
                        </p>
                    </div>
                </div>

                {isGenerating ? (
                    <div className="bg-[#0D1117] border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-2xl h-[500px]">
                        <SafeIcon name="BrainCircuit" size={64} className="text-indigo-500 animate-pulse mb-6" />
                        <h3 className="text-2xl font-black text-white tracking-tight mb-2">Analyzing Career Trajectory...</h3>
                        <p className="text-slate-400 font-medium">Enterprise AI is cross-referencing {selectedEmployee.name}'s current stack with industry demands.</p>
                    </div>
                ) : roadmapData && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Executive Summary */}
                        <div className="bg-indigo-900/10 border border-indigo-500/30 p-8 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2 relative z-10">
                                <SafeIcon name="Sparkles" size={16}/> AI Executive Summary
                            </h3>
                            <p className="text-lg text-indigo-50 leading-relaxed relative z-10">{roadmapData.executiveSummary}</p>
                        </div>

                        {/* Strengths & Improvements Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-[#0D1117] border border-slate-800 p-8 rounded-3xl shadow-xl">
                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                                    <SafeIcon name="TrendingUp" size={16}/> Established Strengths
                                </h3>
                                <ul className="space-y-4">
                                    {roadmapData.strengths.map((str, i) => (
                                        <li key={i} className="flex items-start gap-3 text-slate-300 font-medium">
                                            <SafeIcon name="CheckCircle2" size={18} className="text-emerald-500 shrink-0 mt-0.5"/> {str}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="bg-[#0D1117] border border-slate-800 p-8 rounded-3xl shadow-xl">
                                <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                                    <SafeIcon name="Target" size={16}/> Skill Deficits & Improvements
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

                        {/* Actionable Path */}
                        <div className="bg-[#131B2B]/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
                            <h3 className="text-xs font-black uppercase tracking-widest text-sky-400 mb-8 flex items-center gap-2 border-b border-slate-700/50 pb-4">
                                <SafeIcon name="Map" size={16}/> Recommended Advancement Path
                            </h3>
                            <div className="space-y-6">
                                {roadmapData.actionPlan.map((step, i) => (
                                    <div key={i} className="bg-[#0D1117] p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6 items-start">
                                        <div className="bg-sky-500/10 text-sky-400 px-4 py-2 rounded-lg border border-sky-500/20 shrink-0 text-xs font-black uppercase tracking-widest">
                                            {step.phase}
                                        </div>
                                        <p className="text-slate-300 leading-relaxed pt-1">{step.action}</p>
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
    // RENDER: MAIN TALENT GRID (COMBINED V1 & V2)
    // ----------------------------------------------------
    return (
        <div className="space-y-8 font-sans animate-fadeIn pb-12">
            {/* Header */}
            <div className="border-b border-blue-900/50 pb-5">
                <h2 className="text-3xl font-black text-white flex items-center tracking-tight">
                    <SafeIcon name="Database" className="w-8 h-8 mr-3 text-blue-500" /> Workforce Intelligence
                </h2>
                <p className="text-slate-400 font-bold mt-2 flex items-center text-sm">
                    <SafeIcon name="ShieldCheck" className="w-4 h-4 mr-2 text-emerald-500" />
                    {isManager ? 'Manager Edit & AI Analysis Mode Enabled' : 'Enterprise Talent Matrix and AI Career Coaching'}
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {employees.map((emp) => (
                    <div key={emp._id} className="bg-[#0D1117] border border-slate-800 rounded-3xl p-6 flex flex-col h-full hover:border-slate-600 transition-colors shadow-xl group">
                        
                        {/* EDIT MODE */}
                        {editingId === emp._id ? (
                            <div className="space-y-4 animate-fadeIn h-full flex flex-col justify-center">
                                <div>
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={editFormData.name || ''} 
                                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                                        className="w-full bg-slate-950 border-2 border-slate-800 p-3 rounded-lg text-white font-black outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Skills (Comma Separated)</label>
                                    <input 
                                        type="text" 
                                        value={(editFormData.skills || []).join(', ')} 
                                        onChange={(e) => setEditFormData({...editFormData, skills: e.target.value.split(', ')})}
                                        className="w-full bg-slate-950 border-2 border-slate-800 p-3 rounded-lg text-white font-bold outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleSave(emp._id)}
                                    className="w-full bg-emerald-600 text-white py-3 rounded-lg font-black flex justify-center items-center hover:bg-emerald-500 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-2"
                                >
                                    <SafeIcon name="Save" className="w-5 h-5 mr-2" /> SAVE CHANGES
                                </button>
                                <button 
                                    onClick={() => setEditingId(null)}
                                    className="w-full text-slate-400 py-2 text-xs font-bold hover:text-white"
                                >
                                    CANCEL
                                </button>
                            </div>
                        ) : (
                            /* VIEW MODE */
                            <div className="flex flex-col h-full">
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">{emp.name}</h3>
                                        <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-blue-900/20 text-blue-400 border border-blue-500/30 rounded-md text-[9px] font-black uppercase tracking-widest">
                                            <SafeIcon name="Briefcase" size={10} /> {emp.role}
                                        </span>
                                    </div>
                                    {isManager && (
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditClick(emp)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent hover:border-blue-800" title="Edit">
                                                <SafeIcon name="Edit3" className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(emp._id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-800" title="Delete">
                                                <SafeIcon name="Trash2" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Verified Tech Stack */}
                                <div className="flex-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-800 pb-2">Verified Technical Stack</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(emp.skills || []).slice(0, 5).map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold shadow-sm">
                                                {skill}
                                            </span>
                                        ))}
                                        {(emp.skills || []).length > 5 && (
                                            <span className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-500 rounded-lg text-xs font-bold shadow-sm">
                                                +{(emp.skills || []).length - 5} more
                                            </span>
                                        )}
                                    </div>

                                    {/* AI Suggested Skills (Visible if Manager & if suggestions exist) */}
                                    {isManager && emp.aiSuggestedSkills?.length > 0 && (
                                        <div className="mt-4 bg-[#0a0f1a] p-4 rounded-xl border border-blue-900/50 shadow-inner relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full mix-blend-screen filter blur-[50px] opacity-10"></div>
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3 flex items-center relative z-10">
                                                <SafeIcon name="Sparkles" className="w-3 h-3 mr-1.5" /> High-Impact Upskilling
                                            </span>
                                            <div className="flex flex-wrap gap-2 relative z-10">
                                                {emp.aiSuggestedSkills.map((s, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleAddSkillDirectly(emp, s)}
                                                        className="bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500 text-[11px] px-3 py-1.5 rounded font-black flex items-center transition-all group shadow-sm hover:shadow-[0_0_10px_rgba(16,185,129,0.3)]"
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
                                <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                                    <button 
                                        onClick={() => generateRoadmap(emp)}
                                        className="w-full py-3.5 bg-blue-900/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/30 flex items-center justify-center gap-2 group hover:border-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                                    >
                                        <SafeIcon name="LineChart" size={14} /> Full Career Roadmap
                                    </button>

                                    {isManager && (
                                        <button 
                                            onClick={() => handleRunSkillAnalysis(emp._id)}
                                            className="w-full text-[10px] bg-slate-900 hover:bg-indigo-900/40 text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/50 py-3 rounded-xl font-black flex justify-center items-center transition-all"
                                        >
                                            <SafeIcon name="Sparkles" className="w-3 h-3 mr-2 text-indigo-500" /> RUN QUICK SKILL ANALYSIS
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