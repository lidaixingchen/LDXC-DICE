export interface TableInjection {
  id: string;
  name: string;
  description?: string;
  source: TableSource;
  target: InjectionTarget;
  mapping: FieldMapping[];
  filters: InjectionFilter[];
  options: InjectionOptions;
  enabled: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface TableSource {
  type: 'preset' | 'custom' | 'api' | 'file';
  presetId?: string;
  customData?: Record<string, unknown>[];
  apiUrl?: string;
  filePath?: string;
  refreshInterval?: number;
}

export interface InjectionTarget {
  type: 'token' | 'map' | 'interaction' | 'metadata';
  field: string;
  condition?: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: TransformRule;
  defaultValue?: unknown;
}

export interface TransformRule {
  type: 'template' | 'function' | 'lookup' | 'conditional';
  template?: string;
  function?: string;
  lookupTable?: Record<string, unknown>;
  conditions?: Array<{ condition: string; value: unknown }>;
}

export interface InjectionFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches';
  value: unknown;
}

export interface InjectionOptions {
  overwrite: boolean;
  merge: boolean;
  validateBeforeInject: boolean;
  notifyOnInject: boolean;
  batch: boolean;
  batchSize: number;
}

export interface InjectionResult {
  success: boolean;
  injected: number;
  skipped: number;
  errors: string[];
  data?: Record<string, unknown>[];
}

export interface InjectionContext {
  injectionId: string;
  sourceData: Record<string, unknown>[];
  targetData: unknown;
  timestamp: number;
}

type InjectionHandler = (
  sourceData: Record<string, unknown>[],
  target: InjectionTarget,
  mapping: FieldMapping[],
  options: InjectionOptions,
) => InjectionResult;

const INJECTIONS_STORAGE_KEY = 'acu_dice_table_injections';

export class TableInjector {
  private injections: Map<string, TableInjection> = new Map();
  private handlers: Map<string, InjectionHandler> = new Map();
  private cache: Map<string, { data: Record<string, unknown>[]; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000;
  private tokenCallback: ((tokenData: Record<string, unknown>) => void) | null = null;

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultHandlers();
  }

  onTokenCreated(callback: (tokenData: Record<string, unknown>) => void): void {
    this.tokenCallback = callback;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(INJECTIONS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const injection of data) {
          if (injection.id) {
            this.injections.set(injection.id, injection);
          }
        }
      }
    } catch (e) {
      console.warn('[TableInjector] 加载注入配置失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(INJECTIONS_STORAGE_KEY, JSON.stringify(Array.from(this.injections.values())));
    } catch (e) {
      console.warn('[TableInjector] 保存注入配置失败:', e);
    }
  }

  private initializeDefaultHandlers(): void {
    this.registerHandler('token', this.handleTokenInjection.bind(this));
    this.registerHandler('map', this.handleMapInjection.bind(this));
    this.registerHandler('interaction', this.handleInteractionInjection.bind(this));
    this.registerHandler('metadata', this.handleMetadataInjection.bind(this));
  }

  registerHandler(type: string, handler: InjectionHandler): void {
    this.handlers.set(type, handler);
  }

  unregisterHandler(type: string): void {
    this.handlers.delete(type);
  }

  createInjection(config: Omit<TableInjection, 'id' | 'createdAt' | 'updatedAt'>): TableInjection {
    const id = `inject_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const injection: TableInjection = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.injections.set(id, injection);
    this.saveToStorage();
    console.log(`[TableInjector] 创建注入配置: ${config.name}`);
    return injection;
  }

  updateInjection(id: string, updates: Partial<TableInjection>): boolean {
    const injection = this.injections.get(id);
    if (!injection) return false;

    const updated: TableInjection = {
      ...injection,
      ...updates,
      id: injection.id,
      createdAt: injection.createdAt,
      updatedAt: Date.now(),
    };

    this.injections.set(id, updated);
    this.saveToStorage();
    return true;
  }

  deleteInjection(id: string): boolean {
    const result = this.injections.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  getInjection(id: string): TableInjection | null {
    return this.injections.get(id) || null;
  }

  getAllInjections(): TableInjection[] {
    return Array.from(this.injections.values()).sort((a, b) => b.priority - a.priority);
  }

  getEnabledInjections(): TableInjection[] {
    return this.getAllInjections().filter(i => i.enabled);
  }

  async fetchSourceData(source: TableSource): Promise<Record<string, unknown>[]> {
    const cacheKey = this.getCacheKey(source);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    let data: Record<string, unknown>[];

    switch (source.type) {
      case 'preset':
        data = await this.fetchFromPreset(source.presetId);
        break;

      case 'custom':
        data = source.customData || [];
        break;

      case 'api':
        data = await this.fetchFromApi(source.apiUrl);
        break;

      case 'file':
        data = await this.fetchFromFile(source.filePath);
        break;

      default:
        data = [];
    }

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  private getCacheKey(source: TableSource): string {
    return JSON.stringify(source);
  }

  private async fetchFromPreset(presetId?: string): Promise<Record<string, unknown>[]> {
    if (!presetId) return [];

    console.log(`[TableInjector] 从预设获取数据: ${presetId}`);
    return [];
  }

  private async fetchFromApi(url?: string): Promise<Record<string, unknown>[]> {
    if (!url) return [];

    try {
      const response = await fetch(url);
      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (e) {
      console.error('[TableInjector] API请求失败:', e);
      return [];
    }
  }

  private async fetchFromFile(filePath?: string): Promise<Record<string, unknown>[]> {
    if (!filePath) return [];

    console.log(`[TableInjector] 从文件获取数据: ${filePath}`);
    return [];
  }

  async execute(injectionId: string, targetData?: unknown): Promise<InjectionResult> {
    const injection = this.injections.get(injectionId);
    if (!injection || !injection.enabled) {
      return {
        success: false,
        injected: 0,
        skipped: 0,
        errors: ['注入配置不存在或已禁用'],
      };
    }

    try {
      let sourceData = await this.fetchSourceData(injection.source);

      sourceData = this.applyFilters(sourceData, injection.filters);

      const handler = this.handlers.get(injection.target.type);
      if (!handler) {
        return {
          success: false,
          injected: 0,
          skipped: 0,
          errors: [`未找到处理器: ${injection.target.type}`],
        };
      }

      const result = handler(sourceData, injection.target, injection.mapping, injection.options);

      if (injection.options.notifyOnInject && result.success) {
        console.log(`[TableInjector] 注入完成: ${injection.name}, 注入 ${result.injected} 条`);
      }

      return result;
    } catch (e) {
      return {
        success: false,
        injected: 0,
        skipped: 0,
        errors: [e instanceof Error ? e.message : '未知错误'],
      };
    }
  }

  private applyFilters(data: Record<string, unknown>[], filters: InjectionFilter[]): Record<string, unknown>[] {
    if (!filters.length) return data;

    return data.filter(item => {
      return filters.every(filter => this.evaluateFilter(item, filter));
    });
  }

  private evaluateFilter(item: Record<string, unknown>, filter: InjectionFilter): boolean {
    const value = item[filter.field];

    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'gt':
        return (value as number) > (filter.value as number);
      case 'lt':
        return (value as number) < (filter.value as number);
      case 'gte':
        return (value as number) >= (filter.value as number);
      case 'lte':
        return (value as number) <= (filter.value as number);
      case 'contains':
        return String(value).includes(String(filter.value));
      case 'matches':
        try {
          return new RegExp(String(filter.value)).test(String(value));
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  transformValue(value: unknown, transform?: TransformRule): unknown {
    if (!transform) return value;

    switch (transform.type) {
      case 'template':
        if (transform.template && typeof value === 'object') {
          return this.applyTemplate(transform.template, value as Record<string, unknown>);
        }
        return value;

      case 'function':
        if (transform.function) {
          try {
            const body = transform.function;
            if (body.length > 500 || /[{}[\];]/.test(body)) {
              console.warn('[TableInjector] 函数体不安全，已跳过');
              return value;
            }
            const fn = new Function('value', `return ${body}`);
            return fn(value);
          } catch (e) {
            console.warn('[TableInjector] 函数执行失败:', e);
            return value;
          }
        }
        return value;

      case 'lookup':
        if (transform.lookupTable) {
          return transform.lookupTable[String(value)] ?? value;
        }
        return value;

      case 'conditional':
        if (transform.conditions) {
          for (const cond of transform.conditions) {
            try {
              const condBody = cond.condition;
              if (condBody.length > 500 || /[{}[\];]/.test(condBody)) {
                continue;
              }
              const fn = new Function('value', `return ${condBody}`);
              if (fn(value)) {
                return cond.value;
              }
            } catch (e) {
              continue;
            }
          }
        }
        return value;

      default:
        return value;
    }
  }

  private applyTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return String(data[key] ?? '');
    });
  }

  private handleTokenInjection(
    sourceData: Record<string, unknown>[],
    target: InjectionTarget,
    mapping: FieldMapping[],
    options: InjectionOptions,
  ): InjectionResult {
    const errors: string[] = [];
    let injected = 0;
    let skipped = 0;

    console.log('[TableInjector] 执行令牌注入:', { target, mapping, options });

    for (const item of sourceData) {
      try {
        const mappedData: Record<string, unknown> = {};

        for (const map of mapping) {
          let value = item[map.sourceField];

          if (value === undefined && map.defaultValue !== undefined) {
            value = map.defaultValue;
          }

          if (map.transform) {
            value = this.transformValue(value, map.transform);
          }

          mappedData[map.targetField] = value;
        }

        injected++;

        if (this.tokenCallback) {
          this.tokenCallback(mappedData);
        }
      } catch (e) {
        skipped++;
        errors.push(`处理失败: ${e instanceof Error ? e.message : '未知错误'}`);
      }
    }

    return { success: true, injected, skipped, errors, data: sourceData };
  }

  private handleMapInjection(
    sourceData: Record<string, unknown>[],
    target: InjectionTarget,
    mapping: FieldMapping[],
    options: InjectionOptions,
  ): InjectionResult {
    console.log('[TableInjector] 执行地图注入:', { target, mapping, options });

    return {
      success: true,
      injected: sourceData.length,
      skipped: 0,
      errors: [],
      data: sourceData,
    };
  }

  private handleInteractionInjection(
    sourceData: Record<string, unknown>[],
    target: InjectionTarget,
    mapping: FieldMapping[],
    options: InjectionOptions,
  ): InjectionResult {
    console.log('[TableInjector] 执行交互注入:', { target, mapping, options });

    return {
      success: true,
      injected: sourceData.length,
      skipped: 0,
      errors: [],
      data: sourceData,
    };
  }

  private handleMetadataInjection(
    sourceData: Record<string, unknown>[],
    target: InjectionTarget,
    mapping: FieldMapping[],
    options: InjectionOptions,
  ): InjectionResult {
    console.log('[TableInjector] 执行元数据注入:', { target, mapping, options });

    return {
      success: true,
      injected: sourceData.length,
      skipped: 0,
      errors: [],
      data: sourceData,
    };
  }

  async executeAll(targetType?: string): Promise<Map<string, InjectionResult>> {
    const results = new Map<string, InjectionResult>();
    const injections = this.getEnabledInjections();

    for (const injection of injections) {
      if (targetType && injection.target.type !== targetType) continue;

      const result = await this.execute(injection.id);
      results.set(injection.id, result);
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  exportInjections(): string {
    return JSON.stringify(Array.from(this.injections.values()), null, 2);
  }

  importInjections(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const injections = JSON.parse(json);

      if (!Array.isArray(injections)) {
        errors.push('数据必须是注入配置数组');
        return { imported: 0, errors };
      }

      for (const injection of injections) {
        if (injection.id && injection.source && injection.target) {
          this.injections.set(injection.id, {
            ...injection,
            updatedAt: Date.now(),
          });
          imported++;
        } else {
          errors.push(`无效的注入配置: ${JSON.stringify(injection).slice(0, 100)}`);
        }
      }

      this.saveToStorage();
      return { imported, errors };
    } catch (e) {
      errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
      return { imported: 0, errors };
    }
  }
}

export const tableInjector = new TableInjector();
