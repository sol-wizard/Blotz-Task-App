using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// The real SQL-backed AI Coach budget for one test session. Each session gets its own environment
/// name, so its monthly total and its budget lock are isolated from tests running in parallel.
/// </summary>
internal sealed class TestCoachBudget
{
    public const decimal UserAllowanceUsd = 0.50m;

    public string EnvironmentName { get; } = $"test-{Guid.NewGuid():N}"[..32];
    public AiCoachBudget Budget { get; }
    private readonly IOptions<AiCoachModuleOptions> _options;

    public TestCoachBudget(IServiceScopeFactory scopes, TimeProvider clock, IOptions<AiCoachModuleOptions> options)
    {
        _options = options;
        Budget = new AiCoachBudget(scopes, clock, new HostingEnvironment { EnvironmentName = EnvironmentName },
            options, NullLogger<AiCoachBudget>.Instance);
    }

    /// <summary>Options with budgets on and positive prices on the legacy profile.</summary>
    public static AiCoachModuleOptions Options(string deploymentId) => new()
    {
        DeploymentId = deploymentId,
        MonthlyBudgetUsd = 1_000m,
        UserMonthlyAllowanceUsd = UserAllowanceUsd,
        InputTokenUsdPerMillion = 0.10m,
        OutputTokenUsdPerMillion = 0.50m,
    };

    public IModelGateway Wrap(IModelGateway inner) => new BudgetedModelGateway(inner,
        AiCoachModelProfile.Select(_options.Value), Budget, null, _options.Value.ContextTokenBudget,
        NullLogger<BudgetedModelGateway>.Instance);

    /// <summary>Records this month's whole allowance as spent, so the next model call is refused.</summary>
    public Task UseUpAllowanceAsync(BlotzTaskDbContext db, Guid userId) =>
        ChargeAsync(db, userId, UserAllowanceUsd);

    /// <summary>Records settled spend; by default in this session's environment and current month.</summary>
    public async Task ChargeAsync(BlotzTaskDbContext db, Guid? userId, decimal usd,
        DateOnly? budgetDate = null, string? environmentName = null)
    {
        db.AiCoachBudgetCharges.Add(new AiCoachBudgetCharge
        {
            Id = Guid.NewGuid(), UserId = userId, BudgetDate = budgetDate ?? Budget.CurrentMonth().Start,
            Environment = environmentName ?? EnvironmentName, Model = "test", ChargedUsd = usd, Settled = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
