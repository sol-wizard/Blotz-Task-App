using BlotzTask.Modules.Badges.Commands;
using BlotzTask.Modules.Badges.Enum;

namespace BlotzTask.Modules.Badges.Services;

public class BadgeAwardCommand
{
    public required Guid UserId { get; init; }
    public required TriggerAction TriggerAction { get; init; }
    public required Dictionary<EventValueKey, double> EventValues { get; init; }
}

public class BadgeAwardService(
    FindMatchingBadgesHandler findMatchingBadgesHandler,
    AwardNewBadgesToUserHandler awardNewBadgesToUserHandler,
    NotifyBadgesToUser notifyBadgesToUser)
{
    public async Task ProcessAsync(BadgeAwardCommand command, CancellationToken ct = default)
    {
        var matchingBadgeIds = await findMatchingBadgesHandler.Handle(new FindMatchingBadgesCommand
        {
            TriggerAction = command.TriggerAction,
            EventValues = command.EventValues
        }, ct);

        var awardedBadgeIds = await awardNewBadgesToUserHandler.Handle(new AwardNewBadgesToUserCommand
        {
            UserId = command.UserId,
            BadgeIds = matchingBadgeIds
        }, ct);

        await notifyBadgesToUser.HandleAsync(command.UserId, awardedBadgeIds, ct);
    }
}
