import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingInviteSection } from "@/feature/onboarding/components/onboarding-invite-section";
import { OnboardingNoteSection } from "@/feature/onboarding/components/onboarding-note-section";
import { REDEEM_REFERRAL_CODE_MUTATION_KEY } from "@/feature/referral/hooks/useRedeemReferralCode";
import { useVoiceCoachStore } from "@/feature/onboarding/hooks/useVoiceCoachStore";
import { useWhatsNewSeen } from "@/feature/whats-new/hooks/useWhatsNewSeen";
import { IntroCarousel, type CarouselExitOutcome } from "@/shared/components/intro-carousel";
import type { OnboardingSection } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";
import { useIsMutating } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { Keyboard } from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";

// Invite comes first: most new users skip before the last page, so invited users never saw it there.
const SECTIONS = [
  "invite",
  "ai-voice",
  "note",
  "breakdown",
] as const satisfies readonly OnboardingSection[];

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserProfileMutation();
  const { markAsSeen } = useWhatsNewSeen();
  const showVoiceCoach = useVoiceCoachStore((state) => state.show);
  const { t } = useTranslation("onboarding");
  useLanguageInit();

  useEffect(() => {
    analytics.trackOnboardingStarted();
    analytics.trackOnboardingStepViewed({ step: SECTIONS[0] });
  }, []);

  const handleSectionViewed = (step: OnboardingSection) => {
    // The invite code keyboard would otherwise stay open over the next page.
    Keyboard.dismiss();
    analytics.trackOnboardingStepViewed({ step });
  };

  const isRedeemingReferralCode =
    useIsMutating({ mutationKey: REDEEM_REFERRAL_CODE_MUTATION_KEY }) > 0;

  const handleFinish = async (outcome: CarouselExitOutcome, exit_section: OnboardingSection) => {
    Keyboard.dismiss();
    analytics.trackOnboardingCompleted({ outcome, exit_section });
    await setUserOnboarded(true);
    await markAsSeen();
    // Skipped or completed, the first thing in the app is a nudge to try voice for real.
    showVoiceCoach();
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
          {item === "invite" && <OnboardingInviteSection />}
        </>
      )}
      onFinish={handleFinish}
      onItemViewed={handleSectionViewed}
      continueLabel={t("actions.continue")}
      finishLabel={t("actions.continue")}
      skipLabel={t("actions.skip")}
      dotContainerClassName="mb-16 mt-[-90]"
      activeDotClassName="w-2 bg-black"
      disableActions={isRedeemingReferralCode}
      // No Skip on the invite page: the choice there is enter a code or Continue.
      hideSkipFor={(item) => item === "invite"}
    />
  );
}
