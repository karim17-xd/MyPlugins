import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, Resource, ResourceInput, Settings, TaxonKind } from './types';
import { COLORS, createSeed, emptyData, loadData, saveData, uid } from './storage';

interface Store {
  data: AppData; toast: string | null; notify: (m: string) => void;
  saveResource: (i: ResourceInput, id?: string) => void; patchResource: (id: string, p: Partial<Resource>) => void;
  deleteResource: (id: string) => void; markOpened: (id: string) => void;
  saveCollection: (name: string, id?: string) => void; deleteCollection: (id: string) => void; toggleInCollection: (cid: string, rid: string) => void;
  saveTaxon: (kind: TaxonKind, t: { name: string; description: string; color: string }, id?: string) => void; deleteTaxon: (kind: TaxonKind, id: string) => void;
  setSettings: (p: Partial<Settings>) => void; replaceAll: (d: AppData) => void; clearSamples: () => void; resetAll: () => void;
}
const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => { const s = useContext(Ctx); if (!s) throw new Error('StoreProvider missing'); return s; };
const now = () => new Date().toISOString();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => { if (!saveData(data)) setToast('Could not save: browser storage is full or blocked.'); }, [data]);
  useEffect(() => { document.documentElement.dataset.theme = data.settings.theme; }, [data.settings.theme]);
  const notify = useCallback((m: string) => { setToast(m); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 2600); }, []);

  const store = useMemo<Store>(() => {
    const up = (f: (d: AppData) => AppData) => setData(f);
    const patch = (id: string, p: Partial<Resource>) => up((d) => ({ ...d, resources: d.resources.map((r) => (r.id === id ? { ...r, ...p, updatedAt: now() } : r)) }));
    return {
      data, toast, notify, patchResource: patch,
      saveResource: (i, id) => up((d) => id
        ? { ...d, resources: d.resources.map((r) => (r.id === id ? { ...r, ...i, isSample: false, updatedAt: now() } : r)) }
        : { ...d, resources: [{ ...i, id: uid(), isSample: false, createdAt: now(), updatedAt: now(), lastOpenedAt: null, archivedAt: null }, ...d.resources] }),
      deleteResource: (id) => up((d) => ({ ...d, resources: d.resources.filter((r) => r.id !== id), collections: d.collections.map((c) => ({ ...c, resourceIds: c.resourceIds.filter((x) => x !== id) })) })),
      markOpened: (id) => up((d) => ({ ...d, resources: d.resources.map((r) => (r.id === id ? { ...r, lastOpenedAt: now() } : r)) })),
      saveCollection: (name, id) => up((d) => id
        ? { ...d, collections: d.collections.map((c) => (c.id === id ? { ...c, name, updatedAt: now() } : c)) }
        : { ...d, collections: [...d.collections, { id: uid(), name, description: '', resourceIds: [], createdAt: now(), updatedAt: now() }] }),
      deleteCollection: (id) => up((d) => ({ ...d, collections: d.collections.filter((c) => c.id !== id) })), // resources are untouched
      toggleInCollection: (cid, rid) => up((d) => ({ ...d, collections: d.collections.map((c) => c.id !== cid ? c : { ...c, updatedAt: now(), resourceIds: c.resourceIds.includes(rid) ? c.resourceIds.filter((x) => x !== rid) : [...c.resourceIds, rid] }) })),
      saveTaxon: (kind, t, id) => up((d) => ({ ...d, [kind]: id ? d[kind].map((x) => (x.id === id ? { ...x, ...t } : x)) : [...d[kind], { ...t, id: uid(), createdAt: now(), color: t.color || COLORS[0] }] })),
      deleteTaxon: (kind, id) => up((d) => ({
        ...d, [kind]: d[kind].filter((x) => x.id !== id),
        resources: d.resources.map((r) => kind === 'categories' ? (r.categoryId === id ? { ...r, categoryId: null } : r) : { ...r, learningPathIds: r.learningPathIds.filter((p) => p !== id) }),
      })),
      setSettings: (p) => up((d) => ({ ...d, settings: { ...d.settings, ...p } })),
      replaceAll: (d) => setData(d),
      clearSamples: () => up((d) => ({ ...d, resources: d.resources.filter((r) => !r.isSample), collections: d.collections.map((c) => ({ ...c, resourceIds: c.resourceIds.filter((x) => d.resources.find((r) => r.id === x)?.isSample !== true) })) })),
      resetAll: () => setData({ ...emptyData(), settings: data.settings }),
    };
  }, [data, toast, notify]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
export { createSeed };
