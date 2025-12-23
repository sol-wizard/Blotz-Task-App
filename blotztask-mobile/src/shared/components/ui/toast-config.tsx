import { TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast, { ErrorToast } from "react-native-toast-message";

export const toastConfig = {
  error: (props: any) => (
    <View className="flex-row items-center bg-gray-900 rounded-xl h-10 px-3 w-96">
      <View className="flex-1">
        <ErrorToast
          {...props}
          style={{ backgroundColor: "transparent", borderLeftWidth: 0, height: 40 }}
          contentContainerStyle={{ paddingHorizontal: 0, paddingLeft: 8 }}
          text1Style={{
            color: "#fff",
            fontSize: 14,
            fontFamily: "BalooRegular",
          }}
        />
      </View>

      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="close" size={18} color="#fff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  ),
};
