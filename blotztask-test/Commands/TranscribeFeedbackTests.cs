using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Feedback.Commands;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using OpenAI.Audio;

namespace BlotzTask.Tests.Commands;

public class TranscribeFeedbackTests
{
    // Every case here is rejected before Groq is called, so a placeholder key never leaves the machine.
    private readonly TranscribeFeedbackCommandHandler _handler = new(
        new SpeechTranscriptionService(
            new AudioClient("whisper-large-v3-turbo", "test-key"),
            NullLogger<SpeechTranscriptionService>.Instance),
        NullLogger<TranscribeFeedbackCommandHandler>.Instance);

    private static FormFile CreateFile(long length, string contentType) =>
        new(Stream.Null, 0, length, "audio", "audio.m4a")
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };

    [Fact]
    public async Task Handle_EmptyAudio_ThrowsArgumentException()
    {
        // Arrange
        var audio = CreateFile(0, "audio/mp4");

        // Act
        var act = () => _handler.Handle(audio);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>(
            because: "an empty recording has nothing to transcribe and must not reach Groq");
    }

    [Fact]
    public async Task Handle_AudioOver10Mb_ThrowsArgumentException()
    {
        // Arrange
        var audio = CreateFile(10 * 1024 * 1024 + 1, "audio/mp4");

        // Act
        var act = () => _handler.Handle(audio);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>(
            because: "uploads over 10 MB are refused before they cost a transcription call");
    }

    [Fact]
    public async Task Handle_NonAudioFile_ThrowsArgumentException()
    {
        // Arrange
        var audio = CreateFile(1024, "image/jpeg");

        // Act
        var act = () => _handler.Handle(audio);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>(
            because: "only audio files may be sent to speech-to-text");
    }
}
