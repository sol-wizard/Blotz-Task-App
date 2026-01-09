import { TouchableOpacity, View, Text, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

export const toastConfig = {
  error: (props: any) => (
    <View
      style={{
        elevation: 0,
        shadowOpacity: 0,
      }}
      className="flex-row items-center bg-gray-900 rounded-xl h-10 px-3 w-96"
    >
      <View className="flex-1 justify-center">
        <Text
          numberOfLines={1}
          style={{
            color: "#fff",
            fontSize: 14,
            fontFamily: "BalooRegular",
            paddingLeft: 8,
          }}
        >
          {props.text1}
        </Text>
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
