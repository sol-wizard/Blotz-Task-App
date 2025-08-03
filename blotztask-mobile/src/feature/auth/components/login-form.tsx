// src/features/auth/LoginForm.tsx
import React, { useState } from "react";
import { View } from "react-native";
import { Button, Card, TextInput, Text, Snackbar } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { loginService } from "../services/auth-service";
import { AUTH_TOKEN_KEY } from "@/constants/token-key";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
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
      console.log("Form submitted with:", data);
      
      // Call the login service
      const response = await loginService({
        email: data.email,
        password: data.password,
      });

      // Store the token securely
      if (response.accessToken) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.accessToken);
        console.log("Login successful, token stored");
        
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
                disabled={isLoading}
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
                disabled={isLoading}
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
          loading={isLoading}
          disabled={isLoading}
          style={{
            borderRadius: 12,
            paddingVertical: 8,
            marginBottom: 16,
          }}
          buttonColor="#667eea"
          labelStyle={{
            fontSize: 16,
            fontWeight: "600",
            letterSpacing: 0.5,
          }}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>

        {/* Test Account Button */}
        <Button
          mode="outlined"
          onPress={handleTestAccount}
          disabled={isLoading}
          style={{
            borderRadius: 12,
            paddingVertical: 4,
            borderColor: "#667eea",
          }}
          labelStyle={{
            fontSize: 14,
            fontWeight: "500",
            color: "#667eea",
          }}
        >
          Use Test Account
        </Button>

      </Card>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{
          backgroundColor: 
            snackbarType === "success" ? "#10b981" : 
            snackbarType === "warning" ? "#f59e0b" : 
            "#ef4444",
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
