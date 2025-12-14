import { type ComponentProps } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { PNGIMAGES } from "@/shared/constants/assets";

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile } = useUserProfile();

  type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
  type MenuItem = { key: string; label: string; icon: IconName };

  const avatarSource = userProfile?.pictureUrl
    ? { uri: userProfile.pictureUrl }
    : PNGIMAGES.blotzIcon;

  const handleBack = () => router.back();
  const handleProfileEdit = () => console.log("Edit profile pressed");
  const handleMenuPress = (key: string) => {
    console.log(`Settings tab pressed: ${key}`);
  };

  const menuItems: MenuItem[] = [
    { key: "account", label: "Account", icon: "account-outline" },
    { key: "time-preferences", label: "Time Preferences", icon: "earth" },
    { key: "notifications", label: "Notifications", icon: "bell-outline" },
    { key: "under-development", label: "Under Development", icon: "cog-outline" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F2F7FB] py-4">
      <Text className="text-center text-4xl font-balooExtraBold text-secondary pt-2">Settings</Text>

      <View className="px-8 py-10 w-full items-center">
        <View>
          <Image source={avatarSource} className="w-24 h-24 rounded-full" resizeMode="cover" />
          <Pressable
            onPress={handleProfileEdit}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white items-center justify-center"
          >
            <MaterialCommunityIcons name="pencil-minus-outline" size={18} color="#363853" />
          </Pressable>
        </View>
        <Text className="text-2xl font-balooExtraBold text-[#363853] mt-5">
          {userProfile?.displayName ?? "Mii"}
        </Text>
        <Text className="text-base font-baloo text-gray-500 mt-1">Beta 1.0</Text>

        <View className="mt-8 w-full bg-white rounded-2xl border border-[#E5E7EB]">
          {menuItems.map((item, index) => (
            <View key={item.key}>
              <Pressable
                onPress={() => handleMenuPress(item.key)}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name={item.icon} size={22} color="#363853" />
                  <Text className="text-lg font-baloo text-[#363853] ml-3">{item.label}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
              </Pressable>
              {index < menuItems.length - 1 && <View className="h-px bg-[#E5E7EB] ml-12" />}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
