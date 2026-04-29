import type { RollResult } from './types';

export class DiceExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceExpressionError';
  }
}

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
    throw new DiceExpressionError(`无法识别的字符: '${char}' (位置 ${i})`);
  }

  if (current) {
    if (NUMBER_REGEX.test(current)) {
      tokens.push({ type: 'number', value: parseFloat(current) });
    }
  }

  return tokens;
}

export function validateTokens(tokens: DiceToken[]): void {
  if (tokens.length === 0) return;

  let parenDepth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'paren' && token.value === '(') {
      parenDepth++;
    } else if (token.type === 'paren' && token.value === ')') {
      parenDepth--;
      if (parenDepth < 0) {
        throw new DiceExpressionError('括号不匹配：多余的右括号');
      }
    }
  }
  if (parenDepth > 0) {
    throw new DiceExpressionError('括号不匹配：缺少右括号');
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    if (
      tokens[i].type === 'paren' &&
      tokens[i].value === '(' &&
      tokens[i + 1].type === 'paren' &&
      tokens[i + 1].value === ')'
    ) {
      throw new DiceExpressionError('空括号：括号内无表达式');
    }
  }

  const first = tokens[0];
  if (first.type === 'operator' && (first.value === '*' || first.value === '/')) {
    throw new DiceExpressionError(`表达式不能以运算符 '${first.value}' 开头`);
  }
  if (first.type === 'paren' && first.value === ')') {
    throw new DiceExpressionError('表达式不能以右括号开头');
  }

  const last = tokens[tokens.length - 1];
  if (last.type === 'operator') {
    throw new DiceExpressionError('表达式不能以运算符结尾');
  }
  if (last.type === 'paren' && last.value === '(') {
    throw new DiceExpressionError('表达式不能以左括号结尾');
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];

    if (
      curr.type === 'number' ||
      curr.type === 'dice' ||
      (curr.type === 'paren' && curr.value === ')')
    ) {
      if (next.type !== 'operator' && !(next.type === 'paren' && next.value === ')')) {
        throw new DiceExpressionError(
          `意外的标记：期望运算符或右括号，但得到 '${next.value}'`,
        );
      }
    }

    if (curr.type === 'operator') {
      if (next.type === 'operator') {
        throw new DiceExpressionError(
          `连续运算符错误：'${curr.value}' 后不能跟 '${next.value}'`,
        );
      }
      if (next.type === 'paren' && next.value === ')') {
        throw new DiceExpressionError('运算符后不能直接跟右括号');
      }
    }

    if (curr.type === 'paren' && curr.value === '(') {
      if (next.type === 'operator' && next.value !== '+' && next.value !== '-') {
        throw new DiceExpressionError(`左括号后不能跟运算符 '${next.value}'`);
      }
    }
  }
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
    } else if (modifier.includes('d')) {
      keptDice = applyDropLowest(rawDice, modValue);
      tags.push(`移除最低${modValue}个`);
    } else if (modifier.includes('p')) {
      keptDice = applyPenetrate(rawDice, sides);
      tags.push('穿透骰');
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

  try {
    validateTokens(tokens);
  } catch (e) {
    const errorMsg = e instanceof DiceExpressionError ? e.message : '表达式语法错误';
    return {
      total: NaN,
      rawDice: [],
      keptDice: [],
      formula: trimmed,
      breakdown: errorMsg,
      tags: ['error'],
    };
  }

  let pos = 0;
  const allDice: number[] = [];

  function resolveToken(token: DiceToken): number {
    if (token.type === 'dice') {
      const result = rollDiceExpression(String(token.value));
      allDice.push(...result.keptDice);
      return result.total;
    }
    if (token.type === 'number') {
      return token.value as number;
    }
    throw new DiceExpressionError(`意外的标记：'${token.value}'`);
  }

  function parseExpression(): number {
    let left = parseTerm();

    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) break;
      pos++;
      const right = parseTerm();
      if (token.value === '+') {
        left += right;
      } else {
        left -= right;
      }
    }

    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();

    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type !== 'operator' || (token.value !== '*' && token.value !== '/')) break;
      pos++;
      const right = parseFactor();
      if (token.value === '*') {
        left *= right;
      } else {
        left = right !== 0 ? left / right : Infinity;
      }
    }

    return left;
  }

  function parseFactor(): number {
    if (pos >= tokens.length) {
      throw new DiceExpressionError('表达式不完整：期望操作数');
    }

    const token = tokens[pos];

    if (token.type === 'paren' && token.value === '(') {
      pos++;
      const result = parseExpression();
      if (pos >= tokens.length || tokens[pos].type !== 'paren' || tokens[pos].value !== ')') {
        throw new DiceExpressionError('括号不匹配：缺少右括号');
      }
      pos++;
      return result;
    }

    if (token.type === 'operator' && token.value === '-') {
      pos++;
      return -parseFactor();
    }

    if (token.type === 'operator' && token.value === '+') {
      pos++;
      return parseFactor();
    }

    if (token.type !== 'number' && token.type !== 'dice') {
      throw new DiceExpressionError(`意外的标记：期望数值或骰子表达式，但得到 '${token.value}'`);
    }

    pos++;
    return resolveToken(token);
  }

  try {
    const result = parseExpression();

    if (pos < tokens.length) {
      throw new DiceExpressionError(`表达式存在多余内容：'${tokens[pos].value}'`);
    }

    return {
      total: Math.round(result * 100) / 100,
      rawDice: allDice,
      keptDice: allDice,
      formula: trimmed,
      breakdown: `${allDice.length > 0 ? allDice.join(' + ') + ' = ' : ''}${result}`,
      tags: [],
    };
  } catch (e) {
    const errorMsg = e instanceof DiceExpressionError ? e.message : '表达式解析错误';
    return {
      total: NaN,
      rawDice: allDice,
      keptDice: allDice,
      formula: trimmed,
      breakdown: errorMsg,
      tags: ['error'],
    };
  }
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

  const hasLogical = expr.includes('&&') || expr.includes('||');
  const hasComparison = /[><=!]=?/.test(expr);

  if (hasLogical || hasComparison) {
    try {
      const safeExpr = expr.replace(/[^0-9+\-*/().<>=!&| ]/g, '');
      const fn = new Function(`return ${safeExpr}`);
      const result = fn();
      if (typeof result === 'boolean') {
        return { success: true, value: result };
      }
      return { success: true, value: !!result };
    } catch {
      // fall through
    }
  }

  const comparisons = ['>=', '<=', '===', '!==', '==', '!=', '>', '<'];
  for (const op of comparisons) {
    const idx = expr.indexOf(op);
    if (idx !== -1) {
      const left = expr.substring(0, idx).trim();
      const right = expr.substring(idx + op.length).trim();
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
        case '===':
          result = leftVal === rightVal;
          break;
        case '!==':
          result = leftVal !== rightVal;
          break;
        case '==':
          result = leftVal === rightVal;
          break;
        case '!=':
          result = leftVal !== rightVal;
          break;
        case '>':
          result = leftVal > rightVal;
          break;
        case '<':
          result = leftVal < rightVal;
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
