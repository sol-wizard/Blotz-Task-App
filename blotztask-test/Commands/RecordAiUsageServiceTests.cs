using System.Numerics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.test.Commands
{
    public class RecordAiUsageServiceTests:IClassFixture<DatabaseFixture>
    {
     private readonly BlotzTaskDbContext _context;
     private readonly DataSeeder _seeder;
     private readonly RecordAiUsageService _sut;

     public RecordAiUsageServiceTests(DatabaseFixture fixture)
     {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _sut = new RecordAiUsageService(_context);
     }
     // -----------------------------------------------------------------------
     //Happy path
     // -----------------------------------------------------------------------
    [Fact]
    public async Task RecordAiUsageAsync_HappyPath_ShouldPersistCorrectRow()
    {
        var userId = await _seeder.CreateUserAsync();
        var request = new RecordAiUsageRequest
        {
          UserId = userId,
          PromptTokens = 150,
          CompletionTokens = 80
        };
        var TotalTokens=request.PromptTokens+request.CompletionTokens;
        var before = DateTime.UtcNow;
        await _sut.RecordAiUsageAsync(request);
        var after = DateTime.UtcNow;
        var record = await _context.AiUsageRecords
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
        record.Should().NotBeNull(
            because: "a usage record should be persisted after recording");
        record!.PromptTokens.Should().Be(
            request.PromptTokens, because: "prompt tokens should match the request");
        record.CompletionTokens.Should().Be(
            request.CompletionTokens, because: "completion tokens should match the request");
        TotalTokens.Should().Be(
           TotalTokens, because: "total should equal prompt + completion");
        record.CreatedAt.Kind.Should().Be(DateTimeKind.Utc);
        record.CreatedAt.Should().BeOnOrAfter(before);
        record.CreatedAt.Should().BeOnOrBefore(after);
    }
    // -----------------------------------------------------------------------
    // Zero token
    // -----------------------------------------------------------------------
    [Fact]
    public async Task RecordAiUsageAsync_ZeroTokens_ShouldPersistValidRow()
    {
        var userId = await _seeder.CreateUserAsync();
        var request = new RecordAiUsageRequest
        {
          UserId = userId,
          PromptTokens = 0,
          CompletionTokens = 0  
        };
        var TotalTokens = request.PromptTokens+request.CompletionTokens;
        await _sut.RecordAiUsageAsync(request);
        var record = await _context.AiUsageRecords
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
        record.Should().NotBeNull(
            because: "zero-token records should still be persisted");
        record!.PromptTokens.Should().Be(0);
        record.CompletionTokens.Should().Be(0);
        record.TotalTokens.Should().Be(0);    
    }
    // -----------------------------------------------------------------------
    //LargeTokenCount
    // -----------------------------------------------------------------------
    [Fact]
    public async Task RecordAiUsageAsync_LargeTokenCount_ShouldNotOverflow()
    {
        var userId = await _seeder.CreateUserAsync();
        var request = new RecordAiUsageRequest
        {
          UserId = userId,
          PromptTokens = 1_000_000,
          CompletionTokens = 500_000  
        };
        var TotalTokens = request.PromptTokens+request.CompletionTokens;
        await _sut.RecordAiUsageAsync(request);
        var record = await _context.AiUsageRecords
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
        record.Should().NotBeNull(
            because: "large but realistic token counts should be stored without overflow");
        record!.PromptTokens.Should().Be(request.PromptTokens);
        record.CompletionTokens.Should().Be(request.CompletionTokens);
        record.TotalTokens.Should().Be(TotalTokens);
    }
    }
}