import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { usePostHog } from "posthog-react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FormDivider } from "@/shared/components/ui/form-divider";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { useLogout } from "@/shared/hooks/useLogout";

export default function AccountScreen() {
  const logout = useLogout();
  const posthog = usePostHog();

  const { userProfile, isUserProfileLoading } = useUserProfile();

  const handleSignOut = async () => {
    await logout();
    posthog.reset();
    router.replace("/(auth)/onboarding");
  };
  if (isUserProfileLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background items-center px-6">
      <View className="flex-row pt-6">
        <ReturnButton />
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary">Account</Text>
        </View>
      </View>

      <View className="mt-8 w-full bg-white rounded-2xl items-center">
        <View className="w-11/12">
          <Pressable
            className="px-4 ml-3"
            onPress={() => router.push("/(protected)/settings/update-user-name")}
          >
            <View className="flex-row items-center justify-between pt-4 pb">
              <Text className="text-lg font-baloo text-secondary ">Name</Text>

              <View className="flex-row items-center ">
                <Text className="text-lg font-baloo text-secondary mr-2">
                  {userProfile?.displayName}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
              </View>
            </View>
            <Text className="text-primary font-balooThin text-sm">
              This name appears across your account.
            </Text>
          </Pressable>

          <FormDivider marginVertical={2} />
          <Pressable className="px-4 ml-3">
            <View className="flex-row items-center justify-between pt-4 pb">
              <Text className="text-lg font-baloo text-secondary ">Email</Text>

              <View className="flex-row items-center ">
                <Text className="text-lg font-baloo text-secondary mr-2">{userProfile?.email}</Text>
              </View>
            </View>
            <Text className="text-primary font-balooThin text-sm">
              Used for login and notifications.
            </Text>
          </Pressable>

          <FormDivider marginVertical={2} />
          <Pressable className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center">
              <Text className="text-lg font-baloo text-secondary ml-3">Password</Text>
            </View>
          </Pressable>
        </View>
      </View>
      <Pressable
        onPress={handleSignOut}
        className="bg-white rounded-xl w-96 py-4 items-center justify-center pr-4 shadow mt-12"
      >
        <Text className="text-red-500 font-baloo text-xl ml-4">Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
