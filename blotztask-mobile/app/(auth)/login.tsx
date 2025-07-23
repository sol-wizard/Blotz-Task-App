// app/login.tsx (or app/(auth)/login.tsx)
import { StatusBar, View, ScrollView, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Text } from "react-native-paper";
import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/src/feature/auth/login-form";

const { height } = Dimensions.get("window");

export default function LoginPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 48 }}>
            <Avatar.Text
              size={72}
              label="BT"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                marginBottom: 24,
              }}
              labelStyle={{
                color: "white",
                fontSize: 24,
                fontWeight: "bold",
              }}
            />
            <Text
              variant="headlineLarge"
              style={{
                color: "white",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Welcome Back
            </Text>
            <Text
              variant="titleMedium"
              style={{
                color: "rgba(255,255,255,0.8)",
                textAlign: "center",
                fontWeight: "400",
              }}
            >
              Sign in to your Blotz account 
            </Text>
          </View>

          <LoginForm />
        </ScrollView>
      </LinearGradient>
    </>
  );
}
