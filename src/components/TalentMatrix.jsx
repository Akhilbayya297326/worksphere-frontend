import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Briefcase, Check, ChevronLeft, ChevronRight, Clock3, Edit3, ListFilter, Loader2, Mail, Plus, RefreshCw, Search, Sparkles, Target, Trash2, TrendingUp, Users, X } from 'lucide-react';
import API from '../services/api';
import { Badge, Button, Card, EmptyState, LoadingState, Modal, Notice, PageHeader, Stat } from './ui';

const roles = ['Manager', 'Developer', 'QA Tester', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer'];
const availabilityOptions = ['Available', 'Busy', 'On Leave'];
const pageSize = 10;
const asStrings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
const initials = name => (name || '?').split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
const failureMessage = (error, fallback) => error.response?.data?.error || error.message || fallback;
const availabilityTone = value => value === 'Available' ? 'green' : value === 'Busy' ? 'amber' : 'neutral';

export default function TalentMatrix({ currentUserRole }) {
  const isManager = currentUserRole === 'Manager';
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [profileError, setProfileError] = useState('');
  const [roadmapEmployee, setRoadmapEmployee] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapError, setRoadmapError] = useState('');
  const [generating, setGenerating] = useState(false);
  const requestSequence = useRef(0);
  const roadmapSequence = useRef(0);
  const saveLock = useRef(false);
  const deleteLock = useRef(false);
  const actionLock = useRef(false);

  const fetchTalent = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setRefreshing(true);
    try {
      const { data } = await API.get('/talent');
      const list = data.talent || data.employees || data;
      if (!Array.isArray(list)) throw new Error('The directory returned an unexpected response.');
      if (sequence !== requestSequence.current) return;
      setEmployees(list);
      setHasLoaded(true);
      setError('');
    } catch (failure) {
      if (sequence === requestSequence.current) setError(failureMessage(failure, 'The workforce directory could not be loaded.'));
    } finally {
      if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    fetchTalent();
    return () => { requestSequence.current += 1; roadmapSequence.current += 1; };
  }, [fetchTalent]);

  const profile = employees.find(employee => employee._id === profileId) || null;
  const uniqueSkills = new Set(employees.flatMap(employee => asStrings(employee.skills)));
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return employees.filter(employee => {
      const haystack = [employee.name, employee.email, employee.role, employee.department, ...asStrings(employee.skills)].filter(Boolean).join(' ').toLowerCase();
      return (!term || haystack.includes(term)) && (!roleFilter || employee.role === roleFilter) && (!availabilityFilter || employee.availability === availabilityFilter);
    });
  }, [employees, query, roleFilter, availabilityFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleEmployees = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = !!(query || roleFilter || availabilityFilter);
  const clearFilters = () => { setQuery(''); setRoleFilter(''); setAvailabilityFilter(''); setPage(1); };

  const openProfile = employee => { setProfileId(employee._id); setProfileError(''); };
  const openEdit = employee => {
    setProfileId(null);
    setEditEmployee(employee);
    setEditError('');
    setEditForm({ name: employee.name || '', email: employee.email || '', role: employee.role || 'Developer', department: employee.department || 'Engineering', availability: employee.availability || 'Available', experienceYears: employee.experienceYears || 0, skills: asStrings(employee.skills).join(', ') });
  };

  const saveEmployee = async event => {
    event.preventDefault();
    if (saveLock.current) return;
    if (!editForm.name.trim() || !editForm.email.trim()) { setEditError('Name and email are required.'); return; }
    saveLock.current = true;
    setSaving(true);
    setEditError('');
    try {
      const { data } = await API.put(`/talent/${editEmployee._id}`, {
        ...editForm,
        name: editForm.name.trim(), email: editForm.email.trim(), experienceYears: Number(editForm.experienceYears),
        skills: [...new Set(editForm.skills.split(',').map(skill => skill.trim()).filter(Boolean))],
      });
      if (!data.success) throw new Error(data.error || 'The member could not be updated.');
      if (data.employee) setEmployees(previous => previous.map(employee => employee._id === editEmployee._id ? data.employee : employee));
      else await fetchTalent();
      setEditEmployee(null);
      setSuccess('Member details updated.');
    } catch (failure) {
      setEditError(failureMessage(failure, 'The member could not be updated. Your changes are still here.'));
    } finally { saveLock.current = false; setSaving(false); }
  };

  const removeEmployee = async () => {
    if (deleteLock.current || !deleteEmployee) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      const { data } = await API.delete(`/talent/${deleteEmployee._id}`);
      if (!data.success) throw new Error(data.error || 'The member could not be removed.');
      setEmployees(previous => previous.filter(employee => employee._id !== deleteEmployee._id));
      setDeleteEmployee(null);
      setProfileId(null);
      setSuccess('Member removed from the workforce directory.');
    } catch (failure) { setDeleteError(failureMessage(failure, 'The member could not be removed.')); }
    finally { deleteLock.current = false; setDeleting(false); }
  };

  const analyzeSkills = async employee => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction('analyze');
    setProfileError('');
    try {
      const { data } = await API.post(`/talent/${employee._id}/suggest-skills`);
      if (!data.success) throw new Error(data.error || 'Skill suggestions are unavailable.');
      await fetchTalent();
      setSuccess(`Skill suggestions updated for ${employee.name}.`);
    } catch (failure) { setProfileError(failureMessage(failure, 'Skill suggestions are unavailable.')); }
    finally { actionLock.current = false; setPendingAction(''); }
  };

  const addSuggestedSkill = async (employee, skill) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction(skill);
    setProfileError('');
    const skills = [...new Set([...asStrings(employee.skills), skill])];
    const aiSuggestedSkills = asStrings(employee.aiSuggestedSkills).filter(suggestion => suggestion !== skill);
    try {
      const { data } = await API.put(`/talent/${employee._id}`, { skills, aiSuggestedSkills });
      if (!data.success) throw new Error(data.error || 'This skill could not be added.');
      setEmployees(previous => previous.map(member => member._id === employee._id ? data.employee || { ...member, skills, aiSuggestedSkills } : member));
      setSuccess(`${skill} added to ${employee.name}’s skills.`);
    } catch (failure) { setProfileError(failureMessage(failure, 'This skill could not be added.')); }
    finally { actionLock.current = false; setPendingAction(''); }
  };

  const generateRoadmap = async employee => {
    const sequence = ++roadmapSequence.current;
    setProfileId(null);
    setRoadmapEmployee(employee);
    setGenerating(true);
    setRoadmap(null);
    setRoadmapError('');
    try {
      const { data } = await API.post(`/talent/${employee._id}/roadmap`);
      if (sequence !== roadmapSequence.current) return;
      if (!data.success || !data.roadmap) throw new Error(data.error || 'The roadmap could not be generated.');
      setRoadmap({ ...data.roadmap, strengths: asStrings(data.roadmap.strengths), areasForImprovement: asStrings(data.roadmap.areasForImprovement), actionPlan: Array.isArray(data.roadmap.actionPlan) ? data.roadmap.actionPlan : [] });
    } catch (failure) {
      if (sequence === roadmapSequence.current) setRoadmapError(failureMessage(failure, 'The roadmap could not be generated.'));
    } finally { if (sequence === roadmapSequence.current) setGenerating(false); }
  };
  const closeRoadmap = () => { roadmapSequence.current += 1; setRoadmapEmployee(null); setGenerating(false); };

  return (
    <div className="ws-page space-y-6">
      <PageHeader eyebrow="People & capacity" title="Workforce registry" description="Find the right skills, understand team availability, and support individual growth."
        actions={<Button variant="secondary" icon={RefreshCw} disabled={refreshing} onClick={fetchTalent}>{refreshing ? 'Refreshing…' : 'Refresh directory'}</Button>} />
      {error && <Notice tone="error" onDismiss={() => setError('')}>{error}</Notice>}
      {success && <Notice tone="success" onDismiss={() => setSuccess('')}>{success}</Notice>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Team members" value={hasLoaded ? employees.length : '—'} description="Across the workforce directory" icon={Users} />
        <Stat label="Available" value={hasLoaded ? employees.filter(employee => employee.availability === 'Available').length : '—'} description="Ready for a new assignment" icon={Check} />
        <Stat label="Currently assigned" value={hasLoaded ? employees.filter(employee => employee.availability === 'Busy').length : '—'} description="Focused on active work" icon={Briefcase} />
        <Stat label="Skills represented" value={hasLoaded ? uniqueSkills.size : '—'} description="Distinct skills across the team" icon={Sparkles} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Team directory</h2><p className="mt-1 text-xs text-slate-500">{isManager ? 'Manage member details, skills, and development plans.' : 'Explore team capabilities and individual development plans.'}</p></div><Badge>{hasLoaded ? `${employees.length} members` : loading ? 'Loading' : 'Unavailable'}</Badge></div>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" aria-label="Search team members" placeholder="Search by name, role, or skill" className="w-full pl-9" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
          <select aria-label="Filter by role" className="w-full sm:w-44" value={roleFilter} onChange={event => { setRoleFilter(event.target.value); setPage(1); }}><option value="">All roles</option>{roles.map(role => <option key={role}>{role}</option>)}</select>
          <select aria-label="Filter by availability" className="w-full sm:w-40" value={availabilityFilter} onChange={event => { setAvailabilityFilter(event.target.value); setPage(1); }}><option value="">All availability</option>{availabilityOptions.map(availability => <option key={availability}>{availability}</option>)}</select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear</Button>}
        </div>
        {loading ? <LoadingState label="Loading the workforce directory…" /> : visibleEmployees.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="ws-table w-full text-left text-sm">
                <thead><tr><th>Member</th><th>Role & team</th><th>Skills</th><th>Availability</th><th>Experience</th><th className="text-right">Actions</th></tr></thead>
                <tbody>{visibleEmployees.map(employee => (
                  <tr key={employee._id}>
                    <td><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-xs font-semibold text-[#00684a]">{initials(employee.name)}</span><div><button onClick={() => openProfile(employee)} className="whitespace-nowrap text-left font-medium text-slate-800 hover:text-[#00684a] hover:underline">{employee.name}</button><p className="mt-0.5 text-xs text-slate-500">{employee.email || 'No email provided'}</p></div></div></td>
                    <td><p className="whitespace-nowrap text-slate-700">{employee.role}</p><p className="mt-0.5 text-xs text-slate-500">{employee.department || 'Engineering'}</p></td>
                    <td className="min-w-[180px] max-w-[240px]"><div className="flex flex-wrap gap-1.5">{asStrings(employee.skills).slice(0, 2).map(skill => <Badge key={skill}>{skill}</Badge>)}{asStrings(employee.skills).length > 2 && <button onClick={() => openProfile(employee)} className="text-xs text-slate-500 hover:text-[#00684a]">+{employee.skills.length - 2}</button>}{!asStrings(employee.skills).length && <span className="text-xs text-slate-400">No skills listed</span>}</div></td>
                    <td><Badge tone={availabilityTone(employee.availability)} dot>{employee.availability || 'Unknown'}</Badge></td>
                    <td className="whitespace-nowrap text-slate-600">{employee.experienceYears || 0} {Number(employee.experienceYears) === 1 ? 'year' : 'years'}</td>
                    <td><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" icon={TrendingUp} onClick={() => generateRoadmap(employee)}>Roadmap</Button>{isManager && <Button variant="ghost" size="sm" icon={Edit3} aria-label={`Edit ${employee.name}`} onClick={() => openEdit(employee)} />}</div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4"><p className="text-xs text-slate-500">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} members{hasFilters ? ' matching your filters' : ''}</p><div className="flex items-center gap-3"><Button variant="secondary" size="sm" icon={ChevronLeft} aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} /><span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span><Button variant="secondary" size="sm" icon={ChevronRight} aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} /></div></div>
          </>
        ) : <EmptyState icon={hasFilters ? ListFilter : Users} title={hasFilters ? 'No matching team members' : error ? 'Directory unavailable' : 'No team members yet'} description={hasFilters ? 'Try a different name, skill, role, or availability.' : error ? 'Your team directory will appear when the server connection is restored.' : 'Team members will appear here when workforce records are available.'} action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : error ? <Button variant="secondary" icon={RefreshCw} onClick={fetchTalent}>Try again</Button> : null} />}
      </Card>

      <Modal open={!!profile} title={profile?.name || 'Member profile'} description="Member profile and skills" onClose={() => { if (!pendingAction) setProfileId(null); }} wide
        footer={<><Button variant="secondary" onClick={() => setProfileId(null)} disabled={!!pendingAction}>Close</Button><Button icon={TrendingUp} onClick={() => generateRoadmap(profile)} disabled={!!pendingAction}>Generate career roadmap</Button></>}>
        {profile && <div className="space-y-6">
          {profileError && <Notice tone="error">{profileError}</Notice>}
          <div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg font-medium text-[#00684a]">{initials(profile.name)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold text-slate-900">{profile.name}</h3><p className="mt-1 text-sm text-slate-500">{profile.role} · {profile.department || 'Engineering'}</p></div><Badge tone={availabilityTone(profile.availability)} dot>{profile.availability || 'Unknown'}</Badge></div><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Mail size={14} />{profile.email}</p></div></div>
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4"><div><p className="text-xs text-slate-500">Experience</p><p className="mt-1 text-sm font-medium text-slate-800">{profile.experienceYears || 0} years</p></div><div><p className="text-xs text-slate-500">Skills</p><p className="mt-1 text-sm font-medium text-slate-800">{asStrings(profile.skills).length} listed</p></div></div>
          <div><h4 className="mb-3 text-xs font-semibold text-slate-700">Current skills</h4><div className="flex flex-wrap gap-2">{asStrings(profile.skills).map(skill => <Badge key={skill}>{skill}</Badge>)}{!asStrings(profile.skills).length && <p className="text-sm text-slate-500">No skills have been added yet.</p>}</div></div>
          {isManager && <div className="border-t border-slate-200 pt-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Sparkles size={15} className="text-[#00825a]" /> Suggested next skills</h4><p className="mt-1 text-xs text-slate-500">Review AI suggestions before adding them to this member’s skills.</p></div><Button variant="secondary" size="sm" icon={pendingAction === 'analyze' ? Loader2 : Sparkles} disabled={!!pendingAction} onClick={() => analyzeSkills(profile)}>{pendingAction === 'analyze' ? 'Analyzing…' : 'Suggest skills'}</Button></div><div className="mt-4 flex flex-wrap gap-2">{asStrings(profile.aiSuggestedSkills).map(skill => <Button key={skill} variant="secondary" size="sm" icon={pendingAction === skill ? Loader2 : Plus} disabled={!!pendingAction} onClick={() => addSuggestedSkill(profile, skill)}>{skill}</Button>)}{!asStrings(profile.aiSuggestedSkills).length && <p className="text-xs text-slate-400">No pending skill suggestions.</p>}</div></div>}
          {isManager && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"><Button variant="secondary" size="sm" icon={Edit3} disabled={!!pendingAction} onClick={() => openEdit(profile)}>Edit member</Button><Button variant="ghost" size="sm" icon={Trash2} disabled={!!pendingAction} onClick={() => { setDeleteEmployee(profile); setDeleteError(''); setProfileId(null); }}>Remove member</Button></div>}
        </div>}
      </Modal>

      <Modal open={!!editEmployee} title="Edit team member" description="Keep the member’s profile, availability, and skills up to date." onClose={() => { if (!saving) setEditEmployee(null); }} wide
        footer={<><Button variant="secondary" onClick={() => setEditEmployee(null)} disabled={saving}>Cancel</Button><Button type="submit" form="edit-member-form" icon={saving ? Loader2 : Check} disabled={saving}>{saving ? 'Saving changes…' : 'Save changes'}</Button></>}>
        <form id="edit-member-form" onSubmit={saveEmployee} className="space-y-5">
          {editError && <Notice tone="error">{editError}</Notice>}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Full name<input className="mt-2 w-full" value={editForm.name || ''} required maxLength={200} onChange={event => setEditForm(previous => ({ ...previous, name: event.target.value }))} disabled={saving} /></label>
            <label className="text-xs font-semibold text-slate-700">Email address<input type="email" className="mt-2 w-full" value={editForm.email || ''} required onChange={event => setEditForm(previous => ({ ...previous, email: event.target.value }))} disabled={saving} /></label>
            <label className="text-xs font-semibold text-slate-700">Role<select className="mt-2 w-full" value={editForm.role || 'Developer'} onChange={event => setEditForm(previous => ({ ...previous, role: event.target.value }))} disabled={saving}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-700">Department<input className="mt-2 w-full" value={editForm.department || ''} onChange={event => setEditForm(previous => ({ ...previous, department: event.target.value }))} disabled={saving} /></label>
            <label className="text-xs font-semibold text-slate-700">Availability<select className="mt-2 w-full" value={editForm.availability || 'Available'} onChange={event => setEditForm(previous => ({ ...previous, availability: event.target.value }))} disabled={saving}>{availabilityOptions.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-700">Years of experience<input type="number" min="0" step="0.5" className="mt-2 w-full" value={editForm.experienceYears ?? 0} onChange={event => setEditForm(previous => ({ ...previous, experienceYears: event.target.value }))} disabled={saving} /></label>
          </div>
          <label className="block text-xs font-semibold text-slate-700">Skills<textarea rows={3} className="mt-2 w-full" value={editForm.skills || ''} placeholder="React, Node.js, MongoDB" onChange={event => setEditForm(previous => ({ ...previous, skills: event.target.value }))} disabled={saving} /><span className="mt-1.5 block text-xs font-normal text-slate-500">Separate each skill with a comma.</span></label>
        </form>
      </Modal>

      <Modal open={!!deleteEmployee} title="Remove team member" description="This permanently removes the member’s workforce record." onClose={() => { if (!deleting) setDeleteEmployee(null); }}
        footer={<><Button variant="secondary" onClick={() => setDeleteEmployee(null)} disabled={deleting}>Cancel</Button><Button variant="danger" icon={deleting ? Loader2 : Trash2} disabled={deleting} onClick={removeEmployee}>{deleting ? 'Removing…' : 'Remove member'}</Button></>}>
        <div className="space-y-4">{deleteError && <Notice tone="error">{deleteError}</Notice>}<p className="text-sm leading-6 text-slate-600">Remove <strong className="font-semibold text-slate-900">{deleteEmployee?.name}</strong> from the directory? Check any active project assignments before continuing.</p><Notice tone="warning">This action cannot be undone.</Notice></div>
      </Modal>

      <Modal open={!!roadmapEmployee} title={`${roadmapEmployee?.name || 'Member'}’s career roadmap`} description="An AI-generated development plan based on the member’s current skills." onClose={closeRoadmap} wide
        footer={<><Button variant="secondary" onClick={closeRoadmap}>Close roadmap</Button>{!generating && <Button icon={RefreshCw} onClick={() => generateRoadmap(roadmapEmployee)}>Regenerate roadmap</Button>}</>}>
        {generating ? <div className="py-10"><LoadingState label="Preparing a personalized development plan…" /></div> : roadmapError ? <Notice tone="error">{roadmapError}</Notice> : roadmap && <div className="space-y-6">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#00684a]"><Sparkles size={15} /> Development overview</div><p className="text-sm leading-6 text-slate-700">{roadmap.executiveSummary}</p></div>
          <div className="grid gap-5 sm:grid-cols-2">{[
            { title: 'Established strengths', Icon: TrendingUp, items: roadmap.strengths },
            { title: 'Growth opportunities', Icon: Target, items: roadmap.areasForImprovement },
          ].map(({ title, Icon, items }) => <div key={title} className="rounded-lg border border-slate-200 p-5"><h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon size={16} className="text-[#00825a]" />{title}</h4><ul className="space-y-3">{items.map((item, index) => <li key={index} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><Check size={13} className="mt-1 shrink-0 text-[#00825a]" />{item}</li>)}</ul></div>)}</div>
          <div><h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock3 size={16} className="text-[#00825a]" /> Recommended next steps</h4><ol className="space-y-3">{roadmap.actionPlan.map((item, index) => <li key={index} className="flex items-start gap-4 rounded-lg border border-slate-200 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{index + 1}</span><div><p className="text-xs font-semibold text-slate-800">{item.phase}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.action}</p></div><ArrowRight size={15} className="ml-auto mt-1 shrink-0 text-slate-300" /></li>)}</ol></div>
          <p className="border-t border-slate-200 pt-4 text-xs text-slate-400">Review this plan with the team member and adapt it to their interests and current responsibilities.</p>
        </div>}
      </Modal>
    </div>
  );
}
