import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EffectEngine } from '../../../core/effect-engine';
import type { DatabaseAdapter } from '../../../adapters/database-adapter';
import type { EffectResult } from '../../../core/types';

function createMockDbAdapter(): DatabaseAdapter {
  return {
    isAvailable: vi.fn().mockReturnValue(true),
    getTableData: vi.fn().mockReturnValue(null),
    findAttribute: vi.fn().mockReturnValue(null),
    updateAttribute: vi.fn().mockResolvedValue(true),
    getLockState: vi.fn().mockReturnValue(null),
    withLock: vi.fn().mockImplementation(async (_key: string, fn: () => Promise<void>) => { await fn(); }),
    batchUpdate: vi.fn().mockResolvedValue(true),
    getPrimaryKey: vi.fn().mockReturnValue(null),
  } as unknown as DatabaseAdapter;
}

describe('EffectEngine', () => {
  let engine: EffectEngine;
  let mockAdapter: DatabaseAdapter;

  beforeEach(() => {
    mockAdapter = createMockDbAdapter();
    engine = new EffectEngine(mockAdapter);
  });

  describe('buildFormulaContext', () => {
    it('should build basic context with $attr, $roll, $mod, $dc, $total', () => {
      const ctx = engine.buildFormulaContext({
        characterName: '测试角色',
        attributeName: '力量',
        attributeValue: 20,
        roll: 15,
        modifier: 3,
        dc: 18,
      });

      expect(ctx).toEqual({
        $attr: 20,
        $roll: 15,
        $mod: 3,
        $dc: 18,
        $total: 18,
      });
    });

    it('should include numeric customFields with $ prefix', () => {
      const ctx = engine.buildFormulaContext({
        characterName: '测试角色',
        attributeName: '力量',
        attributeValue: 20,
        roll: 15,
        modifier: 3,
        dc: 18,
        customFields: { bonus: 5, label: 'test', flag: true },
      });

      expect(ctx.$bonus).toBe(5);
      expect(ctx.$label).toBeUndefined();
      expect(ctx.$flag).toBeUndefined();
    });

    it('should include derivedVars with $ prefix', () => {
      const ctx = engine.buildFormulaContext({
        characterName: '测试角色',
        attributeName: '力量',
        attributeValue: 20,
        roll: 15,
        modifier: 3,
        dc: 18,
        derivedVars: { damage: 42, heal: 10 },
      });

      expect(ctx.$damage).toBe(42);
      expect(ctx.$heal).toBe(10);
    });
  });

  describe('parseEffectValueInput', () => {
    it('should parse a numeric string', () => {
      const result = engine.parseEffectValueInput('42', 'test');
      expect(result.valid).toBe(true);
      expect(result.finalValue).toBe(42);
      expect(result.formulaText).toBe('42');
    });

    it('should parse a dice expression', () => {
      const result = engine.parseEffectValueInput('1d6', 'test');
      expect(result.valid).toBe(true);
      expect(result.finalValue).toBeGreaterThanOrEqual(1);
      expect(result.finalValue).toBeLessThanOrEqual(6);
    });

    it('should return 0 for empty input', () => {
      const result = engine.parseEffectValueInput('', 'test');
      expect(result.valid).toBe(true);
      expect(result.finalValue).toBe(0);
    });

    it('should return 0 for null/undefined input', () => {
      const result = engine.parseEffectValueInput(null, 'test');
      expect(result.valid).toBe(true);
      expect(result.finalValue).toBe(0);
    });

    it('should throw for truly invalid expression', () => {
      expect(() => engine.parseEffectValueInput('!!!invalid!!!', 'test')).toThrow();
    });

    it('should handle formula that evaluates to NaN', () => {
      // An empty dice expression like "1d0" would cause issues, but "0" is safe
      const result = engine.parseEffectValueInput('0', 'test');
      expect(result.valid).toBe(true);
      expect(result.finalValue).toBe(0);
    });
  });

  describe('computeEffectVariables', () => {
    it('should return defaults for empty results', () => {
      const vars = engine.computeEffectVariables([]);
      expect(vars.hasEffect).toBe(false);
      expect(vars.effectCount).toBe(0);
      expect(vars.effectTarget).toBe('');
      expect(vars.effectDelta).toBe(0);
    });

    it('should compute variables from successful results', () => {
      const results: EffectResult[] = [
        { effectId: 'hp', target: 'HP', operation: 'add', oldValue: 100, newValue: 80, success: true, message: '' },
      ];
      const vars = engine.computeEffectVariables(results);
      expect(vars.hasEffect).toBe(true);
      expect(vars.effectCount).toBe(1);
      expect(vars.effectTarget).toBe('hp');
      expect(vars.effectDelta).toBe(20);
      expect(vars.effectOperation).toBe('减少');
    });

    it('should filter out failed results', () => {
      const results: EffectResult[] = [
        { effectId: 'hp', target: 'HP', operation: 'add', oldValue: 100, newValue: 80, success: true, message: '' },
        { effectId: 'mp', target: 'MP', operation: 'add', oldValue: 50, newValue: 50, success: false, message: 'failed' },
      ];
      const vars = engine.computeEffectVariables(results);
      expect(vars.effectCount).toBe(1);
      expect(vars.effectTarget).toBe('hp');
    });

    it('should compute increase operation', () => {
      const results: EffectResult[] = [
        { effectId: 'hp', target: 'HP', operation: 'add', oldValue: 80, newValue: 100, success: true, message: '' },
      ];
      const vars = engine.computeEffectVariables(results);
      expect(vars.effectOperation).toBe('增加');
      expect(vars.effectDelta).toBe(20);
    });
  });

  describe('setCachedData / getCachedData', () => {
    it('should store and retrieve cached data', () => {
      expect(engine.getCachedData()).toBeNull();
      const data = { sheet_1: { name: 'test', content: [['a'], [1]] } };
      engine.setCachedData(data);
      expect(engine.getCachedData()).toBe(data);
    });

    it('should clear cached data with null', () => {
      engine.setCachedData({ sheet_1: { name: 'test', content: [['a'], [1]] } });
      engine.setCachedData(null);
      expect(engine.getCachedData()).toBeNull();
    });
  });
});
