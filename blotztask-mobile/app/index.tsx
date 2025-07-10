import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="text-red-500">
        Edit app/index.tsx to edit this screen.
      </Text>
      <Text>hello world</Text>
    </View>
  );
}
