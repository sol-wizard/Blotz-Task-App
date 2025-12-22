import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { useState } from "react";
import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";

export default function UpdateUserNameScreen() {
  const router = useRouter();
  const { userProfile } = useUserProfile();
  const [name, setName] = useState(userProfile?.displayName ?? "");

  const enableDoneButton = name.trim().length > 0 && name.trim().length <= 20;

  const { updateUserProfile: updateUser, isUserUpdating } = useUserProfileMutation();

  const handleUpdate = async () => {
    if (!enableDoneButton || isUserUpdating) return;
    try {
      await updateUser({ displayName: name.trim(), pictureUrl: userProfile?.pictureUrl ?? "" });
      router.back();
    } catch (e) {
      console.log("Failed to update user name:", e);
    }
  };

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
          disabled={!enableDoneButton || isUserUpdating}
          onPress={handleUpdate}
          className={`rounded-lg px-3 py-2 ${enableDoneButton ? "bg-highlight" : "bg-gray-200"} ${
            isUserUpdating ? "opacity-70" : ""
          }`}
        >
          <Text
            className={`text-sm font-baloo ${enableDoneButton ? "text-black" : "text-gray-500"}`}
          >
            {isUserUpdating ? "Saving..." : "Done"}
          </Text>
        </Pressable>
      </View>

      <TextInput
        placeholder={userProfile?.displayName ?? ""}
        value={name}
        onChangeText={(text) => {
          setName(text);
        }}
        className="mt-12 bg-white rounded-2xl px-4 py-3 text-lg font-baloo text-secondary"
      />
      {name.trim().length > 20 && (
        <Text className="mt-2 text-sm text-red-500 font-baloo">
          Name cannot be longer than 20 characters.
        </Text>
      )}
      {name.trim().length === 0 && (
        <Text className="mt-2 text-sm text-red-500 font-baloo">Name cannot be empty.</Text>
      )}
    </SafeAreaView>
  );
}
