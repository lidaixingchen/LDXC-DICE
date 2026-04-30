# 项目前端 UI 架构与代码质量问题分析报告

**日期:** 2026年4月30日
**范围:** `ui/` 目录前端部分

## 摘要

本项目的前端层采用了 Vue 3 (Composition API) + Vite 进行构建。尽管团队已为其编写了多份规范和完善的指南文档（例如无障碍和交互组件等相关 Guide），并且对部分业务逻辑进行了服务层拆分，但在实际落地时存在显著缺陷。系统面临多处状态管理反模式、性能隐患、以及无障碍设计长期缺失的问题。

---

## 1. 状态管理问题 (Critical)

项目中直接使用了 Vue 响应式特性（如 `ref`）和 `provide/inject`，未能引入规范的状态管理库（如 Pinia 或 Vuex），进而导致多处状态脱节。

### 1.1 可组合函数陷阱 (Siloed State inside Composables)
在 `useCombatState.ts`，`useStatusEffects.ts` 和 `useCharacterData.ts` 等组合式函数中，状态变量（例如 `const combat = ref(...)`）都直接声明在函数作用域内部。
**危害：** 这导致不同的组件调用该函数时，都生成了一份隔离的拷贝状态。由于非单例化设计，各个面板的数据无法得到同步。

### 1.2 上下文脱节与覆盖 (Provide/Inject Disconnect)
在 `MainLayout.vue` 中，已使用 `provide('aidmCombat', combat)` 进行状态分发。
- **好的方面：** 例如 `SavePanel.vue` 这类读取型面板合理地使用了 `inject` 来同步数据。
- **坏的方面：** 负责数据更改的面板（如 `DicePanel.vue`）并未读取 Inject 值，反而重新调用了 `const { combat } = useCombatState()`，生成了全新的独立对象。
**危害：** 这会造成“幽灵更新”的情况，`DicePanel` 更新的战斗状态永远无法流向 `SavePanel` 供序列化持久保存。

### 1.3 状态随组件卸载丢弃
在面板切换结构中中嵌套使用了大量的 `v-if/v-else-if` ，但未使用 `<KeepAlive>` 处理组件缓存。
**危害：** 当用户从工作面板（如掷骰面板）切换到其它选项卡面板时，原组件因卸载被垃圾回收，期间所有基于组合式函数内联创建的非持久化状态将遭遇清空、重新归零的影响。

---

## 2. 性能瓶颈 (Performance Bottlenecks)

### 2.1 全局时钟无差别轮询 (Aggressive Polling)
项目核心（如 `MainLayout.vue`）中存在高频、无差别的心跳轮询设计，如 `setInterval(loadTables, 3000)`。
每 3 秒应用去重新读取庞大的全量表格数据。
**建议改进：** 当跑团数据规模变大后极易吃满 JS 主线程导致界面响应卡顿并出现性能灾难，强烈建议重构为基于事件总线或数据代理的发布订阅模式（Event-driven update）。

### 2.2 频繁的组件挂载与销毁
同样由于缺少 `<KeepAlive>` 或 `v-show` 机制，核心界面的每一次选项卡点切都伴随着严重的页面碎片挂载（Component Thrashing），引发非必须要的回流或重绘。

---

## 3. 无障碍访问合规性漏洞 (Accessibility / A11y Violations)

项目文档（`ui/docs/ACCESSIBILITY_GUIDE.md` 等）非常规范严格，要求妥善实现键盘制导和 `aria` 支持。
**问题：** 代码层未落实。
在整个 `ui/src/components/*` 组件实现中，几乎找不到任何 `aria-*` 的实施细则。大量的交互触发按钮其实仅是加上 `@click` 的常规 `<div>`。仅在 `OpposedCheckPanel.vue` 找到了孤立的 `tabindex="0"` 和 `role="button"` 标签应用。
这导致整体系统几乎为“无障碍空白区”，无法为屏幕阅读工具和全键盘流操作提供支持。

---

## 4. 强耦合与环境探测反模式

当前代码高度融合宿主环境进行功能渗透。
### 4.1 直接对齐第三方 DOM 并突破沙盒
利用极端且破坏力较强的 DOM 接口干涉和劫持。如在 `MainLayout.vue` 频繁探寻 `win.jQuery` ，甚至通过原生 `HTMLTextAreaElement.prototype.value.set.call()` 的注入破坏第三方 (如 SillyTavern) 的事件流转。
**建议：** 应封装规范可靠的 Bridge/RPC Adapter 与宿主系统进行抽象交互，而非绑定到会脆弱失效的具体实现 DOM 上。

### 4.2 跨域粗暴探测
存在依靠 `while(win.parent !== win)` 产生跨域访问时故意促发并 `catch` 异常的情况来进行环境监测，这种方式极为不雅。

---

## 5. 代码组织建议汇总

1. **全面引入 Pinia：** 替换所有分散且引起问题多次实例化的 `useXXX` 函数，确保战斗状态、角色数据能够单例化和持久化响应。
2. **状态保全设计：** 在高频切换的选项卡加入 `<KeepAlive>` 以保持输入和勾选状态不丢。
3. **消除神级组件（God Component）：** 抽离冗长的展现逻辑和转换代码。
4. **提升 A11y 实效：** 检查全局的互动区块，补齐相关的 `<button type="button">` 或赋予正确的 `role/tabindex` 响应标签。
