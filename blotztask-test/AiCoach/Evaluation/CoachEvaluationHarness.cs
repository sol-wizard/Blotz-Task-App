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
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>Real application and Azure gateway; the decorator only records provider exchanges.</summary>
internal sealed class CoachEvaluationHarness
{
    private readonly CoachTestSession _session;
    private readonly ConversationApplication _application;
    private readonly RecordingGateway _gateway;
    private readonly AiCoachUsageTracker _usage = new();
    private readonly List<object> _turns = [];
    private readonly string _deployment;
    private readonly AiCoachModuleOptions _limits;
    public string ReportPath { get; }

    public CoachEvaluationHarness(CoachTestSession session, string caseId, int repetition)
    {
        _session = session;
        var credentials = CoachLiveSettings.Load() ?? throw new InvalidOperationException("Live credentials missing.");
        _deployment = credentials.Deployment;
        _limits = new() { DeploymentId = _deployment };
        var options = Options.Create(_limits);
        _gateway = new(new AzureOpenAiModelGateway(new AzureOpenAIClient(new Uri(credentials.Endpoint),
            new AzureKeyCredential(credentials.Key)), options));
        var runtime = new ModelTurnRuntime(_gateway, options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance));
        _application = new(session.Store, runtime, new CheckAiQuotaService(session.Db, session.Cache),
            new RecordAiUsageService(session.Db), _usage, session.Reader, session.Checker,
            session.Clock, NullLogger<ConversationApplication>.Instance);
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
        var watch = Stopwatch.StartNew();
        try
        {
            var snapshot = await _application.SendAsync(_session.UserId, _session.Conversation.Id,
                Guid.NewGuid(), message, _session.Conversation.Version, default);
            _turns.Add(new { message, elapsedMs = watch.ElapsedMilliseconds, before, snapshot,
                calls = _gateway.Calls.Skip(callOffset).ToArray() });
        }
        catch (Exception error)
        {
            _turns.Add(new { message, elapsedMs = watch.ElapsedMilliseconds, before,
                errorType = error.GetType().Name, calls = _gateway.Calls.Skip(callOffset).ToArray() });
            throw;
        }
    }

    public bool Called(string name) => _gateway.Calls.Any(call => call.Response.ToolCalls.Any(tool => tool.Name == name));

    public async Task RecordAsync(string caseId, int repetition, string[] reviewCriteria, Exception? failure)
    {
        var root = FindRepository();
        var record = new
        {
            schemaVersion = 1, caseId, repetition, recordedAt = DateTimeOffset.UtcNow,
            commit = Git(root, "rev-parse", "HEAD"),
            sourceFingerprint = SourceFingerprint(root),
            promptVersion = CoachPrompt.PromptVersion, toolContractVersion = ToolExecutor.ContractVersion,
            deployment = _deployment, limits = _limits, localNow = CoachTestSession.Now,
            mode = _session.Conversation.Mode.ToString(), timeZone = _session.Conversation.TimeZoneId,
            objectiveStatus = failure is null ? "passed" : "failed",
            failure = failure?.ToString(), semanticStatus = "needs_review", reviewCriteria,
            turns = _turns, usage = _usage.Find(_session.Conversation.Id),
            finalDrafts = _session.Conversation.Drafts,
            applicationHistory = _session.Conversation.History.OfType<GatewaySystemMessage>().ToArray(),
            savedTasks = await _session.Db.TaskItems.Where(task => task.UserId == _session.UserId)
                .Select(task => new { task.Id, task.Title, task.StartTime, task.EndTime }).ToArrayAsync(),
        };
        await File.WriteAllTextAsync(ReportPath, JsonSerializer.Serialize(record) + Environment.NewLine);
    }

    private static string FindRepository()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
            if (Directory.Exists(Path.Combine(dir.FullName, "blotztask-api"))) return dir.FullName;
        throw new DirectoryNotFoundException("Cannot locate repository for evaluation artifacts.");
    }

    private static string Git(string root, params string[] args)
    {
        var info = new ProcessStartInfo("git") { WorkingDirectory = root, RedirectStandardOutput = true, UseShellExecute = false };
        foreach (var arg in args) info.ArgumentList.Add(arg);
        using var process = Process.Start(info) ?? throw new InvalidOperationException("Cannot start git.");
        var value = process.StandardOutput.ReadToEnd();
        process.WaitForExit();
        if (process.ExitCode != 0) throw new InvalidOperationException("Cannot identify evaluation source revision.");
        return value.Trim();
    }

    private static string SourceFingerprint(string root)
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

    private sealed record Exchange(object Request, ModelCompletionResult Response, long ElapsedMs);
    private sealed class RecordingGateway(IModelGateway inner) : IModelGateway
    {
        public List<Exchange> Calls { get; } = [];
        public async Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            // Serialize concrete message types now: runtime mutates its transcript after this call.
            var captured = new { request.SystemPrompt, messages = request.Messages.Select(message =>
                new { kind = message.GetType().Name, data = JsonSerializer.SerializeToElement(message, message.GetType()) }).ToArray(),
                request.Tools, request.MaxOutputTokens };
            var timer = Stopwatch.StartNew();
            var result = await inner.CompleteAsync(request, cancellationToken);
            Calls.Add(new(captured, result, timer.ElapsedMilliseconds));
            return result;
        }
    }
}
