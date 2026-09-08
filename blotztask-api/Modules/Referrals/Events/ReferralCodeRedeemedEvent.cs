using BlotzTask.Shared.Events;

namespace BlotzTask.Modules.Referrals.Events;

public class ReferralCodeRedeemedEvent : IDomainEvent
{
    public required Guid ReferrerUserId { get; init; }
    public required Guid RefereeUserId { get; init; }
}
