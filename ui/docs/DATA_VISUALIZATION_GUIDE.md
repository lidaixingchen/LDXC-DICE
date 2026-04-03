# 数据可视化完整指南

## 📋 概述

本文档提供了完整的数据可视化实施指南，包括表格增强、掷骰结果可视化和统计图表，确保数据展示清晰、直观、易用。

---

## 📊 表格增强

### 基础表格

```html
<table class="acu-table">
  <thead>
    <tr>
      <th>掷骰时间</th>
      <th>公式</th>
      <th>结果</th>
      <th>状态</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2026-04-03 14:30:25</td>
      <td>2d6+3</td>
      <td>12</td>
      <td>
        <span class="acu-table-status acu-status-success">
          <span class="acu-status-icon"></span>
          成功
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

### 可排序表格

```html
<table class="acu-table acu-table-sortable">
  <thead>
    <tr>
      <th class="acu-table-sort acu-sort-asc">
        掷骰时间
        <span class="acu-sort-icon">
          <span class="acu-sort-arrow acu-sort-asc"></span>
          <span class="acu-sort-arrow acu-sort-desc"></span>
        </span>
      </th>
      <th class="acu-table-sort">
        结果
        <span class="acu-sort-icon">
          <span class="acu-sort-arrow acu-sort-asc"></span>
          <span class="acu-sort-arrow acu-sort-desc"></span>
        </span>
      </th>
    </tr>
  </thead>
  <tbody>
    <!-- 表格内容 -->
  </tbody>
</table>
```

### 表格状态指示

```html
<!-- 成功状态 -->
<span class="acu-table-status acu-status-success">
  <span class="acu-status-icon"></span>
  成功
</span>

<!-- 警告状态 -->
<span class="acu-table-status acu-status-warning">
  <span class="acu-status-icon"></span>
  警告
</span>

<!-- 错误状态 -->
<span class="acu-table-status acu-status-error">
  <span class="acu-status-icon"></span>
  失败
</span>

<!-- 信息状态 -->
<span class="acu-table-status acu-status-info">
  <span class="acu-status-icon"></span>
  信息
</span>
```

### 表格行状态

```html
<table class="acu-table">
  <tbody>
    <!-- 成功行 -->
    <tr class="acu-row-success">
      <td>内容</td>
    </tr>
    
    <!-- 警告行 -->
    <tr class="acu-row-warning">
      <td>内容</td>
    </tr>
    
    <!-- 错误行 -->
    <tr class="acu-row-error">
      <td>内容</td>
    </tr>
  </tbody>
</table>
```

### 表格选择

```html
<table class="acu-table">
  <thead>
    <tr>
      <th class="acu-table-select">
        <input type="checkbox" aria-label="全选">
      </th>
      <th>名称</th>
    </tr>
  </thead>
  <tbody>
    <tr class="acu-row-selected">
      <td class="acu-table-select">
        <input type="checkbox" checked>
      </td>
      <td>项目1</td>
    </tr>
  </tbody>
</table>
```

### 表格操作列

```html
<table class="acu-table">
  <tbody>
    <tr>
      <td>内容</td>
      <td>
        <div class="acu-table-actions">
          <button class="acu-table-action-btn" title="编辑">
            ✏️
          </button>
          <button class="acu-table-action-btn acu-action-danger" title="删除">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

### 表格分页

```html
<div class="acu-table-pagination">
  <div class="acu-pagination-info">
    显示 1-10 条，共 50 条
  </div>
  <div class="acu-pagination-controls">
    <button class="acu-pagination-btn" disabled>上一页</button>
    <button class="acu-pagination-btn acu-pagination-active">1</button>
    <button class="acu-pagination-btn">2</button>
    <button class="acu-pagination-btn">3</button>
    <button class="acu-pagination-btn">下一页</button>
  </div>
</div>
```

### 表格加载状态

```html
<div class="acu-table-loading">
  <table class="acu-table">
    <!-- 表格内容 -->
  </table>
  <div class="acu-table-loading-overlay">
    <div class="acu-table-spinner"></div>
  </div>
</div>
```

### 表格空状态

```html
<table class="acu-table">
  <tbody>
    <tr>
      <td colspan="4">
        <div class="acu-table-empty">
          <div class="acu-table-empty-icon">📭</div>
          <div class="acu-table-empty-title">暂无数据</div>
          <div class="acu-table-empty-description">
            还没有任何掷骰记录
          </div>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

### 表格变体

```html
<!-- 紧凑表格 -->
<table class="acu-table acu-table-compact">
  <!-- 表格内容 -->
</table>

<!-- 条纹表格 -->
<table class="acu-table acu-table-striped">
  <!-- 表格内容 -->
</table>

<!-- 边框表格 -->
<table class="acu-table acu-table-bordered">
  <!-- 表格内容 -->
</table>

<!-- 悬停高亮表格 -->
<table class="acu-table acu-table-hover">
  <!-- 表格内容 -->
</table>
```

### 响应式表格

```html
<!-- 横向滚动 -->
<div class="acu-table-responsive">
  <table class="acu-table">
    <!-- 表格内容 -->
  </table>
</div>

<!-- 移动端卡片化 -->
<table class="acu-table acu-table-card-mobile">
  <thead>
    <tr>
      <th>名称</th>
      <th>结果</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="名称">掷骰1</td>
      <td data-label="结果">15</td>
    </tr>
  </tbody>
</table>
```

---

## 🎲 掷骰结果可视化

### 骰子显示

```html
<!-- 基础骰子 -->
<div class="acu-dice acu-dice-1"></div>
<div class="acu-dice acu-dice-2"></div>
<div class="acu-dice acu-dice-3"></div>
<div class="acu-dice acu-dice-4"></div>
<div class="acu-dice acu-dice-5"></div>
<div class="acu-dice acu-dice-6"></div>

<!-- 不同尺寸 -->
<div class="acu-dice acu-dice-sm acu-dice-1"></div>
<div class="acu-dice acu-dice-1"></div>
<div class="acu-dice acu-dice-lg acu-dice-1"></div>
<div class="acu-dice acu-dice-xl acu-dice-1"></div>
```

### 骰子动画

```html
<!-- 滚动动画 -->
<div class="acu-dice acu-dice-rolling acu-dice-6"></div>
```

### 骰子组

```html
<div class="acu-dice-group">
  <div class="acu-dice acu-dice-3"></div>
  <div class="acu-dice acu-dice-5"></div>
  <span class="acu-dice-separator">+</span>
  <div class="acu-dice acu-dice-2"></div>
</div>
```

### 掷骰结果卡片

```html
<div class="acu-dice-result-card">
  <div class="acu-result-header">
    <div class="acu-result-title">掷骰结果</div>
    <div class="acu-result-time">2026-04-03 14:30:25</div>
  </div>
  
  <div class="acu-result-content">
    <div class="acu-result-dice">
      <div class="acu-dice-group">
        <div class="acu-dice acu-dice-3"></div>
        <div class="acu-dice acu-dice-5"></div>
      </div>
    </div>
    
    <div class="acu-result-details">
      <div class="acu-result-formula">
        公式: <code>2d6+3</code>
      </div>
      <div class="acu-result-total">
        <span class="acu-result-label">总计:</span>
        11
      </div>
    </div>
  </div>
  
  <div class="acu-result-tags">
    <span class="acu-result-tag acu-tag-critical">暴击</span>
    <span class="acu-result-tag">优势</span>
  </div>
</div>
```

### 掷骰结果列表

```html
<div class="acu-dice-result-list">
  <div class="acu-result-item">
    <div class="acu-result-index">1</div>
    <div class="acu-result-dice">
      <div class="acu-dice acu-dice-sm acu-dice-4"></div>
    </div>
    <div class="acu-result-formula">1d20+5</div>
    <div class="acu-result-value">18</div>
  </div>
  
  <div class="acu-result-item">
    <div class="acu-result-index">2</div>
    <div class="acu-result-dice">
      <div class="acu-dice acu-dice-sm acu-dice-6"></div>
    </div>
    <div class="acu-result-formula">1d20+5</div>
    <div class="acu-result-value">23</div>
  </div>
</div>
```

### 掷骰结果统计

```html
<div class="acu-dice-stats">
  <div class="acu-stat-card">
    <div class="acu-stat-label">总次数</div>
    <div class="acu-stat-value acu-stat-accent">156</div>
    <div class="acu-stat-subtitle">本周</div>
  </div>
  
  <div class="acu-stat-card">
    <div class="acu-stat-label">平均值</div>
    <div class="acu-stat-value">10.5</div>
    <div class="acu-stat-subtitle">1d20</div>
  </div>
  
  <div class="acu-stat-card">
    <div class="acu-stat-label">最大值</div>
    <div class="acu-stat-value acu-stat-success">20</div>
    <div class="acu-stat-subtitle">暴击!</div>
  </div>
  
  <div class="acu-stat-card">
    <div class="acu-stat-label">最小值</div>
    <div class="acu-stat-value acu-stat-error">1</div>
    <div class="acu-stat-subtitle">失误</div>
  </div>
</div>
```

### 掷骰历史记录

```html
<div class="acu-dice-history">
  <div class="acu-history-header">
    <div class="acu-history-title">掷骰历史</div>
    <div class="acu-history-actions">
      <button class="acu-btn acu-btn-sm">清空</button>
      <button class="acu-btn acu-btn-sm">导出</button>
    </div>
  </div>
  
  <div class="acu-history-list">
    <div class="acu-history-item">
      <div class="acu-history-time">14:30</div>
      <div class="acu-history-formula">2d6+3</div>
      <div class="acu-history-result">11</div>
    </div>
    
    <div class="acu-history-item">
      <div class="acu-history-time">14:28</div>
      <div class="acu-history-formula">1d20+5</div>
      <div class="acu-history-result">18</div>
    </div>
  </div>
</div>
```

### 掷骰结果可视化面板

```html
<div class="acu-dice-panel">
  <div class="acu-panel-header">
    <div class="acu-panel-title">掷骰结果</div>
  </div>
  
  <div class="acu-panel-content">
    <div class="acu-panel-main-result">
      <div class="acu-main-result-dice">
        <div class="acu-dice-group">
          <div class="acu-dice acu-dice-lg acu-dice-5"></div>
          <div class="acu-dice acu-dice-lg acu-dice-3"></div>
        </div>
      </div>
      <div class="acu-main-result-value">15</div>
      <div class="acu-main-result-formula">2d6+5 = 8 + 5</div>
    </div>
    
    <div class="acu-panel-details">
      <!-- 详细统计 -->
    </div>
  </div>
</div>
```

### 掷骰结果对比

```html
<div class="acu-dice-comparison">
  <div class="acu-comparison-side acu-comparison-winner">
    <div class="acu-comparison-label">玩家A</div>
    <div class="acu-comparison-value">18</div>
  </div>
  
  <div class="acu-comparison-vs">VS</div>
  
  <div class="acu-comparison-side acu-comparison-loser">
    <div class="acu-comparison-label">玩家B</div>
    <div class="acu-comparison-value">12</div>
  </div>
</div>
```

---

## 📈 统计图表

### 柱状图

```html
<div class="acu-chart">
  <div class="acu-chart-title">掷骰结果分布</div>
  
  <div class="acu-bar-chart">
    <div class="acu-bar-item">
      <div class="acu-bar" style="height: 20%;">
        <span class="acu-bar-label">5</span>
      </div>
      <div class="acu-bar-x-label">1</div>
    </div>
    
    <div class="acu-bar-item">
      <div class="acu-bar" style="height: 40%;">
        <span class="acu-bar-label">10</span>
      </div>
      <div class="acu-bar-x-label">2</div>
    </div>
    
    <div class="acu-bar-item">
      <div class="acu-bar" style="height: 60%;">
        <span class="acu-bar-label">15</span>
      </div>
      <div class="acu-bar-x-label">3</div>
    </div>
    
    <!-- 更多柱子 -->
  </div>
  
  <div class="acu-chart-legend">
    <div class="acu-legend-item">
      <div class="acu-legend-color" style="background: var(--acu-accent);"></div>
      <span>掷骰次数</span>
    </div>
  </div>
</div>
```

### 折线图

```html
<div class="acu-chart">
  <div class="acu-chart-title">掷骰趋势</div>
  
  <div class="acu-line-chart">
    <div class="acu-line-chart-area">
      <!-- 网格线 -->
      <div class="acu-chart-grid">
        <div class="acu-grid-line" style="top: 0%;"></div>
        <div class="acu-grid-line" style="top: 25%;"></div>
        <div class="acu-grid-line" style="top: 50%;"></div>
        <div class="acu-grid-line" style="top: 75%;"></div>
        <div class="acu-grid-line" style="top: 100%;"></div>
      </div>
      
      <!-- SVG折线 -->
      <svg width="100%" height="100%">
        <path class="acu-line-path" d="M 0,150 L 50,120 L 100,100 L 150,80 L 200,60"></path>
        <circle class="acu-line-point" cx="0" cy="150" r="4"></circle>
        <circle class="acu-line-point" cx="50" cy="120" r="4"></circle>
        <circle class="acu-line-point" cx="100" cy="100" r="4"></circle>
      </svg>
    </div>
    
    <div class="acu-line-x-labels">
      <span class="acu-x-label">周一</span>
      <span class="acu-x-label">周二</span>
      <span class="acu-x-label">周三</span>
      <span class="acu-x-label">周四</span>
      <span class="acu-x-label">周五</span>
    </div>
  </div>
</div>
```

### 饼图

```html
<div class="acu-chart">
  <div class="acu-chart-title">掷骰类型分布</div>
  
  <div class="acu-pie-chart">
    <svg class="acu-pie-svg" viewBox="0 0 100 100">
      <circle class="acu-pie-slice" cx="50" cy="50" r="40" 
              style="stroke-dasharray: 125.6 251.2; stroke-dashoffset: 0;"></circle>
      <circle class="acu-pie-slice" cx="50" cy="50" r="40" 
              style="stroke-dasharray: 75.4 251.2; stroke-dashoffset: -125.6;"></circle>
    </svg>
    
    <div class="acu-pie-center">
      <div class="acu-pie-center-value">156</div>
      <div class="acu-pie-center-label">总次数</div>
    </div>
  </div>
  
  <div class="acu-chart-legend">
    <div class="acu-legend-item">
      <div class="acu-legend-color" style="background: var(--acu-accent);"></div>
      <span>d20 (50%)</span>
    </div>
    <div class="acu-legend-item">
      <div class="acu-legend-color" style="background: var(--acu-color-success);"></div>
      <span>d6 (30%)</span>
    </div>
  </div>
</div>
```

### 环形图

```html
<div class="acu-chart">
  <div class="acu-chart-title">成功率</div>
  
  <div class="acu-donut-chart">
    <svg class="acu-donut-svg" viewBox="0 0 100 100">
      <circle class="acu-donut-track" cx="50" cy="50" r="40"></circle>
      <circle class="acu-donut-progress" cx="50" cy="50" r="40"
              style="stroke-dasharray: 188.4; stroke-dashoffset: 56.5;"></circle>
    </svg>
    
    <div class="acu-donut-center">
      <div class="acu-donut-value">70%</div>
      <div class="acu-donut-label">成功</div>
    </div>
  </div>
</div>
```

### 分布图

```html
<div class="acu-chart">
  <div class="acu-chart-title">2d6 结果分布</div>
  
  <div class="acu-distribution-chart">
    <div class="acu-dist-bar" style="height: 2.8%;" title="2"></div>
    <div class="acu-dist-bar" style="height: 5.6%;" title="3"></div>
    <div class="acu-dist-bar" style="height: 8.3%;" title="4"></div>
    <div class="acu-dist-bar" style="height: 11.1%;" title="5"></div>
    <div class="acu-dist-bar" style="height: 13.9%;" title="6"></div>
    <div class="acu-dist-bar acu-dist-highlight" style="height: 16.7%;" title="7"></div>
    <div class="acu-dist-bar" style="height: 13.9%;" title="8"></div>
    <div class="acu-dist-bar" style="height: 11.1%;" title="9"></div>
    <div class="acu-dist-bar" style="height: 8.3%;" title="10"></div>
    <div class="acu-dist-bar" style="height: 5.6%;" title="11"></div>
    <div class="acu-dist-bar" style="height: 2.8%;" title="12"></div>
  </div>
</div>
```

### 趋势图

```html
<div class="acu-chart">
  <div class="acu-trend-chart">
    <div class="acu-trend-indicator">
      <div class="acu-trend-value">156</div>
      <div class="acu-trend-change acu-trend-up">
        ↑ +12.5%
      </div>
    </div>
    
    <div class="acu-trend-sparkline">
      <svg width="100%" height="60">
        <path class="acu-sparkline-path" d="M 0,50 L 20,45 L 40,40 L 60,35 L 80,30 L 100,25"></path>
        <path class="acu-sparkline-area" d="M 0,50 L 20,45 L 40,40 L 60,35 L 80,30 L 100,25 L 100,60 L 0,60 Z"></path>
      </svg>
    </div>
  </div>
</div>
```

### 热力图

```html
<div class="acu-chart">
  <div class="acu-chart-title">掷骰活动热力图</div>
  
  <div class="acu-heatmap" style="grid-template-columns: repeat(7, 1fr);">
    <div class="acu-heatmap-cell acu-heat-1"></div>
    <div class="acu-heatmap-cell acu-heat-3"></div>
    <div class="acu-heatmap-cell acu-heat-5"></div>
    <div class="acu-heatmap-cell acu-heat-7"></div>
    <div class="acu-heatmap-cell acu-heat-4"></div>
    <div class="acu-heatmap-cell acu-heat-2"></div>
    <div class="acu-heatmap-cell acu-heat-6"></div>
    <!-- 更多单元格 -->
  </div>
</div>
```

### 统计卡片

```html
<div class="acu-stat-card">
  <div class="acu-stat-header">
    <div class="acu-stat-title">总掷骰次数</div>
    <div class="acu-stat-icon">🎲</div>
  </div>
  
  <div class="acu-stat-value">1,234</div>
  
  <div class="acu-stat-footer">
    <span class="acu-stat-change acu-change-up">↑ 12%</span>
    <span class="acu-stat-period">相比上周</span>
  </div>
</div>
```

### 图表工具提示

```html
<div class="acu-chart-tooltip acu-tooltip-visible">
  <div class="acu-tooltip-title">周一</div>
  <div class="acu-tooltip-value">25 次</div>
</div>
```

### 图表加载状态

```html
<div class="acu-chart-loading">
  <div class="acu-chart-spinner"></div>
</div>
```

### 图表空状态

```html
<div class="acu-chart-empty">
  <div class="acu-chart-empty-icon">📊</div>
  <div class="acu-chart-empty-title">暂无数据</div>
  <div class="acu-chart-empty-description">
    开始掷骰以查看统计数据
  </div>
</div>
```

---

## 🎨 最佳实践

### 1. 表格设计

```html
<!-- ✅ 好的做法：使用语义化表格 -->
<table class="acu-table acu-table-striped acu-table-hover">
  <thead>
    <tr>
      <th>列标题</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>数据</td>
    </tr>
  </tbody>
</table>

<!-- ❌ 避免的做法：过度复杂的表格 -->
<table>
  <tr>
    <td colspan="5" rowspan="3">复杂数据</td>
  </tr>
</table>
```

### 2. 数据可视化

```html
<!-- ✅ 好的做法：选择合适的图表类型 -->
<div class="acu-bar-chart">
  <!-- 用于比较数据 -->
</div>

<!-- ✅ 好的做法：提供清晰的标签 -->
<div class="acu-chart">
  <div class="acu-chart-title">掷骰结果分布</div>
  <!-- 图表内容 -->
</div>
```

### 3. 响应式设计

```html
<!-- ✅ 好的做法：移动端优化 -->
<div class="acu-table-responsive">
  <table class="acu-table">
    <!-- 表格内容 -->
  </table>
</div>

<!-- ✅ 好的做法：移动端卡片化 -->
<table class="acu-table acu-table-card-mobile">
  <tbody>
    <tr>
      <td data-label="名称">数据</td>
    </tr>
  </tbody>
</table>
```

### 4. 性能优化

```html
<!-- ✅ 好的做法：虚拟滚动 -->
<div class="acu-history-list" style="max-height: 400px; overflow-y: auto;">
  <!-- 大量数据 -->
</div>

<!-- ✅ 好的做法：延迟加载 -->
<div class="acu-chart-loading">
  <div class="acu-chart-spinner"></div>
</div>
```

---

## 📱 响应式优化

### 移动端表格

```html
<!-- 横向滚动 -->
<div class="acu-table-responsive">
  <table class="acu-table">
    <!-- 表格内容 -->
  </table>
</div>

<!-- 卡片化表格 -->
<table class="acu-table acu-table-card-mobile">
  <tbody>
    <tr>
      <td data-label="时间">2026-04-03</td>
      <td data-label="公式">2d6+3</td>
      <td data-label="结果">11</td>
    </tr>
  </tbody>
</table>
```

### 移动端图表

```html
<!-- 图表自动调整大小 -->
<div class="acu-chart">
  <div class="acu-bar-chart">
    <!-- 柱状图会自动调整 -->
  </div>
</div>
```

---

## 🛠️ 测试清单

### 表格测试
- [ ] 排序功能正常
- [ ] 分页功能正常
- [ ] 状态指示清晰
- [ ] 响应式布局正确
- [ ] 加载状态显示

### 掷骰结果测试
- [ ] 骰子显示正确
- [ ] 动画流畅
- [ ] 结果计算准确
- [ ] 历史记录完整

### 图表测试
- [ ] 数据渲染正确
- [ ] 交互功能正常
- [ ] 工具提示显示
- [ ] 响应式适配
- [ ] 性能良好

---

## 📚 参考资源

- [MDN 表格](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/table)
- [Chart.js 文档](https://www.chartjs.org/)
- [D3.js 文档](https://d3js.org/)
- [数据可视化最佳实践](https://www.tableau.com/learn/articles/data-visualization-tips)

---

**最后更新**: 2026-04-03  
**维护者**: UI/UX Design Team
