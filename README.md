# 骰子系统 (Dice System)

> 本项目是对 [my-tavern-scripts](https://github.com/jerryzmtz/my-tavern-scripts) 中骰子系统的重构版本

## 项目简介

这是一个为酒馆助手设计的骰子系统，提供了完整的骰子检定、属性管理、效果引擎等功能。本项目在保留原有功能的基础上，进行了全面的架构重构和代码优化。

## 主要特性

- **🎲 骰子检定系统**
  - 支持复杂的骰子表达式解析
  - 多种检定预设支持
  - 自定义结果分支和输出模板

- **📊 属性管理**
  - 灵活的属性预设系统
  - 属性值自动计算
  - 支持派生属性

- **⚡ 效果引擎**
  - 自动化效果执行
  - 支持条件触发
  - 二次效果链

- **🗺️ 地图系统**
  - 地图渲染与管理
  - 角色位置追踪
  - 交互规则引擎

- **🎨 现代化 UI**
  - Vue 3 组件化界面
  - 响应式设计
  - 主题支持

## 技术栈

- **语言**: TypeScript
- **框架**: Vue 3
- **构建工具**: Vite 5
- **样式**: SCSS
- **测试**: Vitest
- **包管理**: pnpm

## 项目结构

```
骰子系统/
├── adapters/          # 数据库适配器
├── core/              # 核心功能模块
│   ├── validation/    # 验证引擎
│   ├── dice-roller.ts # 骰子投掷逻辑
│   ├── effect-engine.ts # 效果引擎
│   └── attribute-manager.ts # 属性管理
├── data/              # 数据管理层
├── map/               # 地图系统
├── presets/           # 预设管理
├── ui/                # Vue 前端界面
│   ├── src/
│   │   ├── components/  # Vue 组件
│   │   ├── composables/ # 组合式函数
│   │   └── styles/      # 样式文件
│   └── tests/         # 测试文件
├── utils/             # 工具函数
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
pnpm dev
```

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

## 与原项目的关系

本项目是对 [my-tavern-scripts](https://github.com/jerryzmtz/my-tavern-scripts) 仓库中骰子系统的重构版本。主要改进包括：

- 📦 **模块化架构**: 将原有代码重构为清晰的模块结构
- 🔧 **类型安全**: 全面使用 TypeScript，提供完整的类型定义
- 🧪 **可测试性**: 添加单元测试，提高代码质量
- 📖 **可维护性**: 改进代码组织和文档
- ⚡ **性能优化**: 优化关键路径的性能

## 许可证

本项目继承原项目的许可证协议。
