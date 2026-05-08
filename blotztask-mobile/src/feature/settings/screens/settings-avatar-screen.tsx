import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/return-button";
import { getLocalAvatarComponent } from "@/feature/settings/constants/local-avatar-catalog";
import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { AvatarDTO } from "@/feature/settings/modals/avatar-dto";
import { useAvatarListQuery } from "@/feature/settings/hooks/useAvatarListQuery";
import LoadingScreen from "@/shared/components/loading-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsAvatarScreen() {
  const { userProfile } = useUserProfile();
  const { avatars, isAvatarListLoading, isAvatarListError } = useAvatarListQuery();

  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  useEffect(() => {
    const pictureUrl = userProfile?.pictureUrl;

    if (!pictureUrl) {
      setSelectedAvatarId(null);
      return;
    }

    setSelectedAvatarId(avatars.some((avatar) => avatar.id === pictureUrl) ? pictureUrl : null);
  }, [avatars, userProfile?.pictureUrl]);

  const { updateUserProfile, isUserUpdating } = useUserProfileMutation();

  if (isAvatarListLoading) {
    return <LoadingScreen />;
  }

  const handleAvatarSelect = async (avatar: AvatarDTO) => {
    if (isUserUpdating) return;

    const previousAvatarId = selectedAvatarId;
    setSelectedAvatarId(avatar.id);

    try {
      await updateUserProfile({
        displayName: userProfile?.displayName ?? "",
        pictureUrl: avatar.id,
        isOnBoarded: userProfile?.isOnBoarded ?? false,
      });
    } catch {
      setSelectedAvatarId(previousAvatarId);
      console.log("Failed to update avatar.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Avatar</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between m-6">
        {isAvatarListError ? (
          <Text className="w-full text-center text-base font-baloo text-secondary">
            Failed to load avatars.
          </Text>
        ) : (
          avatars.map((avatar) => {
            const isSelected = avatar.id === selectedAvatarId;
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
          })
        )}
      </View>
    </SafeAreaView>
  );
}
