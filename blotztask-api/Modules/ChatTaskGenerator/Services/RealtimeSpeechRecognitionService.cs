using System.Collections.Concurrent;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.SpeechToText.Dtos;
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IRealtimeSpeechRecognitionService
{
    Task StartSessionAsync(string connectionId, CancellationToken ct = default);
    Task PushAudioChunkAsync(string connectionId, PcmAudioChunk chunk, CancellationToken ct = default);
    Task StopSessionAsync(string connectionId, CancellationToken ct = default);
}

public class RealtimeSpeechRecognitionService : IRealtimeSpeechRecognitionService
{
    private static readonly string[] CandidateLanguages = ["en-US", "zh-CN"];
    private readonly ConcurrentDictionary<string, RealtimeSpeechSession> _sessions = new();
    private readonly SpeechTokenSettings _settings;
    private readonly ILogger<RealtimeSpeechRecognitionService> _logger;

    public RealtimeSpeechRecognitionService(
        IOptions<SpeechTokenSettings> settings,
        ILogger<RealtimeSpeechRecognitionService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task StartSessionAsync(string connectionId, CancellationToken ct = default)
    {
        if (_sessions.ContainsKey(connectionId))
        {
            return;
        }

        var session = CreateSession(connectionId);
        if (!_sessions.TryAdd(connectionId, session))
        {
            await session.DisposeAsync();
            return;
        }

        try
        {
            await session.StartAsync(ct);
        }
        catch
        {
            _sessions.TryRemove(connectionId, out _);
            await session.DisposeAsync();
            throw;
        }
    }

    public Task PushAudioChunkAsync(string connectionId, PcmAudioChunk chunk, CancellationToken ct = default)
    {
        if (!_sessions.TryGetValue(connectionId, out var session))
        {
            return Task.CompletedTask;
        }

        session.PushAudioChunk(chunk);
        return Task.CompletedTask;
    }

    public async Task StopSessionAsync(string connectionId, CancellationToken ct = default)
    {
        if (!_sessions.TryRemove(connectionId, out var session))
        {
            return;
        }

        await session.DisposeAsync(ct);
    }

    private RealtimeSpeechSession CreateSession(string connectionId)
    {
        if (string.IsNullOrWhiteSpace(_settings.Key) || string.IsNullOrWhiteSpace(_settings.Region))
        {
            throw new InvalidOperationException("AzureSpeech Key/Region configuration is missing.");
        }

        var speechConfig = SpeechConfig.FromSubscription(_settings.Key, _settings.Region);
        speechConfig.SetProperty(PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous");

        var autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig.FromLanguages(CandidateLanguages);
        var audioFormat = AudioStreamFormat.GetWaveFormatPCM(samplesPerSecond: 16000, bitsPerSample: 16, channels: 1);
        var pushStream = AudioInputStream.CreatePushStream(audioFormat);
        var audioConfig = AudioConfig.FromStreamInput(pushStream);
        var recognizer = new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);

        return new RealtimeSpeechSession(connectionId, pushStream, recognizer, _logger);
    }
}

internal sealed class RealtimeSpeechSession
{
    private readonly string _connectionId;
    private readonly PushAudioInputStream _pushStream;
    private readonly SpeechRecognizer _recognizer;
    private readonly ILogger _logger;
    private bool _started;

    public RealtimeSpeechSession(
        string connectionId,
        PushAudioInputStream pushStream,
        SpeechRecognizer recognizer,
        ILogger logger)
    {
        _connectionId = connectionId;
        _pushStream = pushStream;
        _recognizer = recognizer;
        _logger = logger;

        _recognizer.Recognized += (_, e) =>
        {
            if (e.Result.Reason == ResultReason.RecognizedSpeech)
            {
                var autoDetectedLanguage = AutoDetectSourceLanguageResult.FromResult(e.Result).Language;
                Console.WriteLine($"RECOGNIZED: Text={e.Result.Text}");
                _logger.LogInformation(
                    "RECOGNIZED: ConnectionId={ConnectionId}, Language={Language}, Text={Text}",
                    _connectionId,
                    autoDetectedLanguage,
                    e.Result.Text);
            }
            else if (e.Result.Reason == ResultReason.NoMatch)
            {
                Console.WriteLine("NOMATCH: Speech could not be recognized.");
                _logger.LogInformation("NOMATCH: ConnectionId={ConnectionId}", _connectionId);
            }
        };

        _recognizer.Canceled += (_, e) =>
        {
            _logger.LogWarning(
                "Speech recognition canceled. ConnectionId={ConnectionId}, Reason={Reason}, ErrorCode={ErrorCode}, ErrorDetails={ErrorDetails}",
                _connectionId,
                e.Reason,
                e.ErrorCode,
                e.ErrorDetails);
        };
    }

    public async Task StartAsync(CancellationToken ct = default)
    {
        if (_started)
        {
            return;
        }

        await _recognizer.StartContinuousRecognitionAsync().ConfigureAwait(false);
        _started = true;
    }

    public void PushAudioChunk(PcmAudioChunk chunk)
    {
        if (!_started || string.IsNullOrWhiteSpace(chunk.DataBase64))
        {
            return;
        }

        try
        {
            var bytes = Convert.FromBase64String(chunk.DataBase64);
            _pushStream.Write(bytes);
        }
        catch (FormatException ex)
        {
            _logger.LogWarning(
                ex,
                "Invalid base64 PCM chunk. ConnectionId={ConnectionId}, Position={Position}",
                _connectionId,
                chunk.Position);
        }
    }

    public async ValueTask DisposeAsync(CancellationToken ct = default)
    {
        try
        {
            if (_started)
            {
                await _recognizer.StopContinuousRecognitionAsync().ConfigureAwait(false);
            }
        }
        finally
        {
            _pushStream.Close();
            _recognizer.Dispose();
            _started = false;
        }
    }
}
