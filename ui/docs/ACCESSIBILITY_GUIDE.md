# 可访问性 (A11y) 完整指南

## 📋 概述

本文档提供了完整的可访问性实施指南，确保应用符合 WCAG 2.1 AA 标准，并为所有用户提供优秀的使用体验。

---

## 🎯 WCAG 2.1 AA 核心原则

### 1. 可感知 (Perceivable)
- 所有非文本内容都有替代文本
- 媒体内容有字幕和音频描述
- 内容可以用不同方式呈现
- 易于区分视觉和听觉内容

### 2. 可操作 (Operable)
- 所有功能可通过键盘访问
- 用户有足够时间阅读和使用内容
- 不使用可能导致癫痫发作的内容
- 提供导航和定位帮助

### 3. 可理解 (Understandable)
- 文本可读且可理解
- 页面可预测操作
- 帮助用户避免和纠正错误

### 4. 健壮 (Robust)
- 兼容各种辅助技术
- 使用标准标记语言

---

## 🏷️ ARIA 支持实施

### 屏幕阅读器专用内容

```html
<!-- 仅屏幕阅读器可见 -->
<h2 class="acu-sr-only">导航菜单</h2>

<!-- 获得焦点时可见 -->
<a href="#main" class="acu-sr-only-focusable">跳转到主要内容</a>
```

### 跳转链接

```html
<!-- 页面顶部的跳转链接 -->
<a href="#main-content" class="acu-skip-link">
  跳转到主要内容
</a>

<!-- 主内容区域 -->
<main id="main-content">
  <!-- 内容 -->
</main>
```

### 按钮和链接

```html
<!-- 按钮 -->
<button 
  class="acu-btn"
  type="button"
  aria-label="保存更改"
  aria-pressed="false">
  <i class="icon-save"></i>
</button>

<!-- 链接 -->
<a 
  href="/help"
  aria-label="帮助文档 (在新窗口打开)"
  target="_blank">
  帮助
</a>
```

### 导航菜单

```html
<nav role="navigation" aria-label="主导航">
  <ul role="menubar">
    <li role="none">
      <a role="menuitem" href="/" aria-current="page">首页</a>
    </li>
    <li role="none">
      <a role="menuitem" href="/about">关于</a>
    </li>
    <li role="none">
      <button 
        role="menuitem"
        aria-haspopup="true"
        aria-expanded="false">
        服务
      </button>
      <ul role="menu" aria-label="服务子菜单">
        <li role="none">
          <a role="menuitem" href="/services/design">设计</a>
        </li>
      </ul>
    </li>
  </ul>
</nav>
```

### 标签页

```html
<div class="tabs">
  <div role="tablist" aria-label="设置选项">
    <button 
      role="tab"
      aria-selected="true"
      aria-controls="panel-general"
      id="tab-general">
      常规
    </button>
    <button 
      role="tab"
      aria-selected="false"
      aria-controls="panel-security"
      id="tab-security"
      tabindex="-1">
      安全
    </button>
  </div>
  
  <div 
    role="tabpanel"
    id="panel-general"
    aria-labelledby="tab-general">
    <h2>常规设置</h2>
    <!-- 内容 -->
  </div>
  
  <div 
    role="tabpanel"
    id="panel-security"
    aria-labelledby="tab-security"
    hidden>
    <h2>安全设置</h2>
    <!-- 内容 -->
  </div>
</div>
```

### 对话框

```html
<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description">
  <h2 id="dialog-title">确认删除</h2>
  <p id="dialog-description">您确定要删除此项目吗？此操作无法撤销。</p>
  <button class="acu-btn acu-btn-danger">删除</button>
  <button class="acu-btn">取消</button>
</div>
```

### 表单字段

```html
<div class="acu-form-item">
  <!-- 标签 -->
  <label for="username" class="acu-form-label required">
    用户名
  </label>
  
  <!-- 输入框 -->
  <input 
    type="text"
    id="username"
    name="username"
    class="acu-input"
    aria-required="true"
    aria-invalid="false"
    aria-describedby="username-help username-error">
  
  <!-- 帮助文本 -->
  <span id="username-help" class="acu-form-help">
    用户名长度为4-20个字符
  </span>
  
  <!-- 错误信息 -->
  <span id="username-error" class="acu-form-error" role="alert" hidden>
    用户名不能为空
  </span>
</div>
```

### 进度条

```html
<div 
  role="progressbar"
  aria-valuenow="75"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="上传进度">
  <div class="progress-bar-fill" style="width: 75%"></div>
</div>
```

### 状态消息

```html
<!-- 信息消息 -->
<div role="status" aria-live="polite">
  正在保存您的更改...
</div>

<!-- 警报消息 -->
<div role="alert" aria-live="assertive">
  网络连接已断开
</div>
```

---

## ⌨️ 焦点管理

### 焦点陷阱

```html
<!-- 模态框焦点陷阱 -->
<div 
  class="acu-focus-trap active"
  role="dialog"
  aria-modal="true">
  <!-- 焦点会被限制在此容器内 -->
  <button class="acu-btn">确定</button>
  <button class="acu-btn">取消</button>
</div>
```

### 焦点环样式

```html
<!-- 主色调焦点环 -->
<button class="acu-btn acu-focus-ring-primary">
  按钮
</button>

<!-- 成功焦点环 -->
<button class="acu-btn acu-focus-ring-success">
  成功
</button>

<!-- 仅键盘导航时显示焦点环 -->
<button class="acu-btn acu-focus-visible-only">
  按钮
</button>
```

### 键盘导航

```html
<!-- 可键盘导航的项目 -->
<div class="acu-keyboard-nav" tabindex="0">
  可聚焦的项目
</div>

<!-- 跳过导航 -->
<a href="#main" class="acu-skip-to-content">
  跳转到主要内容
</a>
```

### 键盘快捷键

```html
<!-- 带快捷键指示器的按钮 -->
<button class="acu-btn">
  保存
  <span class="acu-keyboard-shortcut">Ctrl+S</span>
</button>
```

---

## 🎨 对比度合规

### 文本对比度

```html
<!-- 高对比度文本 (主要文本) -->
<p class="acu-text-high-contrast">
  这是主要文本，对比度 > 7:1
</p>

<!-- 中等对比度文本 (次要文本) -->
<p class="acu-text-medium-contrast">
  这是次要文本，对比度 > 4.5:1
</p>

<!-- 低对比度文本 (辅助文本) -->
<span class="acu-text-low-contrast">
  辅助信息，对比度 > 4.5:1
</span>
```

### 语义化色彩对比度

```html
<!-- 成功色 - 符合AA标准 -->
<div class="acu-bg-success-compliant">
  操作成功完成
</div>

<!-- 警告色 - 符合AA标准 -->
<div class="acu-bg-warning-compliant">
  请注意检查
</div>

<!-- 错误色 - 符合AA标准 -->
<div class="acu-bg-error-compliant">
  操作失败
</div>

<!-- 信息色 - 符合AA标准 -->
<div class="acu-bg-info-compliant">
  提示信息
</div>
```

### 链接对比度

```html
<!-- 高对比度链接 -->
<a href="#" class="acu-link-high-contrast">
  了解更多
</a>
```

### 占位符对比度

```html
<!-- 符合AA标准的占位符 -->
<input 
  type="text"
  class="acu-input acu-placeholder-compliant"
  placeholder="请输入内容">
```

---

## 🎬 运动偏好支持

### 检测用户偏好

```html
<!-- 仅在允许动画时显示 -->
<div class="acu-motion-ok">
  <div class="acu-loading-spinner"></div>
</div>

<!-- 仅在减少动画时显示 -->
<div class="acu-motion-reduce">
  <span>加载中...</span>
</div>
```

### 动画控制

```html
<!-- 无动画 -->
<div class="acu-no-animation">
  无动画内容
</div>

<!-- 减少动画 -->
<div class="acu-reduced-animation">
  减少动画内容
</div>

<!-- 正常动画 -->
<div class="acu-normal-animation">
  正常动画内容
</div>
```

### 常用动画

```html
<!-- 淡入 -->
<div class="acu-fade-in">淡入内容</div>

<!-- 滑入 -->
<div class="acu-slide-in">滑入内容</div>

<!-- 缩放 -->
<div class="acu-scale-in">缩放内容</div>

<!-- 旋转 -->
<div class="acu-spin">旋转内容</div>

<!-- 脉冲 -->
<div class="acu-pulse">脉冲内容</div>
```

### 悬停效果

```html
<!-- 悬停提升 -->
<div class="acu-hover-lift">
  悬停时会向上浮动
</div>

<!-- 悬停缩放 -->
<div class="acu-hover-scale">
  悬停时会缩放
</div>

<!-- 悬停发光 -->
<div class="acu-hover-glow">
  悬停时会发光
</div>
```

### 加载动画

```html
<!-- 加载旋转器 -->
<div class="acu-loading-spinner"></div>

<!-- 加载点 -->
<div class="acu-loading-dots">
  <span></span>
  <span></span>
  <span></span>
</div>

<!-- 骨架屏 -->
<div class="acu-skeleton" style="width: 200px; height: 20px;"></div>
```

---

## ✅ 可访问性检查清单

### 页面结构
- [ ] 页面有唯一的 `<h1>` 标题
- [ ] 标题层级正确 (h1 → h2 → h3)
- [ ] 使用语义化HTML标签
- [ ] 提供跳转链接

### 键盘导航
- [ ] 所有交互元素可通过Tab键访问
- [ ] Tab顺序符合逻辑
- [ ] 焦点状态清晰可见
- [ ] 提供跳过导航的方法

### 表单
- [ ] 所有字段都有标签
- [ ] 必填字段有标记
- [ ] 错误信息清晰明确
- [ ] 表单可通过键盘完成

### 图像和媒体
- [ ] 所有图像有alt文本
- [ ] 装饰性图像使用空alt
- [ ] 视频有字幕
- [ ] 音频有文字稿

### 颜色和对比度
- [ ] 文本对比度 ≥ 4.5:1
- [ ] 大文本对比度 ≥ 3:1
- [ ] 不仅依赖颜色传达信息
- [ ] 链接与周围文本有区分

### 动画和运动
- [ ] 尊重用户的动画偏好
- [ ] 提供暂停动画的方法
- [ ] 闪烁内容频率 < 3Hz
- [ ] 动画不影响内容理解

### ARIA
- [ ] 正确使用ARIA角色
- [ ] ARIA标签清晰明确
- [ ] 状态变化有通知
- [ ] 动态内容有实时区域

---

## 🛠️ 测试工具

### 自动化测试工具
1. **axe DevTools** - 浏览器扩展
2. **WAVE** - 浏览器扩展
3. **Lighthouse** - Chrome内置
4. **Pa11y** - 命令行工具

### 屏幕阅读器测试
1. **NVDA** (Windows) - 免费
2. **JAWS** (Windows) - 商业
3. **VoiceOver** (macOS/iOS) - 内置
4. **TalkBack** (Android) - 内置

### 键盘测试
1. 关闭鼠标
2. 仅使用Tab、Shift+Tab、Enter、Space、Arrow键
3. 确保所有功能可访问
4. 检查焦点顺序

### 对比度测试
1. **WebAIM Contrast Checker**
2. **Colour Contrast Analyser**
3. **Contrast Ratio**

---

## 📚 最佳实践

### 1. 语义化HTML优先
```html
<!-- ✅ 好的做法 -->
<button class="acu-btn">提交</button>

<!-- ❌ 避免的做法 -->
<div class="acu-btn" onclick="submit()">提交</div>
```

### 2. 提供清晰的焦点指示
```html
<!-- ✅ 好的做法 -->
<button class="acu-btn acu-focus-visible-only">
  按钮
</button>
```

### 3. 使用适当的ARIA
```html
<!-- ✅ 好的做法 -->
<button aria-label="关闭对话框" aria-pressed="false">
  <i class="icon-close"></i>
</button>
```

### 4. 确保对比度合规
```html
<!-- ✅ 好的做法 -->
<p class="acu-text-high-contrast">
  高对比度文本
</p>
```

### 5. 尊重运动偏好
```html
<!-- ✅ 好的做法 -->
<div class="acu-fade-in">
  动画内容
</div>
```

---

## 📖 参考资源

- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA 作者实践指南](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM 资源中心](https://webaim.org/resources/)
- [MDN 可访问性指南](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility)

---

**最后更新**: 2026-04-03  
**维护者**: UI/UX Design Team
