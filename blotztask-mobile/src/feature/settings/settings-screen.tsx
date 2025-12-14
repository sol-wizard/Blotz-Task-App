import { View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { PNGIMAGES } from "@/shared/constants/assets";
import { FormDivider } from "@/shared/components/ui/form-divider";
import { MenuItem } from "./modals/menu-item";

const menuItems: MenuItem[] = [
  { key: "account", label: "Account", icon: "account-outline" },
  { key: "task-handling", label: "Task Handling", icon: "file-check-outline" },
  { key: "notifications", label: "Notifications", icon: "bell-outline" },
  { key: "under-development", label: "Under Development", icon: "cog-outline" },
];

export default function SettingsScreen() {
  const { userProfile } = useUserProfile();

  const avatarSource = userProfile?.pictureUrl
    ? { uri: userProfile.pictureUrl }
    : PNGIMAGES.blotzIcon;

  const handleProfileEdit = () => console.log("Edit profile pressed");
  const handleMenuPress = (key: string) => {
    console.log(`Settings tab pressed: ${key}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background py-4">
      <Text className="text-center text-4xl font-balooExtraBold text-secondary pt-2">Settings</Text>

      <View className="px-8 mt-2 w-full items-center">
        <View>
          <Image source={avatarSource} className="w-24 h-24 rounded-full" resizeMode="cover" />
          <Pressable
            onPress={handleProfileEdit}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white items-center justify-center"
          >
            <MaterialCommunityIcons name="pencil-minus-outline" size={18} color="#363853" />
          </Pressable>
        </View>
        <Text className="text-2xl font-balooBold text-secondary mt-5">
          {userProfile?.displayName}
        </Text>
        <Text className="text-base font-baloo text-gray-500 mt-1">Beta 1.0</Text>

        <View className="mt-8 w-full bg-white rounded-2xl items-center">
          {menuItems.map((item, index) => (
            <View key={item.key} className="w-11/12">
              <Pressable
                onPress={() => handleMenuPress(item.key)}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name={item.icon} size={22} color="#444964" />
                  <Text className="text-lg font-baloo text-secondary ml-3">{item.label}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
              </Pressable>
              {index < menuItems.length - 1 && <FormDivider marginVertical={2} />}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
