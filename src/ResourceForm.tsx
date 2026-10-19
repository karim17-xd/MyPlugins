import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { PRIORITIES, RESOURCE_TYPES, STATUSES } from './types';
import type { Priority, Resource, ResourceInput, ResourceType, Status } from './types';
import { useStore } from './store';
import { normKey, normalizeUrl } from './lib';
import { Modal } from './ui';

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}{error && <span role="alert" className="mt-1 block text-xs text-danger">{error}</span>}</label>
);

export function ResourceForm({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const { data, saveResource, notify } = useStore();
  const [f, setF] = useState<ResourceInput>(() => resource ?? { title: '', url: '', description: '', type: 'Website', categoryId: null, learningPathIds: [], tags: [], notes: '', status: null, priority: null, isFavorite: false, isPinned: false });
  const [tag, setTag] = useState('');
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});
  const set = <K extends keyof ResourceInput>(k: K, v: ResourceInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, '');
    if (t && !f.tags.includes(t)) set('tags', [...f.tags, t]);
    setTag('');
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const url = normalizeUrl(f.url);
    if (!f.title.trim()) errs.title = 'Enter a title.';
    if (!f.url.trim()) errs.url = 'Enter a URL.';
    else if (!url) errs.url = 'Enter a valid web address starting with http:// or https://.';
    else {
      const dup = data.resources.find((r) => r.id !== resource?.id && normKey(r.url) === normKey(url));
      if (dup) errs.url = `Already saved as “${dup.title}”.`;
    }
    setErrors(errs);
    if (errs.title || errs.url || !url) return;
    const pending = tag.trim().toLowerCase().replace(/^#/, '');
    saveResource({ ...f, url, title: f.title.trim(), description: f.description.trim(), tags: pending && !f.tags.includes(pending) ? [...f.tags, pending] : f.tags }, resource?.id);
    notify(resource ? 'Changes saved' : 'Resource added');
    onClose();
  };

  return (
    <Modal title={resource ? 'Edit resource' : 'Add resource'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *" error={errors.title}><input className="field" value={f.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} /></Field>
          <Field label="URL *" error={errors.url}><input className="field" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" inputMode="url" aria-invalid={!!errors.url} /></Field>
        </div>
        <Field label="Short description"><textarea className="field" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type"><select className="field" value={f.type} onChange={(e) => set('type', e.target.value as ResourceType)}>{RESOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Category"><select className="field" value={f.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}><option value="">No category</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Learning status"><select className="field" value={f.status ?? ''} onChange={(e) => set('status', (e.target.value || null) as Status | null)}><option value="">Not set</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Priority"><select className="field" value={f.priority ?? ''} onChange={(e) => set('priority', (e.target.value || null) as Priority | null)}><option value="">Not set</option>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        {data.paths.length > 0 && (
          <fieldset><legend className="mb-1 text-sm font-medium">Learning paths</legend>
            <div className="flex flex-wrap gap-2">{data.paths.map((p) => {
              const on = f.learningPathIds.includes(p.id);
              return <label key={p.id} className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs ${on ? 'border-accent text-accent' : 'border-line text-muted'}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => set('learningPathIds', on ? f.learningPathIds.filter((i) => i !== p.id) : [...f.learningPathIds, p.id])} />{p.name}</label>;
            })}</div>
          </fieldset>
        )}
        <Field label="Tags">
          <div className="field flex flex-wrap items-center gap-1.5">
            {f.tags.map((t) => <span key={t} className="chip">#{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => set('tags', f.tags.filter((x) => x !== t))}><X size={12} /></button></span>)}
            <input className="min-w-[8ch] flex-1 bg-transparent outline-none" value={tag} placeholder="Type a tag, press Enter"
              onChange={(e) => (e.target.value.endsWith(',') ? addTag(e.target.value.slice(0, -1)) : setTag(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tag); } else if (e.key === 'Backspace' && !tag && f.tags.length) set('tags', f.tags.slice(0, -1)); }} />
          </div>
        </Field>
        <Field label="Personal notes"><textarea className="field" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <div className="flex gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.isFavorite} onChange={(e) => set('isFavorite', e.target.checked)} />Favorite</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.isPinned} onChange={(e) => set('isPinned', e.target.checked)} />Pinned</label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{resource ? 'Save changes' : 'Add resource'}</button>
        </div>
      </form>
    </Modal>
  );
}
