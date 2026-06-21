using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.Users.Queries;

public class UserProfileDTO
{
    public string? PictureUrl { get; set; }
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsOnBoarded { get; set; }
    public DateTime SignUpAt { get; set; }
    
    public string? Timezone { get; set; }
}

public class GetUserProfileQuery
{
    [Required]
    public required Guid UserId { get; init; }
}

public class GetUserProfileQueryHandler(BlotzTaskDbContext db, ILogger<GetUserProfileQueryHandler> logger)
{
    public async Task<UserProfileDTO> Handle(GetUserProfileQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Get profile image for user {UserId}.", query.UserId);

        var user = await db.AppUsers.FindAsync(query.UserId, ct);

        if (user == null)
        {
            logger.LogError("User Not Found.");
            throw new NotFoundException($"Cannot find user: {query.UserId}.");
        }

        return new UserProfileDTO
        {
            PictureUrl = user.PictureUrl,
            DisplayName = user.DisplayName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsOnBoarded = user.IsOnboarded,
            SignUpAt = user.SignUpAt,
            Timezone = user.Timezone
        };


    }
}