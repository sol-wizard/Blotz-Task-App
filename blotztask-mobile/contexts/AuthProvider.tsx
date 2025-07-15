import React, { useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import AuthContext, { AuthContextType, User } from './AuthContext';
import { login as loginService } from '../services/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_TOKEN_KEY = '@blotz_auth_token';
const USER_DATA_KEY = '@blotz_user_data';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check authentication state on app start
  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // Clear any corrupted data
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Call the login service
      const response = await loginService({ email, password });
      
      // Create user object from email (since API doesn't return user details)
      const userData: User = {
        id: Date.now().toString(), // Generate a temporary ID
        email: email,
        name: email.split('@')[0] // Use email prefix as name
      };

      // Store token and user data
      if (response.accessToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
      }
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      
      // Redirect to home page
      router.replace('/');
      
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw to handle in UI
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear stored data
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      
      // Clear state
      setUser(null);
      
      // Redirect to login
      router.replace('/login');
      
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuthState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 