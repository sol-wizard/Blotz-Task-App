using BlotzTask.Modules.Onboarding.Domain;

namespace BlotzTask.Modules.Onboarding.Contracts;

public record AdvanceOnboardingRequest(OnboardingStep CompletedStep);