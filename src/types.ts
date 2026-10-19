export const RESOURCE_TYPES = ['Documentation','Developer Tool','Website','Course','YouTube Channel or Video','GitHub Repository','API','Playground','Community','Article','Reference','Other'] as const;
export const STATUSES = ['To Explore','Learning','Regularly Used'] as const;
export const PRIORITIES = ['Low','Medium','High'] as const;
export const SORTS = [['added','Recently added'],['opened','Recently opened'],['alpha','Alphabetical'],['priority','Priority'],['favorites','Favorites first']] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type SortKey = (typeof SORTS)[number][0];
export type TaxonKind = 'categories' | 'paths';

export interface Resource {
  id: string; title: string; url: string; description: string; type: ResourceType;
  categoryId: string | null; learningPathIds: string[]; tags: string[]; notes: string;
  isFavorite: boolean; isPinned: boolean; status: Status | null; priority: Priority | null;
  createdAt: string; updatedAt: string; lastOpenedAt: string | null; archivedAt: string | null;
}
export type ResourceInput = Pick<Resource, 'title'|'url'|'description'|'type'|'categoryId'|'learningPathIds'|'tags'|'notes'|'status'|'priority'|'isFavorite'|'isPinned'>;
/** Category and learning path share one shape. */
export interface Taxon { id: string; name: string; description: string; color: string; createdAt: string }
export type Category = Taxon;
export type LearningPath = Taxon;
export interface Collection { id: string; name: string; description: string; resourceIds: string[]; createdAt: string; updatedAt: string }
export interface Settings { theme: 'dark' | 'light'; view: 'grid' | 'list'; sort: SortKey; compact: boolean }
export interface AppData { version: number; resources: Resource[]; categories: Category[]; paths: LearningPath[]; collections: Collection[]; settings: Settings }
export type Nav =
  | { k: 'dashboard' } | { k: 'all'; path?: string; category?: string } | { k: 'favorites' } | { k: 'added' }
  | { k: 'opened' } | { k: 'archived' } | { k: 'collection'; id: string } | { k: 'manage' } | { k: 'settings' };
