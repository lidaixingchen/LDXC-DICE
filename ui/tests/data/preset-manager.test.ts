import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PresetManager } from '@data/preset-manager';
import type { AdvancedDicePreset } from '@core/types';

describe('PresetManager', () => {
  let manager: PresetManager;

  const createTestPreset = (id: string, name: string): AdvancedDicePreset => ({
    id,
    name,
    kind: 'advanced',
    diceExpression: '1d100',
    outcomes: [
      { id: 'success', name: '成功', condition: '$roll >= 50', effects: [] },
      { id: 'failure', name: '失败', condition: '$roll < 50', effects: [] },
    ],
    attribute: { key: 'attr', label: '属性' },
  });

  beforeEach(() => {
    localStorage.clear();
    manager = new PresetManager();
    manager.setValidationEnabled(false);
  });

  describe('registerPreset', () => {
    it('should register a valid preset', () => {
      const preset = createTestPreset('test_1', '测试预设');
      const result = manager.registerPreset(preset);

      expect(result.valid).toBe(true);
      expect(manager.getPreset('test_1')).toEqual(preset);
    });

    it('should reject preset without id', () => {
      const preset = { ...createTestPreset('', '无ID预设') };
      const result = manager.registerPreset(preset);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
    });

    it('should update existing preset', () => {
      const preset1 = createTestPreset('test_1', '预设1');
      manager.registerPreset(preset1);

      const preset2 = { ...createTestPreset('test_1', '更新预设'), description: '新描述' };
      manager.registerPreset(preset2);

      const stored = manager.getPreset('test_1');
      expect(stored?.name).toBe('更新预设');
      expect(stored?.description).toBe('新描述');
    });
  });

  describe('unregisterPreset', () => {
    it('should remove existing preset', () => {
      const preset = createTestPreset('test_1', '测试预设');
      manager.registerPreset(preset);

      const result = manager.unregisterPreset('test_1');
      expect(result).toBe(true);
      expect(manager.getPreset('test_1')).toBeNull();
    });

    it('should return false for non-existent preset', () => {
      const result = manager.unregisterPreset('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('getPreset', () => {
    it('should return null for non-existent preset', () => {
      expect(manager.getPreset('non_existent')).toBeNull();
    });

    it('should return stored preset', () => {
      const preset = createTestPreset('test_1', '测试预设');
      manager.registerPreset(preset);

      const result = manager.getPreset('test_1');
      expect(result).toEqual(preset);
    });
  });

  describe('getAllPresets', () => {
    it('should return empty array when no presets', () => {
      expect(manager.getAllPresets()).toEqual([]);
    });

    it('should return all presets', () => {
      manager.registerPreset(createTestPreset('test_1', '预设1'));
      manager.registerPreset(createTestPreset('test_2', '预设2'));

      const presets = manager.getAllPresets();
      expect(presets).toHaveLength(2);
    });
  });

  describe('setCurrentPreset', () => {
    it('should set current preset', () => {
      manager.registerPreset(createTestPreset('test_1', '测试预设'));

      const result = manager.setCurrentPreset('test_1');
      expect(result).toBe(true);
      expect(manager.getCurrentPreset()?.id).toBe('test_1');
    });

    it('should return false for non-existent preset', () => {
      const result = manager.setCurrentPreset('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('getCurrentPreset', () => {
    it('should return null when no current preset', () => {
      expect(manager.getCurrentPreset()).toBeNull();
    });

    it('should return current preset', () => {
      manager.registerPreset(createTestPreset('test_1', '测试预设'));
      manager.setCurrentPreset('test_1');

      expect(manager.getCurrentPreset()?.id).toBe('test_1');
    });
  });

  describe('duplicatePreset', () => {
    it('should create a copy of existing preset', () => {
      manager.registerPreset(createTestPreset('test_1', '原预设'));

      const copy = manager.duplicatePreset('test_1', '复制预设');
      expect(copy).not.toBeNull();
      expect(copy?.name).toBe('复制预设');
      expect(copy?.id).not.toBe('test_1');
    });

    it('should return null for non-existent preset', () => {
      const result = manager.duplicatePreset('non_existent', '复制');
      expect(result).toBeNull();
    });
  });

  describe('updatePreset', () => {
    it('should update existing preset', () => {
      manager.registerPreset(createTestPreset('test_1', '原预设'));

      const result = manager.updatePreset('test_1', { name: '更新预设' });
      expect(result.valid).toBe(true);

      const preset = manager.getPreset('test_1');
      expect(preset?.name).toBe('更新预设');
    });

    it('should return invalid for non-existent preset', () => {
      const result = manager.updatePreset('non_existent', { name: '更新' });
      expect(result.valid).toBe(false);
    });
  });

  describe('importPreset', () => {
    it('should import valid preset JSON', () => {
      const preset = createTestPreset('imported', '导入预设');
      const json = JSON.stringify(preset);

      const result = manager.importPreset(json);
      expect(result.preset).not.toBeNull();
      expect(result.preset?.name).toBe('导入预设');
    });

    it('should reject invalid JSON', () => {
      const result = manager.importPreset('not json');
      expect(result.preset).toBeNull();
      expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid preset format', () => {
      const result = manager.importPreset(JSON.stringify({ name: '无效预设' }));
      expect(result.preset).toBeNull();
    });

    it('should generate new ID for duplicate ID', () => {
      manager.registerPreset(createTestPreset('test_1', '已存在'));

      const preset = createTestPreset('test_1', '同ID预设');
      const result = manager.importPreset(JSON.stringify(preset));

      expect(result.preset?.id).not.toBe('test_1');
    });
  });

  describe('exportPreset', () => {
    it('should export existing preset', () => {
      manager.registerPreset(createTestPreset('test_1', '测试预设'));

      const json = manager.exportPreset('test_1');
      expect(json).not.toBeNull();

      const parsed = JSON.parse(json!);
      expect(parsed.id).toBe('test_1');
    });

    it('should return null for non-existent preset', () => {
      const result = manager.exportPreset('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('searchPresets', () => {
    beforeEach(() => {
      manager.registerPreset(createTestPreset('test_1', '战斗检定'));
      manager.registerPreset(createTestPreset('test_2', '技能检定'));
      manager.registerPreset(createTestPreset('test_3', '属性检定'));
    });

    it('should find presets by name', () => {
      const results = manager.searchPresets('检定');
      expect(results).toHaveLength(3);
    });

    it('should find presets by partial name', () => {
      const results = manager.searchPresets('战斗');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('战斗检定');
    });

    it('should return empty array for no matches', () => {
      const results = manager.searchPresets('不存在');
      expect(results).toHaveLength(0);
    });
  });

  describe('matchOutcome', () => {
    it('should match outcome based on condition', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'crit', name: '大成功', condition: '$roll >= 95', effects: [], priority: 2 },
          { id: 'success', name: '成功', condition: '$roll >= 50', effects: [], priority: 1 },
          { id: 'failure', name: '失败', condition: '$roll < 50', effects: [], priority: 0 },
        ],
      };

      const critOutcome = manager.matchOutcome(preset, 98, { roll: 98 });
      expect(critOutcome?.id).toBe('crit');

      const successOutcome = manager.matchOutcome(preset, 60, { roll: 60 });
      expect(successOutcome?.id).toBe('success');

      const failureOutcome = manager.matchOutcome(preset, 30, { roll: 30 });
      expect(failureOutcome?.id).toBe('failure');
    });

    it('should respect priority order', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'low', name: '低优先级', condition: '$roll >= 50', effects: [], priority: 0 },
          { id: 'high', name: '高优先级', condition: '$roll >= 50', effects: [], priority: 10 },
        ],
      };

      const outcome = manager.matchOutcome(preset, 70, { roll: 70 });
      expect(outcome?.id).toBe('high');
    });

    it('should reject expression with function calls like alert', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: 'alert(1)', effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should reject expression with function calls like eval', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: 'eval(1)', effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should reject expression with object property access', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: 'window_location', effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should reject expression with string literals', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: "'hello'", effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should reject expression with curly braces', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: '{x:1}', effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should reject expression with semicolons', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: '1;2', effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should reject expression exceeding max length', () => {
      const longExpr = '1' + '+1'.repeat(300);
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'long', name: '超长', condition: longExpr, effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should allow valid comparison expressions', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'a', name: 'A', condition: '$roll >= 50 && $roll < 90', effects: [] },
          { id: 'b', name: 'B', condition: '$roll >= 90', effects: [] },
          { id: 'c', name: 'C', condition: '$roll < 50', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 70, { roll: 70 });
      expect(outcome?.id).toBe('a');
    });

    it('should allow modulo operator in expressions', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'even', name: '偶数', condition: '$roll % 2 === 0', effects: [] },
          { id: 'odd', name: '奇数', condition: '$roll % 2 !== 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('even');
    });

    it('should allow ternary operator in expressions', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'a', name: 'A', condition: '($roll >= 50 ? 1 : 0) === 1', effects: [] },
          { id: 'b', name: 'B', condition: '($roll >= 50 ? 1 : 0) === 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 70, { roll: 70 });
      expect(outcome?.id).toBe('a');
    });

    it('should allow underscore identifiers in expressions', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'a', name: 'A', condition: '$attr_mod >= 2', effects: [] },
          { id: 'b', name: 'B', condition: '$attr_mod < 2', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50, attr_mod: 3 });
      expect(outcome?.id).toBe('a');
    });

    it('should reject dangerous patterns like Function constructor', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: 'Function(1)', effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });

    it('should reject dangerous patterns like __proto__', () => {
      const preset: AdvancedDicePreset = {
        id: 'test',
        name: '测试',
        kind: 'advanced',
        diceExpression: '1d100',
        outcomes: [
          { id: 'hack', name: '注入', condition: '__proto__', effects: [] },
          { id: 'safe', name: '安全', condition: '$roll >= 0', effects: [] },
        ],
      };

      const outcome = manager.matchOutcome(preset, 50, { roll: 50 });
      expect(outcome?.id).toBe('safe');
    });
  });

  describe('validateAllPresets', () => {
    it('should return validation results for all presets', () => {
      manager.registerPreset(createTestPreset('valid', '有效预设'));
      manager.registerPreset({
        ...createTestPreset('invalid', '无效预设'),
        diceExpression: 'invalid',
      });

      const results = manager.validateAllPresets();
      expect(results.size).toBe(2);
    });
  });

  describe('getInvalidPresets', () => {
    it('should return only invalid presets', () => {
      manager.registerPreset(createTestPreset('valid', '有效预设'));
      manager.registerPreset({
        ...createTestPreset('invalid', '无效预设'),
        diceExpression: '',
      });

      const invalid = manager.getInvalidPresets();
      expect(invalid).toHaveLength(1);
      expect(invalid[0].id).toBe('invalid');
    });
  });
});
