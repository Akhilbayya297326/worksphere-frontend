import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Lock, Mail, AlertCircle, KeyRound, ChevronRight, Fingerprint } from 'lucide-react';
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
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      if (res.data.success) {
        onLogin(res.data.user); 
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Server unreachable.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@worksphere.com');
    setPassword('cisco2026');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans relative overflow-hidden text-white">
      
      {/* Dark Theme Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900 rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>

      {/* Main Charcoal Card */}
      <div className="bg-slate-900/80 backdrop-blur-2xl w-full max-w-md p-10 rounded-3xl shadow-[0_0_50px_-12px_rgba(37,99,235,0.25)] relative z-10 border border-slate-800 animate-fade-in">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-950 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)] mb-6">
            <Fingerprint className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">WorkSphere<span className="text-blue-500">.AI</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-500"/> Secured Enterprise Gateway
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-950/50 border border-red-500/50 p-4 rounded-xl flex items-center space-x-3 text-sm font-bold animate-fade-in text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="group">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center transition-colors group-focus-within:text-blue-400">
              Enterprise Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-xl font-bold text-white text-base outline-none focus:border-blue-500 transition-all shadow-inner input-interactive"
                placeholder="name@worksphere.com"
                required
              />
            </div>
          </div>

          <div className="group">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center transition-colors group-focus-within:text-blue-400">
              Passphrase
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-xl font-bold text-white text-base outline-none focus:border-blue-500 transition-all shadow-inner input-interactive"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-black text-base py-4 rounded-xl flex justify-center items-center hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all duration-300 mt-8 disabled:opacity-50 disabled:cursor-wait btn-press"
          >
            {isLoading ? (
              <span className="flex items-center"><div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin mr-3"></div> AUTHENTICATING...</span>
            ) : (
              <span className="flex items-center"><KeyRound className="w-5 h-5 mr-3" /> INITIALIZE SESSION</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <button 
            type="button" 
            onClick={fillDemoCredentials}
            className="text-[11px] font-black text-slate-500 hover:text-emerald-400 uppercase tracking-widest transition-colors flex items-center justify-center mx-auto"
          >
            Load Hackathon Credentials <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}