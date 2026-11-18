using BlotzTask.Modules.AiCoach.Ai.Runtime;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public sealed class FollowUpsTests
{
    [Fact]
    public void Extract_TrailingBlock_SplitsReplyAndFollowUps()
    {
        // Arrange
        var text = "### 怎么准备\n- 先做摸底\n\n<followups>\n帮我排 7 天计划\n- 给我高频词清单\n</followups>\n";

        // Act
        var (reply, followUps) = FollowUps.Extract(text);

        // Assert
        reply.Should().Be("### 怎么准备\n- 先做摸底", because: "the block is never shown or saved as reply text");
        followUps.Should().Equal(["帮我排 7 天计划", "给我高频词清单"],
            because: "each line becomes one follow-up with list markers removed");
    }

    [Fact]
    public void Extract_MalformedOrOversizedItems_DropsThemWithoutLeakingTheMarker()
    {
        // Arrange
        var text = "回答\n<followups>\n1. 一\n一\n" + new string('长', FollowUps.MaxLength + 1) + "\n二\n三\n四";

        // Act
        var (reply, followUps) = FollowUps.Extract(text);

        // Assert
        reply.Should().Be("回答", because: "an unclosed block still must not reach the user");
        followUps.Should().Equal(["一", "二", "三"],
            because: "numbering is stripped, duplicates and oversized items are dropped, and at most three remain");
    }

    [Fact]
    public void Extract_NoBlock_ReturnsReplyUnchanged()
    {
        // Act
        var (reply, followUps) = FollowUps.Extract("我在听。");

        // Assert
        reply.Should().Be("我在听。", because: "replies without follow-ups pass through");
        followUps.Should().BeEmpty(because: "small talk carries no buttons");
    }

    [Fact]
    public async Task StreamFilter_MarkerSplitAcrossDeltas_IsNeverEmitted()
    {
        // Arrange
        var emitted = new List<string>();
        var filter = new FollowUpStreamFilter(text => { emitted.Add(text); return Task.CompletedTask; });

        // Act
        foreach (var delta in new[] { "答案", "\n\n<", "follo", "wups>\n帮我排计划", "\n</followups>" })
            await filter.WriteAsync(delta);
        await filter.FlushAsync();

        // Assert
        string.Concat(emitted).Should().Be("答案\n\n", because: "text after the marker start is withheld even when split");
    }

    [Fact]
    public async Task StreamFilter_LessThanSignThatIsNotAMarker_IsReleased()
    {
        // Arrange
        var emitted = new List<string>();
        var filter = new FollowUpStreamFilter(text => { emitted.Add(text); return Task.CompletedTask; });

        // Act
        await filter.WriteAsync("a <");
        await filter.WriteAsync("b");
        await filter.WriteAsync(" and ending with <f");
        await filter.FlushAsync();

        // Assert
        string.Concat(emitted).Should().Be("a <b and ending with <f",
            because: "held-back text that does not become a marker must still reach the user");
    }
}
