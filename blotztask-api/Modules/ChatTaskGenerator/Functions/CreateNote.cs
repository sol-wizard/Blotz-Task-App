using System.ComponentModel;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using Microsoft.SemanticKernel;

namespace BlotzTask.Modules.ChatTaskGenerator.Functions;

public class CreateNote
{
    public List<ExtractedNote> CollectedNotes { get; } = new();

    [KernelFunction]
    [Description("Creates a note extracted from user input. Call this for any item that has no specific date or time associated with it.")]
    public void Create(
        [Description("The main content of the note. Use the user's words or a concise summary.")] string text)
    {
        CollectedNotes.Add(new ExtractedNote
        {
            Id = Guid.NewGuid(),
            Text = text
        });
    }
}
