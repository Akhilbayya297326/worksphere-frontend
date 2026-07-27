import React, { useState } from 'react';
import { LayoutDashboard, Briefcase, MessageSquare, Brain, Database, TrendingUp, LogOut, BookOpen, Blocks } from 'lucide-react';

import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import UnifiedWorkspace from './components/UnifiedWorkspace';
import ProjectDocs from './components/ProjectDocs';
import IntegrationsHub from './components/IntegrationsHub';
import ChatHub from './components/ChatHub';
import KnowledgeCopilot from './components/KnowledgeCopilot';
import TalentMatrix from './components/TalentMatrix';
import ExecutiveROI from './components/ExecutiveROI';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('');

  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentView(user.role === 'Manager' ? 'Dashboard' : 'UnifiedWorkspace');
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // Enterprise Sidebar Navigation Setup
  const navItems = [
    { id: 'Dashboard', label: 'AI Orchestration', icon: LayoutDashboard, roles: ['Manager'] },
    { id: 'UnifiedWorkspace', label: 'Unified Workspace', icon: Briefcase, roles: ['Manager', 'Developer', 'QA Tester'] },
    { id: 'ProjectDocs', label: 'Project Docs', icon: BookOpen, roles: ['Manager', 'Developer', 'QA Tester'] },
    { id: 'IntegrationsHub', label: 'Toolchain Hub', icon: Blocks, roles: ['Manager', 'Developer', 'QA Tester'] },
    { id: 'ChatHub', label: 'Comm-Link', icon: MessageSquare, roles: ['Manager', 'Developer', 'QA Tester'] },
    { id: 'KnowledgeCopilot', label: 'Knowledge Copilot', icon: Brain, roles: ['Manager', 'Developer', 'QA Tester'] },
    { id: 'TalentMatrix', label: 'Workforce Registry', icon: Database, roles: ['Manager', 'Developer', 'QA Tester'] },
    { id: 'ExecutiveROI', label: 'ROI Analytics', icon: TrendingUp, roles: ['Manager'] },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'Dashboard': return <Dashboard currentUser={currentUser} />;
      case 'UnifiedWorkspace': return <UnifiedWorkspace currentUser={currentUser} />;
      case 'ProjectDocs': return <ProjectDocs currentUser={currentUser} />;
      case 'IntegrationsHub': return <IntegrationsHub currentUser={currentUser} />;
      case 'ChatHub': return <ChatHub currentUser={currentUser} />;
      case 'KnowledgeCopilot': return <KnowledgeCopilot />;
      case 'TalentMatrix': return <TalentMatrix currentUserRole={currentUser.role} />;
      case 'ExecutiveROI': return <ExecutiveROI />;
      default: return <UnifiedWorkspace currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-white overflow-hidden">
      
      {/* LEFT SIDEBAR - Deep Charcoal & Dark Blue */}
      <div className="w-72 bg-[#0a0f1a] flex flex-col border-r border-blue-900/50 z-20 shadow-2xl relative shrink-0">
        
        {/* Subtle Dark Blue Sidebar Glow */}
        <div className="absolute top-0 left-0 w-full h-32 bg-blue-900/20 filter blur-3xl pointer-events-none"></div>

        {/* Brand Identity */}
        <div className="p-6 border-b border-blue-900/40 relative z-10">
          <h1 className="text-2xl font-black text-white flex items-center tracking-tight">
            <Brain className="w-7 h-7 mr-2 text-blue-500" /> 
            WorkSphere<span className="text-blue-500">.AI</span>
          </h1>
          <div className="flex items-center mt-3 bg-slate-900/50 w-max px-3 py-1 rounded-full border border-blue-900/30">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Network Live</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10 custom-scrollbar">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-3 mt-2">Core Modules</p>
          
          {navItems.map((item) => {
            if (!item.roles.includes(currentUser.role)) return null;
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-500' 
                    : 'text-slate-400 hover:bg-blue-900/40 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-blue-500 group-hover:text-blue-400'}`} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Identity Panel */}
        <div className="p-5 border-t border-blue-900/40 bg-[#070b14] flex justify-between items-center relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-900/50 border border-blue-500 flex items-center justify-center">
              <span className="font-black text-blue-400">{currentUser.name.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-black text-white">{currentUser.name}</p>
              <p className="text-[10px] text-blue-500 font-black tracking-widest uppercase mt-0.5">
                {currentUser.role}
              </p>
            </div>
          </div>
          {/* Red Logout Button for Destructive Action */}
          <button 
            onClick={() => setCurrentUser(null)}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors border border-transparent hover:border-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            title="Terminate Session"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA - Charcoal Black */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-8 custom-scrollbar relative">
        {/* 🚀 THE UX UPGRADE: key={currentView} forces the fade-in animation to trigger every time you switch tabs! */}
        <div key={currentView} className="max-w-7xl mx-auto relative z-10 animate-fade-in">
          {renderView()}
        </div>
      </div>

    </div>
  );
}