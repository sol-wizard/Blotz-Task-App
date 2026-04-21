using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Queries;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Tests.Queries;

/// <summary>
/// Single integration suite for AI usage: record → summary → quota, plus subscription edge cases.
/// </summary>
public class AiUsageMeteringScenarioTests : IClassFixture<DatabaseFixture>
{
    private readonly DataSeeder _seeder;
    private readonly RecordAiUsageService _recordService;
    private readonly CheckAiQuotaService _checkService;
    private readonly GetAiUsageSummaryQueryHandler _summaryHandler;

    public AiUsageMeteringScenarioTests(DatabaseFixture fixture)
    {
        var context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(context);
        var cache = new MemoryCache(new MemoryCacheOptions());
        _recordService = new RecordAiUsageService(context);
        _checkService = new CheckAiQuotaService(context, cache);
        _summaryHandler = new GetAiUsageSummaryQueryHandler(context);
    }

    /// <summary>
    /// Record usage, summary matches DB, quota passes under limit, then hits limit and throws.
    /// </summary>
    [Fact]
    public async Task Metering_EndToEnd_UntilMonthlyLimitThenQuotaBlocks()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free", 1000);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);

        await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest { UserId = userId, PromptTokens = 100, CompletionTokens = 200 ,TotalTokens = 300});
        await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest { UserId = userId, PromptTokens = 100, CompletionTokens= 300 ,TotalTokens = 400});

        var expectedUsedBefore = 500;
        var query = new GetAiUsageSummaryQuery { UserId = userId };
        var summaryBefore = await _summaryHandler.Handle(query);

        summaryBefore.UsedTokens.Should().Be(expectedUsedBefore);
        summaryBefore.TotalLimit.Should().Be(1000);
        summaryBefore.RemainingTokens.Should().Be(500);

        await FluentActions.Invoking(() => _checkService.CheckQuotaAsync(userId))
            .Should().NotThrowAsync();

        await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest { UserId = userId, PromptTokens = 100, CompletionTokens = 500 ,TotalTokens = 600});

        await FluentActions.Invoking(() => _checkService.CheckQuotaAsync(userId))
            .Should().ThrowAsync<AiQuotaExceededException>();

        var summaryAt = await _summaryHandler.Handle(query);
        summaryAt.UsedTokens.Should().Be(1000);
        summaryAt.RemainingTokens.Should().Be(0);
    }

    /// <summary>
    /// Summary and quota both ignore usage dated before current UTC month.
    /// </summary>
    [Fact]
    public async Task Metering_PreviousUtcMonth_NotCountedForSummaryOrQuota()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free", 1_000);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        await _seeder.CreateAiUsageRecordAsync(userId, 100, 1_200, 1300, monthStart.AddSeconds(-1));
await _seeder.CreateAiUsageRecordAsync(userId, 100, 200, 300, monthStart.AddDays(1));

        var summary = await _summaryHandler.Handle(new GetAiUsageSummaryQuery { UserId = userId });
        summary.UsedTokens.Should().Be(200);

        await FluentActions.Invoking(() => _checkService.CheckQuotaAsync(userId))
            .Should().NotThrowAsync();
    }

    [Fact]
    public async Task GetSummary_WhenNoSubscription_ThrowsNotFound()
    {
        var userId = await _seeder.CreateUserAsync();
        await FluentActions.Invoking(() => _summaryHandler.Handle(new GetAiUsageSummaryQuery { UserId = userId }))
            .Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task CheckQuota_WhenNoSubscription_ThrowsInvalidOperation()
    {
        var userId = await _seeder.CreateUserAsync();
        await FluentActions.Invoking(() => _checkService.CheckQuotaAsync(userId))
            .Should().ThrowAsync<InvalidOperationException>();
    }
}
