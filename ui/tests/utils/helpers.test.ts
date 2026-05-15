import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uuidv4,
  clamp,
  debounce,
  deepClone,
  isEqual,
  formatNumber,
  formatDiceRoll,
  escapeHtml,
  unescapeHtml,
  parseJsonSafe,
  safeGet,
  safeSet,
  generateId,
  generateUniqueName,
  isNpcTableName,
  compareVersion,
  capitalizeFirst,
  truncate,
  iterateSheets,
} from '../../../utils/helpers';

describe('uuidv4', () => {
  it('should return a string in UUID format', () => {
    const id = uuidv4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuidv4()));
    expect(ids.size).toBe(100);
  });
});

describe('clamp', () => {
  it('should return value within range', () => expect(clamp(5, 0, 10)).toBe(5));
  it('should clamp to min', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('should clamp to max', () => expect(clamp(15, 0, 10)).toBe(10));
  it('should handle min === max', () => expect(clamp(5, 3, 3)).toBe(3));
});

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should delay execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('deepClone', () => {
  it('should deep clone objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('should clone arrays', () => {
    const arr = [1, [2, 3]];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });

  it('should handle primitives', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(null)).toBe(null);
  });
});

describe('isEqual', () => {
  it('should compare primitives', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual('a', 'a')).toBe(true);
  });

  it('should handle NaN', () => expect(isEqual(NaN, NaN)).toBe(true));

  it('should compare objects deeply', () => {
    expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('should compare arrays', () => {
    expect(isEqual([1, 2], [1, 2])).toBe(true);
    expect(isEqual([1, 2], [1, 3])).toBe(false);
  });

  it('should handle null', () => {
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(null, {})).toBe(false);
  });
});

describe('formatNumber', () => {
  it('should format with default decimals', () => expect(formatNumber(3.7)).toBe('4'));
  it('should format with specified decimals', () => expect(formatNumber(3.14159, 2)).toBe('3.14'));
  it('should handle zero', () => expect(formatNumber(0)).toBe('0'));
});

describe('formatDiceRoll', () => {
  it('should return 0 for empty array', () => expect(formatDiceRoll([])).toBe('0'));
  it('should return single value as string', () => expect(formatDiceRoll([5])).toBe('5'));
  it('should format multiple dice', () => expect(formatDiceRoll([3, 4, 2])).toBe('3 + 4 + 2 = 9'));
});

describe('escapeHtml / unescapeHtml', () => {
  it('should escape HTML entities', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('should unescape HTML entities', () => {
    expect(unescapeHtml('&lt;div&gt;')).toBe('<div>');
    expect(unescapeHtml('&amp;')).toBe('&');
    expect(unescapeHtml('&#039;')).toBe("'");
  });

  it('should roundtrip', () => {
    const original = '<b>"Hello" & \'World\'</b>';
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });
});

describe('parseJsonSafe', () => {
  it('should parse valid JSON', () => expect(parseJsonSafe('{"a":1}', {})).toEqual({ a: 1 }));
  it('should return fallback for invalid JSON', () => expect(parseJsonSafe('invalid', { default: true })).toEqual({ default: true }));
  it('should return fallback for empty string', () => expect(parseJsonSafe('', [])).toEqual([]));
});

describe('safeGet', () => {
  it('should get nested value', () => expect(safeGet({ a: { b: { c: 42 } } }, 'a.b.c', 0)).toBe(42));
  it('should return fallback for missing path', () => expect(safeGet({ a: 1 }, 'b.c.d', -1)).toBe(-1));
  it('should return fallback for null intermediate', () => expect(safeGet({ a: null }, 'a.b', -1)).toBe(-1));
  it('should handle empty path', () => expect(safeGet({ a: 1 }, '', -1)).toBe(-1));
});

describe('safeSet', () => {
  it('should set nested value', () => {
    const obj: Record<string, unknown> = {};
    safeSet(obj, 'a.b.c', 42);
    expect((obj.a as Record<string, Record<string, number>>).b.c).toBe(42);
  });

  it('should overwrite non-object intermediate', () => {
    const obj: Record<string, unknown> = { a: 'string' };
    safeSet(obj, 'a.b', 1);
    expect((obj.a as Record<string, number>).b).toBe(1);
  });
});

describe('generateId', () => {
  it('should generate ID without prefix', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate ID with prefix', () => {
    const id = generateId('test');
    expect(id).toMatch(/^test_/);
  });
});

describe('generateUniqueName', () => {
  it('should return base name if not taken', () => expect(generateUniqueName('foo', ['bar', 'baz'])).toBe('foo'));
  it('should append (2) if base name taken', () => expect(generateUniqueName('foo', ['foo'])).toBe('foo (2)'));
  it('should increment counter', () => expect(generateUniqueName('foo', ['foo', 'foo (2)'])).toBe('foo (3)'));
});

describe('isNpcTableName', () => {
  it('should match NPC keywords', () => {
    expect(isNpcTableName('重要人物表')).toBe(true);
    expect(isNpcTableName('重要角色表')).toBe(true);
    expect(isNpcTableName('NPC列表')).toBe(true);
    expect(isNpcTableName('npc_table')).toBe(true);
  });

  it('should be case insensitive', () => expect(isNpcTableName('NPC')).toBe(true));
  it('should not match unrelated names', () => expect(isNpcTableName('主角信息')).toBe(false));
});

describe('compareVersion', () => {
  it('should return 0 for equal versions', () => expect(compareVersion('1.0.0', '1.0.0')).toBe(0));
  it('should return -1 when first is smaller', () => expect(compareVersion('1.0.0', '1.0.1')).toBe(-1));
  it('should return 1 when first is larger', () => expect(compareVersion('2.0.0', '1.9.9')).toBe(1));
  it('should handle different lengths', () => expect(compareVersion('1.0', '1.0.0')).toBe(0));
});

describe('capitalizeFirst', () => {
  it('should capitalize first letter', () => expect(capitalizeFirst('hello')).toBe('Hello'));
  it('should handle empty string', () => expect(capitalizeFirst('')).toBe(''));
  it('should handle single char', () => expect(capitalizeFirst('a')).toBe('A'));
});

describe('truncate', () => {
  it('should not truncate short strings', () => expect(truncate('hello', 10)).toBe('hello'));
  it('should truncate with default suffix', () => expect(truncate('hello world', 8)).toBe('hello...'));
  it('should truncate with custom suffix', () => expect(truncate('hello world', 6, '~')).toBe('hello~'));
});

describe('iterateSheets', () => {
  it('should yield nothing for undefined data', () => {
    expect([...iterateSheets(undefined)]).toEqual([]);
  });

  it('should skip non-sheet keys', () => {
    const data = { not_a_sheet: { name: 'test', content: [['a'], [1]] } };
    expect([...iterateSheets(data as Parameters<typeof iterateSheets>[0])]).toEqual([]);
  });

  it('should skip sheets with less than 2 rows', () => {
    const data = { sheet_1: { name: 'test', content: [['a']] } };
    expect([...iterateSheets(data as Parameters<typeof iterateSheets>[0])]).toEqual([]);
  });

  it('should yield valid sheets', () => {
    const data = {
      sheet_1: { name: 'Test', content: [['name', 'value'], ['a', 1]] },
    };
    const result = [...iterateSheets(data as Parameters<typeof iterateSheets>[0])];
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('sheet_1');
    expect(result[0].headers).toEqual(['name', 'value']);
    expect(result[0].sheet.name).toBe('Test');
  });
});
