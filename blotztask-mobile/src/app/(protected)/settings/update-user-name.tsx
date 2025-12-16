import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useUserProfile } from "@/shared/hooks/useUserProfile";

export default function UpdateUserNameScreen() {
  const router = useRouter();
  const { userProfile } = useUserProfile();

  return (
    <SafeAreaView className="flex-1 bg-background px-6 py-8">
      <View className="flex-row items-center">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base font-baloo text-secondary">Cancel</Text>
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Name</Text>
        </View>

        <View className="bg-gray-200 rounded-lg px-3 py-2">
          <Text className="text-sm font-baloo text-gray-500">Done</Text>
        </View>
      </View>

      <TextInput
        placeholder={userProfile?.displayName ?? ""}
        className="mt-12 bg-white rounded-2xl px-4 py-3 text-lg font-baloo text-secondary shadow-sm"
      />
    </SafeAreaView>
  );
}
