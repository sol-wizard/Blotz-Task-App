using BlotzTask.Modules.ChatTaskGenerator.Services;
using FluentAssertions;

namespace BlotzTask.Tests.Services;

public class DateTimeResolveServiceTests
{
    private readonly DateTimeResolveService _service = new();

    [Fact]
    public void Resolve_ChineseDurationPhrase_PreservesOriginalText()
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = "我想修改我的实习简历,并在一个月之内投递至少100封海投实习简历。",
            TimeZone = TimeZoneInfo.Utc
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Contain("一个月",
            because: "duration phrases should not be replaced with raw seconds in the message");
        result.Should().NotContain("2592000",
            because: "raw seconds values from duration recognition must not leak into the message");
    }

    [Fact]
    public void Resolve_AbsoluteDateTimePhrase_ReplacesWithResolvedValue()
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = "明天下午3点开会",
            TimeZone = TimeZoneInfo.Utc,
            ReferenceTime = new DateTime(2026, 6, 15, 12, 0, 0)
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Contain("2026-06-16",
            because: "absolute date phrases should be resolved to their absolute date value");
    }
}
