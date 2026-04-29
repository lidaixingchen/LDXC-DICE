---
alwaysApply: false
---
***

alwaysApply: true
scene: git\_message
-------------------

请严格遵循“约定式提交（Conventional Commits）”规范，使用简体中文为我生成 Commit Message。

生成格式如下： <type>(<scope>): <subject>
<空行>

<body>
<空行>
<footer>

【具体要求】

1. Header (标题行，必填)：
   - type：只允许使用 feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert。
   - scope：可选，说明影响的范围（如特定的模块、服务或文件名）。
   - subject：简明扼要的说明（≤50字符），动词开头，说明“做了什么”，结尾不加句号。
2. Body (正文，必填)：
   - 必须在 Header 后空一行开始。
   - 详细说明变更的背景、动机（为什么改）以及具体改动。
   - 必须使用短杠 "-" 开头的列表形式逐条列出，每行文字严格控制在 72 个字符以内。
   - 如果本次代码包含多个逻辑独立的变更，请在 Body 中使用模块名称作为小标题分段归类，段落间用空行分隔。
3. Footer (尾部，可选)：
   - 必须在 Body 后空一行开始。
   - 如果代码变动修复了特定的 Issue，请使用 `Closes #Issue号` 的格式。
   - 如果引入了不兼容的 API 改动，必须以 `BREAKING CHANGE:` 开头并附加说明。

