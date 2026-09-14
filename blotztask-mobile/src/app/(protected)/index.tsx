import { systemPreferredLanguage } from "@/feature/auth/utils/system-preferred-language";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useWhatsNewSeen } from "@/feature/whats-new/hooks/useWhatsNewSeen";
import WhatsNewScreen from "@/feature/whats-new/screens/whats-new-screen";
import { LoadErrorScreen } from "@/shared/components/load-error-screen";
import LoadingScreen from "@/shared/components/loading-screen";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { router } from "expo-router";
import { useEffect } from "react";

export default function ProtectedGate() {
  const {
    userProfile,
    isUserProfileLoading,
    isUserProfileFetching,
    isUserProfileError,
    refetchUserProfile,
  } = useUserProfile();
  const {
    userPreferences,
    isUserPreferencesLoading,
    isUserPreferencesFetching,
    isUserPreferencesError,
    refetchUserPreferences,
  } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();
  const { hasSeen: hasSeenWhatsNew, markAsSeen } = useWhatsNewSeen();

  const isLoading = isUserProfileLoading || isUserPreferencesLoading || isUpdatingUserPreferences;
  const hasError = isUserProfileError || isUserPreferencesError;
  const isRetrying = hasError && (isUserProfileFetching || isUserPreferencesFetching);

  useEffect(() => {
    // Route only once both requests have succeeded. A missing profile used to read as
    // "not onboarded", which sent existing users into onboarding whenever `/User` failed.
    if (isLoading || hasError || !userProfile || !userPreferences || hasSeenWhatsNew === null) {
      return;
    }

    if (userPreferences.preferredLanguage !== systemPreferredLanguage && !userProfile.isOnBoarded) {
      updateUserPreferences({
        ...userPreferences,
        preferredLanguage: systemPreferredLanguage,
      });
      return;
    }

    if (!userProfile.isOnBoarded) {
      router.replace("/(protected)/onboarding");
      return;
    }

    if (hasSeenWhatsNew) {
      router.replace("/(protected)/(tabs)");
    }
  }, [
    isLoading,
    hasError,
    userProfile?.isOnBoarded,
    userPreferences?.preferredLanguage,
    hasSeenWhatsNew,
  ]);

  const handleWhatsNewFinish = async () => {
    await markAsSeen();
    router.replace("/(protected)/(tabs)");
  };

  const handleRetry = () => {
    if (isUserProfileError) void refetchUserProfile();
    if (isUserPreferencesError) void refetchUserPreferences();
  };

  if (hasError) {
    return <LoadErrorScreen onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  if (userProfile?.isOnBoarded && hasSeenWhatsNew === false) {
    return <WhatsNewScreen onFinish={handleWhatsNewFinish} />;
  }

  return <LoadingScreen />;
}
