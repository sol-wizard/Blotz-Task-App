import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const CardEditButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <View className="items-center mb-8 mt-3">
      <TouchableOpacity
        className="bg-white shadow-sm border border-gray-200 rounded-full py-2 px-4 flex-row items-center"
        onPress={onPress}
      >
        <MaterialCommunityIcons name="pencil-outline" size={16} color="#4B5563" />
        <Text className="text-base ml-1 font-baloo text-gray-700">Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
};
