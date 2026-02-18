using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.ChatTaskGenerator.DTOs;

/// <summary>
///     Represents a single extracted note from user input (no date/time specified).
/// </summary>
public class ExtractedNote
{
    [JsonPropertyName("text")]
    [Description("The main content of the note. Use the user's words or a concise summary. This is the body text that will be saved as the note.")]
    public string Text { get; set; } = "";
}
