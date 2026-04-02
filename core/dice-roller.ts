import type { RollResult } from './types';

interface DiceToken {
  type: 'number' | 'dice' | 'operator' | 'paren' | 'modifier';
  value: string | number;
}

interface ParsedDice {
  count: number;
  sides: number;
  modifier?: string;
  modifierValue?: number;
}

const DICE_REGEX = /^(\d+)?d(\d+)([bkpe]{1,2})?(\d+)?$/i;
const MODIFIER_REGEX = /^[+-]$/;
const NUMBER_REGEX = /^\d+(\.\d+)?$/;

export function tokenize(expression: string): DiceToken[] {
  const tokens: DiceToken[] = [];
  let current = '';
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (MODIFIER_REGEX.test(char) || char === '*' || char === '/') {
      if (current) {
        tokens.push({ type: 'number', value: parseFloat(current) });
        current = '';
      }
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }

    if (char === '(' || char === ')') {
      if (current) {
        tokens.push({ type: 'number', value: parseFloat(current) });
        current = '';
      }
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }

    if (/[dkbpe]/i.test(char) && current.match(/^\d*$/)) {
      current += char.toLowerCase();
      i++;
      while (i < expression.length && /[0-9bkpe]/i.test(expression[i])) {
        current += expression[i].toLowerCase();
        i++;
      }
      tokens.push({ type: 'dice', value: current });
      current = '';
      continue;
    }

    if (/[0-9.]/.test(char)) {
      current += char;
      i++;
      continue;
    }

    i++;
  }

  if (current) {
    if (NUMBER_REGEX.test(current)) {
      tokens.push({ type: 'number', value: parseFloat(current) });
    }
  }

  return tokens;
}

export function parseDice(token: string): ParsedDice | null {
  const match = token.match(DICE_REGEX);
  if (!match) return null;

  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3];
  const modifierValue = match[4] ? parseInt(match[4], 10) : undefined;

  return { count, sides, modifier, modifierValue };
}

export function rollSingleDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDiceSet(count: number, sides: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollSingleDie(sides));
  }
  return results;
}

export function applyKeepHighest(dice: number[], keep: number): number[] {
  const sorted = [...dice].sort((a, b) => b - a);
  return sorted.slice(0, keep);
}

export function applyKeepLowest(dice: number[], keep: number): number[] {
  const sorted = [...dice].sort((a, b) => a - b);
  return sorted.slice(0, keep);
}

export function applyDropHighest(dice: number[], drop: number): number[] {
  const sorted = [...dice].sort((a, b) => a - b);
  return sorted.slice(0, dice.length - drop);
}

export function applyDropLowest(dice: number[], drop: number): number[] {
  const sorted = [...dice].sort((a, b) => b - a);
  return sorted.slice(0, dice.length - drop);
}

export function applyExplode(dice: number[], sides: number, threshold?: number): number[] {
  const result: number[] = [];
  const explodeOn = threshold || sides;

  for (const die of dice) {
    result.push(die);
    if (die >= explodeOn) {
      let newDie = rollSingleDie(sides);
      while (newDie >= explodeOn) {
        result.push(newDie);
        newDie = rollSingleDie(sides);
      }
      result.push(newDie);
    }
  }

  return result;
}

export function applyPenetrate(dice: number[], sides: number): number[] {
  const result: number[] = [];

  for (const die of dice) {
    result.push(die);
    if (die === sides) {
      let newDie = rollSingleDie(sides);
      while (newDie === sides) {
        result.push(newDie - 1);
        newDie = rollSingleDie(sides);
      }
      result.push(newDie);
    }
  }

  return result;
}

export function rollDiceExpression(expression: string): RollResult {
  const trimmed = expression.trim();

  if (!trimmed || trimmed === '0') {
    return {
      total: 0,
      rawDice: [],
      keptDice: [],
      formula: '0',
      breakdown: '0',
      tags: [],
    };
  }

  const simpleNumber = parseFloat(trimmed);
  if (!isNaN(simpleNumber) && !trimmed.toLowerCase().includes('d')) {
    return {
      total: simpleNumber,
      rawDice: [],
      keptDice: [],
      formula: trimmed,
      breakdown: String(simpleNumber),
      tags: [],
    };
  }

  const parsed = parseDice(trimmed);
  if (!parsed) {
    return {
      total: NaN,
      rawDice: [],
      keptDice: [],
      formula: trimmed,
      breakdown: '解析失败',
      tags: ['error'],
    };
  }

  const { count, sides, modifier, modifierValue } = parsed;
  const rawDice = rollDiceSet(count, sides);
  let keptDice = [...rawDice];
  const tags: string[] = [];

  if (modifier) {
    const modValue = modifierValue || 1;

    if (modifier.includes('k') || modifier.includes('b')) {
      keptDice = applyKeepHighest(rawDice, modValue);
      tags.push(`保留最高${modValue}个`);
    } else if (modifier.includes('p')) {
      keptDice = applyDropLowest(rawDice, modValue);
      tags.push(`移除最低${modValue}个`);
    } else if (modifier.includes('e')) {
      keptDice = applyExplode(rawDice, sides, modifierValue);
      tags.push('爆炸骰');
    }
  }

  const total = keptDice.reduce((sum, die) => sum + die, 0);
  const breakdown = `${keptDice.join(' + ')} = ${total}`;

  return {
    total,
    rawDice,
    keptDice,
    formula: trimmed,
    breakdown,
    tags,
  };
}

export function rollComplexDiceExpression(expression: string): RollResult {
  const trimmed = expression.trim();

  if (!trimmed) {
    return rollDiceExpression('0');
  }

  const tokens = tokenize(trimmed);

  if (tokens.length === 0) {
    return rollDiceExpression('0');
  }

  if (tokens.length === 1) {
    if (tokens[0].type === 'dice') {
      return rollDiceExpression(String(tokens[0].value));
    }
    if (tokens[0].type === 'number') {
      return {
        total: tokens[0].value as number,
        rawDice: [],
        keptDice: [],
        formula: trimmed,
        breakdown: String(tokens[0].value),
        tags: [],
      };
    }
  }

  const values: number[] = [];
  const operators: string[] = [];
  let currentDice: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'dice') {
      const result = rollDiceExpression(String(token.value));
      values.push(result.total);
      currentDice = currentDice.concat(result.keptDice);
    } else if (token.type === 'number') {
      values.push(token.value as number);
    } else if (token.type === 'operator') {
      operators.push(String(token.value));
    }
  }

  let result = values[0] || 0;
  for (let i = 0; i < operators.length; i++) {
    const op = operators[i];
    const nextValue = values[i + 1] || 0;

    switch (op) {
      case '+':
        result += nextValue;
        break;
      case '-':
        result -= nextValue;
        break;
      case '*':
        result *= nextValue;
        break;
      case '/':
        result = nextValue !== 0 ? result / nextValue : 0;
        break;
    }
  }

  return {
    total: Math.round(result * 100) / 100,
    rawDice: currentDice,
    keptDice: currentDice,
    formula: trimmed,
    breakdown: `${currentDice.length > 0 ? currentDice.join(' + ') + ' = ' : ''}${result}`,
    tags: [],
  };
}

export function evaluateFormula(formula: string, context: Record<string, number>): number {
  if (!formula || formula.trim() === '') return 0;

  let expr = formula;

  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\$${key}\\b`, 'g');
    expr = expr.replace(regex, String(value));
  }

  expr = expr.replace(/\{([^}]+)\}/g, (_, name) => {
    const val = context[name] ?? context[`$${name}`] ?? 0;
    return String(val);
  });

  try {
    const safeExpr = expr.replace(/[^0-9+\-*/().]/g, '');
    if (safeExpr !== expr.replace(/\s/g, '')) {
      return rollComplexDiceExpression(expr).total;
    }

    const fn = new Function(`return ${safeExpr}`);
    const result = fn();
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch {
    return rollComplexDiceExpression(expr).total;
  }
}

export function evaluateCondition(
  condition: string,
  context: Record<string, number>,
): { success: boolean; value?: number | boolean } {
  if (!condition || condition.trim() === '') {
    return { success: true, value: true };
  }

  let expr = condition;

  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\$${key}\\b`, 'g');
    expr = expr.replace(regex, String(value));
  }

  expr = expr.replace(/\{([^}]+)\}/g, (_, name) => {
    const val = context[name] ?? context[`$${name}`] ?? 0;
    return String(val);
  });

  const comparisons = ['>=', '<=', '>', '<', '==', '!='];
  for (const op of comparisons) {
    if (expr.includes(op)) {
      const [left, right] = expr.split(op).map(s => s.trim());
      const leftVal = evaluateFormula(left, context);
      const rightVal = evaluateFormula(right, context);

      let result: boolean;
      switch (op) {
        case '>=':
          result = leftVal >= rightVal;
          break;
        case '<=':
          result = leftVal <= rightVal;
          break;
        case '>':
          result = leftVal > rightVal;
          break;
        case '<':
          result = leftVal < rightVal;
          break;
        case '==':
          result = leftVal === rightVal;
          break;
        case '!=':
          result = leftVal !== rightVal;
          break;
        default:
          result = false;
      }

      return { success: true, value: result };
    }
  }

  try {
    const value = evaluateFormula(expr, context);
    return { success: true, value };
  } catch {
    return { success: false };
  }
}
