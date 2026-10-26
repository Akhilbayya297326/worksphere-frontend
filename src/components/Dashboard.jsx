import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, FileText,
  GitBranch, Image as ImageIcon, Layers, Loader2, Plus, Radio, Sparkles,
  Trash2, UploadCloud, Users, X,
} from 'lucide-react';
import API from '../services/api';
import { useApp } from '../context/AppContext';
import { Badge, Button, Card, Modal, Notice, PageHeader } from './ui';

const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
const repositoryTypes = ['Frontend', 'Backend', 'Fullstack', 'Microservice', 'Other'];
const errorMessage = (error, fallback) => error.response?.data?.error || error.message || fallback;

export default function Dashboard({ onOpenProject }) {
  const { socket } = useApp();
  const [stage, setStage] = useState('source');
  const [mode, setMode] = useState('vision');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectFile, setProjectFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [projectData, setProjectData] = useState(null);
  const [createdProject, setCreatedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [repositories, setRepositories] = useState([{ repoType: 'Frontend', url: '' }, { repoType: 'Backend', url: '' }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const fileInput = useRef(null);
  const operation = useRef(false);

  useEffect(() => {
    if (!projectFile || !projectFile.type.startsWith('image/')) { setImagePreview(''); return; }
    const url = URL.createObjectURL(projectFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [projectFile]);

  const selectFile = (file) => {
    if (!file) return;
    setError('');
    if (mode === 'vision' && !imageTypes.includes(file.type)) {
      setError('Choose a PNG, JPEG, WebP, HEIC, or HEIF image.');
      return;
    }
    if (mode === 'document' && !/\.(txt|json|md)$/i.test(file.name)) {
      setError('Choose a text, Markdown, or JSON document. Export PDF and Word documents as text first.');
      return;
    }
    if (file.size > (mode === 'vision' ? 10 * 1024 * 1024 : 1024 * 1024)) {
      setError(mode === 'vision' ? 'Images must be 10 MB or smaller.' : 'Text documents must be 1 MB or smaller.');
      return;
    }
    setProjectFile(file);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setProjectFile(null);
    setError('');
    if (fileInput.current) fileInput.current.value = '';
  };

  const analyzeProject = async (event) => {
    event.preventDefault();
    if (operation.current) return;
    if (!projectTitle.trim() || !projectFile) { setError('Enter a project name and choose a requirements file.'); return; }
    operation.current = true;
    setIsProcessing(true);
    setError('');
    setNotice('');
    try {
      let response;
      if (mode === 'vision') {
        const payload = new FormData();
        payload.append('image', projectFile);
        payload.append('title', projectTitle.trim());
        response = await API.post('/orchestration/vision-orchestrate', payload);
      } else {
        const text = await projectFile.text();
        if (!text.trim()) throw new Error('This document is empty. Choose a document containing your project requirements.');
        const content = `Initiative Name: ${projectTitle.trim()}\n\n${text}`;
        if (content.length > 100000) throw new Error('The document and project name must contain no more than 100,000 characters.');
        response = await API.post('/analysis/analyze-doc', { text: content });
      }
      const { data } = response;
      if (!data.success) throw new Error(data.error || 'The project could not be analyzed.');
      const team = mode === 'vision' ? data.shortlistedTeam : data.analysis?.aiShortlist;
      const draftedTasks = mode === 'vision' ? data.draftedTasks : data.tasks || data.analysis?.tasks;
      if (!Array.isArray(draftedTasks) || !draftedTasks.length) throw new Error('No tasks were returned. Try a more detailed project brief.');
      setProjectData({ title: data.projectTitle || projectTitle.trim(), aiShortlistedTeam: Array.isArray(team) ? team : [] });
      setTasks(draftedTasks.map(task => ({ ...task, assignedTo: '', complexity: task.complexity || 'Medium' })));
      setStage('review');
    } catch (failure) {
      setError(errorMessage(failure, 'Project analysis is unavailable. Please try again.'));
    } finally {
      operation.current = false;
      setIsProcessing(false);
    }
  };

  const updateTask = (index, changes) => setTasks(previous => previous.map((task, position) => position === index ? { ...task, ...changes } : task));
  const updateRepository = (index, changes) => setRepositories(previous => previous.map((repository, position) => position === index ? { ...repository, ...changes } : repository));

  const dispatchProject = async () => {
    if (operation.current) return;
    if (tasks.some(task => !task.assignedTo)) { setError('Assign an owner to every task before creating the project.'); return; }
    const validRepositories = repositories.filter(repository => repository.url.trim());
    for (const repository of validRepositories) {
      try { if (!['http:', 'https:'].includes(new URL(repository.url).protocol)) throw new Error(); }
      catch { setError('Repository links must be valid HTTP or HTTPS URLs.'); return; }
    }
    operation.current = true;
    setIsProcessing(true);
    setError('');
    try {
      const { data } = await API.post('/orchestration/dispatch', {
        title: projectData.title,
        aiShortlistedTeam: projectData.aiShortlistedTeam,
        finalizedTasks: tasks,
        repositories: validRepositories.map(repository => ({ ...repository, url: repository.url.trim() })),
      });
      if (!data.success) throw new Error(data.error || 'The project could not be created.');
      setCreatedProject(data.project || null);
      socket?.emit('trigger_workspace_update');
      setStage('complete');
    } catch (failure) {
      setError(errorMessage(failure, 'The project could not be created. Your draft is still available.'));
    } finally {
      operation.current = false;
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStage('source'); setProjectTitle(''); setProjectFile(null); setProjectData(null); setCreatedProject(null);
    setTasks([]); setRepositories([{ repoType: 'Frontend', url: '' }, { repoType: 'Backend', url: '' }]);
    setError(''); setNotice('');
  };

  const simulateAlert = () => {
    setShowSimulation(false);
    if (!socket?.connected) { setError('Connect to the server before running an alert simulation.'); return; }
    socket.emit('trigger_chaos_monkey');
    setNotice('A simulated incident alert was sent to connected team members.');
  };

  const step = stage === 'source' ? 0 : stage === 'review' ? 1 : 2;
  const unassigned = tasks.filter(task => !task.assignedTo).length;

  return (
    <div className="ws-page space-y-6">
      <PageHeader eyebrow="Project management" title="Project orchestration" description="Turn a project brief into a clear plan, with the right people assigned to each task."
        actions={<Button variant="secondary" icon={Radio} onClick={() => setShowSimulation(true)}>Simulate alert</Button>} />

      <Card className="px-6 py-5">
        <ol className="grid grid-cols-1 gap-5 sm:grid-cols-3" aria-label="Project creation progress">
          {[
            ['Project requirements', 'Upload a brief or a whiteboard'],
            ['Review & assign', 'Check tasks and choose owners'],
            ['Create project', 'Make the plan available to your team'],
          ].map(([title, description], index) => (
            <li key={title} className="flex items-center gap-3" aria-current={step === index ? 'step' : undefined}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step > index ? 'bg-emerald-100 text-emerald-800' : step === index ? 'bg-[#00684a] text-white' : 'bg-slate-100 text-slate-500'}`}>
                {step > index ? <Check size={15} /> : index + 1}
              </span>
              <div><p className={`text-sm font-semibold ${step === index ? 'text-slate-900' : 'text-slate-600'}`}>{title}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div>
            </li>
          ))}
        </ol>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      {stage === 'source' && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <Card>
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-base font-semibold text-slate-900">Start with your requirements</h2>
              <p className="mt-1 text-sm text-slate-500">Add a project name and the material your team will build from.</p>
            </div>
            <form onSubmit={analyzeProject} className="space-y-6 p-6">
              <div>
                <label htmlFor="project-name" className="mb-2 block text-xs font-semibold text-slate-700">Project name <span className="text-red-500">*</span></label>
                <input id="project-name" className="w-full" placeholder="e.g. Customer portal migration" value={projectTitle} maxLength={500} onChange={event => setProjectTitle(event.target.value)} disabled={isProcessing} required />
              </div>
              <fieldset>
                <legend className="mb-3 text-xs font-semibold text-slate-700">Requirements source</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'vision', label: 'Whiteboard image', detail: 'Diagrams, sketches, and wireframes', Icon: ImageIcon },
                    { value: 'document', label: 'Project document', detail: 'Text briefs and specifications', Icon: FileText },
                  ].map(({ value, label, detail, Icon }) => (
                    <label key={value} className={`relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-emerald-200 ${mode === value ? 'border-[#00825a] bg-emerald-50/60' : 'border-slate-200 hover:border-slate-400'}`}>
                      <input type="radio" name="source" className="sr-only" checked={mode === value} onChange={() => switchMode(value)} disabled={isProcessing} />
                      <Icon size={19} className={`mt-0.5 shrink-0 ${mode === value ? 'text-[#00684a]' : 'text-slate-500'}`} />
                      <span><span className="block text-sm font-medium text-slate-800">{label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{detail}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div onDragOver={event => { event.preventDefault(); if (!isProcessing) setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                onDrop={event => { event.preventDefault(); setIsDragging(false); if (!isProcessing) selectFile(event.dataTransfer.files[0]); }}
                className={`rounded-lg border border-dashed p-6 text-center transition-colors ${isDragging ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300 bg-slate-50/50'}`}>
                {projectFile ? (
                  <div className="flex flex-col items-center gap-3">
                    {imagePreview ? <img src={imagePreview} alt="Selected requirements" onError={() => setImagePreview('')} className="max-h-36 rounded border border-slate-200 object-contain" /> : <div className="rounded-lg border border-slate-200 bg-white p-3 text-[#00684a]"><FileText size={25} /></div>}
                    <div><p className="text-sm font-medium text-slate-800">{projectFile.name}</p><p className="mt-1 text-xs text-slate-500">{(projectFile.size / 1024).toFixed(1)} KB · Ready to analyze</p></div>
                    <Button type="button" variant="ghost" size="sm" icon={X} onClick={() => { setProjectFile(null); if (fileInput.current) fileInput.current.value = ''; }} disabled={isProcessing}>Remove file</Button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#00684a]"><UploadCloud size={21} /></div>
                    <p className="text-sm font-medium text-slate-800">Drag a file here, or browse your files</p>
                    <p className="mb-4 mt-1.5 text-xs text-slate-500">{mode === 'vision' ? 'PNG, JPEG, WebP, HEIC or HEIF · Up to 10 MB' : 'TXT, Markdown or JSON · Up to 100,000 characters'}</p>
                    <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => fileInput.current?.click()} disabled={isProcessing}>Choose file</Button>
                  </>
                )}
                <input ref={fileInput} id="requirements-file" aria-label="Requirements file" type="file" className="sr-only" accept={mode === 'vision' ? imageTypes.join(',') : '.txt,.json,.md'} onChange={event => selectFile(event.target.files[0])} disabled={isProcessing} />
              </div>
              {isProcessing && <Notice tone="info"><span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Analyzing your requirements and matching available team members. This may take a moment.</span></Notice>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><Sparkles size={14} /> You will review the plan before it is created.</span>
                <Button type="submit" icon={isProcessing ? Loader2 : ArrowRight} disabled={isProcessing || !projectFile || !projectTitle.trim()}>{isProcessing ? 'Analyzing requirements…' : 'Generate project plan'}</Button>
              </div>
            </form>
          </Card>
          <div className="space-y-5">
            <Card className="p-5">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-[#00684a]"><Layers size={18} /></div>
              <h3 className="text-sm font-semibold text-slate-900">A plan your team can use</h3>
              <p className="mt-2 text-xs leading-6 text-slate-500">The planner reads your requirements, drafts technical tasks, and suggests available people with relevant skills.</p>
              <ul className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-xs text-slate-600">
                {['Review every task before assigning it', 'Choose an owner for each task', 'Connect repository links when ready'].map(item => <li key={item} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#00825a]" />{item}</li>)}
              </ul>
            </Card>
            <div className="px-1"><h4 className="text-xs font-semibold text-slate-700">Writing a useful brief</h4><p className="mt-2 text-xs leading-6 text-slate-500">Include the project goal, key features, technical requirements, and any delivery constraints. Clear requirements make a better starting plan.</p></div>
          </div>
        </div>
      )}

      {stage === 'review' && projectData && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-lg font-semibold text-slate-900">{projectData.title}</p><p className="mt-1 text-sm text-slate-500">Review the suggested team and assign each task before creating the project.</p></div>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => { setStage('source'); setError(''); }} disabled={isProcessing}>Edit requirements</Button>
          </div>
          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Users size={17} className="text-[#00684a]" /> Suggested team</h2><Badge>{projectData.aiShortlistedTeam.length} members</Badge></div>
            {projectData.aiShortlistedTeam.length ? (
              <div className="grid divide-y divide-slate-200 md:grid-cols-2 md:divide-y-0">
                {projectData.aiShortlistedTeam.map((member, index) => <div key={member.employeeId || member.name || index} className="flex items-start gap-3 border-b border-slate-100 p-5 last:border-b-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-[#00684a]">{member.name?.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><p className="text-sm font-medium text-slate-800">{member.name} <span className="ml-2 text-xs font-normal text-slate-500">{member.role}</span></p><p className="mt-1.5 text-xs leading-5 text-slate-500">{member.matchReason || member.reason || 'Suggested for this project.'}</p></div></div>)}
              </div>
            ) : <div className="p-5"><Notice tone="warning">No matching team members were suggested. Update the requirements or check your workforce availability before continuing.</Notice></div>}
          </Card>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Task allocation</h2><p className="mt-1 text-xs text-slate-500">AI-generated tasks are a starting point. Check titles, complexity, and ownership.</p></div><Badge tone={unassigned ? 'amber' : 'green'} dot>{unassigned ? `${unassigned} need an owner` : 'All tasks assigned'}</Badge></div>
            <div className="overflow-x-auto">
              <table className="ws-table w-full text-left text-sm">
                <thead><tr><th className="w-12">#</th><th>Task</th><th className="w-32">Complexity</th><th className="w-60">Assigned to</th></tr></thead>
                <tbody>{tasks.map((task, index) => <tr key={index}><td className="align-top text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</td><td className="min-w-[280px]"><p className="font-medium text-slate-800">{task.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{task.description}</p></td><td className="align-top"><Badge tone={task.complexity === 'High' || task.complexity === 'Critical' ? 'amber' : 'neutral'}>{task.complexity}</Badge></td><td className="align-top"><select className="w-full min-w-[180px]" aria-label={`Assign ${task.title}`} value={task.assignedTo} onChange={event => updateTask(index, { assignedTo: event.target.value })} disabled={isProcessing}><option value="">Select an owner</option>{projectData.aiShortlistedTeam.map((member, memberIndex) => <option key={member.employeeId || member.name || memberIndex} value={member.name}>{member.name}</option>)}</select></td></tr>)}</tbody>
              </table>
            </div>
          </Card>
          <Card>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4"><span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><GitBranch size={17} className="text-slate-500" /> Repository links <span className="text-xs font-normal text-slate-500">Optional</span></span><ChevronDown size={16} className="text-slate-400" /></summary>
              <div className="space-y-3 border-t border-slate-200 p-6">
                <p className="mb-4 text-xs text-slate-500">Attach repositories so your team can find the code alongside the project.</p>
                {repositories.map((repository, index) => <div key={index} className="flex flex-wrap gap-3 sm:flex-nowrap"><select aria-label={`Repository ${index + 1} type`} className="w-full sm:w-40" value={repository.repoType} onChange={event => updateRepository(index, { repoType: event.target.value })} disabled={isProcessing}>{repositoryTypes.map(type => <option key={type}>{type}</option>)}</select><input type="url" aria-label={`Repository ${index + 1} URL`} className="min-w-0 flex-1" placeholder="https://github.com/organization/repository" value={repository.url} onChange={event => updateRepository(index, { url: event.target.value })} disabled={isProcessing} /><Button variant="ghost" icon={Trash2} aria-label={`Remove repository ${index + 1}`} onClick={() => setRepositories(previous => previous.filter((_, position) => position !== index))} disabled={isProcessing} /></div>)}
                <Button variant="secondary" size="sm" icon={Plus} onClick={() => setRepositories(previous => [...previous, { repoType: 'Other', url: '' }])} disabled={isProcessing}>Add repository</Button>
              </div>
            </details>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1"><p className="text-xs text-slate-500">{tasks.length} tasks · {projectData.aiShortlistedTeam.length} suggested members · {repositories.filter(repository => repository.url.trim()).length} repositories</p><Button icon={isProcessing ? Loader2 : Check} onClick={dispatchProject} disabled={isProcessing || !!unassigned || !tasks.length}>{isProcessing ? 'Creating project…' : 'Confirm & create project'}</Button></div>
        </div>
      )}

      {stage === 'complete' && (
        <Card className="px-6 py-14 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#00825a]"><CheckCircle2 size={28} /></div>
          <h2 className="text-xl font-semibold text-slate-900">Your project is ready</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500"><strong className="font-medium text-slate-800">{projectData?.title}</strong> has been created with {tasks.length} assigned tasks. Follow your team’s progress in Projects.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">{createdProject && onOpenProject && <Button icon={ArrowRight} onClick={() => onOpenProject(createdProject)}>Open project</Button>}<Button variant="secondary" icon={Plus} onClick={reset}>Create another project</Button></div>
        </Card>
      )}
      <Modal open={showSimulation} title="Simulate an incident alert" description="Use a simulation to check how the team receives an incident notification." onClose={() => setShowSimulation(false)} footer={<><Button variant="secondary" onClick={() => setShowSimulation(false)}>Cancel</Button><Button icon={Radio} onClick={simulateAlert}>Send simulated alert</Button></>}>
        <Notice tone="info">This sends a clearly marked simulated incident alert to connected team members. It does not cause an actual hardware outage.</Notice>
      </Modal>
    </div>
  );
}
