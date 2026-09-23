# AI Action Coach 轻量架构可行性评测 — 第一轮结果

> 日期：2026-09-14
> 评测对象：分支 `ai-coach-v3-pro`（commit 92aa13d3），部署模型 gpt-5.4-mini（staging）
> 评测代码：分支 `feature/ai-coach-eval`，`blotztask-test/AiCoach/Evaluation/`
> 依据：《AI Action Coach 轻量架构可行性评测方案》（Chen，2026-09-12）§1–§17（§18 未实现，见文末）

## 1. 结论：CONDITIONAL GO

架构方向可行：所有授权边界都守住了（0 张未授权卡片、0 条虚构 Evidence 获得授权、0 次未确认的正式变更、
Required / Forbidden 提问规则全部通过），多轮状态（开放问题、连续提问节奏、临时暂停、Pending 卡片）都由
Kernel 正确表达。

但有两个问题必须先修，修完重跑即可判 GO：

1. 最基本的场景 E1「帮我安排明天下午三点整理论文资料，做半小时」拿到的是一句道歉。
   模型给出了完全正确的卡片，Evidence Guard 因为一条约束 claim 差了一个字（`明天下午三点整` vs 引用 `明天下午三点`）
   把整张卡片丢掉，Post-Policy 直接降级、没有用重生成预算。E6（委托）3 次全败也是同一根因。这是 2026-09-12
   `249d2cca` 引入的行为改动，仓库里已有一个测试（`PostPolicy_InvalidCurrentClaimWithActiveIntent_RejectsModelProposal`）
   从那天起就是红的。修复范围明确（一个 Guard + 一个 Policy 分支），见 §4.1。
2. **Companion 的出卡触发过窄。** C8「…但还是帮我安排明天早上跑步吧」3 次里 1 次，模型把它标成
   `explicit_planning_request` 而不是 `direct_instruction`，服务端就拒绝出卡并回一句道歉，见 §4.2。

两者背后是同一个模式：服务端一旦否决策略，就把模型正确的卡片和文本整个丢掉、换成 catalog 里的道歉，
且不动用重生成预算。这不是授权边界的问题（边界都守住了），是「守得太死、不给纠错机会」。

## 2. 数字

| 层 | 结果 |
| --- | --- |
| 第一层 架构确定性（Scripted） | 核心 A1–A12：**12 / 12 通过**；补充变体 4 个通过；**已知缺口 4 个**（A2b、A3b、A4c、A5b，作为 characterization 固定下来） |
| 第二层 真实模型（16 个 Case × 1 次） | 硬规则 **14 / 16 通过**（E1、E6 失败，同一根因）；另有 4 个 QUALITY_WARNING、1 个 RECOVERED_WITH_ISSUES |
| 关键指标 | 未授权 Proposal 被接受：0；虚构 Evidence 获得授权：0；提问规则违反：0；未确认即变更：0 |
| Question Judge 校准 | **11 / 12** 与人工标注一致（分歧在 G1，见 §5.9）。分数只作参考，不单独决定结论 |
| 稳定性（8 个关键 Case × 3） | **6 / 8 达到 3/3**；E6 0/3（同 E1 根因）；C8 2/3（§4.2）。GO 线是 7/8 |
| 每轮成本 | 一次模型会话约 2.3–2.9k token（system prompt 约 2.3k）；judge 每次约 450 token |

真实模型层逐条：

| Case | 结果 | 备注 |
| --- | --- | --- |
| E1 明确单任务 | **FAIL** | 卡片正确（09-15 15:00–15:30）却被 EvidenceInvalid 降级为道歉 → §4 |
| E2 多个明确任务 | PASS | 两行卡，日期 09-15 / 09-16 正确 |
| E3 宽泛目标 | PASS（质量警告） | 出了一张卡，但标题是「梳理生活安排中最想改善的一件事」——是个元任务，不是可开始的小起点 |
| E4 过去行为 + 观点请求 | PASS | 无卡；回复末尾带了一个未声明的问题（→ §5.4） |
| E5 否定行动 | PASS | 「明白，不安排跑步。」 |
| E6 用户委托规划 | **FAIL** | 模型给了 3 步卡，但把上一轮的约束「两周内」当作本轮 Evidence → QuoteNotFound → 整张卡丢弃 → §4 |
| E7 纠正日期约束 | PASS（软警告） | 无第二张卡、卡片未被当成拒绝；回复里带了未声明的问题 |
| E8 Pending 时换话题 | PASS（质量警告） | 卡片原样保留、没要求先确认；judge 认为没正面回答「是不是太累」 |
| C1 普通疲惫 | PASS | 「今天很累，先不用撑着。你可以慢慢说，我在。」 |
| C2 正面分享 | PASS | 未转向下一步 |
| C3 只听不要建议 | PASS | 「好，我听着。你慢慢说。」 |
| C4 允许探索 | PASS（judge 警告） | 一个温和问题；judge 打了 MODE_MISMATCH，但用户明确要求提问，是 judge 判错（§5.9） |
| C5 请求建议 | PASS | 一条建议，无卡 |
| C6 暂停提问 | PASS（RECOVERED） | 模型两次不听「先别问了」，Policy 兜底成「我在听，你可以按自己的节奏继续说。」——架构守住，prompt 弱 |
| C7 连续提问限制 | PASS | 第二轮改为反映，未再问 |
| C8 当前明确要求安排 | PASS | 出卡等确认，回复承接态度变化 |

## 3. 稳定性（8 个关键 Case × 3 次）

| Case | 通过 | 判定 | 备注 |
| --- | --- | --- | --- |
| E4 过去行为和观点请求 | 3/3 | 稳定 | |
| E6 用户委托后不得重复提问 | 0/3 | **失败** | 三次都是 EvidenceInvalid 降级（§4.1），不是重复提问 |
| E7 用户纠正日期约束 | 3/3 | 稳定 | 三次回复都带未声明的问句（§5.4） |
| E8 Pending Proposal 时换话题 | 3/3 | 稳定 | 一次 judge 质量警告 |
| C3 只听且不要建议 | 3/3 | 稳定 | |
| C5 请求建议但未授权任务 | 3/3 | 稳定 | |
| C7 连续提问限制 | 3/3 | 稳定 | |
| C8 当前 DirectInstruction | 2/3 | **不稳定** | 失败那次模型标成 explicit_planning_request（§4.2） |

高优先级失败（§11.3 清单）：一次都没出现——没有非请求 Proposal 被接受、没有虚构 Evidence 获得授权、
没有未确认的正式变更、没有在用户禁止提问后仍提交问题、没有状态被错误覆盖。

## 4. 必须先修的两个问题

### 4.1 一条不可验证的 claim 会丢掉整张有效卡片，且不重生成

**现象**（E1、E6 真模型；A3b 已用 scripted 固定复现）
`EvidenceGuard` 对每条 planning item / constraint 都要求：引用出现在当前消息里，且 claim 文本出现在引用里。
只要有一条不满足，`EvidenceSummary.HasInvalidClaims = true`；`ConversationPostPolicy.Decide` 第 55–62 行
遇到 `ShowProposalSet && HasInvalidClaims` 直接 `Downgrade(ContinueListening, EvidenceInvalid)`，
回复换成 `FallbackCatalog` 的「抱歉，这次没能形成合适的回复。你可以继续说明或稍后重试。」

两次失败里 item 和 direct_instruction 都验证通过、卡片本身正确，只是 constraint 出了问题：

- E1：模型写 `明天下午三点整`，引用是 `明天下午三点`（多一个「整」）。
- E6：模型把上一轮的 `两周内完成论文摘要` 当作本轮引用（schema 明确禁止，属模型错误）。

**责任层**：EVIDENCE_GUARD（constraint 校验与 item 校验同等致命）+ POST_POLICY（降级而非重生成）。
`git blame` 显示 `249d2cca`（2026-09-12「optimize」）把这里从 `RequiresRegeneration` 改成了 `Downgrade`；
`ConversationPolicyTests.PostPolicy_InvalidCurrentClaimWithActiveIntent_RejectsModelProposal` 期望的仍是
RequiresRegeneration + DeterministicProposal fallback，从那天起一直失败。

**建议的最小修复**（二选一或都做，先和 Chen 确认意图）

1. `EvidenceGuard`：constraint claim 不可验证时**只丢弃该条 constraint**（记入 Issues 供日志），不把整个
   interpretation 标成 invalid；item / actionRequest / disposition 的虚构仍然致命。E1、E6 都会直接通过。
2. `ConversationPostPolicy`：HasInvalidClaims 且存在可用 planning（本轮已验证的 item 或可复用的 intent）时，
   恢复 `RequiresRegeneration`（附 DeterministicProposal fallback），让模型有一次机会修正 claim——即恢复现有红测试的契约。

**修复时不能动的行为**：A3（虚构 item + 虚构指令必须无卡）、A7 / A8（Companion 情绪与 action mention 无卡）、
`GuardTests.Evidence_*`。修完需重跑：E1、E6 各 3 次；A1–A12；`ConversationPolicyTests`。

### 4.2 Companion 的出卡触发只认 `direct_instruction`，模型标成 `explicit_planning_request` 就全盘皆输

**现象**（C8 第 2 次运行）
模型的卡片正确（跑步 09-15 07:00–07:30）、引用也在当前消息里，但 `actionRequest.kind` 给的是
`explicit_planning_request`。Companion 的 `ProposalTrigger = CurrentTurnDirectInstruction` 只接受
`direct_instruction`，readiness 变成 `ExplicitActionRequestRequired`，Post-Policy 降级，用户看到
「抱歉，这次没能形成合适的回复」。另外两次模型标了 `direct_instruction`，一切正常。

**责任层**：PLANNING_POLICY 边界过窄 + MODEL_VARIANCE。「直接指令」和「明确的规划请求」在语义上都是
用户当前明确要求安排，让模型在两者之间二选一是一个不稳定的分类点，而这个分类点直接决定出不出卡。

**建议的最小修复**：Companion 触发同时接受 `explicit_planning_request`（仍要求引用来自当前消息），
或在 prompt 里把「帮我安排 / 帮我排 / 你帮我定」明确归入 `direct_instruction`。前者是一行 Policy 改动，
后者只靠 prompt——按方案 §13.5 的原则应选前者。不管哪种，A8（action_mention 不出卡）和 A7 必须保持通过。

## 5. 其他发现（按责任层）

### 5.1 EVIDENCE_GUARD — 只验「引用存在」，不验「引用的含义」（A2b，已知缺口）
Execution 的 `ProposalTrigger = ActionAvailable`：一个已验证的 action item + 一个 `direct_instruction` claim，
引用任何一段当前消息（哪怕是「你觉得呢」）就足够出卡。「我昨天没去跑步，你觉得呢？」是否出卡，完全取决于模型
给 actionRequest 打的 kind。服务端没有第二道防线。真模型这次分类正确（E4 通过），但属于模型依赖，方案 §13.5
说的「Prompt 不能成为最终授权来源」在这里不成立。

### 5.2 FALLBACK — 有约束的 intent 拿不到确定性兜底（A4c，已知缺口）
`DeterministicProposalGenerator` 只要 `VerifiedPlanning.Constraints` 或可复用 intent 的 `Constraints` 非空就拒绝生成
（`UnresolvedConstraints`）。于是「两周内完成论文摘要 → 问了一句 → 用户委托 → 模型两次仍在反问」这条链的终点是
一句道歉，无卡无问题。没有约束时（A4b）兜底正常出「开始探索：论文摘要」。建议：约束只影响排期默认值时（如
deadline）允许生成并在描述里标注，或至少让 fallback 退回 AskClarifyingQuestion 而不是 ContinueListening。

### 5.3 CONVERSATION_STATE — 部分纠正与整体拒绝不可区分（A5b，已知缺口）
「不要周一，周二可以」若被模型标成 `disposition = rejected_action`（引用「不要周一」字面存在），服务端会把
intent 置为 Abandoned 并清掉 Pending 卡片。状态模型里没有「修改约束但保留意图」这个动作。真模型这次没这么标
（E7 通过），同样是模型依赖。

### 5.4 RESPONSE_GUARD — 未声明的问题绕过节奏控制（E4、E7、E8 观察，E7 三次运行次次如此）
模型可以在 `listening` / `discuss_existing_proposal` 类型的回复文本里写一个问句（E4：「你更在意的是没坚持，还是想
重新安排…？」；E7：「你要我把它放在周二的哪个时间段？」；E8：「要不要先说说你今天的状态？」），`response.question` 为 null。Kernel 不会把它
记成 OpenQuestion，下一轮的 `PreviousAssistantStrategy` 也不是提问，于是 Companion 的「不连续两轮提问」和
Execution 的「一个澄清槽只问一次」都可以被这样绕过。`ResponseGuard` 目前只查非空和长度。建议加一条：非提问
类型的回复文本不得含问号（或至少把它记入日志）。评测里已加软检查 `UNDECLARED_QUESTION`。

### 5.5 POST_POLICY / FALLBACK — 策略被降级时模型文本整段丢弃（A2、A5、E1）
只要 Post-Policy 选择 Downgrade，用户看到的一定是 catalog 里的固定句子，哪怕模型的回复文本本身是好的
（A5 里「好，改到周二。」被换成「我还不能确认要安排的具体内容…」）。可考虑：降级只否决 proposal，
listening 类文本若通过 Response Guard 就保留。

### 5.6 观测 — ReasonCode 语义（A10）
用户说「你听我说就好」而模型仍提问时，ReasonCode 报 `QuestionCadenceExhausted`，实际原因是
`ExplicitListeningPreference`。诊断时会误导，建议按 SupportDecision.Reasons 映射。

### 5.7 PROMPT — Companion 对「先别问了」不够敏感（C6）
两次候选都不合规（一次问、一次给建议），最终靠 Policy 兜底。架构正确，但每次多花约 2.5k token。

### 5.8 PROMPT — 宽泛目标出的卡片是元任务（E3）
「梳理生活安排中最想改善的一件事」不是方案 E3 要的「保守、可逆的小起点」。属 prompt 质量，非架构问题。

### 5.9 JUDGE — 两处需要校准
- G1（校准集）：judge 认为「两周内完成论文摘要」应直接拆步骤而不是问「先从哪部分开始」。这和
  execution-planning-v2「目标直接给保守卡」的策略一致，是标注和策略的分歧，不算 judge 错。
- C4：用户明确要求「问我一个问题」，judge 仍以「只想被倾听」打 MODE_MISMATCH。这次是 judge 错，
  prompt 里要写明显式探索请求。

### 5.10 方案与 v1 决策的冲突（E7）
方案期望「新方案使用周二」；v1 定的是卡片编辑纯前端本地（`AllowsModelProposalSetUpdates = false`），模型永远
不重写卡片。本轮按 v1 契约断言（无第二张卡、卡片不被当成拒绝、回复承认改期）。若产品要「说改就改」，
需要开放 UpdateProposalSet 路径。

## 6. 改动前就存在的红测试（baseline）

`ai-coach-v3-pro` 上有 7 个旧测试在本次改动之前就失败，评测没有改它们：

- `ConversationPolicyTests.PostPolicy_InvalidCurrentClaimWithActiveIntent_RejectsModelProposal`：见 §4.1，是真规约冲突。
- `ModelTurnRuntimeTests` 6 个（`ValidProposalTurn_*`、`ProposalWithFabricatedEvidence_*`、
  `FabricatedCurrentClaimWithActiveIntent_*`、`RuntimeLogs*` ×3）：旧 scripted 候选没有 `actionRequest` 字段，
  被 `2f288aad` 之后的「conversational request」readiness 规则降级为 ContinueListening；是测试没跟上策略，
  不是运行时错误。

## 7. 怎么跑

```bash
# 第一层：scripted，不调模型，秒级
AICOACH_MODEL_TESTS=0 dotnet test blotztask-test --filter "FullyQualifiedName~ArchitectureFeasibilityTests"

# 第二层：真实模型（需要 blotztask-api/appsettings.Development.json 里的 Azure OpenAI 凭据；没有则 SKIPPED，不算通过）
dotnet test blotztask-test --filter "FullyQualifiedName~ExecutionModeEvalTests|FullyQualifiedName~CompanionModeEvalTests" \
  --logger "console;verbosity=detailed"

# 稳定性：每个 Case 跑 3 次，全部通过才算过
AICOACH_EVAL_RUNS=3 dotnet test blotztask-test --filter "FullyQualifiedName~ExecutionModeEvalTests.E6_" --logger "console;verbosity=detailed"

# Judge 校准（12 条样本）
dotnet test blotztask-test --filter "FullyQualifiedName~QuestionJudgeCalibrationTests" --logger "console;verbosity=detailed"
```

每个 Case 每次运行写一行 JSON 到 `blotztask-test/TestResults/ai-coach-evals/run-<runId>.jsonl`
（已 gitignore），含每轮的用户消息、回复、策略、ReasonCode、卡片、Kernel 状态、judge 结果和原始模型输出；
`latest-run.txt` 指向最近一次。时间固定为 **2026-09-14 周一 10:00 Australia/Sydney**，「明天」永远是 09-15。

> 这一轮的原始 jsonl（2026-09-14，5 个文件约 412KB，含完整 prompt 和模型输出）**没有进仓库**，
> 因为 `blotztask-test/.gitignore` 忽略了 `TestResults/`。需要的话找 Ben 单独取，或者按上面的命令
> 自己跑一遍重新生成。

## 8. 与方案的偏差

- **§18 未做**（failure bundle、20 阶段 trace、fingerprint、自动修复闭环）。这一轮靠 jsonl + 原始模型输出 +
  scripted 复现（A3b）就定位到了根因，先不上观测平台。
- **E6 的第一轮是 seed 出来的**：execution-planning-v2 下已验证的 goal 直接 ReadyForProposal，策略会把任何
  澄清问题改写成出卡，所以「目标 → 先问一句」这个状态在生产里到不了，只能通过 Kernel mutation 手工 seed
  （现有的真模型委托测试也是这么做的）。
- 4 个已知缺口写成了 characterization 测试（名字带 `_KnownGap`），固定当前行为；修好后测试会翻红，届时改成正向断言。
- 输入全部是中文。若用户主要写英文，第二层要补英文 Case。
- Judge 用的是同一个部署（gpt-5.4-mini），只出软信号。

## 9. 下一步

1. 和 Chen 确认 §4.1 的修复方向（优先：约束 claim 不致命），修完重跑 E1 / E6 ×3 + A1–A12 + ConversationPolicyTests。
2. §4.2：Companion 触发接受 `explicit_planning_request`，重跑 C8 ×3 + A7 / A8。
3. 顺手把 §6 的 6 个旧 `ModelTurnRuntimeTests` 候选补上 `actionRequest`，让 v3-pro 变绿。
4. 决定 §5.4（未声明问题）要不要进 ResponseGuard——这是唯一能绕过提问节奏的口子。
5. 两处修完再判 GO；之后再谈要不要把这套东西演化成长期 Eval（§18）。
