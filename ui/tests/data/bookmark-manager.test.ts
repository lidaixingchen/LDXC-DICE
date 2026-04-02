import { describe, it, expect, beforeEach } from 'vitest';
import { BookmarkManager, type Bookmark, type BookmarkGroup } from '@data/bookmark-manager';

describe('BookmarkManager', () => {
  let manager: BookmarkManager;

  beforeEach(() => {
    manager = new BookmarkManager();
    manager.clearAll();
  });

  describe('addBookmark', () => {
    it('should add a new bookmark', () => {
      const bookmark = manager.addBookmark({
        name: 'Test Bookmark',
        type: 'preset',
        target: 'preset_123',
        tags: ['important'],
        order: 0,
      });

      expect(bookmark.id).toBeDefined();
      expect(bookmark.name).toBe('Test Bookmark');
      expect(bookmark.type).toBe('preset');
      expect(bookmark.accessCount).toBe(0);
    });

    it('should support different bookmark types', () => {
      const types: Array<'preset' | 'table' | 'variable' | 'map' | 'settings' | 'custom'> = [
        'preset',
        'table',
        'variable',
        'map',
        'settings',
        'custom',
      ];

      for (const type of types) {
        const bookmark = manager.addBookmark({
          name: `${type} bookmark`,
          type,
          target: `${type}_target`,
          tags: [],
          order: 0,
        });
        expect(bookmark.type).toBe(type);
      }
    });
  });

  describe('getBookmarksByType', () => {
    it('should filter bookmarks by type', () => {
      manager.addBookmark({
        name: 'Preset 1',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      manager.addBookmark({
        name: 'Table 1',
        type: 'table',
        target: 't1',
        tags: [],
        order: 1,
      });

      const presets = manager.getBookmarksByType('preset');
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Preset 1');
    });
  });

  describe('searchBookmarks', () => {
    it('should search by name', () => {
      manager.addBookmark({
        name: 'Important Preset',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      manager.addBookmark({
        name: 'Other Preset',
        type: 'preset',
        target: 'p2',
        tags: [],
        order: 1,
      });

      const results = manager.searchBookmarks('Important');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Important Preset');
    });

    it('should search by tags', () => {
      manager.addBookmark({
        name: 'Bookmark 1',
        type: 'preset',
        target: 'p1',
        tags: ['favorite', 'important'],
        order: 0,
      });

      const results = manager.searchBookmarks('favorite');
      expect(results).toHaveLength(1);
    });
  });

  describe('accessBookmark', () => {
    it('should increment access count', () => {
      const bookmark = manager.addBookmark({
        name: 'Test',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      manager.accessBookmark(bookmark.id);
      manager.accessBookmark(bookmark.id);

      const retrieved = manager.getBookmark(bookmark.id);
      expect(retrieved?.accessCount).toBe(2);
      expect(retrieved?.lastAccessedAt).toBeDefined();
    });
  });

  describe('quick access', () => {
    it('should add to quick access', () => {
      const bookmark = manager.addBookmark({
        name: 'Quick',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      expect(manager.addToQuickAccess(bookmark.id)).toBe(true);

      const quickAccess = manager.getQuickAccessBookmarks();
      expect(quickAccess).toHaveLength(1);
    });

    it('should remove from quick access', () => {
      const bookmark = manager.addBookmark({
        name: 'Quick',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      manager.addToQuickAccess(bookmark.id);
      expect(manager.removeFromQuickAccess(bookmark.id)).toBe(true);

      const quickAccess = manager.getQuickAccessBookmarks();
      expect(quickAccess).toHaveLength(0);
    });
  });

  describe('groups', () => {
    it('should create group', () => {
      const group = manager.createGroup('Test Group', 'fa-folder', '#ff0000');

      expect(group.id).toBeDefined();
      expect(group.name).toBe('Test Group');
      expect(group.icon).toBe('fa-folder');
      expect(group.color).toBe('#ff0000');
    });

    it('should add bookmark to group', () => {
      const bookmark = manager.addBookmark({
        name: 'Test',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      const group = manager.createGroup('My Group');

      expect(manager.addBookmarkToGroup(group.id, bookmark.id)).toBe(true);

      const bookmarksInGroup = manager.getBookmarksInGroup(group.id);
      expect(bookmarksInGroup).toHaveLength(1);
    });

    it('should remove bookmark from group', () => {
      const bookmark = manager.addBookmark({
        name: 'Test',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      const group = manager.createGroup('My Group');
      manager.addBookmarkToGroup(group.id, bookmark.id);

      expect(manager.removeBookmarkFromGroup(group.id, bookmark.id)).toBe(true);

      const bookmarksInGroup = manager.getBookmarksInGroup(group.id);
      expect(bookmarksInGroup).toHaveLength(0);
    });
  });

  describe('import/export', () => {
    it('should export and import data', () => {
      manager.addBookmark({
        name: 'Bookmark 1',
        type: 'preset',
        target: 'p1',
        tags: ['test'],
        order: 0,
      });

      manager.createGroup('Test Group');

      const exported = manager.exportData();
      const newManager = new BookmarkManager();
      newManager.clearAll();

      const result = newManager.importData(exported);
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      manager.addBookmark({
        name: 'Preset',
        type: 'preset',
        target: 'p1',
        tags: [],
        order: 0,
      });

      manager.addBookmark({
        name: 'Table',
        type: 'table',
        target: 't1',
        tags: [],
        order: 1,
      });

      manager.createGroup('Group 1');

      const stats = manager.getStatistics();

      expect(stats.totalBookmarks).toBe(2);
      expect(stats.totalGroups).toBe(1);
      expect(stats.bookmarksByType.preset).toBe(1);
      expect(stats.bookmarksByType.table).toBe(1);
    });
  });
});
