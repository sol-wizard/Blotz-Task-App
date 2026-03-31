import { TouchableOpacity, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import Animated, { SlideInRight, SlideOutRight } from "react-native-reanimated";

export const toastConfig = {
  warning: ({ isVisible, text1 }: any) =>
    isVisible ? (
      <Animated.View
        entering={SlideInRight}
        exiting={SlideOutRight}
        style={{ backgroundColor: "#FFF2E1" }}
        className="flex-row items-start rounded-xl px-3 py-2.5 w-96"
      >
        <View className="flex-1 justify-center pr-2">
          <Text style={{ color: "#FFAA4A" }} className="font-baloo pl-2 leading-5 flex-wrap">
            {text1}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Toast.hide()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="pt-0.5"
        >
          <MaterialCommunityIcons
            name="close"
            size={18}
            color="#FFAA4A"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </Animated.View>
    ) : null,
  error: (props: any) => (
    <View
      style={{ elevation: 0 }}
      className="flex-row items-start bg-gray-900 rounded-xl px-3 py-2.5 w-96 shadow-none"
    >
      <View className="flex-1 justify-center pr-2">
        <Text className="text-white font-baloo pl-2 leading-5 flex-wrap">{props.text1}</Text>
      </View>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="pt-0.5"
      >
        <MaterialCommunityIcons name="close" size={18} color="#fff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  ),
};
