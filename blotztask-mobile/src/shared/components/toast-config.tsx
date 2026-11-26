import { TouchableOpacity, View, Text, useWindowDimensions } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast, { ToastConfigParams } from "react-native-toast-message";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { ASSETS } from "@/shared/constants/assets";

const ErrorToast = (props: ToastConfigParams<unknown>) => {
  const { width } = useWindowDimensions();
  return (
    <View
      style={{ elevation: 0, maxWidth: width - 32, alignSelf: "center" }}
      className="flex-row items-center bg-gray-900 rounded-xl px-3 py-2.5 shadow-none"
    >
      <View style={{ flexShrink: 0 }}>
        <ASSETS.toastFail width={27} height={22} />
      </View>
      <View className="flex-1 justify-center pl-2 pr-2">
        <Text className="text-white font-baloo leading-5 flex-wrap pt-0.5">{props.text1}</Text>
      </View>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ flexShrink: 0 }}
      >
        <MaterialCommunityIcons name="close" size={18} color="#fff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
};

const SuccessToast = (props: ToastConfigParams<unknown>) => {
  const { width } = useWindowDimensions();
  return (
    <Animated.View
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.rightExiting}
      style={{
        elevation: 0,
        backgroundColor: "#ECF6E3",
        alignSelf: "center",
        maxWidth: width - 32,
      }}
      className="flex-row items-center rounded-xl px-3 py-2 shadow-none"
    >
      <View style={{ flexShrink: 0 }}>
        <ASSETS.toastSuccess width={28} height={24} />
      </View>
      <View className="flex-shrink justify-center pl-2 pr-1" style={{ flexShrink: 1 }}>
        <Text style={{ color: "#9CD710" }} className="font-baloo text-sm leading-5 flex-wrap">
          {props.text1}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-1"
        style={{ flexShrink: 0 }}
      >
        <MaterialCommunityIcons name="close" size={16} color="#9CD710" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const WarningToast = (props: ToastConfigParams<unknown>) => {
  const { width } = useWindowDimensions();
  return (
    <Animated.View
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.rightExiting}
      style={{
        elevation: 0,
        backgroundColor: "#FFF2E1",
        alignSelf: "center",
        maxWidth: width - 32,
      }}
      className="flex-row items-center rounded-xl px-3 py-2 shadow-none"
    >
      <View style={{ flexShrink: 0 }}>
        <ASSETS.toastWarning width={28} height={24} />
      </View>
      <View className="flex-shrink justify-center pl-2 pr-1" style={{ flexShrink: 1 }}>
        <Text style={{ color: "#FFAA4A" }} className="font-baloo text-sm leading-5 flex-wrap">
          {props.text1}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-1"
        style={{ flexShrink: 0 }}
      >
        <MaterialCommunityIcons name="close" size={16} color="#FFAA4A" />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const toastConfig = {
  error: (props: ToastConfigParams<unknown>) => <ErrorToast {...props} />,
  success: (props: ToastConfigParams<unknown>) => <SuccessToast {...props} />,
  warning: (props: ToastConfigParams<unknown>) => <WarningToast {...props} />,
};
