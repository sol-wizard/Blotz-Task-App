import { View, TouchableOpacity } from "react-native";
import { UserProfileDTO } from "@/shared/models/user-profile-dto";
import { PNGIMAGES } from "@/shared/constants/assets";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

const DEFAULT_IMAGE_URL = PNGIMAGES.blotzIcon;

export default function UserProfile({ profile }: { profile?: UserProfileDTO }) {
  const router = useRouter();
  if (!profile) {
    return <View className="w-14 h-14 rounded-full bg-gray-200" />;
  }

  const showPlaceholder = !profile.pictureUrl;

  return (
    <View className="items-center justify-center mr-2">
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/(protected)/user-details",
          })
        }
      >
        {showPlaceholder ? (
          <Image source={DEFAULT_IMAGE_URL} className="w-14 h-14 rounded-full" resizeMode="cover" />
        ) : (
          <Image
            source={{ uri: profile.pictureUrl! }}
            className="w-14 h-14 rounded-full"
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
    </View>
  );
}
