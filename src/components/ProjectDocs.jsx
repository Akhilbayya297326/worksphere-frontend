import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Download, Eye, File, FileText, FolderOpen, RefreshCw, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import API from '../services/api.js';
import { Badge, Button, Card, EmptyState, LoadingState, Modal, Notice, PageHeader } from './ui';

const bytesLabel = bytes => {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return '0 B';
  const unit = Math.min(Math.floor(Math.log(Number(bytes)) / Math.log(1024)), 3);
  return `${(Number(bytes) / (1024 ** unit)).toFixed(unit ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][unit]}`;
};
const dateLabel = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};
const toItems = value => Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : typeof value === 'string' ? value.split('\n').map(item => item.replace(/^[•*-]\s*/, '').trim()).filter(Boolean) : [];
const fileCategory = file => /image/.test(file.mimetype || '') ? 'Images' : /json|javascript|typescript|text\/plain/.test(file.mimetype || '') || /\.(js|jsx|ts|tsx|json|py|css|html|md)$/i.test(file.originalName || '') ? 'Code & text' : 'Documents';

function ReviewDetails({ content }) {
  let data = content;
  try { if (typeof content === 'string') data = JSON.parse(content); } catch { return <p className="whitespace-pre-wrap text-[13px] leading-6 text-slate-600">{content}</p>; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return <p className="text-xs text-slate-500">No review details were saved.</p>;
  const sections = [['Business goals', data.businessRequirements], ['Functional requirements', data.functionalReqs], ['Security', data.securityMeasures], ['Technical environment', data.technicalEnv], ['Performance & quality', data.nonFunctionalReqs], ['Constraints', data.constraints]];
  return <div className="space-y-5">{typeof data.projectSummary === 'string' && <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px] leading-6 text-slate-700">{data.projectSummary}</p>}<div className="grid gap-5 sm:grid-cols-2">{sections.map(([title, items]) => toItems(items).length > 0 && <div key={title}><h3 className="mb-2 text-xs font-semibold text-slate-800">{title}</h3><ul className="space-y-2">{toItems(items).map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-slate-500"><span className="text-emerald-700">•</span><span>{item}</span></li>)}</ul></div>)}</div></div>;
}

export default function ProjectDocs() {
  const { user } = useApp();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [tab, setTab] = useState('Documents');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All files');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [review, setReview] = useState(null);
  const fileInputRef = useRef(null);
  const controllerRef = useRef(null);
  const actionRef = useRef(false);
  const activeProject = useMemo(() => projects.find(project => project._id === projectId), [projects, projectId]);
  const isManager = user?.role === 'Manager' || user?.role === 'Admin';
  const busy = isUploading || isAnalyzing || deleting;

  const fetchProjects = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await API.get('/projects', { signal: controller.signal });
      if (!data?.success) throw new Error(data?.error || 'Projects could not be loaded.');
      const list = Array.isArray(data.projects) ? data.projects : [];
      setProjects(list);
      setProjectId(previous => list.some(project => project._id === previous) ? previous : list[0]?._id || '');
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') setLoadError(error.response?.data?.error || error.message || 'Project documents could not be loaded.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => { fetchProjects(); return () => controllerRef.current?.abort(); }, [fetchProjects]);

  const updateProject = (id, update) => setProjects(previous => previous.map(project => project._id === id ? update(project) : project));
  const uploadFile = async file => {
    if (!file || !activeProject || actionRef.current) return;
    if (file.size > 50 * 1024 * 1024) { setNotice({ tone: 'error', text: 'Choose a file smaller than 50 MB.' }); return; }
    const id = activeProject._id;
    const form = new FormData();
    form.append('file', file);
    form.append('uploaderName', user?.name || 'Staff');
    actionRef.current = true;
    setIsUploading(true);
    setNotice(null);
    try {
      const { data } = await API.post(`/projects/${id}/upload`, form);
      if (!data?.success || !data.file) throw new Error(data?.error || 'The upload could not be confirmed.');
      updateProject(id, project => ({ ...project, files: [...(project.files || []), data.file] }));
      setNotice({ tone: 'success', text: `${file.name} was uploaded.` });
    } catch (error) { setNotice({ tone: 'error', text: error.response?.data?.error || error.message || 'The file could not be uploaded.' }); }
    finally { actionRef.current = false; setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };
  const runReview = async () => {
    if (!activeProject?.files?.length || actionRef.current) return;
    const id = activeProject._id;
    actionRef.current = true;
    setIsAnalyzing(true);
    setNotice(null);
    try {
      const { data } = await API.post(`/projects/${id}/vault-analysis`, { requesterName: user?.name });
      if (!data?.success || !data.analysis) throw new Error(data?.error || 'A review plan could not be generated.');
      updateProject(id, project => ({ ...project, vaultAnalyses: [data.analysis, ...(project.vaultAnalyses || [])] }));
      setTab('Saved reviews');
      setSearch('');
      setReview(data.analysis);
      setNotice({ tone: 'success', text: 'The review plan was saved to this project.' });
    } catch (error) { setNotice({ tone: 'error', text: error.response?.data?.error || error.message || 'The review could not be generated.' }); }
    finally { actionRef.current = false; setIsAnalyzing(false); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget || actionRef.current) return;
    const target = deleteTarget;
    actionRef.current = true;
    setDeleting(true);
    try {
      const route = target.kind === 'file' ? 'files' : 'vault-analysis';
      const { data } = await API.delete(`/projects/${target.projectId}/${route}/${target.id}`);
      if (!data?.success) throw new Error(data?.error || 'Deletion could not be confirmed.');
      const key = target.kind === 'file' ? 'files' : 'vaultAnalyses';
      updateProject(target.projectId, project => ({ ...project, [key]: (project[key] || []).filter(item => String(item._id || item.id) !== String(target.id)) }));
      if (String(review?._id) === String(target.id)) setReview(null);
      setDeleteTarget(null);
      setNotice({ tone: 'success', text: `${target.kind === 'file' ? 'Document' : 'Saved review'} deleted.` });
    } catch (error) { setNotice({ tone: 'error', text: error.response?.data?.error || error.message || 'The item could not be deleted.' }); setDeleteTarget(null); }
    finally { actionRef.current = false; setDeleting(false); }
  };

  const files = (activeProject?.files || []).filter(file => (category === 'All files' || fileCategory(file) === category) && `${file.originalName} ${file.uploadedBy || ''}`.toLowerCase().includes(search.toLowerCase()));
  const reviews = (activeProject?.vaultAnalyses || []).filter(item => `${item.title || ''} ${item.generatedBy || ''}`.toLowerCase().includes(search.toLowerCase()));
  const brief = activeProject ? [
    ['System architecture', activeProject.projectKnowledgeBase?.systemArchitecture],
    ['Business goals', activeProject.analysis?.businessRequirements?.goals],
    ['Features', activeProject.projectKnowledgeBase?.coreFeatures || activeProject.analysis?.functionalRequirements?.featureList],
    ['Technology stack', activeProject.analysis?.technicalRequirements?.techStack],
    ['Database design', activeProject.projectKnowledgeBase?.databaseDesign],
    ['Getting started', activeProject.projectKnowledgeBase?.setupInstructions],
    ['Quality & testing', activeProject.projectKnowledgeBase?.qaTestingStrategy],
    ['Security requirements', activeProject.analysis?.nonFunctionalRequirements?.securityAndCompliance],
    ['Performance requirements', activeProject.analysis?.nonFunctionalRequirements?.performance],
    ['Constraints', activeProject.analysis?.constraintsAndDependencies?.budgetAndTimeline],
  ].filter(([, value]) => toItems(value).length > 0) : [];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="KNOWLEDGE" title="Project documents" description="Files, project context, and saved review plans." actions={<div className="flex gap-2"><Button variant="secondary" icon={RefreshCw} disabled={loading || busy} onClick={fetchProjects}>Refresh</Button><Button icon={Upload} disabled={!activeProject || busy} onClick={() => fileInputRef.current?.click()}>{isUploading ? 'Uploading…' : 'Upload document'}</Button></div>} />
      <input ref={fileInputRef} type="file" aria-label="Upload project document" className="hidden" onChange={event => uploadFile(event.target.files?.[0])} />
      {loadError && <Notice tone="error">{loadError} <button type="button" onClick={fetchProjects} className="ml-2 font-semibold underline">Try again</button></Notice>}
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {loading && !projects.length ? <LoadingState label="Loading project documents…" /> : !projects.length ? <Card><EmptyState icon={FolderOpen} title={loadError ? 'Documents are unavailable' : 'No projects yet'} description={loadError ? 'Refresh after the project service is available.' : 'Create a project from the project planner to start collecting documents.'} /></Card> : <>
        <div className="flex flex-wrap items-center gap-4"><div className="flex items-center gap-3"><label htmlFor="docs-project" className="text-xs font-medium text-slate-500">Project</label><select id="docs-project" className="max-w-[300px] text-xs" value={projectId} disabled={busy} onChange={event => { setProjectId(event.target.value); setSearch(''); setNotice(null); setReview(null); }}>{projects.map(project => <option key={project._id} value={project._id}>{project.title}</option>)}</select></div><Badge tone="neutral">{activeProject?.status || 'Project'}</Badge><p className="ml-auto text-xs text-slate-400">{activeProject?.files?.length || 0} documents · {activeProject?.vaultAnalyses?.length || 0} saved reviews</p></div>
        <Card className="overflow-hidden !p-0">
          <div className="flex gap-5 overflow-x-auto border-b border-slate-200 px-5" role="tablist" aria-label="Project document sections">{['Documents', 'Saved reviews', 'Project brief'].map(name => <button key={name} id={`docs-tab-${name.replaceAll(' ', '-')}`} role="tab" aria-controls="docs-panel" aria-selected={tab === name} onClick={() => { setTab(name); setSearch(''); }} className={`whitespace-nowrap border-b-2 py-4 text-xs font-medium ${tab === name ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{name}</button>)}</div>
          <div id="docs-panel" role="tabpanel" aria-labelledby={`docs-tab-${tab.replaceAll(' ', '-')}`}>
            {tab !== 'Project brief' && <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-3"><div className="relative min-w-[180px] flex-1 sm:max-w-xs"><Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" /><input aria-label={`Search ${tab.toLowerCase()}`} className="w-full !pl-9 text-xs" value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${tab.toLowerCase()}…`} /></div>{tab === 'Documents' ? <select aria-label="Filter documents by type" className="text-xs" value={category} onChange={event => setCategory(event.target.value)}>{['All files', 'Documents', 'Images', 'Code & text'].map(option => <option key={option}>{option}</option>)}</select> : <Button variant="secondary" size="sm" icon={Sparkles} className="ml-auto" disabled={busy || !activeProject?.files?.length} onClick={runReview}>{isAnalyzing ? 'Generating…' : 'Generate review plan'}</Button>}</div>}
            {tab === 'Documents' && (!files.length ? <EmptyState icon={FileText} title={search || category !== 'All files' ? 'No matching documents' : 'Your project files live here'} description={search || category !== 'All files' ? 'Try another search or file type.' : 'Upload the briefs, diagrams, and resources your team needs. Up to 50 MB per file.'} action={search || category !== 'All files' ? <Button variant="secondary" onClick={() => { setSearch(''); setCategory('All files'); }}>Clear filters</Button> : <Button variant="secondary" icon={Upload} disabled={busy} onClick={() => fileInputRef.current?.click()}>Choose a file</Button>} /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Size</th><th className="px-4 py-3 font-medium">Added by</th><th className="px-4 py-3 font-medium">Date added</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody>{files.map((file, index) => <tr key={file._id || index} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-400"><File size={16} /></div><div><p className="max-w-sm truncate font-medium text-slate-800" title={file.originalName}>{file.originalName}</p><p className="mt-1 text-[11px] text-slate-400">{fileCategory(file)}</p></div></div></td><td className="px-4 py-4 text-slate-500">{bytesLabel(file.size)}</td><td className="px-4 py-4 text-slate-500">{file.uploadedBy || 'Unknown'}</td><td className="whitespace-nowrap px-4 py-4 text-slate-500">{dateLabel(file.uploadedAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><a href={`${API.defaults.baseURL}/projects/download/${encodeURIComponent(file.filename)}`} download={file.originalName} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50" aria-label={`Download ${file.originalName}`}><Download size={13} />Download</a>{isManager && <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Delete ${file.originalName}`} disabled={busy} onClick={() => setDeleteTarget({ kind: 'file', id: file._id || file.id, title: file.originalName, projectId })} />}</div></td></tr>)}</tbody></table></div>)}
            {tab === 'Saved reviews' && <>{!reviews.length ? <EmptyState icon={Sparkles} title={search ? 'No matching reviews' : 'No saved reviews yet'} description={search ? 'Try a different title or author.' : 'Create a review plan after adding project files. Plans use filenames, rather than file contents.'} /> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Review</th><th className="px-4 py-3 font-medium">Requested by</th><th className="px-4 py-3 font-medium">Created</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody>{reviews.map((item, index) => <tr key={item._id || index} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-medium text-slate-800">{item.title || 'Project review plan'}</p><p className="mt-1 text-[11px] text-slate-400">Filename-based review</p></td><td className="px-4 py-4 text-slate-500">{item.generatedBy || 'System'}</td><td className="whitespace-nowrap px-4 py-4 text-slate-500">{dateLabel(item.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button variant="secondary" size="sm" icon={Eye} onClick={() => setReview(item)}>View</Button>{isManager && <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Delete ${item.title || 'review'}`} disabled={busy} onClick={() => setDeleteTarget({ kind: 'review', id: item._id || item.id, title: item.title || 'Saved review', projectId })} />}</div></td></tr>)}</tbody></table></div>}<div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">Review plans use uploaded filenames. Document contents are not analyzed.</div></>}
            {tab === 'Project brief' && (brief.length ? <div className="grid gap-6 p-5 sm:grid-cols-2">{brief.map(([title, value]) => <section key={title} className="rounded-lg border border-slate-200 p-4"><h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-800"><BookOpen size={14} className="text-emerald-700" />{title}</h2><ul className="space-y-2">{toItems(value).map((item, index) => <li key={index} className="text-xs leading-6 text-slate-500">{item}</li>)}</ul></section>)}</div> : <EmptyState icon={BookOpen} title="The project brief is still empty" description="Architecture and requirements will appear when they have been saved for this project." />)}
          </div>
        </Card>
      </>}
      <Modal open={Boolean(review)} title={review?.title || 'Project review plan'} description={`Requested by ${review?.generatedBy || 'System'} · ${dateLabel(review?.createdAt)}`} onClose={() => setReview(null)} wide><Notice tone="info">This review uses filenames as context. Verify it against the source documents.</Notice><div className="mt-5"><ReviewDetails content={review?.content} /></div></Modal>
      <Modal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.kind === 'file' ? 'document' : 'saved review'}?`} description="This removes the item from the project and cannot be undone." onClose={() => { if (!deleting) setDeleteTarget(null); }} footer={<><Button variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" icon={Trash2} disabled={deleting} onClick={confirmDelete}>{deleting ? 'Deleting…' : 'Delete'}</Button></>}><p className="break-words rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{deleteTarget?.title}</p></Modal>
    </div>
  );
}
