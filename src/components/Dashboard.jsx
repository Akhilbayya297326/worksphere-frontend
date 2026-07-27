import React, { useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import API from '../services/api';
import { 
  UploadCloud, BrainCircuit, Users, AlertTriangle, CheckCircle2, 
  Settings, LayoutDashboard, ChevronRight, FileText, 
  Plus, Trash2, Image as ImageIcon, Check, GitBranch, TerminalSquare
} from 'lucide-react';
import '../App.css';

// 🚀 HARDCODED RENDER URL FOR SOCKET
const socket = io('https://worksphere-backend-thoi.onrender.com');

export default function Dashboard({ currentUser }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('vision'); 
  
  const [projectTitle, setProjectTitle] = useState('');
  const [projectFile, setProjectFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [projectData, setProjectData] = useState(null);
  const [draftedTasks, setDraftedTasks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 🚀 DYNAMIC REPOSITORY MANAGEMENT
  const [repositories, setRepositories] = useState([
    { repoType: 'Frontend', url: '' },
    { repoType: 'Backend', url: '' }
  ]);

  const addRepositoryField = () => setRepositories([...repositories, { repoType: 'Microservice', url: '' }]);
  const removeRepositoryField = (index) => setRepositories(repositories.filter((_, i) => i !== index));
  const updateRepository = (index, field, value) => {
    const updated = [...repositories];
    updated[index][field] = value;
    setRepositories(updated);
  };

  // 🖼️ HANDLE FILE UPLOAD & PREVIEW
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProjectFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  // 🔄 SWITCH MODE (Vision vs Document)
  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setProjectFile(null);
    setImagePreview(null);
  };

  // 🎯 DEMO HELPER: Instantly fill data for hackathon pitch
  const loadDemoData = () => {
    setProjectTitle(mode === 'vision' ? "Project Krishi Chakra - Whiteboard V1" : "Enterprise Platform Migration v2.0");
    setRepositories([
      { repoType: 'Frontend', url: 'https://github.com/enterprise/krishi-web-client' },
      { repoType: 'Backend', url: 'https://github.com/enterprise/krishi-core-api' }
    ]);
  };

  // STEP 1 -> 2: Upload File & Trigger AI Orchestration
  const handleOrchestrationSubmit = async (e) => {
    e.preventDefault();
    if (!projectFile || !projectTitle.trim()) return alert("Please provide both an Initiative Title and a File.");

    setStep(2);
    setIsProcessing(true);

    try {
      if (mode === 'vision') {
        const formData = new FormData();
        formData.append('image', projectFile);
        formData.append('title', projectTitle);

        // 🚀 HARDCODED RENDER URL
        const res = await axios.post('https://worksphere-backend-thoi.onrender.com/api/orchestration/vision-orchestrate', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.success) {
          setProjectData({
            title: res.data.projectTitle,
            aiShortlistedTeam: res.data.shortlistedTeam || []
          });
          setDraftedTasks((res.data.draftedTasks || []).map(t => ({ ...t, assignedTo: '' })));
          setStep(3);
        }
      } else {
        const payload = {
          text: `Initiative Name: ${projectTitle}. Reference File: ${projectFile.name}. Decompose this into technical tasks and shortlist the best available team.`,
          documentData: projectTitle
        };
        // 🚀 HARDCODED RENDER URL
        const res = await axios.post('https://worksphere-backend-thoi.onrender.com/api/analysis/analyze-doc', payload);
        
        setProjectData({
          title: projectTitle,
          aiShortlistedTeam: res.data.analysis?.aiShortlist || []
        });
        setDraftedTasks((res.data.tasks || []).map(t => ({ ...t, assignedTo: '' })));
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      alert('❌ AI Orchestration Failed. Please check the backend console.');
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 3 -> 4: Manager Approves & Dispatches
  const handleManagerConfirm = async () => {
    if (draftedTasks.some(t => !t.assignedTo)) {
      return alert("Manager Action Required: Assign all tasks using the dropdowns before dispatching.");
    }

    try {
      const validRepos = repositories.filter(r => r.url.trim() !== '');

      // 🚀 HARDCODED RENDER URL
      await axios.post(`https://worksphere-backend-thoi.onrender.com/api/orchestration/dispatch`, {
        title: projectData.title,
        aiShortlistedTeam: projectData.aiShortlistedTeam,
        finalizedTasks: draftedTasks,
        repositories: validRepos
      });

      // 📢 Send Socket Notification to Global Channel
      socket.emit('send_message', {
        senderId: currentUser?._id || 'SYS',
        text: `📢 INITIATIVE DISPATCHED: "${projectData.title}" has been approved by ${currentUser?.name || 'Management'}. Tasks and ${validRepos.length} Repositories have been allocated. Unified Workspace is now live.`,
        messageType: 'update',
        channel: 'global-orchestration'
      });

      socket.emit('trigger_workspace_update');
      setStep(4);
    } catch (err) {
      console.error(err);
      alert("Failed to dispatch project.");
    }
  };

  const triggerChaosMonkey = () => {
    if(window.confirm("WARNING: This will trigger a simulated SEV-1 hardware outage globally. Proceed?")) {
      socket.emit('trigger_chaos_monkey');
    }
  };

  // ==========================================
  // 🎨 STUNNING UI COMPONENTS
  // ==========================================
  const StepIndicator = () => (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto mb-10 relative z-10">
      {/* Connecting Line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full transform -translate-y-1/2"></div>
      <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500 -z-10 rounded-full transform -translate-y-1/2 transition-all duration-700 ease-in-out" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>

      {[
        { num: 1, label: 'Input Vector' },
        { num: 2, label: 'AI Decomposition' },
        { num: 3, label: 'Talent Allocation' },
        { num: 4, label: 'Live Dispatch' }
      ].map((s) => {
        const isActive = step === s.num;
        const isPassed = step > s.num;
        return (
          <div key={s.num} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
              isActive ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.5)] scale-110' : 
              isPassed ? 'bg-indigo-500 text-white border-none' : 'bg-[#0D1117] text-slate-500 border-2 border-slate-700'
            }`}>
              {isPassed ? <Check size={16} strokeWidth={4} /> : s.num}
            </div>
            <span className={`text-[9px] uppercase tracking-widest font-bold ${isActive || isPassed ? 'text-slate-300' : 'text-slate-600'} hidden md:block`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-16 max-w-6xl mx-auto text-slate-200">
      
      {/* 🌌 AMBIENT BACKGROUND GLOWS */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-900/20 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800/80 pb-6 gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center tracking-tight gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            AI Project Orchestrator
          </h2>
          <p className="text-slate-400 font-medium mt-2 text-sm ml-1">Multimodal "Vibe Coding" & Automated Initiative Dispatch Engine.</p>
        </div>
        <button 
          onClick={triggerChaosMonkey}
          className="bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black px-5 py-2.5 rounded-xl flex items-center hover:bg-rose-600 hover:text-white transition-all shadow-[0_0_15px_rgba(225,29,72,0.15)] btn-press uppercase tracking-widest text-[10px]"
        >
          <AlertTriangle className="w-4 h-4 mr-2" /> Inject Chaos Monkey
        </button>
      </div>

      <StepIndicator />

      {/* ==========================================
          STEP 1: UPLOAD REQUIREMENTS & BIND REPOS
          ========================================== */}
      {step === 1 && (
        <form onSubmit={handleOrchestrationSubmit} className="bg-[#0B101A]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-800/80 space-y-8 relative overflow-hidden group animate-fadeIn z-10">
          
          {/* Segmented Control */}
          <div className="flex bg-[#131B2B] p-1.5 rounded-2xl border border-slate-800 w-fit mx-auto mb-4">
            <button
              type="button"
              onClick={() => handleModeSwitch('vision')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${mode === 'vision' ? 'bg-sky-500/10 text-sky-400 shadow-sm border border-sky-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            >
              <ImageIcon size={16} /> Whiteboard Vision
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('document')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${mode === 'document' ? 'bg-indigo-500/10 text-indigo-400 shadow-sm border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            >
              <FileText size={16} /> SRS Document
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center">
                  <TerminalSquare className="w-3.5 h-3.5 mr-1.5"/> Initiative Name
                </label>
                <button type="button" onClick={loadDemoData} className="text-[9px] text-slate-500 hover:text-sky-400 uppercase font-black tracking-widest transition-colors flex items-center gap-1"><BrainCircuit size={10}/> Load Demo Context</button>
              </div>
              <input 
                type="text" 
                placeholder={mode === 'vision' ? "e.g., Project Krishi Chakra - Whiteboard V1" : "e.g., Enterprise Platform Migration v2.0"} 
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full bg-[#131B2B] border border-slate-700/80 p-4 rounded-2xl font-bold text-white focus:border-sky-500 focus:bg-[#1A2333] outline-none text-sm transition-all shadow-inner placeholder:text-slate-600" 
                required 
              />
            </div>

            {/* Multimodal Dropzone */}
            <div className="border-2 border-dashed border-slate-700/70 p-12 text-center rounded-3xl hover:border-sky-500/50 hover:bg-sky-900/5 transition-all cursor-pointer group/dropzone relative z-10 bg-[#0D1117]/50">
              {imagePreview ? (
                <div className="flex flex-col items-center animate-fadeIn">
                  <img src={imagePreview} alt="Preview" className="max-h-56 rounded-xl border-2 border-sky-500/30 mb-4 shadow-[0_0_30px_rgba(14,165,233,0.15)] object-contain" />
                  <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20">{projectFile?.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#131B2B] rounded-full flex items-center justify-center mb-5 group-hover/dropzone:scale-110 transition-transform duration-300 border border-slate-800 shadow-inner">
                    <UploadCloud className="w-8 h-8 text-slate-500 group-hover/dropzone:text-sky-400 transition-colors" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">
                    {mode === 'vision' ? 'Upload Whiteboard Sketch or Wireframe' : 'Upload SRS Specification File'}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mb-8">
                    {mode === 'vision' ? 'Drag & Drop PNG, JPG, JPEG' : 'Drag & Drop PDF, TXT, JSON'}
                  </p>
                </div>
              )}
              <input 
                type="file" 
                accept={mode === 'vision' ? "image/*" : ".pdf,.txt,.json"}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required={!projectFile} 
              />
            </div>
          </div>

          {/* Bound Repositories */}
          <div className="pt-6 border-t border-slate-800/80 relative z-10">
            <div className="flex justify-between items-center mb-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Bind Enterprise Repositories
              </label>
              <button 
                type="button" 
                onClick={addRepositoryField} 
                className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all flex items-center gap-1"
              >
                <Plus size={12}/> Add Repository
              </button>
            </div>
            <div className="space-y-3">
              {repositories.map((repo, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[#131B2B]/80 p-3 rounded-2xl border border-slate-700/50 shadow-inner hover:border-slate-600 transition-colors">
                  <select 
                    value={repo.repoType} 
                    onChange={(e) => updateRepository(idx, 'repoType', e.target.value)} 
                    className="bg-[#0D1117] text-slate-300 text-xs font-black p-3.5 rounded-xl border border-slate-700/80 outline-none w-full sm:w-44 shrink-0 focus:border-indigo-500 transition-colors appearance-none"
                  >
                    <option value="Frontend">💻 Frontend</option>
                    <option value="Backend">⚙️ Backend</option>
                    <option value="Microservice">🧩 Microservice</option>
                    <option value="Fullstack">⚡ Fullstack</option>
                  </select>
                  <input 
                    type="url" 
                    value={repo.url} 
                    onChange={(e) => updateRepository(idx, 'url', e.target.value)} 
                    placeholder="https://source.enterprise.com/org/repo" 
                    className="flex-1 w-full bg-[#0D1117] text-white text-xs p-3.5 rounded-xl border border-slate-700/80 outline-none font-mono placeholder:text-slate-600 focus:border-indigo-500 focus:bg-[#1A2333] transition-colors" 
                  />
                  {repositories.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeRepositoryField(idx)} 
                      className="w-full sm:w-auto p-3.5 flex justify-center text-slate-500 hover:text-rose-400 bg-[#0D1117] hover:bg-rose-500/10 rounded-xl border border-slate-700/80 hover:border-rose-500/30 transition-all shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isProcessing} className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black py-4.5 rounded-2xl flex justify-center items-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] text-xs tracking-widest uppercase disabled:opacity-50 disabled:grayscale relative z-10 mt-8 btn-press">
            {isProcessing ? (
              <><Settings className="w-4 h-4 mr-2 animate-spin" /> PROVISIONING AI ENGINE...</>
            ) : (
              <><BrainCircuit className="w-4 h-4 mr-2" /> EXECUTE {mode === 'vision' ? 'VISION DECOMPOSITION' : 'DOCUMENT ANALYSIS'}</>
            )}
          </button>
        </form>
      )}

      {/* ==========================================
          STEP 2: PROCESSING STATE
          ========================================== */}
      {step === 2 && (
        <div className="p-24 text-center bg-[#0B101A]/90 backdrop-blur-2xl rounded-3xl border border-sky-500/20 shadow-[0_0_50px_rgba(14,165,233,0.1)] relative overflow-hidden animate-fadeIn z-10">
          <div className="absolute inset-0 bg-sky-900/5 animate-pulse pointer-events-none"></div>
          
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-b-transparent animate-spin-slow opacity-50"></div>
            <BrainCircuit className="w-10 h-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sky-400" />
          </div>

          <h3 className="text-3xl font-black text-white tracking-tight relative z-10 mb-3">AI Deep-Scan in Progress</h3>
          <p className="text-sky-400/80 font-mono text-xs uppercase tracking-widest relative z-10 animate-pulse">
            {mode === 'vision' 
              ? "Parsing visual nodes & extracting architectural pathways..." 
              : "Extracting semantic constraints & talent vectors..."}
          </p>
        </div>
      )}

      {/* ==========================================
          STEP 3: ALLOCATION & CONFIRMATION
          ========================================== */}
      {step === 3 && projectData && (
        <div className="space-y-8 animate-fadeIn z-10 relative">
          
          {/* AI Matched Workforce */}
          <div className="bg-[#0B101A]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-slate-800/80 shadow-xl">
            <h3 className="text-lg font-black text-white mb-6 flex items-center border-b border-slate-800/80 pb-5">
              <span className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mr-3"><Users className="w-4 h-4 text-sky-400"/></span>
              AI Shortlisted Talent Roster
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projectData.aiShortlistedTeam.length > 0 ? projectData.aiShortlistedTeam.map((emp, i) => (
                <div key={i} className="bg-[#131B2B] p-5 rounded-2xl border-t-2 border-t-sky-500 border-x border-b border-slate-800 hover:border-sky-500/50 transition-colors flex flex-col justify-between group shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-sm shadow-inner group-hover:bg-sky-900/50 group-hover:text-sky-400 transition-colors">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm">{emp.name}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{emp.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0D1117] p-3 rounded-xl border border-slate-700/50">
                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed font-mono">
                      "{emp.matchReason || emp.reason || "Recommended based on tech stack synergy."}"
                    </p>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center p-10 bg-[#131B2B] rounded-2xl text-slate-500 font-bold border border-slate-800">
                  No exact skill matches found in active directory.
                </div>
              )}
            </div>
          </div>

          {/* Task Decomposition */}
          <div className="bg-[#0B101A]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-slate-800/80 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-800/80 pb-5 gap-4">
              <h3 className="text-lg font-black text-white flex items-center">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mr-3"><CheckSquare className="w-4 h-4 text-indigo-400"/></span>
                Granular Task Allocation
              </h3>
              <span className="bg-[#131B2B] text-slate-300 text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-700 font-black shadow-inner">
                <span className="text-indigo-400">{draftedTasks.filter(t => !t.assignedTo).length}</span> Pending Assignment
              </span>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2 pb-4">
              {draftedTasks.map((task, idx) => {
                const isAssigned = task.assignedTo !== '';
                return (
                  <div key={idx} className={`p-5 md:p-6 rounded-2xl border transition-all duration-300 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${isAssigned ? 'bg-emerald-950/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-[#131B2B] border-slate-700/80 hover:border-indigo-500/40'}`}>
                    
                    <div className="flex-1 w-full">
                      <input 
                        type="text" 
                        value={task.title} 
                        onChange={(e) => {
                          const newTasks = [...draftedTasks];
                          newTasks[idx].title = e.target.value;
                          setDraftedTasks(newTasks);
                        }}
                        className={`font-black text-lg w-full bg-transparent focus:outline-none pb-1 transition-colors ${isAssigned ? 'text-emerald-50 border-b border-emerald-900/50 focus:border-emerald-500' : 'text-white border-b border-slate-700 focus:border-indigo-500'}`}
                      />
                      <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">{task.description}</p>
                      
                      <div className="flex items-center mt-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${
                          task.complexity === 'High' || task.complexity === 'Critical' ? 'bg-rose-950/30 text-rose-400 border-rose-900/50' :
                          task.complexity === 'Medium' ? 'bg-sky-950/30 text-sky-400 border-sky-900/50' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          CMPLX: {task.complexity || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`w-full lg:w-72 flex-shrink-0 p-4 rounded-xl border transition-colors ${isAssigned ? 'bg-[#0D121A] border-emerald-500/40' : 'bg-[#0D121A] border-slate-700/80'}`}>
                      <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${isAssigned ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {isAssigned ? '✓ Assignment Locked' : 'Assign Developer'}
                      </label>
                      <select 
                        className={`w-full p-3 border rounded-lg text-xs font-bold text-white outline-none transition-colors appearance-none cursor-pointer ${isAssigned ? 'bg-emerald-500/10 border-emerald-500/30 focus:border-emerald-400' : 'bg-[#131B2B] border-slate-600 focus:border-indigo-500'}`}
                        value={task.assignedTo}
                        onChange={(e) => {
                          const newTasks = [...draftedTasks];
                          newTasks[idx].assignedTo = e.target.value;
                          setDraftedTasks(newTasks);
                        }}
                      >
                        <option value="">-- Select Roster --</option>
                        {projectData.aiShortlistedTeam.map((emp, i) => (
                          <option key={i} value={emp.name}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={handleManagerConfirm} 
              className="w-full mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] btn-press text-xs tracking-widest uppercase flex justify-center items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5"/> LOCK ALLOCATIONS & DISPATCH WORKSPACE
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          STEP 4: SUCCESS
          ========================================== */}
      {step === 4 && (
        <div className="p-20 text-center bg-[#0B101A]/90 backdrop-blur-2xl rounded-3xl border border-emerald-500/30 shadow-[0_0_80px_rgba(16,185,129,0.15)] relative overflow-hidden animate-fadeIn z-10">
          <div className="absolute inset-0 bg-emerald-900/10 pointer-events-none"></div>
          
          <div className="w-24 h-24 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/50 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          
          <h3 className="text-4xl font-black text-white tracking-tight relative z-10 mb-4">Workspace Dispatched</h3>
          <p className="font-medium text-slate-400 text-sm relative z-10 max-w-lg mx-auto leading-relaxed">
            The project architecture and source repositories are locked. Execution teams have been notified via the Unified Workspace.
          </p>
          
          <button 
            onClick={() => {
              setStep(1);
              setProjectTitle('');
              setProjectFile(null);
              setImagePreview(null);
              setRepositories([{ repoType: 'Frontend', url: '' }, { repoType: 'Backend', url: '' }]);
            }}
            className="mt-10 bg-[#131B2B] border border-slate-700 text-slate-300 font-black px-8 py-3.5 rounded-xl hover:border-sky-500 hover:text-white transition-all relative z-10 btn-press text-[10px] tracking-widest uppercase shadow-sm"
          >
            Orchestrate New Initiative
          </button>
        </div>
      )}

    </div>
  );
}