import { systemPreferredLanguage } from "@/feature/auth/utils/system-preferred-language";
import { SHOW_ABOUT_YOU_TO_EXISTING_USERS } from "@/feature/onboarding/about-you/about-you-questions";
import { useAboutYouSeen } from "@/feature/onboarding/hooks/useAboutYouSeen";
import AboutYouScreen from "@/feature/onboarding/screens/about-you-screen";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useWhatsNewSeen } from "@/feature/whats-new/hooks/useWhatsNewSeen";
import WhatsNewScreen from "@/feature/whats-new/screens/whats-new-screen";
import { LoadErrorScreen } from "@/shared/components/load-error-screen";
import LoadingScreen from "@/shared/components/loading-screen";
import type { AppEntryDestination, AppEntrySource } from "@/shared/constants/posthog-events";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { analytics } from "@/shared/services/analytics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuth0 } from "react-native-auth0";

export default function ProtectedGate() {
  // `entry` is set by the two routes that lead here: the sign-in button after a fresh
  // `authorize()` and the root index after restoring a session. Anything else (a deep
  // link, a `router.replace("/(protected)")` elsewhere) counts as a restore.
  const { entry } = useLocalSearchParams<{ entry?: string }>();
  const entrySource: AppEntrySource = entry === "login" ? "login" : "restore";
  const hasTrackedEntry = useRef(false);
  const hasTrackedLoadFailure = useRef(false);

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
  const { user } = useAuth0();
  const { hasSeen: hasSeenAboutYou, markAsSeen: markAboutYouSeen } = useAboutYouSeen(user?.sub);
  // Existing users get the "About you" questions once, after What's New.
  // true = show them, false = go home, null = still reading the stored flag (wait).
  // No Auth0 user yet counts as false: home routing must never wait on the Auth0 hook,
  // and the questions are simply asked on a later launch.
  let needsAboutYou: boolean | null = false;
  if (SHOW_ABOUT_YOU_TO_EXISTING_USERS && user?.sub) {
    needsAboutYou = hasSeenAboutYou === null ? null : !hasSeenAboutYou;
  }

  const isLoading = isUserProfileLoading || isUserPreferencesLoading || isUpdatingUserPreferences;
  const hasError = isUserProfileError || isUserPreferencesError;
  const isRetrying = hasError && (isUserProfileFetching || isUserPreferencesFetching);

  useEffect(() => {
    // Route only once both requests have succeeded. A missing profile used to read as
    // "not onboarded", which sent existing users into onboarding whenever `/User` failed.
    if (isLoading || hasError || !userProfile || !userPreferences || hasSeenWhatsNew === null) {
      return;
    }
    // Wait for the stored "About you" flag too, so `app_entered` reports the real destination.
    if (userProfile.isOnBoarded && needsAboutYou === null) return;

    // Both gate requests succeeded: the user is in. Fired once per process, before the
    // language update below can re-run this effect.
    if (!hasTrackedEntry.current) {
      hasTrackedEntry.current = true;
      const destination: AppEntryDestination = !userProfile.isOnBoarded
        ? "onboarding"
        : !hasSeenWhatsNew
          ? "whats_new"
          : needsAboutYou
            ? "about_you"
            : "home";
      analytics.trackAppEntered({
        source: entrySource,
        destination,
        msSinceLaunch: analytics.msSinceLaunch(),
      });
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

    // What's New and the "About you" questions render below; finishing each one
    // re-runs this effect, which sends the user home once nothing is left to show.
    if (hasSeenWhatsNew && needsAboutYou === false) {
      router.replace("/(protected)/(tabs)");
    }
  }, [
    isLoading,
    hasError,
    userProfile?.isOnBoarded,
    userPreferences?.preferredLanguage,
    hasSeenWhatsNew,
    needsAboutYou,
    entrySource,
  ]);

  // Mirror of `app_entered` for the failure side. Once per error episode: a retry that
  // fails again while the screen is still up is the same episode, a later one is new.
  useEffect(() => {
    if (!hasError) {
      hasTrackedLoadFailure.current = false;
      return;
    }
    if (hasTrackedLoadFailure.current) return;
    hasTrackedLoadFailure.current = true;
    analytics.trackPostLoginLoadFailed({
      source: entrySource,
      profileFailed: isUserProfileError,
      preferencesFailed: isUserPreferencesError,
      msSinceLaunch: analytics.msSinceLaunch(),
    });
    analytics.flush();
  }, [hasError, isUserProfileError, isUserPreferencesError, entrySource]);

  // Both handlers only record "seen"; the routing effect above decides where to go next.
  const handleWhatsNewFinish = async () => {
    await markAsSeen();
  };

  const handleAboutYouDone = async () => {
    await markAboutYouSeen();
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

  if (userProfile?.isOnBoarded && hasSeenWhatsNew && needsAboutYou) {
    return <AboutYouScreen audience="existing_user" onDone={handleAboutYouDone} />;
  }

  return <LoadingScreen />;
}
