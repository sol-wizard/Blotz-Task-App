using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Onboarding.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Onboarding.Commands;

public sealed record UpdateOnboardingStepCommand(Guid UserId, OnboardingStep CompletedStep);

public class UpdateOnboardingStepCommandHandler(BlotzTaskDbContext db, ILogger<UpdateOnboardingStepCommandHandler> logger)
{
    public async Task Handle(UpdateOnboardingStepCommand command, CancellationToken ct = default)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Id == command.UserId, ct)
                   ?? throw new UnauthorizedAccessException("User not found");
        
        if (user.OnboardingStatus == OnboardingStatus.Completed)
            return;

        if (user.OnboardingStep != command.CompletedStep)
        {
            throw new InvalidOperationException("Step mismatch");
        }

        var nextStep = OnboardingFlow.GetNext(command.CompletedStep);
        user.OnboardingStep = nextStep;
        
        logger.LogInformation("Updating onboarding step for user {UserId}.", command.UserId);

        if (nextStep == OnboardingStep.Done)
        {
            user.OnboardingStatus = OnboardingStatus.Completed;
            user.OnboardingCompletedAt = DateTime.UtcNow;
        }
        else
        {
            user.OnboardingStatus = OnboardingStatus.InProgress;
        }
        await db.SaveChangesAsync(ct);
    }
}