import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateFormat,
  validateEnum,
  validateNumeric,
  validateKeyValue,
  validateRowLimit,
  groupErrorsByTable,
  type ValidationError,
} from '../../../data/validation-executor';

describe('validateRequired', () => {
  it('should return true for non-empty values', () => {
    expect(validateRequired('hello')).toBe(true);
    expect(validateRequired(42)).toBe(true);
    expect(validateRequired(0)).toBe(true);
  });

  it('should return false for null/undefined/empty', () => {
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
    expect(validateRequired('')).toBe(false);
  });
});

describe('validateFormat', () => {
  it('should return true for matching pattern', () => {
    expect(validateFormat('abc123', '^[a-z]+\\d+$')).toBe(true);
  });

  it('should return false for non-matching pattern', () => {
    expect(validateFormat('123abc', '^[a-z]+\\d+$')).toBe(false);
  });

  it('should return true for empty pattern', () => {
    expect(validateFormat('anything', '')).toBe(true);
  });

  it('should return true for empty value', () => {
    expect(validateFormat('', '^.+$')).toBe(true);
  });

  it('should return false for invalid regex', () => {
    expect(validateFormat('test', '[invalid')).toBe(false);
  });
});

describe('validateEnum', () => {
  it('should return true for allowed value', () => {
    expect(validateEnum('a', ['a', 'b', 'c'])).toBe(true);
  });

  it('should return false for disallowed value', () => {
    expect(validateEnum('d', ['a', 'b', 'c'])).toBe(false);
  });

  it('should return true for empty allowed values list', () => {
    expect(validateEnum('anything', [])).toBe(true);
  });

  it('should return true for empty value', () => {
    expect(validateEnum('', ['a', 'b'])).toBe(true);
  });
});

describe('validateNumeric', () => {
  it('should return true for valid numbers', () => {
    expect(validateNumeric(42)).toBe(true);
    expect(validateNumeric('42')).toBe(true);
    expect(validateNumeric(3.14)).toBe(true);
  });

  it('should return true for null/undefined/empty', () => {
    expect(validateNumeric(null)).toBe(true);
    expect(validateNumeric(undefined)).toBe(true);
    expect(validateNumeric('')).toBe(true);
  });

  it('should return false for non-numeric', () => {
    expect(validateNumeric('abc')).toBe(false);
  });

  it('should check min range', () => {
    expect(validateNumeric(5, 10)).toBe(false);
    expect(validateNumeric(15, 10)).toBe(true);
  });

  it('should check max range', () => {
    expect(validateNumeric(15, undefined, 10)).toBe(false);
    expect(validateNumeric(5, undefined, 10)).toBe(true);
  });

  it('should check both min and max', () => {
    expect(validateNumeric(5, 1, 10)).toBe(true);
    expect(validateNumeric(0, 1, 10)).toBe(false);
    expect(validateNumeric(15, 1, 10)).toBe(false);
  });
});

describe('validateKeyValue', () => {
  it('should return true for valid key:value pairs', () => {
    expect(validateKeyValue('力量:10;敏捷:5', {})).toBe(true);
  });

  it('should return true for empty value', () => {
    expect(validateKeyValue('', {})).toBe(true);
  });

  it('should return false for missing colon', () => {
    expect(validateKeyValue('力量10', {})).toBe(false);
  });

  it('should validate numeric values when configured', () => {
    expect(validateKeyValue('力量:10', { valueType: 'numeric', valueMin: 0, valueMax: 100 })).toBe(true);
    expect(validateKeyValue('力量:abc', { valueType: 'numeric' })).toBe(false);
  });

  it('should check value range when configured', () => {
    expect(validateKeyValue('力量:150', { valueType: 'numeric', valueMin: 0, valueMax: 100 })).toBe(false);
  });
});

describe('validateRowLimit', () => {
  it('should return true for count within range', () => {
    expect(validateRowLimit(5, 1, 10)).toBe(true);
  });

  it('should return false for count below min', () => {
    expect(validateRowLimit(0, 1, 10)).toBe(false);
  });

  it('should return false for count above max', () => {
    expect(validateRowLimit(15, 1, 10)).toBe(false);
  });

  it('should handle no limits', () => {
    expect(validateRowLimit(100)).toBe(true);
  });
});

describe('groupErrorsByTable', () => {
  it('should group errors by tableName', () => {
    const errors: ValidationError[] = [
      { ruleId: '1', ruleName: 'r1', ruleType: 'required', rule: {} as never, tableName: '表A', rowIndex: 0, columnName: 'col', currentValue: null, errorMessage: 'err1', severity: 'error' },
      { ruleId: '2', ruleName: 'r2', ruleType: 'required', rule: {} as never, tableName: '表A', rowIndex: 1, columnName: 'col', currentValue: null, errorMessage: 'err2', severity: 'error' },
      { ruleId: '3', ruleName: 'r3', ruleType: 'required', rule: {} as never, tableName: '表B', rowIndex: 0, columnName: 'col', currentValue: null, errorMessage: 'err3', severity: 'warning' },
    ];
    const grouped = groupErrorsByTable(errors);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['表A']).toHaveLength(2);
    expect(grouped['表B']).toHaveLength(1);
  });

  it('should return empty object for empty input', () => {
    expect(groupErrorsByTable([])).toEqual({});
  });
});
