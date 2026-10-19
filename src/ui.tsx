import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Globe, MoreHorizontal, X } from 'lucide-react';
import { cn, originOf } from './lib';

export function IconBtn({ label, active, className, children, ...p }: { label: string; active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" aria-label={label} title={label} className={cn('rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg', active && 'text-accent', className)} {...p}>{children}</button>;
}

export function Favicon({ url, size = 20 }: { url: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const o = originOf(url);
  return failed || !o
    ? <Globe size={size} className="shrink-0 text-muted" aria-hidden />
    : <img src={`${o}/favicon.ico`} width={size} height={size} alt="" loading="lazy" onError={() => setFailed(true)} className="shrink-0 rounded-sm" />;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button.btn-primary,button.btn-danger')?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('keydown', k); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-line bg-panel shadow-xl sm:rounded-xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconBtn label="Close dialog" onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmLabel, onConfirm, onCancel, requireText, danger = true }: { title: string; message: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; requireText?: string; danger?: boolean }) {
  const [typed, setTyped] = useState('');
  const ok = !requireText || typed === requireText;
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-4 text-sm text-muted">
        <div>{message}</div>
        {requireText && <label className="block">Type <b className="text-fg">{requireText}</b> to continue<input className="field mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} /></label>}
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className={cn('btn', danger ? 'btn-danger' : 'btn-primary')} disabled={!ok} onClick={onConfirm} style={ok ? undefined : { opacity: 0.5 }}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

export interface MenuItem { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void }
export function Menu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <IconBtn label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><MoreHorizontal size={16} /></IconBtn>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-line bg-panel py-1 shadow-xl">
          {items.map((it) => (
            <button key={it.label} role="menuitem" className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-raised', it.danger && 'text-danger')} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon}<span className="truncate">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
