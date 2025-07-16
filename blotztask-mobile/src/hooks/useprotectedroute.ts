import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export const useProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Get first segment safely
    const currentSegment = segments[0]?.toLowerCase?.() || '';
    const inAuthGroup = ['login', 'register'].includes(currentSegment);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace('/'); // Or your dashboard path
    }
  }, [segments, isAuthenticated, isLoading]);
};
