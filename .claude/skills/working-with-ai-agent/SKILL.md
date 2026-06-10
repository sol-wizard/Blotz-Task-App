---
name: working-with-ai-agent
description: Use when the developer is implementing, modifying, or fixing any AI feature in this project
---

# Working with the AI Agent

## Read these first

- `AiTaskGenerateChatHub.cs` — **entry point** for both text messages and voice input (`SendMessage`, `TranscribeAudio`); manages session lifecycle
- `AiTaskGenerateService.cs` — init, run, error mapping
- `TaskGenerationTools.cs` — the tool methods the agent can invoke
- `AiTaskGeneratorPrompts.cs` — system prompt

Product rationale and decision history for this feature live in the private repo — use the `private-context` skill to find and read it before making design decisions.

## Flow

The `AiTaskGenerateChatHub` SignalR hub is the entry point — both text (`SendMessage`) and voice (`TranscribeAudio` → transcribe → `SendMessage`) funnel through the same path:

SignalR hub → `DateTimeResolveService.Resolve` (pre-process dates) → `AiTaskGenerateService.GenerateAiResponse` → `context.Agent.RunAsync(...)` → AI invokes tools that mutate `context.Tasks` / `context.Notes`.

State lives in `AiChatContext` (Agent + Session + Tools + Tasks + Notes + TimeZone), created once in `OnConnectedAsync` and stored per SignalR connection in `Context.Items["ChatContext"]`.

## Conventions

- **Adding a tool** — add a method to `TaskGenerationTools.cs` with `[Description]` on the method and every parameter. These descriptions are the model's instructions; write them as if the AI is the only reader. Increment `ToolCallCount` at the top.
- **System prompt** — keep minimal. Tool-specific rules belong in `[Description]`, not the prompt.
