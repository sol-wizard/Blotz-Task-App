import { systemPreferredLanguage } from "@/feature/auth/utils/system-preferred-language";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useWhatsNewSeen } from "@/feature/whats-new/hooks/useWhatsNewSeen";
import WhatsNewScreen from "@/feature/whats-new/screens/whats-new-screen";
import LoadingScreen from "@/shared/components/loading-screen";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { router } from "expo-router";
import { useEffect } from "react";

export default function ProtectedGate() {
  const { userProfile, isUserProfileLoading } = useUserProfile();
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();
  const { hasSeen: hasSeenWhatsNew } = useWhatsNewSeen();

  const isLoading = isUserProfileLoading || isUserPreferencesLoading || isUpdatingUserPreferences;

  useEffect(() => {
    if (isLoading || !userPreferences || hasSeenWhatsNew === null) return;

    if (
      userPreferences.preferredLanguage !== systemPreferredLanguage &&
      !userProfile?.isOnBoarded
    ) {
      updateUserPreferences({
        ...userPreferences,
        preferredLanguage: systemPreferredLanguage,
      });
      return;
    }

    if (!userProfile?.isOnBoarded) {
      router.replace("/(protected)/onboarding");
      return;
    }

    if (hasSeenWhatsNew) {
      router.replace("/(protected)/(tabs)");
    }
  }, [
    isUserProfileLoading,
    isUserPreferencesLoading,
    isUpdatingUserPreferences,
    userProfile?.isOnBoarded,
    userPreferences?.preferredLanguage,
    hasSeenWhatsNew,
  ]);

  if (userProfile?.isOnBoarded && hasSeenWhatsNew === false) {
    return <WhatsNewScreen />;
  }

  return <LoadingScreen />;
}
