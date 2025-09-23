import { TextInput, View } from "react-native";

export const WriteInput = ({
  text,
  setText,
}: {
  text: string;
  setText: (value: string) => void;
}) => {
  return (
    <View className="items-center h-40">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="I have a team meeting scheduled for 9am today...And 10am workout."
        placeholderTextColor="#D1D5DB"
        multiline
        className="text-xl font-bold text-gray-400"
        style={{ fontFamily: "Baloo2-Regular" }}
      />
    </View>
  );
};
