import { describe, it, expect } from 'vitest';
import { safeEval, safeEvalCondition } from '../../../core/safe-eval';

describe('safeEval', () => {
  describe('basic arithmetic', () => {
    it('should evaluate addition', () => {
      expect(safeEval('1 + 2')).toBe(3);
    });

    it('should evaluate subtraction', () => {
      expect(safeEval('10 - 3')).toBe(7);
    });

    it('should evaluate multiplication', () => {
      expect(safeEval('4 * 5')).toBe(20);
    });

    it('should evaluate division', () => {
      expect(safeEval('20 / 4')).toBe(5);
    });

    it('should evaluate modulo', () => {
      expect(safeEval('10 % 3')).toBe(1);
    });

    it('should respect operator precedence', () => {
      expect(safeEval('1 + 2 * 3')).toBe(7);
      expect(safeEval('2 * 3 + 1')).toBe(7);
    });

    it('should handle parentheses', () => {
      expect(safeEval('(1 + 2) * 3')).toBe(9);
    });

    it('should handle nested parentheses', () => {
      expect(safeEval('((2 + 3) * (4 - 1))')).toBe(15);
    });
  });

  describe('negative numbers', () => {
    it('should handle unary minus', () => {
      expect(safeEval('-5')).toBe(-5);
    });

    it('should handle negative in expression', () => {
      expect(safeEval('-5 + 3')).toBe(-2);
    });

    it('should handle negative after operator', () => {
      expect(safeEval('10 + -3')).toBe(7);
    });
  });

  describe('decimal numbers', () => {
    it('should handle decimals', () => {
      expect(safeEval('3.14 * 2')).toBeCloseTo(6.28);
    });

    it('should handle .5 shorthand', () => {
      expect(safeEval('.5 * 10')).toBe(5);
    });
  });

  describe('functions', () => {
    it('should evaluate abs', () => {
      expect(safeEval('abs(-5)')).toBe(5);
      expect(safeEval('abs(5)')).toBe(5);
    });

    it('should evaluate ceil', () => {
      expect(safeEval('ceil(3.2)')).toBe(4);
      expect(safeEval('ceil(3.8)')).toBe(4);
    });

    it('should evaluate floor', () => {
      expect(safeEval('floor(3.7)')).toBe(3);
      expect(safeEval('floor(3.2)')).toBe(3);
    });

    it('should evaluate round', () => {
      expect(safeEval('round(3.5)')).toBe(4);
      expect(safeEval('round(3.4)')).toBe(3);
    });

    it('should evaluate max', () => {
      expect(safeEval('max(10, 20)')).toBe(20);
      expect(safeEval('max(20, 10)')).toBe(20);
    });

    it('should evaluate min', () => {
      expect(safeEval('min(10, 20)')).toBe(10);
    });

    it('should evaluate pow', () => {
      expect(safeEval('pow(2, 3)')).toBe(8);
      expect(safeEval('pow(10, 2)')).toBe(100);
    });

    it('should handle nested functions', () => {
      expect(safeEval('max(min(5, 3), 1)')).toBe(3);
      expect(safeEval('floor(max(3.7, 2.1))')).toBe(3);
    });

    it('should handle functions with expressions as args', () => {
      expect(safeEval('max(1 + 2, 3 * 4)')).toBe(12);
    });

    it('should handle max with more than 2 args', () => {
      expect(safeEval('max(1, 5, 3)')).toBe(5);
    });
  });

  describe('comparison operators', () => {
    it('should evaluate >', () => {
      expect(safeEval('10 > 5')).toBe(1);
      expect(safeEval('3 > 5')).toBe(0);
    });

    it('should evaluate >=', () => {
      expect(safeEval('5 >= 5')).toBe(1);
      expect(safeEval('4 >= 5')).toBe(0);
    });

    it('should evaluate <', () => {
      expect(safeEval('3 < 5')).toBe(1);
      expect(safeEval('10 < 5')).toBe(0);
    });

    it('should evaluate <=', () => {
      expect(safeEval('5 <= 5')).toBe(1);
      expect(safeEval('6 <= 5')).toBe(0);
    });

    it('should evaluate ==', () => {
      expect(safeEval('5 == 5')).toBe(1);
      expect(safeEval('5 == 6')).toBe(0);
    });

    it('should evaluate !=', () => {
      expect(safeEval('5 != 6')).toBe(1);
      expect(safeEval('5 != 5')).toBe(0);
    });
  });

  describe('logical operators', () => {
    it('should evaluate &&', () => {
      expect(safeEval('1 && 1')).toBe(1);
      expect(safeEval('1 && 0')).toBe(0);
      expect(safeEval('0 && 1')).toBe(0);
    });

    it('should evaluate ||', () => {
      expect(safeEval('1 || 0')).toBe(1);
      expect(safeEval('0 || 1')).toBe(1);
      expect(safeEval('0 || 0')).toBe(0);
    });

    it('should handle mixed logical and comparison', () => {
      expect(safeEval('10 > 5 && 3 < 7')).toBe(1);
      expect(safeEval('10 < 5 || 3 < 7')).toBe(1);
    });
  });

  describe('ternary operator', () => {
    it('should evaluate ternary', () => {
      expect(safeEval('1 > 0 ? 10 : 20')).toBe(10);
      expect(safeEval('0 > 1 ? 10 : 20')).toBe(20);
    });

    it('should handle nested ternary', () => {
      expect(safeEval('1 > 0 ? (2 > 1 ? 100 : 200) : 300')).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty string', () => {
      expect(safeEval('')).toBe(0);
      expect(safeEval('   ')).toBe(0);
    });

    it('should evaluate single number', () => {
      expect(safeEval('42')).toBe(42);
    });

    it('should handle complex expression', () => {
      expect(safeEval('max(10, 20) + min(5, 3) * 2')).toBe(26);
    });
  });

  describe('safety', () => {
    it('should reject unknown identifiers', () => {
      expect(() => safeEval('window')).toThrow(EvalError);
      expect(() => safeEval('document')).toThrow(EvalError);
      expect(() => safeEval('alert(1)')).toThrow(EvalError);
    });

    it('should reject dangerous characters', () => {
      expect(() => safeEval('1;2')).toThrow(EvalError);
      expect(() => safeEval('{a:1}')).toThrow(EvalError);
      expect(() => safeEval('[1,2]')).toThrow(EvalError);
      expect(() => safeEval('"hello"')).toThrow(EvalError);
      expect(() => safeEval("'hello'")).toThrow(EvalError);
    });

    it('should reject expressions exceeding max length', () => {
      const longExpr = '1+'.repeat(600) + '1';
      expect(() => safeEval(longExpr)).toThrow(EvalError);
    });

    it('should reject unknown function names', () => {
      expect(() => safeEval('eval(1)')).toThrow(EvalError);
      expect(() => safeEval('Function("return 1")')).toThrow(EvalError);
    });
  });
});

describe('safeEvalCondition', () => {
  it('should return true for truthy expressions', () => {
    expect(safeEvalCondition('10 > 5')).toBe(true);
    expect(safeEvalCondition('1')).toBe(true);
  });

  it('should return false for falsy expressions', () => {
    expect(safeEvalCondition('5 > 10')).toBe(false);
    expect(safeEvalCondition('0')).toBe(false);
  });

  it('should return true for empty string', () => {
    expect(safeEvalCondition('')).toBe(true);
  });

  it('should handle complex conditions', () => {
    expect(safeEvalCondition('10 >= 5 && 3 < 7')).toBe(true);
    expect(safeEvalCondition('10 < 5 || 3 > 7')).toBe(false);
  });
});
