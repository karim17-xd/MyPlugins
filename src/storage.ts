import { PRIORITIES, RESOURCE_TYPES, SORTS, STATUSES } from './types';
import type { AppData, Collection, Resource, Settings, Taxon } from './types';

export const STORAGE_KEY = 'myplugins:data';
export const SCHEMA_VERSION = 1;
export const COLORS = ['#3ddc97', '#4c8dff', '#f5a524', '#ef6b6b', '#b084f5', '#2dd4d4', '#e879a8', '#9aa4b2'];
export const uid = (): string => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const DEFAULT_SETTINGS: Settings = { theme: 'dark', view: 'grid', sort: 'added', compact: false };

export function emptyData(): AppData {
  return { version: SCHEMA_VERSION, resources: [], categories: [], paths: [], collections: [], settings: DEFAULT_SETTINGS };
}

// ---------- validation / migration ----------
type Rec = Record<string, unknown>;
const rec = (x: unknown): Rec | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Rec) : null);
const s = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const sa = (v: unknown): string[] => (Array.isArray(v) ? v.filter((i): i is string => typeof i === 'string') : []);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (list.includes(v as T) ? (v as T) : null);
const dt = (v: unknown): string | null => (typeof v === 'string' && !isNaN(Date.parse(v)) ? v : null);

function toResource(x: unknown): Resource | null {
  const o = rec(x);
  if (!o || o.isSample === true || !s(o.id) || !s(o.title).trim() || !/^https?:\/\//i.test(s(o.url))) return null;
  const fallbackNow = new Date().toISOString();
  const created = dt(o.createdAt) ?? fallbackNow;
  return {
    id: s(o.id), title: s(o.title), url: s(o.url), description: s(o.description), type: oneOf(o.type, RESOURCE_TYPES) ?? 'Other',
    categoryId: s(o.categoryId) || null, learningPathIds: sa(o.learningPathIds), tags: sa(o.tags), notes: s(o.notes),
    isFavorite: o.isFavorite === true, isPinned: o.isPinned === true, status: oneOf(o.status, STATUSES), priority: oneOf(o.priority, PRIORITIES),
    createdAt: created, updatedAt: dt(o.updatedAt) ?? created, lastOpenedAt: dt(o.lastOpenedAt), archivedAt: dt(o.archivedAt),
  };
}
const toTaxon = (x: unknown): Taxon | null => {
  const o = rec(x);
  const fallbackNow = new Date().toISOString();
  return o && s(o.id) && s(o.name).trim() ? { id: s(o.id), name: s(o.name), description: s(o.description), color: s(o.color, COLORS[0]), createdAt: dt(o.createdAt) ?? fallbackNow } : null;
};
const toCollection = (x: unknown): Collection | null => {
  const o = rec(x);
  const fallbackNow = new Date().toISOString();
  return o && s(o.id) && s(o.name).trim() ? { id: s(o.id), name: s(o.name), description: s(o.description), resourceIds: sa(o.resourceIds), createdAt: dt(o.createdAt) ?? fallbackNow, updatedAt: dt(o.updatedAt) ?? fallbackNow } : null;
};
const list = <T,>(v: unknown, f: (x: unknown) => T | null): T[] => (Array.isArray(v) ? v.map(f).filter((i): i is T => i !== null) : []);

/** Returns a sanitized AppData, or null when the input is not a valid export. Add migrations for older versions here. */
export function validateData(x: unknown): AppData | null {
  const o = rec(x);
  if (!o || typeof o.version !== 'number' || o.version < 1 || o.version > SCHEMA_VERSION) return null;
  if (!Array.isArray(o.resources) || !Array.isArray(o.categories)) return null;
  const st = rec(o.settings) ?? {};
  const settings: Settings = {
    theme: st.theme === 'light' ? 'light' : 'dark', view: st.view === 'list' ? 'list' : 'grid',
    sort: oneOf(st.sort, SORTS.map((x) => x[0])) ?? 'added', compact: st.compact === true,
  };
  const resources = list(o.resources, toResource);
  const validResourceIds = new Set(resources.map((r) => r.id));
  const usedCatIds = new Set(resources.map((r) => r.categoryId).filter((id): id is string => Boolean(id)));
  const usedPathIds = new Set(resources.flatMap((r) => r.learningPathIds));
  const categories = list(o.categories, toTaxon).filter((c) => !c.id.startsWith('cat-') || usedCatIds.has(c.id));
  const paths = list(o.paths, toTaxon).filter((p) => !p.id.startsWith('path-') || usedPathIds.has(p.id));
  const collections = list(o.collections, toCollection).map((c) => ({
    ...c,
    resourceIds: c.resourceIds.filter((id) => validResourceIds.has(id)),
  }));
  return { version: SCHEMA_VERSION, resources, categories, paths, collections, settings };
}

export function loadData(): AppData {
  let raw: string | null = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { return emptyData(); }
  if (raw === null) return emptyData();
  try { const v = validateData(JSON.parse(raw)); if (v) return v; } catch { /* fall through */ }
  try { localStorage.setItem(`${STORAGE_KEY}:corrupt-backup`, raw); } catch { /* ignore */ }
  return emptyData();
}
export function saveData(d: AppData): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); return true; } catch { return false; }
}
