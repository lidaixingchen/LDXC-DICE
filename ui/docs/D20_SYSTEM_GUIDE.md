# D&D D20 骰子系统使用指南

## 📋 概述

本文档专为D&D（龙与地下城）跑团系统设计，提供完整的d20骰子可视化解决方案，包括暴击、失误、优势/劣势等D&D特有概念的可视化展示。

---

## 🎲 D20 骰子基础

### 基础D20显示

```html
<!-- 基础d20骰子 -->
<div class="acu-d20" data-value="15"></div>

<!-- 不同尺寸 -->
<div class="acu-d20 acu-d20-sm" data-value="10"></div>
<div class="acu-d20" data-value="15"></div>
<div class="acu-d20 acu-d20-lg" data-value="18"></div>
<div class="acu-d20 acu-d20-xl" data-value="20"></div>
```

### 暴击显示 (20)

```html
<!-- 暴击骰子 -->
<div class="acu-d20 acu-d20-critical" data-value="20"></div>
```

**效果**:
- 金色渐变背景
- 发光动画效果
- 星星图标标识
- 自动高亮显示

### 失误显示 (1)

```html
<!-- 失误骰子 -->
<div class="acu-d20 acu-d20-fumble" data-value="1"></div>
```

**效果**:
- 深红色背景
- 震动动画效果
- 叉号图标标识
- 自动警示显示

---

## ⚔️ 优势与劣势

### 优势掷骰

```html
<div class="acu-d20-advantage">
  <div class="acu-d20 acu-d20-lower acu-d20-sm" data-value="12"></div>
  <div class="acu-d20 acu-d20-higher" data-value="18"></div>
</div>
```

**显示效果**:
- 较低的骰子变暗并缩小
- 较高的骰子高亮显示
- 顶部显示"优势"标签
- 绿色标签颜色

### 劣势掷骰

```html
<div class="acu-d20-disadvantage">
  <div class="acu-d20 acu-d20-higher acu-d20-sm" data-value="15"></div>
  <div class="acu-d20 acu-d20-lower" data-value="8"></div>
</div>
```

**显示效果**:
- 较高的骰子变暗并缩小
- 较低的骰子高亮显示
- 顶部显示"劣势"标签
- 红色标签颜色

---

## 🔢 修饰符显示

### 基础修饰符

```html
<!-- 正修饰符 -->
<div class="acu-d20-modifier acu-mod-positive">
  <span class="acu-mod-sign">+</span>
  <span class="acu-mod-value">5</span>
</div>

<!-- 负修饰符 -->
<div class="acu-d20-modifier acu-mod-negative">
  <span class="acu-mod-sign">-</span>
  <span class="acu-mod-value">3</span>
</div>
```

### 完整掷骰结果

```html
<div style="display: flex; align-items: center;">
  <div class="acu-d20" data-value="15"></div>
  <div class="acu-d20-modifier acu-mod-positive">
    <span class="acu-mod-sign">+</span>
    <span class="acu-mod-value">5</span>
  </div>
  <span style="font-size: 24px; margin-left: 16px;">= 20</span>
</div>
```

---

## 📋 D20 结果卡片

### 基础结果卡片

```html
<div class="acu-d20-result-card">
  <div class="acu-d20-result-header">
    <div class="acu-result-title">力量检定</div>
    <div class="acu-result-time">2026-04-03 14:30:25</div>
  </div>
  
  <div class="acu-d20-result-content">
    <div class="acu-result-dice">
      <div class="acu-d20" data-value="15"></div>
    </div>
    
    <div class="acu-result-details">
      <div class="acu-result-formula">
        <span class="acu-formula-dice">d20</span>
        <span class="acu-formula-mod">+ 5</span>
      </div>
      
      <div class="acu-result-total">
        <span class="acu-result-label">总计:</span>
        20
        <span class="acu-result-breakdown">(15 + 5)</span>
      </div>
      
      <div class="acu-result-dc">
        <span class="acu-dc-label">DC 15</span>
        <span class="acu-dc-value acu-dc-success">成功</span>
      </div>
    </div>
  </div>
</div>
```

### 暴击结果卡片

```html
<div class="acu-d20-result-card acu-result-critical">
  <div class="acu-d20-result-header">
    <div class="acu-result-title">攻击检定</div>
    <div class="acu-result-time">2026-04-03 14:35:12</div>
  </div>
  
  <div class="acu-d20-result-content">
    <div class="acu-result-dice">
      <div class="acu-d20 acu-d20-critical" data-value="20"></div>
    </div>
    
    <div class="acu-result-details">
      <div class="acu-result-formula">
        <span class="acu-formula-dice">d20</span>
        <span class="acu-formula-mod">+ 7</span>
      </div>
      
      <div class="acu-result-total">
        <span class="acu-result-label">总计:</span>
        27
        <span class="acu-result-breakdown">(20 + 7)</span>
      </div>
    </div>
  </div>
</div>
```

### 失误结果卡片

```html
<div class="acu-d20-result-card acu-result-fumble">
  <div class="acu-d20-result-header">
    <div class="acu-result-title">敏捷豁免</div>
    <div class="acu-result-time">2026-04-03 14:40:05</div>
  </div>
  
  <div class="acu-d20-result-content">
    <div class="acu-result-dice">
      <div class="acu-d20 acu-d20-fumble" data-value="1"></div>
    </div>
    
    <div class="acu-result-details">
      <div class="acu-result-formula">
        <span class="acu-formula-dice">d20</span>
        <span class="acu-formula-mod">+ 4</span>
      </div>
      
      <div class="acu-result-total">
        <span class="acu-result-label">总计:</span>
        5
        <span class="acu-result-breakdown">(1 + 4)</span>
      </div>
      
      <div class="acu-result-dc">
        <span class="acu-dc-label">DC 13</span>
        <span class="acu-dc-value acu-dc-fail">失败</span>
      </div>
    </div>
  </div>
</div>
```

---

## 🏷️ 检定类型标签

### 属性检定

```html
<!-- 力量 -->
<span class="acu-d20-check-type acu-check-str">力量</span>

<!-- 敏捷 -->
<span class="acu-d20-check-type acu-check-dex">敏捷</span>

<!-- 体质 -->
<span class="acu-d20-check-type acu-check-con">体质</span>

<!-- 智力 -->
<span class="acu-d20-check-type acu-check-int">智力</span>

<!-- 感知 -->
<span class="acu-d20-check-type acu-check-wis">感知</span>

<!-- 魅力 -->
<span class="acu-d20-check-type acu-check-cha">魅力</span>
```

### 技能检定

```html
<span class="acu-d20-check-type acu-check-skill">隐匿</span>
<span class="acu-d20-check-type acu-check-skill">察觉</span>
<span class="acu-d20-check-type acu-check-skill">说服</span>
```

### 豁免检定

```html
<span class="acu-d20-check-type acu-check-save">力量豁免</span>
<span class="acu-d20-check-type acu-check-save">敏捷豁免</span>
```

---

## 📊 D20 统计面板

```html
<div class="acu-d20-stats-panel">
  <div class="acu-stat-item">
    <div class="acu-stat-label">总掷骰次数</div>
    <div class="acu-stat-value">156</div>
    <div class="acu-stat-subtitle">本次会话</div>
  </div>
  
  <div class="acu-stat-item">
    <div class="acu-stat-label">暴击次数</div>
    <div class="acu-stat-value acu-stat-critical">8</div>
    <div class="acu-stat-subtitle">5.1%</div>
  </div>
  
  <div class="acu-stat-item">
    <div class="acu-stat-label">失误次数</div>
    <div class="acu-stat-value acu-stat-fumble">6</div>
    <div class="acu-stat-subtitle">3.8%</div>
  </div>
  
  <div class="acu-stat-item">
    <div class="acu-stat-label">平均值</div>
    <div class="acu-stat-value">10.8</div>
    <div class="acu-stat-subtitle">理论: 10.5</div>
  </div>
  
  <div class="acu-stat-item">
    <div class="acu-stat-label">成功率</div>
    <div class="acu-stat-value">68%</div>
    <div class="acu-stat-subtitle">106/156</div>
  </div>
  
  <div class="acu-stat-item">
    <div class="acu-stat-label">优势次数</div>
    <div class="acu-stat-value">24</div>
    <div class="acu-stat-subtitle">15.4%</div>
  </div>
</div>
```

---

## 📜 D20 历史记录

```html
<div class="acu-d20-history">
  <div class="acu-history-header">
    <div class="acu-history-title">掷骰历史</div>
    <button class="acu-btn acu-btn-sm">清空</button>
  </div>
  
  <div class="acu-history-list">
    <!-- 普通检定 -->
    <div class="acu-history-item">
      <div class="acu-history-time">14:30</div>
      <div class="acu-history-check">
        <span class="acu-d20-check-type acu-check-str">力量</span>
      </div>
      <div class="acu-history-dice">
        <div class="acu-d20 acu-d20-sm" data-value="15"></div>
      </div>
      <div class="acu-history-formula">d20 + 5</div>
      <div class="acu-history-result">20</div>
      <div class="acu-history-dc acu-dc-success">成功</div>
    </div>
    
    <!-- 暴击 -->
    <div class="acu-history-item acu-history-critical">
      <div class="acu-history-time">14:35</div>
      <div class="acu-history-check">
        <span class="acu-d20-check-type acu-check-skill">攻击</span>
      </div>
      <div class="acu-history-dice">
        <div class="acu-d20 acu-d20-sm acu-d20-critical" data-value="20"></div>
      </div>
      <div class="acu-history-formula">d20 + 7</div>
      <div class="acu-history-result acu-result-critical">27</div>
      <div class="acu-history-dc acu-dc-success">暴击！</div>
    </div>
    
    <!-- 失误 -->
    <div class="acu-history-item acu-history-fumble">
      <div class="acu-history-time">14:40</div>
      <div class="acu-history-check">
        <span class="acu-d20-check-type acu-check-save">敏捷豁免</span>
      </div>
      <div class="acu-history-dice">
        <div class="acu-d20 acu-d20-sm acu-d20-fumble" data-value="1"></div>
      </div>
      <div class="acu-history-formula">d20 + 4</div>
      <div class="acu-history-result acu-result-fumble">5</div>
      <div class="acu-history-dc acu-dc-fail">失误！</div>
    </div>
  </div>
</div>
```

---

## 🎬 滚动动画

```html
<!-- 滚动动画 -->
<div class="acu-d20 acu-d20-rolling" data-value="15"></div>
```

**动画效果**:
- 3D旋转动画
- 0.8秒持续时间
- 流畅的缓动效果

---

## 🎨 完整示例

### 攻击检定示例

```html
<div class="acu-d20-result-card">
  <div class="acu-d20-result-header">
    <div class="acu-result-title">
      <span class="acu-d20-check-type acu-check-skill">长剑攻击</span>
    </div>
    <div class="acu-result-time">2026-04-03 14:45:18</div>
  </div>
  
  <div class="acu-d20-result-content">
    <div class="acu-result-dice">
      <div class="acu-d20 acu-d20-lg" data-value="18"></div>
    </div>
    
    <div class="acu-result-details">
      <div class="acu-result-formula">
        <span class="acu-formula-dice">d20</span>
        <span class="acu-formula-mod">+ 6</span>
        <span class="acu-formula-mod">+ 2</span>
        <span style="color: var(--acu-gray-500);">(熟练 + 属性)</span>
      </div>
      
      <div class="acu-result-total">
        <span class="acu-result-label">总计:</span>
        26
        <span class="acu-result-breakdown">(18 + 6 + 2)</span>
      </div>
      
      <div class="acu-result-dc">
        <span class="acu-dc-label">AC 18</span>
        <span class="acu-dc-value acu-dc-success">命中！</span>
      </div>
    </div>
  </div>
</div>
```

### 优势检定示例

```html
<div class="acu-d20-result-card">
  <div class="acu-d20-result-header">
    <div class="acu-result-title">
      <span class="acu-d20-check-type acu-check-dex">敏捷检定</span>
      <span style="margin-left: 8px; color: var(--acu-color-success);">(优势)</span>
    </div>
    <div class="acu-result-time">2026-04-03 14:50:22</div>
  </div>
  
  <div class="acu-d20-result-content">
    <div class="acu-result-dice">
      <div class="acu-d20-advantage">
        <div class="acu-d20 acu-d20-lower acu-d20-sm" data-value="8"></div>
        <div class="acu-d20 acu-d20-higher" data-value="16"></div>
      </div>
    </div>
    
    <div class="acu-result-details">
      <div class="acu-result-formula">
        <span class="acu-formula-dice">d20</span>
        <span class="acu-formula-mod">+ 4</span>
      </div>
      
      <div class="acu-result-total">
        <span class="acu-result-label">总计:</span>
        20
        <span class="acu-result-breakdown">(16 + 4)</span>
      </div>
      
      <div class="acu-result-dc">
        <span class="acu-dc-label">DC 15</span>
        <span class="acu-dc-value acu-dc-success">成功</span>
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 最佳实践

### 1. 暴击和失误检测

```javascript
// JavaScript 示例
function getDiceClass(value) {
  if (value === 20) return 'acu-d20-critical';
  if (value === 1) return 'acu-d20-fumble';
  return '';
}

// 使用
const diceValue = 20;
const diceClass = getDiceClass(diceValue);
```

### 2. DC检定显示

```javascript
function checkDC(total, dc) {
  return total >= dc ? 'acu-dc-success' : 'acu-dc-fail';
}

// 使用
const result = checkDC(20, 15); // 'acu-dc-success'
```

### 3. 优势/劣势处理

```javascript
function handleAdvantage(roll1, roll2, isAdvantage) {
  const higher = Math.max(roll1, roll2);
  const lower = Math.min(roll1, roll2);
  
  if (isAdvantage) {
    return {
      used: higher,
      discarded: lower,
      classes: ['acu-d20-advantage', 'acu-d20-higher', 'acu-d20-lower']
    };
  } else {
    return {
      used: lower,
      discarded: higher,
      classes: ['acu-d20-disadvantage', 'acu-d20-lower', 'acu-d20-higher']
    };
  }
}
```

---

## 📱 响应式设计

所有d20组件都支持响应式设计，在移动设备上会自动调整大小和布局。

```html
<!-- 移动端会自动缩小骰子 -->
<div class="acu-d20 acu-d20-lg" data-value="15"></div>

<!-- 移动端会垂直堆叠 -->
<div class="acu-d20-result-card">
  <!-- 内容 -->
</div>
```

---

## 🎨 主题支持

所有d20组件都支持暗色主题：

```html
<!-- 添加暗色主题类 -->
<body class="acu-theme-dark">
  <div class="acu-d20" data-value="15"></div>
</body>
```

---

## 📚 相关文档

- [数据可视化完整指南](file:///e:/project/骰子系统/ui/docs/DATA_VISUALIZATION_GUIDE.md)
- [响应式设计完整指南](file:///e:/project/骰子系统/ui/docs/RESPONSIVE_DESIGN_GUIDE.md)
- [可访问性完整指南](file:///e:/project/骰子系统/ui/docs/ACCESSIBILITY_GUIDE.md)

---

**最后更新**: 2026-04-03  
**维护者**: UI/UX Design Team  
**适用系统**: D&D 5E / Pathfinder / 其他d20系统
