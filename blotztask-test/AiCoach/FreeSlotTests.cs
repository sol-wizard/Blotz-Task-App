using BlotzTask.Modules.AiCoach.Application.Queries;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public sealed class FreeSlotTests
{
    [Fact]
    public void Handle_OverlappingAndShortGaps_ListsOnlyGapsOfHalfAnHourFromNow()
    {
        // Arrange: two overlapping tasks, a 60-minute gap, then a 20-minute gap; it is 08:05 on the 16th.
        var day = new DateTime(2026, 11, 16);
        (DateTime, DateTime)[] busy =
        [
            (day.AddHours(9), day.AddHours(10)),
            (day.AddHours(9.5), day.AddHours(11)),
            (day.AddHours(12), day.AddHours(12).AddMinutes(20)),
            (day.AddHours(12).AddMinutes(40), day.AddHours(13)),
        ];

        // Act
        var free = TaskContextReader.FreeSlots(new DateOnly(2026, 11, 15), new DateOnly(2026, 11, 17), busy,
            day.AddHours(8).AddMinutes(5));

        // Assert
        free.Keys.Should().Equal(["2026-11-16", "2026-11-17"], because: "past dates have no time left to plan");
        free["2026-11-16"].Should().Equal(["08:15-09:00", "11:00-12:00", "13:00-22:00"],
            because: "today starts at the next quarter hour, overlapping tasks merge, and a 20-minute gap is too short");
        free["2026-11-17"].Should().Equal(["07:00-22:00"], because: "a day with no timed tasks is free all day");
    }
}
