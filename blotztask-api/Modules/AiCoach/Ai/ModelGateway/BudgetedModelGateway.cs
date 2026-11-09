using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>Applies the environment cap and the user's allowance to every call, including context compression and digests.</summary>
public sealed class BudgetedModelGateway(IModelGateway inner, AiCoachModelProfile profile,
    AiCoachBudget budget, Guid? userId, int contextTokenBudget, ILogger<BudgetedModelGateway> logger) : IModelGateway
{
    // Responses may replay provider reasoning items which are absent from the public transcript.
    private long _priorOutputTokens;
    public AiCoachModelProfile Profile => profile;
    public IModelGateway OpenTurn() => new BudgetedModelGateway(inner.OpenTurn(), profile, budget, userId, contextTokenBudget, logger);
    public IModelGateway OpenTurn(Guid user) => new BudgetedModelGateway(inner.OpenTurn(), profile, budget, user, contextTokenBudget, logger);

    public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
    {
        if (!budget.Enabled) return await inner.CompleteAsync(request, cancellationToken);
        if (profile.InputTokenUsdPerMillion is not > 0 || profile.OutputTokenUsdPerMillion is not > 0)
            throw new InvalidOperationException("AI Coach budgets require configured positive model prices.");
        var outputLimit = Math.Min(request.MaxOutputTokens ?? profile.MaxOutputTokens, profile.MaxOutputTokens);
        if (outputLimit <= 0) throw new InvalidOperationException("AI Coach output limit must be positive.");
        request = request with { MaxOutputTokens = outputLimit };
        // UTF-8 bytes conservatively bound text tokens; add envelope room and use the larger of
        // this estimate and the configured context budget. Cached input is reserved at full price.
        var inputBound = Math.Max((long)contextTokenBudget,
            (long)ModelContextBuilder.Bytes(request.SystemPrompt) + ModelContextBuilder.Size(request.Messages)
            + ModelContextBuilder.Size(request.Tools) + 8192L) + _priorOutputTokens;
        var reservedUsd = profile.ReservationUsd(inputBound, outputLimit);
        var reservation = await budget.ReserveAsync(userId, profile.Name, reservedUsd, cancellationToken);
        // Rejected requests are refunded; cancellation, timeouts, other exceptions and missing usage
        // retain the reservation, since the provider may still bill them.
        ModelCompletionResult result;
        try
        {
            result = await inner.CompleteAsync(request, cancellationToken);
        }
        catch (Exception ex) when (IsUnbilledRejection(ex))
        {
            await RefundAsync(reservation);
            throw;
        }
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

    /// <summary>Azure does not bill a request it answers with 404, 429 or 5xx.</summary>
    private static bool IsUnbilledRejection(Exception ex)
    {
        var status = ex switch
        {
            System.ClientModel.ClientResultException client => client.Status,
            HttpRequestException { StatusCode: { } code } => (int)code,
            _ => 0,
        };
        return status is 404 or 429 or >= 500;
    }

    private async Task RefundAsync(Guid reservation)
    {
        try
        {
            await budget.SettleAsync(reservation, 0m);
        }
        catch (Exception ex)
        {
            // Keep the provider error for the caller; a failed refund only over-counts spend.
            logger.LogError(ex, "AiCoach could not refund rejected call reservation {ReservationId}", reservation);
        }
    }
}
