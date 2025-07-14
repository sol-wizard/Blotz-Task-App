import { View } from "react-native";
import { Button } from "react-native-paper";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center">
      <Button mode="contained-tonal" onPress={() => console.log("Pressed")}>
        Press me
      </Button>
    </View>
  );
}
