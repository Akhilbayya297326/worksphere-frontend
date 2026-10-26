import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, CornerDownLeft, Send, Sparkles, Trash2 } from 'lucide-react';
import API from '../services/api';
import { Badge, Button, Card, LoadingState, Notice, PageHeader } from './ui';

const suggestions = ['How does our authentication flow work?', 'Where are JWT tokens validated?', 'What happens when a user signs in?'];

export default function KnowledgeCopilot() {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const pendingRef = useRef(false);
  const controllerRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [conversation, isTyping]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const handleSearch = async event => {
    event?.preventDefault();
    const question = query.trim();
    if (!question || pendingRef.current) return;
    pendingRef.current = true;
    setIsTyping(true);
    setQuery('');
    setConversation(previous => [...previous, { role: 'user', text: question }]);
    controllerRef.current = new AbortController();
    try {
      const { data } = await API.post('/knowledge/query', { query: question }, { signal: controllerRef.current.signal });
      if (!data?.success || !data.data) throw new Error(data?.error || 'The knowledge service returned an incomplete response.');
      setConversation(previous => [...previous, { role: 'assistant', ...data.data, text: data.data.overview || data.data.technicalDetails || 'Query processed.', isSample: data.contextType === 'sample' || data.data.contextType === 'sample' }]);
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setConversation(previous => [...previous, { role: 'assistant', text: error.response?.data?.error || error.message || 'The knowledge service is unavailable. Please try again.', isError: true, question }]);
    } finally {
      pendingRef.current = false;
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="KNOWLEDGE" title="Knowledge assistant" description="Get answers with context and source references." actions={<Button variant="secondary" icon={Trash2} disabled={!conversation.length || isTyping} onClick={() => setConversation([])}>Clear chat</Button>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <Card className="flex min-h-[620px] h-[calc(100vh-235px)] max-h-[850px] flex-col overflow-hidden !p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Sparkles size={16} className="text-emerald-700" /> Ask a question</div><Badge tone="amber">Sample sources</Badge></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7" role="log" aria-label="Knowledge conversation" aria-live="polite">
            {!conversation.length && <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center py-12 text-center"><div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-emerald-700"><BookOpen size={24} /></div><h2 className="text-lg font-semibold text-slate-900">A little context goes a long way</h2><p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-500">Ask about the sample authentication documentation to see how referenced answers work.</p><div className="mt-7 w-full space-y-2">{suggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => { setQuery(suggestion); inputRef.current?.focus(); }} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-xs text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30">{suggestion}<CornerDownLeft size={13} className="shrink-0 text-slate-400" /></button>)}</div></div>}
            <div className="space-y-6">{conversation.map((message, index) => <article key={index} className={message.role === 'user' ? 'ml-auto max-w-[88%] rounded-xl bg-slate-100 px-4 py-3' : 'max-w-full'}>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">{message.role === 'user' ? 'You' : <><Sparkles size={13} className="text-emerald-700" /> Knowledge assistant</>}</p>
              {message.isError ? <Notice tone="error"><p>{message.text}</p><button type="button" className="mt-2 text-xs font-semibold underline" disabled={isTyping} onClick={() => { setQuery(message.question); inputRef.current?.focus(); }}>Edit question and retry</button></Notice> : <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700">{message.text}</p>}
              {message.isSample && <p className="mt-3 text-[11px] text-amber-700">Answer based on sample documentation. Your enterprise sources are not connected.</p>}
              {Array.isArray(message.sources) && message.sources.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2">{message.sources.map((source, sourceIndex) => <span key={sourceIndex} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500"><BookOpen size={12} />{source}</span>)}{message.confidenceScore && <span className="text-[11px] text-slate-400">Model confidence: {message.confidenceScore}</span>}</div>}
              {(message.technicalDetails || message.keyPoints?.length || message.actionItems?.length) && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer font-medium">Show answer details</summary><div className="mt-3 space-y-3 leading-6">{message.technicalDetails && <p className="whitespace-pre-wrap">{message.technicalDetails}</p>}{[...(message.keyPoints || []), ...(message.actionItems || [])].map((point, pointIndex) => <p key={pointIndex}>• {point}</p>)}</div></details>}
            </article>)}</div>
            {isTyping && <div className="mt-5"><LoadingState label="Looking through the sample documentation…" /></div>}<div ref={bottomRef} />
          </div>
          <form onSubmit={handleSearch} className="border-t border-slate-200 p-4"><div className="flex gap-3"><input ref={inputRef} aria-label="Knowledge question" className="min-w-0 flex-1 text-[13px]" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ask a question about the documentation…" maxLength={10000} disabled={isTyping} /><Button type="submit" icon={Send} disabled={!query.trim() || isTyping}>{isTyping ? 'Thinking…' : 'Ask'}</Button></div><p className="mt-2 text-[11px] text-slate-400">Answers can be incomplete. Check the referenced source before using them.</p></form>
        </Card>
        <aside className="space-y-4"><Card><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><BookOpen size={16} /> Available context</div><p className="mt-3 text-xs leading-6 text-slate-500">This assistant currently uses example authentication documentation, rather than a connected enterprise knowledge base.</p><div className="mt-4 space-y-3 border-t border-slate-100 pt-4"><p className="text-xs font-medium text-slate-700">API Authentication Guide</p><p className="text-[11px] text-slate-400">JWT authentication · Section 3.1</p><p className="text-xs font-medium text-slate-700">auth-service / README</p><p className="text-[11px] text-slate-400">Token validation at the API gateway</p></div></Card><Notice tone="info">Source references explain where the answer came from. Confidence is supplied by the model.</Notice></aside>
      </div>
    </div>
  );
}
