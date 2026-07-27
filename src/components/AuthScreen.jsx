import React, { useState } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, Lock, Mail, AlertCircle, KeyRound, 
  ChevronRight, BrainCircuit, Loader2, Sparkles, TerminalSquare 
} from 'lucide-react';
import '../App.css'; 

export default function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 🚀 HARDCODED RENDER URL
      const res = await axios.post('https://worksphere-backend-thoi.onrender.com/api/auth/login', { email, password });
      if (res.data.success) {
        onLogin(res.data.user); 
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Secure server unreachable.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@worksphere.com');
    setPassword('cisco2026');
  };

  return (
    <div className="min-h-screen bg-[#05080F] flex items-center justify-center font-sans relative overflow-hidden text-slate-200">
      
      {/* ==========================================
          🌌 AMBIENT BACKGROUND & GRID 
          ========================================== */}
      {/* Subtle Tech Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Dynamic Animated Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-sky-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none"></div>

      {/* ==========================================
          🛡️ MAIN AUTHENTICATION CARD 
          ========================================== */}
      <div className="w-full max-w-[420px] p-[1px] rounded-3xl bg-gradient-to-b from-slate-700/50 via-slate-800/10 to-slate-800/50 relative z-10 shadow-2xl animate-fadeIn">
        <div className="bg-[#0B101A]/90 backdrop-blur-2xl w-full h-full rounded-[23px] p-10 flex flex-col shadow-[0_0_80px_rgba(14,165,233,0.1)]">
          
          {/* Header Section */}
          <div className="text-center mb-10 flex flex-col items-center">
            <div className="relative group mb-6">
              <div className="absolute inset-0 bg-sky-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#131B2B] border border-sky-500/30 shadow-inner">
                <BrainCircuit className="w-10 h-10 text-sky-400" />
              </div>
            </div>
            
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-slate-400 mb-2">
              WorkSphere<span className="text-sky-500">.AI</span>
            </h1>
            
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5"/> Enterprise Gateway
            </div>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Error State */}
            {error && (
              <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-xl flex items-start space-x-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                <p className="text-xs font-bold text-rose-200 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="group relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block transition-colors group-focus-within:text-sky-400">
                Authorized Identity
              </label>
              <div className="relative flex items-center">
                <Mail className="w-5 h-5 absolute left-4 text-slate-600 group-focus-within:text-sky-400 transition-colors z-10" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#0D121F] border border-slate-700/80 rounded-xl font-mono text-sm text-white outline-none focus:border-sky-500 focus:bg-[#131B2B] focus:ring-4 focus:ring-sky-500/10 transition-all shadow-inner placeholder:text-slate-700"
                  placeholder="name@enterprise.local"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="group relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block transition-colors group-focus-within:text-sky-400">
                Security Passphrase
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 absolute left-4 text-slate-600 group-focus-within:text-sky-400 transition-colors z-10" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#0D121F] border border-slate-700/80 rounded-xl font-mono text-sm text-white outline-none focus:border-sky-500 focus:bg-[#131B2B] focus:ring-4 focus:ring-sky-500/10 transition-all shadow-inner placeholder:text-slate-700"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full relative group mt-6"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-indigo-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-transform transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait border border-sky-400/50">
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...</>
                ) : (
                  <><KeyRound className="w-4 h-4 mr-2" /> Establish Secure Session</>
                )}
              </div>
            </button>
          </form>

          {/* Hackathon Quick Access Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <button 
              type="button" 
              onClick={fillDemoCredentials}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-lg text-[10px] font-black text-slate-300 hover:text-white uppercase tracking-widest transition-all shadow-sm group"
            >
              <TerminalSquare className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
              Load Hackathon Credentials
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors ml-1" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}