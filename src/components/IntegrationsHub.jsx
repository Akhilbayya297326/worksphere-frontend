import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, BookOpen, Columns3, ExternalLink, GitBranch, RefreshCw, Search, Video } from 'lucide-react';
import API from '../services/api';
import { Badge, Button, Card, EmptyState, LoadingState, Notice, PageHeader } from './ui';

const providers = [
  { key: 'github', name: 'GitHub', icon: GitBranch, description: 'Recent commits from your configured repository.', links: [['githubFrontend', 'Frontend repository'], ['githubBackend', 'Backend repository']] },
  { key: 'jira', name: 'Jira', icon: Columns3, description: 'Issue updates from the last 30 days.', links: [['jiraBoard', 'Open board']] },
  { key: 'webex', name: 'Webex', icon: Video, description: 'A shortcut to your configured meeting workspace.', links: [['webexWorkspace', 'Open workspace']] },
  { key: 'confluence', name: 'Confluence', icon: BookOpen, description: 'A document feed is not connected to this workspace.', links: [] },
];
const healthTone = status => status === 'Operational' ? 'green' : status === 'Unavailable' ? 'red' : status === 'Unknown' ? 'amber' : 'neutral';
const safeUrl = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
};
const formatTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function IntegrationsHub() {
  const [feed, setFeed] = useState([]);
  const [links, setLinks] = useState({});
  const [health, setHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [platform, setPlatform] = useState('All platforms');
  const [search, setSearch] = useState('');
  const controllerRef = useRef(null);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError('');
    const [feedResult, linksResult] = await Promise.allSettled([
      API.get('/integrations/omni-feed', { signal: controller.signal }),
      API.get('/integrations/links', { signal: controller.signal }),
    ]);
    if (controller.signal.aborted) return;
    const errors = [];
    if (feedResult.status === 'fulfilled' && feedResult.value.data?.success) {
      setFeed(Array.isArray(feedResult.value.data.omniFeed) ? feedResult.value.data.omniFeed : []);
      setHealth(feedResult.value.data.systemHealth || {});
      setLastUpdated(new Date());
    } else {
      setHealth({});
      errors.push(feedResult.reason?.response?.data?.error || 'The activity feed could not be refreshed.');
    }
    if (linksResult.status === 'fulfilled' && linksResult.value.data?.success) setLinks(linksResult.value.data.links || {});
    else errors.push(linksResult.reason?.response?.data?.error || 'Platform links are unavailable.');
    setError(errors.join(' '));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); return () => controllerRef.current?.abort(); }, [refresh]);
  const visibleFeed = feed.filter(event => (platform === 'All platforms' || event.platform === platform) && `${event.user} ${event.message} ${event.type}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="WORKSPACE" title="Integrations" description="Follow activity across the tools your team uses." actions={<Button variant="secondary" icon={RefreshCw} disabled={loading} onClick={refresh}>{loading ? 'Refreshing…' : 'Refresh'}</Button>} />
      {error && <Notice tone="error">{error}{lastUpdated && ' The previous activity snapshot is shown below.'}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{providers.map(provider => {
        const Icon = provider.icon;
        const status = health[provider.key] || (loading ? 'Checking' : 'Unknown');
        return <Card key={provider.key} className="flex flex-col"><div className="mb-4 flex items-start justify-between gap-2"><div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600"><Icon size={19} /></div><Badge tone={healthTone(status)} dot>{status}</Badge></div><h2 className="text-sm font-semibold text-slate-900">{provider.name}</h2><p className="mb-4 mt-1 min-h-[40px] text-xs leading-5 text-slate-500">{provider.description}</p><div className="mt-auto flex flex-col items-start gap-2 border-t border-slate-100 pt-3">{provider.links.length ? provider.links.map(([key, label]) => <Button key={key} variant="ghost" size="sm" icon={ExternalLink} disabled={!safeUrl(links[key])} onClick={() => window.open(safeUrl(links[key]), '_blank', 'noopener,noreferrer')}>{label}</Button>) : <p className="py-1 text-[11px] text-slate-400">No source configured</p>}</div></Card>;
      })}</div>
      <Card className="overflow-hidden !p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Activity feed</h2><p className="mt-1 text-xs text-slate-500">A snapshot of recent events from connected sources.</p></div><span className="text-[11px] text-slate-400">{lastUpdated ? `Checked ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting first check'}</span></div>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-3"><div className="relative min-w-[200px] flex-1 sm:max-w-xs"><Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" /><input aria-label="Search integration activity" className="w-full !pl-9 text-xs" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search activity…" /></div><select aria-label="Filter activity by platform" className="text-xs" value={platform} onChange={event => setPlatform(event.target.value)}>{['All platforms', 'GitHub', 'Jira', 'Confluence'].map(option => <option key={option}>{option}</option>)}</select><span className="ml-auto self-center text-xs text-slate-400">{visibleFeed.length} event{visibleFeed.length === 1 ? '' : 's'}</span></div>
        {loading && !lastUpdated ? <LoadingState label="Checking connected platforms…" /> : !visibleFeed.length ? <EmptyState icon={Activity} title={search || platform !== 'All platforms' ? 'No matching activity' : 'No activity to show yet'} description={search || platform !== 'All platforms' ? 'Try a different filter or search term.' : 'Configure GitHub or Jira on the backend, then refresh to see recent activity.'} action={search || platform !== 'All platforms' ? <Button variant="secondary" onClick={() => { setSearch(''); setPlatform('All platforms'); }}>Clear filters</Button> : undefined} /> : <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-xs"><thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500"><th className="px-5 py-3 font-medium">Activity</th><th className="px-4 py-3 font-medium">Platform</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Time</th></tr></thead><tbody>{visibleFeed.map((event, index) => <tr key={`${event.platform}-${event.id || index}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"><td className="max-w-xl px-5 py-4"><p className="font-medium leading-5 text-slate-800">{event.message}</p><p className="mt-1 text-[11px] text-slate-400">{event.user}</p>{safeUrl(event.url) && <a href={safeUrl(event.url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline">View source<ExternalLink size={11} /></a>}</td><td className="px-4 py-4 text-slate-600">{event.platform}</td><td className="px-4 py-4"><Badge tone={['Success', 'Done', 'Merged', 'Published'].includes(event.status) ? 'green' : 'neutral'}>{event.status || 'Unknown'}</Badge></td><td className="whitespace-nowrap px-5 py-4 text-right text-slate-400">{formatTime(event.timestamp)}</td></tr>)}</tbody></table></div>}
      </Card>
      <p className="text-[11px] leading-5 text-slate-400">Health describes the latest backend check. Webex and Confluence do not currently have health monitoring.</p>
    </div>
  );
}
