using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.Reviews.Domain;

// Theme and OneThingToTryNext are optional: the model omits Theme for a quiet period, and
// OneThingToTryNext when the data doesn't support a specific suggestion.
public record ReviewLetter(string Body, string? Theme, string? OneThingToTryNext);

public static class ReviewLetterParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Returns null when the response is not a usable letter (malformed JSON or no body). Saving the
    // raw text instead would pin a broken letter to the period, so the caller fails the request.
    public static ReviewLetter? Parse(string rawResponse)
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
            // Treated the same as a missing body.
        }

        return null;
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
