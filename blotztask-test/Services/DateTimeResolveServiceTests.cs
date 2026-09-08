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

    [Fact]
    public void Resolve_ChinesePartOfDayPhrase_PinsDateAndKeepsWording()
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = "明晚我要喂猫",
            TimeZone = TimeZoneInfo.Utc,
            ReferenceTime = new DateTime(2026, 9, 6, 14, 43, 0)
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Be("明晚 (2026-09-07)我要喂猫",
            because: "a vague part of day should carry the resolved date but leave the hour to the model");
        result.Should().NotContain("16:00",
            because: "the recognizer's evening window starts at 16:00 and the model would schedule the task there");
    }

    [Fact]
    public void Resolve_EnglishPartOfDayPhrase_PinsDateAndKeepsWording()
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = "tomorrow afternoon buy groceries",
            TimeZone = TimeZoneInfo.Utc,
            ReferenceTime = new DateTime(2026, 9, 6, 14, 43, 0)
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Be("tomorrow afternoon (2026-09-07) buy groceries",
            because: "the same rule applies to English parts of day, whose window starts at noon");
    }

    [Fact]
    public void Resolve_BarePartOfDayPhrase_LeavesMessageUntouched()
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = "晚上上课别忘了",
            TimeZone = TimeZoneInfo.Utc,
            ReferenceTime = new DateTime(2026, 9, 6, 14, 43, 0)
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Be("晚上上课别忘了",
            because: "a part of day with no date carries nothing to pin, and a 16:00–20:00 window would mislead the model");
    }

    [Fact]
    public void Resolve_ExplicitTimeRange_StillResolvesBothEnds()
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = "明天晚上八点到十点看书",
            TimeZone = TimeZoneInfo.Utc,
            ReferenceTime = new DateTime(2026, 9, 6, 14, 43, 0)
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Contain("2026-09-07 20:00:00 to 2026-09-07 22:00:00",
            because: "an explicit range is not a vague part of day and must keep resolving to absolute times");
    }
}
