using System.Xml.Serialization;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Queries;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Tests.Queries;

public class AiUsageMeteringScenarioTests:IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext  _context;
    private readonly DataSeeder _seeder;
    private readonly RecordAiUsageService _recordService;
    private readonly CheckAiQuotaService _checkService;
    private readonly GetAiUsageSummaryQueryHandler _handler;
    private readonly IMemoryCache _cache;
    public AiUsageMeteringScenarioTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _cache = new MemoryCache(new MemoryCacheOptions());

        _recordService = new RecordAiUsageService(_context);
        _checkService = new CheckAiQuotaService(_context,_cache);
        _handler = new GetAiUsageSummaryQueryHandler (_context);
    }
    // -----------------------------------------------------------------------
    // Journey A: use AI until limit, then quota blocks
    // -----------------------------------------------------------------------
    [Fact]
    public async Task JourneyA_UseAiUntilLimit_ThenQuotaBlocks()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free", 1000);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);

        await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest
        {
           UserId = userId,
           PromptTokens = 100,
           CompletionTokens = 100 
        });//total 200
          await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest
        {
           UserId = userId,
           PromptTokens = 150,
           CompletionTokens = 150 
        });//total 300
        var expectedUsedBefore = (100 + 100) + (150 + 150); // 200 + 300 = 500
        var expectedLimit = 1000;
        var expectedRemainingBefore = Math.Max(0, expectedLimit - expectedUsedBefore);
        var query = new GetAiUsageSummaryQuery{UserId = userId};
        var summaryBeforeLimit = await _handler.Handle(query);

        summaryBeforeLimit.UsedTokens.Should().Be(expectedUsedBefore);
        summaryBeforeLimit.TotalLimit.Should().Be(expectedLimit);
        summaryBeforeLimit.RemainingTokens.Should().Be(expectedRemainingBefore);
        summaryBeforeLimit.PlanName.Should().Be("Free");

        var act = () => _checkService.CheckQuotaAsync(userId);
        await act.Should().NotThrowAsync(
                because: "the user has only used 500 tokens out of the 1,000-token monthly limit");
        await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest
        {
                UserId = userId,
                PromptTokens = 250,
                CompletionTokens = 250
        }); // total 500, grand total 1000
        var expectedUsedAfter = expectedUsedBefore + (250 + 250); // 500 + 500 = 1000
        var expectedRemainingAfter = Math.Max(0, expectedLimit - expectedUsedAfter);
        var atLimitAct = () =>_checkService.CheckQuotaAsync(userId);
        await atLimitAct.Should().ThrowAsync<AiQuotaExceededException>(
                because: "the quota service treats used tokens equal to the monthly limit as exceeded");
         _cache.Remove($"quota:plan:{userId}");
       
        var summaryAtLimit = await _handler.Handle(query);
        
        summaryAtLimit.UsedTokens.Should().Be(expectedUsedAfter);
        summaryAtLimit.TotalLimit.Should().Be(expectedLimit);
        summaryAtLimit.RemainingTokens.Should().Be(expectedRemainingAfter);

        summaryAtLimit.PlanName.Should().Be("Free");
    }
       // -----------------------------------------------------------------------
       // Journey B — New month
       // -----------------------------------------------------------------------
    [Fact]
    public async Task JourneyB_NewMonth_ShouldOnlyCountCurrentMonthUsage()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free", 1_000);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);

        var currentMonthStart = new DateTime(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1, 0, 0, 0,
            DateTimeKind.Utc);

        var previousMonthEnd = currentMonthStart.AddSeconds(-1);
        var currentMonthUsageTime = currentMonthStart.AddDays(1);

        await _seeder.CreateAiUsageRecordAsync(userId, 300, 200, previousMonthEnd);   // total 500, previous month
        await _seeder.CreateAiUsageRecordAsync(userId, 100, 100, currentMonthUsageTime); // total 200, current month
         var expectedUsed = 100 + 100; // only this month
        var expectedLimit = 1_000;
        var expectedRemaining = Math.Max(0, expectedLimit - expectedUsed);
        var query = new GetAiUsageSummaryQuery{UserId = userId};
        var summary = await _handler.Handle(query);

        summary.UsedTokens.Should().Be(expectedUsed);
        summary.TotalLimit.Should().Be(expectedLimit);
        summary.RemainingTokens.Should().Be(expectedRemaining);
        summary.PlanName.Should().Be("Free");

        var act = () => _checkService.CheckQuotaAsync(userId);
        await act.Should().NotThrowAsync(
            because: "quota checking should ignore records from the previous UTC month");
    }

        // -----------------------------------------------------------------------
        // Journey C — Record then summarize
        // -----------------------------------------------------------------------
    [Fact]
    public async Task JourneyC_RecordThenSummarize_ShouldReflectPersistedUsageWithoutHttp()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Pro", 50_000);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);

        await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest
        {
            UserId = userId,
            PromptTokens = 120,
            CompletionTokens = 80
        });

        await _recordService.RecordAiUsageAsync(new RecordAiUsageRequest
        {
            UserId = userId,
            PromptTokens = 200,
            CompletionTokens = 100
        });
        var expectedUsed = (120 + 80) + (200 + 100); // 200 + 300 = 500
        var expectedLimit = 50_000;
        var expectedRemaining = Math.Max(0, expectedLimit - expectedUsed);
        var query = new GetAiUsageSummaryQuery{UserId = userId};

        var summary = await _handler.Handle(query);

        summary.UsedTokens.Should().Be(expectedUsed);
        summary.TotalLimit.Should().Be(expectedLimit);
        summary.RemainingTokens.Should().Be(expectedRemaining);
        summary.PlanName.Should().Be("Pro");

        var act = () => _checkService.CheckQuotaAsync(userId);
        await act.Should().NotThrowAsync(
            because: "the recorded usage is visible to the same summary and quota logic used by the API flow"
        );
    }
}
    
