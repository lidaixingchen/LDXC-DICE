# 骰子系统 (Dice System)

> 本项目是对 [my-tavern-scripts](https://github.com/jerryzmtz/my-tavern-scripts) 中骰子系统的重构版本

## 项目简介

这是一个为 SillyTavern 酒馆助手设计的骰子系统，以 iframe 嵌入宿主环境运行。提供完整的骰子检定、属性管理、效果引擎、地图系统等功能，在保留原有功能的基础上进行了全面的架构重构和代码优化。

## 主要特性

- **骰子检定系统** — 复杂骰子表达式解析、六种检定模式（标准/对抗/战斗/防御/先攻/逃脱）、自定义预设
- **属性管理** — 灵活的属性预设系统、属性值自动计算、派生属性支持
- **效果引擎** — 自动化效果执行、条件触发、效果链
- **地图系统** — 地图渲染与管理、角色位置追踪、交互规则引擎
- **现代化 UI** — Vue 3 Composition API、13+ 主题、响应式设计、设计令牌系统

## 技术栈

TypeScript + Vue 3 + Vite 5 + SCSS + Vitest + pnpm

## 项目结构

```
骰子系统/
├── core/              # 纯逻辑层（骰子掷出、效果引擎、属性管理、验证规则）
├── data/              # 数据持久化层（预设/规则/设置管理器）
├── adapters/          # DatabaseAdapter 接口 + 实现
├── utils/             # 横切关注点（日志、缓存、宿主环境检测）
├── map/               # 地图系统
├── presets/           # 预设管理
├── ui/                # Vue 前端界面
│   └── src/
│       ├── services/      # 服务层（检定计算、战斗计算、host-bridge）
│       ├── composables/   # Vue 组合式函数
│       ├── components/    # Vue 组件（42 个）
│       ├── styles/        # 模块化样式系统（13+ 主题）
│       └── utils/         # 输入框智能填充
└── docs/              # 文档
```

## 安装与使用

### 环境要求

- Node.js >= 18
- pnpm

### 安装依赖

```bash
cd ui
pnpm install
```

### 开发模式

```bash
pnpm dev          # watch 模式，输出 dist/nightly.js
```

### 构建

```bash
pnpm build        # 生产构建，输出 dist/stable.js + JSON 包
```

### 测试

```bash
pnpm test                    # 运行全部测试
pnpm test:watch              # 监听模式
pnpm test -- path/to/test.ts  # 运行单个测试文件
```

### 类型检查

```bash
pnpm typecheck
```

## 架构说明

### 宿主环境交互

项目通过两层抽象与 SillyTavern 宿主交互：

- **`utils/host-environment.ts`** — 跨域窗口解析（带缓存）+ 全局变量访问（AutoCardUpdaterAPI、TavernHelper）
- **`ui/src/services/host-bridge.ts`** — DOM 操作抽象（原生 DOM）、输入框操作、消息发送（三层降级策略）

### 检定模式

六种检定模式各对应一个 composable + service，计算逻辑在 `services/CheckCalculationService.ts`，状态通过模块级单例 ref 共享。

### 样式系统

- 模块化 SCSS 架构，按功能组织（base/layout/modules/components/themes/utilities）
- 70+ 设计令牌，统一设计语言
- 13+ 预设主题，支持主题生成器快速创建新主题

## 与原项目的关系

本项目是对 [my-tavern-scripts](https://github.com/jerryzmtz/my-tavern-scripts) 仓库中骰子系统的重构版本。主要改进：

- 模块化架构（从 7000+ 行单文件重构为清晰的模块结构）
- 全面 TypeScript 类型安全
- 单元测试覆盖
- 宿主环境交互抽象（消除 jQuery 依赖和 DOM 突破）
- 样式系统优化（设计令牌 + 主题生成器）

## 许可证

本项目继承原项目的许可证协议。
