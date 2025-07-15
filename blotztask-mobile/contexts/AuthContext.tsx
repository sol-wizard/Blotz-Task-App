import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
  } from 'react';
  //TODO: Is this only works for expo secure store? what if we deploy to app store?
  import * as SecureStore from 'expo-secure-store';
  import { login as loginService, LoginResponse } from '../services/auth'; // 👈 use your service
  
  export interface User {
    id: string;
    email: string;
    name?: string;
  }
  
  export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuthState: () => Promise<void>;
  }
  
  const AuthContext = createContext<AuthContextType | undefined>(undefined);
  
  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  };
  
  export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    const login = async (email: string, password: string) => {
      try {
        const response: LoginResponse = await loginService({ email, password });
  
        if (!response.accessToken) {
          throw new Error('No access token returned');
        }
  
        await SecureStore.setItemAsync('accessToken', response.accessToken);
  
        setUser({ id: '1', email }); // Replace with decoded JWT or `/me` call
      } catch (err) {
        console.error('Login failed:', err);
        throw err;
      }
    };
  
    const logout = async () => {
      await SecureStore.deleteItemAsync('accessToken');
      setUser(null);
    };
  
    const checkAuthState = async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        // Optional: Fetch user info with token
        setUser({ id: '1', email: 'user@demo.com' }); // placeholder
      }
      setIsLoading(false);
    };
  
    useEffect(() => {
      checkAuthState();
    }, []);
  
    return (
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user,
          isLoading,
          login,
          logout,
          checkAuthState,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };
  
  export default AuthContext;
  