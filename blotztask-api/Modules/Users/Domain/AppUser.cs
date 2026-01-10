using BlotzTask.Modules.Onboarding.Domain;

namespace BlotzTask.Modules.Users.Domain;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();  
    public required string Auth0UserId { get; set; }
    public required string Email { get; set; }
    public string? DisplayName { get; set; }
    public string? PictureUrl { get; set; }
    public DateTime SignUpAt { get; set; }
    public DateTime CreationAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public OnboardingStatus OnboardingStatus { get; set; } = OnboardingStatus.NotStarted;
    public OnboardingStep OnboardingStep { get; set; } = OnboardingStep.Welcome;
    public DateTime? OnboardingCompletedAt { get; set; }
    public PomodoroSetting PomodoroSetting { get; set; } = null!;
}