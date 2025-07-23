import React, { useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import AuthContext, { AuthContextType } from "./AuthContext";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "../src/util/token-key";
import { login as loginService } from "../src/feature/auth/auth-service";
import { LoginResponse } from "../src/feature/auth/auth-service";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication state on app start
  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (token) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
      // Clear any corrupted data
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response: LoginResponse = await loginService({ email, password });
      if (!response.accessToken) {
        throw new Error("No access token returned");
      }

      try {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.accessToken);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to save token:", error);
      }
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);

      // Clear stored data
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY]);

      // Clear state
      setIsAuthenticated(false);

      // Redirect to login
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
