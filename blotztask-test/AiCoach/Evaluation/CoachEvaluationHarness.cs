using System.Diagnostics;
using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Queries;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>Real application and Azure gateway; the decorator only records provider exchanges.</summary>
internal sealed class CoachEvaluationHarness
{
    private readonly CoachTestSession _session;
    private readonly ConversationApplication _application;
    private readonly RecordingGateway _gateway;
    private readonly CoachSemanticJudge _judge;
    private readonly AiCoachUsageTracker _usage = new();
    private readonly List<object> _turns = [];
    private readonly List<JudgeTurnEvidence> _judgeTurns = [];
    private readonly string _deployment;
    private readonly string _judgeDeployment;
    private readonly string _transport;
    private readonly AiCoachModuleOptions _limits;
    private readonly string? _profileName;
    private readonly bool _streaming = Environment.GetEnvironmentVariable("AICOACH_EVAL_STREAM") == "1";
    // Matches the installed app: protocol 6 (review list) with memory tools and user context.
    private readonly bool _mobile = Environment.GetEnvironmentVariable("AICOACH_EVAL_MOBILE") == "1";
    private readonly SegmentDigestGenerator _digests;
    private static readonly HttpClient ProfileResponsesClient = new() { Timeout = Timeout.InfiniteTimeSpan };
    public string ReportPath { get; }

    public CoachEvaluationHarness(CoachTestSession session, string caseId, int repetition)
    {
        _session = session;
        var credentials = CoachLiveSettings.Load() ?? throw new InvalidOperationException("Live credentials missing.");
        var client = new AzureOpenAIClient(new Uri(credentials.Endpoint), new AzureKeyCredential(credentials.Key));
        _profileName = Environment.GetEnvironmentVariable("AICOACH_EVAL_PROFILE");
        IModelGateway provider;
        if (!string.IsNullOrWhiteSpace(_profileName))
        {
            var config = new ConfigurationBuilder()
                .AddJsonFile(Path.Combine(FindRepository(), "blotztask-api", "appsettings.json")).Build();
            _limits = config.GetSection(AiCoachModuleOptions.SectionName).Get<AiCoachModuleOptions>()!;
            _limits.DefaultModel = _profileName;
            var profile = AiCoachModelProfile.Select(_limits);
            if (!AiCoachModelProfile.IsValid(_limits)) throw new InvalidOperationException("Invalid evaluation model profile.");
            _deployment = profile.DeploymentId;
            _transport = profile.Api;
            provider = profile.Api == "Responses"
                ? new AzureResponsesModelGateway(ProfileResponsesClient, credentials.Endpoint, credentials.Key, profile)
                : new AzureOpenAiModelGateway(client, Options.Create(new AiCoachModuleOptions { DeploymentId = _deployment }));
        }
        else
        {
            _deployment = Environment.GetEnvironmentVariable("AICOACH_EVAL_MODEL") ?? credentials.Deployment;
            _limits = new() { DeploymentId = _deployment };
            _transport = Environment.GetEnvironmentVariable("AICOACH_EVAL_TRANSPORT") ?? "chat";
            provider = _transport switch
            {
                "chat" => new AzureOpenAiModelGateway(client, Options.Create(_limits)),
                "responses" => new ResponsesEvaluationGateway(credentials.Endpoint, credentials.Key, _deployment),
                _ => throw new InvalidOperationException("AICOACH_EVAL_TRANSPORT must be chat or responses."),
            };
        }
        var options = Options.Create(_limits);
        _gateway = new(provider);
        _judgeDeployment = Environment.GetEnvironmentVariable("AICOACH_EVAL_JUDGE_MODEL") ?? credentials.Deployment;
        _judge = new(new AzureOpenAiModelGateway(client,
            Options.Create(new AiCoachModuleOptions { DeploymentId = _judgeDeployment })));
        var runtime = new ModelTurnRuntime(_gateway, options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance));
        _application = new(session.Store, runtime, _usage, session.Reader, session.Checker,
            session.Clock, NullLogger<ConversationApplication>.Instance,
            new ConversationSegments(session.Store, session.Clock, options), trace: null,
            _mobile ? new GetUserContextQueryHandler(session.Db, session.Clock) : null,
            _mobile ? new RememberUserMemoryCommandHandler(session.Db, session.Clock, NullLogger<RememberUserMemoryCommandHandler>.Instance) : null,
            _mobile ? new ForgetUserMemoryCommandHandler(session.Db, session.Clock, NullLogger<ForgetUserMemoryCommandHandler>.Instance) : null);
        _digests = new(_gateway, _usage, options, NullLogger<SegmentDigestGenerator>.Instance);
        var root = FindRepository();
        var directory = Path.Combine(root, "blotztask-test", "TestResults", "ai-coach-evals", RunId);
        Directory.CreateDirectory(directory);
        ReportPath = Path.Combine(directory, $"{caseId}-{repetition}-{Guid.NewGuid():N}.jsonl");
    }

    private static string RunId { get; } = $"{DateTime.UtcNow:yyyyMMddTHHmmss}-{Guid.NewGuid():N}";

    public async Task SendAsync(string message)
    {
        var before = _session.Conversation.Drafts.Select(draft => draft.Copy()).ToArray();
        var callOffset = _gateway.Calls.Count;
        var failureOffset = _gateway.Failures.Count;
        var previousMessageIds = _session.Conversation.Messages.Select(message => message.Id).ToHashSet();
        var watch = Stopwatch.StartNew();
        long? firstVisibleTextMs = null;
        var streamedText = new System.Text.StringBuilder();
        var textChunks = 0;
        Task OnStream(string kind, object payload)
        {
            if (kind == "reply.delta")
            {
                var node = JsonSerializer.SerializeToElement(payload);
                if (node.TryGetProperty("text", out var textNode) && textNode.GetString() is { } text)
                {
                    if (!string.IsNullOrWhiteSpace(text)) firstVisibleTextMs ??= watch.ElapsedMilliseconds;
                    streamedText.Append(text);
                    textChunks++;
                }
            }
            return Task.CompletedTask;
        }
        try
        {
            var snapshot = await _application.SendAsync(_session.UserId, _session.Conversation.Id,
                Guid.NewGuid(), message, _session.Conversation.Version, default,
                stream: _streaming ? OnStream : null);
            var calls = _gateway.Calls.Skip(callOffset).ToArray();
            _turns.Add(new { message, elapsedMs = watch.ElapsedMilliseconds, firstVisibleTextMs, textChunks,
                streamedText = streamedText.ToString(), before, snapshot, calls,
                failedCalls = _gateway.Failures.Skip(failureOffset).ToArray() });
            var reply = snapshot.Messages.LastOrDefault(item => item.Role == "assistant" && !previousMessageIds.Contains(item.Id));
            if (reply is not null)
            {
                var toolCalls = calls.SelectMany(call => call.Response.ToolCalls).ToArray();
                var callIds = toolCalls.Select(tool => tool.Id).ToHashSet();
                _judgeTurns.Add(new(_judgeTurns.Count + 1, message, reply.Text,
                    before, snapshot.Artifacts, toolCalls,
                    calls.SelectMany(call => call.ToolResults).Where(tool => callIds.Contains(tool.ToolCallId))
                        .Select(tool => new { tool.ToolCallId, Result = ParseToolResult(tool.Content) }).ToArray()));
            }
        }
        catch (Exception error)
        {
            _turns.Add(new { message, elapsedMs = watch.ElapsedMilliseconds, firstVisibleTextMs, textChunks,
                streamedText = streamedText.ToString(), before, errorType = error.GetType().Name,
                calls = _gateway.Calls.Skip(callOffset).ToArray(), failedCalls = _gateway.Failures.Skip(failureOffset).ToArray() });
            throw;
        }
    }

    /// <summary>Runs the background closing summary and memory extraction over the whole conversation.</summary>
    public async Task DigestAsync()
    {
        var callOffset = _gateway.Calls.Count;
        var watch = Stopwatch.StartNew();
        var messages = _session.Conversation.Messages
            .Select(message => new DigestMessage(message.Id, message.Role, message.Content, message.CreatedAt)).ToArray();
        var memories = await _session.Db.UserMemories.AsNoTracking().Where(memory => memory.UserId == _session.UserId).ToListAsync();
        var digest = await _digests.GenerateAsync(_session.Conversation, true, messages, memories, true,
            _session.Clock.GetUtcNow(), default);
        _turns.Add(new { message = "[background digest]", elapsedMs = watch.ElapsedMilliseconds, firstVisibleTextMs = (long?)null,
            textChunks = 0, streamedText = "", before = Array.Empty<object>(), snapshot = new { GenerationError = (string?)null },
            digest, calls = _gateway.Calls.Skip(callOffset).ToArray(), failedCalls = Array.Empty<object>() });
    }

    public bool Called(string name) => _gateway.Calls.Any(call => call.Response.ToolCalls.Any(tool => tool.Name == name));

    private static object ParseToolResult(string content)
    {
        try { return JsonSerializer.Deserialize<JsonElement>(content); }
        catch (JsonException) { return content; }
    }

    public async Task RecordAsync(string caseId, int repetition, string[] reviewCriteria, Exception? failure)
    {
        var root = FindRepository();
        using var judgeTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(60));
        var skipJudge = Environment.GetEnvironmentVariable("AICOACH_EVAL_SKIP_JUDGE") == "1";
        var aiEvaluation = skipJudge ? new JudgeRun("skipped", CoachSemanticJudge.Version, null, "Performance-only run.", 0, 0)
            : await _judge.EvaluateAsync(caseId, reviewCriteria, _judgeTurns, judgeTimeout.Token);
        var record = new
        {
            schemaVersion = 1, caseId, repetition, recordedAt = DateTimeOffset.UtcNow,
            commit = Git(root, "rev-parse", "HEAD"),
            sourceFingerprint = SourceFingerprint(root),
            promptVersion = CoachPrompt.PromptVersion, mobile = _mobile, toolContractVersion = ToolExecutor.ContractVersion,
            deployment = _deployment, transport = _transport, profile = _profileName, streaming = _streaming,
            judgeDeployment = _judgeDeployment,
            limits = _limits, localNow = CoachTestSession.Now,
            timeZone = _session.Conversation.TimeZoneId,
            objectiveStatus = failure is null ? "passed" : "failed",
            failure = failure?.ToString(), semanticStatus = skipJudge ? "not_evaluated" : "needs_review", reviewCriteria, aiEvaluation,
            turns = _turns, usage = _usage.Find(_session.Conversation.Id),
            finalDrafts = _session.Conversation.Drafts,
            applicationHistory = _session.Conversation.History.OfType<GatewaySystemMessage>().ToArray(),
            savedTasks = await _session.Db.TaskItems.Where(task => task.UserId == _session.UserId)
                .Select(task => new { task.Id, task.Title, task.StartTime, task.EndTime }).ToArrayAsync(),
        };
        await File.WriteAllTextAsync(ReportPath, JsonSerializer.Serialize(record) + Environment.NewLine);
    }

    internal static string FindRepository()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
            if (Directory.Exists(Path.Combine(dir.FullName, "blotztask-api"))) return dir.FullName;
        throw new DirectoryNotFoundException("Cannot locate repository for evaluation artifacts.");
    }

    internal static string Git(string root, params string[] args)
    {
        var info = new ProcessStartInfo("git") { WorkingDirectory = root, RedirectStandardOutput = true, UseShellExecute = false };
        foreach (var arg in args) info.ArgumentList.Add(arg);
        using var process = Process.Start(info) ?? throw new InvalidOperationException("Cannot start git.");
        var value = process.StandardOutput.ReadToEnd();
        process.WaitForExit();
        if (process.ExitCode != 0) throw new InvalidOperationException("Cannot identify evaluation source revision.");
        return value.Trim();
    }

    internal static string SourceFingerprint(string root)
    {
        using var hash = System.Security.Cryptography.IncrementalHash.CreateHash(System.Security.Cryptography.HashAlgorithmName.SHA256);
        // Hash tracked and untracked implementation files, never local credentials or generated binaries.
        foreach (var directory in new[] { "blotztask-api/Modules/AiCoach", "blotztask-test/AiCoach" })
        foreach (var path in Directory.EnumerateFiles(Path.Combine(root, directory), "*.cs", SearchOption.AllDirectories).Order(StringComparer.Ordinal))
        {
            hash.AppendData(System.Text.Encoding.UTF8.GetBytes(Path.GetRelativePath(root, path)));
            hash.AppendData(File.ReadAllBytes(path));
        }
        return Convert.ToHexString(hash.GetHashAndReset());
    }

    private sealed record Exchange(object Request, ModelCompletionResult Response, long ElapsedMs,
        IReadOnlyList<GatewayToolResultMessage> ToolResults);
    private sealed record FailedExchange(string ErrorType, int? HttpStatus, long ElapsedMs);
    private sealed class RecordingGateway(IModelGateway inner, List<Exchange>? calls = null,
        List<FailedExchange>? failures = null) : IModelGateway
    {
        public List<Exchange> Calls { get; } = calls ?? [];
        public List<FailedExchange> Failures { get; } = failures ?? [];
        public AiCoachModelProfile? Profile => inner.Profile;
        public IModelGateway OpenTurn() => new RecordingGateway(inner.OpenTurn(), Calls, Failures);
        public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            // Serialize concrete message types now: runtime mutates its transcript after this call.
            var captured = new { request.SystemPrompt, messages = request.Messages.Select(message =>
                new { kind = message.GetType().Name, data = JsonSerializer.SerializeToElement(message, message.GetType()) }).ToArray(),
                request.Tools, request.MaxOutputTokens };
            var timer = Stopwatch.StartNew();
            try
            {
                var result = await inner.CompleteAsync(request, cancellationToken);
                Calls.Add(new(captured, result, timer.ElapsedMilliseconds,
                    request.Messages.OfType<GatewayToolResultMessage>().ToArray()));
                return result;
            }
            catch (Exception error)
            {
                Failures.Add(new(error.GetType().Name, error is HttpRequestException http && http.StatusCode is { } status
                    ? (int)status : null, timer.ElapsedMilliseconds));
                throw;
            }
        }
    }
}
