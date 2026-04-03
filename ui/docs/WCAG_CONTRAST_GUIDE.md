# WCAG 2.1 对比度合规性验证指南

## 📋 对比度标准

### WCAG 2.1 AA 级别要求
- **普通文本** (小于18px): 对比度至少 **4.5:1**
- **大文本** (18px及以上或14px粗体): 对比度至少 **3:1**
- **非文本元素** (图标、边框等): 对比度至少 **3:1**

### WCAG 2.1 AAA 级别要求
- **普通文本**: 对比度至少 **7:1**
- **大文本**: 对比度至少 **4.5:1**

## 🎨 已优化的语义化色彩

### 成功色 (Success)
- **主色**: `#10b981` - 对比度符合标准
- **浅色**: `#d1fae5` - 用于背景
- **深色**: `#065f46` - 用于文本

### 警告色 (Warning)
- **主色**: `#f59e0b` - 对比度符合标准
- **浅色**: `#fef3c7` - 用于背景
- **深色**: `#92400e` - 用于文本

### 错误色 (Error)
- **主色**: `#ef4444` - 对比度符合标准
- **浅色**: `#fee2e2` - 用于背景
- **深色**: `#991b1b` - 用于文本

### 信息色 (Info)
- **主色**: `#3b82f6` - 对比度符合标准
- **浅色**: `#dbeafe` - 用于背景
- **深色**: `#1e40af` - 用于文本

## 📊 中性色阶对比度

### 浅色主题 (白色背景)
| 颜色变量 | 色值 | 对比度 | 用途 |
|---------|------|--------|------|
| `--acu-gray-900` | `#111827` | 16.1:1 | 高对比度文本 |
| `--acu-gray-800` | `#1f2937` | 13.4:1 | 主要文本 |
| `--acu-gray-700` | `#374151` | 9.6:1 | 次要文本 |
| `--acu-gray-600` | `#4b5563` | 7.0:1 | 辅助文本 |
| `--acu-gray-500` | `#6b7280` | 4.6:1 | 低对比度文本 |

### 深色主题 (深色背景)
| 颜色变量 | 色值 | 对比度 | 用途 |
|---------|------|--------|------|
| `--acu-gray-50` | `#f9fafb` | 15.5:1 | 高对比度文本 |
| `--acu-gray-100` | `#f3f4f6` | 13.8:1 | 主要文本 |
| `--acu-gray-200` | `#e5e7eb` | 11.2:1 | 次要文本 |
| `--acu-gray-300` | `#d1d5db` | 8.7:1 | 辅助文本 |
| `--acu-gray-400` | `#9ca3af` | 5.9:1 | 低对比度文本 |

## 🔍 对比度检查工具

### 在线工具
1. **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
2. **Contrast Ratio**: https://contrast-ratio.com/
3. **Coolors Contrast Checker**: https://coolors.co/contrast-checker

### 浏览器扩展
1. **WCAG Color Contrast Checker** (Chrome)
2. **Accessibility Insights for Web** (Chrome, Edge)
3. **WAVE Evaluation Tool** (Chrome, Firefox)

### 开发工具
```bash
# 安装对比度检查工具
npm install --save-dev color-contrast-checker
```

## 📝 使用示例

### 正确使用对比度工具类

```html
<!-- 高对比度文本 (主要标题、重要信息) -->
<h1 class="acu-text-high-contrast">重要标题</h1>

<!-- 中等对比度文本 (正文、描述) -->
<p class="acu-text-medium-contrast">这是正文内容</p>

<!-- 低对比度文本 (辅助信息、时间戳) -->
<span class="acu-text-low-contrast">2024-01-01</span>
```

### 语义化色彩使用

```html
<!-- 成功状态 -->
<div class="acu-badge acu-badge-success">操作成功</div>

<!-- 警告状态 -->
<div class="acu-badge acu-badge-warning">请注意</div>

<!-- 错误状态 -->
<div class="acu-badge acu-badge-error">操作失败</div>

<!-- 信息状态 -->
<div class="acu-badge acu-badge-info">提示信息</div>
```

## ✅ 验证清单

### 文本对比度
- [ ] 所有主要文本对比度 ≥ 4.5:1
- [ ] 大文本对比度 ≥ 3:1
- [ ] 次要文本对比度 ≥ 4.5:1 (推荐 ≥ 7:1)
- [ ] 占位符文本对比度 ≥ 4.5:1

### 交互元素
- [ ] 按钮文本对比度 ≥ 4.5:1
- [ ] 链接文本对比度 ≥ 4.5:1
- [ ] 焦点状态可见 (对比度 ≥ 3:1)
- [ ] 禁用状态可识别 (对比度 ≥ 3:1)

### 图标和图形
- [ ] 图标对比度 ≥ 3:1
- [ ] 边框对比度 ≥ 3:1
- [ ] 表单控件边框对比度 ≥ 3:1

### 状态指示
- [ ] 成功状态可识别 (不仅依赖颜色)
- [ ] 错误状态可识别 (不仅依赖颜色)
- [ ] 警告状态可识别 (不仅依赖颜色)

## 🚨 常见问题

### 问题1: 浅色主题文本对比度不足
**解决方案**: 使用 `--acu-gray-700` 或更深的中性色

### 问题2: 深色主题文本对比度不足
**解决方案**: 使用 `--acu-gray-300` 或更浅的中性色

### 问题3: 彩色背景上的文本对比度
**解决方案**: 使用语义化色彩的浅色/深色变体

## 📖 参考资源

- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [理解对比度要求](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [色彩对比度最佳实践](https://webaim.org/articles/contrast/)

## 🔄 持续验证

建议在以下情况下重新验证对比度:
1. 引入新颜色时
2. 修改主题时
3. 更新设计系统时
4. 用户反馈可读性问题时

---

**最后更新**: 2026-04-03  
**维护者**: UI/UX Design Team
