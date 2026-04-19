# ADR-001: AI Task Generation — Key Decisions

**Date:** 2026-04-14
**Status:** Accepted

## 1. Model: GPT-5.4-mini (for task generation)

- **Why:** Optimized for agentic/tool-calling workflows; ~2x faster than GPT-4o on single tool calls (benchmarked at ~4s vs ~8s). Released March 2026 — long support runway.
- **Trade-off:** ~5x more expensive per token than GPT-4o-mini, but per-request volume is tiny (short voice transcripts + a few tool calls), so absolute cost is negligible.
- **Rejected:** GPT-4o (too slow for real-time voice UX), GPT-4o-mini (retiring March 2027, weaker at tool use).

## 2. Tool/function calling over structured output

- **Why:** Each tool is a self-documenting contract. Scales cleanly as we add item types (recurring tasks, overdue tasks, notes, regular tasks) without bloating the system prompt.
- **Rejected:** Structured output via large system prompt — becomes unwieldy as schema grows; harder to maintain and validate.

## 3. Multi-item tool calls (CreateTasks, CreateNotes)

- **Why:** When users mention multiple items, the model would otherwise call `CreateTask` repeatedly — each invocation requires a separate LLM round-trip. With GPT-5.4-mini, 1 tool call = ~4s but 3 sequential calls = ~10s. Multi-item tools accept arrays, so the model calls once for all items.
- **Keep singular versions** for single-item cases and for update/remove operations.

## 4. Azure AI Agent SDK (Microsoft.Agents.AI)

- **Why:** Aligns with Microsoft's current direction. Provides built-in session management and tool orchestration.
- **Rejected:** Semantic Kernel (previous generation), raw Chat Completions (loses agent session / tool orchestration benefits).

## Benchmark Reference

| Scenario | GPT-4o | GPT-5.4-mini |
|---|---|---|
| 3 sequential tool calls | AgentRun=8,039ms | AgentRun=10,348ms |
| 1 tool call | AgentRun=8,222ms | AgentRun=4,243ms |

These benchmarks drove decisions #1 and #3.
