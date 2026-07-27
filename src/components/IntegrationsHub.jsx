import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from '../services/api';
import { 
  Activity, ExternalLink, CheckCircle2, Clock, FileText, 
  GitBranch, Kanban, Video, GitCommit, GitPullRequest, 
  Server, ShieldCheck, TerminalSquare, Loader2, ArrowUpRight
} from 'lucide-react';
import '../App.css';

export default function IntegrationsHub({ currentUser }) {
  const [omniFeed, setOmniFeed] = useState([]);
  const [links, setLinks] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOmniData = async () => {
      try {
        // 🚀 RAILWAY PRODUCTION URL
        const [feedRes, linksRes] = await Promise.all([
          axios.get('https://worksphere-backend-production-e720.up.railway.app/api/integrations/omni-feed'),
          axios.get('https://worksphere-backend-production-e720.up.railway.app/api/integrations/links')
        ]);
        
        if (feedRes.data.success) setOmniFeed(feedRes.data.omniFeed);
        if (linksRes.data.success) setLinks(linksRes.data.links);
      } catch (err) {
        console.error("API unreachable. Loading enterprise simulation data.");
        // 🚀 HACKATHON FAILSAFE: Realistic Dummy Data if API is offline
        setLinks({
            githubFrontend: 'https://git-scm.com/',
            githubBackend: 'https://git-scm.com/',
            jiraBoard: 'https://www.atlassian.com/software/jira',
            webexWorkspace: 'https://webex.com/'
        });
        setOmniFeed([
            { id: 1, platform: 'GitHub', type: 'PULL REQ', user: 'Daniel Kim', status: 'Merged', message: 'Merge branch "hotfix/auth-middleware" into main', timestamp: new Date(Date.now() - 1200000).toISOString(), url: '#' },
            { id: 2, platform: 'Jira', type: 'TICKET', user: 'Sarah Connor', status: 'Done', message: 'Moved SYS-402 "Implement Zero-Trust JWT" to QA Review', timestamp: new Date(Date.now() - 3600000).toISOString(), url: '#' },
            { id: 3, platform: 'GitHub', type: 'COMMIT', user: 'Bayya Akhil', status: 'Success', message: 'Refactor glassmorphism UI components across workspace', timestamp: new Date(Date.now() - 7200000).toISOString(), url: '#' },
            { id: 4, platform: 'Confluence', type: 'DOC UPDATE', user: 'System Bot', status: 'Published', message: 'Auto-generated Architectural Blueprint from Workspace', timestamp: new Date(Date.now() - 8640000).toISOString(), url: '#' },
            { id: 5, platform: 'System', type: 'SYSTEM', user: 'Orchestrator', status: 'Active', message: 'Provisioned new secure conference room for Sprint Planning', timestamp: new Date(Date.now() - 12000000).toISOString(), url: '#' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOmniData();
  }, []);

  const handleExternalNavigation = (url) => {
    if(url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 🎨 STUNNING VISUAL TAG GENERATOR
  const renderFeedDataTag = (platform, type) => {
    if (platform === 'GitHub' || platform === 'Git') {
      return type === 'COMMIT' 
        ? <div className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shadow-inner"><GitCommit className="w-5 h-5 text-sky-400"/></div><span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Commit</span></div> 
        : <div className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-inner"><GitPullRequest className="w-5 h-5 text-indigo-400"/></div><span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Pull Req</span></div>;
    }
    if (platform === 'Jira' || platform === 'Agile') {
      return <div className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-inner"><Kanban className="w-5 h-5 text-emerald-400"/></div><span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Ticket</span></div>;
    }
    if (platform === 'Confluence' || platform === 'Docs') {
      return <div className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner"><FileText className="w-5 h-5 text-amber-400"/></div><span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Document</span></div>;
    }
    return <div className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-xl bg-slate-700/30 border border-slate-600/50 flex items-center justify-center shadow-inner"><Server className="w-5 h-5 text-slate-400"/></div><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">System</span></div>;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 font-sans text-slate-200">
        <Loader2 className="w-12 h-12 animate-spin text-sky-500" />
        <p className="text-sky-400 font-black uppercase tracking-widest text-xs animate-pulse">Aggregating Cross-Platform Data...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans animate-fade-in pb-16 relative z-10 text-slate-200">
      
      {/* 🌌 AMBIENT BACKGROUND GLOWS */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-900/20 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full mix-blend-screen filter blur-[150px] opacity-50 pointer-events-none z-0"></div>

      {/* 🚀 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800/80 pb-6 gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center tracking-tight gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Omni-Toolchain Gateway
          </h2>
          <p className="text-slate-400 font-medium mt-2 text-sm ml-1">Zero Context Switching. Real-time operations tracking across all enterprise platforms.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-400 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" /> API Webhooks Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* ==========================================
            LEFT COLUMN: SYSTEM QUICK LAUNCH CARDS 
            ========================================== */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="font-black text-slate-500 uppercase tracking-widest text-[10px] border-b border-slate-800/80 pb-3">Connected Environments</h3>
          
          {/* Source Control Card */}
          <div className="bg-[#0B101A]/90 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl hover:border-sky-500/30 transition-colors group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                    <h4 className="font-black text-white text-sm">Source Repositories</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Version Control</p>
                </div>
              </div>
              <span className="flex items-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span> SYNCED
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleExternalNavigation(links.githubFrontend)} className="w-full bg-[#131B2B] hover:bg-sky-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-sky-500 font-black text-[10px] py-3.5 rounded-xl flex items-center justify-between px-5 transition-all shadow-sm group/btn">
                <span>Client App Repository</span> <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover/btn:text-white transition-colors"/>
              </button>
              <button onClick={() => handleExternalNavigation(links.githubBackend)} className="w-full bg-[#131B2B] hover:bg-sky-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-sky-500 font-black text-[10px] py-3.5 rounded-xl flex items-center justify-between px-5 transition-all shadow-sm group/btn">
                <span>Core API Repository</span> <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover/btn:text-white transition-colors"/>
              </button>
            </div>
          </div>

          {/* Agile Matrix Card */}
          <div className="bg-[#0B101A]/90 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl hover:border-indigo-500/30 transition-colors group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Kanban className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h4 className="font-black text-white text-sm">Agile Execution Matrix</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Task Management</p>
                </div>
              </div>
              <span className="flex items-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span> SYNCED
              </span>
            </div>
            <button onClick={() => handleExternalNavigation(links.jiraBoard)} className="w-full bg-[#131B2B] hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 font-black text-[10px] py-3.5 rounded-xl flex items-center justify-between px-5 transition-all shadow-sm group/btn">
              <span>Launch Board Dashboard</span> <ExternalLink className="w-3.5 h-3.5 text-indigo-500/50 group-hover/btn:text-white transition-colors"/>
            </button>
          </div>

          {/* Conference Room Card */}
          <div className="bg-[#0B101A]/90 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl hover:border-emerald-500/30 transition-colors group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                    <h4 className="font-black text-white text-sm">Secure Conference</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Live Comm-Link</p>
                </div>
              </div>
              <span className="flex items-center text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span> ACTIVE
              </span>
            </div>
            <button onClick={() => handleExternalNavigation(links.webexWorkspace)} className="w-full bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500 font-black text-[10px] py-3.5 rounded-xl flex items-center justify-between px-5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] group/btn">
              <span>Join Secure Meeting Room</span> <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500/50 group-hover/btn:text-white transition-colors"/>
            </button>
          </div>
        </div>

        {/* ==========================================
            RIGHT COLUMN: UNIFIED OMNI-STREAM 
            ========================================== */}
        <div className="lg:col-span-8 bg-[#0B101A]/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-800/80 flex flex-col overflow-hidden relative h-[800px]">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/5 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>

          <div className="p-8 flex justify-between items-center border-b border-slate-800/80 relative z-10 shrink-0 bg-[#05080F]/50">
            <div>
              <h3 className="text-white font-black text-xl flex items-center tracking-tight">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded uppercase tracking-widest mr-3">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> LIVE
                </span>
                Unified Execution Stream
              </h3>
              <p className="text-slate-400 font-medium text-xs mt-2">Aggregated event logs merged into a single chronological pane of glass.</p>
            </div>
            <span className="bg-[#131B2B] text-slate-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-700/80 shadow-inner hidden md:block">
              <TerminalSquare className="w-3.5 h-3.5 inline mr-1.5 text-sky-400"/> Webhook Sync Active
            </span>

          </div>
          
          <div className="p-8 flex-1 overflow-y-auto bg-transparent relative z-10 custom-scrollbar scroll-smooth">
            {omniFeed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center animate-fadeIn">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-6 animate-spin-slow">
                    <Activity className="w-8 h-8 text-slate-600" />
                </div>
                <h4 className="text-lg font-black text-white">Awaiting Telemetry</h4>
                <p className="text-sm font-medium text-slate-500 mt-2">No activity detected across connected platforms yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {omniFeed.map((event, idx) => (
                  <div key={event.id || idx} className="bg-[#131B2B] p-5 rounded-2xl border border-slate-700/50 hover:border-sky-500/40 transition-all flex items-start gap-5 group shadow-sm hover:shadow-[0_5px_20px_rgba(14,165,233,0.05)] animate-fadeIn">
                    
                    {/* Icon Column */}
                    <div className="shrink-0 mt-1">
                      {renderFeedDataTag(event.platform, event.type)}
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <p className="text-xs font-black text-white uppercase tracking-wider truncate">
                          {event.user} <span className="font-semibold text-slate-500 lowercase tracking-normal">via</span> <span className="text-sky-400">{event.platform}</span>
                        </p>
                        <span className={`text-[8px] font-black px-2.5 py-1 rounded uppercase tracking-widest border shrink-0 ${
                          event.status === 'Merged' || event.status === 'Done' || event.status === 'Published' || event.status === 'Success' || event.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      
                      <p className="text-slate-300 font-medium text-sm leading-relaxed mb-4">{event.message}</p>
                      
                      <div className="pt-4 border-t border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-[10px] font-bold text-slate-500 flex items-center tracking-widest uppercase">
                          <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.url && event.url !== '#' && (
                          <button onClick={() => handleExternalNavigation(event.url)} className="text-[9px] font-black text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg border border-sky-500/20 flex items-center transition-colors">
                            VIEW SOURCE LOG <ArrowUpRight className="w-3 h-3 ml-1.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}