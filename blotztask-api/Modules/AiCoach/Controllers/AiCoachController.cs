using BlotzTask.Modules.AiCoach.Contracts;
using BlotzTask.Modules.AiCoach.Services;
using BlotzTask.Modules.AiCoach.StateMachine;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.AiCoach.Controllers;

[ApiController]
[Route("/api/ai-coach/conversations")]
[Authorize]
public sealed class AiCoachController(
    IAiConversationApplication application,
    IAiConversationKernel kernel,
    IConversationSnapshotProjector projector,
    TimeProvider timeProvider) : ControllerBase
{
    [HttpPost]
    public async Task<ConversationSnapshotDto> Create(
        [FromBody] CreateAiConversationRequest request,
        CancellationToken cancellationToken)
    {
        AiCoachProtocol.EnsureSupported(request.ProtocolVersion);
        var conversation = await application.CreateAsync(GetUserId(), request.Mode, cancellationToken);
        return projector.ToDto(conversation, request.ClientCapabilities);
    }

    [HttpGet("{conversationId:guid}")]
    public async Task<ConversationSnapshotDto> Get(
        Guid conversationId,
        [FromQuery] int protocolVersion = AiCoachProtocol.CurrentVersion,
        [FromQuery] int[]? taskDraftSchemaVersions = null,
        CancellationToken cancellationToken = default)
    {
        AiCoachProtocol.EnsureSupported(protocolVersion);
        var conversation = await application.GetAsync(GetUserId(), conversationId, cancellationToken);
        return projector.ToDto(conversation, Capabilities(taskDraftSchemaVersions));
    }

    [HttpPost("{conversationId:guid}/messages")]
    public async Task<ConversationCommandResultDto> SendMessage(
        Guid conversationId,
        [FromBody] SendAiCoachMessageRequest request,
        CancellationToken cancellationToken)
    {
        AiCoachProtocol.EnsureSupported(request.ProtocolVersion);
        var result = await kernel.DispatchAsync(GetUserId(), conversationId, request.ExpectedVersion,
            new UserMessageReceived(Guid.NewGuid(), request.Content, timeProvider.GetUtcNow()), cancellationToken);
        return new ConversationCommandResultDto(result.Accepted,
            result.Accepted ? null : result.Violation is null ? "version_conflict" : ProtocolValue.From(result.Violation.Value),
            projector.ToDto(result.Conversation, request.ClientCapabilities));
    }

    private static ClientArtifactCapabilities Capabilities(int[]? taskDraftSchemaVersions) =>
        taskDraftSchemaVersions is { Length: > 0 }
            ? new ClientArtifactCapabilities(new Dictionary<string, IReadOnlyList<int>>
                { ["task_draft"] = taskDraftSchemaVersions })
            : ClientArtifactCapabilities.Foundation;

    private Guid GetUserId()
    {
        if (HttpContext.Items.TryGetValue("UserId", out var value) && value is Guid userId)
            return userId;

        throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
    }
}
