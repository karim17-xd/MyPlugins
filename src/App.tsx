import { useMemo, useState, type ReactNode } from 'react';
import { Archive, Clock, FolderPlus, History, LayoutDashboard, Library, LayoutGrid, List, Menu as MenuIcon, Moon, Pencil, Plus, Search, Settings, Star, Sun, Tags, Trash2, X } from 'lucide-react';
import type { Collection, Nav, Resource } from './types';
import { useStore } from './store';
import { cn } from './lib';
import { Confirm, IconBtn, Modal } from './ui';
import { ResourceForm } from './ResourceForm';
import { Dashboard, Manage, ResourceList, SettingsView } from './Views';

function NameModal({ title, initial, onSave, onClose }: { title: string; initial: string; onSave: (n: string) => void; onClose: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <Modal title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onSave(v.trim()); onClose(); } }}>
        <label className="block text-sm font-medium">Name<input className="field mt-1" value={v} onChange={(e) => setV(e.target.value)} /></label>
        <div className="flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!v.trim()} style={v.trim() ? undefined : { opacity: 0.5 }}>Save</button></div>
      </form>
    </Modal>
  );
}

export default function App() {
  const { data, toast, setSettings, saveCollection, deleteCollection, deleteResource } = useStore();
  const [nav, setNav] = useState<Nav>({ k: 'dashboard' });
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [collModal, setCollModal] = useState<{ id?: string; name: string } | null>(null);
  const [delColl, setDelColl] = useState<Collection | null>(null);
  const { settings } = data;
  const go = (n: Nav) => { setNav(n); setDrawer(false); };
  const searching = q.trim() !== '' && ['dashboard', 'manage', 'settings'].includes(nav.k);
  const cur: Nav = searching ? { k: 'all' } : nav;
  const actions = { onEdit: (r: Resource) => setEditing(r), onDelete: (r: Resource) => setDeleting(r), onAdd: () => setEditing('new') };

  const base = useMemo(() => {
    const rs = data.resources, live = rs.filter((r) => !r.archivedAt);
    switch (cur.k) {
      case 'favorites': return live.filter((r) => r.isFavorite);
      case 'opened': return live.filter((r) => r.lastOpenedAt);
      case 'archived': return rs.filter((r) => r.archivedAt);
      case 'collection': { const c = data.collections.find((x) => x.id === cur.id); return live.filter((r) => c?.resourceIds.includes(r.id)); }
      case 'added': return live;
      default: return rs;
    }
  }, [data, cur]);

  const item = (n: Nav, label: string, icon: ReactNode, count?: number) => {
    const on = !searching && JSON.stringify(nav) === JSON.stringify(n);
    return <button key={label} onClick={() => go(n)} aria-current={on ? 'page' : undefined} className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors', on ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg')}>{icon}<span className="flex-1 truncate text-left">{label}</span>{count !== undefined && <span className="text-xs tabular-nums">{count}</span>}</button>;
  };
  const live = data.resources.filter((r) => !r.archivedAt);
  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col gap-0.5 overflow-y-auto p-3">
      <div className="mb-3 flex items-center gap-2 px-2 py-1"><span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-sm font-bold text-on-accent">pL</span><span className="font-semibold">My pLugins</span></div>
      {item({ k: 'dashboard' }, 'Dashboard', <LayoutDashboard size={16} />)}
      {item({ k: 'all' }, 'All Resources', <Library size={16} />, live.length)}
      {item({ k: 'favorites' }, 'Favorites', <Star size={16} />, live.filter((r) => r.isFavorite).length)}
      {item({ k: 'added' }, 'Recently Added', <Clock size={16} />)}
      {item({ k: 'opened' }, 'Recently Opened', <History size={16} />)}
      {item({ k: 'archived' }, 'Archived', <Archive size={16} />, data.resources.length - live.length)}
      <div className="mb-1 mt-5 flex items-center justify-between px-2.5 text-xs font-semibold text-muted">Collections<IconBtn label="New collection" onClick={() => setCollModal({ name: '' })}><FolderPlus size={14} /></IconBtn></div>
      {data.collections.length === 0 && (
        <div className="px-2.5 py-1 text-xs text-muted">
          <p className="mb-1.5">No collections yet.</p>
          <button type="button" className="text-accent hover:underline" onClick={() => setCollModal({ name: '' })}>+ Create collection</button>
        </div>
      )}
      {data.collections.map((c) => (
        <div key={c.id} className="group flex items-center">
          <div className="min-w-0 flex-1">{item({ k: 'collection', id: c.id }, c.name, <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />, c.resourceIds.length)}</div>
          <IconBtn label={`Rename ${c.name}`} className="opacity-0 focus:opacity-100 group-hover:opacity-100" onClick={() => setCollModal({ id: c.id, name: c.name })}><Pencil size={13} /></IconBtn>
          <IconBtn label={`Delete ${c.name}`} className="opacity-0 focus:opacity-100 group-hover:opacity-100" onClick={() => setDelColl(c)}><Trash2 size={13} /></IconBtn>
        </div>
      ))}
      <div className="mt-auto space-y-0.5 pt-4">{item({ k: 'manage' }, 'Manage Categories', <Tags size={16} />)}{item({ k: 'settings' }, 'Settings', <Settings size={16} />)}</div>
    </nav>
  );

  let main: ReactNode;
  const key = JSON.stringify(cur);
  const L = (title: string, hint: string, extra: Partial<Parameters<typeof ResourceList>[0]> = {}) => <ResourceList key={key} base={base} title={title} q={q} emptyHint={hint} {...actions} {...extra} />;
  switch (cur.k) {
    case 'dashboard': main = <Dashboard go={go} {...actions} />; break;
    case 'manage': main = <Manage />; break;
    case 'settings': main = <SettingsView />; break;
    case 'favorites': main = L('Favorites', 'Tap the star on any resource to keep it here.'); break;
    case 'added': main = L('Recently added', 'Add your first resource to get started.', { defaultSort: 'added' }); break;
    case 'opened': main = L('Recently opened', 'Resources you open from My pLugins show up here.', { defaultSort: 'opened' }); break;
    case 'archived': main = L('Archived', 'Archive resources you no longer use; restore them any time.'); break;
    case 'collection': main = L(data.collections.find((c) => c.id === cur.id)?.name ?? 'Collection', 'Use a resource’s ⋯ menu to add it to this collection.'); break;
    default: main = L(searching ? `Results for “${q.trim()}”` : 'All resources', 'Add a website, tool or course you want to find again.', { canFilterArchived: true, initial: { path: cur.path, category: cur.category } });
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-panel lg:block">{sidebar}</aside>
      {drawer && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} /><aside className="relative h-full w-72 bg-panel shadow-xl"><IconBtn label="Close menu" className="absolute right-2 top-2" onClick={() => setDrawer(false)}><X size={18} /></IconBtn>{sidebar}</aside></div>}
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-bg/90 px-3 py-2.5 backdrop-blur sm:px-6">
        <IconBtn label="Open menu" className="lg:hidden" onClick={() => setDrawer(true)}><MenuIcon size={20} /></IconBtn>
        <div className="relative max-w-xl flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" aria-label="Search resources" className="field pl-9" placeholder="Search titles, tags, notes, URLs" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="hidden items-center rounded-md border border-line sm:flex">
          <IconBtn label="Grid view" active={settings.view === 'grid'} aria-pressed={settings.view === 'grid'} onClick={() => setSettings({ view: 'grid' })}><LayoutGrid size={16} /></IconBtn>
          <IconBtn label="List view" active={settings.view === 'list'} aria-pressed={settings.view === 'list'} onClick={() => setSettings({ view: 'list' })}><List size={16} /></IconBtn>
        </div>
        <IconBtn label={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>{settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</IconBtn>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={16} /><span className="hidden sm:inline">Add resource</span><span className="sr-only sm:hidden">Add resource</span></button>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">{main}</main>

      {editing && <ResourceForm resource={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <Confirm title="Delete resource?" message={<>“{deleting.title}” will be permanently deleted. You can archive it instead to keep it out of the way.</>} confirmLabel="Delete" onCancel={() => setDeleting(null)} onConfirm={() => { deleteResource(deleting.id); setDeleting(null); }} />}
      {collModal && <NameModal title={collModal.id ? 'Rename collection' : 'New collection'} initial={collModal.name} onClose={() => setCollModal(null)} onSave={(n) => saveCollection(n, collModal.id)} />}
      {delColl && <Confirm title={`Delete “${delColl.name}”?`} message={`The collection is removed. Its ${delColl.resourceIds.length} resources are not deleted.`} confirmLabel="Delete collection" onCancel={() => setDelColl(null)} onConfirm={() => { if (nav.k === 'collection' && nav.id === delColl.id) setNav({ k: 'all' }); deleteCollection(delColl.id); setDelColl(null); }} />}
      {toast && <div role="status" className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-md border border-line bg-raised px-4 py-2 text-sm shadow-lg">{toast}</div>}
    </div>
  );
}
