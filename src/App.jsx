import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bell, Blocks, BookOpen, Brain, Briefcase, ChevronDown, ChevronRight, CircleHelp, Command, LayoutDashboard, Leaf, LogOut, Menu, MessageSquare, Plus, Search, TrendingUp, Users } from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import Overview from './components/Overview';
import PageErrorBoundary from './components/PageErrorBoundary';
import { Badge, Button, EmptyState, LoadingState, Modal } from './components/ui';
import { useApp } from './context/AppContext';
import { getNavigationRole } from './services/roles';

const Dashboard = lazy(() => import('./components/Dashboard'));
const UnifiedWorkspace = lazy(() => import('./components/UnifiedWorkspace'));
const ProjectDocs = lazy(() => import('./components/ProjectDocs'));
const IntegrationsHub = lazy(() => import('./components/IntegrationsHub'));
const ChatHub = lazy(() => import('./components/ChatHub'));
const KnowledgeCopilot = lazy(() => import('./components/KnowledgeCopilot'));
const TalentMatrix = lazy(() => import('./components/TalentMatrix'));
const ExecutiveROI = lazy(() => import('./components/ExecutiveROI'));

const sharedRoles = ['Manager', 'Developer', 'QA Tester'];
const pages = [
  { id: 'Overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace', roles: sharedRoles },
  { id: 'UnifiedWorkspace', label: 'Projects', icon: Briefcase, roles: sharedRoles },
  { id: 'TalentMatrix', label: 'People', icon: Users, roles: sharedRoles },
  { id: 'ProjectDocs', label: 'Documents', icon: BookOpen, roles: sharedRoles },
  { id: 'ChatHub', label: 'Messages', icon: MessageSquare, roles: sharedRoles },
  { id: 'KnowledgeCopilot', label: 'AI assistant', icon: Brain, group: 'Tools & insights', roles: sharedRoles },
  { id: 'IntegrationsHub', label: 'Integrations', icon: Blocks, roles: sharedRoles },
  { id: 'ExecutiveROI', label: 'Insights', icon: TrendingUp, roles: ['Manager'] },
];

export default function App() {
  const { user, setUser, isConnected, chatMessages } = useApp();
  const [view, setView] = useState('Overview');
  const [selectedProject, setSelectedProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [popover, setPopover] = useState('');
  const popoverRoot = useRef(null);
  const workspaceRoot = useRef(null);
  const sidebarRoot = useRef(null);
  const menuTrigger = useRef(null);
  const mainRoot = useRef(null);
  const role = getNavigationRole(user?.role);
  const allowed = pages.filter(page => page.roles.includes(role));

  useEffect(() => {
    const handleKey = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && user) {
        event.preventDefault(); setSearchOpen(value => !value);
      }
      if (event.key === 'Escape') { setSidebarOpen(false); setPopover(''); }
    };
    const outside = event => { if (!popoverRoot.current?.contains(event.target) && !workspaceRoot.current?.contains(event.target)) setPopover(''); };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('pointerdown', outside); };
  }, [user]);

  useEffect(() => {
    mainRoot.current?.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const root = sidebarRoot.current;
    const trigger = menuTrigger.current;
    const focusable = () => [...root.querySelectorAll('button:not([disabled]), a[href]')];
    const focusFrame = requestAnimationFrame(() => focusable()[0]?.focus());
    const handleTab = event => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 701px)');
    const closeOnDesktop = event => { if (event.matches) setSidebarOpen(false); };
    root.addEventListener('keydown', handleTab);
    desktop.addEventListener('change', closeOnDesktop);
    return () => { cancelAnimationFrame(focusFrame); root.removeEventListener('keydown', handleTab); desktop.removeEventListener('change', closeOnDesktop); trigger?.focus(); };
  }, [sidebarOpen]);

  const navigate = next => {
    if (next !== 'Dashboard' && !allowed.some(page => page.id === next)) return;
    if (next === 'Dashboard' && role !== 'Manager') return;
    setView(next); setSidebarOpen(false); setSearchOpen(false); setPopover('');
  };
  const openProject = project => { setSelectedProject(project); navigate('UnifiedWorkspace'); };
  if (!user) return <AuthScreen onLogin={next => { setUser(next); setView('Overview'); }} />;

  const currentPage = view === 'Dashboard' ? 'Create project' : pages.find(page => page.id === view)?.label || 'Overview';
  const matching = [...allowed, ...(role === 'Manager' ? [{ id: 'Dashboard', label: 'Create project', icon: Plus }] : [])].filter(page => page.label.toLowerCase().includes(search.toLowerCase()));
  const recent = [...chatMessages].reverse().slice(0, 4);
  const renderPage = () => {
    switch (view) {
      case 'Dashboard': return <Dashboard currentUser={user} onOpenProject={openProject} />;
      case 'UnifiedWorkspace': return <UnifiedWorkspace key={selectedProject?._id || 'projects'} project={selectedProject} currentUser={user} />;
      case 'TalentMatrix': return <TalentMatrix currentUserRole={user.role} />;
      case 'ProjectDocs': return <ProjectDocs currentUser={user} />;
      case 'ChatHub': return <ChatHub currentUser={user} />;
      case 'KnowledgeCopilot': return <KnowledgeCopilot />;
      case 'IntegrationsHub': return <IntegrationsHub currentUser={user} />;
      case 'ExecutiveROI': return <ExecutiveROI />;
      default: return <Overview onNavigate={navigate} onOpenProject={openProject} />;
    }
  };

  return (
    <div className="ws-app">
      <a href="#main-content" className="ws-skip-link">Skip to content</a>
      {sidebarOpen && <button className="ws-mobile-overlay open" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside ref={sidebarRoot} className={'ws-sidebar' + (sidebarOpen ? ' open' : '')} aria-label="Main navigation">
        <div className="ws-sidebar-brand"><button className="ws-brand" style={{ border: 0, background: 'transparent', padding: 0 }} onClick={() => navigate('Overview')} aria-label="WorkSphere home"><span className="ws-logo"><Leaf size={29} strokeWidth={1.7} /></span>WorkSphere<small>CONSOLE</small></button></div>
        <div className="ws-workspace-switch" ref={workspaceRoot}>
          <button className="ws-workspace-button" onClick={() => setPopover(popover === 'workspace' ? '' : 'workspace')} aria-expanded={popover === 'workspace'}><span className="ws-avatar">WS</span><span style={{ flex: 1 }}><span className="ws-workspace-label">ORGANIZATION</span><span className="ws-workspace-name">My workspace</span></span><ChevronDown size={13} color="#789183" /></button>
          {popover === 'workspace' && <div className="ws-popover" style={{ left: 14, right: 'auto', top: 83, width: 250 }}><h3>WorkSphere workspace</h3><p>A shared place for your projects, team, and documents.</p><p>Signed in as <strong>{user.email}</strong></p></div>}
        </div>
        <nav className="ws-nav">
          {allowed.map(page => { const Icon = page.icon; return <React.Fragment key={page.id}>{page.group && <div className="ws-nav-group">{page.group}</div>}<button className={'ws-nav-button' + (view === page.id ? ' active' : '')} onClick={() => { if (page.id === 'UnifiedWorkspace') setSelectedProject(null); navigate(page.id); }} aria-current={view === page.id ? 'page' : undefined}><Icon size={17} strokeWidth={1.65} /><span>{page.label}</span>{page.id === 'KnowledgeCopilot' && <span className="ws-nav-counter">AI</span>}</button></React.Fragment>; })}
        </nav>
        <div style={{ padding: '12px 20px 18px', fontSize: 10, color: '#8a9a8e', lineHeight: 1.8 }}>Built for clearer work.<br /><span style={{ color: '#a3b0a7' }}>WorkSphere workspace console</span></div>
        <div className="ws-sidebar-footer"><span className="ws-avatar">{user.name?.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div className="ws-user-info"><strong>{user.name}</strong><small>{user.role}</small></div><button className="ws-icon-button" onClick={() => { setUser(null); setSelectedProject(null); setView('Overview'); }} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></div>
      </aside>
      <div className="ws-main" inert={sidebarOpen ? true : undefined}>
        <header className="ws-topbar">
          <div className="ws-breadcrumb"><button ref={menuTrigger} className="ws-icon-button ws-mobile-menu" aria-label="Open navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span>My workspace</span><ChevronRight size={12} /><strong>{currentPage}</strong></div>
          <div className="ws-topbar-actions" ref={popoverRoot}>
            <button className="ws-search-trigger" onClick={() => { setSearch(''); setSearchOpen(true); }} aria-label="Search pages"><Search size={14} /><span>Find a page…</span><kbd>Ctrl K</kbd></button>
            <span className="ws-topbar-status"><Badge dot tone={isConnected ? 'green' : 'amber'}>{isConnected ? 'Connected' : 'Connecting'}</Badge></span>
            <button className="ws-icon-button ws-topbar-help" aria-label="Workspace help" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /></button>
            <div style={{ position: 'relative' }}><button className="ws-icon-button" aria-label="Recent activity" aria-expanded={popover === 'activity'} onClick={() => setPopover(popover === 'activity' ? '' : 'activity')}><Bell size={18} /></button>{popover === 'activity' && <div className="ws-popover"><h3>Recent activity</h3>{recent.length ? recent.map((message, index) => <div className="ws-activity-item" key={message._id || message.clientId || index}><strong>{message.author}</strong><p>{message.text.slice(0, 130)}{message.text.length > 130 ? '…' : ''}</p></div>) : <p>No recent messages. Team activity will appear here.</p>}<button className="ws-link" style={{ marginTop: 12, fontSize: 11 }} onClick={() => navigate('ChatHub')}>Open messages <ArrowUpRight size={12} style={{ display: 'inline' }} /></button></div>}</div>
          </div>
        </header>
        <main ref={mainRoot} id="main-content" className="ws-content" tabIndex={-1}><PageErrorBoundary key={view + (selectedProject?._id || '')}><Suspense fallback={<LoadingState label="Opening page…" />}>{renderPage()}</Suspense></PageErrorBoundary></main>
      </div>
      <Modal open={searchOpen} title="Find a page" description="Move through your workspace without leaving the keyboard." onClose={() => setSearchOpen(false)}>
        <label className="ws-field"><span className="sr-only">Search workspace pages</span><input data-autofocus autoComplete="off" placeholder="Search projects, people, documents…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div style={{ marginTop: 14 }}>{matching.map(page => { const Icon = page.icon; return <button className="ws-search-result" key={page.id} onClick={() => navigate(page.id)}><Icon size={16} />{page.label}<ChevronRight size={13} style={{ marginLeft: 'auto' }} /></button>; })}{!matching.length && <EmptyState icon={Search} title="No pages found" description="Try a different page name." />}</div>
      </Modal>
      <Modal open={helpOpen} title="Your workspace, at a glance" onClose={() => setHelpOpen(false)} footer={<Button onClick={() => setHelpOpen(false)}>Got it</Button>}>
        <div className="space-y-5 text-sm text-slate-600"><p>Use <strong>Projects</strong> to manage tasks, <strong>People</strong> to find skills, and <strong>Documents</strong> to keep project files together.</p><p><Command size={15} style={{ display: 'inline', marginRight: 7 }} />Press <strong>Ctrl K</strong> or <strong>⌘ K</strong> to find a page.</p><p><MessageSquare size={15} style={{ display: 'inline', marginRight: 7 }} /><strong>Messages</strong> brings team conversations and project updates into one place.</p><p>Connection status shows whether live updates are available. Saved data loads from your connected project backend.</p></div>
      </Modal>
    </div>
  );
}
