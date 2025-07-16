import React, { useState, useEffect } from "react";
import { View, ScrollView, StatusBar, Dimensions } from "react-native";
import {
  Button,
  Card,
  TextInput,
  Text,
  Snackbar,
  Avatar,
} from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

const { height } = Dimensions.get("window");

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isLoading: authLoading, isAuthenticated } = useAuth();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error) {
      console.error("Login error:", error);
      setSnackbarMessage("Invalid credentials. Please try again.");
      setSnackbarVisible(true);
    }
  };

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
          {/* Header Section */}
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

          {/* Login Form Card */}
          <Card
            style={{
              marginHorizontal: 4,
              borderRadius: 16,
              elevation: 8,
              backgroundColor: "white",
            }}
            contentStyle={{ padding: 32 }}
          >
            <Text
              variant="headlineSmall"
              style={{
                textAlign: "center",
                marginBottom: 32,
                color: "#1a1a1a",
                fontWeight: "600",
              }}
            >
              Sign In
            </Text>

            {/* Email Field */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={{ marginBottom: 20 }}>
                  <TextInput
                    label="Email Address"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    mode="outlined"
                    disabled={authLoading}
                    error={!!errors.email}
                    left={<TextInput.Icon icon="email" />}
                    style={{
                      backgroundColor: "white",
                      fontSize: 16,
                    }}
                    outlineStyle={{
                      borderRadius: 12,
                      borderWidth: 1.5,
                    }}
                    theme={{
                      colors: {
                        primary: "#667eea",
                        error: "#ef4444",
                      },
                    }}
                  />
                  {errors.email && (
                    <Text
                      variant="bodySmall"
                      style={{
                        color: "#ef4444",
                        marginTop: 4,
                        marginLeft: 16,
                      }}
                    >
                      {errors.email?.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Password Field */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={{ marginBottom: 32 }}>
                  <TextInput
                    label="Password"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    mode="outlined"
                    disabled={authLoading}
                    error={!!errors.password}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? "eye-off" : "eye"}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                    style={{
                      backgroundColor: "white",
                      fontSize: 16,
                    }}
                    outlineStyle={{
                      borderRadius: 12,
                      borderWidth: 1.5,
                    }}
                    theme={{
                      colors: {
                        primary: "#667eea",
                        error: "#ef4444",
                      },
                    }}
                  />
                  {errors.password && (
                    <Text
                      variant="bodySmall"
                      style={{
                        color: "#ef4444",
                        marginTop: 4,
                        marginLeft: 16,
                      }}
                    >
                      {errors.password?.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Sign In Button */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={authLoading}
              disabled={authLoading}
              style={{
                borderRadius: 12,
                paddingVertical: 8,
              }}
              buttonColor="#667eea"
              labelStyle={{
                fontSize: 16,
                fontWeight: "600",
                letterSpacing: 0.5,
              }}
            >
              {authLoading ? "Signing In..." : "Sign In"}
            </Button>
          </Card>
        </ScrollView>
      </LinearGradient>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{
          backgroundColor: "#ef4444",
          marginBottom: 16,
          marginHorizontal: 16,
          borderRadius: 12,
        }}
        action={{
          label: "Dismiss",
          onPress: () => setSnackbarVisible(false),
          textColor: "white",
        }}
      >
        <Text style={{ color: "white", fontSize: 14 }}>{snackbarMessage}</Text>
      </Snackbar>
    </>
  );
}
