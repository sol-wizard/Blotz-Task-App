import { Text, View } from "react-native";
import { Avatar } from "react-native-paper";

export default function UserMessage({ text }: { text: string }) {
  return (
    <View className="flex-row items-end mb-3 justify-end">
      <View className="bg-gray-200 px-3 py-2 rounded-2xl max-w-[80%]">
        <Text className="text-black text-base">{text}</Text>
      </View>
      <Avatar.Text
        size={24}
        label="U"
        style={{ marginLeft: 8, marginTop: 4, backgroundColor: "#131414" }}
      />
    </View>
  );
}
