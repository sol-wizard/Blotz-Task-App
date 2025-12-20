namespace BlotzTask.Modules.Users.Queries;

public class GetUserPreferenceQuery
{
    public Guid UserId { get; set; }
}

/*
public class GetUserPreferencesQueryHandler(BlotzTaskDbContext db, ILogger<GetUserPreferencesQueryHandler> logger)
{
    public async Task<UserProfileDTO> Handle( GetUserProfileQuery query, CancellationToken ct = default)

}

public class GetUserPreferencesDTO
{
*/
}