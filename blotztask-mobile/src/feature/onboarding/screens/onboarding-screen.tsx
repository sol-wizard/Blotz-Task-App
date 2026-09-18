import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingInviteSection } from "@/feature/onboarding/components/onboarding-invite-section";
import { OnboardingNoteSection } from "@/feature/onboarding/components/onboarding-note-section";
import { REDEEM_REFERRAL_CODE_MUTATION_KEY } from "@/feature/referral/hooks/useRedeemReferralCode";
import { useOnboardingVoiceTask } from "@/feature/onboarding/hooks/useOnboardingVoiceTask";
import { useWhatsNewSeen } from "@/feature/whats-new/hooks/useWhatsNewSeen";
import {
  IntroCarousel,
  type CarouselExitOutcome,
  type CarouselNavigation,
} from "@/shared/components/intro-carousel";
import type { OnboardingSection } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";
import { useIsMutating } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";

const SECTIONS = [
  "ai-voice",
  "note",
  "breakdown",
  "invite",
] as const satisfies readonly OnboardingSection[];

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserProfileMutation();
  const { markAsSeen } = useWhatsNewSeen();
  const { t } = useTranslation("onboarding");
  const voice = useOnboardingVoiceTask();
  useLanguageInit();

  useEffect(() => {
    analytics.trackOnboardingStarted();
    analytics.trackOnboardingStepViewed({ step: SECTIONS[0] });
  }, []);

  const handleSectionViewed = (step: OnboardingSection, via: CarouselNavigation) => {
    analytics.trackOnboardingStepViewed({ step });
    // Any other section coming into view means the try-voice step was left.
    if (step !== "ai-voice") voice.reportExit(via === "swipe" ? "swipe" : "continue_button");
  };

  const isRedeemingReferralCode =
    useIsMutating({ mutationKey: REDEEM_REFERRAL_CODE_MUTATION_KEY }) > 0;

  const handleFinish = async (outcome: CarouselExitOutcome, exit_section: OnboardingSection) => {
    if (exit_section === "ai-voice") voice.reportExit("skip_button");
    analytics.trackOnboardingCompleted({ outcome, exit_section });
    await setUserOnboarded(true);
    await markAsSeen();
    router.replace("/(protected)/(tabs)");
  };

  return (
    <IntroCarousel<OnboardingSection>
      data={SECTIONS}
      renderItem={(item) => (
        <>
          {item === "ai-voice" && <OnboardingAiSection voice={voice} />}
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
      scrollEnabled={!voice.isSwipeLocked}
      getPrimaryAction={(item) =>
        item === "ai-voice" && voice.hasDrafts && !voice.isCreated
          ? {
              label: t("ai-voice.addAndContinue"),
              onPress: voice.confirmDrafts,
              disabled: voice.isAiGenerating || voice.isSaving,
            }
          : undefined
      }
    />
  );
}
