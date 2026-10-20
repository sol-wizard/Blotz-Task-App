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
        letter.Should().NotBeNull(because: "a response matching the schema is a usable letter");
        letter!.Theme.Should().Be("Finishing the thesis", because: "the theme is read straight off the JSON");
        letter.Body.Should().Be("You spent most of March circling one thing.", because: "body carries the letter itself");
        letter.OneThingToTryNext.Should().Be("Move a couple of tasks before 11pm.", because: "the suggestion is a separate block for the app to lay out");
    }

    [Fact]
    public void Parse_MalformedResponse_ReturnsNull()
    {
        // Arrange — prose instead of the schema's JSON.
        var response = "You had a busy month, and it showed in how you planned your evenings.";

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Should().BeNull(because: "saving unparseable text would pin it to the period as the letter, so the caller fails the request instead");
    }

    [Fact]
    public void Parse_TruncatedJson_ReturnsNull()
    {
        // Arrange — what a Length or ContentFilter finish leaves behind: half a JSON object.
        var response = """{"theme": "Exams", "body": "You spent the wee""";

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Should().BeNull(because: "a cut-off letter must not be saved as the user's letter; they retry instead");
    }

    [Fact]
    public void Parse_JsonWithoutABody_ReturnsNull()
    {
        // Arrange — valid JSON is not enough; without a body there is no letter to show.
        var response = """{ "theme": "Something", "oneThingToTryNext": "Something else" }""";

        // Act
        var letter = ReviewLetterParser.Parse(response);

        // Assert
        letter.Should().BeNull(because: "a body-less object is as unusable as malformed JSON");
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
        letter.Should().NotBeNull(because: "a body with null optional fields is still a usable letter");
        letter!.Body.Should().Be("A quiet month, and that is fine.", because: "the body is the one part always present");
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
        letter.Should().NotBeNull(because: "blank optional fields do not make the letter unusable");
        letter!.Theme.Should().BeNull(because: "a whitespace-only theme is the same as having none");
        letter.OneThingToTryNext.Should().BeNull(because: "an empty suggestion is the same as having none");
    }
}
