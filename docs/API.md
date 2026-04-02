# ACU Dice System API 文档

## 概述

ACU Dice System 是一个高级骰子系统，支持自定义预设、效果应用、地图功能和数据验证。

## 核心模块

### 骰子投掷 (`core/dice-roller`)

#### `rollDiceExpression(expression: string): RollResult`

投掷骰子表达式。

```typescript
import { rollDiceExpression } from '@core/dice-roller';

// 基础投掷
const result = rollDiceExpression('1d100');
console.log(result.total); // 1-100

// 带修饰符
const keepHighest = rollDiceExpression('4d6k3'); // 保留最高3个
const explode = rollDiceExpression('1d6e'); // 爆炸骰

// 复杂表达式
const complex = rollDiceExpression('2d6 + 1d4 + 5');
```

#### `evaluateFormula(formula: string, context: Record<string, number>): number`

评估数学公式，支持变量替换。

```typescript
import { evaluateFormula } from '@core/dice-roller';

const result = evaluateFormula('$attr + $mod', { attr: 50, mod: 10 });
console.log(result); // 60
```

#### `evaluateCondition(condition: string, context: Record<string, number>): { success: boolean; value?: number | boolean }`

评估条件表达式。

```typescript
import { evaluateCondition } from '@core/dice-roller';

const result = evaluateCondition('$roll >= 50', { roll: 60 });
console.log(result.value); // true
```

---

### 预设管理 (`data/preset-manager`)

#### `PresetManager`

预设管理器类。

```typescript
import { presetManager } from '@data/preset-manager';

// 注册预设
presetManager.registerPreset({
  id: 'my_preset',
  name: '我的预设',
  kind: 'advanced',
  diceExpression: '1d100',
  outcomes: [
    { id: 'success', name: '成功', condition: '$roll >= 50', effects: [] },
    { id: 'failure', name: '失败', condition: '$roll < 50', effects: [] },
  ],
});

// 获取预设
const preset = presetManager.getPreset('my_preset');

// 设置当前预设
presetManager.setCurrentPreset('my_preset');

// 导入/导出
const json = presetManager.exportPreset('my_preset');
presetManager.importPreset(json);
```

#### 预设类型

```typescript
interface AdvancedDicePreset {
  id: string;
  name: string;
  kind: 'advanced';
  diceExpression: string;
  outcomes: OutcomeLevel[];
  attribute?: AttributeConfig;
  customFields?: CustomFieldConfig[];
  description?: string;
  version?: string;
  builtin?: boolean;
}

interface OutcomeLevel {
  id: string;
  name: string;
  condition: string;
  effects: Effect[];
  priority?: number;
}

interface Effect {
  id: string;
  target: string;
  operation: 'add' | 'subtract' | 'set';
  value: number | string;
  min?: number;
  max?: number;
}
```

---

### 验证系统 (`core/validation`)

#### `validatePreset(preset: AdvancedDicePreset): ValidationResult`

验证预设配置。

```typescript
import { validatePreset } from '@core/validation';

const result = validatePreset(preset);
if (!result.valid) {
  console.error('验证失败:', result.errors);
}
```

#### `Validator`

通用验证器类。

```typescript
import { createValidator } from '@core/validation';

const validator = createValidator({ strictMode: true });

const result = validator.validate(data, {
  type: 'object',
  properties: {
    name: { type: 'string', required: true, minLength: 1 },
    value: { type: 'number', min: 0, max: 100 },
  },
});
```

---

### 地图系统 (`map`)

#### `MapManager`

地图管理器类。

```typescript
import { mapManager } from '@map/map-manager';

// 创建地图
const map = mapManager.createMap({
  name: '战斗地图',
  size: { width: 1920, height: 1080 },
  grid: { type: 'square', size: 50 },
});

// 添加令牌
const token = mapManager.addToken(map.id, {
  name: '角色',
  type: 'character',
  position: { x: 100, y: 100 },
  size: { width: 50, height: 50 },
  color: '#89b4fa',
  // ...
});

// 移动令牌
mapManager.moveToken(map.id, token.id, { x: 200, y: 200 });

// 创建快照
const snapshot = mapManager.createSnapshot(map.id, '回合1');

// 导出/导入
const json = mapManager.exportMap(map.id);
mapManager.importMap(json);
```

#### `MapRenderer`

地图渲染器类。

```typescript
import { mapRenderer } from '@map/map-renderer';

// 附加到Canvas
mapRenderer.attach(canvasElement);

// 设置选项
mapRenderer.setOptions({
  showGrid: true,
  showTokens: true,
  showFog: true,
});

// 渲染
mapRenderer.render(map, viewport);

// 坐标转换
const worldPos = mapRenderer.screenToWorld(screenX, screenY, viewport);
const screenPos = mapRenderer.worldToScreen(worldX, worldY, viewport);
```

---

### 头像管理 (`map/avatar-manager`)

#### `AvatarManager`

头像管理器类。

```typescript
import { avatarManager } from '@map/avatar-manager';

// 添加头像
const avatar = avatarManager.addAvatar({
  name: '角色头像',
  type: 'character',
  image: 'data:image/png;base64,...',
  size: { width: 50, height: 50 },
  color: '#89b4fa',
});

// 从文件导入
const avatar = await avatarManager.importFromImage(file);

// 从URL导入
const avatar = await avatarManager.importFromUrl('https://example.com/avatar.png');

// 导出头像包
const pack = avatarManager.exportPack(avatarIds, '我的头像包');
```

---

### 交互引擎 (`map/interaction-engine`)

#### `InteractionEngine`

交互规则引擎。

```typescript
import { interactionEngine } from '@map/interaction-engine';

// 添加交互规则
interactionEngine.addRule({
  type: 'click',
  trigger: { type: 'token', tokenId: 'npc_1' },
  actions: [
    { type: 'dice_roll', data: { presetId: 'talk_check' } },
    { type: 'message', data: { text: 'NPC交互' } },
  ],
  enabled: true,
  priority: 10,
});

// 处理交互
const result = await interactionEngine.process({
  mapId: 'map_1',
  token: clickedToken,
  position: { x: 100, y: 100 },
  eventType: 'click',
  timestamp: Date.now(),
}, map);
```

---

### 选项表注入 (`map/table-injector`)

#### `TableInjector`

数据注入系统。

```typescript
import { tableInjector } from '@map/table-injector';

// 创建注入配置
const injection = tableInjector.createInjection({
  name: 'NPC数据注入',
  source: {
    type: 'api',
    apiUrl: 'https://api.example.com/npcs',
  },
  target: {
    type: 'token',
    field: 'metadata',
  },
  mapping: [
    { sourceField: 'name', targetField: 'name' },
    { sourceField: 'hp', targetField: 'metadata.hp' },
  ],
  enabled: true,
});

// 执行注入
const result = await tableInjector.execute(injection.id);
```

---

## 工具模块

### 缓存 (`utils/cache`)

#### `LRUCache`

LRU缓存实现。

```typescript
import { LRUCache } from '@utils/cache';

const cache = new LRUCache<string>({ maxSize: 100, defaultTTL: 60000 });

cache.set('key', 'value');
const value = cache.get('key');
cache.delete('key');
cache.clear();
```

#### `Memoizer`

函数记忆化。

```typescript
import { Memoizer } from '@utils/cache';

const memoizedFn = Memoizer.memoize(expensiveFunction, {
  key: (arg1, arg2) => `${arg1}_${arg2}`,
  ttl: 30000,
});
```

---

### 懒加载 (`utils/lazy`)

#### `LazyLoader`

懒加载器。

```typescript
import { LazyLoader } from '@utils/lazy';

const loader = new LazyLoader({ threshold: 0.1 });
loader.observe(element, () => {
  // 元素可见时加载
});
```

#### `ChunkLoader`

分块加载器。

```typescript
import { ChunkLoader } from '@utils/lazy';

const chunkLoader = new ChunkLoader(async (key) => {
  const module = await import(`./chunks/${key}.ts`);
  return module.default;
});

const chunk = await chunkLoader.load('chunk1');
```

---

### 性能优化 (`utils/performance`)

#### `RenderOptimizer`

渲染优化器。

```typescript
import { RenderOptimizer } from '@utils/performance';

const optimizer = new RenderOptimizer({ targetFPS: 60 });
optimizer.requestRender(() => {
  // 渲染逻辑
});
```

#### `throttle` / `debounce`

```typescript
import { throttle, debounce } from '@utils/performance';

const throttledFn = throttle(fn, 100);
const debouncedFn = debounce(fn, 100);
```

#### `VirtualScroller`

虚拟滚动。

```typescript
import { VirtualScroller } from '@utils/performance';

const scroller = new VirtualScroller({ itemHeight: 50, overscan: 3 });
scroller.setItems(items);
scroller.setContainerHeight(600);
scroller.setScrollTop(scrollTop);

const { start, end, visibleItems } = scroller.getVisibleRange();
```

---

## 设置管理 (`data/settings-manager`)

#### `SettingsManager`

设置管理器。

```typescript
import { settingsManager } from '@data/settings-manager';

// 获取设置
const settings = settingsManager.getSettings();
const displaySettings = settingsManager.getGroup('display');

// 更新设置
settingsManager.updateValue('display', 'theme', 'dark');

// 监听变化
settingsManager.onChange((newSettings) => {
  console.log('设置已更新');
});

// 导入/导出
const json = settingsManager.exportSettings();
settingsManager.importSettings(json);
```

---

## 收藏夹管理 (`data/favorites-manager`)

#### `FavoritesManager`

收藏夹管理器。

```typescript
import { favoritesManager } from '@data/favorites-manager';

// 添加收藏
const favorite = favoritesManager.addFavorite('preset', presetData, {
  name: '常用预设',
  tags: ['战斗', '检定'],
});

// 创建分组
const group = favoritesManager.createGroup('战斗相关');

// 添加到分组
favoritesManager.addToGroup(favorite.id, group.id);

// 搜索
const results = favoritesManager.searchFavorites('战斗');

// 导出/导入
const json = favoritesManager.exportData();
favoritesManager.importData(json);
```

---

## 黑名单管理 (`data/blacklist-manager`)

#### `BlacklistManager`

变量黑名单管理器，用于过滤不需要的变量。

```typescript
import { blacklistManager } from '@data/blacklist-manager';

// 添加黑名单项
const entry = blacklistManager.addEntry({
  name: '临时变量过滤',
  pattern: 'temp_*',
  type: 'wildcard', // 'exact' | 'wildcard' | 'regex'
  scope: 'global', // 'global' | 'preset' | 'table'
  enabled: true,
  description: '过滤所有临时变量',
});

// 过滤变量
const result = blacklistManager.filterVariables(['temp_1', 'temp_2', 'permanent']);
console.log(result.blocked); // ['temp_1', 'temp_2']
console.log(result.passed); // ['permanent']

// 测试模式
const testResult = blacklistManager.testPattern('temp_*', 'wildcard', ['temp_1', 'other']);
console.log(testResult.matches); // ['temp_1']

// 获取统计
const stats = blacklistManager.getStatistics();
console.log(stats.totalEntries, stats.totalHits);

// 导出/导入
const json = blacklistManager.exportData();
blacklistManager.importData(json);
```

#### 黑名单类型

```typescript
interface BlacklistEntry {
  id: string;
  name: string;
  pattern: string;
  type: 'exact' | 'wildcard' | 'regex';
  scope: 'global' | 'preset' | 'table';
  scopeTarget?: string;
  enabled: boolean;
  description?: string;
  hitCount: number;
}

interface BlacklistFilterResult {
  blocked: string[];
  passed: string[];
  totalBlocked: number;
  totalPassed: number;
}
```

---

## 书签管理 (`data/bookmark-manager`)

#### `BookmarkManager`

书签管理器，用于快速导航。

```typescript
import { bookmarkManager } from '@data/bookmark-manager';

// 添加书签
const bookmark = bookmarkManager.addBookmark({
  name: '常用预设',
  type: 'preset', // 'preset' | 'table' | 'variable' | 'map' | 'settings' | 'custom'
  target: 'preset_123',
  tags: ['战斗'],
  icon: 'fa-dice',
  color: '#ff0000',
  order: 0,
});

// 访问书签
bookmarkManager.accessBookmark(bookmark.id);

// 添加到快捷访问
bookmarkManager.addToQuickAccess(bookmark.id);

// 创建分组
const group = bookmarkManager.createGroup('战斗相关', 'fa-folder', '#ff0000');

// 添加书签到分组
bookmarkManager.addBookmarkToGroup(group.id, bookmark.id);

// 搜索
const results = bookmarkManager.searchBookmarks('战斗');

// 获取最近访问
const recent = bookmarkManager.getRecentBookmarks(10);

// 获取最常使用
const mostUsed = bookmarkManager.getMostUsedBookmarks(10);

// 导出/导入
const json = bookmarkManager.exportData();
bookmarkManager.importData(json);
```

#### 书签类型

```typescript
type BookmarkType = 'preset' | 'table' | 'variable' | 'map' | 'settings' | 'custom';

interface Bookmark {
  id: string;
  name: string;
  type: BookmarkType;
  target: string;
  description?: string;
  tags: string[];
  icon?: string;
  color?: string;
  order: number;
  accessCount: number;
  lastAccessedAt?: number;
}

interface BookmarkGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  bookmarkIds: string[];
  order: number;
}
```

---

## Debug控制台 (`core/debug-console`)

#### `DebugConsole`

开发调试工具。

```typescript
import { debugConsole } from '@core/debug-console';

// 启用/禁用
debugConsole.setEnabled(true);
debugConsole.setLogLevel('debug'); // 'debug' | 'info' | 'warn' | 'error'

// 日志记录
debugConsole.debug('Debug message', { data: 'value' });
debugConsole.info('Info message');
debugConsole.warn('Warning message');
debugConsole.error('Error message');

// 获取日志
const logs = debugConsole.getLogs('error', 100);

// 变量管理
debugConsole.setVariable('testVar', 42);
const value = debugConsole.getVariable('testVar');
const allVars = debugConsole.getAllVariables();

// 执行命令
const result = await debugConsole.executeCommand('help');
await debugConsole.executeCommand('set myVar 123');

// 注册自定义命令
debugConsole.registerCommand({
  name: 'custom',
  description: '自定义命令',
  usage: 'custom [args]',
  handler: (args, context) => {
    return `执行自定义命令: ${args.join(' ')}`;
  },
});

// 导出日志
const json = debugConsole.exportLogs();
```

#### 内置命令

| 命令 | 描述 |
|------|------|
| `help` | 显示可用命令列表 |
| `clear` | 清除日志 |
| `log <level>` | 设置日志级别 |
| `get <var>` | 获取变量值 |
| `set <var> <value>` | 设置变量值 |
| `vars` | 列出所有变量 |
| `del <var>` | 删除变量 |
| `export [logs\|vars]` | 导出调试数据 |
| `eval <code>` | 执行JavaScript代码 |
| `time` | 显示当前时间戳 |
| `stats` | 显示系统统计信息 |

---

## 正则规则管理 (`data/regex-rule-manager`)

#### `RegexRuleManager`

正则规则管理器，支持酒馆格式导入。

```typescript
import { regexRuleManager } from '@data/regex-rule-manager';

// 创建预设
const preset = regexRuleManager.createPreset('我的正则规则');

// 添加规则
const rule = regexRuleManager.addRuleToPreset(preset.id, {
  name: '替换规则',
  pattern: '\\[hp\\]',
  replacement: '100',
  type: 'regex',
  category: 'template',
  enabled: true,
  priority: 50,
});

// 转换文本
const result = regexRuleManager.transform('当前HP: [hp]');
console.log(result.transformed); // '当前HP: 100'

// 从酒馆导入
const importResult = regexRuleManager.importFromSillyTavern(json);

// 导出到酒馆格式
const stJson = regexRuleManager.exportToSillyTavern(preset.id);

// 导出/导入
const json = regexRuleManager.exportPreset(preset.id);
regexRuleManager.importPreset(json);
```

---

## 交互规则管理 (`data/interaction-rule-manager`)

#### `InteractionRuleManager`

交互规则管理器。

```typescript
import { interactionRuleManager, INTERACTION_TEMPLATES } from '@data/interaction-rule-manager';

// 创建预设
const preset = interactionRuleManager.createPreset('我的交互规则');

// 从模板创建规则
const rule = interactionRuleManager.createRuleFromTemplate('token_click_roll', {
  trigger: { tokenId: 'npc_1' },
  action: { data: { presetId: 'talk_check' } },
});

// 添加规则到预设
interactionRuleManager.addRuleToPreset(preset.id, rule);

// 更新规则
interactionRuleManager.updateRuleInPreset(preset.id, rule.id, { enabled: false });

// 导出/导入
const json = interactionRuleManager.exportPreset(preset.id);
interactionRuleManager.importPreset(json);
```

#### 交互模板

| 模板ID | 名称 | 描述 |
|--------|------|------|
| `token_click_roll` | 令牌点击掷骰 | 点击令牌时触发骰子检定 |
| `region_enter_message` | 区域进入提示 | 进入区域时显示消息 |
| `grid_cell_effect` | 格子效果 | 进入特定格子时触发效果 |
| `custom_condition` | 自定义条件 | 使用自定义条件触发动作 |

---

## 类型定义

完整类型定义请参考以下文件：

- `core/types.ts` - 核心类型
- `map/types.ts` - 地图类型
- `data/settings-manager.ts` - 设置类型
- `data/favorites-manager.ts` - 收藏夹类型

---

## 错误处理

所有API都遵循以下错误处理模式：

1. 同步操作返回布尔值或null表示失败
2. 异步操作抛出异常或返回错误对象
3. 验证操作返回`ValidationResult`对象

```typescript
// 同步操作
const success = manager.deletePreset('id'); // boolean

// 异步操作
try {
  const result = await engine.process(context, map);
} catch (error) {
  console.error(error);
}

// 验证操作
const result = validatePreset(preset);
if (!result.valid) {
  result.errors.forEach(e => console.error(e.message));
}
```

---

## 事件系统

部分管理器支持事件监听：

```typescript
// 设置变化
settingsManager.onChange((settings) => { ... });

// 地图变化
mapManager.onChange((map) => { ... });

// 取消监听
const unsubscribe = settingsManager.onChange(callback);
unsubscribe(); // 取消监听
```

---

## 存储机制

所有数据默认存储在`localStorage`中：

| 存储键 | 描述 |
|--------|------|
| `dice_presets` | 预设数据 |
| `acu_dice_settings` | 设置数据 |
| `acu_dice_favorites` | 收藏夹数据 |
| `acu_dice_maps` | 地图数据 |
| `acu_dice_avatars` | 头像数据 |
| `acu_variable_blacklist` | 黑名单数据 |
| `acu_dice_bookmarks` | 书签数据 |
| `acu_regex_presets` | 正则规则预设 |
| `acu_interaction_presets` | 交互规则预设 |
| `acu_debug_logs` | Debug日志 |
| `acu_debug_variables` | Debug变量 |

可以通过导入/导出功能备份和恢复数据。
