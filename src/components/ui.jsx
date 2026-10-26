import React, { useEffect, useId, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

export function Button({ children, variant = 'primary', size = 'md', icon: Icon, className = '', type = 'button', ...props }) {
  return <button type={type} className={`ws-button ws-button-${variant} ws-button-${size} ${className}`} {...props}>{Icon && <Icon size={16} aria-hidden="true" />}{children}</button>;
}

export function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return <span className={`ws-badge ws-badge-${tone} ${className}`}>{dot && <span className="ws-status-dot" />}{children}</span>;
}

export function Card({ children, className = '', ...props }) {
  return <section className={`ws-card ${className}`} {...props}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return <div className="ws-page-header"><div>{eyebrow && <p className="ws-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="ws-page-description">{description}</p>}{children}</div>{actions && <div className="ws-page-actions">{actions}</div>}</div>;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="ws-empty">{Icon && <span className="ws-empty-icon"><Icon size={25} strokeWidth={1.5} /></span>}<h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}

export function LoadingState({ label = 'Loading workspace…' }) {
  return <div className="ws-loading" role="status"><Loader2 size={20} className="ws-spin" /><span>{label}</span></div>;
}

export function Notice({ children, tone = 'info', onDismiss }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' || tone === 'warning' ? AlertCircle : Info;
  return <div className={`ws-notice ws-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon size={17} className="shrink-0" /><div>{children}</div>{onDismiss && <button className="ws-icon-button" aria-label="Dismiss message" onClick={onDismiss}><X size={15} /></button>}</div>;
}

export function Stat({ label, value, description, icon: Icon }) {
  return <Card className="ws-stat"><div className="ws-stat-label">{label}{Icon && <Icon size={17} />}</div><strong>{value}</strong>{description && <p>{description}</p>}</Card>;
}

export function Modal({ open, title, description, onClose, children, footer, wide = false }) {
  const titleId = useId();
  const dialog = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const root = dialog.current;
    const focusable = () => [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')];
    (root.querySelector('[data-autofocus]') || focusable()[0] || root).focus();
    const handleKey = event => {
      if (event.key === 'Escape') close.current?.();
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return <div className="ws-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}><section ref={dialog} className={`ws-modal ${wide ? 'ws-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><header><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><button className="ws-icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header><div className="ws-modal-body">{children}</div>{footer && <footer>{footer}</footer>}</section></div>;
}
