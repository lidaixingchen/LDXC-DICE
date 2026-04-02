import { describe, it, expect, beforeEach } from 'vitest';
import { BlacklistManager, type BlacklistEntry } from '@data/blacklist-manager';

describe('BlacklistManager', () => {
  let manager: BlacklistManager;

  beforeEach(() => {
    manager = new BlacklistManager();
    manager.clearAll();
  });

  describe('addEntry', () => {
    it('should add a new entry', () => {
      const entry = manager.addEntry({
        name: 'Test Entry',
        pattern: 'test_*',
        type: 'wildcard',
        scope: 'global',
        enabled: true,
      });

      expect(entry.id).toBeDefined();
      expect(entry.name).toBe('Test Entry');
      expect(entry.pattern).toBe('test_*');
      expect(entry.hitCount).toBe(0);
    });

    it('should generate unique IDs', () => {
      const entry1 = manager.addEntry({
        name: 'Entry 1',
        pattern: 'pattern1',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      const entry2 = manager.addEntry({
        name: 'Entry 2',
        pattern: 'pattern2',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('filterVariables', () => {
    it('should filter variables with exact match', () => {
      manager.addEntry({
        name: 'Block test',
        pattern: 'blocked_var',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      const result = manager.filterVariables(['blocked_var', 'allowed_var']);

      expect(result.blocked).toContain('blocked_var');
      expect(result.passed).toContain('allowed_var');
      expect(result.totalBlocked).toBe(1);
      expect(result.totalPassed).toBe(1);
    });

    it('should filter variables with wildcard', () => {
      manager.addEntry({
        name: 'Block temp vars',
        pattern: 'temp_*',
        type: 'wildcard',
        scope: 'global',
        enabled: true,
      });

      const result = manager.filterVariables(['temp_1', 'temp_2', 'permanent']);

      expect(result.blocked).toContain('temp_1');
      expect(result.blocked).toContain('temp_2');
      expect(result.passed).toContain('permanent');
    });

    it('should filter variables with regex', () => {
      manager.addEntry({
        name: 'Block numbered vars',
        pattern: '^var_\\d+$',
        type: 'regex',
        scope: 'global',
        enabled: true,
      });

      const result = manager.filterVariables(['var_1', 'var_123', 'var_text']);

      expect(result.blocked).toContain('var_1');
      expect(result.blocked).toContain('var_123');
      expect(result.passed).toContain('var_text');
    });

    it('should respect scope', () => {
      manager.addEntry({
        name: 'Preset specific',
        pattern: 'test_*',
        type: 'wildcard',
        scope: 'preset',
        scopeTarget: 'preset_123',
        enabled: true,
      });

      const result1 = manager.filterVariables(['test_var'], { presetId: 'preset_123' });
      expect(result1.totalBlocked).toBe(1);

      const result2 = manager.filterVariables(['test_var'], { presetId: 'other_preset' });
      expect(result2.totalBlocked).toBe(0);
    });

    it('should only filter enabled entries', () => {
      manager.addEntry({
        name: 'Disabled entry',
        pattern: 'blocked',
        type: 'exact',
        scope: 'global',
        enabled: false,
      });

      const result = manager.filterVariables(['blocked']);

      expect(result.totalBlocked).toBe(0);
    });
  });

  describe('updateEntry', () => {
    it('should update existing entry', () => {
      const entry = manager.addEntry({
        name: 'Original',
        pattern: 'original',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      const updated = manager.updateEntry(entry.id, { name: 'Updated' });
      expect(updated).toBe(true);

      const retrieved = manager.getEntry(entry.id);
      expect(retrieved?.name).toBe('Updated');
    });

    it('should return false for non-existent entry', () => {
      const result = manager.updateEntry('non_existent', { name: 'Test' });
      expect(result).toBe(false);
    });
  });

  describe('removeEntry', () => {
    it('should remove entry', () => {
      const entry = manager.addEntry({
        name: 'To Remove',
        pattern: 'test',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      expect(manager.removeEntry(entry.id)).toBe(true);
      expect(manager.getEntry(entry.id)).toBeNull();
    });
  });

  describe('toggleEntry', () => {
    it('should toggle entry enabled state', () => {
      const entry = manager.addEntry({
        name: 'Toggle Test',
        pattern: 'test',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      manager.toggleEntry(entry.id);
      expect(manager.getEntry(entry.id)?.enabled).toBe(false);

      manager.toggleEntry(entry.id);
      expect(manager.getEntry(entry.id)?.enabled).toBe(true);
    });
  });

  describe('testPattern', () => {
    it('should test pattern against values', () => {
      const result = manager.testPattern('test_*', 'wildcard', ['test_1', 'test_2', 'other']);

      expect(result.matches).toContain('test_1');
      expect(result.matches).toContain('test_2');
      expect(result.nonMatches).toContain('other');
    });
  });

  describe('import/export', () => {
    it('should export and import data', () => {
      manager.addEntry({
        name: 'Entry 1',
        pattern: 'pattern1',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      const exported = manager.exportData();
      const newManager = new BlacklistManager();
      newManager.clearAll();

      const result = newManager.importData(exported);
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      manager.addEntry({
        name: 'Global',
        pattern: 'g1',
        type: 'exact',
        scope: 'global',
        enabled: true,
      });

      manager.addEntry({
        name: 'Preset',
        pattern: 'p1',
        type: 'exact',
        scope: 'preset',
        enabled: false,
      });

      const stats = manager.getStatistics();

      expect(stats.totalEntries).toBe(2);
      expect(stats.enabledEntries).toBe(1);
      expect(stats.globalEntries).toBe(1);
      expect(stats.presetEntries).toBe(1);
    });
  });
});
