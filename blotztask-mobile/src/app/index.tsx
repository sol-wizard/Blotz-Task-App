import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Animated } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";

const loadingImg = require("../../assets/images/loading-page.png");
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  loadingImg: {
    width: Math.min(width * 0.32, 160),
    aspectRatio: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
  },
});
export default function Index() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

        if (cancelled) return;
        setIsAuthenticated(!!token);
      } catch (error) {
        console.log("Token check skipped due to error");
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -8, duration: 500, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    bounce.start();
    return () => bounce.stop();
  }, [isLoading, translateY]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Animated.Image
          source={loadingImg}
          resizeMode="contain"
          style={[styles.loadingImg, { transform: [{ translateY }] }]}
          accessibilityLabel="Loading"
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(protected)" : "/(auth)/onboarding"} />;
}
