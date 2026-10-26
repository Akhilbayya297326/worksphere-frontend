import React, { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Layers3, Leaf, Loader2, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import { Button, Notice } from './ui';

export default function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const handleSubmit = async event => {
    event.preventDefault();
    if (busy) return;
    setError(''); setBusy(true);
    try {
      const { data } = await API.post('/auth/login', { email: email.trim(), password });
      if (!data.success || !data.user) throw new Error(data.error || 'Unable to sign in. Please check your details.');
      onLogin(data.user);
    } catch (failure) {
      setError(failure.response?.data?.error || (failure.code === 'ERR_NETWORK' ? 'The workspace is unavailable. Please try again shortly.' : failure.message) || 'Unable to sign in.');
    } finally { setBusy(false); }
  };

  return (
    <div className="ws-auth">
      <section className="ws-auth-left">
        <div className="ws-brand"><span className="ws-logo"><Leaf size={29} strokeWidth={1.7} /></span>WorkSphere</div>
        <div className="ws-auth-form">
          <p className="ws-eyebrow">YOUR TEAM. ONE WORKSPACE.</p>
          <h1>Welcome back.</h1>
          <p>Sign in to your WorkSphere workspace.</p>
          {error && <div style={{ marginBottom: 20 }}><Notice tone="error">{error}</Notice></div>}
          <form onSubmit={handleSubmit}>
            <label className="ws-field" htmlFor="email"><span className="ws-field-label">Work email</span><input id="email" type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} /></label>
            <label className="ws-field" htmlFor="password"><span className="ws-field-label">Password</span><div className="ws-auth-password"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} /><button type="button" className="ws-icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            <Button type="submit" disabled={busy} style={{ width: '100%', marginTop: 5, minHeight: 42 }}>{busy ? <><Loader2 size={16} className="ws-spin" />Signing in…</> : <>Sign in to workspace <ArrowRight size={16} /></>}</Button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '25px 0 19px', color: '#a3afa7', fontSize: 10 }}><span style={{ height: 1, background: '#e1e7e2', flex: 1 }} />EXPLORING WORKSPHERE?<span style={{ height: 1, background: '#e1e7e2', flex: 1 }} /></div>
          <Button variant="secondary" disabled={busy} style={{ width: '100%', minHeight: 40 }} onClick={() => { setEmail('admin@worksphere.com'); setPassword('cisco2026'); setError(''); }}>Use demo account details</Button>
          <p style={{ fontSize: 10, textAlign: 'center', color: '#93a095', lineHeight: 1.8, margin: '12px 0 0' }}>The demo account must exist in your connected workspace.</p>
        </div>
        <footer className="ws-auth-footer"><span>© {new Date().getFullYear()} WorkSphere</span><span>A clearer way to work together.</span></footer>
      </section>
      <aside className="ws-auth-right" aria-label="About WorkSphere">
        <span style={{ color: '#a2d1b0', letterSpacing: '1.5px', fontSize: 10, fontWeight: 600, marginBottom: 22 }}>LESS FRICTION. MORE PROGRESS.</span>
        <h2>Bring your team.<br /><em>Move work forward.</em></h2>
        <p>Projects, people, and knowledge in one considered workspace. Everything your team needs, with room to focus.</p>
        <div className="ws-auth-preview" aria-label="Illustrative project board">
          <div className="ws-auth-preview-title"><span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Layers3 size={14} />Product workspace</span><span className="ws-badge ws-badge-green"><span className="ws-status-dot" />In progress</span></div>
          <div className="ws-preview-flow">
            <div className="ws-preview-column"><strong>PLANNING</strong><div className="ws-preview-task">Outline requirements<div className="ws-preview-line" /></div><div className="ws-preview-task">Plan next sprint<div className="ws-preview-line" /></div></div>
            <div className="ws-preview-column"><strong>IN PROGRESS</strong><div className="ws-preview-task">Build the experience<div className="ws-preview-line" /></div></div>
            <div className="ws-preview-column"><strong>COMPLETED</strong><div className="ws-preview-task"><Check size={10} style={{ color: '#198651', display: 'inline', marginRight: 3 }} />Connect the team<div className="ws-preview-line" /></div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, color: '#819589', fontSize: 9 }}><span style={{ display: 'inline-flex', gap: 3 }}>{['A', 'P', 'S'].map(initial => <span key={initial} style={{ width: 19, height: 19, borderRadius: '50%', background: '#e5f0e7', color: '#5f866a', display: 'grid', placeItems: 'center', fontSize: 8 }}>{initial}</span>)}</span>Your team, working together<span style={{ marginLeft: 'auto' }}>Illustrative workspace</span></div>
        </div>
        <div className="ws-auth-note"><ShieldCheck size={17} /><span>One home for projects, people, and shared knowledge.</span></div>
      </aside>
    </div>
  );
}
