using BlotzTask.Modules.AiCoach.Contracts;
using BlotzTask.Modules.AiCoach.Services;
using BlotzTask.Modules.AiCoach.StateMachine;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.AiCoach;

[Authorize]
public sealed class AiCoachHub(
    IAiConversationApplication application,
    IAiConversationKernel kernel,
    IConversationSnapshotProjector projector,
    TimeProvider timeProvider) : Hub
{
    public async Task ResumeConversation(
        Guid conversationId,
        int protocolVersion = AiCoachProtocol.CurrentVersion,
        ClientArtifactCapabilities? clientCapabilities = null)
    {
        AiCoachProtocol.EnsureSupported(protocolVersion);
        var conversation = await application.GetAsync(GetUserId(), conversationId, Context.ConnectionAborted);
        var snapshot = projector.ToDto(conversation, clientCapabilities ?? ClientArtifactCapabilities.Foundation);

        await Clients.Caller.SendAsync(
            "ReceiveConversationSnapshot",
            snapshot,
            Context.ConnectionAborted);
    }

    public async Task SendMessage(
        Guid conversationId,
        int expectedVersion,
        string content,
        int protocolVersion = AiCoachProtocol.CurrentVersion,
        ClientArtifactCapabilities? clientCapabilities = null)
    {
        AiCoachProtocol.EnsureSupported(protocolVersion);
        var result = await kernel.DispatchAsync(GetUserId(), conversationId, expectedVersion,
            new UserMessageReceived(Guid.NewGuid(), content, timeProvider.GetUtcNow()), Context.ConnectionAborted);
        var response = new ConversationCommandResultDto(result.Accepted,
            result.Accepted ? null : result.Violation is null ? "version_conflict" : ProtocolValue.From(result.Violation.Value),
            projector.ToDto(result.Conversation, clientCapabilities ?? ClientArtifactCapabilities.Foundation));

        await Clients.Caller.SendAsync(
            "ReceiveCommandResult",
            response,
            Context.ConnectionAborted);
        await Clients.Caller.SendAsync(
            "ReceiveConversationSnapshot",
            response.Snapshot,
            Context.ConnectionAborted);
    }

    private Guid GetUserId()
    {
        var httpContext = Context.GetHttpContext();
        if (httpContext?.Items.TryGetValue("UserId", out var value) == true && value is Guid userId)
            return userId;

        throw new HubException("UserId not found. Connection rejected.");
    }
}
