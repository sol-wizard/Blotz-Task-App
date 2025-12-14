using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Services;

public class UserPreferenceService
{
    private readonly BlotzTaskDbContext _dbContext;

    public UserPreferenceService(BlotzTaskDbContext dbContext)
    {
        _dbContext = dbContext;
    }

   
    // Get user preference; create default one if not exists.
    public async Task<UserPreference> GetOrCreateAsync(Guid userId)
    {
        var preference = await _dbContext.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (preference != null)
        {
            return preference;
        }

        return await CreateDefaultAsync(userId);
    }

    // Create default preference for user (internal use).
    private async Task<UserPreference> CreateDefaultAsync(Guid userId)
    {
        var preference = new UserPreference
        {
            UserId = userId
        };

        _dbContext.UserPreferences.Add(preference);
        await _dbContext.SaveChangesAsync();

        return preference;
    }
}
