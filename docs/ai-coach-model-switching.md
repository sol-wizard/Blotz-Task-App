# AI Coach model selection

AI Coach supports three Azure staging model deployments behind the same mobile API:

| Profile | Deployment | Transport | Default reasoning | Input / cached input / output USD per 1M tokens |
|---|---|---|---|---|
| `luna` | `gpt-5.6-luna` | Chat Completions | Provider default | 0.20 / 0.02 / 1.20 |
| `luna6` | `gpt-6-luna` | Responses | `medium` | 0.10 / 0.01 / 0.50 |
| `sol` | `gpt-6.1-sol` | Responses | `medium` | 2.00 / 0.10 / 10.00 |

The staging deployments use Global Standard. The Luna/Sol prices above are public short-context list-rate estimates, verified on 2026-10-24; Luna 6 uses OpenAI Standard list rates verified on 2026-10-27, pending confirmation against the Azure subscription's billed rates. They are not billed Azure charges. Override the profile's rates for other SKUs, negotiated rates, or future price changes. The current context budget is below long-context pricing thresholds. Cache-write charges are not exposed separately by the gateway, so the estimate does not claim invoice accuracy.

## Configuration

Profiles live under `AiCoach:Models` in `blotztask-api/appsettings.json`. Each declares `DeploymentId`, `Api`, `MaxOutputTokens`, `RequestTimeoutSeconds`, optional `ReasoningEffort`, and per-million token prices. Endpoint and credentials continue to come from `AzureOpenAI`; never put secrets in a profile or an operations log.

Set `AiCoach__DefaultModel` to `luna`, `luna6`, or `sol` in the target App Service. This selects a profile; changing only the old `AiCoach__DeploymentId` does not select the Responses adapter. Sol and Luna 6 use Responses for reasoning with tool calls. All profiles are validated at startup, including when inactive.

An empty `DefaultModel` retains the old `AiCoach:DeploymentId` / task-generation fallback and its Chat Completions transport. This preserves environments that have not adopted named profiles. The shipped shared configuration leaves this selection empty so deployment alone does not change other environments. Enable a named profile explicitly on staging.

For local development, prefix the backend launch command with `AiCoach__DefaultModel=sol` (or `luna`). No mobile release is required.

## Switch on staging

After deploying the reviewed backend build to the intended staging API, select Luna initially:

```sh
az webapp config appsettings set \
  --resource-group rg-blotz-task-stag \
  --name app-blotz-task-api-stag \
  --settings AiCoach__DefaultModel=luna \
  --output none
```

To select Sol, run the same command with `AiCoach__DefaultModel=sol`; for Luna 6, use `AiCoach__DefaultModel=luna6`. To roll back the selection, restore its previous value. Use the exact App Service the installed staging build points to; the separate `app-blotz-task-api-v2` test lane is not interchangeable with `app-blotz-task-api-stag`.

On 2026-10-27, Luna 6 was provisioned as `gpt-6-luna` version `2026-09-22` on `oai-blotz-task-stag` in `eastus2`, initially with GlobalStandard capacity 10 (10K TPM), then increased to 50 (50K TPM) during the three-model benchmark after continuous requests encountered `model_unavailable`. This matches the other two deployments' capacity; the initial failed run is retained in the benchmark artifacts, and the provider error cause was not independently confirmed. The existing V2 test lane received the `AiCoach__Models__luna6__*` settings, allowing its existing configuration-driven selector to use the new profile without a backend package deployment. Its default remains `sol`. To switch that lane specifically:

```sh
az webapp config appsettings set \
  --subscription 2e0556cd-6817-4bb3-9052-e4806f9796ad \
  --resource-group rg-blotz-task-stag \
  --name app-blotz-task-api-v2 \
  --settings AiCoach__DefaultModel=luna6 \
  --output none
```

Use `luna` or `sol` in that same command to select the other profiles. The V2 settings intentionally duplicate the new shared JSON profile so it is available before the next backend release; update both when changing Luna 6's limits or estimated prices.

App Service restarts when settings change. Active replies can be interrupted. Wait for `/health` to recover before testing. This release does not provide uninterrupted switching, an admin endpoint, or automatic fallback. Reverting the backend code still uses the retained legacy deployment settings.

## Turn state and observability

The runtime opens one gateway session per user message. Its immutable profile determines every call's model, output cap, timeout, and price, including context summaries. Background digests open separate sessions using the same default selection.

Sol uses `store: false`. Within a tool loop, the session replays provider output items, including encrypted reasoning, message phases, and tool IDs. These items stay in the session and are discarded after the turn. Durable history remains provider-independent text/tool history, so the next user turn can select a different model. Concurrent requests do not share a continuation dictionary.

Model request/response traces include the selected profile, deployment, and transport. Request traces also include reasoning effort. Existing trace events contain message content under the existing trace policy; new HTTP errors exclude provider response bodies. Usage includes cached input tokens and output reasoning tokens as reported by the provider.

Debug costs are accumulated per turn at that turn's rates. Missing rates produce an unknown estimate (`null`), not zero. Existing in-memory debug totals reset on application restart; durable quota accounting remains unchanged.

## Verification

On 2026-10-27, profile/Responses transport checks passed (21 tests), and all 15 live model-switching cases passed against Azure, including the six cross-model draft-correction directions. The live harness registers a real Development host environment and logging for the daily-budget dependency; this suite does not exercise the durable staging budget/database. The V2 App Service accepted `DefaultModel=luna6` and returned `Healthy` from `/health`; its selection was then restored to `sol`. These checks do not replace the installed mobile build verification below. Live results are saved in the ignored `blotztask-test/TestResults/luna6-model-switching-2026-10-27.trx`.

From `blotztask-test/`:

```sh
dotnet test --filter 'FullyQualifiedName~AiCoach.ModelProfileTests|FullyQualifiedName~AiCoach.ResponsesTransportTests'
AICOACH_MODEL_TESTS=1 dotnet test --filter 'FullyQualifiedName~AiCoach.ModelSwitchingLiveTests'
```

The live suite requires the existing local staging credentials in the ignored `appsettings.Development.json`. It calls real staging models through the production dependency registration, gateway, and runtime. It checks English/Chinese streaming replies, concurrent tool round trips, and draft correction across all six model-switch directions. It does not write formal tasks or deploy an API.

Before declaring staging verification complete, use an installed TestFlight staging build against the deployed staging API. Verify ordinary replies, streamed text, draft creation/correction in both languages, an existing chat across a model switch, traces, and switching back to Luna. Direct calls from a developer machine do not replace this installed-build check.

## References

- [Azure Responses API: streaming, tools, and reasoning continuation](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses)
- [App Service application settings and restart behavior](https://learn.microsoft.com/en-us/azure/app-service/configure-common)
- [Microsoft Foundry GPT-5.6 pricing](https://azure.microsoft.com/en-us/blog/gpt-5-6-now-available-in-microsoft-foundry/)
- [Microsoft Foundry GPT-6.1 Sol pricing](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/introducing-gpt-6-1-sol-in-microsoft-foundry-advanced-intelligence-optimized-for/4560811)
- [OpenAI GPT-6 Luna pricing and tool compatibility](https://developers.openai.com/api/docs/models/gpt-6-luna)
