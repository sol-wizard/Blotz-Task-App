using BlotzTask.Modules.Reviews.Enums;
using BlotzTask.Modules.Reviews.Prompts;
using FluentAssertions;

namespace BlotzTask.Tests.Domain;

public class ReviewPromptsTests
{
    private const string TaskJson = """[{"title":"Write up results"}]""";

    private static string Prompt(ReviewPeriodType periodType, params string[] recentThemes) =>
        ReviewPrompts.GetReviewPrompt(periodType, "English", "July 2026", TaskJson, recentThemes);

    [Theory]
    [InlineData(ReviewPeriodType.Weekly)]
    [InlineData(ReviewPeriodType.Monthly)]
    public void GetReviewPrompt_EitherPeriodType_AsksForTheSameThreeParts(ReviewPeriodType periodType)
    {
        // Arrange & Act
        var prompt = Prompt(periodType);

        // Assert — both period types go through one prompt, so the response shape cannot drift
        // apart and one parser can handle both.
        prompt.Should().Contain("\"theme\"", because: "both weekly and monthly letters carry a theme");
        prompt.Should().Contain("\"body\"", because: "both weekly and monthly letters carry a body");
        prompt.Should().Contain("\"oneThingToTryNext\"", because: "both weekly and monthly letters carry a next-period suggestion");
        prompt.Should().Contain("Return only the JSON object", because: "the output contract is the same regardless of period type");
    }

    [Theory]
    [InlineData(ReviewPeriodType.Weekly, "week")]
    [InlineData(ReviewPeriodType.Monthly, "month")]
    public void GetReviewPrompt_EitherPeriodType_KeepsOnlyTheWordingParameterised(
        ReviewPeriodType periodType, string expectedNoun)
    {
        // Arrange & Act
        var prompt = Prompt(periodType);

        // Assert — the only per-period difference is wording, not structure.
        prompt.Should().Contain($"their {expectedNoun}", because: "the period noun is the parameterised part");
    }

    [Fact]
    public void GetReviewPrompt_WithRecentThemes_ListsThemAsThemesToSteerAwayFrom()
    {
        // Arrange & Act
        var prompt = Prompt(ReviewPeriodType.Monthly, "Finishing the thesis", "Moving house");

        // Assert
        prompt.Should().Contain("Finishing the thesis; Moving house",
            because: "the model needs the earlier themes verbatim to avoid repeating them");
        prompt.Should().Contain("Only repeat one of these if",
            because: "a genuinely repeating period should still be allowed to repeat its theme");
    }

    [Fact]
    public void GetReviewPrompt_WithNoRecentThemes_SaysSoInsteadOfListingAnEmptySet()
    {
        // Arrange & Act — a user's first review of this kind.
        var prompt = Prompt(ReviewPeriodType.Monthly);

        // Assert
        prompt.Should().Contain("first review of this kind",
            because: "an empty list would otherwise render as a dangling instruction the model has to interpret");
        prompt.Should().NotContain("most recent first",
            because: "the themes-to-avoid block is skipped entirely when there is nothing to avoid");
    }
}
