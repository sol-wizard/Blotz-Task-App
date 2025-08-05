import { Text, View } from "react-native";

export default function UserMessage({ text }: { text: string }) {
  return (
    <View className="flex-row items-end mb-3 justify-end">
      <View className="bg-[#E5E5EA] px-3 py-2 rounded-l-2xl rounded-tr-2xl max-w-[80%]">
        <Text className="text-black text-base">{text}</Text>
      </View>
    </View>
  );
}
