/**
 * 安全表达式求值器
 *
 * 基于递归下降解析器，不使用 new Function / eval。
 * 仅支持数字字面量、白名单数学函数、算术/比较/逻辑运算符。
 */

const MAX_EXPR_LENGTH = 500;

const SAFE_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  max: Math.max,
  min: Math.min,
  round: Math.round,
  pow: Math.pow,
};

// ── Tokenizer ───────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER'
  | 'IDENT'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'QUESTION'
  | 'COLON'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'EQ'
  | 'SEQ'
  | 'NEQ'
  | 'SNEQ'
  | 'AND'
  | 'OR'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++;
      continue;
    }

    // number (including decimals)
    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < input.length && input[i + 1] >= '0' && input[i + 1] <= '9')) {
      let num = '';
      while (i < input.length && ((input[i] >= '0' && input[i] <= '9') || input[i] === '.')) {
        num += input[i++];
      }
      tokens.push({ type: 'NUMBER', value: num, pos: i - num.length });
      continue;
    }

    // identifier (function names) — only lowercase letters
    if (ch >= 'a' && ch <= 'z') {
      let ident = '';
      while (i < input.length && ((input[i] >= 'a' && input[i] <= 'z') || (input[i] >= '0' && input[i] <= '9'))) {
        ident += input[i++];
      }
      tokens.push({ type: 'IDENT', value: ident, pos: i - ident.length });
      continue;
    }

    // operators
    const pos = i;
    switch (ch) {
      case '+': tokens.push({ type: 'PLUS', value: '+', pos }); i++; break;
      case '-': tokens.push({ type: 'MINUS', value: '-', pos }); i++; break;
      case '*': tokens.push({ type: 'STAR', value: '*', pos }); i++; break;
      case '/': tokens.push({ type: 'SLASH', value: '/', pos }); i++; break;
      case '%': tokens.push({ type: 'PERCENT', value: '%', pos }); i++; break;
      case '(': tokens.push({ type: 'LPAREN', value: '(', pos }); i++; break;
      case ')': tokens.push({ type: 'RPAREN', value: ')', pos }); i++; break;
      case ',': tokens.push({ type: 'COMMA', value: ',', pos }); i++; break;
      case '?': tokens.push({ type: 'QUESTION', value: '?', pos }); i++; break;
      case ':': tokens.push({ type: 'COLON', value: ':', pos }); i++; break;
      case '>':
        if (input[i + 1] === '=') { tokens.push({ type: 'GTE', value: '>=', pos }); i += 2; }
        else { tokens.push({ type: 'GT', value: '>', pos }); i++; }
        break;
      case '<':
        if (input[i + 1] === '=') { tokens.push({ type: 'LTE', value: '<=', pos }); i += 2; }
        else { tokens.push({ type: 'LT', value: '<', pos }); i++; }
        break;
      case '=':
        if (input[i + 1] === '=' && input[i + 2] === '=') { tokens.push({ type: 'SEQ', value: '===', pos }); i += 3; }
        else if (input[i + 1] === '=') { tokens.push({ type: 'EQ', value: '==', pos }); i += 2; }
        else { throw new EvalError(`Unexpected character '=' at position ${pos}`); }
        break;
      case '!':
        if (input[i + 1] === '=' && input[i + 2] === '=') { tokens.push({ type: 'SNEQ', value: '!==', pos }); i += 3; }
        else if (input[i + 1] === '=') { tokens.push({ type: 'NEQ', value: '!=', pos }); i += 2; }
        else { throw new EvalError(`Unexpected character '!' at position ${pos}`); }
        break;
      case '&':
        if (input[i + 1] === '&') { tokens.push({ type: 'AND', value: '&&', pos }); i += 2; }
        else { throw new EvalError(`Unexpected character '&' at position ${pos}`); }
        break;
      case '|':
        if (input[i + 1] === '|') { tokens.push({ type: 'OR', value: '||', pos }); i += 2; }
        else { throw new EvalError(`Unexpected character '|' at position ${pos}`); }
        break;
      default:
        throw new EvalError(`Unexpected character '${ch}' at position ${pos}`);
    }
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

// ── Parser (recursive descent) ──────────────────────────────────────────────

type ASTNode =
  | { type: 'Number'; value: number }
  | { type: 'BinaryOp'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'UnaryOp'; op: string; operand: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] }
  | { type: 'Ternary'; condition: ASTNode; consequent: ASTNode; alternate: ASTNode };

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    const node = this.parseLogicalOr();
    if (this.current().type !== 'EOF') {
      throw new EvalError(`Unexpected token '${this.current().value}' at position ${this.current().pos}`);
    }
    return node;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new EvalError(`Expected ${type} but got ${token.type} '${token.value}' at position ${token.pos}`);
    }
    return this.advance();
  }

  // logicalOr → logicalAnd ( '||' logicalAnd )*
  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.current().type === 'OR') {
      this.advance();
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryOp', op: '||', left, right };
    }
    return left;
  }

  // logicalAnd → ternary ( '&&' ternary )*
  private parseLogicalAnd(): ASTNode {
    let left = this.parseTernary();
    while (this.current().type === 'AND') {
      this.advance();
      const right = this.parseTernary();
      left = { type: 'BinaryOp', op: '&&', left, right };
    }
    return left;
  }

  // ternary → comparison ( '?' expr ':' expr )?
  private parseTernary(): ASTNode {
    const condition = this.parseComparison();
    if (this.current().type === 'QUESTION') {
      this.advance();
      const consequent = this.parseLogicalOr();
      this.expect('COLON');
      const alternate = this.parseLogicalOr();
      return { type: 'Ternary', condition, consequent, alternate };
    }
    return condition;
  }

  // comparison → addition ( ('>=' | '<=' | '===' | '==' | '!==' | '!=' | '>' | '<') addition )?
  private parseComparison(): ASTNode {
    let left = this.parseAddition();
    const compOps: TokenType[] = ['GTE', 'LTE', 'SEQ', 'EQ', 'SNEQ', 'NEQ', 'GT', 'LT'];
    if (compOps.includes(this.current().type)) {
      const op = this.advance().value;
      const right = this.parseAddition();
      left = { type: 'BinaryOp', op, left, right };
    }
    return left;
  }

  // addition → multiply ( ('+' | '-') multiply )*
  private parseAddition(): ASTNode {
    let left = this.parseMultiply();
    while (this.current().type === 'PLUS' || this.current().type === 'MINUS') {
      const op = this.advance().value;
      const right = this.parseMultiply();
      left = { type: 'BinaryOp', op, left, right };
    }
    return left;
  }

  // multiply → unary ( ('*' | '/' | '%') unary )*
  private parseMultiply(): ASTNode {
    let left = this.parseUnary();
    while (this.current().type === 'STAR' || this.current().type === 'SLASH' || this.current().type === 'PERCENT') {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { type: 'BinaryOp', op, left, right };
    }
    return left;
  }

  // unary → '-' unary | power
  private parseUnary(): ASTNode {
    if (this.current().type === 'MINUS') {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'UnaryOp', op: '-', operand };
    }
    return this.parsePower();
  }

  // power → primary ( '**' unary )?  (right-associative)
  private parsePower(): ASTNode {
    // Note: ** is not in our tokenizer, so we just delegate to primary
    return this.parsePrimary();
  }

  // primary → NUMBER | '(' expr ')' | functionCall
  private parsePrimary(): ASTNode {
    const token = this.current();

    if (token.type === 'NUMBER') {
      this.advance();
      const value = parseFloat(token.value);
      if (!Number.isFinite(value)) {
        throw new EvalError(`Invalid number '${token.value}' at position ${token.pos}`);
      }
      return { type: 'Number', value };
    }

    if (token.type === 'IDENT') {
      // function call
      const name = token.value;
      if (!(name in SAFE_FUNCTIONS)) {
        throw new EvalError(`Unknown function '${name}' at position ${token.pos}`);
      }
      this.advance();
      this.expect('LPAREN');
      const args: ASTNode[] = [];
      if (this.current().type !== 'RPAREN') {
        args.push(this.parseLogicalOr());
        while (this.current().type === 'COMMA') {
          this.advance();
          args.push(this.parseLogicalOr());
        }
      }
      this.expect('RPAREN');
      return { type: 'FunctionCall', name, args };
    }

    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseLogicalOr();
      this.expect('RPAREN');
      return expr;
    }

    throw new EvalError(`Unexpected token '${token.value}' (type: ${token.type}) at position ${token.pos}`);
  }
}

// ── Interpreter ─────────────────────────────────────────────────────────────

function interpret(node: ASTNode): number {
  switch (node.type) {
    case 'Number':
      return node.value;

    case 'UnaryOp':
      return -interpret(node.operand);

    case 'BinaryOp': {
      const left = interpret(node.left);
      const right = interpret(node.right);
      switch (node.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '%': return left % right;
        case '>=': return left >= right ? 1 : 0;
        case '<=': return left <= right ? 1 : 0;
        case '>': return left > right ? 1 : 0;
        case '<': return left < right ? 1 : 0;
        case '==':
        case '===': return left === right ? 1 : 0;
        case '!=':
        case '!==': return left !== right ? 1 : 0;
        case '&&': return (left !== 0 && right !== 0) ? 1 : 0;
        case '||': return (left !== 0 || right !== 0) ? 1 : 0;
        default: throw new EvalError(`Unknown operator '${node.op}'`);
      }
    }

    case 'FunctionCall': {
      const fn = SAFE_FUNCTIONS[node.name];
      if (!fn) throw new EvalError(`Unknown function '${node.name}'`);
      const args = node.args.map(interpret);
      return fn(...args);
    }

    case 'Ternary': {
      const cond = interpret(node.condition);
      return cond !== 0 ? interpret(node.consequent) : interpret(node.alternate);
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * 安全求值数学表达式，返回数值。
 * 不使用 new Function / eval，基于递归下降解析器。
 *
 * @param expr 表达式字符串（变量应已替换为数值）
 * @returns 求值结果
 * @throws EvalError 表达式语法错误或包含非法字符
 */
export function safeEval(expr: string): number {
  if (!expr || expr.trim() === '') return 0;
  if (expr.length > MAX_EXPR_LENGTH) {
    throw new EvalError(`Expression exceeds maximum length of ${MAX_EXPR_LENGTH}`);
  }

  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const result = interpret(ast);

  return typeof result === 'number' && Number.isFinite(result) ? result : 0;
}

/**
 * 安全求值条件表达式，返回布尔值。
 * 0 / NaN / false → false，其他 → true。
 */
export function safeEvalCondition(expr: string): boolean {
  if (!expr || expr.trim() === '') return true;
  const result = safeEval(expr);
  return result !== 0;
}
