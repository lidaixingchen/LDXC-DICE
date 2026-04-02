import { describe, it, expect, beforeEach } from 'vitest';
import { DebugConsole, type LogLevel, type LogEntry } from '@core/debug-console';

describe('DebugConsole', () => {
  let console: DebugConsole;

  beforeEach(() => {
    console = new DebugConsole();
    console.setEnabled(true);
    console.setLogLevel('debug');
    console.clearLogs();
  });

  describe('logging', () => {
    it('should log debug messages', () => {
      console.debug('Debug message', { key: 'value' });

      const logs = console.getLogs('debug');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].message).toBe('Debug message');
    });

    it('should log info messages', () => {
      console.info('Info message');

      const logs = console.getLogs('info');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].message).toBe('Info message');
    });

    it('should log warn messages', () => {
      console.warn('Warning message');

      const logs = console.getLogs('warn');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].message).toBe('Warning message');
    });

    it('should log error messages', () => {
      console.error('Error message');

      const logs = console.getLogs('error');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].message).toBe('Error message');
    });

    it('should respect log level', () => {
      console.setLogLevel('warn');

      console.debug('Debug message');
      console.info('Info message');
      console.warn('Warn message');
      console.error('Error message');

      const allLogs = console.getLogs();
      expect(allLogs.filter(l => l.level === 'debug')).toHaveLength(0);
      expect(allLogs.filter(l => l.level === 'info')).toHaveLength(0);
      expect(allLogs.filter(l => l.level === 'warn')).toHaveLength(1);
      expect(allLogs.filter(l => l.level === 'error')).toHaveLength(1);
    });

    it('should not log when disabled', () => {
      console.setEnabled(false);
      console.info('This should not be logged');

      const logs = console.getLogs();
      expect(logs.filter(l => l.message === 'This should not be logged')).toHaveLength(0);
    });
  });

  describe('variables', () => {
    it('should set and get variables', () => {
      console.setVariable('testVar', 42);
      expect(console.getVariable('testVar')).toBe(42);
    });

    it('should delete variables', () => {
      console.setVariable('toDelete', 'value');
      expect(console.deleteVariable('toDelete')).toBe(true);
      expect(console.getVariable('toDelete')).toBeUndefined();
    });

    it('should get all variables', () => {
      console.setVariable('var1', 1);
      console.setVariable('var2', 2);

      const vars = console.getAllVariables();
      expect(vars.var1).toBe(1);
      expect(vars.var2).toBe(2);
    });

    it('should clear all variables', () => {
      console.setVariable('var1', 1);
      console.setVariable('var2', 2);

      console.clearVariables();
      expect(Object.keys(console.getAllVariables())).toHaveLength(0);
    });
  });

  describe('commands', () => {
    it('should execute help command', async () => {
      const result = await console.executeCommand('help');
      expect(result).toContain('可用命令');
    });

    it('should execute clear command', async () => {
      console.info('Test log');
      await console.executeCommand('clear');

      const logs = console.getLogs();
      expect(logs.filter(l => l.message !== '日志已清除')).toHaveLength(0);
    });

    it('should execute set command', async () => {
      await console.executeCommand('set testValue 123');
      expect(console.getVariable('testValue')).toBe(123);
    });

    it('should execute get command', async () => {
      console.setVariable('myVar', 'hello');
      const result = await console.executeCommand('get myVar');
      expect(result).toContain('hello');
    });

    it('should execute vars command', async () => {
      console.setVariable('var1', 1);
      const result = await console.executeCommand('vars');
      expect(result).toContain('var1');
    });

    it('should execute del command', async () => {
      console.setVariable('toDelete', 'value');
      await console.executeCommand('del toDelete');
      expect(console.getVariable('toDelete')).toBeUndefined();
    });

    it('should execute time command', async () => {
      const result = await console.executeCommand('time');
      expect(result).toContain('当前时间');
    });

    it('should execute stats command', async () => {
      const result = await console.executeCommand('stats');
      expect(result).toContain('系统统计');
    });

    it('should return error for unknown command', async () => {
      const result = await console.executeCommand('unknownCommand');
      expect(result).toContain('未知命令');
    });
  });

  describe('custom commands', () => {
    it('should register custom command', () => {
      console.registerCommand({
        name: 'custom',
        description: 'Custom command',
        usage: 'custom',
        handler: () => 'Custom result',
      });

      const commands = console.getCommands();
      expect(commands.find(c => c.name === 'custom')).toBeDefined();
    });

    it('should execute custom command', async () => {
      console.registerCommand({
        name: 'greet',
        description: 'Greet user',
        usage: 'greet [name]',
        handler: (args) => `Hello, ${args[0] || 'World'}!`,
      });

      const result = await console.executeCommand('greet Alice');
      expect(result).toBe('Hello, Alice!');
    });

    it('should unregister command', () => {
      console.registerCommand({
        name: 'temp',
        description: 'Temp command',
        usage: 'temp',
        handler: () => 'temp',
      });

      expect(console.unregisterCommand('temp')).toBe(true);
      const commands = console.getCommands();
      expect(commands.find(c => c.name === 'temp')).toBeUndefined();
    });
  });

  describe('import/export', () => {
    it('should export logs', () => {
      console.info('Test log 1');
      console.warn('Test log 2');

      const exported = console.exportLogs();
      const parsed = JSON.parse(exported);

      expect(parsed.logs).toBeDefined();
      expect(Array.isArray(parsed.logs)).toBe(true);
    });

    it('should import logs', () => {
      console.info('Original log');
      const exported = console.exportLogs();

      const newConsole = new DebugConsole();
      newConsole.setEnabled(true);
      const result = newConsole.importLogs(exported);

      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThan(0);
    });
  });

  describe('enable/disable', () => {
    it('should toggle enabled state', () => {
      expect(console.isEnabled()).toBe(true);

      console.setEnabled(false);
      expect(console.isEnabled()).toBe(false);

      console.setEnabled(true);
      expect(console.isEnabled()).toBe(true);
    });
  });
});
