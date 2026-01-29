import { systemPreferredLanguage } from "@/feature/auth/utils/system-preferred-language";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

export default function ProtectedGate() {
  const { userProfile, isUserProfileLoading } = useUserProfile();
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();

  const isLoading = isUserProfileLoading || isUserPreferencesLoading || isUpdatingUserPreferences;

  useEffect(() => {
    if (isLoading || !userPreferences) return;

    if (userPreferences.preferredLanguage !== systemPreferredLanguage) {
      updateUserPreferences({
        ...userPreferences,
        preferredLanguage: systemPreferredLanguage,
      });
      return;
    }

    const nextRoute = userProfile?.isOnBoarded ? "/(protected)/(tabs)" : "/(protected)/onboarding";
    router.replace(nextRoute);
  }, [
    isUserProfileLoading,
    isUserPreferencesLoading,
    isUpdatingUserPreferences,
    userProfile?.isOnBoarded,
    userPreferences?.preferredLanguage,
  ]);

  return <LoadingScreen />;
}
