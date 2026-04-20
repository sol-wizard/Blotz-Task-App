import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ASSETS } from "@/shared/constants/assets";

interface ForceUpdateScreenProps {
  storeUrl: string;
}

export default function ForceUpdateScreen({ storeUrl }: ForceUpdateScreenProps) {
  function handleUpdate() {
    Linking.openURL(storeUrl);
  }

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
      <Image source={ASSETS.loadingBun} className="w-24 h-24 mb-6" contentFit="contain" />
      <Text className="font-balooBold text-2xl text-center mb-3">Update Available</Text>
      <Text className="font-balooRegular text-base text-center text-gray-500 mb-10">
        A new version of BlotzTask is available. Please update to continue using the app.
      </Text>
      <TouchableOpacity
        onPress={handleUpdate}
        className="bg-black rounded-2xl px-10 py-4 w-full items-center"
      >
        <Text className="font-balooBold text-white text-lg">Update Now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
