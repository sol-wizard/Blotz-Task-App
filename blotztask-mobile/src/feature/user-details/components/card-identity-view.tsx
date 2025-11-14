import React, { memo } from "react";
import { View, Image, Text } from "react-native";
import { IMAGES } from "@/shared/constants/assets";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { MaterialIcons } from "@expo/vector-icons";

const CardIdentityView = () => {
  const { userProfile } = useUserProfile();


  const avatar = userProfile?.pictureUrl
    ? { uri: userProfile.pictureUrl }
    : IMAGES.blotzIcon;


  const name = userProfile?.displayName?.trim() || "Guest";

  const email = userProfile?.email?.trim() || "-";

  return (
    <View className="items-center">
      <Image className="w-24 h-24 rounded-full mb-4 border-4 border-white shadow-lg" source={avatar} />
      <Text className="text-xl font-balooBold text-gray-800">{name}</Text>
      <View className="flex-row items-center mt-1">
        <MaterialIcons name="mail-outline" size={16} color="#6B7280" />
        <Text className="text-base text-gray-500 ml-1 font-baloo">{email}</Text>
      </View>
    </View>
  );
};

export default memo(CardIdentityView);
