import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Download, Pencil, Plus, SearchX, Trash2, Upload } from 'lucide-react';
import { PRIORITIES, RESOURCE_TYPES, SORTS, STATUSES } from './types';
import type { AppData, Nav, Resource, SortKey, TaxonKind } from './types';
import { useStore } from './store';
import { COLORS, validateData } from './storage';
import { filterResources, sortResources, type Filters } from './lib';
import { ResourceCard } from './ResourceCard';
import { Confirm, IconBtn, Modal } from './ui';

export interface Actions { onEdit: (r: Resource) => void; onDelete: (r: Resource) => void; onAdd: () => void }

const Heading = ({ children, aside }: { children: ReactNode; aside?: ReactNode }) => (
  <div className="mb-3 flex items-center justify-between gap-3"><h1 className="text-lg font-semibold">{children}</h1>{aside}</div>
);

export function Cards({ list, view, ...a }: { list: Resource[]; view: 'grid' | 'list' } & Pick<Actions, 'onEdit' | 'onDelete'>) {
  const { data } = useStore();
  return (
    <div className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'}>
      {list.map((r) => <ResourceCard key={r.id} r={r} view={view} compact={data.settings.compact} onEdit={a.onEdit} onDelete={a.onDelete} />)}
    </div>
  );
}

export function ResourceList({ base, title, q, defaultSort, initial, canFilterArchived, emptyHint, ...a }: {
  base: Resource[]; title: string; q: string; defaultSort?: SortKey; initial?: { path?: string; category?: string }; canFilterArchived?: boolean; emptyHint: string;
} & Actions) {
  const { data } = useStore();
  const [f, setF] = useState<Filters>({ type: '', category: initial?.category ?? '', path: initial?.path ?? '', status: '', priority: '', favorite: false, archived: canFilterArchived ? 'active' : 'all' });
  const [sort, setSort] = useState<SortKey>(defaultSort ?? data.settings.sort);
  const shown = useMemo(() => sortResources(filterResources(base, q, f, data), sort), [base, q, f, data, sort]);
  const active = f.type || f.category || f.path || f.status || f.priority || f.favorite || (canFilterArchived && f.archived !== 'active') || q.trim();
  const sel = (label: string, key: keyof Filters, opts: [string, string][]) => (
    <select aria-label={label} className="field w-auto py-1.5" value={String(f[key])} onChange={(e) => setF({ ...f, [key]: e.target.value })}>
      <option value="">{label}</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  return (
    <div>
      <Heading aside={<span className="text-sm text-muted">{shown.length} of {base.length}</span>}>{title}</Heading>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {sel('Type', 'type', RESOURCE_TYPES.map((t) => [t, t]))}
        {sel('Category', 'category', data.categories.map((c) => [c.id, c.name]))}
        {sel('Learning path', 'path', data.paths.map((c) => [c.id, c.name]))}
        {sel('Status', 'status', STATUSES.map((t) => [t, t]))}
        {sel('Priority', 'priority', PRIORITIES.map((t) => [t, t]))}
        {canFilterArchived && (
          <select aria-label="Archived status" className="field w-auto py-1.5" value={f.archived} onChange={(e) => setF({ ...f, archived: e.target.value as Filters['archived'] })}>
            <option value="active">Active</option><option value="archived">Archived</option><option value="all">Active + archived</option>
          </select>
        )}
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={f.favorite} onChange={(e) => setF({ ...f, favorite: e.target.checked })} />Favorites only</label>
        <select aria-label="Sort by" className="field ml-auto w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {shown.length ? <Cards list={shown} view={data.settings.view} onEdit={a.onEdit} onDelete={a.onDelete} /> : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-16 text-center">
          <SearchX size={28} className="text-muted" />
          <p className="font-medium">{active ? 'No resources match your search and filters' : 'No resources yet'}</p>
          <p className="max-w-sm text-sm text-muted">{active ? 'Try different words or clear a filter.' : emptyHint}</p>
          {active
            ? <button className="btn" onClick={() => setF({ type: '', category: '', path: '', status: '', priority: '', favorite: false, archived: canFilterArchived ? 'active' : 'all' })}>Clear filters</button>
            : <button className="btn btn-primary" onClick={a.onAdd}><Plus size={16} />{data.resources.length === 0 ? 'Add Your First Resource' : 'Add resource'}</button>}
        </div>
      )}
    </div>
  );
}

export function Dashboard({ go, ...a }: { go: (n: Nav) => void } & Actions) {
  const { data } = useStore();
  const live = data.resources.filter((r) => !r.archivedAt);
  const pinned = live.filter((r) => r.isPinned);
  const added = sortResources(live, 'added').slice(0, 4);
  const opened = sortResources(live.filter((r) => r.lastOpenedAt), 'opened').slice(0, 4);
  const stats: [string, number][] = [['Resources', live.length], ['Categories', data.categories.length], ['Favorites', live.filter((r) => r.isFavorite).length], ['Learning paths', data.paths.length]];
  const sec = (t: string, list: Resource[], empty: string, view: 'grid' | 'list' = 'list') => (
    <section className="mb-8"><h2 className="mb-2 text-sm font-semibold text-muted">{t}</h2>
      {list.length ? <Cards list={list} view={view} onEdit={a.onEdit} onDelete={a.onDelete} /> : <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">{empty}</p>}
    </section>
  );
  return (
    <div>
      <Heading>Dashboard</Heading>
      <dl className="mb-8 grid grid-cols-2 gap-x-8 gap-y-3 border-b border-line pb-6 sm:flex">
        {stats.map(([l, n]) => <div key={l}><dd className="text-3xl font-semibold tabular-nums">{n}</dd><dt className="text-sm text-muted">{l}</dt></div>)}
      </dl>
      {live.length === 0 && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <p className="font-medium">Your library is empty</p>
          <p className="max-w-sm text-sm text-muted">Save websites, documentation, tools, and courses you want to keep track of.</p>
          <button className="btn btn-primary" onClick={a.onAdd}><Plus size={16} />Add Your First Resource</button>
        </div>
      )}
      {sec('Pinned', pinned, 'Pin a resource from its ⋯ menu to keep it here.', 'grid')}
      <div className="grid gap-x-8 lg:grid-cols-2">{sec('Recently added', added, 'No resources yet.')}{sec('Recently opened', opened, 'Open a resource and it appears here.')}</div>
      <section><h2 className="mb-2 text-sm font-semibold text-muted">By learning path</h2>
        {data.paths.length ? (
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
            {data.paths.map((p) => {
              const n = live.filter((r) => r.learningPathIds.includes(p.id)).length;
              return <li key={p.id}><button className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-raised" onClick={() => go({ k: 'all', path: p.id })}>
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span><span className="tabular-nums text-muted">{n}</span></button></li>;
            })}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line p-4 text-sm text-muted">
            <span>No learning paths created yet.</span>
            <button className="btn py-1" onClick={() => go({ k: 'manage' })}><Plus size={14} />Create learning path</button>
          </div>
        )}
      </section>
    </div>
  );
}

function TaxonModal({ kind, id, onClose }: { kind: TaxonKind; id?: string; onClose: () => void }) {
  const { data, saveTaxon } = useStore();
  const cur = id ? data[kind].find((t) => t.id === id) : undefined;
  const [name, setName] = useState(cur?.name ?? ''); const [description, setDescription] = useState(cur?.description ?? ''); const [color, setColor] = useState(cur?.color ?? COLORS[0]);
  const [err, setErr] = useState('');
  const word = kind === 'categories' ? 'category' : 'learning path';
  return (
    <Modal title={`${id ? 'Edit' : 'New'} ${word}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setErr('Enter a name.');
        if (data[kind].some((t) => t.id !== id && t.name.toLowerCase() === name.trim().toLowerCase())) return setErr(`A ${word} with this name already exists.`);
        saveTaxon(kind, { name: name.trim(), description: description.trim(), color }, id); onClose();
      }}>
        <label className="block text-sm font-medium">Name<input className="field mt-1 font-normal" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} />{err && <span role="alert" className="mt-1 block text-xs text-danger">{err}</span>}</label>
        <label className="block text-sm font-medium">Description<input className="field mt-1 font-normal" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div role="radiogroup" aria-label="Color" className="flex gap-2">{COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={c === color} aria-label={c} onClick={() => setColor(c)} className="h-6 w-6 rounded-full border-2" style={{ background: c, borderColor: c === color ? 'rgb(var(--fg))' : 'transparent' }} />)}</div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary">Save</button></div>
      </form>
    </Modal>
  );
}

export function Manage() {
  const { data, deleteTaxon } = useStore();
  const [edit, setEdit] = useState<{ kind: TaxonKind; id?: string } | null>(null);
  const [del, setDel] = useState<{ kind: TaxonKind; id: string; name: string } | null>(null);
  const block = (kind: TaxonKind, title: string, singular: string) => (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold text-muted">{title}</h2><button className="btn py-1" onClick={() => setEdit({ kind })}><Plus size={14} />Add {singular}</button></div>
      {data[kind].length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line p-4 text-sm text-muted">
          <span>No {title.toLowerCase()} yet.</span>
          <button className="btn py-1" onClick={() => setEdit({ kind })}><Plus size={14} />Create your first {singular}</button>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {data[kind].map((t) => {
            const n = data.resources.filter((r) => (kind === 'categories' ? r.categoryId === t.id : r.learningPathIds.includes(t.id))).length;
            return <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} /><span className="flex-1 truncate">{t.name}{t.description && <span className="ml-2 text-muted">{t.description}</span>}</span><span className="tabular-nums text-muted">{n}</span>
              <IconBtn label={`Rename ${t.name}`} onClick={() => setEdit({ kind, id: t.id })}><Pencil size={15} /></IconBtn><IconBtn label={`Delete ${t.name}`} onClick={() => setDel({ kind, id: t.id, name: t.name })}><Trash2 size={15} /></IconBtn></li>;
          })}
        </ul>
      )}
    </section>
  );
  return (
    <div><Heading>Manage categories</Heading>{block('categories', 'Categories', 'category')}{block('paths', 'Learning paths', 'learning path')}
      {edit && <TaxonModal {...edit} onClose={() => setEdit(null)} />}
      {del && <Confirm title={`Delete “${del.name}”?`} message="Resources keep their data; they just lose this label." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { deleteTaxon(del.kind, del.id); setDel(null); }} />}
    </div>
  );
}

export function SettingsView() {
  const { data, setSettings, replaceAll, resetAll, notify } = useStore();
  const { settings: s } = data;
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);
  const [confirm, setConfirm] = useState<'reset' | null>(null);
  const [err, setErr] = useState('');
  const doExport = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `my-plugins-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const doImport = async (f: File | undefined) => {
    if (!f) return; setErr('');
    try { const v = validateData(JSON.parse(await f.text())); v ? setPending(v) : setErr('This file is not a valid My pLugins export.'); } catch { setErr('This file is not valid JSON.'); }
    if (file.current) file.current.value = '';
  };
  const row = (label: string, ctl: ReactNode) => <div className="flex items-center justify-between gap-4 py-3"><span className="text-sm">{label}</span>{ctl}</div>;
  return (
    <div className="max-w-2xl"><Heading>Settings</Heading>
      <section className="divide-y divide-line border-y border-line">
        {row('Theme', <select aria-label="Theme" className="field w-auto" value={s.theme} onChange={(e) => setSettings({ theme: e.target.value as 'dark' | 'light' })}><option value="dark">Dark</option><option value="light">Light</option></select>)}
        {row('Default layout', <select aria-label="Default layout" className="field w-auto" value={s.view} onChange={(e) => setSettings({ view: e.target.value as 'grid' | 'list' })}><option value="grid">Grid</option><option value="list">List</option></select>)}
        {row('Default sorting', <select aria-label="Default sorting" className="field w-auto" value={s.sort} onChange={(e) => setSettings({ sort: e.target.value as SortKey })}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>)}
        {row('Compact cards (hide descriptions)', <input type="checkbox" aria-label="Compact cards" checked={s.compact} onChange={(e) => setSettings({ compact: e.target.checked })} />)}
      </section>
      <h2 className="mb-2 mt-8 text-sm font-semibold text-muted">Your data</h2>
      <p className="mb-3 text-sm text-muted">Data lives in this browser’s LocalStorage only. It is not synced; export a backup to move it to another browser or device.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={doExport}><Download size={16} />Export JSON</button>
        <button className="btn" onClick={() => file.current?.click()}><Upload size={16} />Import JSON</button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
        <button className="btn border-danger text-danger" onClick={() => setConfirm('reset')}>Reset all data</button>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
      {pending && <Confirm danger={false} title="Replace current data?" message={`Importing will replace everything with ${pending.resources.length} resources, ${pending.categories.length} categories and ${pending.collections.length} collections from the file.`} confirmLabel="Replace data" onCancel={() => setPending(null)} onConfirm={() => { replaceAll(pending); setPending(null); notify('Data imported'); }} />}
      {confirm === 'reset' && <Confirm title="Reset all data?" requireText="RESET" message="This permanently deletes every resource, collection and custom category in this browser. Export a backup first if unsure." confirmLabel="Reset everything" onCancel={() => setConfirm(null)} onConfirm={() => { resetAll(); setConfirm(null); notify('All data reset'); }} />}
    </div>
  );
}
