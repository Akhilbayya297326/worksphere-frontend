import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useApp } from '../context/AppContext';

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

    // Dummy "Quick Actions" showing what employees usually send
    const quickActions = [
        "🚀 Pushed latest frontend build to Staging.",
        "🛡️ Requesting Code Review on my latest PR.",
        "⚠️ Experiencing DB latency, is anyone else seeing this?",
        "✅ UI Bug #402 resolved and verified."
    ];

    const visibleMessages = chatMessages.filter(msg => 
        msg.channel === activeChannel || msg.urgent === true || msg.channel === undefined
    );

    return (
        <div className="max-w-7xl mx-auto h-[85vh] animate-fadeIn font-sans text-slate-200 flex flex-col md:flex-row gap-6">
            
            {/* LEFT SIDEBAR: Channels */}
            <div className="w-full md:w-72 bg-[#0D1117] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col shrink-0 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="mb-8 relative z-10">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight border-b border-slate-800 pb-4">
                        <SafeIcon name="MessageSquare" className="text-sky-500" /> Comm-Link
                    </h2>
                </div>

                <div className="space-y-1 flex-1 relative z-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-3">Enterprise Channels</p>
                    {channels.map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannel(channel.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeChannel === channel.id 
                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                            }`}
                        >
                            <SafeIcon name={channel.icon} size={16} /> 
                            # {channel.name}
                        </button>
                    ))}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-800 relative z-10">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
                        <div className="relative">
                            <SafeIcon name="Radio" className="text-emerald-500 animate-pulse" size={20} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Database Synced</p>
                            <p className="text-[10px] text-emerald-500/70 font-mono mt-0.5">End-to-End Persistent</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 bg-[#131B2B]/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Chat Header */}
                <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-[#0D1117]/50 relative z-10 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <span className="text-slate-500">#</span> {channels.find(c => c.id === activeChannel)?.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Enterprise-wide collaboration and automated system provenance tracking.</p>
                    </div>
                    <div className="flex items-center -space-x-2">
                        {['B','S','R','A'].map((ltr, i) => <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#131B2B] flex items-center justify-center text-[10px] font-black text-slate-300">{ltr}</div>)}
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                    {visibleMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                            <SafeIcon name="DatabaseBackup" size={48} className="text-slate-500 mb-4" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vault Initialized</p>
                            <p className="text-xs text-slate-500 mt-2">Chat history will permanently persist here.</p>
                        </div>
                    ) : (
                        visibleMessages.map((msg, idx) => {
                            const isMe = msg.author === user?.name && !msg.isBot;

                            // 🤖 SYSTEM / BOT MESSAGE RENDER
                            if (msg.isBot || msg.role === 'System Intelligence') {
                                return (
                                    <div key={msg._id || msg.id || idx} className="flex justify-center my-6">
                                        <div className={`max-w-2xl w-full p-4 rounded-2xl border flex gap-4 shadow-lg ${msg.urgent ? 'bg-rose-500/10 border-rose-500/30' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.urgent ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                <SafeIcon name={msg.urgent ? 'AlertOctagon' : 'Cpu'} size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${msg.urgent ? 'text-rose-400' : 'text-indigo-400'}`}>{msg.author || 'System'}</span>
                                                    <span className="text-[9px] font-mono text-slate-500">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Live'}</span>
                                                </div>
                                                <p className="text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // 👤 HUMAN MESSAGE RENDER
                            return (
                                <div key={msg._id || msg.id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-4 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm border shadow-sm ${isMe ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                            {msg.author ? msg.author.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`flex items-center gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <span className="text-xs font-bold text-slate-300">{isMe ? 'You' : msg.author}</span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isMe ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{msg.role}</span>
                                                <span className="text-[9px] font-mono text-slate-500">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                            </div>
                                            <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${isMe ? 'bg-sky-600 text-white rounded-tr-sm' : 'bg-[#1A2333] text-slate-200 border border-slate-700/50 rounded-tl-sm'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area & Quick Prompts */}
                <div className="p-6 bg-[#0D1117] border-t border-slate-800 relative z-10 shrink-0">
                    
                    {/* 🚀 QUICK ACTIONS (DUMMY PROMPTS) */}
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 pb-1">
                        {quickActions.map((action, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSendMessage(null, action)}
                                className="whitespace-nowrap px-3 py-1.5 bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-500/30 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                            >
                                {action}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={(e) => handleSendMessage(e, null)} className="relative flex items-end gap-3">
                        <button type="button" className="p-3.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-xl transition-all border border-transparent hover:border-sky-500/30 shrink-0">
                            <SafeIcon name="PlusCircle" size={20} />
                        </button>
                        
                        <div className="flex-1 relative">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name}...`}
                                className="w-full bg-[#131B2B] text-slate-200 text-sm p-4 pr-12 rounded-2xl border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all resize-none custom-scrollbar"
                                rows="1"
                                style={{ minHeight: '56px', maxHeight: '150px' }}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="p-3.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(14,165,233,0.3)] shrink-0 flex items-center justify-center"
                        >
                            <SafeIcon name="Send" size={20} className="ml-1" />
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}