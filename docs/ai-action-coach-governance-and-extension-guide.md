# Maintaining AiCoach

AiCoach lets the model control conversation while the application controls data operations. The current implementation is described in [the technical design](ai-action-coach-technical-design-v3.md).

## Where a change belongs

| Change | Location |
| --- | --- |
| General conversational behavior or mode preference | `Ai/Prompts/CoachPrompt.cs` |
| Draft tool descriptions, argument validation and draft edits | `Ai/Tools/DraftTools.cs` |
| Read-only task context projection | `Application/Queries/TaskContextReader.cs` |
| Context selection, summaries and context budgets | `Ai/Runtime/ModelContextBuilder.cs` |
| Model calls, shared budgets, timeout/cancellation and tool loop | `Ai/Runtime/ModelTurnRuntime.cs` |
| Tool dispatch, execution budgets and duplicate-call handling | `Ai/Tools/ToolExecutor.cs` |
| Operational permissions and computed UI actions | `Domain/Policy/OperationPolicy.cs` |
| Atomic turn completion and legal save transitions | `Domain/Conversations/Conversation.cs`, `Domain/Proposals/ProposalSet.cs` |
| Provider-specific request mapping | `Ai/ModelGateway/AzureOpenAIModelGateway.cs` |
| Session message acceptance and completion | `Application/Orchestration/ConversationApplication.cs` |
| UI draft editing, confirmation and discard | `Application/Commands/` |
| Snapshot projection | `Application/Projections/ConversationSnapshotDto.cs` |
| Mobile rendering and network reconciliation | `blotztask-mobile/src/feature/ai-coach/` |

## Conversation changes

The current user-maintained prompt was preserved verbatim during the layer refactor. Change prompt content only within a separately authorized behavior change. Let the current user request and conversation context determine whether the response should contain questions, advice, reflection or a draft.

Do not introduce an intent classifier, proof quote, allowed-strategy list or response category merely to validate prose. Conversation quality belongs in real multi-turn evaluation. Data validation belongs at the operation that uses that data.

The three modes are preferences, not different state machines. They use the same tool capabilities. Keep only one active prompt implementation; track its version for diagnosis rather than retaining executable historical policy branches.

Keep `CoachPrompt.PromptVersion` and `ToolExecutor.ContractVersion` separate in usage logs. Change the prompt version when model-facing conversation guidance changes; change the tool contract version when tool names, descriptions or argument schemas change. Source-only organization that preserves all three assembled prompts byte for byte does not require a behavior evaluation.

For a prompt behavior change, add a short entry here before release:

| Version and date | Purpose and changed sections/modes | Scenarios checked | Observed behavior and token impact |
| --- | --- | --- | --- |
| `coach-prompt-6` / 2026-09-27 | Baseline after organizing the shared guidance; assembled text is unchanged in Execution, Clarify and Companion. Tool contract baseline: `draft-tools-1`; the previous combined log tag was `coach-tools-6`. | Byte-for-byte comparison of all three assembled prompts. | No model-facing change or token impact from this organization. |
| `coach-prompt-7` / 2026-09-27 | Shared guidance in all modes now delivers an accepted content offer directly, separates inference from user facts, preserves goal scope and limits, and keeps draft details faithful to accepted actions. `create_draft` description changed in `draft-tools-2`. | Backend build; 16 draft workflow checks; 4 live model checks covering ordinary conversation across modes and draft create/edit. | All listed checks passed. The two multi-turn quality examples that motivated the change have not been replayed against the live model; quality effect and token impact remain unmeasured. |
| `coach-prompt-8` / 2026-09-27 | Follow-up to a captured Clarify conversation: stop after delivering an accepted comparison, avoid invented decision horizons, and distinguish a created draft from a saved task. `draft-tools-3` asks for tentative scheduling defaults and an explicit draft-status reply. | Reviewed the captured multi-turn conversation; backend build; 16 draft workflow checks; 4 live model checks covering ordinary conversation and draft create/edit. | All runnable checks passed. The captured comparison and date-only draft scenario have not been replayed against this version; the specific wording improvement and token impact remain unmeasured. |
| `coach-prompt-10` / 2026-09-27 | On-demand task-app context: check relevant existing tasks before schedule-dependent answers, treat task records as data, and disclose successful reads. `coach-tools-5` adds bounded `list_tasks`. | Backend and test-project builds; 16 existing draft workflow checks; targeted mobile lint. Full mobile typecheck remains blocked by existing errors in `react-native-calendars` and an unrelated widget hook. | Live model behavior, latency and token impact remain unmeasured. |

## Tool changes

Tools describe actions and their actual parameters. Validate object ownership, supplied fields and storage constraints. Return concrete success/error data to the model. Never claim a failed operation succeeded. Preserve atomicity for a multi-item update and stable IDs for unchanged items.

Draft tools operate only on turn-local unsaved data. Formal writes are separate app commands, with version checks and idempotency receipts. Adding a real external side effect would need a deliberate application-level authorization and persistence design; ordinary text classification must not become its permission token.

## State changes

Add state only for actual data or execution facts: a running request, a draft, a saved task identity or a retry receipt. Do not store a second representation of what the user "must mean" or which conversational stage should come next.

Derive UI capabilities from those facts. Keep them out of model prompts. App-side changes must be included in subsequent context so the model sees the same draft content the user sees.

## Checks

Use [AI Coach evaluation](ai-action-coach-evaluation.md) for current scenario coverage, commands and result interpretation. Record objective failures separately from semantic review; a passing live test alone does not establish conversation quality.

Run the backend build, focused draft integration tests and frontend type/lint checks. Use the real-model checks when changing prompt, context or tool contracts. Record unavailable infrastructure or skipped live checks explicitly.

Preserve meaningful assertions about identity, transaction rollback, version conflicts and ownership. Avoid assertions that freeze natural wording, require exactly one question or force a particular conversational move.

## Policy is an operational boundary

Keep policy centralized when several callers need the same eligibility decision. Current checks answer whether a session can start an operation, whether a draft/item is editable, and which actions the UI may expose. They do not decide whether the assistant should listen, ask or advise.

Keep domain invariants in transition methods as well: a policy is a preflight decision, not a substitute for valid state mutation. Use `Conversation.CompleteTurn` under the application lock to reject stale/late/failed work atomically. Do not separately mutate drafts and then remember to clear the running turn.

## Stability coverage

Preserve scenario coverage when contracts change. Replace assertions about removed strategy names with assertions about actual outcomes: discarded stale results, released cancelled requests, unchanged newer turns, no duplicate tool mutations, valid save transitions and transaction rollback.

Do not recreate the old generic Kernel/Effect machinery solely for layering. The concrete context builder, operation policy, tool executor, runtime and application each have a distinct job and are invoked by production paths. Add another interface only when it represents an actual variation or a needed integration boundary.

The refactor does not roll back multiple drafts, nullable draft times or protocol 3, nor introduce a further mobile protocol change. Durable idempotency and process-restart recovery remain separate persistence work; retaining policy/runtime layers alone cannot provide them.
