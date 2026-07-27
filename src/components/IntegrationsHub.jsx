import React, { useState, useEffect } from 'react';
import axios from 'axios';
// Removed problematic icons and kept only the verified working ones
import { Video, Activity, ExternalLink, CheckCircle2, Clock, FileText } from 'lucide-react';
import '../App.css';

export default function IntegrationsHub({ currentUser }) {
  const [omniFeed, setOmniFeed] = useState([]);
  const [links, setLinks] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOmniData = async () => {
      try {
        const [feedRes, linksRes] = await Promise.all([
          axios.get('http://localhost:5000/api/integrations/omni-feed'),
          axios.get('http://localhost:5000/api/integrations/links')
        ]);
        
        if (feedRes.data.success) setOmniFeed(feedRes.data.omniFeed);
        if (linksRes.data.success) setLinks(linksRes.data.links);
      } catch (err) {
        console.error("Failed to fetch Omni-Feed data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOmniData();
  }, []);

  const handleExternalNavigation = (url) => {
    if(url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  // UI Helper: Replaced crashing icons with premium text-based data tags
  const renderFeedDataTag = (platform, type) => {
    if (platform === 'GitHub') {
      return type === 'COMMIT' 
        ? <span className="text-[10px] font-black text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800">COMMIT</span> 
        : <span className="text-[10px] font-black text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded border border-indigo-800">PULL REQ</span>;
    }
    if (platform === 'Jira') {
      return <span className="text-[10px] font-black text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800">TICKET</span>;
    }
    if (platform === 'Confluence') {
      return <span className="text-[10px] font-black text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded border border-emerald-800">DOC UPDATE</span>;
    }
    return <span className="text-[10px] font-black text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">SYSTEM</span>;
  };

  if (isLoading) return <div className="p-8 font-black text-slate-500 animate-pulse">Aggregating Cross-Platform Data...</div>;

  return (
    <div className="space-y-8 font-sans h-full flex flex-col animate-fade-in pb-10">
      
      {/* Dark Theme Header */}
      <div className="border-b border-blue-900/50 pb-5">
        <h2 className="text-3xl font-black text-white flex items-center tracking-tight">
          <Activity className="w-8 h-8 mr-3 text-blue-500" /> Omni-Toolchain Gateway
        </h2>
        <p className="text-slate-400 font-bold mt-2 text-lg">Zero Context Switching. Real-time operations tracking across all enterprise platforms.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-grow">
        
        {/* LEFT COLUMN: System Health & Quick Launch (Charcoal Cards) */}
        <div className="xl:col-span-1 space-y-6">
          <h3 className="font-black text-slate-300 uppercase tracking-widest text-sm border-b border-slate-800 pb-3">Connected Platforms</h3>
          
          {/* GitHub Card */}
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-lg interactive-card group">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-black text-slate-300 tracking-widest uppercase">
                  GitHub
                </div>
              </div>
              <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-2 py-1 rounded tracking-wider">
                <CheckCircle2 className="w-3 h-3 mr-1"/> API SYNCED
              </span>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => handleExternalNavigation(links.githubFrontend)} className="flex-1 bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 font-black text-[11px] py-3 rounded-xl flex items-center justify-center transition-all shadow-sm">
                CLIENT REPO <ExternalLink className="w-3 h-3 ml-1.5"/>
              </button>
              <button onClick={() => handleExternalNavigation(links.githubBackend)} className="flex-1 bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 font-black text-[11px] py-3 rounded-xl flex items-center justify-center transition-all shadow-sm">
                API REPO <ExternalLink className="w-3 h-3 ml-1.5"/>
              </button>
            </div>
          </div>

          {/* Jira Card */}
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-lg interactive-card group">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1.5 bg-blue-900/20 border border-blue-800/50 rounded-lg text-xs font-black text-blue-400 tracking-widest uppercase">
                  Atlassian Jira
                </div>
              </div>
              <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-2 py-1 rounded tracking-wider">
                <CheckCircle2 className="w-3 h-3 mr-1"/> API SYNCED
              </span>
            </div>
            <button onClick={() => handleExternalNavigation(links.jiraBoard)} className="w-full mt-6 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 font-black text-xs py-3 rounded-xl flex items-center justify-center transition-all shadow-sm btn-press">
              LAUNCH AGILE BOARD <ExternalLink className="w-3 h-3 ml-2"/>
            </button>
          </div>

          {/* Webex Card */}
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-lg interactive-card group">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-900/20 border border-indigo-800/50 rounded-lg text-indigo-400">
                  <Video className="w-5 h-5" />
                </div>
                <h4 className="font-black text-white text-lg">Webex Sync</h4>
              </div>
              <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-2 py-1 rounded tracking-wider">
                <CheckCircle2 className="w-3 h-3 mr-1"/> ACTIVE
              </span>
            </div>
            <button onClick={() => handleExternalNavigation(links.webexWorkspace)} className="w-full mt-6 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 font-black text-xs py-3 rounded-xl flex items-center justify-center transition-all shadow-sm btn-press">
              JOIN COMM-CHANNEL <ExternalLink className="w-3 h-3 ml-2"/>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: The Unified Omni-Stream (Deep Blue / Charcoal) */}
        <div className="xl:col-span-2 bg-[#0a0f1a] rounded-2xl shadow-xl border border-slate-800 flex flex-col overflow-hidden relative">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none"></div>

          <div className="bg-[#0f172a] p-6 flex justify-between items-center border-b border-slate-800 relative z-10">
            <div>
              <h3 className="text-white font-black text-lg flex items-center">
                <span className="text-xs font-black text-emerald-500 bg-emerald-950/50 border border-emerald-900/50 px-2 py-1 rounded mr-3 animate-pulse">LIVE</span>
                Unified Activity Stream
              </h3>
              <p className="text-slate-400 font-bold text-xs mt-1.5">Cross-platform operations merged into a single pane of glass.</p>
            </div>
            <span className="bg-slate-900 text-slate-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700">
              Auto-Sync Enabled
            </span>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[600px] bg-transparent relative z-10 custom-scrollbar">
            {omniFeed.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <Activity className="w-12 h-12 text-slate-700 mb-4 opacity-50" />
                <p className="text-sm font-bold text-slate-500">No activity detected across platforms.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {omniFeed.map((event, idx) => (
                  <li key={event.id || idx} className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 hover:border-blue-900/50 transition-colors flex items-start group">
                    <div className="mt-0.5 mr-4">
                      {renderFeedDataTag(event.platform, event.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-[13px] font-black text-white">
                          {event.user} <span className="font-semibold text-slate-500">via {event.platform}</span>
                        </p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border ${
                          event.status === 'Merged' || event.status === 'Done' || event.status === 'Published' || event.status === 'Success'
                          ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' 
                          : 'bg-amber-950/30 text-amber-500 border-amber-900/50'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="text-slate-300 font-semibold text-sm mt-2 leading-snug">{event.message}</p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-500 flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.url && (
                          <button onClick={() => handleExternalNavigation(event.url)} className="text-[11px] font-black text-blue-500 hover:text-blue-400 flex items-center transition-colors">
                            VIEW SOURCE <ExternalLink className="w-3 h-3 ml-1.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}