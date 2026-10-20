namespace BlotzTask.Modules.Referrals.Domain;

public class Referral
{
    public int Id { get; set; }
    public Guid ReferrerUserId { get; set; }
    public Guid RefereeUserId { get; set; }
    public required string CodeUsed { get; set; }
    public DateTime RedeemedAtUtc { get; set; }
}
