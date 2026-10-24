namespace BlotzTask.Modules.Users.Domain;

// One row per user per local calendar day the app was opened. Rows are only ever inserted,
// never updated — the monthly review counts them to show days active.
public class UserActivityDay
{
    public Guid UserId { get; set; }
    public DateOnly LocalDate { get; set; }
}
