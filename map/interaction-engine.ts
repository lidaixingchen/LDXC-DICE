import type {
  MapInteraction,
  MapInteractionAction,
  MapInteractionTrigger,
  MapToken,
  MapPosition,
  DiceMap,
} from './types';

export interface InteractionContext {
  mapId: string;
  token?: MapToken;
  position: MapPosition;
  eventType: 'move' | 'click' | 'drag' | 'drop' | 'hover' | 'select';
  userId?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface InteractionResult {
  handled: boolean;
  actions: ExecutedAction[];
  prevented: boolean;
  message?: string;
}

export interface ExecutedAction {
  action: MapInteractionAction;
  success: boolean;
  result?: unknown;
  error?: string;
}

export type InteractionHandler = (
  context: InteractionContext,
  action: MapInteractionAction,
) => Promise<ExecutedAction>;

const INTERACTIONS_STORAGE_KEY = 'acu_dice_interaction_rules';

export class InteractionEngine {
  private handlers: Map<string, InteractionHandler> = new Map();
  private rules: Map<string, MapInteraction> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.initializeDefaultHandlers();
    this.loadFromStorage();
  }

  private initializeDefaultHandlers(): void {
    this.registerHandler('dice_roll', this.handleDiceRoll.bind(this));
    this.registerHandler('message', this.handleMessage.bind(this));
    this.registerHandler('effect', this.handleEffect.bind(this));
    this.registerHandler('move_token', this.handleMoveToken.bind(this));
    this.registerHandler('change_layer', this.handleChangeLayer.bind(this));
    this.registerHandler('custom', this.handleCustom.bind(this));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(INTERACTIONS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const rule of data) {
          if (rule.id) {
            this.rules.set(rule.id, rule);
          }
        }
      }
    } catch (e) {
      console.warn('[InteractionEngine] 加载交互规则失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(INTERACTIONS_STORAGE_KEY, JSON.stringify(Array.from(this.rules.values())));
    } catch (e) {
      console.warn('[InteractionEngine] 保存交互规则失败:', e);
    }
  }

  registerHandler(type: string, handler: InteractionHandler): void {
    this.handlers.set(type, handler);
  }

  unregisterHandler(type: string): void {
    this.handlers.delete(type);
  }

  addRule(rule: Omit<MapInteraction, 'id'>): MapInteraction {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: MapInteraction = {
      ...rule,
      id,
    };

    this.rules.set(id, newRule);
    this.saveToStorage();
    console.log(`[InteractionEngine] 添加交互规则: ${rule.type}`);
    return newRule;
  }

  updateRule(id: string, updates: Partial<MapInteraction>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    const updated: MapInteraction = {
      ...rule,
      ...updates,
      id: rule.id,
    };

    this.rules.set(id, updated);
    this.saveToStorage();
    return true;
  }

  removeRule(id: string): boolean {
    const result = this.rules.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  getRule(id: string): MapInteraction | null {
    return this.rules.get(id) || null;
  }

  getAllRules(): MapInteraction[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): MapInteraction[] {
    return Array.from(this.rules.values()).filter(r => r.enabled);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async process(context: InteractionContext, map: DiceMap): Promise<InteractionResult> {
    if (!this.enabled) {
      return { handled: false, actions: [], prevented: false };
    }

    const applicableRules = this.findApplicableRules(context, map);
    const executedActions: ExecutedAction[] = [];
    let prevented = false;

    for (const rule of applicableRules) {
      if (prevented) break;

      for (const action of rule.actions) {
        if (action.delay) {
          await this.delay(action.delay);
        }

        const handler = this.handlers.get(action.type);
        if (handler) {
          const result = await handler(context, action);
          executedActions.push(result);

          if (!result.success && rule.priority >= 100) {
            prevented = true;
            break;
          }
        } else {
          executedActions.push({
            action,
            success: false,
            error: `未找到处理器: ${action.type}`,
          });
        }
      }
    }

    return {
      handled: executedActions.length > 0,
      actions: executedActions,
      prevented,
    };
  }

  private findApplicableRules(context: InteractionContext, map: DiceMap): MapInteraction[] {
    const rules = map.interactions.filter(r => r.enabled);

    return rules
      .filter(rule => this.isRuleApplicable(rule, context, map))
      .sort((a, b) => b.priority - a.priority);
  }

  private isRuleApplicable(rule: MapInteraction, context: InteractionContext, map: DiceMap): boolean {
    if (rule.type !== context.eventType) return false;

    const trigger = rule.trigger;

    switch (trigger.type) {
      case 'token':
        return trigger.tokenId === context.token?.id;

      case 'region':
        return this.isInRegion(context.position, trigger.regionId, map);

      case 'grid':
        return this.isInGridCell(context.position, trigger.data?.gridCell, map);

      case 'custom':
        return this.evaluateCondition(trigger.condition, context);

      default:
        return false;
    }
  }

  private isInRegion(position: MapPosition, regionId: string | undefined, map: DiceMap): boolean {
    if (!regionId) return false;

    const region = map.fog.regions.find(r => r.id === regionId);
    if (!region) return false;

    const { bounds, shape, points } = region;

    switch (shape) {
      case 'rect':
        return (
          position.x >= bounds.x &&
          position.x <= bounds.x + bounds.width &&
          position.y >= bounds.y &&
          position.y <= bounds.y + bounds.height
        );

      case 'circle': {
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const radius = Math.min(bounds.width, bounds.height) / 2;
        const distance = Math.sqrt((position.x - centerX) ** 2 + (position.y - centerY) ** 2);
        return distance <= radius;
      }

      case 'polygon':
        return points ? this.isPointInPolygon(position, points) : false;

      default:
        return false;
    }
  }

  private isPointInPolygon(point: MapPosition, polygon: MapPosition[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private isInGridCell(position: MapPosition, gridCell: unknown, map: DiceMap): boolean {
    if (!gridCell || !map.grid.enabled) return false;

    const cell = gridCell as { col: number; row: number };
    const col = Math.floor(position.x / map.grid.size);
    const row = Math.floor(position.y / map.grid.size);

    return col === cell.col && row === cell.row;
  }

  private evaluateCondition(condition: string | undefined, context: InteractionContext): boolean {
    if (!condition) return true;

    if (condition.length > 1000 || /[;{}[\]'"`\\]/.test(condition)) {
      console.warn('[InteractionEngine] 条件表达式包含不安全字符', condition);
      return false;
    }

    try {
      const contextVars = Object.entries(context).map(([key, val]) => {
        const safeVal = typeof val === 'function' ? 'undefined' : JSON.stringify(val);
        return `var ${key} = ${safeVal};`;
      }).join('\n');

      const fn = new Function(
        `${contextVars}\nreturn (${condition});`,
      );
      return fn();
    } catch (e) {
      console.warn('[InteractionEngine] 条件评估失败:', e);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleDiceRoll(context: InteractionContext, action: MapInteractionAction): Promise<ExecutedAction> {
    try {
      const { presetId, attribute, dc, modifier } = action.data as {
        presetId?: string;
        attribute?: string;
        dc?: number;
        modifier?: number;
      };

      console.log('[InteractionEngine] 执行骰子投掷:', { presetId, attribute, dc, modifier });

      return {
        action,
        success: true,
        result: {
          type: 'dice_roll',
          presetId,
          attribute,
          dc,
          modifier,
          token: context.token,
        },
      };
    } catch (e) {
      return {
        action,
        success: false,
        error: e instanceof Error ? e.message : '未知错误',
      };
    }
  }

  private async handleMessage(context: InteractionContext, action: MapInteractionAction): Promise<ExecutedAction> {
    try {
      const { text, type = 'info' } = action.data as { text: string; type?: string };

      console.log('[InteractionEngine] 显示消息:', text);

      return {
        action,
        success: true,
        result: {
          type: 'message',
          text,
          messageType: type,
          token: context.token,
        },
      };
    } catch (e) {
      return {
        action,
        success: false,
        error: e instanceof Error ? e.message : '未知错误',
      };
    }
  }

  private async handleEffect(context: InteractionContext, action: MapInteractionAction): Promise<ExecutedAction> {
    try {
      const { effectType, target, value } = action.data as {
        effectType: string;
        target?: string;
        value?: unknown;
      };

      console.log('[InteractionEngine] 应用效果:', { effectType, target, value });

      return {
        action,
        success: true,
        result: {
          type: 'effect',
          effectType,
          target,
          value,
          token: context.token,
        },
      };
    } catch (e) {
      return {
        action,
        success: false,
        error: e instanceof Error ? e.message : '未知错误',
      };
    }
  }

  private async handleMoveToken(context: InteractionContext, action: MapInteractionAction): Promise<ExecutedAction> {
    try {
      const { tokenId, position, relative } = action.data as {
        tokenId?: string;
        position?: MapPosition;
        relative?: boolean;
      };

      const targetId = tokenId || context.token?.id;
      if (!targetId) {
        return {
          action,
          success: false,
          error: '未指定目标令牌',
        };
      }

      let newPosition = position;
      if (relative && position && context.token) {
        newPosition = {
          x: context.token.position.x + position.x,
          y: context.token.position.y + position.y,
        };
      }

      console.log('[InteractionEngine] 移动令牌:', { tokenId: targetId, position: newPosition });

      return {
        action,
        success: true,
        result: {
          type: 'move_token',
          tokenId: targetId,
          position: newPosition,
        },
      };
    } catch (e) {
      return {
        action,
        success: false,
        error: e instanceof Error ? e.message : '未知错误',
      };
    }
  }

  private async handleChangeLayer(context: InteractionContext, action: MapInteractionAction): Promise<ExecutedAction> {
    try {
      const { tokenId, layerId } = action.data as {
        tokenId?: string;
        layerId: string;
      };

      const targetId = tokenId || context.token?.id;
      if (!targetId) {
        return {
          action,
          success: false,
          error: '未指定目标令牌',
        };
      }

      console.log('[InteractionEngine] 更改图层:', { tokenId: targetId, layerId });

      return {
        action,
        success: true,
        result: {
          type: 'change_layer',
          tokenId: targetId,
          layerId,
        },
      };
    } catch (e) {
      return {
        action,
        success: false,
        error: e instanceof Error ? e.message : '未知错误',
      };
    }
  }

  private async handleCustom(context: InteractionContext, action: MapInteractionAction): Promise<ExecutedAction> {
    try {
      const { handler: handlerName, params } = action.data as {
        handler: string;
        params?: Record<string, unknown>;
      };

      console.log('[InteractionEngine] 执行自定义动作:', { handlerName, params });

      return {
        action,
        success: true,
        result: {
          type: 'custom',
          handler: handlerName,
          params,
          token: context.token,
        },
      };
    } catch (e) {
      return {
        action,
        success: false,
        error: e instanceof Error ? e.message : '未知错误',
      };
    }
  }

  exportRules(): string {
    return JSON.stringify(Array.from(this.rules.values()), null, 2);
  }

  importRules(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const rules = JSON.parse(json);

      if (!Array.isArray(rules)) {
        errors.push('数据必须是规则数组');
        return { imported: 0, errors };
      }

      for (const rule of rules) {
        if (rule.id && rule.type && rule.trigger && rule.actions) {
          this.rules.set(rule.id, rule);
          imported++;
        } else {
          errors.push(`无效的规则格式: ${JSON.stringify(rule).slice(0, 100)}`);
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

export const interactionEngine = new InteractionEngine();
