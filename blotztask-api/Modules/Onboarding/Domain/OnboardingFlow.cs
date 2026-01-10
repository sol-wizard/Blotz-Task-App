namespace BlotzTask.Modules.Onboarding.Domain;

public static class OnboardingFlow
{
    public static OnboardingStep GetNext(OnboardingStep current) =>
        current switch
        {
            OnboardingStep.Welcome => OnboardingStep.AiSheetIntro,
            OnboardingStep.AiSheetIntro => OnboardingStep.Done,
            _ => OnboardingStep.Done
        };
}