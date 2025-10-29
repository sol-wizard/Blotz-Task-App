import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useLogout } from "@/shared/hooks/uselogout";
import { usePostHog } from "posthog-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import UserProfile from "../calendar/components/user-profile";
import { useUserProfile } from "@/shared/hooks/useUserProfile";

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useLogout();
  const posthog = usePostHog();
  const { userProfile } = useUserProfile();

  const handleSignOut = async () => {
    await logout();
    posthog.reset();
    router.replace("/(auth)/onboarding");
  };

  const goToIdeasPage = async () => {
    router.push("/(protected)/ideas");
  };
  const goTogashaponPage = async () => {
    router.push("/(protected)/gashapon-machine");
  };

  return (
    <SafeAreaView className="flex-1 p-6">
      <Text className="text-5xl font-bold text-gray-800 font-balooExtraBold pt-10">Settings</Text>
      <Text className="text-4xl font-bold text-gray-800 font-balooBold mt-6 py-2">General</Text>
      <View className="bg-white shadow rounded-2xl p-6 flex-row items-center">
        <UserProfile profile={userProfile} />
        <Text className="text-gray-800 font-baloo text-2xl ml-4">{userProfile?.displayName}</Text>
      </View>

      <View className="bg-[#CCE3B7] rounded-2xl mt-10 pb-6">
        <Text className="text-3xl font-bold text-gray-800 font-balooBold py-2 mt-4 ml-4">
          Under Development (Beta)
        </Text>
        <View className="items-center gap-3">
          <Pressable
            onPress={() => router.push("/(protected)/all-tasks")}
            className="bg-white rounded-xl w-96 py-4 items-start flex-row justify-between pr-4"
          >
            <Text className="text-gray-800 font-baloo text-xl ml-4">Go to All Tasks page</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="black" />
          </Pressable>
          <Pressable
            onPress={goToIdeasPage}
            className="bg-white rounded-xl w-96 py-4 items-start flex-row justify-between pr-4"
          >
            <Text className="text-gray-800 font-baloo text-xl ml-4">Go to Ideas page</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="black" />
          </Pressable>
          <Pressable
            onPress={goTogashaponPage}
            className="bg-white rounded-xl w-96 py-4 items-start flex-row justify-between pr-4"
          >
            <Text className="text-gray-800 font-baloo text-xl ml-4">
              Go to gashapon machine page
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="black" />
          </Pressable>
        </View>
      </View>

      <View className="items-center mt-10">
        <Pressable
          onPress={handleSignOut}
          className="bg-white rounded-xl w-96 py-4 items-center justify-center pr-4 shadow"
        >
          <Text className="text-red-500 font-baloo text-xl ml-4">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
