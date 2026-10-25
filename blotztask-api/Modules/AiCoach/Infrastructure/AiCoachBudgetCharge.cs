namespace BlotzTask.Modules.AiCoach.Infrastructure;

// An unresolved call keeps its reservation: a disconnected client or process restart must not
// turn potentially billable work into free budget. Budget dates are assigned before dispatch.
public sealed class AiCoachBudgetCharge
{
    public Guid Id { get; set; }
    public DateOnly BudgetDate { get; set; }
    public string Environment { get; set; } = "";
    public string Model { get; set; } = "";
    public decimal ChargedUsd { get; set; }
    public bool Settled { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
