using BlotzTask.Shared.Speech;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public class TranscriptionResultDto
{
    public required string Text { get; init; }
}

/// <summary>Transcribes voice input for review in the input box before the user sends it.</summary>
public class TranscribeAudioCommandHandler(AudioTranscriptionService transcription)
{
    public async Task<TranscriptionResultDto> Handle(IFormFile audio, CancellationToken ct = default) =>
        new() { Text = await transcription.TranscribeAsync(audio, ct, allowConversationalPhrases: true) };
}
