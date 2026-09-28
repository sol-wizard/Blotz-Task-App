# AI Coach 回复反馈与诊断查询

每条 AI 回复的赞踩状态保存在 `AiCoachFeedback`。同一用户对同一条回复只有一条当前记录；取消评价会删除该记录。`TurnId` 是触发回复的用户消息 ID。

`AiCoachTraceEvent` 保存按时间产生的会话事件：用户消息、模型请求和结果、工具结果、AI 回复以及任务草稿操作。`Id` 提供稳定的事件顺序。请求和结果正文放在 `Payload` JSON 中；此表包含私人对话及任务内容，只应授权给排查人员。诊断事件由后台服务在创建 30 天后删除，反馈记录不会随诊断内容一起删除。旧会话和删除后的事件无法补录。

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
