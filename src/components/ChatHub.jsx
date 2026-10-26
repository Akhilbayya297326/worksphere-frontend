import React, { useEffect, useRef, useState } from 'react';
import { Hash, MessageSquare, Search, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, Button, Card, EmptyState, Notice, PageHeader } from './ui';

const channels = [
  { id: 'global-orchestration', name: 'General', description: 'Project updates and team announcements' },
  { id: 'engineering', name: 'Engineering', description: 'Implementation, questions, and code reviews' },
  { id: 'qa-alerts', name: 'Quality & security', description: 'Testing updates and security conversations' },
];
const templates = ['Can someone review the latest change?', 'A quick update on my current work:', 'I could use some help with:'];
const messageTime = timestamp => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ChatHub() {
  const { user, chatMessages, chatError, isConnected, addChatMessage } = useApp();
  const [activeChannel, setActiveChannel] = useState(channels[0].id);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const sendingRef = useRef(false);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);
  const channel = channels.find(item => item.id === activeChannel);
  const draft = drafts[activeChannel] || '';
  const setDraft = text => setDrafts(previous => ({ ...previous, [activeChannel]: text }));
  const channelMessages = chatMessages.filter(message => message.channel === activeChannel || message.urgent || !message.channel);
  const visibleMessages = channelMessages.filter(message => `${message.author || ''} ${message.text || ''}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [chatMessages, activeChannel]);

  const sendMessage = async event => {
    event?.preventDefault();
    if (sendingRef.current || !isConnected || !draft.trim()) return;
    sendingRef.current = true;
    setIsSending(true);
    setSendError('');
    const sentText = draft;
    const sentChannel = activeChannel;
    try {
      const sent = await addChatMessage({ author: user?.name || 'Staff', role: user?.role || 'Staff', isBot: false, text: sentText.trim(), channel: sentChannel, urgent: false });
      if (sent) setDrafts(previous => ({ ...previous, [sentChannel]: previous[sentChannel] === sentText ? '' : previous[sentChannel] }));
    } catch { setSendError('Your message could not be sent. Your draft has been kept.'); }
    finally { sendingRef.current = false; setIsSending(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="COLLABORATION" title="Team chat" description="Keep project conversations in one place." actions={<Badge tone={isConnected ? 'green' : 'amber'} dot>{isConnected ? 'Connected' : 'Reconnecting'}</Badge>} />
      <Card className="overflow-hidden !p-0">
        <div className="flex min-h-[580px] h-[calc(100vh-235px)] max-h-[850px] flex-col md:flex-row">
          <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-50/60 p-4 md:w-56 md:border-b-0 md:border-r">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Channels</p>
            <nav aria-label="Chat channels" className="flex gap-1 overflow-x-auto md:flex-col">
              {channels.map(item => {
                const count = chatMessages.filter(message => message.channel === item.id).length;
                return <button key={item.id} type="button" onClick={() => { setActiveChannel(item.id); setSearch(''); setSendError(''); }} aria-current={activeChannel === item.id ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-left text-[13px] transition-colors ${activeChannel === item.id ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}><Hash size={15} /><span className="flex-1">{item.name}</span>{count > 0 && <span className="text-[11px] text-slate-400">{count}</span>}</button>;
              })}
            </nav>
            <div className="mt-6 hidden rounded-md border border-slate-200 bg-white p-3 md:block"><p className="text-xs font-medium text-slate-700">A shared workspace</p><p className="mt-1 text-xs leading-5 text-slate-500">Messages appear after the server confirms delivery.</p></div>
          </aside>
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-sm font-semibold text-slate-900"># {channel.name}</h2><p className="mt-1 text-xs text-slate-500">{channel.description}</p></div>
              <div className="relative w-full sm:w-56"><Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" /><input aria-label="Search channel messages" placeholder="Search messages" value={search} onChange={event => setSearch(event.target.value)} className="w-full !pl-9 !pr-8 text-xs" />{search && <button type="button" aria-label="Clear message search" className="absolute right-2 top-2 text-slate-400" onClick={() => setSearch('')}><X size={15} /></button>}</div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5" role="log" aria-label={`${channel.name} messages`} aria-live="polite">
              {!visibleMessages.length ? <EmptyState icon={MessageSquare} title={search ? 'No matching messages' : 'Start the conversation'} description={search ? 'Try a different name or keyword.' : `Share an update or ask your team a question in ${channel.name.toLowerCase()}.`} /> : <div className="space-y-6">{visibleMessages.map((message, index) => {
                const system = message.isBot || message.role === 'System Intelligence';
                const mine = message.author === user?.name && !system;
                return <article key={message._id || message.id || index} className={`flex gap-3 ${system ? 'rounded-lg border border-slate-200 bg-slate-50 p-3' : ''}`}>
                  <div aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${mine ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{system ? <MessageSquare size={15} /> : (message.author || 'S').charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-800">{message.author || 'System'}{mine ? ' (you)' : ''}</span><span className="text-[11px] text-slate-400">{messageTime(message.timestamp)}</span>{system && <Badge tone="neutral">System</Badge>}{message.urgent && <Badge tone="red">Urgent</Badge>}</div><p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-600">{message.text}</p></div>
                </article>;
              })}</div>}
              <div ref={bottomRef} />
            </div>
            <div className="space-y-3 border-t border-slate-200 p-4">
              {(sendError || chatError) && <Notice tone="error">{sendError || chatError}</Notice>}
              {!isConnected && <p className="text-xs text-amber-700">Waiting for a connection. You can keep writing your draft.</p>}
              <div className="flex flex-wrap gap-2">{templates.map(template => <button type="button" key={template} onClick={() => { setDraft(template); composerRef.current?.focus(); }} className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50">{template}</button>)}</div>
              <form onSubmit={sendMessage} className="flex items-end gap-3"><textarea ref={composerRef} aria-label={`Message ${channel.name}`} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) sendMessage(event); }} maxLength={10000} rows={2} placeholder={`Message #${channel.name.toLowerCase()}…`} className="min-w-0 flex-1 resize-none text-[13px]" /><Button type="submit" icon={Send} disabled={!draft.trim() || !isConnected || isSending}>{isSending ? 'Sending…' : 'Send'}</Button></form>
              <p className="text-[11px] text-slate-400">Enter to send · Shift + Enter for a new line</p>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
