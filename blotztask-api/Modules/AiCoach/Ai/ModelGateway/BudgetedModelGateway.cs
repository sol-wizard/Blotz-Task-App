using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>Applies the shared budget to every call, including context compression and digests.</summary>
public sealed class BudgetedModelGateway(IModelGateway inner, AiCoachModelProfile profile,
    AiCoachDailyBudget budget, int contextTokenBudget, ILogger<BudgetedModelGateway> logger) : IModelGateway
{
    // Responses may replay provider reasoning items which are absent from the public transcript.
    private long _priorOutputTokens;
    public AiCoachModelProfile Profile => profile;
    public IModelGateway OpenTurn() => new BudgetedModelGateway(inner.OpenTurn(), profile, budget, contextTokenBudget, logger);

    public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
    {
        if (!budget.Enabled) return await inner.CompleteAsync(request, cancellationToken);
        if (profile.InputTokenUsdPerMillion is not > 0 || profile.OutputTokenUsdPerMillion is not > 0)
            throw new InvalidOperationException("AI Coach daily budget requires configured positive model prices.");
        var outputLimit = Math.Min(request.MaxOutputTokens ?? profile.MaxOutputTokens, profile.MaxOutputTokens);
        if (outputLimit <= 0) throw new InvalidOperationException("AI Coach output limit must be positive.");
        request = request with { MaxOutputTokens = outputLimit };
        // UTF-8 bytes conservatively bound text tokens; add envelope room and use the larger of
        // this estimate and the configured context budget. Cached input is reserved at full price.
        var inputBound = Math.Max((long)contextTokenBudget,
            (long)ModelContextBuilder.Bytes(request.SystemPrompt) + ModelContextBuilder.Size(request.Messages)
            + ModelContextBuilder.Size(request.Tools) + 8192L) + _priorOutputTokens;
        var inputRate = Math.Max(profile.InputTokenUsdPerMillion.Value,
            profile.CachedInputTokenUsdPerMillion ?? profile.InputTokenUsdPerMillion.Value);
        var reservedUsd = decimal.Ceiling((inputBound * inputRate
            + outputLimit * profile.OutputTokenUsdPerMillion.Value) / 1_000_000m * 10_000_000_000m) / 10_000_000_000m;
        var reservation = await budget.ReserveAsync(profile.Name, reservedUsd, cancellationToken);
        // Exceptions, cancellation and missing usage retain the reservation for this budget date.
        var result = await inner.CompleteAsync(request, cancellationToken);
        _priorOutputTokens += Math.Max(0, result.OutputTokens);
        if (result.InputTokens < 0 || result.OutputTokens < 0 || result.CachedInputTokens < 0
            || result.CachedInputTokens > result.InputTokens || result.TotalTokens <= 0
            || (long)result.InputTokens + result.OutputTokens != result.TotalTokens)
        {
            logger.LogWarning("AiCoach model {Model} returned incomplete usage; retaining budget reservation {ReservationId}",
                profile.Name, reservation);
            return result;
        }
        var actualUsd = profile.EstimateUsd(result.InputTokens, result.CachedInputTokens, result.OutputTokens)!.Value;
        if (actualUsd > reservedUsd)
            logger.LogError("AiCoach model {Model} exceeded reservation {ReservationId}: {ActualUsd} actual, {ReservedUsd} reserved",
                profile.Name, reservation, actualUsd, reservedUsd);
        await budget.SettleAsync(reservation, actualUsd);
        return result;
    }
}
