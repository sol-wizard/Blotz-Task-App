# AI Coach 对话质量测试集

用于调 prompt 或换模型时，检查 AI Coach 的回复质量是否达标。场景都来自真机用户反馈和之前的语气测试。

本测试集和 [AI Coach 评测](ai-action-coach-evaluation.md) 的分工：

- `CoachScenarioTests` 走完整应用链路（数据库、配额、保存），验证草稿与保存流程。
- 本测试集只调用 `ModelTurnRuntime`，不用数据库，每个场景可以设定自己的时间和用户记忆，重点看回复质量。

## 三种用法

1. **手动测**：在任何工具里（playground、换个模型试），按下面的场景表逐条发消息，对照"应该 / 不应该"判断。
2. **一条命令跑完**：`CoachConversationQualityTests` 读取 `blotztask-test/AiCoach/Evaluation/conversation-quality-scenarios.json`，每个场景跑多遍，并调用 AI 评审。
3. **对比两次运行**：`scripts/summarize-ai-coach-quality.py` 输出比例表，传两个目录就是 A/B 对比。

## 场景

| id | 分类 | 来源 | 用户消息 | 应该 | 不应该 |
| --- | --- | --- | --- | --- | --- |
| upset | 情绪 | 真机截图 | 今天好烦 → 说不上来 → 不知道 | 先陪伴；问题几个字就能答，最好带按钮；说不清时改问"现在想怎么样" | 给没要的建议（喝水、坐一会儿）；反复让用户给情绪分类；夸张推测 |
| presentation | 情绪 | 第二位用户真机 | 刚结束 presentation 好累😔 → 啥也不想干 → 复盘 → 一直在说话… → 嗯 | 接住情绪并留一个好回答的问题或按钮；复盘一次只问一个、带选项；"嗯"之后给选项 | 把对话聊死；大段文字 |
| listen | 只听 | 语气测试 / listen 场景 | 终于能休息了，只想分享，不要提问、建议或安排任务 | 一两句回应内容和感受，停在感受上 | 任何建议（包括"好好休息""好好享受"）；提问；推测"忙了很久" |
| vent | 只听 | 语气测试 | 只想吐槽：老板把需求改了第三遍 | 站在用户这边，有温度地回应 | 建议；复述原话 |
| phone | 业务 | 第一位用户真机 | 五点关门前去拿手机 → 走路10分钟 → 先吃饭还是先去 → 怕耽误还是先去 | 先问路上多久再建卡；以当前时间开头（15:20，还有1小时40分）；改主意时先评价担心是否有道理 | 不问就排；问用户现在几点 |
| tired-obligation | 业务 | 冲突修复 | 好累，加班到十点，明天上午还有汇报 | 先回应累；用按钮提供"加进任务" | 自动建卡 |
| explicit-add | 业务 | 冲突修复 | 好累…帮我把明天上午10点的汇报加到任务里 | 直接建草稿，先简短回应累 | 说已保存 |
| win / self-blame / setback / anxious-night / streak | 情绪 | 语气测试 | 论文初稿写完了 / 拖延觉得没用 / 计划又没完成 / 凌晨两点焦虑 / 一周天天跑步 | 回应具体那件事；建议口吻 | 套话共情；空洞夸奖；无危险迹象时提急救 |
| memory | 情绪 | 语气测试 | 刷了两套数学题错得多（带记忆：小林、考研、完成率低） | 自然用上记忆，不加压力 | 报完成率、说"根据你的数据" |
| factual | 基础 | 语气测试 | 雅思口语怎么准备？ | 直接给干货 | 硬加情绪开场 |
| hello | 基础 | 语气测试 | 你好 | 自然友好 | 客服腔 |
| en-stress | 基础 | 语气测试 | 英文：三个 deadline 都没开始 | 用英文回复 | 中文回复 |

每个场景的完整评审标准写在 JSON 的 `criteria` 里。

## 检查方式

### 规则检查（程序判断）

每轮在 JSON 里分成两组：

- `business`：业务规则。**任何一次不通过，测试就失败**。
- `tone`：语气。只统计比例，不让测试失败（模型输出有随机性）。

| 检查 | 含义 |
| --- | --- |
| asksQuestion / noQuestion | 回复里有 / 没有问号 |
| asksOrOffersButtons | 有问号，或有 follow-up 按钮 |
| hasFollowUps / noFollowUps | 有 2–3 个按钮 / 没有按钮 |
| noAdvice | 不含 `keywords.advice` 里的词 |
| noFormalChinese / noStockEmpathy | 不含 `keywords.formal` / `keywords.stockEmpathy` 里的词 |
| noNewDraft / draftCreated / draftChanged | 草稿项没增加 / 增加了 / 有变化 |
| mentionsCurrentTime | 回复里出现场景的当前时间（如 15:20） |
| repliesInEnglish | 回复里没有中文字符 |

关键词检查比较粗，只是初筛；词表在 JSON 的 `keywords` 里维护。

### AI 评审

复用 `CoachSemanticJudge`：每个场景跑完后，用场景的 `criteria` 逐轮打 0–5 分，判断是否通过。评审结果和人工判断仍可能不一致，需要人工抽查 `issues`。

### 人工复核

规则检查和评审都只是辅助。调完 prompt 后，至少人工读一遍 upset、presentation、listen、phone 的回复。

## 目标（初稿，可按需要调整）

| 项目 | 目标 |
| --- | --- |
| 业务检查 | 100% |
| listen：noQuestion + noAdvice | ≥ 4/5 |
| 情绪场景：asksOrOffersButtons | ≥ 80% |
| 情绪场景：noAdvice | ≥ 90% |
| AI 评审 | listen ≥ 4/5 通过；其他只看趋势 |
| 按钮出现率、"听起来"次数、字数 | 只报告，不设门槛 |

## 运行

需要 .NET 10 和本地 Azure 配置（与其他 AI Coach 模型测试相同），不需要 Docker。每次运行会调用真实模型，并为每个场景多调一次评审模型。

```sh
# 全部场景，按 JSON 里的默认次数（约 68 轮对话 + 40 次评审）
AICOACH_MODEL_TESTS=1 AICOACH_EVAL_MODEL=gpt-5.6-luna AICOACH_EVAL_JUDGE_MODEL=gpt-5.6-luna \
  dotnet test blotztask-test/BlotzTask.Tests.csproj --filter FullyQualifiedName~CoachConversationQualityTests

# 只跑部分场景，并统一跑 3 遍
AICOACH_MODEL_TESTS=1 AICOACH_QUALITY_ONLY=upset,listen AICOACH_QUALITY_RUNS=3 \
  AICOACH_EVAL_MODEL=gpt-5.6-luna AICOACH_EVAL_JUDGE_MODEL=gpt-5.6-luna \
  dotnet test blotztask-test/BlotzTask.Tests.csproj --filter FullyQualifiedName~CoachConversationQualityTests

# 换模型：gpt-6.1-sol 目前只能通过评测用的 responses 通道调用
AICOACH_MODEL_TESTS=1 AICOACH_EVAL_MODEL=gpt-6.1-sol AICOACH_EVAL_TRANSPORT=responses \
  AICOACH_EVAL_JUDGE_MODEL=gpt-5.6-luna \
  dotnet test blotztask-test/BlotzTask.Tests.csproj --filter FullyQualifiedName~CoachConversationQualityTests
```

| 环境变量 | 作用 |
| --- | --- |
| `AICOACH_EVAL_MODEL` | 被测模型部署；默认是本地 TaskGeneration 部署（不是 AI Coach 实际用的模型），所以请显式设置 |
| `AICOACH_EVAL_TRANSPORT` | `chat`（默认，与生产相同）或 `responses` |
| `AICOACH_EVAL_JUDGE_MODEL` | 评审模型；对比不同被测模型时请固定同一个评审模型 |
| `AICOACH_QUALITY_ONLY` | 逗号分隔的场景 id |
| `AICOACH_QUALITY_RUNS` | 覆盖所有场景的运行次数（1–10） |

结果写到 `blotztask-test/TestResults/ai-coach-evals/quality-<时间>-<id>/`，每个场景每次运行一个 JSON 文件，包含 prompt 版本、模型、每轮回复、按钮、草稿、检查结果、耗时、token 和评审结果。测试输出会打印目录路径。

## 对比

```sh
# 单次运行
python3 scripts/summarize-ai-coach-quality.py blotztask-test/TestResults/ai-coach-evals/quality-A

# A/B 对比，可选价格估算（每百万 token 的输入、缓存输入、输出单价）
python3 scripts/summarize-ai-coach-quality.py <quality-A> <quality-B> --prices .2 .2 1.2 --prices-b 2 .1 10
```

价格必须自己核实来源，输出只是估算，不代表账单。

## 已知限制

- `list_tasks` 永远返回空日程，场景不依赖真实任务数据。
- 不经过数据库、配额和保存流程；这些由 `CoachScenarioTests` 覆盖。
- 发给模型的历史里不含 follow-up 按钮（与生产一致），这会影响后续轮次出现按钮的概率。
- 评审提示词偏向草稿和日程的事实核查，对语气的判断仍需人工复核。

## 基线

### 首次测试集运行（2026-10-24，luna，chat，评审 luna，`coach-prompt-review-list-10`）

结果目录：`quality-20261024T114610-4bd688f48a9344d29b5df26a607f8363`。测试**失败**：业务检查 `en-stress · repliesInEnglish` 0/2，英文消息被用中文回复（"听起来三个截止日期……"）。之前的临时测试里也出现过 1/2，属于真实问题，不是检查误报。

已在 `coach-prompt-review-list-12` 修复：把"始终用用户最新一条消息的语言回复"从 Voice 列表中间挪到 prompt 开头的身份句，在所有中文示例之前。修复后 en-stress 5/5 英文回复；upset、presentation、listen、vent、phone、self-blame、memory、hello 的业务检查全部通过，中文场景仍全部用中文回复，语气检查与修复前在同一水平（结果目录 `quality-20261024T120104-fe2dd659ae994e30a2d441e23a8800a0`）。

| 指标 | 结果 |
| --- | --- |
| 其他业务检查 | 全部通过（phone 先问、报时间、建卡、改时间；explicit-add 建卡；其余不建卡） |
| upset：asksOrOffersButtons / noAdvice | 8/10 / 15/15 |
| presentation：asksOrOffersButtons / noAdvice | 6/12 / 6/6 |
| listen：noQuestion / noAdvice | 5/5 / 2/5 |
| vent：noQuestion / noAdvice | 3/3 / 3/3 |
| AI 评审通过 | anxious-night、explicit-add、factual、hello、self-blame、setback、tired-obligation、win 全部通过；listen 2/5；upset 0/5、presentation 0/3、phone 0/2、vent 0/3、streak 0/2、memory 0/2 |
| 平均字数（非知识 / 知识） | 73 / 1260 |
| 延迟中位数 / P90 | 1.9 / 4.8 秒 |
| 平均 token（输入 / 缓存 / 输出） | 3714 / 3303 / 158 |

评审指出的问题大多成立：phone 的出发时间没给路上留余量；presentation 缺少带选项的问题；upset 对"好烦"有扩写推测、说不清后仍让用户选情绪。也有偏严的：把"先不用急着解决它"算作建议；vent 的标准写了"不复述原话"，导致提到"第三遍"就被判复述。评审标准需要按人工判断再校准。

### 建立测试集之前的临时测试

下表是建立测试集之前用临时脚本测得的结果（v12 prompt：`coach-prompt-review-list-10`），供参考：

| 指标 | luna（chat） | sol（responses） |
| --- | --- | --- |
| upset：结尾有问题 | 4/15 | 8/15 |
| presentation 前两轮：有问题 | 0/6 | 4/6 |
| 单轮情绪用例：有按钮 | 5/14 | 14/14 |
| 情绪对话：主动给建议 | 1/21 | 0/21 |
| listen：有建议或提问 | 2/5 | 0/5 |
| 业务规则（先问再建卡、报时间、建卡判断） | 全部通过 | 全部通过 |
| 延迟中位数 / P90 | 3.6 / 6.3 秒 | 3.5 / 7.4 秒 |
