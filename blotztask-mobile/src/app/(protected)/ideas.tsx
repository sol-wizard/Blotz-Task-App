import { theme } from "@/shared/constants/theme";
import { useState } from "react";
import { View, Text, Pressable } from "react-native";

import { Searchbar } from "react-native-paper";

export default function IdeasScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <View>
      <Text className="text-4xl font-bold text-gray-800 font-balooExtraBold pt-20 px-10">
        Ideas
      </Text>
      <View className="bg-[#CDF79A] w-68 h-36 rounded-3xl mx-8 my-6">
        <Text className="font-baloo text-xl text-secondary my-4 ml-4">
          Ready to turn a spark into action?
        </Text>
        <Searchbar
          placeholder=""
          onChangeText={setSearchQuery}
          value={searchQuery}
          iconColor="#D1D1D6"
          style={{
            backgroundColor: theme.colors.surface,
            marginHorizontal: 20,
            borderRadius: 30,
            height: 20,
          }}
        />
      </View>

      <Pressable className="bg-[#9AD513] rounded-xl items-center py-4 w-68 mx-8 my-6">
        <Text className="text-white font-semibold text-lg">Add to today</Text>
      </Pressable>
    </View>
  );
}
