export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  source?: string;
  data?: unknown;
  stack?: string;
}

export interface DebugCommand {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[], context: DebugContext) => string | Promise<string>;
}

export interface DebugContext {
  log: (level: LogLevel, message: string, data?: unknown) => void;
  getVariable: (name: string) => unknown;
  setVariable: (name: string, value: unknown) => void;
  executeCommand: (command: string) => string | Promise<string>;
}

const LOGS_STORAGE_KEY = 'acu_debug_logs';
const VARIABLES_STORAGE_KEY = 'acu_debug_variables';

export class DebugConsole {
  private logs: LogEntry[] = [];
  private variables: Map<string, unknown> = new Map();
  private commands: Map<string, DebugCommand> = new Map();
  private maxLogs: number = 1000;
  private enabled: boolean = false;
  private logLevel: LogLevel = 'info';
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty: boolean = false;

  constructor() {
    this.loadFromStorage();
    this.registerBuiltinCommands();
  }

  private loadFromStorage(): void {
    try {
      const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }

      const storedVars = localStorage.getItem(VARIABLES_STORAGE_KEY);
      if (storedVars) {
        const vars = JSON.parse(storedVars);
        for (const [key, value] of Object.entries(vars)) {
          this.variables.set(key, value);
        }
      }
    } catch (e) {
      console.warn('[DebugConsole] 加载数据失败:', e);
    }
  }

  private saveToStorage(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (!this.dirty) return;
      this.dirty = false;
      try {
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs.slice(-this.maxLogs)));
        localStorage.setItem(
          VARIABLES_STORAGE_KEY,
          JSON.stringify(Object.fromEntries(this.variables))
        );
      } catch (e) {
        console.warn('[DebugConsole] 保存数据失败:', e);
      }
    }, 500);
  }

  private saveToStorageSync(): void {
    this.dirty = false;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs.slice(-this.maxLogs)));
      localStorage.setItem(
        VARIABLES_STORAGE_KEY,
        JSON.stringify(Object.fromEntries(this.variables))
      );
    } catch (e) {
      console.warn('[DebugConsole] 保存数据失败:', e);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.log('info', `调试模式已${enabled ? '启用' : '禁用'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  log(level: LogLevel, message: string, data?: unknown, source?: string): void {
    if (!this.enabled) return;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(this.logLevel)) {
      return;
    }

    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: Date.now(),
      source,
      data,
      stack: level === 'error' ? new Error().stack : undefined,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.saveToStorage();

    const consoleMethod = level === 'debug' ? 'log' : level;
    console[consoleMethod](`[${source || 'Debug'}] ${message}`, data !== undefined ? data : '');
  }

  debug(message: string, data?: unknown, source?: string): void {
    this.log('debug', message, data, source);
  }

  info(message: string, data?: unknown, source?: string): void {
    this.log('info', message, data, source);
  }

  warn(message: string, data?: unknown, source?: string): void {
    this.log('warn', message, data, source);
  }

  error(message: string, data?: unknown, source?: string): void {
    this.log('error', message, data, source);
  }

  getLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    return filtered.slice(-limit);
  }

  clearLogs(): void {
    this.logs = [];
    this.saveToStorageSync();
  }

  getVariable(name: string): unknown {
    return this.variables.get(name);
  }

  setVariable(name: string, value: unknown): void {
    this.variables.set(name, value);
    this.saveToStorage();
    this.debug(`变量已设置: ${name}`, value, 'DebugConsole');
  }

  deleteVariable(name: string): boolean {
    const result = this.variables.delete(name);
    if (result) {
      this.saveToStorage();
      this.debug(`变量已删除: ${name}`, undefined, 'DebugConsole');
    }
    return result;
  }

  getAllVariables(): Record<string, unknown> {
    return Object.fromEntries(this.variables);
  }

  clearVariables(): void {
    this.variables.clear();
    this.saveToStorageSync();
  }

  registerCommand(command: DebugCommand): void {
    this.commands.set(command.name, command);
    this.debug(`命令已注册: ${command.name}`, undefined, 'DebugConsole');
  }

  unregisterCommand(name: string): boolean {
    return this.commands.delete(name);
  }

  getCommands(): DebugCommand[] {
    return Array.from(this.commands.values());
  }

  async executeCommand(input: string): Promise<string> {
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (!commandName) {
      return '请输入命令';
    }

    const command = this.commands.get(commandName);
    if (!command) {
      return `未知命令: ${commandName}。输入 "help" 查看可用命令。`;
    }

    try {
      const context: DebugContext = {
        log: (level, message, data) => this.log(level, message, data),
        getVariable: name => this.getVariable(name),
        setVariable: (name, value) => this.setVariable(name, value),
        executeCommand: cmd => this.executeCommand(cmd),
      };

      const result = await command.handler(args, context);
      if (commandName !== 'clear') {
        this.debug(`执行命令: ${input}`, result, 'DebugConsole');
      }
      return result;
    } catch (e) {
      const errorMsg = `命令执行失败: ${e instanceof Error ? e.message : '未知错误'}`;
      this.error(errorMsg, undefined, 'DebugConsole');
      return errorMsg;
    }
  }

  private registerBuiltinCommands(): void {
    this.registerCommand({
      name: 'help',
      description: '显示可用命令列表',
      usage: 'help [command]',
      handler: (args: string[]) => {
        if (args[0]) {
          const cmd = this.commands.get(args[0]);
          if (!cmd) return `未知命令: ${args[0]}`;
          return `${cmd.name}: ${cmd.description}\n用法: ${cmd.usage}`;
        }

        const commands = this.getCommands();
        let output = '可用命令:\n';
        for (const cmd of commands) {
          output += `  ${cmd.name.padEnd(15)} - ${cmd.description}\n`;
        }
        return output;
      },
    });

    this.registerCommand({
      name: 'clear',
      description: '清除日志',
      usage: 'clear',
      handler: () => {
        this.logs = [];
        this.saveToStorage();
        return '日志已清除';
      },
    });

    this.registerCommand({
      name: 'log',
      description: '设置日志级别',
      usage: 'log <debug|info|warn|error>',
      handler: (args: string[]) => {
        const level = args[0] as LogLevel;
        if (!['debug', 'info', 'warn', 'error'].includes(level)) {
          return '无效的日志级别。可用: debug, info, warn, error';
        }
        this.setLogLevel(level);
        return `日志级别已设置为: ${level}`;
      },
    });

    this.registerCommand({
      name: 'get',
      description: '获取变量值',
      usage: 'get <variable>',
      handler: (args: string[]) => {
        if (!args[0]) return '请指定变量名';
        const value = this.getVariable(args[0]);
        if (value === undefined) return `变量 "${args[0]}" 未定义`;
        return `${args[0]} = ${JSON.stringify(value, null, 2)}`;
      },
    });

    this.registerCommand({
      name: 'set',
      description: '设置变量值',
      usage: 'set <variable> <value>',
      handler: (args: string[]) => {
        if (!args[0]) return '请指定变量名';
        const value = args.slice(1).join(' ');
        try {
          const parsed = JSON.parse(value);
          this.setVariable(args[0], parsed);
        } catch {
          this.setVariable(args[0], value);
        }
        return `变量 "${args[0]}" 已设置`;
      },
    });

    this.registerCommand({
      name: 'vars',
      description: '列出所有变量',
      usage: 'vars',
      handler: () => {
        const vars = this.getAllVariables();
        const keys = Object.keys(vars);
        if (keys.length === 0) return '没有定义的变量';
        return `变量列表:\n${keys.map(k => `  ${k}`).join('\n')}`;
      },
    });

    this.registerCommand({
      name: 'del',
      description: '删除变量',
      usage: 'del <variable>',
      handler: (args: string[]) => {
        if (!args[0]) return '请指定变量名';
        if (this.deleteVariable(args[0])) {
          return `变量 "${args[0]}" 已删除`;
        }
        return `变量 "${args[0]}" 不存在`;
      },
    });

    this.registerCommand({
      name: 'export',
      description: '导出调试数据',
      usage: 'export [logs|vars]',
      handler: (args: string[]) => {
        const type = args[0] || 'all';
        if (type === 'logs') {
          return JSON.stringify(this.logs, null, 2);
        }
        if (type === 'vars') {
          return JSON.stringify(this.getAllVariables(), null, 2);
        }
        return JSON.stringify(
          {
            logs: this.logs,
            variables: this.getAllVariables(),
          },
          null,
          2
        );
      },
    });

    this.registerCommand({
      name: 'eval',
      description: '执行JavaScript代码（警告：危险操作）',
      usage: 'eval <code>',
      handler: (args: string[], context: DebugContext) => {
        const code = args.join(' ');
        if (code.length > 500) {
          return '执行错误: 代码长度超过 500 字符限制';
        }
        try {
          const result = eval(code);
          return `结果: ${JSON.stringify(result, null, 2)}`;
        } catch (e) {
          return `执行错误: ${e instanceof Error ? e.message : '未知错误'}`;
        }
      },
    });

    this.registerCommand({
      name: 'time',
      description: '显示当前时间戳',
      usage: 'time',
      handler: () => {
        return `当前时间: ${new Date().toISOString()}\n时间戳: ${Date.now()}`;
      },
    });

    this.registerCommand({
      name: 'stats',
      description: '显示系统统计信息',
      usage: 'stats',
      handler: () => {
        const memory = (performance as any).memory;
        let output = '系统统计:\n';
        output += `  日志数量: ${this.logs.length}\n`;
        output += `  变量数量: ${this.variables.size}\n`;
        output += `  命令数量: ${this.commands.size}\n`;
        if (memory) {
          output += `  内存使用: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`;
          output += `  内存限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`;
        }
        return output;
      },
    });
  }

  exportLogs(): string {
    return JSON.stringify(
      {
        logs: this.logs,
        exportedAt: Date.now(),
        version: '1.0.0',
      },
      null,
      2
    );
  }

  importLogs(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);

      if (data.logs && Array.isArray(data.logs)) {
        for (const log of data.logs) {
          if (log.message && log.level) {
            this.logs.push({
              ...log,
              id: log.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            });
            imported++;
          }
        }
      }

      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }

      this.saveToStorageSync();
      return { success: true, imported, errors };
    } catch (e) {
      errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
      return { success: false, imported: 0, errors };
    }
  }
}

export const debugConsole = new DebugConsole();

export function createDebugProxy<T extends object>(target: T, name: string): T {
  return new Proxy(target, {
    get(obj: T, prop: string | symbol) {
      const value = (obj as any)[prop];
      debugConsole.debug(`[${name}] 读取属性: ${String(prop)}`, value);
      return value;
    },
    set(obj: T, prop: string | symbol, value: unknown) {
      debugConsole.debug(`[${name}] 设置属性: ${String(prop)}`, value);
      (obj as any)[prop] = value;
      return true;
    },
  });
}
