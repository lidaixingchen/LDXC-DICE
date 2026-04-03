# 响应式设计完整指南

## 📋 概述

本文档提供了完整的响应式设计实施指南，包括断点系统、移动优化和触摸交互优化，确保应用在所有设备上都能提供优秀的用户体验。

---

## 📱 断点系统

### 断点定义

| 断点名称 | 最小宽度 | 最大宽度 | 设备类型 |
|---------|---------|---------|---------|
| `xs` | 0px | 479px | 手机竖屏 |
| `sm` | 480px | 767px | 手机横屏 |
| `md` | 768px | 1023px | 平板竖屏 |
| `lg` | 1024px | 1279px | 平板横屏/小型笔记本 |
| `xl` | 1280px | 1535px | 桌面 |
| `2xl` | 1536px | - | 大型桌面 |

### CSS变量

```scss
:root {
  --acu-breakpoint-xs: 0;
  --acu-breakpoint-sm: 480px;
  --acu-breakpoint-md: 768px;
  --acu-breakpoint-lg: 1024px;
  --acu-breakpoint-xl: 1280px;
  --acu-breakpoint-2xl: 1536px;
}
```

### 媒体查询使用

#### SCSS Mixin

```scss
/* 超小屏幕 (< 480px) */
@include acu-media-xs {
  /* 样式 */
}

/* 小屏幕及以上 (≥ 480px) */
@include acu-media-sm-up {
  /* 样式 */
}

/* 中等屏幕及以上 (≥ 768px) */
@include acu-media-md-up {
  /* 样式 */
}

/* 大屏幕及以上 (≥ 1024px) */
@include acu-media-lg-up {
  /* 样式 */
}
```

#### CSS媒体查询

```css
/* 超小屏幕 (< 480px) */
@media (max-width: 479px) {
  /* 样式 */
}

/* 小屏幕及以上 (≥ 480px) */
@media (min-width: 480px) {
  /* 样式 */
}

/* 中等屏幕及以上 (≥ 768px) */
@media (min-width: 768px) {
  /* 样式 */
}
```

---

## 🎯 响应式布局

### 容器

```html
<!-- 响应式容器 -->
<div class="acu-container">
  内容会根据屏幕大小自动调整最大宽度
</div>

<!-- 流式容器 -->
<div class="acu-container-fluid">
  始终100%宽度
</div>
```

### 网格系统

```html
<!-- 自动响应式网格 -->
<div class="acu-grid acu-grid-auto">
  <div>项目1</div>
  <div>项目2</div>
  <div>项目3</div>
</div>

<!-- 2列网格 -->
<div class="acu-grid acu-grid-2">
  <div>项目1</div>
  <div>项目2</div>
</div>

<!-- 3列网格 -->
<div class="acu-grid acu-grid-3">
  <div>项目1</div>
  <div>项目2</div>
  <div>项目3</div>
</div>

<!-- 4列网格 -->
<div class="acu-grid acu-grid-4">
  <div>项目1</div>
  <div>项目2</div>
  <div>项目3</div>
  <div>项目4</div>
</div>
```

### 响应式布局方向

```html
<!-- 移动端垂直，桌面端水平 -->
<div class="acu-layout-responsive">
  <div>左侧内容</div>
  <div>右侧内容</div>
</div>
```

### 响应式侧边栏

```html
<div class="acu-sidebar-layout">
  <aside>侧边栏</aside>
  <main>主内容</main>
</div>
```

---

## 📱 移动端优化

### 触摸目标尺寸

移动端所有可交互元素的最小触摸目标为 **44x44px** (Apple HIG标准)。

```html
<!-- 移动端按钮会自动增大到44px -->
<button class="acu-btn">按钮</button>

<!-- 图标按钮 -->
<button class="acu-btn acu-btn-icon">
  <i class="icon-plus"></i>
</button>
```

### 移动端布局

```html
<!-- 移动端堆叠布局 -->
<div class="acu-stack-mobile">
  <div>项目1</div>
  <div>项目2</div>
</div>

<!-- 移动端全宽 -->
<div class="acu-full-width-mobile">
  内容
</div>

<!-- 移动端居中 -->
<div class="acu-center-mobile">
  居中内容
</div>
```

### 移动端表单

```html
<!-- 移动端表单优化 -->
<form class="acu-form-mobile">
  <div class="acu-form-item-mobile">
    <label>用户名</label>
    <input type="text" class="acu-input-mobile">
  </div>
  
  <div class="acu-form-item-mobile">
    <label>密码</label>
    <input type="password" class="acu-input-mobile">
  </div>
  
  <!-- 移动端按钮全宽 -->
  <button class="acu-btn acu-btn-block-mobile">登录</button>
</form>
```

### 移动端导航

```html
<!-- 底部导航 -->
<nav class="acu-nav-bottom-mobile">
  <button class="acu-nav-btn">
    <i class="icon-home"></i>
    <span>首页</span>
  </button>
  
  <button class="acu-nav-btn">
    <i class="icon-user"></i>
    <span>我的</span>
  </button>
</nav>

<!-- 汉堡菜单 -->
<button class="acu-hamburger-mobile">
  <span></span>
  <span></span>
  <span></span>
</button>
```

### 移动端模态框

```html
<!-- 全屏模态框 -->
<div class="acu-modal-fullscreen-mobile">
  内容
</div>

<!-- 底部弹出 -->
<div class="acu-modal-bottom-mobile">
  内容
</div>

<!-- 动作面板 -->
<div class="acu-action-sheet-mobile">
  <button class="acu-action-item">拍照</button>
  <button class="acu-action-item">从相册选择</button>
  <button class="acu-action-item">取消</button>
</div>
```

---

## 👆 触摸优化

### 触摸目标优化

```html
<!-- 扩大触摸区域 -->
<button class="acu-touch-area">
  小图标
</button>

<!-- 最小触摸目标 -->
<button class="acu-touch-target">
  按钮
</button>
```

### 触摸反馈

```html
<!-- 触摸涟漪效果 -->
<button class="acu-touch-ripple">
  点击我
</button>

<!-- 触摸高亮 -->
<button class="acu-touch-highlight">
  点击我
</button>

<!-- 禁用触摸高亮 -->
<button class="acu-no-touch-highlight">
  点击我
</button>
```

### 触摸滚动

```html
<!-- 平滑滚动 -->
<div class="acu-smooth-scroll">
  长内容
</div>

<!-- 触摸滑动容器 -->
<div class="acu-touch-scroll">
  <div>项目1</div>
  <div>项目2</div>
  <div>项目3</div>
</div>
```

### 触摸手势

```html
<!-- 可拖动元素 -->
<div class="acu-touch-draggable">
  拖动我
</div>

<!-- 滑动删除 -->
<div class="acu-touch-swipe-delete">
  <div class="acu-swipe-content">
    滑动删除
  </div>
  <div class="acu-swipe-actions">
    <button class="acu-swipe-action acu-swipe-delete">删除</button>
  </div>
</div>
```

### 触摸设备特定样式

```html
<!-- 仅触摸设备显示 -->
<div class="acu-visible-touch">
  仅触摸设备可见
</div>

<!-- 仅鼠标设备显示 -->
<div class="acu-visible-mouse">
  仅鼠标设备可见
</div>

<!-- 触摸设备隐藏 -->
<div class="acu-hidden-touch">
  触摸设备隐藏
</div>

<!-- 鼠标设备隐藏 -->
<div class="acu-hidden-mouse">
  鼠标设备隐藏
</div>
```

---

## 🎨 响应式组件

### 响应式卡片网格

```html
<div class="acu-card-grid">
  <div class="acu-card">卡片1</div>
  <div class="acu-card">卡片2</div>
  <div class="acu-card">卡片3</div>
  <div class="acu-card">卡片4</div>
</div>
```

**效果**:
- 移动端 (< 480px): 1列
- 小屏幕 (480px - 767px): 2列
- 中等屏幕 (768px - 1279px): 3列
- 大屏幕 (≥ 1280px): 4列

### 响应式表格

```html
<!-- 横向滚动表格 -->
<div class="acu-table-responsive">
  <table>
    <thead>
      <tr>
        <th>姓名</th>
        <th>年龄</th>
        <th>城市</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>张三</td>
        <td>25</td>
        <td>北京</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- 移动端卡片化表格 -->
<table class="acu-table-card-mobile">
  <thead>
    <tr>
      <th>姓名</th>
      <th>年龄</th>
      <th>城市</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="姓名">张三</td>
      <td data-label="年龄">25</td>
      <td data-label="城市">北京</td>
    </tr>
  </tbody>
</table>
```

### 响应式图片

```html
<!-- 响应式图片 -->
<img src="image.jpg" class="acu-img-responsive" alt="描述">

<!-- 图片覆盖 -->
<div class="acu-img-cover">
  <img src="image.jpg" alt="描述">
</div>

<!-- 移动端全宽图片 -->
<img src="image.jpg" class="acu-img-full-mobile" alt="描述">
```

### 响应式视频

```html
<!-- 16:9 响应式视频 -->
<div class="acu-video-responsive">
  <iframe src="video.mp4"></iframe>
</div>
```

---

## 🛠️ 响应式工具类

### 显示/隐藏

```html
<!-- 在特定断点隐藏 -->
<div class="acu-hidden-xs">超小屏幕隐藏</div>
<div class="acu-hidden-sm">小屏幕隐藏</div>
<div class="acu-hidden-md">中等屏幕隐藏</div>
<div class="acu-hidden-lg">大屏幕隐藏</div>

<!-- 仅在特定断点显示 -->
<div class="acu-visible-xs">仅超小屏幕显示</div>
<div class="acu-visible-sm">仅小屏幕显示</div>
<div class="acu-visible-md">仅中等屏幕显示</div>

<!-- 设备类型显示 -->
<div class="acu-visible-mobile">仅移动设备显示</div>
<div class="acu-visible-tablet">仅平板显示</div>
<div class="acu-visible-desktop">仅桌面显示</div>
```

### 响应式间距

```html
<!-- 响应式内边距 -->
<div class="acu-responsive-spacing">
  内容
</div>
```

### 响应式字体

```html
<!-- 响应式文本 -->
<p class="acu-text-responsive">
  文本大小会根据屏幕大小调整
</p>

<!-- 响应式标题 -->
<h1 class="acu-heading-responsive">
  标题大小会根据屏幕大小调整
</h1>
```

---

## 📐 iOS安全区域适配

```html
<!-- 顶部安全区域 -->
<header class="acu-safe-area-top">
  导航栏
</header>

<!-- 底部安全区域 -->
<footer class="acu-safe-area-bottom">
  底部栏
</footer>

<!-- 左侧安全区域 -->
<aside class="acu-safe-area-left">
  侧边栏
</aside>

<!-- 右侧安全区域 -->
<aside class="acu-safe-area-right">
  侧边栏
</aside>
```

---

## 🎯 最佳实践

### 1. 移动优先设计

```scss
/* ✅ 好的做法：移动优先 */
.element {
  /* 移动端样式 */
  font-size: 14px;
  
  @media (min-width: 768px) {
    /* 平板及以上 */
    font-size: 16px;
  }
  
  @media (min-width: 1024px) {
    /* 桌面及以上 */
    font-size: 18px;
  }
}
```

### 2. 触摸目标尺寸

```html
<!-- ✅ 好的做法：确保触摸目标足够大 -->
<button class="acu-btn" style="min-height: 44px; min-width: 44px;">
  按钮
</button>

<!-- ❌ 避免的做法：触摸目标太小 -->
<button style="padding: 2px 5px;">
  按钮
</button>
```

### 3. 响应式图片

```html
<!-- ✅ 好的做法：使用响应式图片 -->
<img 
  src="image.jpg" 
  class="acu-img-responsive"
  srcset="image-small.jpg 480w, image-medium.jpg 768w, image-large.jpg 1024w"
  sizes="(max-width: 480px) 100vw, (max-width: 768px) 75vw, 50vw"
  alt="描述">

<!-- ❌ 避免的做法：固定尺寸图片 -->
<img src="image.jpg" width="800" height="600" alt="描述">
```

### 4. 触摸设备优化

```html
<!-- ✅ 好的做法：为触摸设备提供替代交互 -->
<button class="acu-btn acu-touch-ripple">
  <span class="acu-visible-mouse">悬停查看详情</span>
  <span class="acu-visible-touch">点击查看详情</span>
</button>
```

### 5. 性能优化

```html
<!-- ✅ 好的做法：延迟加载图片 -->
<img src="image.jpg" loading="lazy" alt="描述">

<!-- ✅ 好的做法：使用GPU加速 -->
<div class="acu-gpu-accelerate">
  动画元素
</div>
```

---

## 📱 测试清单

### 断点测试
- [ ] 在所有断点测试布局
- [ ] 测试断点边界值
- [ ] 测试横屏和竖屏

### 移动端测试
- [ ] 触摸目标 ≥ 44px
- [ ] 文本可读性
- [ ] 表单输入友好
- [ ] 导航易用性

### 触摸测试
- [ ] 触摸反馈明显
- [ ] 滚动流畅
- [ ] 手势支持
- [ ] 无误触

### 性能测试
- [ ] 加载速度
- [ ] 滚动性能
- [ ] 动画流畅度
- [ ] 内存使用

---

## 🛠️ 测试工具

### 浏览器开发者工具
1. **Chrome DevTools** - 设备模拟器
2. **Firefox Developer Tools** - 响应式设计模式
3. **Safari Web Inspector** - iOS设备调试

### 在线测试工具
1. **BrowserStack** - 多设备测试
2. **Responsively** - 响应式测试工具
3. **ViewPort Resizer** - 视口调整工具

### 性能测试工具
1. **Lighthouse** - 性能审计
2. **WebPageTest** - 性能分析
3. **PageSpeed Insights** - 速度测试

---

## 📚 参考资源

- [MDN 响应式设计](https://developer.mozilla.org/zh-CN/docs/Web/Progressive_web_apps/Responsive/Responsive_design_building_blocks)
- [Google 响应式设计基础](https://web.dev/responsive-web-design-basics/)
- [Apple 人机交互指南](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 响应式布局](https://material.io/design/layout/responsive-layout-grid.html)

---

**最后更新**: 2026-04-03  
**维护者**: UI/UX Design Team
