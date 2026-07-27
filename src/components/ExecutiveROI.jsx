import React from 'react';
import { TrendingUp, Clock, Users, Layers, Activity, DollarSign, BrainCircuit, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import '../App.css';
import API from '../services/api';

export default function ExecutiveROI() {
  return (
    <div className="space-y-8 text-white font-sans animate-fade-in pb-10">
      
      {/* Header */}
      <div className="border-b border-blue-900/50 pb-5">
        <h2 className="text-3xl font-black text-white flex items-center tracking-tight">
          <TrendingUp className="w-8 h-8 mr-3 text-blue-500" /> Business Impact & ROI Analytics
        </h2>
        <p className="text-slate-400 font-bold mt-2 text-lg">Measurable outcomes. Tangible impact. Built for Enterprise Scale.</p>
      </div>

      {/* Top Metrics Grid - High Contrast Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Positive Metric: Green */}
        <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 hover:border-emerald-500 interactive-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><DollarSign className="w-24 h-24 text-emerald-500"/></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Developer Productivity</p>
          <h3 className="text-5xl font-black text-white flex items-center">
            45% <ArrowUpRight className="w-8 h-8 text-emerald-500 ml-2" />
          </h3>
          <p className="text-sm font-bold text-emerald-500 mt-3 flex items-center bg-emerald-950/50 w-max px-3 py-1 rounded-full border border-emerald-900/50">
            Average Output Increase
          </p>
        </div>

        {/* Reduction Metric: Blue */}
        <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 hover:border-blue-500 interactive-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Clock className="w-24 h-24 text-blue-500"/></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Time-to-Value Delivery</p>
          <h3 className="text-5xl font-black text-white flex items-center">
            50% <ArrowDownRight className="w-8 h-8 text-blue-500 ml-2" />
          </h3>
          <p className="text-sm font-bold text-blue-400 mt-3 flex items-center bg-blue-950/50 w-max px-3 py-1 rounded-full border border-blue-900/50">
            Faster Project Shipping
          </p>
        </div>

        {/* Growth Metric: Indigo/Dark Blue */}
        <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 hover:border-indigo-500 interactive-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Layers className="w-24 h-24 text-indigo-500"/></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Knowledge Retention</p>
          <h3 className="text-5xl font-black text-white flex items-center">
            75% <ArrowUpRight className="w-8 h-8 text-indigo-500 ml-2" />
          </h3>
          <p className="text-sm font-bold text-indigo-400 mt-3 flex items-center bg-indigo-950/50 w-max px-3 py-1 rounded-full border border-indigo-900/50">
            Tribal Knowledge Captured
          </p>
        </div>

        {/* Primary Focus Metric: Deep Blue Glow */}
        <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-500/50 interactive-card relative overflow-hidden text-white shadow-[0_0_30px_rgba(37,99,235,0.15)]">
          <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Projected 12-Mo ROI</p>
          <h3 className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">4.2x</h3>
          <p className="text-sm font-bold text-blue-300 mt-3">Payback Period: 5.5 Months</p>
        </div>
      </div>

      {/* Deep Dive Analysis Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        
        {/* Context Switching - REDUCED (Red) */}
        <div className="bg-[#0f172a] p-8 rounded-2xl border border-slate-800 shadow-xl interactive-card">
          <h3 className="text-2xl font-black mb-6 flex items-center text-white"><Users className="w-6 h-6 mr-3 text-red-500"/> Solving Tool Sprawl</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Wasted Time Reduction</span>
                <span className="text-sm font-black text-red-500">↓ 65%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800">
                <div className="bg-red-500 h-3 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{width: '65%'}}></div>
              </div>
            </div>
            <p className="text-sm text-slate-300 font-bold leading-relaxed bg-slate-900/80 p-5 rounded-xl border border-slate-800">
              By unifying GitHub, Jira, and Slack into a single orchestrated environment, developers recover an average of <span className="text-white font-black underline decoration-red-500">2.4 hours daily</span> previously lost to context switching.
            </p>
          </div>
        </div>

        {/* Bridging Gap - GROWTH (Green/Blue) */}
        <div className="bg-[#0f172a] p-8 rounded-2xl border border-slate-800 shadow-xl interactive-card">
          <h3 className="text-2xl font-black mb-6 flex items-center text-white"><BrainCircuit className="w-6 h-6 mr-3 text-emerald-500"/> Bridging the Talent Gap</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Onboarding Speed</span>
                <span className="text-sm font-black text-emerald-500">↑ 60% Faster</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800">
                <div className="bg-emerald-500 h-3 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{width: '60%'}}></div>
              </div>
            </div>
            <p className="text-sm text-slate-300 font-bold leading-relaxed bg-slate-900/80 p-5 rounded-xl border border-slate-800">
              AI-driven task allocation and micro-upskilling ensures the right talent is assigned to the right tasks, maximizing existing workforce utility <span className="text-white font-black">without immediate new hires</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}