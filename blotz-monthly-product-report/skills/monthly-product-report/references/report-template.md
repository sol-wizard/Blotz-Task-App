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
- `cohort` 写“按安装月份分组”；`D1` 写“次日回访”；`next_month_active_rate` 写“新用户下个月仍活跃”。
- `retention_rate` 写“上月用户本月留存”；`churned_users` 写“上月活跃、本月没来”；`resurrected_users` 写“之前流失、本月回来”；`dau_over_mau` 写“日活/月活”。
- 新用户首周写“安装后 7 天内”；`coverage_start` 写“统计从 X 月 X 日起安装的用户”。
- `AI Breakdown` 写“AI 任务拆解”。
- 不直接写 `P50/P90`，改为“典型等待时间”和“较慢请求的等待时间”。
- `request/session ID` 写“把一次 AI 尝试、失败过程和最终结果对应起来的统一编号”。
- `distinct-user union` 写“按用户去重合并”。
- Apple `Get` 写“下载按钮点击”，`Restore` 写“从备份恢复”，`Standard/Detailed` 写“标准报告/明细报告”。
- `Inventory` 写“事件清单”，`person_id` 写“PostHog 识别为同一人的用户记录”。
- 登录三步写“看到登录页 / 点击继续 / 登录成功”；`login_started` 写“点击继续的登录尝试”。
- `cancelled`、`browser_dismissed` 写“用户中途退出”；`no_tokens`、`auth0_error` 写“登录出错”；`error_code` 写“错误码”。
- 按人统计的登录结果写“只是自己关闭了登录页 / 遇到过登录出错 / 没有记录到结果”；`unresolved_attempts` 写“未记录结果的尝试”，两者都不写成失败。
- 可以在 `<code>` 中保留真实事件名和错误码用于对账，但相邻正文必须用普通中文解释。

## 报告信息层级

按“决策摘要 → 四个证据章节 → 本月决策 → 数据附录”组织报告。四个证据章节沿着用户旅程回答四个问题，每个章节只讲一类用户：第一章只讲新用户，第二到第四章讲全部活跃用户。不按 App Store Connect 和 PostHog 的 API 来源机械分章。

每个证据章节都以一句直接回答问题的 `section-intro` 开头，然后是 2–4 个 `summary-metric` 核心指标，再是证据表格或分布条，最后是一条与本章指标相关的 `data-note`。

“比上月”只使用快照中的变化字段（`*_change_ratio`、`*_change_points`、`*_change_ms`）；字段为 null 时不显示“比上月”，也不自行计算。目标月份未结束（`report_context.month_complete` 为 false）时，不做整月对比，新安装改用 `new_users.same_period` 的同期对比。

### 首屏决策摘要

- 用一到两句话直接说明最大正向信号、最大风险和本月优先决策。
- 展示 App Store Connect 与 PostHog 的来源状态；完整使用 `status-good`，部分可用或未请求使用 `status-warning`，失败使用 `status-critical`。
- 选择 3–4 个本月核心指标，每个指标同时给出名称、值和一句决策含义；优先选择真正改变本月决策的证据。
- 失败事件没有稳定分母时，只展示事件和受影响用户，不显示失败率。
- 单独展示“最大正向信号”和“最大风险”，各自包含观察事实和产品含义。
- 给出一个中文决策标签，不显示内部英文代码。

### 一、新用户获取与首周价值（仅新用户）

回答“有没有新用户来，来了之后有没有用起来”。数据来自 `new_users` 和 `installation_retention`。

- 开头一句：本月新安装多少、比上月增减多少，其中多少人安装后 7 天内登录成功。
- 核心指标：本月新安装（附比上月变化）、7 天内登录成功比例；App Store Connect 为 `ok` 或 `partial` 时再加 App Store 总下载。
- “安装后 7 天内（按人）”表：新安装 → 点击继续登录 → 登录成功，用户数和占新安装用户的比例。只在 `steps_monotonic` 为 true 时显示比例。紧接一张表说明“点击继续但未登录成功”的人：只是自己关闭了登录页 / 遇到过登录出错 / 没有记录到结果，分母是点击继续的用户。
- 首周价值：说明 7 天内登录成功的用户中，多少人首周创建了任务、用过 AI、完成过任务。用分布条展示三个互斥分组（完成过任务 / 创建了任务但没有完成 / 登录了但没有创建或完成任务），再用一张可重叠的表列出首周做过的事（手动创建任务、使用 AI 生成任务、接受 AI 生成结果、创建笔记、完成任务），注明可重叠、不相加。`previous_month_cohort` 不为 null 时，可加一行与上月对比。
- “近 6 个月新安装用户”表：目标月份和之前 5 个月的新安装、比上月、7 天内登录成功比例。事件尚未上线的月份写“—”，不写 0%；覆盖不完整的月份注明统计起始日期。安装数远低于同月首次活跃用户的月份（如 2026-03）标注为安装记录缺失，不参与比上月。
- App Store Connect 有数据时，追加“App Store 下载与来源”：首次下载、重新下载、产品页浏览、下载按钮点击/产品页浏览、主要来源。没有数据时删除整块，只在章节中写一句“App Store Connect 本月未采集，无法回答下载来源和商店转化问题”。App Store 下载与 PostHog 新安装并列展示，不排成一个漏斗。
- `new_users.target_month.coverage` 为 `partial` 时，必须写明登录和首周数据只统计哪天之后的安装。
- 数据说明：新安装是 PostHog 中第一次打开 App 的用户记录，不等于 App Store 下载；重新安装或换设备可能被算作新用户。

### 二、用户在用什么功能（全部活跃用户）

回答“活跃用户实际在用什么”。数据来自 `feature_usage` 和 `ai_task_generation`。

- 开头一句：本月活跃用户中，多少比例创建过任务、用过 AI、完成过任务。
- 核心指标：创建过任务、使用过 AI（AI 生成任务或 AI 任务拆解）、完成过任务，各自给出占活跃用户比例和人数；再加 AI 生成结果接受率。
- “各功能使用情况（按人，可重叠，不相加）”表：功能、用户、占活跃用户、比上月。只列 `feature_usage.features` 中有值的功能；`coverage` 为 `partial` 的功能在表中注明起始日期，“比上月”写“—”。
- AI 任务生成：用两组分布条展示会话结果（接受 / 拒绝 / 放弃）和输入方式（只用语音 / 只用文字 / 两者都用），都是互斥分类。平均轮次、每次会话生成任务数等放入附录。
- 数据说明：只包含已埋点的功能，不是完整功能排名；部分功能事件本月中途才开始记录。

### 三、用户是否回来（全部活跃用户）

回答“用户有没有留下来”。数据来自 `user_lifecycle`、`activity` 和 `installation_retention`。

- 开头一句：本月月活跃用户多少、比上月增减多少，上月活跃用户中多少比例本月继续使用。
- 核心指标：月活跃用户（附比上月变化）、上月用户本月留存、新用户次日回访、日活/月活。
- “本月活跃用户从哪里来”分布条：上月也活跃的老用户 / 本月首次活跃的新用户 / 之前流失、本月回来，三者互斥且合计等于月活跃用户；下方写一行“上月活跃、本月没来：N 位”。只在 `composition_complete` 为 true 时展示。
- “本月使用频率”分布条：只活跃 1 天 / 2–3 天 / 4–7 天 / 8 天及以上，放在 6 个月表之前。
- “近 6 个月”表：月份、月活跃用户、上月用户留存、新用户次日回访（按安装月份）、新用户下个月仍活跃（按安装月份）。未成熟的值写“观察期未满”，不写 0。
- 不展示第 7 天、第 30 天回访率。
- 数据说明：活跃 = 登录状态下使用 App 至少 5 秒；次日回访 = 安装后第二天再次打开 App；“首次活跃的新用户”按活跃事件首次出现判断，与第一章的新安装口径不同。

### 四、哪里出了问题（全部用户）

回答“什么坏了，有没有变好”。数据来自 `reliability`、`ai_failures` 和 `login_funnel`。

- 开头一句：本月 AI 失败影响多少用户、比上月增减多少，最主要的问题是什么；登录出错影响多少用户。
- 核心指标：AI 失败影响用户（附比上月变化）、AI 任务拆解成功率（附比上月变化）、点击继续后登录成功比例、登录出错影响用户。
- “AI 失败：用户遇到了什么问题”表：按 `reliability.ai_failures_by_problem` 展示问题（AI 没有生成可用任务 / 网络问题 / 麦克风权限被拒绝 / 录音没能开始或提交 / 其他）、失败事件、受影响用户、比上月。不在正文放阶段 × 错误码表。
- “AI 任务拆解”表：上月、本月、变化三列，行是使用用户、成功率、平均耗时。只有平均耗时时，不写典型或较慢请求等待时间，不设定没有依据的性能目标。
- 登录：用分布条展示点击继续但没登录成功的用户（所有用户，按人，互斥）：只是自己关闭了登录页 / 遇到登录出错 / 没有记录到结果，分母是点击继续的用户（`login_funnel.started_users`），只在 `exit_only_user_ratio` 等比例不为 null 时显示比例。不放完整登录漏斗两张表，不放登录错误码表。
- 不展示 AI 失败周分组表或周趋势图。
- 数据说明：失败事件没有统一的尝试编号，不计算失败率；自己关闭登录页不算出错；登录页在退出登录后也会出现，这里包含老用户。

### 五、本月决策

- 只保留能够影响优先级的问题，默认最多 4 项。
- 每个问题依次说明“用户影响”、“证据边界”、“产品动作”和“下月验证”。
- “下月验证”优先使用当前已可追踪指标。需要新埋点或新分母的验证项标明为“完善数据后验证”，不把它写成当前已可追踪的结果指标。
- 结尾重申中文决策标签、主要原因和按优先级排序的下月动作。

### 数据附录

- 将支持对账但不需要占据决策主体的内容放入附录。
- 展示 PM 关键事件的当前月数量、用户、首次和最后出现时间。
- 可以放入 AI 任务生成的平均轮次、每次会话生成任务和笔记数，以及 AI 失败的阶段 × 错误码表，供工程排查。
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

新用户安装后 7 天内的登录使用两张表格（数字为示例）：

```html
<h3>安装后 7 天内（按人）</h3>
<div class="table-wrap">
  <table>
    <thead><tr><th>步骤</th><th>用户数</th><th>占新安装用户</th></tr></thead>
    <tbody>
      <tr><td>新安装</td><td>147</td><td>基准</td></tr>
      <tr><td>点击继续登录</td><td>137</td><td>93.20%</td></tr>
      <tr><td>登录成功</td><td>96</td><td>65.31%</td></tr>
    </tbody>
  </table>
</div>
<div class="table-wrap">
  <table>
    <thead><tr><th>点击继续但未登录成功（按人）</th><th>用户数</th><th>占点击继续的用户</th></tr></thead>
    <tbody>
      <tr><td>只是自己关闭了登录页</td><td>30</td><td>21.90%</td></tr>
      <tr><td>遇到过登录出错</td><td>2</td><td>1.46%</td></tr>
      <tr><td>没有记录到结果</td><td>9</td><td>6.57%</td></tr>
    </tbody>
  </table>
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

趋势图使用空占位组件；不在 AI 生成的 fragment 中写 SVG、坐标、颜色或数据点。当前报告结构不使用趋势图：`retention-trend` 绘制的第 7 天回访和 `failure-trend` 绘制的周分组都已从报告中移除。渲染器仍支持以下占位，供以后需要时使用：

```html
<div class="retention-trend"></div>
<div class="failure-trend"></div>
```

- `retention-trend` 只绘制截至目标月已成熟的次日和第 7 天回访，最多展示最近 6 个安装月份。
- `failure-trend` 只绘制目标月的 AI 失败事件周变化；埋点启用当周和月末不完整周使用星号标记。
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
