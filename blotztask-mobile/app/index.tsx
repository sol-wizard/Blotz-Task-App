import { View } from "react-native";
import { Button } from "react-native-paper";
import { Link, router } from "expo-router";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center">
      <Link href="/login" asChild>
      <Button onPress={() => router.push('/login')}>
        Go to Login
      </Button>
      </Link>
    </View>
  );
}
