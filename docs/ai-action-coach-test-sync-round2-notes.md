# AI Action Coach 测试架构同步（2026-09-20）—— 结果与给 Chen 的问题清单

基线：`ai-coach-v3-pro` @ `e03b16f9`（feat: implement Clarify mode，09-19）
工作分支：`feature/ai-coach-eval` @ `959a4a11`（已 rebase 到 e03b16f9；已随 PR #546 合入 `ai-coach-v3-pro` @ `6017b56b`）
运行方式：`AICOACH_MODEL_TESTS=0 dotnet test --filter FullyQualifiedName~AiCoach`（脚本化层，不打真模型）

结果：**202 个测试，187 过、15 红**。15 红 = Chen 自己的 13 个 + 评测套件里两个「故意保持红」的缺陷证据（A4b、A13）。

---

## 一、评测套件这次做了什么

| 改动 | 内容 |
| --- | --- |
| 编译对齐 | `PlanningReadinessCalculator` → `PlanningAuthorityCalculator`；harness 的 prompt/mode 注册补齐 Clarify，与 `DependencyInjection` 一致 |
| schema 6 | 脚本化候选支持 `interpretation.planningReferences`、`actionRequest.referencedItemKey`、`proposalSetMutation` |
| Clarify 脚本化契约 | 新增 A13–A18b 共 8 个：首问与预算、上下文完整出暂定卡、两问用尽转暂定卡、空材料不造目标、planningReference 选项、未知 key fail-closed、原地改卡、歧义只澄清 |
| Clarify 真模型评测 | 新增 `ClarifyModeEvalTests` L1–L8，与 Execution/Companion 同结构（本轮**只写不跑**） |
| 语义跟进 | A3/A3b 按「来源校验暂停」重写，新增 A3c；A11/A11b + C7 按「cadence 是软偏好」重写；E7 改为期望 `UpdateProposalSet` |

## 二、两个需要 Chen 定的缺陷（测试故意保持红）

### D1 — Clarify 问不出第一个问题（`A13`，对应 live `L1`）

开场消息没有 `actionRequest`、`disposition` 为 `not_applicable`、上下文还不足以出草稿时，
`PlanningAuthorityCalculator` 的 `unrequestedNarration` 判定成立，直接返回
`CurrentRequestIsConversational` + `Clarification = NotAllowed`；Post-Policy 于是把
`AskClarifyingQuestion` 降级成 `ContinueListening`，用户收到的是那句罐头道歉
「抱歉，这次没能形成合适的回复」。

- **带不带 goal 都一样**（`A13b` 记录了两种开场形态，都是 `PlanningQuestionNotAuthorized`）。
- 第一问之后的一切都是好的：`A15` 把「两问用尽 → 暂定卡」seed 出来就能跑通。
  也就是说 Clarify 需要的状态目前只能靠 seed 进入，真实对话进不去。
- 影响面：Clarify 模式的主职能。建议优先级最高。

### D2 — 用户委托后模型重复提问，卡片兜底没了（`A4b`，对应 live `E6`）

`38e8b80e` 删掉了 Post-Policy 里「未授权的规划提问 → `RegenerateProposal(ActionableIntentRequiresProposal)`」
这条分支。现在重复提问走 `RegenerateResponse(ClarificationSlotAlreadyAsked)` → `ContinueListening`，
确定性兜底卡片不再产生，用户只拿到一句道歉。

- 和 Ben 2026-08-24 定的规则冲突：**用户以任何措辞把决定权交给 AI ＝ 直接建卡，且不许重复同一句问题**。
- `e03b16f9` 补了 `Proposal == Required → RegenerateProposal(RequiredProposalMissing)`，
  但只覆盖 Clarify 的「澄清耗尽」；Execution 的委托是 `Optional`，所以不触发。
- `A4` 里还记了一个软信号：重生成指令现在写的是 `continue_listening`，不再是 `show_proposal_set`。

## 三、需要确认、但先按现状记录的三件事

1. **来源校验暂停的连带效果**（`A3`，已知缺口）
   `Guards.TryVerifyQuote` 里的 quote-in-message 检查整段注释掉了（文档 §1.1.2/§14.1 写明是 09-15 的
   有意临时决策）。后果：模型编一句用户没说过的话当 evidence 也能出卡——
   「我最近有点累」＋ 虚构的 `direct_instruction: "帮我安排明天跑步"` → 正常出卡。
   `referenced_instruction` 不受影响（走 `TryVerifyCurrentMessageQuote`，`A3c` 盯着）。
   **顺带**：上一轮的阻塞 1（E1/E6 丢卡，`A3b`）现在「好了」，但是因为 quote 不再校验，
   不是因为 249d2cca 的 downgrade 路径被修了。**来源校验一打开，E1/E6 会原样复发**，
   `ConversationPolicyTests.PostPolicy_InvalidCurrentClaimWithActiveIntent_RejectsModelProposal`
   还留着旧行为的断言。

2. **Companion 连续提问已从硬规则变成软偏好**（`SupportDecision`：cadence「do not veto a useful response」）
   —— Ben 2026-09-20 确认接受现状。评测已按此改（A11、C7）。
   但 `A11b` 记录了一个缺口：**连上一轮的原句都能原样再问一遍**，服务端不拦。
   Kernel 里有 `PreviousAssistantQuestion`，加这条检查成本很低。Execution 不受影响（有 asked topic）。

3. **Chen tip 上的 13 个红测试**（都在他自己的测试里，不是评测引入的）
   `GuardTests` 4、`ModelTurnRuntimeTests` 4、`ConversationPolicyTests` 3、
   `CompanionPolicyTests` 1、`CompanionModeRuntimeTests` 1。
   绝大多数是「断言还停留在来源校验开着 / cadence 是硬规则」的旧预期，
   跟 D1/D2 不是一回事，属于跟着设计变更一起更新的活。

## 四、下一步

- 等 D1/D2 有结论后再跑真模型评测（`AICOACH_EVAL_RUNS=3`），一次跑完 A + E + C + L 四套出报告。
- L1 会红到 D1 修完为止；E6 会红到 D2 修完为止，这是预期。
