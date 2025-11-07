import { View, Text, TouchableOpacity } from "react-native";
import CardIdentityView from "@/feature/user-details/components/card-identity-view";
import { CardEditButton } from "@/feature/user-details/components/card-edit-button";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function UserDetailsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center items-center">
        <View className="flex-row absolute  left-2 top-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="pt-5 pl-5"
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              className="text-gray-800"
              style={{
                fontWeight: "800",
                textShadowColor: "#1F2937",
                textShadowOffset: { width: 0.7, height: 0.7 },
                textShadowRadius: 0.7,
              }}
            />
          </TouchableOpacity>
          <Text className="flex-1 ml-2 mt-2 font-balooBold text-4xl leading-normal">Profile</Text>
        </View>
        <CardIdentityView />
        <CardEditButton onPress={() => { }} />
      </View>

    </SafeAreaView>
  );
}