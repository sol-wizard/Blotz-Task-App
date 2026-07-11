using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Badges.Queries;

public class GetBadgeByIdQuery
{
    public required Guid UserId { get; init; }
    public required int BadgeId { get; init; }
}

public class GetBadgeByIdQueryHandler(BlotzTaskDbContext db, ILogger<GetBadgeByIdQueryHandler> logger)
{
    public async Task<BadgeByIdItemDto> Handle(GetBadgeByIdQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching badges for UserId {UserId}", query.UserId);

        var preference = await db.UserPreferences.FindAsync(query.UserId, ct);
        var language = preference?.PreferredLanguage ?? Language.En;
        var badge = await db.Badges.FindAsync(query.BadgeId, ct);

        if (badge == null)
            throw new NotFoundException($"Badge with ID {query.BadgeId} not found.");


        return new BadgeByIdItemDto
        {
            Id = badge.Id,
            Name = language == Language.Zh ? badge.NameZh : badge.NameEn,
            Description = language == Language.Zh ? badge.DescriptionZh : badge.DescriptionEn,
            IconUrl = badge.IconUrl,
            Category = badge.Category.ToString(),
        };
    }
}

public class BadgeByIdItemDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string IconUrl { get; set; }
    public required string Category { get; set; }
}