import { storageSyncBus } from '../utils/storage-sync';

const BOOKMARKS_STORAGE_KEY = 'acu_dice_bookmarks';

export type BookmarkType = 'preset' | 'table' | 'variable' | 'map' | 'settings' | 'custom';

export interface Bookmark {
  id: string;
  name: string;
  type: BookmarkType;
  target: string;
  description?: string;
  tags: string[];
  icon?: string;
  color?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessedAt?: number;
}

export interface BookmarkGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  bookmarkIds: string[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface QuickAccessItem {
  bookmarkId: string;
  order: number;
  addedAt: number;
}

export class BookmarkManager {
  private bookmarks: Map<string, Bookmark> = new Map();
  private groups: Map<string, BookmarkGroup> = new Map();
  private quickAccess: QuickAccessItem[] = [];
  private maxQuickAccess: number = 10;

  constructor() {
    this.loadFromStorage();
    storageSyncBus.register(BOOKMARKS_STORAGE_KEY, () => {
      this.loadFromStorage();
    });
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.bookmarks) {
          for (const bookmark of data.bookmarks) {
            if (bookmark.id) {
              this.bookmarks.set(bookmark.id, bookmark);
            }
          }
        }
        if (data.groups) {
          for (const group of data.groups) {
            if (group.id) {
              this.groups.set(group.id, group);
            }
          }
        }
        if (data.quickAccess) {
          this.quickAccess = data.quickAccess;
        }
      }
    } catch (e) {
      console.warn('[BookmarkManager] 加载书签失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        bookmarks: Array.from(this.bookmarks.values()),
        groups: Array.from(this.groups.values()),
        quickAccess: this.quickAccess,
      };
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[BookmarkManager] 保存书签失败:', e);
    }
  }

  addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): Bookmark {
    const id = `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const newBookmark: Bookmark = {
      ...bookmark,
      id,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    };

    this.bookmarks.set(id, newBookmark);
    this.saveToStorage();
    console.log(`[BookmarkManager] 添加书签: ${bookmark.name}`);

    return newBookmark;
  }

  updateBookmark(id: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>): boolean {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return false;

    const updated: Bookmark = {
      ...bookmark,
      ...updates,
      id: bookmark.id,
      createdAt: bookmark.createdAt,
      updatedAt: Date.now(),
    };

    this.bookmarks.set(id, updated);
    this.saveToStorage();
    return true;
  }

  removeBookmark(id: string): boolean {
    const result = this.bookmarks.delete(id);
    if (result) {
      this.quickAccess = this.quickAccess.filter(item => item.bookmarkId !== id);
      for (const group of this.groups.values()) {
        group.bookmarkIds = group.bookmarkIds.filter(bid => bid !== id);
      }
      this.saveToStorage();
    }
    return result;
  }

  getBookmark(id: string): Bookmark | null {
    return this.bookmarks.get(id) || null;
  }

  getAllBookmarks(): Bookmark[] {
    return Array.from(this.bookmarks.values()).sort((a, b) => a.order - b.order);
  }

  getBookmarksByType(type: BookmarkType): Bookmark[] {
    return this.getAllBookmarks().filter(b => b.type === type);
  }

  getBookmarksByTag(tag: string): Bookmark[] {
    return this.getAllBookmarks().filter(b => b.tags.includes(tag));
  }

  searchBookmarks(query: string): Bookmark[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllBookmarks().filter(
      b =>
        b.name.toLowerCase().includes(lowerQuery) ||
        b.description?.toLowerCase().includes(lowerQuery) ||
        b.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
        b.target.toLowerCase().includes(lowerQuery)
    );
  }

  accessBookmark(id: string): Bookmark | null {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return null;

    bookmark.accessCount++;
    bookmark.lastAccessedAt = Date.now();
    this.bookmarks.set(id, bookmark);
    this.saveToStorage();

    return bookmark;
  }

  getRecentBookmarks(limit: number = 10): Bookmark[] {
    return this.getAllBookmarks()
      .filter(b => b.lastAccessedAt)
      .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
      .slice(0, limit);
  }

  getMostUsedBookmarks(limit: number = 10): Bookmark[] {
    return this.getAllBookmarks()
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  addToQuickAccess(bookmarkId: string): boolean {
    if (!this.bookmarks.has(bookmarkId)) return false;

    const existing = this.quickAccess.find(item => item.bookmarkId === bookmarkId);
    if (existing) return true;

    if (this.quickAccess.length >= this.maxQuickAccess) {
      this.quickAccess.sort((a, b) => a.addedAt - b.addedAt);
      this.quickAccess.shift();
    }

    this.quickAccess.push({
      bookmarkId,
      order: this.quickAccess.length,
      addedAt: Date.now(),
    });

    this.saveToStorage();
    return true;
  }

  removeFromQuickAccess(bookmarkId: string): boolean {
    const index = this.quickAccess.findIndex(item => item.bookmarkId === bookmarkId);
    if (index === -1) return false;

    this.quickAccess.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getQuickAccessBookmarks(): Bookmark[] {
    return this.quickAccess
      .sort((a, b) => a.order - b.order)
      .map(item => this.bookmarks.get(item.bookmarkId))
      .filter((b): b is Bookmark => b !== undefined);
  }

  reorderQuickAccess(orderedIds: string[]): void {
    this.quickAccess = orderedIds
      .map((id, index) => {
        const existing = this.quickAccess.find(item => item.bookmarkId === id);
        return existing ? { ...existing, order: index } : null;
      })
      .filter((item): item is QuickAccessItem => item !== null);

    this.saveToStorage();
  }

  createGroup(name: string, icon?: string, color?: string): BookmarkGroup {
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const group: BookmarkGroup = {
      id,
      name,
      icon,
      color,
      bookmarkIds: [],
      order: this.groups.size,
      createdAt: now,
      updatedAt: now,
    };

    this.groups.set(id, group);
    this.saveToStorage();

    return group;
  }

  updateGroup(id: string, updates: Partial<Omit<BookmarkGroup, 'id' | 'createdAt'>>): boolean {
    const group = this.groups.get(id);
    if (!group) return false;

    const updated: BookmarkGroup = {
      ...group,
      ...updates,
      id: group.id,
      createdAt: group.createdAt,
      updatedAt: Date.now(),
    };

    this.groups.set(id, updated);
    this.saveToStorage();
    return true;
  }

  deleteGroup(id: string): boolean {
    const result = this.groups.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  getGroup(id: string): BookmarkGroup | null {
    return this.groups.get(id) || null;
  }

  getAllGroups(): BookmarkGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => a.order - b.order);
  }

  addBookmarkToGroup(groupId: string, bookmarkId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group || !this.bookmarks.has(bookmarkId)) return false;

    if (!group.bookmarkIds.includes(bookmarkId)) {
      group.bookmarkIds.push(bookmarkId);
      group.updatedAt = Date.now();
      this.saveToStorage();
    }

    return true;
  }

  removeBookmarkFromGroup(groupId: string, bookmarkId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const index = group.bookmarkIds.indexOf(bookmarkId);
    if (index === -1) return false;

    group.bookmarkIds.splice(index, 1);
    group.updatedAt = Date.now();
    this.saveToStorage();
    return true;
  }

  getBookmarksInGroup(groupId: string): Bookmark[] {
    const group = this.groups.get(groupId);
    if (!group) return [];

    return group.bookmarkIds
      .map(id => this.bookmarks.get(id))
      .filter((b): b is Bookmark => b !== undefined);
  }

  reorderBookmarks(orderedIds: string[]): void {
    for (let i = 0; i < orderedIds.length; i++) {
      const bookmark = this.bookmarks.get(orderedIds[i]);
      if (bookmark) {
        bookmark.order = i;
        this.bookmarks.set(orderedIds[i], bookmark);
      }
    }
    this.saveToStorage();
  }

  reorderGroups(orderedIds: string[]): void {
    for (let i = 0; i < orderedIds.length; i++) {
      const group = this.groups.get(orderedIds[i]);
      if (group) {
        group.order = i;
        this.groups.set(orderedIds[i], group);
      }
    }
    this.saveToStorage();
  }

  exportData(): string {
    return JSON.stringify(
      {
        bookmarks: Array.from(this.bookmarks.values()),
        groups: Array.from(this.groups.values()),
        quickAccess: this.quickAccess,
        exportedAt: Date.now(),
        version: '1.0.0',
      },
      null,
      2
    );
  }

  importData(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);

      if (data.bookmarks && Array.isArray(data.bookmarks)) {
        for (const bookmark of data.bookmarks) {
          if (bookmark.name && bookmark.type && bookmark.target) {
            if (this.bookmarks.has(bookmark.id)) {
              bookmark.id = `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            this.bookmarks.set(bookmark.id, {
              ...bookmark,
              createdAt: bookmark.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
            imported++;
          }
        }
      }

      if (data.groups && Array.isArray(data.groups)) {
        for (const group of data.groups) {
          if (group.name) {
            if (this.groups.has(group.id)) {
              group.id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            this.groups.set(group.id, {
              ...group,
              createdAt: group.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
          }
        }
      }

      if (data.quickAccess && Array.isArray(data.quickAccess)) {
        this.quickAccess = data.quickAccess;
      }

      this.saveToStorage();
      return { success: true, imported, errors };
    } catch (e) {
      errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
      return { success: false, imported: 0, errors };
    }
  }

  clearAll(): void {
    this.bookmarks.clear();
    this.groups.clear();
    this.quickAccess = [];
    this.saveToStorage();
  }

  getStatistics(): {
    totalBookmarks: number;
    bookmarksByType: Record<BookmarkType, number>;
    totalGroups: number;
    quickAccessCount: number;
    totalAccessCount: number;
  } {
    const bookmarksByType: Record<BookmarkType, number> = {
      preset: 0,
      table: 0,
      variable: 0,
      map: 0,
      settings: 0,
      custom: 0,
    };

    for (const bookmark of this.bookmarks.values()) {
      bookmarksByType[bookmark.type]++;
    }

    return {
      totalBookmarks: this.bookmarks.size,
      bookmarksByType,
      totalGroups: this.groups.size,
      quickAccessCount: this.quickAccess.length,
      totalAccessCount: Array.from(this.bookmarks.values()).reduce((sum, b) => sum + b.accessCount, 0),
    };
  }
}

export const bookmarkManager = new BookmarkManager();
