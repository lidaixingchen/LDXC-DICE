import { describe, it, expect, beforeEach } from 'vitest';
import { Validator, createValidator, validateValue, isValid, getErrorMessages } from '@core/validation/core';
import { validatePreset, presetValidationRules, getValidationSummary } from '@core/validation/rules';
import type { AdvancedDicePreset } from '@core/types';

describe('validation/core', () => {
  describe('Validator', () => {
    let validator: Validator;

    beforeEach(() => {
      validator = createValidator();
    });

    describe('validate string', () => {
      it('should validate required string', () => {
        const result = validator.validate(undefined, { type: 'string', required: true });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('REQUIRED');
      });

      it('should validate string length', () => {
        const result = validator.validate('ab', {
          type: 'string',
          minLength: 3,
          maxLength: 10,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('MIN_LENGTH');
      });

      it('should validate string pattern', () => {
        const result = validator.validate('abc', {
          type: 'string',
          pattern: /^d/,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('PATTERN_MISMATCH');
      });

      it('should validate enum values', () => {
        const result = validator.validate('invalid', {
          type: 'string',
          enum: ['valid', 'options'],
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('ENUM_MISMATCH');
      });
    });

    describe('validate number', () => {
      it('should validate number range', () => {
        const result = validator.validate(5, {
          type: 'number',
          min: 10,
          max: 100,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('MIN_VALUE');
      });

      it('should validate NaN', () => {
        const result = validator.validate(NaN, { type: 'number' });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('INVALID_NUMBER');
      });

      it('should accept valid number', () => {
        const result = validator.validate(50, {
          type: 'number',
          min: 0,
          max: 100,
        });
        expect(result.valid).toBe(true);
      });
    });

    describe('validate array', () => {
      it('should validate array length', () => {
        const result = validator.validate([1, 2], {
          type: 'array',
          min: 3,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('MIN_LENGTH');
      });

      it('should validate array items', () => {
        const result = validator.validate([1, 'invalid', 3], {
          type: 'array',
          items: { type: 'number' },
        });
        expect(result.valid).toBe(false);
      });

      it('should accept valid array', () => {
        const result = validator.validate([1, 2, 3], {
          type: 'array',
          items: { type: 'number' },
        });
        expect(result.valid).toBe(true);
      });
    });

    describe('validate object', () => {
      it('should validate object properties', () => {
        const result = validator.validate(
          { name: 'test', age: 25 },
          {
            type: 'object',
            properties: {
              name: { type: 'string', required: true },
              age: { type: 'number', min: 0, max: 150 },
            },
          },
        );
        expect(result.valid).toBe(true);
      });

      it('should detect missing required properties', () => {
        const result = validator.validate({}, {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
          },
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('REQUIRED');
      });

      it('should warn on unknown fields in strict mode', () => {
        const strictValidator = createValidator({ strictMode: true });
        const result = strictValidator.validate(
          { name: 'test', unknown: 'field' },
          {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        );
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('validate boolean', () => {
      it('should accept boolean', () => {
        expect(validator.validate(true, { type: 'boolean' }).valid).toBe(true);
        expect(validator.validate(false, { type: 'boolean' }).valid).toBe(true);
      });

      it('should reject non-boolean', () => {
        const result = validator.validate('true', { type: 'boolean' });
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateValue', () => {
    it('should validate value with schema', () => {
      const result = validateValue('test', {
        type: 'string',
        minLength: 3,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('isValid', () => {
    it('should return true for valid result', () => {
      const result = { valid: true, errors: [], warnings: [], infos: [] };
      expect(isValid(result)).toBe(true);
    });

    it('should return false for invalid result', () => {
      const result = {
        valid: false,
        errors: [{ path: 'test', message: 'Error', severity: 'error' as const, code: 'TEST' }],
        warnings: [],
        infos: [],
      };
      expect(isValid(result)).toBe(false);
    });
  });

  describe('getErrorMessages', () => {
    it('should extract error messages', () => {
      const result = {
        valid: false,
        errors: [
          { path: 'name', message: 'Name is required', severity: 'error' as const, code: 'REQUIRED' },
          { path: 'age', message: 'Age must be positive', severity: 'error' as const, code: 'MIN_VALUE' },
        ],
        warnings: [],
        infos: [],
      };
      const messages = getErrorMessages(result);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('Name is required');
    });
  });
});

describe('validation/rules', () => {
  describe('presetValidationRules', () => {
    it('should have required rules', () => {
      const ruleIds = presetValidationRules.map(r => r.id);
      expect(ruleIds).toContain('preset_id_required');
      expect(ruleIds).toContain('preset_name_required');
      expect(ruleIds).toContain('dice_expression_valid');
      expect(ruleIds).toContain('outcomes_not_empty');
    });
  });

  describe('validatePreset', () => {
    const createValidPreset = (): AdvancedDicePreset => ({
      id: 'test_preset',
      name: '测试预设',
      kind: 'advanced',
      diceExpression: '1d100',
      outcomes: [
        {
          id: 'success',
          name: '成功',
          condition: '$roll >= 50',
          effects: [],
        },
        {
          id: 'failure',
          name: '失败',
          condition: '$roll < 50',
          effects: [],
        },
      ],
      attribute: { key: 'attr', label: '属性' },
    });

    it('should validate a valid preset', () => {
      const preset = createValidPreset();
      const result = validatePreset(preset);
      expect(result.valid).toBe(true);
    });

    it('should detect missing ID', () => {
      const preset = { ...createValidPreset(), id: '' };
      const result = validatePreset(preset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'preset_id_required')).toBe(true);
    });

    it('should detect missing name', () => {
      const preset = { ...createValidPreset(), name: '' };
      const result = validatePreset(preset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'preset_name_required')).toBe(true);
    });

    it('should detect invalid dice expression', () => {
      const preset = { ...createValidPreset(), diceExpression: 'invalid' };
      const result = validatePreset(preset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'dice_expression_valid')).toBe(true);
    });

    it('should detect empty outcomes', () => {
      const preset = { ...createValidPreset(), outcomes: [] };
      const result = validatePreset(preset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'outcomes_not_empty')).toBe(true);
    });

    it('should detect duplicate outcome IDs', () => {
      const preset: AdvancedDicePreset = {
        ...createValidPreset(),
        outcomes: [
          { id: 'duplicate', name: '结果1', effects: [] },
          { id: 'duplicate', name: '结果2', effects: [] },
        ],
      };
      const result = validatePreset(preset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'outcome_id_unique')).toBe(true);
    });

    it('should detect duplicate custom field IDs', () => {
      const preset: AdvancedDicePreset = {
        ...createValidPreset(),
        customFields: [
          { id: 'field1', name: '字段1', type: 'number' },
          { id: 'field1', name: '字段2', type: 'number' },
        ],
      };
      const result = validatePreset(preset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'custom_field_id_unique')).toBe(true);
    });

    it('should validate effects', () => {
      const preset: AdvancedDicePreset = {
        ...createValidPreset(),
        outcomes: [
          {
            id: 'test',
            name: '测试',
            effects: [
              {
                id: '',
                target: '',
                operation: 'invalid' as any,
                value: NaN,
              },
            ],
          },
        ],
      };
      const result = validatePreset(preset);
      expect(result.valid).toBe(false);
    });

    it('should warn on invalid version format', () => {
      const preset = { ...createValidPreset(), version: 'invalid' };
      const result = validatePreset(preset);
      expect(result.infos.some(e => e.code === 'version_format')).toBe(true);
    });
  });

  describe('getValidationSummary', () => {
    it('should generate summary for valid result', () => {
      const result = { valid: true, errors: [], warnings: [], infos: [] };
      const summary = getValidationSummary(result);
      expect(summary).toContain('验证通过');
    });

    it('should generate summary for invalid result', () => {
      const result = {
        valid: false,
        errors: [{ path: 'test', message: 'Error', severity: 'error' as const, code: 'TEST' }],
        warnings: [{ path: 'test', message: 'Warning', severity: 'warning' as const, code: 'WARN' }],
        infos: [],
      };
      const summary = getValidationSummary(result);
      expect(summary).toContain('验证失败');
      expect(summary).toContain('1 个错误');
      expect(summary).toContain('1 个警告');
    });
  });
});
