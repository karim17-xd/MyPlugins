import { PRIORITIES, RESOURCE_TYPES, SORTS, STATUSES } from './types';
import type { AppData, Collection, Resource, Settings, Taxon } from './types';

export const STORAGE_KEY = 'myplugins:data';
export const SCHEMA_VERSION = 1;
export const COLORS = ['#3ddc97', '#4c8dff', '#f5a524', '#ef6b6b', '#b084f5', '#2dd4d4', '#e879a8', '#9aa4b2'];
export const uid = (): string => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const DEFAULT_SETTINGS: Settings = { theme: 'dark', view: 'grid', sort: 'added', compact: false };
const t0 = new Date().toISOString();
const taxa = (prefix: string, names: [string, string?][]): Taxon[] =>
  names.map(([name, description], i) => ({ id: `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, description: description ?? '', color: COLORS[i % COLORS.length], createdAt: t0 }));

const DEFAULT_CATEGORIES = taxa('cat', [['JavaScript'], ['TypeScript'], ['React'], ['Node.js and Backend'], ['Python'], ['Machine Learning'], ['Computer Science Fundamentals'], ['Databases'], ['Git and GitHub'], ['Linux and Fedora'], ['Cybersecurity'], ['English Learning'], ['University'], ['Productivity'], ['Other']]);
const DEFAULT_PATHS = taxa('path', [['Frontend Development'], ['Backend Development'], ['Machine Learning'], ['Computer Science'], ['Cybersecurity']]);

export function emptyData(): AppData {
  return { version: SCHEMA_VERSION, resources: [], categories: DEFAULT_CATEGORIES, paths: DEFAULT_PATHS, collections: [], settings: DEFAULT_SETTINGS };
}

const SAMPLES: [string, string, string, Resource['type'], string, string[], string[]][] = [
  ['MDN Web Docs', 'https://developer.mozilla.org', 'Reference documentation for HTML, CSS, JavaScript and Web APIs.', 'Documentation', 'cat-javascript', ['path-frontend-development'], ['web', 'reference']],
  ['React Documentation', 'https://react.dev', 'Official React docs with guides, API reference and interactive examples.', 'Documentation', 'cat-react', ['path-frontend-development'], ['react', 'hooks']],
  ['TypeScript Documentation', 'https://www.typescriptlang.org/docs/', 'The TypeScript handbook and reference for typed JavaScript.', 'Documentation', 'cat-typescript', ['path-frontend-development'], ['types']],
  ['Node.js Documentation', 'https://nodejs.org/docs/latest/api/', 'API reference for the Node.js runtime.', 'Documentation', 'cat-node-js-and-backend', ['path-backend-development'], ['node', 'api']],
  ['GitHub', 'https://github.com', 'Host code, review pull requests and discover open source projects.', 'Developer Tool', 'cat-git-and-github', [], ['git', 'collaboration']],
  ['freeCodeCamp', 'https://www.freecodecamp.org', 'Free interactive curriculum covering web development, data and more.', 'Course', 'cat-computer-science-fundamentals', ['path-frontend-development'], ['course', 'free']],
  ['Exercism', 'https://exercism.org', 'Practice exercises in dozens of languages with mentor feedback.', 'Playground', 'cat-computer-science-fundamentals', ['path-computer-science'], ['practice']],
  ['Python Documentation', 'https://docs.python.org/3/', 'The official Python language reference, tutorial and standard library docs.', 'Documentation', 'cat-python', ['path-backend-development', 'path-machine-learning'], ['python']],
  ['Hugging Face', 'https://huggingface.co', 'Models, datasets and demos for machine learning projects.', 'Community', 'cat-machine-learning', ['path-machine-learning'], ['models', 'datasets']],
];

export function createSeed(): AppData {
  const d = emptyData();
  d.resources = SAMPLES.map(([title, url, description, type, categoryId, learningPathIds, tags], i) => ({
    id: uid(), title, url, description, type, categoryId, learningPathIds, tags, notes: '', isFavorite: false, isPinned: i < 2, status: null, priority: null,
    isSample: true, createdAt: new Date(Date.now() - i * 1000).toISOString(), updatedAt: t0, lastOpenedAt: null, archivedAt: null,
  }));
  return d;
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
  if (!o || !s(o.id) || !s(o.title).trim() || !/^https?:\/\//i.test(s(o.url))) return null;
  const created = dt(o.createdAt) ?? t0;
  return {
    id: s(o.id), title: s(o.title), url: s(o.url), description: s(o.description), type: oneOf(o.type, RESOURCE_TYPES) ?? 'Other',
    categoryId: s(o.categoryId) || null, learningPathIds: sa(o.learningPathIds), tags: sa(o.tags), notes: s(o.notes),
    isFavorite: o.isFavorite === true, isPinned: o.isPinned === true, status: oneOf(o.status, STATUSES), priority: oneOf(o.priority, PRIORITIES),
    isSample: o.isSample === true, createdAt: created, updatedAt: dt(o.updatedAt) ?? created, lastOpenedAt: dt(o.lastOpenedAt), archivedAt: dt(o.archivedAt),
  };
}
const toTaxon = (x: unknown): Taxon | null => {
  const o = rec(x);
  return o && s(o.id) && s(o.name).trim() ? { id: s(o.id), name: s(o.name), description: s(o.description), color: s(o.color, COLORS[0]), createdAt: dt(o.createdAt) ?? t0 } : null;
};
const toCollection = (x: unknown): Collection | null => {
  const o = rec(x);
  return o && s(o.id) && s(o.name).trim() ? { id: s(o.id), name: s(o.name), description: s(o.description), resourceIds: sa(o.resourceIds), createdAt: dt(o.createdAt) ?? t0, updatedAt: dt(o.updatedAt) ?? t0 } : null;
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
  return { version: SCHEMA_VERSION, resources: list(o.resources, toResource), categories: list(o.categories, toTaxon), paths: list(o.paths, toTaxon), collections: list(o.collections, toCollection), settings };
}

export function loadData(): AppData {
  let raw: string | null = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { return createSeed(); }
  if (raw === null) return createSeed();
  try { const v = validateData(JSON.parse(raw)); if (v) return v; } catch { /* fall through */ }
  try { localStorage.setItem(`${STORAGE_KEY}:corrupt-backup`, raw); } catch { /* ignore */ }
  return createSeed();
}
export function saveData(d: AppData): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); return true; } catch { return false; }
}
