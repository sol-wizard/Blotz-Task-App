import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingNoteSection } from "@/feature/onboarding/components/onboarding-note-section";
import { useWhatsNewSeen } from "@/feature/whats-new/hooks/useWhatsNewSeen";
import { IntroCarousel, type CarouselExitOutcome } from "@/shared/components/intro-carousel";
import type { OnboardingSection } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";
import { router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";

const SECTIONS = ["ai-voice", "note", "breakdown"] as const satisfies readonly OnboardingSection[];

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserProfileMutation();
  const { markAsSeen } = useWhatsNewSeen();
  const { t } = useTranslation("onboarding");
  useLanguageInit();

  useEffect(() => {
    analytics.trackOnboardingStarted();
    analytics.trackOnboardingStepViewed({ step: SECTIONS[0] });
  }, []);

  const handleSectionViewed = (step: OnboardingSection) => {
    analytics.trackOnboardingStepViewed({ step });
  };

  const handleFinish = async (
    outcome: CarouselExitOutcome,
    lastSectionReached: OnboardingSection,
  ) => {
    await setUserOnboarded(true);
    analytics.trackOnboardingCompleted({ outcome, lastSectionReached });
    await markAsSeen();
    router.replace("/(protected)/(tabs)");
  };

  return (
    <IntroCarousel<OnboardingSection>
      data={SECTIONS}
      renderItem={(item) => (
        <>
          {item === "ai-voice" && <OnboardingAiSection />}
          {item === "breakdown" && <OnboardingBreakdownSection />}
          {item === "note" && <OnboardingNoteSection />}
        </>
      )}
      onFinish={handleFinish}
      onItemViewed={handleSectionViewed}
      continueLabel={t("actions.continue")}
      finishLabel={t("actions.continue")}
      skipLabel={t("actions.skip")}
      dotContainerClassName="mb-16 mt-[-90]"
      activeDotClassName="w-2 bg-black"
    />
  );
}
