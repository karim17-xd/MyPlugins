# My pLugins — Everything I Use, One Place

A personal hub for saving, organizing and rediscovering the tools, docs, courses and sites you use while learning.
React + TypeScript (strict) + Vite + Tailwind CSS + Lucide. No backend, no accounts, no external APIs.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## Use
- **Add resource** (top right): title and URL required; URL is validated and duplicates are flagged.
- Each card: favorite, edit, and a ⋯ menu (open, copy URL, pin, add to collection, archive/restore, delete).
- **Search** covers title, description, URL, category, learning path, tags and notes; it combines with the filters and sorting.
- **Collections** (sidebar): create, rename, delete. Deleting a collection never deletes resources.
- **Manage Categories**: add, rename, delete categories and learning paths. Deleting one only removes the label from resources.
- **Settings**: theme, default layout and sort, compact cards, JSON export/import, remove starter data, reset (type RESET).

## Architecture
```
src/types.ts          entities, enums
src/storage.ts        versioned schema, validation/migration, seed data, load/save
src/store.tsx         React context with all data mutations
src/lib.ts            URL normalization, search/filter/sort
src/ui.tsx            Modal, Confirm, Menu, Favicon, IconBtn
src/ResourceCard.tsx, ResourceForm.tsx, Views.tsx, App.tsx
```
Data is stored under `myplugins:data` with `version: 1`. `validateData` in `storage.ts` is the single place to add migrations. If stored data is unreadable it is copied to `myplugins:data:corrupt-backup` before starter data is created; starter data is only created when no data exists.

## Data limits
LocalStorage is specific to one browser profile on one device. It is **not** cloud sync, and clearing site data erases it. Export JSON regularly. Favicons load straight from each site's `/favicon.ico` (no metadata API); a globe icon appears if one is unavailable.
