using BlotzTask.Extension.Options;
using BlotzTask.Modules.Feedback.Commands;
using BlotzTask.Shared.Lark;
using FluentAssertions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.Commands;

public class SubmitFeedbackTests
{
    // Lark is an outside service, so a recording stand-in keeps every case on this machine.
    private sealed class RecordingBitableClient : ILarkBitableClient
    {
        public Dictionary<string, object>? Fields { get; private set; }

        public Task<string> UploadImageAsync(Stream imageStream, string fileName, long fileSize, string baseToken,
            CancellationToken ct = default) => Task.FromResult("file-token");

        public Task CreateRecordAsync(string baseToken, string tableId, Dictionary<string, object> fields,
            CancellationToken ct = default)
        {
            Fields = fields;
            return Task.CompletedTask;
        }
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Testing";
        public string ApplicationName { get; set; } = "BlotzTask.Tests";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private readonly RecordingBitableClient _bitableClient = new();

    private SubmitFeedbackCommandHandler CreateHandler() => new(
        _bitableClient,
        Options.Create(new LarkOptions()),
        new TestHostEnvironment(),
        NullLogger<SubmitFeedbackCommandHandler>.Instance);

    private static SubmitFeedbackCommand CreateCommand(string? errorEventId) => new()
    {
        Text = "关于这个错误：网络好像断开了",
        UserId = Guid.NewGuid(),
        ErrorEventId = errorEventId
    };

    [Fact]
    public async Task Handle_WithErrorEventId_WritesItToTheErrorColumn()
    {
        // Arrange
        var handler = CreateHandler();

        // Act
        await handler.Handle(CreateCommand("4f1c2a9be8d34c7f9a0b1c2d3e4f5a6b"));

        // Assert
        _bitableClient.Fields.Should().ContainKey("错误编号")
            .WhoseValue.Should().Be("4f1c2a9be8d34c7f9a0b1c2d3e4f5a6b",
                because: "the team pastes this ID into Sentry to open the exact error");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Handle_WithoutErrorEventId_LeavesTheErrorColumnOut(string? errorEventId)
    {
        // Arrange
        var handler = CreateHandler();

        // Act
        await handler.Handle(CreateCommand(errorEventId));

        // Assert
        _bitableClient.Fields.Should().NotContainKey("错误编号",
            because: "feedback from Settings has no error, and an empty cell would look like a lost ID");
    }
}
