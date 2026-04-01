import { TouchableOpacity, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
export const toastConfig = {
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
  warning: (props: any) => (
    <View
      style={{ elevation: 0, backgroundColor: "#FFF2E1" }}
      className="flex-row items-center rounded-xl px-3 py-2 w-96 shadow-none"
    >
      <Text style={{ color: "#FFAA4A" }} className="flex-1 font-baloo text-sm">
        {props.text1}
      </Text>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="close" size={16} color="#FFAA4A" />
      </TouchableOpacity>
    </View>
  ),
};
