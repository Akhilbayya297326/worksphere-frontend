import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useApp } from '../context/AppContext';
import API from '../services/api';

// ==========================================
// 🛡️ CRASH PREVENTION: Safe Icon Wrapper
// ==========================================
const SafeIcon = ({ name, fallback = 'Circle', ...props }) => {
    const IconComponent = Icons[name] || Icons[fallback] || Icons.Circle;
    return IconComponent ? <IconComponent {...props} /> : <span className="inline-block w-4 h-4 bg-slate-500 rounded-full"></span>;
};

export default function ChatHub() {
    const { user, chatMessages, addChatMessage } = useApp();
    const [newMessage, setNewMessage] = useState('');
    const [activeChannel, setActiveChannel] = useState('global-orchestration');
    const messagesEndRef = useRef(null);

    // 🚀 Auto-scroll to the newest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, activeChannel]);

    const handleSendMessage = (e, overrideText = null) => {
        if (e) e.preventDefault();
        const textToSend = overrideText || newMessage;
        if (!textToSend.trim()) return;

        addChatMessage({
            author: user?.name || 'Unknown User',
            role: user?.role || 'Staff',
            isBot: false,
            text: textToSend.trim(),
            channel: activeChannel,
            urgent: false
        });

        setNewMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const channels = [
        { id: 'global-orchestration', name: 'Global Orchestration', icon: 'Globe' },
        { id: 'engineering', name: 'Engineering Hive', icon: 'TerminalSquare' },
        { id: 'qa-alerts', name: 'QA & Security Alerts', icon: 'ShieldAlert' },
    ];

    // Enterprise "Quick Actions" / Suggested Prompts
    const quickActions = [
        { text: "🚀 Pushed latest build to Staging.", icon: "UploadCloud" },
        { text: "🛡️ Requesting Code Review on latest PR.", icon: "GitPullRequest" },
        { text: "⚠️ Experiencing DB latency, anyone else?", icon: "Database" },
        { text: "✅ UI Bug #402 resolved and verified.", icon: "CheckCircle2" }
    ];

    const visibleMessages = chatMessages.filter(msg => 
        msg.channel === activeChannel || msg.urgent === true || msg.channel === undefined
    );

    return (
        <div className="max-w-7xl mx-auto h-[85vh] animate-fadeIn font-sans text-slate-200 flex flex-col md:flex-row gap-6 relative z-10">
            
            {/* ==========================================
                🌌 AMBIENT BACKGROUND GLOWS 
                ========================================== */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            {/* ==========================================
                LEFT SIDEBAR: CHANNELS 
                ========================================== */}
            <div className="w-full md:w-72 bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col shrink-0 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-sky-900/10 to-transparent pointer-events-none"></div>

                <div className="mb-8 relative z-10">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight border-b border-slate-800/80 pb-4">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.15)]">
                            <SafeIcon name="MessageSquare" size={16} className="text-sky-400" /> 
                        </div>
                        Comm-Link
                    </h2>
                </div>

                <div className="space-y-2 flex-1 relative z-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-4">Enterprise Channels</p>
                    {channels.map(channel => {
                        const isActive = activeChannel === channel.id;
                        return (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannel(channel.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                    isActive 
                                        ? 'bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-sky-400 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)]' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                                }`}
                            >
                                <SafeIcon name={channel.icon} size={16} className={isActive ? 'text-sky-400' : 'text-slate-500'} /> 
                                # {channel.name}
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,1)]"></div>}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-800/80 relative z-10">
                    <div className="bg-[#05080F] border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 shadow-inner">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                            <SafeIcon name="Radio" className="text-emerald-500" size={16} />
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Database Synced</p>
                            <p className="text-[9px] text-emerald-500/60 font-mono mt-0.5">End-to-End Persistent</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==========================================
                MAIN CHAT AREA 
                ========================================== */}
            <div className="flex-1 bg-[#0B101A]/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
                
                {/* Chat Header */}
                <div className="px-8 py-6 border-b border-slate-800/80 flex justify-between items-center bg-[#05080F]/50 relative z-10 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <span className="text-slate-600">#</span> {channels.find(c => c.id === activeChannel)?.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-bold mt-1.5 flex items-center gap-1.5">
                            <SafeIcon name="ShieldCheck" size={12} className="text-emerald-500" /> Enterprise-wide collaboration and provenance tracking.
                        </p>
                    </div>
                    <div className="flex items-center -space-x-3">
                        {['B','S','R','A'].map((ltr, i) => (
                            <div key={i} className="w-9 h-9 rounded-full bg-slate-800 border-2 border-[#0B101A] flex items-center justify-center text-[10px] font-black text-slate-300 shadow-md relative hover:-translate-y-1 transition-transform cursor-pointer">
                                {ltr}
                            </div>
                        ))}
                        <div className="w-9 h-9 rounded-full bg-[#131B2B] border-2 border-[#0B101A] flex items-center justify-center text-[10px] font-black text-slate-500 shadow-md cursor-pointer hover:text-white transition-colors">
                            <SafeIcon name="Plus" size={12} />
                        </div>
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative z-10 scroll-smooth">
                    {visibleMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50 animate-fadeIn">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                                <SafeIcon name="DatabaseBackup" size={32} className="text-slate-400" />
                            </div>
                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Vault Initialized</p>
                            <p className="text-xs font-bold text-slate-500 mt-2">Chat history will permanently persist here.</p>
                        </div>
                    ) : (
                        visibleMessages.map((msg, idx) => {
                            const isMe = msg.author === user?.name && !msg.isBot;

                            // 🤖 SYSTEM / BOT MESSAGE RENDER
                            if (msg.isBot || msg.role === 'System Intelligence') {
                                return (
                                    <div key={msg._id || msg.id || idx} className="flex justify-center my-8 animate-fadeIn">
                                        <div className={`max-w-3xl w-full p-6 rounded-2xl border flex gap-5 shadow-lg backdrop-blur-sm ${
                                            msg.urgent 
                                                ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.05)]' 
                                                : 'bg-indigo-950/20 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]'
                                        }`}>
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                                                msg.urgent ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                                            }`}>
                                                <SafeIcon name={msg.urgent ? 'AlertOctagon' : 'Cpu'} size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                        msg.urgent ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                    }`}>
                                                        {msg.author || 'System'}
                                                    </span>
                                                    <span className="text-[10px] font-mono font-bold text-slate-500">
                                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Live'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // 👤 HUMAN MESSAGE RENDER
                            return (
                                <div key={msg._id || msg.id || idx} className={`flex w-full animate-fadeIn ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-4 max-w-[85%] lg:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm border shadow-lg ${
                                            isMe 
                                                ? 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white border-sky-400/50' 
                                                : 'bg-[#131B2B] text-slate-300 border-slate-700'
                                        }`}>
                                            {msg.author ? msg.author.charAt(0).toUpperCase() : 'U'}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`flex items-center gap-2 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <span className="text-xs font-bold text-slate-300">{isMe ? 'You' : msg.author}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{msg.role}</span>
                                                <span className="text-[9px] font-mono font-bold text-slate-600">
                                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                </span>
                                            </div>
                                            <div className={`p-4 md:p-5 text-sm leading-relaxed shadow-md ${
                                                isMe 
                                                    ? 'bg-sky-600 text-white rounded-2xl rounded-tr-sm' 
                                                    : 'bg-[#131B2B] text-slate-200 border border-slate-700/80 rounded-2xl rounded-tl-sm'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* ==========================================
                    INPUT AREA & QUICK ACTIONS 
                    ========================================== */}
                <div className="p-6 md:p-8 bg-[#05080F]/80 backdrop-blur-md border-t border-slate-800/80 relative z-20 shrink-0">
                    
                    {/* 🚀 QUICK ACTIONS (AI SUGGESTED PROMPTS) */}
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar mb-5 pb-2">
                        {quickActions.map((action, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSendMessage(null, action.text)}
                                className="whitespace-nowrap px-4 py-2 bg-[#131B2B] hover:bg-sky-500/10 text-slate-300 hover:text-sky-300 border border-slate-700/80 hover:border-sky-500/30 rounded-full text-[10px] font-black tracking-widest uppercase transition-all shadow-sm flex items-center gap-2 group"
                            >
                                <SafeIcon name={action.icon} size={12} className="text-slate-500 group-hover:text-sky-400 transition-colors" />
                                {action.text}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={(e) => handleSendMessage(e, null)} className="relative flex items-end gap-4">
                        
                        <button type="button" className="p-4 bg-[#131B2B] text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-2xl transition-all border border-slate-700/80 hover:border-sky-500/30 shrink-0 shadow-inner">
                            <SafeIcon name="Paperclip" size={20} />
                        </button>
                        
                        <div className="flex-1 relative group">
                            <div className="absolute inset-0 bg-sky-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity duration-500"></div>
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name}...`}
                                className="w-full bg-[#131B2B] text-white text-sm font-medium p-4 pr-12 rounded-2xl border border-slate-700/80 focus:border-sky-500 outline-none transition-all resize-none custom-scrollbar shadow-inner relative z-10 placeholder:text-slate-600"
                                rows="1"
                                style={{ minHeight: '56px', maxHeight: '150px' }}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="p-4 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-2xl hover:from-sky-400 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:grayscale shadow-[0_0_20px_rgba(14,165,233,0.3)] shrink-0 flex items-center justify-center btn-press"
                        >
                            <SafeIcon name="Send" size={20} className="ml-1" />
                        </button>
                    </form>
                    
                    <div className="mt-4 text-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <SafeIcon name="Lock" size={10} /> End-to-End Encrypted Enterprise Chat
                        </span>
                    </div>
                </div>

            </div>
        </div>  
    );
}