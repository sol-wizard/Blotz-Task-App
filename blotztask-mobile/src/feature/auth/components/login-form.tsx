// src/features/auth/LoginForm.tsx
import React, { useState } from "react";
import { View } from "react-native";
import { Button, Card, TextInput, Text, Snackbar } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../auth-context";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login, isLoading: authLoading } = useAuth();
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

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error) {
      console.error("Login error:", error);
      setSnackbarMessage(`Invalid credentials. Please try again.`);
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
