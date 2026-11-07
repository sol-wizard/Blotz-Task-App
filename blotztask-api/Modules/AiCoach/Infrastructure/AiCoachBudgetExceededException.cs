using BlotzTask.Modules.AiUsage.Exceptions;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

public enum AiCoachBudgetScope
{
    /// <summary>The user's free monthly allowance is used up.</summary>
    User,
    /// <summary>The environment-wide monthly cap is reached; AI Coach is paused for everyone.</summary>
    Environment,
}

// Derives from the shared quota exception so existing "quota" handling keeps applying.
public sealed class AiCoachBudgetExceededException(AiCoachBudgetScope scope, DateOnly resetsOn)
    : AiQuotaExceededException(scope == AiCoachBudgetScope.User
        ? $"AI Coach monthly allowance is used up; it resets on {resetsOn:yyyy-MM-dd} (Perth)."
        : $"AI Coach monthly budget is exhausted; it resets on {resetsOn:yyyy-MM-dd} (Perth).")
{
    public AiCoachBudgetScope Scope { get; } = scope;
    public DateOnly ResetsOn { get; } = resetsOn;
}
