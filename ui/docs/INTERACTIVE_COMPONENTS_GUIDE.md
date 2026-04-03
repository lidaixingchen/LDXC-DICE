# 交互组件使用指南

## 📋 概述

本文档提供了所有交互组件的使用示例和最佳实践，包括按钮、表单输入和导航系统。

---

## 🎯 按钮系统

### 基础按钮

```html
<!-- 默认按钮 -->
<button class="acu-btn">默认按钮</button>

<!-- 主要按钮 -->
<button class="acu-btn acu-btn-primary">主要按钮</button>

<!-- 次要按钮 -->
<button class="acu-btn acu-btn-secondary">次要按钮</button>
```

### 按钮尺寸

```html
<!-- 小按钮 -->
<button class="acu-btn acu-btn-sm">小按钮</button>

<!-- 中等按钮 -->
<button class="acu-btn acu-btn-md">中等按钮</button>

<!-- 大按钮 -->
<button class="acu-btn acu-btn-lg">大按钮</button>

<!-- 超大按钮 -->
<button class="acu-btn acu-btn-xl">超大按钮</button>
```

### 按钮颜色变体

```html
<!-- 成功按钮 -->
<button class="acu-btn acu-btn-success">成功</button>

<!-- 警告按钮 -->
<button class="acu-btn acu-btn-warning">警告</button>

<!-- 危险按钮 -->
<button class="acu-btn acu-btn-danger">危险</button>
```

### 按钮样式变体

```html
<!-- 轮廓按钮 -->
<button class="acu-btn acu-btn-outline">轮廓按钮</button>

<!-- 幽灵按钮 -->
<button class="acu-btn acu-btn-ghost">幽灵按钮</button>

<!-- 链接按钮 -->
<button class="acu-btn acu-btn-link">链接按钮</button>
```

### 按钮形状变体

```html
<!-- 圆角按钮 -->
<button class="acu-btn acu-btn-rounded">圆角按钮</button>

<!-- 圆形按钮 -->
<button class="acu-btn acu-btn-circle">
  <i class="icon-plus"></i>
</button>
```

### 加载状态

```html
<!-- 加载中按钮 -->
<button class="acu-btn acu-btn-primary acu-btn-loading">
  加载中...
</button>
```

### 带图标的按钮

```html
<!-- 左侧图标 -->
<button class="acu-btn acu-btn-with-icon">
  <i class="icon-left icon-download"></i>
  <span>下载</span>
</button>

<!-- 右侧图标 -->
<button class="acu-btn acu-btn-with-icon">
  <span>继续</span>
  <i class="icon-right icon-arrow-right"></i>
</button>
```

### 带徽章的按钮

```html
<!-- 通知按钮 -->
<button class="acu-btn acu-btn-badge">
  <i class="icon-bell"></i>
  <span class="badge">3</span>
</button>

<!-- 消息按钮 -->
<button class="acu-btn acu-btn-badge">
  <i class="icon-envelope"></i>
  <span class="badge badge-success">新</span>
</button>
```

### 按钮组

```html
<div class="acu-btn-group">
  <button class="acu-btn">左</button>
  <button class="acu-btn">中</button>
  <button class="acu-btn">右</button>
</div>
```

### 禁用状态

```html
<button class="acu-btn" disabled>禁用按钮</button>
```

---

## 📝 表单输入系统

### 基础输入框

```html
<input type="text" class="acu-input" placeholder="请输入内容">
```

### 输入框尺寸

```html
<!-- 小输入框 -->
<input type="text" class="acu-input acu-input-sm" placeholder="小输入框">

<!-- 中等输入框 -->
<input type="text" class="acu-input acu-input-md" placeholder="中等输入框">

<!-- 大输入框 -->
<input type="text" class="acu-input acu-input-lg" placeholder="大输入框">
```

### 输入框状态

```html
<!-- 成功状态 -->
<input type="text" class="acu-input acu-input-success" value="验证成功">

<!-- 错误状态 -->
<input type="text" class="acu-input acu-input-danger" value="验证失败">

<!-- 警告状态 -->
<input type="text" class="acu-input acu-input-warning" value="请注意">
```

### 输入框样式变体

```html
<!-- 轮廓输入框 -->
<input type="text" class="acu-input acu-input-outline" placeholder="轮廓输入框">

<!-- 填充输入框 -->
<input type="text" class="acu-input acu-input-filled" placeholder="填充输入框">

<!-- 下划线输入框 -->
<input type="text" class="acu-input acu-input-underline" placeholder="下划线输入框">
```

### 完整表单项

```html
<div class="acu-form-item">
  <!-- 标签 -->
  <label class="acu-form-label required">用户名</label>
  
  <!-- 输入框包装器 -->
  <div class="acu-input-wrapper has-icon-left">
    <i class="input-icon-left icon-user"></i>
    <input type="text" class="acu-input" placeholder="请输入用户名">
    <i class="acu-input-validation-icon icon-success icon-check"></i>
  </div>
  
  <!-- 帮助文本 -->
  <div class="acu-form-help">
    <i class="icon-info-circle"></i>
    <span>用户名长度为4-20个字符</span>
  </div>
  
  <!-- 错误信息 -->
  <div class="acu-form-error">
    <i class="icon-exclamation-circle"></i>
    <span>用户名不能为空</span>
  </div>
</div>
```

### 带清除按钮的输入框

```html
<div class="acu-input-wrapper">
  <input type="text" class="acu-input" placeholder="可清除的输入框">
  <button class="acu-input-clear">×</button>
</div>
```

### 输入框组

```html
<div class="acu-input-group">
  <span class="acu-input-group-addon">https://</span>
  <input type="text" class="acu-input" placeholder="请输入网址">
</div>
```

### 文本域

```html
<textarea class="acu-input acu-textarea" placeholder="请输入内容"></textarea>
```

### 选择框

```html
<select class="acu-input acu-select">
  <option value="">请选择</option>
  <option value="1">选项一</option>
  <option value="2">选项二</option>
  <option value="3">选项三</option>
</select>
```

---

## 🧭 导航系统

### 基础导航

```html
<div class="acu-nav-container">
  <button class="acu-nav-btn active">
    <i class="acu-nav-icon icon-home"></i>
    <span>首页</span>
  </button>
  
  <button class="acu-nav-btn">
    <i class="acu-nav-icon icon-user"></i>
    <span>个人中心</span>
  </button>
  
  <button class="acu-nav-btn">
    <i class="acu-nav-icon icon-cog"></i>
    <span>设置</span>
  </button>
</div>
```

### 带徽章的导航

```html
<div class="acu-nav-container">
  <button class="acu-nav-btn">
    <i class="acu-nav-icon icon-envelope"></i>
    <span>消息</span>
    <span class="acu-nav-badge">5</span>
  </button>
  
  <button class="acu-nav-btn">
    <i class="acu-nav-icon icon-bell"></i>
    <span>通知</span>
    <span class="acu-nav-badge badge-warning">新</span>
  </button>
  
  <button class="acu-nav-btn">
    <i class="acu-nav-icon icon-heart"></i>
    <span>收藏</span>
    <span class="acu-nav-badge badge-dot"></span>
  </button>
</div>
```

### 导航分组

```html
<div class="acu-nav-container">
  <!-- 第一组 -->
  <div class="acu-nav-group">
    <div class="acu-nav-group-title">主要功能</div>
    <button class="acu-nav-btn active">
      <i class="acu-nav-icon icon-home"></i>
      <span>首页</span>
    </button>
    <button class="acu-nav-btn">
      <i class="acu-nav-icon icon-chart"></i>
      <span>数据</span>
    </button>
  </div>
  
  <!-- 分隔符 -->
  <div class="acu-nav-divider"></div>
  
  <!-- 第二组 -->
  <div class="acu-nav-group">
    <div class="acu-nav-group-title">其他</div>
    <button class="acu-nav-btn">
      <i class="acu-nav-icon icon-cog"></i>
      <span>设置</span>
    </button>
  </div>
</div>
```

### 活动状态

```html
<!-- 使用 active 类 -->
<button class="acu-nav-btn active">活动项</button>

<!-- 使用 aria-current 属性 -->
<button class="acu-nav-btn" aria-current="page">当前页</button>

<!-- 使用 router-link-active 类 (Vue Router) -->
<router-link class="acu-nav-btn" to="/home">首页</router-link>
```

---

## ✨ 最佳实践

### 1. 可访问性

```html
<!-- ✅ 好的做法：提供清晰的焦点状态 -->
<button class="acu-btn">按钮</button>

<!-- ✅ 好的做法：为图标按钮提供 aria-label -->
<button class="acu-btn acu-btn-circle" aria-label="添加">
  <i class="icon-plus"></i>
</button>

<!-- ✅ 好的做法：为必填字段提供标记 -->
<label class="acu-form-label required">用户名</label>
```

### 2. 状态反馈

```html
<!-- ✅ 好的做法：提供加载状态 -->
<button class="acu-btn acu-btn-loading">提交中...</button>

<!-- ✅ 好的做法：提供验证反馈 -->
<div class="acu-form-item">
  <input type="text" class="acu-input acu-input-success">
  <div class="acu-form-success">
    <i class="icon-check-circle"></i>
    <span>验证通过</span>
  </div>
</div>
```

### 3. 响应式设计

```html
<!-- ✅ 好的做法：使用响应式导航 -->
<div class="acu-nav-container">
  <!-- 在移动端会自动调整为垂直布局 -->
  <button class="acu-nav-btn">
    <i class="acu-nav-icon icon-home"></i>
    <span>首页</span>
  </button>
</div>
```

### 4. 徽章使用

```html
<!-- ✅ 好的做法：使用语义化徽章颜色 -->
<span class="acu-nav-badge">3</span>              <!-- 错误/重要 -->
<span class="acu-nav-badge badge-success">新</span>  <!-- 成功/新内容 -->
<span class="acu-nav-badge badge-warning">!</span>   <!-- 警告 -->
<span class="acu-nav-badge badge-info">?</span>      <!-- 信息 -->
<span class="acu-nav-badge badge-dot"></span>        <!-- 简单指示 -->
```

---

## 🎨 设计令牌参考

### 颜色

```scss
/* 语义化颜色 */
--acu-color-success: #10b981;
--acu-color-warning: #f59e0b;
--acu-color-error: #ef4444;
--acu-color-info: #3b82f6;

/* 中性色 */
--acu-gray-50: #f9fafb;
--acu-gray-900: #111827;
```

### 间距

```scss
--acu-space-xs: 4px;
--acu-space-sm: 8px;
--acu-space-md: 12px;
--acu-space-lg: 16px;
--acu-space-xl: 20px;
```

### 圆角

```scss
--acu-radius-sm: 4px;
--acu-radius-md: 6px;
--acu-radius-lg: 8px;
--acu-radius-full: 9999px;
```

### 过渡

```scss
--acu-transition-fast: 0.15s;
--acu-transition-normal: 0.3s;
--acu-ease-cubic: cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 📚 相关文档

- [WCAG对比度合规性验证指南](./WCAG_CONTRAST_GUIDE.md)
- [设计令牌参考](../src/styles/base/_tokens.scss)
- [按钮组件源码](../src/styles/components/_buttons.scss)
- [输入框组件源码](../src/styles/components/_inputs.scss)
- [导航组件源码](../src/styles/layout/_navigation.scss)

---

**最后更新**: 2026-04-03  
**维护者**: UI/UX Design Team
