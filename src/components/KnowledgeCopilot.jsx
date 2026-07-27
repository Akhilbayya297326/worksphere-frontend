import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, BookOpen, ShieldCheck, Database, Send, Cpu } from 'lucide-react';
import '../App.css';

export default function KnowledgeCopilot() {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isTyping]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const userMsg = { role: 'user', text: query };
    setConversation(prev => [...prev, userMsg]);
    setIsTyping(true);
    setQuery('');

    try {
      const res = await axios.post('http://localhost:5000/api/knowledge/query', { query: userMsg.text });
      const aiMsg = { 
        role: 'ai', 
        text: res.data.data.overview || res.data.data.technicalDetails || "Query processed.", 
        sources: res.data.data.sources,
        confidence: res.data.data.confidenceScore
      };
      setConversation(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Knowledge query failed");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] bg-slate-50 border-2 border-slate-300 rounded-2xl overflow-hidden font-sans shadow-lg animate-fade-in">
      
      <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b-4 border-blue-600">
        <div>
          <h2 className="text-2xl font-black flex items-center space-x-3">
            <Cpu className="w-7 h-7 text-blue-400" />
            <span>Enterprise Knowledge Copilot</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-2 flex items-center space-x-4 uppercase tracking-widest">
            <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1 text-emerald-400"/> 100% Grounded Context</span>
            <span className="flex items-center"><Database className="w-4 h-4 mr-1 text-indigo-400"/> RAG + Vector Embeddings</span>
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-100">
        {conversation.length === 0 && (
          <div className="text-center text-slate-500 mt-24 animate-fade-in">
            <BookOpen className="w-20 h-20 mx-auto text-slate-300 mb-6" />
            <p className="text-2xl font-black text-slate-800">Ask the Copilot Anything.</p>
            <p className="text-sm font-bold mt-2">Query secure APIs, architectures, Jira tickets, and enterprise documentation.</p>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[80%] p-6 rounded-3xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border-2 border-slate-200 text-slate-900 rounded-bl-none'}`}>
              <p className="font-semibold text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                    Verified Sources <span className="ml-2 text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">Confidence: {msg.confidence}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, i) => (
                      <span key={i} className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold border border-slate-200 flex items-center shadow-sm">
                        <BookOpen className="w-3 h-3 mr-1.5 text-blue-500" /> {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
             <div className="bg-white border-2 border-slate-200 p-5 rounded-3xl rounded-bl-none shadow-sm flex items-center">
                <div className="flex space-x-2 mr-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="text-sm font-black text-slate-500">Querying Vector Database...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 bg-white border-t-2 border-slate-200">
        <div className="flex space-x-4 max-w-5xl mx-auto">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., How does our stateless authentication flow work?"
            className="flex-1 border-2 border-slate-300 p-4 rounded-xl font-black text-slate-900 text-base input-interactive outline-none"
            disabled={isTyping}
          />
          <button 
            onClick={handleSearch}
            disabled={!query.trim() || isTyping}
            className="bg-slate-900 text-white px-8 rounded-xl font-black flex items-center hover:bg-blue-600 transition-colors disabled:opacity-50 btn-press shadow-md"
          >
            <Send className="w-5 h-5 mr-2" /> SEND
          </button>
        </div>
      </div>
    </div>
  );
}