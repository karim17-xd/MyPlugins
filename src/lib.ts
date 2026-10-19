import type { AppData, Resource, SortKey } from './types';

export const cn = (...c: (string | false | null | undefined)[]): string => c.filter(Boolean).join(' ');
export const domainOf = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
export const originOf = (url: string): string => { try { return new URL(url).origin; } catch { return ''; } };
export const normKey = (url: string): string => { try { const u = new URL(url); return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}${u.search}`.toLowerCase(); } catch { return url.toLowerCase(); } };

/** Adds https:// when missing and accepts only http(s) URLs. */
export function normalizeUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.') ? u.toString() : null;
  } catch { return null; }
}

export function relTime(iso: string | null): string {
  if (!iso) return 'never';
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 43200) return `${Math.floor(m / 1440)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export interface Filters { type: string; category: string; path: string; status: string; priority: string; favorite: boolean; archived: 'active' | 'archived' | 'all' }

export function filterResources(list: Resource[], q: string, f: Filters, d: AppData): Resource[] {
  const cat = new Map(d.categories.map((c) => [c.id, c.name]));
  const paths = new Map(d.paths.map((p) => [p.id, p.name]));
  const needle = q.trim().toLowerCase();
  return list.filter((r) => {
    if (f.archived === 'active' && r.archivedAt) return false;
    if (f.archived === 'archived' && !r.archivedAt) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.category && r.categoryId !== f.category) return false;
    if (f.path && !r.learningPathIds.includes(f.path)) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.priority && r.priority !== f.priority) return false;
    if (f.favorite && !r.isFavorite) return false;
    if (!needle) return true;
    const hay = [r.title, r.description, r.url, r.notes, r.tags.join(' '), cat.get(r.categoryId ?? '') ?? '', r.learningPathIds.map((i) => paths.get(i) ?? '').join(' ')].join('\n').toLowerCase();
    return needle.split(/\s+/).every((w) => hay.includes(w));
  });
}

const PRI = { High: 3, Medium: 2, Low: 1 } as const;
export function sortResources(list: Resource[], key: SortKey): Resource[] {
  const byAdded = (a: Resource, b: Resource) => b.createdAt.localeCompare(a.createdAt);
  const out = [...list];
  switch (key) {
    case 'alpha': return out.sort((a, b) => a.title.localeCompare(b.title));
    case 'opened': return out.sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? '') || byAdded(a, b));
    case 'priority': return out.sort((a, b) => (b.priority ? PRI[b.priority] : 0) - (a.priority ? PRI[a.priority] : 0) || byAdded(a, b));
    case 'favorites': return out.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || byAdded(a, b));
    default: return out.sort(byAdded);
  }
}
