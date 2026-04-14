import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/return-button";
import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { AvatarDTO } from "@/feature/settings/modals/avatar-dto";
import { useAvatarListQuery } from "@/feature/settings/hooks/useAvatarListQuery";
import LoadingScreen from "@/shared/components/loading-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

export default function SettingsAvatarScreen() {
  const { userProfile } = useUserProfile();
  const { avatars, isAvatarListLoading, isAvatarListError } = useAvatarListQuery();

  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const pictureUrl = userProfile?.pictureUrl;

    if (!pictureUrl) {
      setSelectedAvatarUrl(null);
      return;
    }

    if (avatars.some((avatar) => avatar.url === pictureUrl)) {
      setSelectedAvatarUrl(pictureUrl);
    }
  }, [avatars, userProfile?.pictureUrl]);

  const { updateUserProfile, isUserUpdating } = useUserProfileMutation();

  if (isAvatarListLoading) {
    return <LoadingScreen />;
  }

  const handleAvatarSelect = async (avatar: AvatarDTO) => {
    if (isUserUpdating) return;

    const previousAvatarUrl = selectedAvatarUrl;
    setSelectedAvatarUrl(avatar.url);

    try {
      await updateUserProfile({
        displayName: userProfile?.displayName ?? "",
        pictureUrl: avatar.url,
        isOnBoarded: userProfile?.isOnBoarded ?? false,
      });
    } catch {
      setSelectedAvatarUrl(previousAvatarUrl);
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
            const isSelected = avatar.url === selectedAvatarUrl;

            return (
              <Pressable
                key={avatar.url}
                onPress={() => handleAvatarSelect(avatar)}
                className={`mb-6 items-center ${isUserUpdating ? "opacity-70" : ""}`}
                disabled={isUserUpdating}
              >
                <View
                  className="rounded-full border-4"
                  style={{
                    borderColor: isSelected ? "#F2A74B" : "transparent",
                  }}
                >
                  <Image
                    source={{ uri: avatar.url }}
                    style={{ width: 80, height: 80, borderRadius: 48 }}
                    contentFit="cover"
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </SafeAreaView>
  );
}
