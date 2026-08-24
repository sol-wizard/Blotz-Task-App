using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>
/// Table-driven guard tests (tech design §21.17). The guard is the deterministic backstop the
/// prompt can never replace: even a perfectly-behaved model goes through these checks.
/// </summary>
public class CapabilityGuardTests
{
    private static readonly AiCoachModeDefinition Mode = ExecutionModeDefinition.Create();
    private static readonly Guid UserId = Guid.NewGuid();

    private readonly CapabilityGuard _guard;
    private readonly CapabilityRegistry _registry;

    public CapabilityGuardTests()
    {
        _registry = new CapabilityRegistry();
        _registry.Register(new CapabilityDefinition(
            Id: CapabilityId.DraftOneOffCreate,
            CapabilityVersion: 1,
            InputSchemaVersion: 1,
            OutputSchemaVersion: 1,
            AllowedInvokers: new HashSet<CapabilityInvoker> { CapabilityInvoker.Model },
            AllowedModes: new HashSet<AiCoachMode> { AiCoachMode.Execution },
            AllowedStates: new HashSet<ConversationState>
            {
                ConversationState.Conversing,
                ConversationState.Clarifying,
                ConversationState.DraftPending,
            },
            AllowedCurrentArtifacts: new HashSet<ArtifactType> { ArtifactType.TaskDraft },
            ConsentRequirement: ConsentRequirement.None,
            ExecutionSemantics: CapabilityExecutionSemantics.ProposesArtifact,
            ConcurrencyPolicy: CapabilityConcurrencyPolicy.SequentialOnly,
            ToolName: "create_task_drafts",
            ToolDescription: "test",
            InputType: typeof(CreateTaskDraftsInput),
            HandlerType: typeof(CreateTaskDraftsHandler)));
        _guard = new CapabilityGuard(_registry);
    }

    private static ConversationSnapshot Snapshot(
        ConversationState state,
        CurrentArtifactSnapshot? artifact = null,
        AiCoachMode mode = AiCoachMode.Execution,
        ConversationLifecycleStatus lifecycle = ConversationLifecycleStatus.Active)
    {
        return new ConversationSnapshot(
            Guid.NewGuid(), UserId, mode, lifecycle, state,
            GenerationStatus.Running, BlockedReason.None, 1, artifact,
            ClarificationProgress.None, new HashSet<ConversationAction>());
    }

    private static CapabilityRequest Request(
        Guid? userId = null,
        bool proposedInTurn = false,
        CapabilityId? capabilityId = null,
        int version = 1,
        CapabilityInvoker invoker = CapabilityInvoker.Model)
    {
        return new CapabilityRequest(
            capabilityId ?? CapabilityId.DraftOneOffCreate,
            version,
            invoker,
            userId ?? UserId,
            proposedInTurn,
            ProcessedInvocationIds: [],
            InvocationId: Guid.NewGuid());
    }

    private static CurrentArtifactSnapshot PendingDraft() => new(
        Guid.NewGuid(), ArtifactType.TaskDraft, 2, 1, ArtifactStatus.Pending,
        new TaskDraftPayload([new TaskDraftItem(Guid.NewGuid(), "t", null, new DateOnly(2026, 8, 17),
            new TimeOnly(15, 0), new TimeOnly(15, 30), "Australia/Sydney", null)]));

    private static CreateTaskDraftsInput Single(
        string? title, string? description, string? date, string? start, string? end, int? labelId) =>
        new([new CreateTaskDraftItemInput(title, description, date, start, end, labelId)]);

    [Fact]
    public void Allows_DraftCreation_InClarifyingState_WithNoCurrentArtifact()
    {
        var decision = _guard.Evaluate(Request(), Snapshot(ConversationState.Clarifying), Mode);

        decision.IsAllowed.Should().BeTrue();
    }

    [Fact]
    public void Rejects_SecondDraft_WhenOneIsPending_WithPendingDraftAlreadyExists()
    {
        // Scenario §19.3: this exact rejection code, not a generic state error.
        var decision = _guard.Evaluate(
            Request(), Snapshot(ConversationState.DraftPending, PendingDraft()), Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.PendingDraftAlreadyExists);
    }

    [Fact]
    public void Rejects_SecondDraftProposal_InTheSameTurn()
    {
        var decision = _guard.Evaluate(
            Request(proposedInTurn: true), Snapshot(ConversationState.Conversing), Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.ArtifactAlreadyProposedInCurrentTurn);
    }

    [Fact]
    public void Rejects_WhenConversationBelongsToAnotherUser()
    {
        var decision = _guard.Evaluate(
            Request(userId: Guid.NewGuid()), Snapshot(ConversationState.Conversing), Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.ConversationOwnershipViolation);
    }

    [Fact]
    public void Rejects_UnregisteredCapability()
    {
        var decision = _guard.Evaluate(
            Request(capabilityId: new CapabilityId("draft.recurring.create")),
            Snapshot(ConversationState.Conversing), Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.CapabilityNotRegistered);
    }

    [Fact]
    public void Rejects_UnsupportedCapabilityVersion()
    {
        var decision = _guard.Evaluate(
            Request(version: 2), Snapshot(ConversationState.Conversing), Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.CapabilityVersionUnsupported);
    }

    [Fact]
    public void Rejects_InvokerThatIsNotAllowed()
    {
        var decision = _guard.Evaluate(
            Request(invoker: CapabilityInvoker.UserCommand), Snapshot(ConversationState.Conversing), Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.InvokerNotAllowed);
    }

    [Fact]
    public void Rejects_StateOutsideTheAllowedSet()
    {
        var decision = _guard.Evaluate(Request(), Snapshot(ConversationState.DraftHandled), Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.InvalidState);
    }

    [Fact]
    public void Rejects_ClosedConversation()
    {
        var decision = _guard.Evaluate(
            Request(),
            Snapshot(ConversationState.Conversing, lifecycle: ConversationLifecycleStatus.Closed),
            Mode);

        decision.IsAllowed.Should().BeFalse();
        decision.RejectionCode.Should().Be(CapabilityRejectionCode.LifecycleNotAllowed);
    }

    // ---------- Input validation via the capability handler (guard pipeline steps 10-11) ----------

    [Theory]
    [InlineData(null, "2026-08-17", "15:00", "15:30")] // no title
    [InlineData("写论文", null, "15:00", "15:30")]      // no date
    [InlineData("写论文", "2026-08-17", null, "15:30")] // no start
    [InlineData("写论文", "2026-08-17", "15:00", null)] // no end
    public void DraftHandler_MissingRequiredFields_ReturnsMissingRequiredInformation(
        string? title, string? date, string? start, string? end)
    {
        // Scenario §19.1: the model drafting without enough information must surface
        // MissingRequiredInformation — the prompt is only the second line of defence.
        var handler = new CreateTaskDraftsHandler();

        var (payload, error) = handler.Validate(
            Single(title, null, date, start, end, null), "Australia/Sydney");

        payload.Should().BeNull();
        error!.Code.Should().Be(CapabilityRejectionCode.MissingRequiredInformation);
    }

    [Fact]
    public void DraftHandler_EmptyTaskList_ReturnsMissingRequiredInformation()
    {
        var handler = new CreateTaskDraftsHandler();

        var (payload, error) = handler.Validate(new CreateTaskDraftsInput([]), "Australia/Sydney");

        payload.Should().BeNull();
        error!.Code.Should().Be(CapabilityRejectionCode.MissingRequiredInformation);
    }

    [Fact]
    public void DraftHandler_TooManyTasks_ReturnsSchemaValidationFailed()
    {
        var handler = new CreateTaskDraftsHandler();
        var tasks = Enumerable.Range(0, TaskDraftPayload.MaxItems + 1)
            .Select(i => new CreateTaskDraftItemInput($"task {i}", null, "2026-08-17", "09:00", "09:30", null))
            .ToList();

        var (payload, error) = handler.Validate(new CreateTaskDraftsInput(tasks), "Australia/Sydney");

        payload.Should().BeNull();
        error!.Code.Should().Be(CapabilityRejectionCode.SchemaValidationFailed);
    }

    [Fact]
    public void DraftHandler_OneBadItem_RejectsTheWholeCall_AndNamesTheItem()
    {
        // Never produce a half-validated card; the model fixes the named item and resubmits all.
        var handler = new CreateTaskDraftsHandler();
        var tasks = new List<CreateTaskDraftItemInput>
        {
            new("写周报", null, "2026-08-17", "09:00", "09:30", null),
            new("订机票", null, "2026-08-17", "11:00", "10:30", null), // end before start
            new("打电话给牙医", null, "2026-08-17", "14:00", "14:15", null),
        };

        var (payload, error) = handler.Validate(new CreateTaskDraftsInput(tasks), "Australia/Sydney");

        payload.Should().BeNull();
        error!.Code.Should().Be(CapabilityRejectionCode.SchemaValidationFailed);
        error.SafeMessageForModel.Should().StartWith("tasks[1]");
    }

    [Fact]
    public void DraftHandler_SeveralValidTasks_ProducesOneCard_InOrder_WithDistinctItemIds()
    {
        var handler = new CreateTaskDraftsHandler();
        var tasks = new List<CreateTaskDraftItemInput>
        {
            new("写周报", null, "2026-08-17", "09:00", "09:30", null),
            new("订机票", null, "2026-08-17", "11:00", "11:20", null),
            new("打电话给牙医", null, "2026-08-18", "14:00", "14:15", null),
        };

        var (payload, error) = handler.Validate(new CreateTaskDraftsInput(tasks), "Australia/Sydney");

        error.Should().BeNull();
        payload!.Items.Select(i => i.Title).Should().Equal("写周报", "订机票", "打电话给牙医");
        payload.Items.Select(i => i.ItemId).Should().OnlyHaveUniqueItems();
        payload.IsSingle.Should().BeFalse();
        payload.Items.Should().AllSatisfy(i => i.PersistedTaskId.Should().BeNull());
    }

    [Theory]
    [InlineData("17/08/2026", "15:00", "15:30")] // bad date format
    [InlineData("2026-08-17", "3pm", "15:30")]   // bad time format
    [InlineData("2026-08-17", "16:00", "15:30")] // end before start
    public void DraftHandler_MalformedFields_ReturnSchemaValidationFailed(
        string date, string start, string end)
    {
        var handler = new CreateTaskDraftsHandler();

        var (payload, error) = handler.Validate(
            Single("写论文", null, date, start, end, null), "Australia/Sydney");

        payload.Should().BeNull();
        error!.Code.Should().Be(CapabilityRejectionCode.SchemaValidationFailed);
    }

    [Fact]
    public void DraftHandler_ValidInput_ProducesPayloadWithConversationTimeZone()
    {
        var handler = new CreateTaskDraftsHandler();

        var (payload, error) = handler.Validate(
            Single("整理三篇参考资料", null, "2026-08-17", "15:00", "15:30", null),
            "Australia/Sydney");

        error.Should().BeNull();
        payload!.IsSingle.Should().BeTrue();
        payload.Items[0].Title.Should().Be("整理三篇参考资料");
        payload.Items[0].TimeZoneId.Should().Be("Australia/Sydney", "the time zone comes from the conversation, never the model");
    }
}
