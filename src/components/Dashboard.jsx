import React, { useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  UploadCloud, BrainCircuit, Users, AlertTriangle, CheckCircle2, 
  CheckSquare, Settings, LayoutDashboard, ChevronRight, FileText, 
  Plus, Trash2, Image as ImageIcon
} from 'lucide-react';
import '../App.css';

const socket = io('http://localhost:5000');

export default function Dashboard({ currentUser }) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('vision'); // 'vision' (Whiteboard Image) or 'document' (SRS Text)
  
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

        const res = await axios.post('http://localhost:5000/api/orchestration/vision-orchestrate', formData, {
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
        const res = await axios.post('http://localhost:5000/api/analysis/analyze-doc', payload);
        
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

      await axios.post(`http://localhost:5000/api/orchestration/dispatch`, {
        title: projectData.title,
        aiShortlistedTeam: projectData.aiShortlistedTeam,
        finalizedTasks: draftedTasks,
        repositories: validRepos
      });

      // 📢 Send Socket Notification to Global Channel
      socket.emit('send_message', {
        senderId: currentUser?._id || 'SYS',
        text: `📢 INITIATIVE DISPATCHED: The "${projectData.title}" project has been approved by ${currentUser?.name || 'Management'}. Tasks and ${validRepos.length} Repositories have been allocated. Please check your Unified Execution Workspace.`,
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

  // UI Component: Progress Tracker
  const StepIndicator = () => (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 mb-8 bg-[#0f172a] p-4 rounded-xl border border-slate-800">
      <div className={`px-3 py-1 rounded-lg font-black text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>1. INPUT</div>
      <ChevronRight className="w-4 h-4 text-slate-600 hidden md:block" />
      <div className={`px-3 py-1 rounded-lg font-black text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>2. AI DECOMPOSITION</div>
      <ChevronRight className="w-4 h-4 text-slate-600 hidden md:block" />
      <div className={`px-3 py-1 rounded-lg font-black text-xs ${step >= 3 ? 'bg-amber-500 text-amber-950' : 'bg-slate-800 text-slate-500'}`}>3. ALLOCATION</div>
      <ChevronRight className="w-4 h-4 text-slate-600 hidden md:block" />
      <div className={`px-3 py-1 rounded-lg font-black text-xs ${step === 4 ? 'bg-emerald-500 text-emerald-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800 text-slate-500'}`}>4. DISPATCH</div>
    </div>
  );

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-10 max-w-7xl mx-auto text-slate-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-blue-900/50 pb-5 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center tracking-tight">
            <LayoutDashboard className="w-8 h-8 mr-3 text-blue-500" /> AI Project Orchestration
          </h2>
          <p className="text-slate-400 font-bold mt-1 text-sm">Multimodal "Vibe Coding" & Automated Initiative Dispatch.</p>
        </div>
        <button 
          onClick={triggerChaosMonkey}
          className="bg-red-950/30 border border-red-500/50 text-red-500 font-black px-4 py-2.5 rounded-xl flex items-center hover:bg-red-600 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] btn-press"
        >
          <AlertTriangle className="w-4 h-4 mr-2" /> CHAOS MONKEY
        </button>
      </div>

      <StepIndicator />

      {/* STEP 1: Upload Requirements */}
      {step === 1 && (
        <form onSubmit={handleOrchestrationSubmit} className="bg-[#0a0f1a] p-8 rounded-2xl shadow-xl border border-slate-800 space-y-6 relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none transition-opacity duration-700"></div>
          
          <div className="flex gap-4 border-b border-slate-800 pb-4 relative z-10">
            <button
              type="button"
              onClick={() => handleModeSwitch('vision')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${mode === 'vision' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ImageIcon size={16} /> Whiteboard Vision
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('document')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${mode === 'document' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FileText size={16} /> Document / SRS
            </button>
          </div>

          <div className="space-y-3 relative z-10">
            <label className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center">
              <FileText className="w-4 h-4 mr-2"/> Initiative Name
            </label>
            <input 
              type="text" 
              placeholder={mode === 'vision' ? "e.g., Krishi Chakra AgTech Platform" : "e.g., Enterprise Platform Migration v2.0"} 
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 p-4 rounded-xl font-bold text-white focus:border-blue-500 outline-none text-lg transition-all shadow-inner placeholder:text-slate-600" 
              required 
            />
          </div>

          {/* Multimodal Vision Dropzone */}
          <div className="border-2 border-dashed border-slate-700/70 p-12 text-center rounded-2xl hover:border-sky-500 hover:bg-sky-900/10 transition-all cursor-pointer group/dropzone relative z-10">
            {imagePreview ? (
              <div className="flex flex-col items-center">
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl border border-sky-500/50 mb-4 shadow-lg" />
                <p className="text-xs text-sky-400 font-bold uppercase">{projectFile?.name}</p>
              </div>
            ) : (
              <>
                <UploadCloud className="w-16 h-16 mx-auto text-slate-600 group-hover/dropzone:text-sky-500 mb-4 transition-colors" />
                <h3 className="text-xl font-black text-white mb-1 tracking-tight">
                  {mode === 'vision' ? 'Drop Whiteboard Photo or Wireframe Sketch' : 'Upload SRS Specification File'}
                </h3>
                <p className="text-xs font-bold text-slate-500 mb-6">
                  {mode === 'vision' ? 'Supports PNG, JPG, JPEG' : 'Supports PDF, TXT, JSON'}
                </p>
              </>
            )}
            <input 
              type="file" 
              accept={mode === 'vision' ? "image/*" : ".pdf,.txt,.json"}
              onChange={handleFileChange}
              className="text-xs font-bold text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer transition-all"
              required 
            />
          </div>

          {/* 🚀 Plain Text Repositories UI (No GitHub Icons) */}
          <div className="pt-4 border-t border-slate-800 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                Bound Enterprise Repositories
              </label>
              <button 
                type="button" 
                onClick={addRepositoryField} 
                className="text-[10px] font-black uppercase text-sky-400 hover:text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20 transition-all flex items-center gap-1"
              >
                <Plus size={14}/> Add Repo Link
              </button>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {repositories.map((repo, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[#131B2B] p-3 rounded-xl border border-slate-800">
                  <select 
                    value={repo.repoType} 
                    onChange={(e) => updateRepository(idx, 'repoType', e.target.value)} 
                    className="bg-[#0D1117] text-slate-300 text-xs font-bold p-2.5 rounded-lg border border-slate-700 outline-none w-full sm:w-40 shrink-0"
                  >
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Fullstack">Fullstack</option>
                    <option value="Microservice">Microservice</option>
                    <option value="Other">Other</option>
                  </select>
                  <input 
                    type="url" 
                    value={repo.url} 
                    onChange={(e) => updateRepository(idx, 'url', e.target.value)} 
                    placeholder="https://repo-url.com/..." 
                    className="flex-1 w-full bg-[#0D1117] text-white text-xs p-2.5 rounded-lg border border-slate-700 outline-none font-mono placeholder:text-slate-600" 
                  />
                  {repositories.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeRepositoryField(idx)} 
                      className="w-full sm:w-auto p-2.5 flex justify-center text-slate-500 hover:text-rose-400 bg-[#0D1117] hover:bg-rose-500/10 rounded-lg border border-slate-700 hover:border-rose-500/30 transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl flex justify-center items-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] text-xs tracking-widest uppercase disabled:opacity-50 relative z-10 mt-6 btn-press">
            <BrainCircuit className="w-5 h-5 mr-3" />
            {isProcessing ? 'PROCESSING AI ORCHESTRATION...' : `RUN ${mode === 'vision' ? 'VISION DECOMPOSITION' : 'DOCUMENT ANALYSIS'}`}
          </button>
        </form>
      )}

      {/* STEP 2: Processing */}
      {step === 2 && (
        <div className="p-24 text-center bg-[#0a0f1a] rounded-2xl border border-blue-900/50 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-900/10 animate-pulse pointer-events-none"></div>
          <Settings className="w-20 h-20 mx-auto text-blue-500 animate-spin mb-6 relative z-10" />
          <h3 className="text-3xl font-black text-white tracking-tight relative z-10">Analyzing Input Data...</h3>
          <p className="text-slate-400 font-bold mt-2 text-sm relative z-10">
            {mode === 'vision' 
              ? "Gemini Vision is parsing whiteboard nodes, UI layouts, and schema connections." 
              : "Gemini is extracting architectural requirements and matching technical talent."}
          </p>
        </div>
      )}

      {/* STEP 3: Task & Team Allocation */}
      {step === 3 && projectData && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="bg-[#0a0f1a] p-8 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center border-b border-slate-800 pb-4">
              <Users className="mr-3 text-sky-400"/> AI Shortlisted Talent Pool
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {projectData.aiShortlistedTeam.length > 0 ? projectData.aiShortlistedTeam.map((emp, i) => (
                <div key={i} className="bg-[#0f172a] p-5 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-colors flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-black text-white text-lg">{emp.name}</h4>
                    <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-800/50 px-2.5 py-1 rounded-md font-black tracking-widest uppercase">{emp.role}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 leading-relaxed bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 italic">
                    "{emp.matchReason || emp.reason || "Recommended based on tech stack synergy and historical metrics."}"
                  </p>
                </div>
              )) : (
                <div className="col-span-2 text-center p-8 bg-slate-900/50 rounded-xl text-slate-500 font-bold border border-slate-800">
                  No exact skill matches found in current active database.
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0a0f1a] p-8 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-800 pb-4 gap-4">
              <h3 className="text-xl font-black text-white flex items-center">
                <CheckSquare className="mr-3 text-amber-500"/> Manager Task Allocation
              </h3>
              <span className="bg-amber-950/30 text-amber-500 text-xs px-3 py-1 rounded-full border border-amber-900/50 font-bold">
                {draftedTasks.filter(t => !t.assignedTo).length} Tasks Need Assignment
              </span>
            </div>
            
            <div className="space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {draftedTasks.map((task, idx) => {
                const isAssigned = task.assignedTo !== '';
                return (
                  <div key={idx} className={`p-6 rounded-xl border-2 transition-colors flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 ${isAssigned ? 'bg-[#0f172a] border-emerald-900/30' : 'bg-slate-900/80 border-amber-900/50 border-dashed'}`}>
                    
                    <div className="flex-1 w-full">
                      <input 
                        type="text" 
                        value={task.title} 
                        onChange={(e) => {
                          const newTasks = [...draftedTasks];
                          newTasks[idx].title = e.target.value;
                          setDraftedTasks(newTasks);
                        }}
                        className="font-black text-xl text-white w-full bg-transparent border-b border-slate-700 focus:outline-none focus:border-amber-500 pb-2 transition-colors"
                      />
                      <p className="text-sm font-semibold text-slate-400 mt-3">{task.description}</p>
                      
                      <div className="flex items-center mt-4 space-x-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                          task.complexity === 'High' || task.complexity === 'Critical' ? 'bg-red-950/30 text-red-500 border-red-900/50' :
                          task.complexity === 'Medium' ? 'bg-blue-950/30 text-blue-400 border-blue-900/50' :
                          'bg-emerald-950/30 text-emerald-500 border-emerald-900/50'
                        }`}>
                          CMPLX: {task.complexity || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`w-full xl:w-80 flex-shrink-0 p-5 rounded-xl border ${isAssigned ? 'bg-slate-950 border-emerald-900/50' : 'bg-amber-950/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]'}`}>
                      <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isAssigned ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isAssigned ? '✓ Assigned To:' : '⚠️ Action Required:'}
                      </label>
                      <select 
                        className={`w-full p-3 border-2 rounded-lg font-bold text-white outline-none transition-colors appearance-none cursor-pointer ${isAssigned ? 'bg-slate-900 border-slate-700 focus:border-emerald-500' : 'bg-amber-950/20 border-amber-600/50 focus:border-amber-500'}`}
                        value={task.assignedTo}
                        onChange={(e) => {
                          const newTasks = [...draftedTasks];
                          newTasks[idx].assignedTo = e.target.value;
                          setDraftedTasks(newTasks);
                        }}
                      >
                        <option value="">-- Select Team Member --</option>
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
              className="w-full mt-8 bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] btn-press text-sm tracking-widest flex justify-center items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5"/> CONFIRM ALLOCATIONS & DISPATCH TO WORKSPACE
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Success */}
      {step === 4 && (
        <div className="p-24 text-center bg-[#0a0f1a] rounded-2xl border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-emerald-900/5 pointer-events-none"></div>
          <CheckCircle2 className="w-24 h-24 mx-auto text-emerald-500 mb-8 relative z-10" />
          <h3 className="text-4xl font-black text-white tracking-tight relative z-10">Initiative Dispatched</h3>
          <p className="font-bold text-slate-400 mt-4 text-lg relative z-10 max-w-2xl mx-auto">
            The project and bound repositories have been successfully orchestrated. Developers have been instantly notified.
          </p>
          <button 
            onClick={() => {
              setStep(1);
              setProjectTitle('');
              setProjectFile(null);
              setImagePreview(null);
              setRepositories([{ repoType: 'Frontend', url: '' }, { repoType: 'Backend', url: '' }]);
            }}
            className="mt-12 bg-slate-900 border border-slate-700 text-white font-black px-10 py-4 rounded-xl hover:border-emerald-500 hover:bg-slate-800 transition-all relative z-10 btn-press text-sm tracking-widest uppercase"
          >
            Orchestrate New Initiative
          </button>
        </div>
      )}
    </div>
  );
}