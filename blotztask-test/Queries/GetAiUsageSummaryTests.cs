using System.Runtime.CompilerServices;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using BlotzTask.Shared.Exceptions;
using FluentAssertions;

namespace BlotzTask.test.Queries
{
    public class GetAiUsageSummaryTests :IClassFixture<DatabaseFixture>
    {
        private readonly BlotzTaskDbContext _context;
        private readonly DataSeeder _seeder;
        private readonly GetAiUsageSummaryQueryHandler _sut;
        public GetAiUsageSummaryTests(DatabaseFixture fixture)
        {
            _context = new BlotzTaskDbContext(fixture.Options);
            _seeder = new DataSeeder(_context);
            _sut = new GetAiUsageSummaryQueryHandler (_context);
            
        }
    //-----------------------------------------------------------------------
    //Happy path
    //-----------------------------------------------------------------------
    [Fact]
    public async Task Handle_WhenCurrentMonthUsageExists_ShouldReturnCorrectSummary()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free",50_000);
        await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
        await _seeder.CreateAiUsageRecordAsync(userId,500,300);
        await _seeder.CreateAiUsageRecordAsync(userId,200,100);
        var periodStart=new DateTime(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1,0,0,0,
            DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1).AddSeconds(-1);
        var query = new GetAiUsageSummaryQuery{UserId=userId};
        var result = await _sut.Handle(query);
        var expectedUsed = 800+300;//500+300+200+100
        var expectedLimit = 50_000;
        var expectedRemaining = Math.Max(0,expectedLimit-expectedUsed);
        result.UsedTokens.Should().Be(expectedUsed,
        because:"Total of two records:800+300");
        result.TotalLimit.Should().Be(expectedLimit,
        because:"Free plan has 50,000 monthly limit");
        result.RemainingTokens.Should().Be(expectedRemaining,
        because:"50,000-1,100=48,900");
        result.PlanName.Should().Be("Free",
        because:"Plan name is Free");
        result.PeriodStartDate.Should().Be(periodStart,
        because:"Period should start on the 1st of the current month");
        result.PeriodEndDate.Should().Be(periodEnd,
        because:"Period should end at the last second of the current month");
    }
    //-----------------------------------------------------------------------
    //RemainingTokens clamped
    //-----------------------------------------------------------------------   
    [Fact]
    public async Task Handle_WhenUsedTokensExceedLimit_ShouldClampRemainingTokensToZero()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free",50_000);
        await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
        var periodStart = new DateTime(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1,0,0,0,
            DateTimeKind.Utc);
        await _seeder.CreateAiUsageRecordAsync(userId,30_000,25_000,periodStart.AddDays(1));
        var query = new GetAiUsageSummaryQuery{UserId=userId};
        var result = await _sut.Handle(query);
        var expectedUsed = 30_000+25_000; // 30,000 + 25,000 = 55,000
        var expectedLimit = 50_000;
        var expectedRemaining = Math.Max(0,expectedLimit-expectedUsed);
        result.UsedTokens.Should().Be(expectedUsed,
        because:"Total:25,000+30,000");
        result.TotalLimit.Should().Be(expectedLimit,
        because:"Free plan has 50,000 monthly limit");
        result.RemainingTokens.Should().Be(expectedRemaining,
        because:"Remaining tokens should be clamped to 0 when usage exceeds limit");
        result.PlanName.Should().Be("Free",
        because:"Plan name is Free");
    }
    //-----------------------------------------------------------------------
    //Records outside current month
    //-----------------------------------------------------------------------  
    [Fact]
    public async Task Handle_WhenRecordsExistOutsideCurrentMonth_ShouldExcludeThemFromUsedTokens()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free",50_000);
        await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
         var periodStart = new DateTime(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1,0,0,0,
            DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1).AddSeconds(-1);
        await _seeder.CreateAiUsageRecordAsync(userId, 10_000, 10_000, periodStart.AddDays(-1)); // previous month
        await _seeder.CreateAiUsageRecordAsync(userId, 100, 200, periodStart.AddDays(1));         // current month, total 300
        await _seeder.CreateAiUsageRecordAsync(userId, 5_000, 5_000, periodEnd.AddSeconds(1)); 
        var expectedUsed = 100+200;
        var expectedLimit = 50_000;
        var expectedRemaining = Math.Max(0,expectedLimit-expectedUsed);
        var query = new GetAiUsageSummaryQuery{UserId = userId};
        var result = await _sut.Handle(query);
        result.UsedTokens.Should().Be(expectedUsed,
        because:"This month total 200+100");
        result.TotalLimit.Should().Be(expectedLimit,
        because:"Free plan has 50,000 monthly limit");
        result.RemainingTokens.Should().Be(expectedRemaining,
        because:"This month is 50,000-300");
        result.PlanName.Should().Be("Free",
        because:"Plan name is Free");
        result.PeriodStartDate.Should().Be(periodStart);
        result.PeriodEndDate.Should().Be(periodEnd);
    }
    //----------------------------------------------------------------------- 
    //No subscription
    //----------------------------------------------------------------------- 
    [Fact]
    public async Task Handle_WhenUserHasNoActiveSubscription_ShouldThrowNotFoundException()
    {
        var userId = await _seeder.CreateUserAsync();
        var query = new GetAiUsageSummaryQuery{UserId=userId};
        var act = () => _sut.Handle(query);
        await act.Should().ThrowAsync<NotFoundException>(
        because: "user has no subscription — this is a config error, not a quota issue"
        );    
    }
    //----------------------------------------------------------------------- 
    //Period boundaries
    //----------------------------------------------------------------------- 
    [Fact]
    public async Task Handle_WhenRecordsOccurAtPeriodBoundaries_ShouldIncludeStartAndEndOnly()
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync("Free",50_000);
        await _seeder.CreateUserSubscriptionAsync(userId,plan.Id);
         var periodStart = new DateTime(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1,0,0,0,
            DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1).AddSeconds(-1);
        await _seeder.CreateAiUsageRecordAsync(userId, 100, 0, periodStart);                // included
        await _seeder.CreateAiUsageRecordAsync(userId, 200, 0, periodEnd);                  // included
        await _seeder.CreateAiUsageRecordAsync(userId, 300, 0, periodEnd.AddSeconds(1));    //excluded
        var expectedUsed = 100 + 200;
        var query = new GetAiUsageSummaryQuery{UserId = userId};
        var result = await _sut.Handle(query);
        result.UsedTokens.Should().Be(expectedUsed,
            because: "only records at periodStart (100) and periodEnd (200) should count, not the one after (300)");
        result.PeriodStartDate.Should().Be(periodStart);
        result.PeriodEndDate.Should().Be(periodEnd);

    }
    }
}