namespace BlotzTask.Modules.Referrals.Domain;

public class ReferralCode
{
    public int Id { get; set; }
    public Guid OwnerUserId { get; set; }
    public string? Code { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
