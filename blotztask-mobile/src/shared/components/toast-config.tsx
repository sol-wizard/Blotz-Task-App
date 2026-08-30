import { TouchableOpacity, View, Text } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast, { ToastConfigParams } from "react-native-toast-message";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { ASSETS } from "@/shared/constants/assets";

export const toastConfig = {
  error: (props: ToastConfigParams<unknown>) => (
    <View
      style={{ elevation: 0 }}
      className="flex-row items-center bg-gray-900 rounded-xl px-3 py-2.5 w-96 shadow-none"
    >
      <ASSETS.toastFail width={27} height={22} />
      <View className="flex-1 justify-center pl-2 pr-2">
        <Text className="text-white font-baloo leading-5 flex-wrap pt-0.5">{props.text1}</Text>
      </View>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="close" size={18} color="#fff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  ),
  success: (props: ToastConfigParams<unknown>) => (
    <Animated.View
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.rightExiting}
      style={{ elevation: 0, backgroundColor: "#ECF6E3", alignSelf: "center" }}
      className="flex-row items-center rounded-xl px-3 py-2 shadow-none"
    >
      <ASSETS.toastSuccess width={28} height={24} />
      <Text style={{ color: "#9CD710" }} className="font-baloo text-sm pl-2">
        {props.text1}
      </Text>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-2"
      >
        <MaterialCommunityIcons name="close" size={16} color="#9CD710" />
      </TouchableOpacity>
    </Animated.View>
  ),
  warning: (props: ToastConfigParams<unknown>) => (
    <Animated.View
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.rightExiting}
      style={{ elevation: 0, backgroundColor: "#FFF2E1", alignSelf: "center" }}
      className="flex-row items-center rounded-xl px-3 py-2 shadow-none"
    >
      <ASSETS.toastWarning width={28} height={24} />
      <Text style={{ color: "#FFAA4A" }} className="font-baloo text-sm pl-2">
        {props.text1}
      </Text>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-2"
      >
        <MaterialCommunityIcons name="close" size={16} color="#FFAA4A" />
      </TouchableOpacity>
    </Animated.View>
  ),
};
