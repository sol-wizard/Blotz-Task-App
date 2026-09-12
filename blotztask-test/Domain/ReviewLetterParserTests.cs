using BlotzTask.Modules.Reviews.Domain;
using FluentAssertions;

namespace BlotzTask.Tests.Domain;

public class ReviewLetterParserTests
{
    [Fact]
    public void Parse_ValidJson_ReturnsTheThreeParts()
    {
        // Arrange — the shape the response schema pins the model to.
        var response = """
                       {
                         "theme": "Finishing the thesis",
                         "body": "You spent most of March circling one thing.",
                         "oneThingToTryNext": "Move a couple of tasks before 11pm."
                       }
                       """;

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Theme.Should().Be("Finishing the thesis", because: "the theme is read straight off the JSON");
        letter.Body.Should().Be("You spent most of March circling one thing.", because: "body carries the letter itself");
        letter.OneThingToTryNext.Should().Be("Move a couple of tasks before 11pm.", because: "the suggestion is a separate block for the app to lay out");
    }

    [Fact]
    public void Parse_MalformedResponse_FallsBackToTheWholeResponseAsBody()
    {
        // Arrange — a content filter or a refusal can still come back as prose despite the schema.
        var response = "You had a busy month, and it showed in how you planned your evenings.";

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Body.Should().Be(response, because: "an unparseable response is treated as the body rather than failing the request");
        letter.Theme.Should().BeNull(because: "the fallback cannot recover a theme it never received");
        letter.OneThingToTryNext.Should().BeNull(because: "the fallback cannot recover a suggestion it never received");
    }

    [Fact]
    public void Parse_JsonWithoutABody_FallsBackToTheWholeResponseAsBody()
    {
        // Arrange — valid JSON is not enough; without a body there is no letter to show.
        var response = """{ "theme": "Something", "oneThingToTryNext": "Something else" }""";

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Body.Should().Be(response, because: "a body-less object is as unusable as malformed JSON, so the same fallback applies");
        letter.Theme.Should().BeNull(because: "the fallback discards partial parses rather than mixing them with raw text");
    }

    [Fact]
    public void Parse_QuietPeriodWithNullOptionalFields_ReturnsBodyOnly()
    {
        // Arrange — for a period with no genuine activity the prompt tells the model to send nulls.
        var response = """
                       { "theme": null, "body": "A quiet month, and that is fine.", "oneThingToTryNext": null }
                       """;

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Body.Should().Be("A quiet month, and that is fine.", because: "the body is the one part always present");
        letter.Theme.Should().BeNull(because: "no theme is invented for a quiet period");
        letter.OneThingToTryNext.Should().BeNull(because: "no suggestion is invented for a quiet period");
    }

    [Fact]
    public void Parse_BlankOptionalFields_AreNormalisedToNull()
    {
        // Arrange — the client branches on null to decide whether to render a block, so an empty
        // string would draw an empty block.
        var response = """{ "theme": "   ", "body": "A body.", "oneThingToTryNext": "" }""";

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Theme.Should().BeNull(because: "a whitespace-only theme is the same as having none");
        letter.OneThingToTryNext.Should().BeNull(because: "an empty suggestion is the same as having none");
    }
}
