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

    // The recognizer turns a vague part of day into a fixed window (evening = 16:00–20:00). If that
    // window reaches the model it takes the start, so "tonight" became a 16:00 task. The contract:
    // settle the date, inject no clock time, and keep the user's words so the model picks the hour.
    [Theory]
    [InlineData("明晚我要喂猫", "明晚", "2026-09-07")]
    [InlineData("今天下午去买菜", "今天下午", "2026-09-06")]
    [InlineData("明天早上跑步", "明天早上", "2026-09-07")]
    [InlineData("tonight feed the cat", "tonight", "2026-09-06")]
    [InlineData("tomorrow afternoon buy groceries", "tomorrow afternoon", "2026-09-07")]
    public void Resolve_VaguePartOfDayWithDate_ResolvesDateButNoClockTime(
        string message, string partOfDayPhrase, string expectedDate)
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = message,
            TimeZone = TimeZoneInfo.Utc,
            ReferenceTime = new DateTime(2026, 9, 6, 14, 43, 0)
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Contain(expectedDate,
            because: "the date is the part of a vague phrase the resolver can settle deterministically");
        result.Should().Contain(partOfDayPhrase,
            because: "the model needs the user's own words to choose a sensible hour");
        result.Should().NotMatchRegex(@"\d{1,2}:\d{2}",
            because: "any clock time here is the recognizer's arbitrary window, and the model treats it as the answer");
    }

    [Fact]
    public void Resolve_PartOfDayWithoutDate_LeavesMessageUnchanged()
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
        result.Should().Be(request.Message,
            because: "with no date to settle there is nothing the resolver can add that the model does not already know");
    }

    // Guards the rule against over-matching: a part of day next to an explicit time is not vague.
    [Theory]
    [InlineData("明天晚上八点看书", "2026-09-07 20:00:00")]
    [InlineData("明天晚上八点到十点看书", "2026-09-07 20:00:00 to 2026-09-07 22:00:00")]
    [InlineData("tomorrow evening at 8pm read", "2026-09-07 20:00:00")]
    public void Resolve_ExplicitClockTimeWithinPartOfDay_StillResolvesClockTime(
        string message, string expectedResolvedTime)
    {
        // Arrange
        var request = new ResolveDateTimesRequest
        {
            Message = message,
            TimeZone = TimeZoneInfo.Utc,
            ReferenceTime = new DateTime(2026, 9, 6, 14, 43, 0)
        };

        // Act
        var result = _service.Resolve(request);

        // Assert
        result.Should().Contain(expectedResolvedTime,
            because: "an explicit time is exactly what the resolver exists to pin down, part of day or not");
    }
}
