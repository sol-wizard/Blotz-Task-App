using System.Numerics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.test.Commands
{
   public class CheckAiQuotaServiceTests : IClassFixture<DatabaseFixture>
   {
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly IMemoryCache _cache;
    private readonly CheckAiQuotaService _sut;

    public CheckAiQuotaServiceTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _cache = new MemoryCache(new MemoryCacheOptions());
        _sut = new CheckAiQuotaService(_context, _cache);
    }
    // -----------------------------------------------------------------------
    // User under monthly limit
    // -----------------------------------------------------------------------
    [Fact]
    public async Task CheckQuotaAsync_WhenUnderLimit_ShouldNotThrow()
    {
       var userId = await _seeder.CreateUserAsync();
       var plan = await _seeder.CreateSubscriptionPlanAsync("Under",50_000);
       await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
       await _seeder.CreateAiUsageRecordAsync(userId,100,200);
       
       var act = () => _sut.CheckQuotaAsync(userId);

       await act.Should().NotThrowAsync(
            because: "user has only used 300 tokens out of 50,000 limit");
    }

    // -----------------------------------------------------------------------
    // Usage equals limit (used >= limit)
    // -----------------------------------------------------------------------
    [Fact]
    public async Task CheckQuotaAsync_WhenUsedTokensEqualLimit_ShouldThrowAiQuotaExceededException()
        {
            var userId = await _seeder.CreateUserAsync();
            var plan = await _seeder.CreateSubscriptionPlanAsync("Equal",50_000);
            await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
            await _seeder.CreateAiUsageRecordAsync(userId,30_000,20_000);

            var act = () => _sut.CheckQuotaAsync(userId);

            await act.Should().ThrowAsync<AiQuotaExceededException>(
                because:"used tokens (50000) equals the monthly limit (50000) "
            );
        }
    // -----------------------------------------------------------------------
    // Usage one token below limit
    // ----------------------------------------------------------------------- 
    [Fact]
    public async Task CheckQuotaAsync_WhenUsedTokensBelowLimit_SHouldNotThrow()
    {
            var userId=await _seeder.CreateUserAsync();
            var plan=await _seeder.CreateSubscriptionPlanAsync("Below",50_000);
            await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
            await _seeder.CreateAiUsageRecordAsync(userId,30_000,19_999);

            var act=()=>_sut.CheckQuotaAsync(userId);

            await act.Should().NotThrowAsync(
                because:"user has used 49999 tokens which is one below the 50000 limit"
            );
    }
    // -----------------------------------------------------------------------
    // No UserSubscription
    // ----------------------------------------------------------------------- 
    [Fact]
    public async Task CheckQuotaAsync_henNoSubscription_ShouldThrowInvalidOperationException()
    {
        var userId = await _seeder.CreateUserAsync();

        var act = () =>  _sut.CheckQuotaAsync(userId);

        await act.Should().ThrowAsync<InvalidOperationException>(
            because:"user has no subscription — this is a config error, not a quota issue"
        );        
    }
    //-----------------------------------------------------------------------
    //Usage in previous calendar month (UTC)
    //-----------------------------------------------------------------------
    [Fact]
    public async Task CheckQuotaAsync_PreviousMonthUsage_ShouldNotCountTowardCurrentMonth()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Monthly",50_000);
        await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);

        var lastMonth = new DateTime(
            DateTime.UtcNow.Year, 
            DateTime.UtcNow.Month, 1, 0, 0, 0, 
            DateTimeKind.Utc)
            .AddMonths(-1);
        await _seeder.CreateAiUsageRecordAsync(userId,30_000,20_000,lastMonth);

        var act = () => _sut.CheckQuotaAsync(userId);

        await act.Should().NotThrowAsync(
             because: "last month's 50000 tokens should not count toward the current month's quota"
        );       
    }
    //-----------------------------------------------------------------------
    //Month boundary
    //-----------------------------------------------------------------------
    [Fact]
    public async Task CheckQuotaAsync_MonthBoundary_ShouldOnlyCountCurrentMonth()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Boundary",50_000);
        await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
        var currentMonthStart = new DateTime(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1, 0, 0, 0,
            DateTimeKind.Utc
        );
        var lastMomentOfPreviousMonth = currentMonthStart.AddTicks(-1);
        await _seeder.CreateAiUsageRecordAsync(userId,30_000,20_000,lastMomentOfPreviousMonth);
        await _seeder.CreateAiUsageRecordAsync(userId,10_000,10_000,currentMonthStart);

        var act = () => _sut.CheckQuotaAsync(userId);
        await act.Should().NotThrowAsync(
            because:"only the 15,000 tokens used from the current month should count"
        );  
    }
     //-----------------------------------------------------------------------
     //Cache: plan limit cached
     //-----------------------------------------------------------------------
     [Fact]
     public async Task CheckQuotaAsync_WhenPlanLimitChangesWithoutCacheEviction_ShouldStillUseCachedLimit()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Cached", 50_000);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);
        await _seeder.CreateAiUsageRecordAsync(userId, 20_000, 20_000);

        await _sut.CheckQuotaAsync(userId);

        plan.MonthlyTokenLimit = 30_000;
        await _context.SaveChangesAsync();

        var act = () => _sut.CheckQuotaAsync(userId);

        await act.Should().NotThrowAsync(
        because: "the original 50,000-token plan limit is still cached for this user");
            
    }
    [Fact]
    public async Task CheckQuotaAsync_WhenPlanLimitChangesAndCacheIsCleared_ShouldUseUpdatedLimit()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Refreshed", 50_000);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);
        await _seeder.CreateAiUsageRecordAsync(userId, 20_000, 20_000);

        await _sut.CheckQuotaAsync(userId);

        plan.MonthlyTokenLimit = 30_000;
        await _context.SaveChangesAsync();

        _cache.Remove($"quota:plan:{userId}");

        var act = () => _sut.CheckQuotaAsync(userId);

        await act.Should().ThrowAsync<AiQuotaExceededException>(
        because: "after cache eviction, the updated 30,000-token limit should be loaded from the database");
    }
    }
}

