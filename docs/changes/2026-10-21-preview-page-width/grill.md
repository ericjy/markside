# 设计一个简单的 Markside 功能

Status: Proposed. Design confirmed; not implemented.

## Confirmed details

以下细节由 agent 补充，并在你完成 Review 时确认。

- **Inferred:** 窄档只改变正文宽度，字号和两侧留白沿用现有设置。

## Question history

### Q1. 这次先解决阅读时的一个小麻烦，好吗？

> **Your decision: A.** 改善阅读和查找内容。

<details>
<summary>Full question</summary>

你还没有指定功能。先选一个使用场景，再讨论具体问题、操作和完成标准。你也可以用自己的话描述最近一次觉得 Markside 不顺手的经历。

- **A. 改善阅读和查找内容。** 我们从阅读本地 Markdown 时找位置、看内容的操作中选一个问题。容易把范围限制在一个动作，但需要找到现有目录和搜索还没有解决的麻烦。
- **B. 改善 Review 的操作。** 我们从写 Review Comment、发送反馈或检查回复中选一个问题。能直接改善与 agent 的协作，但需要顾及已有的 Review 状态。
- **C. 改善编辑和保存。** 我们从修改文件到保存的操作中选一个问题。能减少写作时的操作，但需要顾及 Unsaved Draft 和文件权限。

**Recommended: A.** 先找一个阅读时的小麻烦，更容易把第一版控制在一个清楚的动作内；如果你已经有具体痛点，就以你的实际经历为准。

</details>

### Q2. 用“任务完成数”作为这次的小功能，好吗？

> **Your decision:** 换一批候选，尚未选择具体功能。

<details>
<summary>Full question</summary>

你选择了改善阅读和查找内容。目前 Preview 已显示字数和预计阅读时间，也能展示 Markdown 任务列表，但没有汇总任务完成数。下面三个候选都基于现有功能核查；也可以写出你真正遇到的阅读问题。

- **A. 显示任务完成数。** 打开带任务列表的文档时，能看到类似“3/8 项已完成”的统计。无需逐项数任务，范围也较小，但对没有任务列表的文档没有帮助。
- **B. 恢复上次阅读位置。** 重新打开同一个文档时，回到上次阅读的位置。适合分多次读长文，但需要确定文件改动后该回到哪里。
- **C. 复制当前章节。** 阅读时能复制某个标题及其章节的 Markdown。适合摘取内容交给 agent 或粘贴到别处，但需要确定章节边界和操作入口。

**Recommended: A.** 任务完成数的输入和结果最明确，适合先做一个小功能的完整设计；如果你平时很少读任务列表，另外两个方向可能更有用。

<details open>
<summary>Compare tradeoffs</summary>

| 标准 | A. 任务完成数 | B. 恢复阅读位置 | C. 复制当前章节 |
|---|---|---|---|
| 第一版容易限定范围 | ✓ 显示一个统计 | △ 需保存和恢复位置 | △ 需确定章节边界 |
| 直接帮助的场景 | 阅读任务列表 | 分多次读长文 | 摘取章节内容 |
| 文档变化后的行为 | ✓ 按当前内容统计 | △ 原位置可能不再合适 | ✓ 按当前章节复制 |

</details>

</details>

### Q3. 换成“点击正文图片看大图”，好吗？

> **Your decision:** 要不做一个可以改变页宽的吧；现在只有一个固定页宽，或者 full width，增加一个更短的页宽。

<details>
<summary>Full question</summary>

上一批候选已撤下。这次从两种更具体的阅读麻烦里选一个：截图里的字太小，或者看脚注时总要跳到文末。核查后，正文里的普通图片还没有放大功能，脚注也只有文末列表和往返链接；Mermaid 图表已有 Expand，不属于这次的候选。

- **A. 点击正文图片看大图。** 阅读 Markdown 时，点击普通插图就能放大查看，关闭后继续读原文。适合看截图里的小字，但不能让原图本身模糊的内容变清晰。
- **B. 在原处查看脚注。** 点击脚注编号时，就在当前阅读位置查看注释内容。能减少跳到文末再返回的操作，但只有带脚注的文档会用到。

**Recommended: A.** 图片中的小字看不清是一个直观的问题，操作也容易讲清楚；如果你更常读带参考注释的长文，就选脚注。

</details>

### Q4. 新增的窄页宽用 768px，好吗？

> **Your decision: A.** 新增 768px、48rem 的窄页宽，保留现有固定宽与 Full width。

<details>
<summary>Full question</summary>

当前固定正文宽度上限为 64rem，通常是 1024px，Full width 则取消上限。这次保留它们，再增加一个更窄的档位。下面的数值都指正文最大宽度，不包含两侧留白；窗口空间不足时，正文仍会缩小以适应可用区域。

~~~mermaid
flowchart TD
  A[浏览器中的可用阅读区域] --> B[左侧留白]
  A --> C[正文：受最大宽度限制]
  A --> D[右侧留白]
~~~

- **A. 768px，48rem。** 窄档把正文最大宽度设为当前的四分之三。比当前明显收窄，又能给表格和图片留些空间，但长内容会比现在更容易换行。
- **B. 640px，40rem。** 窄档把正文最大宽度缩到更接近文章专栏的大小。每行更短，但宽表格、代码和截图会更拥挤。
- **C. 896px，56rem。** 窄档只比当前缩小约八分之一。对宽内容影响较小，但你可能觉得与当前宽度差别不够明显。

**Recommended: A.** 768px 与现有宽度有清楚的区别，同时给文档里的表格和图片保留一些空间。最终仍可在实现时用真实文档检查效果。

</details>

### Q5. 新窄档只影响 Preview，包括 Split 里的 Preview，好吗？

> **Your decision: A.** 只给 Preview 增加窄档，包括 Split 的预览栏；Source 与 PDF Export 沿用现有宽度规则。

<details>
<summary>Full question</summary>

现在 Preview 与 Source 的宽度分别设置。Split 同时显示两栏，其中 Preview 使用自己的宽度偏好；PDF Export 使用独立的打印布局。

- **A. 只给 Preview 增加窄档。** Preview 和 Split 的预览栏都能选窄档，Source 与 PDF Export 保持现有宽度规则。符合这次阅读功能的范围，但编辑源码时不会多一个宽度选择。
- **B. Preview 和 Source 都增加窄档。** 两栏分别选择各自的宽度，PDF Export 仍保持现有规则。阅读和编辑都能用窄档，但需要同时设计两处入口与偏好。

**Recommended: A.** 先完成你提出的阅读页宽需求，并保留 Source 目前独立的行为。

</details>

### Q6. 在现有文件菜单里，用 Page width 选择三个档位，好吗？

> **Your decision: A.** 在文件菜单的 Page width 分组下列出 Narrow、Standard、Full width，并标记当前选择。

<details>
<summary>Full question</summary>

目前 Full width 位于文件操作的 … 菜单里，是一个勾选项。三个宽度需要能清楚显示当前选中了哪一个。

~~~mermaid
flowchart LR
  A[阅读页面] --> B[工具栏]
  B --> C[文件操作菜单 …]
  C --> D[当前的 Full width 勾选项]
~~~

- **A. 菜单里直接列出三个宽度。** 把原来的 Full width 勾选项换成 Page width 分组，下面显示 Narrow、Standard、Full width，当前项带选中标记。三个选择容易比较，但会多占两行菜单空间。
- **B. 工具栏增加页宽按钮。** 把页宽移到工具栏，点击后选择 Narrow、Standard、Full width。经常切换时更容易找到，但工具栏会多一个控件。

**Recommended: A.** 沿用用户现在找 Full width 的位置，三个档位放在一起，也不用增加工具栏按钮。

</details>

### Q7. 继续跨文件记住页宽，同时保留用户原来的宽度，好吗？

> **Your decision: A.** 继续跨文件记住页宽，保留原有用户的宽度选择与新安装的默认宽度。

<details>
<summary>Full question</summary>

目前 Preview 页宽保存在浏览器本地，打开别的文件或重启后都会沿用。新安装默认是当前固定宽，已经选择 Full width 的用户则继续全宽。

- **A. 继续跨文件记住选择。** 新档位加入现有偏好，用户选过 Narrow 后，其他文件也沿用它，原有宽度选择保持不变。行为与当前一致，但不能给不同文档分别记住宽度。
- **B. 改为每个文件记住选择。** 每份文档分别保存自己的页宽，没选过的文档先沿用用户原来的宽度。适合文章用窄档、表格用全宽，但切换文件时页宽可能变化。

**Recommended: A.** 继续现有的全局偏好，用户只需选一次，功能范围也更小。

</details>
