import React, { useState } from "react";
import { View } from "react-native";
import { Button, TextInput, Text, Snackbar } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { loginService } from "../services/auth-service";
import { AUTH_TOKEN_KEY } from "../../../shared/constants/token-key";

// Validation schema
const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState<"error" | "success" | "warning">("error");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);

      // Call the login service
      const response = await loginService({
        email: data.email,
        password: data.password,
      });

      // Store the token securely
      if (response.accessToken) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.accessToken);

        // Navigate to protected routes
        router.replace("/(protected)");
      } else {
        setSnackbarMessage("Login failed. No token received.");
        setSnackbarType("error");
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error("Login error:", error);
      setSnackbarMessage("Login failed. Please check your credentials and try again.");
      setSnackbarType("error");
      setSnackbarVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAccount = () => {
    const testEmail = process.env.EXPO_PUBLIC_TEST_EMAIL;
    const testPassword = process.env.EXPO_PUBLIC_TEST_PASSWORD;

    if (testEmail && testPassword) {
      setValue("email", testEmail);
      setValue("password", testPassword);
      setSnackbarMessage("Test account credentials filled successfully!");
      setSnackbarType("success");
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage("Test account credentials not configured in environment.");
      setSnackbarType("warning");
      setSnackbarVisible(true);
    }
  };

  return (
    <>
      <View style={{ padding: 16 }}>
        {/* Email Field */}
        <View style={{ marginBottom: 24 }}>
          <Text
            variant="labelLarge"
            style={{
              color: "#374151",
              marginBottom: 8,
              fontWeight: "500",
            }}
          >
            Email
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  mode="outlined"
                  disabled={isLoading}
                  error={!!errors.email}
                  style={{
                    backgroundColor: "transparent",
                    fontSize: 16,
                  }}
                  outlineStyle={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                  }}
                  theme={{
                    colors: {
                      primary: "#9CA3AF",
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
                    }}
                  >
                    {errors.email?.message}
                  </Text>
                )}
              </View>
            )}
          />
        </View>

        {/* Password Field */}
        <View style={{ marginBottom: 32 }}>
          <Text
            variant="labelLarge"
            style={{
              color: "#374151",
              marginBottom: 8,
              fontWeight: "500",
            }}
          >
            Password
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <TextInput
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  mode="outlined"
                  disabled={isLoading}
                  error={!!errors.password}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={{
                    backgroundColor: "transparent",
                    fontSize: 16,
                  }}
                  outlineStyle={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                  }}
                  theme={{
                    colors: {
                      primary: "#9CA3AF",
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
                    }}
                  >
                    {errors.password?.message}
                  </Text>
                )}
              </View>
            )}
          />
        </View>

        {/* Login Button */}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={{
            borderRadius: 12,
            paddingVertical: 4,
            marginBottom: 24,
            backgroundColor: "#D1D5DB",
          }}
          labelStyle={{
            fontSize: 16,
            fontWeight: "500",
            color: "#374151",
            letterSpacing: 0.3,
          }}
          contentStyle={{
            paddingVertical: 8,
          }}
        >
          {isLoading ? "Logging In..." : "Login"}
        </Button>

        {/* Test Account Button */}
        <Button
          mode="outlined"
          onPress={handleTestAccount}
          disabled={isLoading}
          style={{
            borderRadius: 12,
            paddingVertical: 2,
            borderColor: "#9CA3AF",
            backgroundColor: "transparent",
          }}
          labelStyle={{
            fontSize: 14,
            fontWeight: "500",
            color: "#6B7280",
          }}
        >
          Use Test Account
        </Button>
      </View>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{
          backgroundColor:
            snackbarType === "success"
              ? "#10b981"
              : snackbarType === "warning"
                ? "#f59e0b"
                : "#ef4444",
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
