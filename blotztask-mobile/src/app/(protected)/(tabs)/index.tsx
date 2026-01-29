import CalendarScreen from "@/feature/calendar/screens/calendar-screen";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { router } from "expo-router";
import { useEffect } from "react";

export default function CalendarTab() {
  const { userProfile, isUserProfileLoading } = useUserProfile();

  useEffect(() => {
    if (!isUserProfileLoading && userProfile && !userProfile.isOnBoarded) {
      router.replace("/(protected)/onboarding");
    }
  }, [isUserProfileLoading, userProfile?.isOnBoarded]);

  if (isUserProfileLoading) {
    return <LoadingScreen />;
  }

  if (userProfile && !userProfile.isOnBoarded) {
    return null;
  }

  return <CalendarScreen />;
}
