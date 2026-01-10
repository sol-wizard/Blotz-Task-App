using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Onboarding.Domain;
using Microsoft.EntityFrameworkCore;

public sealed record GetOnboardingStateQuery(Guid UserId);

public class GetOnboardingStateQueryHandler(BlotzTaskDbContext db)
{
    public async Task<OnboardingStateDto> Handle(GetOnboardingStateQuery query, CancellationToken ct)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Id == query.UserId, ct)
                   ?? throw new UnauthorizedAccessException("User not found");
        
        if (user.OnboardingStatus == OnboardingStatus.Completed)
            return new OnboardingStateDto(user.OnboardingStatus, OnboardingStep.Done);

        return new OnboardingStateDto(user.OnboardingStatus, user.OnboardingStep);
    }
}