# AI Coach 评测

评测对象是当前的自然对话、草稿工具、日程查询和用户确认保存流程。评测不依赖对话阶段、策略枚举、Evidence 引用或固定回复。三个模式共享一套执行链路。

首轮执行结果和已发现的质量问题见 [新评测基线](ai-action-coach-evaluation-baseline.md)。

## 执行层

- `DraftWorkflowTests`：草稿原子更新、ID、并发、所有权、事务、幂等、取消和过期结果。
- `ScheduleBoundaryTests`：真实数据库日程查询、半开区间、虚拟重复实例、草稿内冲突、用户隔离、截断、重复任务检查范围、确认时冲突 token、start-now、真实 Reader 故障和日期范围上限。
- `CoachLiveTests`：真实模型的自然回复、历史改期和摘要连续性冒烟检查。
- `CoachScenarioTests`：真实 Azure 模型经过 `ConversationApplication`、真实配额/usage 服务、任务 Reader、ScheduleChecker、Store；编辑和保存经过实际 command handlers。每个案例使用 DataSeeder 创建独立用户和订阅，不读取个人任务数据。

集成测试遵循 `.claude/skills/writing-tests/SKILL.md`，使用 xUnit、FluentAssertions、DatabaseFixture 和 SQL Server Testcontainers，没有模拟模型输出或模拟数据库。固定场景时钟为 2026-10-01 08:00 Australia/Perth。会话缓存有效期和配额月份仍使用应用实际时钟。

## 模型场景

| ID | 行为 |
| --- | --- |
| listen × 三种模式 | 分享且明确不提问、不建议、不建卡；无需日程读取 |
| advice | 接受建议但明确推迟草稿 |
| accept | 从探索、推迟转为明确授权创建 |
| invitation | 接受行动建议不等于建卡；之后接受生成草稿 |
| content | 直接交付比较和推荐，不重复邀约 |
| defaults | 用户委托排期时补齐暂定时间 |
| unscheduled | 明确要求日期和时间留空 |
| recurring | 重复请求保持 recurrence，日程结果只承诺 partial |
| calendar | 真实调用 list_tasks 后回答已有安排 |
| conflict | 用户明确指定的冲突时间保持不变 |
| two-drafts | 新话题创建独立草稿，保留第一张 |
| edit-save | 自然语言改期、App 手动改标题、再次模型修改、确认保存和重放 |

共 14 个展开后的应用场景。工具调用检查读取实际 gateway 记录，不使用 `TaskContextRead` 推断是否调用过 `list_tasks`。

## 运行

需要 .NET 10；数据库测试还需要 Docker。容器数据库由既有 fixture 初始化，不需要生成或应用项目迁移。

```sh
# 数据和操作边界，不调用模型
AICOACH_MODEL_TESTS=0 dotnet test blotztask-test/BlotzTask.Tests.csproj \
  --filter 'FullyQualifiedName~DraftWorkflowTests|FullyQualifiedName~ScheduleBoundaryTests'

# 新应用场景；调用真实部署，有实际 token 消耗
AICOACH_MODEL_TESTS=1 AICOACH_EVAL_RUNS=1 dotnet test blotztask-test/BlotzTask.Tests.csproj \
  --filter FullyQualifiedName~CoachScenarioTests

# 模型冒烟（包含摘要压缩）
AICOACH_MODEL_TESTS=1 dotnet test blotztask-test/BlotzTask.Tests.csproj \
  --filter FullyQualifiedName~CoachLiveTests

# 稳定性：每个应用场景重复三次；某次失败后仍记录后续重复
AICOACH_MODEL_TESTS=1 AICOACH_EVAL_RUNS=3 dotnet test blotztask-test/BlotzTask.Tests.csproj \
  --filter FullyQualifiedName~CoachScenarioTests
```

`AICOACH_EVAL_RUNS` 接受 1–10。未显式启用真实模型或缺少本地 Azure 配置时，模型测试为 skipped，不算通过。凭据读取沿用 `CoachLiveSettings` 的本地 development 配置，不写入报告。每次应用场景运行在教练对话结束后额外调用一次同一 Azure 部署作为独立 AI 评审，产生额外 token 消耗；评审不修改对话或草稿。

## 结果和复核

应用场景每次重复写一个 JSONL 文件至：

`blotztask-test/TestResults/ai-coach-evals/<run-id>/<case>-<repetition>-<unique-id>.jsonl`

xUnit 输出完整路径。文件记录 commit、AI Coach 实现和评测源码 SHA-256 指纹（包含未跟踪源码）、prompt/tool 版本、部署、预算、场景时钟、每轮消息、真实 provider 请求/响应、工具结果、草稿前后快照、App 事件、最终数据库任务、usage 和耗时。`aiEvaluation` 另记评审版本、每轮 0–5 分、是否通过、具体问题与理由、总体判断、原始评审输出和评审 token 用量。总体分数取各轮最低分，总体是否通过由各轮结果合取，避免模型汇总字段不一致。凭据不记录；合成对话原文会记录，产物保持 gitignored。来源指纹只覆盖 AI Coach 和评测 C# 文件，不代表整个仓库依赖树。

客观断言与语义质量分开：

- `objectiveStatus=passed/failed`：卡片数量、字段、ID、真实工具调用、正式任务写入等程序可验证结果。
- `aiEvaluation.Status=completed/unavailable`：独立模型根据 `reviewCriteria`、逐轮回复、草稿和实际工具结果给出初步语义评审；输出结构不完整、模型调用失败或无可评轮次时为 `unavailable`，报告仍保留。判断见 `aiEvaluation.Verdict`。
- `semanticStatus=needs_review`：AI 评审尚未用人工标注样本校准，因此评审的 `OverallPassed` 是辅助判断，不自动作为质量通过或发布结论。人工仍需核查 AI 指出的问题和遗漏。
- 评审使用当轮真实模型请求中的工具结果；会话历史里的 `list_tasks` 结果为了避免长期保留任务细节而已被脱敏，不能作为日程事实依据。实际运行发现评审仍可能误解相对日期、草稿状态或漏看不存在的草稿，需对照原始回复和草稿快照复核理由。
- 复核回复是否遵守用户最新限制、准确说明草稿未保存、日期和时间匹配、默认排期标注暂定、冲突和部分检查被正确说明、没有编造目标、没有循环邀约。
- 客观失败不能被语义评分抵消。无报告、环境失败和 skipped 都不能算通过；一次通过不表示稳定性达标。

## 范围与后续扩展

本套覆盖后端实际应用流程；不声称覆盖移动端点击交互或 HTTP 中间件。AI 评审读取测试中的合成对话，仍需人工校准和复核。摘要冒烟仍在 `CoachLiveTests`，不自动生成应用场景 JSONL。模型对日程查询故障的表述、摘要后撤回授权、跨夏令时边界和中文以外的语言需要后续专门扩充；不要把这些缺口解读为已验证。

日程检查是确认时的建议性检查，不是对整个任务系统的原子时间预订。会话与确认回执仍在内存中；测试不承诺跨进程重启的持久幂等性。
