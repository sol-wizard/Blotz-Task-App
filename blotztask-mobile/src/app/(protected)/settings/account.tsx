import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { useLogout } from "@/shared/hooks/uselogout";
import { usePostHog } from "posthog-react-native";
import { router } from "expo-router";

export default function AccountScreen() {
  const logout = useLogout();
  const posthog = usePostHog();
  const handleSignOut = async () => {
    await logout();
    posthog.reset();
    router.replace("/(auth)/onboarding");
  };
  return (
    <SafeAreaView className="flex-1 bg-background items-center">
      <View className="flex-row px-6 pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Account</Text>
        </View>
      </View>
      <Pressable
        onPress={handleSignOut}
        className="bg-white rounded-xl w-96 py-4 items-center justify-center pr-4 shadow"
      >
        <Text className="text-red-500 font-baloo text-xl ml-4">Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
