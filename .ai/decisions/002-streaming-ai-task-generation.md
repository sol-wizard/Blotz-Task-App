# Streaming AI Task Generation — Perceived Latency Improvement

## 1. What changed

Added progressive/streamed rendering to the voice-to-task flow. Users now see the transcript and each extracted task card as soon as they are produced, instead of waiting for the full response.

### Files

**Behaviour changes**

| File | Change |
|---|---|
| `blotztask-api/.../Functions/TaskGenerationTools.cs` | Added nullable `OnTaskStreamed` / `OnNoteStreamed` callbacks. `CreateTask` / `CreateNote` (singular) became `async` and fire the callback right after adding the item. **`CreateTasks` / `CreateNotes` (batch) were not updated — see next steps.** |
| `blotztask-api/.../AiTaskGenerateChatHub.cs` | Wires callbacks to push `ReceiveTaskExtracted` / `ReceiveNoteExtracted` over SignalR. Also pushes `ReceiveTranscript` right after Whisper returns, before the LLM runs. |
| `blotztask-mobile/.../hooks/useAiTaskGenerator.ts` | Registers handlers for the three new SignalR events. Maintains `streamedTasks` / `streamedNotes` / `interimTranscript`. Resets on new request + final `ReceiveMessage`. Includes a stale-event guard. |
| `blotztask-mobile/.../screens/ai-task-sheet-screen.tsx` | Renders `AiResultList` as soon as streamed content arrives. Hides the full-screen `ListeningIndicator` at that point and replaces it with a compact "still generating…" hint. |

**Instrumentation only (no behaviour change)**

`SpeechTranscriptionService.cs`, timing stopwatches in `AiTaskGenerateChatHub.cs`, `useVoiceRecorder.ts`, and client-side timing logs in `useAiTaskGenerator.ts`. All logs prefixed `VoiceTiming:` for easy filtering.

### Why it's a small diff

~60 lines of real logic. The SDK (`Microsoft.Agents.AI`) already separates "LLM emits tool call" from "tool executes", so we hooked a callback into the existing tool-execution path. No partial-JSON parsing, no new DTO, no new UI component. Streamed and final items share the same `Id`, so React reconciles cleanly when the final `ReceiveMessage` arrives.

## 2. Measured improvement

Measured from mic release across three real voice inputs (iOS simulator):

| Run | Input | Without streaming (time to final) | With streaming (time to first card) | Saving | % faster |
|---|---|---|---|---|---|
| 1 | 4 tasks | 7.58s | 5.38s | −2.20s | 29% |
| 2 | 1 task  | 4.61s | 2.11s | −2.50s | 54% |
| 3 | 3 tasks | 5.23s | 2.93s | −2.30s | 44% |
| **Avg** | — | **5.81s** | **3.47s** | **−2.33s** | **~40%** |

All three runs produced a consistent ~2.3s "wrap-up tail" between the last streamed task and the final `ReceiveMessage` — this is the LLM's final turn to say "done", and it is the biggest remaining latency source.

## 3. Cost impact

**Net effect: negligible to slightly positive.**

| Item | Impact |
|---|---|
| LLM tokens (OpenAI/Azure) | **No change.** Same model, same prompt, same tool-call structure. |
| SignalR messages | +3–8 extra `Send` calls per voice request (1 transcript + N task/note events). On Azure SignalR free/standard tier this is well inside the included message quota; on paid tier the marginal cost is fractions of a cent per thousand. |
| Azure SignalR connection time | No change; connection is already held open. |
| Whisper | No change. |
| Logging volume | Small increase from `VoiceTiming:` logs. Consider gating behind a debug flag before production rollout if log storage is billed. |

**No new services, no new SDKs, no new models were introduced by this change.** Cost exposure from future recommendations is called out in §4.