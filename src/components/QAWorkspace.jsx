import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import '../App.css';
import API from '../services/api';

// ==========================================
// 🛡️ CRASH PREVENTION: Safe Icon Wrapper
// ==========================================
const SafeIcon = ({ name, fallback = 'Circle', ...props }) => {
    const IconComponent = Icons[name] || Icons[fallback] || Icons.Circle;
    return IconComponent ? <IconComponent {...props} /> : <span className="inline-block w-4 h-4 bg-slate-500 rounded-full"></span>;
};

export default function QAWorkspace() {
  const [tasks, setTasks] = useState([
    { 
        id: 'PR-1042', 
        title: 'Implement OAuth JWT Handler & Secure Cookies', 
        developer: 'Alex Chen', 
        status: 'Awaiting QA', 
        risk: 'High',
        codeSnippet: 'const generateToken = (user) => {\n  const token = jwt.sign({ id: user._id }, process.env.SECRET, { expiresIn: "1h" });\n  res.cookie("auth_token", token, {\n    httpOnly: true,\n    secure: process.env.NODE_ENV === "production",\n    sameSite: "Strict"\n  });\n  return token;\n};',
        aiScan: 'Passed. HttpOnly and SameSite flags are correctly configured to prevent XSS.'
    },
    { 
        id: 'PR-1045', 
        title: 'Resolve MongoDB Race Condition in Transaction', 
        developer: 'Sarah Connor', 
        status: 'Awaiting QA', 
        risk: 'Critical',
        codeSnippet: 'const session = await mongoose.startSession();\nsession.startTransaction();\ntry {\n  await Order.create([{...data}], { session });\n  await session.commitTransaction();\n} catch (err) {\n  // FIXME: Missing rollback handler\n  console.error(err);\n}',
        aiScan: 'Warning. Missing `await session.abortTransaction()` in the catch block. High risk of database locking.'
    }
  ]);

  const [processingId, setProcessingId] = useState(null);

  // Simulated 1.5s server process for "Wow Factor"
  const handleStatusChange = (id, newStatus) => {
    setProcessingId(id);
    setTimeout(() => {
        setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
        setProcessingId(null);
    }, 1500);
  };

  const pendingCount = tasks.filter(t => t.status === 'Awaiting QA').length;

  return (
    <div className="min-h-screen bg-[#05080F] font-sans text-slate-200 relative overflow-hidden py-10 px-4 sm:px-8">
      
      {/* 🌌 AMBIENT BACKGROUND GLOWS */}
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-rose-600/10 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full mix-blend-screen filter blur-[150px] opacity-40 pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8 animate-fadeIn">
        
        {/* 🚀 HEADER SECTION */}
        <div className="bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-white flex items-center gap-4 tracking-tight">
                <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(225,29,72,0.2)]">
                    <SafeIcon name="ShieldAlert" className="text-rose-400 w-6 h-6" />
                </div>
                Zero-Trust QA Command Center
            </h2>
            <p className="text-slate-400 font-medium text-sm mt-3 ml-1">Validate Developer Pull Requests, run security audits, and maintain system integrity.</p>
          </div>
          
          <div className="flex gap-4">
              <div className="bg-[#131B2B] border border-slate-700/80 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-inner">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending Reviews</p>
                      <p className="text-2xl font-black text-white leading-none mt-1">{pendingCount}</p>
                  </div>
                  {pendingCount > 0 && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>}
              </div>
          </div>
        </div>

        {/* 📋 TASK FEED */}
        <div className="space-y-6">
          {tasks.length === 0 ? (
              <div className="bg-[#0B101A]/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-16 text-center shadow-2xl">
                  <SafeIcon name="ShieldCheck" size={64} className="mx-auto text-emerald-500/50 mb-6" />
                  <h3 className="text-2xl font-black text-white">All Clear</h3>
                  <p className="text-slate-400 mt-2">No pending Pull Requests require QA validation at this time.</p>
              </div>
          ) : (
            tasks.map((task) => {
              const isPending = task.status === 'Awaiting QA';
              const isPassed = task.status.includes('Passed');
              const isFailed = task.status.includes('Reverted');
              const isProcessing = processingId === task.id;

              return (
                <div key={task.id} className={`bg-[#0B101A]/90 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-500 relative overflow-hidden group border ${
                    isPassed ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.05)]' : 
                    isFailed ? 'border-rose-500/30 shadow-[0_0_30px_rgba(225,29,72,0.05)]' : 
                    'border-slate-800/80 hover:border-sky-500/30'
                }`}>
                  
                  {/* Subtle highlight based on status */}
                  {isPassed && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>}
                  {isFailed && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-400"></div>}
                  {isPending && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 to-slate-800"></div>}

                  <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                    
                    {/* Left: Task Info & Code */}
                    <div className="flex-1 w-full space-y-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black bg-[#131B2B] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 tracking-widest shadow-inner flex items-center gap-1.5">
                            <SafeIcon name="GitPullRequest" size={12} className="text-sky-400"/> {task.id}
                        </span>
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border flex items-center gap-1.5 ${
                            task.risk === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                            <SafeIcon name="AlertTriangle" size={12}/> Risk: {task.risk}
                        </span>
                        <span className={`ml-auto text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border flex items-center gap-1.5 ${
                            isPassed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            isFailed ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                            'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                            {isProcessing ? <><SafeIcon name="Loader2" size={12} className="animate-spin"/> Scanning...</> : task.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white">{task.title}</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-2">
                            <span className="w-5 h-5 bg-slate-800 rounded-md flex items-center justify-center text-[10px] font-black text-white">{task.developer.charAt(0)}</span>
                            Committed by {task.developer}
                        </p>
                      </div>

                      {/* Code Terminal */}
                      <div className="bg-[#05080F] border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner">
                        <div className="bg-[#0D121F] px-4 py-2 flex items-center gap-2 border-b border-slate-800/80">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 ml-2">source_diff.js</span>
                        </div>
                        <div className="p-4 overflow-x-auto custom-scrollbar">
                            <pre className="font-mono text-xs leading-relaxed text-sky-200">
                                <code>{task.codeSnippet}</code>
                            </pre>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions & AI Scan */}
                    <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
                        
                        {/* AI Security Pre-Scan Box */}
                        <div className={`p-5 rounded-2xl border ${task.risk === 'Critical' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-sky-500/5 border-sky-500/20'} shadow-inner`}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                                <SafeIcon name="BrainCircuit" size={14} className={task.risk === 'Critical' ? 'text-amber-400' : 'text-sky-400'}/>
                                AI Security Pre-Scan
                            </h4>
                            <p className={`text-xs font-medium leading-relaxed ${task.risk === 'Critical' ? 'text-amber-200/80' : 'text-sky-200/80'}`}>
                                "{task.aiScan}"
                            </p>
                        </div>

                        {/* Action Buttons */}
                        {isPending && (
                            <div className="flex flex-col gap-3 mt-auto pt-2">
                                <button 
                                    onClick={() => handleStatusChange(task.id, 'Passed & Merged')}
                                    disabled={isProcessing}
                                    className="w-full bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500 text-[11px] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] disabled:opacity-50 disabled:grayscale btn-press"
                                >
                                    {isProcessing ? <><SafeIcon name="Loader2" size={16} className="animate-spin"/> Authenticating...</> : <><SafeIcon name="CheckCircle2" size={16} /> Approve & Merge</>}
                                </button>
                                
                                <button 
                                    onClick={() => handleStatusChange(task.id, 'Reverted to Developer')}
                                    disabled={isProcessing}
                                    className="w-full bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-500 text-[11px] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(225,29,72,0.1)] disabled:opacity-50 disabled:grayscale btn-press"
                                >
                                    <SafeIcon name="XCircle" size={16} /> Fail & Revert
                                </button>
                            </div>
                        )}

                        {isPassed && (
                            <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center justify-center gap-2 mt-auto text-[11px] font-black uppercase tracking-widest">
                                <SafeIcon name="ShieldCheck" size={16} /> Verified Secure
                            </div>
                        )}

                        {isFailed && (
                            <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center justify-center gap-2 mt-auto text-[11px] font-black uppercase tracking-widest">
                                <SafeIcon name="RotateCcw" size={16} /> Sent to Developer
                            </div>
                        )}

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}  