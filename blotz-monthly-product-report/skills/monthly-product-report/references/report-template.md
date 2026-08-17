# 中文月度报告结构

最终产物是 `monthly-report.html`。报告只展示 `metrics-snapshot.json` 中当前存在、口径可靠、对 PM 决策有用的指标。不要为了匹配模板展示未采集、未实现或无法解释的指标。

## 指标选择规则

- 指标值存在且对应查询成功时才展示。
- `null`、缺少字段或来源失败的指标不显示对应行。
- 整个章节没有有效指标时，删除章节，不写“暂不可用”。
- 删除章节后保持可见章节编号连续，不为空章节保留编号。
- 不显示“缺少哪些未来指标”的长清单；埋点规划属于单独任务。
- 可以保留与已展示指标直接相关的数据质量警告，例如失败事件没有稳定分母、screen coverage 有限。
- 每个指标必须支持产品判断、风险排序或下一步动作；只有数值但不能产生决策的指标可省略。
- 相同证据可以在首屏摘要和详细章节各出现一次，但不在多个正文章节反复堆叠。

## PM 中文表达

- 首次出现写“月活跃用户（MAU）”，后文只写“月活跃用户”。
- `WAU/DAU` 写“周活跃用户/日活跃用户”。
- `cohort` 写“按安装月份分组”；`D1/D7/D30` 写“次日/第 7 天/第 30 天回访率”。
- `AI Breakdown` 写“AI 任务拆解”。
- 不直接写 `P50/P90`，改为“典型等待时间”和“较慢请求的等待时间”。
- `request/session ID` 写“把一次 AI 尝试、失败过程和最终结果对应起来的统一编号”。
- `distinct-user union` 写“按用户去重合并”。
- Apple `Get` 写“下载按钮点击”，`Restore` 写“从备份恢复”，`Standard/Detailed` 写“标准报告/明细报告”。
- `Inventory` 写“事件清单”，`person_id` 写“PostHog 识别为同一人的用户记录”。
- 可以在 `<code>` 中保留真实事件名和错误码用于对账，但相邻正文必须用普通中文解释。

## 报告信息层级

按“决策摘要 → 证据主体 → 优先级动作 → 数据附录”组织报告。不按 App Store Connect 和 PostHog 的 API 来源机械分章。

### 首屏决策摘要

- 用一到两句话直接说明最大正向信号、最大风险和本月优先决策。
- 展示 App Store Connect 与 PostHog 的来源状态；完整使用 `status-good`，部分可用或未请求使用 `status-warning`，失败使用 `status-critical`。
- 选择 3–4 个本月核心指标，每个指标同时给出名称、值和一句决策含义。
- 不固定填充月活跃用户、AI、回访和下载各一项；优先选择真正改变本月决策的证据。
- 回访指标只在观察窗口已成熟时进入摘要。失败事件没有稳定分母时，只展示事件和受影响用户，不显示失败率。
- 单独展示“最大正向信号”和“最大风险”，各自包含观察事实和产品含义。
- 给出一个中文决策标签，不显示内部英文代码。

### 一、产品健康

将活跃规模、核心任务和安装后回访放在同一产品健康视图中。

- 展示当前支持的月活跃用户、平均周活跃用户、平均日活跃用户、人均活跃天数和活跃天数分层。
- 展示手动任务数、手动任务创建者和每活跃用户任务数。
- 明确活跃天数分层是当月使用频率，不是按安装月份分组的回访率。
- 展示已经完整经过观察期的次日、第 7 天和第 30 天回访率。未成熟窗口不显示百分比，也不按零处理。
- 明确回访数据是从 `Application Installed` 到指定日期 `Application Opened` 的用户回访，不是 App Store 下载转化。

### 二、AI 使用价值

- 展示当前代 AI 用户、会话、接受/拒绝/放弃、接受率、平均轮次、每会话生成任务和笔记。
- 只有快照同时包含 `voice_only`、`text_only`、`mixed` 和 `unknown` 四个互斥分类时，才展示输入方式构成。
- 旧快照只有“包含语音”和“包含文本”兼容计数时，两项可能重叠；只展示计数和限制说明，或省略输入方式，不计算构成比例。
- 将平均生成任务和笔记解释为输出量，不解释为质量。
- 可以展示三代 AI 事件按用户去重合并与手动任务的行为组合及活跃天数，但必须标为相关性，不写成 AI 到手动任务的转化。
- 不相加三代 AI 事件次数，不显示跨代 0/1-2/3+ 次数分组。

### 三、可靠性与性能

- 展示 AI 失败事件、受影响用户、失败阶段、错误码和周变化。
- 只有快照包含阶段与错误码联合分布时，才能把具体错误码归入某个阶段；否则分开显示。
- 周首尾是部分周时明确说明，不用不完整周声称趋势已改善或恶化。
- 没有稳定的统一尝试编号时，不计算失败率，不把失败事件与最终会话结果直接对应。
- 展示 AI 任务拆解的使用、用户、成功率、平均耗时和平均子任务数。
- 快照只有平均耗时时，不伪造典型等待时间或较慢请求等待时间，不在月报中自行设定没有依据的性能目标。

### 四、获取与用户结构

- 只使用 Apple 标准报告展示首次下载、重新下载、总下载、来源、地区、产品页浏览、下载按钮点击和“点击/浏览”比例。
- 从备份恢复和更新可作为口径说明，不计入新增或重新下载。
- 展示 PostHog 活跃用户的地区和每位用户当月最后观察到的 App 版本，作为用户结构和版本异常线索。
- 不把 App Store 来源或地区直接归因到 PostHog 用户行为，不把 App Store 下载、PostHog 活跃用户和 AI 用户排列成转化漏斗。
- 展示 Notes 创建和 Notes/Gashapon 页面访问时，明确 screen tracking 只覆盖这两个页面，不作为完整功能排名。
- 笔记来源存在未知值时，将未知数量计入总数并说明来源覆盖不完整，不展示 AI 占比。

### 五、本月决策

- 只保留能够影响优先级的问题，默认最多 4 项。
- 每个问题依次说明“用户影响”、“证据边界”、“产品动作”和“下月验证”。
- “下月验证”优先使用当前已可追踪指标。需要新埋点或新分母的验证项标明为“完善数据后验证”，不把它写成当前已可追踪的结果指标。
- 结尾重申中文决策标签、主要原因和按优先级排序的下月动作。

### 数据附录

- 将支持对账但不需要占据决策主体的内容放入附录。
- 展示 PM 关键事件的当前月数量、用户、首次和最后出现时间。
- 用三代 AI 事件时间覆盖解释为什么不能直接画一条跨代事件数趋势。
- 仅保留与已展示指标或当月决策直接相关的数据质量说明，不放入未来埋点需求长清单。
- 附录没有有效事件或质量信息时整体省略。

## HTML 组件约定

首屏核心指标使用摘要网格：

```html
<div class="summary-grid">
  <article class="summary-metric">
    <div class="metric-label">月活跃用户</div>
    <div class="metric-value">249</div>
    <div class="metric-note">超过六成用户只活跃一天</div>
  </article>
</div>
```

最大正向信号和最大风险使用同一结构的双栏：

```html
<div class="signal-grid">
  <article class="signal signal-positive">
    <div class="signal-label">最大正向信号</div>
    <h3>事实性标题</h3>
    <p>观察证据和产品含义。</p>
  </article>
  <article class="signal signal-risk">
    <div class="signal-label">最大风险</div>
    <h3>事实性标题</h3>
    <p>观察证据和产品含义。</p>
  </article>
</div>
```

只对分类互斥、分母明确的分布使用进度条。`value` 和 `max` 必须是有限非负数，`max` 大于零，`value` 不大于 `max`；同时提供非空 `aria-label` 和可见数值。使用 `distribution-good`、`distribution-critical` 或 `distribution-accent` 表达语义：

```html
<div class="distribution-list">
  <div class="distribution-row">
    <span class="distribution-label">接受</span>
    <progress class="distribution-bar distribution-good" value="274" max="343" aria-label="AI 会话接受数">79.88%</progress>
    <span class="distribution-value">79.88%</span>
  </div>
</div>
```

优先级动作使用无外框的决策列表：

```html
<div class="decision-list">
  <article class="decision-item">
    <span class="priority">P1</span>
    <div class="decision-copy">
      <h3>产品动作</h3>
      <p><strong>用户影响：</strong>快照中的直接证据。</p>
      <p class="decision-meta"><strong>下月验证：</strong>已可追踪的验证方式。</p>
    </div>
  </article>
</div>
```

趋势图使用空占位组件；不在 AI 生成的 fragment 中写 SVG、坐标、颜色或数据点。渲染器从同月 `metrics-snapshot.json` 验证数据并确定性生成图形：

```html
<div class="retention-trend"></div>
<div class="failure-trend"></div>
```

- `retention-trend` 只绘制截至目标月已成熟的次日和第 7 天回访，最多展示最近 6 个安装月份。
- `failure-trend` 只绘制目标月的 AI 失败事件周变化；埋点启用当周和月末不完整周使用星号标记。
- 趋势图是快速比较，不替代包含精确值、样本量和成熟状态的数据表。
- 快照缺少至少两个可比时间点时，渲染器删除该占位，不生成空图。

章节简介可使用 `section-intro`；数据附录的 `section` 使用 `appendix`。

相互补充的证据模块可使用无外框的双栏容器；桌面端并排，窄屏自动单列：

```html
<div class="evidence-grid">
  <div class="evidence-column">
    <h3>证据视图一</h3>
    <!-- distribution-list、trend-chart 或 table-wrap -->
  </div>
  <div class="evidence-column">
    <h3>证据视图二</h3>
    <!-- 与左侧使用同一问题口径的补充证据 -->
  </div>
</div>
```

只将同一问题的互补证据放入 `evidence-grid`；不要把 App Store 下载、PostHog 活跃用户和 AI 用户排列成双栏漏斗，也不要为了填满网格制造无关比较。

## HTML 约束

- 只写 `<main>` 内可用的 HTML fragment，不写 `html`、`head`、`body`、`style` 或 `script`。
- 使用语义化的 `section`、`article`、`h2`、`h3`、`p`、`table`、`ul` 和 `ol`。
- 表格外层使用 `<div class="table-wrap">`，保证窄屏可横向滚动。
- 核心结论使用 `<blockquote class="verdict">`。
- 与已展示指标直接相关的数据限制使用 `<aside class="data-note">`。
- 来源状态使用 `status-good`、`status-warning` 或 `status-critical`。
- `<progress>` 只允许 `class`、`value`、`max` 和 `aria-label`，且 `class` 必须包含 `distribution-bar`。
- 趋势占位必须是空 `div`，且只能使用 `retention-trend` 或 `failure-trend` 一个 `class`。
- 除上述 `<progress>` 例外，HTML 属性只允许使用模板中已定义的 `class`；不使用链接、图片、SVG、表单、内联样式、事件属性、自定义属性或注释。
- 不嵌入外部图片、字体、脚本或跟踪代码。
