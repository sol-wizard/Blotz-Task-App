using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.Reviews.Domain;

// Theme and OneThingToTryNext are optional: the model omits them for a quiet period.
public record ReviewLetter(string Body, string? Theme, string? OneThingToTryNext);

public static class ReviewLetterParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // A content filter, a refusal, or a model ignoring the schema can still hand back prose. That
    // is not worth a 500, so the whole response becomes the body and the app renders one block.
    public static ReviewLetter Parse(string rawResponse)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<ReviewLetterJson>(rawResponse, JsonOptions);

            if (!string.IsNullOrWhiteSpace(parsed?.Body))
            {
                return new ReviewLetter(
                    parsed.Body.Trim(),
                    Clean(parsed.Theme),
                    Clean(parsed.OneThingToTryNext));
            }
        }
        catch (JsonException)
        {
            // Fall through to the whole-response fallback below.
        }

        return new ReviewLetter(rawResponse.Trim(), null, null);
    }

    // The client renders a block only when the value is non-null, so blank has to become null.
    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private class ReviewLetterJson
    {
        [JsonPropertyName("theme")] public string? Theme { get; set; }
        [JsonPropertyName("body")] public string? Body { get; set; }
        [JsonPropertyName("oneThingToTryNext")] public string? OneThingToTryNext { get; set; }
    }
}
