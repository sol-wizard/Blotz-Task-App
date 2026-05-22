import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";
import { getLocalAvatarComponent } from "@/feature/settings/constants/local-avatar-catalog";
import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { AvatarDTO } from "@/feature/settings/modals/avatar-dto";
import { useAvatarListQuery } from "@/feature/settings/hooks/useAvatarListQuery";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsAvatarScreen() {
  const { t } = useTranslation("settings");
  const { userProfile } = useUserProfile();
  const { avatars } = useAvatarListQuery();
  const { updateUserProfile, isUserUpdating } = useUserProfileMutation();

  const handleAvatarSelect = async (avatar: AvatarDTO) => {
    if (isUserUpdating) return;

    await updateUserProfile({
      displayName: userProfile?.displayName ?? "",
      pictureUrl: avatar.id,
      isOnBoarded: userProfile?.isOnBoarded ?? false,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">{t("avatar.title")}</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between m-6">
        {avatars.map((avatar) => {
          const isSelected = avatar.id === userProfile?.pictureUrl;
          const AvatarComponent = getLocalAvatarComponent(avatar.id);

          return (
            <Pressable
              key={avatar.id}
              onPress={() => handleAvatarSelect(avatar)}
              className={`mb-6 items-center ${isUserUpdating ? "opacity-70" : ""}`}
              disabled={isUserUpdating}
            >
              <View
                className="rounded-full border-4"
                style={{
                  borderColor: isSelected ? "#8B86B3" : "transparent",
                }}
              >
                {AvatarComponent ? <AvatarComponent width={80} height={80} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
