import { View, Image, TouchableOpacity } from "react-native";
import { UserProfileDTO } from "@/shared/models/user-profile-dto";
import { IMAGES } from "@/shared/constants/assets";
import { useRouter } from "expo-router";

const DEFAULT_IMAGE_URL = IMAGES.blotzIcon;

export default function UserProfile({ profile }: { profile?: UserProfileDTO }) {
  const router = useRouter();
  if (!profile) {
    return <View className="w-14 h-14 rounded-full bg-gray-200" />;
  }

  const showPlaceholder = !profile.pictureUrl;

  return (
    <View className="items-center justify-center mr-2">
      {showPlaceholder ? (
        <Image source={DEFAULT_IMAGE_URL} className="w-14 h-14 rounded-full" resizeMode="cover" />
      ) : (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(protected)/user-details",
            })
          }
        >
        <Image
          source={{ uri: profile.pictureUrl! }}
          className="w-14 h-14 rounded-full"
          resizeMode="cover"
        />
        </TouchableOpacity>
      )}
    </View>
  );
}
