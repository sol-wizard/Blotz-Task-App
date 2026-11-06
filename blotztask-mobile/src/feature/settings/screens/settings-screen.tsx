import React, { useCallback } from "react";
import { View, Text, Pressable, Platform, ScrollView, Linking, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Application from "expo-application";
import { badgeKeys, userKeys } from "@/shared/constants/query-key-factory";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { ASSETS, PNGIMAGES } from "@/shared/constants/assets";
import { UserAvatar } from "@/shared/components/user-avatar";
import { AnimatedDropdown, DropdownOption } from "@/shared/components/animated-dropdown";
import { Language, UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { BadgePreviewSection } from "@/feature/settings/components/badge-preview-section";
import { SettingsRow, SettingsSection } from "@/feature/settings/components/settings-section";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useTranslation } from "react-i18next";
import { useBadgesQuery } from "@/feature/badge/hooks/useBadgesQuery";
import LoadingScreen from "@/shared/components/loading-screen";

const WEBSITE_URL = "https://www.blotztask.com/";
const PRIVACY_POLICY_URLS = {
  en: "https://www.blotztask.com/en/privacy/",
  zh: "https://www.blotztask.com/zh/privacy/",
} as const;
const FEEDBACK_URL =
  "https://m3cetbcyp2d.usttp.larksuite.com/share/base/form/shrusf712jJdjDC4l6gJkXcc8Yf";
const XIAOHONGSHU_URL =
  "https://www.xiaohongshu.com/user/profile/67bc12d6000000000e01f09a?xsec_token=ABHQISPlYoPNMi_q8P8u_etGBEND3LxYOU0pGDx_X8bT0%3D&xsec_source=pc_search";

// Each language is named in its own language, so the list reads the same whichever is active.
const LANGUAGE_OPTIONS: DropdownOption<Language>[] = [
  { label: "中文", value: Language.Zh },
  { label: "English", value: Language.En },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, isUserProfileLoading } = useUserProfile();
  const { t, i18n } = useTranslation("settings");
  const { badges, isLoading: areBadgesLoading } = useBadgesQuery();
  const { isUserPreferencesLoading, userPreferences } = useUserPreferencesQuery();
  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.all });
    }, [queryClient]),
  );

  // Wait for preferences too, so a switch never shows the wrong state before they arrive.
  if (isUserProfileLoading || areBadgesLoading || isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  const currentLanguage = userPreferences?.preferredLanguage || Language.En;
  const version = Application.nativeApplicationVersion ?? "—";
  const buildNumber = Application.nativeBuildVersion ?? "—";

  // The API takes the whole preferences object, and three controls here share it. Writing the
  // change into the cache first means a second change made before the refetch builds on this one
  // instead of sending the old value back.
  const updatePreferences = (changes: Partial<UserPreferencesDTO>) => {
    if (!userPreferences) return;
    const next = { ...userPreferences, ...changes };
    queryClient.setQueryData(userKeys.preferences(), next);
    updateUserPreferences(next, {
      onError: () => queryClient.invalidateQueries({ queryKey: userKeys.preferences() }),
    });
  };

  // No early return for the same language: if a save failed, picking it again must still put
  // the screen back in that language.
  const handleLanguageChange = async (language: Language) => {
    if (!userPreferences) return;
    await i18n.changeLanguage(language === Language.En ? "en" : "zh");
    updatePreferences({ preferredLanguage: language });
  };

  const handlePrivacyPolicy = () => {
    const privacyPolicyUrl = i18n.resolvedLanguage?.startsWith("zh")
      ? PRIVACY_POLICY_URLS.zh
      : PRIVACY_POLICY_URLS.en;

    WebBrowser.openBrowserAsync(privacyPolicyUrl).catch(() => Linking.openURL(privacyPolicyUrl));
  };

  return (
    <SafeAreaView className="flex-1 bg-background pt-4" edges={["top"]}>
      <Text className="text-center text-4xl font-balooExtraBold text-secondary pt-2">
        {t("title")}
      </Text>

      <ScrollView
        className="flex-1 mt-2"
        contentContainerStyle={{ paddingHorizontal: 20, alignItems: "center", paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white w-full rounded-2xl items-center py-6 mt-2">
          <Pressable onPress={() => router.push("/settings/avatar")}>
            <UserAvatar pictureValue={userProfile?.pictureUrl} size={84} />
            <View className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center">
              <ASSETS.editIcon width={15} height={15} fill="#444964" />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push("/settings/account")} className="items-center mt-4">
            <Text className="text-xl font-balooBold text-secondary">
              {userProfile?.displayName}
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-sm font-baloo text-secondary/60">
                {t("menu.manageAccount")}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#44496499" />
            </View>
          </Pressable>
        </View>

        {badges.length > 0 && <BadgePreviewSection badges={badges} />}

        <SettingsSection title={t("menu.preferences")}>
          <SettingsRow
            label={t("menu.upcomingReminder")}
            trailing={
              <ToggleSwitch
                value={userPreferences?.upcomingNotification ?? true}
                disabled={isUpdatingUserPreferences}
                onChange={() =>
                  updatePreferences({
                    upcomingNotification: !userPreferences?.upcomingNotification,
                  })
                }
              />
            }
          />
          <SettingsRow
            label={t("menu.autoRollover")}
            trailing={
              <ToggleSwitch
                value={userPreferences?.autoRollover ?? false}
                disabled={isUpdatingUserPreferences}
                onChange={() => updatePreferences({ autoRollover: !userPreferences?.autoRollover })}
              />
            }
          />
          <SettingsRow
            label={t("menu.reviewReminder")}
            badge={t("menu.newBadge")}
            trailing={
              <ToggleSwitch
                value={userPreferences?.reviewNotification ?? true}
                disabled={isUpdatingUserPreferences}
                onChange={() =>
                  updatePreferences({
                    reviewNotification: !(userPreferences?.reviewNotification ?? true),
                  })
                }
              />
            }
          />
          <SettingsRow
            label={t("menu.language")}
            trailing={
              <View className="bg-background rounded-full px-3 py-1">
                <AnimatedDropdown
                  value={currentLanguage}
                  options={LANGUAGE_OPTIONS}
                  onChange={handleLanguageChange}
                  minWidth={0}
                  panelMinWidth={160}
                />
              </View>
            }
          />
          <SettingsRow
            label={t("menu.aiMemory")}
            trailing="chevron"
            onPress={() => router.push("/settings/ai-memory")}
          />
        </SettingsSection>

        <SettingsSection title={t("menu.withBlotz")}>
          <SettingsRow
            label={t("menu.invite")}
            trailing="chevron"
            onPress={() => router.push("/settings/invite")}
          />
          {/* iOS only: tipping is wired to StoreKit, Android has no products configured. */}
          {Platform.OS === "ios" && (
            <SettingsRow
              label={t("menu.supportUs")}
              trailing="chevron"
              onPress={() => router.push("/settings/support-us")}
            />
          )}
        </SettingsSection>

        <SettingsSection title={t("menu.aboutBlotz")}>
          <SettingsRow
            label={t("menu.feedback")}
            trailing="external"
            onPress={() => Linking.openURL(FEEDBACK_URL)}
          />
          <SettingsRow
            label={t("menu.website")}
            icon={
              <View className="w-6 h-6 rounded-md bg-highlight items-center justify-center">
                <ASSETS.whiteBun width={16} height={16} />
              </View>
            }
            trailing="external"
            onPress={() => Linking.openURL(WEBSITE_URL)}
          />
          <SettingsRow
            label={t("menu.xiaohongshu")}
            icon={
              <Image
                source={PNGIMAGES.xhsLogo}
                style={{ width: 24, height: 24, borderRadius: 6 }}
              />
            }
            trailing="external"
            onPress={() => Linking.openURL(XIAOHONGSHU_URL)}
          />
          <SettingsRow
            label={t("menu.privacyPolicy")}
            trailing="external"
            onPress={handlePrivacyPolicy}
          />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            label={t("menu.betaFeatures")}
            trailing="chevron"
            onPress={() => router.push("/settings/beta-features")}
          />
        </SettingsSection>

        <Text className="text-xs font-baloo text-secondary/50 text-center mt-4">
          {t("menu.version", { version, buildNumber })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
