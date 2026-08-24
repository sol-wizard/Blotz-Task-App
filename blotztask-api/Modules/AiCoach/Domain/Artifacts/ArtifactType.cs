namespace BlotzTask.Modules.AiCoach.Domain.Artifacts;

/// <summary>Artifact kinds (tech design §21). V1 Execution mode only produces TaskDraft.</summary>
public enum ArtifactType
{
    TaskDraft = 0,
    RecurringTaskDraft = 1,
    Suggestion = 2,
    MicroAction = 3,
}

/// <summary>Shared artifact lifecycle (tech design §21.5).</summary>
public enum ArtifactStatus
{
    Pending = 0,
    Processing = 1,
    Accepted = 2,
    Rejected = 3,
    Superseded = 4,
    Expired = 5,
}

public static class ArtifactTypeExtensions
{
    public static string ToWireValue(this ArtifactType type) => type switch
    {
        ArtifactType.TaskDraft => "task_draft",
        ArtifactType.RecurringTaskDraft => "recurring_task_draft",
        ArtifactType.Suggestion => "suggestion",
        ArtifactType.MicroAction => "micro_action",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Unmapped artifact type"),
    };

    public static string ToWireValue(this ArtifactStatus status) => status switch
    {
        ArtifactStatus.Pending => "pending",
        ArtifactStatus.Processing => "processing",
        ArtifactStatus.Accepted => "accepted",
        ArtifactStatus.Rejected => "rejected",
        ArtifactStatus.Superseded => "superseded",
        ArtifactStatus.Expired => "expired",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unmapped artifact status"),
    };
}
