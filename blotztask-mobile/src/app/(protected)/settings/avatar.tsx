import { useState } from "react";
import { Pressable, Text, View, Image } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import avatarData from "@/shared/constants/avatar.json";
import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { AvatarDTO } from "@/feature/settings/modals/avatar-dto";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AvatarScreen() {
  const avatars = avatarData.avatars;
  const { userProfile } = useUserProfile();

  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(() => {
    const pictureUrl = userProfile?.pictureUrl;
    if (pictureUrl && avatars.some((avatar) => avatar.url === pictureUrl)) {
      return pictureUrl;
    }
    return null;
  });

  const { updateUserProfile, isUserUpdating } = useUserProfileMutation();

  const handleAvatarSelect = async (avatar: AvatarDTO) => {
    if (isUserUpdating) return;
    setSelectedAvatarUrl(avatar.url);

    try {
      await updateUserProfile({
        displayName: userProfile?.displayName ?? "",
        pictureUrl: avatar.url,
        isOnBoarded: userProfile?.isOnBoarded ?? false,
      });
    } catch {
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
        {avatars.map((avatar) => {
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
                  className="h-20 w-20 rounded-full"
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
