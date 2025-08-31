import { StatusBar, View, ScrollView, Dimensions } from "react-native";
import LoginForm from "../../feature/auth/components/login-form";

const { height } = Dimensions.get("window");

export default function LoginPage() {

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
            minHeight: height * 0.9,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LoginForm />
        </ScrollView>
      </View>
    </>
  );
}
