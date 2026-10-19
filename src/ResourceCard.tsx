import { memo } from 'react';
import { Archive, ArchiveRestore, Copy, ExternalLink, FolderPlus, FolderMinus, Pencil, Pin, PinOff, Star, Trash2 } from 'lucide-react';
import type { Resource } from './types';
import { useStore } from './store';
import { cn, domainOf, relTime } from './lib';
import { Favicon, IconBtn, Menu, type MenuItem } from './ui';

interface Props { r: Resource; view: 'grid' | 'list'; compact: boolean; onEdit: (r: Resource) => void; onDelete: (r: Resource) => void }

function Card({ r, view, compact, onEdit, onDelete }: Props) {
  const { data, patchResource, markOpened, toggleInCollection, notify } = useStore();
  const cat = data.categories.find((c) => c.id === r.categoryId);
  const list = view === 'list';
  const copy = () => navigator.clipboard?.writeText(r.url).then(() => notify('URL copied'), () => notify('Copy failed: clipboard is blocked')) ?? notify('Copy failed: clipboard unavailable');
  const items: MenuItem[] = [
    { label: 'Open in new tab', icon: <ExternalLink size={14} />, onClick: () => { markOpened(r.id); window.open(r.url, '_blank', 'noopener,noreferrer'); } },
    { label: 'Copy URL', icon: <Copy size={14} />, onClick: copy },
    { label: r.isPinned ? 'Unpin' : 'Pin', icon: r.isPinned ? <PinOff size={14} /> : <Pin size={14} />, onClick: () => patchResource(r.id, { isPinned: !r.isPinned }) },
    { label: 'Edit', icon: <Pencil size={14} />, onClick: () => onEdit(r) },
    ...data.collections.map((c) => {
      const inIt = c.resourceIds.includes(r.id);
      return { label: `${inIt ? 'Remove from' : 'Add to'} ${c.name}`, icon: inIt ? <FolderMinus size={14} /> : <FolderPlus size={14} />, onClick: () => toggleInCollection(c.id, r.id) };
    }),
    { label: r.archivedAt ? 'Restore' : 'Archive', icon: r.archivedAt ? <ArchiveRestore size={14} /> : <Archive size={14} />, onClick: () => patchResource(r.id, { archivedAt: r.archivedAt ? null : new Date().toISOString() }) },
    { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => onDelete(r) },
  ];
  return (
    <article className={cn('group rounded-lg border border-line bg-panel transition-colors hover:border-muted/50', list ? 'flex items-center gap-3 px-3 py-2' : compact ? 'flex flex-col gap-1.5 p-3' : 'flex flex-col gap-2 p-4', r.archivedAt && 'opacity-70')}>
      <div className={cn('flex items-center gap-2', list && 'min-w-0 flex-1')}>
        <Favicon url={r.url} />
        <div className="min-w-0 flex-1">
          <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={() => markOpened(r.id)} className="block truncate text-sm font-medium hover:text-accent">
            {r.isPinned && <Pin size={11} className="mr-1 inline text-accent" aria-label="Pinned" />}{r.title}
          </a>
          <div className="truncate text-xs text-muted">{domainOf(r.url)}</div>
        </div>
      </div>
      {r.description && !compact && <p className={cn('text-sm text-muted', list ? 'hidden flex-1 truncate lg:block' : 'line-clamp-2')}>{r.description}</p>}
      <div className={cn('flex flex-wrap items-center gap-1.5', list && 'hidden md:flex md:max-w-[40%]')}>
        <span className="chip">{r.type}</span>
        {cat && <span className="chip"><span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />{cat.name}</span>}
        {r.status && <span className="chip text-accent">{r.status}</span>}
        {r.isSample && <span className="chip border border-dashed border-line">Starter</span>}
        {r.tags.slice(0, list ? 2 : 3).map((t) => <span key={t} className="chip">#{t}</span>)}
        {r.tags.length > (list ? 2 : 3) && <span className="chip">+{r.tags.length - (list ? 2 : 3)}</span>}
      </div>
      <div className={cn('flex items-center gap-0.5', !list && 'mt-auto justify-between pt-1')}>
        {!list && <span className="text-xs text-muted">{r.lastOpenedAt ? `Opened ${relTime(r.lastOpenedAt)}` : `Added ${relTime(r.createdAt)}`}</span>}
        <div className="flex items-center">
          <IconBtn label={r.isFavorite ? 'Remove from favorites' : 'Add to favorites'} active={r.isFavorite} aria-pressed={r.isFavorite} onClick={() => patchResource(r.id, { isFavorite: !r.isFavorite })}><Star size={16} fill={r.isFavorite ? 'currentColor' : 'none'} /></IconBtn>
          <IconBtn label="Edit resource" onClick={() => onEdit(r)}><Pencil size={16} /></IconBtn>
          <Menu items={items} />
        </div>
      </div>
    </article>
  );
}
export const ResourceCard = memo(Card);
