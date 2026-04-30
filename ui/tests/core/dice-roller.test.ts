import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  tokenize,
  validateTokens,
  DiceExpressionError,
  parseDice,
  rollSingleDie,
  rollDiceSet,
  applyKeepHighest,
  applyKeepLowest,
  applyDropHighest,
  applyDropLowest,
  applyExplode,
  applyPenetrate,
  rollDiceExpression,
  rollComplexDiceExpression,
  evaluateFormula,
  evaluateCondition,
} from '@core/dice-roller';

describe('dice-roller', () => {
  describe('tokenize', () => {
    it('should tokenize simple dice expression', () => {
      const tokens = tokenize('1d100');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('dice');
      expect(tokens[0].value).toBe('1d100');
    });

    it('should tokenize dice with modifier', () => {
      const tokens = tokenize('2d6+3');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('dice');
      expect(tokens[1].type).toBe('operator');
      expect(tokens[2].type).toBe('number');
    });

    it('should tokenize complex expression', () => {
      const tokens = tokenize('1d20 + 2d6 - 5');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.some(t => t.type === 'dice')).toBe(true);
      expect(tokens.some(t => t.type === 'operator')).toBe(true);
    });

    it('should handle parentheses', () => {
      const tokens = tokenize('(1d6+2)*3');
      expect(tokens.some(t => t.type === 'paren')).toBe(true);
    });

    it('should ignore whitespace', () => {
      const tokens = tokenize('1d6  +  3');
      expect(tokens).toHaveLength(3);
    });
  });

  describe('parseDice', () => {
    it('should parse basic dice notation', () => {
      const result = parseDice('1d6');
      expect(result).toEqual({
        count: 1,
        sides: 6,
        modifier: undefined,
        modifierValue: undefined,
      });
    });

    it('should parse dice with count', () => {
      const result = parseDice('3d6');
      expect(result?.count).toBe(3);
      expect(result?.sides).toBe(6);
    });

    it('should parse dice with keep modifier', () => {
      const result = parseDice('4d6k3');
      expect(result?.count).toBe(4);
      expect(result?.sides).toBe(6);
      expect(result?.modifier).toBe('k');
      expect(result?.modifierValue).toBe(3);
    });

    it('should parse dice with drop modifier', () => {
      const result = parseDice('4d6p1');
      expect(result?.modifier).toBe('p');
      expect(result?.modifierValue).toBe(1);
    });

    it('should parse dice with explode modifier', () => {
      const result = parseDice('1d6e');
      expect(result?.modifier).toBe('e');
    });

    it('should return null for invalid notation', () => {
      expect(parseDice('invalid')).toBeNull();
      expect(parseDice('d')).toBeNull();
    });
  });

  describe('rollSingleDie', () => {
    it('should return a number between 1 and sides', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollSingleDie(6);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });

    it('should work with different die sizes', () => {
      const d20 = rollSingleDie(20);
      expect(d20).toBeGreaterThanOrEqual(1);
      expect(d20).toBeLessThanOrEqual(20);

      const d100 = rollSingleDie(100);
      expect(d100).toBeGreaterThanOrEqual(1);
      expect(d100).toBeLessThanOrEqual(100);
    });
  });

  describe('rollDiceSet', () => {
    it('should return correct number of dice', () => {
      const result = rollDiceSet(3, 6);
      expect(result).toHaveLength(3);
    });

    it('should return valid dice values', () => {
      const result = rollDiceSet(10, 20);
      for (const die of result) {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('applyKeepHighest', () => {
    it('should keep highest n dice', () => {
      const dice = [1, 5, 3, 6, 2];
      const result = applyKeepHighest(dice, 3);
      expect(result).toHaveLength(3);
      expect(result).toEqual([6, 5, 3]);
    });

    it('should handle keep all', () => {
      const dice = [1, 2, 3];
      const result = applyKeepHighest(dice, 3);
      expect(result).toHaveLength(3);
    });
  });

  describe('applyKeepLowest', () => {
    it('should keep lowest n dice', () => {
      const dice = [1, 5, 3, 6, 2];
      const result = applyKeepLowest(dice, 3);
      expect(result).toHaveLength(3);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('applyDropHighest', () => {
    it('should drop highest n dice', () => {
      const dice = [1, 5, 3, 6, 2];
      const result = applyDropHighest(dice, 2);
      expect(result).toHaveLength(3);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('applyDropLowest', () => {
    it('should drop lowest n dice', () => {
      const dice = [1, 5, 3, 6, 2];
      const result = applyDropLowest(dice, 2);
      expect(result).toHaveLength(3);
      expect(result).toEqual([6, 5, 3]);
    });
  });

  describe('rollDiceExpression', () => {
    it('should return 0 for empty expression', () => {
      const result = rollDiceExpression('');
      expect(result.total).toBe(0);
    });

    it('should return number for simple number', () => {
      const result = rollDiceExpression('42');
      expect(result.total).toBe(42);
    });

    it('should roll basic dice', () => {
      const result = rollDiceExpression('1d6');
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeLessThanOrEqual(6);
      expect(result.rawDice).toHaveLength(1);
    });

    it('should roll multiple dice', () => {
      const result = rollDiceExpression('3d6');
      expect(result.rawDice).toHaveLength(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
    });

    it('should apply keep modifier', () => {
      const result = rollDiceExpression('4d6k3');
      expect(result.keptDice.length).toBeLessThanOrEqual(3);
      expect(result.tags).toContain('保留最高3个');
    });

    it('should return NaN for invalid expression', () => {
      const result = rollDiceExpression('invalid');
      expect(result.total).toBeNaN();
      expect(result.tags).toContain('error');
    });
  });

  describe('rollComplexDiceExpression', () => {
    it('should handle addition', () => {
      const result = rollComplexDiceExpression('1d6+5');
      expect(result.total).toBeGreaterThanOrEqual(6);
      expect(result.total).toBeLessThanOrEqual(11);
    });

    it('should handle subtraction', () => {
      const result = rollComplexDiceExpression('1d20-2');
      expect(result.total).toBeGreaterThanOrEqual(-1);
      expect(result.total).toBeLessThanOrEqual(18);
    });

    it('should handle multiple dice', () => {
      const result = rollComplexDiceExpression('2d6+1d4');
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(16);
    });
  });

  describe('validateTokens', () => {
    it('should throw DiceExpressionError for consecutive operators 2++3', () => {
      const tokens = tokenize('2++3');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow('连续运算符错误');
    });

    it('should throw DiceExpressionError for consecutive operators 2+*3', () => {
      const tokens = tokenize('2+*3');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow('连续运算符错误');
    });

    it('should throw DiceExpressionError for unmatched opening parenthesis', () => {
      const tokens = tokenize('(2+3');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow('缺少右括号');
    });

    it('should throw DiceExpressionError for unmatched closing parenthesis', () => {
      const tokens = tokenize('2+3)');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow('多余的右括号');
    });

    it('should throw DiceExpressionError for empty parentheses', () => {
      const tokens = tokenize('()');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow('空括号');
    });

    it('should throw DiceExpressionError for expression starting with *', () => {
      const tokens = tokenize('*3');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow("不能以运算符 '*' 开头");
    });

    it('should throw DiceExpressionError for expression ending with operator', () => {
      const tokens = tokenize('2+3+');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow('不能以运算符结尾');
    });

    it('should throw DiceExpressionError for operator before closing paren', () => {
      const tokens = tokenize('(2+)3');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow('运算符后不能直接跟右括号');
    });

    it('should throw DiceExpressionError for * after opening paren', () => {
      const tokens = tokenize('(*3)+2');
      expect(() => validateTokens(tokens)).toThrow(DiceExpressionError);
      expect(() => validateTokens(tokens)).toThrow("左括号后不能跟运算符 '*'");
    });

    it('should allow unary minus at start', () => {
      const tokens = tokenize('-1d6+3');
      expect(() => validateTokens(tokens)).not.toThrow();
    });

    it('should allow unary plus at start', () => {
      const tokens = tokenize('+1d6+3');
      expect(() => validateTokens(tokens)).not.toThrow();
    });

    it('should allow unary minus after opening paren', () => {
      const tokens = tokenize('(-3)+2');
      expect(() => validateTokens(tokens)).not.toThrow();
    });

    it('should pass validation for valid expressions', () => {
      expect(() => validateTokens(tokenize('1d6+3'))).not.toThrow();
      expect(() => validateTokens(tokenize('(1d6+2)*3'))).not.toThrow();
      expect(() => validateTokens(tokenize('2d6-1d4+5'))).not.toThrow();
    });
  });

  describe('rollComplexDiceExpression error handling', () => {
    it('should return error result for 2++3', () => {
      const result = rollComplexDiceExpression('2++3');
      expect(result.total).toBeNaN();
      expect(result.tags).toContain('error');
      expect(result.breakdown).toContain('连续运算符');
    });

    it('should return error result for unmatched parenthesis', () => {
      const result = rollComplexDiceExpression('(2+3');
      expect(result.total).toBeNaN();
      expect(result.tags).toContain('error');
      expect(result.breakdown).toContain('括号');
    });

    it('should return error result for empty parentheses', () => {
      const result = rollComplexDiceExpression('()');
      expect(result.total).toBeNaN();
      expect(result.tags).toContain('error');
    });

    it('should return error result for expression ending with operator', () => {
      const result = rollComplexDiceExpression('2+3+');
      expect(result.total).toBeNaN();
      expect(result.tags).toContain('error');
    });

    it('should still handle valid expressions correctly', () => {
      const result = rollComplexDiceExpression('1d6+5');
      expect(result.total).toBeGreaterThanOrEqual(6);
      expect(result.total).toBeLessThanOrEqual(11);
      expect(result.tags).not.toContain('error');
    });

    it('should return error result for division by zero', () => {
      const result = rollComplexDiceExpression('10/0');
      expect(result.total).toBeNaN();
      expect(result.tags).toContain('error');
      expect(result.breakdown).toContain('除零错误');
    });

    it('should return error result for division by zero in complex expression', () => {
      const result = rollComplexDiceExpression('(5+5)/(2-2)');
      expect(result.total).toBeNaN();
      expect(result.tags).toContain('error');
      expect(result.breakdown).toContain('除零错误');
    });

    it('should handle normal division correctly', () => {
      const result = rollComplexDiceExpression('10/2');
      expect(result.total).toBe(5);
      expect(result.tags).not.toContain('error');
    });
  });

  describe('evaluateFormula', () => {
    it('should substitute variables', () => {
      const result = evaluateFormula('$attr + 5', { attr: 10 });
      expect(result).toBe(15);
    });

    it('should handle braces notation', () => {
      const result = evaluateFormula('{attr} * 2', { attr: 5 });
      expect(result).toBe(10);
    });

    it('should return 0 for empty formula', () => {
      expect(evaluateFormula('', {})).toBe(0);
      expect(evaluateFormula('   ', {})).toBe(0);
    });

    it('should handle complex expressions', () => {
      const result = evaluateFormula('($a + $b) * 2', { a: 3, b: 4 });
      expect(result).toBe(14);
    });

    it('should support built-in math helpers used by presets', () => {
      expect(evaluateFormula('floor(($attr - 10) / 2)', { attr: 12 })).toBe(1);
      expect(evaluateFormula('max(0, floor(($attr - 6) / 10))', { attr: 16 })).toBe(1);
      expect(evaluateFormula('abs($bonusPenalty)', { bonusPenalty: -3 })).toBe(3);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate greater than', () => {
      const result = evaluateCondition('$roll > 50', { roll: 60 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should evaluate less than', () => {
      const result = evaluateCondition('$roll < 50', { roll: 40 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should evaluate equal', () => {
      const result = evaluateCondition('$roll == 50', { roll: 50 });
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should evaluate greater or equal', () => {
      const result = evaluateCondition('$roll >= 50', { roll: 50 });
      expect(result.value).toBe(true);
    });

    it('should evaluate less or equal', () => {
      const result = evaluateCondition('$roll <= 50', { roll: 50 });
      expect(result.value).toBe(true);
    });

    it('should return true for empty condition', () => {
      const result = evaluateCondition('', {});
      expect(result.success).toBe(true);
    });
  });
});
