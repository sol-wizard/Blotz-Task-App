using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Options = Microsoft.Extensions.Options.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class AiCoachBudgetTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    // SegmentClock starts on 2026-10-16 in Perth, so the budget month is October 2026.
    private static readonly DateOnly November = new(2026, 11, 1);

    [Fact]
    public async Task Handle_NoSpendThisMonth_ReportsFullAllowance()
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture);
        await kit.Budget.ChargeAsync(kit.Db, kit.UserId, 0.40m, budgetDate: new DateOnly(2026, 9, 30));
        await kit.Budget.ChargeAsync(kit.Db, kit.UserId, 0.40m, environmentName: "other-environment");

        // Act
        var allowance = await kit.AllowanceAsync();

        // Assert
        allowance.Should().Be(new AiCoachAllowanceDto(100, AiCoachAllowanceState.Available, November),
            because: "last month's spend and another environment's spend do not count against this month");
    }

    [Theory]
    [InlineData(0.39, 22, AiCoachAllowanceState.Available)]
    [InlineData(0.40, 20, AiCoachAllowanceState.Low)]
    [InlineData(0.4999, 0, AiCoachAllowanceState.Low)]
    [InlineData(0.50, 0, AiCoachAllowanceState.Exhausted)]
    [InlineData(0.53, 0, AiCoachAllowanceState.Exhausted)]
    public async Task Handle_PartlySpentAllowance_ReportsRoundedDownPercentAndState(decimal spentUsd, int percent, string state)
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture);
        await kit.Budget.ChargeAsync(kit.Db, kit.UserId, spentUsd);

        // Act
        var allowance = await kit.AllowanceAsync();

        // Assert
        allowance.RemainingPercent.Should().Be(percent, because: "the percent is rounded down and never negative after an overdraw");
        allowance.State.Should().Be(state, because: $"{AiCoachAllowanceState.Low} starts at {GetAiCoachAllowanceQueryHandler.LowPercent}% left and only no allowance at all is exhausted");
    }

    [Fact]
    public async Task Handle_EnvironmentCapReached_ReportsPausedAndRefusesReservation()
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture, monthlyBudgetUsd: 1m);
        await kit.Budget.ChargeAsync(kit.Db, userId: null, 1m);

        // Act
        var allowance = await kit.AllowanceAsync();
        var reserve = () => kit.Budget.Budget.ReserveAsync(kit.UserId, "test", 0.01m, default);

        // Assert
        allowance.State.Should().Be(AiCoachAllowanceState.Paused, because: "other users' spend reached the monthly cap");
        allowance.RemainingPercent.Should().Be(100, because: "the user's own allowance is untouched");
        (await reserve.Should().ThrowAsync<AiCoachBudgetExceededException>()).Which.Scope
            .Should().Be(AiCoachBudgetScope.Environment, because: "the cap stops calls for everyone");
    }

    [Fact]
    public async Task Handle_AllowanceAlmostUsed_AdmitsOneLastCallThenRefuses()
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture);
        await kit.Budget.ChargeAsync(kit.Db, kit.UserId, 0.499m);

        // Act
        var reservation = await kit.Budget.Budget.ReserveAsync(kit.UserId, "test", 0.007m, default);
        var next = () => kit.Budget.Budget.ReserveAsync(kit.UserId, "test", 0.007m, default);

        // Assert
        (await kit.Db.AiCoachBudgetCharges.AsNoTracking().SingleAsync(x => x.Id == reservation)).UserId
            .Should().Be(kit.UserId, because: "the reservation is charged to the user who made the call");
        var refused = (await next.Should().ThrowAsync<AiCoachBudgetExceededException>()).Which;
        refused.Scope.Should().Be(AiCoachBudgetScope.User, because: "the overdrawn allowance admits no further call");
        refused.ResetsOn.Should().Be(November, because: "the allowance comes back on the first of next month in Perth");
    }

    [Fact]
    public async Task Handle_NewMonth_RestoresAllowance()
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture);
        await kit.Budget.UseUpAllowanceAsync(kit.Db, kit.UserId);
        kit.Clock.Now = new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.FromHours(8));

        // Act
        var allowance = await kit.AllowanceAsync();
        var reserve = () => kit.Budget.Budget.ReserveAsync(kit.UserId, "test", 0.007m, default);

        // Assert
        allowance.Should().Be(new AiCoachAllowanceDto(100, AiCoachAllowanceState.Available, new DateOnly(2026, 12, 1)),
            because: "the allowance resets at midnight on the first of the month in Perth");
        await reserve.Should().NotThrowAsync(because: "October's spend no longer counts");
    }

    private sealed class Kit : IAsyncDisposable
    {
        private readonly ServiceProvider _services;
        private readonly GetAiCoachAllowanceQueryHandler _handler;
        public BlotzTaskDbContext Db { get; }
        public ConversationSegmentTests.SegmentClock Clock { get; } = new();
        public TestCoachBudget Budget { get; }
        public Guid UserId { get; private set; }

        private Kit(DatabaseFixture fixture, decimal? monthlyBudgetUsd)
        {
            Db = new(fixture.Options);
            _services = new ServiceCollection().AddScoped(_ => new BlotzTaskDbContext(fixture.Options)).BuildServiceProvider();
            var settings = TestCoachBudget.Options("budget");
            settings.MonthlyBudgetUsd = monthlyBudgetUsd ?? settings.MonthlyBudgetUsd;
            var options = Options.Create(settings);
            Budget = new(_services.GetRequiredService<IServiceScopeFactory>(), Clock, options);
            _handler = new(Budget.Budget, options);
        }

        public static async Task<Kit> CreateAsync(DatabaseFixture fixture, decimal? monthlyBudgetUsd = null)
        {
            var kit = new Kit(fixture, monthlyBudgetUsd);
            kit.UserId = await new DataSeeder(kit.Db).CreateUserAsync();
            return kit;
        }

        public Task<AiCoachAllowanceDto> AllowanceAsync() =>
            _handler.Handle(new GetAiCoachAllowanceQuery { UserId = UserId });

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await _services.DisposeAsync();
        }
    }
}
