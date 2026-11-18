# AI Coach 回复反馈与诊断查询

每条 AI 回复的赞踩状态保存在 `AiCoachFeedback`。同一用户对同一条回复只有一条当前记录；取消评价会删除该记录。`TurnId` 是触发回复的用户消息 ID。

`AiCoachTraceEvent` 保存按时间产生的会话事件：用户消息、模型请求和结果、工具结果、AI 回复以及任务草稿操作。`Id` 提供稳定的事件顺序。请求和结果正文放在 `Payload` JSON 中；此表包含私人对话及任务内容，只应授权给排查人员。诊断事件由后台服务在创建 90 天后删除（`TraceRetentionDays`），反馈记录不会随诊断内容一起删除。旧会话和删除后的事件无法补录。

以下查询在现有 SQL Server 数据库中执行。先查最近的差评，再将选中的 `AssistantMessageId` 代入后两个查询。分页可用 `Id` 游标继续读取。

```sql
SELECT TOP (100)
    f.UpdatedAt, f.UserId, f.ConversationId, f.TurnId,
    f.AssistantMessageId, f.Reason, f.Detail,
    reply.Payload AS AssistantReplyEvent
FROM AiCoachFeedback AS f
LEFT JOIN AiCoachTraceEvent AS reply
    ON reply.AssistantMessageId = f.AssistantMessageId
   AND reply.Kind = 'assistant_message'
WHERE f.Rating = 'down'
ORDER BY f.UpdatedAt DESC;
```

```sql
DECLARE @AssistantMessageId uniqueidentifier = 'PUT-MESSAGE-ID-HERE';

SELECT e.Id, e.CreatedAt, e.Kind, e.Payload
FROM AiCoachTraceEvent AS e
JOIN AiCoachFeedback AS f ON f.ConversationId = e.ConversationId
WHERE f.AssistantMessageId = @AssistantMessageId
  AND e.TurnId = f.TurnId
ORDER BY e.Id;
```

```sql
DECLARE @AssistantMessageId uniqueidentifier = 'PUT-MESSAGE-ID-HERE';

SELECT e.Id, e.CreatedAt, e.TurnId, e.AssistantMessageId, e.Kind, e.Payload
FROM AiCoachTraceEvent AS e
JOIN AiCoachFeedback AS f ON f.ConversationId = e.ConversationId
WHERE f.AssistantMessageId = @AssistantMessageId
ORDER BY e.Id;
```

草稿操作在时间线中使用 `draft_edited`、`draft_rejected`、`draft_confirmation`。它们没有聊天轮次 ID，但共享 `ConversationId`。`model_request` 包含模型实际收到的上下文；`model_response` 和 `tool_result` 记录模型及工具结果。若某个事件写入失败，服务端会记录 `AiCoach diagnostic trace incomplete` 错误；数据库不可用时无法保证完整还原。

`model_request` 不再内嵌工具定义，只记录 `toolSetHash` 和 `toolNames`；最后一次调用不带工具时 `toolSetHash` 为 `null`。完整定义按哈希只存一份在 `AiCoachToolSet`，内容与旧事件里的 `Tools` 字段相同。工具定义是代码常量、不含用户数据，因此这张表不随诊断保留期或用户清空历史删除。若工具定义保存失败，服务端会记录 `AiCoach tool set ... was not saved` 错误，此时 JOIN 结果为 `NULL`。旧事件仍保留 `Tools` 字段，直到 90 天后被清理。

```sql
DECLARE @AssistantMessageId uniqueidentifier = 'PUT-MESSAGE-ID-HERE';

SELECT e.Id, e.CreatedAt, e.Payload, t.Definitions AS Tools
FROM AiCoachTraceEvent AS e
JOIN AiCoachFeedback AS f ON f.ConversationId = e.ConversationId
LEFT JOIN AiCoachToolSet AS t ON t.Hash = JSON_VALUE(e.Payload, '$.toolSetHash')
WHERE f.AssistantMessageId = @AssistantMessageId
  AND e.TurnId = f.TurnId
  AND e.Kind = 'model_request'
ORDER BY e.Id;
```

## 每轮汇总

`AiCoachTurnSummary` 每轮对话（`Kind = 'turn'`）和每次后台摘要调用（`Kind = 'digest'`）各写一行，不含对话正文。字段包括：模型、部署、API、提示词版本、工具协议版本、错误码（成功为 `NULL`）、提交状态、模型调用次数、工具调用次数和名称、token、预估成本、耗时。
- **轮次：** `TurnId` 是用户消息 ID，可以和 `AiCoachFeedback.TurnId` 关联；`Source` 为 `followup` 表示用户点了建议的下一句，直接输入时为 `NULL`（目前不区分语音和文字）。
- **摘要调用：** `TurnId` 为空，`PromptVersion` 记录摘要版本；只记录成功返回的调用。
- **保留与删除：** 按 `MessageRetentionDays`（默认 180 天）保留；用户清空历史时一起删除，注销账号时级联删除。
- **字段口径：** `EstimatedUsd` 为 `NULL` 表示模型未配置价格，不代表免费；`DurationMs` 是一轮从配额检查到模型返回的时间，不包含保存会话的时间。
- **写入失败：** 服务端会记录 `AiCoach ... summary was not saved` 错误，对话本身不受影响。
- **草稿结果：** 某轮新建或修改了待确认草稿时，`DraftId` 记录这个草稿、`DraftItemCount` 记录这轮结束时的条目数。用户编辑卡片时，`DraftUserEditCount` 加 1；确认或拒绝时，把 `DraftOutcome` 写成 `confirmed` 或 `rejected`，并记录 `DraftOutcomeAt`。确认时 `DraftSavedItemCount` 记录实际保存的条目数，用户只勾选部分条目时会少于草稿条目数。一个草稿可能经过多轮修改，这些轮次会写入同样的结果；统计草稿数量时按 `DraftId` 去重。`DraftOutcome` 为 `NULL` 表示还没处理，或者话题结束时已过期。保存失败的确认不算结果，草稿会回到待确认状态。

```sql
-- 最近 30 天按天和模型统计
SELECT CAST(CreatedAt AS date) AS Day, Kind, Model,
       COUNT(*) AS Calls, SUM(CASE WHEN ErrorCode IS NULL THEN 0 ELSE 1 END) AS Errors,
       SUM(InputTokens) AS InputTokens, SUM(OutputTokens) AS OutputTokens,
       SUM(EstimatedUsd) AS EstimatedUsd, AVG(DurationMs) AS AvgMs
FROM AiCoachTurnSummary
WHERE CreatedAt >= DATEADD(day, -30, SYSUTCDATETIME())
GROUP BY CAST(CreatedAt AS date), Kind, Model
ORDER BY Day DESC, Kind, Model;

-- 按模型和提示词版本统计草稿采纳率（每个草稿取最后一轮）
WITH drafts AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY DraftId ORDER BY CreatedAt DESC) AS rn
    FROM AiCoachTurnSummary WHERE DraftId IS NOT NULL
)
SELECT Model, PromptVersion, COUNT(*) AS Drafts,
       SUM(CASE WHEN DraftOutcome = 'confirmed' THEN 1 ELSE 0 END) AS Confirmed,
       SUM(CASE WHEN DraftOutcome = 'rejected' THEN 1 ELSE 0 END) AS Rejected,
       SUM(CASE WHEN DraftUserEditCount > 0 THEN 1 ELSE 0 END) AS EditedByUser
FROM drafts WHERE rn = 1
GROUP BY Model, PromptVersion;

-- 差评轮次的汇总数据
SELECT f.Reason, s.Model, s.PromptVersion, s.ErrorCode, s.ToolNames, s.DurationMs, s.EstimatedUsd
FROM AiCoachFeedback AS f
JOIN AiCoachTurnSummary AS s ON s.TurnId = f.TurnId AND s.Kind = 'turn'
WHERE f.Rating = 'down'
ORDER BY f.UpdatedAt DESC;
```
