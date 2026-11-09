using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Application.Queries;

public static class AiCoachAllowanceState
{
    public const string Available = "available";
    /// <summary>At or below <see cref="GetAiCoachAllowanceQueryHandler.LowPercent"/> of the allowance left.</summary>
    public const string Low = "low";
    /// <summary>The user's own allowance is used up until <c>ResetsOn</c>.</summary>
    public const string Exhausted = "exhausted";
    /// <summary>The environment-wide monthly cap cannot fit one more call; AI Coach is off for everyone until <c>ResetsOn</c>.</summary>
    public const string Paused = "paused";
}

/// <param name="RemainingPercent">Rounded down, 0–100. It can be 0 while State is still usable: the client shows "&lt;1%".</param>
/// <param name="ResetsOn">First day of next month in Perth, when both limits reset.</param>
public sealed record AiCoachAllowanceDto(int RemainingPercent, string State, DateOnly ResetsOn);

public class GetAiCoachAllowanceQuery
{
    public required Guid UserId { get; init; }
}

/// <summary>
/// Percent and state only: dollars and tokens stay server-side, so prices and models can change
/// without the app changing.
/// </summary>
public class GetAiCoachAllowanceQueryHandler(AiCoachBudget budget, IOptions<AiCoachModuleOptions> options)
{
    public const int LowPercent = 20;

    public async Task<AiCoachAllowanceDto> Handle(GetAiCoachAllowanceQuery query, CancellationToken ct = default)
    {
        if (!budget.Enabled)
            return new(100, AiCoachAllowanceState.Available, budget.CurrentMonth().NextStart);

        var usage = await budget.GetUsageAsync(query.UserId, ct);
        var allowance = options.Value.UserMonthlyAllowanceUsd!.Value;
        var remaining = Math.Max(0m, allowance - usage.UserUsedUsd);
        var percent = (int)Math.Floor(remaining / allowance * 100m);

        // Mirrors AiCoachBudget.ReserveAsync: any allowance left still admits a call, but the
        // environment cap refuses a reservation that would go over it. Paused therefore starts as
        // soon as the pot cannot fit one worst-case call, before the user types a doomed message.
        var profile = AiCoachModelProfile.Select(options.Value);
        var oneCallUsd = profile.ReservationUsd(options.Value.ContextTokenBudget, profile.MaxOutputTokens);
        var state = remaining <= 0m ? AiCoachAllowanceState.Exhausted
            : usage.EnvironmentUsedUsd + oneCallUsd > options.Value.MonthlyBudgetUsd!.Value ? AiCoachAllowanceState.Paused
            : percent <= LowPercent ? AiCoachAllowanceState.Low
            : AiCoachAllowanceState.Available;
        return new(percent, state, usage.ResetsOn);
    }
}
