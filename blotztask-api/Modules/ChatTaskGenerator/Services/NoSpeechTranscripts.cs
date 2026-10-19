namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public static class NoSpeechTranscripts
{
    public static bool Matches(string transcript) =>
        BlotzTask.Shared.Speech.NoSpeechTranscripts.Matches(transcript);
}
