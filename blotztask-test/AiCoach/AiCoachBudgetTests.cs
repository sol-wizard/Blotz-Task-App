using System.Net;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
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
    public async Task Handle_EnvironmentCapFilledByRealCalls_ReportsPausedBeforeTheRefusedCall()
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture, monthlyBudgetUsd: 0.05m);
        var pot = kit.Budget.Wrap(new CannedGateway(() => FullCall));
        var states = new List<string>();

        // Act: other traffic spends the pot one worst-case call at a time, while the app keeps asking.
        for (var calls = 0; calls < 100; calls++)
        {
            var current = await kit.AllowanceAsync();
            states.Add(current.State);
            if (current.State == AiCoachAllowanceState.Paused) break;
            await pot.OpenTurn().CompleteAsync(Request, default);
        }
        var allowance = await kit.AllowanceAsync();
        var send = () => kit.Budget.Wrap(new CannedGateway(() => FullCall)).OpenTurn(kit.UserId).CompleteAsync(Request, default);

        // Assert
        states.Should().EndWith(AiCoachAllowanceState.Paused,
            because: "every call admitted while the state said available succeeded, and paused followed before any refusal");
        allowance.RemainingPercent.Should().Be(100, because: "the user's own allowance is untouched");
        (await send.Should().ThrowAsync<AiCoachBudgetExceededException>()).Which.Scope
            .Should().Be(AiCoachBudgetScope.Environment, because: "paused means the pot cannot fit the user's next call");
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task Handle_ProviderRejectsCall_RefundsReservation(HttpStatusCode status)
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture);
        var gateway = kit.Budget.Wrap(new CannedGateway(() => throw new HttpRequestException("rejected", null, status)))
            .OpenTurn(kit.UserId);

        // Act
        var call = () => gateway.CompleteAsync(Request, default);

        // Assert
        await call.Should().ThrowAsync<HttpRequestException>(because: "the provider error still reaches the turn runtime");
        (await kit.AllowanceAsync()).RemainingPercent.Should().Be(100, because: "Azure does not bill a request it rejects");
    }

    [Fact]
    public async Task Handle_CallFailsWithoutStatus_RetainsReservation()
    {
        // Arrange
        await using var kit = await Kit.CreateAsync(fixture);
        var gateway = kit.Budget.Wrap(new CannedGateway(() => throw new HttpRequestException("stream failed")))
            .OpenTurn(kit.UserId);

        // Act
        var call = () => gateway.CompleteAsync(Request, default);

        // Assert
        await call.Should().ThrowAsync<HttpRequestException>(because: "the provider error still reaches the turn runtime");
        (await kit.AllowanceAsync()).RemainingPercent.Should().BeLessThan(100,
            because: "a failure mid-response may already be billed, so the reservation is kept");
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

    private static readonly ModelGatewayRequest Request = new("system", [new GatewayUserMessage("hi")], []);

    // Uses the whole context budget and output limit, so it costs exactly what was reserved.
    private static ModelCompletionResult FullCall =>
        new("ok", [], ModelFinishReason.Stop, 48_000, 4_096, 52_096);

    private sealed class CannedGateway(Func<ModelCompletionResult> respond) : IModelGateway
    {
        public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken) =>
            Task.FromResult(respond());
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
