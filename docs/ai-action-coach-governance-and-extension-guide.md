# AI Action Coach 架构治理与规则扩展指南

> 状态：Accepted  
> 创建日期：2026-09-03  
> 适用范围：`blotztask-api/Modules/AiCoach/`、相关客户端 Contract、相关测试和后续 AI Action Coach 功能开发  
> 文档性质：后续 Agent 和开发者必须遵守的架构总约束与演进方案  
> 上位设计：`docs/ai-action-coach-technical-design-v3.md`  
> 相关决策：`docs/adr/0001-multi-signal-interpretation-layer.md`

## 1. 文档目的

本文档解决的不是某一个对话案例，而是 AI Action Coach 在持续增加产品行为时如何避免以下问题：

- 每修复一个模型行为，就增加一组布尔字段、枚举、Prompt 条款和 `if` 分支。
- 同一条规则同时出现在 Prompt、Runtime、Pre-Policy、Post-Policy、Guard 和 Kernel。
- Runtime、Policy 和 Kernel 都可以改变最终策略，导致决策权不唯一。
- 模型理解结果被直接当作用户事实或业务授权。
- 产品偏好被错误地固化为持久化领域状态。
- 为了减少确定性代码而把权限、确认、并发或正式副作用交给模型。
- 规则表面上被删除，实际上迁移到不可审计的 Prompt 中。

核心目标：

```text
允许模型承担开放语义的复杂性；
让确定性代码只保留少量、稳定、可审计的安全和业务边界；
让每条新增产品规则有唯一归属、明确优先级和有限影响范围。
```

本文档中的“必须”“不得”“只能”是强制约束。后续实现若需要违反，必须先更新技术设计或新增 ADR，不能在代码中以局部例外绕过。

## 2. 总体原则

### 2.1 模型驱动建议，服务端控制权限

模型可以控制：

```text
理解用户表达
识别目标、行动、约束和不确定性
提出下一步对话建议
拆解目标并生成候选 Proposal
选择自然语言表达方式
在允许范围内请求只读能力
```

模型不得控制：

```text
用户是否已经确认
Conversation 的权威 Phase、Version、Facts 或 GenerationStatus
ProposalSet 的所有权、身份、版本或生命周期
是否绕过当前 Pending / Processing Artifact
正式 Task、日历写入、通知、删除或 Focus 是否执行
业务操作是否成功
数据库事务、并发、幂等和迟到结果的处理结论
```

模型输出始终是候选：

```text
InterpretationCandidate  != 已确认用户事实
SuggestedAction          != 已批准策略
ResponseCandidate        != 已发送消息
ArtifactCandidate        != 已持久化 Artifact
ToolCall                 != 已授权操作
模型文本中的成功声明      != 业务成功
```

### 2.2 权威信息必须只有一个所有者

同一决策不得由多个层重复计算或覆盖：

| 权威信息 | 唯一所有者 |
| --- | --- |
| 当前允许暴露给模型的策略和能力 | Pre-Policy |
| 对当前消息的语义解释候选 | Model |
| 引用是否能证明用户说过某事 | Evidence Guard |
| 规划材料是否足以进入下一步 | Planning Readiness Calculator |
| 本 Turn 的最终对话策略 | Post-Policy |
| Proposal 默认时间和确定性补全 | Proposal Generator |
| Candidate 是否满足结构和领域约束 | 对应 Guard / Artifact Handler |
| Conversation 权威状态转换 | Kernel |
| 正式业务副作用是否执行 | 用户 Command + Domain Handler |
| 是否成功提交 | 数据库事务和持久化结果 |

下游层可以拒绝上游结果，但不得重新解释并代替上游所有者作出另一套同类决策。例如 Runtime 可以因超时停止流程，但不得在 Post-Policy 之后自行把 `ContinueListening` 改成 `ShowProposalSet`。

### 2.3 事实、派生决策和配置必须分开

系统中的信息必须归入以下一种类型：

```text
Persisted Fact：跨 Turn 恢复、并发或生命周期真正需要的权威事实。
Verified Interpretation：由模型提出并经 Evidence Guard 验证的当前 Turn 解释。
Derived Decision：根据事实和 Policy 计算出来，不单独持久化的结果。
Versioned Policy：产品允许调整的策略参数。
Candidate Payload：尚未通过 Guard 和 Kernel 的模型候选。
```

不得因为多个模块都需要某个派生结果，就把它复制为多个布尔字段。优先传递一个强类型决策对象。

### 2.4 不追求零规则，追求规则局部化

产品规则会增长。治理目标不是阻止增长，而是保证：

```text
一条普通产品规则只属于一个决策层；
只修改一个 Policy 或 Calculator；
通过少量表驱动测试验证；
通常不修改模型 Contract、Conversation State、Kernel 和 Runtime。
```

如果一条普通产品规则需要同时修改五个以上模块，应视为架构预警，必须先解释为什么现有边界无法承载。

## 3. 标准执行链

开放式 Turn 的目标执行链：

```text
User Message 持久化
  -> Pre-Policy 生成 Strategy / Capability Envelope
  -> Model 生成 Interpretation + SuggestedAction + Candidate Payload
  -> Evidence Guard 生成 Verified Interpretation
  -> Planning Readiness Calculator 生成派生就绪度
  -> Post-Policy 生成唯一 StrategyDecision
  -> Response / Artifact / Domain Guards 验证候选
  -> 可选 Deterministic Proposal Generator 生成安全候选
  -> Kernel 计算 StateTransition
  -> Transaction B 原子提交
```

确定性用户 Command 的执行链：

```text
User Confirm / Reject / Edit / Cancel Command
  -> Ownership / Version / Idempotency Guard
  -> Domain Handler
  -> Kernel / Aggregate Mutation
  -> Database Transaction
  -> Outbox Event
```

明确的 Confirm、Reject、Edit 和 Cancel 不得为了“统一入口”而强制先调用模型。

## 4. 各层职责与权限边界

这是本文档最重要的章节。新增或修改代码前，必须先确定规则属于哪一层。

### 4.1 Transport / Entry Layer

负责：

- 接收 HTTP、SignalR 或后台 Effect 输入。
- 完成基本协议解析、身份上下文传递和请求关联。
- 返回 Snapshot、Command Status 和安全的实时状态事件。

不得：

- 根据用户文本选择 Conversation Strategy。
- 自行推导 `allowedActions`。
- 绕过 Application、Guard 或 Kernel 修改 Conversation。
- 把未提交的模型文本流式发送给客户端。
- 在不同 Transport 中复制业务规则。

新增规则约束：Transport 规则只能处理协议、传输、认证入口和兼容投影，不能承载对话策略或领域规则。

### 4.2 Conversation Application

负责：

- 编排 Transaction A、事务外模型执行和 Transaction B。
- 加载权威 Snapshot 和 Runtime Versions。
- 创建、租用、完成、失败或 Supersede Model Effect。
- 调用各个独立模块，但不替它们作决策。

不得：

- 解释自然语言。
- 内置 Mode 特例。
- 决定 Proposal 是否业务上合理。
- 在 Guard 失败后提交部分 Assistant Message 或部分 Artifact。
- 为某个产品案例修改 Conversation Phase。

新增规则约束：只有流程顺序、事务、Effect、重试和恢复规则可以进入 Application。产品行为不得进入。

### 4.3 Pre-Policy

负责：

- 仅根据已持久化系统事实生成本 Turn 的 `StrategyEnvelope`。
- 控制模型可见的策略、只读 Capability、响应上限和 Proposal 上限。
- 根据 Mode、Phase、当前 Artifact、GenerationStatus 和客户端能力缩小安全空间。

可以读取：

```text
Mode
Phase
GenerationStatus
Conversation Facts
Current Artifact
Open Question / Pending Interaction
Allowed Actions
Runtime Versions
用户权限和客户端协议能力
```

不得：

- 读取或解释当前用户消息。
- 使用关键词、正则或语言分类判断用户意图。
- 接受 Proposal 或创建 Artifact。
- 修改 Snapshot。
- 产生正式业务副作用。
- 为了强迫模型走某条路径而复制 Post-Policy 的最终裁决逻辑。

新增规则约束：只有“基于已知系统事实，本轮哪些能力绝对不应暴露给模型”属于 Pre-Policy。

### 4.4 Model Context Builder / Prompt

负责：

- 把版本化 Prompt Module、Strategy Envelope、最小化 Snapshot 投影和最近消息组装为模型上下文。
- 明确告诉模型候选协议、当前目标、已用预算和安全边界。
- 提供表达、语气和候选生成指导。

不得：

- 成为隐藏 Policy Engine。
- 用 Prompt 声明某个业务操作已经被授权。
- 在 Prompt 中复制所有 Guard 逻辑。
- 将未授权的内部状态、敏感 Memory 或正式写能力暴露给模型。
- 仅通过 Prompt 保证所有权、版本、幂等或正式副作用安全。

新增规则约束：语气、表达格式、候选生成建议可以进入 Prompt；影响权限、状态和业务提交的规则必须在确定性层有权威实现。

### 4.5 Model

负责：

- 对开放式语言进行多信号解释。
- 返回带证据引用的目标、行动、约束、不确定性和用户当前表达。
- 返回一个建议的下一步 Action 和对应强类型候选 Payload。
- 在明确允许时使用只读 Tool。
- 生成自然、符合 Mode 的回复候选。

建议输出形态：

```csharp
public sealed record ModelTurnCandidate(
    InterpretationCandidate Interpretation,
    SuggestedAction SuggestedAction,
    AssistantResponseCandidate Response,
    ArtifactCandidate? Artifact,
    IReadOnlyList<ReadOnlyToolCall> ToolCalls);
```

不得：

- 返回或设置服务端 ID、Version、Status、AllowedActions。
- 宣布用户已经 Confirm。
- 宣布正式业务操作成功。
- 直接决定 Conversation Phase。
- 将历史推断伪装成当前消息中的 `UserExplicit` Evidence。
- 自主增加迭代次数或调用未进入 Envelope 的 Tool。

新增规则约束：只有需要自然语言理解、开放式拆解或表达质量的行为应交给模型。可由结构化事实确定的行为不得为了减少代码而交给模型。

### 4.6 Evidence Guard

负责：

- 验证 Evidence 指向当前 Conversation 中允许的消息或系统事实。
- 验证引用文本确实存在于对应用户消息。
- 将合法模型解释转为 `VerifiedInterpretation`。
- 拒绝模型把推断升级为同意、确认或成功事实。

不得：

- 决定最终 Conversation Strategy。
- 判断某个产品偏好是否应该启用。
- 生成 Proposal。
- 修改 Conversation State。
- 通过重新解释整段自然语言来替代模型。

新增规则约束：只有“证据是否足以证明某个声明”属于 Evidence Guard。不要把“证明了什么之后应该做什么”写进 Guard。

### 4.7 Planning Readiness Calculator

负责：

- 根据持久化规划事实、当前 `VerifiedInterpretation` 和版本化 Planning Policy 计算规划就绪度。
- 明确哪些假设允许由系统采用。
- 给出结构化理由，而不是单一布尔值。

建议输出：

```csharp
public sealed record PlanningDecision(
    PlanningReadiness Readiness,
    IReadOnlySet<AllowedPlanningAction> AllowedActions,
    IReadOnlyList<DecisionReason> Reasons,
    IReadOnlyList<AllowedAssumption> AllowedAssumptions);
```

建议的稳定就绪度：

```text
Insufficient            没有足够的已验证规划材料
ReadyForClarification   可以通过一个问题获得关键材料
ReadyForSuggestion      可以提出低风险、可逆建议，但不能直接视为用户行动确认
ReadyForProposal        可以生成待用户确认的 Proposal
Blocked                 被用户拒绝、权限或生命周期约束阻止
```

不得：

- 调用模型或数据库。
- 修改 Snapshot。
- 选择最终自然语言回复。
- 创建正式 Task。
- 将 `Answered`、`CannotProvide` 等事件无条件映射为 `ReadyForProposal`。

新增规则约束：缺失字段、是否允许默认值、目标是否足够具体、是否可保守拆解等规则属于该层或其版本化 Planning Policy。

### 4.8 Post-Policy

负责：

- 作为本 Turn 最终对话策略的唯一裁决者。
- 基于 Envelope、Verified Interpretation、Planning Decision、Mode Policy、当前 Snapshot 和候选 Payload作出决定。
- 返回接受、降级、拒绝或受限再生成。
- 给出稳定的 Reason Code。

Post-Policy 的固定决策顺序：

```text
1. Conversation、Effect、Mode 和版本是否仍有效
2. StrategyCandidate 是否属于 Envelope
3. Response 类型是否与 Strategy 匹配
4. 当前用户的明确拒绝、确认或修正
5. Evidence 是否满足候选策略要求
6. Planning Readiness 是否支持候选策略
7. Current Artifact 生命周期是否允许候选策略
8. Mode / Product Policy 偏好
9. 接受、降级、拒绝或要求一次受限再生成
```

不得：

- 查询数据库、调用模型或读取未经组装的外部状态。
- 修改 Snapshot。
- 生成默认时间或 Proposal 内容。
- 触发正式副作用。
- 依赖 Runtime 中的隐藏标志完成第二次裁决。
- 对同一规则同时使用多个相互重叠的布尔输入。

新增规则约束：只有“在多个已经验证的可选动作之间，产品希望选择或禁止哪一个”属于 Post-Policy。

### 4.9 Model Turn Runtime

负责：

- 调用 Model Gateway。
- 维护统一的调用、Tool、Schema 修正和再生成预算。
- 解析 Contract，并按固定顺序调用 Evidence、Readiness、Post-Policy 和 Guard。
- 根据 Post-Policy 的结果执行一次受限再生成或确定性 Fallback。
- 汇总非敏感运行指标。

不得：

- 在 Post-Policy 后覆盖 `StrategyDecision`。
- 维护 `proposalRequired`、`questionRequired` 等产品决策状态。
- 根据具体 Reason Code 形成第二套 Policy。
- 内置默认 Proposal 的日期、时长、标题或文案。
- 修改 Conversation Aggregate 或直接持久化业务实体。

新增规则约束：只有模型调用协议、预算、超时、重试和流程编排规则可以进入 Runtime。出现产品语义条件时必须移交对应 Policy 或 Calculator。

### 4.10 Deterministic Proposal Generator

负责：

- 当 Policy 明确允许系统采用安全默认值时，根据已验证规划材料生成 Proposal Candidate。
- 应用版本化的默认时长、最小提前量、时间粒度、工作时间和时区规则。
- 返回 Proposal 和所采用的 Assumptions / Warnings。

建议接口：

```csharp
public interface IDeterministicProposalGenerator
{
    ProposalGenerationResult Generate(ProposalGenerationContext context);
}
```

不得：

- 决定用户是否授权行动。
- 读取原始对话并自行解释。
- 绕过 Proposal Guard。
- 直接持久化 ProposalSet 或 Task。
- 声明业务操作成功。

新增规则约束：默认日期、默认时长、下一个合法时间槽、工作时间和多项安排方式属于 Proposal Generation Policy，不属于 Runtime 或 Prompt。

### 4.11 Response Guard / Artifact Guard / Domain Guard

负责：

- 验证结构、类型、数量、长度、日期、时间、时区、生命周期和领域不变量。
- 拒绝虚假成功声明、未允许 Action 和内部信息泄露。
- 对整个 Candidate 原子接受或拒绝，不保留半合法结果。

不得：

- 重新选择产品策略。
- 自动修复任意语义错误并静默提交。
- 修改 Conversation Phase。
- 创建正式业务实体。

新增规则约束：能以局部 Candidate 或 Artifact 的合法性表达的规则才属于 Guard。产品偏好不能伪装成 Validation Error。

### 4.12 Conversation Kernel

负责：

- 根据 Current Snapshot 和已经验证的 Conversation Event 确定性地产生 StateTransition。
- 更新 Phase、GenerationStatus、Facts、Current Artifact、AllowedActions 和 Domain Events。
- 保证未知 Event 或未注册转换 fail closed。

不得：

- 理解自然语言。
- 调用模型、Tool 或 Proposal Generator。
- 重新裁决 StrategyDecision。
- 生成自由文本。
- 创建正式 Task。
- 通过默认分支猜测未知转换。

新增规则约束：只有会改变 Conversation 或 Artifact 权威生命周期的规则属于 Kernel。语气、默认值、推荐策略和模型行为不能进入 Kernel。

### 4.13 User Command / Domain Handler

负责：

- 处理 Confirm、Reject、Edit、Cancel、Retry 等明确用户 Command。
- 验证 Ownership、Expected Version、Allowed Actions 和 Idempotency。
- 在事务中执行正式 Task 或其他业务实体创建。
- 以持久化结果决定成功或失败。

不得：

- 根据 Assistant 文本推断用户已经确认。
- 让模型替代 Command。
- 在缺少 Command Receipt 或版本验证时执行副作用。
- 在事务失败后返回成功状态。

新增规则约束：创建、删除、发送通知、写日历、启动 Focus 等正式副作用必须新增明确 Command、权限校验和 Domain Handler，不能扩展模型 Tool 权限代替。

### 4.14 Persistence / Database

负责：

- 存储权威 Aggregate、Effect、Receipt、Transition Log 和 Outbox。
- 提供唯一性、外键、并发 Token 和事务原子性保障。
- 支持 Snapshot 恢复和幂等重放。

不得：

- 用数据库 Trigger 隐藏 Conversation Strategy。
- 把自由文本作为业务成功来源。
- 保存没有来源、生命周期和版本语义的模型推断。

新增规则约束：只有数据库能够最终保证的完整性条件才进入数据库约束；对话策略不得下沉到数据库。

### 4.15 Client

负责：

- 渲染服务端 Snapshot、Artifact 和 `allowedActions`。
- 发送带 Expected Version 和 CommandId 的用户操作。
- 在版本跳跃或响应不确定时重新获取 Snapshot / Command Status。

不得：

- 从 Phase 或事件名称自行推导未返回的 Action。
- 把模型文本中的“已创建”当作 Task 成功。
- 绕过 Confirm Command 直接创建正式 Task。
- 复制服务端 Policy。

新增规则约束：纯展示和交互规则可留在客户端；影响权限或业务状态的规则必须由服务端返回明确结果。

## 5. 权限平衡与不可突破的不变量

任何实现都必须满足以下权限链：

```text
Model 可以建议，但不能授权。
Policy 可以允许策略，但不能提交状态。
Guard 可以拒绝候选，但不能创造授权。
Generator 可以补全候选，但不能代表用户确认。
Kernel 可以提交 Conversation 状态，但不能创建正式业务副作用。
Domain Handler 可以执行副作用，但只能响应有效用户 Command。
数据库可以确认提交结果，但不能解释用户意图。
```

必须长期保持的硬性不变量：

1. 没有明确用户 Command，不创建正式 Task 或其他 Level 4 副作用。
2. 模型输出不能设置服务端身份、所有权、版本、状态和成功结果。
3. `StrategyDecision` 只能由 Post-Policy 产生；其他层只能执行或拒绝。
4. `StateTransition` 只能由 Kernel 产生；其他层不得直接改变 Aggregate 状态。
5. Evidence 只能证明其来源明确支持的声明，模型推断不能升级为用户明确事实。
6. 同一 Conversation 同时只允许一个有效 Running Model Effect。
7. 同一 Artifact 类型只允许设计所规定数量的 Current Pending / Processing 实例。
8. Assistant Message、Artifact 和 Conversation 状态必须原子提交。
9. 迟到、版本冲突、取消或 Superseded 的结果不能覆盖新状态。
10. Guard 和 Policy 失败后不得产生部分业务副作用。
11. Runtime 不得通过临时标志形成第二套产品决策。
12. Prompt 不能成为确定性安全规则的唯一实现。

## 6. 规则分类、归属和优先级

### 6.1 规则分类

| 规则类型 | 示例 | 唯一归属 |
| --- | --- | --- |
| 安全不变量 | 无 Confirm 不创建 Task | Guard / Command / Kernel / DB |
| 生命周期规则 | 已有 Pending Set 不创建第二个 | Kernel / Artifact Handler |
| 能力暴露规则 | Companion 不暴露某只读 Tool | Pre-Policy / Capability Registry |
| 证据规则 | 当前消息 Quote 必须真实存在 | Evidence Guard |
| 规划就绪规则 | 缺少时间但允许默认时间 | Readiness Policy |
| 对话策略偏好 | 多目标优先询问还是全部建议 | Post-Policy / Mode Policy |
| 默认生成规则 | 默认 30 分钟、下一个工作时段 | Proposal Generator Policy |
| 候选合法性 | `EndTime > StartTime` | Proposal Guard |
| 表达和语气 | 陪伴模式更温和 | Prompt / Model |
| 调用预算 | 最多一次再生成 | Runtime Limits |
| 传输兼容 | 旧客户端无法展示新 Artifact | Protocol Projector / Entry |

### 6.2 固定优先级

发生规则冲突时，按以下顺序处理：

```text
1. 安全、权限、隐私和法律不变量
2. Ownership、Version、Idempotency 和事务一致性
3. Conversation / Artifact 生命周期约束
4. 用户当前明确 Command、拒绝和修正
5. 已验证 Evidence 和持久化用户事实
6. Mode Policy
7. 产品策略偏好
8. 模型 SuggestedAction
9. 确定性默认值和 Fallback
```

低优先级规则不得覆盖高优先级规则。例如模型建议 Proposal，产品也允许默认时间，但用户当前明确拒绝行动时，必须拒绝 Proposal。

### 6.3 冲突处理要求

新增规则必须说明：

- 它属于哪一类。
- 它位于固定优先级的哪一层。
- 它与相邻高低优先级规则发生冲突时如何处理。
- 它的拒绝、降级或 Fallback Reason Code。
- 它是否改变持久化事实或只产生派生决策。

不得通过代码执行顺序偶然决定优先级。

## 7. 新增产品规则的强制协议

后续 Agent 在实现任何新规则前，必须完成以下 Rule Change Brief。简单规则可以写在 PR 描述中，复杂规则应更新本文档、技术设计或 ADR。

```text
Rule Name:
User-visible behavior:
Rule category:
Owning layer:
Authoritative inputs:
Decision/output:
Priority:
Conflict behavior:
Persisted state required? Why?
Model Contract change required? Why?
Kernel change required? Why?
Formal side effect involved?
Fallback / failure behavior:
Observability metadata:
Tests proving the boundary:
```

### 7.1 新增规则的准入条件

一条规则只有满足以下条件才可以进入实现：

1. 能明确指出唯一 owning layer。
2. 输入来自该层被允许读取的权威 Contract。
3. 输出不会越过该层权限。
4. 已明确与现有规则的优先级和冲突结果。
5. 不依赖复制另一个层已经计算的布尔值。
6. 不把模型输出直接持久化为业务事实。
7. 不通过 Prompt 单独保证确定性安全。
8. 有最小、确定性的边界测试。

### 7.2 默认允许的修改范围

普通产品偏好应尽量满足：

```text
修改一个强类型 Policy 或 Calculator
修改一个版本化配置
增加一组表驱动测试
不修改 Model Contract
不修改 Conversation 持久化 State
不修改 Kernel
不修改 Runtime 编排
```

以下修改属于高风险扩展，必须给出额外理由：

```text
新增模型输出字段
新增 Conversation Fact 或 Status
新增持久化布尔值
新增 Strategy 枚举
新增 Runtime 分支或临时决策变量
新增 Kernel Transition
新增正式写 Capability
修改规则优先级
```

### 7.3 Rule Diff Budget

为防止规则扩散，普通产品规则建议遵守以下变更预算：

```text
Owning production modules changed <= 2
新增持久化字段 = 0
新增模型协议字段 = 0
新增 Runtime 产品分支 = 0
新增 Kernel 状态 = 0
至少一个纯决策测试
```

超过预算并不自动禁止，但 Agent 必须在变更说明中逐项解释，并优先考虑是否缺少稳定抽象。

## 8. 何时允许新增持久化状态

只有满足至少一个条件的信息才可以进入 Conversation / Artifact 持久化状态：

- 服务重启后必须恢复。
- 并发判断必须使用。
- 幂等或迟到结果处理必须使用。
- 客户端必须依据它显示权威状态或 Action。
- 它表达正式 Artifact 生命周期。
- 它是经过验证且后续 Policy 必须使用的用户事实。

以下内容通常不得持久化：

```text
可以由 Snapshot + Policy 重新计算的布尔值
只为某一个 Prompt 方便使用的标志
模型置信度的临时阈值结果
某次再生成中的控制变量
某条产品偏好的计算结果
未经 Evidence Guard 验证的模型推断
```

每个新增状态必须定义：

```text
Source of truth
ValidFrom / ValidTo 或生命周期
谁可以创建
谁可以修改
谁可以清除
与 Version 的关系
恢复行为
Supersede 行为
客户端投影
```

## 9. 模型 Contract 扩展约束

模型 Contract 应表达通用语义，不应为每个案例增加专用开关。

优先采用：

```text
带 Kind 的结构化 Item
带来源的 EvidenceReference
通用的 UserTurnDisposition
通用的 SuggestedAction
带 Assumptions 的 Candidate Payload
```

避免采用：

```text
isXxxAuthorized
mustGenerateXxx
shouldSkipSpecificQuestion
specialCaseHandled
xxxEvidenceQuote 与每个字段一一配对
```

新增 Contract 字段必须满足：

1. 不能由现有通用字段表达。
2. 至少支持一类长期语义，而不只是一个示例句。
3. 有明确 Schema Version 和兼容策略。
4. 有 Guard 或 Projector 消费，不能只是 Prompt 提示。
5. 不代表服务端权限、确认或业务成功。

## 10. Policy 和 Calculator 的设计约束

### 10.1 使用强类型决策对象

避免把多个重叠布尔值传给 Policy：

```text
ActionIntentVerified
SpecificGoalVerified
CoachDecompositionAuthorized
CanSupportProposal
ProposalRequired
```

优先传递：

```csharp
public sealed record VerifiedPlanningContext(
    IReadOnlyList<VerifiedPlanningItem> Items,
    IReadOnlyList<VerifiedConstraint> Constraints,
    UserTurnDisposition Disposition,
    EvidenceSummary Evidence);

public sealed record PlanningDecision(
    PlanningReadiness Readiness,
    IReadOnlySet<AllowedPlanningAction> AllowedActions,
    IReadOnlyList<DecisionReason> Reasons,
    IReadOnlyList<AllowedAssumption> AllowedAssumptions);
```

### 10.2 Calculator 必须是纯函数

Calculator 必须：

- 不访问数据库。
- 不调用模型。
- 不读取系统时间；时间必须由参数传入。
- 不修改输入对象。
- 相同输入产生相同结果。
- 返回稳定 Reason。

### 10.3 不引入通用动态 Rule Engine

当前阶段不得把所有规则放入 JSON DSL、数据库表达式、脚本或通用 Rule Engine。原因：

- 类型约束和重构能力下降。
- 冲突顺序难以静态发现。
- 运行时配置可能绕过代码审查。
- 调试和版本迁移成本高于当前收益。

当前应使用：

```text
强类型版本化 Policy
小型纯函数 Calculator
固定优先级
表驱动测试
稳定 Reason Code
```

只有当规则数量、非开发人员配置需求和发布频率有数据证明时，才能通过 ADR 评估动态 Rule Engine。

## 11. Fallback 与再生成约束

Fallback 和再生成不是新增产品规则的绕行通道。

Runtime 只能根据 `StrategyDecision` 中的标准动作执行：

```text
Accept
DowngradeToSafeStrategy
RegenerateWithConstraint
UseDeterministicGenerator
FailTurn
```

再生成约束应结构化表达，例如：

```csharp
public sealed record RegenerationDirective(
    ConversationStrategy RequiredStrategy,
    IReadOnlySet<string> RequiredFields,
    IReadOnlySet<AllowedAssumption> AllowedAssumptions,
    StrategyReasonCode Reason);
```

Runtime 不应通过匹配多个具体 `ReasonCode` 设置 `proposalRequired = true`。

确定性 Fallback 必须：

- 符合最终允许策略。
- 不声称正式业务成功。
- 不创造未经允许的用户事实。
- 不重复已经耗尽的澄清路径。
- 不在 Runtime 中内置排程产品规则。

### 11.1 修正轮的信任上下文

Schema 修正与 Payload 修正必须区分。Schema 首次解析失败时尚不存在可信候选，下一轮仍需重新执行完整的 Evidence、Readiness 和 Post-Policy 流程。Response、Strategy 或 Proposal Payload 被拒绝时，如果本轮 Interpretation 已经通过 Evidence Guard，并已经形成 Planning Decision，则 Runtime 必须锁定这两个不可变控制结果。

锁定后的修正轮只能替换 Directive 明确列出的候选字段，例如：

```text
response
proposalSet
```

修正轮不得通过重新输出 `interpretation` 改变：

- 已验证 Planning Items 或 Constraints；
- 当前用户的委托、拒绝或回答状态；
- Planning Readiness；
- Allowed Actions 或 Allowed Assumptions；
- 是否具有 Proposal 权限。

Runtime 可以继续对修正轮携带的 Interpretation 执行 Evidence Guard 并记录诊断结果，但该结果不具有控制权限。Post-Policy、Guard、PlanningIntentUpdate 和 deterministic fallback 必须消费锁定的 Verified Planning Context 与 Planning Decision。

不得锁定下列上下文：

- 首次候选尚未通过 Schema；
- Evidence Guard 报告任何无效声明；
- 权限仅来自模型推断而非已验证 Evidence 或持久化权威状态。

### 11.2 内部指令的消息身份

Schema 修正、再生成和 Proposal 修正指令属于服务端控制消息，不属于用户对话。Gateway Contract 必须使用独立的 System/Developer 消息类型传递，禁止使用普通 User Message 加字符串前缀模拟系统身份。

内部控制指令永远不能成为：

- `UserExplicit` Evidence；
- Disposition Evidence；
- Planning Item 或 Constraint 的来源；
- 用户确认、拒绝或委托的证明。

修正流程的验收测试必须覆盖：模型把内部指令伪装成 Evidence 时 Evidence Guard 仍会拒绝该声明，但已经锁定的合法控制上下文不被覆盖；合法修正后的 Payload 可被接受，且不会因此增加一次无意义的模型调用。

## 13. 测试与验收要求

新增规则的测试应与规则所属层一致：

| 层 | 主要测试 |
| --- | --- |
| Pre-Policy | Snapshot 组合到 Envelope 的表驱动测试 |
| Evidence Guard | 合法/非法来源和 Quote 验证 |
| Readiness Calculator | Facts + Verified Interpretation + Policy 矩阵 |
| Post-Policy | Envelope + Readiness + Candidate 到 Decision 矩阵 |
| Proposal Generator | 时区、边界时间、默认值和多 Item |
| Artifact Guard | Schema、数量、日期时间、生命周期 |
| Kernel | Current State + Event 到 Transition |
| Command Handler | Ownership、Version、Idempotency、事务 |
| Runtime | 调用预算、再生成、失败和模块调用顺序 |

测试不得只验证某一句示例输入。至少覆盖：

```text
规则命中
规则不命中
高优先级规则覆盖它
非法 Evidence
已有 Current Artifact
失败或预算耗尽
重试 / 版本冲突（如涉及持久化）
```

模型行为测试可以作为集成验证，但不能替代纯 Policy、Calculator、Guard 和 Kernel 测试，因为模型输出不是确定性的规则事实。


## 15. Agent 开发流程

后续 Agent 修改 AI Action Coach 时必须按以下顺序工作：

1. 阅读 v3 技术设计、相关 ADR 和本文档。
2. 列出当前规则的 owning layer 和权威输入。
3. 填写 Rule Change Brief。
4. 检查是否可以通过现有 Policy 配置或 Calculator 表达。
5. 检查是否错误地要求新增持久化状态或模型字段。
6. 明确规则优先级、冲突处理和 Fallback。
7. 先修改唯一 owning layer，再连接调用方。
8. 添加该层的最小确定性测试。
9. 检查 Runtime、Prompt、Policy 和 Kernel 是否出现重复实现。
10. 说明变更是否超过 Rule Diff Budget。
11. 若改变架构权限或正式副作用边界，先更新 ADR，再实现。

Agent 的交付说明必须回答：

```text
这条规则属于哪一层？
为什么不属于其他层？
哪个对象是唯一事实来源？
它是否新增持久化状态？
模型可以建议什么，不能决定什么？
发生冲突时哪条规则优先？
哪些测试证明没有越权？
```

## 16. 代码审查检查清单

### 16.1 决策权

- 是否有两个模块决定同一个最终结果？
- Runtime 是否覆盖 Post-Policy？
- Kernel 是否重新理解 Strategy？
- Guard 是否在选择产品偏好？
- Prompt 是否成为唯一安全控制？

### 16.2 状态

- 新字段是否真的需要跨 Turn 恢复？
- 是否可以从现有事实和 Policy 计算？
- 是否存在两个意义相近的布尔值？
- 状态由谁创建、更新、清除和 Supersede？
- 旧 Snapshot 如何恢复？

### 16.3 模型权限

- 模型是否能伪造确认、所有权、版本或成功？
- Evidence 是否被真正验证？
- 模型是否获得不必要的写 Tool？
- 模型候选是否在提交前经过对应 Guard？

### 16.4 规则扩散

- 一条产品规则是否修改超过两个 owning modules？
- 是否同时出现在 Prompt、Runtime 和 Policy？
- 是否为单个例句新增枚举或字段？
- 是否可以改为强类型 Policy 参数？
- 是否有稳定 Reason Code 和纯决策测试？

### 16.5 正式副作用

- 是否由明确 User Command 触发？
- Ownership、Version、Idempotency 是否验证？
- 成功是否以数据库提交为准？
- 失败是否会残留部分实体？
- 重试是否可能重复创建？

## 17. 禁止的反模式

以下实现默认禁止：

```text
在 Runtime 中增加 mustXxx / xxxRequired 临时产品标志
按多个 ReasonCode 写第二套策略 switch
为一个示例句新增模型布尔字段
用关键词识别替代模型解释或 Evidence Guard
把模型推断直接保存为用户事实
用 Prompt 单独保证 Confirm、Ownership 或幂等
让模型直接设置 Conversation Phase 或 Artifact Status
让 Guard 既验证又选择产品策略
让 Kernel 生成自然语言或调用模型
在客户端复制 allowedActions 规则
为了统一而让 Confirm / Reject 经过模型
把所有规则放入通用动态 Rule Engine
```

## 18. 决策示例

### 18.1 缺少时间但允许默认时间

```text
Model：识别明确行动，时间缺失
Evidence Guard：验证行动 Evidence
Readiness Policy：允许使用默认时间 -> ReadyForProposal
Post-Policy：允许 ShowProposalSet
Proposal Generator：选择下一个合法时间槽
Proposal Guard：验证日期时间
Kernel：创建 Pending ProposalSet
```

不得在 Runtime 中写“缺少时间就加 30 分钟”。

### 18.2 用户说“不知道”

```text
Model：Disposition = CannotProvideAnswer
Evidence Guard：验证当前消息来源
Readiness Calculator：结合已有 Items 和 Policy 计算
Post-Policy：选择安全建议、Proposal 或停止推进
```

`CannotProvideAnswer` 本身不得自动等于 `ReadyForProposal`。

### 18.3 用户明确拒绝行动

```text
Model：识别 RejectedAction
Evidence Guard：验证 Evidence
Post-Policy：用户当前明确拒绝高于产品推动偏好
Kernel：只在需要时更新 Conversation / Artifact 生命周期
```

模型或 Generator 不得以“保守建议”为由继续创建 Proposal。

### 18.4 已存在 Pending ProposalSet

```text
Pre-Policy：不暴露创建第二个 Current ProposalSet 的策略
Post-Policy：拒绝或降级越界候选
Artifact Guard / Kernel：再次保证生命周期不变量
```

这里允许多层防御，但每层职责不同：Pre-Policy 减少暴露，Post-Policy 裁决候选，Kernel 保证最终状态；它们不得各自维护不一致的产品策略。

## 19. 完成标准

完成本治理方案后的目标状态：

```text
模型负责开放语义和候选质量
Evidence Guard 负责证明来源
Planning Readiness 负责统一计算就绪度
Post-Policy 是唯一最终策略裁决点
Runtime 只编排调用、预算和标准 Directive
Proposal Generator 承担版本化默认生成规则
Guard 只验证候选合法性
Kernel 只提交确定性 Conversation 状态
用户 Command 和 Domain Handler 独占正式副作用
数据库结果独占业务成功事实
```

架构是否健康，不能只看代码行数，而应检查新增规则的影响范围：

```text
普通产品规则能够局部增加；
安全不变量仍然确定可测；
模型能力可以增强但权限不扩大；
任何层都不能悄悄成为第二个 Policy 或第二个 Kernel。
```
