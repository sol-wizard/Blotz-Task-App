import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { useState } from "react";
import { useUserMutation } from "@/feature/settings/hooks/useUserMutation";

export default function UpdateUserNameScreen() {
  const router = useRouter();
  const { userProfile } = useUserProfile();
  const [name, setName] = useState(userProfile?.displayName ?? "");
  const doneEnabled = name.trim().length > 0;

  const { updateUserMutation, isUserUpdating, userUpdateError } = useUserMutation();

  return (
    <SafeAreaView className="flex-1 bg-background px-6 py-8">
      <View className="flex-row items-center">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base font-baloo text-secondary">Cancel</Text>
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Name</Text>
        </View>

        <Pressable
          className={`rounded-lg px-3 py-2 ${doneEnabled ? "bg-[#9AD513]" : "bg-gray-200"}`}
        >
          <Text className={`text-sm font-baloo ${doneEnabled ? "text-black" : "text-gray-500"}`}>
            Done
          </Text>
        </Pressable>
      </View>

      <TextInput
        placeholder={userProfile?.displayName ?? ""}
        value={name}
        onChangeText={setName}
        className="mt-12 bg-white rounded-2xl px-4 py-3 text-lg font-baloo text-secondary shadow-sm"
      />
    </SafeAreaView>
  );
}
