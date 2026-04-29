# AcuDice 骰子系统 - 深度 Bug 排查报告

**生成日期**: 2026-04-29  
**项目版本**: 2.0.0  
**总览**: 共发现 **约 120+ 个问题**，涵盖逻辑错误、类型安全缺陷、性能问题、安全漏洞等。

---

## 目录

1. [严重级别说明](#1-严重级别说明)
2. [严重 Bug（崩溃级）](#2-严重-bug崩溃级)
3. [高危 Bug（逻辑错误）](#3-高危-bug逻辑错误)
4. [中危 Bug（边界与设计问题）](#4-中危-bug边界与设计问题)
5. [低危与代码异味](#5-低危与代码异味)

---

## 1. 严重级别说明

| 级别 | 定义 |
|------|------|
| **严重** | 导致崩溃、数据损坏、功能完全不可用 |
| **高危** | 产生错误计算结果，功能行为严重偏离预期 |
| **中危** | 边界条件处理不当，设计脆弱，潜在运行时异常 |
| **低危** | 代码异味、维护性问题、性能损耗 |

---

## 2. 严重 Bug（崩溃级）

### 2.1 API 初始化锁死（`ui/src/api.ts` + `ui/src/index.ts`）

**文件**: `ui/src/api.ts:92` / `ui/src/index.ts:245`  
**类型**: 功能完全不可用  
**风险**: Level 5

**问题**: `index.ts` 在启动时先将 `window.AcuDice` 设为 stub 对象 `{ init, mountMainLayout }`，然后立即调用 `initAcuDice()`。但 `api.ts` 第 92 行检查 `'AcuDice' in rootWindow`——由于 stub 已存在，此检查返回 `true`，导致 `initAcuDice()` 直接跳过初始化。**完整的外部 API（check, contest, roll 等方法）永远不会注册到 window**。外部消费者只能拿到 stub。

**修复**: 移除 `index.ts` 早期的 `window.AcuDice` 赋值，或修改 `api.ts` 的初始化检查逻辑，区分 stub 和完整 API。

---

### 2.2 `runInSaveQueue` 竞争条件（`core/effect-engine.ts`）

**文件**: `core/effect-engine.ts:48-65`  
**类型**: 死锁/数据损坏  
**风险**: Level 5

**问题**: `saveQueueResolve` 是一个共享实例字段。连续两次调用时：
1. 调用 A 创建新 Promise，将 resolve 赋给 `saveQueueResolve`
2. 调用 B 覆盖 `saveQueueResolve` 为 B 的 resolve
3. A 完成后调用 `resolve?.()`——但 `resolve` 现在指向 B 的 resolve，不是 A 的
4. B 等待的 Promise 永远无法 resolve

导致引擎的保存队列出现死锁。

---

### 2.3 复数骰子表达式括号/优先级完全被忽略（`core/dice-roller.ts`）

**文件**: `core/dice-roller.ts:263-300`  
**类型**: 计算结果错误  
**风险**: Level 5

**问题**: `rollComplexDiceExpression()` 按从左到右顺序处理运算符，无视优先级：
- `2+3*4` 计算出 `20`（应为 `14`）
- 括号被 tokenize 识别但完全被丢弃，`(1+2)*3` 计算为 `7`（应为 `9`）

---

### 2.4 `evaluateCondition` 使用 `with()` 导致全部抛异常（`map/interaction-engine.ts`）

**文件**: `map/interaction-engine.ts:279-283`  
**类型**: 功能完全不可用  
**风险**: Level 5

**问题**: `evaluateCondition` 使用 `new Function('context', 'with(context) { return ${condition}; }')`。TypeScript 模块默认严格模式，严格模式下 `with` 语句抛出 `SyntaxError`。所有 `custom` 类型的交互触发器规则永远无法匹配。

---

### 2.5 `LazyLoader` 类名冲突（`utils/performance-monitor.ts` + `utils/lazy.ts`）

**文件**: `utils/index.ts:4,7`  
**类型**: 编译错误 / 运行时覆盖  
**风险**: Level 5

**问题**: `lazy.ts` 和 `performance-monitor.ts` 都导出了一个名为 `LazyLoader` 的类，而 `utils/index.ts` 使用 `export * from './lazy'` 和 `export * from './performance-monitor'` 同时导出两者。这会引发 TypeScript 编译错误，或第二个类静默覆盖第一个。

---

### 2.6 缺少 `<OpposedCheckPanel>` 组件导入（`ui/src/components/MainLayout.vue`）

**文件**: `ui/src/components/MainLayout.vue:472`  
**类型**: 运行时崩溃  
**风险**: Level 5

**问题**: 模板中使用了 `<OpposedCheckPanel>`，但在 `<script>` 中没有 import 该组件。会导致 Vue 模板编译错误或运行时静默失败。

---

### 2.7 地图面板平移时除以零（`ui/src/components/MapPanel.vue`）

**文件**: `ui/src/components/MapPanel.vue:94`  
**类型**: 视图损坏  
**风险**: Level 5

**问题**: `viewport.value.y -= dy / viewport.value.y;` 中，分母使用了 `viewport.value.y`（初始值为 0）而非 `viewport.value.zoom`。第一次平移时 `dy / 0 = Infinity`，viewport 坐标完全损坏。

---

### 2.8 COC7 检定 96-99 区间无结果（`presets/builtin-presets.ts`）

**文件**: `presets/builtin-presets.ts:388,398`  
**类型**: 游戏逻辑错误  
**风险**: Level 5

**问题**: 
- `failure` 条件：`$roll > $attr && $roll < 96`
- `fumble` 条件：`($roll >= 96 && $attr < 50) || $roll >= 100`
- 当属性 >= 50 且掷出 96-99 时，`failure` 不满足（roll < 96 false），`fumble` 也不满足（attr < 50 false 且 roll < 100）。
- **结果**：返回 `null`，无任何判定结果。

---

### 2.9 事件监听器无法移除（`ui/src/components/MainLayout.vue`）

**文件**: `ui/src/components/MainLayout.vue:439-442`  
**类型**: 内存泄漏 / 多重触发  
**风险**: Level 4

**问题**: `onUnmounted` 中传入全新匿名函数尝试移除监听器：
```ts
window.removeEventListener('acu-show-changes-panel', () => {})
```
`removeEventListener` 需传入与注册时完全相同的函数引用。当前代码中移除操作全部无效，监听器持续泄漏。

---

### 2.10 `EffectEngine` 调用不存在的 `dbAdapter.updateAttribute`（`core/effect-engine.ts`）

**文件**: `core/effect-engine.ts:576`  
**类型**: 运行时错误  
**风险**: Level 5

**问题**: `EffectEngine` 直接调用 `this.dbAdapter.updateAttribute(...)`。`this.dbAdapter` 的类型是 `DatabaseAdapter`（来自 `adapters/database-adapter.ts`），但该接口/类可能没有 `updateAttribute` 方法（该方法属于 `AttributeManager`）。这是一个设计不一致导致的潜在运行时崩溃。

---

## 3. 高危 Bug（逻辑错误）

### 3.1 `tokenize()` 静默丢弃未识别字符

**文件**: `core/dice-roller.ts:70`  
**风险**: Level 4

任何不匹配已知模式的字符被静默丢弃。输入 `"hello"` 返回空 token 数组，无错误提示。

---

### 3.2 除零错误静默返回 0

**文件**: `core/dice-roller.ts:297`  
**风险**: Level 4

```ts
result = nextValue !== 0 ? result / nextValue : 0;
```
除零时返回 0 而非 Infinity、NaN 或报错。组合优先级 bug 后 `10/0+5` 返回 5。

---

### 3.3 `p` 修饰符映射错误 + `applyPenetrate` 死代码

**文件**: `core/dice-roller.ts:145,209-218`  
**风险**: Level 4

`applyPenetrate()` 函数存在但从未被调用。`modifier.includes('p')` 始终映射到 `applyDropLowest`。用户期望的"穿透"行为（penetrate）永远无法触发。

---

### 3.4 `evaluateCondition` 不支持复合条件

**文件**: `core/dice-roller.ts:361-393`  
**风险**: Level 4

只处理第一个比较运算符。`$a > 5 && $b < 10` 会在第一个 `>` 处拆分为 `$a` 和 `5 && $b < 10`，导致解析错误。

---

### 3.5 Crazy Mode 硬编码 D20 对照 DC=10

**文件**: `core/crazy-mode.ts:174-202`  
**风险**: Level 4

- `judgeResult` 的 D100 分支是死代码（`isD20` 永远为 true）
- 使用硬编码 DC=10 而非属性值或实际难度
- `total`（已计算含加值的总值）从未用于判定

---

### 3.6 `hasDiceResultInText` 全局正则状态污染

**文件**: `core/crazy-mode-trigger.ts:12`  
**风险**: Level 4

全局正则对象 `DICE_RESULT_REGEX` 带 `/g` 标志。`.test()` 调用会修改 `lastIndex`，导致交替调用返回错误结果。

---

### 3.7 `error-handler.ts` 在服务端环境崩溃

**文件**: `core/error-handler.ts:76-308`  
**风险**: Level 4

直接访问 `window`、`document`、`localStorage`、`CustomEvent`、`alert`。在 Node.js 或 SSR 环境立即崩溃。无守卫检测。

---

### 3.8 `errorHandler.uninstall()` 无法移除监听器

**文件**: `core/error-handler.ts:99`  
**风险**: Level 4

注册时使用 lambda `(event) => { this.handleError(...) }`，移除时使用 `this.handleError as unknown as EventListener`——函数引用不同，移除操作无效。

---

### 3.9 `RegexEngine.transform()` 使用过期匹配位置

**文件**: `core/validation/regex-engine.ts:318-336`  
**风险**: Level 4

规则逆序应用但 `current` 在循环内更新，`matchAll` 在循环开始时捕获的位置可能已过期。导致错误位置替换。

---

### 3.10 `Condition` 规则中 `not` -> `!` 转换错误

**文件**: `core/validation/regex-engine.ts:173`  
**风险**: Level 4

`not` 替换为 `!`（前缀一元运算符），但 `not` 在英语中用作 `$a not $b`（中缀）或 `not $a`（前缀）。中缀用法下 `$a not $b` -> `$a ! $b`（无效 JS）。

---

### 3.11 `performCheck()` 不包含 context.dc

**文件**: `index.ts:87,132`  
**风险**: Level 4

`total` 计算中使用属性值计算修正，但从未将 `context.dc` 加入 `total`。结果中的 `total` 字段不包含实际难度值。

---

### 3.12 `registerPreset` 返回虚假的 `valid: true`

**文件**: `data/preset-manager.ts:56-79`  
**风险**: Level 4

缺失 ID 时添加错误到数组但**从不将 `result.valid` 翻转为 `false`**。调用方收到 `valid: true` 而预设实际上缺少 ID。

---

### 3.13 COC7 `crit_success` 和 `extreme_success` 条件完全相同

**文件**: `presets/builtin-presets.ts:347,360`  
**风险**: Level 4

两者都检查 `$roll <= $attr / 5`。`crit_success` 优先级更高，`extreme_success` 永远无法匹配——死代码。

---

### 3.14 `SnapshotManager.deletedRows` 从未被填充

**文件**: `data/snapshot-manager.ts:192`  
**风险**: Level 4

`DiffResult` 包含 `deletedRows` 字段，但 `generateDiffMap` 从未比较旧数据中已删除的行。删除操作永远不会被检测。

---

### 3.15 地图渲染器累积 DPR 缩放

**文件**: `map/map-renderer.ts:76-77`  
**风险**: Level 4

每次 `setupCanvas` 调用都会执行 `ctx.scale(dpr, dpr)`。`ctx` 跨调用持久化，缩放变换是累积的。第二次调用时 DPR 被双重应用。

---

### 3.16 六边形网格几何错误

**文件**: `map/map-renderer.ts:250-273`  
**风险**: Level 4

绘制平顶 hex 时使用尖顶 hex 的偏移布局（垂直偏移而非水平偏移），导致六边形重叠或出现间隙。

---

### 3.17 `screenToWorld` / `worldToScreen` 忽略旋转

**文件**: `map/map-renderer.ts:599-623`  
**风险**: Level 4

坐标转换考虑缩放和平移但忽略了 `viewport.rotation`。地图旋转后拖放、点击检测全部偏移。

---

### 3.18 地图渲染器每帧重新加载图片

**文件**: `map/map-renderer.ts:143-151,422-427`  
**风险**: Level 4

每个渲染帧创建新的 `new Image()` 对象加载背景和 token 贴图。即使图片在缓存中，`img.complete` 在本地文件下也可能为 false，导致持续渲染灰度填充。

---

### 3.19 `clearAll` 未清除分类（`map/avatar-manager.ts`）

**文件**: `map/avatar-manager.ts:391-395`  
**风险**: Level 4

`this.avatars.clear()` 清空头像后调用 `initializeDefaultCategories()`，但 `this.categories` 未被清除，默认分类不会被重新创建。用户期望全部重置但自定义分类被保留。

---

### 3.20 `useDashboard` 属性解析双匹配（`ui/src/composables/useDashboard.ts`）

**文件**: `ui/src/composables/useDashboard.ts:218-222`  
**风险**: Level 4

`headerLower.includes('属性')` 会同时匹配 `基础属性` 和 `特有属性` 列（因为 `特有属性` 包含 `属性`）。`baseAttrs` 错误包含了 `specialAttrs` 列的数据。

---

### 3.21 `CSS.escape` 用于完整 CSS 选择器（`ui/src/utils/toast-manager.ts`）

**文件**: `ui/src/utils/toast-manager.ts:10-12`  
**风险**: Level 4

`CSS.escape('#toast-container .acu-toast')` 转义了包含空格在内的所有特殊字符，生成为 `#toast-container\ .acu-toast`，匹配的是类名中包含空格的选择器而非后代选择器。CSS 规则完全失效。

---

### 3.22 `PLACEHOLDER_REGEX` 全局标志导致交替匹配失败（`ui/src/utils/input-injector.ts`）

**文件**: `ui/src/utils/input-injector.ts:142`  
**风险**: Level 4

`PLACEHOLDER_REGEX` 带 `/g` 标志，`.test()` 会修改 `lastIndex`。连续调用时第二次可能返回错误结果。

---

### 3.23 `ChangesPanel.vue` 使用硬编码 Mock 数据

**文件**: `ui/src/components/ChangesPanel.vue:13-18`  
**风险**: Level 4

整个组件使用静态 mock 数据，从未使用来自 composable 的真实数据。`handleAction` 仅执行 `console.log`。**该功能完全不可用。**

---

### 3.24 `Memoizer.clearAll()` 不做任何事（`utils/cache.ts`）

**文件**: `utils/cache.ts:236-241`  
**风险**: Level 4

`Memoizer` 有 `private static caches` Map，但 `memoize` 方法创建的 `LRUCache` 从未被注册到该 Map 中。`clearAll()` 遍历空 Map，什么都不做。所有 LRUCache 实例永久存留。

---

### 3.25 `isEqual` 使用 `JSON.stringify`（`utils/helpers.ts`）

**文件**: `utils/helpers.ts:48-50`  
**风险**: Level 4

`JSON.stringify` 用于深度比较，但：
- 丢失值为 `undefined` 的 key
- 不同 key 顺序视为不同对象
- Date/Set/Map/RegExp 比较错误
- 循环引用抛异常

---

### 3.26 `$` 变量替换未转义正则特殊字符（`index.ts` + `data/preset-manager.ts`）

**文件**: `index.ts:108` / `data/preset-manager.ts:230-233`  
**风险**: Level 4

使用 `new RegExp('\\$' + key + '\\b', 'g')` 替换模板中的 `$variable`。如果 key 包含正则特殊字符（如 `$`、`+`、`*`），替换失败或产生意外结果。

---

## 4. 中危 Bug（边界与设计问题）

### 4.1 核心引擎
| # | 文件 | 问题 |
|---|------|------|
| 1 | `dice-roller.ts:52` | `e` 字符（explode 标记）可能被科学计数法误匹配 |
| 2 | `dice-roller.ts:328` | `evaluateFormula` 的 strip regex 删除所有非数学字符，信息有损 |
| 3 | `attribute-manager.ts:78` | `findIndex` 使用 `includes` 做部分列名匹配，可能误匹配 |
| 4 | `attribute-manager.ts:88` | 基于 `rowIndex` 的偏移存取设计脆弱 |
| 5 | `effect-engine.ts:362-364` | `resolveThresholdValue` 将布尔值转为 1 作为阈值，语义错误 |
| 6 | `effect-engine.ts:683-695` | `computeEffectVariables` 只反映最后一个效果，忽略前面效果 |
| 7 | `debug-console.ts:115` | 每次 log 都触发同步 localStorage 写入，高频日志导致 UI 卡顿 |
| 8 | `debug-console.ts:352` | `eval(code)` 调试命令存在安全风险 |
| 9 | `debug-console.ts:407-415` | 导入日志不检查 `maxLogs` 限制 |
| 10 | `crazy-mode.ts:199` | `getMasteryBonus('C级')` 硬编码，等级查找表形同虚设 |
| 11 | `emoji-maps.ts:178,212` | 重复/冲突的 emoji 映射条目 |
| 12 | `validation/core.ts:49` | 访问私有的 `validator['options']` |
| 13 | `validation/presetValidationRules:43-45` | 含 `$` 或 `{` 的表达式即视为有效骰子表达式 |

### 4.2 数据层
| # | 文件 | 问题 |
|---|------|------|
| 1 | `settings-manager.ts:424` | `getValue` 返回内部状态直接引用（可变），其他方法克隆 |
| 2 | `settings-manager.ts:262-264` | Auto-save 定时器使用初始化时的间隔，设置变更后不更新 |
| 3 | `database-adapter.ts:371` | API 保存前缓存已被直接 mutate，保存失败缓存变脏 |
| 4 | `database-adapter.ts:301-312` | 别名列已存在时可能创建重复列 |
| 5 | `regex-rule-manager.ts:211-229` | `syncToEngine` 每次重新添加所有规则，可能导致引擎内重复 |
| 6 | `attribute-preset-manager.ts:124-128` | `aidm_npc` 的 `specialAttributes` 映射空数组，始终为空 |
| 7 | `preset-file-loader.ts:216-232` | `initializePresetFiles` 数组始终为空，函数无任何作用 |
| 8 | `validation-executor.ts:139` | `validateKeyValue` 对空字符串返回 false（与其他验证器不一致） |
| 9 | `validation-executor.ts:441` | `rule.config?.min` 使用 falsy 检查，`min: 0` 被忽略 |
| 10 | 多处 | `compareVersion` 在 3 个文件中重复定义 |
| 11 | 多处 | 无跨 tab 的 localStorage 同步 |
| 12 | 多处 | 多文件 `new Function()` 潜在代码注入风险 |

### 4.3 工具与地图
| # | 文件 | 问题 |
|---|------|------|
| 1 | `performance.ts:43` | `lastRenderTime` 在回调执行前更新，时间计算偏差 |
| 2 | `performance.ts:222-231` | `CanvasPool.release` 不重置 canvas 尺寸 |
| 3 | `performance-monitor.ts:116` | Slow operations 报告忽略各类别阈值，始终使用默认 16ms |
| 4 | `helpers.ts:222-226` | `normalizeVersion` 中 `typeof v === 'number'` 分支是死代码 |
| 5 | `lazy.ts:99` | `ChunkLoader` 构造器的 `this.load(key)` 返回的 Promise 未处理 |
| 6 | `lazy.ts:128-135` | `ChunkLoader` 驱逐策略是 FIFO 而非 LRU |
| 7 | `map-manager.ts:207-214` | `setCurrentMap` 切换前不保存旧地图 |
| 8 | `map-manager.ts:220-240` | `updateMap` 签名暗示可更新 `id`/`createdAt`，实际静默忽略 |
| 9 | `map-manager.ts:568-597` | `importMap` 导入时无完整结构校验 |
| 10 | `avatar-manager.ts:264-271` | 头像存储为 base64 数据 URL，localStorage 配额易超 |
| 11 | `table-injector.ts:315-321` | 数值比较使用 `(value as number)`，无运行时类型校验 |
| 12 | `table-injector.ts:325` | `new RegExp(String(filter.value))` 无 try/catch |
| 13 | `table-injector.ts:343-345` | `new Function()` 用户字符串转函数，安全风险 |
| 14 | `table-injector.ts:385-423` | `handleTokenInjection` 处理数据但从不调用 `addToken()` |

### 4.4 Vue 前端
| # | 文件 | 问题 |
|---|------|------|
| 1 | `index.ts:160-161` | MutationObserver 节流与 `setTimeout` 竞争条件 |
| 2 | `index.ts:231-234` | `settingsManager.onChange` 回调从未注销，内存泄漏 |
| 3 | `index.ts:139-141` | 分支不可达（条件已被前面捕获） |
| 4 | `useBookmarks.ts:8` | `(window as any). SillyTavern` 中 `dot` 前有空格，疑似编辑残留 |
| 5 | `useBookmarks.ts:36` | `cleanupOldContexts` 每次保存都执行，过于频繁 |
| 6 | `useCharacterData.ts:118` | 加载角色不进行去重 |
| 7 | `composables/index.ts:127` | `new Function()` 执行用户提供公式，安全风险 |
| 8 | `toast-manager.ts:19-33` | `collectDocuments` 添加重复文档 |
| 9 | `OpposedCheckPanel.vue:87` | 非 d100 骰子的 COC 暴击/大失败范围永远不会触发 |
| 10 | `OpposedCheckPanel.vue:310` | `<button>` 内嵌 `<button>`，无效 HTML |
| 11 | `MapPanel.vue:543` | `!` 非空断言假设 `find` 总有结果 |
| 12 | `TableBrowser.vue:150` | 通过 `[...]` spread 强制触发响应式，脆弱的 hack |
| 13 | `DebugConsole.vue:68` | `milliSecond` 拼写错误（应为 `millisecond`），毫秒不显示 |
| 14 | `FavoritesPanel.vue:36` | `parseInt` 解析非数值 key 返回 `NaN` |
| 15 | `InteractionManager.vue:135` | 以部分更新（仅 `enabled` 字段）当作完整规则更新 |
| 16 | `DiceHistoryPanel.vue:60-61` | 直接 mutate `Set`（如使用 V3.2.5 之前版本可能不响应） |
| 17 | `AvatarSelector.vue:267-278` | URL tab 状态用空格 `' '` 表示，设计脆弱 |
| 18 | `RelationGraph.vue:99-119` | 边引用 `node_<id>` 前缀，节点用纯 ID，双 key 策略脆弱 |

---

## 5. 低危与代码异味

### 5.1 性能问题
- **高频 localStorage 写入**: `debug-console.ts` 每次 log 写入；多处 settings 管理的自动保存
- **全局正则状态**: 多处使用带 `/g` 标志的正则与 `.test()` 组合
- **多处 `new Function()`**: 无缓存，重复创建函数对象
- **窗口树遍历**: `useMvu.ts` 每次刷新遍历 3+ 次窗口树
- **`deepClone` 使用 `JSON.parse(JSON.stringify())`**: 贯穿整个代码库，丢失特殊类型

### 5.2 安全问题
- `debug-console.ts:eval(code)` — 任意代码执行
- `table-injector.ts:new Function()` — 用户字符串转函数
- `interaction-engine.ts:new Function()` — 用户字符串转函数
- `preset-manager.ts:new Function()` — 上下文值注入函数
- `error-handler.ts:as unknown as EventListener` — 类型安全完全绕过

### 5.3 维护性问题
- `compareVersion` 在 3 个文件中重复定义（应提取到共享工具）
- `deriveCombatStats` 在 `DicePanel.vue` 和 `SavePanel.vue` 中重复定义
- 中文错误消息贯穿代码库（非中文开发者难以维护）
- 多处 `as any` / `as unknown as` 类型断言绕过类型检查
- 多处 localStorage 键名无命名空间隔离
- `VITE_DICE_VERSION` 字符串硬编码 `"2.0.0"`

### 5.4 可测试性
- 模块级副作用（`useMvu.ts` 导入即触发 API 调用和 localStorage 读取）
- 模块级单例状态无清理机制
- Vue 生命周期钩子在 composable 中被导出，在非组件上下文调用会抛警告

---

## 6. 综合统计

| 文件领域 | 严重 | 高危 | 中危 | 低危 |
|----------|------|------|------|------|
| 核心引擎 (core/) | 3 | 8 | 13 | 5 |
| 数据层 (data/ + adapters/ + presets/) | 3 | 5 | 12 | 6 |
| 工具 (utils/) | 1 | 3 | 6 | 3 |
| 地图系统 (map/) | 1 | 4 | 14 | 3 |
| Vue 前端 (ui/) | 4 | 7 | 18 | 8 |
| **合计** | **12** | **27** | **63** | **25** |

**总计发现问题数量**: 约 127 个

---

## 7. 优先修复建议

### 第一优先级（功能完全不可用或数据损坏）
1. API 初始化锁死（修复后外部集成可用）
2. 复数骰子括号/优先级丢失（修复后公式计算正确）
3. COC7 96-99 无结果（核心游戏系统正确性）
4. `with()` 严格模式抛出（交互触发器可用）
5. `LazyLoader` 名称冲突（编译/运行正常）
6. `<OpposedCheckPanel>` 缺少 import（界面正常）
7. `runInSaveQueue` 竞争条件（效果引擎可靠）
8. `MapPanel.vue` 除以零（地图平移正常）

### 第二优先级（严重逻辑错误）
1. `p` 修饰符映射 + `applyPenetrate` 死代码
2. `evaluateCondition` 不支持复合条件
3. `EffectEngine` 调用不存在的方法
4. COC7 `extreme_success` 死代码
5. 事件监听器无法移除
6. 地图渲染器每帧重新加载图片
7. 各 `new Function()` 注入风险（至少添加守卫）

### 第三优先级（边界与质量）
1. 各 `compareVersion` 重复定义提取
2. `isEqual` 使用 `JSON.stringify` 替换
3. 各处 `Set`/`Map` 响应式兼容性
4. 各处 localStorage 配额检查与跨 tab 同步
5. 各部分 `deepClone` 一致性
